import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, InputNumber, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminConfigService } from '@/mock/adminConfigService';
import type { UserRiskMark, UserRiskStatus } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

const statusColor: Record<UserRiskStatus, string> = {
  watch: 'gold',
  throttle: 'orange',
  banned: 'red',
};

export default function AbnormalUsersPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rows, setRows] = useState<UserRiskMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRiskMark | null>(null);
  const [form] = Form.useForm<UserRiskMark>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setRows(b.userRiskMarks);
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
      const flags = typeof v.flags === 'string' ? (v.flags as string).split(',').map((s) => s.trim()).filter(Boolean) : v.flags;
      const row: UserRiskMark = {
        ...v,
        flags: flags as string[],
        updatedAt: new Date().toLocaleDateString('zh-CN'),
      };
      await adminConfigService.upsertUserRiskMark(row, currentUser?.nickname ?? '管理员');
      message.success('已保存');
      setOpen(false);
      void load();
    } catch {
      /* validate */
    }
  };

  return (
    <div className="min-h-full">
      <AdminPageHeader
        title="异常用户监控"
        subtitle="标记高频与风险账号及处置状态，支持增删改与持久化"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({
                status: 'watch',
                appealCount30d: 0,
                flags: '',
              } as unknown as UserRiskMark);
              setOpen(true);
            }}
          >
            新增标记
          </Button>
        }
      />
      <Card className="rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
        <Table
          loading={loading}
          rowKey="userId"
          dataSource={rows}
          columns={[
            { title: '用户 ID', dataIndex: 'userId', width: 100 },
            { title: '用户名', dataIndex: 'username', width: 120 },
            { title: '显示名', dataIndex: 'displayName', width: 120 },
            { title: '30 日诉求', dataIndex: 'appealCount30d', width: 96 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (s: UserRiskStatus) => <Tag color={statusColor[s]}>{s}</Tag>,
            },
            { title: '标签', dataIndex: 'flags', ellipsis: true, render: (f: string[]) => f?.join('；') },
            {
              title: '操作',
              width: 140,
              render: (_, r: UserRiskMark) => (
                <Space>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({ ...r, flags: r.flags.join(', ') } as unknown as UserRiskMark);
                      setOpen(true);
                    }}
                  />
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      await adminConfigService.deleteUserRiskMark(r.userId, currentUser?.nickname ?? '管理员');
                      message.success('已解除');
                      void load();
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal title={editing ? '编辑标记' : '新增标记'} open={open} onCancel={() => setOpen(false)} onOk={() => void onSubmit()} destroyOnHidden width={560}>
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="userId" label="用户 ID" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="displayName" label="显示名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="appealCount30d" label="30 日诉求数">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'watch', label: '观察' },
                { value: 'throttle', label: '限流' },
                { value: 'banned', label: '封禁' },
              ]}
            />
          </Form.Item>
          <Form.Item name="flags" label="标签（逗号分隔）">
            <Input placeholder="短时高频, 重复 tema" />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
