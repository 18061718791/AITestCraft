import { systemApi } from './systemApi';

export interface DetailViewData {
  systemName: string;
  moduleName: string;
  scenarioName: string;
  breadcrumb: string;
}

// 缓存机制
const cache = new Map<string, any>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

const getCacheKey = (type: string, id: number) => `${type}_${id}`;

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// 获取系统名称
const getSystemName = async (systemId: number): Promise<string> => {
  const cacheKey = getCacheKey('system', systemId);
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const systems = await systemApi.getSystems();
    const system = systems.find(s => s.id === systemId);
    const name = system?.name || `系统(ID: ${systemId})`;
    setCachedData(cacheKey, name);
    return name;
  } catch (error) {
    console.warn(`获取系统名称失败: ${error}`);
    return `系统(ID: ${systemId})`;
  }
};

// 获取模块名称
const getModuleName = async (moduleId: number): Promise<string> => {
  const cacheKey = getCacheKey('module', moduleId);
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    // 获取所有系统，然后查找包含该模块的系统
    const systems = await systemApi.getSystems();
    for (const system of systems) {
      const modules = await systemApi.getModules(system.id);
      const module = modules.find(m => m.id === moduleId);
      if (module) {
        const name = module.name || `模块(ID: ${moduleId})`;
        setCachedData(cacheKey, name);
        return name;
      }
    }
    return `模块(ID: ${moduleId})`;
  } catch (error) {
    console.warn(`获取模块名称失败: ${error}`);
    return `模块(ID: ${moduleId})`;
  }
};

// 获取场景名称
const getScenarioName = async (scenarioId: number): Promise<string> => {
  const cacheKey = getCacheKey('scenario', scenarioId);
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    // 获取所有系统，然后查找包含该场景的系统
    const systems = await systemApi.getSystems();
    for (const system of systems) {
      const modules = await systemApi.getModules(system.id);
      for (const module of modules) {
        const scenarios = await systemApi.getScenarios(module.id);
        const scenario = scenarios.find(s => s.id === scenarioId);
        if (scenario) {
          const name = scenario.name || `场景(ID: ${scenarioId})`;
          setCachedData(cacheKey, name);
          return name;
        }
      }
    }
    return `场景(ID: ${scenarioId})`;
  } catch (error) {
    console.warn(`获取场景名称失败: ${error}`);
    return `场景(ID: ${scenarioId})`;
  }
};

// 构建面包屑
export const buildBreadcrumb = (
  systemName: string,
  moduleName: string,
  scenarioName: string
): string => {
  const parts = [];
  
  if (systemName && systemName !== '未设置系统') {
    parts.push(systemName);
  }
  if (moduleName && moduleName !== '未设置模块') {
    parts.push(moduleName);
  }
  if (scenarioName && scenarioName !== '未设置场景') {
    parts.push(scenarioName);
  }
  
  return parts.join(' > ') || '未分类';
};

// 获取完整的详情数据
export const getDetailViewData = async (
  systemId?: number,
  moduleId?: number,
  scenarioId?: number
): Promise<DetailViewData> => {
  try {
    const [systemName, moduleName, scenarioName] = await Promise.all([
      systemId ? getSystemName(systemId) : Promise.resolve('未设置系统'),
      moduleId ? getModuleName(moduleId) : Promise.resolve('未设置模块'),
      scenarioId ? getScenarioName(scenarioId) : Promise.resolve('未设置场景'),
    ]);

    return {
      systemName,
      moduleName,
      scenarioName,
      breadcrumb: buildBreadcrumb(systemName, moduleName, scenarioName),
    };
  } catch (error) {
    console.warn('获取详情数据时发生错误:', error);
    return {
      systemName: systemId ? `系统(${systemId})` : '未设置系统',
      moduleName: moduleId ? `模块(${moduleId})` : '未设置模块',
      scenarioName: scenarioId ? `场景(${scenarioId})` : '未设置场景',
      breadcrumb: '数据加载中...',
    };
  }
};

// 清理缓存
export const clearCache = () => {
  cache.clear();
};

export default {
  getSystemName,
  getModuleName,
  getScenarioName,
  buildBreadcrumb,
  getDetailViewData,
  clearCache,
};