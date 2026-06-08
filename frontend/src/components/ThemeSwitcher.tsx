import { useTheme } from '../contexts/ThemeContext';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';

export const ThemeSwitcher: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
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
  );
};

export default ThemeSwitcher;
