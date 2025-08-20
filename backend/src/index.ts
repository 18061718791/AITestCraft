import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import config from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { corsMiddleware } from './middleware/cors';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import testRoutes from './routes/test';
// 若文件扩展名缺失导致找不到模块，尝试添加 .ts 扩展名
import healthRoutes from './routes/health';
// 若文件扩展名缺失导致找不到模块，尝试添加 .ts 扩展名
import { setupSocketHandlers } from './services/notificationService';


const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: config.websocket.cors,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(loggingMiddleware);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/test', testRoutes);

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
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  logger.info(`CORS origin: ${config.cors.origin}`);
});

export { app, server, io };