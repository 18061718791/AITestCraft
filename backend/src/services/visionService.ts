import axios from 'axios';
import { llmConfigService } from './llmConfigService';
import { Base64Image } from './llm/types';
import logger from '../utils/logger';
import notificationService from './notificationService';

const OPENCODE_GO_BASE_URL = 'https://opencode.ai/zen/go/v1';
const OPENCODE_GO_VISION_MODEL = 'kimi-k2.6';

const VISION_PARSE_PROMPT = `你是一位资深的UI/UX分析师和软件测试需求工程师。请仔细分析用户上传的截图/图片，提取所有可见的界面信息并输出结构化的需求描述。

请按以下维度进行全面分析：

1. **界面类型与功能**：这是什么类型的页面/界面？主要业务功能是什么？
2. **界面元素清单**：列出所有可见的输入框、按钮、链接、下拉菜单、复选框、单选框、表格、图表、图标、标签等
3. **表单字段详情**：每个输入字段的标签文本、占位符（placeholder）、输入类型（文本/密码/数字/日期等）
4. **按钮与操作**：所有按钮的文本、位置、颜色、可推断的操作功能
5. **导航与布局**：页面结构、导航方式、面包屑、侧边栏、顶部栏等
6. **交互逻辑推断**：根据界面布局推断的完整用户操作流程（如：输入→验证→提交→反馈）
7. **数据与状态**：界面中展示的数据内容、状态标识、统计信息等
8. **提示与校验**：可见的错误提示、帮助文本、必填标记、格式要求等
9. **异常场景**：根据界面元素推断可能的异常情况（如空输入、错误格式、权限不足等）

输出要求：
- 以自然语言段落形式输出，不要输出JSON
- 描述要尽可能详细、具体，确保测试工程师能基于你的描述生成全面的测试用例
- 如果图片中包含文字，请完整转录所有重要文字内容`;

interface VisionConfig {
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
  timeout: number;
}

interface VisionAttempt {
  provider: string;
  model: string;
  useSystemRole: boolean;
}

export class VisionService {
  /**
   * 解析图片内容，输出详细的需求描述文本
   * 自动重试 + 多格式兼容 + 多 provider 回退
   */
  async parseImages(images: Base64Image[], sessionId?: string): Promise<string> {
    logger.info('vision_service', 'start_parse_images', {
      imageCount: images.length,
    });
    logger.info(`【视觉解析】开始解析图片，共${images.length}张`);

    // 获取所有可用配置
    const configs: VisionConfig[] = [];

    logger.info('【视觉解析】尝试使用OpenCode Go提供商');
    const opencode = await this.tryGetOpenCodeGoConfig();
    if (opencode) configs.push(opencode);

    logger.info('【视觉解析】尝试使用火山引擎提供商');
    const volcano = await this.tryGetVolcanoConfig();
    if (volcano) configs.push(volcano);

    logger.info('【视觉解析】尝试使用DeepSeek提供商');
    const deepseek = await this.tryGetDeepSeekConfig();
    if (deepseek) configs.push(deepseek);

    if (configs.length === 0) {
      throw new Error(
        '未配置视觉模型API密钥。图片解析需要以下任一配置：\n' +
        '1. OpenCode Go（推荐 kimi-k2.6）— 环境变量 OPENCODE_GO_API_KEY\n' +
        '2. 火山引擎 — 数据库配置 VOLCANO_API_KEY\n' +
        '3. DeepSeek — 数据库配置 LLM_API_KEY'
      );
    }

    // 发送处理日志：找到可用配置
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: `找到 ${configs.length} 个可用视觉模型提供商`,
        details: configs.map(c => `${c.provider} (${c.model})`).join(', '),
        step: 'vision_config_loaded',
      });
    }

    // 尝试列表：每个配置先尝试带 system 角色，失败再尝试不带
    const attempts: VisionAttempt[] = [];
    for (const config of configs) {
      attempts.push({ provider: config.provider, model: config.model, useSystemRole: true });
      attempts.push({ provider: config.provider, model: config.model, useSystemRole: false });
    }

    let lastError: Error | null = null;
    let attemptIndex = 0;

    for (const attempt of attempts) {
      attemptIndex++;
      const config = configs.find(c => c.provider === attempt.provider && c.model === attempt.model)!;
      
      // 发送处理日志：尝试提供商
      if (sessionId) {
        notificationService.notifyProcessingLog(sessionId, {
          level: 'info',
          message: `尝试使用 ${config.provider} 解析图片`,
          details: `模型: ${config.model}, 尝试 ${attemptIndex}/${attempts.length}`,
          step: 'vision_attempt',
        });
      }
      
      try {
        const result = await this.tryParseWithConfig(images, config, attempt.useSystemRole);
        logger.info('vision_service', 'vision_parse_success', {
          provider: config.provider,
          model: config.model,
          useSystemRole: attempt.useSystemRole,
          resultLength: result.length,
          resultPreview: result.substring(0, 300),
        });
        logger.info('【视觉解析】视觉解析成功');
        
        // 发送处理日志：解析成功
        if (sessionId) {
          notificationService.notifyProcessingLog(sessionId, {
            level: 'success',
            message: `${config.provider} 视觉解析成功`,
            details: `成功提取图片内容，共 ${result.length} 字符`,
            step: 'vision_success',
          });
        }
        
        return result;
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('vision_service', 'vision_parse_attempt_failed', {
          provider: config.provider,
          model: config.model,
          useSystemRole: attempt.useSystemRole,
          error: lastError.message.substring(0, 200),
        });
        logger.info(`【视觉解析】视觉解析失败，原因：${lastError.message}`);
        
        // 发送处理日志：尝试失败
        if (sessionId) {
          notificationService.notifyProcessingLog(sessionId, {
            level: 'warning',
            message: `${config.provider} 解析失败，尝试下一个提供商`,
            details: lastError.message.substring(0, 100),
            step: 'vision_attempt_failed',
          });
        }
      }
    }

    throw new Error(
      `所有视觉模型尝试均失败。最后一个错误: ${lastError?.message || '未知错误'}\n` +
      `已尝试: ${attempts.map(a => `${a.provider}/${a.model}(system=${a.useSystemRole})`).join(', ')}`
    );
  }

  private async tryParseWithConfig(
    images: Base64Image[],
    config: VisionConfig,
    useSystemRole: boolean
  ): Promise<string> {
    const content = this.buildMultimodalContent(images);

    const requestData: any = {
      model: config.model,
      messages: [],
      max_tokens: 4000,
      temperature: 0.3,
    };

    if (useSystemRole) {
      requestData.messages.push({
        role: 'system',
        content: '你是一位资深的软件测试需求分析师，擅长从截图和UI设计稿中提取详细的界面需求和交互信息。',
      });
    }

    requestData.messages.push({
      role: 'user',
      content,
    });

    const requestBodyJson = JSON.stringify(requestData);
    logger.info('vision_service', 'sending_vision_request', {
      provider: config.provider,
      model: config.model,
      useSystemRole,
      imageCount: images.length,
      requestBodySize: requestBodyJson.length,
      requestBodyPreview: requestBodyJson.substring(0, 500),
    });
    logger.info(`【视觉解析】正在向${config.provider}发送视觉解析请求`);

    const startTime = Date.now();
    try {
      const response = await axios.post(
        `${config.baseURL}/chat/completions`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: config.timeout || 180000,
        }
      );

      const endTime = Date.now();
      const message = response.data.choices?.[0]?.message;
      // kimi-k2.6 等推理模型可能将内容放在 reasoning 字段而非 content 字段
      const result = (message?.content || message?.reasoning || '').trim();

      logger.info('vision_service', 'vision_api_response', {
        provider: config.provider,
        model: config.model,
        responseTime: endTime - startTime,
        status: response.status,
        hasContent: !!message?.content,
        hasReasoning: !!message?.reasoning,
        resultLength: result.length,
        resultPreview: result.substring(0, 300) || 'EMPTY',
      });

      if (!result) {
        throw new Error('视觉模型返回空内容（content 和 reasoning 均为空）');
      }

      return result;
    } catch (error: any) {
      const endTime = Date.now();
      const apiData = error.response?.data;
      const status = error.response?.status;

      logger.error('vision_service', 'vision_api_error', {
        provider: config.provider,
        model: config.model,
        useSystemRole,
        responseTime: endTime - startTime,
        status,
        statusText: error.response?.statusText,
        errorData: typeof apiData === 'string'
          ? apiData.substring(0, 1000)
          : JSON.stringify(apiData).substring(0, 1000),
        errorMessage: error.message,
        requestUrl: `${config.baseURL}/chat/completions`,
      });

      if (status === 400) {
        logger.info('【视觉解析】请求格式错误，当前模型可能不支持图片');
        throw new Error(
          `视觉模型请求格式错误(400)。模型「${config.model}」可能不支持当前消息格式(system=${useSystemRole})。`
        );
      }
      if (status === 401) {
        throw new Error(`视觉模型认证失败(401)。请检查 ${config.provider} 的 API Key 是否有效。`);
      }
      if (status === 429) {
        throw new Error(`视觉模型频率限制(429)。请稍后再试。`);
      }

      throw new Error(
        `视觉模型API错误(${status || '未知'}): ${error.message}`
      );
    }
  }

  private buildMultimodalContent(images: Base64Image[]): any[] {
    const content: any[] = [
      { type: 'text', text: VISION_PARSE_PROMPT },
    ];

    for (const img of images) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
        },
      });
    }

    return content;
  }

  private async tryGetOpenCodeGoConfig(): Promise<VisionConfig | null> {
    const apiKey = process.env['OPENCODE_GO_API_KEY'];
    if (apiKey) {
      logger.info('vision_service', 'opencode_go_config_found', {
        apiKeyPrefix: apiKey.substring(0, 8) + '...',
        baseURL: OPENCODE_GO_BASE_URL,
      });
      return {
        provider: 'opencode-go',
        apiKey,
        baseURL: OPENCODE_GO_BASE_URL,
        model: OPENCODE_GO_VISION_MODEL,
        timeout: 180000,
      };
    }
    logger.warn('vision_service', 'opencode_go_api_key_not_found', {
      envVar: 'OPENCODE_GO_API_KEY',
      hint: 'Set OPENCODE_GO_API_KEY env var or check OpenCode Zen dashboard',
    });
    logger.info('【视觉解析】OpenCode Go配置未找到');
    return null;
  }

  private async tryGetVolcanoConfig(): Promise<VisionConfig | null> {
    try {
      const config = await llmConfigService.getLLMConfig('volcano-coding');
      if (config.apiKey && config.baseURL) {
        // 火山引擎视觉解析必须使用支持视觉的模型（kimi-k2.5），不能用默认的代码模型
        const visionModel = config.model?.includes('kimi') ? config.model : 'kimi-k2.5';
        // 修复：代码补全API endpoint (/api/coding/v3) 不能用于对话，必须改为对话API endpoint (/api/v3)
        const baseURL = config.baseURL.includes('/coding/')
          ? config.baseURL.replace('/coding/', '/')
          : config.baseURL;
        logger.info('vision_service', 'volcano_config_found', {
          originalBaseURL: config.baseURL,
          correctedBaseURL: baseURL,
          originalModel: config.model,
          visionModel,
        });
        return {
          provider: 'volcano-coding',
          apiKey: config.apiKey,
          baseURL,
          model: visionModel,
          timeout: config.timeout || 180000,
        };
      }
    } catch (error) {
      logger.warn('vision_service', 'volcano_config_not_found', { error: (error as Error).message });
    }
    return null;
  }

  private async tryGetDeepSeekConfig(): Promise<VisionConfig | null> {
    try {
      const config = await llmConfigService.getLLMConfig('deepseek');
      if (config.apiKey && config.baseURL) {
        // DeepSeek 视觉解析必须使用支持视觉的模型
        const visionModels = ['deepseek-v4-pro', 'deepseek-v3-pro', 'deepseek-vl'];
        const visionModel = visionModels.includes(config.model) ? config.model : null;
        if (!visionModel) {
          logger.warn('vision_service', 'deepseek_model_not_vision_capable', {
            model: config.model,
            supportedVisionModels: visionModels,
            hint: 'DeepSeek视觉解析需要配置支持视觉的模型，如 deepseek-v4-pro',
          });
          return null;
        }
        logger.info('vision_service', 'deepseek_config_found', {
          baseURL: config.baseURL,
          model: visionModel,
        });
        return {
          provider: 'deepseek',
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          model: visionModel,
          timeout: config.timeout || 180000,
        };
      }
    } catch (error) {
      logger.warn('vision_service', 'deepseek_config_not_found', { error: (error as Error).message });
    }
    logger.info('【视觉解析】DeepSeek配置未找到');
    return null;
  }
}

export const visionService = new VisionService();
