import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Switch, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminConfigService } from '@/mock/adminConfigService';
import type { ChatbotProfile } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

export default function RobotManagePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rows, setRows] = useState<ChatbotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChatbotProfile | null>(null);
  const [form] = Form.useForm<ChatbotProfile & { kbIdsText?: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setRows(b.chatbotProfiles);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      const kb = (v.kbIdsText ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const { kbIdsText: _k, ...rest } = v;
      const row: ChatbotProfile = {
        ...(rest as ChatbotProfile),
        linkedKbIds: kb.length ? kb : [],
        id: editing?.id ?? `bot_${Date.now()}`,
      };
      await adminConfigService.upsertChatbotProfile(row, currentUser?.nickname ?? '管理员');
      message.success('已保存');
      setOpen(false);
      void load();
    } catch {
      /* validate */
    }
  };

  return (
    <div className="min-h-full">
      <AdminPageHeader title="机器人管理" subtitle="引导机器人环境、意图规模与绑定知识库 ID" />
      <Card className="rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
        <Table
          loading={loading}
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: '名称', dataIndex: 'name' },
            {
              title: '环境',
              dataIndex: 'environment',
              width: 120,
              render: (e: string) => (e === 'production' ? '生产' : '预发'),
            },
            { title: '意图数', dataIndex: 'intentCount', width: 90 },
            {
              title: '绑定 KB',
              dataIndex: 'linkedKbIds',
              ellipsis: true,
              render: (ids: string[]) => ids?.join(', '),
            },
            {
              title: '启用',
              dataIndex: 'enabled',
              width: 80,
              render: (e: boolean) => (e ? '是' : '否'),
            },
            {
              title: '操作',
              width: 140,
              render: (_, r: ChatbotProfile) => (
                <Space>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({ ...r, kbIdsText: r.linkedKbIds.join(', ') });
                      setOpen(true);
                    }}
                  />
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      await adminConfigService.deleteChatbotProfile(r.id, currentUser?.nickname ?? '管理员');
                      message.success('已删除');
                      void load();
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal title={editing ? '编辑机器人' : '新建机器人'} open={open} onCancel={() => setOpen(false)} onOk={() => void onSubmit()} destroyOnHidden width={560}>
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="environment" label="环境" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'production', label: '生产' },
                { value: 'staging', label: '预发' },
              ]}
            />
          </Form.Item>
          <Form.Item name="intentCount" label="意图数量">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="kbIdsText" label="绑定知识库 ID（逗号分隔）">
            <Input placeholder="kb1, kb2" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
