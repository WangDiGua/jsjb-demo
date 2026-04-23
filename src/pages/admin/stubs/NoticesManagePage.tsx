import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { noticeService } from '@/mock';
import type { Notice } from '@/mock/types';
import AdminPageHeader from '../AdminPageHeader';

const { TextArea } = Input;

export default function NoticesManagePage() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form] = Form.useForm<{ title: string; content: string; publisher: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await noticeService.getNotices());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEditing(n);
    form.setFieldsValue({ title: n.title, content: n.content, publisher: n.publisher });
    setOpen(true);
  };

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      if (editing) {
        await noticeService.updateNotice(editing.id, v);
        message.success('已保存');
      } else {
        await noticeService.createNotice(v);
        message.success('已发布');
      }
      setOpen(false);
      void load();
    } catch {
      /* validate */
    }
  };

  return (
    <div className="notices-admin-page min-h-full">
      <AdminPageHeader
        title="通知公告管理"
        subtitle="起草、编辑与多端同步，内容持久化存储"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新建公告
          </Button>
        }
      />

      <main>
        <Card className="rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
          <Table
            loading={loading}
            rowKey="id"
            dataSource={rows}
            columns={[
              { title: '标题', dataIndex: 'title', ellipsis: true },
              { title: '发布部门', dataIndex: 'publisher', width: 140 },
              { title: '发布时间', dataIndex: 'createTime', width: 180 },
              {
                title: '操作',
                width: 160,
                render: (_, n) => (
                  <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(n)}>
                      编辑
                    </Button>
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: '删除公告',
                          content: `确定删除「${n.title}」？`,
                          onOk: async () => {
                            await noticeService.deleteNotice(n.id);
                            message.success('已删除');
                            void load();
                          },
                        });
                      }}
                    >
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </main>

      <Modal
        title={editing ? '编辑公告' : '新建公告'}
        open={open}
        onOk={() => void onSubmit()}
        onCancel={() => setOpen(false)}
        destroyOnHidden
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="公告标题" />
          </Form.Item>
          <Form.Item name="publisher" label="发布部门" rules={[{ required: true, message: '请输入发布部门' }]}>
            <Input placeholder="如：教务处" />
          </Form.Item>
          <Form.Item name="content" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
            <TextArea rows={10} placeholder="支持换行；富文本后续可接编辑器" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
