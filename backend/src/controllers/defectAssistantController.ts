import { Request, Response } from 'express';
import defectAssistantService from '../services/defectAssistant/DefectAssistantService';
import excelService from '../services/excelService';
import logger from '../utils/logger';

export const processQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, context } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        message: '请输入有效的查询内容',
        resultType: 'guide'
      });
      return;
    }

    logger.info('DefectAssistantController: Processing query', { query });

    const result = await defectAssistantService.processQuery({ query, context });

    res.json(result);
  } catch (error) {
    logger.error('DefectAssistantController: Query processing error', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试',
      resultType: 'guide'
    });
  }
};

export const getSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const suggestions = defectAssistantService.getSuggestions();
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('DefectAssistantController: Get suggestions error', error);
    res.status(500).json({
      success: false,
      message: '获取建议失败'
    });
  }
};

export const exportData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({
        success: false,
        message: '请提供查询内容'
      });
      return;
    }

    const result = await defectAssistantService.exportData(query);
    
    if (!result.success || !result.data?.list || result.data.list.length === 0) {
      res.json(result);
      return;
    }

    const queryInfo = {
      projectName: result.intent?.entities?.['projectName'],
      systemName: result.intent?.entities?.['systemName'],
      statusName: result.intent?.entities?.['statusName'],
      priorityName: result.intent?.entities?.['priorityName'],
      timeRange: result.intent?.entities?.['timeRange'],
      isMyTodo: result.intent?.entities?.['isMyTodo'],
    };

    const buffer = await excelService.generateDefectsExcel(result.data.list, queryInfo);
    
    let filename: string;
    if (queryInfo.isMyTodo) {
      filename = excelService.getExcelFilename('defects', { projectName: '我的待办' });
    } else {
      filename = excelService.getExcelFilename('defects', {
        projectName: queryInfo.projectName,
        systemName: queryInfo.systemName,
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (error) {
    logger.error('DefectAssistantController: Export error', error);
    res.status(500).json({
      success: false,
      message: '导出失败，请稍后重试'
    });
  }
};
