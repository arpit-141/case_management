import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const casesAPI = {
  // Cases
  getCases: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await api.get(`/cases?${params}`);
    return response.data;
  },

  getCase: async (id) => {
    const response = await api.get(`/cases/${id}`);
    return response.data;
  },

  createCase: async (caseData) => {
    const response = await api.post('/cases', caseData);
    return response.data;
  },

  updateCase: async (id, updates) => {
    const response = await api.put(`/cases/${id}`, updates);
    return response.data;
  },

  deleteCase: async (id) => {
    const response = await api.delete(`/cases/${id}`);
    return response.data;
  },

  // Comments
  getCaseComments: async (caseId) => {
    const response = await api.get(`/cases/${caseId}/comments`);
    return response.data;
  },

  createComment: async (caseId, commentData) => {
    const response = await api.post(`/cases/${caseId}/comments`, commentData);
    return response.data;
  },

  updateComment: async (commentId, content) => {
    const response = await api.put(`/comments/${commentId}`, { content });
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },

  // Files
  getCaseFiles: async (caseId) => {
    const response = await api.get(`/cases/${caseId}/files`);
    return response.data;
  },

  uploadFile: async (caseId, file, uploadedBy = 'anonymous') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaded_by', uploadedBy);
    
    const response = await api.post(`/cases/${caseId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },

  // Users
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Stats
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },

  // Health
  getHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;