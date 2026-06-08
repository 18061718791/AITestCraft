import { prisma } from '../utils/prisma';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
}

interface ShortcutMap {
  toggleLeftPanel: ShortcutConfig;
  toggleRightPanel: ShortcutConfig;
  toggleBottomPanel: ShortcutConfig;
}

const SHORTCUT_CONFIG_KEY = 'user_shortcuts';
const SHORTCUT_ENABLED_KEY = 'shortcuts_enabled';

const defaultShortcuts: ShortcutMap = {
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
    key: 'Tab',
    ctrlKey: true,
    description: '切换底部任务窗口显示/隐藏',
  },
};

export class ShortcutService {
  async getShortcuts(): Promise<ShortcutMap> {
    try {
      const config = await prisma.system_configs.findUnique({
        where: {
          config_key: SHORTCUT_CONFIG_KEY
        }
      });

      if (config && config.config_value) {
        const parsed = JSON.parse(config.config_value) as ShortcutMap;
        return { ...defaultShortcuts, ...parsed };
      }

      return defaultShortcuts;
    } catch (error) {
      console.error('获取快捷键配置失败:', error);
      return defaultShortcuts;
    }
  }

  async saveShortcuts(shortcuts: ShortcutMap): Promise<ShortcutMap> {
    try {
      const configValue = JSON.stringify(shortcuts);

      const existingConfig = await prisma.system_configs.findUnique({
        where: {
          config_key: SHORTCUT_CONFIG_KEY
        }
      });

      if (existingConfig) {
        await prisma.system_configs.update({
          where: {
            config_key: SHORTCUT_CONFIG_KEY
          },
          data: {
            config_value: configValue,
            updated_at: new Date()
          }
        });
      } else {
        await prisma.system_configs.create({
          data: {
            config_key: SHORTCUT_CONFIG_KEY,
            config_value: configValue,
            config_type: 'system',
            description: '用户自定义快捷键配置'
          }
        });
      }

      return shortcuts;
    } catch (error) {
      console.error('保存快捷键配置失败:', error);
      throw new Error('保存快捷键配置失败');
    }
  }

  async resetShortcuts(): Promise<ShortcutMap> {
    try {
      await prisma.system_configs.delete({
        where: {
          config_key: SHORTCUT_CONFIG_KEY
        }
      }).catch(() => {});

      return defaultShortcuts;
    } catch (error) {
      console.error('重置快捷键配置失败:', error);
      throw new Error('重置快捷键配置失败');
    }
  }

  async getShortcutEnabled(): Promise<boolean> {
    try {
      const config = await prisma.system_configs.findUnique({
        where: {
          config_key: SHORTCUT_ENABLED_KEY
        }
      });

      if (config && config.config_value) {
        return JSON.parse(config.config_value);
      }

      return true;
    } catch (error) {
      console.error('获取快捷键启用状态失败:', error);
      return true;
    }
  }

  async setShortcutEnabled(enabled: boolean): Promise<boolean> {
    try {
      const configValue = JSON.stringify(enabled);

      const existingConfig = await prisma.system_configs.findUnique({
        where: {
          config_key: SHORTCUT_ENABLED_KEY
        }
      });

      if (existingConfig) {
        await prisma.system_configs.update({
          where: {
            config_key: SHORTCUT_ENABLED_KEY
          },
          data: {
            config_value: configValue,
            updated_at: new Date()
          }
        });
      } else {
        await prisma.system_configs.create({
          data: {
            config_key: SHORTCUT_ENABLED_KEY,
            config_value: configValue,
            config_type: 'system',
            description: '快捷键功能启用状态'
          }
        });
      }

      return enabled;
    } catch (error) {
      console.error('设置快捷键启用状态失败:', error);
      throw new Error('设置快捷键启用状态失败');
    }
  }
}

export const shortcutService = new ShortcutService();
