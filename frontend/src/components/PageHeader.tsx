import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getDefaultPageMeta, getModuleColor, ModuleType } from '../config/pageMeta';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { HomeOutlined, RightOutlined, UserOutlined, LogoutOutlined, LockOutlined } from '@ant-design/icons';
import { Dropdown, Avatar } from 'antd';
import UserProfileModal from './user/UserProfileModal';
import ResetPasswordModal from './user/ResetPasswordModal';

// 获取头像完整 URL
const getAvatarUrl = (avatar: string | null): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  return `${API_BASE_URL}${avatar}`;
};

/**
 * 获取模块显示名称
 */
const getModuleDisplayName = (module: ModuleType): string => {
  const moduleNames: Record<ModuleType, string> = {
    test: '测试管理',
    defect: '缺陷管理',
    app: '应用管理',
    admin: '系统管理',
  };
  return moduleNames[module] || '未知模块';
};

/**
 * 页面头部组件
 * 显示当前系统名称和功能模块路径
 */
const PageHeader: React.FC = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

  const currentPath = location.pathname;
  const pageMeta = getDefaultPageMeta(currentPath);
  const moduleColor = getModuleColor(pageMeta.module);
  const moduleName = getModuleDisplayName(pageMeta.module);

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

  return (
    <div
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        background: isDark
          ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)'
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰 - 极客模式下的科技感线条 */}
      {isDark && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              width: '30%',
              height: 1,
              background: `linear-gradient(90deg, transparent, ${moduleColor}40, transparent)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              width: '30%',
              height: 1,
              background: `linear-gradient(90deg, transparent, ${moduleColor}40, transparent)`,
            }}
          />
        </>
      )}

      {/* 左侧 - 系统名称 */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <HomeOutlined
          style={{
            fontSize: 16,
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
          }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
            letterSpacing: 1,
          }}
        >
          AITestCraft
        </span>
      </div>

      {/* 中间 - 模块路径 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 20px',
          borderRadius: 20,
          background: isDark
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {/* 模块标识点 */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: moduleColor,
            boxShadow: `0 0 8px ${moduleColor}`,
          }}
        />

        {/* 模块名称 */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
          }}
        >
          {moduleName}
        </span>

        {/* 分隔符 */}
        <RightOutlined
          style={{
            fontSize: 12,
            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
          }}
        />

        {/* 页面标题 */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
          }}
        >
          {pageMeta.title}
        </span>
      </div>

      {/* 右侧 - 用户信息 */}
      {isAuthenticated && user && (
        <div
          style={{
            position: 'absolute',
            right: 20,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <div
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 12px',
                height: '32px',
                background: 'transparent',
                borderRadius: '20px',
                border: `1px solid ${moduleColor}40`,
                verticalAlign: 'middle',
              }}
              className="user-dropdown-trigger"
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 15px ${moduleColor}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Avatar
                size={22}
                icon={<UserOutlined />}
                src={getAvatarUrl(user.avatar)}
                style={{
                  background: moduleColor,
                  boxShadow: `0 0 8px ${moduleColor}50`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                  maxWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: '32px',
                }}
              >
                {user.nickname || user.username}
              </span>
            </div>
          </Dropdown>
        </div>
      )}

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

export default PageHeader;
