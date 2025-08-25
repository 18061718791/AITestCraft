import axios from 'axios';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  preview: TestCaseRow[];
  totalRows: number;
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  value?: any;
}

export interface TestCaseRow {
  title: string;
  preconditions?: string;
  steps: string;
  expectedResult: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  tags?: string[];
  systemName?: string;
  moduleName?: string;
  scenarioName?: string;
}

export interface ImportResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  success: number;
  failed: number;
  errors: ValidationError[];
  reportUrl?: string;
}

export interface DeleteResult {
  deleted: number;
  failed: number;
  errors: DeleteError[];
}

export interface DeleteError {
  id: number;
  message: string;
}

class BatchService {
  private baseURL = '/api';

  /**
   * 验证导入文件
   */
  async validateImportFile(file: File): Promise<ValidationResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${this.baseURL}/test-cases/batch/validate`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * 批量导入测试用例
   */
  async importTestCases(file: File, conflictStrategy: 'skip' | 'overwrite' | 'new_version'): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conflictStrategy', conflictStrategy);

    const response = await axios.post(`${this.baseURL}/test-cases/batch/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * 获取导入进度
   */
  async getImportProgress(jobId: string): Promise<ImportResult | null> {
    const response = await axios.get(`${this.baseURL}/test-cases/batch/import/${jobId}/progress`);
    return response.data.data;
  }

  /**
   * 批量删除测试用例
   */
  async deleteTestCases(ids: number[]): Promise<DeleteResult> {
    const response = await axios.delete(`${this.baseURL}/test-cases/batch/delete`, {
      data: { ids },
    });

    return response.data.data;
  }

  /**
   * 下载导入模板
   */
  async downloadImportTemplate(): Promise<void> {
    const response = await axios.get(`${this.baseURL}/test-cases/batch/template`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'test-cases-template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * 批量导出测试用例
   */
  async batchExport(testCaseIds: number[]): Promise<void> {
    const response = await axios.post(`${this.baseURL}/test-cases/batch/export`, 
      { testCaseIds },
      {
        responseType: 'blob',
        timeout: 30000, // 30秒超时
      }
    );
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `test-cases-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * 轮询导入进度
   */
  async pollImportProgress(jobId: string, onProgress: (progress: ImportResult) => void): Promise<void> {
    const checkProgress = async () => {
      try {
        const progress = await this.getImportProgress(jobId);
        if (progress) {
          onProgress(progress);
          
          if (progress.status === 'processing') {
            setTimeout(checkProgress, 1000); // 每秒检查一次
          }
        }
      } catch (error) {
        console.error('获取导入进度失败:', error);
      }
    };

    checkProgress();
  }
}

export const batchService = new BatchService();