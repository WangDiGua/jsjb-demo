import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { departmentService } from '@/mock';
import type { Department, DepartmentCatalogEntry } from '@/mock/types';
import AdminPageHeader from './AdminPageHeader';

const TYPE_OPTIONS: { value: DepartmentCatalogEntry['type']; label: string }[] = [
  { value: 'administration', label: '行政' },
  { value: 'logistics', label: '后勤' },
  { value: 'teaching', label: '教学教辅' },
  { value: 'other', label: '其他' },
];

export default function DepartmentsManagePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '部门列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const on = () => {
      void refresh();
    };
    window.addEventListener('jsjb-mock-updated', on);
    return () => window.removeEventListener('jsjb-mock-updated', on);
  }, [refresh]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Department) => {
    setEditingId(record.id);
    form.setFieldsValue({
      id: record.id,
      name: record.name,
      type: record.type,
      phone: record.phone,
      email: record.email,
      address: record.address,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleSubmit = () => {
    form
      .validateFields()
      .then(async (values) => {
        setSubmitting(true);
        try {
          const payload: Omit<DepartmentCatalogEntry, 'id'> = {
            name: values.name,
            type: values.type,
            description: values.description ?? '',
            phone: values.phone ?? '',
            email: values.email ?? '',
            address: values.address ?? '',
          };
          if (editingId) {
            await departmentService.updateDepartment(editingId, payload);
            message.success('已保存修改');
          } else {
            await departmentService.createDepartment(payload);
            message.success('已新增部门');
          }
          setModalVisible(false);
          await refresh();
        } catch (e) {
          message.error(e instanceof Error ? e.message : '保存失败');
        } finally {
          setSubmitting(false);
        }
      })
      .catch(() => {
        /* 校验未通过 */
      });
  };

  const handleDelete = async (record: Department) => {
    try {
      await departmentService.deleteDepartment(record.id);
      message.success('已删除');
      await refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败');
    }
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
                width: 180,
                render: (_, record) => (
                  <>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                      编辑
                    </Button>
                    <Popconfirm
                      title="删除该部门？"
                      description="若有关联诉求记录将无法删除。"
                      onConfirm={() => handleDelete(record)}
                    >
                      <Button type="link" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </>
                ),
              },
            ]}
          />
        </Card>
      </main>

      <Modal
        title={editingId ? '编辑部门' : '新增部门'}
        open={modalVisible}
        confirmLoading={submitting}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="部门名称" rules={[{ required: true, message: '请填写部门名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="选择类型" options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input type="email" />
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
