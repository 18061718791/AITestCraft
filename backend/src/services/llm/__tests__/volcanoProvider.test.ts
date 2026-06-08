import { VolcanoCodingPlanProvider } from '../volcanoProvider';
import { LLMConfig } from '../types';

describe('VolcanoCodingPlanProvider', () => {
  const mockConfig: LLMConfig = {
    provider: 'volcano-coding',
    apiKey: 'test-volcano-api-key',
    baseURL: 'https://ark.cn-beijing.volces.com/api/coding/v3',
    model: 'ark-code-latest',
    temperature: 0.3,
    timeout: 120000,
    maxRetries: 3,
    retryDelay: 2000,
    batchSize: 10,
  };

  let provider: VolcanoCodingPlanProvider;

  beforeEach(() => {
    provider = new VolcanoCodingPlanProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should set correct name', () => {
      expect(provider.name).toBe('volcano-coding');
    });

    it('should have correct supported models', () => {
      expect(provider.supportedModels).toContain('ark-code-latest');
      expect(provider.supportedModels).toContain('doubao-seed-code');
      expect(provider.supportedModels).toContain('deepseek-v3.2');
      expect(provider.supportedModels).toContain('kimi-k2.5');
      expect(provider.supportedModels).toContain('glm-4.7');
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should return false for empty apiKey', () => {
      const invalidConfig = { ...mockConfig, apiKey: '' };
      const invalidProvider = new VolcanoCodingPlanProvider(invalidConfig);
      expect(invalidProvider.validateConfig()).toBe(false);
    });

    it('should return false for unsupported model', () => {
      const invalidConfig = { ...mockConfig, model: 'unsupported-model' };
      const invalidProvider = new VolcanoCodingPlanProvider(invalidConfig);
      expect(invalidProvider.validateConfig()).toBe(false);
    });
  });

  describe('getCapability', () => {
    it('should return correct capabilities', () => {
      const capability = provider.getCapability();
      expect(capability.supportsStreaming).toBe(true);
      expect(capability.supportsBatching).toBe(true);
      expect(capability.maxBatchSize).toBe(10);
      expect(capability.recommendedTemperature).toBe(0.3);
    });
  });

  describe('parseTestPoints', () => {
    it('should parse JSON array response', () => {
      const jsonResponse = JSON.stringify([
        { title: 'Volcano Test Point 1', description: 'Description 1', priority: 'high' },
        { title: 'Volcano Test Point 2', description: 'Description 2', priority: 'medium' },
      ]);

      const result = (provider as any).parseTestPoints(jsonResponse);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Volcano Test Point 1');
    });

    it('should parse plain text response', () => {
      const textResponse = `- Test Point One
Description: This is a test point
Priority: high

- Test Point Two
Description: Another test point
Priority: medium`;

      const result = (provider as any).parseTestPoints(textResponse);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('parseTestCases', () => {
    it('should parse JSON array response', () => {
      const jsonResponse = JSON.stringify([
        { number: 'Test0001', title: 'Volcano Test Case 1', module: 'Module1' },
        { number: 'Test0002', title: 'Volcano Test Case 2', module: 'Module2' },
      ]);

      const result = (provider as any).parseTestCases(jsonResponse);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Volcano Test Case 1');
      expect(result[0].actual_result).toBe('待测试');
    });
  });
});
