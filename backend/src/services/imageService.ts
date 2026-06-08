import { Base64Image } from './llm/types';
import logger from '../utils/logger';

const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 单张图片base64最大10MB

export class ImageService {
  static validateImage(image: Base64Image): void {
    if (!image.base64 || typeof image.base64 !== 'string') {
      throw new Error('图片base64数据不能为空');
    }

    if (!image.mimeType || !SUPPORTED_MIME_TYPES.includes(image.mimeType)) {
      throw new Error(
        `不支持的图片格式: ${image.mimeType || '未知'}。支持的格式: ${SUPPORTED_MIME_TYPES.join(', ')}`
      );
    }

    const base64Size = image.base64.length * 0.75; // base64编码比原始大约33%，反向估算
    if (base64Size > MAX_BASE64_SIZE) {
      throw new Error(
        `图片大小超出限制: ${(base64Size / 1024 / 1024).toFixed(1)}MB，单张图片最大10MB`
      );
    }

    logger.info('imageService', 'image_validated', {
      mimeType: image.mimeType,
      estimatedSize: Math.round(base64Size / 1024) + 'KB',
      fileName: image.fileName || 'unknown',
    });
  }

  static validateImages(images: Base64Image[]): void {
    if (!Array.isArray(images)) {
      throw new Error('images参数必须是数组');
    }

    if (images.length === 0) {
      throw new Error('images数组不能为空');
    }

    if (images.length > 5) {
      throw new Error(`图片数量超出限制: ${images.length}，最多支持5张`);
    }

    for (let i = 0; i < images.length; i++) {
      try {
        this.validateImage(images[i]!);
      } catch (error) {
        throw new Error(
          `第${i + 1}张图片校验失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    }

    logger.info('imageService', 'all_images_validated', {
      count: images.length,
    });
  }

  static buildDataUrl(image: Base64Image): string {
    return `data:${image.mimeType};base64,${image.base64}`;
  }
}

export default ImageService;
