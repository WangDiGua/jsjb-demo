export interface User {
  id: string;
  username: string;
  nickname: string;
  phone: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'handler' | 'dept_leader' | 'leader';
  /** 所属院系/单位（展示）；二级单位处理员须与受理部门对应 */
  department?: string;
  /** 与 Department.id 对齐；handler 角色用于数据权限过滤 */
  departmentId?: string;
  avatar?: string;
  status: 'active' | 'banned';
  createTime: string;
}

/**
 * 门户自助注册账号（本地持久化；生产环境应对接统一认证与加密存储）
 */
export interface PortalRegisteredAccount {
  password: string;
  user: User;
}

export interface Department {
  id: string;
  name: string;
  type: 'teaching' | 'administration' | 'logistics' | 'other';
  description: string;
  phone: string;
  email: string;
  address: string;
  avatar?: string;
  受理数: number;
  答复数: number;
  评分: number;
}

/** 门户列表用：主数据部门 + 管理端「部门风采」覆盖项（与 adminConfig.deptShowcaseExtras 对齐） */
export type DepartmentShowcaseRow = Department & {
  showcaseHeroTitle?: string;
  showcasePhone?: string;
  showcaseShortcuts?: { label: string; href: string }[];
};

/** 持久化静态字段；受理数/答复数/评分由诉求快照派生 */
export type DepartmentCatalogEntry = Omit<Department, '受理数' | '答复数' | '评分'>;

export interface Appeal {
  id: string;
  title: string;
  content: string;
  type: string;
  departmentId: string;
  departmentName: string;
  userId: string;
  userName: string;
  status:
    | 'pending'
    | 'accepted'
    | 'processing'
    | 'reply_draft'
    | 'replied'
    | 'returned'
    | 'withdrawn'
    | 'closed';
  isPublic: boolean;
  isAnonymous: boolean;
  images?: string[];
  audioUrl?: string;
  videoUrl?: string;
  createTime: string;
  updateTime: string;
  /** 首次响应间隔（小时），待受理等阶段可为 null */
  响应时长: number | null;
  /** 办结耗时（小时），未办结为 null */
  处理时长: number | null;
  浏览量: number;
  评价?: {
    rating: number;
    comment?: string;
    time: string;
  };
  /** 用户催办次数与时间 */
  催办次数?: number;
  最近催办时间?: string;
  /** 已上报校办/领导关注 */
  上报领导?: boolean;
  /** 办理人上报时填写的原因与时间（不新增诉求 status，仍以 processing 等既有状态为准） */
  领导上报?: { reason: string; time: string; operatorId: string; operatorName: string };
  领导批示?: { content: string; time: string; leaderName: string; leaderId: string };
  /** 督办等级 */
  督办等级?: 'none' | 'normal' | 'urgent';
}

/** 答复发布状态：用户端仅可见 published */
export type ReplyPublishStatus = 'draft' | 'published';

export interface Reply {
  id: string;
  appealId: string;
  handlerId: string;
  handlerName: string;
  content: string;
  images?: string[];
  createTime: string;
  isPublic: boolean;
  publishStatus: ReplyPublishStatus;
  auditRejectReason?: string;
  auditedAt?: string;
  auditorId?: string;
  auditorName?: string;
}

export interface QuestionType {
  id: string;
  name: string;
  icon?: string;
  count: number;
  order: number;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createTime: string;
  publisher: string;
  attachments?: { name: string; url: string }[];
}

export interface Statistics {
  诉求总量: number;
  待答复: number;
  已答复: number;
  本周新增: number;
  本月办结: number;
  办结率: number;
  平均响应时长: number;
  平均处理时长: number;
  满意度: number;
  热点词云: { word: string; count: number }[];
  部门排名: { departmentId: string; departmentName: string; count: number; avgTime: number }[];
}

/** 按自然周（周一至周日）生成的管理周报快照，可下载与推送 */
export interface WeeklyReportSnapshot {
  id: string;
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  generatorUserId?: string;
  generatorName?: string;
  /** 综合性文字摘要 */
  要情概况: string;
  /** 本周高频问题类型 / 主题 */
  热点话题: { label: string; count: number }[];
  /** 互动深、答复长的典型工单 */
  真问深答: { appealId: string; title: string; excerpt: string; replyExcerpt: string }[];
  /** 督办相关（等级或流程） */
  本期督办: { appealId: string; title: string; detail: string }[];
  /** 各单位本周受理与办结概况 */
  单位即诉即办: {
    departmentName: string;
    受理: number;
    办结: number;
    办结率pct: number;
    avgHandleHours: number;
  }[];
  /** 用户评价较高的公开案例 */
  优秀回复案例: { appealId: string; title: string; rating: number; comment?: string; replyExcerpt: string }[];
  诉求受理总量: number;
  办结总量: number;
  办结率: number;
  平均响应时长: number;
  平均处理时长: number;
  部门处理效率排名: { departmentName: string; 办结数: number; avgHandleHours: number }[];
  诉求类型分布: { type: string; count: number }[];
  满意度评价统计: {
    平均分: number;
    评价条数: number;
    分布: { star: number; count: number }[];
  };
  热点词云: { word: string; count: number }[];
}

/** 门户「效能看板」：基于「已公开且已答复」办结池的统计（与诉求公开的列表口径一致） */
export interface PortalEfficiency {
  /** 公开且已答复的办结件总数 */
  publicFinishedCount: number;
  /** 本月内办结的公开件（按 updateTime） */
  monthPublicFinished: number;
  /** 近 7 日新增诉求（全量，含在办） */
  weekNewAll: number;
  /** 平均首次响应（小时） */
  avgResponseHours: number;
  /** 平均办结耗时（小时） */
  avgHandleHours: number;
  /** 公开办结件有评价时的平均分 */
  satisfaction: number;
  /** 公开办结件浏览量合计 */
  totalViews: number;
  byDepartment: { departmentName: string; count: number; avgHandleHours: number }[];
  byType: { type: string; count: number }[];
  /** 近 7 个自然日：办结数、新增诉求数 */
  trend7d: { label: string; finished: number; submitted: number }[];
  keywords: { word: string; count: number }[];
}

export interface AIRecommend {
  id: string;
  appealId: string;
  similarAppeals: {
    id: string;
    title: string;
    content: string;
    replyContent: string;
    similarity: number;
  }[];
  suggestedDepartment?: { id: string; name: string };
  suggestedType?: string;
}

/** 智能题库：相似已办结公开工单及其参考答复（管理端选用） */
export interface ReplyReferenceItem {
  appealId: string;
  title: string;
  similarity: number;
  caseSummary: string;
  referenceReply: string;
}

export type FlowAction =
  | 'submit'
  | 'accept'
  | 'transfer'
  | 'reply'
  | 'return'
  | 'escalate'
  | 'evaluate'
  | 'urge'
  | 'resubmit'
  | 'instruct'
  | 'supervise'
  | 'report_leader'
  | 'process'
  | 'reply_submit_review'
  | 'reply_approve'
  | 'reply_reject';

export interface FlowRecord {
  id: string;
  appealId: string;
  action: FlowAction;
  operatorId: string;
  operatorName: string;
  content?: string;
  createTime: string;
}

/** 站内消息（门户 / 移动 / 管理端共用持久化存储） */
export interface InboxItem {
  id: string;
  userId: string;
  type: 'appeal_reply' | 'appeal_return' | 'appeal_pending' | 'system';
  title: string;
  read: boolean;
  createTime: string;
  appealId?: string;
  href?: string;
}
