import React, { useState } from 'react';
import { Tooltip, Badge } from 'antd';
import { CheckSquareOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface QuickAccessItem {
  key: string;
  title: string;
  icon: React.ReactNode;
  path: string;
  gradient: string;
  shadowColor: string;
  badge?: number;
}

interface QuickAccessIconsProps {
  layout?: 'horizontal' | 'vertical';
}

export const QuickAccessIcons: React.FC<QuickAccessIconsProps> = ({ 
  layout = 'horizontal' 
}) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [animatingKey, setAnimatingKey] = useState<string | null>(null);

  // 快捷入口配置
  const quickAccessItems: QuickAccessItem[] = [
    {
      key: 'todo',
      title: '我的待办',
      icon: <CheckSquareOutlined />,
      path: '/defects/todo',
      gradient: isDark 
        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'  // 极客模式：翠绿渐变
        : 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', // 亮色模式：浅绿渐变
      shadowColor: isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.4)',
      badge: 0, // 可以接入真实待办数量
    },
    {
      key: 'assistant',
      title: '缺陷助手',
      icon: <RobotOutlined />,
      path: '/defects/assistant',
      gradient: isDark 
        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'  // 极客模式：琥珀渐变
        : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', // 亮色模式：金黄渐变
      shadowColor: isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(245, 158, 11, 0.4)',
    },
  ];

  const handleClick = (item: QuickAccessItem) => {
    setAnimatingKey(item.key);
    setTimeout(() => {
      setAnimatingKey(null);
      navigate(item.path);
    }, 200);
  };

  const isVertical = layout === 'vertical';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        gap: isVertical ? 60 : 12,
      }}
    >
      {quickAccessItems.map((item) => (
        <Tooltip
          key={item.key}
          title={item.title}
          placement={isVertical ? 'left' : 'bottom'}
          mouseEnterDelay={0.3}
          overlayClassName="quick-access-tooltip"
          overlayStyle={{
            ['--tooltip-bg' as string]: isDark ? '#1f2937' : '#ffffff',
            ['--tooltip-color' as string]: isDark ? '#ffffff' : '#1f2937',
            marginLeft: -12,
          }}
        >
          <div
            onClick={() => handleClick(item)}
            style={{
              width: isVertical ? 48 : 32,
              height: isVertical ? 48 : 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: item.gradient,
              boxShadow: isDark
                ? `0 2px 8px ${item.shadowColor}, 0 0 20px ${item.shadowColor}`
                : `0 2px 8px ${item.shadowColor}`,
              transform: animatingKey === item.key 
                ? 'scale(0.85) rotate(-10deg)' 
                : 'scale(1) rotate(0deg)',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = animatingKey === item.key
                ? 'scale(0.85) rotate(-10deg)'
                : 'scale(1.15) rotate(5deg)';
              e.currentTarget.style.boxShadow = isDark
                ? `0 4px 16px ${item.shadowColor}, 0 0 30px ${item.shadowColor}, 0 0 50px ${item.shadowColor}`
                : `0 4px 16px ${item.shadowColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = animatingKey === item.key
                ? 'scale(0.85) rotate(-10deg)'
                : 'scale(1) rotate(0deg)';
              e.currentTarget.style.boxShadow = isDark
                ? `0 2px 8px ${item.shadowColor}, 0 0 20px ${item.shadowColor}`
                : `0 2px 8px ${item.shadowColor}`;
            }}
          >
            {/* 图标容器 */}
            <div
              style={{
                fontSize: isVertical ? 22 : 16,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: animatingKey === item.key ? 'scale(0.8)' : 'scale(1)',
              }}
            >
              {item.icon}
            </div>

            {/* 待办数量角标 */}
            {item.badge !== undefined && item.badge > 0 && (
              <Badge
                count={item.badge}
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#ef4444',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            )}

            {/* 极客模式下的脉冲光晕效果 */}
            {isDark && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: item.gradient,
                  opacity: 0.3,
                  animation: 'pulse 2s ease-in-out infinite',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
            )}
          </div>
        </Tooltip>
      ))}

      {/* 脉冲动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        /* Tooltip 自定义样式 */
        .quick-access-tooltip .ant-tooltip-content {
          background: transparent !important;
          box-shadow: none !important;
        }

        .quick-access-tooltip .ant-tooltip-inner {
          background-color: var(--tooltip-bg, #1f2937) !important;
          color: var(--tooltip-color, #ffffff) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          font-size: 13px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border: none !important;
        }

        .quick-access-tooltip .ant-tooltip-arrow {
          background: transparent !important;
        }

        .quick-access-tooltip .ant-tooltip-arrow::before {
          background-color: var(--tooltip-bg, #1f2937) !important;
          border: none !important;
          box-shadow: none !important;
        }

        .quick-access-tooltip .ant-tooltip-arrow-content {
          background-color: var(--tooltip-bg, #1f2937) !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
};

export default QuickAccessIcons;
