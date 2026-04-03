import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { departmentService } from '@/mock';
import type { Department } from '@/mock/types';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import { usePreferencesStore } from '@/store/preferencesStore';
import { resolveDepartmentI18n } from '@/lib/metadataLocale';

const typeLabel = (t: Department['type']) =>
  t === 'teaching' ? '教学' : t === 'logistics' ? '后勤' : t === 'administration' ? '行政' : '其他';

const typeBarClass = (t: Department['type']) => {
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

const typeAvatarSurface = (t: Department['type']) => {
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

const chipStyles = (t: Department['type']) => {
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

function DepartmentCard({ dept, compact }: { dept: Department; compact: boolean }) {
  const bar = typeBarClass(dept.type);
  const avatarSurface = typeAvatarSurface(dept.type);
  const chip = chipStyles(dept.type);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,35,52,0.06)] transition-all duration-200 hover:border-primary/25 hover:shadow-[0_12px_40px_-16px_rgba(0,71,144,0.15)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
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
              <h2 className={`font-headline font-bold tracking-tight text-on-surface ${compact ? 'text-[1.05rem] leading-snug' : 'text-lg sm:text-xl'}`}>
                {dept.name}
              </h2>
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

        <div className={`mt-4 flex flex-col gap-2.5 ${compact ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
          <a
            href={`tel:${dept.phone.replace(/\s/g, '')}`}
            className="group/row flex items-center gap-2.5 text-on-surface transition-colors hover:text-primary"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-primary transition-colors group-hover/row:bg-primary/10">
              <span className="material-symbols-outlined text-[18px] leading-none">call</span>
            </span>
            <span className="min-w-0 truncate font-medium tabular-nums">{dept.phone}</span>
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbTick, setDbTick] = useState(0);
  const metadataDisplayLocale = usePreferencesStore((s) => s.metadataDisplayLocale);
  const displayDepartments = useMemo(
    () => departments.map((d) => resolveDepartmentI18n(d, metadataDisplayLocale)),
    [departments, metadataDisplayLocale, dbTick],
  );

  const load = useCallback(() => {
    setLoading(true);
    void departmentService.getDepartments().then((d) => {
      setDepartments(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
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
    <p className="py-16 text-center text-on-surface-variant">暂无部门</p>
  ) : null;

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="部门风采" contentClassName="pt-2 pb-8">
        <p className="mb-5 text-sm leading-relaxed text-on-surface-variant">
          浏览各部门职责与联系方式，发起诉求时更准确选择受理单位。
        </p>
        {grid}
        {empty}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="w-full">
      <header className="mb-8 border-b border-outline-variant/15 pb-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">服务大厅</p>
        <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">部门风采</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base">
          统一展示机构简介、对外电话与邮箱，帮助师生快速找到对口部门。
        </p>
      </header>
      {grid}
      {empty}
    </div>
  );
}
