import { glmChat, glmChatStream, isGlmConfigured } from '@/lib/glmClient';
import { parseAiJson } from '@/lib/parseAiJson';
import type { Appeal, AIRecommend, Department } from './types';
import {
  enrichDepartmentsFromAppeals,
  deriveQuestionTypeCounts,
  mockAIRecommendations,
  sensitiveWords,
} from './data';
import { getDb } from './persist';
import type { MetadataLocaleCode, MetadataTranslateInput, MetadataTranslateModelOut } from './metadataI18nTypes';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 智能题库：相似已办结公开工单及其参考答复（供办理人选用） */
export type ReplyReferenceItem = {
  appealId: string;
  title: string;
  similarity: number;
  caseSummary: string;
  referenceReply: string;
};

function buildRepliedPublicReferencePool(appealId: string): { appeal: Appeal; replyText: string }[] {
  const db = getDb();
  const out: { appeal: Appeal; replyText: string }[] = [];
  for (const a of db.appeals) {
    if (a.id === appealId) continue;
    if (a.status !== 'replied' || !a.isPublic) continue;
    const published = db.replies.filter((r) => r.appealId === a.id && r.publishStatus === 'published');
    if (!published.length) continue;
    const rep = [...published].sort((x, y) => x.createTime.localeCompare(y.createTime)).at(-1);
    if (!rep?.content?.trim()) continue;
    out.push({ appeal: a, replyText: rep.content });
  }
  return out;
}

function tokenOverlapScore(a: string, b: string): number {
  const toks = (s: string) =>
    new Set(
      (s.toLowerCase().match(/[\u4e00-\u9fff]{2,}|[a-z0-9]{3,}/gi) ?? []).filter(Boolean) as string[],
    );
  const A = toks(a);
  const B = toks(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / Math.max(A.size, B.size);
}

function localRankReplyReferences(
  current: Appeal,
  pool: { appeal: Appeal; replyText: string }[],
  take: number,
): ReplyReferenceItem[] {
  const scored = pool.map(({ appeal, replyText }) => {
    let score = 0.18;
    if (appeal.departmentId === current.departmentId) score += 0.32;
    if (appeal.type === current.type) score += 0.22;
    score += 0.38 * tokenOverlapScore(`${current.title} ${current.content}`, `${appeal.title} ${appeal.content}`);
    return {
      appealId: appeal.id,
      title: appeal.title,
      similarity: Math.min(0.96, Math.max(0.35, score)),
      caseSummary: appeal.content.slice(0, 360) + (appeal.content.length > 360 ? '…' : ''),
      referenceReply: replyText.slice(0, 4000),
    };
  });
  scored.sort((x, y) => y.similarity - x.similarity);
  return scored.slice(0, take);
}

function parseAiChatText(text: string): { answer: string; sources: string[] } {
  const lines = text.trim().split('\n');
  const idx = lines.findIndex((l) => /^来源[：:]/.test(l));
  let sources = ['校内办事指引（由模型生成，请以正式办事渠道为准）'];
  let answer = text;
  if (idx >= 0) {
    const srcLine = lines[idx]!.replace(/^来源[：:]\s*/, '');
    sources = srcLine.split(/[,，;；]/).map((s) => s.trim()).filter(Boolean) || sources;
    answer = lines.slice(0, idx).join('\n').trim();
  }
  return { answer, sources };
}

/** 第三参历史遗留：Moonshot 等部分模型仅允许 temperature=1，传其它值会 invalid_request_error，故请求里固定为 1。 */
async function chatJson<T>(system: string, user: string, _temperature?: number): Promise<T> {
  const raw = await glmChat(
    [
      {
        role: 'system',
        content:
          system +
          '\n只输出一段合法 JSON（UTF-8）。禁止 markdown 代码块、禁止前后说明文字；第一个字符必须是 { 或 [。',
      },
      { role: 'user', content: user },
    ],
    // 结构化 JSON 易被 1024 截断导致 Unexpected end of JSON input；上限需符合当前模型文档（常见 4096）
    { temperature: 1, maxTokens: 4096 },
  );
  try {
    return parseAiJson<T>(raw);
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    const tail = raw.trim().slice(-240);
    throw new Error(
      `模型返回无法解析为 JSON（${hint}）。输出末尾（常用于判断是否截断）：${tail || '（空）'}`,
    );
  }
}

export const aiService = {
  async getRecommendations(appealId: string): Promise<AIRecommend | null> {
    await delay(80);
    const mockAppeals = getDb().appeals;
    const mockReplies = getDb().replies;
    const appeal = mockAppeals.find((a) => a.id === appealId);
    if (!appeal) return null;
    const pool = mockAppeals
      .filter((a) => a.id !== appealId && a.isPublic)
      .slice(0, 24)
      .map((a) => ({ id: a.id, title: a.title, snippet: a.content.slice(0, 120) }));

    type Resp = {
      items: { id: string; similarity: number; summary: string }[];
      suggestedDepartmentId?: string;
      suggestedType?: string;
    };

    const system =
      '你是高校诉求语义分析助手。根据当前诉求，从历史公开诉求中找出语义最相似的条目，并给出建议部门 id、问题类型。';
    const user = JSON.stringify({
      current: { id: appeal.id, title: appeal.title, content: appeal.content.slice(0, 500) },
      departmentIds: enrichDepartmentsFromAppeals(getDb().appeals).map((d) => ({ id: d.id, name: d.name })),
      questionTypes: deriveQuestionTypeCounts(getDb().appeals).map((t) => t.name),
      history: pool,
      schema: {
        items: '最多4条 {id, similarity 0-1, summary 一句}',
        suggestedDepartmentId: 'dept id 或空',
        suggestedType: '类型名或空',
      },
    });

    const r = await chatJson<Resp>(system, user, 0.35);
    const similarAppeals = (r.items || [])
      .map((it) => {
        const a = mockAppeals.find((x) => x.id === it.id);
        if (!a) return null;
        const reply = mockReplies.find((rr) => rr.appealId === a.id);
        return {
          id: a.id,
          title: a.title,
          content: a.content.slice(0, 200),
          replyContent: reply?.content?.slice(0, 200) || '（同类办结案例参考）',
          similarity: Math.min(0.99, Math.max(0.5, it.similarity)),
        };
      })
      .filter(Boolean) as AIRecommend['similarAppeals'];

    const dept = enrichDepartmentsFromAppeals(getDb().appeals).find((d) => d.id === r.suggestedDepartmentId);
    const suggestedDepartment = dept ? { id: dept.id, name: dept.name } : undefined;

    const fallback = mockAIRecommendations.find((x) => x.appealId === appealId)?.similarAppeals ?? mockAIRecommendations[0]?.similarAppeals ?? [];

    return {
      id: `ai_${appealId}_${Date.now()}`,
      appealId,
      similarAppeals: similarAppeals.length ? similarAppeals : fallback,
      suggestedDepartment,
      suggestedType: r.suggestedType,
    };
  },

  /**
   * 先匹配持久化本地词库；未命中再调用大模型补充识别。
   * ok=false 表示模型环节失败，调用方应拒绝提交（视为未通过检测）。
   */
  async checkSensitiveWords(
    content: string,
  ): Promise<{ hasSensitive: boolean; words: string[]; ok: boolean }> {
    if (content.length < 4) {
      const dbLexShort =
        getDb().sensitiveLexicon?.filter((w): w is string => !!w && w.trim().length > 0) ?? [];
      const lexiconShort = dbLexShort.length > 0 ? dbLexShort : sensitiveWords;
      const localShort = [...new Set(lexiconShort.filter((word) => content.includes(word)))];
      return { hasSensitive: localShort.length > 0, words: localShort, ok: true };
    }
    const dbLex = getDb().sensitiveLexicon?.filter((w): w is string => !!w && w.trim().length > 0) ?? [];
    const lexicon = dbLex.length > 0 ? dbLex : sensitiveWords;
    const local = [...new Set(lexicon.filter((word) => content.includes(word)))];
    if (local.length > 0) {
      return { hasSensitive: true, words: local, ok: true };
    }

    type R = { extra: string[] };
    const system =
      '你是校园网络平台内容安全审核员。识别辱骂、仇恨、谣言、违法、极端政治敏感等不适合校级公开平台的内容。';
    const user = `本地词库未命中。请仅根据下列文本判断是否还有违规表述，输出 {"extra":["新增违规词"]}，无则 extra 为空数组。不要重复常见无害词。\n${content.slice(0, 1800)}`;
    try {
      const r = await chatJson<R>(system, user, 0.1);
      const extra = Array.isArray(r.extra) ? r.extra.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
      const words = [...new Set(extra)];
      return { hasSensitive: words.length > 0, words, ok: true };
    } catch {
      return { hasSensitive: false, words: [], ok: false };
    }
  },

  async getSimilarAppeals(keyword: string): Promise<Appeal[]> {
    const kw = keyword.trim();
    if (!kw) return [];
    const mockAppeals = getDb().appeals;
    const candidates = mockAppeals.filter((a) => a.isPublic).slice(0, 30);
    type R = { ids: string[] };
    const system = '根据关键词从列表中选最相关的公开诉求 id，按相关度排序。';
    const user = JSON.stringify({ keyword: kw, appeals: candidates.map((a) => ({ id: a.id, title: a.title })) });
    try {
      const r = await chatJson<R>(system, user, 0.2);
      const ordered = (r.ids || [])
        .map((id) => candidates.find((a) => a.id === id))
        .filter(Boolean) as Appeal[];
      if (ordered.length) return ordered.slice(0, 5);
    } catch {
      /* fallthrough */
    }
    return candidates
      .filter((a) => a.title.toLowerCase().includes(kw.toLowerCase()))
      .slice(0, 5);
  },

  async aiChat(question: string): Promise<{ answer: string; sources: string[] }> {
    const text = await glmChat(
      [
        {
          role: 'system',
          content:
            '你是「即诉即办」校内服务 AI，语气专业、简短。回答基于通用高校治理常识，非真实校方政策时勿断言「学校规定」，可写「建议向 X 部门核实」。最后一行必须以「来源：」开头，列出 1～3 条可参考的办事指引条目名称（无链接）。',
        },
        { role: 'user', content: question },
      ],
      { temperature: 1, maxTokens: 1500 },
    );
    return parseAiChatText(text);
  },

  /** 流式问答：onDelta 为增量片段；结束返回与 aiChat 相同结构（含来源解析）。 */
  async aiChatStream(
    question: string,
    onDelta: (delta: string) => void,
    signal?: AbortSignal,
  ): Promise<{ answer: string; sources: string[] }> {
    const text = await glmChatStream(
      [
        {
          role: 'system',
          content:
            '你是「即诉即办」校内服务 AI，语气专业、简短。回答基于通用高校治理常识，非真实校方政策时勿断言「学校规定」，可写「建议向 X 部门核实」。最后一行必须以「来源：」开头，列出 1～3 条可参考的办事指引条目名称（无链接）。',
        },
        { role: 'user', content: question },
      ],
      { temperature: 1, maxTokens: 1500 },
      onDelta,
      signal,
    );
    return parseAiChatText(text);
  },

  async aiWriteDraftStream(topic: string, onDelta: (delta: string) => void, signal?: AbortSignal): Promise<string> {
    return glmChatStream(
      [
        {
          role: 'system',
          content:
            '你是高校师生事务写作助手。根据用户给出的主题，用第一人称写一段可直接粘贴到工单系统的「诉求正文」草稿：语气诚恳、事实清楚，可分「事情经过」「具体诉求」两段，200～400 字。勿写官方答复口吻，勿编造具体日期、电话与不存在的政策条文。',
        },
        { role: 'user', content: `诉求主题：${topic}` },
      ],
      { temperature: 1, maxTokens: 800 },
      onDelta,
      signal,
    );
  },

  async explainDispatchStream(
    scenario: string,
    onDelta: (delta: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    return glmChatStream(
      [
        {
          role: 'system',
          content:
            '你是校办工单调度员。根据诉求摘要，用 2～4 句中文说明指派到哪一职能部门、可能的小组分工与优先级。不要输出 JSON。',
        },
        { role: 'user', content: scenario.slice(0, 1200) },
      ],
      { temperature: 1, maxTokens: 400 },
      onDelta,
      signal,
    );
  },

  async aiTranslateStream(
    text: string,
    target: 'en' | 'ja',
    onDelta: (delta: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const lang = target === 'en' ? '英语' : '日语';
    return glmChatStream(
      [
        { role: 'system', content: `你是专业翻译，只输出${lang}译文，不要解释。` },
        { role: 'user', content: text },
      ],
      { temperature: 1, maxTokens: 1200 },
      onDelta,
      signal,
    );
  },

  async duplicateCheck(sample: string): Promise<{ isDuplicate: boolean; hits: Appeal[] }> {
    const publicAppeals = getDb().appeals.filter((a) => a.isPublic);
    const compact = publicAppeals.slice(0, 35).map((a) => ({ id: a.id, title: a.title }));
    type R = { duplicate: boolean; ids: string[] };
    const system = '判断「待查」与历史标题是否主题重复（同一件事反复投诉）。ids 为历史诉求 id，最多 3 个。';
    const user = JSON.stringify({ 待查: sample, compact });
    const r = await chatJson<R>(system, user, 0.15);
    const hits = (r.ids || [])
      .map((id) => publicAppeals.find((a) => a.id === id))
      .filter(Boolean) as Appeal[];
    return { isDuplicate: Boolean(r.duplicate && hits.length), hits };
  },

  async matchDepartment(text: string): Promise<{ department: Department; confidence: number }> {
    type R = { departmentId: string; confidence: number };
    const depts = enrichDepartmentsFromAppeals(getDb().appeals);
    const system = '诉求派发：从部门列表选唯一最匹配的 departmentId，confidence 填 0-1。';
    const user = JSON.stringify({
      诉求摘要: text.slice(0, 800),
      部门: depts.map((d) => ({ id: d.id, name: d.name, desc: d.description?.slice(0, 80) })),
    });
    const r = await chatJson<R>(system, user, 0.15);
    const dept = depts.find((d) => d.id === r.departmentId) ?? depts[0]!;
    return { department: dept, confidence: Math.min(0.99, Math.max(0.4, r.confidence ?? 0.8)) };
  },

  async classifyQuestion(text: string): Promise<{ type: string; confidence: number }> {
    type R = { type: string; confidence: number };
    const qTypes = deriveQuestionTypeCounts(getDb().appeals);
    const system = '将诉求分类到给定类型名之一（必须完全一致）。';
    const user = JSON.stringify({ 文本: text.slice(0, 800), 类型: qTypes.map((t) => t.name) });
    const r = await chatJson<R>(system, user, 0.1);
    const names = qTypes.map((t) => t.name);
    const type =
      names.find((n) => n === r.type) ||
      names.find((n) => r.type?.includes(n) || n.includes(r.type || '')) ||
      names[0]!;
    return { type, confidence: Math.min(0.99, Math.max(0.4, r.confidence ?? 0.75)) };
  },

  async explainDispatch(scenario: string): Promise<string> {
    return glmChat(
      [
        {
          role: 'system',
          content:
            '你是校办工单调度员。根据诉求摘要，用 2～4 句中文说明指派到哪一职能部门、可能的小组分工与优先级。不要输出 JSON。',
        },
        { role: 'user', content: scenario.slice(0, 1200) },
      ],
      { temperature: 1, maxTokens: 400 },
    );
  },

  async aiWriteDraft(topic: string): Promise<string> {
    return glmChat(
      [
        {
          role: 'system',
          content: '你是高校职能部门工作人员，用「您好」「我单位已收悉」等正式措辞写一段拟答复草稿，200～400 字，勿编造具体日期电话。',
        },
        { role: 'user', content: `诉求主题：${topic}` },
      ],
      { temperature: 1, maxTokens: 800 },
    );
  },

  /** 管理端：根据完整诉求生成拟发布口径的答复草稿（送审前由人工修改） */
  async aiDraftOfficialReplyForAppeal(appeal: {
    title: string;
    type: string;
    departmentName: string;
    content: string;
  }): Promise<string> {
    const payload = {
      标题: appeal.title.slice(0, 240),
      问题类型: appeal.type,
      承办部门: appeal.departmentName,
      诉求正文: appeal.content.slice(0, 2000),
    };
    return glmChat(
      [
        {
          role: 'system',
          content:
            '你是高校职能部门工作人员，为用户诉求撰写正式书面答复草稿，供内部审核后对用户发布。要求：称呼得体（如「您好」）、已收悉诉求、简要说明办理方向或政策依据要点、告知后续可通过本部门或办事大厅等渠道跟进；语气积极、条理清晰，400～800 字。勿编造具体日期、文号、电话号码与不存在的政策条文；联系方式可写泛指表述。',
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      { temperature: 1, maxTokens: 2000 },
    );
  },

  async aiTranslate(text: string, target: 'en' | 'ja'): Promise<string> {
    const lang = target === 'en' ? '英语' : '日语';
    return glmChat(
      [
        { role: 'system', content: `你是专业翻译，只输出${lang}译文，不要解释。` },
        { role: 'user', content: text },
      ],
      { temperature: 1, maxTokens: 1200 },
    );
  },

  /**
   * 将门户元数据（部门/问题类型/公告标题/界面文案等）译为 en 或 ja，返回结构化 JSON。
   */
  /**
   * 智能题库：从历史「已答复 + 公开 + 已发布答复」工单中匹配参考答复。
   * 已配置大模型时用语义排序；否则同部门/同类型 + 词重叠启发式。
   */
  async getReplyReferenceCandidates(appealId: string, opts?: { limit?: number }): Promise<ReplyReferenceItem[]> {
    await delay(40);
    const limit = Math.min(12, Math.max(4, opts?.limit ?? 8));
    const current = getDb().appeals.find((a) => a.id === appealId);
    if (!current) return [];
    const pool = buildRepliedPublicReferencePool(appealId);
    if (pool.length === 0) return [];

    if (isGlmConfigured()) {
      try {
        type Resp = { ranked: { id: string; similarity: number }[] };
        const compact = pool.slice(0, 36).map(({ appeal, replyText }) => ({
          id: appeal.id,
          title: appeal.title,
          snippet: appeal.content.slice(0, 200),
          replySnippet: replyText.slice(0, 140),
        }));
        const system = [
          '你是高校接诉即办业务助手。给定「当前待办诉求」与若干「已办结且公开」的历史工单（每条含标题、诉求摘要、已发布答复片段）。',
          `请仅根据语义相关性，对候选 id 排序（最相似在前），输出 ranked 数组，长度不超过 ${limit}。`,
          'similarity 取 0～1 之间小数。候选 id 必须来自输入，不得编造 id。',
        ].join('');
        const user = JSON.stringify({
          current: { title: current.title, content: current.content.slice(0, 900) },
          candidates: compact,
        });
        const r = await chatJson<Resp>(system, user, 1);
        const pmap = new Map(pool.map((p) => [p.appeal.id, p]));
        const items: ReplyReferenceItem[] = [];
        for (const row of r.ranked ?? []) {
          const p = pmap.get(row.id);
          if (!p) continue;
          items.push({
            appealId: p.appeal.id,
            title: p.appeal.title,
            similarity: Math.min(0.99, Math.max(0.45, row.similarity)),
            caseSummary: p.appeal.content.slice(0, 360) + (p.appeal.content.length > 360 ? '…' : ''),
            referenceReply: p.replyText.slice(0, 4000),
          });
          if (items.length >= limit) break;
        }
        if (items.length > 0) return items;
      } catch {
        /* 本地降级 */
      }
    }
    return localRankReplyReferences(current, pool, limit);
  },

  async translateMetadataBundle(input: MetadataTranslateInput, target: MetadataLocaleCode): Promise<MetadataTranslateModelOut> {
    const lang = target === 'en' ? '英语' : '日语';
    const system = [
      `你是高校门户本地化译员，将用户 JSON 中的中文行政/校园用语译为自然流畅的${lang}。`,
      '输出一个 JSON 对象，键必须严格包含：departments、questionTypes、notices、portalBranding、deptShowcase。',
      'departments / questionTypes / notices / deptShowcase：对象为 Record，键与输入中的 id（或 departmentId）一致。',
      'portalBranding 含 loginWelcome、loginSubtitle、homeMotto 以及 channelNames：string[]，顺序与输入 channels 数组一致（只译渠道展示名）。',
      'deptShowcase 每个值为 { heroTitle, shortcutLabels: string[] }，shortcutLabels 顺序与输入 shortcuts 一致；不要返回 href。',
      '保持专有名词适度统一；不要增加键或删除键。',
    ].join('\n');
    const user = JSON.stringify({ target, input });
    return chatJson<MetadataTranslateModelOut>(system, user, 1);
  },

};
