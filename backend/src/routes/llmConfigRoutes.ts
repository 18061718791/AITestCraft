import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { LLMProviderFactory } from '../services/llm/providerFactory';
import { llmConfigService } from '../services/llmConfigService';
import { configService } from '../services/configService';
import validateRequest from '../middleware/validateRequest';
import logger from '../utils/logger';

const router = Router();

// 获取可用Provider列表
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = LLMProviderFactory.getAvailableProviders();
    res.json({
      success: true,
      data: providers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('llm_config', 'get_providers_failed', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to get providers',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// 获取Provider支持的模型列表
router.get('/models', async (req: Request, res: Response) => {
  try {
    const { provider } = req.query;

    if (!provider || typeof provider !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provider parameter is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const config = await llmConfigService.getLLMConfig(provider);
    const llmProvider = LLMProviderFactory.getProvider(config);

    res.json({
      success: true,
      data: llmProvider.supportedModels,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('llm_config', 'get_models_failed', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to get models',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// 获取当前LLM配置
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const provider = await llmConfigService.getDefaultProvider();
    const config = await llmConfigService.getLLMConfig(provider);

    // 隐藏API密钥
    const safeConfig = {
      ...config,
      apiKey: config.apiKey ? '****' + config.apiKey.slice(-4) : '',
    };

    res.json({
      success: true,
      data: safeConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('llm_config', 'get_config_failed', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to get config',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// 更新LLM配置
router.post('/config', [
  body('provider').optional().isString(),
  body('apiKey').optional().isString(),
  body('baseURL').optional().isString(),
  body('model').optional().isString(),
  body('temperature').optional().isNumeric(),
  body('timeout').optional().isNumeric(),
  body('maxRetries').optional().isNumeric(),
  body('retryDelay').optional().isNumeric(),
  body('batchSize').optional().isNumeric(),
], validateRequest, async (req: Request, res: Response) => {
  try {
    const {
      provider,
      apiKey,
      baseURL,
      model,
      temperature,
      timeout,
      maxRetries,
      retryDelay,
      batchSize,
    } = req.body;

    // 更新默认Provider
    if (provider) {
      await llmConfigService.setDefaultProvider(provider);
    }

    // 根据Provider类型更新对应配置
    const isVolcano = provider === 'volcano-coding';
    const prefix = isVolcano ? 'VOLCANO' : 'LLM';

    const updates = [];
    if (apiKey !== undefined) updates.push(configService.createOrUpdateConfig(`${prefix}_API_KEY`, apiKey, 'llm'));
    if (baseURL !== undefined) updates.push(configService.createOrUpdateConfig(`${prefix}_BASE_URL`, baseURL, 'llm'));
    if (model !== undefined) updates.push(configService.createOrUpdateConfig(`${prefix}_MODEL`, model, 'llm'));
    if (temperature !== undefined) updates.push(configService.createOrUpdateConfig('LLM_TEMPERATURE', String(temperature), 'llm'));
    if (timeout !== undefined) updates.push(configService.createOrUpdateConfig('LLM_TIMEOUT', String(timeout), 'llm'));
    if (maxRetries !== undefined) updates.push(configService.createOrUpdateConfig('LLM_MAX_RETRIES', String(maxRetries), 'llm'));
    if (retryDelay !== undefined) updates.push(configService.createOrUpdateConfig('LLM_RETRY_DELAY', String(retryDelay), 'llm'));
    if (batchSize !== undefined) updates.push(configService.createOrUpdateConfig('LLM_BATCH_SIZE', String(batchSize), 'llm'));

    await Promise.all(updates);

    // 清除Provider缓存，使新配置生效
    LLMProviderFactory.clearCache();

    logger.info('llm_config', 'config_updated', { provider });

    res.json({
      success: true,
      message: '配置已更新',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('llm_config', 'update_config_failed', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to update config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// 获取Provider能力信息
router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const { provider } = req.query;

    if (!provider || typeof provider !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provider parameter is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const config = await llmConfigService.getLLMConfig(provider);
    const llmProvider = LLMProviderFactory.getProvider(config);

    res.json({
      success: true,
      data: {
        name: llmProvider.name,
        supportedModels: llmProvider.supportedModels,
        capabilities: llmProvider.getCapability(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('llm_config', 'get_capabilities_failed', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Failed to get capabilities',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
