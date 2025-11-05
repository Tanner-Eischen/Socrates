import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333/api/v1',
  timeout: 10000,
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Problem submission utilities
export const submitProblemText = async (problemText: string) => {
  const response = await api.post('/problems/submit', { problemText });
  return response.data;
};

export const submitProblemImage = async (imageFile: File) => {
  const formData = new FormData();
  formData.append('problemImage', imageFile);
  
  const response = await api.post('/problems/submit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export default api;

