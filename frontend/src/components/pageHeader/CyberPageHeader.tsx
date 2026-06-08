import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import TodoStatsBadge from '../todoReminder/TodoStatsBadge';
import { Dropdown, Avatar, Space } from 'antd';
import { UserOutlined, LogoutOutlined, LockOutlined } from '@ant-design/icons';
import UserProfileModal from '../user/UserProfileModal';
import ResetPasswordModal from '../user/ResetPasswordModal';

// 获取头像完整 URL
const getAvatarUrl = (avatar: string | null): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  return `${API_BASE_URL}${avatar}`;
};

interface CyberPageHeaderProps {
  platformName: string;
  systemName: string;
  moduleName: string;
  variant?: 'cyber-card' | 'hologram';
}

/**
 * 极客风格页面头部组件
 * variant: 'cyber-card' - 方案一：悬浮科技卡片式
 * variant: 'hologram' - 方案二：全息投影式
 */
export const CyberPageHeader: React.FC<CyberPageHeaderProps> = ({
  platformName,
  systemName,
  moduleName,
  variant = 'cyber-card',
}) => {
  const { isDark } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  // 根据主题使用不同的主色：暗色用青色，亮色用亮蓝
  const primaryColor = isDark ? '#00d4ff' : '#3b82f6';

  // 用户下拉菜单项
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => setProfileModalOpen(true),
      style: { padding: '10px 16px' },
    },
    {
      key: 'reset-password',
      icon: <LockOutlined />,
      label: '重置密码',
      onClick: () => setResetPasswordModalOpen(true),
      style: { padding: '10px 16px' },
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
      style: { padding: '10px 16px' },
    },
  ];

  if (variant === 'hologram') {
    // 方案二：全息投影式
    return (
      <div
        style={{
          position: 'relative',
          marginBottom: 24,
          padding: '20px 0',
        }}
      >
        {/* 全息投影面板 */}
        <div
          style={{
            position: 'relative',
            background: isDark
              ? 'linear-gradient(180deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 212, 255, 0.02) 100%)'
              : 'linear-gradient(180deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 212, 255, 0.05) 100%)',
            border: `1px solid ${primaryColor}40`,
            borderRadius: 4,
            padding: '16px 24px',
            boxShadow: `0 0 30px ${primaryColor}20, inset 0 0 20px ${primaryColor}10`,
            overflow: 'hidden',
          }}
        >
          {/* 扫描线效果 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
              animation: 'scanLine 3s linear infinite',
              opacity: 0.6,
            }}
          />

          {/* 内容区域 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* 左侧：平台名称 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  fontSize: 12,
                  color: primaryColor,
                  fontFamily: 'monospace',
                  letterSpacing: 2,
                }}
              >
                {'>'} SYSTEM
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontFamily: 'monospace',
                  textShadow: isDark ? `0 0 10px ${primaryColor}` : 'none',
                }}
              >
                {platformName}
              </span>
            </div>

            {/* 右侧：系统/模块标签 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  padding: '4px 12px',
                  background: `${primaryColor}15`,
                  border: `1px solid ${primaryColor}40`,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: primaryColor,
                    borderRadius: '50%',
                    boxShadow: `0 0 8px ${primaryColor}`,
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: primaryColor,
                    fontFamily: 'monospace',
                  }}
                >
                  {systemName}
                </span>
              </div>

              <div
                style={{
                  padding: '4px 12px',
                  background: `${primaryColor}10`,
                  border: `1px solid ${primaryColor}30`,
                  borderRadius: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontFamily: 'monospace',
                  }}
                >
                  {moduleName}
                </span>
              </div>
            </div>
          </div>

          {/* 底部装饰线 */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${primaryColor}60, transparent)`,
            }}
          />
        </div>

        {/* 动画样式 */}
        <style>{`
          @keyframes scanLine {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translateY(60px); opacity: 0; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // 方案一：悬浮科技卡片式
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 24,
        padding: '8px 20px',
        background: isDark
          ? 'rgba(30, 41, 59, 0.8)'
          : 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        border: `1px solid ${primaryColor}40`,
        boxShadow: isDark
          ? `0 4px 20px ${primaryColor}20, 0 0 0 1px ${primaryColor}10`
          : `0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px ${primaryColor}20`,
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
      }}
    >
      {/* 流光边框效果 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
          animation: 'dataFlow 3s linear infinite',
        }}
      />

      {/* 内容区域 - 使用 Flex 布局 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* 左侧：平台名称（居中） */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 科技装饰符号 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: primaryColor,
                fontSize: 14,
              }}
            >
              <span>◤</span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: primaryColor,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${primaryColor}`,
                }}
              />
              <span>◥</span>
            </div>

            {/* 平台名称 */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  letterSpacing: 1,
                  textShadow: isDark ? `0 0 20px ${primaryColor}40` : 'none',
                }}
              >
                {platformName}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: primaryColor,
                  letterSpacing: 3,
                  marginTop: 1,
                  opacity: 0.8,
                }}
              >
                AUTOMATED TESTING PLATFORM
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：我的待办统计徽章 + 系统/模块信息卡片 + 用户头像 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 我的待办统计徽章 */}
          <TodoStatsBadge />

          {/* 系统/模块信息卡片 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: '6px 14px',
            minWidth: 200,
            background: isDark ? 'transparent' : 'rgba(0, 212, 255, 0.12)',
            borderRadius: 10,
            border: `1px solid ${primaryColor}40`,
            boxShadow: `0 0 15px ${primaryColor}15`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >

          {/* System 行 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: isDark ? '#64748b' : '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              system
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: primaryColor,
                letterSpacing: 0.5,
                textShadow: `0 0 10px ${primaryColor}40`,
                whiteSpace: 'nowrap',
              }}
            >
              {systemName}
            </span>
          </div>

          {/* 分隔线 */}
          <div
            style={{
              width: 1,
              height: 20,
              background: `linear-gradient(180deg, transparent, ${primaryColor}50, transparent)`,
            }}
          />

          {/* Module 行 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: isDark ? '#64748b' : '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              module
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: isDark ? '#e2e8f0' : '#334155',
                whiteSpace: 'nowrap',
              }}
            >
              {moduleName}
            </span>
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
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'transparent',
                  borderRadius: '20px',
                  border: `1px solid ${primaryColor}40`,
                }}
                className="user-dropdown-trigger"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark
                    ? 'rgba(0, 212, 255, 0.1)'
                    : 'rgba(0, 212, 255, 0.15)';
                  e.currentTarget.style.boxShadow = `0 0 15px ${primaryColor}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
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
      </div>

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

      {/* 动画样式 */}
      <style>{`
        @keyframes dataFlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default CyberPageHeader;
