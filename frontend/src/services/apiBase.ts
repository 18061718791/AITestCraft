import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
// 使用相对路径或环境变量配置的URL
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

// 基础 API 实例（不带 /test 前缀）
const apiBase = axios.create({
  baseURL: API_PREFIX,
  timeout: 30000,
});

// 请求拦截器：自动添加 token
apiBase.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 设置日志拦截器
import setupLoggingInterceptors from '../interceptors/logging';
setupLoggingInterceptors(apiBase);

export default apiBase;
