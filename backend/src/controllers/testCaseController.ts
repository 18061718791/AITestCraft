import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { TestCaseService } from '../services/testCaseService';
import { TemplateService } from '../services/templateService';
import { ExcelExportService } from '../services/ExcelExportService';
import { generateTestCaseExportFileName, generateTemplateFileName } from '../utils/fileNameUtils';

const testCaseService = new TestCaseService();
const templateService = new TemplateService();

export class TestCaseController {
  /**
   * 获取测试用例列表
   */
  async getTestCases(req: Request, res: Response): Promise<void> {
    try {
      const { systemId, moduleId, scenarioId } = req.query;
      
      const filters: { systemId?: number; moduleId?: number; scenarioId?: number } = {};
      
      if (systemId) filters.systemId = parseInt(systemId as string);
      if (moduleId) filters.moduleId = parseInt(moduleId as string);
      if (scenarioId) filters.scenarioId = parseInt(scenarioId as string);

      const testCases = await testCaseService.getTestCases(filters);
      res.json({
        success: true,
        data: testCases,
      });
    } catch (error) {
      console.error('获取测试用例列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取测试用例列表失败',
      });
    }
  }

  /**
   * 获取单个测试用例
   */
  async getTestCase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: '测试用例ID不能为空',
        });
        return;
      }
      const testCase = await testCaseService.getTestCase(parseInt(id));

      if (!testCase) {
        res.status(404).json({
          success: false,
          message: '测试用例不存在',
        });
        return;
      }

      res.json({
        success: true,
        data: testCase,
      });
    } catch (error) {
      console.error('获取测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: '获取测试用例失败',
      });
    }
  }

  /**
   * 创建测试用例
   */
  async createTestCase(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array(),
        });
        return;
      }

      const testCase = await testCaseService.createTestCase(req.body);
      res.status(201).json({
        success: true,
        data: testCase,
      });
    } catch (error) {
      console.error('创建测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: '创建测试用例失败',
      });
    }
  }

  /**
   * 更新测试用例
   */
  async updateTestCase(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: '测试用例ID不能为空',
        });
        return;
      }
      const testCase = await testCaseService.updateTestCase(parseInt(id), req.body);
      res.json({
        success: true,
        data: testCase,
      });
    } catch (error) {
      console.error('更新测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: '更新测试用例失败',
      });
    }
  }

  /**
   * 删除测试用例
   */
  async deleteTestCase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: '测试用例ID不能为空',
        });
        return;
      }
      await testCaseService.deleteTestCase(parseInt(id));
      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      console.error('删除测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: '删除测试用例失败',
      });
    }
  }

  /**
   * 从测试助手保存测试用例
   */
  async saveFromTestAssistant(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array(),
        });
        return;
      }

      const { scenarioId, testCases } = req.body;
      const createdTestCases = await testCaseService.saveFromTestAssistant(scenarioId, testCases);
      
      res.status(201).json({
        success: true,
        data: createdTestCases,
        message: `成功保存 ${createdTestCases.length} 个测试用例`,
      });
    } catch (error: any) {
      console.error('从测试助手保存测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '保存测试用例失败',
      });
    }
  }

  /**
   * 下载测试用例导入模板
   */
  async downloadTemplate(_req: Request, res: Response): Promise<void> {
    try {
      const buffer = await templateService.createExcelTemplate();
      const filename = generateTemplateFileName();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error('生成模板文件失败:', error);
      res.status(500).json({
        success: false,
        message: '生成模板文件失败',
      });
    }
  }

  /**
   * 批量导出测试用例
   */
  async batchExport(req: Request, res: Response): Promise<void> {
    try {
      const { testCaseIds } = req.body;

      // 参数验证
      if (!Array.isArray(testCaseIds) || testCaseIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '请选择要导出的测试用例',
        });
        return;
      }

      if (testCaseIds.length > 500) {
        res.status(400).json({
          success: false,
          message: '一次最多导出500个测试用例',
        });
        return;
      }

      if (!testCaseIds.every(id => typeof id === 'number' && id > 0)) {
        res.status(400).json({
          success: false,
          message: '测试用例ID必须是正整数',
        });
        return;
      }

      // 获取测试用例数据
      const testCases = await testCaseService.getTestCasesForExport(testCaseIds);

      if (testCases.length === 0) {
        res.status(404).json({
          success: false,
          message: '未找到选中的测试用例',
        });
        return;
      }

      // 生成Excel文件
      const excelService = new ExcelExportService();
      const buffer = await excelService.generateTestCasesExcel(testCases);

      // 设置响应头
      const filename = generateTestCaseExportFileName();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error('批量导出测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: '导出失败，请稍后重试',
      });
    }
  }

  /**
   * 按层级获取测试用例（带分页）
   */
  async getTestCasesByHierarchy(req: Request, res: Response) {
    try {
      const {
        systemId,
        moduleId,
        scenarioId,
        page = 1,
        limit = 20
      } = req.query;

      // 验证分页参数
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      // 验证ID参数
      const params: any = {
        page: pageNum,
        limit: limitNum,
      };

      if (systemId && !isNaN(parseInt(systemId as string))) {
        params.systemId = parseInt(systemId as string);
      }
      if (moduleId && !isNaN(parseInt(moduleId as string))) {
        params.moduleId = parseInt(moduleId as string);
      }
      if (scenarioId && !isNaN(parseInt(scenarioId as string))) {
        params.scenarioId = parseInt(scenarioId as string);
      }

      const result = await testCaseService.getTestCasesByHierarchy(params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取层级测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: '获取测试用例失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }
}

// 验证规则
export const createTestCaseValidation = [
  body('title').notEmpty().withMessage('标题不能为空'),
  body('preconditions').notEmpty().withMessage('前置条件不能为空'),
  body('steps').notEmpty().withMessage('测试步骤不能为空'),
  body('expectedResult').notEmpty().withMessage('预期结果不能为空'),
  body('status').optional().isIn(['PENDING', 'PASSED', 'FAILED', 'SKIPPED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
];

export const updateTestCaseValidation = [
  body('title').optional().notEmpty().withMessage('标题不能为空'),
  body('preconditions').optional().notEmpty().withMessage('前置条件不能为空'),
  body('steps').optional().notEmpty().withMessage('测试步骤不能为空'),
  body('expectedResult').optional().notEmpty().withMessage('预期结果不能为空'),
  body('status').optional().isIn(['PENDING', 'PASSED', 'FAILED', 'SKIPPED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
];

export const saveFromAssistantValidation = [
  body('scenarioId').isInt({ min: 1 }).withMessage('场景ID必须是正整数'),
  body('testCases').isArray().withMessage('测试用例必须是数组'),
  body('testCases.*.title').notEmpty().withMessage('测试用例标题不能为空'),
  body('testCases.*.preconditions').notEmpty().withMessage('前置条件不能为空'),
  body('testCases.*.steps').notEmpty().withMessage('测试步骤不能为空'),
  body('testCases.*.expectedResult').notEmpty().withMessage('预期结果不能为空'),
  body('testCases.*.tags').optional().isArray().withMessage('标签必须是数组'),
];