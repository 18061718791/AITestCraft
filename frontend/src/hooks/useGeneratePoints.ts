import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { testApi } from '../services/api';
import socketService from '../services/socket';
import socketLogger from '../services/socketLogger';
import { frontendLogger, LogCategory } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { readTemplateWithCache, replaceParameters, validateTemplateParams } from '../utils/promptTemplate';


export function useGeneratePoints() {
  const { state, dispatch } = useAppContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const taskIdRef = useRef<string | undefined>(state.taskId);

  // 同步taskId到ref，避免闭包陷阱
  useEffect(() => {
    taskIdRef.current = state.taskId;
  }, [state.taskId]);

  const generatePoints = useCallback(async (requirement: string) => {
    if (!requirement.trim()) {
      dispatch({ type: 'SET_ERROR', payload: '请输入需求描述' });
      frontendLogger.warn(LogCategory.USER_ACTION, 'Empty requirement provided');
      return;
    }

    // 获取用户选择的信息
    const selectedSystem = state.selectedSystem;
    const selectedModule = state.selectedModule;
    const selectedScenario = state.selectedScenario;

    if (!selectedSystem || !selectedModule) {
      dispatch({ type: 'SET_ERROR', payload: '请先选择系统和功能模块' });
      return;
    }

    // 验证模板参数
      const validation = validateTemplateParams({
        system: selectedSystem.name,
        module: selectedModule.name,
        scenario: selectedScenario?.name || '通用功能',
        requirement
      });

      if (!validation.isValid) {
        dispatch({ type: 'SET_ERROR', payload: validation.errorMessage || '参数验证失败' });
        return;
      }

    frontendLogger.debug(LogCategory.USER_ACTION, 'generate_points_start', { 
        requirement: requirement.substring(0, 100) + '...',
        system: selectedSystem.name,
        module: selectedModule.name,
        scenario: selectedScenario?.name || '通用功能'
      });

    try {
      setIsGenerating(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // 读取并处理模板
      const templatePath = '/prompts/generate_test_points.md';
      const template = await readTemplateWithCache(templatePath);
      
      // 替换模板中的参数
      const processedPrompt = replaceParameters(template, {
        system: selectedSystem.name,
        module: selectedModule.name,
        scenario: selectedScenario?.name || '通用功能',
        requirement
      });

      frontendLogger.debug(LogCategory.BUSINESS, 'template_processed', {
        system: selectedSystem.name,
        module: selectedModule.name,
        scenario: selectedScenario?.name || '通用功能',
        requirement: requirement.substring(0, 100) + '...',
        promptLength: processedPrompt.length
      });

      // 确保有会话ID
      let sessionId = state.sessionId;
      if (!sessionId) {
        sessionId = uuidv4();
        dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
        frontendLogger.setSessionId(sessionId);
      }

      // 初始化Socket日志
      socketLogger.initialize(sessionId);

      // 连接WebSocket
      try {
        await socketService.ensureConnected(sessionId);
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
        dispatch({ type: 'SET_ERROR', payload: '无法连接到服务器，请检查网络连接' });
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsGenerating(false);
        return;
      }

      // 设置超时保护
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

      // 监听测试点生成完成事件
      socketService.onPointsGenerated((data) => {
        clearTimeout(timeoutId);
        const { taskId, points } = data;
        const currentTaskId = taskIdRef.current;
        
        frontendLogger.debug(LogCategory.BUSINESS, 'points_generated_received', {
          taskId: taskId,
          stateTaskId: currentTaskId,
          match: taskId === currentTaskId,
          pointsCount: points?.length || 0
        });

        if (taskId === currentTaskId) {
          frontendLogger.info(LogCategory.BUSINESS, 'points_generated_matched', {
            taskId: taskId,
            pointsCount: points.length
          });

          const testPoints = points.map((point: any, index: number) => ({
            id: point.id || `point-${index}`,
            content: point.content || point.title || point.description || '未命名测试点',
            selected: false
          }));

          dispatch({ type: 'SET_TEST_POINTS', payload: testPoints });
          dispatch({ type: 'SET_LOADING', payload: false });
          dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
          setIsGenerating(false);
        }
      });

      // 监听错误事件
      socketService.onError((data) => {
        const currentTaskId = taskIdRef.current;
        frontendLogger.error(LogCategory.ERROR, 'points_generation_error', new Error(data.message || '未知错误'), {
          taskId: currentTaskId
        });
        dispatch({ type: 'SET_ERROR', payload: data.message || '生成测试点失败' });
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsGenerating(false);
      });

      // 使用处理后的提示词调用API
      const response = await testApi.generateTestPoints({
        requirement: requirement, // 使用用户原始输入的需求描述
        sessionId,
        system: selectedSystem.name,
        module: selectedModule.name,
        scenario: selectedScenario?.name || '通用功能'
      });

      if (response.success) {
        const newTaskId = response.data.taskId;
        frontendLogger.debug(LogCategory.BUSINESS, 'generate_points_request_sent', {
          taskId: newTaskId,
          sessionId,
          promptLength: processedPrompt.length
        });
        
        dispatch({ type: 'SET_TASK_ID', payload: newTaskId });
        taskIdRef.current = newTaskId;
        dispatch({ type: 'SET_REQUIREMENT', payload: requirement });
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
      
      dispatch({ type: 'SET_ERROR', payload: detailedMessage || message });
      dispatch({ type: 'SET_LOADING', payload: false });
      setIsGenerating(false);
    }
  }, [state, dispatch]);

  return {
    generatePoints,
    isGenerating
  };
}