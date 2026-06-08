import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useProcessingLogs } from './useProcessingLogs';
import { testApi, Base64Image } from '../services/api';
import socketService from '../services/socket';
import socketLogger from '../services/socketLogger';
import { frontendLogger, LogCategory } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { TestPoint, TestPointCategory } from '../types';
import { readTemplateWithCache, replaceParameters, validateTemplateParams } from '../utils/promptTemplate';

function buildTestPoints(points: any[]): TestPoint[] {
  return points.map((point: any, index: number) => ({
    id: point.id || `point-${index}`,
    content: point.content || point.title || point.description || point.name || '未命名测试点',
    selected: false,
    designMethod: point.designMethod || point.design_method || '等价类划分',
    pointCategory: point.pointCategory || point.point_category || point.moduleCategory || '其他功能',
  }));
}

function buildCategoriesFromData(data: any, _flatPoints: TestPoint[]): TestPointCategory[] {
  if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
    return data.categories.map((cat: any) => ({
      key: cat.key || `cat-${cat.name}`,
      name: cat.name || '未命名分类',
      children: (cat.children || []).map((sub: any) => ({
        key: sub.key || `subcat-${sub.name}`,
        name: sub.name || '未命名',
        testPoints: buildTestPoints(sub.testPoints || []),
      })),
    }));
  }
  return [];
}

function buildLocalCategories(flatPoints: TestPoint[]): TestPointCategory[] {
  const categoryMap = new Map<string, Map<string, TestPoint[]>>();
  for (const point of flatPoints) {
    const cat = point.pointCategory || '其他功能';
    const method = point.designMethod || '其他方法';
    if (!categoryMap.has(cat)) categoryMap.set(cat, new Map());
    const methodMap = categoryMap.get(cat)!;
    if (!methodMap.has(method)) methodMap.set(method, []);
    methodMap.get(method)!.push(point);
  }
  const categories: TestPointCategory[] = [];
  let catIdx = 0;
  for (const [catName, methodMap] of categoryMap) {
    const children = [];
    let subIdx = 0;
    for (const [methodName, points] of methodMap) {
      children.push({
        key: `subcat-${catIdx}-${subIdx}`,
        name: methodName,
        testPoints: points,
      });
      subIdx++;
    }
    categories.push({
      key: `cat-${catIdx}`,
      name: catName,
      children,
    });
    catIdx++;
  }
  return categories;
}

export function useGeneratePoints() {
  const { state, dispatch } = useAppContext();
  const processing = useProcessingLogs();
  const [isGenerating, setIsGenerating] = useState(false);
  const taskIdRef = useRef<string | undefined>(state.taskId);

  useEffect(() => {
    taskIdRef.current = state.taskId;
  }, [state.taskId]);

  const handlePointsReceived = useCallback((data: any) => {
    const points = data.points || data.testPoints || data.result || [];
    const testPoints = buildTestPoints(points);
    processing.completeProcessing('测试点生成完成', testPoints.length);
    dispatch({ type: 'SET_TEST_POINTS', payload: testPoints });
    dispatch({ type: 'SET_LOADING', payload: false });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });

    let categories = buildCategoriesFromData(data, testPoints);
    if (categories.length === 0) {
      categories = buildLocalCategories(testPoints);
    }
    dispatch({ type: 'SET_TEST_POINT_CATEGORIES', payload: categories });
  }, [dispatch, processing]);

  const generatePoints = useCallback(async (requirement: string, images?: Base64Image[]) => {
    // 如果有已上传的文档，保留之前的处理日志（文档解析日志）
    const hasDocument = state.currentDocument !== null;
    processing.startProcessing('生成测试点', hasDocument);

    if (!requirement.trim() && (!images || images.length === 0)) {
      processing.failProcessing('请输入需求描述或上传图片');
      dispatch({ type: 'SET_ERROR', payload: '请输入需求描述或上传图片' });
      frontendLogger.warn(LogCategory.USER_ACTION, 'Empty requirement and images provided');
      return;
    }

    const selectedSystem = state.selectedSystem;
    const selectedModule = state.selectedModule;
    const selectedScenario = state.selectedScenario;

    if (!selectedSystem || !selectedModule) {
      processing.failProcessing('请先选择系统和功能模块');
      dispatch({ type: 'SET_ERROR', payload: '请先选择系统和功能模块' });
      return;
    }

    // 保持原始 requirement，不生成占位文本。
    // 后端视觉解析服务会基于图片内容生成需求描述。
    const effectiveRequirement = requirement.trim();

    const validation = validateTemplateParams({
      system: selectedSystem.name,
      module: selectedModule.name,
      scenario: selectedScenario?.name || '通用功能',
      requirement: effectiveRequirement || (images && images.length > 0 ? '[图片输入]' : '')
    });

    if (!validation.isValid) {
      processing.failProcessing(validation.errorMessage || '参数验证失败');
      dispatch({ type: 'SET_ERROR', payload: validation.errorMessage || '参数验证失败' });
      return;
    }

    processing.updateProgress('analyzing', 10, '正在分析需求内容...');

    frontendLogger.debug(LogCategory.USER_ACTION, 'generate_points_start', {
      requirement: requirement.substring(0, 100) + '...',
      system: selectedSystem.name,
      module: selectedModule.name,
      scenario: selectedScenario?.name || '通用功能',
      imageCount: images?.length || 0,
    });

    try {
      setIsGenerating(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      processing.updateProgress('analyzing', 20, '正在加载提示词模板...');

      const templatePath = '/prompts/generate_test_points.md';
      const template = await readTemplateWithCache(templatePath);

      const processedPrompt = replaceParameters(template, {
        system: selectedSystem.name,
        module: selectedModule.name,
        scenario: selectedScenario?.name || '通用功能',
        requirement: effectiveRequirement
      });

      frontendLogger.debug(LogCategory.BUSINESS, 'template_processed', {
        system: selectedSystem.name,
        module: selectedModule.name,
        scenario: selectedScenario?.name || '通用功能',
        requirement: requirement.substring(0, 100) + '...',
        promptLength: processedPrompt.length,
        imageCount: images?.length || 0,
      });

      let sessionId = state.sessionId;
      if (!sessionId) {
        sessionId = uuidv4();
        dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
        frontendLogger.setSessionId(sessionId);
      }

      socketLogger.initialize(sessionId);
      processing.updateProgress('connecting', 30, '正在建立实时连接...');

      try {
        await socketService.ensureConnected(sessionId);
        processing.addLog('success', '实时连接已建立');
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
        processing.addLog('warning', '实时连接建立失败，将使用轮询模式');
        dispatch({ type: 'SET_ERROR', payload: '无法连接到服务器，请检查网络连接' });
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsGenerating(false);
        return;
      }

      // 在发送请求前注册处理日志监听器，确保能收到图片解析等早期日志
      socketService.onProcessingLog((data) => {
        frontendLogger.debug(LogCategory.BUSINESS, 'processing_log_received', {
          level: data.level,
          message: data.message,
          step: data.step,
        });
        // 将后端发送的处理日志添加到前端显示
        processing.addLog(data.level, data.message, data.details);
      });

      // 如果有图片，添加一个标记日志
      if (images && images.length > 0) {
        processing.addLog('info', `已上传 ${images.length} 张图片，正在提交解析任务...`);
      }

      // 等待 socket 连接稳定，并确保后端准备好接收请求
      await new Promise(resolve => setTimeout(resolve, 500));

      const timeoutId = setTimeout(() => {
        if (isGenerating) {
          frontendLogger.warn(LogCategory.BUSINESS, 'points_generation_timeout', {
            taskId: state.taskId,
            timeout: 30000
          });
          dispatch({ type: 'SET_ERROR', payload: '生成测试点超时，请重试' });
          dispatch({ type: 'SET_LOADING', payload: false });
          setIsGenerating(false);
        }
      }, 30000);

      let pollIntervalId: NodeJS.Timeout | null = null;
      const startHttpPolling = (taskId: string) => {
        if (pollIntervalId) {
          clearInterval(pollIntervalId);
        }
        processing.updateProgress('generating', 50, '已提交任务，等待AI生成测试点...');

        pollIntervalId = setInterval(async () => {
          try {
            const taskStatus = await testApi.getTaskStatus(taskId);
            if (taskStatus.success && taskStatus.data) {
              const task = taskStatus.data;

              if (task.status === 'completed' && task.data?.testPoints) {
                frontendLogger.info(LogCategory.BUSINESS, 'points_received_via_http_poll', {
                  taskId,
                  pointsCount: task.data.testPoints.length
                });
                processing.completeProcessing('测试点生成完成', task.data.testPoints.length);

                const points = task.data.testPoints;
                const testPoints = buildTestPoints(points);

                dispatch({ type: 'SET_TEST_POINTS', payload: testPoints });
                dispatch({ type: 'SET_LOADING', payload: false });
                dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });

                let categories = buildCategoriesFromData(task.data, testPoints);
                if (categories.length === 0) {
                  categories = buildLocalCategories(testPoints);
                }
                dispatch({ type: 'SET_TEST_POINT_CATEGORIES', payload: categories });

                setIsGenerating(false);
                clearTimeout(timeoutId);

                if (pollIntervalId) {
                  clearInterval(pollIntervalId);
                  pollIntervalId = null;
                }
              } else if (task.status === 'failed') {
                processing.failProcessing(task.error || '生成测试点失败');
                dispatch({ type: 'SET_ERROR', payload: task.error || '生成测试点失败' });
                dispatch({ type: 'SET_LOADING', payload: false });
                setIsGenerating(false);
                clearTimeout(timeoutId);

                if (pollIntervalId) {
                  clearInterval(pollIntervalId);
                  pollIntervalId = null;
                }
              }
            }
          } catch (error) {
            console.warn('[HTTP Poll] Failed to get task status:', error);
          }
        }, 2000);
      };

      socketService.onAny((eventName, ...args) => {
        frontendLogger.info(LogCategory.BUSINESS, 'socket_event_received', {
          eventName: eventName,
          args: args,
          currentTaskId: taskIdRef.current,
          timestamp: new Date().toISOString()
        });

        // onAny 仅做调试日志，不处理 points-generated 业务逻辑
        // points-generated 的正式处理在 socketService.onPointsGenerated 中
      });

      socketService.onPointsGenerated((data) => {
        clearTimeout(timeoutId);
        processing.completeProcessing('测试点生成完成', data.points?.length);

        if (pollIntervalId) {
          clearInterval(pollIntervalId);
          pollIntervalId = null;
        }

        const { taskId, points } = data;
        const currentTaskId = taskIdRef.current;

        frontendLogger.debug(LogCategory.BUSINESS, 'points_generated_received', {
          taskId: taskId,
          stateTaskId: currentTaskId,
          match: taskId === currentTaskId,
          pointsCount: points?.length || 0
        });

        const testPoints = buildTestPoints(points);

        dispatch({ type: 'SET_TEST_POINTS', payload: testPoints });
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
        setIsGenerating(false);
      });

      socketService.onVisionFallback((data) => {
        const currentTaskId = taskIdRef.current;
        frontendLogger.info(LogCategory.BUSINESS, 'vision_fallback_received', {
          taskId: data.taskId,
          stateTaskId: currentTaskId,
        });
        dispatch({ type: 'SET_VISION_FALLBACK', payload: true });
      });

      socketService.onError((data) => {
        const currentTaskId = taskIdRef.current;
        frontendLogger.error(LogCategory.ERROR, 'points_generation_error', new Error(data.message || '未知错误'), {
          taskId: currentTaskId
        });
        processing.failProcessing(data.message || '生成测试点失败');
        dispatch({ type: 'SET_ERROR', payload: data.message || '生成测试点失败' });
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsGenerating(false);
      });

      const response = await testApi.generateTestPoints({
        requirement: effectiveRequirement,
        sessionId,
        system: selectedSystem.name,
        module: selectedModule.name,
        scenario: selectedScenario?.name || '通用功能',
        provider: state.selectedProvider,
        model: state.selectedModel,
        images: images && images.length > 0 ? images : undefined,
      });

      if (response.success) {
        const newTaskId = response.data.taskId;
        frontendLogger.debug(LogCategory.BUSINESS, 'generate_points_request_sent', {
          taskId: newTaskId,
          sessionId,
          promptLength: processedPrompt.length,
          imageCount: images?.length || 0,
        });
        processing.addLog('info', '任务已提交', `TaskId: ${newTaskId}`);
        processing.updateProgress('generating', 40, 'AI 正在分析需求并生成测试点...');

        dispatch({ type: 'SET_TASK_ID', payload: newTaskId });
        taskIdRef.current = newTaskId;
        dispatch({ type: 'SET_REQUIREMENT', payload: requirement });

        startHttpPolling(newTaskId);
      }
    } catch (error) {
      let message = '生成测试点失败';
      let detailedMessage = '';

      if (error instanceof Error) {
        message = error.message;

        if (error.message.includes('Network Error')) {
          detailedMessage = '网络连接失败，请检查：\n' +
            '1. 后端服务是否已启动\n' +
            '2. 网络连接是否正常\n' +
            '3. 防火墙或代理设置';
        } else if (error.message.includes('timeout')) {
          detailedMessage = '请求超时，请稍后重试';
        } else if (error.message.includes('CORS')) {
          detailedMessage = '跨域请求被阻止，请联系技术支持';
        } else {
          detailedMessage = error.message;
        }
      }

      frontendLogger.error(LogCategory.ERROR, 'generate_points_failed', error instanceof Error ? error : new Error(message), {
        requirement: requirement.substring(0, 100) + '...',
        errorType: error?.constructor?.name || 'Unknown',
        detailedMessage
      });

      processing.failProcessing(message, detailedMessage);
      dispatch({ type: 'SET_ERROR', payload: detailedMessage || message });
      dispatch({ type: 'SET_LOADING', payload: false });
      setIsGenerating(false);
    }
  }, [state, dispatch, handlePointsReceived, processing]);

  return {
    generatePoints,
    isGenerating
  };
}
