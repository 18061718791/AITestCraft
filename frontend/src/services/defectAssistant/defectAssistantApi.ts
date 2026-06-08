import axios from 'axios';

const API_BASE_URL = '/api/defect-assistant';

export interface QueryRequest {
  query: string;
  context?: {
    recentQueries?: string[];
  };
}

export interface QueryResponse {
  success: boolean;
  message: string;
  resultType: 'list' | 'chart' | 'count' | 'document' | 'guide';
  data?: {
    list?: DefectItem[];
    total?: number;
    count?: number;
    trendData?: TrendData;
    distributionData?: DistributionData;
    documentUrl?: string;
    taskId?: string;
  };
  intent?: {
    type: string;
    confidence: number;
    entities: Record<string, any>;
  };
  suggestions?: string[];
}

export interface DefectItem {
  id: number;
  subject: string;
  status_name: string;
  priority_name: string;
  system_module_name: string;
  created_on: string;
  updated_on: string;
}

export interface TrendData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export interface DistributionData {
  systemDistribution: Array<{ name: string; value: number }>;
  priorityDistribution: Array<{ name: string; value: number }>;
}

export const defectAssistantApi = {
  query: async (request: QueryRequest): Promise<QueryResponse> => {
    const response = await axios.post<QueryResponse>(`${API_BASE_URL}/query`, request);
    return response.data;
  },

  getSuggestions: async (): Promise<string[]> => {
    const response = await axios.get<{ success: boolean; data: string[] }>(`${API_BASE_URL}/suggestions`);
    return response.data.data;
  },

  exportData: async (query: string): Promise<void> => {
    const response = await axios.post(`${API_BASE_URL}/export`, { query }, {
      responseType: 'blob'
    });
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `defects-${new Date().toISOString().split('T')[0]}.xlsx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
      }
    }
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default defectAssistantApi;
