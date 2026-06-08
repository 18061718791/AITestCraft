import { BaseLLMProvider } from './baseProvider';
import { LLMConfig, GeneratePointsParams, GenerateCasesParams, RequestOptions, ProviderCapability, Base64Image } from './types';
import { TestPoint, TestCase } from '../../types';
import axios, { AxiosInstance } from 'axios';
import logger from '../../utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sanitizeHtml } from '../../utils/sanitize';
import { recognizeDesignMethodsForTestPoints } from '../designMethodRecognizer';
import ImageService from '../imageService';

const VISION_INSTRUCTION = '以下需求描述附带了相关的截图或图片（可能是UI设计稿、原型图、流程图、错误截图等），请结合图片中展示的界面内容、交互流程、数据状态等信息，与文本需求一起分析，生成更全面的测试点。';

export class VolcanoCodingPlanProvider extends BaseLLMProvider {
  readonly name = 'volcano-coding';
  readonly supportedModels = [
    'ark-code-latest',
    'doubao-seed-code',
    'deepseek-v3.2',
    'kimi-k2.5',
    'kimi-k2.6',
    'glm-4.7',
  ];
  private client: AxiosInstance;
  private testPointsPrompt: string;
  private testCasesPrompt: string;

  constructor(config: LLMConfig) {
    super(config);
    this.client = this.createAxiosClient();
    this.testPointsPrompt = this.loadPrompt('generate_test_points.md');
    this.testCasesPrompt = this.loadPrompt('generate_test_cases.md');
  }

  protected defineCapability(): ProviderCapability {
    return {
      supportsStreaming: true,
      supportsBatching: true,
      maxBatchSize: 10,
      recommendedTemperature: 0.3,
      recommendedBatchSize: 10,
      supportsVision: true,
      visionModels: ['doubao-seed-code', 'kimi-k2.5', 'kimi-k2.6', 'glm-4.7', 'deepseek-v3.2'],
    };
  }

  async generateTestPoints(params: GeneratePointsParams): Promise<TestPoint[]> {
    logger.info('【火山引擎】开始生成测试点', {
      model: this.config.model,
      requirementLength: params.requirement?.length,
      hasImages: !!(params.images && params.images.length > 0),
    });
    const cleanedRequirement = sanitizeHtml(params.requirement);
    let prompt = this.buildPointsPrompt(cleanedRequirement, params.system, params.module, params.scenario);

    if (params.images && params.images.length > 0) {
      ImageService.validateImages(params.images);
      prompt = VISION_INSTRUCTION + '\n\n' + prompt;

      logger.info('【火山引擎】视觉模式生成测试点开始', {
        imageCount: params.images!.length,
        model: this.config.model,
      });

      logger.info('volcano_provider', 'generating_test_points_with_vision', {
        requirementLength: params.requirement.length,
        system: params.system,
        module: params.module,
        scenario: params.scenario,
        model: this.config.model,
        imageCount: params.images.length,
      });

      return this.retryRequest(async () => {
        try {
          const response = await this.makeMultimodalRequest(prompt, params.images!, { temperature: 0.3 });
          const testPoints = this.parseTestPoints(response);

          logger.info('volcano_provider', 'test_points_generated_from_vision', {
            pointsCount: testPoints.length,
            imageCount: params.images!.length,
          });

          return testPoints;
        } catch (multimodalError) {
          logger.warn('【火山引擎】多模态请求失败，准备降级处理', {
            error: multimodalError instanceof Error ? multimodalError.message.substring(0, 200) : String(multimodalError).substring(0, 200),
          });
          const errMsg = multimodalError instanceof Error ? multimodalError.message : String(multimodalError);
          logger.warn('volcano_provider', 'multimodal_request_failed_fallback_to_text', {
            error: errMsg.substring(0, 200),
          });
          logger.warn('【火山引擎】多模态请求失败，已回退到文本模式', {
            error: errMsg.substring(0, 200),
          });

          if (this.isLikelyFormatError(multimodalError)) {
            logger.warn('【火山引擎】检测到格式错误，触发视觉降级策略', {
              error: errMsg.substring(0, 200),
            });
            this.visionFallbackOccurred = true;
            const fallbackPrompt = VISION_INSTRUCTION + '\n\n' + prompt +
              '\n\n注：由于技术原因，当前无法直接分析图片内容。请仅基于文本需求描述生成测试点。';
            const response = await this.makeRequest(fallbackPrompt, { temperature: 0.3 });
            const testPoints = this.parseTestPoints(response);

            logger.info('volcano_provider', 'test_points_generated_from_fallback', {
              pointsCount: testPoints.length,
            });

            return testPoints;
          }

          throw multimodalError;
        }
      });
    }

    logger.info('【火山引擎】文本模式生成测试点开始', {
      requirementLength: params.requirement.length,
      model: this.config.model,
    });

    logger.info('volcano_provider', 'generating_test_points', {
      requirementLength: params.requirement.length,
      system: params.system,
      module: params.module,
      scenario: params.scenario,
      model: this.config.model,
    });

    return this.retryRequest(async () => {
      const response = await this.makeRequest(prompt, { temperature: 0.3 });
      const testPoints = this.parseTestPoints(response);

      logger.info('volcano_provider', 'test_points_generated', {
        pointsCount: testPoints.length,
        points: testPoints.slice(0, 3),
      });

      return testPoints;
    });
  }

  async generateTestCases(params: GenerateCasesParams): Promise<TestCase[]> {
    logger.info('【火山引擎】开始生成测试用例', {
      testPointsCount: params.testPoints.length,
      model: this.config.model,
    });
    const batchSize = this.config.batchSize || this.capability.maxBatchSize;
    const allTestCases: TestCase[] = [];
    const totalBatches = Math.ceil(params.testPoints.length / batchSize);

    logger.info('volcano_provider', 'generating_test_cases_batched', {
      testPointsCount: params.testPoints.length,
      batchSize,
      totalBatches,
      model: this.config.model,
    });

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, params.testPoints.length);
      const batchPoints = params.testPoints.slice(start, end);

      logger.info('【火山引擎】开始处理批次', {
        batchIndex: batchIndex + 1,
        totalBatches,
        batchSize: batchPoints.length,
      });

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

        logger.info('volcano_provider', 'batch_completed', {
          batchIndex: batchIndex + 1,
          totalBatches,
          batchCasesCount: batchCases.length,
          totalCasesCount: allTestCases.length,
        });
        logger.info('【火山引擎】批次处理完成', {
          batchIndex: batchIndex + 1,
          totalBatches,
          batchCasesCount: batchCases.length,
          totalCasesCount: allTestCases.length,
        });
      } catch (error) {
        const errorMessage = this.handleError(error);
        logger.error('【火山引擎】批次处理失败', {
          batchIndex: batchIndex + 1,
          totalBatches,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.error('volcano_provider', 'batch_processing_failed', error, {
          batchIndex: batchIndex + 1,
          totalBatches,
        });
        throw new Error(`批次 ${batchIndex + 1}/${totalBatches} 处理失败: ${errorMessage}`);
      }
    }

    logger.info('volcano_provider', 'test_cases_generated', {
      totalCasesCount: allTestCases.length,
      totalBatches,
    });

    return allTestCases;
  }

  protected async makeRequest(prompt: string, options?: RequestOptions): Promise<string> {
    logger.info('【火山引擎】构建文本请求', { model: this.config.model });
    const requestData = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content:
            '你是一位资深的软件测试工程师，擅长将需求转化为结构化的测试用例。请严格按照要求的JSON格式输出，确保输出可以被直接解析。',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: options?.maxTokens || this.config.maxTokens || 4000,
      temperature: options?.temperature || this.config.temperature || 0.3,
    };

    logger.info('【火山引擎】开始执行文本请求', { model: this.config.model });
    return this.executeRequest(requestData);
  }

  protected async executeRequest(requestData: any): Promise<string> {
    logger.info('【火山引擎】发起网络请求', {
      model: this.config.model,
      temperature: requestData.temperature,
    });
    logger.debug('volcano_provider', 'api_request', {
      model: this.config.model,
      temperature: requestData.temperature,
    });

    const startTime = Date.now();
    try {
      logger.info('【火山引擎】正在发送 API 请求...', { model: this.config.model });
      const response = await this.client.post('/chat/completions', requestData);
      const endTime = Date.now();

      logger.info('volcano_provider', 'api_response', {
        responseTime: endTime - startTime,
        status: response.status,
      });

      const message = response.data.choices?.[0]?.message;
      const content = (message?.content || message?.reasoning || '').trim();
      if (!content) {
        throw new Error('Empty response from Volcano Coding Plan API (content and reasoning are both empty)');
      }

      logger.info('【火山引擎】API 请求成功', { responseTime: endTime - startTime, contentLength: content.length });
      return content;
    } catch (error: any) {
      const endTime = Date.now();
      logger.error('【火山引擎】网络请求失败', {
        responseTime: endTime - startTime,
        status: error.response?.status,
        errorMessage: error.message,
      });
      const apiErrorData = error.response?.data;
      logger.error('volcano_provider', 'api_request_failed', {
        responseTime: endTime - startTime,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorData: typeof apiErrorData === 'string'
          ? apiErrorData.substring(0, 500)
          : JSON.stringify(apiErrorData).substring(0, 500),
        errorMessage: error.message,
      });
      throw error;
    }
  }

  protected override async makeMultimodalRequest(
    textContent: string,
    images: Base64Image[],
    options?: RequestOptions
  ): Promise<string> {
    logger.info('【火山引擎】构建多模态请求', { model: this.config.model, imageCount: images.length });
    const contentParts: any[] = [
      { type: 'text', text: textContent },
    ];

    for (const img of images) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
        },
      });
    }

    const requestData = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content:
            '你是一位资深的软件测试工程师，擅长将需求和截图转化为结构化的测试用例。请严格按照要求的JSON格式输出，确保输出可以被直接解析。',
        },
        { role: 'user', content: contentParts },
      ],
      max_tokens: options?.maxTokens || this.config.maxTokens || 4000,
      temperature: options?.temperature || this.config.temperature || 0.3,
    };

    logger.info('volcano_provider', 'multimodal_api_request', {
      model: this.config.model,
      textLength: textContent.length,
      imageCount: images.length,
    });

    logger.info('【火山引擎】开始执行多模态请求', { model: this.config.model, imageCount: images.length });
    return this.executeRequest(requestData);
  }

  protected parseTestPoints(content: string): TestPoint[] {
    logger.info('【火山引擎】开始解析测试点', { contentLength: content.length });
    const result = this.parseJSONOrText(content, 'points') as TestPoint[];
    logger.info('【火山引擎】测试点解析完成', { count: result.length });
    return result;
  }

  protected parseTestCases(content: string): TestCase[] {
    logger.info('【火山引擎】开始解析测试用例', { contentLength: content.length });
    const result = this.parseJSONOrText(content, 'cases') as TestCase[];
    logger.info('【火山引擎】测试用例解析完成', { count: result.length });
    return result;
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

  private buildPointsPrompt(
    requirement: string,
    system?: string,
    module?: string,
    scenario?: string
  ): string {
    let prompt = this.testPointsPrompt.replace('{requirement}', requirement);
    prompt = prompt.replace('{system}', system || '通用系统');
    prompt = prompt.replace('{module}', module || '通用模块');
    prompt = prompt.replace('{scenario}', scenario || '通用场景');
    return prompt;
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

    logger.info('volcano_provider', 'generating_batch_test_cases', {
      batchIndex,
      totalBatches,
      testPointsCount: testPoints.length,
    });

    const response = await this.makeRequest(prompt);
    return this.parseTestCases(response);
  }

  private parseJSONOrText(content: string, type: 'points' | 'cases'): any[] {
    logger.info('volcano_provider', 'parsing_response', {
      type,
      responseLength: content.length,
      contentPreview: content.substring(0, 200),
    });

    try {
      // 方法1: 尝试提取 markdown 代码块中的 JSON
      const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch && markdownMatch[1]) {
        const innerContent = markdownMatch[1].trim();
        if (innerContent.startsWith('[')) {
          try {
            const parsed = JSON.parse(innerContent);
            if (Array.isArray(parsed) && parsed.length > 0) {
              logger.info('volcano_provider', 'parsed_from_markdown', { type, count: parsed.length });
              if (type === 'points') {
                let testPoints = parsed.map((item: any, index: number): TestPoint => this.createTestPoint(item, index));
                testPoints = recognizeDesignMethodsForTestPoints(testPoints);
                return testPoints;
              } else {
                return parsed.map((item: any, index: number): TestCase => this.createTestCase(item, index));
              }
            }
          } catch (e) {
            logger.warn('volcano_provider', 'markdown_json_parse_failed', { error: (e as Error).message });
          }
        }
      }

      // 方法2: 正则匹配 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          logger.info('volcano_provider', 'parsed_json_response', {
            type,
            count: parsed.length,
            firstItem: parsed[0],
          });
          if (type === 'points') {
            let testPoints = parsed.map((item: any, index: number): TestPoint => this.createTestPoint(item, index));
            testPoints = recognizeDesignMethodsForTestPoints(testPoints);
            logger.info('volcano_provider', 'test_points_with_design_method', {
              count: testPoints.length,
              sample: testPoints.slice(0, 3).map(tp => ({
                content: tp.content?.substring(0, 50),
                designMethod: tp.designMethod,
              })),
            });
            return testPoints;
          } else {
            return parsed.map((item: any, index: number): TestCase => this.createTestCase(item, index));
          }
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
            logger.info('volcano_provider', 'parsed_manual_json', { type, count: parsed.length });
            if (type === 'points') {
              let testPoints = parsed.map((item: any, index: number): TestPoint => this.createTestPoint(item, index));
              testPoints = recognizeDesignMethodsForTestPoints(testPoints);
              return testPoints;
            } else {
              return parsed.map((item: any, index: number): TestCase => this.createTestCase(item, index));
            }
          }
        } catch (e) {
          logger.warn('volcano_provider', 'manual_json_parse_failed', { error: (e as Error).message });
        }
      }
    } catch (e) {
      logger.error('【火山引擎】解析结果失败', {
        error: e instanceof Error ? e.message : String(e),
        type,
      });
      logger.warn('volcano_provider', 'json_parse_failed', {
        error: e instanceof Error ? e.message : String(e),
        type,
      });
    }

    if (type === 'points') {
      let testPoints = this.parsePointsFromText(content);
      testPoints = recognizeDesignMethodsForTestPoints(testPoints);
      return testPoints;
    }
    return this.parseCasesFromText(content);
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

  private parsePointsFromText(content: string): TestPoint[] {
    const testPoints: TestPoint[] = [];
    const lines = content.split('\n').filter((line) => line.trim());
    let currentTestPoint: any = {};

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || '').trim();

      if (line.match(/^\d+\./) || line.startsWith('-') || line.startsWith('*')) {
        if (currentTestPoint.title) {
          testPoints.push({
            id: `tp-${Date.now()}-${testPoints.length}`,
            title: currentTestPoint.title,
            description: currentTestPoint.description || '',
            priority: (currentTestPoint.priority || 'medium') as TestPoint['priority'],
            category: (currentTestPoint.category || 'functional') as TestPoint['category'],
            expectedResult: currentTestPoint.expectedResult || '',
            testSteps: currentTestPoint.testSteps || [],
            content: currentTestPoint.content || currentTestPoint.description || currentTestPoint.title,
            designMethod: currentTestPoint.designMethod || '等价类划分',
          });
        }
        currentTestPoint = { title: line.replace(/^\d+\.|^[-*]\s*/, '').trim() };
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
        title: currentTestPoint.title,
        description: currentTestPoint.description || '',
        priority: (currentTestPoint.priority || 'medium') as TestPoint['priority'],
        category: (currentTestPoint.category || 'functional') as TestPoint['category'],
        expectedResult: currentTestPoint.expectedResult || '',
        testSteps: currentTestPoint.testSteps || [],
        content: currentTestPoint.content || currentTestPoint.description || currentTestPoint.title,
        designMethod: currentTestPoint.designMethod || '等价类划分',
      });
    }

    if (testPoints.length === 0) {
      throw new Error('No test points could be parsed from response');
    }

    return testPoints;
  }

  private parseCasesFromText(content: string): TestCase[] {
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
