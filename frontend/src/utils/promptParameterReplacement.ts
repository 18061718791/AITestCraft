/**
 * 提示词参数替换服务
 * 将用户选择的系统、模块、场景信息替换到提示词模板中
 */

export interface ReplacementContext {
  systemName?: string | null;
  moduleName?: string | null;
  scenarioName?: string | null;
}

export interface ReplacementResult {
  content: string;
  replacements: {
    system: boolean;
    module: boolean;
    scenario: boolean;
  };
}

/**
 * 替换提示词中的参数
 * @param promptContent - 原始提示词内容
 * @param context - 替换上下文，包含系统、模块、场景名称
 * @returns 替换后的提示词内容和替换状态
 */
export function replacePromptParameters(
  promptContent: string,
  context: ReplacementContext
): ReplacementResult {
  const { systemName, moduleName, scenarioName } = context;
  
  let result = promptContent;
  const replacements = {
    system: false,
    module: false,
    scenario: false
  };

  // 替换系统名称
  if (systemName && systemName.trim()) {
    result = result.replace(/\{system\}/g, systemName.trim());
    replacements.system = true;
  }

  // 替换模块名称
  if (moduleName && moduleName.trim()) {
    result = result.replace(/\{module\}/g, moduleName.trim());
    replacements.module = true;
  }

  // 替换场景名称
  if (scenarioName && scenarioName.trim()) {
    result = result.replace(/\{scenario\}/g, scenarioName.trim());
    replacements.scenario = true;
  }

  return {
    content: result,
    replacements
  };
}

/**
 * 从AppContext状态创建替换上下文
 * @param appState - AppContext中的状态
 * @returns 替换上下文对象
 */
export function createReplacementContext(appState: any): ReplacementContext {
  return {
    systemName: appState.selectedSystem?.name || null,
    moduleName: appState.selectedModule?.name || null,
    scenarioName: appState.selectedScenario?.name || null
  };
}

/**
 * 验证替换上下文是否完整
 * @param context - 替换上下文
 * @returns 验证结果
 */
export function validateReplacementContext(context: ReplacementContext): boolean {
  return !!(context.systemName && context.moduleName && context.scenarioName);
}

/**
 * 获取替换日志信息
 * @param result - 替换结果
 * @returns 可读的日志信息
 */
export function getReplacementLog(result: ReplacementResult): string {
  const replacements = [];
  if (result.replacements.system) replacements.push('system');
  if (result.replacements.module) replacements.push('module');
  if (result.replacements.scenario) replacements.push('scenario');
  
  return `参数替换完成: ${replacements.join(', ') || '无替换'}`;
}