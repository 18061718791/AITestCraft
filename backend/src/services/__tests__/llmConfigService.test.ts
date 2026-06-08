import { LLMConfigService } from '../llmConfigService';
import { configService } from '../configService';

jest.mock('../configService');

describe('LLMConfigService', () => {
  let llmConfigService: LLMConfigService;

  beforeEach(() => {
    llmConfigService = new LLMConfigService();
    jest.clearAllMocks();
  });

  describe('getDefaultProvider', () => {
    it('should return deepseek as default when no config', async () => {
      (configService.getConfigByKey as jest.Mock).mockResolvedValue(null);
      const provider = await llmConfigService.getDefaultProvider();
      expect(provider).toBe('deepseek');
    });

    it('should return configured provider', async () => {
      (configService.getConfigByKey as jest.Mock).mockResolvedValue({
        config_value: 'volcano-coding',
      });
      const provider = await llmConfigService.getDefaultProvider();
      expect(provider).toBe('volcano-coding');
    });
  });

  describe('setDefaultProvider', () => {
    it('should update provider config', async () => {
      (configService.createOrUpdateConfig as jest.Mock).mockResolvedValue({
        config_key: 'LLM_PROVIDER',
        config_value: 'volcano-coding',
      });
      await llmConfigService.setDefaultProvider('volcano-coding');
      expect(configService.createOrUpdateConfig).toHaveBeenCalledWith(
        'LLM_PROVIDER',
        'volcano-coding',
        'llm',
        '当前使用的LLM Provider'
      );
    });
  });

  describe('getLLMConfig', () => {
    it('should load DeepSeek config by default', async () => {
      (configService.getConfigByKey as jest.Mock).mockImplementation((key: string) => {
        const configs: Record<string, any> = {
          'LLM_PROVIDER': { config_value: 'deepseek' },
          'LLM_API_KEY': { config_value: 'test-key' },
          'LLM_BASE_URL': { config_value: 'https://api.deepseek.com/v1' },
          'LLM_MODEL': { config_value: 'deepseek-chat' },
          'LLM_TEMPERATURE': { config_value: '0.7' },
          'LLM_TIMEOUT': { config_value: '120000' },
          'LLM_MAX_RETRIES': { config_value: '3' },
          'LLM_RETRY_DELAY': { config_value: '2000' },
          'LLM_BATCH_SIZE': { config_value: '5' },
        };
        return Promise.resolve(configs[key] || null);
      });

      const config = await llmConfigService.getLLMConfig();
      expect(config.provider).toBe('deepseek');
      expect(config.apiKey).toBe('test-key');
      expect(config.model).toBe('deepseek-chat');
      expect(config.temperature).toBe(0.7);
      expect(config.batchSize).toBe(5);
    });

    it('should load Volcano config when specified', async () => {
      (configService.getConfigByKey as jest.Mock).mockImplementation((key: string) => {
        const configs: Record<string, any> = {
          'LLM_PROVIDER': { config_value: 'volcano-coding' },
          'VOLCANO_API_KEY': { config_value: 'volcano-test-key' },
          'VOLCANO_BASE_URL': { config_value: 'https://ark.cn-beijing.volces.com/api/coding/v3' },
          'VOLCANO_MODEL': { config_value: 'ark-code-latest' },
          'LLM_TEMPERATURE': { config_value: '0.3' },
          'LLM_TIMEOUT': { config_value: '120000' },
          'LLM_MAX_RETRIES': { config_value: '3' },
          'LLM_RETRY_DELAY': { config_value: '2000' },
          'LLM_BATCH_SIZE': { config_value: '10' },
        };
        return Promise.resolve(configs[key] || null);
      });

      const config = await llmConfigService.getLLMConfig('volcano-coding');
      expect(config.provider).toBe('volcano-coding');
      expect(config.apiKey).toBe('volcano-test-key');
      expect(config.model).toBe('ark-code-latest');
      expect(config.temperature).toBe(0.3);
      expect(config.batchSize).toBe(10);
    });

    it('should use environment variables as fallback', async () => {
      process.env['DEEPSEEK_API_KEY'] = 'env-api-key';
      (configService.getConfigByKey as jest.Mock).mockResolvedValue(null);

      const config = await llmConfigService.getLLMConfig('deepseek');
      expect(config.apiKey).toBe('env-api-key');
      expect(config.baseURL).toBe('https://api.deepseek.com/v1');
      expect(config.model).toBe('deepseek-chat');

      delete process.env['DEEPSEEK_API_KEY'];
    });

    it('should throw error for unknown provider', async () => {
      (configService.getConfigByKey as jest.Mock).mockResolvedValue(null);
      await expect(llmConfigService.getLLMConfig('unknown-provider')).rejects.toThrow(
        'No config loader for provider: unknown-provider'
      );
    });
  });
});
