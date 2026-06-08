import React, { useState, useRef, useMemo } from 'react';
import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { Dropdown, Menu } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTab } from '../contexts/PageTabContext';
import { useTheme } from '../contexts/ThemeContext';
import { TAB_COLORS } from '../config/pageMeta';

/**
 * 根据标签ID生成随机颜色
 * 使用简单的哈希算法确保同一个ID总是返回相同的颜色
 * 这样同一个标签页在关闭前会保持相同的颜色
 */
const getRandomColorById = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % TAB_COLORS.length;
  return TAB_COLORS[index];
};

interface PageTabItemProps {
  tab: PageTab;
  isActive: boolean;
  isKeyboardSelected?: boolean;
  onClick: () => void;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onRefresh: () => void;
}

/**
 * 页面标签项组件 - 恢复图片展示，只保留菜单名称
 */
const PageTabItem: React.FC<PageTabItemProps> = ({
  tab,
  isActive,
  isKeyboardSelected = false,
  onClick,
  onClose,
  onCloseOthers,
  onCloseAll,
  onRefresh,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  // 使用随机颜色，基于标签ID生成，确保同一个标签页颜色一致
  const moduleColor = useMemo(() => getRandomColorById(tab.id), [tab.id]);

  // 右键菜单
  const contextMenu = (
    <Menu>
      <Menu.Item key="refresh" icon={<ReloadOutlined />} onClick={onRefresh}>
        刷新页面
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="close" danger onClick={onClose}>
        关闭
      </Menu.Item>
      <Menu.Item key="closeOthers" onClick={onCloseOthers}>
        关闭其他
      </Menu.Item>
      <Menu.Item key="closeAll" onClick={onCloseAll}>
        关闭全部
      </Menu.Item>
    </Menu>
  );

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
  };

  // 处理点击动画
  const handleClick = () => {
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      onClick();
    }, 100);
  };

  // 计算 transform 值
  const getTransform = () => {
    if (isActive) return 'scale(1.05) translateY(-2px)';
    if (isPressed) return 'scale(0.95)';
    if (isHovered) return 'scale(1.02) translateY(-1px)';
    return 'scale(1) translateY(0)';
  };

  return (
    <Dropdown overlay={contextMenu} trigger={['contextMenu']}>
      <div
        ref={itemRef}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          width: 130,
          height: 115,
          overflow: 'visible',
          cursor: 'pointer',
          zIndex: isActive ? 20 : isHovered ? 10 : 1,
          transform: getTransform(),
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 上半部分：截图圆角矩形框 */}
        <div
          style={{
            width: 120,
            height: 110,
            borderRadius: 8,
            padding: 10,
            backgroundColor: isDark ? 'rgba(227, 242, 253, 0.85)' : 'rgba(26, 54, 93, 0.85)',
            boxShadow: isActive
              ? `0 4px 15px rgba(0,0,0,0.15), 0 0 0 2px ${moduleColor}50`
              : isHovered || isKeyboardSelected
                ? `0 4px 20px ${moduleColor}80, 0 0 0 5px ${moduleColor}, 0 0 20px ${moduleColor}60, 0 0 40px ${moduleColor}40, 0 0 60px ${moduleColor}20`
                : `0 4px 12px rgba(0,0,0,0.1)`,
            transition: 'all 0.3s ease',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* 内部图片容器 */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 0,
              overflow: 'hidden',
              backgroundColor: isDark ? '#f0f4f8' : '#e3f2fd',
            }}
          >
            {tab.screenshot && !imageError ? (
              <img
                src={tab.screenshot}
                alt={tab.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top',
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                }}
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              // 无截图时显示占位符
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${isDark ? '#e3f2fd' : '#bbdefb'} 0%, ${isDark ? '#bbdefb' : '#90caf9'} 100%)`,
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    color: moduleColor,
                    fontWeight: 'bold',
                  }}
                >
                  {tab.title.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* 关闭按钮 */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(239, 68, 68, 0.95)',
                  boxShadow: `0 2px 6px rgba(239, 68, 68, 0.4)`,
                  zIndex: 10,
                }}
              >
                <CloseOutlined style={{ fontSize: 10, color: '#fff' }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 活动指示器 */}
          {isActive && (
            <div
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: moduleColor,
                boxShadow: `0 0 8px ${moduleColor}`,
                zIndex: 5,
              }}
            />
          )}
        </div>

        {/* 下半部分：菜单名称（只显示标题，去除多余内容） */}
        <div
          style={{
            marginTop: 8,
            padding: '4px 8px',
            maxWidth: 120,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: isActive ? 600 : 500,
              color: isDark ? '#FFFFFF' : '#000000',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 110,
              textAlign: 'center',
              letterSpacing: 0.3,
              display: 'block',
            }}
          >
            {tab.title}
          </span>
        </div>
      </div>
    </Dropdown>
  );
};

export default PageTabItem;
