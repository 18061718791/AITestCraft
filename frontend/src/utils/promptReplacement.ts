/**
 * 提示词参数替换服务
 * 用于将用户选择的系统、模块、场景信息替换到提示词模板中
 */

export interface ReplacementContext {
  system?: string | null;
  module?: string | null;
  scenario?: string | null;
}

/**
 * 替换提示词中的参数占位符
 * @param promptContent - 原始提示词内容
 * @param context - 替换上下文，包含系统、模块、场景信息
 * @returns 替换后的提示词内容
 */
export function replacePromptParameters(
  promptContent: string,
  context: ReplacementContext
): string {
  const { system, module, scenario } = context;
  
  let replacedContent = promptContent;
  
  // 替换系统参数
  if (system !== null && system !== undefined) {
    replacedContent = replacedContent.replace(/{system}/g, system);
  }
  
  // 替换模块参数
  if (module !== null && module !== undefined) {
    replacedContent = replacedContent.replace(/{module}/g, module);
  }
  
  // 替换场景参数
  if (scenario !== null && scenario !== undefined) {
    replacedContent = replacedContent.replace(/{scenario}/g, scenario);
  }
  
  return replacedContent;
}

/**
 * 从AppContext状态创建替换上下文
 * @param state - AppContext状态
 * @returns 替换上下文对象
 */
export function createReplacementContext(state: any): ReplacementContext {
  return {
    system: state.selectedSystem?.name || null,
    module: state.selectedModule?.name || null,
    scenario: state.selectedScenario?.name || null,
  };
}

/**
 * 获取替换后的提示词内容
 * @param originalPrompt - 原始提示词
 * @param state - AppContext状态
 * @returns 替换后的提示词内容
 */
export function getReplacedPrompt(
  originalPrompt: string,
  state: any
): string {
  const context = createReplacementContext(state);
  return replacePromptParameters(originalPrompt, context);
}

/**
 * 验证替换结果
 * @param originalPrompt - 原始提示词
 * @param replacedPrompt - 替换后的提示词
 * @returns 验证结果
 */
export function validateReplacement(
  originalPrompt: string,
  replacedPrompt: string
): {
  success: boolean;
  remainingPlaceholders: string[];
  replacedParams: string[];
} {
  const placeholders = ['{system}', '{module}', '{scenario}'];
  const remaining = placeholders.filter(placeholder => replacedPrompt.includes(placeholder));
  const replaced = placeholders.filter(placeholder => !replacedPrompt.includes(placeholder) && originalPrompt.includes(placeholder));
  
  return {
    success: remaining.length === 0,
    remainingPlaceholders: remaining,
    replacedParams: replaced
  };
}