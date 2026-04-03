import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { aiService, appealService, questionTypeService, departmentService, getDb } from '@/mock';
import type { Department, QuestionType } from '@/mock/types';
import { useAppStore } from '@/store';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { AiTaskProgress, useRequestStopwatch, formatAiElapsed, useAiStreamPhase } from '@/components/AI/AiTaskProgress';
import { PortalButton, PortalSelect } from './ui';
import { consumeAppealPrefill, firstLineTitle } from '@/lib/appealPrefill';
import { portalToast } from './shell/portalFeedbackStore';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import { usePreferencesStore } from '@/store/preferencesStore';
import { resolveDepartmentI18n, resolveQuestionTypeLabel } from '@/lib/metadataLocale';

export default function CreateAppealPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const [searchParams] = useSearchParams();
  const resubmitId = searchParams.get('resubmit') ?? '';
  const currentUser = useAppStore((s) => s.currentUser);
  const metadataDisplayLocale = usePreferencesStore((s) => s.metadataDisplayLocale);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [sensitive, setSensitive] = useState<{ bad: boolean; words: string[] }>({ bad: false, words: [] });
  const [sensLoad, setSensLoad] = useState(false);
  const [recDept, setRecDept] = useState<{ id: string; name: string } | null>(null);
  const [recType, setRecType] = useState<string | null>(null);
  const [aiLoad, setAiLoad] = useState(false);
  const [qTypes, setQTypes] = useState<QuestionType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 丢弃过期的防抖检测异步结果，避免短输入/快速删改后 UI 被旧结果覆盖 */
  const sensSeqRef = useRef(0);
  /** 最近一次「同一段 title+content」下检测为干净的合并正文，用于提交时跳过重复请求 */
  const lastSensPassRef = useRef<string | null>(null);
  const sensElapsedMs = useRequestStopwatch(sensLoad);

  const [dupLoading, setDupLoading] = useState(false);
  const [dupResult, setDupResult] = useState<Awaited<ReturnType<typeof aiService.duplicateCheck>> | null>(null);
  const [draftTopic, setDraftTopic] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftPreview, setDraftPreview] = useState('');
  const draftStream = useAiStreamPhase();
  const draftAbortRef = useRef<AbortController | null>(null);
  const [trLang, setTrLang] = useState<'en' | 'ja'>('en');
  const [trLoading, setTrLoading] = useState(false);
  const [trOut, setTrOut] = useState('');
  const trStream = useAiStreamPhase();
  const trAbortRef = useRef<AbortController | null>(null);

  const refreshDepartments = useCallback(() => {
    void departmentService.getDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    void questionTypeService.getQuestionTypes().then(setQTypes);
    refreshDepartments();
  }, [refreshDepartments]);

  useMockDbUpdated(
    useCallback(() => {
      refreshDepartments();
      void questionTypeService.getQuestionTypes().then(setQTypes);
    }, [refreshDepartments]),
  );

  useEffect(() => {
    if (!resubmitId || !currentUser?.id) return;
    let cancelled = false;
    void appealService.getAppeal(resubmitId).then((a) => {
      if (cancelled || !a || a.userId !== currentUser.id) return;
      if (a.status === 'withdrawn' || a.status === 'closed') return;
      setTitle(a.title.startsWith('[再次提交]') ? a.title : `[再次提交] ${a.title}`);
      setContent(a.content);
      setType(a.type);
      setDepartmentId(a.departmentId);
      setIsPublic(a.isPublic);
      setIsAnonymous(a.isAnonymous);
    });
    return () => {
      cancelled = true;
    };
  }, [resubmitId, currentUser?.id]);

  /** 智能助理「发起诉求」预填（sessionStorage，导航进入时一次性消费） */
  useLayoutEffect(() => {
    if (resubmitId) return;
    const pre = consumeAppealPrefill();
    if (!pre) return;
    const t = pre.title.trim().slice(0, 100);
    const c = pre.content.trim().slice(0, 2000);
    if (t) setTitle(t);
    if (c) setContent(c);
    if (pre.type?.trim()) setType(pre.type.trim());
    if (pre.departmentId?.trim()) setDepartmentId(pre.departmentId.trim());
    setOkMsg('已从智能助理带入草稿，请核对后提交');
    const tid = window.setTimeout(() => setOkMsg(''), 5000);
    return () => clearTimeout(tid);
  }, [resubmitId]);

  const runSens = useCallback(async (v: string) => {
    if (v.length < 6) {
      setSensitive({ bad: false, words: [] });
      return;
    }
    const runId = ++sensSeqRef.current;
    setSensLoad(true);
    try {
      const r = await aiService.checkSensitiveWords(v);
      if (runId !== sensSeqRef.current) return;
      if (!r.ok) {
        setSensitive({ bad: false, words: [] });
        lastSensPassRef.current = null;
        return;
      }
      setSensitive({ bad: r.hasSensitive, words: r.words });
      if (r.hasSensitive) lastSensPassRef.current = null;
      else lastSensPassRef.current = v;
    } catch (e) {
      if (runId !== sensSeqRef.current) return;
      lastSensPassRef.current = null;
      setError(e instanceof Error ? e.message : '敏感词检测失败');
    } finally {
      if (runId === sensSeqRef.current) setSensLoad(false);
    }
  }, []);

  useEffect(() => {
    const text = `${title}\n${content}`.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 6) {
      sensSeqRef.current += 1;
      lastSensPassRef.current = null;
      setSensitive({ bad: false, words: [] });
      return;
    }
    debounceRef.current = setTimeout(() => void runSens(text), 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, content, runSens]);

  useEffect(() => {
    const text = `${title}\n${content}`.trim();
    if (text.length < 14) {
      setRecDept(null);
      setRecType(null);
      setAiLoad(false);
      return;
    }
    setAiLoad(true);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const [match, cls] = await Promise.all([aiService.matchDepartment(text), aiService.classifyQuestion(text)]);
          setRecDept({ id: match.department.id, name: match.department.name });
          setRecType(cls.type);
        } catch {
          setRecDept(null);
          setRecType(null);
        } finally {
          setAiLoad(false);
        }
      })();
    }, 650);
    return () => clearTimeout(t);
  }, [title, content]);

  const applyAi = () => {
    if (!recDept || !recType) return;
    setDepartmentId(recDept.id);
    setType(recType);
    setOkMsg('已填入 AI 建议');
    setTimeout(() => setOkMsg(''), 2000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currentUser) {
      navigate('/user/login');
      return;
    }
    if (!title.trim() || title.length > 100) {
      setError('请填写标题（不超过 100 字）');
      return;
    }
    if (!type) {
      setError('请选择问题类型');
      return;
    }
    if (!departmentId) {
      setError('请选择部门');
      return;
    }
    if (content.length < 10) {
      setError('内容至少 10 个字');
      return;
    }
    const mergedText = `${title}\n${content}`.trim();
    const cachedPass = lastSensPassRef.current === mergedText;
    if (sensLoad && !cachedPass) {
      setError('敏感词检测进行中，请稍候再提交');
      return;
    }
    if (!cachedPass) {
      setSensLoad(true);
      let sensResult: Awaited<ReturnType<typeof aiService.checkSensitiveWords>>;
      try {
        sensResult = await aiService.checkSensitiveWords(mergedText);
      } catch (e) {
        setSensLoad(false);
        setError(e instanceof Error ? e.message : '敏感词检测失败');
        return;
      } finally {
        setSensLoad(false);
      }
      if (!sensResult!.ok) {
        setError('内容安全检测未完成，请检查网络或大模型配置后重试');
        return;
      }
      if (sensResult!.hasSensitive) {
        setSensitive({ bad: true, words: sensResult!.words });
        setError(`内容包含不适宜表述：${sensResult!.words.join('、')}`);
        return;
      }
      setSensitive({ bad: false, words: [] });
      lastSensPassRef.current = mergedText;
    } else if (sensitive.bad) {
      lastSensPassRef.current = null;
      setError('内容可能包含不适宜表述，请修改后重试');
      return;
    }
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) {
      setError('部门无效');
      return;
    }
    setLoading(true);
    try {
      await appealService.createAppeal(
        {
          title: title.trim(),
          content: content.trim(),
          type,
          departmentId,
          departmentName: dept.name,
          userId: currentUser.id,
          userName: currentUser.nickname,
          isPublic,
          isAnonymous,
          响应时长: null,
          处理时长: null,
        },
        { skipSensitiveCheck: true },
      );
      navigate('/user/appeal/my');
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const mergedText = `${title}\n${content}`.trim();
  const recTypeLabel = useMemo(() => {
    if (!recType) return '';
    const qt = qTypes.find((t) => t.name === recType);
    return qt ? resolveQuestionTypeLabel(qt, metadataDisplayLocale) : recType;
  }, [recType, qTypes, metadataDisplayLocale]);
  const recDeptLabel = useMemo(() => {
    if (!recDept) return '';
    const full = departments.find((d) => d.id === recDept.id);
    return resolveDepartmentI18n(full ?? ({ id: recDept.id, name: recDept.name } as Department), metadataDisplayLocale).name;
  }, [recDept, departments, metadataDisplayLocale]);
  const aiStepIndex =
    mergedText.length < 14 ? 0 : !aiLoad && recDept && recType ? 2 : 1;
  const aiAllComplete = !aiLoad && !!recDept && !!recType && mergedText.length >= 14;
  const aiHelper =
    mergedText.length < 14
      ? '第 1 步：请填写标题与正文（合计约 14 字以上），系统才能推荐部门与类型。'
      : aiLoad
        ? '第 2 步：正在执行部门匹配与问题类型识别（含短暂防抖），请稍候。'
        : recDept && recType
          ? '第 3 步：建议已生成，可「一键填入」或按需手改。'
          : '第 2 步：未能得到推荐（如网络/模型不可用），请直接在下方表单中选择部门与类型。';

  const contextualTools = (
    <div className="space-y-2 lg:space-y-2.5">
      <div className="flex flex-col gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low/50 px-3 py-2.5 text-xs sm:text-sm">
        <span className="font-bold text-on-surface">快捷入口</span>
        <div className="flex flex-col gap-1.5">
          <Link to="/user/appeal/list" className="font-semibold text-primary hover:underline">
            公开诉求库
          </Link>
          <Link to="/user/appeal/list?sort=popular" className="font-semibold text-primary hover:underline">
            热门浏览
          </Link>
          <Link to="/user/ai-assistant" className="font-semibold text-primary hover:underline">
            政策智能问答
          </Link>
        </div>
      </div>

      <details className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm open:ring-1 open:ring-primary/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-headline text-xs font-bold text-on-surface marker:hidden sm:text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              参考办结案例
            </span>
            <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
          </span>
        </summary>
        <div className="border-t border-outline-variant/15 px-3 py-2.5">
          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs sm:text-sm [scrollbar-width:thin]">
            {getDb()
              .appeals.filter((a) => a.status === 'replied')
              .slice(0, 5)
              .map((a) => (
                <li key={a.id} className="rounded-lg border border-outline-variant/15 bg-surface/80 p-2.5">
                  <p className="font-semibold text-on-surface">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{a.content}</p>
                  <PortalButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 font-bold"
                    onClick={() => {
                      setTitle(a.title.slice(0, 100));
                      setContent(a.content.slice(0, 2000));
                      setType(a.type);
                      setDepartmentId(a.departmentId);
                      setOkMsg('已从案例带入，请按实际情况修改');
                      setTimeout(() => setOkMsg(''), 4000);
                    }}
                  >
                    参照此案例填入表单
                  </PortalButton>
                </li>
              ))}
          </ul>
        </div>
      </details>

      <details className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm open:ring-1 open:ring-primary/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-headline text-xs font-bold text-on-surface marker:hidden sm:text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">edit_note</span>
              诉求帮写
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-outline-variant/15 px-3 py-2.5">
          <p className="text-xs text-on-surface-variant">生成完成后将写入标题与「诉求内容」，您仍需选择类型与部门并核对事实后再提交。</p>
          <input
            className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm text-on-surface"
            placeholder="概括您的诉求主题"
            value={draftTopic}
            onChange={(e) => setDraftTopic(e.target.value)}
          />
          <PortalButton
            type="button"
            variant="primary"
            size="md"
            disabled={draftLoading || !draftTopic.trim()}
            className="font-bold"
            onClick={async () => {
              const topic = draftTopic.trim();
              if (!topic) return;
              draftAbortRef.current?.abort();
              const ac = new AbortController();
              draftAbortRef.current = ac;
              draftStream.start();
              setDraftLoading(true);
              setDraftPreview('');
              try {
                const final = await aiService.aiWriteDraftStream(
                  topic,
                  (delta) => {
                    draftStream.onFirstChunk();
                    setDraftPreview((p) => p + delta);
                  },
                  ac.signal,
                );
                draftStream.finish();
                const body = final.trim().slice(0, 2000);
                setTitle((firstLineTitle(topic) || '诉求').slice(0, 100));
                setContent(body);
                setDraftPreview(body);
                portalToast.success('已写入表单，请补充类型与部门');
              } catch (e) {
                if (e instanceof DOMException && e.name === 'AbortError') {
                  draftStream.reset();
                } else {
                  portalToast.error(e instanceof Error ? e.message : '生成失败');
                  draftStream.reset();
                }
              } finally {
                if (draftAbortRef.current === ac) draftAbortRef.current = null;
                setDraftLoading(false);
              }
            }}
          >
            {draftLoading ? <Spin size="small" /> : null}
            {draftLoading ? '生成中…' : '生成并写入正文'}
          </PortalButton>
          {draftPreview ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-outline-variant/20 bg-surface-container-low/50 p-3 text-xs leading-relaxed text-on-surface">
              {draftPreview}
            </pre>
          ) : null}
        </div>
      </details>

      <details className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm open:ring-1 open:ring-primary/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-headline text-xs font-bold text-on-surface marker:hidden sm:text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">difference</span>
              智能判重
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-outline-variant/15 px-3 py-2.5">
          <p className="text-xs text-on-surface-variant">将使用当前标题与正文摘要参与比对，避免重复提交。</p>
          <PortalButton
            type="button"
            variant="outline"
            size="md"
            disabled={dupLoading || mergedText.length < 12}
            className="font-bold"
            onClick={async () => {
              setDupLoading(true);
              setDupResult(null);
              try {
                setDupResult(await aiService.duplicateCheck(mergedText.slice(0, 800)));
              } catch (e) {
                portalToast.error(e instanceof Error ? e.message : '判重失败');
              } finally {
                setDupLoading(false);
              }
            }}
          >
            {dupLoading ? <Spin size="small" /> : null}
            {dupLoading ? '检测中…' : '执行判重'}
          </PortalButton>
          {dupResult ? (
            <div className="rounded-xl border border-outline-variant/20 bg-surface/80 p-3 text-sm">
              <p className={`font-bold ${dupResult.isDuplicate ? 'text-amber-800 dark:text-amber-200' : 'text-primary'}`}>
                {dupResult.isDuplicate ? '可能存在重复，建议点开下方工单核实' : '未见强重复，仍请人工确认'}
              </p>
              {dupResult.hits.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs">
                  {dupResult.hits.map((h) => (
                    <li key={h.id}>
                      <Link to={`/user/appeal/detail/${h.id}`} className="text-primary hover:underline">
                        {h.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>

      <details className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm open:ring-1 open:ring-primary/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-headline text-xs font-bold text-on-surface marker:hidden sm:text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">translate</span>
              中英日翻译
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-outline-variant/15 px-3 py-2.5">
          <div className="flex flex-wrap gap-2">
            <PortalSelect className="min-w-[140px]" value={trLang} onChange={(e) => setTrLang(e.target.value as 'en' | 'ja')}>
              <option value="en">译为 English</option>
              <option value="ja">译为 日本語</option>
            </PortalSelect>
            <PortalButton
              type="button"
              variant="primary"
              size="md"
              disabled={trLoading || !content.trim()}
              className="font-bold"
              onClick={async () => {
                trAbortRef.current?.abort();
                const ac = new AbortController();
                trAbortRef.current = ac;
                trStream.start();
                setTrLoading(true);
                setTrOut('');
                try {
                  await aiService.aiTranslateStream(
                    content.trim().slice(0, 1500),
                    trLang,
                    (delta) => {
                      trStream.onFirstChunk();
                      setTrOut((p) => p + delta);
                    },
                    ac.signal,
                  );
                  trStream.finish();
                } catch (e) {
                  if (e instanceof DOMException && e.name === 'AbortError') {
                    trStream.reset();
                  } else {
                    portalToast.error(e instanceof Error ? e.message : '翻译失败');
                    trStream.reset();
                  }
                } finally {
                  if (trAbortRef.current === ac) trAbortRef.current = null;
                  setTrLoading(false);
                }
              }}
            >
              {trLoading ? <Spin size="small" /> : null}
              {trLoading ? '翻译中…' : '翻译当前正文'}
            </PortalButton>
          </div>
          {trOut ? (
            <div className="space-y-2">
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs">{trOut}</pre>
              <PortalButton
                type="button"
                variant="outline"
                size="sm"
                className="font-bold"
                disabled={trLoading}
                onClick={() => {
                  const label = trLang === 'en' ? 'English' : '日本語';
                  const block = `\n\n【${label} 译文 / 供参考】\n${trOut.trim()}`;
                  setContent((c) => `${c.trimEnd()}${block}`.slice(0, 2000));
                  portalToast.success('已追加到正文末尾');
                }}
              >
                将译文追加到正文末尾
              </PortalButton>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );

  const aiBanner = (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="material-symbols-outlined text-primary">bolt</span>
        <span className="font-bold text-on-surface">智能辅助</span>
      </div>
      <AiTaskProgress
        steps={['撰写标题与正文', '匹配部门与类型', '应用到表单']}
        activeIndex={aiStepIndex}
        allComplete={aiAllComplete}
        helperText={aiHelper}
        showElapsed={mergedText.length >= 14 && !!(aiLoad || aiAllComplete)}
      />
      {recDept && recType && !aiLoad ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3 text-sm">
          <span className="text-on-surface-variant">当前建议：</span>
          <span className="rounded-lg bg-surface-container-lowest px-2 py-0.5 text-xs font-semibold text-primary">{recTypeLabel}</span>
          <span className="rounded-lg bg-surface-container-lowest px-2 py-0.5 text-xs font-semibold text-secondary">{recDeptLabel}</span>
          <PortalButton variant="primary" size="sm" className="rounded-lg px-3" onClick={applyAi}>
            一键填入
          </PortalButton>
        </div>
      ) : null}
    </div>
  );

  const formInner = (
    <div className="grid w-full grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,28rem)] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,30rem)] xl:gap-10">
      <div className="min-w-0 space-y-4 md:space-y-5">
        {okMsg ? <p className="text-sm font-semibold text-success">{okMsg}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="md:hidden">{aiBanner}</div>

      <form
        onSubmit={submit}
        className={`space-y-5 rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-sm ${isMobile ? 'p-4 pb-6' : 'space-y-6 p-6 lg:p-8'}`}
      >
        <div>
          <label className="mb-2 block text-sm font-bold text-on-surface">标题</label>
          <input
            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="简要描述问题"
          />
          <div className="mt-1 text-right text-xs text-on-surface-variant">{title.length}/100</div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-on-surface">问题类型</label>
          <PortalSelect className="w-full" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">请选择</option>
            {qTypes.map((qt) => (
              <option key={qt.id} value={qt.name}>
                {resolveQuestionTypeLabel(qt, metadataDisplayLocale)}
              </option>
            ))}
          </PortalSelect>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-on-surface">诉求部门</label>
          <PortalSelect className="w-full" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">请选择</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {resolveDepartmentI18n(d, metadataDisplayLocale).name}
              </option>
            ))}
          </PortalSelect>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-on-surface">诉求内容</label>
          <p className="mb-2 text-xs text-on-surface-variant" role="status" aria-live="polite">
            {mergedText.length < 6
              ? '敏感词筛查：标题与正文合计满 6 字后自动检测（本地词库优先，必要时再请求大模型复审）。'
              : sensLoad
                ? (
                    <>
                      敏感词筛查：正在扫描正文…（已用时{' '}
                      <span className="font-mono font-semibold tabular-nums text-primary">{formatAiElapsed(sensElapsedMs)}</span>）
                    </>
                  )
                : sensitive.bad
                  ? `敏感词筛查：已标记可疑词，提交前请修改。${sensElapsedMs > 0 ? `（本次检测 ${formatAiElapsed(sensElapsedMs)}）` : ''}`
                  : `敏感词筛查：本轮检测已完成${sensElapsedMs > 0 ? `（${formatAiElapsed(sensElapsedMs)}）` : ''}。`}
          </p>
          <textarea
            className="min-h-[180px] w-full rounded-lg border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 lg:min-h-[200px]"
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="详细描述（至少 10 字）"
          />
          {sensitive.bad ? (
            <p className="mt-2 text-sm text-red-600">可能含敏感信息：{sensitive.words.join(', ')}</p>
          ) : null}
          <div className="mt-1 text-right text-xs text-on-surface-variant">{content.length}/2000</div>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded border-outline-variant text-primary" />
          <span className="text-sm">公开诉求</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded border-outline-variant text-primary" />
          <span className="text-sm">匿名</span>
        </label>
        <div className={`flex flex-wrap pt-4 ${isMobile ? 'flex-col gap-3' : 'justify-end gap-4'}`}>
          <PortalButton
            variant="ghost"
            size="lg"
            className={`font-bold ${isMobile ? 'w-full py-3' : 'px-8'}`}
            onClick={() => navigate(-1)}
          >
            取消
          </PortalButton>
          <PortalButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || sensLoad}
            className={`shadow-lg shadow-primary/25 ${isMobile ? 'w-full py-3.5 text-base' : 'px-10'}`}
          >
            {loading ? '提交中…' : sensLoad ? '敏感词检测中…' : '提交诉求'}
          </PortalButton>
        </div>
      </form>

      <div className={`rounded-lg border border-outline-variant/15 bg-surface/80 ${isMobile ? 'p-4' : 'p-6'}`}>
        <h3 className="mb-3 font-headline text-sm font-bold text-on-surface sm:text-base">提交须知</h3>
        <ul className="list-inside list-disc space-y-2 text-sm text-on-surface-variant">
          <li>可先写正文，系统会尝试推荐部门与类型</li>
          <li>请如实描述时间、地点与诉求</li>
          <li>提交内容将安全保存在您当前使用的终端，公共设备请及时退出账号并勿留存敏感信息</li>
        </ul>
      </div>
      </div>

      <aside
        className="min-w-0 border-t border-outline-variant/20 pt-6 md:sticky md:top-24 md:mt-0 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:border-0 md:border-l md:border-outline-variant/15 md:pl-5 md:pt-0 xl:pl-8 [scrollbar-width:thin]"
        aria-label="智能辅助与参考工具"
      >
        <div className="hidden md:block">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">智能辅助</p>
          <div className="mb-6">{aiBanner}</div>
        </div>
        <h2 className="mb-2 font-headline text-base font-bold text-on-surface md:text-sm md:font-semibold">
          参考与工具
        </h2>
        <p className="mb-3 text-xs text-on-surface-variant md:mb-4">
          {isMobile
            ? '以下为可选项；直接填表即可提交，需要时再展开使用。'
            : '案例帮写、判重、翻译等；不影响提交。'}
        </p>
        {contextualTools}
      </aside>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="发起诉求" contentClassName="pt-3 pb-8">
        {formInner}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="w-full">
      <header className="mb-8 border-b border-outline-variant/10 pb-6">
        <div className="flex flex-wrap items-center gap-3 gap-y-2">
          <PortalButton variant="link" size="md" className="shrink-0 p-0 text-sm font-bold" onClick={() => navigate(-1)}>
            ← 返回
          </PortalButton>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">发起诉求</h1>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-on-surface-variant">
          请完整填写标题与正文。中等宽度及以上屏幕为<strong className="font-semibold text-on-surface">左表单、右辅助栏</strong>
          ；手机端辅助在表单下方。
        </p>
      </header>
      {formInner}
    </div>
  );
}
