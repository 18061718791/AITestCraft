/**
 * 我的待办提醒功能 - 类型定义
 */

/**
 * 提醒配置
 */
export interface TodoReminderConfig {
  /** 是否启用提醒 */
  enabled: boolean;
  /** 检查间隔（秒） */
  intervalSeconds: number;
  /** 自动隐藏时间（秒） */
  autoHideDelay: number;
  /** 更新时间 ISO格式 */
  updatedAt: string;
}

/**
 * 项目待办基准
 */
export interface ProjectBaseline {
  /** 待办缺陷ID列表 */
  todoIds: number[];
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 所有项目基准映射
 * key: 项目ID字符串
 */
export type TodoBaselineMap = Record<string, ProjectBaseline>;

/**
 * 用户基准数据（包含用户ID，用于数据隔离）
 */
export interface UserBaselineData {
  /** 用户ID */
  userId: number;
  /** 用户名 */
  username: string;
  /** 基准数据 */
  baseline: TodoBaselineMap;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 项目新增明细
 */
export interface ProjectNewTodoDetail {
  /** 项目ID */
  projectId: number;
  /** 项目名称 */
  projectName: string;
  /** 新增缺陷ID列表 */
  newIds: number[];
  /** 新增数量 */
  count: number;
  /** 完整的缺陷数据列表（用于展示子系统分类） */
  todos?: TodoDefect[];
}

/**
 * 新增待办数据（用于展示）
 */
export interface NewTodoData {
  /** 总新增数量 */
  totalCount: number;
  /** 按项目明细 */
  projectBreakdown: ProjectNewTodoDetail[];
  /** 检测时间 */
  detectedAt: string;
}

/**
 * 待办缺陷（复用现有Defect类型的关键字段）
 */
export interface TodoDefect {
  /** 缺陷ID */
  id: number;
  /** 标题 */
  subject: string;
  /** 项目ID */
  project_id: number;
  /** 项目名称 */
  project_name?: string;
  /** 状态ID */
  status_id: number;
  /** 状态名称 */
  status_name: string;
  /** 优先级ID */
  priority_id: number;
  /** 优先级名称 */
  priority_name: string;
  /** 分配给的用户ID */
  assigned_to_id?: number;
  /** 分配给的用户名 */
  assigned_to_name?: string;
  /** 系统/模块名称 */
  system_module_name?: string;
  /** 创建时间 */
  created_on: string;
  /** 更新时间 */
  updated_on: string;
}

/**
 * 查询结果
 */
export interface TodoQueryResult {
  /** 项目ID */
  projectId: number;
  /** 项目名称 */
  projectName: string;
  /** 待办列表 */
  todos: TodoDefect[];
  /** 总数 */
  total: number;
}

/**
 * localStorage键名常量
 */
export const STORAGE_KEYS = {
  /** 配置数据 */
  CONFIG: 'todo_reminder_config',
  /** 基准数据（包含用户ID） */
  BASELINE: 'todo_reminder_baseline_v2',
  /** 新增待办数据 */
  NEW_DATA: 'todo_reminder_new_data',
  /** 当前用户标识（用于检测用户切换） */
  CURRENT_USER: 'todo_reminder_current_user',
} as const;

/**
 * 默认配置
 * 注意：autoHideDelay 存储单位为毫秒，但界面显示为秒
 */
export const DEFAULT_CONFIG: TodoReminderConfig = {
  enabled: true,
  intervalSeconds: 60,
  autoHideDelay: 5000, // 默认5秒（5000毫秒）
  updatedAt: new Date().toISOString(),
};

/**
 * 配置验证规则
 */
export const CONFIG_RULES = {
  /** 最小间隔（秒） */
  MIN_INTERVAL: 10,
  /** 最大间隔（秒） */
  MAX_INTERVAL: 3600,
  /** 默认间隔（秒） */
  DEFAULT_INTERVAL: 60,
  /** 最小自动隐藏时间（秒） */
  MIN_AUTO_HIDE: 1,
  /** 最大自动隐藏时间（秒） */
  MAX_AUTO_HIDE: 60,
  /** 默认自动隐藏时间（秒） */
  DEFAULT_AUTO_HIDE: 5,
} as const;
