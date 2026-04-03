import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Switch, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminConfigService } from '@/mock/adminConfigService';
import type { AppealFormField, FormFieldType } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

/** 表单里「下拉选项」用逗号分隔字符串编辑，持久化时再转 string[] */
type AppealFieldFormValues = Omit<AppealFormField, 'id' | 'options'> & { options?: string };

export default function FormsManagePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rows, setRows] = useState<AppealFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppealFormField | null>(null);
  const [form] = Form.useForm<AppealFieldFormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setRows([...b.formFields].sort((a, c) => a.order - c.order));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persistAll = async (next: AppealFormField[]) => {
    await adminConfigService.replaceFormFields(next, currentUser?.nickname ?? '管理员');
    message.success('已保存');
    void load();
  };

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      const id = editing?.id ?? `ff_${Date.now()}`;
      const opts = (v.options ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const row: AppealFormField = {
        id,
        label: v.label,
        fieldKey: v.fieldKey,
        type: v.type,
        required: v.required,
        placeholder: v.placeholder,
        order: v.order,
        options: opts.length ? opts : undefined,
      };
      let next = [...rows];
      const i = next.findIndex((x) => x.id === id);
      if (i >= 0) next[i] = row;
      else next.push(row);
      next = next.map((r, idx) => ({ ...r, order: idx + 1 }));
      await persistAll(next);
      setOpen(false);
    } catch {
      /* validate */
    }
  };

  const del = async (id: string) => {
    await persistAll(rows.filter((r) => r.id !== id).map((r, idx) => ({ ...r, order: idx + 1 })));
  };

  return (
    <div className="min-h-full">
      <AdminPageHeader
        title="填报页面管理"
        subtitle="配置用户端发起诉求时的字段、类型与必填规则"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({
                type: 'text',
                required: true,
                order: rows.length + 1,
              });
              setOpen(true);
            }}
          >
            新增字段
          </Button>
        }
      />
      <Card className="rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
        <Table
          loading={loading}
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: '顺序', dataIndex: 'order', width: 72 },
            { title: '标签', dataIndex: 'label', width: 120 },
            { title: '字段键', dataIndex: 'fieldKey', width: 120 },
            {
              title: '类型',
              dataIndex: 'type',
              width: 100,
              render: (t: FormFieldType) => t,
            },
            {
              title: '必填',
              dataIndex: 'required',
              width: 80,
              render: (v: boolean) => (v ? '是' : '否'),
            },
            {
              title: '操作',
              width: 140,
              render: (_, r: AppealFormField) => (
                <Space>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({
                        label: r.label,
                        fieldKey: r.fieldKey,
                        type: r.type,
                        required: r.required,
                        placeholder: r.placeholder,
                        order: r.order,
                        options: Array.isArray(r.options) ? r.options.join(', ') : '',
                      });
                      setOpen(true);
                    }}
                  />
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={() => void del(r.id)} />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal title={editing ? '编辑字段' : '新增字段'} open={open} onCancel={() => setOpen(false)} onOk={() => void onSubmit()} destroyOnHidden width={560}>
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="label" label="显示标签" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="fieldKey" label="字段键（英文）" rules={[{ required: true, pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '字母开头' }]}>
            <Input disabled={!!editing} placeholder="title / content" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'text', label: '单行文本' },
                { value: 'textarea', label: '多行' },
                { value: 'select', label: '下拉' },
                { value: 'number', label: '数字' },
                { value: 'image', label: '图片/附件' },
                { value: 'audio', label: '音频' },
              ]}
            />
          </Form.Item>
          <Form.Item name="required" label="必填" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="placeholder" label="占位提示">
            <Input />
          </Form.Item>
          <Form.Item name="options" label="选项（下拉时用逗号分隔）">
            <Input placeholder="选项A, 选项B" />
          </Form.Item>
          <Form.Item name="order" label="排序" hidden>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
