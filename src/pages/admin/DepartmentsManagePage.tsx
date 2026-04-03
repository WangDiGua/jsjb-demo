import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { departmentService } from '@/mock';
import type { Department } from '@/mock/types';
import AdminPageHeader from './AdminPageHeader';

export default function DepartmentsManagePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await departmentService.getDepartments();
        setDepartments(data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Department) => {
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(() => {
      message.success('保存成功');
      setModalVisible(false);
    });
  };

  return (
    <div className="departments-manage-page min-h-full">
      <AdminPageHeader
        title="部门管理"
        subtitle="归口单位信息与对外服务档案"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增部门
          </Button>
        }
      />

      <main>
        <Card className="table-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
          <Table
            loading={loading}
            dataSource={departments}
            rowKey="id"
            columns={[
              { title: '部门名称', dataIndex: 'name' },
              { title: '类型', dataIndex: 'type' },
              { title: '电话', dataIndex: 'phone' },
              { title: '邮箱', dataIndex: 'email' },
              { title: '受理数', dataIndex: '受理数' },
              { title: '答复数', dataIndex: '答复数' },
              { title: '评分', dataIndex: '评分' },
              {
                title: '操作',
                width: 100,
                render: (_, record) => (
                  <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
                ),
              },
            ]}
          />
        </Card>
      </main>

      <Modal title="部门信息" open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="部门名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
}
