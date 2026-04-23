import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminConfigService } from '@/mock/adminConfigService';
import type { KbDocument } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

export default function KnowledgeBasePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rows, setRows] = useState<KbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KbDocument | null>(null);
  const [form] = Form.useForm<KbDocument>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setRows(b.kbDocuments);
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
      const doc: KbDocument = {
        ...v,
        id: editing?.id ?? `kb_${Date.now()}`,
        updatedAt: new Date().toLocaleDateString('zh-CN'),
      };
      await adminConfigService.upsertKbDocument(doc, currentUser?.nickname ?? '管理员');
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
        title="业务知识库管理"
        subtitle="条目、分类、来源与可见范围（handlers/internal/public）"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ visibility: 'internal', category: '', source: '', snippet: '' } as Partial<KbDocument>);
              setOpen(true);
            }}
          >
            新建条目
          </Button>
        }
      />
      <Card className="rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
        <Table
          loading={loading}
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: '标题', dataIndex: 'title', ellipsis: true },
            { title: '分类', dataIndex: 'category', width: 120 },
            { title: '来源', dataIndex: 'source', width: 140, ellipsis: true },
            { title: '可见性', dataIndex: 'visibility', width: 100 },
            { title: '更新', dataIndex: 'updatedAt', width: 110 },
            {
              title: '操作',
              width: 140,
              render: (_, r: KbDocument) => (
                <Space>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue(r);
                      setOpen(true);
                    }}
                  />
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      await adminConfigService.deleteKbDocument(r.id, currentUser?.nickname ?? '管理员');
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
      <Modal title={editing ? '编辑条目' : '新建条目'} open={open} onCancel={() => setOpen(false)} onOk={() => void onSubmit()} destroyOnHidden width={640}>
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="source" label="来源系统/部门">
            <Input />
          </Form.Item>
          <Form.Item name="visibility" label="可见性" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'public', label: '公开' },
                { value: 'internal', label: '校内' },
                { value: 'handlers', label: '仅处理员' },
              ]}
            />
          </Form.Item>
          <Form.Item name="snippet" label="摘要">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
