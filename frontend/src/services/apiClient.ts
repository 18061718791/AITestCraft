import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

// 全局 API 客户端
export const apiClient = axios.create({
  baseURL: API_PREFIX,
  timeout: 30000,
});

// 请求拦截器：自动添加 token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 标记是否正在刷新 token
let isRefreshing = false;
// 等待刷新完成的请求队列
let refreshSubscribers: ((token: string) => void)[] = [];

// 通知所有等待的请求
function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// 添加请求到等待队列
function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// 响应拦截器：统一处理 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是登录/注册/刷新接口的 401，直接拒绝
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果正在刷新，将请求加入队列等待
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_PREFIX}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // 通知所有等待的请求
          onRefreshed(accessToken);
          isRefreshing = false;

          // 重试原始请求
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch {
          // 刷新失败，清除 token 并跳转登录
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          isRefreshing = false;
          refreshSubscribers = [];

          // 避免在登录页循环跳转
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        // 没有 refreshToken，直接跳转登录
        localStorage.removeItem('accessToken');
        isRefreshing = false;

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
