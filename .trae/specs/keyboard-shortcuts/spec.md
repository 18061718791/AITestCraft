# 极客模式快捷键配置功能 Spec

## Why
在极客模式下，左右隐藏栏和底部任务窗口目前仅支持鼠标悬停唤起，操作效率较低。为了提升用户体验，需要引入快捷键系统，允许用户通过键盘快速唤起和切换各个面板，并支持自定义快捷键配置。

## What Changes
- 新增系统管理-快捷键配置页面，支持灵活配置快捷键
- 极客模式下，左右隐藏栏和底部任务窗口支持快捷键唤起
- 快捷键冲突检测机制，避免与系统/浏览器快捷键冲突
- 左右隐藏栏菜单项支持方向键上下切换选择
- 底部任务窗口支持Tab键循环切换标签

## Impact
- Affected specs: 系统管理模块、极客模式UI交互
- Affected code: 
  - `frontend/src/components/LeftCollapseBar.tsx`
  - `frontend/src/components/RightCollapseBar.tsx`
  - `frontend/src/components/BottomTabBar.tsx`
  - `frontend/src/layouts/FeatureLayout.tsx`
  - 新增快捷键配置页面
  - 新增快捷键管理Hook和Context

## ADDED Requirements

### Requirement: 快捷键配置页面
The system SHALL provide a shortcut configuration page in System Management.

#### Scenario: 访问快捷键配置页面
- **GIVEN** 用户具有系统管理权限
- **WHEN** 用户点击"系统管理" → "快捷键配置"
- **THEN** 系统显示快捷键配置页面，展示可配置的快捷键列表

#### Scenario: 配置快捷键
- **GIVEN** 用户在快捷键配置页面
- **WHEN** 用户点击某个快捷键的"修改"按钮
- **THEN** 系统显示按键捕获模式，提示用户按下新的快捷键组合
- **AND** 快捷键格式固定为 `Ctrl + [用户按键]`

#### Scenario: 快捷键冲突检测
- **GIVEN** 用户正在设置新的快捷键
- **WHEN** 用户按下的组合键与以下冲突时：
  - 浏览器默认快捷键（如 Ctrl+T 打开新标签页）
  - 操作系统快捷键（如 Ctrl+C 复制）
  - 已配置的其他快捷键
- **THEN** 系统显示冲突警告，不允许保存该快捷键
- **AND** 提示用户该快捷键已被占用

### Requirement: 左右隐藏栏快捷键唤起
The system SHALL support keyboard shortcuts to expand left/right collapse bars in geek mode.

#### Scenario: 唤起左侧隐藏栏
- **GIVEN** 当前处于极客模式
- **WHEN** 用户按下 `Ctrl + ←`（方向键左）
- **THEN** 左侧隐藏栏展开，显示功能菜单
- **AND** 只要Ctrl键不松开，左侧栏保持展开状态

#### Scenario: 唤起右侧隐藏栏
- **GIVEN** 当前处于极客模式
- **WHEN** 用户按下 `Ctrl + →`（方向键右）
- **THEN** 右侧隐藏栏展开，显示快速导航
- **AND** 只要Ctrl键不松开，右侧栏保持展开状态

#### Scenario: 左右栏菜单切换
- **GIVEN** 左侧或右侧隐藏栏已通过快捷键展开
- **WHEN** 用户按住Ctrl不松，同时按 `↑` 或 `↓`
- **THEN** 在展开的栏内上下切换菜单项选择
- **AND** 被选中的菜单项高亮显示

#### Scenario: 确认选择并导航
- **GIVEN** 用户已通过方向键选中某个菜单项
- **WHEN** 用户松开Ctrl键
- **THEN** 隐藏栏收起
- **AND** 如果选中了菜单项，则导航到对应页面

### Requirement: 底部任务窗口快捷键唤起
The system SHALL support keyboard shortcuts to expand and switch tabs in bottom task window.

#### Scenario: 唤起底部任务窗口
- **GIVEN** 当前处于极客模式
- **WHEN** 用户按下 `Ctrl + Tab`
- **THEN** 底部任务窗口展开，显示所有打开的标签
- **AND** 只要Ctrl键不松开，任务窗口保持展开状态

#### Scenario: 循环切换标签
- **GIVEN** 底部任务窗口已通过快捷键展开
- **WHEN** 用户按住Ctrl不松，再次按下 `Tab`
- **THEN** 切换到下一个标签（循环切换）
- **AND** 当前选中的标签高亮显示

#### Scenario: 确认切换到选中标签
- **GIVEN** 用户已通过Tab键选中某个标签
- **WHEN** 用户松开Ctrl键
- **THEN** 任务窗口收起
- **AND** 页面切换到选中的标签页

### Requirement: 快捷键作用域控制
The system SHALL control the scope of keyboard shortcuts.

#### Scenario: 仅在极客模式生效
- **GIVEN** 用户处于经典模式
- **WHEN** 用户按下任何配置的快捷键
- **THEN** 快捷键不触发任何操作

#### Scenario: 输入框焦点时禁用
- **GIVEN** 当前焦点在 input、textarea 或 contenteditable 元素中
- **WHEN** 用户按下快捷键
- **THEN** 快捷键不触发，避免干扰文本输入

## MODIFIED Requirements
无

## REMOVED Requirements
无

## 默认快捷键配置

| 功能 | 默认快捷键 | 说明 |
|------|-----------|------|
| 左侧隐藏栏 | Ctrl + ← | 唤起左侧功能菜单 |
| 右侧隐藏栏 | Ctrl + → | 唤起右侧快速导航 |
| 底部任务窗口 | Ctrl + Tab | 唤起底部标签栏 |

## 冲突检测列表

### 浏览器快捷键（禁止配置）
- Ctrl+T: 打开新标签页
- Ctrl+W: 关闭当前标签页
- Ctrl+R/F5: 刷新页面
- Ctrl+N: 打开新窗口
- Ctrl+S: 保存页面
- Ctrl+P: 打印
- Ctrl+F: 查找
- Ctrl+H: 历史记录
- Ctrl+J: 下载
- Ctrl+D: 收藏
- Ctrl+L: 聚焦地址栏
- Ctrl+K: 搜索
- Ctrl+C/V/X/A/Z/Y: 复制/粘贴/剪切/全选/撤销/重做

### 系统快捷键（禁止配置）
- Ctrl+Alt+Delete: 系统安全选项
- Ctrl+Shift+Esc: 任务管理器
- Win+方向键: 窗口管理

## 技术约束
1. 使用 `keydown`/`keyup` 事件监听键盘操作
2. 使用 React Context 管理快捷键配置状态
3. 快捷键配置持久化到 localStorage
4. 支持快捷键配置导入/导出（可选）
