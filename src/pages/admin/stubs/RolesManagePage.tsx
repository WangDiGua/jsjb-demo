import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminConfigService } from '@/mock/adminConfigService';
import type { BusinessRoleRow } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

export default function RolesManagePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rows, setRows] = useState<BusinessRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRoleRow | null>(null);
  const [form] = Form.useForm<BusinessRoleRow>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setRows(b.businessRoles);
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
      const perms = typeof v.permissions === 'string' ? (v.permissions as string).split(',').map((s) => s.trim()).filter(Boolean) : v.permissions;
      const row: BusinessRoleRow = {
        ...v,
        id: editing?.id ?? `br_${Date.now()}`,
        permissions: (perms as string[]) ?? [],
      };
      await adminConfigService.upsertBusinessRole(row, currentUser?.nickname ?? '管理员');
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
        title="业务角色管理"
        subtitle="与办理权限相关的业务角色定义（与登录身份独立配置）"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({
                code: '',
                name: '',
                description: '',
                permissions: '',
              } as unknown as BusinessRoleRow);
              setOpen(true);
            }}
          >
            新增角色
          </Button>
        }
      />
      <Card className="rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
        <Table
          loading={loading}
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: '编码', dataIndex: 'code', width: 120 },
            { title: '名称', dataIndex: 'name', width: 160 },
            { title: '说明', dataIndex: 'description', ellipsis: true },
            {
              title: '权限',
              dataIndex: 'permissions',
              ellipsis: true,
              render: (p: string[]) => p.join(', '),
            },
            {
              title: '操作',
              width: 140,
              render: (_, r: BusinessRoleRow) => (
                <Space>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({ ...r, permissions: r.permissions.join(', ') } as unknown as BusinessRoleRow);
                      setOpen(true);
                    }}
                  />
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      await adminConfigService.deleteBusinessRole(r.id, currentUser?.nickname ?? '管理员');
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
      <Modal title={editing ? '编辑角色' : '新增角色'} open={open} onCancel={() => setOpen(false)} onOk={() => void onSubmit()} destroyOnHidden width={600}>
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="code" label="编码" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="permissions" label="权限标识（逗号分隔，* 为全部）" rules={[{ required: true }]}>
            <Input placeholder="appeal.dept, reply" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
