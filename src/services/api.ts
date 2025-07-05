import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      hasToken: !!token,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.error || error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      console.log('Unauthorized access, clearing auth data');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),
  
  register: (userData: { name: string; email: string; password: string }) => 
    api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  getCurrentUser: () => api.get('/auth/me'),
  
  updateProfile: (profileData: any) => api.put('/auth/profile', profileData),
};

// Form API
export const formAPI = {
  getForms: () => api.get('/forms'),
  getForm: (id: string) => api.get(`/forms/${id}`),
  getFormByShareUrl: (shareUrl: string) => api.get(`/forms/share/${shareUrl}`),
  createForm: (formData: any) => api.post('/forms', formData),
  updateForm: (id: string, formData: any) => api.put(`/forms/${id}`, formData),
  deleteForm: (id: string) => api.delete(`/forms/${id}`),
  publishForm: (id: string) => api.post(`/forms/${id}/publish`),
  getAnalytics: (id: string) => api.get(`/forms/${id}/analytics`),
  getRecentForms: (limit = 5) => api.get(`/forms?limit=${limit}&sort=updatedAt`),
};

// Folder API
export const folderAPI = {
  getFolders: () => api.get('/folders'),
  getFolder: (id: string) => api.get(`/folders/${id}`),
  createFolder: (folderData: any) => api.post('/folders', folderData),
  updateFolder: (id: string, folderData: any) => api.put(`/folders/${id}`, folderData),
  deleteFolder: (id: string) => api.delete(`/folders/${id}`),
  moveForms: (folderId: string, formIds: string[]) => 
    api.post(`/folders/${folderId}/move-forms`, { formIds }),
};

// Response API
export const responseAPI = {
  submitResponse: (responseData: any) => api.post('/responses', responseData),
  getResponses: (formId: string, page = 1, limit = 10) => 
    api.get(`/responses/form/${formId}?page=${page}&limit=${limit}`),
  getResponse: (id: string) => api.get(`/responses/${id}`),
  deleteResponse: (id: string) => api.delete(`/responses/${id}`),
};

// Export API
export const exportAPI = {
  getExportSummary: (formId: string) => api.get(`/exports/summary/${formId}`),
  downloadExcel: (formId: string) => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/exports/excel/${formId}`;
    const link = document.createElement('a');
    link.href = token ? `${url}?token=${token}` : url;
    link.download = 'export.xlsx';
    link.click();
  },
  downloadCSV: (formId: string) => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/exports/csv/${formId}`;
    const link = document.createElement('a');
    link.href = token ? `${url}?token=${token}` : url;
    link.download = 'export.csv';
    link.click();
  },
};

export default api;