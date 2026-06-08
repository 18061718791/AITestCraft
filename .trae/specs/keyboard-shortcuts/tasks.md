# Tasks

## Phase 1: 基础架构搭建

- [x] Task 1: 创建快捷键管理 Context 和 Hook
  - [x] SubTask 1.1: 创建 `ShortcutContext.tsx` 管理快捷键配置状态
  - [x] SubTask 1.2: 创建 `useKeyboardShortcuts.ts` Hook 处理键盘事件监听
  - [x] SubTask 1.3: 创建 `shortcutConfig.ts` 定义默认快捷键配置和冲突检测列表
  - [x] SubTask 1.4: 实现快捷键配置的 localStorage 持久化

## Phase 2: 快捷键配置页面

- [x] Task 2: 创建快捷键配置页面
  - [x] SubTask 2.1: 创建 `ShortcutConfigPage.tsx` 页面组件
  - [x] SubTask 2.2: 实现快捷键列表展示（左侧栏、右侧栏、底部任务窗口）
  - [x] SubTask 2.3: 实现按键捕获模式（监听用户按键）
  - [x] SubTask 2.4: 实现快捷键冲突检测逻辑
  - [x] SubTask 2.5: 实现快捷键配置保存/重置功能
  - [x] SubTask 2.6: 在系统管理菜单中添加"快捷键配置"入口

## Phase 3: 左右隐藏栏快捷键支持

- [x] Task 3: 为 LeftCollapseBar 添加快捷键支持
  - [x] SubTask 3.1: 集成快捷键监听，响应 `Ctrl + ←`
  - [x] SubTask 3.2: 实现按住Ctrl时栏保持展开状态
  - [x] SubTask 3.3: 实现 `↑` `↓` 方向键切换菜单项选择
  - [x] SubTask 3.4: 实现松开Ctrl后导航到选中菜单项
  - [x] SubTask 3.5: 添加菜单项高亮显示效果

- [x] Task 4: 为 RightCollapseBar 添加快捷键支持
  - [x] SubTask 4.1: 集成快捷键监听，响应 `Ctrl + →`
  - [x] SubTask 4.2: 实现按住Ctrl时栏保持展开状态
  - [x] SubTask 4.3: 实现 `↑` `↓` 方向键切换菜单项选择
  - [x] SubTask 4.4: 实现松开Ctrl后导航到选中菜单项
  - [x] SubTask 4.5: 添加菜单项高亮显示效果

- [x] Task 5: 为 BottomTabBar 添加快捷键支持
  - [x] SubTask 5.1: 集成快捷键监听，响应 `Ctrl + Tab`
  - [x] SubTask 5.2: 实现按住Ctrl时任务窗口保持展开状态
  - [x] SubTask 5.3: 实现连续按Tab循环切换标签
  - [x] SubTask 5.4: 实现松开Ctrl后切换到选中标签页
  - [x] SubTask 5.5: 添加标签高亮显示效果

## Phase 5: 集成与优化

- [x] Task 6: FeatureLayout 集成与作用域控制
  - [x] SubTask 6.1: 在 FeatureLayout 中集成 ShortcutProvider
  - [x] SubTask 6.2: 实现仅在极客模式下生效的逻辑
  - [x] SubTask 6.3: 实现输入框焦点时禁用快捷键
  - [x] SubTask 6.4: 测试各组件快捷键协同工作

## Phase 6: 测试与验证

- [x] Task 7: 功能测试
  - [x] SubTask 7.1: 测试快捷键配置页面功能
  - [x] SubTask 7.2: 测试左右隐藏栏快捷键唤起
  - [x] SubTask 7.3: 测试底部任务窗口快捷键唤起
  - [x] SubTask 7.4: 测试快捷键冲突检测
  - [x] SubTask 7.5: 测试配置持久化

# Task Dependencies

```
Task 1 (基础架构)
  ├── Task 2 (配置页面)
  ├── Task 3 (左侧栏)
  ├── Task 4 (右侧栏)
  └── Task 5 (底部任务窗口)
       └── Task 6 (集成优化)
            └── Task 7 (测试验证)
```

- Task 2/3/4/5 可以并行开发，都依赖 Task 1
- Task 6 依赖 Task 3/4/5
- Task 7 依赖 Task 6
