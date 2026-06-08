import { LLMConfig, GeneratePointsParams, GenerateCasesParams, RequestOptions, ProviderCapability, Base64Image } from './types';
import { TestPoint, TestCase } from '../../types';
import logger from '../../utils/logger';

export abstract class BaseLLMProvider {
  protected config: LLMConfig;
  protected capability: ProviderCapability;
  public visionFallbackOccurred: boolean = false;

  constructor(config: LLMConfig) {
    this.config = config;
    this.capability = this.defineCapability();
  }

  abstract readonly name: string;
  abstract readonly supportedModels: string[];

  abstract generateTestPoints(params: GeneratePointsParams): Promise<TestPoint[]>;
  abstract generateTestCases(params: GenerateCasesParams): Promise<TestCase[]>;

  loadConfig(config: LLMConfig): void {
    this.config = { ...this.config, ...config };
  }

  validateConfig(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.baseURL &&
      this.config.model &&
      this.supportedModels.includes(this.config.model)
    );
  }

  getCapability(): ProviderCapability {
    return this.capability;
  }

  supportsVision(model?: string): boolean {
    if (!this.capability.supportsVision) return false;
    if (!model) return true;
    return this.capability.visionModels.includes(model);
  }

  getVisionModels(): string[] {
    return this.capability.supportsVision ? this.capability.visionModels : [];
  }

  protected abstract makeRequest(prompt: string, options?: RequestOptions): Promise<string>;
  protected abstract parseTestPoints(content: string): TestPoint[];
  protected abstract parseTestCases(content: string): TestCase[];
  protected abstract defineCapability(): ProviderCapability;

  protected buildMultimodalMessages(
    textContent: string,
    images: Base64Image[]
  ): Array<{ role: string; content: any }> {
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

    return [{ role: 'user', content: contentParts }];
  }

  protected async makeMultimodalRequest(
    textContent: string,
    images: Base64Image[],
    options?: RequestOptions
  ): Promise<string> {
    const messages = this.buildMultimodalMessages(textContent, images);

    const requestData = {
      model: this.config.model,
      messages,
      max_tokens: options?.maxTokens || this.config.maxTokens || 4000,
      temperature: options?.temperature || this.config.temperature || 0.7,
    };

    logger.info(`${this.name}_provider`, 'multimodal_api_request', {
      model: this.config.model,
      textLength: textContent.length,
      imageCount: images.length,
    });

    return this.executeRequest(requestData);
  }

  protected abstract executeRequest(requestData: any): Promise<string>;

  protected handleError(error: any): string {
    const apiDetail = this.extractApiErrorDetail(error);
    if (error.code === 'ECONNABORTED') {
      logger.error('【LLM基础层】AI服务响应超时', { provider: this.name, errorCode: error.code, errorMessage: error.message });
      return 'AI服务响应超时，请稍后重试。这可能是由于网络连接较慢或AI服务繁忙导致。';
    } else if (error.response?.status === 400) {
      logger.error('【LLM基础层】AI服务请求格式错误(400)', { provider: this.name, status: 400, apiDetail });
      return `AI服务请求格式错误(400)${apiDetail}。可能原因：模型不支持多模态输入、图片格式不兼容或请求参数有误。`;
    } else if (error.response?.status === 429) {
      logger.error('【LLM基础层】AI服务调用频率受限(429)', { provider: this.name, status: 429, apiDetail });
      return 'AI服务调用频率限制，请稍后再试。建议等待1-2分钟后重试。';
    } else if (error.response?.status >= 500) {
      logger.error('【LLM基础层】AI服务服务器错误', { provider: this.name, status: error.response?.status, apiDetail });
      return `AI服务暂时不可用(服务器错误)${apiDetail}，请稍后重试。`;
    } else if (error.message?.includes('network')) {
      logger.error('【LLM基础层】网络连接异常', { provider: this.name, errorMessage: error.message });
      return '网络连接问题，请检查网络连接后重试。';
    } else {
      logger.error('【LLM基础层】AI服务处理失败', { provider: this.name, errorMessage: error.message || '未知错误', apiDetail });
      return `AI服务处理失败${apiDetail}: ${error.message || '未知错误'}`;
    }
  }

  private extractApiErrorDetail(error: any): string {
    try {
      const data = error.response?.data;
      if (!data) return '';
      if (typeof data === 'string') return `: ${data.substring(0, 300)}`;
      if (data.error?.message) return `: ${data.error.message}`;
      if (data.message) return `: ${data.message}`;
      return `: ${JSON.stringify(data).substring(0, 300)}`;
    } catch {
      return '';
    }
  }

  protected async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries?: number,
    retryDelay?: number
  ): Promise<T> {
    const retries = maxRetries ?? this.config.maxRetries ?? 3;
    const delay = retryDelay ?? this.config.retryDelay ?? 2000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        logger.warn(`${this.name}_provider`, 'request_attempt_failed', {
          attempt,
          maxRetries: retries,
          error: error.message,
        });

        if (attempt < retries) {
          const waitTime = delay * Math.pow(2, attempt - 1);
          logger.info(`${this.name}_provider`, 'retrying_request', {
            attempt,
            waitTime,
            remainingAttempts: retries - attempt,
          });
          logger.info('【LLM基础层】请求执行失败，正在准备重试', {
            provider: this.name,
            attempt,
            waitTime,
            remainingAttempts: retries - attempt,
            errorMessage: error.message,
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    logger.error(`${this.name}_provider`, 'request_max_retries_exceeded', {
      maxRetries: retries,
      lastError: lastError?.message,
    });
    logger.error('【LLM基础层】请求重试已达最大次数，最终失败', {
      provider: this.name,
      maxRetries: retries,
      lastError: lastError?.message,
    });
    throw lastError || new Error('Max retries exceeded');
  }
}
