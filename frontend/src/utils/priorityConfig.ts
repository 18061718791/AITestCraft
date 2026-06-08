import { TestCasePriority } from '../types/testCase';

// 优先级配置映射
export const PRIORITY_CONFIG = {
  [TestCasePriority.LOW]: {
    color: 'blue',
    text: '低',
    antdColor: 'blue',
  },
  [TestCasePriority.MEDIUM]: {
    color: 'orange',
    text: '中',
    antdColor: 'orange',
  },
  [TestCasePriority.HIGH]: {
    color: 'red',
    text: '高',
    antdColor: 'red',
  },
} as const;

// 优先级选项列表
export const PRIORITY_OPTIONS = [
  { value: TestCasePriority.LOW, label: '低', color: 'blue' },
  { value: TestCasePriority.MEDIUM, label: '中', color: 'orange' },
  { value: TestCasePriority.HIGH, label: '高', color: 'red' },
] as const;

// 获取优先级配置的工具函数
export const getPriorityConfig = (priority: TestCasePriority) => {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[TestCasePriority.MEDIUM];
};

// 获取优先级颜色
export const getPriorityColor = (priority: TestCasePriority): string => {
  return getPriorityConfig(priority).antdColor;
};

// 获取优先级文本
export const getPriorityText = (priority: TestCasePriority): string => {
  return getPriorityConfig(priority).text;
};