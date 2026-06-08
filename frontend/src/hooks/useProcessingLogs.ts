import { useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ProcessingLog, ProcessingStatus, LogLevel, ProcessStage } from '../types/processing';

export function useProcessingLogs() {
  const { state, dispatch } = useAppContext();

  const addLog = useCallback((level: LogLevel, message: string, details?: string) => {
    const log: ProcessingLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      level,
      message,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      details,
    };
    dispatch({ type: 'ADD_PROCESSING_LOG', payload: log });
  }, [dispatch]);

  const setStatus = useCallback((status: Partial<ProcessingStatus>) => {
    dispatch({
      type: 'SET_PROCESSING_STATUS',
      payload: { ...state.processingStatus, ...status },
    });
  }, [dispatch, state.processingStatus]);

  const clearLogs = useCallback(() => {
    dispatch({ type: 'CLEAR_PROCESSING_LOGS' });
  }, [dispatch]);

  const startProcessing = useCallback((stepName: string, preserveLogs: boolean = false) => {
    if (!preserveLogs) {
      clearLogs();
    }
    setStatus({ stage: 'connecting', progress: 0, currentStep: stepName });
    addLog('info', `开始处理：${stepName}`);
  }, [clearLogs, setStatus, addLog]);

  const updateProgress = useCallback((stage: ProcessStage, progress: number, currentStep: string) => {
    setStatus({ stage, progress, currentStep });
    if (stage === 'analyzing') {
      addLog('info', currentStep);
    } else if (stage === 'generating') {
      addLog('info', currentStep);
    }
  }, [setStatus, addLog]);

  const completeProcessing = useCallback((message: string, resultCount?: number) => {
    setStatus({ stage: 'completed', progress: 100, currentStep: message });
    addLog('success', message, resultCount !== undefined ? `共生成 ${resultCount} 条结果` : undefined);
  }, [setStatus, addLog]);

  const failProcessing = useCallback((error: string, details?: string) => {
    setStatus({ stage: 'failed', progress: 0, currentStep: '处理失败' });
    addLog('error', error, details);
  }, [setStatus, addLog]);

  return {
    logs: state.processingLogs,
    status: state.processingStatus,
    addLog,
    setStatus,
    clearLogs,
    startProcessing,
    updateProgress,
    completeProcessing,
    failProcessing,
  };
}
