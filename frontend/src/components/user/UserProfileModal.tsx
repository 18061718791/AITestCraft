import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Avatar, message, Button, Upload } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { userApiService } from '../../services/userApi';

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
}

// 获取头像完整 URL
const getAvatarUrl = (avatar: string | null): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  return `${API_BASE_URL}${avatar}`;
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({ open, onClose }) => {
  const { user, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        username: user.username,
        nickname: user.nickname || '',
        email: user.email || '',
      });
      setAvatarUrl(user.avatar);
    }
  }, [open, user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await userApiService.updateProfile({
        nickname: values.nickname,
        email: values.email,
        avatar: avatarUrl,
      });

      message.success('个人信息更新成功');
      await refreshUser();
      onClose();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (info: any) => {
    if (info.file.status === 'done') {
      // 后端返回格式: { success: true, data: { url, filename }, message }
      const url = info.file.response?.data?.url;
      if (url) {
        setAvatarUrl(url);
        message.success('头像上传成功');
      } else {
        message.error('头像上传失败：无法获取图片地址');
      }
    } else if (info.file.status === 'error') {
      const errorMsg = info.file.response?.error?.message || '头像上传失败';
      message.error(errorMsg);
    }
  };

  const primaryColor = isDark ? '#00d4ff' : '#3b82f6';

  return (
    <Modal
      title="个人中心"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={480}
      styles={{
        header: {
          background: isDark ? '#1e293b' : '#f8fafc',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        },
        body: {
          background: isDark ? '#1e293b' : '#f8fafc',
          padding: '24px',
        },
        footer: {
          background: isDark ? '#1e293b' : '#f8fafc',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        },
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Avatar
          size={80}
          icon={<UserOutlined />}
          src={getAvatarUrl(avatarUrl)}
          style={{
            background: primaryColor,
            boxShadow: `0 0 16px ${primaryColor}60`,
            marginBottom: 12,
          }}
        />
        <div>
          <Upload
            name="avatar"
            action="/api/upload/avatar"
            showUploadList={false}
            onChange={handleAvatarChange}
            headers={{
              Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
            }}
          >
            <Button icon={<UploadOutlined />} size="small">
              更换头像
            </Button>
          </Upload>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        disabled={loading}
      >
        <Form.Item
          label="用户名"
          name="username"
        >
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="昵称"
          name="nickname"
          rules={[
            { max: 50, message: '昵称最多50个字符' },
          ]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserProfileModal;
