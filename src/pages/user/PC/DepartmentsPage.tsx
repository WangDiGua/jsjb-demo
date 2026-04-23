import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { departmentService } from '@/mock';
import type { DepartmentShowcaseRow } from '@/mock/types';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import { usePreferencesStore } from '@/store/preferencesStore';
import { resolveDepartmentShowcaseRow } from '@/lib/metadataLocale';

const typeLabel = (t: DepartmentShowcaseRow['type']) =>
  t === 'teaching' ? '教学' : t === 'logistics' ? '后勤' : t === 'administration' ? '行政' : '其他';

const typeBarClass = (t: DepartmentShowcaseRow['type']) => {
  switch (t) {
    case 'teaching':
      return 'bg-teal-500';
    case 'logistics':
      return 'bg-amber-500';
    case 'administration':
      return 'bg-primary';
    default:
      return 'bg-outline-variant';
  }
};

const typeAvatarSurface = (t: DepartmentShowcaseRow['type']) => {
  switch (t) {
    case 'teaching':
      return 'bg-teal-500/10 text-teal-800 dark:bg-teal-500/15 dark:text-teal-100';
    case 'logistics':
      return 'bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100';
    case 'administration':
      return 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-on-primary-container';
    default:
      return 'bg-surface-container-high text-on-surface-variant';
  }
};

const chipStyles = (t: DepartmentShowcaseRow['type']) => {
  switch (t) {
    case 'teaching':
      return 'bg-teal-500/12 text-teal-900 ring-teal-500/25 dark:bg-teal-400/12 dark:text-teal-100 dark:ring-teal-400/20';
    case 'logistics':
      return 'bg-amber-500/12 text-amber-950 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/18';
    case 'administration':
      return 'bg-primary/12 text-primary ring-primary/20';
    default:
      return 'bg-on-surface/6 text-on-surface-variant ring-outline-variant/30';
  }
};

function DepartmentCard({ dept, compact }: { dept: DepartmentShowcaseRow; compact: boolean }) {
  const bar = typeBarClass(dept.type);
  const avatarSurface = typeAvatarSurface(dept.type);
  const chip = chipStyles(dept.type);
  const headline = dept.showcaseHeroTitle?.trim() || dept.name;
  const showOfficialName = Boolean(dept.showcaseHeroTitle?.trim());
  const displayPhone = (dept.showcasePhone ?? dept.phone).replace(/\s/g, '');

  return (
    <article
      className={`hall-counter-card group relative overflow-hidden rounded-[1.75rem] ${compact ? 'p-4' : 'p-5 pt-7 sm:p-6 sm:pt-8'}`}
    >
      <span className={`absolute bottom-3 left-0 top-3 w-1 rounded-full ${bar}`} aria-hidden />
      <div className={`relative pl-4 ${compact ? '' : 'sm:pl-5'}`}>
        <div className="flex gap-4">
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant/15 ${compact ? 'h-14 w-14' : 'h-[4.25rem] w-[4.25rem]'} ${avatarSurface}`}
          >
            {dept.avatar ? (
              <img src={dept.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className={`font-headline text-lg font-bold ${compact ? 'text-base' : 'text-xl'}`}>{dept.name[0]}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className={`font-headline font-bold tracking-tight text-on-surface ${compact ? 'text-[1.05rem] leading-snug' : 'text-lg sm:text-xl'}`}>
                  {headline}
                </h2>
                {showOfficialName ? (
                  <p className="mt-1 text-xs font-medium text-on-surface-variant">{dept.name}</p>
                ) : null}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${chip}`}
              >
                {typeLabel(dept.type)}
              </span>
            </div>
            <p className={`mt-2.5 text-on-surface-variant ${compact ? 'line-clamp-2 text-xs leading-relaxed' : 'line-clamp-3 text-sm leading-relaxed'}`}>
              {dept.description}
            </p>
          </div>
        </div>

        {dept.showcaseShortcuts?.length ? (
          <div className={`mt-4 flex flex-wrap gap-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {dept.showcaseShortcuts.map((s) => (
              <a
                key={`${s.label}-${s.href}`}
                href={s.href}
                className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary ring-1 ring-primary/15 transition-colors hover:bg-primary/15"
              >
                {s.label}
              </a>
            ))}
          </div>
        ) : null}

        <div className={`mt-4 flex flex-col gap-2.5 ${compact ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
          <a
            href={`tel:${displayPhone}`}
            className="group/row flex items-center gap-2.5 text-on-surface transition-colors hover:text-primary"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-primary transition-colors group-hover/row:bg-primary/10">
              <span className="material-symbols-outlined text-[18px] leading-none">call</span>
            </span>
            <span className="min-w-0 truncate font-medium tabular-nums">{dept.showcasePhone?.trim() || dept.phone}</span>
          </a>
          <a
            href={`mailto:${dept.email}`}
            className="group/row flex items-center gap-2.5 text-on-surface transition-colors hover:text-primary"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-primary transition-colors group-hover/row:bg-primary/10">
              <span className="material-symbols-outlined text-[18px] leading-none">mail</span>
            </span>
            <span className="min-w-0 truncate font-medium">{dept.email}</span>
          </a>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-outline-variant/15 pt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-headline text-lg font-bold tabular-nums text-on-surface">{dept.受理数}</span>
            <span className="text-xs font-medium text-on-surface-variant">受理</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary text-[16px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            <span className="tabular-nums text-on-surface">{Number(dept.评分).toFixed(1)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DepartmentsPage() {
  const isMobile = useIsMobileLayout();
  const [departments, setDepartments] = useState<DepartmentShowcaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbTick, setDbTick] = useState(0);
  const metadataDisplayLocale = usePreferencesStore((s) => s.metadataDisplayLocale);
  const displayDepartments = useMemo(
    () => departments.map((d) => resolveDepartmentShowcaseRow(d, metadataDisplayLocale)),
    [departments, metadataDisplayLocale],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await departmentService.getDepartmentsForShowcase();
      setDepartments(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load, dbTick]);

  useMockDbUpdated(useCallback(() => setDbTick((n) => n + 1), []));

  const grid = loading ? (
    <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-[280px] animate-pulse rounded-2xl bg-surface-container-high/50 sm:h-[300px]"
        />
      ))}
    </div>
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
      {displayDepartments.map((dept) => (
        <DepartmentCard key={dept.id} dept={dept} compact={isMobile} />
      ))}
    </div>
  );

  const empty = !loading && departments.length === 0 ? (
    <p className="py-16 text-center text-on-surface-variant">
      暂未配置部门风采。管理员可在「主数据 → 部门风采」中绑定部门后，将在此处向师生展示。
    </p>
  ) : null;

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="部门风采" contentClassName="pt-2 pb-8">
        <p className="mb-5 text-sm leading-relaxed text-on-surface-variant">
          以下为已在后台配置风采展示的部门；完整受理单位列表请在「发起诉求」中选择。
        </p>
        {grid}
        {empty}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="w-full">
      <header className="hall-panel mb-8 rounded-[2rem] p-6 lg:p-8">
        <p className="hall-section-label text-xs font-black">SERVICE COUNTERS</p>
        <h1 className="mt-2 font-headline text-3xl font-black tracking-tight text-on-surface md:text-4xl">部门服务柜台</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base">
          仅展示管理端已绑定风采的部门，与「部门风采管理」条目一致；更多单位请通过发起诉求页选择。
        </p>
      </header>
      {grid}
      {empty}
    </div>
  );
}
