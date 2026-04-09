import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { aiService, appealService, questionTypeService, departmentService, getDb, adminConfigService } from '@/mock';
import type { AppealFormField } from '@/mock/adminConfigTypes';
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

const MAX_APPEAL_IMAGE_FILES = 8;
const MAX_APPEAL_IMAGE_BYTES = 4 * 1024 * 1024;

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
  const [okMsg, setOkMsg] = useState('');

  const [sensitive, setSensitive] = useState<{ bad: boolean; words: string[] }>({ bad: false, words: [] });
  const [sensLoad, setSensLoad] = useState(false);
  const [recDept, setRecDept] = useState<{ id: string; name: string } | null>(null);
  const [recType, setRecType] = useState<string | null>(null);
  const [aiLoad, setAiLoad] = useState(false);
  const [qTypes, setQTypes] = useState<QuestionType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
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

  const [formFieldDefs, setFormFieldDefs] = useState<AppealFormField[]>([]);
  const [appealImages, setAppealImages] = useState<string[]>([]);

  /** 正文或标题变更后清除上次提交触发的敏感词提示，避免旧结果误导 */
  useEffect(() => {
    setSensitive({ bad: false, words: [] });
  }, [title, content]);

  const loadFormConfig = useCallback(() => {
    void adminConfigService.getBundle().then((b) => {
      setFormFieldDefs([...b.formFields].sort((a, c) => a.order - c.order));
    });
  }, []);

  const refreshDepartments = useCallback(() => {
    void departmentService.getDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    void questionTypeService.getQuestionTypes().then(setQTypes);
    refreshDepartments();
    loadFormConfig();
  }, [refreshDepartments, loadFormConfig]);

  useMockDbUpdated(
    useCallback(() => {
      refreshDepartments();
      void questionTypeService.getQuestionTypes().then(setQTypes);
      loadFormConfig();
    }, [refreshDepartments, loadFormConfig]),
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
      setAppealImages([...(a.images ?? [])]);
    });
    return () => {
      cancelled = true;
    };
  }, [resubmitId, currentUser?.id]);

  const configuredImageField = useMemo(
    () => formFieldDefs.find((f) => f.type === 'image'),
    [formFieldDefs],
  );

  const onAppealImagesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      let room = MAX_APPEAL_IMAGE_FILES - appealImages.length;
      if (room <= 0) {
        portalToast.warning(`最多上传 ${MAX_APPEAL_IMAGE_FILES} 张图片`);
        e.target.value = '';
        return;
      }
      const readers: Promise<string | null>[] = [];
      for (let i = 0; i < files.length && room > 0; i++) {
        const file = files[i]!;
        if (!file.type.startsWith('image/')) {
          portalToast.error(`跳过非图片文件：${file.name}`);
          continue;
        }
        if (file.size > MAX_APPEAL_IMAGE_BYTES) {
          portalToast.error(`${file.name} 超过 4MB，已跳过`);
          continue;
        }
        room -= 1;
        readers.push(
          new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
            r.onerror = () => resolve(null);
            r.readAsDataURL(file);
          }),
        );
      }
      void Promise.all(readers).then((urls) => {
        const next = urls.filter((u): u is string => !!u);
        if (next.length) setAppealImages((prev) => [...prev, ...next]);
      });
      e.target.value = '';
    },
    [appealImages.length],
  );

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
    if (!currentUser) {
      navigate('/user/login');
      return;
    }
    if (!title.trim() || title.length > 100) {
      portalToast.error('请填写标题（不超过 100 字）');
      return;
    }
    if (!type) {
      portalToast.error('请选择问题类型');
      return;
    }
    if (!departmentId) {
      portalToast.error('请选择部门');
      return;
    }
    if (content.length < 10) {
      portalToast.error('内容至少 10 个字');
      return;
    }
    const mergedText = `${title}\n${content}`.trim();
    setSensLoad(true);
    try {
      const sensResult = await aiService.checkSensitiveWords(mergedText);
      if (!sensResult.ok) {
        portalToast.error('内容安全检测未完成，请检查网络或大模型配置后重试');
        return;
      }
      if (sensResult.hasSensitive) {
        setSensitive({ bad: true, words: sensResult.words });
        portalToast.error(`内容包含不适宜表述：${sensResult.words.join('、')}`);
        return;
      }
    } catch (e) {
      portalToast.error(e instanceof Error ? e.message : '敏感词检测失败');
      return;
    } finally {
      setSensLoad(false);
    }
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) {
      portalToast.error('部门无效');
      return;
    }
    if (configuredImageField?.required && appealImages.length === 0) {
      portalToast.error(`请上传${configuredImageField.label}`);
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
          ...(appealImages.length > 0 ? { images: [...appealImages] } : {}),
        },
        { skipSensitiveCheck: true },
      );
      portalToast.success('诉求已提交');
      navigate('/user/appeal/my');
    } catch (e) {
      portalToast.error(e instanceof Error ? e.message : '提交失败');
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
      ? '先写标题与正文（合计 ≥14 字），以便推荐部门与类型。'
      : aiLoad
        ? '正在匹配部门与问题类型（含短暂防抖）…'
        : recDept && recType
          ? '建议已就绪：可一键填入，或自行微调后提交。'
          : '未拿到推荐时，请在表单中手动选择部门与类型。';

  const quickEntryClass =
    'group flex min-h-11 items-center gap-2.5 rounded-lg border border-outline-variant/18 bg-surface/60 px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:border-primary/28 hover:bg-primary/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm';

  const contextualTools = (
    <div className="space-y-3 md:space-y-4">
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-3 dark:bg-surface-container-low/25">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">快捷入口</p>
        <nav aria-label="快捷入口" className="flex flex-col gap-2">
          <Link to="/user/appeal/list" className={quickEntryClass}>
            <span className="material-symbols-outlined shrink-0 text-[18px] text-primary" aria-hidden>
              lists
            </span>
            <span className="min-w-0 leading-snug">公开诉求库</span>
            <span className="material-symbols-outlined ml-auto shrink-0 text-[18px] text-on-surface-variant opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden>
              chevron_right
            </span>
          </Link>
          <Link to="/user/appeal/list?sort=popular" className={quickEntryClass}>
            <span className="material-symbols-outlined shrink-0 text-[18px] text-primary" aria-hidden>
              trending_up
            </span>
            <span className="min-w-0 leading-snug">热门浏览</span>
            <span className="material-symbols-outlined ml-auto shrink-0 text-[18px] text-on-surface-variant opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden>
              chevron_right
            </span>
          </Link>
          <Link to="/user/ai-assistant" className={quickEntryClass}>
            <span className="material-symbols-outlined shrink-0 text-[18px] text-primary" aria-hidden>
              auto_awesome
            </span>
            <span className="min-w-0 leading-snug">政策智能问答</span>
            <span className="material-symbols-outlined ml-auto shrink-0 text-[18px] text-on-surface-variant opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden>
              chevron_right
            </span>
          </Link>
        </nav>
      </div>

      <details className="group/case rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm open:ring-1 open:ring-primary/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-headline text-xs font-bold text-on-surface marker:hidden sm:text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="material-symbols-outlined shrink-0 text-primary">menu_book</span>
              <span className="truncate">AI智能推荐</span>
            </span>
            <span className="material-symbols-outlined shrink-0 text-on-surface-variant transition-transform duration-200 group-open/case:rotate-180">
              expand_more
            </span>
          </span>
        </summary>
        <div className="border-t border-outline-variant/15 px-3 py-3">
          <ul className="space-y-2 text-xs sm:text-sm">
            {getDb()
              .appeals.filter((a) => a.status === 'replied')
              .slice(0, 5)
              .map((a) => (
                <li key={a.id} className="rounded-lg border border-outline-variant/15 bg-surface/80 p-2.5">
                  <p className="font-semibold text-on-surface">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{a.content}</p>
                </li>
              ))}
          </ul>
        </div>
      </details>

      <details className="group/draft rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm open:ring-1 open:ring-primary/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-headline text-xs font-bold text-on-surface marker:hidden sm:text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="material-symbols-outlined shrink-0 text-primary text-[18px]">edit_note</span>
              <span className="truncate">诉求帮写</span>
            </span>
            <span className="material-symbols-outlined shrink-0 text-on-surface-variant text-[18px] transition-transform duration-200 group-open/draft:rotate-180">
              expand_more
            </span>
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

      <details className="group/dup rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm open:ring-1 open:ring-primary/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-headline text-xs font-bold text-on-surface marker:hidden sm:text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="material-symbols-outlined shrink-0 text-primary text-[18px]">difference</span>
              <span className="truncate">智能判重</span>
            </span>
            <span className="material-symbols-outlined shrink-0 text-on-surface-variant text-[18px] transition-transform duration-200 group-open/dup:rotate-180">
              expand_more
            </span>
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

      <details className="group/tr rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm open:ring-1 open:ring-primary/10">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-headline text-xs font-bold text-on-surface marker:hidden sm:text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="material-symbols-outlined shrink-0 text-primary text-[18px]">translate</span>
              <span className="truncate">中英日翻译</span>
            </span>
            <span className="material-symbols-outlined shrink-0 text-on-surface-variant text-[18px] transition-transform duration-200 group-open/tr:rotate-180">
              expand_more
            </span>
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

  const aiSuggestionsFooter =
    recDept && recType && !aiLoad ? (
      <div className="flex flex-col gap-2 border-t border-outline-variant/15 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <span className="text-xs font-medium text-on-surface-variant sm:text-sm">当前建议</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-primary/15 bg-primary/[0.06] px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/10">
            {recTypeLabel}
          </span>
          <span className="rounded-lg border border-secondary/15 bg-secondary/[0.06] px-2 py-0.5 text-xs font-semibold text-secondary dark:bg-secondary/10">
            {recDeptLabel}
          </span>
          <PortalButton variant="primary" size="sm" className="rounded-lg px-3 font-bold" onClick={applyAi}>
            一键填入
          </PortalButton>
        </div>
      </div>
    ) : null;

  const aiBanner = (taskLayout: 'vertical' | 'responsive') => (
    <div className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest/90 px-3 py-3 shadow-sm dark:bg-surface-container-lowest/60 md:px-3.5 md:py-3.5">
      <div className="flex gap-2.5 rounded-lg border-l-[3px] border-l-primary bg-surface/50 py-2 pl-2.5 pr-2 dark:bg-surface/30">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[22px] text-primary" aria-hidden>
          bolt
        </span>
        <div className="min-w-0">
          <p className="font-headline text-sm font-bold text-on-surface">智能辅助</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-on-surface-variant sm:text-xs">
            {taskLayout === 'vertical'
              ? '窄栏采用纵向步骤，随表单滚动即可对照进度。'
              : '宽屏可横向浏览步骤；需要时下滑使用案例与工具。'}
          </p>
        </div>
      </div>
      <AiTaskProgress
        steps={['撰写标题与正文', '匹配部门与类型', '应用到表单']}
        activeIndex={aiStepIndex}
        allComplete={aiAllComplete}
        helperText={aiHelper}
        showElapsed={mergedText.length >= 14 && !!(aiLoad || aiAllComplete)}
        layout={taskLayout}
        className={
          taskLayout === 'vertical'
            ? '!border-0 !bg-transparent !px-0 !py-0 !shadow-none sm:!px-0'
            : undefined
        }
      />
      {aiSuggestionsFooter}
    </div>
  );

  const formInner = (
    <div className="grid w-full grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,28rem)] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,30rem)] xl:gap-10">
      <div className="min-w-0 space-y-4 md:space-y-5">
        {okMsg ? <p className="text-sm font-semibold text-success">{okMsg}</p> : null}

        <div className="md:hidden">{aiBanner('responsive')}</div>

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
            {sensLoad
              ? (
                  <>
                    敏感词筛查：正在检测标题与正文…（已用时{' '}
                    <span className="font-mono font-semibold tabular-nums text-primary">{formatAiElapsed(sensElapsedMs)}</span>）
                  </>
                )
              : '敏感词筛查：仅在您点击「提交诉求」时检测（本地词库优先，必要时再请求大模型复审）；若命中敏感词请修改后再次提交。'}
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
        {configuredImageField ? (
          <div>
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
              <label htmlFor="appeal-config-image-upload" className="text-sm font-bold text-on-surface">
                {configuredImageField.label}
                {configuredImageField.required ? <span className="ml-1 text-red-500">*</span> : null}
              </label>
              <span className="text-xs text-on-surface-variant">
                演示环境以 Data URL 存入本地 Mock；单张不超过 4MB，最多 {MAX_APPEAL_IMAGE_FILES} 张
              </span>
            </div>
            <input
              id="appeal-config-image-upload"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={onAppealImagesChange}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="appeal-config-image-upload"
                className="inline-flex cursor-pointer rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:border-primary/35 hover:bg-primary/5"
              >
                选择图片
              </label>
              <span className="text-xs text-on-surface-variant">
                {appealImages.length > 0 ? `已选 ${appealImages.length} 张` : configuredImageField.required ? '必填' : '可选'}
              </span>
            </div>
            {appealImages.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-3">
                {appealImages.map((src, idx) => (
                  <li key={`img-${idx}-${src.length}`} className="relative">
                    <img
                      src={src}
                      alt=""
                      className="h-20 w-20 rounded-lg border border-outline-variant/30 object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-high text-sm font-bold leading-none text-on-surface shadow ring-1 ring-outline-variant/40"
                      aria-label="移除该图片"
                      onClick={() => setAppealImages((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              id="appeal-is-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-5 w-5 min-h-5 min-w-5 shrink-0 cursor-pointer rounded border-2 border-outline-variant bg-surface-container-lowest text-primary accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <span className="text-sm">公开诉求</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              id="appeal-is-anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-5 w-5 min-h-5 min-w-5 shrink-0 cursor-pointer rounded border-2 border-outline-variant bg-surface-container-lowest text-primary accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <span className="text-sm">匿名</span>
          </label>
        </div>
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
        className="min-w-0 border-t border-outline-variant/20 pt-6 md:sticky md:top-24 md:mt-0 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:border-0 md:border-l md:border-outline-variant/15 md:pl-5 md:pt-0 md:pr-0.5 xl:pl-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="智能辅助与参考工具"
      >
        <div className="hidden md:block">
          <div className="mb-8">{aiBanner('vertical')}</div>
        </div>
        <h2 className="mb-1.5 font-headline text-base font-bold text-on-surface md:text-sm md:font-semibold">
          参考与工具
        </h2>
        <p className="mb-4 text-xs leading-relaxed text-on-surface-variant md:mb-5">
          {isMobile
            ? '以下为可选项；直接填表即可提交，需要时再展开使用。'
            : '案例帮写、判重、翻译等可选工具，不改变您左侧已填内容。'}
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
