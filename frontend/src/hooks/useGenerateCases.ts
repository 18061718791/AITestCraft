import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useProcessingLogs } from './useProcessingLogs';
import { testApi } from '../services/api';
import socketService from '../services/socket';
import { frontendLogger, LogCategory } from '../utils/logger';
import { TestCase } from '../types';

export function useGenerateCases() {
  const { state, dispatch } = useAppContext();
  const processing = useProcessingLogs();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const taskIdRef = useRef<string | undefined>(state.taskId);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedCasesRef = useRef<TestCase[]>([]);

  // 同步taskId到ref，避免闭包陷阱
  useEffect(() => {
    taskIdRef.current = state.taskId;
  }, [state.taskId]);

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await testApi.getTaskStatus(taskId);
      if (response.success && response.data) {
        const { status, data } = response.data;
        
        frontendLogger.debug(LogCategory.BUSINESS, 'task_status_polled', {
          taskId,
          status,
          hasData: !!data
        });

        if (status === 'completed' && data?.testCases) {
          frontendLogger.info(LogCategory.BUSINESS, 'task_completed_polled', {
            taskId,
            casesCount: data.testCases.length
          });
          processing.completeProcessing('测试用例生成完成', data.testCases.length);

          dispatch({ type: 'SET_TEST_CASES', payload: data.testCases });
          dispatch({ type: 'SET_LOADING', payload: false });
          dispatch({ type: 'SET_CURRENT_STEP', payload: 3 });
          setIsGenerating(false);

          // 清理轮询
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'failed' && data?.error) {
          frontendLogger.error(LogCategory.BUSINESS, 'task_failed_polled', new Error(data.error), {
            taskId: taskId,
            error: data.error
          });
          processing.failProcessing(data.error || '生成测试用例失败');

          dispatch({ type: 'SET_ERROR', payload: data.error || '生成测试用例失败' });
          dispatch({ type: 'SET_LOADING', payload: false });
          setIsGenerating(false);

          // 清理轮询
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }
    } catch (error) {
      frontendLogger.error(LogCategory.BUSINESS, 'task_status_poll_failed', error instanceof Error ? error : new Error('Polling failed'), {
        taskId: taskId
      });
    }
  }, [dispatch]);

  const generateCases = useCallback(async (testPoints?: string[]) => {
    const pointsToGenerate = testPoints || state.selectedTestPoints;
    if (pointsToGenerate.length === 0) {
      processing.failProcessing('请至少选择一个测试点');
      dispatch({ type: 'SET_ERROR', payload: '请至少选择一个测试点' });
      frontendLogger.warn(LogCategory.USER_ACTION, 'No test points selected');
      return;
    }

    processing.startProcessing('生成测试用例');
    processing.addLog('info', `已选择 ${pointsToGenerate.length} 个测试点，开始生成用例`);

    frontendLogger.debug(LogCategory.USER_ACTION, 'generate_cases_start', {
      selectedPointsCount: pointsToGenerate.length,
      selectedPoints: pointsToGenerate
    });

    try {
      setIsGenerating(true);
      setProgress(0);
      setProgressMessage('准备生成测试用例...');
      accumulatedCasesRef.current = [];
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      processing.updateProgress('connecting', 10, '正在建立连接...');

      // 清理之前的轮询
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // 设置WebSocket事件监听 - 流式进度
      const handleCasesProgress = (data: { 
        taskId: string; 
        progress: number; 
        completedBatches: number;
        totalBatches: number;
        casesCount: number;
        cases: TestCase[];
        isComplete: boolean;
      }) => {
        const { taskId, progress, completedBatches, totalBatches, cases, isComplete } = data;
        const currentTaskId = taskIdRef.current;
        const refMatch = taskId === currentTaskId;
        
        if (!refMatch) {
          frontendLogger.warn(LogCategory.BUSINESS, 'cases_progress_mismatch', {
            receivedTaskId: taskId,
            expectedTaskId: currentTaskId
          });
          return;
        }

        // 更新进度
        setProgress(progress);
        setProgressMessage(`正在生成测试用例... (${completedBatches}/${totalBatches} 批次)`);
        processing.updateProgress('generating', progress, `正在生成第 ${completedBatches}/${totalBatches} 批次测试用例...`);
        processing.addLog('info', `第 ${completedBatches}/${totalBatches} 批次生成完成`, `新增 ${cases.length} 条用例`);

        // 累积测试用例
        accumulatedCasesRef.current = [...accumulatedCasesRef.current, ...cases];
        
        frontendLogger.debug(LogCategory.BUSINESS, 'cases_progress_received', {
          taskId,
          progress,
          completedBatches,
          totalBatches,
          casesCount: accumulatedCasesRef.current.length,
          isComplete
        });

        // 如果是完成状态
        if (isComplete) {
          frontendLogger.info(LogCategory.BUSINESS, 'cases_generation_completed', {
            taskId,
            totalCasesCount: accumulatedCasesRef.current.length
          });
          processing.completeProcessing('测试用例生成完成', accumulatedCasesRef.current.length);

          dispatch({ type: 'SET_TEST_CASES', payload: accumulatedCasesRef.current });
          dispatch({ type: 'SET_LOADING', payload: false });
          dispatch({ type: 'SET_CURRENT_STEP', payload: 3 });
          setIsGenerating(false);
          setProgress(100);
          setProgressMessage('测试用例生成完成！');

          // 清理轮询
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      };

      // 设置WebSocket事件监听 - 完成通知（兼容旧逻辑）
      const handleCasesGenerated = (data: { taskId: string; cases: any[] }) => {
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
          setProgress(100);
          setProgressMessage('测试用例生成完成！');

          // 清理轮询
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else {
          frontendLogger.warn(LogCategory.BUSINESS, 'cases_generated_mismatch', {
            receivedTaskId: taskId,
            expectedTaskId: currentTaskId,
            stateTaskId: state.taskId,
            refMatch: refMatch
          });
        }
      };

      const handleError = (data: { message: string; code?: string }) => {
        const currentTaskId = taskIdRef.current;
        const originalTaskId = state.taskId;
        const refMatch = currentTaskId === originalTaskId;

        frontendLogger.error(LogCategory.ERROR, 'cases_generation_error', new Error(data.message || '未知错误'), {
          taskId: currentTaskId,
          originalTaskId: originalTaskId,
          refMatch: refMatch,
          errorData: data
        });

        if (refMatch) {
          processing.failProcessing(data.message || '生成测试用例失败');
          dispatch({ type: 'SET_ERROR', payload: data.message || '生成测试用例失败' });
          dispatch({ type: 'SET_LOADING', payload: false });
          setIsGenerating(false);
          setProgress(0);
          setProgressMessage('');

          // 清理轮询
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      };

      // 确保WebSocket已连接（先连接，再注册事件）
      try {
        await socketService.ensureConnected(state.sessionId);
        frontendLogger.info(LogCategory.BUSINESS, 'websocket_connected', {
          sessionId: state.sessionId
        });
        processing.addLog('success', '实时连接已建立');
      } catch (error) {
        frontendLogger.warn(LogCategory.BUSINESS, 'websocket_connection_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fallbackToPolling: true
        });
        processing.addLog('warning', '实时连接建立失败，将使用轮询模式');
      }

      // WebSocket连接成功后，再添加事件监听
      socketService.onCasesProgress(handleCasesProgress);
      socketService.onCasesGenerated(handleCasesGenerated);
      socketService.onError(handleError);
      
      frontendLogger.debug(LogCategory.BUSINESS, 'websocket_listeners_registered', {
        sessionId: state.sessionId
      });

      const response = await testApi.generateTestCases({
        testPoints: pointsToGenerate,
        sessionId: state.sessionId,
        system: state.selectedSystem?.name,
        module: state.selectedModule?.name,
        scenario: state.selectedScenario?.name,
        provider: state.selectedProvider,
        model: state.selectedModel,
      });

      if (response.success) {
        const newTaskId = response.data.taskId;
        frontendLogger.debug(LogCategory.BUSINESS, 'generate_cases_request_sent', {
          taskId: newTaskId,
          sessionId: state.sessionId,
          testPointsCount: state.selectedTestPoints.length
        });
        processing.addLog('info', '任务已提交', `TaskId: ${newTaskId}`);
        processing.updateProgress('generating', 20, 'AI 正在生成测试用例...');
        
        // 立即更新taskId到ref和state，确保WebSocket事件到达时taskId已就绪
        taskIdRef.current = newTaskId;
        dispatch({ type: 'SET_TASK_ID', payload: newTaskId });
        frontendLogger.debug(LogCategory.BUSINESS, 'task_id_initialized', {
          taskId: newTaskId,
          refUpdated: true,
          stateUpdated: true
        });

        // 启动轮询作为WebSocket的备份
        startTimeRef.current = Date.now();
        pollingIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTimeRef.current;
          // 最多轮询5分钟
          if (elapsedTime > 5 * 60 * 1000) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            frontendLogger.error(LogCategory.ERROR, 'task_polling_timeout', new Error('Task polling timeout'), {
              taskId: newTaskId,
              elapsedTime
            });
            dispatch({ type: 'SET_ERROR', payload: '生成测试用例超时，请稍后重试' });
            dispatch({ type: 'SET_LOADING', payload: false });
            setIsGenerating(false);
            return;
          }
          pollTaskStatus(newTaskId);
        }, 3000); // 每3秒轮询一次
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
        detailedMessage,
        taskId: state.taskId
      });
      
      processing.failProcessing(message, detailedMessage);
      dispatch({ type: 'SET_ERROR', payload: detailedMessage || message });
      dispatch({ type: 'SET_LOADING', payload: false });
      setIsGenerating(false);

      // 清理轮询
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [state.selectedTestPoints, state.sessionId, state.taskId, dispatch, pollTaskStatus, processing]);

  return {
    generateCases,
    loading: isGenerating,
    progress,
    progressMessage,
  };
}