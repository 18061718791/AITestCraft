import express from 'express';
import { shortcutService } from '../services/shortcutService';

const router = express.Router();

router.get('/shortcuts', async (req, res) => {
  try {
    const shortcuts = await shortcutService.getShortcuts();
    
    return res.status(200).json({
      success: true,
      data: shortcuts
    });
  } catch (error) {
    console.error('获取快捷键配置失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取快捷键配置失败'
    });
  }
});

router.post('/shortcuts', async (req, res) => {
  try {
    const { shortcuts } = req.body;
    
    if (!shortcuts) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    const result = await shortcutService.saveShortcuts(shortcuts);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: '快捷键配置已保存'
    });
  } catch (error) {
    console.error('保存快捷键配置失败:', error);
    return res.status(500).json({
      success: false,
      error: '保存快捷键配置失败'
    });
  }
});

router.post('/shortcuts/reset', async (req, res) => {
  try {
    const shortcuts = await shortcutService.resetShortcuts();
    
    return res.status(200).json({
      success: true,
      data: shortcuts,
      message: '快捷键配置已重置为默认值'
    });
  } catch (error) {
    console.error('重置快捷键配置失败:', error);
    return res.status(500).json({
      success: false,
      error: '重置快捷键配置失败'
    });
  }
});

router.get('/shortcuts/enabled', async (req, res) => {
  try {
    const enabled = await shortcutService.getShortcutEnabled();
    
    return res.status(200).json({
      success: true,
      data: { enabled }
    });
  } catch (error) {
    console.error('获取快捷键启用状态失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取快捷键启用状态失败'
    });
  }
});

router.post('/shortcuts/enabled', async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: '参数类型错误'
      });
    }
    
    const result = await shortcutService.setShortcutEnabled(enabled);
    
    return res.status(200).json({
      success: true,
      data: { enabled: result },
      message: '快捷键启用状态已更新'
    });
  } catch (error) {
    console.error('设置快捷键启用状态失败:', error);
    return res.status(500).json({
      success: false,
      error: '设置快捷键启用状态失败'
    });
  }
});

export default router;
