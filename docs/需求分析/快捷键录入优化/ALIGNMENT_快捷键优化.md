# 对齐文档：快捷键录入优化

> 文档版本：v1.0
> 创建时间：2026-02-26
> 状态：进行中

## 1. 原始需求

用户描述：
> 系统管理，快捷键配置页面，修改快捷键时，只有在用户点击了编辑区域之后才激活读取用户键盘输入，未点击编辑区域，不管用户怎么输入都不作为快捷键，并且在点击编辑区域，没有友好示意，在用户点击了编辑区时，需要有一个荧光背景提示，说明已经可以录入快捷键了

## 2. 需求理解

### 2.1 当前问题分析

通过代码审查 [ShortcutConfigPage.tsx](file:///d:/自动化测试平台/AITestCraft-Tech-style/frontend/src/pages/admin/ShortcutConfigPage.tsx)，发现以下问题：

**问题1：键盘监听范围过大**
- 当前实现：当模态框打开时，`KeyCaptureModal` 组件在 `useEffect` 中直接监听 `window` 的 `keydown` 事件
- 代码位置：第253-264行
- 问题：用户未点击编辑区域时，按键也会被捕获

```typescript
// 当前问题代码
useEffect(() => {
  if (visible) {
    setCapturedConfig(null);
    setValidationError(null);
    window.addEventListener('keydown', handleKeyDown, true); // 全局监听
    setTimeout(() => inputRef.current?.focus(), 100);
  }
  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
  };
}, [visible, handleKeyDown]);
```

**问题2：缺乏视觉反馈**
- 当前编辑区域只是一个普通的虚线边框区域
- 用户点击后没有明显的视觉提示表明"已激活，可以录入快捷键"
- 需要添加荧光背景提示效果

### 2.2 期望行为

1. **点击激活机制**：
   - 模态框打开后，编辑区域默认不监听键盘输入
   - 用户必须点击编辑区域后才激活键盘监听
   - 未点击时，键盘输入被忽略

2. **视觉反馈**：
   - 编辑区域需要有明显的视觉提示
   - 点击激活后显示荧光/高亮背景
   - 提示用户"已激活，请按下快捷键"

## 3. 项目上下文分析

### 3.1 技术栈
- React + TypeScript
- Ant Design 组件库
- 极客风格主题（支持暗黑模式）

### 3.2 相关文件
- [ShortcutConfigPage.tsx](file:///d:/自动化测试平台/AITestCraft-Tech-style/frontend/src/pages/admin/ShortcutConfigPage.tsx) - 快捷键配置页面
- [shortcutConfig.ts](file:///d:/自动化测试平台/AITestCraft-Tech-style/frontend/src/config/shortcutConfig.ts) - 快捷键配置定义
- [ShortcutContext.tsx](file:///d:/自动化测试平台/AITestCraft-Tech-style/frontend/src/contexts/ShortcutContext.tsx) - 快捷键状态管理
- [useKeyboardShortcuts.ts](file:///d:/自动化测试平台/AITestCraft-Tech-style/frontend/src/hooks/useKeyboardShortcuts.ts) - 快捷键Hook

### 3.3 现有UI风格
- 暗黑模式：使用 `rgba(0, 212, 255, x)` 青色作为主色调
- 卡片背景：`rgba(10, 15, 30, 0.8)`
- 边框颜色：`rgba(0, 212, 255, 0.3)`
- 荧光效果可通过 box-shadow 实现

## 4. 边界确认

### 4.1 包含范围
- 修改 `KeyCaptureModal` 组件的键盘监听逻辑
- 添加点击激活机制
- 添加荧光背景视觉提示
- 支持暗黑/明亮两种主题

### 4.2 不包含范围
- 不修改快捷键配置数据结构
- 不修改快捷键验证逻辑
- 不修改快捷键冲突检测
- 不涉及快捷键存储逻辑

## 5. 疑问澄清

### 5.1 已做假设
1. **荧光颜色**：使用项目主色调青色 `#00d4ff`，与现有极客风格保持一致
2. **激活状态提示文字**：在编辑区域内显示"已激活，请按下快捷键..."提示
3. **点击区域**：整个编辑区域都可点击激活

### 5.2 待确认事项
无，需求明确，可直接进入设计阶段。

## 6. 验收标准预览

- [ ] 模态框打开后，未点击编辑区域时，键盘输入不被捕获
- [ ] 点击编辑区域后，显示荧光背景效果
- [ ] 点击编辑区域后，键盘输入被正确捕获
- [ ] 暗黑模式和明亮模式都有合适的视觉效果
- [ ] 捕获成功后显示快捷键和验证结果

---

**下一步**：进入 Architect 阶段，设计技术实现方案。
