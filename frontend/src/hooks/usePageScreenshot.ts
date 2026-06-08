import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';

export interface ScreenshotOptions {
  /** 截图质量 (0-1)，默认 0.7 */
  quality?: number;
  /** 缩放比例，默认 0.5（降低分辨率以提高性能） */
  scale?: number;
  /** 最大宽度，默认 240 */
  maxWidth?: number;
  /** 最大高度，默认 160 */
  maxHeight?: number;
}

/**
 * 页面截图 Hook
 * 用于捕获页面内容生成缩略图
 */
export const usePageScreenshot = () => {
  const isCapturingRef = useRef(false);

  /**
   * 捕获页面截图
   * @param element 要截图的 DOM 元素
   * @param options 截图选项
   * @returns base64 格式的图片数据
   */
  const captureScreenshot = useCallback(
    async (
      element: HTMLElement | null,
      options: ScreenshotOptions = {}
    ): Promise<string | null> => {
      if (!element) {
        console.warn('[usePageScreenshot] 元素为空，无法截图');
        return null;
      }

      // 防止重复截图
      if (isCapturingRef.current) {
        console.log('[usePageScreenshot] 正在截图中，跳过');
        return null;
      }

      const {
        quality = 0.7,
        scale = 0.5,
        maxWidth = 240,
        maxHeight = 160,
      } = options;

      try {
        isCapturingRef.current = true;
        console.log('[usePageScreenshot] 开始截图...');

        const startTime = Date.now();

        // 使用 html2canvas 截图
        const canvas = await html2canvas(element, {
          scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          // 忽略可能出问题的元素
          ignoreElements: (el) => {
            // 忽略标签栏本身，避免递归
            if (el.classList.contains('page-tab-bar')) return true;
            // 忽略固定定位的元素（如悬浮按钮）
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed') return true;
            return false;
          },
        });

        // 调整图片尺寸
        let { width, height } = canvas;

        // 按比例缩放
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);

          // 创建新的 canvas 进行缩放
          const resizedCanvas = document.createElement('canvas');
          resizedCanvas.width = width;
          resizedCanvas.height = height;
          const ctx = resizedCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, width, height);
            const dataUrl = resizedCanvas.toDataURL('image/jpeg', quality);
            console.log(
              `[usePageScreenshot] 截图完成，耗时 ${Date.now() - startTime}ms，尺寸: ${width}x${height}`
            );
            return dataUrl;
          }
        }

        // 直接输出
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        console.log(
          `[usePageScreenshot] 截图完成，耗时 ${Date.now() - startTime}ms，尺寸: ${width}x${height}`
        );
        return dataUrl;
      } catch (error) {
        console.error('[usePageScreenshot] 截图失败:', error);
        return null;
      } finally {
        isCapturingRef.current = false;
      }
    },
    []
  );

  /**
   * 快速截图（使用默认配置）
   */
  const captureQuick = useCallback(
    async (element: HTMLElement | null): Promise<string | null> => {
      return captureScreenshot(element, {
        quality: 0.6,
        scale: 0.4,
        maxWidth: 240,
        maxHeight: 160,
      });
    },
    [captureScreenshot]
  );

  /**
   * 高质量截图（用于特殊场景）
   */
  const captureHighQuality = useCallback(
    async (element: HTMLElement | null): Promise<string | null> => {
      return captureScreenshot(element, {
        quality: 0.9,
        scale: 0.8,
        maxWidth: 480,
        maxHeight: 320,
      });
    },
    [captureScreenshot]
  );

  return {
    captureScreenshot,
    captureQuick,
    captureHighQuality,
    isCapturing: () => isCapturingRef.current,
  };
};

export default usePageScreenshot;
