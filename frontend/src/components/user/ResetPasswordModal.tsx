import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { authApiService } from '../../services/authApi';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ open, onClose }) => {
  const { isDark } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await authApiService.resetPassword(values.newPassword);

      message.success('密码重置成功');
      form.resetFields();
      onClose();
    } catch (error: any) {
      message.error(error.message || '密码重置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="重置密码"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={420}
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
      <Form
        form={form}
        layout="vertical"
        disabled={loading}
      >
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度至少6位' },
            { max: 32, message: '密码长度最多32位' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入新密码"
            style={{ paddingLeft: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请再次输入新密码"
            style={{ paddingLeft: 8 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ResetPasswordModal;
