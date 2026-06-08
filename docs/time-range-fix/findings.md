# 时间范围定义问题分析发现

## 问题概述

### 用户反馈
用户指出"上周"与"过去一周"、"上个月"与"过去一个月"是两个不同的概念：
- **上周**：上周的周一到周日（固定的一周）
- **过去一周**：当前时间向前7天（相对时间）
- **上个月**：上个月的1号到最后一天（固定的一月）
- **过去一个月**：当前时间向前30天（相对时间）

### 当前实现问题
当前代码错误地将"上周"和"上个月"处理为"过去一周"和"过去一个月"，导致时间范围计算不准确。

## 受影响的文件

### 1. DefectListSkill.ts
**位置**：`backend/src/services/intelligentQa/skills/DefectListSkill.ts`

**当前实现**（第20-98行）：
```javascript
// 处理时间范围
if (timeRange && !startDate && !endDate) {
  // 如果时间范围是"all"，则不设置startDate和endDate，返回所有数据
  if (timeRange === 'all') {
    logger.debug('Time range set to all, returning all data');
  } else {
    const now = new Date();
    let start = new Date();
    
    switch (timeRange) {
      // 过去一周（7天）
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      // 过去一个月
      case 'month':
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      // 过去三个月
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        break;
      // 过去一年
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      // 今天
      case 'day':
      case '今天':
        start.setHours(0, 0, 0, 0);
        break;
      // 昨天
      case 'yesterday':
      case '昨天':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(0, 0, 0, 0);
        break;
      // 本周（从周一开始）
      case 'current_week':
      case '本周':
        const dayOfWeek = now.getDay() || 7; // 将周日从0改为7
        start.setDate(now.getDate() - dayOfWeek + 1);
        start.setHours(0, 0, 0, 0);
        break;
      // 本月（从1号开始）
      case 'current_month':
      case '本月':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      // 本季度（过去三个月）
      case '本季度':
        start.setMonth(now.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        break;
      // 本年（过去一年）
      case '本年':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        break;
    }
    
    startDate = start.toISOString();
    if (!endDate) {
      endDate = now.toISOString();
    }
    
    logger.debug('Time range calculated:', { timeRange, startDate, endDate });
  }
}
```

**问题分析**：
1. `case 'week'` 被注释为"过去一周（7天）"，但实际应该区分"上周"和"过去一周"
2. `case 'month'` 被注释为"过去一个月"，但实际应该区分"上个月"和"过去一个月"
3. 缺少对"上周"、"上个月"的处理
4. 缺少对"上周"、"上个月"同义词的识别

### 2. IntentRecognizer.ts
**位置**：`backend/src/services/intelligentQa/IntentRecognizer.ts`

**同义词库**（第57-60行）：
```javascript
'过去一个月': ['最近一个月', '上个月', '近一个月', '过去30天', '最近30天'],
'过去一周': ['最近一周', '上周', '近一周', '过去7天', '最近7天'],
```

**问题分析**：
1. "上周"被错误地归为"过去一周"的同义词
2. "上个月"被错误地归为"过去一个月"的同义词
3. 需要区分固定时间范围和相对时间范围

### 3. IntelligentQAService.ts
**位置**：`backend/src/services/intelligentQa/IntelligentQAService.ts`

**时间范围选择**（第123-129行，第246-279行）：
```javascript
// 处理时间范围选择
const timeRangeChoices = ['week', 'month', 'quarter', 'all'];
if (timeRangeChoices.includes(choice)) {
  // 用户选择了时间范围
  // ...
}

// 返回时间范围选择
options: [
  {
    label: '过去一周',
    value: 'week',
    data: { ...intentResult.entities, isList: true }
  },
  {
    label: '过去一个月',
    value: 'month',
    data: { ...intentResult.entities, isList: true }
  },
  // ...
]
```

**问题分析**：
1. 时间范围选项只有"过去一周"、"过去一个月"等相对时间
2. 缺少"上周"、"上个月"等固定时间选项
3. 需要扩展时间范围选项

## 时间范围映射表设计

### 相对时间范围（从当前时间向前推）
| 用户输入 | timeRange值 | 计算逻辑 | 示例（假设今天是2026-02-10周一） |
|---------|-------------|---------|---------------------------|
| 过去一周 | last_week | now - 7天 | 2026-02-03 ~ 2026-02-10 |
| 过去一个月 | last_month | now - 30天 | 2026-01-11 ~ 2026-02-10 |
| 过去三个月 | last_quarter | now - 90天 | 2025-11-12 ~ 2026-02-10 |
| 过去一年 | last_year | now - 365天 | 2025-02-10 ~ 2026-02-10 |
| 今天 | today | 今天的0:00 ~ 现在 | 2026-02-10 00:00 ~ 2026-02-10 现在 |
| 昨天 | yesterday | 昨天的0:00 ~ 23:59 | 2026-02-09 00:00 ~ 2026-02-09 23:59 |

### 固定时间范围（完整的时间周期）
| 用户输入 | timeRange值 | 计算逻辑 | 示例（假设今天是2026-02-10周一） |
|---------|-------------|---------|---------------------------|
| 上周 | last_week_fixed | 上周一 ~ 上周日 | 2026-02-02 ~ 2026-02-08 |
| 上个月 | last_month_fixed | 上月1号 ~ 上月最后一天 | 2026-01-01 ~ 2026-01-31 |
| 上季度 | last_quarter_fixed | 上季度开始 ~ 上季度结束 | 2025-10-01 ~ 2025-12-31 |
| 上年 | last_year_fixed | 去年1月1日 ~ 去年12月31日 | 2025-01-01 ~ 2025-12-31 |
| 本周 | current_week | 本周一 ~ 本周日 | 2026-02-08 ~ 2026-02-14 |
| 本月 | current_month | 本月1号 ~ 本月最后一天 | 2026-02-01 ~ 2026-02-28 |
| 本季度 | current_quarter | 本季度开始 ~ 本季度结束 | 2026-01-01 ~ 2026-03-31 |
| 本年 | current_year | 本年1月1日 ~ 本年12月31日 | 2026-01-01 ~ 2026-12-31 |

## 修复方案设计

### 方案1: 扩展timeRange值
- 保持现有的相对时间范围值（week, month, quarter, year）
- 新增固定时间范围值（last_week_fixed, last_month_fixed等）
- 在DefectListSkill中添加对应的处理逻辑

### 方案2: 使用对象传递时间范围
- 将timeRange改为对象结构
- 包含type（relative/fixed）和value（week/month等）
- 更灵活但需要更多改动

**推荐方案1**：改动较小，向后兼容性好

## 修复步骤

### 步骤1: 更新同义词库
- 将"上周"、"上个月"从"过去一周"、"过去一个月"的同义词中移除
- 添加新的同义词映射

### 步骤2: 扩展时间范围处理
- 在DefectListSkill中添加固定时间范围的处理逻辑
- 添加上周、上个月等固定时间范围的计算

### 步骤3: 更新UI选项
- 在IntelligentQAService中添加固定时间范围选项
- 更新前端显示

### 步骤4: 测试验证
- 编写测试用例
- 验证各种时间范围的计算正确性

## 待确认问题
1. 是否需要同时支持"上周"、"上个月"和"过去一周"、"过去一个月"？
2. 用户界面如何展示这些选项？
3. 是否需要向后兼容旧的API？
