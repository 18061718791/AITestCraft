import { prisma } from '../utils/prisma';

// 配置类型
interface Config {
  id: number;
  config_key: string;
  config_value: string;
  config_type: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

// 配置服务类
class ConfigService {
  // 获取所有配置
  async getAllConfigs(): Promise<Config[]> {
    return await prisma.system_configs.findMany();
  }

  // 根据类型获取配置
  async getConfigsByType(type: string): Promise<Config[]> {
    return await prisma.system_configs.findMany({
      where: {
        config_type: type
      }
    });
  }

  // 根据键获取配置
  async getConfigByKey(key: string): Promise<Config | null> {
    return await prisma.system_configs.findUnique({
      where: {
        config_key: key
      }
    });
  }

  // 创建或更新配置
  async createOrUpdateConfig(
    key: string,
    value: string,
    type: string,
    description?: string
  ): Promise<Config> {
    const existingConfig = await this.getConfigByKey(key);

    if (existingConfig) {
      // 更新现有配置
      const updateData: any = {
        config_value: value,
        config_type: type
      };
      if (description !== undefined) {
        updateData.description = description;
      }
      return await prisma.system_configs.update({
        where: {
          config_key: key
        },
        data: updateData
      });
    } else {
      // 创建新配置
      const createData: any = {
        config_key: key,
        config_value: value,
        config_type: type
      };
      if (description !== undefined) {
        createData.description = description;
      }
      return await prisma.system_configs.create({
        data: createData
      });
    }
  }

  // 删除配置
  async deleteConfig(key: string): Promise<void> {
    await prisma.system_configs.delete({
      where: {
        config_key: key
      }
    });
  }

  // 批量创建或更新配置
  async batchCreateOrUpdateConfigs(configs: Array<{
    key: string;
    value: string;
    type: string;
    description?: string;
  }>): Promise<Config[]> {
    const results: Config[] = [];

    for (const config of configs) {
      const result = await this.createOrUpdateConfig(
        config.key,
        config.value,
        config.type,
        config.description
      );
      results.push(result);
    }

    return results;
  }

  // 从现有设置生成初始配置
  async generateInitialConfigs(): Promise<Config[]> {
    // 从环境变量和现有设置生成配置
    const initialConfigs = [
      // 数据库配置
      {
        key: 'DATABASE_URL',
        value: process.env['DATABASE_URL'] || 'mysql://root:root@localhost:3306/testcase_generator',
        type: 'database',
        description: '主数据库连接字符串'
      },
      {
        key: 'POSTGRES_HOST',
        value: process.env['POSTGRES_HOST'] || 'localhost',
        type: 'database',
        description: 'PostgreSQL主机'
      },
      {
        key: 'POSTGRES_PORT',
        value: process.env['POSTGRES_PORT'] || '5432',
        type: 'database',
        description: 'PostgreSQL端口'
      },
      {
        key: 'POSTGRES_USER',
        value: process.env['POSTGRES_USER'] || 'postgres',
        type: 'database',
        description: 'PostgreSQL用户名'
      },
      {
        key: 'POSTGRES_PASSWORD',
        value: process.env['POSTGRES_PASSWORD'] || 'postgres',
        type: 'database',
        description: 'PostgreSQL密码'
      },
      {
        key: 'POSTGRES_DATABASE',
        value: process.env['POSTGRES_DATABASE'] || 'postgres',
        type: 'database',
        description: 'PostgreSQL数据库名'
      },
      // 大模型配置
      {
        key: 'LLM_API_KEY',
        value: process.env['LLM_API_KEY'] || process.env['DEEPSEEK_API_KEY'] || '',
        type: 'llm',
        description: '大模型API密钥'
      },
      {
        key: 'LLM_BASE_URL',
        value: process.env['LLM_BASE_URL'] || process.env['DEEPSEEK_API_URL'] || 'https://api.deepseek.com/v1',
        type: 'llm',
        description: '大模型API基础URL'
      },
      {
        key: 'LLM_MODEL',
        value: process.env['LLM_MODEL'] || process.env['LLM_TYPE'] || 'deepseek-chat',
        type: 'llm',
        description: '大模型模型名称'
      },
      {
        key: 'LLM_TEMPERATURE',
        value: process.env['LLM_TEMPERATURE'] || '0.3',
        type: 'llm',
        description: '大模型温度参数'
      },
      {
        key: 'LLM_PROVIDER',
        value: process.env['LLM_PROVIDER'] || 'deepseek',
        type: 'llm',
        description: '当前使用的LLM Provider: deepseek | volcano-coding'
      },
      {
        key: 'LLM_TIMEOUT',
        value: process.env['LLM_TIMEOUT'] || '120000',
        type: 'llm',
        description: '大模型API超时时间(ms)'
      },
      {
        key: 'LLM_MAX_RETRIES',
        value: process.env['LLM_MAX_RETRIES'] || '3',
        type: 'llm',
        description: '大模型API最大重试次数'
      },
      {
        key: 'LLM_RETRY_DELAY',
        value: process.env['LLM_RETRY_DELAY'] || '2000',
        type: 'llm',
        description: '大模型API重试延迟(ms)'
      },
      {
        key: 'LLM_BATCH_SIZE',
        value: process.env['LLM_BATCH_SIZE'] || '5',
        type: 'llm',
        description: '大模型批处理大小'
      },
      // 火山引擎Coding Plan配置
      {
        key: 'VOLCANO_API_KEY',
        value: process.env['VOLCANO_API_KEY'] || '',
        type: 'llm',
        description: '火山引擎Coding Plan API密钥'
      },
      {
        key: 'VOLCANO_BASE_URL',
        value: process.env['VOLCANO_BASE_URL'] || 'https://ark.cn-beijing.volces.com/api/coding/v3',
        type: 'llm',
        description: '火山引擎Coding Plan基础URL'
      },
      {
        key: 'VOLCANO_MODEL',
        value: process.env['VOLCANO_MODEL'] || 'ark-code-latest',
        type: 'llm',
        description: '火山引擎Coding Plan模型名称'
      },
      // 系统配置
      {
        key: 'PORT',
        value: process.env['PORT'] || '9000',
        type: 'system',
        description: '服务器端口'
      },
      {
        key: 'NODE_ENV',
        value: process.env['NODE_ENV'] || 'development',
        type: 'system',
        description: '运行环境'
      },
      {
        key: 'LOG_LEVEL',
        value: process.env['LOG_LEVEL'] || 'info',
        type: 'system',
        description: '日志级别'
      }
    ];

    return await this.batchCreateOrUpdateConfigs(initialConfigs);
  }
}

export const configService = new ConfigService();
export default configService;