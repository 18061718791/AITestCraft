import { qualityService } from '../qualityService';
import { TestCase } from '../../types';

describe('Performance Tests', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Quality Evaluation Performance', () => {
    it('should evaluate 100 test cases within 100ms', () => {
      const testCases: TestCase[] = Array(100).fill(null).map((_, i) => ({
        number: `Test${String(i + 1).padStart(4, '0')}`,
        title: `测试用例 ${i + 1}`,
        description: `描述 ${i}`,
        precondition: '前置条件',
        steps: ['步骤1', '步骤2'],
        expected_results: '预期结果',
        actual_result: '待测试',
        pass_fail: '待测试',
        system: '系统A',
        module: `模块${(i % 5) + 1}`,
        scenario: '场景1',
      }));

      const start = Date.now();
      const score = qualityService.evaluateTestCases(testCases);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
      expect(score.overall).toBeGreaterThanOrEqual(0);
    });

    it('should evaluate 1000 test cases within 500ms', () => {
      const testCases: TestCase[] = Array(1000).fill(null).map((_, i) => ({
        number: `Test${String(i + 1).padStart(4, '0')}`,
        title: `测试用例 ${i + 1}`,
        description: `描述 ${i}`,
        precondition: '前置条件',
        steps: ['步骤1', '步骤2'],
        expected_results: '预期结果',
        actual_result: '待测试',
        pass_fail: '待测试',
        system: '系统A',
        module: `模块${(i % 5) + 1}`,
        scenario: '场景1',
      }));

      const start = Date.now();
      const score = qualityService.evaluateTestCases(testCases);
      const end = Date.now();

      expect(end - start).toBeLessThan(500);
      expect(score.overall).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Provider Factory Performance', () => {
    it('should create provider within 50ms', async () => {
      const { LLMProviderFactory } = await import('../llm/providerFactory');

      LLMProviderFactory.initialize();

      const config = {
        provider: 'deepseek',
        apiKey: 'test-key',
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
      };

      const start = Date.now();
      LLMProviderFactory.getProvider(config);
      const end = Date.now();

      expect(end - start).toBeLessThan(50);
    });
  });
});
