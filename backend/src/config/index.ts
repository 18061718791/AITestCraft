import dotenv from 'dotenv';
import path from 'path';

// 确保从 backend 目录加载 .env，无论从哪里启动
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  server: {
    port: parseInt(process.env['PORT'] || '9000', 10),
    nodeEnv: process.env['NODE_ENV'] || 'development',
  },
  deepseek: {
    apiKey: process.env['DEEPSEEK_API_KEY'] || process.env['LLM_API_KEY'] || 'sk-c147b25dfb42489d930739e989a343ff',
    apiUrl: process.env['DEEPSEEK_API_URL'] || process.env['LLM_BASE_URL'] || 'https://api.deepseek.com/v1',
    modelType: process.env['LLM_TYPE'] || 'deepseek-chat',
    timeout: parseInt(process.env['LLM_TIMEOUT'] || '120000'), // 增加到120秒
    maxRetries: parseInt(process.env['LLM_MAX_RETRIES'] || '3'), // 减少重试次数
    retryDelay: parseInt(process.env['LLM_RETRY_DELAY'] || '2000'),
  },
  opencodeGo: {
    apiKey: process.env['OPENCODE_GO_API_KEY'] || '',
    baseURL: 'https://opencode.ai/zen/go/v1',
    visionModel: 'kimi-k2.6',
    timeout: 120000,
  },
  cors: {
    origin: process.env['NODE_ENV'] === 'production' 
      ? (process.env['FRONTEND_URL'] ? [process.env['FRONTEND_URL']] : ['http://120.55.187.125:5175', 'http://localhost:3000', 'http://localhost:5178', 'http://120.55.187.125:5178'])
      : ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000', 'http://localhost:5000', 'https://*.ngrok.io', 'https://*.ngrok-free.app', 'http://120.55.187.125:5175', 'http://10.20.42.172:5175', 'http://10.20.42.172:5000', 'http://localhost:5178', 'http://120.55.187.125:5178'],
    credentials: true,
  },
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000', 10),
    max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  },
  websocket: {
    cors: {
      origin: process.env['NODE_ENV'] === 'production' 
        ? (process.env['FRONTEND_URL'] ? [process.env['FRONTEND_URL']] : ['http://120.55.187.125:5175', 'http://localhost:3000', 'http://localhost:5178', 'http://120.55.187.125:5178'])
        : ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000', 'http://localhost:5000', 'https://*.ngrok.io', 'https://*.ngrok-free.app', 'http://120.55.187.125:5175', 'http://10.20.42.172:5175', 'http://10.20.42.172:5000', 'http://localhost:5178', 'http://120.55.187.125:5178'],
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
  },
};

export default config;