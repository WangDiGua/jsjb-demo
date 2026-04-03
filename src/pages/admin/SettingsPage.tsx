import { useState } from 'react';
import { Card, Tabs, Form, Input, Button, Switch, message, Upload, Divider, Flex, Tag, Space, Select, Alert, Spin } from 'antd';
import { SaveOutlined, UploadOutlined, PlusOutlined, DeleteOutlined, TranslationOutlined } from '@ant-design/icons';
import AdminPageHeader from './AdminPageHeader';
import { metadataI18nService, type MetadataLocaleCode } from '@/mock';
import { isGlmConfigured } from '@/lib/glmClient';

const sensitiveWordsList = ['敏感词1', '敏感词2', '投诉', '举报'];

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [sensitiveWords, setSensitiveWords] = useState(sensitiveWordsList);
  const [metaTrTarget, setMetaTrTarget] = useState<MetadataLocaleCode>('en');
  const [metaTrLoading, setMetaTrLoading] = useState(false);
  const [metaTrSummary, setMetaTrSummary] = useState<string | null>(null);

  const handleSave = () => {
    message.success('保存成功');
  };

  const handleAddWord = (word: string) => {
    if (word && !sensitiveWords.includes(word)) {
      setSensitiveWords([...sensitiveWords, word]);
      message.success('添加成功');
    }
  };

  const handleDeleteWord = (word: string) => {
    setSensitiveWords(sensitiveWords.filter(w => w !== word));
    message.success('删除成功');
  };

  return (
    <div className="settings-page min-h-full">
      <AdminPageHeader
        title="系统设置"
        subtitle="平台参数、时限与能力开关"
        extra={
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存设置
          </Button>
        }
      />

      <main>
        <Tabs
          tabPosition="left"
          items={[
            {
              key: 'basic',
              label: '基础设置',
              children: (
                <Card title="平台基础设置" className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
                  <Form form={form} layout="vertical" initialValues={{ platformName: '即诉即办平台', schoolName: '×××大学', slogan: '便捷高效，诉求直达' }}>
                    <Form.Item name="platformName" label="平台名称">
                      <Input placeholder="请输入平台名称" />
                    </Form.Item>
                    <Form.Item name="schoolName" label="学校名称">
                      <Input placeholder="请输入学校名称" />
                    </Form.Item>
                    <Form.Item name="slogan" label="平台标语">
                      <Input placeholder="请输入平台标语" />
                    </Form.Item>
                    <Form.Item name="logo" label="平台Logo">
                      <Upload name="logo" listType="picture" maxCount={1}>
                        <Button icon={<UploadOutlined />}>上传Logo</Button>
                      </Upload>
                    </Form.Item>
                  </Form>
                </Card>
              ),
            },
            {
              key: 'timeout',
              label: '超时设置',
              children: (
                <Card title="超时管理设置" className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
                  <Form layout="vertical">
                    <Form.Item label="催办超时时间（小时）">
                      <Input type="number" defaultValue={24} style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item label="督办超时时间（小时）">
                      <Input type="number" defaultValue={48} style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item label="自动关闭时间（天）">
                      <Input type="number" defaultValue={7} style={{ width: 200 }} />
                    </Form.Item>
                    <Divider />
                    <Form.Item label="启用短信提醒">
                      <Switch defaultChecked />
                    </Form.Item>
                    <Form.Item label="启用邮件提醒">
                      <Switch defaultChecked />
                    </Form.Item>
                  </Form>
                </Card>
              ),
            },
            {
              key: 'sensitive',
              label: '敏感词管理',
              children: (
                <Card title="敏感词管理" className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
                  <div className="sensitive-words">
                    <div className="add-word">
                      <Input placeholder="输入敏感词" id="addWordInput" style={{ width: 200 }} />
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        const input = document.getElementById('addWordInput') as HTMLInputElement;
                        if (input) handleAddWord(input.value);
                      }}>添加</Button>
                    </div>
                    <Flex vertical gap={0} className="word-rows">
                      {sensitiveWords.map((word) => (
                        <Flex key={word} align="center" justify="space-between" className="word-row">
                          <Tag color="red">{word}</Tag>
                          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteWord(word)}>删除</Button>
                        </Flex>
                      ))}
                    </Flex>
                    <div className="import-section">
                      <Divider>批量导入</Divider>
                      <Upload name="file" maxCount={1} beforeUpload={() => false}>
                        <Button icon={<UploadOutlined />}>上传Excel文件</Button>
                      </Upload>
                      <p className="tip">支持xlsx格式，每行一个敏感词</p>
                    </div>
                  </div>
                </Card>
              ),
            },
            {
              key: 'notice',
              label: '通知公告',
              children: (
                <Card title="通知公告设置" className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
                  <Form layout="vertical">
                    <Form.Item label="启用公告功能">
                      <Switch defaultChecked />
                    </Form.Item>
                    <Form.Item label="公告审核">
                      <Switch />
                    </Form.Item>
                    <Form.Item label="公告置顶数量">
                      <Input type="number" defaultValue={3} style={{ width: 200 }} />
                    </Form.Item>
                  </Form>
                </Card>
              ),
            },
            {
              key: 'ai',
              label: 'AI设置',
              children: (
                <Card title="AI智能设置" className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
                  <Form layout="vertical">
                    <Form.Item label="启用AI智能分派">
                      <Switch defaultChecked />
                    </Form.Item>
                    <Form.Item label="启用AI智能推荐">
                      <Switch defaultChecked />
                    </Form.Item>
                    <Form.Item label="启用AI帮写">
                      <Switch defaultChecked />
                    </Form.Item>
                    <Form.Item label="启用AI翻译">
                      <Switch />
                    </Form.Item>
                    <Form.Item label="AI模型选择">
                      <Input placeholder="如：gpt-4, claude-3" />
                    </Form.Item>
                    <Form.Item label="每日Token限额">
                      <Input type="number" defaultValue={10000} style={{ width: 200 }} />
                    </Form.Item>
                  </Form>
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
                      description="将当前中文主数据译为所选语言并写入本地演示库：受理部门名称与简介、问题类型、公告标题、门户品牌文案（登录页/首页校训等）、部门风采短标题与快捷入口标签。用户可在「个性化设置」中选择展示语言。重复执行会覆盖该语种已有译文。"
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
                <Card title="系统管理" className="settings-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
                  <Flex vertical gap={0}>
                    {[
                      { name: '角色管理', desc: '管理系统用户角色和权限' },
                      { name: '菜单管理', desc: '配置系统菜单结构' },
                      { name: '操作日志', desc: '查看用户操作记录' },
                      { name: '数据备份', desc: '系统数据备份与恢复' },
                    ].map((item) => (
                      <Flex key={item.name} align="flex-start" justify="space-between" gap={16} className="sys-mgmt-row">
                        <div>
                          <div className="font-semibold text-on-surface">{item.name}</div>
                          <div className="text-[13px] text-on-surface-variant">{item.desc}</div>
                        </div>
                        <Button>配置</Button>
                      </Flex>
                    ))}
                  </Flex>
                </Card>
              ),
            },
          ]}
        />
      </main>

      <style>{`
        .word-row { padding: 12px 0; border-bottom: 1px solid rgb(var(--tw-color-outline-variant) / 0.45); }
        .word-row:last-child { border-bottom: none; }
        .sys-mgmt-row { padding: 16px 0; border-bottom: 1px solid rgb(var(--tw-color-outline-variant) / 0.45); }
        .sys-mgmt-row:last-child { border-bottom: none; }
        .settings-card { min-height: 600px; }
        .sensitive-words .add-word { display: flex; gap: 12px; margin-bottom: 24px; }
        .sensitive-words .import-section { margin-top: 24px; }
        .sensitive-words .tip { color: rgb(var(--tw-color-on-surface-variant) / 1); font-size: 12px; margin-top: 8px; opacity: 0.92; }
        :global(.settings-page .ant-tabs-nav) { min-width: 150px; }
      `}</style>
    </div>
  );
}
