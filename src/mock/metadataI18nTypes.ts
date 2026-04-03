/** 写入 MockDB 的某一目标语种下的元数据译文（与中文主数据 id 对齐） */

export type MetadataLocaleCode = 'en' | 'ja';

export interface MetadataI18nChannelsItem {
  name: string;
  /** 渠道类型说明，可与原文相同 */
  channel: string;
}

/** 管理端「一键翻译」写入、用户端按需读取 */
export interface MetadataI18nBundle {
  departments: Record<string, { name: string; description: string }>;
  questionTypes: Record<string, { name: string }>;
  notices: Record<string, { title: string }>;
  portalBranding: {
    loginWelcome: string;
    loginSubtitle: string;
    homeMotto: string;
    channels: MetadataI18nChannelsItem[];
  };
  /** departmentId → 部门风采文案 */
  deptShowcase: Record<string, { heroTitle: string; shortcuts: { label: string; href: string }[] }>;
}

export type MetadataI18nStore = Partial<Record<MetadataLocaleCode, MetadataI18nBundle>>;

/** 提交给模型的输入（扁平、可 JSON 序列化） */
export interface MetadataTranslateInput {
  departments: { id: string; name: string; description: string }[];
  questionTypes: { id: string; name: string }[];
  notices: { id: string; title: string }[];
  portalBranding: {
    loginWelcome: string;
    loginSubtitle: string;
    homeMotto: string;
    channels: MetadataI18nChannelsItem[];
  };
  deptShowcase: { departmentId: string; heroTitle: string; shortcuts: { label: string; href: string }[] }[];
}

/** 模型返回（channelNames / shortcutLabels 与同序输入对齐） */
export interface MetadataTranslateModelOut {
  departments: Record<string, { name: string; description: string }>;
  questionTypes: Record<string, { name: string }>;
  notices: Record<string, { title: string }>;
  portalBranding: {
    loginWelcome: string;
    loginSubtitle: string;
    homeMotto: string;
    channelNames: string[];
  };
  deptShowcase: Record<string, { heroTitle: string; shortcutLabels: string[] }>;
}
