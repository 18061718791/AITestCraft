import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import config from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { corsMiddleware } from './middleware/cors';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import testRoutes from './routes/test';
import healthRoutes from './routes/health';
import promptRoutes from './routes/prompts';
import systemRoutes from './routes/system';
import adminRoutes from './routes/systemRoutes';
import testCaseRoutes from './routes/testCaseRoutes';
import batchRoutes from './routes/batchRoutes';
import defectRoutes from './routes/defectRoutes';
import projectRoutes from './routes/projectRoutes';
import defectAssistantRoutes from './routes/defectAssistantRoutes';
import notificationRoutes from './routes/notificationRoutes';
import shortcutRoutes from './routes/shortcutRoutes';
import appConfigRoutes from './routes/appConfigRoutes';
import deploymentTaskRoutes from './routes/deploymentTaskRoutes';
import webhookRoutes from './routes/webhookRoutes';
import llmConfigRoutes from './routes/llmConfigRoutes';
import qualityRoutes from './routes/qualityRoutes';
import documentRoutes from './routes/document';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import uploadRoutes from './routes/uploadRoutes';
import redmineUserRoutes from './routes/redmineUserRoutes';
// import initDatabase from './utils/initDatabase';
// 若文件扩展名缺失导致找不到模块，尝试添加 .ts 扩展名
import { setupSocketHandlers } from './services/notificationService';
import { serverChanService } from './services/serverChanService';


const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.websocket.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-session-id']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 60000, // 增加连接超时时间
  upgradeTimeout: 45000, // 增加升级超时时间
  allowEIO3: true, // 兼容旧版本
  // 增加握手兼容性
  allowRequest: (_req, callback) => {
    // 允许所有请求，但可以在这里添加认证逻辑
    callback(null, true);
  },
  // 增加WebSocket握手稳定性
  perMessageDeflate: {
    threshold: 1024, // 只有消息大于1KB时才压缩
  },
  // 增加连接限制
  maxHttpBufferSize: 1e6, // 1MB
  // 增加传输配置
  transports: ['websocket', 'polling']
});

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(loggingMiddleware);

// 静态文件服务 - 上传的文件
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 系统监控中间件
app.use(async (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  // 重写send方法，在响应时记录指标
  res.send = function(body) {
    const duration = Date.now() - start;
    
    // 异步记录API响应时间
    (async () => {
      try {
        const { monitoringService } = await import('./services/monitoringService');
        await monitoringService.recordApiResponseTime(
          req.path,
          duration,
          req.method,
          res.statusCode
        );
      } catch (error) {
        // 监控服务出错不影响主请求
        logger.warn('Failed to record API metric', error);
      }
    })();
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/test', testRoutes);
app.use('/api', promptRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', testCaseRoutes);
app.use('/api', batchRoutes);
app.use('/api', projectRoutes);
app.use('/api/defects', defectRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/defect-assistant', defectAssistantRoutes);
app.use('/api', shortcutRoutes);
app.use('/api/app-configs', appConfigRoutes);
app.use('/api/deployment-tasks', deploymentTaskRoutes);
app.use('/api/llm', llmConfigRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/redmine-users', redmineUserRoutes);
app.use('/webhooks', webhookRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Socket.IO setup
setupSocketHandlers(io);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const PORT = config.server.port;
server.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  logger.info(`CORS origin: ${config.cors.origin}`);
  logger.info(`Server bound to: 0.0.0.0 (all interfaces)`);

  // 数据库初始化已通过Prisma迁移完成

  // 从配置服务加载数据库配置
  try {
    const { loadConfigFromService } = await import('./utils/database');
    const { loadMysqlConfigFromService } = await import('./utils/mysqlDatabase');
    
    await loadConfigFromService();
    await loadMysqlConfigFromService();
    
    logger.info('Database configurations loaded from service');
  } catch (error) {
    logger.warn('Failed to load database configurations from service, using environment variables', error);
  }

  // 生成初始配置数据
  try {
    const { configService } = await import('./services/configService');
    await configService.generateInitialConfigs();
    logger.info('Initial configurations generated successfully');
  } catch (error) {
    logger.warn('Failed to generate initial configurations', error);
  }

  // 初始化LLM Provider工厂
  try {
    const { LLMProviderFactory } = await import('./services/llm/providerFactory');
    LLMProviderFactory.initialize();
    logger.info('LLM Provider factory initialized');
  } catch (error) {
    logger.warn('Failed to initialize LLM Provider factory', error);
  }

  // 从配置服务加载大模型配置（向后兼容）
  try {
    const deepseekService = await import('./services/deepseekService');
    await deepseekService.default.loadConfigFromService();
    logger.info('Legacy LLM configurations loaded from service');
  } catch (error) {
    logger.warn('Failed to load legacy LLM configurations from service', error);
  }

  // 启动Server酱定时任务
  serverChanService.startScheduledTasks();

  // 启动系统资源监控定时任务
  startSystemMonitoring();
});

// 系统资源监控定时任务
let monitoringInterval: NodeJS.Timeout | null = null;

function startSystemMonitoring() {
  // 每30秒收集一次系统资源数据
  monitoringInterval = setInterval(async () => {
    try {
      const { monitoringService } = await import('./services/monitoringService');
      
      // 收集内存使用数据
      const memoryUsage = process.memoryUsage();
      await monitoringService.recordMemoryUsage(Math.round(memoryUsage.heapUsed / 1024 / 1024)); // MB
      
      // 收集CPU使用数据
      const cpuUsage = process.cpuUsage();
      // 将微秒转换为百分比（相对于1秒）
      const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000000; // 转换为秒
      const cpuPercent = Math.min(Math.round(totalCpuTime * 10), 100); // 估算百分比，最大100%
      await monitoringService.recordCpuUsage(cpuPercent);
      
    } catch (error) {
      logger.warn('Failed to record system metrics', error);
    }
  }, 30000); // 30秒
  
  logger.info('System monitoring started (collecting every 30s)');
}

// 优雅关闭时清理定时器
process.on('SIGTERM', () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
});

process.on('SIGINT', () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
});

export { app, server, io };