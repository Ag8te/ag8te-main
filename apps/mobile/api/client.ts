import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ag8te.com';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
});
export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default apiClient;
