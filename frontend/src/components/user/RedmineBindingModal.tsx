import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Form, Input, List, Radio, Space, message, Spin, Empty, theme } from 'antd';
import { SearchOutlined, LinkOutlined } from '@ant-design/icons';
import { searchRedmineUsers, updateRedmineBinding, RedmineUser } from '../../services/redmineUserApi';

interface RedmineBindingModalProps {
  visible: boolean;
  userId: number;
  username: string;
  currentRedmineUserId?: number | null;
  currentRedmineLastname?: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const RedmineBindingModal: React.FC<RedmineBindingModalProps> = ({
  visible,
  userId,
  username,
  currentRedmineUserId,
  currentRedmineLastname,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<RedmineUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<RedmineUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 获取主题token
  const { token } = theme.useToken();

  // 重置表单
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSearchKeyword('');
      setSearchResults([]);
      
      // 如果已有绑定，显示当前绑定信息
      if (currentRedmineUserId && currentRedmineLastname) {
        setSelectedUser({
          id: currentRedmineUserId,
          lastname: currentRedmineLastname,
          firstname: '',
        });
        form.setFieldsValue({
          redmineUserId: currentRedmineUserId,
          redmineLastname: currentRedmineLastname,
        });
      } else {
        setSelectedUser(null);
      }
    }
  }, [visible, currentRedmineUserId, currentRedmineLastname, form]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 搜索Redmine用户（防抖）
  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const results = await searchRedmineUsers(keyword, 20);
      setSearchResults(results);
    } catch (error: any) {
      message.error(error.response?.data?.message || '搜索失败');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);
    
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 设置新的定时器（防抖300ms）
    searchTimeoutRef.current = setTimeout(() => {
      doSearch(value);
    }, 300);
  };

  // 处理选择用户
  const handleSelectUser = (user: RedmineUser) => {
    setSelectedUser(user);
    form.setFieldsValue({
      redmineUserId: user.id,
      redmineLastname: user.lastname,
    });
  };

  // 处理提交
  const handleSubmit = async () => {
    if (!selectedUser) {
      message.warning('请选择一个Redmine用户');
      return;
    }

    setSubmitting(true);
    try {
      await updateRedmineBinding(userId, selectedUser.id, selectedUser.lastname);
      message.success('Redmine关联成功');
      onSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || '关联失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined />
          关联Redmine用户
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label="当前用户">
          <Input value={username} disabled />
        </Form.Item>

        <Form.Item label="搜索Redmine用户姓名">
          <Input
            prefix={<SearchOutlined />}
            placeholder="请输入姓名关键字"
            value={searchKeyword}
            onChange={handleSearchChange}
            allowClear
          />
        </Form.Item>

        <Form.Item label="搜索结果">
          <div style={{ 
            maxHeight: 200, 
            overflow: 'auto', 
            border: `1px solid ${token.colorBorder}`, 
            borderRadius: token.borderRadius,
            backgroundColor: token.colorBgElevated 
          }}>
            <Spin spinning={loading}>
              {searchResults.length > 0 ? (
                <Radio.Group
                  value={selectedUser?.id}
                  style={{ width: '100%' }}
                >
                  <List
                    dataSource={searchResults}
                    renderItem={(item) => (
                      <List.Item
                        style={{
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          padding: '8px 16px',
                        }}
                        onClick={() => handleSelectUser(item)}
                      >
                        <Radio value={item.id}>
                          <Space direction="vertical" size={0}>
                            <span style={{ fontWeight: 500, color: token.colorText }}>{item.lastname}</span>
                            {item.login && (
                              <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                                登录名: {item.login}
                              </span>
                            )}
                          </Space>
                        </Radio>
                      </List.Item>
                    )}
                  />
                </Radio.Group>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={searchKeyword ? '未找到匹配的用户' : '请输入关键字搜索'}
                  style={{ padding: '20px 0' }}
                />
              )}
            </Spin>
          </div>
        </Form.Item>

        <Form.Item
          name="redmineUserId"
          label="Redmine用户ID"
          rules={[{ required: true, message: '请选择Redmine用户' }]}
        >
          <Input disabled placeholder="选择用户后自动填充" />
        </Form.Item>

        <Form.Item
          name="redmineLastname"
          label="Redmine用户姓名"
          rules={[{ required: true, message: '请选择Redmine用户' }]}
        >
          <Input disabled placeholder="选择用户后自动填充" />
        </Form.Item>

        {selectedUser && (
          <Form.Item>
            <div style={{ 
              padding: 12, 
              backgroundColor: 'transparent', 
              border: `1px solid ${token.colorBorder}`, 
              borderRadius: token.borderRadius,
              color: token.colorText
            }}>
              <strong style={{ color: token.colorSuccess }}>已选择：</strong>
              <span style={{ color: token.colorText }}>{selectedUser.lastname} (ID: {selectedUser.id})</span>
            </div>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default RedmineBindingModal;
