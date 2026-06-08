import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Space, Typography, Tabs } from 'antd';
import axios from 'axios';

const { Text } = Typography;
const { Password } = Input;
const { TabPane } = Tabs;

interface ConfigItem {
  id: number;
  config_key: string;
  config_value: string;
  config_type: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const DatabaseConfigPage: React.FC = () => {
  const [mysqlForm] = Form.useForm();
  const [postgresForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 获取数据库配置
  const fetchDatabaseConfigs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/configs', {
        params: { type: 'database' }
      });
      const databaseConfigs = response.data.data;

      // 填充表单
      const formValues: Record<string, string> = {};
      databaseConfigs.forEach((config: ConfigItem) => {
        formValues[config.config_key] = config.config_value;
      });

      // 填充MySQL表单
      mysqlForm.setFieldsValue({
        MYSQL_HOST: formValues.MYSQL_HOST || 'localhost',
        MYSQL_PORT: formValues.MYSQL_PORT || '3306',
        MYSQL_USER: formValues.MYSQL_USER || 'root',
        MYSQL_PASSWORD: formValues.MYSQL_PASSWORD || 'root',
        MYSQL_DATABASE: formValues.MYSQL_DATABASE || 'testcase_generator'
      });

      // 填充PostgreSQL表单
      postgresForm.setFieldsValue({
        POSTGRES_HOST: formValues.POSTGRES_HOST || '10.20.42.40',
        POSTGRES_PORT: formValues.POSTGRES_PORT || '25432',
        POSTGRES_USER: formValues.POSTGRES_USER || 'redmine_ro',
        POSTGRES_PASSWORD: formValues.POSTGRES_PASSWORD || 'readonly_pass',
        POSTGRES_DATABASE: formValues.POSTGRES_DATABASE || 'redmine_production'
      });
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseConfigs();
  }, []);

  // 保存MySQL配置
  const handleSaveMySQL = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      // 遍历表单值，保存每个配置
      const promises = Object.entries(values).map(async ([key, value]) => {
        await axios.post('/api/admin/configs', {
          key,
          value,
          type: 'database',
          description: getDescriptionForKey(key)
        });
      });

      await Promise.all(promises);
      message.success('MySQL配置保存成功');
      fetchDatabaseConfigs();
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存PostgreSQL配置
  const handleSavePostgreSQL = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      // 遍历表单值，保存每个配置
      const promises = Object.entries(values).map(async ([key, value]) => {
        await axios.post('/api/admin/configs', {
          key,
          value,
          type: 'database',
          description: getDescriptionForKey(key)
        });
      });

      await Promise.all(promises);
      message.success('PostgreSQL配置保存成功');
      fetchDatabaseConfigs();
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取配置键的描述
  const getDescriptionForKey = (key: string): string => {
    const descriptions: Record<string, string> = {
      'DATABASE_URL': '主数据库连接字符串',
      'POSTGRES_HOST': 'PostgreSQL主机',
      'POSTGRES_PORT': 'PostgreSQL端口',
      'POSTGRES_USER': 'PostgreSQL用户名',
      'POSTGRES_PASSWORD': 'PostgreSQL密码',
      'POSTGRES_DATABASE': 'PostgreSQL数据库名',
      'MYSQL_HOST': 'MySQL主机',
      'MYSQL_PORT': 'MySQL端口',
      'MYSQL_USER': 'MySQL用户名',
      'MYSQL_PASSWORD': 'MySQL密码',
      'MYSQL_DATABASE': 'MySQL数据库名'
    };
    return descriptions[key] || '';
  };

  return (
    <div>
      <Card title="数据库配置" style={{ marginBottom: 24 }}>
        <Text type="secondary">
          配置数据库连接信息，修改后需要重启服务才能生效
        </Text>
      </Card>

      <Card loading={loading}>
        <Tabs defaultActiveKey="mysql">
          <TabPane tab="MySQL配置" key="mysql">
            <Form
              form={mysqlForm}
              layout="vertical"
              onFinish={handleSaveMySQL}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  name="MYSQL_HOST"
                  label="主机"
                  rules={[{ required: true, message: '请输入主机地址' }]}
                >
                  <Input placeholder="请输入MySQL主机地址" />
                </Form.Item>

                <Form.Item
                  name="MYSQL_PORT"
                  label="端口"
                  rules={[{ required: true, message: '请输入端口号' }]}
                >
                  <Input placeholder="请输入MySQL端口号" />
                </Form.Item>

                <Form.Item
                  name="MYSQL_USER"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input placeholder="请输入MySQL用户名" />
                </Form.Item>

                <Form.Item
                  name="MYSQL_PASSWORD"
                  label="密码"
                >
                  <Password placeholder="请输入MySQL密码" allowClear />
                </Form.Item>

                <Form.Item
                  name="MYSQL_DATABASE"
                  label="数据库名"
                  rules={[{ required: true, message: '请输入数据库名' }]}
                >
                  <Input placeholder="请输入MySQL数据库名" />
                </Form.Item>
              </Space>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存MySQL配置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          <TabPane tab="PostgreSQL配置" key="postgres">
            <Form
              form={postgresForm}
              layout="vertical"
              onFinish={handleSavePostgreSQL}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  name="POSTGRES_HOST"
                  label="主机"
                  rules={[{ required: true, message: '请输入主机地址' }]}
                >
                  <Input placeholder="请输入PostgreSQL主机地址" />
                </Form.Item>

                <Form.Item
                  name="POSTGRES_PORT"
                  label="端口"
                  rules={[{ required: true, message: '请输入端口号' }]}
                >
                  <Input placeholder="请输入PostgreSQL端口号" />
                </Form.Item>

                <Form.Item
                  name="POSTGRES_USER"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input placeholder="请输入PostgreSQL用户名" />
                </Form.Item>

                <Form.Item
                  name="POSTGRES_PASSWORD"
                  label="密码"
                >
                  <Password placeholder="请输入PostgreSQL密码" allowClear />
                </Form.Item>

                <Form.Item
                  name="POSTGRES_DATABASE"
                  label="数据库名"
                  rules={[{ required: true, message: '请输入数据库名' }]}
                >
                  <Input placeholder="请输入PostgreSQL数据库名" />
                </Form.Item>
              </Space>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存PostgreSQL配置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default DatabaseConfigPage;