import { LLMProviderFactory } from '../providerFactory';
import { DeepSeekProvider } from '../deepseekProvider';
import { VolcanoCodingPlanProvider } from '../volcanoProvider';
import { LLMConfig } from '../types';

describe('LLMProviderFactory', () => {
  beforeEach(() => {
    LLMProviderFactory.clearCache();
    LLMProviderFactory.initialize();
  });

  afterEach(() => {
    LLMProviderFactory.clearCache();
  });

  describe('initialize', () => {
    it('should register all providers', () => {
      const providers = LLMProviderFactory.getAvailableProviders();
      expect(providers).toContain('deepseek');
      expect(providers).toContain('volcano-coding');
      expect(providers).toHaveLength(2);
    });
  });

  describe('getProvider', () => {
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

    it('should return DeepSeekProvider for deepseek config', () => {
      const provider = LLMProviderFactory.getProvider(mockConfig);
      expect(provider).toBeInstanceOf(DeepSeekProvider);
      expect(provider.name).toBe('deepseek');
    });

    it('should return VolcanoCodingPlanProvider for volcano-coding config', () => {
      const volcanoConfig = { ...mockConfig, provider: 'volcano-coding', model: 'ark-code-latest' };
      const provider = LLMProviderFactory.getProvider(volcanoConfig);
      expect(provider).toBeInstanceOf(VolcanoCodingPlanProvider);
      expect(provider.name).toBe('volcano-coding');
    });

    it('should cache provider instances', () => {
      const provider1 = LLMProviderFactory.getProvider(mockConfig);
      const provider2 = LLMProviderFactory.getProvider(mockConfig);
      expect(provider1).toBe(provider2);
    });

    it('should create different instances for different models', () => {
      const config1 = { ...mockConfig, model: 'deepseek-chat' };
      const config2 = { ...mockConfig, model: 'deepseek-coder' };
      const provider1 = LLMProviderFactory.getProvider(config1);
      const provider2 = LLMProviderFactory.getProvider(config2);
      expect(provider1).not.toBe(provider2);
    });

    it('should throw error for unknown provider', () => {
      const unknownConfig = { ...mockConfig, provider: 'unknown-provider' };
      expect(() => LLMProviderFactory.getProvider(unknownConfig)).toThrow(
        'Unknown LLM provider: unknown-provider'
      );
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of registered providers', () => {
      const providers = LLMProviderFactory.getAvailableProviders();
      expect(providers).toEqual(['deepseek', 'volcano-coding']);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached instances', () => {
      const mockConfig: LLMConfig = {
        provider: 'deepseek',
        apiKey: 'test-api-key',
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
      };

      const provider1 = LLMProviderFactory.getProvider(mockConfig);
      LLMProviderFactory.clearCache();
      const provider2 = LLMProviderFactory.getProvider(mockConfig);
      expect(provider1).not.toBe(provider2);
    });
  });
});
