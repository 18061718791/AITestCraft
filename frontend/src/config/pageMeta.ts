/**
 * 页面元数据配置
 * 用于页面标签/历史记录模块
 */

export type ModuleType = 'test' | 'defect' | 'app' | 'admin';

export interface PageMeta {
  title: string;
  icon: string;
  module: ModuleType;
}

/**
 * 页面元数据配置映射
 * key: 路由路径（必须与实际路由完全匹配）
 * value: 页面元数据
 */
export const pageMetaConfig: Record<string, PageMeta> = {
  // 缺陷管理模块
  '/defects': {
    title: '缺陷分析',
    icon: 'PieChartOutlined',
    module: 'defect',
  },
  '/defects/todo': {
    title: '我的待办',
    icon: 'CheckSquareOutlined',
    module: 'defect',
  },
  '/defects/list': {
    title: '问题列表',
    icon: 'OrderedListOutlined',
    module: 'defect',
  },
  '/defects/assistant': {
    title: '缺陷助手',
    icon: 'RobotOutlined',
    module: 'defect',
  },
  '/defects/urgent': {
    title: '紧急问题跟踪',
    icon: 'FireOutlined',
    module: 'defect',
  },
  '/admin/notification': {
    title: '通知配置',
    icon: 'NotificationOutlined',
    module: 'admin',
  },
  '/admin/project': {
    title: '项目管理',
    icon: 'ProjectOutlined',
    module: 'admin',
  },

  // 应用管理模块
  '/app-management/pending': {
    title: '待部署应用',
    icon: 'ClockCircleOutlined',
    module: 'app',
  },
  '/app-management/history': {
    title: '部署应用历史',
    icon: 'HistoryOutlined',
    module: 'app',
  },
  '/app-management/config': {
    title: '应用配置',
    icon: 'SettingOutlined',
    module: 'app',
  },

  // 用例管理模块
  '/test-cases': {
    title: '用例管理',
    icon: 'FileTextOutlined',
    module: 'test',
  },
  '/assistant': {
    title: 'AI用例助手',
    icon: 'RobotOutlined',
    module: 'test',
  },

  // 系统管理模块
  '/admin': {
    title: '系统管理',
    icon: 'SettingOutlined',
    module: 'admin',
  },
  '/admin/plugins': {
    title: '插件管理',
    icon: 'AppstoreOutlined',
    module: 'admin',
  },
  '/admin/llm': {
    title: 'LLM配置',
    icon: 'SettingOutlined',
    module: 'admin',
  },
  '/admin/monitoring': {
    title: '系统监控',
    icon: 'DashboardOutlined',
    module: 'admin',
  },
  '/admin/database': {
    title: '数据库配置',
    icon: 'DatabaseOutlined',
    module: 'admin',
  },
  '/admin/todo-reminder': {
    title: '待办提醒配置',
    icon: 'BellOutlined',
    module: 'admin',
  },
  '/admin/shortcuts': {
    title: '快捷键配置',
    icon: 'KeyOutlined',
    module: 'admin',
  },

  // 提示词管理
  '/prompts': {
    title: '提示词管理',
    icon: 'MessageOutlined',
    module: 'test',
  },
  '/system': {
    title: '系统管理',
    icon: 'SettingOutlined',
    module: 'admin',
  },
};

/**
 * 根据路径获取页面元数据
 * @param path 路由路径
 * @returns 页面元数据，找不到返回 undefined
 */
export const getPageMeta = (path: string): PageMeta | undefined => {
  // 精确匹配
  if (pageMetaConfig[path]) {
    return pageMetaConfig[path];
  }

  // 处理动态路由（如 /prompts/xxx）
  // 先尝试去掉最后一段路径
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 1) {
    const parentPath = '/' + segments.slice(0, -1).join('/');
    if (pageMetaConfig[parentPath]) {
      return pageMetaConfig[parentPath];
    }
  }

  return undefined;
};

/**
 * 获取默认页面元数据
 * @param path 路由路径
 * @returns 页面元数据（带默认值）
 */
export const getDefaultPageMeta = (path: string): PageMeta => {
  return (
    getPageMeta(path) || {
      title: path.split('/').pop() || '未知页面',
      icon: 'FileOutlined',
      module: 'test',
    }
  );
};

/**
 * 8种预设颜色用于任务窗口区分
 * 每种颜色都有良好的视觉区分度，不使用红色（太刺眼）
 */
export const TAB_COLORS = [
  '#00d4ff', // 青色 - 清爽科技
  '#10b981', // 翠绿 - 生机勃勃
  '#f59e0b', // 琥珀 - 温暖活力
  '#8b5cf6', // 紫色 - 神秘优雅
  '#ec4899', // 粉色 - 活泼明快
  '#3b82f6', // 蓝色 - 稳重专业
  '#14b8a6', // teal - 清新自然
  '#f97316', // 橙色 - 活力热情
] as const;

/**
 * 获取模块颜色
 * @param module 模块类型
 * @returns 颜色配置
 */
export const getModuleColor = (module: ModuleType): string => {
  const colors: Record<ModuleType, string> = {
    test: '#10b981', // 绿色 - 测试
    defect: '#f59e0b', // 琥珀色 - 缺陷
    app: '#00d4ff', // 青色 - 应用管理
    admin: '#6366f1', // 靛蓝色 - 系统管理
  };
  return colors[module] || '#6b7280';
};

/**
 * 根据路径获取唯一的颜色
 * 使用哈希算法确保同一路径总是返回相同颜色
 * @param path 路由路径
 * @returns 颜色值
 */
export const getPathColor = (path: string): string => {
  // 简单的字符串哈希算法
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  // 取绝对值并对颜色数组长度取模
  const index = Math.abs(hash) % TAB_COLORS.length;
  return TAB_COLORS[index];
};
