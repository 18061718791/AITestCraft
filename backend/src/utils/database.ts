import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

// 默认配置（从环境变量）
let poolConfig: PoolConfig = {
  host: process.env['POSTGRES_HOST'] || 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
  user: process.env['POSTGRES_USER'] || 'postgres',
  password: process.env['POSTGRES_PASSWORD'] || 'postgres',
  database: process.env['POSTGRES_DATABASE'] || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 创建初始连接池
let pool = new Pool(poolConfig);

// 动态更新数据库配置
export const updateDatabaseConfig = async (newConfig: Partial<PoolConfig>) => {
  try {
    // 关闭现有连接池
    await pool.end();
    
    // 更新配置
    poolConfig = {
      ...poolConfig,
      ...newConfig
    };
    
    // 创建新连接池
    pool = new Pool(poolConfig);
    
    logger.info('PostgreSQL database configuration updated successfully');
    return true;
  } catch (error) {
    logger.error('Failed to update PostgreSQL database configuration', error);
    return false;
  }
};

// 从配置服务加载配置
export const loadConfigFromService = async () => {
  try {
    // 延迟导入，避免循环依赖
    const { configService } = await import('../services/configService');
    
    // 获取数据库配置
    const hostConfig = await configService.getConfigByKey('POSTGRES_HOST');
    const portConfig = await configService.getConfigByKey('POSTGRES_PORT');
    const userConfig = await configService.getConfigByKey('POSTGRES_USER');
    const passwordConfig = await configService.getConfigByKey('POSTGRES_PASSWORD');
    const databaseConfig = await configService.getConfigByKey('POSTGRES_DATABASE');
    
    // 构建新配置
    const newConfig: Partial<PoolConfig> = {};
    
    if (hostConfig) newConfig.host = hostConfig.config_value;
    if (portConfig) newConfig.port = parseInt(portConfig.config_value);
    if (userConfig) newConfig.user = userConfig.config_value;
    if (passwordConfig) newConfig.password = passwordConfig.config_value;
    if (databaseConfig) newConfig.database = databaseConfig.config_value;
    
    // 更新配置
    return await updateDatabaseConfig(newConfig);
  } catch (error) {
    logger.error('Failed to load configuration from service', error);
    return false;
  }
};

pool.on('connect', () => {
  logger.info('PostgreSQL database connected');
});

pool.on('error', (err: Error) => {
  logger.error('PostgreSQL database error', err);
  setTimeout(() => {
    logger.info('Attempting to reconnect to PostgreSQL database');
  }, 5000);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`PostgreSQL query executed in ${duration}ms`, {
      text: text.substring(0, 100),
      rows: res.rowCount,
    });
    return res;
  } catch (error) {
    logger.error('PostgreSQL query error', { error, text: text.substring(0, 100) });
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const release = client.release;
  
  client.release = () => {
    logger.debug('PostgreSQL client released');
    return release.call(client);
  };
  
  return client;
};

export default pool;