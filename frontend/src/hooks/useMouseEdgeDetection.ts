import { useEffect, useRef, useCallback } from 'react';

interface UseMouseEdgeDetectionOptions {
  edgeWidth?: number;
  expandDelay?: number;
  collapseDelay?: number;
  onLeftEdge?: () => void;
  onRightEdge?: () => void;
  onLeave?: () => void;
  enabled?: boolean;
}

export const useMouseEdgeDetection = (options: UseMouseEdgeDetectionOptions) => {
  const {
    edgeWidth = 20,
    expandDelay = 100,
    collapseDelay = 300,
    onLeftEdge,
    onRightEdge,
    onLeave,
    enabled = true
  } = options;

  const expandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOnEdgeRef = useRef(false);
  const currentEdgeRef = useRef<'left' | 'right' | null>(null);

  const clearTimers = useCallback(() => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX } = e;
      const screenWidth = window.innerWidth;

      const onLeft = clientX <= edgeWidth;
      const onRight = clientX >= screenWidth - edgeWidth;

      if (onLeft || onRight) {
        const edge: 'left' | 'right' = onLeft ? 'left' : 'right';

        // 如果已经在边缘且是同一边，不做处理
        if (isOnEdgeRef.current && currentEdgeRef.current === edge) {
          return;
        }

        // 清除之前的收起定时器
        if (collapseTimerRef.current) {
          clearTimeout(collapseTimerRef.current);
          collapseTimerRef.current = null;
        }

        // 设置展开定时器
        isOnEdgeRef.current = true;
        currentEdgeRef.current = edge;

        expandTimerRef.current = setTimeout(() => {
          if (edge === 'left') {
            onLeftEdge?.();
          } else {
            onRightEdge?.();
          }
        }, expandDelay);
      } else {
        // 鼠标离开边缘区域
        if (isOnEdgeRef.current) {
          // 清除展开定时器
          if (expandTimerRef.current) {
            clearTimeout(expandTimerRef.current);
            expandTimerRef.current = null;
          }

          isOnEdgeRef.current = false;
          currentEdgeRef.current = null;

          // 设置收起定时器
          collapseTimerRef.current = setTimeout(() => {
            onLeave?.();
          }, collapseDelay);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimers();
    };
  }, [edgeWidth, expandDelay, collapseDelay, onLeftEdge, onRightEdge, onLeave, enabled, clearTimers]);

  return { clearTimers };
};

export default useMouseEdgeDetection;
