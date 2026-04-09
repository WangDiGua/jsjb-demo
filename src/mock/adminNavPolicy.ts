import type { UserRole } from './roles';

/**
 * 管理端路径段（与 react-router 中 /admin/:segment 一致，不含 /admin 前缀）
 * 用于菜单过滤与路由守卫，避免各角色看到相同「全量顶部导航」。
 */
export const ADMIN_ROUTE_SEGMENTS = [
  'dashboard',
  'appeals',
  'leader-desk',
  'departments',
  'types',
  'statistics',
  'weekly-report',
  'settings',
  'forms',
  'workflow',
  'roles',
  'dept-showcase',
  'abnormal-users',
  'notices-admin',
  'ui-config',
  'system',
  'scheduler',
  'knowledge',
  'robots',
] as const;

export type AdminRouteSegment = (typeof ADMIN_ROUTE_SEGMENTS)[number];

const ALL = new Set<string>(ADMIN_ROUTE_SEGMENTS);

/** 接线员：一线处置 + 知识库 */
const HANDLER_ALLOWED = new Set<string>(['dashboard', 'appeals', 'knowledge']);

/** 二级单位领导：本部门办理与督办、主数据与内容、异常用户；不含流程建模 / 业务角色 / 机器人 / 界面与系统运维 */
const DEPT_LEADER_ALLOWED = new Set<string>([
  'dashboard',
  'appeals',
  'leader-desk',
  'statistics',
  'weekly-report',
  'departments',
  'dept-showcase',
  'types',
  'abnormal-users',
  'notices-admin',
  'knowledge',
]);

/** 校办：在部门领导基础上增加流程、角色、机器人（全校协调） */
const LEADER_ALLOWED = new Set<string>([
  ...DEPT_LEADER_ALLOWED,
  'forms',
  'workflow',
  'roles',
  'robots',
]);

function allowedSetForRole(role: UserRole): Set<string> | null {
  switch (role) {
    case 'admin':
      return ALL;
    case 'leader':
      return LEADER_ALLOWED;
    case 'dept_leader':
      return DEPT_LEADER_ALLOWED;
    case 'handler':
      return HANDLER_ALLOWED;
    default:
      return null;
  }
}

/** 从 pathname 解析首段路由，例如 /admin/appeals → appeals；/admin → '' */
export function getAdminRouteSegment(pathname: string): string {
  const m = pathname.match(/^\/admin\/([^/?#]*)/);
  return (m?.[1] ?? '').trim();
}

export function isKnownAdminSegment(segment: string): segment is AdminRouteSegment {
  return ALL.has(segment);
}

/** 首段为空视为工作台首页（与 index redirect 一致） */
export function canAccessAdminRoute(role: UserRole, pathname: string): boolean {
  const segment = getAdminRouteSegment(pathname);
  if (segment === '') return true;

  const allowed = allowedSetForRole(role);
  if (!allowed) return false;
  if (!ALL.has(segment)) return false;
  return allowed.has(segment);
}

/** 无权限或非法路径时跳转的默认页（均保证可访问） */
export function getDefaultAdminPath(role: UserRole): string {
  const allowed = allowedSetForRole(role);
  if (!allowed) return '/admin/dashboard';
  if (allowed.has('dashboard')) return '/admin/dashboard';
  if (allowed.has('appeals')) return '/admin/appeals';
  const first = ADMIN_ROUTE_SEGMENTS.find((s) => allowed.has(s));
  return first ? `/admin/${first}` : '/admin/dashboard';
}
