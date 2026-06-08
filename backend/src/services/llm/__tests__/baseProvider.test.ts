import { BaseLLMProvider } from '../baseProvider';
import { LLMConfig, GeneratePointsParams, GenerateCasesParams, ProviderCapability } from '../types';
import { TestPoint, TestCase } from '../../../types';

class TestProvider extends BaseLLMProvider {
  readonly name = 'test-provider';
  readonly supportedModels = ['test-model'];

  async generateTestPoints(params: GeneratePointsParams): Promise<TestPoint[]> {
    return [{ id: '1', title: 'Test', description: '', priority: 'medium', category: 'functional', expectedResult: '', testSteps: [] }];
  }

  async generateTestCases(params: GenerateCasesParams): Promise<TestCase[]> {
    return [{ number: 'T001', title: 'Test', description: '', precondition: '', steps: [], expected_results: '', actual_result: '待测试', pass_fail: '待测试', system: '', module: '', scenario: '' }];
  }

  protected async makeRequest(prompt: string): Promise<string> {
    return 'test response';
  }

  protected async executeRequest(requestData: any): Promise<string> {
    return 'test response';
  }

  protected parseTestPoints(content: string): TestPoint[] {
    return [];
  }

  protected parseTestCases(content: string): TestCase[] {
    return [];
  }

  protected defineCapability(): ProviderCapability {
    return {
      supportsStreaming: false,
      supportsBatching: true,
      maxBatchSize: 5,
      recommendedTemperature: 0.5,
      supportsVision: false,
      visionModels: [],
    };
  }
}

describe('BaseLLMProvider', () => {
  const mockConfig: LLMConfig = {
    provider: 'test-provider',
    apiKey: 'test-api-key',
    baseURL: 'https://test.com',
    model: 'test-model',
    temperature: 0.5,
    timeout: 10000,
    maxRetries: 2,
    retryDelay: 1000,
    batchSize: 5,
  };

  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(provider.name).toBe('test-provider');
      expect(provider.supportedModels).toEqual(['test-model']);
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should return false for missing apiKey', () => {
      const invalidConfig = { ...mockConfig, apiKey: '' };
      const invalidProvider = new TestProvider(invalidConfig);
      expect(invalidProvider.validateConfig()).toBe(false);
    });

    it('should return false for unsupported model', () => {
      const invalidConfig = { ...mockConfig, model: 'unsupported' };
      const invalidProvider = new TestProvider(invalidConfig);
      expect(invalidProvider.validateConfig()).toBe(false);
    });
  });

  describe('getCapability', () => {
    it('should return provider capabilities', () => {
      const capability = provider.getCapability();
      expect(capability.maxBatchSize).toBe(5);
      expect(capability.supportsBatching).toBe(true);
      expect(capability.supportsStreaming).toBe(false);
      expect(capability.recommendedTemperature).toBe(0.5);
      expect(capability.supportsVision).toBe(false);
      expect(capability.visionModels).toEqual([]);
    });
  });

  describe('loadConfig', () => {
    it('should update config', () => {
      const newConfig = { ...mockConfig, temperature: 0.8 };
      provider.loadConfig(newConfig);
      expect(provider.validateConfig()).toBe(true);
    });
  });

  describe('handleError', () => {
    it('should handle timeout error', () => {
      const error = { code: 'ECONNABORTED' };
      const message = (provider as any).handleError(error);
      expect(message).toContain('超时');
    });

    it('should handle rate limit error', () => {
      const error = { response: { status: 429 } };
      const message = (provider as any).handleError(error);
      expect(message).toContain('频率限制');
    });

    it('should handle server error', () => {
      const error = { response: { status: 500 } };
      const message = (provider as any).handleError(error);
      expect(message).toContain('暂时不可用');
    });

    it('should handle network error', () => {
      const error = { message: 'network connection failed' };
      const message = (provider as any).handleError(error);
      expect(message).toContain('网络连接');
    });

    it('should handle generic error', () => {
      const error = { message: 'something went wrong' };
      const message = (provider as any).handleError(error);
      expect(message).toContain('处理失败');
    });
  });

  describe('retryRequest', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await (provider as any).retryRequest(fn, 3, 100);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success');
      const result = await (provider as any).retryRequest(fn, 3, 100);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));
      await expect((provider as any).retryRequest(fn, 2, 100)).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
