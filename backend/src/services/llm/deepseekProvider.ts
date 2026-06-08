import { BaseLLMProvider } from './baseProvider';
import { LLMConfig, GeneratePointsParams, GenerateCasesParams, RequestOptions, ProviderCapability, Base64Image } from './types';
import { TestPoint, TestCase } from '../../types';
import axios, { AxiosInstance, AxiosError } from 'axios';
import logger from '../../utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sanitizeHtml } from '../../utils/sanitize';
import { recognizeDesignMethodsForTestPoints } from '../designMethodRecognizer';
import ImageService from '../imageService';

const VISION_INSTRUCTION = '以下需求描述附带了相关的截图或图片（可能是UI设计稿、原型图、流程图、错误截图等），请结合图片中展示的界面内容、交互流程、数据状态等信息，与文本需求一起分析，生成更全面的测试点。';

export class DeepSeekProvider extends BaseLLMProvider {
  readonly name = 'deepseek';
  readonly supportedModels = ['deepseek-chat', 'deepseek-coder', 'deepseek-v4-flash', 'deepseek-v4-pro'];
  private client: AxiosInstance;
  private testPointsPrompt: string;
  private testCasesPrompt: string;

  constructor(config: LLMConfig) {
    super(config);
    this.client = this.createAxiosClient();
    this.testPointsPrompt = this.loadPrompt('generate_test_points.md');
    this.testCasesPrompt = this.loadPrompt('generate_test_cases.md');
    this.setupInterceptors();
  }

  protected defineCapability(): ProviderCapability {
    return {
      supportsStreaming: true,
      supportsBatching: true,
      maxBatchSize: 5,
      recommendedTemperature: 0.7,
      recommendedBatchSize: 5,
      supportsVision: true,
      visionModels: ['deepseek-v4-pro', 'deepseek-chat'],
    };
  }

  async generateTestPoints(params: GeneratePointsParams): Promise<TestPoint[]> {
    logger.info('【DeepSeek】开始生成测试点', { model: this.config.model, hasImages: !!(params.images && params.images.length > 0) });

    const cleanedRequirement = sanitizeHtml(params.requirement);
    let prompt = this.testPointsPrompt.replace('{requirement}', cleanedRequirement);
    prompt = prompt.replace('{system}', params.system || '通用系统');
    prompt = prompt.replace('{module}', params.module || '通用模块');
    prompt = prompt.replace('{scenario}', params.scenario || '通用场景');

    if (params.images && params.images.length > 0) {
      ImageService.validateImages(params.images);
      prompt = VISION_INSTRUCTION + '\n\n' + prompt;

      logger.info('deepseek_provider', 'generating_test_points_with_vision', {
        requirementLength: params.requirement.length,
        system: params.system,
        module: params.module,
        scenario: params.scenario,
        promptLength: prompt.length,
        imageCount: params.images.length,
        model: this.config.model,
      });
      logger.info('【DeepSeek】开始视觉模式生成测试点', { imageCount: params.images.length, model: this.config.model });

      return this.retryRequest(async () => {
        try {
          const response = await this.makeMultimodalRequest(prompt, params.images!);
          const testPoints = this.parseTestPoints(response);

          logger.info('deepseek_provider', 'test_points_generated_from_vision', {
            pointsCount: testPoints.length,
            imageCount: params.images!.length,
          });

          return testPoints;
        } catch (multimodalError) {
          const errMsg = multimodalError instanceof Error ? multimodalError.message : String(multimodalError);
          logger.warn('deepseek_provider', 'multimodal_request_failed_fallback_to_text', {
            error: errMsg.substring(0, 200),
          });
          logger.warn('【DeepSeek】多模态请求失败，准备回退到文本模式', { error: errMsg.substring(0, 200) });

          if (this.isLikelyFormatError(multimodalError)) {
            this.visionFallbackOccurred = true;
            const fallbackPrompt = VISION_INSTRUCTION + '\n\n' + prompt +
              '\n\n注：由于技术原因，当前无法直接分析图片内容。请仅基于文本需求描述生成测试点。';
            const response = await this.makeRequest(fallbackPrompt);
            const testPoints = this.parseTestPoints(response);

            logger.info('deepseek_provider', 'test_points_generated_from_fallback', {
              pointsCount: testPoints.length,
            });

            return testPoints;
          }

          throw multimodalError;
        }
      });
    }

    logger.info('deepseek_provider', 'generating_test_points', {
      requirementLength: params.requirement.length,
      system: params.system,
      module: params.module,
      scenario: params.scenario,
      promptLength: prompt.length,
    });
    logger.info('【DeepSeek】开始文本模式生成测试点', { promptLength: prompt.length, model: this.config.model });

    return this.retryRequest(async () => {
      const response = await this.makeRequest(prompt);
      const testPoints = this.parseTestPoints(response);

      logger.info('deepseek_provider', 'test_points_generated', {
        pointsCount: testPoints.length,
        points: testPoints.slice(0, 3),
      });

      return testPoints;
    });
  }

  async generateTestCases(params: GenerateCasesParams): Promise<TestCase[]> {
    logger.info('【DeepSeek】开始生成测试用例', { testPointsCount: params.testPoints.length, model: this.config.model });

    const batchSize = this.config.batchSize || this.capability.maxBatchSize;
    const allTestCases: TestCase[] = [];
    const totalBatches = Math.ceil(params.testPoints.length / batchSize);

    logger.info('deepseek_provider', 'generating_test_cases_batched', {
      testPointsCount: params.testPoints.length,
      batchSize,
      totalBatches,
    });

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, params.testPoints.length);
      const batchPoints = params.testPoints.slice(start, end);

      logger.info('【DeepSeek】开始处理批次', { batchIndex: batchIndex + 1, totalBatches, batchPointsCount: batchPoints.length });

      try {
        const batchCases = await this.retryRequest(() =>
          this.generateCasesBatch(
            batchPoints,
            params.system,
            params.module,
            params.scenario,
            batchIndex + 1,
            totalBatches
          )
        );

        const currentCount = allTestCases.length;
        const numberedCases = batchCases.map((testCase, index) => ({
          ...testCase,
          number: `Test${String(currentCount + index + 1).padStart(4, '0')}`,
        }));

        allTestCases.push(...numberedCases);

        if (params.onProgress) {
          params.onProgress(batchIndex + 1, totalBatches, numberedCases);
        }

        logger.info('deepseek_provider', 'batch_completed', {
          batchIndex: batchIndex + 1,
          totalBatches,
          batchCasesCount: batchCases.length,
          totalCasesCount: allTestCases.length,
        });
        logger.info('【DeepSeek】批次处理完成', { batchIndex: batchIndex + 1, totalBatches, batchCasesCount: batchCases.length, totalCasesCount: allTestCases.length });
      } catch (error) {
        const errorMessage = this.handleError(error);
        logger.error('deepseek_provider', 'batch_processing_failed', error, {
          batchIndex: batchIndex + 1,
          totalBatches,
        });
        logger.error('【DeepSeek】批次处理失败', { batchIndex: batchIndex + 1, totalBatches, error: errorMessage });
        throw new Error(`批次 ${batchIndex + 1}/${totalBatches} 处理失败: ${errorMessage}`);
      }
    }

    logger.info('deepseek_provider', 'test_cases_generated', {
      totalCasesCount: allTestCases.length,
      totalBatches,
      cases: allTestCases.slice(0, 2),
    });

    return allTestCases;
  }

  protected async makeRequest(prompt: string, options?: RequestOptions): Promise<string> {
    logger.info('【DeepSeek】准备发送文本请求', { model: this.config.model, maxTokens: options?.maxTokens || this.config.maxTokens || 4000 });

    const requestData = {
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || this.config.maxTokens || 4000,
      temperature: options?.temperature || this.config.temperature || 0.7,
    };

    const result = await this.executeRequest(requestData);

    logger.info('【DeepSeek】文本请求完成', { model: this.config.model, responseLength: result.length });
    return result;
  }

  protected async executeRequest(requestData: any): Promise<string> {
    logger.info('【DeepSeek】开始执行API请求', { model: requestData.model, temperature: requestData.temperature });

    logger.debug('deepseek_provider', 'api_request', {
      model: this.config.model,
      temperature: requestData.temperature,
    });

    const startTime = Date.now();
    try {
      const response = await this.client.post('/chat/completions', requestData);
      const endTime = Date.now();

      logger.info('deepseek_provider', 'api_response', {
        responseTime: endTime - startTime,
        status: response.status,
      });

      const message = response.data.choices?.[0]?.message;
      const content = (message?.content || message?.reasoning || '').trim();
      if (!content) {
        throw new Error('Empty response from AI service (content and reasoning are both empty)');
      }

      logger.info('【DeepSeek】API请求成功', { responseTime: endTime - startTime, status: response.status, contentLength: content.length });
      return content;
    } catch (error: any) {
      const endTime = Date.now();
      const apiErrorData = error.response?.data;
      logger.error('deepseek_provider', 'api_request_failed', {
        responseTime: endTime - startTime,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorData: typeof apiErrorData === 'string'
          ? apiErrorData.substring(0, 500)
          : JSON.stringify(apiErrorData).substring(0, 500),
        errorMessage: error.message,
      });
      logger.error('【DeepSeek】API请求失败', { responseTime: endTime - startTime, status: error.response?.status, errorMessage: error.message });
      throw error;
    }
  }

  protected parseTestPoints(content: string): TestPoint[] {
    logger.info('【DeepSeek】开始解析测试点结果', { responseLength: content.length });

    logger.info('deepseek_provider', 'parsing_test_points', {
      responseLength: content.length,
      contentPreview: content.substring(0, 500),
      firstChar: content.charCodeAt(0),
      startsWithBracket: content.startsWith('['),
      startsWithMarkdown: content.startsWith('```'),
    });

    try {
      let testPoints: TestPoint[] = [];
      
      // 方法1: 尝试提取 markdown 代码块中的 JSON
      const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch && markdownMatch[1]) {
        logger.info('deepseek_provider', 'found_markdown_block');
        const innerContent = markdownMatch[1].trim();
        if (innerContent.startsWith('[')) {
          try {
            const parsed = JSON.parse(innerContent);
            if (Array.isArray(parsed) && parsed.length > 0) {
              logger.info('deepseek_provider', 'parsed_from_markdown', { count: parsed.length });
              testPoints = parsed.map((item: any, index: number): TestPoint => this.createTestPoint(item, index));
              return this.finalizeTestPoints(testPoints);
            }
          } catch (e) {
            logger.warn('deepseek_provider', 'markdown_json_parse_failed', { error: (e as Error).message });
          }
        }
      }
      
      // 方法2: 正则匹配 JSON 数组
      const jsonMatch = content.match(/\[\s\S]*\]/);
      logger.info('deepseek_provider', 'json_regex_result', {
        hasMatch: !!jsonMatch,
        matchLength: jsonMatch ? jsonMatch[0].length : 0,
        matchPreview: jsonMatch ? jsonMatch[0].substring(0, 100) : null,
      });
      if (jsonMatch && testPoints.length === 0) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            logger.info('deepseek_provider', 'parsed_json_test_points', {
              count: parsed.length,
              firstItem: parsed[0],
            });
            testPoints = parsed.map((item: any, index: number): TestPoint => this.createTestPoint(item, index));
            return this.finalizeTestPoints(testPoints);
          }
        } catch (e) {
          logger.warn('deepseek_provider', 'json_parse_failed', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // 方法3: 手动查找第一个 [ 和最后一个 ]
      if (testPoints.length === 0) {
        const start = content.indexOf('[');
        const end = content.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
          const jsonStr = content.substring(start, end + 1);
          logger.info('deepseek_provider', 'manual_json_extract', { length: jsonStr.length });
          try {
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              logger.info('deepseek_provider', 'parsed_manual_json', { count: parsed.length });
              testPoints = parsed.map((item: any, index: number): TestPoint => this.createTestPoint(item, index));
              return this.finalizeTestPoints(testPoints);
            }
          } catch (e) {
            logger.warn('deepseek_provider', 'manual_json_parse_failed', { error: (e as Error).message });
          }
        }
      }

      // 方法4: 文本解析回退
      if (testPoints.length === 0) {
        logger.info('deepseek_provider', 'falling_back_to_text_parse');
        testPoints = this.parseTestPointsFromText(content);
      }

      return this.finalizeTestPoints(testPoints);
    } catch (error) {
      logger.error('deepseek_provider', 'parse_test_points_failed', error);
      logger.error('【DeepSeek】测试点解析失败', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Failed to parse test points from AI response');
    }
  }

  private createTestPoint(item: any, index: number): TestPoint {
    return {
      id: `tp-${Date.now()}-${index}`,
      title: item.title || item.name || item.testPoint || `Test Point ${index + 1}`,
      description: item.description || item.testDescription || '',
      priority: (item.priority || 'medium') as TestPoint['priority'],
      category: (item.category || 'functional') as TestPoint['category'],
      expectedResult: item.expectedResult || item.expected || '',
      testSteps: item.testSteps || item.steps || [],
      content: item.content || item.title || item.description || `测试点 ${index + 1}: ${item.title || item.name || item.testPoint || '未命名测试点'}`,
      designMethod: item.designMethod || item.design_method,
      pointCategory: item.pointCategory || item.point_category || item.moduleCategory || '其他功能',
    };
  }

  private finalizeTestPoints(testPoints: TestPoint[]): TestPoint[] {
    testPoints = recognizeDesignMethodsForTestPoints(testPoints);
    logger.info('deepseek_provider', 'test_points_with_design_method', {
      count: testPoints.length,
      sample: testPoints.slice(0, 3).map(tp => ({
        content: tp.content?.substring(0, 50),
        designMethod: tp.designMethod,
      })),
    });
    logger.info('【DeepSeek】测试点解析完成', { count: testPoints.length });
    return testPoints;
  }

  protected parseTestCases(content: string): TestCase[] {
    logger.info('【DeepSeek】开始解析测试用例结果', { responseLength: content.length });

    try {
      // 方法1: 尝试提取 markdown 代码块中的 JSON
      const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch && markdownMatch[1]) {
        const innerContent = markdownMatch[1].trim();
        if (innerContent.startsWith('[')) {
          try {
            const parsed = JSON.parse(innerContent);
            if (Array.isArray(parsed) && parsed.length > 0) {
              logger.info('【DeepSeek】从 markdown 代码块解析测试用例', { count: parsed.length });
              return parsed.map((testCase, index) => this.createTestCase(testCase, index));
            }
          } catch (e) {
            logger.warn('deepseek_provider', 'markdown_json_parse_failed', { error: (e as Error).message });
          }
        }
      }

      // 方法2: 正则匹配 JSON 数组（修复后的正则）
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cases = JSON.parse(jsonMatch[0]);
        if (Array.isArray(cases) && cases.length > 0) {
          logger.info('【DeepSeek】测试用例解析完成', { count: cases.length });
          return cases.map((testCase, index) => this.createTestCase(testCase, index));
        }
      }

      // 方法3: 手动查找第一个 [ 和最后一个 ]
      const start = content.indexOf('[');
      const end = content.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        const jsonStr = content.substring(start, end + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            logger.info('【DeepSeek】手动提取 JSON 解析测试用例', { count: parsed.length });
            return parsed.map((testCase, index) => this.createTestCase(testCase, index));
          }
        } catch (e) {
          logger.warn('deepseek_provider', 'manual_json_parse_failed', { error: (e as Error).message });
        }
      }

      // 方法4: 文本解析回退
      const result = this.extractTestCasesFromText(content);
      logger.info('【DeepSeek】测试用例文本解析完成', { count: result.length });
      return result;
    } catch (error) {
      logger.error('deepseek_provider', 'parse_test_cases_failed', error);
      logger.error('【DeepSeek】测试用例解析失败', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Invalid test case format from AI service');
    }
  }

  private createTestCase(item: any, index: number): TestCase {
    // 确保 steps 是字符串数组
    let steps: string[] = [];
    if (Array.isArray(item.steps)) {
      steps = item.steps.filter((s: any) => typeof s === 'string');
    } else if (typeof item.steps === 'string') {
      steps = item.steps.split('\n').filter((s: string) => s.trim());
    }

    // 确保 expected_results 是字符串数组
    let expectedResults: string[] = [];
    if (Array.isArray(item.expected_results)) {
      expectedResults = item.expected_results.filter((s: any) => typeof s === 'string');
    } else if (typeof item.expected_results === 'string') {
      expectedResults = item.expected_results.split('\n').filter((s: string) => s.trim());
    }

    return {
      number: `Test${String(index + 1).padStart(4, '0')}`,
      system: item.system || '',
      module: item.module || '',
      scenario: item.scenario || '',
      title: item.title || '未命名测试用例',
      description: item.description || '',
      precondition: item.precondition || item.preconditions || '',
      steps: steps,
      expected_results: expectedResults,
      actual_result: '待测试',
      pass_fail: '待测试',
    };
  }

  private createAxiosClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 120000,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('deepseek_provider', 'api_request_interceptor', {
          url: config.url,
          method: config.method,
        });
        return config;
      },
      (error) => {
        logger.error('deepseek_provider', 'api_request_error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const responseData = error.response.data;
          const errorDetail = typeof responseData === 'string'
            ? responseData.substring(0, 500)
            : JSON.stringify(responseData).substring(0, 500);
          logger.error('deepseek_provider', 'api_response_error_detailed', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: errorDetail,
            headers: error.response.headers,
          });
        } else if (error.request) {
          logger.error('deepseek_provider', 'api_network_error', error.message);
          logger.error('【DeepSeek】网络错误，无法连接到API服务', { errorMessage: error.message });
        }
        return Promise.reject(error);
      }
    );
  }

  private loadPrompt(filename: string): string {
    return readFileSync(join(process.cwd(), '..', 'prompts', filename), 'utf-8');
  }

  private isLikelyFormatError(error: any): boolean {
    const status = error?.response?.status;
    if (status === 400 || status === 422 || status === 415) return true;
    const msg = error?.message || '';
    return msg.includes('400') || msg.includes('422') || msg.includes('415') ||
      msg.includes('multipart') || msg.includes('content-type');
  }

  private async generateCasesBatch(
    testPoints: string[],
    system?: string,
    module?: string,
    scenario?: string,
    batchIndex?: number,
    totalBatches?: number
  ): Promise<TestCase[]> {
    const testPointsText = testPoints.join('\n');
    let prompt = this.testCasesPrompt.replace('{test_points}', testPointsText);
    prompt = prompt.replace('{system}', system || '通用系统');
    prompt = prompt.replace('{module}', module || '通用模块');
    prompt = prompt.replace('{scenario}', scenario || '通用场景');

    if (system || module || scenario) {
      const contextInfo = [];
      if (system) contextInfo.push(`系统: ${system}`);
      if (module) contextInfo.push(`功能模块: ${module}`);
      if (scenario) contextInfo.push(`功能场景: ${scenario}`);
      if (batchIndex && totalBatches) {
        contextInfo.push(`当前批次: ${batchIndex}/${totalBatches}`);
      }
      prompt = prompt.replace('{context_info}', contextInfo.join('\n'));
    } else {
      prompt = prompt.replace('{context_info}', '');
    }

    logger.info('deepseek_provider', 'generating_batch_test_cases', {
      batchIndex,
      totalBatches,
      testPointsCount: testPoints.length,
    });

    const response = await this.makeRequest(prompt);
    return this.parseTestCases(response);
  }

  private parseTestPointsFromText(content: string): TestPoint[] {
    const testPoints: TestPoint[] = [];
    const lines = content.split('\n').filter((line) => line.trim());
    let currentTestPoint: any = {};

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || '').trim();

      if (line.match(/^\d+\./) || line.startsWith('-') || line.startsWith('*')) {
        if (currentTestPoint.title) {
          testPoints.push({
            id: `tp-${Date.now()}-${testPoints.length}`,
            title: currentTestPoint.title || `Test Point ${testPoints.length + 1}`,
            description: currentTestPoint.description || '',
            priority: (currentTestPoint.priority || 'medium') as TestPoint['priority'],
            category: (currentTestPoint.category || 'functional') as TestPoint['category'],
            expectedResult: currentTestPoint.expectedResult || '',
            testSteps: currentTestPoint.testSteps || [],
            content: currentTestPoint.content || currentTestPoint.description || currentTestPoint.title || `测试点 ${testPoints.length + 1}: ${currentTestPoint.title || '未命名测试点'}`,
            designMethod: currentTestPoint.designMethod || '等价类划分',
            pointCategory: currentTestPoint.pointCategory || '其他功能',
          });
        }
        currentTestPoint = { title: line.replace(/^\d+\.|^[-*]\s*/, '').trim() };
      } else if (line.toLowerCase().includes('pointcategory:') || line.toLowerCase().includes('point_category:') || line.toLowerCase().includes('功能分类:')) {
        currentTestPoint.pointCategory = line.split(':').slice(1).join(':').trim();
      } else if (line.toLowerCase().includes('description:')) {
        currentTestPoint.description = line.split(':').slice(1).join(':').trim();
      } else if (line.toLowerCase().includes('expected:')) {
        currentTestPoint.expectedResult = line.split(':').slice(1).join(':').trim();
      } else if (line.toLowerCase().includes('priority:')) {
        currentTestPoint.priority = line.split(':').slice(1).join(':').trim().toLowerCase();
      } else if (line.toLowerCase().includes('category:')) {
        currentTestPoint.category = line.split(':').slice(1).join(':').trim().toLowerCase();
      } else if (line.toLowerCase().includes('designmethod:') || line.toLowerCase().includes('design_method:') || line.toLowerCase().includes('设计方法:')) {
        currentTestPoint.designMethod = line.split(':').slice(1).join(':').trim();
      } else if (line.toLowerCase().includes('steps:')) {
        const steps: string[] = [];
        let j = i + 1;
        while (j < lines.length && (lines[j] || '').match(/^\s{2,}/)) {
          steps.push((lines[j] || '').trim());
          j++;
        }
        i = j - 1;
        currentTestPoint.testSteps = steps;
      }
    }

    if (currentTestPoint.title) {
      testPoints.push({
        id: `tp-${Date.now()}-${testPoints.length}`,
        title: currentTestPoint.title || `Test Point ${testPoints.length + 1}`,
        description: currentTestPoint.description || '',
        priority: (currentTestPoint.priority || 'medium') as TestPoint['priority'],
        category: (currentTestPoint.category || 'functional') as TestPoint['category'],
        expectedResult: currentTestPoint.expectedResult || '',
        testSteps: currentTestPoint.testSteps || [],
        content: currentTestPoint.content || currentTestPoint.description || currentTestPoint.title || `测试点 ${testPoints.length + 1}: ${currentTestPoint.title || '未命名测试点'}`,
        designMethod: currentTestPoint.designMethod || '等价类划分',
        pointCategory: currentTestPoint.pointCategory || '其他功能',
      });
    }

    if (testPoints.length === 0) {
      throw new Error('No test points could be parsed from response');
    }

    return testPoints;
  }

  private extractTestCasesFromText(content: string): TestCase[] {
    const cases: TestCase[] = [];
    const lines = content.split('\n');
    let currentCase: Partial<TestCase> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('"number"')) {
        if (currentCase.number && currentCase.title) {
          cases.push({
            ...currentCase,
            actual_result: '待测试',
            pass_fail: '待测试',
          } as TestCase);
        }
        currentCase = {};
        const match = trimmed.match(/"number":\s*"?([^",]+)"?/);
        if (match && match[1]) currentCase.number = match[1];
      } else if (trimmed.includes('"title"')) {
        const match = trimmed.match(/"title":\s*"([^"]+)"/);
        if (match && match[1]) currentCase.title = match[1];
      } else if (trimmed.includes('"module"')) {
        const match = trimmed.match(/"module":\s*"([^"]+)"/);
        if (match && match[1]) currentCase.module = match[1];
      }
    }

    if (currentCase.number && currentCase.title) {
      cases.push({
        ...currentCase,
        actual_result: '待测试',
        pass_fail: '待测试',
      } as TestCase);
    }

    if (cases.length === 0) {
      throw new Error('No test cases found in AI response');
    }

    return cases;
  }
}
