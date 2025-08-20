import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { testApi } from '../services/api';
import socketService from '../services/socket';
import socketLogger from '../services/socketLogger';
import { frontendLogger, LogCategory } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

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

    frontendLogger.debug(LogCategory.USER_ACTION, 'generate_points_start', { requirement: requirement.substring(0, 100) + '...' });

    try {
      setIsGenerating(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

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
      if (!socketService.isConnected()) {
        socketService.connect(sessionId);
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
          pointsCount: points?.length || 0,
          firstPoint: points?.[0],
          allPoints: points
        });

        // 添加taskId验证和初始化检查
        if (!currentTaskId) {
          frontendLogger.warn(LogCategory.BUSINESS, 'points_received_before_task_id_set', {
            receivedTaskId: taskId,
            expectedTaskId: currentTaskId,
            note: 'Task ID not yet initialized, this may be a timing issue'
          });
          return;
        }

        if (taskId === currentTaskId) {
          frontendLogger.info(LogCategory.BUSINESS, 'points_generated_matched', {
            taskId: taskId,
            pointsCount: points.length,
            points: points
          });

          // 兼容后端返回的TestPoint格式，提取content字段
          const pointContents = points.map((point: any) => 
            point.content || 
            point.title || 
            point.description || 
            '未命名测试点'
          );
          frontendLogger.debug(LogCategory.BUSINESS, 'points_mapped_to_content', {
            originalCount: points.length,
            contentCount: pointContents.length,
            sampleContents: pointContents.slice(0, 2),
            sampleOriginalPoints: points.slice(0, 2)
          });

          dispatch({ type: 'SET_TEST_POINTS', payload: pointContents });
          dispatch({ type: 'SET_LOADING', payload: false });
          dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
          setIsGenerating(false);
        } else {
          frontendLogger.warn(LogCategory.BUSINESS, 'points_generated_mismatch', {
            receivedTaskId: taskId,
            expectedTaskId: currentTaskId
          });
        }
      });

      // 监听错误事件
      socketService.onError((data) => {
        const currentTaskId = taskIdRef.current;
        frontendLogger.error(LogCategory.ERROR, 'points_generation_error', new Error(data.message || '未知错误'), {
          taskId: currentTaskId,
          originalTaskId: state.taskId,
          refMatch: currentTaskId === state.taskId
        });
        dispatch({ type: 'SET_ERROR', payload: data.message || '生成测试点失败' });
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsGenerating(false);
      });

      const response = await testApi.generateTestPoints({
        requirement,
        sessionId
      });

      if (response.success) {
        const newTaskId = response.data.taskId;
        frontendLogger.debug(LogCategory.BUSINESS, 'generate_points_request_sent', {
          taskId: newTaskId,
          sessionId
        });
        
        // 先设置taskId，确保WebSocket事件到达时taskId已就绪
        dispatch({ type: 'SET_TASK_ID', payload: newTaskId });
        taskIdRef.current = newTaskId; // 立即更新ref，避免useEffect延迟
        
        frontendLogger.debug(LogCategory.BUSINESS, 'task_id_initialized', {
          taskId: newTaskId,
          refUpdated: taskIdRef.current === newTaskId
        });
        
        dispatch({ type: 'SET_REQUIREMENT', payload: requirement });
      }
    } catch (error) {
      let message = '生成测试点失败';
      let detailedMessage = '';

      if (error instanceof Error) {
        message = error.message;
        
        // 详细的网络错误诊断
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
  }, [state.sessionId, state.taskId, dispatch]);

  return {
    generatePoints,
    isGenerating,
  };
}