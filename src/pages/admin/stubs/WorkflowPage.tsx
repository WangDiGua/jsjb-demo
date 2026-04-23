import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { adminConfigService } from '@/mock/adminConfigService';
import type { WorkflowNode, WorkflowNodeKind } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

const kinds: { value: WorkflowNodeKind; label: string }[] = [
  { value: 'start', label: '开始' },
  { value: 'triage', label: '分派' },
  { value: 'accept', label: '受理' },
  { value: 'approve', label: '审批' },
  { value: 'reply', label: '答复' },
  { value: 'supervise', label: '督办' },
  { value: 'end', label: '结束' },
];

export default function WorkflowPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rows, setRows] = useState<WorkflowNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowNode | null>(null);
  const [form] = Form.useForm<WorkflowNode>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setRows(b.workflowNodes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveAll = async (next: WorkflowNode[]) => {
    await adminConfigService.replaceWorkflowNodes(next, currentUser?.nickname ?? '管理员');
    message.success('流程已保存');
    void load();
  };

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      const nextIds = typeof v.nextIds === 'string' ? (v.nextIds as string).split(',').map((s) => s.trim()).filter(Boolean) : v.nextIds;
      const node: WorkflowNode = { ...v, nextIds: nextIds as string[] };
      const next = [...rows];
      const i = next.findIndex((x) => x.id === node.id);
      if (i >= 0) next[i] = node;
      else next.push(node);
      await saveAll(next);
      setOpen(false);
    } catch {
      /* validate */
    }
  };

  return (
    <div className="min-h-full">
      <AdminPageHeader
        title="业务流程构建"
        subtitle="流程节点编排与 SLA（小时），配置持久化至工作流定义"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({
                id: `wf_${Date.now()}`,
                name: '新节点',
                kind: 'triage',
                nextIds: '',
                slaHours: 24,
              } as unknown as WorkflowNode);
              setOpen(true);
            }}
          >
            新增节点
          </Button>
        }
      />
      <Card className="rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
        <Table
          loading={loading}
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: '节点 ID', dataIndex: 'id', width: 120, ellipsis: true },
            { title: '名称', dataIndex: 'name' },
            {
              title: '类型',
              dataIndex: 'kind',
              width: 100,
              render: (k: WorkflowNodeKind) => kinds.find((x) => x.value === k)?.label ?? k,
            },
            { title: '后续节点', dataIndex: 'nextIds', render: (ids: string[]) => ids?.join(', ') },
            { title: 'SLA(h)', dataIndex: 'slaHours', width: 90 },
            {
              title: '操作',
              width: 100,
              render: (_, r: WorkflowNode) => (
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditing(r);
                    form.setFieldsValue({ ...r, nextIds: r.nextIds.join(', ') } as unknown as WorkflowNode);
                    setOpen(true);
                  }}
                />
              ),
            },
          ]}
        />
      </Card>
      <Modal title={editing ? '编辑节点' : '新增节点'} open={open} onCancel={() => setOpen(false)} onOk={() => void onSubmit()} destroyOnHidden width={560}>
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="id" label="节点 ID" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="kind" label="类型" rules={[{ required: true }]}>
            <Select options={kinds} />
          </Form.Item>
          <Form.Item name="nextIds" label="后续节点 ID（逗号分隔）" rules={[{ required: true }]}>
            <Input placeholder="wf_accept,wf_reply" />
          </Form.Item>
          <Form.Item name="slaHours" label="SLA 小时">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
