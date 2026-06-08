import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, Checkbox, Divider,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { roleApiService } from '../services/roleApi';
import type { Role, Permission } from '../services/roleApi';

const RoleManagementPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        roleApiService.list(),
        roleApiService.listPermissions(),
      ]);
      setRoles(rolesRes);
      setPermissions(permsRes);
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Role) => {
    setEditingRole(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      status: record.status,
      permissionIds: record.role_permissions.map((rp) => rp.permission.id),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await roleApiService.delete(id);
      message.success('删除成功');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRole) {
        await roleApiService.update(editingRole.id, values);
        message.success('更新成功');
      } else {
        await roleApiService.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '操作失败');
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '描述', dataIndex: 'description' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '权限',
      dataIndex: 'role_permissions',
      render: (rps: any[]) => (
        <div style={{ maxWidth: 300 }}>
          {rps.map((rp) => (
            <Tag key={rp.id} style={{ marginBottom: 4 }}>{rp.permission.name}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: '操作',
      width: 160,
      render: (_: any, record: Role) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除该角色吗？" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增角色</Button>
      </div>

      <Table columns={columns} dataSource={roles} rowKey="id" loading={loading} />

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]} >
            <Input />
          </Form.Item>
          <Form.Item name="code" label="角色编码" rules={[{ required: true }]} >
            <Input disabled={!!editingRole} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          {editingRole && (
            <Form.Item name="status" label="状态" rules={[{ required: true }]} initialValue="ACTIVE">
              <Select>
                <Select.Option value="ACTIVE">正常</Select.Option>
                <Select.Option value="INACTIVE">禁用</Select.Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item name="permissionIds" label="权限配置">
            <Checkbox.Group style={{ width: '100%' }}>
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module} style={{ marginBottom: 16 }}>
                  <Divider orientation="left" style={{ margin: '8px 0', fontWeight: 'bold' }}>
                    {module === 'user' ? '用户管理' : module === 'role' ? '角色管理' : module === 'system' ? '系统管理' : module}
                  </Divider>
                  <Space wrap>
                    {perms.map((perm) => (
                      <Checkbox key={perm.id} value={perm.id}>
                        {perm.name}
                      </Checkbox>
                    ))}
                  </Space>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagementPage;
