import { useState } from 'react';
import { testApi } from '../services/api';
import { TestCase } from '../types';
import { useAppContext } from '../contexts/AppContext';

export const useExportCases = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { state } = useAppContext();

  const exportToExcel = async (testCases: TestCase[]): Promise<boolean> => {
    if (!testCases || testCases.length === 0) {
      throw new Error('没有可导出的测试用例');
    }

    if (!state.sessionId) {
      throw new Error('会话ID缺失，请刷新页面重试');
    }

    setLoading(true);
    try {
      const blob = await testApi.downloadExcel(testCases, state.sessionId);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `测试用例_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出失败';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    exportToExcel,
    loading,
  };
};