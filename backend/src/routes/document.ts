import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { documentParserService } from '../services/documentparserservice';
import testService from '../services/testService';
import notificationService from '../services/notificationService';

const router = Router();

// 内存存储，用于临时保存解析的文档
const parsedDocuments = new Map<string, any>();

// 配置multer存储
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    // 修复中文文件名乱码：将 Latin-1 编码的 originalname 转换为 UTF-8
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueName = `${uuidv4()}${path.extname(originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    // 修复中文文件名乱码
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const allowedTypes = ['.pdf', '.docx', '.doc', '.md', '.txt'];
    const ext = path.extname(originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'));
    }
  },
});

// 文档上传并解析接口
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: '没有上传文件',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 修复中文文件名乱码
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const sessionId = req.body.sessionId as string | undefined;

    logger.info('Document uploaded, starting parse', {
      originalName: originalName,
      filename: req.file.filename,
      size: req.file.size,
      sessionId: sessionId || 'none',
    });

    // 如果有sessionId，发送处理日志
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: `开始上传文档: ${originalName}`,
        details: `文件大小: ${(req.file.size / 1024).toFixed(1)} KB`,
        step: 'document_upload_start',
      });
    }

    // 发送处理日志：开始解析
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在识别文档格式...',
        details: `文件名: ${originalName}`,
        step: 'document_format_detection',
      });
    }

    // 解析文档
    const parseResult = await documentParserService.parseDocument(
      req.file.path,
      originalName,
      sessionId
    );

    // 保存解析结果到内存
    parsedDocuments.set(parseResult.documentId, parseResult);

    // 转换章节数据为前端需要的树形结构
    const chapters = parseResult.chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      level: chapter.level,
      children: chapter.children?.map(child => ({
        id: child.id,
        title: child.title,
        level: child.level,
        children: child.children?.map(grandChild => ({
          id: grandChild.id,
          title: grandChild.title,
          level: grandChild.level,
        })) || [],
      })) || [],
    }));

    // 发送处理日志：解析完成
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'success',
        message: '文档解析完成',
        details: `共 ${parseResult.totalWordCount} 字，${chapters.length} 个章节`,
        step: 'document_parse_complete',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        documentId: parseResult.documentId,
        filename: req.file.filename,
        originalName: originalName,
        size: req.file.size,
        title: parseResult.title,
        totalPages: parseResult.totalPages,
        totalWordCount: parseResult.totalWordCount,
        chapters: chapters,
        message: '文件上传并解析成功',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Document upload/parse error:', error);
    const sessionId = req.body.sessionId as string | undefined;
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'error',
        message: '文档解析失败',
        details: error instanceof Error ? error.message : '未知错误',
        step: 'document_parse_failed',
      });
    }
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: '文件解析失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// 获取文档章节接口
router.get('/:documentId/chapters', (req: Request, res: Response): void => {
  try {
    const { documentId } = req.params;
    const document = parsedDocuments.get(documentId!);

    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '文档不存在或已过期',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const chapters = document.chapters.map((chapter: any) => ({
      id: chapter.id,
      title: chapter.title,
      level: chapter.level,
      children: chapter.children?.map((child: any) => ({
        id: child.id,
        title: child.title,
        level: child.level,
        children: child.children?.map((grandChild: any) => ({
          id: grandChild.id,
          title: grandChild.title,
          level: grandChild.level,
        })) || [],
      })) || [],
    }));

    res.status(200).json({
      success: true,
      data: {
        documentId,
        title: document.title,
        chapters,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get chapters error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取章节失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// 基于文档生成测试点
router.post('/generate-points', async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId, chapterIds, parseMode, sessionId, system, module, scenario, provider, model } = req.body;

    if (!documentId || !sessionId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必要参数：documentId 或 sessionId',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const document = parsedDocuments.get(documentId);
    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '文档不存在或已过期',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 根据章节ID获取内容
    let selectedContent = '';
    let selectedChapters: string[] = [];

    if (parseMode === 'chapters' && chapterIds && chapterIds.length > 0) {
      // 从章节ID获取内容
      const findChapterContent = (chapters: any[], ids: string[]): { content: string; titles: string[] } => {
        let content = '';
        let titles: string[] = [];
        
        for (const chapter of chapters) {
          if (ids.includes(chapter.id)) {
            content += `${chapter.title}\n${chapter.content || ''}\n\n`;
            titles.push(chapter.title);
          }
          if (chapter.children && chapter.children.length > 0) {
            const childResult = findChapterContent(chapter.children, ids);
            content += childResult.content;
            titles.push(...childResult.titles);
          }
        }
        return { content, titles };
      };
      
      const result = findChapterContent(document.chapters, chapterIds);
      selectedContent = result.content;
      selectedChapters = result.titles;
    } else {
      // 使用全文
      selectedContent = document.rawText;
      selectedChapters = ['全文'];
    }

    logger.info('Generating points from document', {
      documentId,
      sessionId,
      parseMode,
      chapterCount: chapterIds?.length || 'full',
      contentLength: selectedContent.length,
    });

    // 构建需求描述
    const requirement = `
基于以下${parseMode === 'chapters' ? '选中章节' : '文档内容'}生成测试点：
${selectedChapters.length > 0 ? `章节：${selectedChapters.join('、')}` : ''}

文档内容：
${selectedContent.substring(0, 8000)}

${selectedContent.length > 8000 ? '... (内容已截断)' : ''}
    `.trim();

    // 调用 testService 生成测试点
    const taskId = await testService.generateTestPoints(
      requirement,
      sessionId,
      system || '文档测试',
      module || document.title,
      scenario || (parseMode === 'chapters' ? '指定章节' : '全文'),
      provider,
      model
    );

    res.status(200).json({
      success: true,
      data: {
        taskId: taskId,
        message: '测试点生成任务已启动',
        status: 'processing',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Generate points from document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '生成测试点失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
