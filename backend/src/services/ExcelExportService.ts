import * as XLSX from 'xlsx';

export interface TestCaseWithRelations {
  id: number;
  title: string;
  status: string;
  priority: string;
  preconditions?: string;
  steps?: string;
  expectedResult?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  system?: {
    id: number;
    name: string;
  } | null;
  module?: {
    id: number;
    name: string;
  } | null;
  scenario?: {
    id: number;
    name: string;
  } | null;
}

export interface ExcelRow {
  '用例ID': number;
  '标题': string;
  '系统': string;
  '模块': string;
  '场景': string;
  '状态': string;
  '优先级': string;
  '前置条件': string;
  '测试步骤': string;
  '预期结果': string;
  '标签': string;
  '创建时间': string;
  '更新时间': string;
}

export class ExcelExportService {
  constructor() {}

  /**
   * 生成测试用例Excel文件
   * @param testCases 测试用例数组
   * @returns Excel文件的Buffer
   */
  async generateTestCasesExcel(testCases: TestCaseWithRelations[]): Promise<Buffer> {
    try {
      if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new Error('测试用例数据不能为空');
      }

      const data: ExcelRow[] = testCases.map(tc => ({
        '用例ID': tc.id,
        '标题': tc.title || '',
        '系统': tc.system?.name || '',
        '模块': tc.module?.name || '',
        '场景': tc.scenario?.name || '',
        '状态': this.getStatusText(tc.status),
        '优先级': this.getPriorityText(tc.priority),
        '前置条件': tc.preconditions || '',
        '测试步骤': tc.steps || '',
        '预期结果': tc.expectedResult || '',
        '标签': tc.tags && tc.tags.length > 0 ? tc.tags.join(', ') : '',
        '创建时间': tc.createdAt ? this.formatDateTime(tc.createdAt) : '',
        '更新时间': tc.updatedAt ? this.formatDateTime(tc.updatedAt) : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      
      // 设置工作表名称
      XLSX.utils.book_append_sheet(workbook, worksheet, '测试用例');

      // 设置列宽
      const cols = [
        { wch: 8 },   // 用例ID
        { wch: 40 },  // 标题
        { wch: 15 },  // 系统
        { wch: 15 },  // 模块
        { wch: 15 },  // 场景
        { wch: 10 },  // 状态
        { wch: 10 },  // 优先级
        { wch: 50 },  // 前置条件
        { wch: 60 },  // 测试步骤
        { wch: 50 },  // 预期结果
        { wch: 20 },  // 标签
        { wch: 20 },  // 创建时间
        { wch: 20 }   // 更新时间
      ];
      worksheet['!cols'] = cols;

      // 设置样式
      this.applyStyles(worksheet);

      return XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
      });

    } catch (error) {
      console.error('生成Excel文件失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`生成Excel文件失败: ${errorMessage}`);
    }
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': '待测试',
      'PASSED': '已通过',
      'FAILED': '已失败',
      'SKIPPED': '已跳过'
    };
    return statusMap[status] || status;
  }

  /**
   * 获取优先级文本
   */
  private getPriorityText(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      'HIGH': '高',
      'MEDIUM': '中',
      'LOW': '低'
    };
    return priorityMap[priority] || priority;
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 应用样式设置
   */
  private applyStyles(worksheet: XLSX.WorkSheet): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // 设置表头样式
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      if (cell) {
        cell.s = {
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
    }

    // 设置数据行样式
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell) {
          cell.s = {
            alignment: { vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }
    }
  }

  /**
   * 验证测试用例ID数组
   */
  validateTestCaseIds(testCaseIds: any[]): { valid: boolean; message?: string } {
    if (!Array.isArray(testCaseIds)) {
      return { valid: false, message: '测试用例ID必须是数组' };
    }

    if (testCaseIds.length === 0) {
      return { valid: false, message: '请选择要导出的测试用例' };
    }

    if (testCaseIds.length > 500) {
      return { valid: false, message: '一次最多导出500个测试用例' };
    }

    if (!testCaseIds.every(id => typeof id === 'number' && id > 0)) {
      return { valid: false, message: '测试用例ID必须是正整数' };
    }

    return { valid: true };
  }
}