export const configService = {
  getConfigByKey: jest.fn().mockImplementation(async (key: string) => {
    const configs: Record<string, { config_key: string; config_value: string; config_type: string }> = {
      'LLM_PROVIDER': { config_key: 'LLM_PROVIDER', config_value: 'deepseek', config_type: 'llm' },
      'LLM_API_KEY': { config_key: 'LLM_API_KEY', config_value: 'test-api-key', config_type: 'llm' },
      'LLM_BASE_URL': { config_key: 'LLM_BASE_URL', config_value: 'https://api.deepseek.com/v1', config_type: 'llm' },
      'LLM_MODEL': { config_key: 'LLM_MODEL', config_value: 'deepseek-chat', config_type: 'llm' },
      'LLM_TEMPERATURE': { config_key: 'LLM_TEMPERATURE', config_value: '0.7', config_type: 'llm' },
      'LLM_TIMEOUT': { config_key: 'LLM_TIMEOUT', config_value: '120000', config_type: 'llm' },
      'LLM_MAX_RETRIES': { config_key: 'LLM_MAX_RETRIES', config_value: '3', config_type: 'llm' },
      'LLM_RETRY_DELAY': { config_key: 'LLM_RETRY_DELAY', config_value: '2000', config_type: 'llm' },
      'LLM_BATCH_SIZE': { config_key: 'LLM_BATCH_SIZE', config_value: '5', config_type: 'llm' },
      'VOLCANO_API_KEY': { config_key: 'VOLCANO_API_KEY', config_value: 'test-volcano-key', config_type: 'llm' },
      'VOLCANO_BASE_URL': { config_key: 'VOLCANO_BASE_URL', config_value: 'https://ark.cn-beijing.volces.com/api/coding/v3', config_type: 'llm' },
      'VOLCANO_MODEL': { config_key: 'VOLCANO_MODEL', config_value: 'ark-code-latest', config_type: 'llm' },
    };
    return configs[key] || null;
  }),
  getConfigsByType: jest.fn().mockResolvedValue([]),
  createOrUpdateConfig: jest.fn().mockResolvedValue({}),
  getAllConfigs: jest.fn().mockResolvedValue([]),
  deleteConfig: jest.fn().mockResolvedValue(undefined),
  batchCreateOrUpdateConfigs: jest.fn().mockResolvedValue([]),
  generateInitialConfigs: jest.fn().mockResolvedValue([]),
};

export default configService;
