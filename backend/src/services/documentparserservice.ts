import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import notificationService from './notificationService';

const md = new MarkdownIt();

export interface ChapterNode {
  id: string;
  title: string;
  level: number;
  content?: string;
  wordCount?: number;
  children: ChapterNode[];
}

export interface DocumentParseResult {
  documentId: string;
  title: string;
  totalPages?: number;
  totalWordCount: number;
  chapters: ChapterNode[];
  rawText: string;
  metadata: {
    author?: string;
    version?: string;
    [key: string]: any;
  };
}

/**
 * 文档解析服务
 * 支持PDF、DOCX、Markdown格式文档的解析
 */
export class DocumentParserService {
  /**
   * 解析文档
   */
  async parseDocument(filePath: string, originalName: string, sessionId?: string): Promise<DocumentParseResult> {
    const documentId = uuidv4();
    const fileType = this.getFileType(originalName);

    logger.info('document_parser', 'start_parsing', {
      documentId,
      originalName,
      fileType,
    });

    // 发送处理日志：识别到文件格式
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: `识别到 ${fileType.toUpperCase()} 格式文档`,
        details: `开始解析文档内容...`,
        step: 'document_format_recognized',
      });
    }

    try {
      let result: DocumentParseResult;

      switch (fileType) {
        case 'pdf':
          logger.info('【文档解析】正在解析PDF格式文档', { documentId, originalName });
          if (sessionId) {
            notificationService.notifyProcessingLog(sessionId, {
              level: 'info',
              message: '正在解析 PDF 文档',
              details: '提取文本内容和页面信息...',
              step: 'pdf_parsing',
            });
          }
          result = await this.parsePDF(filePath, documentId, sessionId);
          break;
        case 'docx':
          logger.info('【文档解析】正在解析DOCX格式文档', { documentId, originalName });
          if (sessionId) {
            notificationService.notifyProcessingLog(sessionId, {
              level: 'info',
              message: '正在解析 Word 文档',
              details: '提取文本和章节结构...',
              step: 'docx_parsing',
            });
          }
          result = await this.parseDOCX(filePath, documentId, sessionId);
          break;
        case 'md':
          logger.info('【文档解析】正在解析Markdown格式文档', { documentId, originalName });
          if (sessionId) {
            notificationService.notifyProcessingLog(sessionId, {
              level: 'info',
              message: '正在解析 Markdown 文档',
              details: '提取标题和章节结构...',
              step: 'md_parsing',
            });
          }
          result = await this.parseMarkdown(filePath, documentId, sessionId);
          break;
        case 'txt':
          logger.info('【文档解析】正在解析TXT格式文档', { documentId, originalName });
          if (sessionId) {
            notificationService.notifyProcessingLog(sessionId, {
              level: 'info',
              message: '正在解析 TXT 文档',
              details: '提取文本内容...',
              step: 'txt_parsing',
            });
          }
          result = await this.parseText(filePath, documentId, sessionId);
          break;
        default:
          logger.error('【文档解析】不支持的文件格式', { documentId, originalName, fileType });
          if (sessionId) {
            notificationService.notifyProcessingLog(sessionId, {
              level: 'error',
              message: '不支持的文件格式',
              details: `格式: ${fileType}，支持的格式: PDF, DOCX, MD, TXT`,
              step: 'document_format_error',
            });
          }
          throw new Error(`不支持的文件格式: ${fileType}`);
      }

      logger.info('document_parser', 'parsing_completed', {
        documentId,
        chapterCount: result.chapters.length,
        totalWordCount: result.totalWordCount,
      });

      // 发送处理日志：提取章节完成
      if (sessionId) {
        notificationService.notifyProcessingLog(sessionId, {
          level: 'success',
          message: `提取到 ${result.chapters.length} 个章节`,
          details: `总字数: ${result.totalWordCount}`,
          step: 'chapters_extracted',
        });
      }

      return result;
    } catch (error) {
      logger.error('document_parser', 'parsing_failed', error, {
        documentId,
        originalName,
      });
      logger.error('【文档解析】文档解析失败，请检查文件格式或文件是否损坏', {
        documentId,
        originalName,
        fileType,
        error: error instanceof Error ? error.message : '未知错误',
      });
      if (sessionId) {
        notificationService.notifyProcessingLog(sessionId, {
          level: 'error',
          message: '文档解析失败',
          details: error instanceof Error ? error.message : '未知错误',
          step: 'document_parse_error',
        });
      }
      throw error;
    }
  }

  /**
   * 解析PDF文档
   */
  private async parsePDF(filePath: string, documentId: string, sessionId?: string): Promise<DocumentParseResult> {
    logger.info('【文档解析】开始解析PDF文档', { documentId, filePath });
    
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在读取 PDF 文件内容...',
        step: 'pdf_reading',
      });
    }
    
    const buffer = await fs.readFile(filePath);
    
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在提取 PDF 文本...',
        step: 'pdf_text_extraction',
      });
    }
    
    const pdfData = await pdfParse(buffer);

    const text = pdfData.text;
    const lines = text.split('\n').filter((line: string) => line.trim());

    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: `PDF 共 ${pdfData.numpages} 页，正在提取章节结构...`,
        step: 'pdf_chapter_extraction',
      });
    }

    // 提取章节结构
    const chapters = this.extractChaptersFromText(lines, text);

    logger.info('【文档解析】PDF文档解析完成', { documentId, pageCount: pdfData.numpages, wordCount: this.countWords(text) });
    return {
      documentId,
      title: (pdfData as any).info?.Title || path.basename(filePath, path.extname(filePath)),
      totalPages: pdfData.numpages,
      totalWordCount: this.countWords(text),
      chapters,
      rawText: text,
      metadata: {
        author: (pdfData as any).info?.Author || undefined,
        version: (pdfData as any).info?.Version || undefined,
      },
    };
  }

  /**
   * 解析DOCX文档
   */
  private async parseDOCX(filePath: string, documentId: string, sessionId?: string): Promise<DocumentParseResult> {
    logger.info('【文档解析】开始解析DOCX文档', { documentId, filePath });
    
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在读取 Word 文档内容...',
        step: 'docx_reading',
      });
    }
    
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;

    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在提取 Word 文档章节结构...',
        step: 'docx_chapter_extraction',
      });
    }

    // 尝试从HTML结构提取更好的章节信息
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const chapters = this.extractChaptersFromHTML(htmlResult.value, text);

    logger.info('【文档解析】DOCX文档解析完成', { documentId, wordCount: this.countWords(text) });
    return {
      documentId,
      title: path.basename(filePath, path.extname(filePath)),
      totalWordCount: this.countWords(text),
      chapters,
      rawText: text,
      metadata: {},
    };
  }

  /**
   * 解析Markdown文档
   */
  private async parseMarkdown(filePath: string, documentId: string, sessionId?: string): Promise<DocumentParseResult> {
    logger.info('【文档解析】开始解析Markdown文档', { documentId, filePath });
    
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在读取 Markdown 文件内容...',
        step: 'md_reading',
      });
    }
    
    const text = await fs.readFile(filePath, 'utf-8');

    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在提取 Markdown 标题和章节结构...',
        step: 'md_chapter_extraction',
      });
    }

    const chapters = this.extractChaptersFromMarkdown(text);

    logger.info('【文档解析】Markdown文档解析完成', { documentId, wordCount: this.countWords(text) });
    return {
      documentId,
      title: this.extractMarkdownTitle(text) || path.basename(filePath, path.extname(filePath)),
      totalWordCount: this.countWords(text),
      chapters,
      rawText: text,
      metadata: {},
    };
  }

  /**
   * 解析纯文本文档
   */
  private async parseText(filePath: string, documentId: string, sessionId?: string): Promise<DocumentParseResult> {
    logger.info('【文档解析】开始解析TXT文档', { documentId, filePath });
    
    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在读取 TXT 文件内容...',
        step: 'txt_reading',
      });
    }
    
    const text = await fs.readFile(filePath, 'utf-8');
    const lines = text.split('\n').filter(line => line.trim());

    if (sessionId) {
      notificationService.notifyProcessingLog(sessionId, {
        level: 'info',
        message: '正在分析 TXT 文档结构...',
        step: 'txt_structure_analysis',
      });
    }

    const chapters = this.extractChaptersFromText(lines, text);

    logger.info('【文档解析】TXT文档解析完成', { documentId, wordCount: this.countWords(text) });
    return {
      documentId,
      title: path.basename(filePath, path.extname(filePath)),
      totalWordCount: this.countWords(text),
      chapters,
      rawText: text,
      metadata: {},
    };
  }

  /**
   * 从文本中提取章节结构
   */
  private extractChaptersFromText(lines: string[], fullText: string): ChapterNode[] {
    const chapters: ChapterNode[] = [];
    const chapterPatterns = [
      /^第[一二三四五六七八九十\d]+章[\s、.．]/,
      /^\d+[\.、][\s]*/,
      /^[（(]\d+[)）][\s]*/,
    ];

    let currentChapter: ChapterNode | null = null;
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const isChapterLine = chapterPatterns.some(pattern => pattern.test(line.trim()));

      if (isChapterLine) {
        // 保存上一个章节
        if (currentChapter) {
          currentChapter.content = currentContent.join('\n');
          currentChapter.wordCount = this.countWords(currentChapter.content);
        }

        // 创建新章节
        currentChapter = {
          id: uuidv4(),
          level: this.detectLevel(line),
          title: line.trim(),
          children: [],
          wordCount: 0,
        };
        chapters.push(currentChapter);
        currentContent = [];
      } else if (currentChapter) {
        currentContent.push(line);
      }
    }

    // 保存最后一个章节
    if (currentChapter) {
      currentChapter.content = currentContent.join('\n');
      currentChapter.wordCount = this.countWords(currentChapter.content);
    }

    // 如果没有识别到章节，创建默认章节
    if (chapters.length === 0) {
      chapters.push({
        id: uuidv4(),
        level: 1,
        title: '全文',
        content: fullText,
        children: [],
        wordCount: this.countWords(fullText),
      });
    }

    return this.buildChapterTree(chapters);
  }

  /**
   * 从HTML中提取章节结构
   */
  private extractChaptersFromHTML(html: string, fullText: string): ChapterNode[] {
    const chapters: ChapterNode[] = [];

    // 匹配h1-h6标签
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]!);
      const title = this.stripHtmlTags(match[2]!).trim();

      chapters.push({
        id: uuidv4(),
        level,
        title,
        children: [],
        wordCount: 0,
      });
    }

    // 如果没有标题标签，回退到文本解析
    if (chapters.length === 0) {
      return this.extractChaptersFromText(fullText.split('\n'), fullText);
    }

    return this.buildChapterTree(chapters);
  }

  /**
   * 从Markdown中提取章节结构
   */
  private extractChaptersFromMarkdown(text: string): ChapterNode[] {
    const chapters: ChapterNode[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1]!.length;
        const title = headingMatch[2]!.trim();

        chapters.push({
          id: uuidv4(),
          level,
          title,
          children: [],
          wordCount: 0,
        });
      }
    }

    // 如果没有标题，创建默认章节
    if (chapters.length === 0) {
      chapters.push({
        id: uuidv4(),
        level: 1,
        title: '全文',
        content: text,
        children: [],
        wordCount: this.countWords(text),
      });
    }

    return this.buildChapterTree(chapters);
  }

  /**
   * 构建章节树
   */
  private buildChapterTree(chapters: ChapterNode[]): ChapterNode[] {
    const root: ChapterNode[] = [];
    const stack: ChapterNode[] = [];

    for (const chapter of chapters) {
      while (stack.length > 0 && stack[stack.length - 1]!.level >= chapter.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(chapter);
      } else {
        stack[stack.length - 1]!.children.push(chapter);
      }

      stack.push(chapter);
    }

    return root;
  }

  /**
   * 检测章节层级
   */
  private detectLevel(line: string): number {
    if (/^第[一二三四五六七八九十\d]+章/.test(line)) return 1;
    if (/^\d+[\.、]/.test(line)) return 2;
    if (/^[（(]\d+[)）]/.test(line)) return 3;
    return 1;
  }

  /**
   * 统计字数
   */
  private countWords(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }

  /**
   * 提取Markdown标题
   */
  private extractMarkdownTitle(text: string): string | undefined {
    const match = text.match(/^#\s+(.+)$/m);
    return match ? match[1]!.trim() : undefined;
  }

  /**
   * 去除HTML标签
   */
  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * 获取文件类型
   */
  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'docx':
      case 'doc':
        return 'docx';
      case 'md':
      case 'markdown':
        return 'md';
      case 'txt':
        return 'txt';
      default:
        return ext || 'unknown';
    }
  }
}

// 导出单例实例
export const documentParserService = new DocumentParserService();
export default documentParserService;
