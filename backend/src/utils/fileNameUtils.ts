/**
 * 文件名生成工具
 * 提供安全的文件名生成和字符清理功能
 */

/**
 * 生成安全的文件名
 * @param baseName 基础文件名
 * @param extension 文件扩展名（包含点）
 * @returns 安全的文件名
 */
export function generateSafeFileName(baseName: string, extension: string): string {
  const timestamp = formatTimestamp(new Date());
  const safeBaseName = sanitizeFileName(baseName);
  const maxBaseLength = 200 - extension.length - timestamp.length - 1; // 减去下划线和扩展名
  
  const truncatedBaseName = safeBaseName.length > maxBaseLength 
    ? safeBaseName.substring(0, maxBaseLength) 
    : safeBaseName;
    
  return `${truncatedBaseName}_${timestamp}${extension}`;
}

/**
 * 清理文件名中的非法字符
 * @param name 原始文件名
 * @returns 清理后的文件名
 */
export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'untitled';
  }
  
  // 移除或替换非法字符
  // 保留字母、数字、下划线、连字符和空格
  return name
    .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Windows非法字符
    .replace(/[\/]/g, '_') // 路径分隔符
    .trim()
    .replace(/\s+/g, '_') // 多个空格转为单个下划线
    .replace(/_+/g, '_'); // 多个下划线转为单个
}

/**
 * 格式化时间戳为安全格式
 * @param date 日期对象
 * @returns 格式化的时间字符串
 */
export function formatTimestamp(date: Date): string {
  if (!date || !(date instanceof Date)) {
    date = new Date();
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * 生成测试用例导出文件名
 * @returns 测试用例导出的安全文件名
 */
export function generateTestCaseExportFileName(): string {
  return generateSafeFileName('test_cases_export', '.xlsx');
}

/**
 * 生成模板文件名
 * @returns 模板文件的安全文件名
 */
export function generateTemplateFileName(): string {
  return generateSafeFileName('test_cases_template', '.xlsx');
}