// 导航类型定义

// 功能模块类型
export type ModuleType = 'test' | 'defect' | 'app' | 'admin';

// 菜单项
export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  path: string;
}

// 全局导航配置
export const globalNavigation: MenuItem[] = [
  { key: 'home', label: '首页', icon: 'HomeOutlined', path: '/' },
  { key: 'assistant', label: 'AI用例助手', icon: 'RocketOutlined', path: '/assistant' },
  { key: 'test', label: '用例管理', icon: 'UnorderedListOutlined', path: '/test-cases' },
  { key: 'defect', label: '缺陷管理', icon: 'BugOutlined', path: '/defects' },
  { key: 'app', label: '应用管理', icon: 'AppstoreOutlined', path: '/app-management/pending' },
  { key: 'admin', label: '系统管理', icon: 'SettingOutlined', path: '/admin/monitoring' },
];

// 模块二级菜单配置
export const moduleSubMenus: Record<ModuleType, MenuItem[]> = {
  test: [
    { key: 'assistant', label: '用例助手', icon: 'RocketOutlined', path: '/assistant' },
    { key: 'list', label: '用例列表', icon: 'UnorderedListOutlined', path: '/test-cases' },
    { key: 'prompts', label: '提示词管理', icon: 'FileTextOutlined', path: '/prompts' },
    { key: 'system', label: '平台管理', icon: 'AppstoreOutlined', path: '/system' },
  ],
  defect: [
    { key: 'list', label: '问题列表', icon: 'BugOutlined', path: '/defects/list' },
    { key: 'urgent', label: '紧急问题跟踪', icon: 'FireOutlined', path: '/defects/urgent' },
    { key: 'analysis', label: '数据分析', icon: 'BarChartOutlined', path: '/defects' },
    { key: 'todo', label: '我的待办', icon: 'CheckSquareOutlined', path: '/defects/todo' },
    { key: 'assistant', label: '缺陷助手', icon: 'RobotOutlined', path: '/defects/assistant' },
  ],
  app: [
    { key: 'pending', label: '待部署应用', icon: 'ClockCircleOutlined', path: '/app-management/pending' },
    { key: 'history', label: '部署应用历史', icon: 'HistoryOutlined', path: '/app-management/history' },
    { key: 'config', label: '应用配置', icon: 'SettingOutlined', path: '/app-management/config' },
  ],
  admin: [
    { key: 'project', label: '项目管理', icon: 'ProjectOutlined', path: '/admin/project' },
    { key: 'notification', label: '消息推送配置', icon: 'NotificationOutlined', path: '/admin/notification' },
    { key: 'todo-reminder', label: '我的待办提醒', icon: 'BellOutlined', path: '/admin/todo-reminder' },
    { key: 'database', label: '数据库配置', icon: 'DatabaseOutlined', path: '/admin/database' },
    { key: 'llm', label: '大模型配置', icon: 'OpenAIOutlined', path: '/admin/llm' },
    { key: 'monitoring', label: '系统监控', icon: 'DashboardOutlined', path: '/admin/monitoring' },
    { key: 'plugins', label: '插件管理', icon: 'ApiOutlined', path: '/admin/plugins' },
    { key: 'shortcuts', label: '快捷键配置', icon: 'KeyOutlined', path: '/admin/shortcuts' },
    { key: 'users', label: '用户管理', icon: 'UserOutlined', path: '/admin/users' },
    { key: 'roles', label: '角色管理', icon: 'TeamOutlined', path: '/admin/roles' },
  ]
};

// 根据路径获取当前模块类型
export const getCurrentModuleType = (path: string): ModuleType => {
  if (path.startsWith('/defects')) return 'defect';
  if (path.startsWith('/app-management')) return 'app';
  if (path.startsWith('/admin')) return 'admin';
  if (['/assistant', '/test-cases', '/prompts', '/system'].some(p => path.startsWith(p))) {
    return 'test';
  }
  return 'test';
};

// 传统模式菜单项
export interface TraditionalMenuItem {
  key: string;
  label: string;
  icon: string;
  path?: string;
  children?: TraditionalMenuItem[];
}

// 传统模式菜单配置
export const traditionalMenuConfig: TraditionalMenuItem[] = [
  {
    key: 'home',
    label: '首页',
    icon: 'HomeOutlined',
    path: '/'
  },
  {
    key: 'test',
    label: '用例管理',
    icon: 'UnorderedListOutlined',
    children: [
      { key: 'assistant', label: '用例助手', icon: 'RocketOutlined', path: '/assistant' },
      { key: 'list', label: '用例列表', icon: 'UnorderedListOutlined', path: '/test-cases' },
      { key: 'prompts', label: '提示词管理', icon: 'FileTextOutlined', path: '/prompts' },
      { key: 'system', label: '平台管理', icon: 'AppstoreOutlined', path: '/system' },
    ]
  },
  {
    key: 'defect',
    label: '缺陷管理',
    icon: 'BugOutlined',
    children: [
      { key: 'defect-list', label: '问题列表', icon: 'BugOutlined', path: '/defects/list' },
      { key: 'defect-urgent', label: '紧急问题跟踪', icon: 'FireOutlined', path: '/defects/urgent' },
      { key: 'defect-analysis', label: '数据分析', icon: 'BarChartOutlined', path: '/defects' },
      { key: 'defect-todo', label: '我的待办', icon: 'CheckSquareOutlined', path: '/defects/todo' },
      { key: 'defect-assistant', label: '缺陷助手', icon: 'RobotOutlined', path: '/defects/assistant' },
    ]
  },
  {
    key: 'app',
    label: '应用管理',
    icon: 'AppstoreOutlined',
    children: [
      { key: 'app-pending', label: '待部署应用', icon: 'ClockCircleOutlined', path: '/app-management/pending' },
      { key: 'app-history', label: '部署应用历史', icon: 'HistoryOutlined', path: '/app-management/history' },
      { key: 'app-config', label: '应用配置', icon: 'SettingOutlined', path: '/app-management/config' },
    ]
  },
  {
      key: 'admin',
      label: '系统管理',
      icon: 'SettingOutlined',
      children: [
        { key: 'admin-project', label: '项目管理', icon: 'ProjectOutlined', path: '/admin/project' },
        { key: 'admin-notification', label: '消息推送配置', icon: 'NotificationOutlined', path: '/admin/notification' },
        { key: 'admin-todo-reminder', label: '我的待办提醒', icon: 'BellOutlined', path: '/admin/todo-reminder' },
        { key: 'admin-database', label: '数据库配置', icon: 'DatabaseOutlined', path: '/admin/database' },
        { key: 'admin-llm', label: '大模型配置', icon: 'OpenAIOutlined', path: '/admin/llm' },
        { key: 'admin-monitoring', label: '系统监控', icon: 'DashboardOutlined', path: '/admin/monitoring' },
        { key: 'admin-plugins', label: '插件管理', icon: 'ApiOutlined', path: '/admin/plugins' },
        { key: 'admin-shortcuts', label: '快捷键配置', icon: 'KeyOutlined', path: '/admin/shortcuts' },
        { key: 'admin-users', label: '用户管理', icon: 'UserOutlined', path: '/admin/users' },
        { key: 'admin-roles', label: '角色管理', icon: 'TeamOutlined', path: '/admin/roles' },
      ]
    }
];

// 功能卡片配置
export interface FeatureCardConfig {
  title: string;
  description: string;
  icon: string;
  color: string;
  path: string;
}

export const featureCards: FeatureCardConfig[] = [
  {
    title: '用例管理',
    description: '完整的测试用例生命周期管理，支持执行状态跟踪',
    icon: 'CheckSquareOutlined',
    color: '#52c41a',
    path: '/test-cases'
  },
  {
    title: '缺陷管理',
    description: '跟踪和管理缺陷，支持状态更新和问题分析',
    icon: 'BugOutlined',
    color: '#faad14',
    path: '/defects'
  },
  {
    title: '应用管理',
    description: '管理应用部署流程，查看待部署应用和部署历史',
    icon: 'AppstoreOutlined',
    color: '#13c2c2',
    path: '/app-management/pending'
  },
  {
    title: '系统管理',
    description: '管理系统配置、数据库连接、大模型设置和系统监控',
    icon: 'SettingOutlined',
    color: '#722ed1',
    path: '/admin/monitoring'
  }
];
