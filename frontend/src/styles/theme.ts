import { ThemeConfig } from 'antd';

// 主题类型定义 - 支持三种主题
export type ThemeType = 'light' | 'dark' | 'geek-light';

// 亮色主题 - 简洁明亮
export const lightThemeConfig: ThemeConfig = {
  token: {
    // 主色调 - 清爽蓝色
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // 中性色
    colorTextBase: '#262626',
    colorTextSecondary: '#595959',
    colorTextTertiary: '#8c8c8c',
    colorTextDisabled: '#bfbfbf',
    
    colorBgBase: '#f0f2f5',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f0f2f5',
    colorBgElevated: '#ffffff',
    
    // 边框色
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    
    // 字体
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    fontFamilyCode: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`,
    
    // 字号
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    
    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },
  components: {
    Button: {
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    Input: {
      borderRadius: 8,
    },
    Table: {
      borderRadius: 8,
      headerBorderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Menu: {
      colorItemBgSelected: 'rgba(24, 144, 255, 0.1)',
      colorItemTextSelected: '#1890ff',
    },
  },
};

// 暗色主题 - 炫酷赛博风格（浅底色版）
export const darkThemeConfig: ThemeConfig = {
  token: {
    // 主色调 - 赛博青蓝
    colorPrimary: '#00d4ff',
    colorSuccess: '#00ff88',
    colorWarning: '#ffcc00',
    colorError: '#ff3366',
    colorInfo: '#00d4ff',
    
    // 背景色 - 浅灰蓝色调
    colorBgBase: '#0f172a',
    colorBgContainer: '#1e293b',
    colorBgLayout: '#0f172a',
    colorBgElevated: '#334155',
    
    // 文字色
    colorTextBase: '#f1f5f9',
    colorTextSecondary: '#94a3b8',
    colorTextTertiary: '#64748b',
    colorTextDisabled: '#475569',
    
    // 边框色
    colorBorder: '#334155',
    colorBorderSecondary: '#1e293b',
    
    // 字体
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    fontFamilyCode: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`,
    
    // 字号
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    
    // 阴影 - 发光效果
    boxShadow: '0 4px 12px rgba(0, 212, 255, 0.15)',
    boxShadowSecondary: '0 8px 24px rgba(0, 212, 255, 0.2)',
  },
  components: {
    Button: {
      borderRadius: 8,
      boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
      primaryShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0, 212, 255, 0.1), inset 0 0 0 1px rgba(0, 212, 255, 0.1)',
    },
    Input: {
      borderRadius: 8,
      colorBorder: '#334155',
    },
    Table: {
      borderRadius: 8,
      headerBorderRadius: 8,
      colorBgContainer: '#1e293b',
      headerColor: '#f1f5f9',
    },
    Modal: {
      borderRadiusLG: 12,
      boxShadow: '0 0 40px rgba(0, 212, 255, 0.2), inset 0 0 0 1px rgba(0, 212, 255, 0.2)',
    },
    Menu: {
      colorItemBgSelected: 'rgba(0, 212, 255, 0.15)',
      colorItemTextSelected: '#00d4ff',
      darkItemBg: '#1e293b',
      darkItemSelectedBg: 'rgba(0, 212, 255, 0.15)',
    },
    Select: {
      colorBgContainer: '#1e293b',
    },
    DatePicker: {
      colorBgContainer: '#1e293b',
    },
    Dropdown: {
      colorBgElevated: '#1e293b',
    },
    Pagination: {
      colorBgContainer: '#1e293b',
      colorPrimary: '#00d4ff',
      colorPrimaryHover: '#00d4ff',
    },
    Switch: {
      colorPrimary: '#00d4ff',
      colorPrimaryHover: '#00d4ff',
    },
  },
};

// 极客亮色系主题 - 深蓝灰科技风
export const geekLightThemeConfig: ThemeConfig = {
  token: {
    // 主色调 - 亮蓝色（在深色背景下醒目）
    colorPrimary: '#3b82f6',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',

    // 背景色 - 明显的深蓝灰调
    colorBgBase: '#cbd5e1',
    colorBgContainer: '#e2e8f0',
    colorBgLayout: '#94a3b8',
    colorBgElevated: '#e2e8f0',

    // 文字色 - 深色（在蓝灰背景上）
    colorTextBase: '#0f172a',
    colorTextSecondary: '#334155',
    colorTextTertiary: '#475569',
    colorTextDisabled: '#64748b',

    // 边框色 - 蓝灰调
    colorBorder: '#94a3b8',
    colorBorderSecondary: '#cbd5e1',

    // 字体
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    fontFamilyCode: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`,

    // 字号
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,

    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,

    // 阴影 - 柔和的发光效果
    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
    boxShadowSecondary: '0 4px 12px rgba(37, 99, 235, 0.1)',
  },
  components: {
    Button: {
      borderRadius: 8,
      boxShadow: '0 0 10px rgba(37, 99, 235, 0.15)',
      primaryShadow: '0 0 15px rgba(37, 99, 235, 0.2)',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 2px 12px rgba(37, 99, 235, 0.06), inset 0 0 0 1px rgba(37, 99, 235, 0.05)',
    },
    Input: {
      borderRadius: 8,
      colorBorder: '#94a3b8',
    },
    Table: {
      borderRadius: 8,
      headerBorderRadius: 8,
      colorBgContainer: '#e2e8f0',
      headerColor: '#0f172a',
    },
    Modal: {
      borderRadiusLG: 12,
      boxShadow: '0 0 30px rgba(37, 99, 235, 0.15), inset 0 0 0 1px rgba(37, 99, 235, 0.1)',
    },
    Menu: {
      colorItemBgSelected: 'rgba(59, 130, 246, 0.15)',
      colorItemTextSelected: '#3b82f6',
      darkItemBg: '#e2e8f0',
      darkItemSelectedBg: 'rgba(59, 130, 246, 0.15)',
    },
    Select: {
      colorBgContainer: '#e2e8f0',
    },
    DatePicker: {
      colorBgContainer: '#e2e8f0',
    },
    Dropdown: {
      colorBgElevated: '#e2e8f0',
    },
    Pagination: {
      colorBgContainer: '#e2e8f0',
      colorPrimary: '#3b82f6',
      colorPrimaryHover: '#3b82f6',
    },
  },
};

// 主题配置映射
export const themeConfigs: Record<ThemeType, ThemeConfig> = {
  light: lightThemeConfig,
  dark: darkThemeConfig,
  'geek-light': geekLightThemeConfig,
};

// 兼容旧代码的导出
export const themeConfig = lightThemeConfig;
