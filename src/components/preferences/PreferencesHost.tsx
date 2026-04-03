import { Modal, Form, Radio, Space, Button, Divider, Typography } from 'antd';
import {
  usePreferencesStore,
  THEME_PRESET_HEX,
  type LayoutDensity,
  type MetadataDisplayLocale,
  type PageTransition,
  type ThemeMode,
  type ThemePreset,
} from '@/store/preferencesStore';

const { Text } = Typography;

const presetLabels: Record<ThemePreset, string> = {
  civic: '政务蓝',
  ocean: '海洋青',
  forest: '森绿',
  violet: '暮紫',
};

export default function PreferencesHost() {
  const open = usePreferencesStore((s) => s.preferencesOpen);
  const close = usePreferencesStore((s) => s.closePreferences);
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const layoutDensity = usePreferencesStore((s) => s.layoutDensity);
  const pageTransition = usePreferencesStore((s) => s.pageTransition);
  const metadataDisplayLocale = usePreferencesStore((s) => s.metadataDisplayLocale);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);
  const setLayoutDensity = usePreferencesStore((s) => s.setLayoutDensity);
  const setPageTransition = usePreferencesStore((s) => s.setPageTransition);
  const setMetadataDisplayLocale = usePreferencesStore((s) => s.setMetadataDisplayLocale);

  return (
    <Modal
      title="个性化设置"
      open={open}
      onCancel={close}
      rootClassName="jsjb-preferences-modal"
      footer={[
        <Button key="ok" type="primary" onClick={close}>
          完成
        </Button>,
      ]}
      width={520}
      destroyOnHidden={false}
      styles={{ body: { paddingTop: 8 } }}
    >
      <Text type="secondary" className="mb-4 block text-sm">
        外观与偏好将保存在当前浏览器，用户端、移动端与管理端共用同一终端时同步生效。
      </Text>

      <Form layout="vertical" requiredMark={false} className="mt-2">
        <Form.Item label="布局疏密">
          <Radio.Group
            value={layoutDensity}
            onChange={(e) => setLayoutDensity(e.target.value as LayoutDensity)}
          >
            <Radio.Button value="compact">紧凑</Radio.Button>
            <Radio.Button value="comfortable">标准</Radio.Button>
            <Radio.Button value="spacious">宽松</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="主题色">
          <Space wrap size="middle">
            {(Object.keys(THEME_PRESET_HEX) as ThemePreset[]).map((key) => (
              <button
                key={key}
                type="button"
                title={presetLabels[key]}
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-sm transition ring-offset-2 ring-offset-surface ${
                  themePreset === key ? 'border-outline-variant ring-2 ring-primary' : 'border-outline-variant'
                }`}
                style={{ backgroundColor: THEME_PRESET_HEX[key] }}
                onClick={() => setThemePreset(key)}
              >
                <span className="sr-only">{presetLabels[key]}</span>
              </button>
            ))}
          </Space>
        </Form.Item>

        <Form.Item label="外观">
          <Radio.Group
            value={themeMode}
            onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
          >
            <Radio.Button value="light">亮色</Radio.Button>
            <Radio.Button value="dark">暗色</Radio.Button>
            <Radio.Button value="system">跟随系统</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Divider className="my-3" />

        <Form.Item label="门户元数据语言">
          <Text type="secondary" className="mb-2 block text-xs">
            切换部门名、问题类型、公告标题及登录页问候等展示语言。英文/日文需管理员在「系统设置 → 元数据翻译」中一键生成后生效。
          </Text>
          <Radio.Group
            value={metadataDisplayLocale}
            onChange={(e) => setMetadataDisplayLocale(e.target.value as MetadataDisplayLocale)}
          >
            <Radio.Button value="zh">中文</Radio.Button>
            <Radio.Button value="en">English</Radio.Button>
            <Radio.Button value="ja">日本語</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Divider className="my-3" />

        <Form.Item label="页面切换动效">
          <Radio.Group
            value={pageTransition}
            onChange={(e) => setPageTransition(e.target.value as PageTransition)}
          >
            <Radio.Button value="fade">淡入</Radio.Button>
            <Radio.Button value="slide">上滑显现</Radio.Button>
            <Radio.Button value="none">关闭</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
