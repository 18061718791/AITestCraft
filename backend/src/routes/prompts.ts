import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

const router = Router();
const PROMPTS_DIR = path.join(process.cwd(), '..', 'prompts');

// 提示词文件映射
const PROMPT_DESCRIPTIONS: Record<string, string> = {
  'generate_test_points.md': '生成测试点',
  'generate_test_cases.md': '生成测试用例',
};

/**
 * 获取所有提示词文件信息
 */
router.get('/prompts', async (_req, res) => {
  try {
    const files = await fs.readdir(PROMPTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    const prompts = mdFiles.map((filename, index) => ({
      id: index + 1,
      filename,
      description: PROMPT_DESCRIPTIONS[filename] || filename.replace('.md', ''),
      path: path.join(PROMPTS_DIR, filename)
    }));

    res.json({
      success: true,
      data: prompts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error reading prompts directory:', error);
    res.status(500).json({
      success: false,
      error: '无法读取提示词文件',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 获取单个提示词文件内容
 */
router.get('/prompts/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // 安全检查：只允许.md文件
    if (!filename.endsWith('.md')) {
      res.status(400).json({
        success: false,
        error: '不支持的文件类型',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const filePath = path.join(PROMPTS_DIR, filename);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      res.status(404).json({
        success: false,
        error: '文件不存在',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    
    res.json({
      success: true,
      data: {
        id: Object.keys(PROMPT_DESCRIPTIONS).indexOf(filename) + 1,
        filename,
        description: PROMPT_DESCRIPTIONS[filename] || filename.replace('.md', ''),
        content,
        path: filePath
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error reading prompt file:', error);
    res.status(500).json({
      success: false,
      error: '无法读取提示词文件',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 更新提示词文件内容
 */
router.put('/prompts/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { content } = req.body;
    
    // 安全检查
    if (!filename.endsWith('.md')) {
      res.status(400).json({
        success: false,
        error: '不支持的文件类型',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!content || typeof content !== 'string') {
      res.status(400).json({
        success: false,
        error: '内容不能为空',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const filePath = path.join(PROMPTS_DIR, filename);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      res.status(404).json({
        success: false,
        error: '文件不存在',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 写入文件
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`Prompt file updated: ${filename}`);
    
    res.json({
      success: true,
      message: '文件保存成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating prompt file:', error);
    res.status(500).json({
      success: false,
      error: '无法保存提示词文件',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;