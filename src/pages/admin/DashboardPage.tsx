import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Progress, Skeleton, message } from 'antd';
import { statisticsService, appealService } from '@/mock';
import type { Statistics } from '@/mock/types';
import type { Appeal } from '@/mock/types';
import { useAppStore } from '@/store';
import { usePreferencesStore, THEME_PRESET_HEX, THEME_SECONDARY_HEX } from '@/store/preferencesStore';

const statusLabel: Record<string, string> = {
  pending: '待受理',
  accepted: '已受理',
  processing: '处理中',
  reply_draft: '待审核答复',
  replied: '已答复',
  returned: '已退回',
  withdrawn: '已撤销',
};

type BarItem = { h: number; label: string; tip?: string };

function statusPillClass(status: string) {
  switch (status) {
    case 'processing':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200';
    case 'replied':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
    case 'reply_draft':
      return 'bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200';
    case 'returned':
      return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200';
    default:
      return 'bg-surface-container-low text-on-surface dark:bg-surface-container dark:text-on-surface-variant';
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [todoAppeals, setTodoAppeals] = useState<Appeal[]>([]);
  const [recent, setRecent] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      try {
        const data = await statisticsService.getStatistics();
        setStats(data);
        if (currentUser) {
          const [todos, recentRows] = await Promise.all([
            appealService.getDashboardInProgressAppeals(currentUser, 12),
            appealService.getDashboardRecentAppeals(currentUser, 8),
          ]);
          setTodoAppeals(todos);
          setRecent(recentRows);
        } else {
          setTodoAppeals([]);
          setRecent([]);
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : '数据概览加载失败');
      } finally {
        if (showSpinner) setLoading(false);
      }
    };
    void load(true);
    const onUp = () => void load(false);
    window.addEventListener('jsjb-mock-updated', onUp);
    return () => window.removeEventListener('jsjb-mock-updated', onUp);
  }, [currentUser]);

  const bars = useMemo((): BarItem[] => {
    const ranks = stats?.部门排名?.slice(0, 7) ?? [];
    if (ranks.length === 0) {
      return [35, 55, 70, 45, 60, 85, 75].map((h, i) => ({
        h,
        label: ['一', '二', '三', '四', '五', '六', '日'][i] ?? '',
        tip: String(h),
      }));
    }
    const max = Math.max(...ranks.map((r) => r.count), 1);
    return ranks.map((r) => ({
      h: Math.max(12, Math.round((r.count / max) * 100)),
      label: r.departmentName.slice(0, 2),
      tip: String(r.count),
    }));
  }, [stats]);

  const pieData = stats?.部门排名?.slice(0, 8) ?? [];
  const hotWords = stats?.热点词云?.slice(0, 8) ?? [];
  const pendingTodos = todoAppeals.slice(0, 3);

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="admin-dashboard font-body">
      <header className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">接诉即办数字化工作台</h2>
          <p className="mt-1 text-on-surface-variant">受理、交办、督办与质效分析统一视图</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-2.5 admin-custom-shadow dark:bg-surface-container-lowest">
            <span className="material-symbols-outlined text-primary">calendar_today</span>
            <span className="text-sm font-semibold text-on-surface">{today}</span>
          </div>
          <button
            type="button"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
            onClick={() => navigate('/admin/statistics')}
          >
            查看统计报表
          </button>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {(
          [
            {
              key: 'total',
              icon: 'forum' as const,
              iconTint: 'primary' as const,
              label: '诉求总量',
              badge: stats?.本周新增 != null ? `本周 +${stats.本周新增}` : '—',
              value: stats?.诉求总量 ?? '—',
              valueSuffix: '',
              valueClass: 'text-primary',
            },
            {
              key: 'sat',
              icon: 'thumb_up' as const,
              iconTint: 'secondary' as const,
              label: '满意度',
              badge: '质效指标',
              value: stats?.满意度 ?? '—',
              valueSuffix: '分',
              valueClass: 'text-on-surface',
            },
            {
              key: 'rate',
              icon: 'task_alt' as const,
              iconTint: 'primary' as const,
              label: '办结率',
              badge: '周期内',
              value: stats?.办结率 ?? '—',
              valueSuffix: '%',
              valueClass: 'text-on-surface',
            },
            {
              key: 'resp',
              icon: 'schedule' as const,
              iconTint: 'secondary' as const,
              label: '平均响应',
              badge: '小时制',
              value: stats?.平均响应时长 ?? '—',
              valueSuffix: 'h',
              valueClass: 'text-on-surface',
            },
          ] as const
        ).map((kpi) => (
          <div
            key={kpi.key}
            className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-6 admin-custom-shadow dark:bg-surface-container-lowest"
          >
            <div className="mb-4 flex items-center justify-between">
              <span
                className={`material-symbols-outlined rounded-xl p-2 ${
                  kpi.iconTint === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                }`}
              >
                {kpi.icon}
              </span>
              <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant ring-1 ring-outline-variant/25 dark:bg-surface-container-high">
                {kpi.badge}
              </span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">{kpi.label}</p>
            {loading && !stats ? (
              <Skeleton active paragraph={false} className="mt-2" />
            ) : (
              <h3 className={`mt-1 font-headline text-4xl font-bold tabular-nums ${kpi.valueClass}`}>
                {kpi.value}
                {kpi.valueSuffix}
              </h3>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 admin-custom-shadow dark:bg-surface-container-lowest lg:col-span-2">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined rounded-xl bg-primary/10 p-2 text-primary">bar_chart</span>
              <h3 className="font-headline text-xl font-bold text-on-surface">部门受理分布</h3>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-on-surface-variant ring-1 ring-outline-variant/30">
                当前周期
              </span>
            </div>
          </div>
          <div className="relative flex h-64 w-full items-stretch gap-2 overflow-hidden rounded-xl bg-surface-container-low px-2 dark:bg-surface-container sm:gap-3 sm:px-4">
            {bars.map((b, i) => (
              <div key={i} className="group relative flex min-h-0 min-w-0 flex-1 flex-col justify-end">
                <div
                  className="relative w-full min-h-[6px] rounded-t-lg bg-primary/25 ring-1 ring-primary/10 transition-all hover:bg-primary/35 dark:bg-primary/30 dark:ring-primary/20"
                  style={{ height: `${b.h}%` }}
                >
                  <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-on-surface px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 md:block">
                    {b.tip ?? ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant sm:px-4">
            {bars.map((b, i) => (
              <span key={i} className="max-w-[3rem] truncate text-center">
                {b.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 admin-custom-shadow dark:bg-surface-container-lowest">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined rounded-xl bg-primary/10 p-2 text-primary">bubble_chart</span>
              <h3 className="font-headline text-xl font-bold text-on-surface">热点词云摘要</h3>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface-variant ring-1 ring-outline-variant/30 dark:bg-surface-container">
              统计样本
            </span>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">高频词</p>
            <div className="flex min-h-[4.5rem] flex-wrap content-start gap-2">
              {loading && hotWords.length === 0 ? (
                <Skeleton.Button active size="small" />
              ) : hotWords.length === 0 ? (
                <p className="text-sm text-on-surface-variant">暂无词频数据</p>
              ) : (
                hotWords.map((w, idx) => (
                  <span
                    key={`${w.word}-${idx}`}
                    className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface shadow-sm dark:border-outline-variant/40 dark:bg-surface-container"
                    style={{
                      fontSize: `${Math.min(13, 11 + Math.min(3, Math.floor(w.count / 4)))}px`,
                    }}
                  >
                    {w.word}
                    <span className="ml-1 tabular-nums text-[10px] font-bold text-on-surface-variant">{w.count}</span>
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="mt-6 border-t border-outline-variant/15 pt-6 dark:border-outline-variant/25">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">待答复</p>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <span className="material-symbols-outlined text-[22px] leading-none">pending_actions</span>
              </span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container-high ring-1 ring-outline-variant/20 dark:bg-surface-container">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((stats?.待答复 ?? 0) / Math.max(stats?.诉求总量 ?? 1, 1)) * 100))}%`,
                  }}
                />
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-on-surface">{stats?.待答复 ?? 0} 件</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 admin-custom-shadow dark:bg-surface-container-lowest lg:col-span-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined rounded-xl bg-primary/10 p-2 text-primary">assignment_late</span>
              <h3 className="font-headline text-xl font-bold text-on-surface">待办关注</h3>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface-variant ring-1 ring-outline-variant/30 dark:bg-surface-container">
              在办池
            </span>
          </div>
          <div className="space-y-4">
            {pendingTodos.length === 0 ? (
              <p className="text-sm text-on-surface-variant">当前账号可见范围内暂无在办工单（待受理、已受理、办理中、待审答复）</p>
            ) : (
              pendingTodos.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="group flex w-full items-start gap-4 rounded-xl border border-transparent p-4 text-left transition-colors hover:border-outline-variant/25 hover:bg-surface-container-low dark:hover:bg-surface-container/80"
                  onClick={() => navigate('/admin/appeals')}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                    <span className="material-symbols-outlined text-secondary">rate_review</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">{a.content}</p>
                    <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusPillClass(a.status)}`}>
                      {statusLabel[a.status] ?? a.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            className="mt-6 w-full rounded-lg border border-outline-variant/30 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
            onClick={() => navigate('/admin/appeals')}
          >
            进入诉求管理
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 admin-custom-shadow dark:bg-surface-container-lowest lg:col-span-2">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined rounded-xl bg-primary/10 p-2 text-primary">table_rows</span>
              <h3 className="font-headline text-xl font-bold text-on-surface">实时诉求办理</h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              最近更新
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              loading={loading}
              dataSource={recent}
              rowKey="id"
              pagination={false}
              size="middle"
              className="admin-dashboard-table"
              columns={[
                {
                  title: '受理时间',
                  dataIndex: 'createTime',
                  width: 120,
                  render: (t: string) => <span className="text-on-surface-variant">{t?.slice(11, 19) ?? t}</span>,
                },
                {
                  title: '编号',
                  dataIndex: 'id',
                  render: (id: string) => (
                    <span className="font-mono text-sm font-bold text-on-surface">#{id.slice(-6)}</span>
                  ),
                },
                { title: '归口部门', dataIndex: 'departmentName', ellipsis: true },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (s: string) => (
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusPillClass(s)}`}>
                      {statusLabel[s] ?? s}
                    </span>
                  ),
                },
                {
                  title: '操作',
                  key: 'op',
                  width: 100,
                  align: 'right' as const,
                  render: (_, record: Appeal) => (
                    <Button
                      type="default"
                      size="small"
                      className="min-h-8 rounded-lg border-primary/30 px-3 font-semibold text-primary shadow-none hover:border-primary/50 hover:bg-primary/[0.08] hover:text-primary"
                      onClick={() => window.open(`/user/appeal/detail/${record.id}`, '_blank')}
                    >
                      查看
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 admin-custom-shadow dark:bg-surface-container-lowest lg:col-span-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined rounded-xl bg-secondary/10 p-2 text-secondary">speed</span>
              <h3 className="font-headline text-xl font-bold text-on-surface">部门处理效率</h3>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface-variant ring-1 ring-outline-variant/30 dark:bg-surface-container">
              相对效能
            </span>
          </div>
          {loading && !stats ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <div className="space-y-4">
              {pieData.map((row, idx) => {
                const efficiency = Math.max(0, 100 - (row.avgTime / 24) * 100);
                return (
                  <div key={row.departmentId}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-on-surface">{row.departmentName}</span>
                      <span className="text-on-surface-variant">{row.count} 件</span>
                    </div>
                    <Progress
                      percent={Math.round(efficiency)}
                      size="small"
                      showInfo={false}
                      strokeColor={idx === 0 ? THEME_PRESET_HEX[themePreset] : THEME_SECONDARY_HEX[themePreset]}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
