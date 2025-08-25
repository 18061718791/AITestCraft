import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env['PORT'] || '9000', 10),
    nodeEnv: process.env['NODE_ENV'] || 'development',
  },
  deepseek: {
    apiKey: process.env['DEEPSEEK_API_KEY'] || 'sk-c147b25dfb42489d930739e989a343ff',
    apiUrl: process.env['DEEPSEEK_API_URL'] || 'https://api.deepseek.com/v1',
    timeout: 60000,
    maxRetries: 5,
    retryDelay: 2000,
  },
  cors: {
    origin: process.env['NODE_ENV'] === 'production' 
      ? process.env['FRONTEND_URL'] || 'http://localhost:3000'
      : ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000'],
    credentials: true,
  },
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000', 10),
    max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  },
  websocket: {
    cors: {
      origin: process.env['NODE_ENV'] === 'production'
        ? process.env['FRONTEND_URL'] || 'http://localhost:3000'
        : ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
    },
  },
};

export default config;