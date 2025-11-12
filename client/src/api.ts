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

// Behavioral Learning Measurement API Types
export interface TimelineEntry {
  turn: number;
  questionType: string;
  depth: number;
  confidence: number;
  confidenceDelta?: number;
  teachBackScore?: number;
  transferSuccess?: boolean;
  reasoningScore?: number;
  breakthrough: boolean;
}

// Removed ComplianceMetrics; strict Socratic mode no longer calculates direct-answer compliance

export interface SessionReport {
  transferSuccessRate: number;
  avgTeachBackScore: number;
  avgReasoningScore: number;
  calibrationErrorAvg: number;
  depthTrajectory: number[];
  breakthroughs: number;
}

// Behavioral Learning Measurement API Functions
export const getSessionJourney = async (sessionId: string): Promise<TimelineEntry[]> => {
  const response = await api.get(`/sessions/${sessionId}/journey`);
  return response.data.data;
};

// Removed getSessionCompliance API; server compliance endpoint no longer exists

export const getSessionReport = async (sessionId: string): Promise<SessionReport> => {
  const response = await api.get(`/analytics/session/${sessionId}/report`);
  return response.data.data;
};

export default api;

