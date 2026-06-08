# 紧急问题跟踪功能 Spec

## Why
缺陷管理模块需要一个新的紧急问题跟踪页面，用于以项目维度展示未关闭状态的优先级为紧急的问题数据。这有助于团队快速识别和处理高优先级问题，提升问题响应效率。

## What Changes
- **新增页面**: 紧急问题跟踪页面 (`/defects/urgent`)
- **新增菜单项**: 在缺陷管理二级菜单中添加"紧急问题跟踪"菜单
- **新增组件**: 紧急问题跟踪表格组件，支持系统维度统计卡片展示
- **新增导出功能**: 支持按系统维度归类导出紧急问题数据

## Impact
- Affected specs: 缺陷管理模块导航、缺陷列表展示、数据导出
- Affected code: 
  - `navigation.ts` - 菜单配置
  - `AppRoutes.tsx` - 路由配置
  - `DefectTable.tsx` - 参考现有实现
  - 新增 `UrgentIssueTrackerPage.tsx` 和 `UrgentIssueTable.tsx`

## ADDED Requirements

### Requirement: 紧急问题跟踪页面
The system SHALL provide an urgent issue tracking page accessible from the defect management menu.

#### Scenario: 页面访问
- **WHEN** 用户点击缺陷管理菜单下的"紧急问题跟踪"
- **THEN** 系统显示紧急问题跟踪页面

#### Scenario: 系统维度统计卡片
- **WHEN** 页面加载时
- **THEN** 页面顶部显示各系统的统计卡片
- **AND** 每个卡片显示系统名称、紧急问题个数、平均已用时天数
- **AND** 卡片颜色根据平均已用时变化：
  - ≤2天：绿色
  - >2天且≤5天：黄色
  - >5天：红色

#### Scenario: 问题列表展示
- **WHEN** 用户选择项目后
- **THEN** 列表只展示优先级为紧急且状态不为"已关闭"的问题
- **AND** 列表列包含：ID、系统/模块、标题、状态、优先级、分配给、创建时间、已用时
- **AND** "已用时"列计算规则：
  - 计算当天时间与创建时间的差值（天数）
  - **排除周末（周六、周日）**
  - 0.5为最低单位，不足0.5算0.5，超过0.5算1天
  - 显示格式为"X天"
  - 颜色规则：
    - ≤2天：绿色
    - >2天且≤5天：黄色
    - >5天：红色

#### Scenario: 筛选条件
- **GIVEN** 紧急问题跟踪页面
- **THEN** 筛选条件包含：项目选择、缺陷编号、系统名称、模块、状态、分配给、日期范围
- **AND** 不包含优先级筛选（因为已固定为紧急）
- **AND** 状态筛选默认排除"已关闭"

#### Scenario: 数据导出
- **WHEN** 用户点击"导出数据"按钮
- **THEN** 系统导出Excel文件
- **AND** 数据按系统维度归类
- **AND** 系统与系统之间间隔一行
- **AND** 导出模板字段参照缺陷助手下载问题数据模板

#### Scenario: 按钮配置
- **GIVEN** 紧急问题跟踪页面
- **THEN** 不显示"新建问题"按钮
- **AND** 不显示"数据分析"按钮
- **AND** 显示"导出数据"按钮

## MODIFIED Requirements

### Requirement: 导航菜单
在缺陷管理二级菜单中添加紧急问题跟踪菜单项：
- key: 'urgent'
- label: '紧急问题跟踪'
- icon: 'FireOutlined' (或类似的紧急/警告图标)
- path: '/defects/urgent'

### Requirement: 路由配置
在AppRoutes.tsx中添加新路由：
- path: 'defects/urgent'
- element: UrgentIssueTrackerPage

## Technical Notes

### 已用时计算规则（排除周末）
```typescript
function calculateElapsedDays(createdOn: string): { days: number; color: string } {
  const created = new Date(createdOn);
  const now = new Date();
  
  // 计算工作日天数（排除周末）
  let workDays = 0;
  const current = new Date(created);
  
  while (current < now) {
    const dayOfWeek = current.getDay();
    // 0=周日, 6=周六
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  // 转换为带小数的天数（按24小时比例）
  const hours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  const totalDays = hours / 24;
  const weekendDays = Math.floor(totalDays) - workDays;
  const workDaysWithFraction = totalDays - weekendDays;
  
  // 0.5为最低单位
  let days: number;
  if (workDaysWithFraction <= 0.5) {
    days = 0.5;
  } else {
    days = Math.ceil(workDaysWithFraction * 2) / 2; // 向上取整到0.5单位
  }
  
  // 颜色判断
  let color: string;
  if (days <= 2) {
    color = 'green';
  } else if (days <= 5) {
    color = 'yellow';
  } else {
    color = 'red';
  }
  
  return { days, color };
}
```

### 系统统计计算
```typescript
interface SystemStats {
  systemId: string;
  systemName: string;
  count: number;
  avgElapsedDays: number;
  color: string;
}
```

### API参数
查询参数需要固定：
- `priority_id: ['4']` (紧急问题)
- `status_id: ['1', '2', '3', '4', '8']` (排除已关闭)
