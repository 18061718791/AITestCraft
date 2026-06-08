import request from 'supertest';
import express from 'express';
import testRoutes from '../test';
import llmConfigRoutes from '../llmConfigRoutes';
import qualityRoutes from '../qualityRoutes';
import { LLMProviderFactory } from '../../services/llm/providerFactory';

jest.mock('../../services/llmConfigService');
jest.mock('../../services/configService');

const app = express();
app.use(express.json());
app.use('/api/test', testRoutes);
app.use('/api/llm', llmConfigRoutes);
app.use('/api/quality', qualityRoutes);

describe('Integration Tests', () => {
  beforeEach(() => {
    LLMProviderFactory.initialize();
  });

  afterEach(() => {
    LLMProviderFactory.clearCache();
  });

  describe('Provider Switching Flow', () => {
    it('should get available providers', async () => {
      const response = await request(app).get('/api/llm/providers');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toContain('deepseek');
      expect(response.body.data).toContain('volcano-coding');
    });

    it('should get models for each provider', async () => {
      const deepseekResponse = await request(app)
        .get('/api/llm/models')
        .query({ provider: 'deepseek' });
      expect(deepseekResponse.status).toBe(200);
      expect(deepseekResponse.body.data).toContain('deepseek-chat');

      const volcanoResponse = await request(app)
        .get('/api/llm/models')
        .query({ provider: 'volcano-coding' });
      expect(volcanoResponse.status).toBe(200);
      expect(volcanoResponse.body.data).toContain('ark-code-latest');
    });

    it('should get provider capabilities', async () => {
      const response = await request(app)
        .get('/api/llm/capabilities')
        .query({ provider: 'deepseek' });
      expect(response.status).toBe(200);
      expect(response.body.data.capabilities.maxBatchSize).toBe(5);
    });
  });

  describe('Generate Points API', () => {
    it('should accept provider parameter', async () => {
      const response = await request(app)
        .post('/api/test/generate-points')
        .send({
          requirement: '测试用户登录功能',
          sessionId: 'test-session-123',
          provider: 'deepseek',
          model: 'deepseek-chat',
        });
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.taskId).toBeDefined();
    });

    it('should accept volcano provider parameter', async () => {
      const response = await request(app)
        .post('/api/test/generate-points')
        .send({
          requirement: '测试用户登录功能',
          sessionId: 'test-session-456',
          provider: 'volcano-coding',
          model: 'ark-code-latest',
        });
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
    });

    it('should work without provider parameter (backward compatibility)', async () => {
      const response = await request(app)
        .post('/api/test/generate-points')
        .send({
          requirement: '测试用户登录功能',
          sessionId: 'test-session-789',
        });
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Generate Cases API', () => {
    it('should accept provider parameter', async () => {
      const response = await request(app)
        .post('/api/test/generate-cases')
        .send({
          testPoints: ['验证正确的用户名和密码可以登录', '验证错误的密码不能登录'],
          sessionId: 'test-session-abc',
          provider: 'deepseek',
        });
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Task Status API', () => {
    it('should get task status', async () => {
      const generateResponse = await request(app)
        .post('/api/test/generate-points')
        .send({
          requirement: '测试用户登录功能',
          sessionId: 'test-session-status',
        });

      expect(generateResponse.status).toBe(202);
      expect(generateResponse.body.success).toBe(true);
      expect(generateResponse.body.data).toBeDefined();
      expect(generateResponse.body.data.taskId).toBeDefined();

      const taskId = generateResponse.body.data.taskId;

      const statusResponse = await request(app)
        .get(`/api/test/task/${taskId}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data).toBeDefined();
      expect(statusResponse.body.data.taskId).toBe(taskId);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit generate requests', async () => {
      const requests = Array(6).fill(null).map((_i: any, index: number) =>
        request(app)
          .post('/api/test/generate-points')
          .send({
            requirement: `测试请求 ${index}`,
            sessionId: `rate-limit-session-${index}`,
          })
      );

      const responses = await Promise.all(requests);
      const limitedResponses = responses.filter((r: any) => r.status === 429);
      expect(limitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Evaluation API', () => {
    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/api/quality/evaluate-cases')
        .send({ taskId: 'non-existent-task' });

      expect(response.status).toBe(404);
    });
  });
});
