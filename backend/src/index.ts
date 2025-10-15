import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import config from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { corsMiddleware } from './middleware/cors';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import testRoutes from './routes/test';
import healthRoutes from './routes/health';
import promptRoutes from './routes/prompts';
import systemRoutes from './routes/system';
import testCaseRoutes from './routes/testCaseRoutes';
import batchRoutes from './routes/batchRoutes';
// 若文件扩展名缺失导致找不到模块，尝试添加 .ts 扩展名
import { setupSocketHandlers } from './services/notificationService';


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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(loggingMiddleware);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/test', testRoutes);
app.use('/api', promptRoutes);
app.use('/api/system', systemRoutes);
app.use('/api', testCaseRoutes);
app.use('/api', batchRoutes);

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
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  logger.info(`CORS origin: ${config.cors.origin}`);
  logger.info(`Server bound to: 0.0.0.0 (all interfaces)`);
});

export { app, server, io };