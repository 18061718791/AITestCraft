/**
 * 测试设计方法识别器
 * 根据测试点内容自动识别最合适的设计方法
 */

export type DesignMethod =
  | '等价类划分'
  | '边界值分析'
  | '场景法'
  | '错误推测法'
  | '判定表驱动法'
  | '状态迁移法'
  | '正交试验法'
  | '功能分解法'
  | '探索式测试';

interface DesignMethodRule {
  method: DesignMethod;
  keywords: string[];
  weight: number; // 权重
}

// 设计方法识别规则 - 按优先级排序（高优先级在前）
const DESIGN_METHOD_RULES: DesignMethodRule[] = [
  {
    method: '边界值分析',
    weight: 10,
    keywords: [
      '小于', '大于', '小于等于', '大于等于', '超过', '不足', '至少', '至多',
      '最小', '最大', '最短', '最长', '最低', '最高',
      '等于', '刚好', '恰好',
    ],
  },
  {
    method: '错误推测法',
    weight: 9,
    keywords: [
      '连续', '多次', '重复',
      '锁定', '冻结', '封禁', '限制', '禁用',
      '错误提示', '提示信息', '友好提示',
    ],
  },
  {
    method: '状态迁移法',
    weight: 8,
    keywords: [
      '状态变化', '状态迁移', '状态转换',
      '登录状态', '退出状态', '在线', '离线', '激活', '未激活',
      '待审核', '已审核', '已通过', '已拒绝', '已完成', '已取消',
    ],
  },
  {
    method: '场景法',
    weight: 7,
    keywords: [
      '流程', '业务流程', '操作流程', '登录流程', '注册流程',
      '完整流程', '正常流程', '标准流程',
      '步骤', '多步骤', '分步',
      '使用场景', '业务场景',
    ],
  },
  {
    method: '判定表驱动法',
    weight: 6,
    keywords: [
      '条件组合', '多条件', '同时满足',
      '权限组合', '角色组合',
      '同时包含', '既...又',
    ],
  },
  {
    method: '正交试验法',
    weight: 5,
    keywords: [
      '多因素', '多参数', '参数组合',
      '配置组合', '不同配置',
      '兼容性', '浏览器', '设备', '平台',
    ],
  },
  {
    method: '功能分解法',
    weight: 4,
    keywords: [
      '子功能', '模块功能',
      '拆分', '子模块', '子系统',
    ],
  },
  {
    method: '探索式测试',
    weight: 3,
    keywords: [
      '探索', '尝试', '随机', '随意',
      '潜在', '隐藏', '深层',
    ],
  },
  {
    method: '等价类划分',
    weight: 1,
    keywords: [
      '有效', '无效', '合法', '不合法', '正确', '不正确',
      '分类', '类别', '类型', '有效类', '无效类',
      '正常', '异常', '标准', '非标准',
    ],
  },
];

/**
 * 根据测试点内容识别设计方法
 * @param content 测试点内容
 * @returns 识别出的设计方法
 */
export function recognizeDesignMethod(content: string): DesignMethod {
  if (!content || typeof content !== 'string') {
    return '等价类划分';
  }

  const normalizedContent = content.toLowerCase();
  
  // 按优先级顺序检查每个规则
  for (const rule of DESIGN_METHOD_RULES) {
    for (const keyword of rule.keywords) {
      if (normalizedContent.includes(keyword.toLowerCase())) {
        return rule.method;
      }
    }
  }

  // 特殊规则：如果包含"错误"但不包含"连续"、"多次"等，则可能是等价类划分
  if (normalizedContent.includes('错误') && !normalizedContent.includes('连续') && !normalizedContent.includes('多次')) {
    return '等价类划分';
  }

  // 默认返回等价类划分
  return '等价类划分';
}

/**
 * 批量识别测试点的设计方法
 * @param testPoints 测试点数组
 * @returns 带有设计方法的测试点数组
 */
export function recognizeDesignMethodsForTestPoints<T extends { content?: string; designMethod?: string }>(
  testPoints: T[]
): T[] {
  return testPoints.map((point) => ({
    ...point,
    designMethod: recognizeDesignMethod(point.content || ''),
  }));
}

export default {
  recognizeDesignMethod,
  recognizeDesignMethodsForTestPoints,
};
