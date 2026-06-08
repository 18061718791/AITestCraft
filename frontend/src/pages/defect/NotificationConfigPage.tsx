import React, { useState, useEffect } from 'react';
import { Layout, Typography, Form, Input, Button, Table, message, Switch, Card, Divider, Space, Tabs } from 'antd';
import { BellOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, RestOutlined, KeyOutlined, TeamOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';



const { Content } = Layout;
const { Title, Text } = Typography;

interface Recipient {
  id: string;
  name: string;
  email: string;
  sendKey: string;
  active: boolean;
}

interface Schedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
  interval: number;
}

const NotificationConfigPage: React.FC = () => {
  const { isDark } = useTheme();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({
    enabled: true,
    startTime: '09:00',
    endTime: '18:00',
    interval: 60
  });
  const [loading, setLoading] = useState({
    load: false,
    save: false,
    test: false
  });

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(prev => ({ ...prev, load: true }));
      
      // 加载接收人
      const recipientsResponse = await fetch('/api/notification/recipients');
      const recipientsData = await recipientsResponse.json();
      
      if (recipientsData.success) {
        setRecipients(recipientsData.data.map((r: any) => ({
          id: r.id.toString(),
          name: r.name,
          email: r.email,
          sendKey: r.send_key,
          active: r.active
        })));
      }
      
      // 加载设置
      const settingsResponse = await fetch('/api/notification/settings');
      const settingsData = await settingsResponse.json();
      
      if (settingsData.success) {
        setSchedule({
          enabled: settingsData.data.enabled,
          startTime: settingsData.data.start_time,
          endTime: settingsData.data.end_time,
          interval: settingsData.data.interval
        });
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      message.error('加载配置失败');
    } finally {
      setLoading(prev => ({ ...prev, load: false }));
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(prev => ({ ...prev, save: true }));
      
      // 保存接收人
      for (const recipient of recipients) {
        if (recipient.id.startsWith('new_')) {
          // 创建新接收人
          const response = await fetch('/api/notification/recipients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: recipient.name,
              email: recipient.email,
              sendKey: recipient.sendKey,
              active: recipient.active
            })
          });
          
          const result = await response.json();
          if (!result.success) {
            throw new Error('保存接收人失败');
          }
        } else {
          // 更新现有接收人
          const response = await fetch(`/api/notification/recipients/${recipient.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: recipient.name,
              email: recipient.email,
              sendKey: recipient.sendKey,
              active: recipient.active
            })
          });
          
          const result = await response.json();
          if (!result.success) {
            throw new Error('更新接收人失败');
          }
        }
      }
      
      // 保存设置
      const settingsResponse = await fetch('/api/notification/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: schedule.enabled,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          interval: schedule.interval
        })
      });
      
      const settingsResult = await settingsResponse.json();
      if (!settingsResult.success) {
        throw new Error('保存设置失败');
      }
      
      message.success('配置保存成功');
      // 重新加载配置
      loadConfig();
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败');
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  const addRecipient = () => {
    const newRecipient: Recipient = {
      id: `new_${Date.now()}`,
      name: '',
      email: '',
      sendKey: '',
      active: true
    };
    setRecipients([...recipients, newRecipient]);
  };

  const removeRecipient = async (id: string) => {
    if (!id.startsWith('new_')) {
      try {
        const response = await fetch(`/api/notification/recipients/${id}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
          setRecipients(recipients.filter(recipient => recipient.id !== id));
          message.success('删除接收人成功');
        } else {
          message.error('删除接收人失败');
        }
      } catch (error) {
        console.error('删除接收人失败:', error);
        message.error('删除接收人失败');
      }
    } else {
      // 对于新添加的接收人，直接从数组中删除
      setRecipients(recipients.filter(recipient => recipient.id !== id));
    }
  };

  const updateRecipient = (id: string, field: keyof Recipient, value: any) => {
    setRecipients(recipients.map(recipient => 
      recipient.id === id ? { ...recipient, [field]: value } : recipient
    ));
  };

  const updateSchedule = (field: keyof Schedule, value: any) => {
    setSchedule({ ...schedule, [field]: value });
  };

  const testNotification = async () => {
    try {
      setLoading(prev => ({ ...prev, test: true }));
      // 调用后端API发送测试通知
      const response = await fetch('/api/notification/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.error);
      }
    } catch (error) {
      console.error('发送测试通知失败:', error);
      message.error('发送测试通知失败');
    } finally {
      setLoading(prev => ({ ...prev, test: false }));
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Recipient) => (
        <Input 
          value={text} 
          onChange={(e) => updateRecipient(record.id, 'name', e.target.value)} 
          placeholder="请输入名称"
        />
      )
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text: string, record: Recipient) => (
        <Input 
          value={text} 
          onChange={(e) => updateRecipient(record.id, 'email', e.target.value)} 
          placeholder="请输入邮箱"
        />
      )
    },
    {
      title: 'SendKey',
      dataIndex: 'sendKey',
      key: 'sendKey',
      render: (text: string, record: Recipient) => (
        <Input 
          value={text} 
          onChange={(e) => updateRecipient(record.id, 'sendKey', e.target.value)} 
          placeholder="请输入Server酱SendKey"
        />
      )
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (text: boolean, record: Recipient) => (
        <Switch 
          checked={text} 
          onChange={(checked) => updateRecipient(record.id, 'active', checked)}
          checkedChildren="开启"
          unCheckedChildren="关闭"
          style={
            isDark
              ? {
                  backgroundColor: text ? '#00d4ff' : '#555555',
                }
              : {
                  backgroundColor: text ? '#00d4ff' : '#d9d9d9',
                }
          }
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Recipient) => (
        <Button 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => removeRecipient(record.id)} 
        >
          删除
        </Button>
      )
    }
  ];

  return (
    <Content style={{ margin: '0 24px', padding: 24, background: 'var(--bg-container, #1e293b)', minHeight: 280 }}>
      <Title level={2}><BellOutlined /> 消息推送配置</Title>
      <Divider />
      
      <Tabs defaultActiveKey="recipients" size="large">
        {/* 接收人管理标签页 */}
        <Tabs.TabPane 
          tab={<><TeamOutlined /> 接收人管理</>} 
          key="recipients"
        >
          <Card>
            <Table 
              columns={columns} 
              dataSource={recipients} 
              rowKey="id" 
              pagination={false}
              footer={() => (
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={addRecipient}
                  >
                    添加接收人
                  </Button>
                  <Button 
                    icon={<KeyOutlined />} 
                    onClick={() => window.open('https://sct.ftqq.com/login', '_blank')}
                  >
                    获取SendKey
                  </Button>
                </Space>
              )}
            />
          </Card>
        </Tabs.TabPane>
        
        {/* 定时任务配置标签页 */}
        <Tabs.TabPane 
          tab={<><ClockCircleOutlined /> 定时任务配置</>} 
          key="schedule"
        >
          <Card>
            <Form layout="vertical">
              <Form.Item label="推送状态">
                <Switch 
                  checked={schedule.enabled} 
                  onChange={(checked) => updateSchedule('enabled', checked)}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                  style={
                    isDark
                      ? {
                          backgroundColor: schedule.enabled ? '#00d4ff' : '#555555',
                        }
                      : {
                          backgroundColor: schedule.enabled ? '#00d4ff' : '#d9d9d9',
                        }
                  }
                />
              </Form.Item>
              
              <Form.Item label="开始时间">
                <Input 
                  value={schedule.startTime} 
                  onChange={(e) => updateSchedule('startTime', e.target.value)} 
                  placeholder="如 09:00"
                />
              </Form.Item>
              
              <Form.Item label="结束时间">
                <Input 
                  value={schedule.endTime} 
                  onChange={(e) => updateSchedule('endTime', e.target.value)} 
                  placeholder="如 18:00"
                />
              </Form.Item>
              
              <Form.Item label="推送间隔（分钟）">
                <Input 
                  type="number" 
                  value={schedule.interval} 
                  onChange={(e) => updateSchedule('interval', parseInt(e.target.value) || 0)} 
                  placeholder="如 60"
                />
              </Form.Item>
            </Form>
          </Card>
        </Tabs.TabPane>
      </Tabs>
      
      <Space style={{ marginTop: 24 }}>
        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={saveConfig} 
          loading={loading.save}
        >
          保存配置
        </Button>
        <Button 
          icon={<RestOutlined />} 
          onClick={testNotification} 
          loading={loading.test}
        >
          发送测试通知
        </Button>
        <Button onClick={loadConfig} loading={loading.load}>
          刷新配置
        </Button>
      </Space>
      
      <Card style={{ marginTop: 24 }}>
        <Title level={4}>配置说明</Title>
        <Text>
          <ul>
            <li>接收人管理：添加和管理需要接收消息推送的人员，每个接收人需要配置Server酱的SendKey</li>
            <li>定时任务配置：设置消息推送的时间范围和间隔</li>
            <li>Server酱：需要在Server酱官网注册并获取SendKey</li>
            <li>消息格式：推送的消息会以表格形式展示系统分布的待办事项</li>
            <li>快速链接：点击链接可直接跳转到待办事项页面</li>
          </ul>
        </Text>
      </Card>
    </Content>
  );
};

export default NotificationConfigPage;