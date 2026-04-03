import type {
  Appeal,
  FlowRecord,
  InboxItem,
  Notice,
  QuestionType,
  Reply,
  Statistics,
  PortalEfficiency,
  User,
  PortalRegisteredAccount,
  WeeklyReportSnapshot,
} from './types';
import type {
  MetadataI18nBundle,
  MetadataLocaleCode,
  MetadataTranslateInput,
  MetadataTranslateModelOut,
} from './metadataI18nTypes';
import { mockUsers, enrichDepartmentsFromAppeals, deriveQuestionTypeCounts } from './data';
import { getDb, saveDb } from './persist';
import {
  canAuditAppealReplies,
  isHandlerScope,
  canHandleAppeals,
  canSuperviseAppeals,
  canLeaderInstructAppeal,
  canUseLeaderWorkbench,
  canViewAllData,
} from './roles';
import { aiService } from './aiGlm';

/** 管理端「转派」仅适用于在办工单；退回/待审答复/已办结/撤销等不可转派 */
export const APPEAL_STATUSES_ALLOW_TRANSFER: Appeal['status'][] = ['pending', 'accepted', 'processing'];

async function requireContentPassesSensitiveCheck(text: string): Promise<void> {
  const r = await aiService.checkSensitiveWords(text);
  if (!r.ok) {
    throw new Error('内容安全检测未完成，请检查网络或大模型配置后重试');
  }
  if (r.hasSensitive) {
    throw new Error(`内容包含不适宜公开表述：${r.words.join('、')}`);
  }
}

function pushFlow(partial: Omit<FlowRecord, 'id' | 'createTime'> & { content?: string }) {
  const rec: FlowRecord = {
    id: `flow_${Date.now()}`,
    createTime: new Date().toLocaleString('zh-CN'),
    ...partial,
  };
  getDb().flowRecords.push(rec);
  saveDb();
}

function inboxPush(item: Omit<InboxItem, 'id'> & { id?: string }) {
  const db = getDb();
  const id = item.id ?? `inbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  db.inbox.push({ ...item, id, read: item.read ?? false } as InboxItem);
  saveDb();
}

/** 新诉求：通知对应部门处理员、二级单位领导、超管、校办 */
function notifyNewAppealPending(appeal: { id: string; title: string; departmentId: string }) {
  const targets = mockUsers.filter((u) => {
    if (u.role === 'admin' || u.role === 'leader') return true;
    if ((u.role === 'handler' || u.role === 'dept_leader') && u.departmentId === appeal.departmentId) return true;
    return false;
  });
  const createTime = new Date().toLocaleString('zh-CN');
  for (const u of targets) {
    inboxPush({
      userId: u.id,
      type: 'appeal_pending',
      title: `新诉求待处理：${appeal.title}`,
      read: false,
      createTime,
      appealId: appeal.id,
      href: '/admin/appeals',
    });
  }
}

function notifyAppealUser(
  userId: string,
  type: InboxItem['type'],
  title: string,
  appealId: string,
  href: string,
) {
  inboxPush({
    userId,
    type,
    title,
    read: false,
    createTime: new Date().toLocaleString('zh-CN'),
    appealId,
    href,
  });
}

function notifyReplyAuditPending(appeal: { id: string; title: string }) {
  const createTime = new Date().toLocaleString('zh-CN');
  for (const u of mockUsers) {
    if (!canAuditAppealReplies(u.role)) continue;
    inboxPush({
      userId: u.id,
      type: 'system',
      title: `待审核答复：${appeal.title}`,
      read: false,
      createTime,
      appealId: appeal.id,
      href: '/admin/appeals',
    });
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEMO_PASSWORD = '123456';

function findRegisteredAccount(username: string): PortalRegisteredAccount | undefined {
  const uname = username.trim();
  return getDb().portalAccounts.find((a) => a.user.username === uname);
}

function seedUserByUsername(username: string): User | undefined {
  return mockUsers.find((u) => u.username === username.trim());
}

export const userService = {
  async register(payload: {
    username: string;
    password: string;
    phone: string;
    email: string;
    role: User['role'];
  }) {
    await delay(350);
    const username = payload.username.trim();
    if (username.length < 4 || username.length > 20) {
      return { success: false as const, message: '用户名长度应为 4～20 字符' };
    }
    if (payload.password.length < 6) {
      return { success: false as const, message: '密码至少 6 位' };
    }
    if (seedUserByUsername(username)) {
      return { success: false as const, message: '用户名已存在' };
    }
    if (findRegisteredAccount(username)) {
      return { success: false as const, message: '用户名已存在' };
    }
    const user: User = {
      id: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      username,
      nickname: username.length > 20 ? username.slice(0, 20) : username,
      phone: payload.phone.trim() || '—',
      email: payload.email.trim() || '—',
      role: payload.role,
      department: '—',
      status: 'active',
      createTime: new Date().toLocaleString('zh-CN'),
    };
    getDb().portalAccounts.push({ password: payload.password, user });
    saveDb();
    return { success: true as const, data: user };
  },

  async login(username: string, password: string) {
    await delay(300);
    const uname = username.trim();
    const seed = seedUserByUsername(uname);
    if (seed) {
      if (password !== DEMO_PASSWORD) {
        return { success: false as const, message: '用户名或密码错误' };
      }
      return { success: true as const, data: seed, token: 'mock_token_' + seed.id };
    }
    const reg = findRegisteredAccount(uname);
    if (reg) {
      if (reg.password !== password) {
        return { success: false as const, message: '用户名或密码错误' };
      }
      return { success: true as const, data: reg.user, token: 'mock_token_' + reg.user.id };
    }
    return { success: false as const, message: '用户名或密码错误' };
  },

  async getUserInfo(id: string) {
    await delay(200);
    const fromSeed = mockUsers.find((u) => u.id === id);
    if (fromSeed) return fromSeed;
    return getDb().portalAccounts.find((a) => a.user.id === id)?.user ?? null;
  },

  async getCurrentUser() {
    await delay(200);
    return mockUsers[0];
  },

  async phoneLogin(_phone: string, _captcha: string) {
    await delay(300);
    return { success: true as const, data: mockUsers[0], token: 'mock_phone_token' };
  },
};

export type AppealOperator = { operatorId: string; operatorName: string };

export const departmentService = {
  async getDepartments() {
    await delay(200);
    return enrichDepartmentsFromAppeals(getDb().appeals);
  },

  async getDepartment(id: string) {
    await delay(200);
    return enrichDepartmentsFromAppeals(getDb().appeals).find((d) => d.id === id) || null;
  },

  async getDepartmentRankings() {
    await delay(200);
    const deps = enrichDepartmentsFromAppeals(getDb().appeals);
    return {
      受理榜: [...deps].sort((a, b) => b.受理数 - a.受理数),
      答复榜: [...deps].sort((a, b) => b.答复数 - a.答复数),
    };
  },
};

function filterAppealsForViewer(appeals: import('./types').Appeal[], viewer?: User | null) {
  if (viewer && isHandlerScope(viewer.role) && viewer.departmentId) {
    return appeals.filter((a) => a.departmentId === viewer.departmentId);
  }
  return appeals;
}

const REPORTABLE_APPEAL_STATUSES: Appeal['status'][] = ['pending', 'accepted', 'processing', 'reply_draft'];

function filterLeaderDeskAppeals(appeals: Appeal[], viewer?: User | null): Appeal[] {
  if (!viewer || !canUseLeaderWorkbench(viewer.role)) return [];
  if (viewer.role === 'leader' || viewer.role === 'admin') return [...appeals];
  if (viewer.role === 'dept_leader' && viewer.departmentId) {
    return appeals.filter((a) => a.departmentId === viewer.departmentId);
  }
  return [];
}

function hasFlowAction(appealId: string, action: FlowRecord['action']): boolean {
  return getDb().flowRecords.some((r) => r.appealId === appealId && r.action === action);
}

function parseAppealDateTime(s: string): number {
  return new Date(s.replace(/-/g, '/')).getTime();
}

/** 与 deriveStatistics 中「待答复」口径一致 */
const DASHBOARD_IN_PROGRESS_STATUSES: Appeal['status'][] = ['pending', 'accepted', 'processing', 'reply_draft'];

const HOT_TOPIC_KEYWORDS = [
  '选课',
  '教务',
  '网络',
  '空调',
  '食堂',
  '图书馆',
  '奖学金',
  '宿舍',
  '电梯',
  '心理',
  '体育',
  '财务',
  '直饮水',
  '教室',
  '预约',
  '报修',
  '门禁',
  '投影',
  '水质',
  '学籍',
  '快递',
  'VPN',
  '慕课',
  '噪声',
  '委托',
  '借阅',
  '核销',
  '学分',
  '认证',
];

function deriveHotWordCloud(appeals: import('./types').Appeal[]): { word: string; count: number }[] {
  const list: { word: string; count: number }[] = [];
  for (const kw of HOT_TOPIC_KEYWORDS) {
    let hits = 0;
    for (const a of appeals) {
      if ((a.title + a.content).includes(kw)) hits += 1;
    }
    if (hits > 0) list.push({ word: kw, count: hits * 14 + 12 });
  }
  return list.sort((a, b) => b.count - a.count).slice(0, 12);
}

function deriveStatistics(): Statistics {
  const appeals = getDb().appeals;
  const total = appeals.length;
  const 待答复 = appeals.filter((a) =>
    ['pending', 'accepted', 'processing', 'reply_draft'].includes(a.status),
  ).length;
  const 已答复 = appeals.filter((a) => a.status === 'replied').length;

  const now = new Date();
  const day = 86400000;
  const weekStart = new Date(now.getTime() - 7 * day);
  const parse = (s: string) => new Date(s.replace(/-/g, '/'));
  const 本周新增 = appeals.filter((a) => parse(a.createTime) >= weekStart).length;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const 本月办结 = appeals.filter(
    (a) => a.status === 'replied' && parse(a.updateTime) >= monthStart,
  ).length;

  const 办结率 = total ? Math.round((已答复 / total) * 1000) / 10 : 0;

  const responded = appeals.filter((a) => a.响应时长 != null && a.响应时长 > 0);
  const 平均响应时长 = responded.length
    ? Math.round((responded.reduce((s, a) => s + (a.响应时长 as number), 0) / responded.length) * 10) / 10
    : 0;

  const finishedTimed = appeals.filter(
    (a) => a.status === 'replied' && a.处理时长 != null && (a.处理时长 as number) > 0,
  );
  const 平均处理时长 = finishedTimed.length
    ? Math.round(
        (finishedTimed.reduce((s, a) => s + (a.处理时长 as number), 0) / finishedTimed.length) * 10,
      ) / 10
    : 0;

  const ratings = appeals.filter((a) => a.评价?.rating != null).map((a) => a.评价!.rating);
  const 满意度 = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : 0;

  const byDept = new Map<string, { departmentId: string; departmentName: string; count: number }>();
  for (const a of appeals) {
    const cur = byDept.get(a.departmentId) ?? {
      departmentId: a.departmentId,
      departmentName: a.departmentName,
      count: 0,
    };
    cur.count += 1;
    byDept.set(a.departmentId, cur);
  }
  const 部门排名 = [...byDept.values()]
    .map((d) => {
      const mine = appeals.filter((a) => a.departmentId === d.departmentId);
      const repliedTimed = mine.filter(
        (a) => a.status === 'replied' && a.处理时长 != null && (a.处理时长 as number) > 0,
      );
      const avgTime = repliedTimed.length
        ? Math.round(
            (repliedTimed.reduce((s, a) => s + (a.处理时长 as number), 0) / repliedTimed.length) * 10,
          ) / 10
        : 8;
      return {
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        count: d.count,
        avgTime,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    诉求总量: total,
    待答复,
    已答复,
    本周新增,
    本月办结,
    办结率,
    平均响应时长,
    平均处理时长,
    满意度,
    热点词云: deriveHotWordCloud(appeals),
    部门排名,
  };
}

function derivePortalEfficiency(): PortalEfficiency {
  const appeals = getDb().appeals;
  const parse = (s: string) => new Date(s.replace(/-/g, '/'));
  const pool = appeals.filter((a) => a.isPublic && a.status === 'replied');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now.getTime() - 7 * 86400000);

  const monthPublicFinished = pool.filter((a) => parse(a.updateTime) >= monthStart).length;
  const weekNewAll = appeals.filter((a) => parse(a.createTime) >= weekStart).length;

  const responded = pool.filter((a) => a.响应时长 != null && (a.响应时长 as number) > 0);
  const avgResponseHours = responded.length
    ? Math.round(
        (responded.reduce((s, a) => s + (a.响应时长 as number), 0) / responded.length) * 10,
      ) / 10
    : 0;

  const finishedTimed = pool.filter(
    (a) => a.处理时长 != null && (a.处理时长 as number) > 0,
  );
  const avgHandleHours = finishedTimed.length
    ? Math.round(
        (finishedTimed.reduce((s, a) => s + (a.处理时长 as number), 0) / finishedTimed.length) * 10,
      ) / 10
    : 0;

  const ratings = pool.filter((a) => a.评价?.rating != null).map((a) => a.评价!.rating);
  const satisfaction = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : 0;

  const totalViews = pool.reduce((s, a) => s + (a.浏览量 ?? 0), 0);

  const dm = new Map<string, { departmentName: string; count: number; handles: number[] }>();
  for (const a of pool) {
    const cur = dm.get(a.departmentId) ?? { departmentName: a.departmentName, count: 0, handles: [] };
    cur.count += 1;
    if (a.处理时长 != null && (a.处理时长 as number) > 0) cur.handles.push(a.处理时长 as number);
    dm.set(a.departmentId, cur);
  }
  const byDepartment = [...dm.values()]
    .map((d) => ({
      departmentName: d.departmentName,
      count: d.count,
      avgHandleHours: d.handles.length
        ? Math.round((d.handles.reduce((s, x) => s + x, 0) / d.handles.length) * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const tm = new Map<string, number>();
  for (const a of pool) tm.set(a.type, (tm.get(a.type) ?? 0) + 1);
  const byType = [...tm.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const trend7d: PortalEfficiency['trend7d'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    let finished = 0;
    let submitted = 0;
    for (const a of pool) {
      const u = parse(a.updateTime);
      if (!Number.isNaN(u.getTime()) && u >= dayStart && u < dayEnd) finished += 1;
    }
    for (const a of appeals) {
      const c = parse(a.createTime);
      if (!Number.isNaN(c.getTime()) && c >= dayStart && c < dayEnd) submitted += 1;
    }
    trend7d.push({ label, finished, submitted });
  }

  const keywords = deriveHotWordCloud(pool).slice(0, 12);

  return {
    publicFinishedCount: pool.length,
    monthPublicFinished,
    weekNewAll,
    avgResponseHours,
    avgHandleHours,
    satisfaction,
    totalViews,
    byDepartment,
    byType,
    trend7d,
    keywords,
  };
}

/** 自然周：周一 00:00:00 起算，止于次周周一 00:00（左闭右开） */
function mondayOfWeekContaining(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + delta);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sundayOfSameWeek(monday: Date): Date {
  const s = new Date(monday);
  s.setDate(s.getDate() + 6);
  return s;
}

function isInstantInWeek(ts: number, weekMonday: Date): boolean {
  const start = weekMonday.getTime();
  return ts >= start && ts < start + 7 * 86400000;
}

function latestPublishedReplyForAppeal(appealId: string): Reply | undefined {
  const rs = getDb().replies.filter((r) => r.appealId === appealId && r.publishStatus === 'published');
  if (!rs.length) return undefined;
  return rs.reduce((a, b) => (parseAppealDateTime(a.createTime) >= parseAppealDateTime(b.createTime) ? a : b));
}

function textExcerpt(s: string, maxLen: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

const SUPERVISE_FLOW_ACTIONS: FlowRecord['action'][] = [
  'supervise',
  'instruct',
  'report_leader',
  'escalate',
];

function buildWeeklyReportSnapshot(monday: Date): WeeklyReportSnapshot {
  const appeals = getDb().appeals;
  const flows = getDb().flowRecords;
  const sunday = sundayOfSameWeek(monday);
  const weekLabel = `${monday.getFullYear()}年${monday.getMonth() + 1}月${monday.getDate()}日—${sunday.getMonth() + 1}月${sunday.getDate()}日 工作周报`;
  const weekStart = formatYmd(monday);
  const weekEnd = formatYmd(sunday);

  const createdInWeek = appeals.filter((a) => isInstantInWeek(parseAppealDateTime(a.createTime), monday));
  const finishedInWeek = appeals.filter(
    (a) => a.status === 'replied' && isInstantInWeek(parseAppealDateTime(a.updateTime), monday),
  );

  const 诉求受理总量 = createdInWeek.length;
  const 办结总量 = finishedInWeek.length;
  const 办结率 =
    诉求受理总量 > 0 ? Math.round((办结总量 / 诉求受理总量) * 1000) / 10 : 办结总量 > 0 ? 100 : 0;

  const respondedWeek = finishedInWeek.filter((a) => a.响应时长 != null && (a.响应时长 as number) > 0);
  const 平均响应时长 = respondedWeek.length
    ? Math.round(
        (respondedWeek.reduce((s, a) => s + (a.响应时长 as number), 0) / respondedWeek.length) * 10,
      ) / 10
    : 0;
  const timedFinish = finishedInWeek.filter((a) => a.处理时长 != null && (a.处理时长 as number) > 0);
  const 平均处理时长 = timedFinish.length
    ? Math.round((timedFinish.reduce((s, a) => s + (a.处理时长 as number), 0) / timedFinish.length) * 10) / 10
    : 0;

  const typeCount = new Map<string, number>();
  for (const a of createdInWeek) typeCount.set(a.type, (typeCount.get(a.type) ?? 0) + 1);
  const 诉求类型分布 = [...typeCount.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const 热点话题 = 诉求类型分布.slice(0, 8).map((x) => ({ label: x.type, count: x.count }));

  const deptMap = new Map<string, string>();
  for (const a of appeals) {
    if (!deptMap.has(a.departmentId)) deptMap.set(a.departmentId, a.departmentName);
  }
  const 单位即诉即办 = [...deptMap.entries()].map(([deptId, departmentName]) => {
    const 受理 = createdInWeek.filter((a) => a.departmentId === deptId).length;
    const 办结 = finishedInWeek.filter((a) => a.departmentId === deptId).length;
    const 办结率pct = 受理 > 0 ? Math.round((办结 / 受理) * 1000) / 10 : 办结 > 0 ? 100 : 0;
    const deptFinished = finishedInWeek.filter((a) => a.departmentId === deptId);
    const handles = deptFinished
      .map((a) => a.处理时长 as number | null)
      .filter((h): h is number => h != null && h > 0);
    const avgHandleHours = handles.length
      ? Math.round((handles.reduce((s, h) => s + h, 0) / handles.length) * 10) / 10
      : 0;
    return { departmentName, 受理, 办结, 办结率pct, avgHandleHours };
  })
    .filter((r) => r.受理 > 0 || r.办结 > 0)
    .sort((a, b) => b.办结 - a.办结 || b.受理 - a.受理);

  const 部门处理效率排名 = [...deptMap.entries()]
    .map(([deptId, departmentName]) => {
      const deptFinished = finishedInWeek.filter((a) => a.departmentId === deptId);
      const 办结数 = deptFinished.length;
      const handles = deptFinished
        .map((a) => a.处理时长 as number | null)
        .filter((h): h is number => h != null && h > 0);
      const avgHandleHours = handles.length
        ? Math.round((handles.reduce((s, h) => s + h, 0) / handles.length) * 10) / 10
        : 0;
      return { departmentName, 办结数, avgHandleHours };
    })
    .filter((r) => r.办结数 > 0)
    .sort((a, b) => b.办结数 - a.办结数 || a.avgHandleHours - b.avgHandleHours);

  const distStars = [1, 2, 3, 4, 5].map((star) => ({ star, count: 0 }));
  const rated = finishedInWeek.filter((a) => a.评价?.rating != null);
  for (const a of rated) {
    const n = Math.min(5, Math.max(1, Math.round(a.评价!.rating))) - 1;
    if (distStars[n]) distStars[n].count += 1;
  }
  const 满意度评价统计 = {
    平均分: rated.length
      ? Math.round((rated.reduce((s, a) => s + (a.评价!.rating as number), 0) / rated.length) * 10) / 10
      : 0,
    评价条数: rated.length,
    分布: distStars,
  };

  const 热点词云 = deriveHotWordCloud(createdInWeek.length ? createdInWeek : appeals);

  const weekAppealPool = new Map<string, Appeal>();
  for (const a of createdInWeek) weekAppealPool.set(a.id, a);
  for (const a of finishedInWeek) weekAppealPool.set(a.id, a);
  const poolList = [...weekAppealPool.values()];
  const scoredDeep = poolList
    .map((a) => {
      const rep = latestPublishedReplyForAppeal(a.id);
      if (!rep) return null;
      const score = rep.content.length + a.content.length;
      return {
        appealId: a.id,
        title: a.title,
        excerpt: textExcerpt(a.content, 120),
        replyExcerpt: textExcerpt(rep.content, 160),
        score,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null && x.score > 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const 真问深答 = scoredDeep.map(({ score: _s, ...rest }) => rest);

  const superviseIds = new Set<string>();
  for (const r of flows) {
    if (!isInstantInWeek(parseAppealDateTime(r.createTime), monday)) continue;
    if (SUPERVISE_FLOW_ACTIONS.includes(r.action)) superviseIds.add(r.appealId);
  }
  for (const a of appeals) {
    const sup = a.督办等级;
    if (sup && sup !== 'none') {
      if (
        isInstantInWeek(parseAppealDateTime(a.updateTime), monday) ||
        isInstantInWeek(parseAppealDateTime(a.createTime), monday)
      ) {
        superviseIds.add(a.id);
      }
    }
    if (
      a.上报领导 &&
      (isInstantInWeek(parseAppealDateTime(a.updateTime), monday) ||
        isInstantInWeek(parseAppealDateTime(a.createTime), monday))
    ) {
      superviseIds.add(a.id);
    }
  }
  const 本期督办 = [...superviseIds]
    .map((id) => appeals.find((a) => a.id === id))
    .filter((a): a is Appeal => !!a)
    .slice(0, 12)
    .map((a) => {
      const lv = a.督办等级 && a.督办等级 !== 'none' ? `督办等级：${a.督办等级}` : '';
      const up = a.领导上报 ? `领导关注：${textExcerpt(a.领导上报.reason, 60)}` : '';
      const ins = a.领导批示 ? `批示摘要：${textExcerpt(a.领导批示.content, 80)}` : '';
      const detail = [lv, up, ins].filter(Boolean).join('；') || '本周关联督办/上报流程';
      return { appealId: a.id, title: a.title, detail };
    });

  const 优秀回复案例 = [...finishedInWeek]
    .filter((a) => a.评价 && (a.评价.rating as number) >= 4)
    .sort((a, b) => (b.评价!.rating as number) - (a.评价!.rating as number))
    .slice(0, 5)
    .map((a) => {
      const rep = latestPublishedReplyForAppeal(a.id);
      return {
        appealId: a.id,
        title: a.title,
        rating: a.评价!.rating,
        comment: a.评价!.comment,
        replyExcerpt: rep ? textExcerpt(rep.content, 200) : '—',
      };
    });

  const topTypeLine =
    热点话题[0] != null ? `高频类型「${热点话题[0].label}」${热点话题[0].count} 件` : '类型分布较分散';
  const 要情概况 = [
    `本周（${weekStart}～${weekEnd}）诉求受理 ${诉求受理总量} 件，办结 ${办结总量} 件，按期测算办结率约 ${办结率}%。`,
    `平均响应 ${平均响应时长} 小时、平均处理 ${平均处理时长} 小时；用户评价 ${满意度评价统计.评价条数} 条，均分 ${满意度评价统计.平均分}。`,
    `${topTypeLine}；本期纳入督办与领导关注相关事项 ${本期督办.length} 条。`,
    '以下为各单位即诉即办工作量与质量结构的自动汇总，供校办与相关单位对照改进（演示环境为本地聚合，生产可对接调度任务与邮件/企业微信）。',
  ].join('');

  const id = `wr_${weekStart}`;

  return {
    id,
    weekLabel,
    weekStart,
    weekEnd,
    generatedAt: new Date().toLocaleString('zh-CN'),
    要情概况,
    热点话题,
    真问深答,
    本期督办,
    单位即诉即办,
    优秀回复案例,
    诉求受理总量,
    办结总量,
    办结率,
    平均响应时长,
    平均处理时长,
    部门处理效率排名,
    诉求类型分布,
    满意度评价统计,
    热点词云,
  };
}

function weeklyReportToWordHtml(r: WeeklyReportSnapshot): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const row = (cells: string[]) =>
    `<tr>${cells.map((c) => `<td style="border:1px solid #ccc;padding:6px 8px;">${esc(c)}</td>`).join('')}</tr>`;
  const deptRows = r.单位即诉即办.map((d) =>
    row([d.departmentName, String(d.受理), String(d.办结), String(d.办结率pct), String(d.avgHandleHours)]),
  ).join('');
  const rankRows = r.部门处理效率排名
    .map((d) => row([d.departmentName, String(d.办结数), String(d.avgHandleHours)]))
    .join('');
  const typeRows = r.诉求类型分布.map((t) => row([t.type, String(t.count)])).join('');
  const satRows = r.满意度评价统计.分布.map((x) => row([String(x.star), String(x.count)])).join('');
  const topicRows = r.热点话题.map((t) => row([t.label, String(t.count)])).join('');
  const cloud = r.热点词云.map((w) => `${w.word}(${w.count})`).join('、');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(r.weekLabel)}</title></head><body style="font-family:Microsoft YaHei,SimSun,sans-serif;font-size:14px;line-height:1.5;">
<h1>${esc(r.weekLabel)}</h1>
<p><strong>生成时间：</strong>${esc(r.generatedAt)}</p>
<h2>一、要情概况</h2><p>${esc(r.要情概况)}</p>
<h2>二、核心指标</h2><table style="border-collapse:collapse;">${row(['诉求受理总量', String(r.诉求受理总量)])}${row(['办结总量', String(r.办结总量)])}${row(['办结率(%)', String(r.办结率)])}${row(['平均响应时长(小时)', String(r.平均响应时长)])}${row(['平均处理时长(小时)', String(r.平均处理时长)])}</table>
<h2>三、热点话题</h2><table style="border-collapse:collapse;">${row(['类型', '件数'])}${topicRows}</table>
<h2>四、真问深答</h2>${r.真问深答.map((x) => `<p><strong>${esc(x.title)}</strong><br/>诉求摘要：${esc(x.excerpt)}<br/>答复摘录：${esc(x.replyExcerpt)}</p>`,
).join('')}
<h2>五、本期督办</h2>${r.本期督办.map((x) => `<p><strong>${esc(x.title)}</strong><br/>${esc(x.detail)}</p>`).join('') || '<p>—</p>'}
<h2>六、单位即诉即办</h2><table style="border-collapse:collapse;">${row(['单位', '受理', '办结', '办结率%', '平均处理(小时)'])}${deptRows}</table>
<h2>七、优秀回复案例</h2>${r.优秀回复案例.map((x) => `<p><strong>${esc(x.title)}</strong>（${x.rating} 星）<br/>${esc(x.replyExcerpt)}</p>`,
).join('') || '<p>—</p>'}
<h2>八、部门处理效率排名</h2><table style="border-collapse:collapse;">${row(['部门', '本周办结', '平均处理(小时)'])}${rankRows}</table>
<h2>九、诉求类型分布</h2><table style="border-collapse:collapse;">${row(['类型', '件数'])}${typeRows}</table>
<h2>十、满意度评价</h2><p>均分 ${r.满意度评价统计.平均分}，共 ${r.满意度评价统计.评价条数} 条</p><table style="border-collapse:collapse;">${row(['星级', '条数'])}${satRows}</table>
<h2>十一、热点词云</h2><p>${esc(cloud)}</p>
</body></html>`;
}

function weeklyReportToPptOutline(r: WeeklyReportSnapshot): string {
  const lines: string[] = [
    `【幻灯片1】${r.weekLabel}`,
    `要点：受理 ${r.诉求受理总量} · 办结 ${r.办结总量} · 办结率 ${r.办结率}%`,
    '',
    '【幻灯片2】要情概况',
    r.要情概况,
    '',
    '【幻灯片3】核心指标',
    `- 平均响应 ${r.平均响应时长}h · 平均处理 ${r.平均处理时长}h`,
    `- 满意度 ${r.满意度评价统计.平均分} 分（${r.满意度评价统计.评价条数} 条评价）`,
    '',
    '【幻灯片4】热点话题',
    ...r.热点话题.map((t) => `- ${t.label}：${t.count}`),
    '',
    '【幻灯片5】部门效率（TOP）',
    ...r.部门处理效率排名.slice(0, 6).map((d) => `- ${d.departmentName}：办结 ${d.办结数}`),
    '',
    '【幻灯片6】督办与深答提示',
    ...r.本期督办.slice(0, 4).map((x) => `- ${x.title}`),
    ...r.真问深答.slice(0, 2).map((x) => `- ${x.title}`),
    '',
    '【幻灯片7】热点词云（关键词）',
    r.热点词云.map((w) => w.word).join('、'),
  ];
  return lines.join('\n');
}

export const weeklyReportService = {
  mondayOfWeekContaining,

  /** 按所选日期所在周生成快照（不落库） */
  async previewForDate(anchor: Date) {
    await delay(50);
    const monday = mondayOfWeekContaining(anchor);
    return buildWeeklyReportSnapshot(monday);
  },

  async list() {
    await delay(80);
    return [...getDb().weeklyReports!].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  },

  async getById(id: string) {
    await delay(40);
    return getDb().weeklyReports!.find((x) => x.id === id) ?? null;
  },

  /** 生成并覆盖同周已存记录 */
  async generateAndSave(anchor: Date, actor: User | null) {
    await delay(120);
    if (!actor || !canViewAllData(actor.role)) {
      throw new Error('仅超管或校办可生成与归档周报');
    }
    const snapshot = buildWeeklyReportSnapshot(mondayOfWeekContaining(anchor));
    snapshot.generatorUserId = actor.id;
    snapshot.generatorName = actor.nickname;
    const db = getDb();
    const list = db.weeklyReports!;
    const i = list.findIndex((x) => x.id === snapshot.id);
    if (i >= 0) list.splice(i, 1);
    list.unshift(snapshot);
    saveDb();
    try {
      window.dispatchEvent(new Event('jsjb-mock-updated'));
    } catch {
      /* ignore */
    }
    return snapshot;
  },

  buildWordHtml: weeklyReportToWordHtml,
  buildPptOutline: weeklyReportToPptOutline,

  /** 向校办、超管及二级单位领导推送站内信（演示） */
  async notifyManagers(reportId: string, actor: User | null) {
    await delay(80);
    if (!actor || !canViewAllData(actor.role)) {
      throw new Error('仅超管或校办可推送周报');
    }
    const r = getDb().weeklyReports!.find((x) => x.id === reportId);
    if (!r) throw new Error('周报不存在');
    const href = `/admin/weekly-report?saved=${encodeURIComponent(reportId)}`;
    const createTime = new Date().toLocaleString('zh-CN');
    const targets = mockUsers.filter((u) => u.role === 'admin' || u.role === 'leader' || u.role === 'dept_leader');
    for (const u of targets) {
      inboxPush({
        userId: u.id,
        type: 'system',
        title: `管理周报已发布：${r.weekLabel}`,
        read: false,
        createTime,
        href,
      });
    }
    saveDb();
    try {
      window.dispatchEvent(new Event('jsjb-mock-updated'));
    } catch {
      /* ignore */
    }
    return { pushed: targets.length };
  },
};

export const appealService = {
  async getAppeals(
    params?: {
      status?: string;
      type?: string;
      keyword?: string;
      departmentId?: string;
      page?: number;
      pageSize?: number;
    },
    viewer?: User | null,
  ) {
    await delay(300);
    let filtered = [...filterAppealsForViewer(getDb().appeals, viewer)];

    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter((a) => a.status === params.status);
    }
    if (params?.type && params.type !== 'all') {
      filtered = filtered.filter((a) => a.type === params.type);
    }
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(kw) || a.content.toLowerCase().includes(kw),
      );
    }
    if (params?.departmentId) {
      filtered = filtered.filter((a) => a.departmentId === params.departmentId);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);

    return { data, total, page, pageSize };
  },

  /**
   * 数据概览「待办关注」：在办工单全集上按角色范围过滤后，再筛状态，不按无意义分页截取。
   * 排序：创建时间升序（优先展示积压更久的单）。
   */
  async getDashboardInProgressAppeals(viewer: User | null, limit = 12) {
    await delay(150);
    const list = filterAppealsForViewer(getDb().appeals, viewer).filter((a) =>
      DASHBOARD_IN_PROGRESS_STATUSES.includes(a.status),
    );
    list.sort((a, b) => parseAppealDateTime(a.createTime) - parseAppealDateTime(b.createTime));
    return list.slice(0, limit);
  },

  /** 数据概览「实时诉求办理」：可见范围内按更新时间倒序，与「任意状态前 5 条」无关 */
  async getDashboardRecentAppeals(viewer: User | null, limit = 8) {
    await delay(150);
    const list = [...filterAppealsForViewer(getDb().appeals, viewer)];
    list.sort((a, b) => parseAppealDateTime(b.updateTime) - parseAppealDateTime(a.updateTime));
    return list.slice(0, limit);
  },

  /** 管理端侧栏红点：待受理数量（已按角色范围过滤） */
  async getPendingCountForViewer(viewer: User | null) {
    await delay(0);
    if (!viewer) return 0;
    const scoped = filterAppealsForViewer(getDb().appeals, viewer);
    return scoped.filter((a) => a.status === 'pending').length;
  },

  async getPublicAppeals(params?: {
    type?: string;
    keyword?: string;
    departmentId?: string;
    page?: number;
    pageSize?: number;
    /** 默认按工单编号/入库顺序；popular 按公开浏览量降序 */
    sort?: 'default' | 'popular';
  }) {
    await delay(300);
    let filtered = getDb().appeals.filter((a) => a.isPublic && a.status === 'replied');

    if (params?.type && params.type !== 'all') {
      filtered = filtered.filter((a) => a.type === params.type);
    }
    if (params?.departmentId && params.departmentId !== 'all') {
      filtered = filtered.filter((a) => a.departmentId === params.departmentId);
    }
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(kw) || a.content.toLowerCase().includes(kw),
      );
    }

    if (params?.sort === 'popular') {
      filtered = [...filtered].sort((a, b) => (b.浏览量 ?? 0) - (a.浏览量 ?? 0));
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);

    return { data, total, page, pageSize };
  },

  async getAppeal(id: string) {
    await delay(200);
    return getDb().appeals.find((a) => a.id === id) || null;
  },

  /** 详情页浏览量 +1（写入本地业务库） */
  async incrementAppealView(id: string) {
    await delay(0);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (!appeal) return;
    appeal.浏览量 = (appeal.浏览量 ?? 0) + 1;
    saveDb();
  },

  /** 用户催办：通知承办部门处理员 */
  async nudgeAppeal(appealId: string, user: { id: string; nickname: string }) {
    await delay(250);
    const appeal = getDb().appeals.find((a) => a.id === appealId);
    if (!appeal || appeal.userId !== user.id) return { ok: false as const, message: '无权操作' };
    if (!['pending', 'accepted', 'processing', 'reply_draft'].includes(appeal.status)) {
      return { ok: false as const, message: '当前状态不可催办' };
    }
    const createTime = new Date().toLocaleString('zh-CN');
    for (const u of mockUsers) {
      if (u.role === 'handler' && u.departmentId === appeal.departmentId) {
        inboxPush({
          userId: u.id,
          type: 'system',
          title: `【催办】${appeal.title}`,
          read: false,
          createTime,
          appealId,
          href: '/admin/appeals',
        });
      }
    }
    pushFlow({
      appealId,
      action: 'urge',
      operatorId: user.id,
      operatorName: user.nickname,
      content: '用户发起催办',
    });
    saveDb();
    return { ok: true as const, message: '已通知承办部门' };
  },

  async getMyAppeals(userId: string) {
    await delay(300);
    return getDb().appeals.filter((a) => a.userId === userId);
  },

  /**
   * @param opts.skipSensitiveCheck 仅当调用方（如发起诉求页）已对用户可见内容做完同口径检测时设为 true，避免连续三次请求大模型/词库。
   */
  async createAppeal(
    data: Partial<import('./types').Appeal>,
    opts?: { skipSensitiveCheck?: boolean },
  ) {
    const combined = `${data.title ?? ''}\n${data.content ?? ''}`.trim();
    if (!opts?.skipSensitiveCheck) {
      await requireContentPassesSensitiveCheck(combined);
    }
    await delay(500);
    const appeals = getDb().appeals;
    const newAppeal = {
      id: 'appeal' + Date.now(),
      ...data,
      status: 'pending' as const,
      createTime: new Date().toLocaleString('zh-CN'),
      updateTime: new Date().toLocaleString('zh-CN'),
      浏览量: 0,
      响应时长: null,
      处理时长: null,
    } as (typeof appeals)[number];
    appeals.unshift(newAppeal);
    pushFlow({
      appealId: newAppeal.id,
      action: 'submit',
      operatorId: newAppeal.userId,
      operatorName: newAppeal.userName,
    });
    notifyNewAppealPending({
      id: newAppeal.id,
      title: newAppeal.title,
      departmentId: newAppeal.departmentId,
    });
    saveDb();
    return newAppeal;
  },

  async withdrawAppeal(id: string) {
    await delay(300);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (!appeal || appeal.status !== 'pending') return null;
    appeal.status = 'withdrawn';
    appeal.updateTime = new Date().toLocaleString('zh-CN');
    saveDb();
    return appeal;
  },

  async deleteAppeal(id: string) {
    await delay(300);
    const appeals = getDb().appeals;
    const index = appeals.findIndex((a) => a.id === id);
    if (index < 0) return false;
    const appeal = appeals[index];
    if (appeal.status !== 'pending' && appeal.status !== 'withdrawn') return false;
    appeals.splice(index, 1);
    saveDb();
    return true;
  },

  async evaluateAppeal(id: string, rating: number, comment?: string) {
    const c = comment?.trim() ?? '';
    if (c.length > 0) {
      await requireContentPassesSensitiveCheck(c);
    }
    await delay(300);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (appeal) {
      appeal.评价 = { rating, comment, time: new Date().toLocaleString('zh-CN') };
      appeal.updateTime = new Date().toLocaleString('zh-CN');
      saveDb();
    }
    return appeal;
  },

  async acceptAppeal(id: string, operator: AppealOperator) {
    await delay(250);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (!appeal || appeal.status !== 'pending') return null;
    appeal.status = 'accepted';
    appeal.updateTime = new Date().toLocaleString('zh-CN');
    if (appeal.响应时长 == null || appeal.响应时长 === 0) appeal.响应时长 = 0.1;
    pushFlow({
      appealId: id,
      action: 'accept',
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      content: '已受理',
    });
    notifyAppealUser(
      appeal.userId,
      'system',
      `您的诉求「${appeal.title}」已被受理`,
      id,
      `/user/appeal/detail/${id}`,
    );
    saveDb();
    return appeal;
  },

  async returnAppeal(id: string, reason: string, operator: AppealOperator) {
    await requireContentPassesSensitiveCheck(reason.trim());
    await delay(250);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (!appeal || appeal.status !== 'pending') return null;
    appeal.status = 'returned';
    appeal.updateTime = new Date().toLocaleString('zh-CN');
    pushFlow({
      appealId: id,
      action: 'return',
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      content: reason,
    });
    notifyAppealUser(
      appeal.userId,
      'appeal_return',
      `诉求「${appeal.title}」已被退回，请补充材料`,
      id,
      `/user/appeal/detail/${id}`,
    );
    saveDb();
    return appeal;
  },

  async transferAppeal(id: string, departmentId: string, operator: AppealOperator) {
    await delay(250);
    const appeal = getDb().appeals.find((a) => a.id === id);
    const dept = enrichDepartmentsFromAppeals(getDb().appeals).find((d) => d.id === departmentId);
    if (!appeal || !dept || !APPEAL_STATUSES_ALLOW_TRANSFER.includes(appeal.status)) return null;
    appeal.departmentId = dept.id;
    appeal.departmentName = dept.name;
    if (appeal.status === 'pending') {
      appeal.status = 'accepted';
    }
    appeal.updateTime = new Date().toLocaleString('zh-CN');
    pushFlow({
      appealId: id,
      action: 'transfer',
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      content: `转派至 ${dept.name}`,
    });
    notifyNewAppealPending({
      id: appeal.id,
      title: `[转派] ${appeal.title}`,
      departmentId: appeal.departmentId,
    });
    saveDb();
    return appeal;
  },

  /** 处理员提交答复草稿，进入待审核（用户端不可见正文直到通过） */
  async submitReplyForReview(id: string, content: string, isPublic: boolean, operator: AppealOperator) {
    await requireContentPassesSensitiveCheck(content.trim());
    await delay(350);
    const db = getDb();
    const appeal = db.appeals.find((a) => a.id === id);
    if (!appeal || (appeal.status !== 'accepted' && appeal.status !== 'processing')) return null;
    db.replies = db.replies.filter((r) => !(r.appealId === id && r.publishStatus === 'draft'));
    db.replies.push({
      id: `reply_${Date.now()}`,
      appealId: id,
      handlerId: operator.operatorId,
      handlerName: operator.operatorName,
      content,
      createTime: new Date().toLocaleString('zh-CN'),
      isPublic,
      publishStatus: 'draft',
    });
    appeal.status = 'reply_draft';
    appeal.updateTime = new Date().toLocaleString('zh-CN');
    pushFlow({
      appealId: id,
      action: 'reply_submit_review',
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      content: isPublic ? '待审（拟公开）' : '待审（拟非公开）',
    });
    notifyReplyAuditPending({ id: appeal.id, title: appeal.title });
    saveDb();
    return appeal;
  },

  async approveReply(appealId: string, auditor: AppealOperator) {
    await delay(280);
    const db = getDb();
    const appeal = db.appeals.find((a) => a.id === appealId);
    if (!appeal || appeal.status !== 'reply_draft') return null;
    const draft = [...db.replies].reverse().find((r) => r.appealId === appealId && r.publishStatus === 'draft');
    if (!draft) return null;
    draft.publishStatus = 'published';
    draft.auditedAt = new Date().toLocaleString('zh-CN');
    draft.auditorId = auditor.operatorId;
    draft.auditorName = auditor.operatorName;
    appeal.status = 'replied';
    appeal.updateTime = new Date().toLocaleString('zh-CN');
    if (appeal.处理时长 == null || appeal.处理时长 === 0) appeal.处理时长 = 2;
    pushFlow({
      appealId,
      action: 'reply_approve',
      operatorId: auditor.operatorId,
      operatorName: auditor.operatorName,
      content: '审核通过，已发布',
    });
    notifyAppealUser(
      appeal.userId,
      'appeal_reply',
      `诉求「${appeal.title}」已有新答复`,
      appealId,
      `/user/appeal/detail/${appealId}`,
    );
    saveDb();
    return appeal;
  },

  async rejectReply(appealId: string, reason: string, auditor: AppealOperator) {
    await delay(250);
    const db = getDb();
    const appeal = db.appeals.find((a) => a.id === appealId);
    if (!appeal || appeal.status !== 'reply_draft') return null;
    db.replies = db.replies.filter((r) => !(r.appealId === appealId && r.publishStatus === 'draft'));
    appeal.status = 'processing';
    appeal.updateTime = new Date().toLocaleString('zh-CN');
    pushFlow({
      appealId,
      action: 'reply_reject',
      operatorId: auditor.operatorId,
      operatorName: auditor.operatorName,
      content: reason,
    });
    const createTime = new Date().toLocaleString('zh-CN');
    for (const u of mockUsers) {
      if ((u.role === 'handler' || u.role === 'dept_leader') && u.departmentId === appeal.departmentId) {
        inboxPush({
          userId: u.id,
          type: 'system',
          title: `答复审核未通过，请修改：${appeal.title}`,
          read: false,
          createTime,
          appealId,
          href: '/admin/appeals',
        });
      }
    }
    saveDb();
    return appeal;
  },

  /** 办理人将重要诉求上报领导批示：记录原因/人/时，写入流程「上报」，并通知校办/超管/本部门领导待办（不新增 status，仍为 processing 等既有状态） */
  async reportToLeader(id: string, reason: string, operator: AppealOperator) {
    await requireContentPassesSensitiveCheck(reason.trim());
    await delay(250);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (!appeal) return null;
    const user = mockUsers.find((u) => u.id === operator.operatorId);
    if (!user || !canHandleAppeals(user.role)) return null;
    if (!REPORTABLE_APPEAL_STATUSES.includes(appeal.status)) return null;
    if (appeal.上报领导 && !appeal.领导批示) return null;
    const now = new Date().toLocaleString('zh-CN');
    appeal.上报领导 = true;
    appeal.领导上报 = {
      reason: reason.trim(),
      time: now,
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
    };
    appeal.updateTime = now;
    pushFlow({
      appealId: id,
      action: 'escalate',
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      content: reason.trim(),
    });
    const createTime = now;
    for (const u of mockUsers) {
      if (u.role === 'leader' || u.role === 'admin') {
        inboxPush({
          userId: u.id,
          type: 'system',
          title: `【待批示】${appeal.title}`,
          read: false,
          createTime,
          appealId: id,
          href: '/admin/leader-desk',
        });
      }
      if (u.role === 'dept_leader' && u.departmentId === appeal.departmentId) {
        inboxPush({
          userId: u.id,
          type: 'system',
          title: `【待批示】${appeal.title}`,
          read: false,
          createTime,
          appealId: id,
          href: '/admin/leader-desk',
        });
      }
    }
    saveDb();
    return appeal;
  },

  /** 领导对上报诉求填写批示；记录批示与人/时，流程「批示」，并通知承办部门办理人 */
  async submitLeaderInstruction(id: string, content: string, operator: AppealOperator) {
    await requireContentPassesSensitiveCheck(content.trim());
    await delay(250);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (!appeal || !appeal.上报领导 || appeal.领导批示) return null;
    const user = mockUsers.find((u) => u.id === operator.operatorId);
    if (!user || !canLeaderInstructAppeal(user.role, appeal.departmentId, user.departmentId)) return null;
    const now = new Date().toLocaleString('zh-CN');
    appeal.领导批示 = {
      content: content.trim(),
      time: now,
      leaderName: operator.operatorName,
      leaderId: operator.operatorId,
    };
    appeal.updateTime = now;
    pushFlow({
      appealId: id,
      action: 'instruct',
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      content: content.trim().slice(0, 500),
    });
    const createTime = now;
    for (const u of mockUsers) {
      if ((u.role === 'handler' || u.role === 'dept_leader') && u.departmentId === appeal.departmentId) {
        inboxPush({
          userId: u.id,
          type: 'system',
          title: `【领导批示】${appeal.title}`,
          read: false,
          createTime,
          appealId: id,
          href: '/admin/appeals',
        });
      }
    }
    saveDb();
    return appeal;
  },

  /** 办理人申请校办督办：提高督办等级并留下流程「校办关注」记录 */
  async requestSupervision(id: string, level: 'normal' | 'urgent', note: string, operator: AppealOperator) {
    await requireContentPassesSensitiveCheck(note.trim());
    await delay(220);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (!appeal) return null;
    const user = mockUsers.find((u) => u.id === operator.operatorId);
    if (!user || !canHandleAppeals(user.role)) return null;
    if (!REPORTABLE_APPEAL_STATUSES.includes(appeal.status)) return null;
    const now = new Date().toLocaleString('zh-CN');
    appeal.督办等级 = level;
    appeal.updateTime = now;
    pushFlow({
      appealId: id,
      action: 'report_leader',
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      content: `督办申请（${level === 'urgent' ? '紧急' : '一般'}）：${note.trim()}`,
    });
    const createTime = now;
    for (const u of mockUsers) {
      if (u.role === 'leader' || u.role === 'admin') {
        inboxPush({
          userId: u.id,
          type: 'system',
          title: `【待督办】${appeal.title}`,
          read: false,
          createTime,
          appealId: id,
          href: '/admin/leader-desk',
        });
      }
      if (u.role === 'dept_leader' && u.departmentId === appeal.departmentId) {
        inboxPush({
          userId: u.id,
          type: 'system',
          title: `【待督办】${appeal.title}`,
          read: false,
          createTime,
          appealId: id,
          href: '/admin/leader-desk',
        });
      }
    }
    saveDb();
    return appeal;
  },

  /** 领导办结督办：写入流程「督办」，并清除督办等级（诉求 status 不变） */
  async completeSupervision(id: string, note: string, operator: AppealOperator) {
    await requireContentPassesSensitiveCheck(note.trim());
    await delay(220);
    const appeal = getDb().appeals.find((a) => a.id === id);
    if (!appeal) return null;
    const user = mockUsers.find((u) => u.id === operator.operatorId);
    if (!user || !canSuperviseAppeals(user.role)) return null;
    if (user.role === 'dept_leader' && user.departmentId !== appeal.departmentId) return null;
    if (appeal.督办等级 !== 'normal' && appeal.督办等级 !== 'urgent') return null;
    if (hasFlowAction(id, 'supervise')) return null;
    const now = new Date().toLocaleString('zh-CN');
    appeal.督办等级 = 'none';
    appeal.updateTime = now;
    pushFlow({
      appealId: id,
      action: 'supervise',
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      content: note.trim(),
    });
    const createTime = now;
    for (const u of mockUsers) {
      if ((u.role === 'handler' || u.role === 'dept_leader') && u.departmentId === appeal.departmentId) {
        inboxPush({
          userId: u.id,
          type: 'system',
          title: `【督办已阅】${appeal.title}`,
          read: false,
          createTime,
          appealId: id,
          href: '/admin/appeals',
        });
      }
    }
    saveDb();
    return appeal;
  },

  /** 领导工作台列表（按页签过滤 + 关键字；status 仍用系统既有枚举） */
  async getLeaderDeskAppeals(
    params: {
      tab: 'pending_instruct' | 'done_instruct' | 'pending_supervise' | 'done_supervise' | 'all';
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
    viewer: User | null,
  ) {
    await delay(200);
    let filtered = filterLeaderDeskAppeals(getDb().appeals, viewer);
    if (params.keyword?.trim()) {
      const kw = params.keyword.trim().toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(kw) ||
          a.content.toLowerCase().includes(kw) ||
          a.id.toLowerCase().includes(kw),
      );
    }
    switch (params.tab) {
      case 'pending_instruct':
        filtered = filtered.filter((a) => Boolean(a.上报领导) && !a.领导批示);
        break;
      case 'done_instruct':
        filtered = filtered.filter((a) => Boolean(a.领导批示));
        break;
      case 'pending_supervise':
        filtered = filtered.filter(
          (a) => (a.督办等级 === 'normal' || a.督办等级 === 'urgent') && !hasFlowAction(a.id, 'supervise'),
        );
        break;
      case 'done_supervise':
        filtered = filtered.filter((a) => hasFlowAction(a.id, 'supervise'));
        break;
      default:
        break;
    }
    filtered.sort((a, b) => parseAppealDateTime(b.updateTime) - parseAppealDateTime(a.updateTime));
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);
    return { data, total, page, pageSize };
  },

  async getLeaderDeskTabCounts(viewer: User | null) {
    await delay(0);
    const base = filterLeaderDeskAppeals(getDb().appeals, viewer);
    return {
      pending_instruct: base.filter((a) => Boolean(a.上报领导) && !a.领导批示).length,
      done_instruct: base.filter((a) => Boolean(a.领导批示)).length,
      pending_supervise: base.filter(
        (a) => (a.督办等级 === 'normal' || a.督办等级 === 'urgent') && !hasFlowAction(a.id, 'supervise'),
      ).length,
      done_supervise: base.filter((a) => hasFlowAction(a.id, 'supervise')).length,
    };
  },
};

export const replyService = {
  async getReplies(appealId: string) {
    await delay(200);
    return getDb()
      .replies.filter((r) => r.appealId === appealId)
      .sort((a, b) => a.createTime.localeCompare(b.createTime));
  },

  /** 门户：诉求人仅见已发布答复；管理/本部门处理员/二级单位领导可见含草稿 */
  async getRepliesForViewer(appealId: string, viewer: User | null) {
    await delay(200);
    const appeal = getDb().appeals.find((a) => a.id === appealId);
    const list = getDb()
      .replies.filter((r) => r.appealId === appealId)
      .sort((a, b) => a.createTime.localeCompare(b.createTime));
    if (!viewer) {
      return list.filter((r) => r.publishStatus === 'published');
    }
    if (viewer.role === 'admin' || viewer.role === 'leader' || viewer.role === 'dept_leader') {
      return list;
    }
    if (
      viewer.role === 'handler' &&
      appeal &&
      viewer.departmentId &&
      viewer.departmentId === appeal.departmentId
    ) {
      return list;
    }
    if (appeal && viewer.id === appeal.userId) {
      return list.filter((r) => r.publishStatus === 'published');
    }
    return list.filter((r) => r.publishStatus === 'published');
  },
};

function mergeQuestionTypesWithCounts(): QuestionType[] {
  const db = getDb();
  const derived = deriveQuestionTypeCounts(db.appeals);
  const stored = db.questionTypes;
  if (!stored.length) return derived;
  return stored
    .map((t) => {
      const d = derived.find((x) => x.id === t.id || x.name === t.name);
      return { ...t, count: d?.count ?? t.count };
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export const questionTypeService = {
  async getQuestionTypes() {
    await delay(200);
    return mergeQuestionTypesWithCounts();
  },

  async replaceQuestionTypes(types: QuestionType[]) {
    await delay(100);
    getDb().questionTypes = types.map((t) => ({ ...t, count: t.count ?? 0 }));
    saveDb();
  },
};

export const noticeService = {
  async getNotices() {
    await delay(200);
    return [...getDb().notices].sort((a, b) => b.createTime.localeCompare(a.createTime));
  },

  async getNotice(id: string) {
    await delay(200);
    return getDb().notices.find((n) => n.id === id) || null;
  },

  async createNotice(payload: Omit<Notice, 'id' | 'createTime'> & { id?: string }) {
    await delay(150);
    const id = payload.id ?? `notice_${Date.now()}`;
    const n: Notice = {
      id,
      title: payload.title,
      content: payload.content,
      createTime: new Date().toLocaleString('zh-CN'),
      publisher: payload.publisher,
      attachments: payload.attachments,
    };
    getDb().notices.unshift(n);
    saveDb();
    return n;
  },

  async updateNotice(id: string, patch: Partial<Pick<Notice, 'title' | 'content' | 'publisher' | 'attachments'>>) {
    await delay(150);
    const n = getDb().notices.find((x) => x.id === id);
    if (!n) return null;
    Object.assign(n, patch);
    saveDb();
    return n;
  },

  async deleteNotice(id: string) {
    await delay(100);
    const db = getDb();
    const i = db.notices.findIndex((x) => x.id === id);
    if (i < 0) return false;
    db.notices.splice(i, 1);
    saveDb();
    return true;
  },
};

export const statisticsService = {
  async getStatistics() {
    await delay(300);
    return deriveStatistics();
  },

  async getHotTopics() {
    await delay(200);
    return deriveStatistics().热点词云.slice(0, 10);
  },

  /** 门户效能看板（公开已答复池） */
  async getPortalEfficiency() {
    await delay(220);
    return derivePortalEfficiency();
  },
};

export const notificationService = {
  async list(userId: string) {
    await delay(100);
    return getDb()
      .inbox.filter((i) => i.userId === userId)
      .sort((a, b) => b.createTime.localeCompare(a.createTime));
  },

  async unreadCount(userId: string) {
    await delay(0);
    return getDb().inbox.filter((i) => i.userId === userId && !i.read).length;
  },

  async markRead(id: string) {
    await delay(50);
    const item = getDb().inbox.find((i) => i.id === id);
    if (item) {
      item.read = true;
      saveDb();
    }
  },

  async markAllRead(userId: string) {
    await delay(50);
    for (const i of getDb().inbox) {
      if (i.userId === userId) i.read = true;
    }
    saveDb();
  },
};

function mergeMetadataBundle(input: MetadataTranslateInput, m: MetadataTranslateModelOut): MetadataI18nBundle {
  const departments: MetadataI18nBundle['departments'] = {};
  for (const d of input.departments) {
    const t = m.departments?.[d.id];
    departments[d.id] = {
      name: t?.name?.trim() || d.name,
      description: t?.description?.trim() || d.description,
    };
  }
  const questionTypes: MetadataI18nBundle['questionTypes'] = {};
  for (const t of input.questionTypes) {
    const tr = m.questionTypes?.[t.id];
    questionTypes[t.id] = { name: tr?.name?.trim() || t.name };
  }
  const notices: MetadataI18nBundle['notices'] = {};
  for (const n of input.notices) {
    const tr = m.notices?.[n.id];
    notices[n.id] = { title: tr?.title?.trim() || n.title };
  }
  const pb = input.portalBranding;
  const channelNames = m.portalBranding?.channelNames;
  const channels = pb.channels.map((c, i) => ({
    name: (channelNames?.[i] ?? '').trim() || c.name,
    channel: c.channel,
  }));
  const portalBranding = {
    loginWelcome: m.portalBranding?.loginWelcome?.trim() || pb.loginWelcome,
    loginSubtitle: m.portalBranding?.loginSubtitle?.trim() || pb.loginSubtitle,
    homeMotto: m.portalBranding?.homeMotto?.trim() || pb.homeMotto,
    channels,
  };
  const deptShowcase: MetadataI18nBundle['deptShowcase'] = {};
  for (const row of input.deptShowcase) {
    const tr = m.deptShowcase;
    const rowTr = tr?.[row.departmentId];
    const labels = rowTr?.shortcutLabels ?? [];
    deptShowcase[row.departmentId] = {
      heroTitle: rowTr?.heroTitle?.trim() || row.heroTitle,
      shortcuts: row.shortcuts.map((s, i) => ({
        href: s.href,
        label: labels[i]?.trim() || s.label,
      })),
    };
  }
  return { departments, questionTypes, notices, portalBranding, deptShowcase };
}

/** 元数据多语言：与 adminConfig、部门/类型/公告主数据 id 对齐 */
export const metadataI18nService = {
  async translateAndSave(target: MetadataLocaleCode) {
    await delay(0);
    const db = getDb();
    const cfg = db.adminConfig;
    const depts = enrichDepartmentsFromAppeals(db.appeals);
    const qTypes = mergeQuestionTypesWithCounts();
    const notices = [...db.notices].sort((a, b) => b.createTime.localeCompare(a.createTime)).slice(0, 16);
    const input: MetadataTranslateInput = {
      departments: depts.map((d) => ({ id: d.id, name: d.name, description: d.description })),
      questionTypes: qTypes.map((t) => ({ id: t.id, name: t.name })),
      notices: notices.map((n) => ({ id: n.id, title: n.title })),
      portalBranding: {
        loginWelcome: cfg.portalBranding.loginWelcome,
        loginSubtitle: cfg.portalBranding.loginSubtitle,
        homeMotto: cfg.portalBranding.homeMotto,
        channels: cfg.portalBranding.channels.map((c) => ({ name: c.name, channel: c.channel })),
      },
      deptShowcase: cfg.deptShowcaseExtras.map((e) => ({
        departmentId: e.departmentId,
        heroTitle: e.heroTitle,
        shortcuts: e.shortcuts.map((s) => ({ label: s.label, href: s.href })),
      })),
    };
    const raw = await aiService.translateMetadataBundle(input, target);
    const bundle = mergeMetadataBundle(input, raw);
    db.metadataI18n[target] = bundle;
    saveDb();
    return {
      target,
      counts: {
        departments: Object.keys(bundle.departments).length,
        questionTypes: Object.keys(bundle.questionTypes).length,
        notices: Object.keys(bundle.notices).length,
        deptShowcase: Object.keys(bundle.deptShowcase).length,
      },
    };
  },

  getBundle(target: MetadataLocaleCode): MetadataI18nBundle | null {
    return getDb().metadataI18n[target] ?? null;
  },
};

export { aiService } from './aiGlm';

export const flowService = {
  async getFlowRecords(appealId: string) {
    await delay(200);
    return getDb().flowRecords.filter((r) => r.appealId === appealId);
  },
};
