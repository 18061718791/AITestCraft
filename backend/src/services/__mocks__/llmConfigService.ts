import { LLMConfig } from '../llm/types';

export const llmConfigService = {
  getLLMConfig: jest.fn().mockImplementation(async (provider?: string): Promise<LLMConfig> => {
    const targetProvider = provider || 'deepseek';
    
    if (targetProvider === 'deepseek') {
      return {
        provider: 'deepseek',
        apiKey: 'test-api-key',
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        temperature: 0.7,
        timeout: 120000,
        maxRetries: 3,
        retryDelay: 2000,
        batchSize: 5,
      };
    }
    
    if (targetProvider === 'volcano-coding') {
      return {
        provider: 'volcano-coding',
        apiKey: 'test-volcano-key',
        baseURL: 'https://ark.cn-beijing.volces.com/api/coding/v3',
        model: 'ark-code-latest',
        temperature: 0.3,
        timeout: 120000,
        maxRetries: 3,
        retryDelay: 2000,
        batchSize: 10,
      };
    }
    
    throw new Error(`Unknown provider: ${targetProvider}`);
  }),
  
  getDefaultProvider: jest.fn().mockResolvedValue('deepseek'),
  
  setDefaultProvider: jest.fn().mockResolvedValue(undefined),
  
  getProviderConfig: jest.fn().mockResolvedValue({}),
};

export default llmConfigService;
