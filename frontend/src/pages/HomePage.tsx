import React, { useState } from 'react';
import { Typography, Row, Col, Card, Dropdown, Avatar, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { MoonOutlined, SunOutlined, UserOutlined, LogoutOutlined, LockOutlined } from '@ant-design/icons';
import FeatureCard from '../components/FeatureCard';
import { LayoutModeIconSwitch } from '../components/LayoutModeIconSwitch';
import { QuickAccessIcons } from '../components/QuickAccessIcons';
import { featureCards } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useLayoutMode } from '../contexts/LayoutModeContext';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from '../components/user/UserProfileModal';
import ResetPasswordModal from '../components/user/ResetPasswordModal';

const { Title, Paragraph } = Typography;

// 获取头像完整 URL
const getAvatarUrl = (avatar: string | null): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  return `${API_BASE_URL}${avatar}`;
};

interface HomePageProps {
  hideModeSwitch?: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ hideModeSwitch = false }) => {
  const navigate = useNavigate();
  const { isDark, themeConfig, toggleTheme } = useTheme();
  const { layoutMode } = useLayoutMode();
  const { user, logout, isAuthenticated } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

  const primaryColor = (themeConfig.token?.colorPrimary as string) || '#1890ff';
  const isModern = layoutMode === 'modern';

  // 用户下拉菜单项
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => setProfileModalOpen(true),
    },
    {
      key: 'reset-password',
      icon: <LockOutlined />,
      label: '重置密码',
      onClick: () => setResetPasswordModalOpen(true),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: hideModeSwitch ? '24px' : '48px 24px',
        background: isDark ? '#0f172a' : '#f8fafc',
        position: 'relative',
        overflow: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* 右上角控制区：模式切换 + 主题切换 + 用户头像（仅在极客模式显示） */}
      {!hideModeSwitch && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 100,
          }}
        >
          {/* 模式切换 */}
          <LayoutModeIconSwitch size="home" />

          {/* 主题切换 */}
          <div
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '4px',
            }}
          >
            {/* 滑动开关 - 图标在圆圈内 */}
            <div
              style={{
                width: '56px',
                height: '28px',
                backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                borderRadius: '14px',
                position: 'relative',
                transition: 'all 0.3s ease',
                border: isDark ? '1px solid #00d4ff' : '1px solid #cbd5e1',
                boxShadow: isDark ? '0 0 15px rgba(0, 212, 255, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {/* 背景图标 - 月亮在左 */}
              <MoonOutlined
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: isDark ? '#00d4ff' : '#94a3b8',
                  transition: 'all 0.3s ease',
                  opacity: isDark ? 1 : 0.3,
                }}
              />
              
              {/* 背景图标 - 太阳在右 */}
              <SunOutlined
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: !isDark ? '#f59e0b' : '#64748b',
                  transition: 'all 0.3s ease',
                  opacity: !isDark ? 1 : 0.3,
                }}
              />
              
              {/* 滑动圆圈 - 包含当前状态的图标 */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: isDark ? '#00d4ff' : '#f59e0b',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '1px',
                  left: isDark ? '2px' : '30px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isDark 
                    ? '0 2px 8px rgba(0, 212, 255, 0.5)' 
                    : '0 2px 8px rgba(245, 158, 11, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* 圆圈内的图标 */}
                {isDark ? (
                  <MoonOutlined
                    style={{
                      fontSize: '14px',
                      color: '#0f172a',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ) : (
                  <SunOutlined
                    style={{
                      fontSize: '14px',
                      color: '#ffffff',
                      transition: 'all 0.3s ease',
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 用户头像和下拉菜单 */}
          {isAuthenticated && user && (
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Space
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                  transition: 'all 0.3s ease',
                }}
                className="user-dropdown-trigger"
              >
                <Avatar
                  size={28}
                  icon={<UserOutlined />}
                  src={getAvatarUrl(user.avatar)}
                  style={{
                    background: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}80`,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: isDark ? '#e2e8f0' : '#334155',
                    maxWidth: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.nickname || user.username}
                </span>
              </Space>
            </Dropdown>
          )}
        </div>
      )}

      {/* 主内容区域 - 包含 Card 和右侧快捷入口 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '100%',
          gap: 80,
        }}
      >
        {/* 圆角边框模块包裹 */}
        <Card
          style={{
            flex: 1,
            maxWidth: 1400,
            background: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
            borderRadius: 24,
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
          bodyStyle={{
            padding: hideModeSwitch ? '48px 32px' : '64px 48px',
          }}
        >
          {/* 英雄区域 */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: hideModeSwitch ? 48 : 64,
              animation: 'fadeInDown 0.6s ease-out',
            }}
          >
            <Title
              level={1}
              style={{
                marginBottom: 16,
                color: primaryColor,
                fontSize: hideModeSwitch ? 36 : 48,
                fontWeight: 700,
              }}
            >
              欢迎使用测试管理平台
            </Title>
            <Paragraph
              style={{
                fontSize: hideModeSwitch ? 16 : 18,
                color: isDark ? '#94a3b8' : '#64748b',
                maxWidth: 600,
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              全面的测试管理解决方案，集成AI辅助功能，让测试工作更高效、更智能
            </Paragraph>
          </div>

          {/* 功能卡片区域 */}
          <div
            style={{
              width: '100%',
              animation: 'fadeInUp 0.8s ease-out 0.2s both',
            }}
          >
            <Row gutter={[32, 32]} justify="center">
              {featureCards.map((feature, index) => (
                <Col
                  xs={24}
                  sm={12}
                  lg={6}
                  key={feature.path}
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${0.3 + index * 0.1}s both`,
                  }}
                >
                  <FeatureCard
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                    color={feature.color}
                    onClick={() => navigate(feature.path)}
                  />
                </Col>
              ))}
            </Row>
          </div>
        </Card>

        {/* 右侧快捷入口图标 - 仅在极客模式下显示 */}
        {isModern && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              flexShrink: 0,
            }}
          >
            <QuickAccessIcons layout="vertical" />
          </div>
        )}
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* 个人中心弹窗 */}
      <UserProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* 重置密码弹窗 */}
      <ResetPasswordModal
        open={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
      />
    </div>
  );
};

export default HomePage;
