import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appealService, replyService, flowService, aiService } from '@/mock';
import type { Appeal, Reply, FlowRecord, FlowAction } from '@/mock/types';
import { useAppStore } from '@/store';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { PortalButton } from './ui';

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
  const [evalSensErr, setEvalSensErr] = useState('');
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

  const handleEvaluate = async () => {
    if (!id) return;
    setEvalSensErr('');
    const c = comment.trim();
    if (c.length > 0) {
      try {
        const r = await aiService.checkSensitiveWords(c);
        if (!r.ok) {
          setEvalSensErr('内容安全检测未完成，请检查网络后重试');
          return;
        }
        if (r.hasSensitive) {
          setEvalSensErr(`评价文字包含不适宜表述：${r.words.join('、')}`);
          return;
        }
      } catch (e) {
        setEvalSensErr(e instanceof Error ? e.message : '敏感词检测失败');
        return;
      }
    }
    setEvaluating(true);
    try {
      await appealService.evaluateAppeal(id, rating, comment);
      const a = await appealService.getAppeal(id);
      setAppeal(a);
    } catch (e) {
      setEvalSensErr(e instanceof Error ? e.message : '提交失败');
    } finally {
      setEvaluating(false);
    }
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNudge = async () => {
    if (!id || !currentUser) return;
    const r = await appealService.nudgeAppeal(id, { id: currentUser.id, nickname: currentUser.nickname });
    setNudgeMsg(r.ok ? r.message : r.message);
    setTimeout(() => setNudgeMsg(''), 4000);
    void fetchData();
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

  const sortedFlows = [...flows].sort((a, b) => {
    const ta = new Date(a.createTime.replace(/-/g, '/')).getTime();
    const tb = new Date(b.createTime.replace(/-/g, '/')).getTime();
    return ta - tb;
  });

  const copyRight = (
    <button
      type="button"
      className={`m-portal-tap-clear shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-all ${
        copied
          ? 'bg-success/15 text-success ring-1 ring-success/30'
          : 'bg-surface-container-high text-on-surface-variant ring-1 ring-outline-variant/20 active:bg-surface-container-high/80 dark:bg-surface-container'
      }`}
      onClick={() => copy(`${appeal.title}\n${appeal.content}`)}
    >
      {copied ? (
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px] leading-none">check</span>
          已复制
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px] leading-none">content_copy</span>
          复制
        </span>
      )}
    </button>
  );

  const detailSections = (
    <div
      className={`border-outline-variant/20 bg-surface-container-lowest dark:border-outline-variant/30 ${
        isMobile ? 'border-y' : 'rounded-md border shadow-sm'
      }`}
    >
      {/* 诉求标题与正文 */}
      <div className={`${isMobile ? 'px-4 py-6' : 'px-8 py-8 lg:px-12 lg:py-10'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 gap-y-2">
          <h2 className="max-w-4xl font-headline text-xl font-bold leading-snug tracking-tight text-on-surface lg:text-2xl">
            {appeal.title}
          </h2>
          <span
            className={`shrink-0 rounded px-2.5 py-1 text-xs font-bold ring-1 ${statusBadgeClass(appeal.status)}`}
          >
            {statusText[appeal.status] ?? appeal.status}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-b border-outline-variant/15 pb-6 text-sm">
          <span>
            <span className="text-on-surface-variant">类型</span>
            <span className="ml-2 font-semibold text-on-surface">{appeal.type}</span>
          </span>
          <span>
            <span className="text-on-surface-variant">提交人</span>
            <span className="ml-2 font-semibold text-on-surface">{appeal.isAnonymous ? '匿名' : appeal.userName}</span>
          </span>
          <span className="tabular-nums">
            <span className="text-on-surface-variant">提交时间</span>
            <span className="ml-2 font-semibold text-on-surface">{appeal.createTime}</span>
          </span>
          <span className="tabular-nums">
            <span className="text-on-surface-variant">浏览</span>
            <span className="ml-2 font-semibold text-on-surface">{appeal.浏览量 ?? 0}</span>
          </span>
        </div>

        {appeal.status === 'reply_draft' && currentUser?.id === appeal.userId ? (
          <div className="mt-6 flex gap-3 border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/25 dark:text-amber-50">
            <span className="material-symbols-outlined shrink-0 text-amber-600 dark:text-amber-300">hourglass_top</span>
            <p>承办部门已提交答复，正在审核中。审核通过后您将在此处看到正式答复。</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {currentUser?.id === appeal.userId &&
          ['pending', 'accepted', 'processing', 'reply_draft'].includes(appeal.status) ? (
            <PortalButton type="button" variant="outline" size="sm" className="font-bold" onClick={() => void handleNudge()}>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                催办
              </span>
            </PortalButton>
          ) : null}
          {currentUser?.id === appeal.userId && ['returned', 'withdrawn'].includes(appeal.status) ? (
            <PortalButton
              type="button"
              variant="primary"
              size="sm"
              className="font-bold"
              onClick={() => navigate(`/user/appeal/create?resubmit=${appeal.id}`)}
            >
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">add_comment</span>
                再次提问
              </span>
            </PortalButton>
          ) : null}
        </div>
        {nudgeMsg ? (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {nudgeMsg}
          </p>
        ) : null}

        <div className="mt-10">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">诉求内容</h3>
          <div className="mt-3 max-w-4xl border-l-2 border-primary/35 pl-5">
            <p className="whitespace-pre-wrap text-base leading-[1.7] text-on-surface">{appeal.content}</p>
          </div>
          {appeal.images?.length ? (
            <div className="mt-6 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
              {appeal.images.map((img, i) => (
                <img key={i} src={img} alt="" className="aspect-video w-full rounded object-cover ring-1 ring-black/5" />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {appeal.领导批示 ? (
        <div className={`border-t border-outline-variant/15 ${isMobile ? 'px-4 py-6' : 'px-8 py-8 lg:px-12 lg:py-10'}`}>
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">校领导批示</h3>
          <p className="mt-1 text-sm text-on-surface-variant">重要事项交办意见（如有）</p>
          <div className="mt-4 max-w-4xl rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-3 dark:bg-indigo-500/10">
            <p className="text-sm font-semibold text-on-surface">
              {appeal.领导批示.leaderName}
              <span className="ml-2 font-normal text-on-surface-variant tabular-nums">{appeal.领导批示.time}</span>
            </p>
            <p className="mt-2 whitespace-pre-wrap text-base leading-[1.7] text-on-surface">{appeal.领导批示.content}</p>
          </div>
        </div>
      ) : null}

      {/* 部门答复 */}
      <div className={`border-t border-outline-variant/15 ${isMobile ? 'px-4 py-6' : 'px-8 py-8 lg:px-12 lg:py-10'}`}>
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">部门答复</h3>
        <p className="mt-1 text-sm text-on-surface-variant">承办单位的正式回复</p>
        <div className="mt-6">
          {replies.length === 0 ? (
            <div className="border border-dashed border-outline-variant/35 py-12 text-center dark:border-outline-variant/50">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">forum</span>
              <p className="mt-2 text-sm font-medium text-on-surface-variant">等待承办部门答复</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-on-surface-variant/80">
                受理后将由对口单位处理，您可在「我的诉求」中查看进度。
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {replies.map((reply) => (
                <article key={reply.id} className="max-w-4xl border-l-2 border-primary/50 pl-5">
                  <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-primary/12 text-sm font-bold text-primary">
                      {reply.handlerName[0]}
                    </span>
                    <span className="font-headline font-bold text-on-surface">{reply.handlerName}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
                      官方
                    </span>
                    <time className="text-xs font-medium text-on-surface-variant tabular-nums">{reply.createTime}</time>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-base leading-[1.7] text-on-surface">{reply.content}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 评价 */}
      {appeal.status === 'replied' && !appeal.评价 ? (
        <div className={`border-t border-outline-variant/15 ${isMobile ? 'px-4 py-6' : 'px-8 py-8 lg:px-12 lg:py-10'}`}>
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">服务评价</h3>
          <p className="mt-1 text-sm text-on-surface-variant">您的反馈有助于持续改进服务质量</p>
          <div className="mt-5 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="p-1 transition-transform active:scale-95"
                onClick={() => setRating(n)}
                aria-label={`${n} 星`}
              >
                <span
                  className={`material-symbols-outlined text-3xl leading-none ${n <= rating ? 'text-amber-500' : 'text-outline-variant/35'}`}
                  style={{ fontVariationSettings: n <= rating ? "'FILL' 1, 'wght' 500" : "'FILL' 0" }}
                >
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            className="mt-4 max-w-2xl w-full border border-outline-variant/30 bg-surface px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/25 dark:border-outline-variant/50 dark:bg-surface-container-low/40"
            rows={3}
            placeholder="选填：具体意见或建议"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setEvalSensErr('');
            }}
          />
          {evalSensErr ? <p className="mt-3 text-sm text-red-600">{evalSensErr}</p> : null}
          <PortalButton
            type="button"
            variant="primary"
            size="md"
            disabled={evaluating}
            className="mt-4 px-8 font-bold"
            onClick={() => void handleEvaluate()}
          >
            {evaluating ? '提交中…' : '提交评价'}
          </PortalButton>
        </div>
      ) : null}

      {appeal.评价 ? (
        <div className={`border-t border-outline-variant/15 ${isMobile ? 'px-4 py-6' : 'px-8 py-8 lg:px-12 lg:py-10'}`}>
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">办事评价</h3>
          <div className="mt-3 flex items-center gap-2">
            <StarRow rating={appeal.评价.rating} />
            <span className="text-sm font-semibold text-on-surface">{appeal.评价.rating} / 5</span>
          </div>
          {appeal.评价.comment ? (
            <blockquote className="mt-4 max-w-2xl border-l-2 border-success/50 py-0.5 pl-4 text-sm leading-relaxed text-on-surface">
              {appeal.评价.comment}
            </blockquote>
          ) : null}
        </div>
      ) : null}

      {/* 办理流程 */}
      <div className={`border-t border-outline-variant/15 ${isMobile ? 'px-4 py-6' : 'px-8 py-8 lg:px-12 lg:pb-10 lg:pt-8'}`}>
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">办理流程</h3>
        <p className="mt-1 text-sm text-on-surface-variant">按时间顺序的关键节点</p>
        {sortedFlows.length === 0 ? (
          <div className="mt-6 border border-dashed border-outline-variant/35 py-10 text-center dark:border-outline-variant/50">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/35">timeline</span>
            <p className="mt-2 text-sm font-medium text-on-surface-variant">暂无流程记录</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-on-surface-variant/75">
              提交、受理、答复等节点会在办理过程中自动写入。若刚创建诉求，请稍后刷新查看。
            </p>
          </div>
        ) : (
          <ol className="relative m-0 mt-8 max-w-3xl list-none space-y-0 p-0">
            {sortedFlows.map((flow, idx) => {
              const ui = FLOW_UI[flow.action];
              const last = idx === sortedFlows.length - 1;
              return (
                <li
                  key={flow.id}
                  className={`relative flex gap-4 ${last ? 'pb-0' : 'border-b border-outline-variant/10 pb-6'}`}
                >
                  {!last ? (
                    <div
                      className={`absolute left-[15px] top-8 h-[calc(100%-0.5rem)] w-px ${ui.rail} opacity-40`}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ui.iconWrap}`}
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">{ui.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-headline font-bold text-on-surface">{ui.label}</span>
                      <span className="text-xs font-medium text-on-surface-variant">{flow.operatorName}</span>
                    </div>
                    <time className="mt-0.5 block text-xs text-on-surface-variant/90 tabular-nums">{flow.createTime}</time>
                    {flow.content ? (
                      <p className="mt-2 max-w-prose text-sm leading-relaxed text-on-surface">{flow.content}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 lg:px-8">
      <header className="sticky top-0 z-10 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-outline-variant/15 bg-surface/90 px-4 py-3 backdrop-blur-md dark:bg-surface/88 dark:border-outline-variant/40 sm:static sm:mx-0 sm:mb-8 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <PortalButton variant="link" size="md" className="shrink-0 p-0 text-sm font-bold text-primary" onClick={() => navigate(-1)}>
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
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
