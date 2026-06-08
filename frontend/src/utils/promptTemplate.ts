/**
 * 提示词模板处理工具
 * 负责读取和处理提示词模板文件，支持参数替换
 */

export interface TemplateParams {
  system: string;
  module: string;
  scenario: string;
  requirement: string;
}

export interface ValidationResult {
  isValid: boolean;
  missingParams: string[];
  errorMessage?: string;
}

/**
 * 读取提示词模板文件
 * @param templatePath 模板文件路径
 * @returns 模板内容，如果读取失败返回默认模板
 */
export async function readTemplate(templatePath: string): Promise<string> {
  try {
    // 从模板路径中提取文件名（如：从 "/prompts/generate_test_points.md" 提取 "generate_test_points.md"）
    const filename = templatePath.split('/').pop();
    if (!filename) {
      throw new Error('无效的模板文件路径');
    }
    
    // 使用 API 接口读取模板文件
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:9000';
    const response = await fetch(`${apiUrl}/api/prompts/${filename}`);
    
    if (!response.ok) {
      throw new Error(`无法读取模板文件: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (result.success && result.data && result.data.content) {
      return result.data.content;
    } else {
      throw new Error('API返回数据格式错误');
    }
  } catch (error) {
    console.error('读取模板文件失败:', error);
    // 返回默认模板作为降级方案
    return getDefaultTemplate();
  }
}

/**
 * 替换模板中的参数
 * @param template 模板内容
 * @param params 替换参数
 * @returns 替换后的完整提示词
 */
export function replaceParameters(template: string, params: TemplateParams): string {
  try {
    let result = template;
    
    // 清理HTML标签，确保只保留纯文本内容
    const cleanRequirement = params.requirement 
      ? params.requirement
          .replace(/<[^>]*>/g, '') // 移除所有HTML标签
          .replace(/&nbsp;/g, ' ') // 替换HTML空格
          .replace(/&amp;/g, '&')  // 替换HTML实体
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
      : '';
    
    // 使用简单的字符串替换，避免复杂的正则表达式
    result = result.replace(/\{system\}/g, params.system || '');
    result = result.replace(/\{module\}/g, params.module || '');
    result = result.replace(/\{scenario\}/g, params.scenario || '');
    result = result.replace(/\{requirement\}/g, cleanRequirement);
    
    return result;
  } catch (error) {
    console.error('参数替换失败:', error);
    // 如果替换失败，返回原始模板
    return template;
  }
}

/**
 * 验证模板参数
 * @param params 待验证的参数
 * @returns 验证结果
 */
export function validateTemplateParams(params: Partial<TemplateParams>): ValidationResult {
  const missingParams: string[] = [];
  
  if (!params.system || params.system.trim() === '') {
    missingParams.push('系统');
  }
  
  if (!params.module || params.module.trim() === '') {
    missingParams.push('功能模块');
  }
  
  if (!params.scenario || params.scenario.trim() === '') {
    missingParams.push('功能场景');
  }
  
  if (!params.requirement || params.requirement.trim() === '') {
    missingParams.push('需求描述');
  }
  
  const isValid = missingParams.length === 0;
  
  let errorMessage: string | undefined;
  if (!isValid) {
    errorMessage = `请完善以下信息：${missingParams.join('、')}`;
  }
  
  return {
    isValid,
    missingParams,
    errorMessage
  };
}

/**
 * 获取默认模板（降级方案）
 * @returns 默认模板内容
 */
function getDefaultTemplate(): string {
  return `你是一名经验丰富的软件测试分析工程师，擅长从自然语言需求中提取出清晰、可验证的测试点。

请将以下输入的中文需求描述，转化为一组**测试点清单**，每一条测试点应满足以下要求：

1. 语句简洁，覆盖明确的功能或行为；
2. 能指导后续的测试用例设计；
3. 包含主流程、边界条件、异常输入等常见测试场景；
4. 每一条测试点使用 "- " 开头，按行列出；
5. 不输出多余说明文字，仅返回测试点清单本身。

输入需求：
"""
我现在准备测试{system}的{module}的{scenario}，需求描述是：
{requirement}
"""

请输出测试点列表（每行一个）：
-`;
}

/**
 * 缓存模板内容，避免重复读取
 */
class TemplateCache {
  private static cache = new Map<string, string>();
  
  static get(key: string): string | undefined {
    return this.cache.get(key);
  }
  
  static set(key: string, value: string): void {
    this.cache.set(key, value);
  }
  
  static clear(): void {
    this.cache.clear();
  }
}

/**
 * 带缓存的模板读取
 * @param templatePath 模板文件路径
 * @returns 模板内容
 */
export async function readTemplateWithCache(templatePath: string): Promise<string> {
  // 检查缓存
  const cached = TemplateCache.get(templatePath);
  if (cached) {
    return cached;
  }
  
  // 从路径中提取文件名（处理类似 "/prompts/generate_test_points.md" 的路径）
  const filename = templatePath.includes('/') 
    ? templatePath.split('/').pop() || templatePath
    : templatePath;
  
  // 读取并缓存
  const content = await readTemplate(filename);
  TemplateCache.set(templatePath, content);
  
  return content;
}

/**
 * 清除模板缓存
 */
export function clearTemplateCache(): void {
  TemplateCache.clear();
}

/**
 * 清理用户输入的需求描述，移除HTML标签和脚本内容
 * @param input 原始输入字符串
 * @returns 清理后的纯文本字符串
 */
export function sanitizeRequirement(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // 移除style标签
    .replace(/<[^>]*>/g, '') // 移除所有HTML标签
    .replace(/&nbsp;/g, ' ') // 替换HTML空格
    .replace(/&amp;/g, '&') // 替换HTML实体
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // 合并多余空格
    .trim();
}

/**
 * 验证需求描述的合法性
 * @param requirement 需求描述
 * @returns 验证结果
 */
export function validateRequirement(requirement: string): { isValid: boolean; message?: string } {
  if (!requirement || requirement.trim() === '') {
    return { isValid: false, message: '需求描述不能为空' };
  }

  const cleaned = sanitizeRequirement(requirement);
  if (cleaned.length === 0) {
    return { isValid: false, message: '请输入有效的需求描述' };
  }

  if (cleaned.length < 5) {
    return { isValid: false, message: '需求描述过于简短，请提供更详细的信息' };
  }

  return { isValid: true };
}