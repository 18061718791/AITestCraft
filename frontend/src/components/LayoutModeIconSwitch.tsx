import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { RocketOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useLayoutMode } from '../contexts/LayoutModeContext';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutModeIconSwitchProps {
  className?: string;
  size?: 'small' | 'default' | 'home';
}

export const LayoutModeIconSwitch: React.FC<LayoutModeIconSwitchProps> = ({
  className,
  size = 'default'
}) => {
  const { layoutMode, toggleLayoutMode } = useLayoutMode();
  const { isDark } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const isModern = layoutMode === 'modern';
  // 极客模式显示经典模式图标，经典模式显示极客模式图标
  const tooltipTitle = isModern ? '切换到经典模式' : '切换到极客模式';

  // 首页使用更小的尺寸
  const iconSize = size === 'home' ? 14 : size === 'small' ? 14 : 18;
  const buttonSize = size === 'home' ? 28 : size === 'small' ? 28 : 36;

  // 极客模式显示经典模式图标（橙色），经典模式显示极客模式图标（蓝色）
  const icon = isModern ? <AppstoreOutlined /> : <RocketOutlined />;
  const gradient = isModern
    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'  // 经典模式：琥珀色
    : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)'; // 极客模式：青色
  const shadowColor = isModern
    ? 'rgba(245, 158, 11, 0.4)'
    : 'rgba(0, 212, 255, 0.4)';
  const hoverShadowColor = isModern
    ? 'rgba(245, 158, 11, 0.5)'
    : 'rgba(0, 212, 255, 0.5)';

  const handleClick = () => {
    setIsAnimating(true);
    toggleLayoutMode();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Tooltip
      title={tooltipTitle}
      placement="bottom"
      overlayClassName="layout-mode-tooltip"
      overlayStyle={{
        ['--tooltip-bg' as string]: isDark ? '#1f2937' : '#ffffff',
        ['--tooltip-color' as string]: isDark ? '#ffffff' : '#1f2937',
      }}
    >
      <div
        className={className}
        onClick={handleClick}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: gradient,
          boxShadow: `0 2px 8px ${shadowColor}`,
          transform: isAnimating ? 'scale(0.9) rotate(180deg)' : 'scale(1) rotate(0deg)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = isAnimating
            ? 'scale(0.9) rotate(180deg)'
            : 'scale(1.1) rotate(0deg)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${hoverShadowColor}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isAnimating
            ? 'scale(0.9) rotate(180deg)'
            : 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = `0 2px 8px ${shadowColor}`;
        }}
      >
        <div
          style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isAnimating ? 'scale(0.5) rotate(-180deg)' : 'scale(1) rotate(0deg)',
            opacity: isAnimating ? 0 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          <span
            style={{
              fontSize: iconSize,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </span>
        </div>
      </div>

      {/* Tooltip 自定义样式 */}
      <style>{`
        .layout-mode-tooltip .ant-tooltip-content {
          background: transparent !important;
          box-shadow: none !important;
        }

        .layout-mode-tooltip .ant-tooltip-inner {
          background-color: var(--tooltip-bg, #1f2937) !important;
          color: var(--tooltip-color, #ffffff) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          font-size: 13px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border: none !important;
        }

        .layout-mode-tooltip .ant-tooltip-arrow {
          background: transparent !important;
        }

        .layout-mode-tooltip .ant-tooltip-arrow::before {
          background-color: var(--tooltip-bg, #1f2937) !important;
          border: none !important;
          box-shadow: none !important;
        }

        .layout-mode-tooltip .ant-tooltip-arrow-content {
          background-color: var(--tooltip-bg, #1f2937) !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </Tooltip>
  );
};

export default LayoutModeIconSwitch;
