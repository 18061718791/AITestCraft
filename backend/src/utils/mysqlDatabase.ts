import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

// 默认配置（从环境变量）
let poolConfig = {
  host: process.env['MYSQL_HOST'] || 'localhost',
  port: parseInt(process.env['MYSQL_PORT'] || '3306'),
  user: process.env['MYSQL_USER'] || 'root',
  password: process.env['MYSQL_PASSWORD'] || '',
  database: process.env['MYSQL_DATABASE'] || 'testcraft',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建初始连接池
let pool = mysql.createPool(poolConfig);

// 动态更新数据库配置
export const updateMysqlConfig = async (newConfig: Partial<typeof poolConfig>) => {
  try {
    // 关闭现有连接池
    await pool.end();
    
    // 更新配置
    poolConfig = {
      ...poolConfig,
      ...newConfig
    };
    
    // 创建新连接池
    pool = mysql.createPool(poolConfig);
    
    logger.info('MySQL database configuration updated successfully');
    return true;
  } catch (error) {
    logger.error('Failed to update MySQL database configuration', error);
    return false;
  }
};

// 从配置服务加载配置
export const loadMysqlConfigFromService = async () => {
  try {
    // 延迟导入，避免循环依赖
    const { configService } = await import('../services/configService');
    
    // 获取数据库配置
    const hostConfig = await configService.getConfigByKey('MYSQL_HOST');
    const portConfig = await configService.getConfigByKey('MYSQL_PORT');
    const userConfig = await configService.getConfigByKey('MYSQL_USER');
    const passwordConfig = await configService.getConfigByKey('MYSQL_PASSWORD');
    const databaseConfig = await configService.getConfigByKey('MYSQL_DATABASE');
    
    // 构建新配置
    const newConfig: Partial<typeof poolConfig> = {};
    
    if (hostConfig) newConfig.host = hostConfig.config_value;
    if (portConfig) newConfig.port = parseInt(portConfig.config_value);
    if (userConfig) newConfig.user = userConfig.config_value;
    if (passwordConfig) newConfig.password = passwordConfig.config_value;
    if (databaseConfig) newConfig.database = databaseConfig.config_value;
    
    // 更新配置
    return await updateMysqlConfig(newConfig);
  } catch (error) {
    logger.error('Failed to load MySQL configuration from service', error);
    return false;
  }
};

pool.on('connection', (connection) => {
  logger.info('MySQL database connected');
});

// 移除error事件监听器，因为mysql2的Promise Pool类型定义不支持error事件
// 如果需要错误处理，可以在每个查询中单独处理

export const mysqlQuery = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const [rows, fields] = await pool.execute(text, params);
    const duration = Date.now() - start;
    logger.debug(`MySQL query executed in ${duration}ms`, {
      text: text.substring(0, 100),
      rows: Array.isArray(rows) ? rows.length : 0,
    });
    return { rows, fields };
  } catch (error) {
    logger.error('MySQL query error', { error, text: text.substring(0, 100) });
    throw error;
  }
};

export const getMysqlClient = async () => {
  const connection = await pool.getConnection();
  return connection;
};

export default pool;