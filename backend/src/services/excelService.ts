import ExcelJS from 'exceljs';
import logger from '../utils/logger';

import { TestCase } from '../types';
import { DefectItem } from './defectAssistant/types';

export class ExcelService {
  async generateTestCasesExcel(testCases: TestCase[]): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('测试用例');

      // Define columns
      worksheet.columns = [
        { header: '用例编号', key: 'number', width: 12 },
        { header: '系统', key: 'system', width: 15 },
        { header: '功能模块', key: 'module', width: 20 },
        { header: '功能场景', key: 'scenario', width: 20 },
        { header: '用例标题', key: 'title', width: 40 },
        { header: '用例描述', key: 'description', width: 50 },
        { header: '前置条件', key: 'precondition', width: 40 },
        { header: '测试步骤', key: 'steps', width: 50 },
        { header: '期望结果', key: 'expected_results', width: 50 },
        { header: '实际结果', key: 'actual_result', width: 30 },
        { header: '测试结果', key: 'pass_fail', width: 12 },
      ];

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = {
        name: '微软雅黑',
        bold: true,
        size: 12,
        color: { argb: 'FFFFFFFF' }
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };

      // Add data rows
      testCases.forEach((testCase, index) => {
        const row = worksheet.addRow({
          number: testCase.number,
          system: testCase.system || '未指定',
          module: testCase.module,
          scenario: testCase.scenario || testCase.module,
          title: testCase.title,
          description: testCase.description,
          precondition: testCase.precondition,
          steps: Array.isArray(testCase.steps) 
            ? testCase.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')
            : String(testCase.steps),
          expected_results: Array.isArray(testCase.expected_results)
            ? testCase.expected_results.map((result, i) => `${i + 1}. ${result}`).join('\n')
            : String(testCase.expected_results),
          actual_result: testCase.actual_result,
          pass_fail: testCase.pass_fail,
        });

        // Style data rows
        row.alignment = {
          vertical: 'top',
          wrapText: true
        };

        // Alternate row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        }

        // Conditional formatting for test results
        const resultCell = row.getCell('pass_fail');
        if (testCase.pass_fail === 'Pass') {
          resultCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' }
          };
          resultCell.font = { color: { argb: 'FF006100' } };
        } else if (testCase.pass_fail === 'Fail') {
          resultCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }
          };
          resultCell.font = { color: { argb: 'FF9C0006' } };
        }
      });

      // Add borders
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Auto-filter
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 11 }
      };

      // Freeze header row
      worksheet.views = [
        { state: 'frozen', ySplit: 1 }
      ];

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      logger.info(`Generated Excel file with ${testCases.length} test cases`);
      
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Failed to generate Excel file:', error);
      throw new Error('Failed to generate Excel file');
    }
  }

  async generateTestPointsExcel(testPoints: string[]): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('测试点');

      // Define columns
      worksheet.columns = [
        { header: '序号', key: 'index', width: 8 },
        { header: '测试点', key: 'point', width: 80 },
      ];

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = {
        bold: true,
        size: 12,
        color: { argb: 'FFFFFFFF' }
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };

      // Add data rows
      testPoints.forEach((point, index) => {
        const row = worksheet.addRow({
          index: index + 1,
          point: point,
        });

        // Style data rows
        row.alignment = {
          vertical: 'top',
          wrapText: true
        };

        // Alternate row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        }
      });

      // Add borders
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Auto-filter
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 2 }
      };

      // Freeze header row
      worksheet.views = [
        { state: 'frozen', ySplit: 1 }
      ];

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      logger.info(`Generated Excel file with ${testPoints.length} test points`);
      
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Failed to generate Excel file:', error);
      throw new Error('Failed to generate Excel file');
    }
  }

  getExcelFilename(type: 'test-cases' | 'test-points' | 'defects', options?: { projectName?: string; systemName?: string }): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day} ${hours}${minutes}${seconds}`;

    if (type === 'defects') {
      const prefix = options?.projectName || options?.systemName || '';
      const name = prefix ? `${prefix}问题列表` : '问题列表';
      return `${name} - ${timestamp}.xlsx`;
    }

    return `${type}-${timestamp.replace(/[: ]/g, '-')}.xlsx`;
  }

  async generateDefectsExcel(defects: DefectItem[], queryInfo?: {
    projectName?: string;
    systemName?: string;
    statusName?: string;
    priorityName?: string;
    timeRange?: string;
    isMyTodo?: boolean;
  }): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('问题列表');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: '主题', key: 'subject', width: 75 },
        { header: '状态', key: 'status_name', width: 12 },
        { header: '优先级', key: 'priority_name', width: 10 },
        { header: '系统/模块', key: 'system_module_name', width: 20 },
        { header: '分配给', key: 'assigned_to_name', width: 12 },
        { header: '创建时间', key: 'created_on', width: 20 },
        { header: '更新时间', key: 'updated_on', width: 20 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = {
        name: '微软雅黑',
        bold: true,
        size: 12,
        color: { argb: 'FFFFFFFF' }
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };

      const statusColors: Record<string, { bg: string; font: string }> = {
        '新建': { bg: 'FFDBEEF4', font: 'FF1F4E79' },
        '进行中': { bg: 'FFFFF2CC', font: 'FF806000' },
        '已解决': { bg: 'FFC6EFCE', font: 'FF006100' },
        '已关闭': { bg: 'FFE2EFDA', font: 'FF375623' },
        '重新打开': { bg: 'FFFFC7CE', font: 'FF9C0006' },
      };

      const priorityColors: Record<string, { bg: string; font: string }> = {
        '紧急': { bg: 'FFFFC7CE', font: 'FF9C0006' },
        '高': { bg: 'FFFFEB9C', font: 'FF9C5700' },
        '普通': { bg: 'FFFFFFFF', font: 'FF000000' },
        '低': { bg: 'FFF2F2F2', font: 'FF595959' },
      };

      defects.forEach((defect, index) => {
        const row = worksheet.addRow({
          id: defect.id,
          subject: defect.subject,
          status_name: defect.status_name || '',
          priority_name: defect.priority_name || '',
          system_module_name: defect.system_module_name || '',
          assigned_to_name: (defect as any).assigned_to_name || '',
          created_on: this.formatDateTime(defect.created_on),
          updated_on: this.formatDateTime(defect.updated_on),
        });

        row.font = { name: '微软雅黑', size: 11 };

        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        }

        row.getCell('id').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('subject').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        row.getCell('status_name').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('priority_name').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('system_module_name').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('assigned_to_name').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('created_on').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('updated_on').alignment = { horizontal: 'center', vertical: 'middle' };

        const statusCell = row.getCell('status_name');
        const statusStyle = statusColors[defect.status_name];
        if (statusStyle) {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: statusStyle.bg }
          };
          statusCell.font = { name: '微软雅黑', size: 11, color: { argb: statusStyle.font }, bold: true };
        }

        const priorityCell = row.getCell('priority_name');
        const priorityStyle = priorityColors[defect.priority_name];
        if (priorityStyle) {
          priorityCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: priorityStyle.bg }
          };
          priorityCell.font = { name: '微软雅黑', size: 11, color: { argb: priorityStyle.font } };
        }
      });

      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 8 }
      };

      worksheet.views = [
        { state: 'frozen', ySplit: 1 }
      ];

      if (queryInfo) {
        const infoSheet = workbook.addWorksheet('查询信息');
        infoSheet.columns = [
          { header: '查询条件', key: 'field', width: 15 },
          { header: '值', key: 'value', width: 30 },
        ];

        const infoData = [
          { field: '导出时间', value: new Date().toLocaleString('zh-CN') },
          { field: '记录总数', value: `${defects.length} 条` },
        ];

        if (queryInfo.projectName) infoData.push({ field: '项目', value: queryInfo.projectName });
        if (queryInfo.systemName) infoData.push({ field: '系统', value: queryInfo.systemName });
        if (queryInfo.statusName) infoData.push({ field: '状态', value: queryInfo.statusName });
        if (queryInfo.priorityName) infoData.push({ field: '优先级', value: queryInfo.priorityName });
        if (queryInfo.timeRange) infoData.push({ field: '时间范围', value: queryInfo.timeRange });

        infoSheet.addRows(infoData);

        const infoHeaderRow = infoSheet.getRow(1);
        infoHeaderRow.font = {
          name: '微软雅黑',
          bold: true,
          size: 11,
          color: { argb: 'FFFFFFFF' }
        };
        infoHeaderRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF70AD47' }
        };
        infoHeaderRow.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };

        infoSheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            row.font = { name: '微软雅黑', size: 11 };
          }
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      logger.info(`Generated defects Excel file with ${defects.length} records`);
      
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Failed to generate defects Excel file:', error);
      throw new Error('Failed to generate defects Excel file');
    }
  }

  private formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

export default new ExcelService();