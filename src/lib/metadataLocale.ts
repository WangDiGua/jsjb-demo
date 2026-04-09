import type { PortalBranding } from '@/mock/adminConfigTypes';
import { getDb } from '@/mock/persist';
import type { Appeal, Department, DepartmentShowcaseRow, Notice, QuestionType } from '@/mock/types';
import type { MetadataDisplayLocale } from '@/store/preferencesStore';

function sliceBundle(locale: MetadataDisplayLocale) {
  if (locale === 'zh') return null;
  return getDb().metadataI18n?.[locale] ?? null;
}

export function resolveDepartmentI18n(dept: Department, locale: MetadataDisplayLocale): Department {
  const b = sliceBundle(locale);
  const tr = b?.departments[dept.id];
  if (!tr) return dept;
  return { ...dept, name: tr.name, description: tr.description };
}

/** 部门风采列表：主数据译文 + 风采文案译文（heroTitle / 快捷入口标签） */
export function resolveDepartmentShowcaseRow(row: DepartmentShowcaseRow, locale: MetadataDisplayLocale): DepartmentShowcaseRow {
  const core = resolveDepartmentI18n(row, locale);
  const base: DepartmentShowcaseRow = {
    ...row,
    ...core,
    showcaseHeroTitle: row.showcaseHeroTitle,
    showcasePhone: row.showcasePhone,
    showcaseShortcuts: row.showcaseShortcuts?.map((s) => ({ ...s })),
  };
  if (locale === 'zh') return base;
  const tr = getDb().metadataI18n?.[locale]?.deptShowcase[row.id];
  if (!tr) return base;
  const sc = base.showcaseShortcuts;
  const shortcuts =
    sc && tr.shortcuts?.length === sc.length
      ? sc.map((s, i) => ({
          label: tr.shortcuts[i]?.label?.trim() || s.label,
          href: s.href,
        }))
      : sc;
  return {
    ...base,
    showcaseHeroTitle: tr.heroTitle?.trim() || base.showcaseHeroTitle,
    showcaseShortcuts: shortcuts,
  };
}

export function resolveQuestionTypeLabel(type: QuestionType, locale: MetadataDisplayLocale): string {
  if (locale === 'zh') return type.name;
  const tr = getDb().metadataI18n?.[locale]?.questionTypes[type.id];
  return tr?.name?.trim() || type.name;
}

export function resolveNoticeI18n(n: Notice, locale: MetadataDisplayLocale): Notice {
  const b = sliceBundle(locale);
  const tr = b?.notices[n.id];
  if (!tr) return n;
  return { ...n, title: tr.title };
}

/** 列表中的诉求 type 存的是中文类型名，用问题类型表反查 id 再取译文 */
export function resolveAppealTypeLabel(
  typeName: string,
  types: QuestionType[],
  locale: MetadataDisplayLocale,
): string {
  const qt = types.find((t) => t.name === typeName);
  if (!qt) return typeName;
  return resolveQuestionTypeLabel(qt, locale);
}

export function resolveAppealDepartmentName(appeal: Appeal, locale: MetadataDisplayLocale): string {
  if (locale === 'zh') return appeal.departmentName;
  const tr = getDb().metadataI18n?.[locale]?.departments[appeal.departmentId];
  return tr?.name?.trim() || appeal.departmentName;
}

export function resolvePortalBrandingI18n(p: PortalBranding, locale: MetadataDisplayLocale): PortalBranding {
  if (locale === 'zh') return p;
  const tr = getDb().metadataI18n?.[locale]?.portalBranding;
  if (!tr) return p;
  const channels =
    tr.channels?.length === p.channels.length
      ? tr.channels.map((c, i) => ({
          name: c.name || p.channels[i]!.name,
          channel: p.channels[i]!.channel,
        }))
      : p.channels;
  return {
    ...p,
    loginWelcome: tr.loginWelcome || p.loginWelcome,
    loginSubtitle: tr.loginSubtitle || p.loginSubtitle,
    homeMotto: tr.homeMotto || p.homeMotto,
    channels,
  };
}
