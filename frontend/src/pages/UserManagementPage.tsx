import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, LinkOutlined } from '@ant-design/icons';
import { userApiService } from '../services/userApi';
import { roleApiService } from '../services/roleApi';
import RedmineBindingModal from '../components/user/RedmineBindingModal';
import type { User } from '../services/userApi';
import type { Role } from '../services/roleApi';

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [redmineModalVisible, setRedmineModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [redmineBindingUser, setRedmineBindingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [keyword, setKeyword] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        userApiService.list(1, 100, keyword),
        roleApiService.list(),
      ]);
      setUsers(usersRes.rows);
      setRoles(rolesRes);
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [keyword]);

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: User) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      email: record.email,
      nickname: record.nickname,
      status: record.status,
      roleIds: record.roles.map((r: { id: number }) => r.id),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await userApiService.delete(id);
      message.success('删除成功');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        await userApiService.update(editingUser.id, values);
        message.success('更新成功');
      } else {
        await userApiService.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '操作失败');
    }
  };

  const handleResetPassword = async (values: any) => {
    if (!resetUserId) return;
    try {
      await userApiService.resetPassword(resetUserId, values.newPassword);
      message.success('密码重置成功');
      setResetModalVisible(false);
      resetForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '密码重置失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '昵称', dataIndex: 'nickname' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : status === 'LOCKED' ? 'red' : 'default'}>
          {status === 'ACTIVE' ? '正常' : status === 'LOCKED' ? '锁定' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: any[]) => roles.map((r) => <Tag key={r.id}>{r.name}</Tag>),
    },
    {
      title: 'Redmine关联',
      dataIndex: 'redmine_user_id',
      render: (redmine_user_id: number | null, record: User) => (
        redmine_user_id ? (
          <Tag color="green">
            {record.redmine_lastname} (ID:{redmine_user_id})
          </Tag>
        ) : (
          <Tag color="orange">未关联</Tag>
        )
      ),
    },
    {
      title: '操作',
      width: 280,
      render: (_: any, record: User) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button
            icon={<LinkOutlined />}
            size="small"
            onClick={() => {
              setRedmineBindingUser(record);
              setRedmineModalVisible(true);
            }}
          >
            关联Redmine
          </Button>
          <Button
            icon={<KeyOutlined />}
            size="small"
            onClick={() => {
              setResetUserId(record.id);
              setResetModalVisible(true);
            }}
          >
            重置密码
          </Button>
          <Popconfirm title="确定删除该用户吗？" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input.Search
          placeholder="搜索用户名/邮箱/昵称"
          allowClear
          onSearch={setKeyword}
          onChange={(e) => !e.target.value && setKeyword('')}
          style={{ width: 300 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增用户</Button>
      </div>

      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} />

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]} >
            <Input disabled={!!editingUser} />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]} >
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]} >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="nickname" label="昵称">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]} initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">正常</Select.Option>
              <Select.Option value="INACTIVE">禁用</Select.Option>
              <Select.Option value="LOCKED">锁定</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" placeholder="选择角色">
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.id}>{role.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={resetModalVisible}
        onCancel={() => setResetModalVisible(false)}
        onOk={() => resetForm.submit()}
        destroyOnClose
      >
        <Form form={resetForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6 }]} >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      <RedmineBindingModal
        visible={redmineModalVisible}
        userId={redmineBindingUser?.id || 0}
        username={redmineBindingUser?.username || ''}
        currentRedmineUserId={redmineBindingUser?.redmine_user_id}
        currentRedmineLastname={redmineBindingUser?.redmine_lastname}
        onCancel={() => {
          setRedmineModalVisible(false);
          setRedmineBindingUser(null);
        }}
        onSuccess={() => {
          setRedmineModalVisible(false);
          setRedmineBindingUser(null);
          fetchData();
        }}
      />
    </div>
  );
};

export default UserManagementPage;
