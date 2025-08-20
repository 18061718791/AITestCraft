import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { testApi } from '../services/api';
import socketService from '../services/socket';
import { frontendLogger, LogCategory } from '../utils/logger';

export function useGenerateCases() {
  const { state, dispatch } = useAppContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const taskIdRef = useRef<string | undefined>(state.taskId);

  // 同步taskId到ref，避免闭包陷阱
  useEffect(() => {
    taskIdRef.current = state.taskId;
  }, [state.taskId]);

  const generateCases = useCallback(async (testPoints?: string[]) => {
    const pointsToGenerate = testPoints || state.selectedTestPoints;
    if (pointsToGenerate.length === 0) {
      dispatch({ type: 'SET_ERROR', payload: '请至少选择一个测试点' });
      frontendLogger.warn(LogCategory.USER_ACTION, 'No test points selected');
      return;
    }

    frontendLogger.debug(LogCategory.USER_ACTION, 'generate_cases_start', {
      selectedPointsCount: state.selectedTestPoints.length,
      selectedPoints: state.selectedTestPoints
    });

    try {
      setIsGenerating(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      socketService.onCasesGenerated((data) => {
        const { taskId, cases } = data;
        const currentTaskId = taskIdRef.current;
        const refMatch = taskId === currentTaskId;
        
        frontendLogger.debug(LogCategory.BUSINESS, 'cases_generated_received', {
          taskId: taskId,
          currentTaskId: currentTaskId,
          refMatch: refMatch,
          casesCount: cases?.length || 0,
          stateTaskId: state.taskId
        });

        if (refMatch) {
          frontendLogger.info(LogCategory.BUSINESS, 'cases_generated_matched', {
            taskId: taskId,
            casesCount: cases.length,
            stateTaskId: state.taskId
          });

          dispatch({ type: 'SET_TEST_CASES', payload: cases });
          dispatch({ type: 'SET_LOADING', payload: false });
          dispatch({ type: 'SET_CURRENT_STEP', payload: 3 });
          setIsGenerating(false);
        } else {
          frontendLogger.warn(LogCategory.BUSINESS, 'cases_generated_mismatch', {
            receivedTaskId: taskId,
            expectedTaskId: currentTaskId,
            stateTaskId: state.taskId,
            refMatch: refMatch
          });
        }
      });

      socketService.onError((data: any) => {
        const currentTaskId = taskIdRef.current;
        const originalTaskId = state.taskId;
        const refMatch = currentTaskId === originalTaskId;
        
        frontendLogger.error(LogCategory.ERROR, 'cases_generation_error', new Error(data.message || '未知错误'), {
          taskId: currentTaskId,
          originalTaskId: originalTaskId,
          refMatch: refMatch,
          errorData: data
        });
        dispatch({ type: 'SET_ERROR', payload: data.message || '生成测试用例失败' });
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsGenerating(false);
      });

      // 确保WebSocket已连接
      if (!socketService.isConnected()) {
        socketService.connect(state.sessionId);
      }

      const response = await testApi.generateTestCases({
        testPoints: pointsToGenerate,
        sessionId: state.sessionId,
      });

      if (response.success) {
        const newTaskId = response.data.taskId;
        frontendLogger.debug(LogCategory.BUSINESS, 'generate_cases_request_sent', {
          taskId: newTaskId,
          sessionId: state.sessionId,
          testPointsCount: state.selectedTestPoints.length
        });
        
        // 立即更新taskId到ref和state，确保WebSocket事件到达时taskId已就绪
        taskIdRef.current = newTaskId;
        dispatch({ type: 'SET_TASK_ID', payload: newTaskId });
        frontendLogger.debug(LogCategory.BUSINESS, 'task_id_initialized', {
          taskId: newTaskId,
          refUpdated: true,
          stateUpdated: true
        });
      }
    } catch (error) {
      let message = '生成测试用例失败';
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

      frontendLogger.error(LogCategory.ERROR, 'generate_cases_failed', error instanceof Error ? error : new Error(message), {
        selectedPointsCount: state.selectedTestPoints.length,
        selectedPoints: state.selectedTestPoints,
        errorType: error?.constructor?.name || 'Unknown',
        detailedMessage
      });
      
      dispatch({ type: 'SET_ERROR', payload: detailedMessage || message });
      dispatch({ type: 'SET_LOADING', payload: false });
      setIsGenerating(false);
    }
  }, [state.selectedTestPoints, state.sessionId, state.taskId, dispatch]);

  return {
    generateCases,
    isGenerating,
  };
}