import express from 'express';
import { configService } from '../services/configService';
import { monitoringService } from '../services/monitoringService';

const router = express.Router();

// 配置管理路由
router.get('/configs', async (req, res) => {
  try {
    const { type } = req.query;
    let configs;
    
    if (type) {
      configs = await configService.getConfigsByType(type as string);
    } else {
      configs = await configService.getAllConfigs();
    }
    
    return res.status(200).json({
      success: true,
      data: configs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: '获取配置失败'
    });
  }
});

router.get('/configs/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const config = await configService.getConfigByKey(key);
    
    if (config) {
      return res.status(200).json({
        success: true,
        data: config
      });
    } else {
      return res.status(404).json({
        success: false,
        error: '配置不存在'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: '获取配置失败'
    });
  }
});

router.post('/configs', async (req, res) => {
  try {
    const { key, value, type, description } = req.body;
    
    if (!key || !value || !type) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    const config = await configService.createOrUpdateConfig(
      key,
      value,
      type,
      description
    );
    
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: '更新配置失败'
    });
  }
});

router.delete('/configs/:key', async (req, res) => {
  try {
    const { key } = req.params;
    await configService.deleteConfig(key);
    
    return res.status(200).json({
      success: true,
      message: '配置已删除'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: '删除配置失败'
    });
  }
});

router.post('/configs/initialize', async (req, res) => {
  try {
    const configs = await configService.generateInitialConfigs();
    
    return res.status(200).json({
      success: true,
      data: configs,
      message: '初始配置已生成'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: '生成初始配置失败'
    });
  }
});

// 监控指标路由
router.get('/metrics', async (req, res) => {
  try {
    const { startTime, endTime, type, limit } = req.query;
    
    if (startTime && endTime) {
      const metrics = await monitoringService.getMetricsByTimeRange(
        new Date(startTime as string),
        new Date(endTime as string),
        type as string
      );
      
      return res.status(200).json({
        success: true,
        data: metrics
      });
    } else if (limit) {
      const metrics = await monitoringService.getRecentMetrics(
        parseInt(limit as string),
        type as string
      );
      
      return res.status(200).json({
        success: true,
        data: metrics
      });
    } else {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: '获取监控指标失败'
    });
  }
});

router.get('/metrics/stats', async (req, res) => {
  try {
    const { type } = req.query;
    const stats = await monitoringService.getMetricsStats(type as string);
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in /metrics/stats:', error);
    return res.status(500).json({
      success: false,
      error: '获取监控统计失败',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/metrics/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    await monitoringService.cleanupOldMetrics(daysToKeep);
    
    return res.status(200).json({
      success: true,
      message: '过期监控数据已清理'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: '清理监控数据失败'
    });
  }
});

export default router;