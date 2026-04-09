import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  message,
  Upload,
  Divider,
  Flex,
  Tag,
  Space,
  Select,
  Alert,
  Spin,
  Typography,
  InputNumber,
} from 'antd';
import { SaveOutlined, UploadOutlined, PlusOutlined, DeleteOutlined, TranslationOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from './AdminPageHeader';
import { adminConfigService, metadataI18nService, type MetadataLocaleCode } from '@/mock';
import { isGlmConfigured } from '@/lib/glmClient';
import type { SystemSettings } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';

export default function SettingsPage() {
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const operator = currentUser?.nickname ?? '管理员';

  const [form] = Form.useForm<SystemSettings>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sensitiveWords, setSensitiveWords] = useState<string[]>([]);
  const [wordInput, setWordInput] = useState('');

  const [metaTrTarget, setMetaTrTarget] = useState<MetadataLocaleCode>('en');
  const [metaTrLoading, setMetaTrLoading] = useState(false);
  const [metaTrSummary, setMetaTrSummary] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, lex] = await Promise.all([
        adminConfigService.getSystemSettings(),
        adminConfigService.getSensitiveLexicon(),
      ]);
      form.setFieldsValue(settings);
      setSensitiveWords(lex);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const on = () => {
      void reload();
    };
    window.addEventListener('jsjb-mock-updated', on);
    return () => window.removeEventListener('jsjb-mock-updated', on);
  }, [reload]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await adminConfigService.replaceSystemSettings(values, operator);
      await adminConfigService.replaceSensitiveLexicon(sensitiveWords, operator);
      message.success('设置已保存');
      await reload();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addWord = () => {
    const w = wordInput.trim();
    if (!w) return;
    if (sensitiveWords.includes(w)) {
      message.info('该词已存在');
      return;
    }
    setSensitiveWords([...sensitiveWords, w]);
    setWordInput('');
    message.success('已加入列表（请点击顶部「保存设置」写入演示库）');
  };

  const removeWord = (word: string) => {
    setSensitiveWords(sensitiveWords.filter((x) => x !== word));
  };

  const parseTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter(Boolean);
      const merged = [...new Set([...sensitiveWords, ...lines])];
      setSensitiveWords(merged);
      message.success(`已合并 ${lines.length} 行词项（请保存设置）`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const logoDataUrl = Form.useWatch(['basic', 'logoDataUrl'], form);

  return (
    <div className="settings-page min-h-full">
      <AdminPageHeader
        title="系统设置"
        subtitle="平台参数、时限与能力开关"
        extra={
          <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={loading} onClick={() => void handleSave()}>
            保存设置
          </Button>
        }
      />

      <main>
        <Spin spinning={loading}>
          <Form<SystemSettings> form={form} layout="vertical">
            <Tabs
              tabPosition="left"
              items={[
                {
                  key: 'basic',
                  label: '基础设置',
                  children: (
                    <Card
                      title="平台基础设置"
                      className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]"
                    >
                      <Form.Item name={['basic', 'platformName']} label="平台名称" rules={[{ required: true, message: '请填写平台名称' }]}>
                        <Input placeholder="请输入平台名称" />
                      </Form.Item>
                      <Form.Item name={['basic', 'schoolName']} label="学校名称" rules={[{ required: true, message: '请填写学校名称' }]}>
                        <Input placeholder="请输入学校名称" />
                      </Form.Item>
                      <Form.Item name={['basic', 'slogan']} label="平台标语">
                        <Input placeholder="请输入平台标语" />
                      </Form.Item>
                      <Form.Item name={['basic', 'logoDataUrl']} hidden>
                        <Input />
                      </Form.Item>
                      <Form.Item label="平台Logo">
                        <Space wrap align="start">
                          <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={(file) => {
                              if (file.size > 400_000) {
                                message.error('图片请小于 400KB');
                                return false;
                              }
                              const r = new FileReader();
                              r.onload = () => {
                                form.setFieldValue(['basic', 'logoDataUrl'], String(r.result ?? ''));
                              };
                              r.readAsDataURL(file);
                              return false;
                            }}
                          >
                            <Button icon={<UploadOutlined />}>上传Logo</Button>
                          </Upload>
                          {logoDataUrl ? (
                            <Button
                              onClick={() => {
                                form.setFieldValue(['basic', 'logoDataUrl'], '');
                              }}
                            >
                              清除
                            </Button>
                          ) : null}
                        </Space>
                        {logoDataUrl ? (
                          <div className="mt-3">
                            <img src={logoDataUrl} alt="" className="max-h-16 rounded border border-outline-variant/30 object-contain" />
                          </div>
                        ) : null}
                      </Form.Item>
                    </Card>
                  ),
                },
                {
                  key: 'timeout',
                  label: '超时设置',
                  children: (
                    <Card
                      title="超时与提醒（演示：数值持久化；业务超时逻辑可后续对接调度任务）"
                      className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]"
                    >
                      <Form.Item
                        name={['timeouts', 'urgeTimeoutHours']}
                        label="催办超时时间（小时）"
                        rules={[{ required: true, message: '请填写' }]}
                      >
                        <InputNumber min={1} max={720} className="w-full max-w-[200px]" />
                      </Form.Item>
                      <Form.Item
                        name={['timeouts', 'superviseTimeoutHours']}
                        label="督办超时时间（小时）"
                        rules={[{ required: true, message: '请填写' }]}
                      >
                        <InputNumber min={1} max={720} className="w-full max-w-[200px]" />
                      </Form.Item>
                      <Form.Item
                        name={['timeouts', 'autoCloseDays']}
                        label="自动关闭时间（天）"
                        rules={[{ required: true, message: '请填写' }]}
                      >
                        <InputNumber min={1} max={365} className="w-full max-w-[200px]" />
                      </Form.Item>
                      <Divider />
                      <Form.Item name={['timeouts', 'smsReminder']} label="启用短信提醒" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item name={['timeouts', 'emailReminder']} label="启用邮件提醒" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Card>
                  ),
                },
                {
                  key: 'sensitive',
                  label: '敏感词管理',
                  children: (
                    <Card
                      title="敏感词管理"
                      className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]"
                    >
                      <Typography.Paragraph type="secondary" className="!mb-4 text-sm">
                        列表在内存中编辑后，需点击顶部「保存设置」与系统配置一并写入本地演示库；提交诉求时会优先匹配此处词库。
                      </Typography.Paragraph>
                      <div className="sensitive-words">
                        <div className="add-word">
                          <Input
                            placeholder="输入敏感词"
                            value={wordInput}
                            onChange={(e) => setWordInput(e.target.value)}
                            onPressEnter={() => addWord()}
                            style={{ width: 220 }}
                          />
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => addWord()}>
                            添加
                          </Button>
                        </div>
                        <div className="word-chips-toolbar">
                          <Typography.Text type="secondary" className="!text-xs">
                            共 {sensitiveWords.length} 条 · 点击标签右侧关闭图标即可删除
                          </Typography.Text>
                        </div>
                        <div className="word-chips" role="list" aria-label="敏感词列表">
                          {sensitiveWords.length === 0 ? (
                            <Typography.Text type="secondary" className="word-chips-empty">
                              暂无敏感词，可单个添加或批量导入。
                            </Typography.Text>
                          ) : (
                            sensitiveWords.map((word) => (
                              <Tag
                                key={word}
                                color="red"
                                closable
                                closeIcon={<DeleteOutlined aria-hidden />}
                                onClose={(e) => {
                                  e.preventDefault();
                                  removeWord(word);
                                }}
                                className="sensitive-word-chip"
                                role="listitem"
                              >
                                {word}
                              </Tag>
                            ))
                          )}
                        </div>
                        <div className="import-section">
                          <Divider>批量导入</Divider>
                          <Upload
                            accept=".txt,.csv,.tsv,text/plain"
                            maxCount={1}
                            showUploadList={false}
                            beforeUpload={(file) => {
                              parseTextFile(file);
                              return false;
                            }}
                          >
                            <Button icon={<UploadOutlined />}>上传文本文件（每行一词）</Button>
                          </Upload>
                          <p className="tip">演示环境支持 UTF-8 文本：每行一个敏感词；复杂 Excel 请另存为 CSV 后上传。</p>
                        </div>
                      </div>
                    </Card>
                  ),
                },
                {
                  key: 'notice',
                  label: '通知公告',
                  children: (
                    <Card
                      title="通知公告设置"
                      className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]"
                    >
                      <Form.Item name={['notices', 'enabled']} label="启用公告功能" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item name={['notices', 'requireAudit']} label="公告需审核后展示（演示占位）" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Typography.Paragraph type="secondary" className="!text-xs">
                        「公告审核」当前仅持久化开关；发布流可在对接工作流后启用。
                      </Typography.Paragraph>
                      <Form.Item
                        name={['notices', 'pinTopCount']}
                        label="门户首页公告展示条数"
                        rules={[{ required: true, message: '请填写' }]}
                      >
                        <InputNumber min={1} max={50} className="w-full max-w-[200px]" />
                      </Form.Item>
                    </Card>
                  ),
                },
                {
                  key: 'ai',
                  label: 'AI设置',
                  children: (
                    <Card
                      title="AI智能设置"
                      className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]"
                    >
                      <Form.Item name={['ai', 'smartDispatch']} label="启用AI智能分派（部门/类型大模型推断）" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item name={['ai', 'smartRecommend']} label="启用AI智能推荐（判重、参考答复排序、智能问答等）" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item name={['ai', 'assistWrite']} label="启用AI帮写（拟答复、诉求草稿等）" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item name={['ai', 'translation']} label="启用AI翻译（表单双语、元数据一键翻译）" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item name={['ai', 'modelLabel']} label="AI模型标识（备注）">
                        <Input placeholder="如：qwen3.5-flash（仅作配置记录）" />
                      </Form.Item>
                      <Form.Item
                        name={['ai', 'dailyTokenBudget']}
                        label="每日Token限额（演示记录）"
                        rules={[{ required: true, message: '请填写' }]}
                      >
                        <InputNumber min={0} max={1_000_000_000} className="w-full max-w-[200px]" />
                      </Form.Item>
                    </Card>
                  ),
                },
                {
                  key: 'metadata-i18n',
                  label: '元数据翻译',
                  children: (
                    <Card
                      title="全局元数据多语言"
                      className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]"
                      extra={<TranslationOutlined className="text-primary" />}
                    >
                      <Space direction="vertical" size="middle" className="w-full">
                        <Alert
                          type="info"
                          showIcon
                          message="一键翻译并落库"
                          description="将当前中文主数据译为所选语言并写入本地演示库：受理部门名称与简介、问题类型、公告标题、门户品牌文案（登录页/首页校训等）、部门风采短标题与快捷入口标签。用户可在「个性化设置」中选择展示语言。重复执行会覆盖该语种已有译文。需同时开启上方「AI 翻译」。"
                        />
                        {!isGlmConfigured() ? (
                          <Alert type="warning" showIcon message="大模型未配置" description="请在本机 .env.local 中配置 VITE_GLM_API_KEY 后再使用翻译。" />
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm text-on-surface-variant">目标语言</span>
                          <Select<MetadataLocaleCode>
                            value={metaTrTarget}
                            onChange={setMetaTrTarget}
                            style={{ width: 160 }}
                            options={[
                              { value: 'en', label: 'English' },
                              { value: 'ja', label: '日本語' },
                            ]}
                          />
                          <Button
                            type="primary"
                            icon={<TranslationOutlined />}
                            loading={metaTrLoading}
                            disabled={!isGlmConfigured()}
                            onClick={async () => {
                              setMetaTrSummary(null);
                              setMetaTrLoading(true);
                              try {
                                const r = await metadataI18nService.translateAndSave(metaTrTarget);
                                setMetaTrSummary(
                                  `已完成 ${metaTrTarget === 'en' ? '英文' : '日文'}：部门 ${r.counts.departments}、类型 ${r.counts.questionTypes}、公告 ${r.counts.notices}、部门风采 ${r.counts.deptShowcase}。`,
                                );
                                message.success('元数据已翻译并保存');
                              } catch (e) {
                                message.error(e instanceof Error ? e.message : '翻译失败');
                              } finally {
                                setMetaTrLoading(false);
                              }
                            }}
                          >
                            一键翻译全局元数据
                          </Button>
                        </div>
                        {metaTrLoading ? (
                          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                            <Spin size="small" />
                            正在请求大模型并写入，请稍候…
                          </div>
                        ) : null}
                        {metaTrSummary ? <Alert type="success" showIcon message={metaTrSummary} /> : null}
                      </Space>
                    </Card>
                  ),
                },
                {
                  key: 'system',
                  label: '系统管理',
                  children: (
                    <Card
                      title="系统管理"
                      className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]"
                    >
                      <Typography.Paragraph className="text-on-surface-variant">
                        以下为演示环境已有管理入口的快捷跳转。数据均保存在本机 IndexedDB / localStorage。
                      </Typography.Paragraph>
                      <Flex vertical gap={0}>
                        {[
                          { name: '角色管理', desc: '业务角色与权限标签（stub）', path: '/admin/roles' as const },
                          { name: '菜单与审计', desc: '侧栏菜单说明与配置类操作审计', path: '/admin/system' as const },
                          { name: '公告管理', desc: '发布与维护门户公告', path: '/admin/notices-admin' as const },
                          { name: '调度任务', desc: '定时任务演示与手动触发', path: '/admin/scheduler' as const },
                        ].map((item) => (
                          <Flex key={item.name} align="flex-start" justify="space-between" gap={16} className="sys-mgmt-row">
                            <div>
                              <div className="font-semibold text-on-surface">{item.name}</div>
                              <div className="text-[13px] text-on-surface-variant">{item.desc}</div>
                            </div>
                            <Button type="primary" onClick={() => navigate(item.path)}>
                              前往
                            </Button>
                          </Flex>
                        ))}
                      </Flex>
                    </Card>
                  ),
                },
              ]}
            />
          </Form>
        </Spin>
      </main>

      <style>{`
        .sys-mgmt-row { padding: 16px 0; border-bottom: 1px solid rgb(var(--tw-color-outline-variant) / 0.45); }
        .sys-mgmt-row:last-child { border-bottom: none; }
        .settings-card { min-height: 480px; }
        .sensitive-words .add-word { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
        .sensitive-words .word-chips-toolbar { margin-bottom: 8px; }
        .sensitive-words .word-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 10px;
          align-items: center;
          align-content: flex-start;
          min-height: 48px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgb(var(--tw-color-outline-variant) / 0.4);
          background: rgb(var(--tw-color-surface-container-lowest) / 0.65);
        }
        .sensitive-words .word-chips-empty { display: block; width: 100%; text-align: center; padding: 8px 0; }
        .sensitive-words :global(.sensitive-word-chip) { margin: 0 !important; padding-inline: 10px 6px; line-height: 26px; }
        .sensitive-words :global(.sensitive-word-chip .ant-tag-close-icon) { margin-inline-start: 4px; }
        .sensitive-words .import-section { margin-top: 24px; }
        .sensitive-words .tip { color: rgb(var(--tw-color-on-surface-variant) / 1); font-size: 12px; margin-top: 8px; opacity: 0.92; }
        :global(.settings-page .ant-tabs-nav) { min-width: 150px; }
      `}</style>
    </div>
  );
}
