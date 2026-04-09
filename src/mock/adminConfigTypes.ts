/** 管理端可配置能力（与业务数据一同持久化） */

export type FormFieldType = 'text' | 'textarea' | 'select' | 'image' | 'audio' | 'number';

export interface AppealFormField {
  id: string;
  label: string;
  fieldKey: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  order: number;
  placeholder?: string;
}

export type WorkflowNodeKind = 'start' | 'triage' | 'accept' | 'approve' | 'reply' | 'supervise' | 'end';

export interface WorkflowNode {
  id: string;
  name: string;
  kind: WorkflowNodeKind;
  nextIds: string[];
  slaHours?: number;
  remark?: string;
}

export interface BusinessRoleRow {
  id: string;
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface DeptShowcaseExtra {
  departmentId: string;
  heroTitle: string;
  shortcuts: { label: string; href: string }[];
  linkTel?: string;
}

export interface PortalBranding {
  loginWelcome: string;
  loginSubtitle: string;
  homeMotto: string;
  channels: { name: string; channel: string }[];
}

export interface AuditLogRow {
  id: string;
  time: string;
  operator: string;
  module: string;
  action: string;
  detail: string;
}

export interface ScheduledJobRow {
  id: string;
  name: string;
  cron: string;
  enabled: boolean;
  lastRun?: string;
  status: 'idle' | 'running' | 'failed' | 'success';
}

export interface KbDocument {
  id: string;
  title: string;
  category: string;
  source: string;
  visibility: 'public' | 'internal' | 'handlers';
  updatedAt: string;
  snippet: string;
}

export interface ChatbotProfile {
  id: string;
  name: string;
  environment: 'staging' | 'production';
  intentCount: number;
  linkedKbIds: string[];
  enabled: boolean;
}

export type UserRiskStatus = 'watch' | 'throttle' | 'banned';

export interface UserRiskMark {
  userId: string;
  username: string;
  displayName: string;
  flags: string[];
  appealCount30d: number;
  status: UserRiskStatus;
  note?: string;
  updatedAt: string;
}

/** 系统设置页持久化项（与 mock DB 一并保存） */
export interface SystemSettings {
  basic: {
    platformName: string;
    schoolName: string;
    slogan: string;
    /** data URL 或外链，空表示无 Logo */
    logoDataUrl: string;
  };
  timeouts: {
    urgeTimeoutHours: number;
    superviseTimeoutHours: number;
    autoCloseDays: number;
    smsReminder: boolean;
    emailReminder: boolean;
  };
  notices: {
    enabled: boolean;
    /** 演示环境暂无公告审核流，仅持久化开关供后续对接 */
    requireAudit: boolean;
    pinTopCount: number;
  };
  ai: {
    smartDispatch: boolean;
    smartRecommend: boolean;
    assistWrite: boolean;
    translation: boolean;
    modelLabel: string;
    dailyTokenBudget: number;
  };
}

export interface AdminConfigBundle {
  formFields: AppealFormField[];
  workflowNodes: WorkflowNode[];
  businessRoles: BusinessRoleRow[];
  deptShowcaseExtras: DeptShowcaseExtra[];
  portalBranding: PortalBranding;
  /** 系统设置（基础/超时/公告/AI 等） */
  systemSettings: SystemSettings;
  auditLogs: AuditLogRow[];
  scheduledJobs: ScheduledJobRow[];
  kbDocuments: KbDocument[];
  chatbotProfiles: ChatbotProfile[];
  userRiskMarks: UserRiskMark[];
}
