import ExcelJS from 'exceljs';

export interface TestCaseWithRelations {
  id: number;
  title: string;
  status: string;
  priority: string;
  preconditions?: string;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  tags?: string[];
  createdAt: string;  // 格式化为 yyyy-mm-dd hh:mm:ss 字符串
  updatedAt: string;   // 格式化为 yyyy-mm-dd hh:mm:ss 字符串
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
  '用例id': number;
  '系统': string;
  '功能模块': string;
  '功能场景': string;
  '用例标题': string;
  '优先级': string;
  '用例描述': string;
  '前置条件': string;
  '测试步骤': string;
  '预期结果': string;
  '实际结果': string;
  '状态': string;
  '标签': string;
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

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('测试用例');

      // 定义列结构
      const columns = [
        { key: '用例id', header: '用例id', width: 8 },
        { key: '系统', header: '系统', width: 15 },
        { key: '功能模块', header: '功能模块', width: 15 },
        { key: '功能场景', header: '功能场景', width: 15 },
        { key: '用例标题', header: '用例标题', width: 40 },
        { key: '优先级', header: '优先级', width: 8 },
        { key: '用例描述', header: '用例描述', width: 40 },
        { key: '前置条件', header: '前置条件', width: 50 },
        { key: '测试步骤', header: '测试步骤', width: 60 },
        { key: '预期结果', header: '预期结果', width: 50 },
        { key: '实际结果', header: '实际结果', width: 50 },
        { key: '状态', header: '状态', width: 12 },
        { key: '标签', header: '标签', width: 20 }
      ];

      worksheet.columns = columns;

      // 添加数据行
      const data = testCases.map(tc => ({
        '用例id': tc.id,
        '系统': tc.system?.name || '',
        '功能模块': tc.module?.name || '',
        '功能场景': tc.scenario?.name || '',
        '用例标题': tc.title || '',
        '优先级': this.getPriorityText(tc.priority),
        '用例描述': tc.title || '', // 用例描述复用用例标题
        '前置条件': tc.preconditions || '',
        '测试步骤': tc.steps || '',
        '预期结果': tc.expectedResult || '',
        '实际结果': tc.actualResult || '',
        '状态': this.getStatusText(tc.status),
        '标签': tc.tags && tc.tags.length > 0 ? tc.tags.join(', ') : ''
      }));

      data.forEach(row => {
        worksheet.addRow(row);
      });

      // 应用样式
      this.applyStyles(worksheet);

      // 生成Buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

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
   * 应用样式设置
   */
  private applyStyles(worksheet: ExcelJS.Worksheet): void {
    // 应用表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: '宋体',
        size: 12,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' } // 蓝色背景
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // 应用数据行样式
    const rowCount = worksheet.rowCount;
    for (let row = 2; row <= rowCount; row++) {
      const dataRow = worksheet.getRow(row);
      dataRow.height = 20;
      
      const isAlternateRow = row % 2 === 0;
      
      dataRow.eachCell((cell) => {
        cell.font = {
          name: '宋体',
          size: 11
        };
        cell.alignment = {
          vertical: 'middle',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // 灰白交替背景
        if (isAlternateRow) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' } // 浅灰色背景
          };
        }
      });
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