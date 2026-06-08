import { DeepSeekProvider } from '../deepseekProvider';
import { LLMConfig } from '../types';

describe('DeepSeekProvider', () => {
  const mockConfig: LLMConfig = {
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

  let provider: DeepSeekProvider;

  beforeEach(() => {
    provider = new DeepSeekProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should set correct name', () => {
      expect(provider.name).toBe('deepseek');
    });

    it('should have correct supported models', () => {
      expect(provider.supportedModels).toContain('deepseek-chat');
      expect(provider.supportedModels).toContain('deepseek-coder');
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should return false for empty apiKey', () => {
      const invalidConfig = { ...mockConfig, apiKey: '' };
      const invalidProvider = new DeepSeekProvider(invalidConfig);
      expect(invalidProvider.validateConfig()).toBe(false);
    });

    it('should return false for unsupported model', () => {
      const invalidConfig = { ...mockConfig, model: 'unsupported-model' };
      const invalidProvider = new DeepSeekProvider(invalidConfig);
      expect(invalidProvider.validateConfig()).toBe(false);
    });
  });

  describe('getCapability', () => {
    it('should return correct capabilities', () => {
      const capability = provider.getCapability();
      expect(capability.supportsStreaming).toBe(true);
      expect(capability.supportsBatching).toBe(true);
      expect(capability.maxBatchSize).toBe(5);
      expect(capability.recommendedTemperature).toBe(0.7);
    });
  });

  describe('loadConfig', () => {
    it('should update config', () => {
      const newConfig = { ...mockConfig, temperature: 0.5 };
      provider.loadConfig(newConfig);
      expect(provider.validateConfig()).toBe(true);
    });
  });

  describe('parseTestPoints', () => {
    it('should parse JSON array response', () => {
      const jsonResponse = JSON.stringify([
        { title: 'Test Point 1', description: 'Description 1', priority: 'high' },
        { title: 'Test Point 2', description: 'Description 2', priority: 'medium' },
      ]);

      const result = (provider as any).parseTestPoints(jsonResponse);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Point 1');
      expect(result[0].priority).toBe('high');
    });

    it('should parse plain text response', () => {
      const textResponse = `1. Test Point One
Description: This is a test point
Priority: high

2. Test Point Two
Description: Another test point
Priority: medium`;

      const result = (provider as any).parseTestPoints(textResponse);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for empty response', () => {
      expect(() => (provider as any).parseTestPoints('')).toThrow();
    });
  });

  describe('parseTestCases', () => {
    it('should parse JSON array response', () => {
      const jsonResponse = JSON.stringify([
        { number: 'Test0001', title: 'Test Case 1', module: 'Module1' },
        { number: 'Test0002', title: 'Test Case 2', module: 'Module2' },
      ]);

      const result = (provider as any).parseTestCases(jsonResponse);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Case 1');
      expect(result[0].actual_result).toBe('待测试');
      expect(result[0].pass_fail).toBe('待测试');
    });
  });
});
