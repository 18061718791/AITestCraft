import { BasePlugin, PluginResult } from './PluginInterface';
import { Skill } from '../../types/intelligentQa';
import logger from '../../utils/logger';

export class ExampleSkill implements Skill {
  name = 'example_skill';
  description = '示例技能';
  supportedIntents = ['example_intent'];

  validateParams(params: Record<string, any>): boolean {
    return params && typeof params === 'object';
  }

  async execute(params: Record<string, any>): Promise<PluginResult> {
    logger.info('ExampleSkill executing with params:', params);

    return {
      success: true,
      data: {
        message: '这是一个示例技能的执行结果',
        params,
        timestamp: new Date().toISOString()
      },
      resultType: 'message'
    };
  }
}

export default class ExamplePlugin extends BasePlugin {
  id = 'example-plugin';
  name = '示例插件';
  version = '1.0.0';
  description = '这是一个示例插件，用于演示插件系统的使用';
  author = 'AITestCraft';

  async onInitialize(): Promise<void> {
    logger.info('ExamplePlugin initializing...');

    this.registerSkill(new ExampleSkill());

    logger.info('ExamplePlugin initialized successfully');
  }

  async onExecute(params: Record<string, any>): Promise<PluginResult> {
    logger.info('ExamplePlugin executing with params:', params);

    return {
      success: true,
      data: {
        message: '示例插件执行成功',
        pluginId: this.id,
        pluginName: this.name,
        pluginVersion: this.version,
        params,
        timestamp: new Date().toISOString()
      },
      resultType: 'message'
    };
  }

  async onDestroy(): Promise<void> {
    logger.info('ExamplePlugin destroying...');
    logger.info('ExamplePlugin destroyed successfully');
  }
}
