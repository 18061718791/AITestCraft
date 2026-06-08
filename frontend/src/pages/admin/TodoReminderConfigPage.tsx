/**
 * 我的待办提醒配置页面
 * 用于设置提醒功能的启用状态和检查间隔
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Switch,
  InputNumber,
  Button,
  message,
  Typography,
  Divider,
  Space,
  Alert,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  BellOutlined,
  SettingOutlined,
  ReloadOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { TodoReminderConfig, CONFIG_RULES, NewTodoData } from '../../types/todoReminder';
import storage from '../../services/todoReminder/storage';
import baselineManager from '../../services/todoReminder/baselineManager';
import reminderService from '../../services/todoReminder/reminderService';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { TodoReminderToast } from '../../components/todoReminder/TodoReminderToast';

const { Title, Paragraph } = Typography;

/**
 * 配置页面组件
 */
const TodoReminderConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<TodoReminderConfig | null>(null);
  const [stats, setStats] = useState({
    projectCount: 0,
    totalTodoCount: 0,
    lastUpdated: null as string | null,
  });
  // 弹窗相关状态
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [newTodoData, setNewTodoData] = useState<NewTodoData | null>(null);
  const { isDark } = useTheme();
  const { user } = useAuth();

  // 加载配置
  useEffect(() => {
    // 初始化当前用户
    if (user) {
      reminderService.initialize(user.id, user.username);
    }
    loadConfig();
    loadStats();
  }, [user]);

  /**
   * 加载配置
   */
  const loadConfig = () => {
    const savedConfig = storage.getConfig();
    setConfig(savedConfig);
    form.setFieldsValue({
      enabled: savedConfig.enabled,
      intervalSeconds: savedConfig.intervalSeconds,
      // 存储的是毫秒，显示转换为秒
      autoHideDelay: Math.round((savedConfig.autoHideDelay || CONFIG_RULES.DEFAULT_AUTO_HIDE * 1000) / 1000),
    });
  };

  /**
   * 加载统计信息
   */
  const loadStats = () => {
    const baselineStats = baselineManager.getBaselineStats();
    setStats(baselineStats);
  };

  /**
   * 保存配置
   */
  const handleSave = async (values: {
    enabled: boolean;
    intervalSeconds: number;
    autoHideDelay: number;
  }) => {
    setLoading(true);
    try {
      // 验证输入
      if (
        values.intervalSeconds < CONFIG_RULES.MIN_INTERVAL ||
        values.intervalSeconds > CONFIG_RULES.MAX_INTERVAL
      ) {
        message.error(
          `检查间隔必须在 ${CONFIG_RULES.MIN_INTERVAL}-${CONFIG_RULES.MAX_INTERVAL} 秒之间`
        );
        return;
      }

      if (
        values.autoHideDelay < CONFIG_RULES.MIN_AUTO_HIDE ||
        values.autoHideDelay > CONFIG_RULES.MAX_AUTO_HIDE
      ) {
        message.error(
          `自动隐藏时间必须在 ${CONFIG_RULES.MIN_AUTO_HIDE}-${CONFIG_RULES.MAX_AUTO_HIDE} 秒之间`
        );
        return;
      }

      // 保存配置（将秒转换为毫秒存储）
      storage.saveConfig({
        enabled: values.enabled,
        intervalSeconds: values.intervalSeconds,
        autoHideDelay: values.autoHideDelay * 1000,
      });

      // 更新本地状态
      setConfig({
        ...config!,
        enabled: values.enabled,
        intervalSeconds: values.intervalSeconds,
        autoHideDelay: values.autoHideDelay * 1000,
      });

      message.success('配置保存成功');
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置基准数据
   */
  const handleResetBaseline = () => {
    baselineManager.clearBaseline();
    loadStats();
    message.success('基准数据已重置');
  };

  /**
   * 重置所有数据
   */
  const handleResetAll = () => {
    reminderService.resetAll();
    loadConfig();
    loadStats();
    message.success('所有数据已重置');
  };

  /**
   * 立即检查
   */
  const handleCheckNow = async () => {
    setLoading(true);
    try {
      // 传递当前用户信息以支持数据隔离
      const userId = user?.id;
      const username = user?.username;
      const result = await reminderService.checkNow(userId, username);
      if (result && result.totalCount > 0) {
        message.success(`发现 ${result.totalCount} 条新增待办`);
        // 显示右下角弹窗提醒
        setNewTodoData(result);
        setIsToastVisible(true);
      } else {
        message.info('暂无新增待办');
      }
      loadStats();
    } catch (error) {
      console.error('检查失败:', error);
      message.error('检查失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 关闭弹窗
   */
  const handleToastClose = () => {
    setIsToastVisible(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>
        <BellOutlined /> 我的待办提醒配置
      </Title>
      <Paragraph type="secondary">
        配置待办提醒功能的启用状态和检查频率，系统将自动检测新的待办任务并提醒您。
      </Paragraph>

      <Divider />

      {/* 统计信息 */}
      <Card title="当前状态" style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="监控项目数"
              value={stats.projectCount}
              suffix="个"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="当前待办总数"
              value={stats.totalTodoCount}
              suffix="条"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="上次更新"
              value={stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : '从未'}
            />
          </Col>
        </Row>
      </Card>

      {/* 配置表单 */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>提醒设置</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            enabled: true,
            intervalSeconds: CONFIG_RULES.DEFAULT_INTERVAL,
          }}
        >
          <Form.Item
            name="enabled"
            label="启用待办提醒"
            valuePropName="checked"
            extra="关闭后将停止自动检查待办"
          >
            <Switch
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </Form.Item>

          <Form.Item
            name="intervalSeconds"
            label="检查间隔时间（秒）"
            extra={`建议设置为 ${CONFIG_RULES.DEFAULT_INTERVAL} 秒，范围：${CONFIG_RULES.MIN_INTERVAL}-${CONFIG_RULES.MAX_INTERVAL} 秒`}
            rules={[
              { required: true, message: '请输入检查间隔' },
              {
                type: 'number',
                min: CONFIG_RULES.MIN_INTERVAL,
                max: CONFIG_RULES.MAX_INTERVAL,
                message: `间隔时间必须在 ${CONFIG_RULES.MIN_INTERVAL}-${CONFIG_RULES.MAX_INTERVAL} 秒之间`,
              },
            ]}
          >
            <InputNumber
              min={CONFIG_RULES.MIN_INTERVAL}
              max={CONFIG_RULES.MAX_INTERVAL}
              step={10}
              style={{ width: '200px' }}
              addonAfter="秒"
            />
          </Form.Item>

          <Form.Item
            name="autoHideDelay"
            label="自动隐藏时间（秒）"
            extra={`建议设置为 ${CONFIG_RULES.DEFAULT_AUTO_HIDE} 秒，范围：${CONFIG_RULES.MIN_AUTO_HIDE}-${CONFIG_RULES.MAX_AUTO_HIDE} 秒。鼠标悬停时会暂停计时`}
            rules={[
              { required: true, message: '请输入自动隐藏时间' },
              {
                type: 'number',
                min: CONFIG_RULES.MIN_AUTO_HIDE,
                max: CONFIG_RULES.MAX_AUTO_HIDE,
                message: `自动隐藏时间必须在 ${CONFIG_RULES.MIN_AUTO_HIDE}-${CONFIG_RULES.MAX_AUTO_HIDE} 秒之间`,
              },
            ]}
          >
            <InputNumber
              min={CONFIG_RULES.MIN_AUTO_HIDE}
              max={CONFIG_RULES.MAX_AUTO_HIDE}
              step={1}
              style={{ width: '200px' }}
              addonAfter="秒"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
              >
                保存设置
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleCheckNow}
                loading={loading}
              >
                立即检查
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 说明信息 */}
      <Alert
        message="功能说明"
        description={
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>启用后，系统将按照设定的时间间隔自动检查新的待办任务</li>
            <li>当有新待办产生时，会在页面右下角弹出提醒</li>
            <li>点击提醒弹窗可快速跳转到我的待办页面</li>
            <li>鼠标悬停提醒弹窗可查看各项目新增缺陷ID列表</li>
            <li>基准数据会保存在浏览器本地，页面刷新后仍然有效</li>
          </ul>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{
          marginBottom: '24px',
          background: isDark ? 'transparent' : undefined,
          border: isDark ? '1px solid rgba(0, 212, 255, 0.5)' : undefined,
        }}
      />

      {/* 高级操作 */}
      <Card
        title="高级操作"
        type="inner"
        style={{
          background: isDark ? 'transparent' : undefined,
          border: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
        }}
        headStyle={{
          background: isDark ? 'transparent' : undefined,
          borderBottom: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
        }}
        bodyStyle={{
          background: isDark ? 'transparent' : undefined,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="重置基准数据"
            description="清除所有项目的待办基准记录，下次检查时将重新建立基准"
            type="warning"
            showIcon
            style={{
              background: isDark ? 'transparent' : undefined,
              border: isDark ? '1px solid rgba(250, 173, 20, 0.5)' : undefined,
            }}
            action={
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleResetBaseline}
              >
                重置基准
              </Button>
            }
          />
          <Alert
            message="重置所有数据"
            description="清除所有配置和基准数据，恢复到初始状态"
            type="error"
            showIcon
            style={{
              background: isDark ? 'transparent' : undefined,
              border: isDark ? '1px solid rgba(255, 77, 79, 0.5)' : undefined,
            }}
            action={
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleResetAll}
              >
                全部重置
              </Button>
            }
          />
        </Space>
      </Card>

      {/* 待办提醒弹窗 */}
      <TodoReminderToast
        visible={isToastVisible}
        newTodoData={newTodoData}
        onClose={handleToastClose}
        autoCloseDelay={config?.autoHideDelay || 5000}
      />
    </div>
  );
};

export default TodoReminderConfigPage;
