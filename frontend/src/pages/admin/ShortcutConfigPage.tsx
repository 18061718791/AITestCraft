/**
 * 快捷键配置页面
 * 用于配置和管理系统快捷键
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  message,
  Typography,
  Space,
  Alert,
  Switch,
  Divider,
  Row,
  Col,
  Tag,
  Modal,
  Tooltip,
} from 'antd';
import {
  KeyOutlined,
  SettingOutlined,
  ReloadOutlined,
  EditOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined,
  DownOutlined,
} from '@ant-design/icons';
import {
  ShortcutAction,
  ShortcutConfig,
  defaultShortcuts,
  checkShortcutConflict,
  shortcutToString,
  eventToShortcutConfig,
  validateShortcut,
} from '../../config/shortcutConfig';
import { useShortcut } from '../../contexts/ShortcutContext';
import { useTheme } from '../../contexts/ThemeContext';

const { Title, Paragraph, Text } = Typography;

/**
 * 快捷键项配置
 */
interface ShortcutItem {
  action: ShortcutAction;
  label: string;
  description: string;
  icon: React.ReactNode;
}

/**
 * 快捷键列表配置
 */
const shortcutItems: ShortcutItem[] = [
  {
    action: 'toggleLeftPanel',
    label: '左侧栏',
    description: '切换左侧栏的显示/隐藏状态',
    icon: <LeftOutlined />,
  },
  {
    action: 'toggleRightPanel',
    label: '右侧栏',
    description: '切换右侧栏的显示/隐藏状态',
    icon: <RightOutlined />,
  },
  {
    action: 'toggleBottomPanel',
    label: '底部任务窗口',
    description: '切换底部任务窗口的显示/隐藏状态',
    icon: <DownOutlined />,
  },
];

/**
 * 快捷键配置卡片组件
 */
interface ShortcutCardProps {
  item: ShortcutItem;
  config: ShortcutConfig;
  onEdit: () => void;
  onReset: () => void;
  isDefault: boolean;
  conflict?: string | null;
}

const ShortcutCard: React.FC<ShortcutCardProps> = ({
  item,
  config,
  onEdit,
  onReset,
  isDefault,
  conflict,
}) => {
  const { isDark } = useTheme();
  const shortcutStr = shortcutToString(config);

  return (
    <Card
      className={isDark ? 'cyber-card' : ''}
      style={{
        marginBottom: 16,
        background: isDark ? 'rgba(10, 15, 30, 0.8)' : undefined,
        border: isDark
          ? conflict
            ? '1px solid rgba(255, 77, 79, 0.5)'
            : '1px solid rgba(0, 212, 255, 0.3)'
          : undefined,
      }}
      bodyStyle={{
        background: isDark ? 'transparent' : undefined,
      }}
    >
      <Row align="middle" justify="space-between" style={{ flexWrap: 'nowrap' }}>
        {/* 左侧：操作对象名称和描述 - 固定宽度 */}
        <Col style={{ width: '200px', flexShrink: 0 }}>
          <Space direction="vertical" size={4}>
            <Space>
              <Text strong style={{ fontSize: 16, color: isDark ? '#00d4ff' : undefined }}>
                {item.icon} {item.label}
              </Text>
              {!isDefault && (
                <Tag color="blue" style={{ fontSize: 12 }}>
                  已修改
                </Tag>
              )}
              {conflict && (
                <Tooltip title={conflict}>
                  <Tag icon={<WarningOutlined />} color="error" style={{ fontSize: 12 }}>
                    冲突
                  </Tag>
                </Tooltip>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {item.description}
            </Text>
          </Space>
        </Col>

        {/* 中间：快捷键显示 - 固定宽度，绝对居中 */}
        <Col style={{ width: '160px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              padding: '8px 16px',
              fontFamily: 'monospace',
              fontSize: 16,
              fontWeight: 'bold',
              color: conflict ? '#ff4d4f' : isDark ? '#00d4ff' : '#1890ff',
              textAlign: 'center',
              width: '100%',
              background: isDark ? 'rgba(0, 212, 255, 0.1)' : 'rgba(24, 144, 255, 0.1)',
              borderRadius: 6,
              border: `1px solid ${conflict ? '#ff4d4f' : isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(24, 144, 255, 0.3)'}`,
            }}
          >
            {shortcutStr}
          </div>
        </Col>

        {/* 右侧：操作按钮 - 固定宽度，右对齐 */}
        <Col style={{ width: '180px', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <Space size={12}>
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={onEdit}
              style={
                isDark
                  ? {
                      background: 'transparent',
                      borderColor: '#00d4ff',
                      color: '#00d4ff',
                    }
                  : undefined
              }
            >
              修改
            </Button>
            {/* 使用占位符保持按钮位置固定 */}
            {isDefault ? (
              <div style={{ width: '76px' }} />
            ) : (
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={onReset}
                style={
                  isDark
                    ? {
                        background: 'transparent',
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        color: 'rgba(255, 255, 255, 0.8)',
                      }
                    : undefined
                }
              >
                恢复默认
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

/**
 * 按键捕获模态框
 */
interface KeyCaptureModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (config: ShortcutConfig) => void;
  title: string;
}

const KeyCaptureModal: React.FC<KeyCaptureModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  title,
}) => {
  const [capturedConfig, setCapturedConfig] = useState<ShortcutConfig | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isActivated, setIsActivated] = useState(false); // 编辑区域是否已激活
  const { isDark } = useTheme();
  const inputRef = useRef<HTMLDivElement>(null);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // 忽略单独的修饰键
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
        return;
      }

      const config = eventToShortcutConfig(event);
      config.description = title;
      setCapturedConfig(config);

      // 验证快捷键
      const validation = validateShortcut(config);
      if (!validation.valid) {
        setValidationError(validation.message || '无效的快捷键');
      } else {
        setValidationError(null);
      }
    },
    [title]
  );

  // 模态框打开时重置状态
  useEffect(() => {
    if (visible) {
      setCapturedConfig(null);
      setValidationError(null);
      setIsActivated(false);
    }
  }, [visible]);

  // 添加/移除键盘事件监听 - 仅在已激活且未捕获快捷键时监听
  useEffect(() => {
    if (visible && isActivated && !capturedConfig) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [visible, isActivated, capturedConfig, handleKeyDown]);

  // 点击激活编辑区域
  const handleActivate = useCallback(() => {
    if (!capturedConfig) {
      setIsActivated(true);
    }
  }, [capturedConfig]);

  const handleConfirm = () => {
    if (capturedConfig && !validationError) {
      onConfirm(capturedConfig);
    }
  };

  return (
    <Modal
      title={`修改 ${title} 快捷键`}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button 
          key="cancel" 
          onClick={onCancel}
          style={
            isDark
              ? {
                  background: 'transparent',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'rgba(255, 255, 255, 0.8)',
                }
              : undefined
          }
        >
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={!capturedConfig || !!validationError}
          style={
            isDark
              ? {
                  background: capturedConfig && !validationError ? '#00d4ff' : 'rgba(0, 212, 255, 0.3)',
                  borderColor: '#00d4ff',
                  color: '#000',
                }
              : undefined
          }
        >
          确认
        </Button>,
      ]}
      styles={{
        header: {
          background: isDark ? 'rgba(10, 15, 30, 0.95)' : undefined,
          borderBottom: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
          color: isDark ? '#00d4ff' : undefined,
        },
        body: {
          background: isDark ? 'rgba(10, 15, 30, 0.95)' : undefined,
        },
        footer: {
          borderTop: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
        },
        mask: {
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : undefined,
        },
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <div>
          <Text strong style={{ color: isDark ? '#00d4ff' : '#1890ff', display: 'block', marginBottom: 8, fontSize: 16 }}>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            按键捕获模式
          </Text>
          <Text style={{ color: isDark ? 'rgba(255, 255, 255, 0.8)' : undefined }}>
            请在下方区域按下您想要设置的快捷键组合。支持 Ctrl、Alt、Shift 等修饰键与普通按键的组合。
          </Text>
        </div>

        <div
          ref={inputRef}
          tabIndex={0}
          className="key-capture-area"
          onClick={handleActivate}
          style={{
            padding: '40px',
            textAlign: 'center',
            borderRadius: 8,
            outline: 'none',
            cursor: capturedConfig ? 'default' : 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            // 根据状态设置边框和背景
            ...(capturedConfig
              ? {
                  border: `2px solid ${validationError ? '#ff4d4f' : '#52c41a'}`,
                  background: isDark
                    ? validationError
                      ? 'rgba(255, 77, 79, 0.1)'
                      : 'rgba(82, 196, 26, 0.1)'
                    : validationError
                      ? 'rgba(255, 77, 79, 0.05)'
                      : 'rgba(82, 196, 26, 0.05)',
                }
              : isActivated
                ? {
                    border: `2px solid ${isDark ? '#00d4ff' : '#1890ff'}`,
                    background: isDark ? 'rgba(0, 212, 255, 0.1)' : 'rgba(24, 144, 255, 0.1)',
                    boxShadow: `0 0 20px ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(24, 144, 255, 0.3)'}`,
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  }
                : {
                    border: `2px dashed ${isDark ? 'rgba(0, 212, 255, 0.3)' : '#d9d9d9'}`,
                    background: 'transparent',
                  }),
          }}
        >
          {capturedConfig ? (
            <div>
              <div
                style={{
                  fontSize: 32,
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: validationError ? '#ff4d4f' : isDark ? '#00d4ff' : '#1890ff',
                  marginBottom: 8,
                }}
              >
                {shortcutToString(capturedConfig)}
              </div>
              {validationError ? (
                <Text type="danger">
                  <WarningOutlined /> {validationError}
                </Text>
              ) : (
                <Text type="success">
                  <CheckCircleOutlined /> 快捷键有效
                </Text>
              )}
            </div>
          ) : isActivated ? (
            <Text
              style={{
                fontSize: 16,
                color: isDark ? '#00d4ff' : '#1890ff',
                fontWeight: 'bold',
              }}
            >
              已激活，请按下快捷键...
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 16 }}>
              点击此处激活，然后按下快捷键...
            </Text>
          )}
        </div>

        {/* 脉冲动画样式 */}
        <style>{`
          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 20px ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(24, 144, 255, 0.3)'};
            }
            50% {
              box-shadow: 0 0 30px ${isDark ? 'rgba(0, 212, 255, 0.5)' : 'rgba(24, 144, 255, 0.5)'};
            }
          }
        `}</style>

        <div style={{ fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#888' }}>
          <Text strong>提示：</Text>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>普通按键必须与 Ctrl、Alt、Shift 等修饰键组合使用</li>
            <li>避免使用 F1-F12、Ctrl+S、Ctrl+C 等系统保留快捷键</li>
            <li>方向键和功能键可以直接作为快捷键</li>
          </ul>
        </div>
      </Space>
    </Modal>
  );
};

/**
 * 快捷键配置页面主组件
 */
const ShortcutConfigPage: React.FC = () => {
  const {
    shortcuts,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    isEnabled,
    setIsEnabled,
    getShortcutString,
  } = useShortcut();
  const { isDark } = useTheme();
  const [editingAction, setEditingAction] = useState<ShortcutAction | null>(null);
  const [conflicts, setConflicts] = useState<Record<ShortcutAction, string | null>>({
    toggleLeftPanel: null,
    toggleRightPanel: null,
    toggleBottomPanel: null,
  });

  // 检查所有快捷键的冲突情况
  useEffect(() => {
    const newConflicts: Record<ShortcutAction, string | null> = {
      toggleLeftPanel: null,
      toggleRightPanel: null,
      toggleBottomPanel: null,
    };

    (Object.keys(shortcuts) as ShortcutAction[]).forEach((action) => {
      const conflict = checkShortcutConflict(shortcuts[action]);
      if (conflict) {
        newConflicts[action] = conflict;
      }
    });

    setConflicts(newConflicts);
  }, [shortcuts]);

  // 处理编辑快捷键
  const handleEdit = (action: ShortcutAction) => {
    setEditingAction(action);
  };

  // 处理保存快捷键
  const handleSave = (action: ShortcutAction, config: ShortcutConfig) => {
    const result = updateShortcut(action, config);
    if (result.success) {
      message.success(`快捷键已更新为 ${getShortcutString(action)}`);
      setEditingAction(null);
    } else {
      message.error(result.message || '更新失败');
    }
  };

  // 处理重置单个快捷键
  const handleReset = async (action: ShortcutAction) => {
    try {
      await resetShortcut(action);
      message.success('已恢复默认快捷键');
    } catch (error) {
      message.error('恢复默认快捷键失败');
    }
  };

  // 处理重置所有快捷键
  const handleResetAll = () => {
    Modal.confirm({
      title: '确认恢复默认设置？',
      content: '这将重置所有快捷键为系统默认值，您的自定义设置将丢失。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await resetAllShortcuts();
          message.success('所有快捷键已恢复默认设置');
        } catch (error) {
          message.error('恢复默认设置失败');
        }
      },
    });
  };

  // 检查是否有任何快捷键被修改
  const hasCustomShortcuts = (Object.keys(shortcuts) as ShortcutAction[]).some(
    (action) => {
      const current = shortcuts[action];
      const default_ = defaultShortcuts[action];
      return (
        current.key !== default_.key ||
        !!current.ctrlKey !== !!default_.ctrlKey ||
        !!current.altKey !== !!default_.altKey ||
        !!current.shiftKey !== !!default_.shiftKey ||
        !!current.metaKey !== !!default_.metaKey
      );
    }
  );

  // 检查是否有冲突
  const hasConflicts = Object.values(conflicts).some((c) => c !== null);

  // 获取当前编辑的快捷键项
  const editingItem = editingAction
    ? shortcutItems.find((item) => item.action === editingAction)
    : null;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <Title level={2} style={{ color: isDark ? '#00d4ff' : undefined }}>
        <KeyOutlined /> 快捷键配置
      </Title>
      <Paragraph type="secondary">
        自定义系统快捷键，提高操作效率。支持按键捕获模式，实时检测快捷键冲突。
      </Paragraph>

      <Divider />

      {/* 全局开关 */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>全局设置</span>
          </Space>
        }
        style={{
          marginBottom: 24,
          background: isDark ? 'rgba(10, 15, 30, 0.8)' : undefined,
          border: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
        }}
        bodyStyle={{
          background: isDark ? 'transparent' : undefined,
        }}
        headStyle={{
          background: isDark ? 'transparent' : undefined,
          borderBottom: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
          color: isDark ? '#00d4ff' : undefined,
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={4}>
              <Text strong style={{ color: isDark ? '#fff' : undefined }}>
                启用快捷键
              </Text>
              <Text type="secondary">关闭后将禁用所有系统快捷键</Text>
            </Space>
          </Col>
          <Col>
            <Switch
              checked={isEnabled}
              onChange={setIsEnabled}
              checkedChildren="开启"
              unCheckedChildren="关闭"
              style={
                isDark
                  ? {
                      backgroundColor: isEnabled ? '#00d4ff' : '#555555',
                    }
                  : {
                      backgroundColor: isEnabled ? '#00d4ff' : '#d9d9d9',
                    }
              }
            />
          </Col>
        </Row>
      </Card>

      {/* 冲突警告 */}
      {hasConflicts && (
        <Alert
          message="检测到快捷键冲突"
          description="部分快捷键与浏览器或系统快捷键冲突，可能导致功能无法正常使用。建议修改为其他组合键。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 快捷键列表 */}
      <Card
        title={
          <Space>
            <KeyOutlined />
            <span>快捷键设置</span>
          </Space>
        }
        extra={
          hasCustomShortcuts && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetAll}
              danger
              size="small"
            >
              恢复全部默认
            </Button>
          )
        }
        style={{
          marginBottom: 24,
          background: isDark ? 'rgba(10, 15, 30, 0.8)' : undefined,
          border: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
        }}
        bodyStyle={{
          background: isDark ? 'transparent' : undefined,
        }}
        headStyle={{
          background: isDark ? 'transparent' : undefined,
          borderBottom: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
          color: isDark ? '#00d4ff' : undefined,
        }}
      >
        {shortcutItems.map((item) => {
          const config = shortcuts[item.action];
          const defaultConfig = defaultShortcuts[item.action];
          const isDefault =
            config.key === defaultConfig.key &&
            !!config.ctrlKey === !!defaultConfig.ctrlKey &&
            !!config.altKey === !!defaultConfig.altKey &&
            !!config.shiftKey === !!defaultConfig.shiftKey &&
            !!config.metaKey === !!defaultConfig.metaKey;

          return (
            <ShortcutCard
              key={item.action}
              item={item}
              config={config}
              onEdit={() => handleEdit(item.action)}
              onReset={() => handleReset(item.action)}
              isDefault={isDefault}
              conflict={conflicts[item.action]}
            />
          );
        })}
      </Card>

      {/* 说明信息 */}
      <Card
        title={
          <Space>
            <InfoCircleOutlined />
            <span>使用说明</span>
          </Space>
        }
        style={{
          marginBottom: 24,
          background: isDark ? 'rgba(10, 15, 30, 0.8)' : undefined,
          border: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
        }}
        bodyStyle={{
          background: isDark ? 'transparent' : undefined,
        }}
        headStyle={{
          background: isDark ? 'transparent' : undefined,
          borderBottom: isDark ? '1px solid rgba(0, 212, 255, 0.3)' : undefined,
          color: isDark ? '#00d4ff' : undefined,
        }}
      >
        <ul style={{ margin: 0, paddingLeft: '20px', color: isDark ? 'rgba(255, 255, 255, 0.8)' : undefined }}>
          <li>点击"修改"按钮进入按键捕获模式，按下想要的快捷键组合即可</li>
          <li>系统会自动检测快捷键是否与浏览器/系统功能冲突</li>
          <li>如果检测到冲突，建议更换其他快捷键组合</li>
          <li>修改后的设置会自动保存到浏览器本地存储</li>
          <li>您可以随时恢复单个或全部快捷键为默认设置</li>
        </ul>
      </Card>

      {/* 按键捕获模态框 */}
      <KeyCaptureModal
        visible={!!editingAction}
        onCancel={() => setEditingAction(null)}
        onConfirm={(config) =>
          editingAction && handleSave(editingAction, config)
        }
        title={editingItem?.label || ''}
      />
    </div>
  );
};

export default ShortcutConfigPage;
