export type {
  PortalRegisteredAccount,
  User,
  Department,
  Appeal,
  Reply,
  ReplyPublishStatus,
  QuestionType,
  Notice,
  Statistics,
  PortalEfficiency,
  WeeklyReportSnapshot,
  AIRecommend,
  FlowRecord,
  InboxItem,
} from './types';
export {
  mockUsers,
  mockDepartments,
  departmentTemplates,
  mockQuestionTypes,
  questionTypeDefinitions,
  mockNotices,
  mockAIRecommendations,
  sensitiveWords,
  enrichDepartmentsFromAppeals,
  deriveQuestionTypeCounts,
} from './data';
export {
  getDb,
  saveDb,
  invalidateMockDb,
  resetMockDb,
  initMockDb,
  attachMockDbBroadcast,
  reloadMockDbFromPeer,
  flushMockDbNow,
} from './persist';
export * from './services';
export type { MetadataI18nBundle, MetadataLocaleCode, MetadataI18nStore } from './metadataI18nTypes';
export * from './adminConfigService';
export * from './roles';
