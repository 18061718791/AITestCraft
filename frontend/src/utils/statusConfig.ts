import { TestCaseStatus } from '../types/testCase';

// 状态配置映射
export const STATUS_CONFIG = {
  [TestCaseStatus.PENDING]: {
    color: 'orange',
    text: '待测试',
    icon: '⏳',
    antdColor: 'orange',
  },
  [TestCaseStatus.PASSED]: {
    color: 'green',
    text: '通过',
    icon: '✅',
    antdColor: 'green',
  },
  [TestCaseStatus.FAILED]: {
    color: 'red',
    text: '失败',
    icon: '❌',
    antdColor: 'red',
  },
  [TestCaseStatus.SKIPPED]: {
    color: 'gray',
    text: '跳过',
    icon: '⏭️',
    antdColor: 'blue',
  },
} as const;

// 状态选项列表 - 用于筛选器（包含所有状态）
export const STATUS_OPTIONS = [
  { value: TestCaseStatus.PENDING, label: '待测试', color: 'orange' },
  { value: TestCaseStatus.PASSED, label: '通过', color: 'green' },
  { value: TestCaseStatus.FAILED, label: '失败', color: 'red' },
  { value: TestCaseStatus.SKIPPED, label: '跳过', color: 'gray' },
] as const;

// 状态选项列表 - 用于筛选器（不包含SKIPPED）
export const STATUS_OPTIONS_FILTER = [
  { value: TestCaseStatus.PENDING, label: '待测试', color: 'orange' },
  { value: TestCaseStatus.PASSED, label: '通过', color: 'green' },
  { value: TestCaseStatus.FAILED, label: '失败', color: 'red' },
] as const;

// 状态选项列表 - 用于新建/编辑用例（不包含SKIPPED）
export const STATUS_OPTIONS_EDITABLE = [
  { value: TestCaseStatus.PENDING, label: '待测试', color: 'orange' },
  { value: TestCaseStatus.PASSED, label: '通过', color: 'green' },
  { value: TestCaseStatus.FAILED, label: '失败', color: 'red' },
] as const;

// 获取状态配置的工具函数
export const getStatusConfig = (status: TestCaseStatus) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG[TestCaseStatus.PENDING];
};

// 获取状态颜色
export const getStatusColor = (status: TestCaseStatus): string => {
  return getStatusConfig(status).antdColor;
};

// 获取状态文本
export const getStatusText = (status: TestCaseStatus): string => {
  return getStatusConfig(status).text;
};