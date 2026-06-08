import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

const api = axios.create({
  baseURL: `${API_PREFIX}/document`,
  timeout: 30000,
});

export interface GeneratePointsFromDocumentRequest {
  documentId: string;
  chapterIds?: string[];
  parseMode?: string;
  sessionId: string;
  system?: string;
  module?: string;
  scenario?: string;
  provider?: string;
  model?: string;
}

export interface GeneratePointsResponse {
  success: boolean;
  data?: {
    taskId: string;
    message: string;
    status: string;
  };
  error?: string;
}

export const documentApi = {
  generatePoints: async (data: GeneratePointsFromDocumentRequest): Promise<GeneratePointsResponse> => {
    const response = await api.post('/generate-points', data);
    return response.data;
  },
};

export default documentApi;
