import { useCallback, useEffect, useState } from 'react';
import { Drawer } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import { appealService, departmentService, questionTypeService } from '@/mock';
import type { Appeal, Department, QuestionType } from '@/mock/types';
import {
  resolveAppealDepartmentName,
  resolveAppealTypeLabel,
  resolveDepartmentI18n,
  resolveQuestionTypeLabel,
} from '@/lib/metadataLocale';
import { usePreferencesStore } from '@/store/preferencesStore';
import { portalToast } from './shell/portalFeedbackStore';
import { PortalButton, PortalSelect } from './ui';

const statusMap: Record<string, string> = {
  pending: '待受理',
  accepted: '已受理',
  processing: '处理中',
  reply_draft: '答复审核中',
  replied: '已答复',
  returned: '已退回',
  withdrawn: '已撤销',
};

function statusTone(status: string) {
  if (status === 'replied') return 'bg-secondary/12 text-secondary ring-secondary/20';
  if (status === 'processing' || status === 'accepted') return 'bg-primary/10 text-primary ring-primary/20';
  if (status === 'pending') return 'bg-amber-500/12 text-amber-800 ring-amber-500/20';
  if (status === 'returned') return 'bg-red-500/10 text-red-700 ring-red-500/20';
  return 'bg-surface-container-high text-on-surface-variant ring-outline-variant/35';
}

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
          .join(' / ')
      : '全部';

  const filters = (
    <>
      <label className="block">
        <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">关键词</span>
        <div className="flex items-center gap-2 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="min-w-0 flex-1 border-none bg-transparent text-sm focus:ring-0"
            placeholder="标题或内容"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          />
        </div>
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">事项类型</span>
        <PortalSelect
          className="w-full"
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
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-on-surface-variant">受理柜台</span>
        <PortalSelect
          className="w-full"
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
      </label>
      <PortalButton variant="primary" size="lg" className="w-full rounded-2xl font-bold" onClick={applyFilterAndClose}>
        应用筛选
      </PortalButton>
    </>
  );

  const listCards = loading ? (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container-low" />
      ))}
    </div>
  ) : appeals.length === 0 ? (
    <p className="rounded-[1.5rem] border border-dashed border-outline-variant/45 py-16 text-center text-sm text-on-surface-variant">
      暂无数据
    </p>
  ) : (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {appeals.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`group grid w-full gap-4 rounded-[1.5rem] border border-outline-variant/35 bg-surface-container-lowest/82 p-4 text-left shadow-[0_12px_32px_rgba(29,79,113,0.06)] transition hover:border-primary/35 hover:bg-surface-container-lowest ${
              isMobile ? '' : 'md:grid-cols-[4.5rem_minmax(0,1fr)_auto]'
            }`}
            onClick={() => navigate(`/user/appeal/detail/${item.id}`)}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 font-headline text-xl font-black text-primary">
              {resolveAppealTypeLabel(item.type, qTypes, metadataDisplayLocale).slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${statusTone(item.status)}`}>
                  {statusMap[item.status] ?? item.status}
                </span>
                <span className="text-xs font-semibold text-on-surface-variant">
                  {resolveAppealTypeLabel(item.type, qTypes, metadataDisplayLocale)}
                </span>
              </span>
              <span className="mt-2 block font-headline text-lg font-black leading-snug text-on-surface group-hover:text-primary">
                {item.title}
              </span>
              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                <span>{resolveAppealDepartmentName(item, metadataDisplayLocale)}</span>
                <span>{item.createTime}</span>
                {sortPopular ? <span className="text-primary">浏览 {item.浏览量 ?? 0}</span> : null}
              </span>
            </span>
            <span className="hidden items-center gap-1 self-center rounded-full bg-surface-container-low px-3 py-2 text-xs font-bold text-primary md:inline-flex">
              查看详情
              <span className="material-symbols-outlined text-[16px]">east</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  const pager =
    total > pageSize ? (
      <div className="mt-8 flex items-center justify-center gap-3">
        <PortalButton
          variant="outline"
          size="md"
          disabled={page <= 1}
          className="rounded-full px-5 font-bold disabled:opacity-40"
          onClick={() => setPage((p) => p - 1)}
        >
          上一页
        </PortalButton>
        <span className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface-variant">
          {page} / {Math.ceil(total / pageSize)}
        </span>
        <PortalButton
          variant="outline"
          size="md"
          disabled={page >= Math.ceil(total / pageSize)}
          className="rounded-full px-5 font-bold disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </PortalButton>
      </div>
    ) : null;

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="诉求公示" contentClassName="pt-3 pb-8">
        <div className="mb-4 rounded-[1.6rem] bg-primary/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Public Board</p>
          <h1 className="mt-1 font-headline text-xl font-black text-on-surface">公开办件公示栏</h1>
          <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
            共 {total} 条 / 当前筛选：{filterSummary}
            {sortPopular ? ' / 按热度' : ''}
          </p>
        </div>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className="m-portal-tap-clear flex-1 rounded-2xl border border-outline-variant/35 bg-surface-container-lowest px-4 py-3 text-left text-sm font-bold"
            onClick={() => setFilterOpen(true)}
          >
            筛选条件
          </button>
          <button
            type="button"
            className={`m-portal-tap-clear rounded-2xl px-4 py-3 text-sm font-bold ${
              sortPopular ? 'bg-primary text-white' : 'bg-surface-container-lowest text-primary ring-1 ring-outline-variant/35'
            }`}
            onClick={() => setSortPopular(!sortPopular)}
          >
            热度
          </button>
        </div>
        <Drawer
          title="筛选公示办件"
          placement="bottom"
          height="auto"
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          styles={{ body: { paddingBottom: 'max(16px, env(safe-area-inset-bottom))' } }}
        >
          <div className="flex flex-col gap-4 pb-2">{filters}</div>
        </Drawer>
        {listCards}
        {pager}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="w-full">
      <section className="mb-8 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="hall-panel sticky top-32 self-start rounded-[2rem] p-6">
          <p className="hall-section-label text-xs font-black">FILTER GUIDE</p>
          <h1 className="mt-2 font-headline text-2xl font-black text-on-surface">公示筛选台</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            左侧选择事项类型和受理柜台，右侧同步显示公开办件。
          </p>
          <div className="mt-6 flex flex-col gap-5">{filters}</div>
          <div className="mt-6 rounded-2xl bg-surface-container-low p-4">
            <p className="text-xs font-bold text-on-surface-variant">当前筛选</p>
            <p className="mt-1 font-headline text-xl font-black text-primary">{filterSummary}</p>
            <p className="mt-2 text-xs text-on-surface-variant">共 {total} 条记录</p>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="hall-panel mb-5 rounded-[2rem] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="hall-section-label text-xs font-black">PUBLIC CASE BOARD</p>
                <h1 className="mt-2 font-headline text-3xl font-black text-on-surface">诉求公示栏</h1>
                <p className="mt-2 text-sm text-on-surface-variant">
                  功能保持不变，页面按服务大厅公示栏重新组织。
                </p>
              </div>
              <div className="flex rounded-2xl border border-outline-variant/35 bg-surface-container-low p-1">
                <button
                  type="button"
                  className={`rounded-xl px-4 py-2 text-sm font-black ${!sortPopular ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
                  onClick={() => setSortPopular(false)}
                >
                  默认
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-4 py-2 text-sm font-black ${sortPopular ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
                  onClick={() => setSortPopular(true)}
                >
                  按热度
                </button>
              </div>
            </div>
          </div>
          {listCards}
          {pager}
        </main>
      </section>
    </div>
  );
}
