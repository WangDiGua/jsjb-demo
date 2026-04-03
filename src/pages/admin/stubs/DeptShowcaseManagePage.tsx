import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminConfigService, mockDepartments } from '@/mock';
import type { DeptShowcaseExtra } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

export default function DeptShowcaseManagePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rows, setRows] = useState<DeptShowcaseExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeptShowcaseExtra | null>(null);
  const [form] = Form.useForm<DeptShowcaseExtra & { shortcutsText?: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setRows(b.deptShowcaseExtras);
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
      const lines = (v.shortcutsText ?? '').split('\n').filter(Boolean);
      const shortcuts = lines.map((line) => {
        const [label, href] = line.split('|').map((s) => s.trim());
        return { label: label || '入口', href: href || '#' };
      });
      const row: DeptShowcaseExtra = {
        departmentId: v.departmentId,
        heroTitle: v.heroTitle,
        linkTel: v.linkTel,
        shortcuts: shortcuts.length ? shortcuts : [{ label: '更多', href: '#' }],
      };
      await adminConfigService.upsertDeptShowcase(row, currentUser?.nickname ?? '管理员');
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
        title="部门风采管理"
        subtitle="维护门户「部门」详情区的标题、电话与快捷入口（与 Department.id 绑定）"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            新增/绑定部门
          </Button>
        }
      />
      <Card className="rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
        <Table
          loading={loading}
          rowKey="departmentId"
          dataSource={rows}
          columns={[
            { title: '部门 ID', dataIndex: 'departmentId', width: 100 },
            {
              title: '部门名称',
              dataIndex: 'departmentId',
              width: 140,
              render: (id: string) => mockDepartments.find((d) => d.id === id)?.name ?? id,
            },
            { title: '展示标题', dataIndex: 'heroTitle', ellipsis: true },
            { title: '电话', dataIndex: 'linkTel', width: 130 },
            {
              title: '操作',
              width: 140,
              render: (_, r: DeptShowcaseExtra) => (
                <Space>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({
                        ...r,
                        shortcutsText: r.shortcuts.map((s) => `${s.label}|${s.href}`).join('\n'),
                      });
                      setOpen(true);
                    }}
                  />
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      await adminConfigService.deleteDeptShowcase(r.departmentId, currentUser?.nickname ?? '管理员');
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
      <Modal title={editing ? '编辑风采' : '绑定部门风采'} open={open} onCancel={() => setOpen(false)} onOk={() => void onSubmit()} destroyOnHidden width={640}>
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="departmentId" label="部门" rules={[{ required: true }]}>
            <Select
              disabled={!!editing}
              placeholder="选择部门"
              options={mockDepartments.map((d) => ({ value: d.id, label: `${d.name} (${d.id})` }))}
            />
          </Form.Item>
          <Form.Item name="heroTitle" label="展示标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="linkTel" label="联系电话">
            <Input />
          </Form.Item>
          <Form.Item name="shortcutsText" label="快捷入口（每行：名称|链接）" tooltip="例：选课系统|https://example.com">
            <Input.TextArea rows={4} placeholder={'选课系统|#\n考试安排|#'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
