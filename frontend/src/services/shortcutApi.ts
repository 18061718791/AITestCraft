import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

const api = axios.create({
  baseURL: API_PREFIX,
  timeout: 30000,
});

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
}

export interface ShortcutMap {
  toggleLeftPanel: ShortcutConfig;
  toggleRightPanel: ShortcutConfig;
  toggleBottomPanel: ShortcutConfig;
}

export const shortcutApi = {
  getShortcuts: async (): Promise<{ success: boolean; data: ShortcutMap }> => {
    const response = await api.get('/shortcuts');
    return response.data;
  },

  saveShortcuts: async (shortcuts: ShortcutMap): Promise<{ success: boolean; data: ShortcutMap }> => {
    const response = await api.post('/shortcuts', { shortcuts });
    return response.data;
  },

  resetShortcuts: async (): Promise<{ success: boolean; data: ShortcutMap }> => {
    const response = await api.post('/shortcuts/reset');
    return response.data;
  },

  getShortcutEnabled: async (): Promise<{ success: boolean; data: { enabled: boolean } }> => {
    const response = await api.get('/shortcuts/enabled');
    return response.data;
  },

  setShortcutEnabled: async (enabled: boolean): Promise<{ success: boolean; data: { enabled: boolean } }> => {
    const response = await api.post('/shortcuts/enabled', { enabled });
    return response.data;
  },
};

export default shortcutApi;
