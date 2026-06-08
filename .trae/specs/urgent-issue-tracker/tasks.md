# Tasks

- [x] Task 1: 更新导航菜单配置
  - [x] SubTask 1.1: 在 `navigation.ts` 的 `moduleSubMenus.defect` 中添加紧急问题跟踪菜单项
  - [x] SubTask 1.2: 在 `traditionalMenuConfig` 的缺陷管理子菜单中添加紧急问题跟踪菜单项

- [x] Task 2: 添加路由配置
  - [x] SubTask 2.1: 在 `AppRoutes.tsx` 中导入 `UrgentIssueTrackerPage`
  - [x] SubTask 2.2: 在极客模式和经典模式路由中添加 `/defects/urgent` 路由

- [x] Task 3: 创建紧急问题跟踪页面组件
  - [x] SubTask 3.1: 创建 `UrgentIssueTrackerPage.tsx` 页面组件
  - [x] SubTask 3.2: 创建 `UrgentIssueTable.tsx` 表格组件

- [x] Task 4: 实现系统维度统计卡片
  - [x] SubTask 4.1: 实现系统统计数据计算逻辑
  - [x] SubTask 4.2: 实现卡片UI组件，支持颜色变化（绿/黄/红）

- [x] Task 5: 实现问题列表功能
  - [x] SubTask 5.1: 实现固定筛选条件（优先级=紧急，状态≠已关闭）
  - [x] SubTask 5.2: 实现"已用时"列计算和颜色显示
  - [x] SubTask 5.3: 移除"新建问题"和"数据分析"按钮

- [x] Task 6: 实现数据导出功能
  - [x] SubTask 6.1: 实现按系统维度归类导出逻辑
  - [x] SubTask 6.2: 实现系统间间隔一行的Excel格式

# Task Dependencies
- Task 2 depends on Task 3 (路由需要引用页面组件)
- Task 4 depends on Task 3 (统计卡片在页面组件中实现)
- Task 5 depends on Task 3 (列表功能在表格组件中实现)
- Task 6 depends on Task 3 (导出功能在表格组件中实现)
