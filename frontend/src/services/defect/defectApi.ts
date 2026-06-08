import axios from 'axios';
import { 
  DefectTreeNode, 
  DefectListResponse, 
  TrendData, 
  DistributionData, 
  DefectQueryParams,
  ApiResponse 
} from '../../types/defect';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class DefectApi {
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // 请求拦截器：自动添加 token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });
  }

  // 获取目录树结构
  async getTree(): Promise<ApiResponse<DefectTreeNode>> {
    try {
      const response = await this.client.get('/defects/tree');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取目录树失败',
      };
    }
  }

  // 获取缺陷列表
  async getDefects(params: DefectQueryParams): Promise<ApiResponse<DefectListResponse>> {
    try {
      const response = await this.client.get('/defects', { params });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取缺陷列表失败',
      };
    }
  }

  // 获取项目汇总趋势数据
  async getOverviewTrend(type: 'all' | 'urgent' = 'all'): Promise<ApiResponse<TrendData>> {
    try {
      const response = await this.client.get('/defects/statistics/overview/trend', {
        params: { type },
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取趋势数据失败',
      };
    }
  }

  // 获取系统趋势数据
  async getSystemTrend(systemId: number, type: 'all' | 'urgent' = 'all'): Promise<ApiResponse<TrendData>> {
    try {
      const response = await this.client.get(`/defects/statistics/system/${systemId}/trend`, {
        params: { type },
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取系统趋势数据失败',
      };
    }
  }

  // 获取项目汇总系统分布饼图数据
  async getOverviewSystemDistribution(urgentOnly: boolean = false): Promise<ApiResponse<DistributionData[]>> {
    try {
      const response = await this.client.get('/defects/statistics/overview/pie/system', {
        params: { urgent: urgentOnly },
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取系统分布数据失败',
      };
    }
  }

  // 获取系统分布饼图数据（支持systemId参数）
  async getSystemSystemDistribution(systemId: number, urgentOnly: boolean = false): Promise<ApiResponse<DistributionData[]>> {
    try {
      const response = await this.client.get(`/defects/statistics/system/${systemId}/pie/system`, {
        params: { urgent: urgentOnly },
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取系统分布数据失败',
      };
    }
  }

  // 获取项目汇总优先级分布饼图数据
  async getOverviewPriorityDistribution(): Promise<ApiResponse<DistributionData[]>> {
    try {
      const response = await this.client.get('/defects/statistics/overview/pie/priority');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取优先级分布数据失败',
      };
    }
  }

  // 获取系统优先级分布饼图数据
  async getSystemPriorityDistribution(systemId: number): Promise<ApiResponse<DistributionData[]>> {
    try {
      const response = await this.client.get(`/defects/statistics/system/${systemId}/pie/priority`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取系统优先级分布数据失败',
      };
    }
  }

  // 清除缓存
  async clearCache(): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.post('/defects/cache/clear');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '清除缓存失败',
      };
    }
  }

  // 获取用户列表
  async getUsers(): Promise<ApiResponse<{ id: number; name: string; login: string }[]>> {
    try {
      const response = await this.client.get('/defects/users/list');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: '获取用户列表失败',
      };
    }
  }
}

export default new DefectApi();
