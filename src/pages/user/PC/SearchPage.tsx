import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { appealService, statisticsService } from '@/mock';
import type { Appeal, PortalEfficiency } from '@/mock/types';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { PortalButton } from './ui';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import { portalToast } from './shell/portalFeedbackStore';

const statusMap: Record<string, string> = {
  pending: '待受理',
  accepted: '已受理',
  processing: '处理中',
  reply_draft: '答复审核中',
  replied: '已答复',
  returned: '已退回',
  withdrawn: '已撤销',
};

const badgeCls: Record<string, string> = {
  pending: 'bg-accent/15 text-amber-800',
  accepted: 'bg-primary/10 text-primary',
  processing: 'bg-secondary/15 text-secondary',
  reply_draft: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-100',
  replied: 'bg-success/15 text-success',
  returned: 'bg-red-100 text-red-700',
  withdrawn: 'bg-surface text-on-surface-variant',
};

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
        <span className="material-symbols-outlined shrink-0 text-primary/80 text-[22px] leading-none">{icon}</span>
      </div>
      <p className="mt-3 font-headline text-2xl font-bold tabular-nums tracking-tight text-on-surface sm:text-[1.75rem]">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">{sub}</p> : null}
    </div>
  );
}

function DepartmentBars({
  rows,
  max,
  compact,
}: {
  rows: PortalEfficiency['byDepartment'];
  max: number;
  compact: boolean;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-on-surface-variant">暂无分布数据</p>;
  }
  return (
    <ul className={`space-y-3 ${compact ? '' : 'sm:space-y-3.5'}`}>
      {rows.map((r) => (
        <li key={r.departmentName}>
          <div  className="mb-1 flex justify-between gap-2 text-xs sm:text-sm">
            <span className="min-w-0 truncate font-semibold text-on-surface">{r.departmentName}</span>
            <span className="shrink-0 tabular-nums text-on-surface-variant">
              {r.count} 件
              {r.avgHandleHours > 0 ? (
                <span className="text-on-surface-variant/80"> · 均 {r.avgHandleHours}h</span>
              ) : null}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-500"
              style={{ width: `${max ? Math.min(100, Math.round((r.count / max) * 100)) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrendBars({ trend, compact }: { trend: PortalEfficiency['trend7d']; compact: boolean }) {
  const maxFinish = Math.max(1, ...trend.map((t) => t.finished));
  const maxSub = Math.max(1, ...trend.map((t) => t.submitted));
  const barH = compact ? 88 : 104;
  return (
    <div className="flex items-end justify-between gap-0.5 pt-2 sm:gap-1">
      {trend.map((d) => {
        const hSub = Math.round((d.submitted / maxSub) * barH);
        const hFin = Math.round((d.finished / maxFinish) * barH);
        return (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className="flex w-full max-w-[2.75rem] items-end justify-center gap-0.5 sm:max-w-9"
              style={{ height: barH }}
            >
              <div
                className="w-[42%] max-w-[11px] rounded-t-md bg-secondary/45"
                style={{ height: Math.max(4, hSub) }}
                title={`新增 ${d.submitted}`}
              />
              <div
                className="w-[42%] max-w-[11px] rounded-t-md bg-primary"
                style={{ height: Math.max(4, hFin) }}
                title={`办结 ${d.finished}`}
              />
            </div>
            <span className="truncate text-[10px] font-semibold tabular-nums text-on-surface-variant sm:text-xs">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TypeSegments({ rows, total }: { rows: PortalEfficiency['byType']; total: number }) {
  if (total === 0 || rows.length === 0) {
    return <p className="text-sm text-on-surface-variant">暂无类型分布</p>;
  }
  const palette = ['bg-primary', 'bg-secondary', 'bg-teal-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-400'];
  return (
    <div>
      <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full ring-1 ring-outline-variant/15">
        {rows.map((r, i) => (
          <div
            key={r.type}
            className={`${palette[i % palette.length]} min-w-[4px] transition-[flex-grow]`}
            style={{ flexGrow: r.count }}
            title={`${r.type}: ${r.count}`}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {rows.slice(0, 6).map((r, i) => (
          <li key={r.type} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-sm ${palette[i % palette.length]}`} />
              <span className="truncate font-medium text-on-surface">{r.type}</span>
            </span>
            <span className="shrink-0 tabular-nums text-on-surface-variant">
              {r.count}（{Math.round((r.count / total) * 100)}%）
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [poolHint, setPoolHint] = useState('');
  const [efficiency, setEfficiency] = useState<PortalEfficiency | null>(null);
  const [effLoading, setEffLoading] = useState(true);
  const [dbTick, setDbTick] = useState(0);

  useMockDbUpdated(useCallback(() => setDbTick((n) => n + 1), []));

  useEffect(() => {
    setEffLoading(true);
    void statisticsService
      .getPortalEfficiency()
      .then(setEfficiency)
      .catch((e) => {
        portalToast.error(e instanceof Error ? e.message : '效能数据加载失败');
        setEfficiency(null);
      })
      .finally(() => setEffLoading(false));
  }, [dbTick]);

  const runSearch = useCallback(async (value: string, typeParam?: string | null, statusParam?: string | null) => {
    const type = typeParam && typeParam !== 'all' ? typeParam : undefined;
    const statusFilter = statusParam && statusParam !== 'all' ? statusParam : undefined;

    setLoading(true);
    try {
      if (
        statusFilter &&
        ['pending', 'accepted', 'processing', 'reply_draft', 'returned', 'withdrawn'].includes(statusFilter)
      ) {
        setPoolHint('公开检索仅包含「已答复且公开」的诉求；其它状态请登录后在「我的诉求」中查看。');
        setResults([]);
        return;
      }
      setPoolHint('');
      const res = await appealService.getPublicAppeals({
        keyword: value.trim() || undefined,
        type,
        pageSize: 50,
      });
      let data = res.data;
      if (statusFilter === 'replied') {
        data = data.filter((a) => a.status === statusFilter);
      }
      setResults(data);
    } catch (e) {
      portalToast.error(e instanceof Error ? e.message : '检索失败');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    setKeyword(q);
    void runSearch(q, type, status);
  }, [searchParams, runSearch, dbTick]);

  const submit = () => {
    const p = new URLSearchParams(searchParams);
    if (keyword.trim()) p.set('q', keyword.trim());
    else p.delete('q');
    navigate(`/user/search?${p.toString()}`, { replace: true });
  };

  const spType = searchParams.get('type');
  const spStatus = searchParams.get('status');
  const hasActiveFilters =
    Boolean(keyword.trim()) ||
    Boolean(spType && spType !== 'all') ||
    Boolean(spStatus && spStatus !== 'all');
  const emptyResultsHint = hasActiveFilters
    ? '未找到相关诉求'
    : '当前暂无已答复且公开的办结件';

  const deptMax = efficiency?.byDepartment.length
    ? Math.max(...efficiency.byDepartment.map((d) => d.count), 1)
    : 1;
  const typeTotal = efficiency?.byType.reduce((s, t) => s + t.count, 0) ?? 0;

  const dashboardCore = (
    <>
      <section className="mb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="公开办结"
            value={effLoading ? '—' : String(efficiency?.publicFinishedCount ?? 0)}
            sub="已公开且已答复"
            icon="check_circle"
          />
          <KpiCard
            label="本月办结"
            value={effLoading ? '—' : String(efficiency?.monthPublicFinished ?? 0)}
            sub="按办结时间统计"
            icon="calendar_month"
          />
          <KpiCard
            label="平均响应"
            value={effLoading ? '—' : `${efficiency?.avgResponseHours ?? 0} h`}
            sub="首次响应耗时"
            icon="bolt"
          />
          <KpiCard
            label="平均办理"
            value={effLoading ? '—' : `${efficiency?.avgHandleHours ?? 0} h`}
            sub="办结耗时"
            icon="schedule"
          />
          <KpiCard
            label="满意度"
            value={
              effLoading
                ? '—'
                : (efficiency?.satisfaction ?? 0) > 0
                  ? String(efficiency?.satisfaction)
                  : '—'
            }
            sub="有评价的工单均分"
            icon="star"
          />
          <KpiCard
            label="累计浏览"
            value={effLoading ? '—' : (efficiency?.totalViews ?? 0).toLocaleString()}
            sub="公开办结浏览量合计"
            icon="visibility"
          />
        </div>
        {!effLoading && efficiency && efficiency.weekNewAll > 0 ? (
          <p className="mt-3 text-xs text-on-surface-variant">
            近 7 日全渠道新增诉求 <span className="font-semibold tabular-nums text-on-surface">{efficiency.weekNewAll}</span>{' '}
            件（含在办）
          </p>
        ) : null}
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm sm:p-6 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface sm:text-lg">部门办理量</h2>
              <p className="mt-1 text-xs text-on-surface-variant">公开办结按受理部门分布（TOP）</p>
            </div>
          </div>
          {effLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-container-high/80" />
              ))}
            </div>
          ) : (
            <DepartmentBars rows={efficiency?.byDepartment ?? []} max={deptMax} compact={isMobile} />
          )}
        </div>

        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm sm:p-6">
          <h2 className="font-headline text-base font-bold text-on-surface sm:text-lg">问题类型结构</h2>
          <p className="mt-1 text-xs text-on-surface-variant">公开办结中的类型占比</p>
          <div className="mt-5">
            {effLoading ? (
              <div className="h-40 animate-pulse rounded-xl bg-surface-container-high/80" />
            ) : (
              <TypeSegments rows={efficiency?.byType ?? []} total={typeTotal} />
            )}
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm sm:p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface sm:text-lg">近 7 日动态</h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-secondary/40" /> 新增
                </span>
                <span className="mx-2 text-on-surface-variant/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-primary" /> 公开办结
                </span>
              </p>
            </div>
          </div>
          {effLoading ? (
            <div className="h-36 animate-pulse rounded-xl bg-surface-container-high/80" />
          ) : (
            <TrendBars trend={efficiency?.trend7d ?? []} compact={isMobile} />
          )}
        </div>

        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm sm:p-6">
          <h2 className="font-headline text-base font-bold text-on-surface sm:text-lg">热词与主题</h2>
          <p className="mt-1 text-xs text-on-surface-variant">由公开办结标题/正文归纳（演示数据）</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {effLoading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="h-8 w-16 animate-pulse rounded-full bg-surface-container-high/80" />
                ))
              : (efficiency?.keywords.length
                  ? efficiency.keywords.map((k) => (
                      <span
                        key={k.word}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/15"
                      >
                        {k.word}
                      </span>
                    ))
                  : null)}
          </div>
          {!effLoading && !(efficiency?.keywords.length) ? (
            <p className="mt-4 text-sm text-on-surface-variant">暂无热词</p>
          ) : null}
        </div>
      </section>
    </>
  );

  const searchControls = (
    <div
      className={`mb-4 flex gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm ${isMobile ? 'flex-col p-3' : 'flex-wrap p-4'}`}
    >
      <div
        className={`flex items-center gap-2 rounded-xl bg-surface px-4 py-3 ${isMobile ? 'w-full min-w-0' : 'min-w-[200px] flex-1'}`}
      >
        <span className="material-symbols-outlined text-on-surface-variant">search</span>
        <input
          className="min-w-0 flex-1 border-none bg-transparent text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
          placeholder="关键词检索办结案例…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <PortalButton
        variant="primary"
        size="lg"
        className={`font-bold shadow-primary/25 hover:shadow-lg ${isMobile ? 'w-full py-3.5' : 'px-8'}`}
        onClick={submit}
      >
        检索
      </PortalButton>
    </div>
  );

  const resultsPanel = (
    <div
      className={`min-h-[160px] rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm ${isMobile ? 'p-4' : 'p-6'}`}
    >
      {poolHint ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {poolHint}
        </p>
      ) : null}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="mb-3 text-sm text-on-surface-variant">共 {results.length} 条 · 点击跳转详情</p>
          <ul className="divide-y divide-outline-variant/15">
            {results.slice(0, isMobile ? 6 : 8).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`flex w-full gap-3 text-left transition-colors sm:gap-4 ${
                    isMobile
                      ? 'm-portal-tap-clear py-3.5 active:bg-surface-container-high/60'
                      : 'py-3 hover:bg-surface/80'
                  }`}
                  onClick={() => navigate(`/user/appeal/detail/${item.id}`)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary sm:h-11 sm:w-11">
                    {item.type[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="min-w-0 flex-1 font-semibold leading-snug text-on-surface line-clamp-2 sm:line-clamp-1">
                        {item.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeCls[item.status] ?? 'bg-surface'}`}
                      >
                        {statusMap[item.status] ?? item.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-on-surface-variant">
                      <span>{item.type}</span>
                      <span>·</span>
                      <span className="min-w-0 truncate">{item.departmentName}</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="tabular-nums sm:inline">浏览 {item.浏览量}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {results.length > (isMobile ? 6 : 8) ? (
            <div className="mt-4 border-t border-outline-variant/15 pt-4 text-center">
              <Link to="/user/appeal/list" className="text-sm font-bold text-primary hover:underline">
                在「诉求公开」中浏览完整列表
              </Link>
            </div>
          ) : null}
        </>
      ) : poolHint ? null : (
        <p className="py-10 text-center text-sm text-on-surface-variant">{emptyResultsHint}</p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="效能看板" contentClassName="pt-2 pb-8">
        <p className="mb-5 text-sm leading-relaxed text-on-surface-variant">
          公开办结的时效与分布一览；检索具体案例见下方。完整列表请前往
          <Link to="/user/appeal/list" className="mx-1 font-semibold text-primary">
            诉求公开
          </Link>
          。
        </p>
        {dashboardCore}
        <div className="mt-2 border-t border-outline-variant/15 pt-6">
          <h2 className="mb-1 font-headline text-base font-bold text-on-surface">办结案例检索</h2>
          <p className="mb-4 text-xs text-on-surface-variant">与诉求公开同源数据，支持关键词</p>
          {searchControls}
          {resultsPanel}
        </div>
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="w-full">
      <header className="mb-8 border-b border-outline-variant/15 pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">数据看板</p>
        <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">效能看板</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-on-surface-variant md:text-base">
          基于<strong className="font-semibold text-on-surface">已公开且已答复</strong>
          的办结池做时效、部门负载与类型结构分析；与「诉求公开」列表同源，本页侧重统计与洞察，检索为辅。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/user/appeal/list"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/12"
          >
            前往诉求公开列表
            <span className="material-symbols-outlined text-[18px] leading-none">chevron_right</span>
          </Link>
        </div>
      </header>

      {dashboardCore}

      <section className="border-t border-outline-variant/15 pt-10">
        <h2 className="font-headline text-xl font-bold text-on-surface">办结案例检索</h2>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">需要定位具体工单的标题或正文关键词时使用；浏览热门与排序请用诉求公开页。</p>
        {searchControls}
        {resultsPanel}
      </section>
    </div>
  );
}
