import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { usePageTab } from '../contexts/PageTabContext';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * 页面切换动画组件 - 增强翻转效果版
 * 特点：
 * 1. 3D卡片翻转效果 - 更真实的立体翻转
 * 2. 动态光影效果 - 翻转时的光效变化
 * 3. 弹性动画 - 更流畅的弹簧物理效果
 * 4. 性能优化 - 使用 GPU 加速的 transform
 */
const PageTransition: React.FC<PageTransitionProps> = memo(({ children }) => {
  const location = useLocation();
  const { isFlipping, flipDirection } = usePageTab();

  // 普通页面切换动画配置
  const normalVariants = {
    initial: {
      opacity: 0,
      scale: 0.92,
      y: 20,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 30,
        mass: 0.6,
        opacity: { duration: 0.2 },
      },
    },
    exit: {
      opacity: 0,
      scale: 1.02,
      y: -10,
      transition: {
        duration: 0.18,
        ease: 'easeIn' as const,
      },
    },
  };

  // 增强版3D翻转动画配置
  const flipVariants = {
    initial: {
      opacity: 0,
      rotateY: flipDirection === 'right' ? -110 : 110,
      scale: 0.8,
      x: flipDirection === 'right' ? -80 : 80,
    },
    animate: {
      opacity: 1,
      rotateY: 0,
      scale: 1,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 280,
        damping: 22,
        mass: 0.9,
        opacity: { duration: 0.25 },
      },
    },
    exit: {
      opacity: 0,
      rotateY: flipDirection === 'right' ? 110 : -110,
      scale: 0.8,
      x: flipDirection === 'right' ? 80 : -80,
      transition: {
        duration: 0.35,
        ease: 'easeIn' as const,
      },
    },
  };

  // 根据是否翻转选择动画配置
  const variants = isFlipping ? flipVariants : normalVariants;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        perspective: '1200px',
        perspectiveOrigin: 'center center',
      }}
    >
      {/* 翻转时的动态背景效果 */}
      {isFlipping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: `
              radial-gradient(
                ellipse at center,
                rgba(56, 189, 248, 0.15) 0%,
                rgba(139, 92, 246, 0.1) 40%,
                transparent 70%
              )
            `,
          }}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            willChange: 'transform, opacity',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            position: 'relative',
            zIndex: 1,
          }}
          layout={false}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* 翻转时的边缘光效 */}
      {isFlipping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 2,
            boxShadow: `
              inset 0 0 100px rgba(56, 189, 248, 0.1),
              0 0 60px rgba(139, 92, 246, 0.15)
            `,
          }}
        />
      )}
    </div>
  );
});

PageTransition.displayName = 'PageTransition';

export default PageTransition;
