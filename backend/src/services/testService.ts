import { v4 as uuidv4 } from 'uuid';
import { LLMProviderFactory } from './llm/providerFactory';
import { llmConfigService } from './llmConfigService';
import { taskPersistenceService } from './taskPersistenceService';
import excelService from './excelService';
import notificationService from './notificationService';
import logger from '../utils/logger';
import { TestCase, TestPoint, TestPointCategory, TestPointSubCategory, TaskStatus } from '../types';
import { Base64Image } from './llm/types';
import ImageService from './imageService';
import { visionService } from './visionService';

class TestService {
  async generateTestPoints(
    requirement: string,
    sessionId: string,
    system?: string,
    module?: string,
    scenario?: string,
    provider?: string,
    model?: string,
    images?: Base64Image[]
  ): Promise<string> {
    const taskId = uuidv4();

    const task: TaskStatus = {
      taskId,
      status: 'pending',
      type: 'points',
      sessionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await taskPersistenceService.saveTask(task);

    logger.info('test_service', 'generate_test_points_started', {
      taskId,
      sessionId,
      system,
      module,
      scenario,
      provider,
      model,
      imageCount: images?.length || 0,
      requirement: requirement.substring(0, 100) + (requirement.length > 100 ? '...' : ''),
    });

    // 如果有图片，先发送一个初始日志通知前端准备接收图片解析日志
    if (images && images.length > 0) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: `准备解析 ${images.length} 张图片`,
        details: '正在启动图片解析任务...',
        step: 'image_task_init',
        progress: 10,
      });
    }

    // 使用 setImmediate 确保在当前事件循环结束后才开始处理
    // 这样 HTTP 响应可以先返回，然后处理任务开始
    setImmediate(() => {
      this.processTestPoints(taskId, requirement, sessionId, system, module, scenario, provider, model, images);
    });

    return taskId;
  }

  async generateTestCases(
    testPoints: string[],
    sessionId: string,
    system?: string,
    module?: string,
    scenario?: string,
    provider?: string,
    model?: string
  ): Promise<string> {
    const taskId = uuidv4();

    const task: TaskStatus = {
      taskId,
      status: 'pending',
      type: 'cases',
      sessionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await taskPersistenceService.saveTask(task);

    logger.info('test_service', 'generate_test_cases_started', {
      taskId,
      sessionId,
      testPointsCount: testPoints.length,
      testPoints: testPoints.slice(0, 5),
      system,
      module,
      scenario,
      provider,
      model,
    });

    this.processTestCases(taskId, testPoints, sessionId, system, module, scenario, provider, model);

    return taskId;
  }

  private async processTestPoints(
    taskId: string,
    requirement: string,
    sessionId: string,
    system?: string,
    module?: string,
    scenario?: string,
    providerName?: string,
    model?: string,
    images?: Base64Image[]
  ): Promise<void> {
    try {
      logger.info('【测试点生成】开始处理任务', { taskId, sessionId, system, module, scenario, provider: providerName, model, imageCount: images?.length || 0 });
      await taskPersistenceService.updateTaskStatus(taskId, 'processing');
      notificationService.notifyProgress(sessionId, 10, '开始生成测试点...');

      logger.info('【测试点生成】正在加载LLM配置', {
        taskId,
        sessionId,
        system,
        module,
        scenario,
        provider: providerName,
        model,
        imageCount: images?.length || 0,
        step: 'calling_llm_provider',
      });

      const config = await llmConfigService.getLLMConfig(providerName);
      if (model) {
        config.model = model;
      }

      if (!config.apiKey) {
        logger.error('【测试点生成】LLM API Key 未配置，无法继续', { taskId, provider: providerName });
        throw new Error('LLM API Key 未配置，请在系统管理 > LLM配置页面配置API密钥');
      }
      if (!config.baseURL) {
        logger.error('【测试点生成】LLM Base URL 未配置，无法继续', { taskId, provider: providerName });
        throw new Error('LLM Base URL 未配置');
      }
      if (!config.model) {
        logger.error('【测试点生成】LLM Model 未配置，无法继续', { taskId, provider: providerName });
        throw new Error('LLM Model 未配置');
      }
      logger.info('【测试点生成】LLM配置校验通过', { taskId, provider: providerName, model: config.model, baseURL: config.baseURL });

      let finalRequirement = requirement;

      // 阶段1: 视觉解析（两阶段管道）
      if (images && images.length > 0) {
        logger.info('【测试点生成】检测到用户上传了图片，进入视觉解析阶段', { taskId, imageCount: images.length });
        
        // 发送详细处理日志：检测到图片上传
        notificationService.notifyProcessingLog(sessionId, {
          level: 'info',
          message: `检测到 ${images.length} 张图片上传`,
          details: `准备进行图片内容解析`,
          step: 'image_detection',
          progress: 12,
        });

        notificationService.notifyProgress(sessionId, 12, '正在校验图片格式...');
        
        try {
          ImageService.validateImages(images);
          
          // 发送详细处理日志：图片校验通过
          notificationService.notifyProcessingLog(sessionId, {
            level: 'success',
            message: '图片格式校验通过',
            details: `共 ${images.length} 张图片，格式和大小检查完成`,
            step: 'image_validation',
            progress: 14,
          });
        } catch (validationError) {
          const errorMsg = validationError instanceof Error ? validationError.message : String(validationError);
          notificationService.notifyProcessingLog(sessionId, {
            level: 'error',
            message: '图片校验失败',
            details: errorMsg,
            step: 'image_validation',
          });
          throw validationError;
        }

        notificationService.notifyProgress(sessionId, 15, '正在使用视觉模型解析图片内容...');
        logger.info('【测试点生成】正在调用视觉模型解析图片内容', { taskId, imageCount: images.length });

        // 发送详细处理日志：开始调用视觉模型
        notificationService.notifyProcessingLog(sessionId, {
          level: 'info',
          message: '开始调用视觉模型解析图片',
          details: '正在初始化视觉解析服务，尝试多个提供商...',
          step: 'vision_init',
          progress: 16,
        });

        try {
          logger.info('【测试点生成】视觉模型开始解析图片', { taskId, imageCount: images.length });
          
          // 发送详细处理日志：正在解析
          notificationService.notifyProcessingLog(sessionId, {
            level: 'info',
            message: '视觉模型正在分析图片内容',
            details: '提取界面元素、表单字段、交互逻辑等信息...',
            step: 'vision_parsing',
            progress: 18,
          });
          
          const visionDesc = await visionService.parseImages(images, sessionId);
          logger.info('【测试点生成】视觉模型解析完成', { taskId, visionDescLength: visionDesc.length });

          // 发送详细处理日志：解析完成
          notificationService.notifyProcessingLog(sessionId, {
            level: 'success',
            message: '图片内容解析完成',
            details: `成功提取图片信息，共 ${visionDesc.length} 字符`,
            step: 'vision_complete',
            progress: 20,
          });

          // 校验视觉解析结果是否有效（非空且长度合理）
          if (!visionDesc || visionDesc.length < 20) {
            throw new Error(`视觉模型返回的内容无效（长度: ${visionDesc?.length || 0}），可能未正确识别图片。`);
          }

          if (requirement.trim()) {
            finalRequirement = `【用户输入的需求描述】\n${requirement}\n\n【图片内容解析】\n${visionDesc}`;
          } else {
            finalRequirement = `【图片内容解析】\n${visionDesc}`;
          }

          logger.info('test_service', 'vision_parse_completed', {
            taskId,
            originalRequirementLength: requirement.length,
            visionDescLength: visionDesc.length,
            combinedRequirementLength: finalRequirement.length,
            visionDescPreview: visionDesc.substring(0, 200),
          });

          notificationService.notifyProgress(sessionId, 22, '图片解析完成，正在生成测试点...');
        } catch (visionError) {
          const visionErrorMsg = visionError instanceof Error ? visionError.message : String(visionError);
          logger.error('【测试点生成】视觉模型解析图片失败', { taskId, error: visionErrorMsg });

          // 发送详细处理日志：解析失败
          notificationService.notifyProcessingLog(sessionId, {
            level: 'error',
            message: '图片解析失败',
            details: visionErrorMsg,
            step: 'vision_failed',
          });

          // 视觉解析失败时回退：如果用户有文本需求，继续用文本生成；否则报错
          if (!requirement.trim()) {
            logger.error('【测试点生成】图片解析失败且无文本需求，无法继续生成', { taskId, error: visionErrorMsg });
            throw new Error(
              `图片解析失败: ${visionErrorMsg}。由于未输入文本需求，无法继续生成。请检查视觉模型配置或输入需求描述后重试。`
            );
          }

          // 发送详细处理日志：回退到文本
          notificationService.notifyProcessingLog(sessionId, {
            level: 'warning',
            message: '图片解析失败，回退到文本需求',
            details: '将仅使用用户输入的文本描述生成测试点',
            step: 'vision_fallback',
            progress: 20,
          });

          logger.warn('【测试点生成】图片解析失败，回退到仅使用文本需求继续生成', { taskId, error: visionErrorMsg });
          notificationService.notifyProgress(sessionId, 20, '图片解析失败，使用文本需求继续生成...');
        }
      } else {
        logger.info('【测试点生成】未检测到图片，直接使用文本需求生成测试点', { taskId, requirementLength: requirement.length });
      }

      logger.info('【测试点生成】正在初始化LLM提供商', { taskId, provider: providerName, model: config.model });
      const provider = LLMProviderFactory.getProvider(config);

      if (!provider.validateConfig()) {
        logger.error('【测试点生成】LLM提供商配置验证失败', { taskId, provider: providerName, model: config.model, apiKeyExists: !!config.apiKey, baseURL: config.baseURL, supportedModels: provider.supportedModels });
        throw new Error(`Provider配置验证失败: apiKey=${!!config.apiKey}, baseURL=${config.baseURL}, model=${config.model}, supportedModels=${provider.supportedModels.join(',')}`);
      }
      logger.info('【测试点生成】LLM提供商配置验证通过', { taskId, provider: provider.name, model: config.model });

      logger.info('test_service', 'llm_provider_loaded', {
        taskId,
        provider: provider.name,
        model: config.model,
        supportedModels: provider.supportedModels,
        apiKeyConfigured: !!config.apiKey,
        supportsVision: provider.supportsVision(config.model),
        imageCount: images?.length || 0,
      });

      logger.info('【测试点生成】开始调用LLM生成测试点', { taskId, provider: provider.name, model: config.model, requirementLength: finalRequirement.length });
      const testPoints = await provider.generateTestPoints({
        requirement: finalRequirement,
        system,
        module,
        scenario,
      });
      logger.info('【测试点生成】LLM返回测试点结果', { taskId, pointsCount: testPoints.length });

      if (images && images.length > 0 && provider.visionFallbackOccurred) {
        logger.warn('【测试点生成】检测到视觉模型降级，已通知前端', { taskId, model: config.model });
        notificationService.notifyVisionFallback(sessionId, { taskId });
        logger.warn('test_service', 'vision_fallback_detected', {
          taskId,
          sessionId,
          model: config.model,
          imageCount: images.length,
        });
      }

      logger.info('【测试点生成】正在对测试点进行分组归类', { taskId, pointsCount: testPoints.length });
      const categories = this.groupTestPoints(testPoints);
      logger.info('【测试点生成】测试点分组完成', { taskId, categoryCount: categories.length });

      logger.info('【测试点生成】正在保存任务完成状态', { taskId, pointsCount: testPoints.length });
      await taskPersistenceService.updateTaskStatus(taskId, 'completed', { testPoints, categories });
      logger.info('【测试点生成】任务完成状态已保存', { taskId });

      notificationService.notifyPointsGenerated(sessionId, {
        taskId,
        points: testPoints,
        categories,
      });

      logger.info(`【测试点生成】成功完成任务，共生成 ${testPoints.length} 个测试点`, { taskId, sessionId, pointsCount: testPoints.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('【测试点生成】处理过程中发生错误，任务失败', { taskId, sessionId, error: errorMessage, provider: providerName, requirement: requirement.substring(0, 100) + (requirement.length > 100 ? '...' : '') });
      await taskPersistenceService.updateTaskStatus(taskId, 'failed', undefined, errorMessage);

      notificationService.notifyError(sessionId, {
        message: '生成测试点失败',
        details: errorMessage,
      });

      logger.error('test_service', 'test_points_generation_failed', error, {
        taskId,
        sessionId,
        error: errorMessage,
        provider: providerName,
        requirement: requirement.substring(0, 100) + (requirement.length > 100 ? '...' : ''),
      });
    }
  }

  private async processTestCases(
    taskId: string,
    testPoints: string[],
    sessionId: string,
    system?: string,
    module?: string,
    scenario?: string,
    providerName?: string,
    model?: string
  ): Promise<void> {
    try {
      logger.info('【测试用例生成】开始处理任务', { taskId, sessionId, testPointsCount: testPoints.length, system, module, scenario, provider: providerName, model });
      await taskPersistenceService.updateTaskStatus(taskId, 'processing');
      notificationService.notifyProgress(sessionId, 5, '开始生成测试用例...');

      logger.info('【测试用例生成】正在加载LLM配置', {
        taskId,
        sessionId,
        testPointsCount: testPoints.length,
        system,
        module,
        scenario,
        provider: providerName,
        model,
        step: 'calling_llm_provider',
      });

      const config = await llmConfigService.getLLMConfig(providerName);
      if (model) {
        config.model = model;
      }

      logger.info('【测试用例生成】正在初始化LLM提供商', { taskId, provider: providerName, model: config.model });
      const provider = LLMProviderFactory.getProvider(config);

      if (!provider.validateConfig()) {
        logger.error('【测试用例生成】LLM提供商配置验证失败', { taskId, provider: providerName, model: config.model });
        throw new Error(`Provider配置验证失败: apiKey=${!!config.apiKey}, baseURL=${config.baseURL}, model=${config.model}`);
      }
      logger.info('【测试用例生成】LLM提供商配置验证通过', { taskId, provider: provider.name, model: config.model, supportedModels: provider.supportedModels });

      const allTestCases: any[] = [];
      const batchSize = provider.getCapability().maxBatchSize;
      const totalBatches = Math.ceil(testPoints.length / batchSize);
      logger.info('【测试用例生成】开始分批生成测试用例', { taskId, totalBatches, batchSize, testPointsCount: testPoints.length });

      const testCases = await provider.generateTestCases({
        testPoints,
        system,
        module,
        scenario,
        onProgress: async (completedBatch, totalBatches, batchCases) => {
          const progress = Math.round(5 + (completedBatch / totalBatches) * 90);
          const message = `正在生成测试用例... (${completedBatch}/${totalBatches} 批次)`;

          allTestCases.push(...batchCases);

          await taskPersistenceService.updateTaskStatus(taskId, 'processing', {
            testCases: allTestCases,
            progress,
            completedBatches: completedBatch,
            totalBatches,
          });

          notificationService.notifyProgress(sessionId, progress, message);
          notificationService.notifyCasesProgress(sessionId, {
            taskId,
            progress,
            completedBatches: completedBatch,
            totalBatches,
            casesCount: allTestCases.length,
            cases: batchCases,
            isComplete: false,
          });

          logger.info('test_service', 'batch_progress_notified', {
            taskId,
            sessionId,
            completedBatch,
            totalBatches,
            progress,
            casesCount: allTestCases.length,
          });
        },
      });

      logger.info('【测试用例生成】所有批次处理完成', { taskId, sessionId, totalCasesCount: testCases.length });

      logger.info('【测试用例生成】正在保存任务完成状态', { taskId, casesCount: testCases.length });
      await taskPersistenceService.updateTaskStatus(taskId, 'completed', { testCases });
      logger.info('【测试用例生成】任务完成状态已保存', { taskId });

      notificationService.notifyCasesGenerated(sessionId, {
        taskId,
        cases: testCases,
      });

      notificationService.notifyProgress(sessionId, 100, '测试用例生成完成！');
      notificationService.notifyCasesProgress(sessionId, {
        taskId,
        progress: 100,
        completedBatches: totalBatches,
        totalBatches,
        casesCount: testCases.length,
        cases: testCases,
        isComplete: true,
      });

      logger.info(`【测试用例生成】成功完成任务，共生成 ${testCases.length} 个测试用例`, { taskId, sessionId, casesCount: testCases.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('【测试用例生成】处理过程中发生错误，任务失败', { taskId, sessionId, error: errorMessage, provider: providerName, testPointsCount: testPoints.length });
      await taskPersistenceService.updateTaskStatus(taskId, 'failed', undefined, errorMessage);

      notificationService.notifyError(sessionId, {
        message: '生成测试用例失败',
        details: errorMessage,
      });

      logger.error('test_service', 'test_cases_generation_failed', error, {
        taskId,
        sessionId,
        error: errorMessage,
        provider: providerName,
        testPointsCount: testPoints.length,
      });
    }
  }

  async generateExcelFile(testCases: TestCase[]): Promise<Buffer> {
    return excelService.generateTestCasesExcel(testCases);
  }

  async generateTestPointsExcel(testPoints: string[]): Promise<Buffer> {
    return excelService.generateTestPointsExcel(testPoints);
  }

  groupTestPoints(testPoints: TestPoint[]): TestPointCategory[] {
    const categoryMap = new Map<string, Map<string, TestPoint[]>>();

    for (const point of testPoints) {
      const categoryName = point.pointCategory || '其他功能';
      const designMethod = point.designMethod || '其他方法';

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, new Map());
      }

      const methodMap = categoryMap.get(categoryName)!;
      if (!methodMap.has(designMethod)) {
        methodMap.set(designMethod, []);
      }

      methodMap.get(designMethod)!.push(point);
    }

    const categories: TestPointCategory[] = [];
    let catIndex = 0;

    for (const [catName, methodMap] of categoryMap) {
      const children: TestPointSubCategory[] = [];
      let subIndex = 0;

      for (const [methodName, points] of methodMap) {
        children.push({
          key: `subcat-${catIndex}-${subIndex}`,
          name: methodName,
          testPoints: points,
        });
        subIndex++;
      }

      categories.push({
        key: `cat-${catIndex}`,
        name: catName,
        children,
      });
      catIndex++;
    }

    return categories;
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus | undefined> {
    const task = await taskPersistenceService.getTask(taskId);
    return task || undefined;
  }

  async getTasksBySession(sessionId: string): Promise<TaskStatus[]> {
    return taskPersistenceService.getTasksBySession(sessionId);
  }

  async cleanupOldTasks(): Promise<void> {
    const cleanedCount = await taskPersistenceService.cleanupOldTasks();
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old tasks`);
    }
  }
}

const testService = new TestService();
setInterval(() => {
  testService.cleanupOldTasks();
}, 30 * 60 * 1000);

export default testService;
