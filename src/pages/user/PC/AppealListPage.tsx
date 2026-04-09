import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Drawer } from 'antd';
import { appealService, departmentService, questionTypeService } from '@/mock';
import type { Appeal, Department, QuestionType } from '@/mock/types';
import { PortalButton, PortalSelect } from './ui';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import { portalToast } from './shell/portalFeedbackStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import {
  resolveAppealDepartmentName,
  resolveAppealTypeLabel,
  resolveDepartmentI18n,
  resolveQuestionTypeLabel,
} from '@/lib/metadataLocale';

const statusMap: Record<string, string> = {
  pending: '待受理',
  accepted: '已受理',
  processing: '处理中',
  reply_draft: '答复审核中',
  replied: '已答复',
  returned: '已退回',
  withdrawn: '已撤销',
};

export default function AppealListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobileLayout();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('all');
  const [department, setDepartment] = useState('all');
  const [qTypes, setQTypes] = useState<QuestionType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dbTick, setDbTick] = useState(0);
  const metadataDisplayLocale = usePreferencesStore((s) => s.metadataDisplayLocale);

  const refreshMeta = useCallback(() => {
    void departmentService.getDepartments().then(setDepartments);
    void questionTypeService.getQuestionTypes().then(setQTypes);
  }, []);

  useEffect(() => {
    refreshMeta();
  }, [refreshMeta, dbTick]);

  useMockDbUpdated(useCallback(() => setDbTick((n) => n + 1), []));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tp = params.get('type');
    if (tp) setType(tp);
  }, [location.search]);

  const sortPopular = searchParams.get('sort') === 'popular';

  useEffect(() => {
    const fetchAppeals = async () => {
      setLoading(true);
      try {
        const result = await appealService.getPublicAppeals({
          keyword: keyword || undefined,
          type: type !== 'all' ? type : undefined,
          departmentId: department !== 'all' ? department : undefined,
          page,
          pageSize,
          sort: sortPopular ? 'popular' : 'default',
        });
        setAppeals(result.data);
        setTotal(result.total);
      } catch (e) {
        portalToast.error(e instanceof Error ? e.message : '加载列表失败');
      } finally {
        setLoading(false);
      }
    };
    void fetchAppeals();
  }, [page, type, department, keyword, pageSize, sortPopular, dbTick]);

  const setSortPopular = (on: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (on) next.set('sort', 'popular');
    else next.delete('sort');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const applyFilterAndClose = () => {
    setPage(1);
    setFilterOpen(false);
  };

  const filterDept = departments.find((d) => d.id === department);
  const filterSummary =
    type !== 'all' || department !== 'all'
      ? [
          type !== 'all' ? resolveAppealTypeLabel(type, qTypes, metadataDisplayLocale) : null,
          department !== 'all' && filterDept ? resolveDepartmentI18n(filterDept, metadataDisplayLocale).name : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '全部';

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="诉求公开" contentClassName="pt-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant/60">
              search
            </span>
            <input
              className="m-portal-tap-clear w-full rounded-2xl border border-outline-variant/25 bg-surface-container-lowest py-3.5 pl-10 pr-3 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="标题或关键词"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
              enterKeyHint="search"
            />
          </div>
          <button
            type="button"
            className="m-portal-tap-clear shrink-0 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest px-4 py-3.5 text-sm font-bold text-primary ring-1 ring-outline-variant/15"
            onClick={() => setFilterOpen(true)}
          >
            筛选
          </button>
        </div>
        <p className="mb-3 text-center text-xs text-on-surface-variant">
          共 {total} 条 · {filterSummary}
          {sortPopular ? ' · 按热度' : ''}
        </p>

        <div className="mb-4 flex justify-center gap-2">
          <button
            type="button"
            className={`m-portal-tap-clear rounded-full px-4 py-2 text-sm font-bold ring-1 transition-colors ${
              !sortPopular
                ? 'bg-primary text-white ring-primary/30'
                : 'bg-surface-container-low text-on-surface-variant ring-outline-variant/25'
            }`}
            onClick={() => setSortPopular(false)}
          >
            默认
          </button>
          <button
            type="button"
            className={`m-portal-tap-clear rounded-full px-4 py-2 text-sm font-bold ring-1 transition-colors ${
              sortPopular
                ? 'bg-primary text-white ring-primary/30'
                : 'bg-surface-container-low text-on-surface-variant ring-outline-variant/25'
            }`}
            onClick={() => setSortPopular(true)}
          >
            按热度
          </button>
        </div>

        <Drawer
          title="筛选条件"
          placement="bottom"
          height="auto"
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          styles={{ body: { paddingBottom: 'max(16px, env(safe-area-inset-bottom))' } }}
        >
          <div className="flex flex-col gap-4 pb-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-on-surface-variant">问题类型</label>
              <PortalSelect
                className="w-full rounded-xl border border-outline-variant/30 py-3"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                }}
              >
                <option value="all">全部类型</option>
                {qTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {resolveQuestionTypeLabel(t, metadataDisplayLocale)}
                  </option>
                ))}
              </PortalSelect>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-on-surface-variant">受理部门</label>
              <PortalSelect
                className="w-full rounded-xl border border-outline-variant/30 py-3"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="all">全部部门</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {resolveDepartmentI18n(d, metadataDisplayLocale).name}
                  </option>
                ))}
              </PortalSelect>
            </div>
            <button
              type="button"
              className="m-portal-tap-clear w-full rounded-2xl bg-primary py-3.5 text-base font-bold text-white shadow-md shadow-primary/20"
              onClick={applyFilterAndClose}
            >
              应用筛选
            </button>
          </div>
        </Drawer>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-on-surface/[0.06] dark:bg-white/[0.06]"
              />
            ))}
          </div>
        ) : appeals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-outline-variant/25 py-14 text-center text-sm text-on-surface-variant">
            暂无数据
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {appeals.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface shadow-[0_2px_12px_-4px_rgba(15,35,52,0.08),0_1px_2px_rgba(15,35,52,0.04)] dark:border-outline-variant/25 dark:bg-surface-container-lowest dark:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.35)]"
              >
                <div className="overflow-hidden rounded-2xl bg-on-surface/[0.045] dark:bg-white/[0.06]">
                  <button
                    type="button"
                    className="m-portal-tap-clear flex min-h-[72px] w-full gap-3 p-4 text-left active:bg-on-surface/[0.06] dark:active:bg-white/[0.08]"
                    onClick={() => navigate(`/user/appeal/detail/${item.id}`)}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-lg font-bold text-primary ring-1 ring-primary/10 dark:from-primary/25 dark:to-primary/10 dark:ring-primary/20">
                      {item.type[0]}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-headline line-clamp-2 text-[15px] font-semibold leading-snug text-on-surface">
                          {item.title}
                        </p>
                        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-on-surface-variant/30" aria-hidden>
                          chevron_right
                        </span>
                      </div>
                      <span className="mt-2 inline-flex rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold leading-none text-on-surface-variant ring-1 ring-outline-variant/15 dark:bg-surface-container-high/80">
                        {statusMap[item.status]}
                      </span>
                      <div className="mt-2.5 flex flex-col gap-1 text-[12px] leading-relaxed text-on-surface-variant">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-medium text-on-surface">
                            {resolveAppealTypeLabel(item.type, qTypes, metadataDisplayLocale)}
                          </span>
                          <span className="text-on-surface-variant/35">·</span>
                          <span className="min-w-0 break-words">
                            {resolveAppealDepartmentName(item, metadataDisplayLocale)}
                          </span>
                          {sortPopular ? (
                            <>
                              <span className="text-on-surface-variant/35">·</span>
                              <span className="inline-flex items-center gap-0.5 tabular-nums">
                                <span className="material-symbols-outlined text-[14px] leading-none text-primary">visibility</span>
                                {item.浏览量 ?? 0}
                              </span>
                            </>
                          ) : null}
                        </div>
                        <span className="tabular-nums text-on-surface-variant/85">{item.createTime}</span>
                      </div>
                    </div>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {total > pageSize ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              className="m-portal-tap-clear rounded-full border border-outline-variant/30 px-5 py-2.5 text-sm font-bold disabled:opacity-35"
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </button>
            <span className="text-sm text-on-surface-variant">
              {page} / {Math.ceil(total / pageSize)}
            </span>
            <button
              type="button"
              disabled={page >= Math.ceil(total / pageSize)}
              className="m-portal-tap-clear rounded-full border border-outline-variant/30 px-5 py-2.5 text-sm font-bold disabled:opacity-35"
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
          </div>
        ) : null}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-headline text-3xl font-bold text-on-surface">诉求公开</h1>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <div className="flex rounded-full border border-outline-variant/30 bg-surface-container-low p-1">
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${!sortPopular ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant'}`}
              onClick={() => setSortPopular(false)}
            >
              默认
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${sortPopular ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant'}`}
              onClick={() => setSortPopular(true)}
            >
              按热度
            </button>
          </div>
          <span className="text-sm text-on-surface-variant">共 {total} 条{sortPopular ? '（按浏览量）' : ''}</span>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm md:flex-row md:flex-wrap md:items-center">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="min-w-0 flex-1 border-none bg-transparent text-sm focus:ring-0"
            placeholder="标题或内容"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          />
        </div>
        <PortalSelect
          className="w-full md:w-auto md:min-w-[160px]"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">全部类型</option>
          {qTypes.map((t) => (
            <option key={t.id} value={t.name}>
              {resolveQuestionTypeLabel(t, metadataDisplayLocale)}
            </option>
          ))}
        </PortalSelect>
        <PortalSelect
          className="w-full md:w-auto md:min-w-[180px]"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">全部部门</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {resolveDepartmentI18n(d, metadataDisplayLocale).name}
            </option>
          ))}
        </PortalSelect>
        <PortalButton variant="primary" size="md" className="px-6 font-bold" onClick={() => setPage(1)}>
          筛选
        </PortalButton>
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : appeals.length === 0 ? (
          <p className="py-16 text-center text-on-surface-variant">暂无数据</p>
        ) : (
          <ul className="divide-y divide-outline-variant/15">
            {appeals.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full gap-4 p-5 text-left hover:bg-surface/60"
                  onClick={() => navigate(`/user/appeal/detail/${item.id}`)}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                    {item.type[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-on-surface">{item.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                      <span className="rounded bg-surface px-2 py-0.5">{statusMap[item.status]}</span>
                      <span>{resolveAppealTypeLabel(item.type, qTypes, metadataDisplayLocale)}</span>
                      <span>{resolveAppealDepartmentName(item, metadataDisplayLocale)}</span>
                      {sortPopular ? (
                        <span className="inline-flex items-center gap-0.5 tabular-nums text-primary">
                          <span className="material-symbols-outlined text-[14px] leading-none">visibility</span>
                          {item.浏览量 ?? 0}
                        </span>
                      ) : null}
                      <span>{item.createTime}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {total > pageSize ? (
        <div className="mt-8 flex justify-center gap-2">
          <PortalButton
            variant="outline"
            size="md"
            disabled={page <= 1}
            className="rounded-full px-4 font-bold disabled:opacity-40"
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </PortalButton>
          <span className="px-4 py-2 text-sm text-on-surface-variant">
            {page} / {Math.ceil(total / pageSize)}
          </span>
          <PortalButton
            variant="outline"
            size="md"
            disabled={page >= Math.ceil(total / pageSize)}
            className="rounded-full px-4 font-bold disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </PortalButton>
        </div>
      ) : null}
    </div>
  );
}
