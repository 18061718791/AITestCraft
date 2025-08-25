import ExcelJS from 'exceljs';
import logger from '../utils/logger';

import { TestCase } from '../types';

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
            ? testCase.expected_results.join('\n')
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

  getExcelFilename(type: 'test-cases' | 'test-points'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${type}-${timestamp}.xlsx`;
  }
}

export default new ExcelService();