import { ThemeConfig } from 'antd';

// Ant Design主题配置
export const themeConfig: ThemeConfig = {
  token: {
    // 主色调
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
    
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
    
    // 边框色
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    
    // 字体
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
    fontFamilyCode: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace`,
    
    // 字号
    fontSize: 16,
    fontSizeSM: 14,
    fontSizeLG: 18,
    fontSizeXL: 20,
    
    // 字重
    fontWeightStrong: 600,
    
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    
    // 尺寸
    sizeStep: 8,
    sizeUnit: 4,
    
    // 控制高度
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
    
    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },
  components: {
    Button: {
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      primaryShadow: '0 2px 8px rgba(24, 144, 255, 0.2)',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    Input: {
      borderRadius: 8,
      colorBorder: '#d9d9d9',
    },
    Table: {
      borderRadius: 8,
      headerBorderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 12,
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.14)',
    },
    Select: {
      borderRadius: 8,
    },
    Tag: {
      borderRadius: 4,
    },
    Badge: {
      colorBgContainer: '#ffffff',
    },
  },
};

// 暗色主题配置
export const darkThemeConfig: ThemeConfig = {
  token: {
    ...themeConfig.token,
    colorPrimary: '#177ddc',
    colorBgBase: '#141414',
    colorBgContainer: '#1f1f1f',
    colorBgLayout: '#000000',
    colorTextBase: '#ffffff',
    colorTextSecondary: '#a6a6a6',
    colorTextTertiary: '#595959',
    colorBorder: '#424242',
    colorBorderSecondary: '#303030',
  },
};