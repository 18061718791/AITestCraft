import { configService } from './configService';
import { LLMConfig } from './llm/types';
import appConfig from '../config';

export class LLMConfigService {
  async getLLMConfig(provider?: string): Promise<LLMConfig> {
    const targetProvider = provider || await this.getDefaultProvider();

    const configMap: Record<string, () => Promise<LLMConfig>> = {
      'deepseek': () => this.loadDeepSeekConfig(),
      'volcano-coding': () => this.loadVolcanoConfig(),
    };

    const loader = configMap[targetProvider];
    if (!loader) {
      throw new Error(`No config loader for provider: ${targetProvider}`);
    }

    return loader();
  }

  async getDefaultProvider(): Promise<string> {
    const config = await configService.getConfigByKey('LLM_PROVIDER');
    return config?.config_value || 'deepseek';
  }

  async setDefaultProvider(provider: string): Promise<void> {
    await configService.createOrUpdateConfig('LLM_PROVIDER', provider, 'llm', '当前使用的LLM Provider');
  }

  async getProviderConfig(provider: string): Promise<Record<string, string>> {
    const llmConfigs = await configService.getConfigsByType('llm');
    const prefix = provider === 'deepseek' ? 'LLM_' : `${provider.toUpperCase().replace(/-/g, '_')}_`;
    
    const result: Record<string, string> = {};
    for (const config of llmConfigs) {
      if (config.config_key.startsWith(prefix) || config.config_key === 'LLM_PROVIDER') {
        result[config.config_key] = config.config_value;
      }
    }
    return result;
  }

  private async loadDeepSeekConfig(): Promise<LLMConfig> {
    const [
      apiKey, baseURL, model, temperature, timeout, maxRetries, retryDelay, batchSize
    ] = await Promise.all([
      configService.getConfigByKey('LLM_API_KEY'),
      configService.getConfigByKey('LLM_BASE_URL'),
      configService.getConfigByKey('LLM_MODEL'),
      configService.getConfigByKey('LLM_TEMPERATURE'),
      configService.getConfigByKey('LLM_TIMEOUT'),
      configService.getConfigByKey('LLM_MAX_RETRIES'),
      configService.getConfigByKey('LLM_RETRY_DELAY'),
      configService.getConfigByKey('LLM_BATCH_SIZE'),
    ]);

    return {
      provider: 'deepseek',
      apiKey: apiKey?.config_value || process.env['DEEPSEEK_API_KEY'] || appConfig.deepseek.apiKey || '',
      baseURL: baseURL?.config_value || process.env['DEEPSEEK_API_URL'] || appConfig.deepseek.apiUrl || 'https://api.deepseek.com/v1',
      model: model?.config_value || process.env['LLM_TYPE'] || appConfig.deepseek.modelType || 'deepseek-chat',
      temperature: parseFloat(temperature?.config_value || '0.7'),
      timeout: parseInt(timeout?.config_value || String(appConfig.deepseek.timeout) || '120000'),
      maxRetries: parseInt(maxRetries?.config_value || String(appConfig.deepseek.maxRetries) || '3'),
      retryDelay: parseInt(retryDelay?.config_value || String(appConfig.deepseek.retryDelay) || '2000'),
      batchSize: parseInt(batchSize?.config_value || '5'),
    };
  }

  private async loadVolcanoConfig(): Promise<LLMConfig> {
    const [
      apiKey, baseURL, model, temperature, timeout, maxRetries, retryDelay, batchSize
    ] = await Promise.all([
      configService.getConfigByKey('VOLCANO_API_KEY'),
      configService.getConfigByKey('VOLCANO_BASE_URL'),
      configService.getConfigByKey('VOLCANO_MODEL'),
      configService.getConfigByKey('LLM_TEMPERATURE'),
      configService.getConfigByKey('LLM_TIMEOUT'),
      configService.getConfigByKey('LLM_MAX_RETRIES'),
      configService.getConfigByKey('LLM_RETRY_DELAY'),
      configService.getConfigByKey('LLM_BATCH_SIZE'),
    ]);

    return {
      provider: 'volcano-coding',
      apiKey: apiKey?.config_value || process.env['VOLCANO_API_KEY'] || '',
      baseURL: baseURL?.config_value || process.env['VOLCANO_BASE_URL'] || 'https://ark.cn-beijing.volces.com/api/coding/v3',
      model: model?.config_value || process.env['VOLCANO_MODEL'] || 'ark-code-latest',
      temperature: parseFloat(temperature?.config_value || '0.3'),
      timeout: parseInt(timeout?.config_value || '120000'),
      maxRetries: parseInt(maxRetries?.config_value || '3'),
      retryDelay: parseInt(retryDelay?.config_value || '2000'),
      batchSize: parseInt(batchSize?.config_value || '10'),
    };
  }
}

export const llmConfigService = new LLMConfigService();
