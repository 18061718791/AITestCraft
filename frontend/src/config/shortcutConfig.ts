/**
 * 快捷键配置
 * 定义默认快捷键配置和冲突检测列表
 */

export type ShortcutAction = 'toggleLeftPanel' | 'toggleRightPanel' | 'toggleBottomPanel';

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
}

export type ShortcutMap = Record<ShortcutAction, ShortcutConfig>;

/**
 * 默认快捷键配置
 */
export const defaultShortcuts: ShortcutMap = {
  toggleLeftPanel: {
    key: 'ArrowLeft',
    ctrlKey: true,
    description: '切换左侧栏显示/隐藏',
  },
  toggleRightPanel: {
    key: 'ArrowRight',
    ctrlKey: true,
    description: '切换右侧栏显示/隐藏',
  },
  toggleBottomPanel: {
    key: 'ArrowDown',
    ctrlKey: true,
    description: '切换底部任务窗口显示/隐藏',
  },
};

/**
 * 冲突检测列表 - 浏览器和系统常用快捷键
 * 这些快捷键不建议用户自定义使用，以避免与浏览器/系统功能冲突
 */
export const reservedShortcuts: ShortcutConfig[] = [
  // 浏览器通用快捷键
  { key: 't', ctrlKey: true, description: '打开新标签页' },
  { key: 'w', ctrlKey: true, description: '关闭当前标签页' },
  { key: 'r', ctrlKey: true, description: '刷新页面' },
  { key: 'f', ctrlKey: true, description: '查找' },
  { key: 'p', ctrlKey: true, description: '打印' },
  { key: 's', ctrlKey: true, description: '保存' },
  { key: 'a', ctrlKey: true, description: '全选' },
  { key: 'c', ctrlKey: true, description: '复制' },
  { key: 'v', ctrlKey: true, description: '粘贴' },
  { key: 'x', ctrlKey: true, description: '剪切' },
  { key: 'z', ctrlKey: true, description: '撤销' },
  { key: 'y', ctrlKey: true, description: '重做' },
  { key: 'n', ctrlKey: true, description: '新建窗口' },
  { key: 'l', ctrlKey: true, description: '聚焦地址栏' },
  { key: 'j', ctrlKey: true, description: '下载' },
  { key: 'h', ctrlKey: true, description: '历史记录' },
  { key: 'd', ctrlKey: true, description: '添加书签' },
  { key: 'u', ctrlKey: true, description: '查看源代码' },
  { key: '0', ctrlKey: true, description: '恢复默认缩放' },
  { key: 'plus', ctrlKey: true, description: '放大' },
  { key: 'minus', ctrlKey: true, description: '缩小' },

  // F1-F12 功能键
  { key: 'F1', description: '帮助' },
  { key: 'F3', description: '查找下一个' },
  { key: 'F5', description: '刷新' },
  { key: 'F6', description: '聚焦地址栏' },
  { key: 'F11', description: '全屏' },
  { key: 'F12', description: '开发者工具' },

  // 系统级快捷键 (Windows/Linux)
  { key: 'Tab', altKey: true, description: '切换窗口' },
  { key: 'F4', altKey: true, description: '关闭窗口' },
  { key: 'Escape', description: '取消/关闭' },
  { key: 'Delete', description: '删除' },

  // macOS 系统快捷键
  { key: 'Tab', metaKey: true, description: '切换应用' },
  { key: 'q', metaKey: true, description: '退出应用' },
  { key: 'w', metaKey: true, description: '关闭窗口' },
  { key: 'm', metaKey: true, description: '最小化窗口' },
  { key: 'h', metaKey: true, description: '隐藏应用' },
  { key: 'comma', metaKey: true, description: '偏好设置' },
  { key: 'Space', metaKey: true, description: 'Spotlight' },
];

/**
 * 检查快捷键是否与保留快捷键冲突
 * @param shortcut 要检查的快捷键配置
 * @returns 冲突的快捷键描述，无冲突返回 null
 */
export const checkShortcutConflict = (shortcut: ShortcutConfig): string | null => {
  const isMac = navigator.platform.toLowerCase().includes('mac');

  for (const reserved of reservedShortcuts) {
    // 检查主键是否匹配
    if (shortcut.key.toLowerCase() !== reserved.key.toLowerCase()) {
      continue;
    }

    // 检查修饰键是否匹配
    const shortcutCtrl = shortcut.ctrlKey || shortcut.metaKey;
    const reservedCtrl = reserved.ctrlKey || reserved.metaKey;

    if (
      !!shortcutCtrl === !!reservedCtrl &&
      !!shortcut.altKey === !!reserved.altKey &&
      !!shortcut.shiftKey === !!reserved.shiftKey
    ) {
      // macOS 特殊处理：区分 metaKey 和 ctrlKey
      if (isMac) {
        if (shortcut.metaKey && !reserved.metaKey && reserved.ctrlKey) {
          continue;
        }
        if (!shortcut.metaKey && shortcut.ctrlKey && reserved.metaKey) {
          continue;
        }
      }
      return reserved.description;
    }
  }

  return null;
};

/**
 * 将快捷键配置转换为可读的字符串表示
 * @param shortcut 快捷键配置
 * @returns 可读字符串，如 "Ctrl+←"
 */
export const shortcutToString = (shortcut: ShortcutConfig): string => {
  const parts: string[] = [];
  const isMac = navigator.platform.toLowerCase().includes('mac');

  if (shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Meta');
  }
  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  // 转换特殊键名为可读格式
  const keyMap: Record<string, string> = {
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'Tab': 'Tab',
    'Enter': '↵',
    'Escape': 'Esc',
    'Delete': 'Del',
    'Backspace': '⌫',
    'Space': 'Space',
    'plus': '+',
    'minus': '-',
    'comma': ',',
    'period': '.',
  };

  parts.push(keyMap[shortcut.key] || shortcut.key);

  return parts.join('+');
};

/**
 * 从键盘事件解析快捷键配置
 * @param event 键盘事件
 * @returns 快捷键配置对象
 */
export const eventToShortcutConfig = (event: KeyboardEvent): ShortcutConfig => {
  return {
    key: event.key,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    description: '',
  };
};

/**
 * 比较两个快捷键配置是否相同
 * @param a 快捷键配置A
 * @param b 快捷键配置B
 * @returns 是否相同
 */
export const isSameShortcut = (a: ShortcutConfig, b: ShortcutConfig): boolean => {
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    !!a.ctrlKey === !!b.ctrlKey &&
    !!a.altKey === !!b.altKey &&
    !!a.shiftKey === !!b.shiftKey &&
    !!a.metaKey === !!b.metaKey
  );
};

/**
 * 验证快捷键配置是否有效
 * @param shortcut 快捷键配置
 * @returns 验证结果
 */
export const validateShortcut = (shortcut: ShortcutConfig): { valid: boolean; message?: string } => {
  // 必须有主键
  if (!shortcut.key || shortcut.key.trim() === '') {
    return { valid: false, message: '快捷键不能为空' };
  }

  // 必须包含至少一个修饰键（功能键除外）
  const isModifierKey = ['Control', 'Alt', 'Shift', 'Meta'].includes(shortcut.key);
  const isFunctionKey = /^F\d+$/.test(shortcut.key);
  const hasModifier = shortcut.ctrlKey || shortcut.altKey || shortcut.shiftKey || shortcut.metaKey;

  if (isModifierKey) {
    return { valid: false, message: '不能单独使用修饰键作为快捷键' };
  }

  if (!isFunctionKey && !hasModifier) {
    return { valid: false, message: '普通按键必须配合修饰键使用' };
  }

  // 检查冲突
  const conflict = checkShortcutConflict(shortcut);
  if (conflict) {
    return { valid: false, message: `与系统快捷键冲突: ${conflict}` };
  }

  return { valid: true };
};
