import { getDb, saveDb } from './persist';
import { mockLatency } from './mockLatency';
import type {
  AdminConfigBundle,
  AppealFormField,
  WorkflowNode,
  BusinessRoleRow,
  DeptShowcaseExtra,
  PortalBranding,
  SystemSettings,
  ScheduledJobRow,
  KbDocument,
  ChatbotProfile,
  UserRiskMark,
} from './adminConfigTypes';
import { mergePartialSystemSettings, seedSystemSettings } from './adminConfigSeed';

function ensureConfig(): AdminConfigBundle {
  const db = getDb();
  if (!db.adminConfig) throw new Error('adminConfig missing');
  return db.adminConfig;
}

/** 系统设置读取（供 notice/AI 等模块使用；未初始化前勿调用） */
export function readSystemSettings(): SystemSettings {
  const cfg = ensureConfig();
  const prev = cfg.systemSettings;
  const merged = mergePartialSystemSettings(prev ?? seedSystemSettings());
  cfg.systemSettings = merged;
  if (!prev || JSON.stringify(prev) !== JSON.stringify(merged)) {
    saveDb();
  }
  return merged;
}

function audit(operator: string, module: string, action: string, detail: string) {
  const cfg = ensureConfig();
  cfg.auditLogs.unshift({
    id: `log_${Date.now()}`,
    time: new Date().toLocaleString('zh-CN'),
    operator,
    module,
    action,
    detail,
  });
  if (cfg.auditLogs.length > 200) cfg.auditLogs.length = 200;
}

export const adminConfigService = {
  async getBundle(): Promise<AdminConfigBundle> {
    await mockLatency();
    return JSON.parse(JSON.stringify(ensureConfig())) as AdminConfigBundle;
  },

  async updatePortalBranding(patch: Partial<PortalBranding>, operator = '管理员') {
    await mockLatency();
    Object.assign(ensureConfig().portalBranding, patch);
    audit(operator, '界面配置', '更新门户文案', JSON.stringify(Object.keys(patch)));
    saveDb();
    return ensureConfig().portalBranding;
  },

  async replaceFormFields(fields: AppealFormField[], operator = '管理员') {
    await mockLatency();
    ensureConfig().formFields = fields.map((f, i) => ({ ...f, order: f.order ?? i + 1 }));
    audit(operator, '填报字段', '全量保存', `${fields.length} 项`);
    saveDb();
  },

  async replaceWorkflowNodes(nodes: WorkflowNode[], operator = '管理员') {
    await mockLatency();
    ensureConfig().workflowNodes = nodes;
    audit(operator, '业务流程', '保存节点', `${nodes.length} 个节点`);
    saveDb();
  },

  async upsertBusinessRole(row: BusinessRoleRow, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().businessRoles;
    const i = list.findIndex((x) => x.id === row.id);
    if (i >= 0) list[i] = row;
    else list.push(row);
    audit(operator, '业务角色', i >= 0 ? '更新' : '新增', row.name);
    saveDb();
    return row;
  },

  async deleteBusinessRole(id: string, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().businessRoles;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return false;
    list.splice(i, 1);
    audit(operator, '业务角色', '删除', id);
    saveDb();
    return true;
  },

  async upsertDeptShowcase(row: DeptShowcaseExtra, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().deptShowcaseExtras;
    const i = list.findIndex((x) => x.departmentId === row.departmentId);
    if (i >= 0) list[i] = row;
    else list.push(row);
    audit(operator, '部门风采', i >= 0 ? '更新' : '新增', row.heroTitle);
    saveDb();
    return row;
  },

  async deleteDeptShowcase(departmentId: string, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().deptShowcaseExtras;
    const i = list.findIndex((x) => x.departmentId === departmentId);
    if (i < 0) return false;
    list.splice(i, 1);
    audit(operator, '部门风采', '删除', departmentId);
    saveDb();
    return true;
  },

  async updateScheduledJob(id: string, patch: Partial<ScheduledJobRow>, operator = '管理员') {
    await mockLatency();
    const row = ensureConfig().scheduledJobs.find((j) => j.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    audit(operator, '调度任务', '更新', `${row.name} ${JSON.stringify(patch)}`);
    saveDb();
    return row;
  },

  async runScheduledJobDemo(id: string, operator = '管理员') {
    await mockLatency();
    const row = ensureConfig().scheduledJobs.find((j) => j.id === id);
    if (!row) return null;
    row.lastRun = new Date().toLocaleString('zh-CN');
    row.status = Math.random() > 0.1 ? 'success' : 'failed';
    audit(operator, '调度任务', '手动触发', row.name);
    saveDb();
    return row;
  },

  async upsertKbDocument(doc: KbDocument, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().kbDocuments;
    const i = list.findIndex((x) => x.id === doc.id);
    if (i >= 0) list[i] = doc;
    else list.unshift(doc);
    audit(operator, '知识库', i >= 0 ? '更新' : '新增', doc.title);
    saveDb();
    return doc;
  },

  async deleteKbDocument(id: string, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().kbDocuments;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return false;
    list.splice(i, 1);
    audit(operator, '知识库', '删除', id);
    saveDb();
    return true;
  },

  async upsertChatbotProfile(row: ChatbotProfile, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().chatbotProfiles;
    const i = list.findIndex((x) => x.id === row.id);
    if (i >= 0) list[i] = row;
    else list.push(row);
    audit(operator, '机器人', i >= 0 ? '更新' : '新增', row.name);
    saveDb();
    return row;
  },

  async deleteChatbotProfile(id: string, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().chatbotProfiles;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return false;
    list.splice(i, 1);
    audit(operator, '机器人', '删除', id);
    saveDb();
    return true;
  },

  async upsertUserRiskMark(row: UserRiskMark, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().userRiskMarks;
    const i = list.findIndex((x) => x.userId === row.userId);
    row.updatedAt = new Date().toLocaleDateString('zh-CN');
    if (i >= 0) list[i] = row;
    else list.push(row);
    audit(operator, '异常用户', i >= 0 ? '更新' : '标记', row.displayName);
    saveDb();
    return row;
  },

  async deleteUserRiskMark(userId: string, operator = '管理员') {
    await mockLatency();
    const list = ensureConfig().userRiskMarks;
    const i = list.findIndex((x) => x.userId === userId);
    if (i < 0) return false;
    list.splice(i, 1);
    audit(operator, '异常用户', '解除标记', userId);
    saveDb();
    return true;
  },

  /** 用户端读取门户展示文案（无需登录） */
  async getPortalBrandingPublic(): Promise<PortalBranding> {
    await mockLatency();
    return { ...ensureConfig().portalBranding };
  },

  async getSystemSettings(): Promise<SystemSettings> {
    await mockLatency();
    return JSON.parse(JSON.stringify(readSystemSettings())) as SystemSettings;
  },

  async replaceSystemSettings(next: SystemSettings, operator = '管理员') {
    await mockLatency();
    ensureConfig().systemSettings = JSON.parse(JSON.stringify(next)) as SystemSettings;
    audit(operator, '系统设置', '保存配置', 'systemSettings');
    saveDb();
    return readSystemSettings();
  },

  /** 门户展示：平台名 / 学校名 / 标语 / Logo（无需登录） */
  async getPlatformIdentityPublic(): Promise<SystemSettings['basic']> {
    await mockLatency();
    const b = readSystemSettings().basic;
    return { ...b };
  },

  async getSensitiveLexicon(): Promise<string[]> {
    await mockLatency();
    return [...getDb().sensitiveLexicon];
  },

  async replaceSensitiveLexicon(words: string[], operator = '管理员') {
    await mockLatency();
    const next = [...new Set(words.map((w) => w.trim()).filter(Boolean))];
    getDb().sensitiveLexicon = next;
    audit(operator, '系统设置', '敏感词库', `${next.length} 条`);
    saveDb();
  },
};
