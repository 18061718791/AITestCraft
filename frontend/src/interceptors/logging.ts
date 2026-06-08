import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { frontendLogger, LogCategory } from '../utils/logger';

interface RequestLogData {
  url: string;
  method: string;
  headers?: any;
  data?: any;
  params?: any;
  startTime: number;
}

interface ResponseLogData {
  url: string;
  method: string;
  status: number;
  statusText: string;
  headers?: any;
  data?: any;
  duration: number;
}

export function setupLoggingInterceptors(axiosInstance: AxiosInstance): void {
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const requestData: RequestLogData = {
        url: config.url || '',
        method: config.method?.toUpperCase() || 'GET',
        headers: config.headers,
        data: config.data,
        params: config.params,
        startTime: Date.now()
      };

      // 存储开始时间用于计算耗时
      (config as any)._startTime = Date.now();

      frontendLogger.logApiRequest(
        requestData.method,
        requestData.url,
        requestData.data || requestData.params
      );

      return config;
    },
    (error) => {
      frontendLogger.error(
        LogCategory.ERROR,
        'Request interceptor error',
        error,
        {
          url: error.config?.url,
          method: error.config?.method
        }
      );
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const startTime = (response.config as any)._startTime || Date.now();
      const duration = Date.now() - startTime;

      const responseData: ResponseLogData = {
        url: response.config.url || '',
        method: response.config.method?.toUpperCase() || 'GET',
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        duration
      };

      frontendLogger.logApiResponse(
        responseData.method,
        responseData.url,
        responseData.status,
        duration,
        responseData.data
      );

      return response;
    },
    (error) => {
      const startTime = (error.config as any)._startTime || Date.now();
      const duration = Date.now() - startTime;

      const errorData = {
        url: error.config?.url || '',
        method: error.config?.method?.toUpperCase() || 'GET',
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        duration,
        message: error.message
      };

      frontendLogger.logApiResponse(
        errorData.method,
        errorData.url,
        errorData.status || 0,
        duration,
        errorData.data
      );

      return Promise.reject(error);
    }
  );
}

export default setupLoggingInterceptors;