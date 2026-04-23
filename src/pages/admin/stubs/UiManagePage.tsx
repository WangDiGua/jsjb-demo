import { useCallback, useEffect, useState } from 'react';
import { Card, Form, Input, Button, Table, message } from 'antd';
import { adminConfigService } from '@/mock/adminConfigService';
import type { PortalBranding } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

export default function UiManagePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [form] = Form.useForm<PortalBranding & { channelsLines?: string }>();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      const p = b.portalBranding;
      form.setFieldsValue({
        ...p,
        channelsLines: p.channels.map((c) => `${c.name}|${c.channel}`).join('\n'),
      } as PortalBranding & { channelsLines: string });
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    try {
      const v = await form.validateFields();
      const { channelsLines, ...rest } = v;
      const lines = (channelsLines ?? '').split('\n').filter(Boolean);
      const channels = lines.map((line) => {
        const [name, channel] = line.split('|').map((s) => s.trim());
        return { name: name || '渠道', channel: channel || 'Web' };
      });
      await adminConfigService.updatePortalBranding(
        { ...rest, channels: channels.length ? channels : [{ name: '学校官网', channel: 'Web' }] },
        currentUser?.nickname ?? '管理员',
      );
      message.success('门户文案已更新，刷新用户端首页/登录可见');
      void load();
    } catch {
      /* validate */
    }
  };

  return (
    <div className="min-h-full">
      <AdminPageHeader title="界面管理" subtitle="登录页欢迎语、校训、多渠道展示文案（portalBranding）" />
      <Card loading={loading} className="rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
        <Form form={form} layout="vertical" className="max-w-2xl">
          <Form.Item name="loginWelcome" label="登录欢迎主标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="loginSubtitle" label="登录副标题">
            <Input />
          </Form.Item>
          <Form.Item name="homeMotto" label="首页校训/标语">
            <Input />
          </Form.Item>
          <Form.Item
            name="channelsLines"
            label="部署渠道列表（每行：名称|类型说明）"
            tooltip="用于管理端展示矩阵，用户端可扩展读取"
          >
            <Input.TextArea rows={5} placeholder={'学校官网|Web/H5\n企业微信|工作台'} />
          </Form.Item>
          <Button type="primary" onClick={() => void save()}>
            保存配置
          </Button>
        </Form>
      </Card>
      <Card title="字段对照" className="mt-4 rounded-xl border-outline-variant/20">
        <Table
          size="small"
          pagination={false}
          dataSource={[
            { key: '1', field: 'loginWelcome', pc: 'LoginPage 主标题', mobile: '同上' },
            { key: '2', field: 'homeMotto', pc: 'HomePage 可展示校训', mobile: '可选' },
          ]}
          columns={[
            { title: '配置项', dataIndex: 'field', width: 160 },
            { title: 'PC 门户', dataIndex: 'pc' },
            { title: '移动端', dataIndex: 'mobile' },
          ]}
        />
      </Card>
    </div>
  );
}
