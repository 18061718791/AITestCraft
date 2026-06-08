import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/cyberpunk.css';

interface SidebarHintProps {
  position: 'left' | 'right';
  title: string;
  description?: string;
  isVisible: boolean;
}

export const SidebarHint: React.FC<SidebarHintProps> = ({
  position,
  title,
  isVisible
}) => {
  const { isDark, themeConfig } = useTheme();
  const primaryColor = (themeConfig.token?.colorPrimary as string) || '#00d4ff';

  if (!isVisible) return null;

  const isLeft = position === 'left';

  return (
    <div
      style={{
        position: 'fixed',
        [isLeft ? 'left' : 'right']: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 99,
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
    >
      {/* 梯形提示 */}
      <div
        style={{
          width: 36,
          height: 120,
          background: isDark
            ? `linear-gradient(90deg, ${isLeft ? `${primaryColor}40` : `${primaryColor}15`}, ${isLeft ? `${primaryColor}15` : `${primaryColor}40`})`
            : `linear-gradient(90deg, ${isLeft ? `${primaryColor}30` : `${primaryColor}10`}, ${isLeft ? `${primaryColor}10` : `${primaryColor}30`})`,
          borderRadius: isLeft ? '4px 12px 12px 4px' : '12px 4px 4px 12px',
          transform: isLeft ? 'perspective(40px) rotateY(10deg)' : 'perspective(40px) rotateY(-10deg)',
          transformOrigin: isLeft ? 'left center' : 'right center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDark
            ? `${isLeft ? '-4px' : '4px'} 0 20px ${primaryColor}40`
            : `${isLeft ? '-4px' : '4px'} 0 15px ${primaryColor}30`,
          animation: 'pulseHint 2s ease-in-out infinite',
          borderLeft: !isLeft ? `2px solid ${primaryColor}80` : 'none',
          borderRight: isLeft ? `2px solid ${primaryColor}80` : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 流光效果 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, transparent, ${primaryColor}30, transparent)`,
            animation: 'dataFlow 3s linear infinite',
          }}
        />
        
        {/* 文字 - 垂直排列 */}
        <span
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontSize: 13,
            fontWeight: 600,
            color: isDark ? '#fff' : '#1a1a2e',
            letterSpacing: 3,
            textShadow: isDark ? `0 0 10px ${primaryColor}` : 'none',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {title}
        </span>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes pulseHint {
          0%, 100% {
            opacity: 0.85;
            filter: brightness(1);
          }
          50% {
            opacity: 1;
            filter: brightness(1.2);
          }
        }
        
        @keyframes dataFlow {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default SidebarHint;
