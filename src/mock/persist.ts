import type {
  Appeal,
  DepartmentCatalogEntry,
  FlowRecord,
  InboxItem,
  Notice,
  QuestionType,
  Reply,
  PortalRegisteredAccount,
  WeeklyReportSnapshot,
} from './types';
import type { MetadataI18nStore } from './metadataI18nTypes';
import { mockNotices, departmentTemplates, deriveQuestionTypeCounts, sensitiveWords } from './data';
import { mergePartialSystemSettings, seedAdminConfigDefaults, seedSystemSettings } from './adminConfigSeed';
import type { AdminConfigBundle } from './adminConfigTypes';
import { idbDelete, idbGet, idbSet } from '@/lib/idbKv';
import { enrichMockData } from './dataEnhancer';

/** 旧版 localStorage 键，首次启动会迁移至 IndexedDB */
const LEGACY_LS_KEY = 'jsjb_demo_mock_db';
/** IndexedDB 中存储的键 */
const IDB_KEY = 'jsjb_demo_mock_db_v2';
/** 数据版本号 - 当数据结构变化时递增，触发重新生成 */
const DATA_VERSION = 2;

const BROADCAST_NAME = 'jsjb-mock-db';

export type MockDb = {
  /** 数据版本号 */
  _version?: number;
  /** 部门主数据（静态字段）；统计由诉求派生 */
  departments: DepartmentCatalogEntry[];
  appeals: Appeal[];
  replies: Reply[];
  flowRecords: FlowRecord[];
  inbox: InboxItem[];
  notices: Notice[];
  questionTypes: QuestionType[];
  /** 敏感词库（管理端可维护，与 data 初始集合同步） */
  sensitiveLexicon: string[];
  adminConfig: AdminConfigBundle;
  /** 门户用户自助注册（可凭用户名+密码再次登录） */
  portalAccounts: PortalRegisteredAccount[];
  /** 全局元数据多语言（部门、类型、公告标题、门户文案等），由管理端一键生成 */
  metadataI18n: MetadataI18nStore;
  /** 已生成的管理周报（演示环境持久化） */
  weeklyReports?: WeeklyReportSnapshot[];
};

let cache: MockDb | null = null;
let initPromise: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let bc: BroadcastChannel | null = null;

const FLUSH_DEBOUNCE_MS = 100;

function cloneSeed(): MockDb {
  const enriched = enrichMockData();
  return {
    _version: DATA_VERSION,
    departments: JSON.parse(JSON.stringify(departmentTemplates)) as DepartmentCatalogEntry[],
    appeals: enriched.appeals,
    replies: enriched.replies,
    flowRecords: enriched.flowRecords,
    notices: enriched.notices,
    questionTypes: deriveQuestionTypeCounts(enriched.appeals),
    sensitiveLexicon: [...sensitiveWords],
    adminConfig: seedAdminConfigDefaults(),
    portalAccounts: [],
    metadataI18n: {},
    weeklyReports: [],
    inbox: [
      {
        id: 'seed_inbox_welcome',
        userId: '1',
        type: 'system',
        title: '欢迎使用接诉即办（消息与进度已同步至当前设备）',
        read: false,
        createTime: new Date().toLocaleString('zh-CN'),
        href: '/user/home',
      },
      {
        id: 'seed_handler_pending',
        userId: '4',
        type: 'appeal_pending',
        title: '新诉求待处理：博雅楼电梯多次关人求助',
        read: false,
        createTime: '2026-04-01 07:35:00',
        appealId: 'appeal006',
        href: '/admin/appeals',
      },
    ],
  };
}

function normalize(db: MockDb): MockDb {
  if (!db.departments) {
    db.departments = JSON.parse(JSON.stringify(departmentTemplates)) as DepartmentCatalogEntry[];
  }
  if (!db.inbox) db.inbox = [];
  if (!db.notices?.length) {
    db.notices = JSON.parse(JSON.stringify(mockNotices));
  }
  if (!db.questionTypes?.length) {
    db.questionTypes = JSON.parse(JSON.stringify(deriveQuestionTypeCounts(db.appeals))) as QuestionType[];
  }
  if (!db.sensitiveLexicon) db.sensitiveLexicon = [];
  const lexSet = new Set(db.sensitiveLexicon);
  for (const w of sensitiveWords) {
    if (!lexSet.has(w)) {
      db.sensitiveLexicon.push(w);
      lexSet.add(w);
    }
  }
  if (!db.adminConfig) {
    db.adminConfig = seedAdminConfigDefaults();
  }
  if (!db.adminConfig.systemSettings) {
    db.adminConfig.systemSettings = seedSystemSettings();
  } else {
    db.adminConfig.systemSettings = mergePartialSystemSettings(db.adminConfig.systemSettings);
  }
  if (!db.portalAccounts) {
    db.portalAccounts = [];
  }
  if (!db.metadataI18n) {
    db.metadataI18n = {};
  }
  if (!db.weeklyReports) {
    db.weeklyReports = [];
  }
  for (const r of db.replies) {
    if (!r.publishStatus) (r as Reply).publishStatus = 'published';
  }
  return db;
}

async function writeThrough(data: MockDb): Promise<void> {
  try {
    await idbSet(IDB_KEY, data);
    try {
      localStorage.removeItem(LEGACY_LS_KEY);
    } catch {
      /* ignore */
    }
  } catch {
    try {
      localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(data));
    } catch {
      /* memory-only */
    }
  }
}

function broadcastFlush(): void {
  try {
    bc?.postMessage({ t: 'flush' });
  } catch {
    /* ignore */
  }
}

/**
 * 应用启动时必须先 await，将数据载入内存；之后 getDb() 同步可读。
 */
export function initMockDb(): Promise<void> {
  if (cache) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const legacy = localStorage.getItem(LEGACY_LS_KEY);
      if (legacy) {
        const legacyData = JSON.parse(legacy) as MockDb;
        if (legacyData._version !== DATA_VERSION) {
          cache = cloneSeed();
        } else {
          cache = normalize(legacyData);
        }
        await writeThrough(cache);
        localStorage.removeItem(LEGACY_LS_KEY);
        return;
      }

      const fromIdb = await idbGet<MockDb>(IDB_KEY);
      if (fromIdb) {
        if (fromIdb._version !== DATA_VERSION) {
          cache = cloneSeed();
          await writeThrough(cache);
        } else {
          cache = normalize(fromIdb);
        }
        return;
      }

      cache = cloneSeed();
      await writeThrough(cache);
    } catch {
      cache = cloneSeed();
      try {
        await writeThrough(cache);
      } catch {
        /* memory-only */
      }
    }
  })().finally(() => {
    initPromise = null;
  });

  return initPromise;
}

/** 与 attachMockDbBroadcast 配套：防抖落库完成后通知其它标签页 */
function scheduleFlush(): void {
  if (!cache) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const snap = cache;
    if (!snap) return;
    void writeThrough(snap).then(() => broadcastFlush());
  }, FLUSH_DEBOUNCE_MS);
}

/** 切后台或关页前立即落盘，减少防抖未写入的丢失窗口 */
export function flushMockDbNow(): void {
  if (!cache) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  void writeThrough(cache).then(() => broadcastFlush());
}

/**
 * 创建 BroadcastChannel 并监听其它标签页的写入；应在 App 挂载时调用一次。
 */
export function attachMockDbBroadcast(): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  try {
    bc = new BroadcastChannel(BROADCAST_NAME);
    const handler = () => {
      void reloadMockDbFromPeer();
    };
    bc.addEventListener('message', handler);
    return () => {
      bc?.removeEventListener('message', handler);
      bc?.close();
      bc = null;
    };
  } catch {
    return () => {};
  }
}

export function getDb(): MockDb {
  if (!cache) {
    throw new Error('[persist] getDb() called before initMockDb() completed');
  }
  return cache;
}

/** 立即派发 UI 更新；持久化防抖写入，减少 IO */
export function saveDb(): void {
  if (!cache) return;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jsjb-mock-updated'));
  }
  scheduleFlush();
}

export async function reloadMockDbFromPeer(): Promise<void> {
  try {
    const data = await idbGet<MockDb>(IDB_KEY);
    if (data) {
      cache = normalize(data);
      window.dispatchEvent(new CustomEvent('jsjb-mock-updated'));
      return;
    }
  } catch {
    /* fall through */
  }
  const legacy = localStorage.getItem(LEGACY_LS_KEY);
  if (legacy) {
    try {
      cache = normalize(JSON.parse(legacy) as MockDb);
      window.dispatchEvent(new CustomEvent('jsjb-mock-updated'));
    } catch {
      /* ignore */
    }
  }
}

export function invalidateMockDb(): void {
  void reloadMockDbFromPeer();
}

export async function resetMockDb(): Promise<void> {
  try {
    await idbDelete(IDB_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch {
    /* ignore */
  }
  cache = cloneSeed();
  await writeThrough(cache);
  window.dispatchEvent(new CustomEvent('jsjb-mock-updated'));
  broadcastFlush();
}
