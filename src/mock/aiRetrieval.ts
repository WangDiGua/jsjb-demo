/**
 * 纯前端轻量「检索画像」：分词 + 加权重叠分，用于先在本地对 mock 工单做召回排序，
 * 再按需把更小的候选集交给大模型（或完全不走模型），降低延迟与 token。
 */
import type { Appeal, AIRecommend, Department, Reply, ReplyReferenceItem } from './types';

const tokenRe = /[\u4e00-\u9fff]{2,}|[a-z0-9]{3,}/gi;

export function tokenOverlapScore(a: string, b: string): number {
  const toks = (s: string) =>
    new Set((s.toLowerCase().match(tokenRe) ?? []).filter(Boolean) as string[]);
  const A = toks(a);
  const B = toks(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / Math.max(A.size, B.size);
}

/** 工单与一段查询文本的相似度（标题权重大） */
export function scoreAppealAgainstQuery(query: string, appeal: Appeal): number {
  const q = query.slice(0, 1200);
  return (
    0.52 * tokenOverlapScore(q, appeal.title) +
    0.33 * tokenOverlapScore(q, appeal.content.slice(0, 360)) +
    0.15 * tokenOverlapScore(q, `${appeal.type} ${appeal.departmentName}`)
  );
}

export function rankAppealsByTextSimilarity(query: string, appeals: Appeal[], take: number): Appeal[] {
  const scored = appeals.map((a) => ({ a, s: scoreAppealAgainstQuery(query, a) }));
  scored.sort((x, y) => y.s - x.s);
  return scored.filter((x) => x.s > 0.02).slice(0, take).map((x) => x.a);
}

export function tryLocalDepartmentMatch(
  text: string,
  depts: Department[],
): { department: Department; confidence: number } | null {
  let best: { d: Department; s: number } | null = null;
  const q = text.slice(0, 1000);
  for (const d of depts) {
    const blob = `${d.name}\n${d.description || ''}`;
    let s = tokenOverlapScore(q, blob);
    if (q.includes(d.name)) s += 0.3;
    if (!best || s > best.s) best = { d, s };
  }
  if (!best || best.s < 0.1) return null;
  return { department: best.d, confidence: Math.min(0.94, 0.5 + best.s * 0.78) };
}

export function tryLocalQuestionType(
  text: string,
  typeNames: string[],
): { type: string; confidence: number } | null {
  let best: { name: string; s: number } | null = null;
  const q = text.slice(0, 1000);
  for (const name of typeNames) {
    let s = tokenOverlapScore(q, name);
    if (q.includes(name)) s += 0.34;
    for (const part of name.split(/[/／、]/)) {
      const p = part.trim();
      if (p.length >= 2 && q.includes(p)) s += 0.1;
    }
    if (!best || s > best.s) best = { name, s };
  }
  if (!best || best.s < 0.09) return null;
  return { type: best.name, confidence: Math.min(0.94, 0.48 + best.s * 0.82) };
}

/** 完全本地：相似公开诉求 + 由最优匹配捎带部门/类型建议 */
export function buildLocalAIRecommend(params: {
  appeal: Appeal;
  allAppeals: Appeal[];
  replies: Reply[];
  limit?: number;
}): AIRecommend {
  const { appeal, allAppeals, replies, limit = 4 } = params;
  const pool = allAppeals.filter((a) => a.id !== appeal.id && a.isPublic);
  const query = `${appeal.title}\n${appeal.content}`.slice(0, 1200);
  const ranked = rankAppealsByTextSimilarity(query, pool, Math.max(limit, 8));
  const top = ranked.slice(0, limit);
  const similarAppeals = top.map((a, i) => {
    const reply = replies.find((rr) => rr.appealId === a.id);
    const sim = Math.min(0.96, Math.max(0.5, 0.9 - i * 0.08 + Math.min(0.12, scoreAppealAgainstQuery(query, a) * 0.15)));
    return {
      id: a.id,
      title: a.title,
      content: a.content.slice(0, 200),
      replyContent: reply?.content?.slice(0, 200) || '（同类办结案例参考）',
      similarity: sim,
    };
  });
  const best = top[0];
  return {
    id: `local_retrieval_${appeal.id}_${Date.now()}`,
    appealId: appeal.id,
    similarAppeals,
    suggestedDepartment: best ? { id: best.departmentId, name: best.departmentName } : undefined,
    suggestedType: best?.type,
  };
}

export function localRankReplyReferences(
  current: Appeal,
  pool: { appeal: Appeal; replyText: string }[],
  take: number,
): ReplyReferenceItem[] {
  const query = `${current.title} ${current.content}`.slice(0, 1400);
  const scored = pool.map(({ appeal, replyText }) => {
    let score = 0.16;
    if (appeal.departmentId === current.departmentId) score += 0.32;
    if (appeal.type === current.type) score += 0.22;
    score += 0.4 * scoreAppealAgainstQuery(query, appeal);
    return {
      appealId: appeal.id,
      title: appeal.title,
      similarity: Math.min(0.96, Math.max(0.35, score)),
      caseSummary: appeal.content.slice(0, 360) + (appeal.content.length > 360 ? '…' : ''),
      referenceReply: replyText.slice(0, 1600) + (replyText.length > 1600 ? '\n…' : ''),
    };
  });
  scored.sort((x, y) => y.similarity - x.similarity);
  return scored.slice(0, take);
}

/** 判重：先本地按摘要对公开库排序，供 LLM 小样本裁决或启发式直出 */
export function rankAppealsForDuplicateCheck(sample: string, publicAppeals: Appeal[], take: number): Appeal[] {
  const q = sample.slice(0, 800);
  const scored = publicAppeals.map((a) => ({
    a,
    s: 0.62 * tokenOverlapScore(q, a.title) + 0.38 * tokenOverlapScore(q, a.content.slice(0, 400)),
  }));
  scored.sort((x, y) => y.s - x.s);
  return scored.slice(0, take).map((x) => x.a);
}

export function heuristicDuplicateFromScores(sample: string, ranked: Appeal[]): { isDuplicate: boolean; hits: Appeal[] } {
  const top = ranked[0];
  if (!top) return { isDuplicate: false, hits: [] };
  const q = sample.slice(0, 800);
  const t = tokenOverlapScore(q, top.title);
  const c = tokenOverlapScore(q, top.content.slice(0, 500));
  const strong = t >= 0.38 || (t >= 0.22 && c >= 0.2);
  return { isDuplicate: strong, hits: ranked.slice(0, 3) };
}
