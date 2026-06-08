# 时间范围定义问题修复计划

## 目标
修复时间范围定义问题，区分"上周/上个月"（固定时间范围）和"过去一周/过去一个月"（相对时间范围）的概念

## 问题定义

### 时间范围概念澄清
- **上周**：上周的周一到周日（固定的一周）
- **过去一周**：当前时间向前7天（相对时间）
- **上个月**：上个月的1号到最后一天（固定的一月）
- **过去一个月**：当前时间向前30天（相对时间）

### 当前问题
当前代码将"上周"和"上个月"错误地处理为"过去一周"和"过去一个月"，导致时间范围计算错误。

## 分析阶段

### 阶段1: 问题分析 (Issue Analysis) ✅
- [x] 分析当前时间范围处理逻辑
- [x] 识别所有受影响的文件
- [x] 记录当前实现的问题点

### 阶段2: 设计方案 (Design Solution) ✅
- [x] 设计正确的时间范围计算逻辑
- [x] 设计时间范围映射表
- [x] 设计API接口变更

### 阶段3: 实施修复 (Implementation) ✅
- [x] 修复DefectListSkill中的时间范围处理
- [x] 修复IntentRecognizer中的同义词库
- [x] 修复IntelligentQAService中的时间范围选项

### 阶段4: 测试验证 (Testing) ✅
- [x] 编写测试用例
- [x] 执行测试验证
- [x] 记录测试结果

### 阶段5: 文档更新 (Documentation) ✅
- [x] 生成修复报告
- [x] 更新进度记录
- [ ] 更新前端常用问题快捷按钮（待执行）
- [ ] 更新用户文档（待执行）

## 关键决策点
- ✅ 使用`_fixed`后缀区分固定时间范围和相对时间范围
- ✅ 保持向后兼容性，不修改原有的`week`、`month`等值
- ✅ 在UI中同时提供固定时间范围和相对时间范围选项

## 错误记录
| 错误 | 尝试 | 解决方案 |
|------|------|---------|
| 测试时区问题 | 1 | 使用本地时间并验证相对时间差，而不是绝对时间值 |

## 修复成果

### 已修改的文件
1. **DefectListSkill.ts** - 修复了时间范围计算逻辑
2. **IntentRecognizer.ts** - 更新了同义词库
3. **IntelligentQAService.ts** - 更新了时间范围选择选项

### 测试验证
- [x] 创建测试文件 `timeRange.test.ts`
- [x] 编写16个测试用例
- [x] 修复测试用例中的时区问题
- [x] 所有测试通过 (16/16)

### 时间范围映射表

#### 相对时间范围（从当前时间向前推）
| 用户输入 | timeRange值 | 计算逻辑 |
|---------|-------------|---------|
| 过去一周 | week | now - 7天 |
| 过去一个月 | month | now - 30天 |
| 过去三个月 | quarter | now - 90天 |
| 过去一年 | year | now - 365天 |

#### 固定时间范围（完整的时间周期）
| 用户输入 | timeRange值 | 计算逻辑 |
|---------|-------------|---------|
| 上周 | last_week_fixed | 上周一 ~ 上周日 |
| 上个月 | last_month_fixed | 上月1号 ~ 上月最后一天 |
| 上季度 | last_quarter_fixed | 上季度开始 ~ 上季度结束 |
| 去年 | last_year_fixed | 去年1月1日 ~ 去年12月31日 |
| 本周 | current_week_fixed | 本周一 ~ 本周日 |
| 本月 | current_month_fixed | 本月1号 ~ 本月最后一天 |
| 本季度 | current_quarter_fixed | 本季度开始 ~ 本季度结束 |
| 本年 | current_year_fixed | 本年1月1日 ~ 本年12月31日 |

## 下一步行动
1. 更新前端常用问题快捷按钮
2. 更新用户文档
3. 部署到测试环境验证
4. 收集用户反馈

## 总结

### 完成状态
✅ **所有核心任务已完成**

- 问题分析：完成
- 方案设计：完成
- 代码修复：完成
- 测试验证：完成（16/16通过）
- 文档生成：完成

### 交付物
- 代码修改：3个文件
- 测试文件：1个文件，16个测试用例
- 文档：4个文件（task_plan.md, findings.md, progress.md, FIX_REPORT.md）

### 测试结果
```
PASS  src/services/intelligentQa/skills/__tests__/timeRange.test.ts
  Relative Time Ranges
    √ should calculate last week (7 days) correctly
    √ should calculate last month (30 days) correctly
    √ should calculate last quarter (90 days) correctly
    √ should calculate last year (365 days) correctly
  Fixed Time Ranges
    √ should calculate last week fixed (last Monday to last Sunday) correctly
    √ should calculate last month fixed (1st to last day of last month) correctly
    √ should calculate last quarter fixed correctly
    √ should calculate last year fixed correctly
    √ should calculate current week fixed (this Monday to this Sunday) correctly
    √ should calculate current month fixed (1st to last day of this month) correctly
    √ should calculate current quarter fixed correctly
    √ should calculate current year fixed correctly
  Edge Cases
    √ should handle Sunday correctly (dayOfWeek = 0)
    √ should handle Monday correctly (dayOfWeek = 1)
    √ should handle year boundary correctly
    √ should handle leap year correctly

Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
```
