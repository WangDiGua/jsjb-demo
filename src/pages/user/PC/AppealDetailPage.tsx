import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appealService, replyService, flowService, filterFlowRecordsForPublicPortal } from '@/mock';
import type { Appeal, Reply, FlowRecord, FlowAction } from '@/mock/types';
import { useAppStore } from '@/store';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { PortalButton } from './ui';
import { portalToast } from './shell/portalFeedbackStore';

const statusText: Record<string, string> = {
  pending: '待受理',
  accepted: '已受理',
  processing: '处理中',
  reply_draft: '答复审核中',
  replied: '已答复',
  returned: '已退回',
  withdrawn: '已撤销',
  closed: '已关闭',
};

function statusBadgeClass(status: Appeal['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-900 ring-amber-200/90 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800/50';
    case 'accepted':
    case 'processing':
      return 'bg-emerald-50 text-emerald-900 ring-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800/40';
    case 'reply_draft':
      return 'bg-violet-50 text-violet-900 ring-violet-200/90 dark:bg-violet-950/40 dark:text-violet-100 dark:ring-violet-800/40';
    case 'replied':
      return 'bg-primary/12 text-primary ring-primary/25';
    case 'returned':
      return 'bg-red-50 text-red-900 ring-red-200/80 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900/40';
    case 'withdrawn':
    case 'closed':
      return 'bg-surface-container-high text-on-surface-variant ring-outline-variant/25';
    default:
      return 'bg-surface-container-high text-on-surface-variant ring-outline-variant/25';
  }
}

const FLOW_UI: Record<
  FlowAction,
  { label: string; icon: string; rail: string; iconWrap: string }
> = {
  submit: { label: '提交诉求', icon: 'send', rail: 'bg-surface-container-high dark:bg-surface-container', iconWrap: 'bg-surface-container-low text-on-surface-variant dark:bg-surface-container-high dark:text-on-surface' },
  accept: { label: '受理', icon: 'task_alt', rail: 'bg-primary', iconWrap: 'bg-primary/15 text-primary' },
  transfer: { label: '转派', icon: 'swap_horiz', rail: 'bg-secondary', iconWrap: 'bg-secondary/15 text-secondary' },
  reply: { label: '答复', icon: 'chat', rail: 'bg-success', iconWrap: 'bg-success/15 text-success' },
  return: { label: '退回', icon: 'undo', rail: 'bg-red-500', iconWrap: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200' },
  escalate: { label: '上报', icon: 'trending_up', rail: 'bg-amber-500', iconWrap: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-100' },
  evaluate: { label: '评价', icon: 'star', rail: 'bg-accent', iconWrap: 'bg-accent/20 text-amber-900 dark:text-amber-200' },
  urge: { label: '催办', icon: 'notification_important', rail: 'bg-orange-500', iconWrap: 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-100' },
  resubmit: { label: '再次提交', icon: 'refresh', rail: 'bg-surface-container', iconWrap: 'bg-surface-container-low text-on-surface dark:bg-surface-container-high dark:text-on-surface-variant' },
  instruct: { label: '批示', icon: 'sticky_note_2', rail: 'bg-indigo-500', iconWrap: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100' },
  supervise: { label: '督办', icon: 'visibility', rail: 'bg-purple-500', iconWrap: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-100' },
  report_leader: { label: '校办关注', icon: 'school', rail: 'bg-blue-600', iconWrap: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-100' },
  process: { label: '办理中', icon: 'progress_activity', rail: 'bg-teal-500', iconWrap: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-100' },
  reply_submit_review: { label: '答复送审', icon: 'reviews', rail: 'bg-violet-500', iconWrap: 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-100' },
  reply_approve: { label: '审核通过', icon: 'check_circle', rail: 'bg-success', iconWrap: 'bg-success/15 text-success' },
  reply_reject: { label: '审核驳回', icon: 'cancel', rail: 'bg-red-500', iconWrap: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200' },
};

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: max }, (_, i) => {
        const on = i < rating;
        return (
          <span
            key={i}
            className={`material-symbols-outlined text-[22px] leading-none ${on ? 'text-amber-500' : 'text-outline-variant/35 dark:text-surface-container-high'}`}
            style={{ fontVariationSettings: on ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400" }}
          >
            star
          </span>
        );
      })}
    </div>
  );
}

function DetailSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hall-panel rounded-[2rem]">
      <div className="flex items-start gap-3 border-b border-outline-variant/12 px-5 py-4 sm:gap-4 sm:px-6 sm:py-5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-[22px] text-primary material-symbols-outlined"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface sm:text-xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{subtitle}</p> : null}
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

export default function AppealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const currentUser = useAppStore((s) => s.currentUser);
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [nudgeMsg, setNudgeMsg] = useState('');
  const viewCountedIdRef = useRef<string | null>(null);
  const viewTrackIdRef = useRef<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [a, r, f] = await Promise.all([
        appealService.getAppeal(id),
        replyService.getRepliesForViewer(id, currentUser),
        flowService.getFlowRecords(id),
      ]);
      setAppeal(a);
      setReplies(r);
      setFlows(f);
      if (a?.评价) {
        setRating(a.评价.rating);
        setComment(a.评价.comment || '');
      }
    } catch (e) {
      portalToast.error(e instanceof Error ? e.message : '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (viewTrackIdRef.current !== id) {
      viewCountedIdRef.current = null;
      viewTrackIdRef.current = id;
    }
  }, [id]);

  useEffect(() => {
    if (!id || !appeal || appeal.id !== id) return;
    if (viewCountedIdRef.current === id) return;
    viewCountedIdRef.current = id;
    void appealService.incrementAppealView(id).then(() => {
      setAppeal((p) => (p && p.id === id ? { ...p, 浏览量: (p.浏览量 ?? 0) + 1 } : p));
    });
  }, [id, appeal?.id]);

  useEffect(() => {
    const onUp = () => void fetchData();
    window.addEventListener('jsjb-mock-updated', onUp);
    return () => window.removeEventListener('jsjb-mock-updated', onUp);
  }, [fetchData]);

  const sortedFlows = useMemo(() => {
    const visible = filterFlowRecordsForPublicPortal(flows);
    return [...visible].sort((a, b) => {
      const ta = new Date(a.createTime.replace(/-/g, '/')).getTime();
      const tb = new Date(b.createTime.replace(/-/g, '/')).getTime();
      return ta - tb;
    });
  }, [flows]);

  const handleEvaluate = async () => {
    if (!id) return;
    setEvaluating(true);
    try {
      await appealService.evaluateAppeal(id, rating, comment);
      const a = await appealService.getAppeal(id);
      setAppeal(a);
      portalToast.success('评价已提交，感谢您的反馈');
    } catch (e) {
      portalToast.error(e instanceof Error ? e.message : '提交失败');
    } finally {
      setEvaluating(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      portalToast.error('复制失败，请手动选择文本');
    }
  };

  const handleNudge = async () => {
    if (!id || !currentUser) return;
    try {
      const r = await appealService.nudgeAppeal(id, { id: currentUser.id, nickname: currentUser.nickname });
      if (r.ok) portalToast.success(r.message);
      else portalToast.warning(r.message);
      setNudgeMsg(r.message);
      setTimeout(() => setNudgeMsg(''), 4000);
      void fetchData();
    } catch (e) {
      portalToast.error(e instanceof Error ? e.message : '催办失败');
    }
  };

  if (loading) {
    const spin = (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
        <p className="text-sm font-medium text-on-surface-variant">加载详情…</p>
      </div>
    );
    if (isMobile) {
      return <MobileSubPageScaffold title="诉求详情">{spin}</MobileSubPageScaffold>;
    }
    return spin;
  }

  if (!appeal) {
    const empty = (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">search_off</span>
        <p className="font-semibold text-on-surface">诉求不存在或已删除</p>
        <PortalButton variant="primary" size="md" className="mt-2" onClick={() => navigate('/user/appeal/list')}>
          返回公开列表
        </PortalButton>
      </div>
    );
    if (isMobile) {
      return (
        <MobileSubPageScaffold title="诉求详情" onBack={() => navigate('/user/appeal/list')}>
          {empty}
        </MobileSubPageScaffold>
      );
    }
    return empty;
  }

  const copyRight = (
    <button
      type="button"
      className={`m-portal-tap-clear inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
        copied
          ? 'bg-success/15 text-success ring-1 ring-success/35'
          : 'bg-surface-container-high/90 text-on-surface ring-1 ring-outline-variant/25 hover:bg-surface-container-high active:scale-[0.98] dark:bg-surface-container dark:ring-outline-variant/35'
      }`}
      onClick={() => copy(`${appeal.title}\n${appeal.content}`)}
    >
      {copied ? (
        <>
          <span className="material-symbols-outlined text-[18px] leading-none">check</span>
          已复制
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[18px] leading-none">content_copy</span>
          复制正文
        </>
      )}
    </button>
  );

  const metaItems = [
    { label: '类型', value: appeal.type },
    { label: '提交人', value: appeal.isAnonymous ? '匿名' : appeal.userName },
    { label: '提交时间', value: appeal.createTime },
    { label: '浏览次数', value: String(appeal.浏览量 ?? 0) },
  ];

  const detailSections = (
    <div className="space-y-5 sm:space-y-6">
      {/* Summary hero */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant/18 bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary/[0.04] shadow-[0_14px_48px_-24px_rgba(15,23,42,0.22)] dark:border-outline-variant/25 dark:from-surface-container-lowest/90 dark:to-primary/[0.06] dark:shadow-[0_14px_48px_-24px_rgba(0,0,0,0.55)]">
        <div className={`${isMobile ? 'px-4 py-6' : 'px-6 py-8 sm:px-8'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="max-w-3xl font-headline text-2xl font-bold leading-snug tracking-tight text-on-surface sm:text-3xl">
              {appeal.title}
            </h2>
            <span
              className={`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${statusBadgeClass(appeal.status)}`}
            >
              {statusText[appeal.status] ?? appeal.status}
            </span>
          </div>

          <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metaItems.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-outline-variant/12 bg-surface/70 px-4 py-3 dark:bg-surface-container/50"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant/85">{row.label}</dt>
                <dd className="mt-1.5 text-sm font-semibold leading-snug text-on-surface tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>

          {appeal.status === 'reply_draft' && currentUser?.id === appeal.userId ? (
            <div className="mt-6 flex gap-3 rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-50">
              <span className="material-symbols-outlined shrink-0 text-amber-600 dark:text-amber-300">hourglass_top</span>
              <p className="leading-relaxed">
                承办部门已提交答复，正在审核中。审核通过后您将在此处看到正式答复。
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {currentUser?.id === appeal.userId &&
            ['pending', 'accepted', 'processing', 'reply_draft'].includes(appeal.status) ? (
              <PortalButton type="button" variant="outline" size="sm" className="font-semibold" onClick={() => void handleNudge()}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                  催办进度
                </span>
              </PortalButton>
            ) : null}
            {currentUser?.id === appeal.userId && ['returned', 'withdrawn'].includes(appeal.status) ? (
              <PortalButton
                type="button"
                variant="primary"
                size="sm"
                className="font-semibold"
                onClick={() => navigate(`/user/appeal/create?resubmit=${appeal.id}`)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">add_comment</span>
                  再次提问
                </span>
              </PortalButton>
            ) : null}
          </div>
          {nudgeMsg ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-primary/8 px-3 py-2 text-sm font-medium text-primary dark:bg-primary/15">
              <span className="material-symbols-outlined shrink-0 text-[18px]">check_circle</span>
              {nudgeMsg}
            </p>
          ) : null}
        </div>
      </div>

      <DetailSection icon="article" title="诉求内容" subtitle="您提交的问题与诉求原文">
        <div className="max-w-3xl rounded-xl bg-surface-container-high/40 px-4 py-4 dark:bg-surface-container/35">
          <p className="whitespace-pre-wrap text-[15px] leading-[1.75] text-on-surface">{appeal.content}</p>
        </div>
        {appeal.images?.length ? (
          <div className="mt-5 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
            {appeal.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`附图 ${i + 1}`}
                className="aspect-video w-full rounded-lg object-cover ring-1 ring-outline-variant/20"
              />
            ))}
          </div>
        ) : null}
      </DetailSection>

      <DetailSection icon="forum" title="部门答复" subtitle="承办单位对外发布的正式回复">
        {replies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/35 bg-surface-container-high/25 px-6 py-12 text-center dark:border-outline-variant/45 dark:bg-surface-container/25">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">mark_chat_unread</span>
            <p className="mt-3 text-sm font-semibold text-on-surface">等待承办部门答复</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
              受理后将由对口单位处理，您可在「我的诉求」中关注进度。
            </p>
          </div>
        ) : (
          <ul className="m-0 list-none space-y-4 p-0">
            {replies.map((reply) => (
              <li key={reply.id}>
                <article className="max-w-3xl rounded-2xl border border-outline-variant/15 bg-surface-container-high/35 p-4 shadow-sm dark:border-outline-variant/25 dark:bg-surface-container/40 sm:p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-base font-bold text-primary">
                      {reply.handlerName[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <span className="font-headline font-bold text-on-surface">{reply.handlerName}</span>
                        <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary ring-1 ring-primary/15">
                          官方
                        </span>
                      </div>
                      <time className="mt-0.5 block text-xs font-medium text-on-surface-variant tabular-nums">{reply.createTime}</time>
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-[1.75] text-on-surface">{reply.content}</p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {appeal.status === 'replied' && !appeal.评价 ? (
        <DetailSection icon="star" title="服务评价" subtitle="您的反馈有助于我们持续改进服务质量">
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="rounded-lg p-1.5 transition-transform hover:bg-surface-container-high/60 active:scale-95"
                onClick={() => setRating(n)}
                aria-label={`${n} 星`}
              >
                <span
                  className={`material-symbols-outlined text-4xl leading-none ${n <= rating ? 'text-amber-500' : 'text-outline-variant/30'}`}
                  style={{ fontVariationSettings: n <= rating ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400" }}
                >
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            className="mt-4 max-w-xl w-full rounded-xl border border-outline-variant/25 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/55 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-outline-variant/45 dark:bg-surface-container-low/50"
            rows={3}
            placeholder="选填：具体意见或建议"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <PortalButton
            type="button"
            variant="primary"
            size="md"
            disabled={evaluating}
            className="mt-5 min-w-[8rem] font-semibold"
            onClick={() => void handleEvaluate()}
          >
            {evaluating ? '提交中…' : '提交评价'}
          </PortalButton>
        </DetailSection>
      ) : null}

      {appeal.评价 ? (
        <DetailSection icon="reviews" title="办事评价" subtitle="您对本次办理服务的评分与留言">
          <div className="flex flex-wrap items-center gap-3">
            <StarRow rating={appeal.评价.rating} />
            <span className="rounded-lg bg-amber-500/12 px-2.5 py-1 text-sm font-bold tabular-nums text-amber-900 dark:text-amber-100">
              {appeal.评价.rating} / 5
            </span>
          </div>
          {appeal.评价.comment ? (
            <blockquote className="mt-5 max-w-xl rounded-xl border-l-4 border-success/60 bg-success/6 px-4 py-3 text-sm leading-relaxed text-on-surface dark:bg-success/10">
              {appeal.评价.comment}
            </blockquote>
          ) : null}
        </DetailSection>
      ) : null}

      <DetailSection
        icon="timeline"
        title="办理流程"
        subtitle="按时间展示对您公开的节点（不含内部上报、领导批示、督办及答复送审等内部环节）"
      >
        {sortedFlows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/35 bg-surface-container-high/25 px-6 py-10 text-center dark:border-outline-variant/45 dark:bg-surface-container/25">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/35">timeline</span>
            <p className="mt-3 text-sm font-semibold text-on-surface">暂无可见流程记录</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">
              提交、受理等对外节点会在办理中写入；若仅有内部办理记录，此处可能暂时为空。您也可通过上方整体状态了解进度。
            </p>
          </div>
        ) : (
          <ol className="relative m-0 max-w-3xl list-none space-y-0 p-0">
            {sortedFlows.map((flow, idx) => {
              const ui = FLOW_UI[flow.action];
              const last = idx === sortedFlows.length - 1;
              return (
                <li key={flow.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {!last ? (
                    <span
                      className="absolute left-[17px] top-10 h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-outline-variant/45 via-outline-variant/25 to-transparent dark:from-outline-variant/40 dark:via-outline-variant/20"
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={`relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-md ${ui.iconWrap}`}
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">{ui.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-outline-variant/12 bg-surface-container-high/30 px-4 py-3 dark:border-outline-variant/20 dark:bg-surface-container/35">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-headline text-sm font-bold text-on-surface sm:text-base">{ui.label}</span>
                      <span className="text-xs font-medium text-on-surface-variant">{flow.operatorName}</span>
                    </div>
                    <time className="mt-1 block text-xs text-on-surface-variant tabular-nums">{flow.createTime}</time>
                    {flow.content ? (
                      <p className="mt-2 max-w-prose text-sm leading-relaxed text-on-surface">{flow.content}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </DetailSection>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="诉求详情" right={copyRight} contentClassName="pb-10">
        {detailSections}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="sticky top-20 z-30 -mx-4 mb-8 flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/15 bg-surface/92 px-4 py-3 shadow-sm backdrop-blur-lg dark:border-outline-variant/30 dark:bg-surface/90 sm:static sm:top-0 sm:mx-0 sm:mb-10 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-none">
        <PortalButton variant="link" size="md" className="shrink-0 p-0 text-sm font-semibold text-primary" onClick={() => navigate(-1)}>
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xl leading-none">arrow_back</span>
            返回
          </span>
        </PortalButton>
        <h1 className="min-w-0 flex-1 truncate text-center font-headline text-base font-bold text-on-surface sm:text-lg">诉求详情</h1>
        {copyRight}
      </header>
      {detailSections}
    </div>
  );
}
