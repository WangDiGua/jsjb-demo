import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { questionTypeService } from '@/mock';
import type { QuestionType } from '@/mock/types';
import AdminPageHeader from './AdminPageHeader';

export default function TypesManagePage() {
  const [types, setTypes] = useState<QuestionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<QuestionType | null>(null);
  const [form] = Form.useForm();

  const reload = async () => {
    setLoading(true);
    try {
      setTypes(await questionTypeService.getQuestionTypes());
    } catch (e) {
      message.error(e instanceof Error ? e.message : '类型列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleAdd = () => {
    setEditingType(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: QuestionType) => {
    setEditingType(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定删除该问题类型吗？',
      onOk: async () => {
        try {
          const next = types.filter((t) => t.id !== id);
          await questionTypeService.replaceQuestionTypes(next);
          message.success('删除成功');
          void reload();
        } catch (e) {
          message.error(e instanceof Error ? e.message : '删除失败');
        }
      },
    });
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      try {
        const order = values.order != null ? Number(values.order) : 0;
        if (editingType) {
          const next = types.map((t) =>
            t.id === editingType.id ? { ...t, ...values, order } : t,
          );
          await questionTypeService.replaceQuestionTypes(next);
          message.success('修改成功');
        } else {
          const newType: QuestionType = {
            id: 'type' + Date.now(),
            name: values.name,
            icon: values.icon,
            count: 0,
            order,
          };
          await questionTypeService.replaceQuestionTypes([...types, newType]);
          message.success('新增成功');
        }
        setModalVisible(false);
        void reload();
      } catch (e) {
        message.error(e instanceof Error ? e.message : '保存失败');
      }
    });
  };

  return (
    <div className="types-manage-page min-h-full">
      <AdminPageHeader
        title="问题类型管理"
        subtitle="分类体系与图标排序配置"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增类型
          </Button>
        }
      />

      <main>
        <Card className="table-card rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
          <Table
            loading={loading}
            dataSource={types}
            rowKey="id"
            columns={[
              { title: '排序', dataIndex: 'order', width: 80 },
              { title: '类型名称', dataIndex: 'name' },
              { title: '图标', dataIndex: 'icon', render: (v) => v || '-' },
              { title: '诉求数量', dataIndex: 'count' },
              {
                title: '操作',
                width: 150,
                render: (_, record) => (
                  <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
                    <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </main>

      <Modal
        title={editingType ? '编辑类型' : '新增类型'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="类型名称" rules={[{ required: true, message: '请输入类型名称' }]}>
            <Input placeholder="请输入类型名称" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input placeholder="请输入图标名称" />
          </Form.Item>
          <Form.Item name="order" label="排序">
            <Input type="number" placeholder="请输入排序号" />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
}
