import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BatchImportService } from '../services/batchImportService';
import { BatchDeleteService } from '../services/batchDeleteService';

const batchImportService = new BatchImportService();
const batchDeleteService = new BatchDeleteService();

export class BatchController {
  /**
   * 验证导入文件
   */
  async validateImportFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: '未上传文件',
        });
        return;
      }

      const validation = await batchImportService.validateFile(req.file);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('验证导入文件失败:', error);
      res.status(500).json({
        success: false,
        message: '验证导入文件失败',
      });
    }
  }

  /**
   * 批量导入测试用例
   */
  async importTestCases(req: Request, res: Response): Promise<void> {
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

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: '未上传文件',
        });
        return;
      }

      const { conflictStrategy = 'skip' } = req.body;
      
      const result = await batchImportService.importTestCases(
        req.file,
        conflictStrategy as 'skip' | 'overwrite' | 'new_version'
      );
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('批量导入测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '批量导入测试用例失败',
      });
    }
  }

  /**
   * 批量删除测试用例
   */
  async deleteTestCases(req: Request, res: Response): Promise<void> {
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

      const { ids } = req.body;
      
      const result = await batchDeleteService.deleteTestCases(ids);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('批量删除测试用例失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '批量删除测试用例失败',
      });
    }
  }

  /**
   * 获取导入进度
   */
  async getImportProgress(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      
      if (!jobId) {
        res.status(400).json({
          success: false,
          message: 'jobId不能为空',
        });
        return;
      }
      
      const progress = batchImportService.getImportProgress(jobId);
      
      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      console.error('获取导入进度失败:', error);
      res.status(500).json({
        success: false,
        message: '获取导入进度失败',
      });
    }
  }
}

// 验证规则
export const importValidation = [
  body('conflictStrategy')
    .optional()
    .isIn(['skip', 'overwrite', 'new_version'])
    .withMessage('冲突策略必须是skip、overwrite或new_version'),
];

export const deleteValidation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('ID列表不能为空数组')
    .custom((ids: any[]) => ids.every(id => typeof id === 'number' || !isNaN(Number(id))))
    .withMessage('所有ID必须是数字'),
];