import type { User } from './types';

export type UserRole = User['role'];

/** 与产品约定：代码 role → 中文展示名 */
export const ROLE_LABELS: Record<UserRole, string> = {
  student: '学生',
  teacher: '教职工',
  admin: '超管',
  handler: '二级单位处理员',
  dept_leader: '二级单位领导',
  leader: '校办',
};

export function canAccessAdmin(role: UserRole): boolean {
  return role === 'admin' || role === 'handler' || role === 'dept_leader' || role === 'leader';
}

/** 管理端诉求列表是否只看本部门（handler、dept_leader）；超管/校办看全量 */
export function isHandlerScope(role: UserRole): boolean {
  return role === 'handler' || role === 'dept_leader';
}

/** 可审核待发布答复（超管 + 校办 + 二级单位领导） */
export function canAuditAppealReplies(role: UserRole): boolean {
  return role === 'admin' || role === 'leader' || role === 'dept_leader';
}

/** 可受理/处理诉求（二级单位处理员 + 二级单位领导） */
export function canHandleAppeals(role: UserRole): boolean {
  return role === 'handler' || role === 'dept_leader';
}

/** 可查看全量数据（超管 + 校办） */
export function canViewAllData(role: UserRole): boolean {
  return role === 'admin' || role === 'leader';
}

/** 可管理部门配置（超管） */
export function canManageSystem(role: UserRole): boolean {
  return role === 'admin';
}

/** 可督办诉求（校办 + 二级单位领导） */
export function canSuperviseAppeals(role: UserRole): boolean {
  return role === 'leader' || role === 'dept_leader';
}

/** 领导工作台：校办 / 超管 / 二级单位领导（后者仅本部门诉求） */
export function canUseLeaderWorkbench(role: UserRole): boolean {
  return role === 'leader' || role === 'admin' || role === 'dept_leader';
}

/** 可对上报诉求做批示（校办与超管全量；二级单位领导仅限本部门） */
export function canLeaderInstructAppeal(role: UserRole, appealDepartmentId: string, viewerDepartmentId?: string): boolean {
  if (role === 'leader' || role === 'admin') return true;
  if (role === 'dept_leader' && viewerDepartmentId && viewerDepartmentId === appealDepartmentId) return true;
  return false;
}
