/**
 * HTML内容清理工具
 * 用于清理用户输入中的HTML标签和恶意内容
 */

/**
 * 清理HTML内容，移除HTML标签和脚本
 * @param html - 包含HTML的输入字符串
 * @returns 清理后的纯文本内容
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 移除DOCTYPE声明
  let text = html.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // 移除HTML注释
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // 移除script标签及其内容
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除style标签及其内容
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // 移除所有HTML标签，但保留文本内容
  text = text.replace(/<[^>]*>/g, '');
  
  // 转换HTML实体
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // 清理多余的空白字符
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * 验证需求描述的合法性
 * @param requirement - 需求描述
 * @returns 验证结果
 */
export function validateRequirement(requirement: string): {
  isValid: boolean;
  error?: string;
  cleaned?: string;
} {
  if (!requirement || typeof requirement !== 'string') {
    return {
      isValid: false,
      error: '需求描述不能为空'
    };
  }

  const cleaned = sanitizeHtml(requirement);
  
  if (cleaned.length < 5) {
    return {
      isValid: false,
      error: '需求描述过于简短，请提供更详细的需求信息'
    };
  }

  if (cleaned.length > 5000) {
    return {
      isValid: false,
      error: '需求描述过长，请控制在5000字符以内'
    };
  }

  return {
    isValid: true,
    cleaned
  };
}