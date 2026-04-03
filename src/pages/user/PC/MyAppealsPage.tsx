import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { appealService } from '@/mock';
import type { Appeal } from '@/mock/types';
import { useAppStore } from '@/store';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { PortalButton } from './ui';
import { portalConfirm } from './shell/portalFeedbackStore';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';

const statusMap: Record<string, string> = {
  pending: '待受理',
  accepted: '已受理',
  processing: '处理中',
  reply_draft: '答复审核中',
  replied: '已答复',
  returned: '已退回',
  withdrawn: '已撤销',
};

/** 移动端：线框 + 淡填充，偏 iOS 分段控件感 */
const statusBadgeMobile: Record<string, string> = {
  pending:
    'bg-amber-500/[0.08] text-amber-800 ring-1 ring-amber-500/20 dark:bg-amber-950/35 dark:text-amber-100 dark:ring-amber-500/25',
  accepted: 'bg-primary/[0.08] text-primary ring-1 ring-primary/20 dark:bg-primary/15 dark:ring-primary/25',
  processing:
    'bg-emerald-500/[0.08] text-emerald-800 ring-1 ring-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-500/20',
  reply_draft:
    'bg-violet-500/[0.08] text-violet-800 ring-1 ring-violet-500/20 dark:bg-violet-950/40 dark:text-violet-100 dark:ring-violet-400/20',
  replied: 'bg-sky-500/[0.08] text-sky-800 ring-1 ring-sky-500/20 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-400/25',
  returned: 'bg-red-500/[0.08] text-red-800 ring-1 ring-red-500/20 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-400/20',
  withdrawn: 'bg-on-surface/[0.05] text-on-surface-variant ring-1 ring-outline-variant/30',
};

export default function MyAppealsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const currentUser = useAppStore((s) => s.currentUser);
  const [tab, setTab] = useState<string>('all');
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppeals = useCallback(async () => {
    if (!currentUser?.id) {
      setAppeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setAppeals(await appealService.getMyAppeals(currentUser.id));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void fetchAppeals();
  }, [fetchAppeals]);

  useMockDbUpdated(fetchAppeals);

  const filtered =
    tab === 'all'
      ? appeals
      : tab === 'pending'
        ? appeals.filter((a) => ['pending', 'accepted', 'processing', 'reply_draft'].includes(a.status))
        : appeals.filter((a) => a.status === (tab as Appeal['status']));

  const withdraw = async (id: string) => {
    if (!(await portalConfirm('确定撤销该诉求？'))) return;
    await appealService.withdrawAppeal(id);
    void fetchAppeals();
  };

  const remove = async (id: string) => {
    if (!(await portalConfirm('确定删除？'))) return;
    await appealService.deleteAppeal(id);
    void fetchAppeals();
  };

  const tabs = [
    { key: 'all', label: `全部 (${appeals.length})` },
    {
      key: 'pending',
      label: `待处理 (${appeals.filter((a) => ['pending', 'accepted', 'processing', 'reply_draft'].includes(a.status)).length})`,
    },
    { key: 'replied', label: `已答复 (${appeals.filter((a) => a.status === 'replied').length})` },
    { key: 'returned', label: `退回 (${appeals.filter((a) => a.status === 'returned').length})` },
    { key: 'withdrawn', label: `已撤销 (${appeals.filter((a) => a.status === 'withdrawn').length})` },
  ];

  const guest = (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest py-12 text-center shadow-sm sm:py-16">
      <p className="mb-6 px-4 text-on-surface-variant">登录后可查看与管理您提交的诉求。</p>
      <PortalButton variant="primary" size="lg" className="font-bold shadow-primary/25" onClick={() => navigate('/user/login')}>
        去登录
      </PortalButton>
    </div>
  );

  const tabBar = isMobile ? (
    <div className="-mx-4 mb-4 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-0 flex-nowrap gap-1.5 rounded-2xl border border-outline-variant/12 bg-surface p-1.5 shadow-[0_1px_3px_rgba(15,35,52,0.06)] dark:border-outline-variant/20 dark:bg-surface-container-lowest">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`shrink-0 rounded-[0.65rem] px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-[0.98] ${
              tab === t.key
                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                : 'text-on-surface-variant hover:bg-on-surface/[0.04] dark:hover:bg-white/[0.06]'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  ) : (
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            tab === t.key ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:bg-surface'
          }`}
          onClick={() => setTab(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const list = (
    <div
      className={
        isMobile ? 'space-y-3' : 'overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm'
      }
    >
        {loading ? (
          <div className={isMobile ? 'space-y-3' : 'space-y-2 p-4'}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`animate-pulse rounded-2xl bg-on-surface/[0.06] dark:bg-white/[0.06] ${isMobile ? 'h-28' : 'h-20'}`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p
            className={`text-center text-on-surface-variant ${isMobile ? 'rounded-2xl border border-dashed border-outline-variant/25 py-14 text-sm' : 'py-16'}`}
          >
            暂无诉求
          </p>
        ) : (
          <ul className={isMobile ? 'm-0 flex list-none flex-col gap-3 p-0' : 'divide-y divide-outline-variant/15'}>
            {filtered.map((item) => {
              const showWithdraw = item.status === 'pending';
              const showRemove = item.status === 'pending' || item.status === 'withdrawn';
              const showActions = showWithdraw || showRemove;

              if (isMobile) {
                return (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface shadow-[0_2px_12px_-4px_rgba(15,35,52,0.08),0_1px_2px_rgba(15,35,52,0.04)] dark:border-outline-variant/25 dark:bg-surface-container-lowest dark:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.35)]"
                  >
                    <div
                      className={`overflow-hidden bg-on-surface/[0.045] dark:bg-white/[0.06] ${showActions ? 'rounded-t-2xl' : 'rounded-2xl'}`}
                    >
                      <button
                        type="button"
                        className="m-portal-tap-clear flex w-full gap-3.5 p-4 text-left active:bg-on-surface/[0.06] dark:active:bg-white/[0.08]"
                        onClick={() => navigate(`/user/appeal/detail/${item.id}`)}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-[17px] font-bold text-primary ring-1 ring-primary/10 dark:from-primary/25 dark:to-primary/10 dark:ring-primary/20">
                          {item.type[0]}
                        </div>
                        <div className="min-w-0 flex-1 py-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-headline text-[16px] font-semibold leading-[1.35] tracking-[-0.01em] text-on-surface line-clamp-2">
                              {item.title}
                            </p>
                            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-on-surface-variant/30" aria-hidden>
                              chevron_right
                            </span>
                          </div>
                          <span
                            className={`mt-2.5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeMobile[item.status] ?? statusBadgeMobile.withdrawn}`}
                          >
                            {statusMap[item.status] ?? item.status}
                          </span>
                          <div className="mt-3 flex flex-col gap-1.5 text-[12px] leading-normal text-on-surface-variant">
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                              <span className="font-medium text-on-surface/85">{item.type}</span>
                              <span className="text-on-surface-variant/40">·</span>
                              <span className="tabular-nums text-on-surface-variant/90">{item.createTime}</span>
                            </div>
                            {item.评价 ? (
                              <span className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
                                <span className="material-symbols-outlined text-[14px] leading-none">star</span>
                                已评 {item.评价.rating} 星
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </div>
                    {showActions ? (
                      <div className="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-outline-variant/10 bg-on-surface/[0.05] px-4 py-3 dark:border-outline-variant/20 dark:bg-white/[0.07]">
                        {showWithdraw ? (
                          <PortalButton
                            variant="danger"
                            size="sm"
                            className="min-h-10 px-4 font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              void withdraw(item.id);
                            }}
                          >
                            撤销
                          </PortalButton>
                        ) : null}
                        {showRemove ? (
                          <PortalButton
                            variant="danger"
                            size="sm"
                            className="min-h-10 px-4 font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              void remove(item.id);
                            }}
                          >
                            删除
                          </PortalButton>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              }

              return (
                <li key={item.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 gap-4 text-left"
                      onClick={() => navigate(`/user/appeal/detail/${item.id}`)}
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                        {item.type[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-on-surface">
                          <span className="align-middle">{item.title}</span>{' '}
                          <span className="ml-2 inline-block shrink-0 align-middle rounded bg-surface px-2 text-xs font-bold text-on-surface-variant">
                            {statusMap[item.status]}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                          <span>{item.type}</span>
                          <span className="tabular-nums">{item.createTime}</span>
                          {item.评价 ? <span>已评 {item.评价.rating} 星</span> : null}
                        </div>
                      </div>
                    </button>
                    <div className="flex shrink-0 gap-2">
                      {showWithdraw ? (
                        <PortalButton variant="danger" size="sm" className="px-2 font-bold" onClick={() => void withdraw(item.id)}>
                          撤销
                        </PortalButton>
                      ) : null}
                      {showRemove ? (
                        <PortalButton variant="danger" size="sm" className="px-2 font-bold" onClick={() => void remove(item.id)}>
                          删除
                        </PortalButton>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );

  if (!currentUser) {
    if (isMobile) {
      return (
        <MobileSubPageScaffold title="我的诉求" showBack={false} contentClassName="pt-2 pb-8">
          {guest}
        </MobileSubPageScaffold>
      );
    }
    return (
      <div className="w-full">
        <h1 className="mb-8 font-headline text-3xl font-bold text-on-surface">我的诉求</h1>
        {guest}
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="我的诉求" showBack={false} contentClassName="pt-2 pb-8">
        {tabBar}
        {list}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="w-full">
      <h1 className="mb-8 font-headline text-3xl font-bold text-on-surface">我的诉求</h1>
      {tabBar}
      {list}
    </div>
  );
}
