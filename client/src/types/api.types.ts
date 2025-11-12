/**
 * API Request/Response Types
 * Types for API communication layer
 */

import type { Problem } from './domain.types';

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// Problem API Types
export interface SubmitProblemTextRequest {
  problemText: string;
}

export interface SubmitProblemImageRequest {
  problemImage: File;
}

export interface SubmitProblemResponse {
  data: {
    id: string;
    problemText: string;
    problemType: string;
    difficultyLevel: number;
  };
}

// Session API Types
export interface CreateSessionRequest {
  problemId?: string;
  problemText?: string;
}

export interface SessionJourneyResponse {
  data: TimelineEntry[];
}

export interface SessionReportResponse {
  data: SessionReport;
}

// Analytics API Types
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

export interface SessionReport {
  transferSuccessRate: number;
  avgTeachBackScore: number;
  avgReasoningScore: number;
  calibrationErrorAvg: number;
  depthTrajectory: number[];
  breakthroughs: number;
}

// Assessment API Types
export interface GetAssessmentsResponse {
  data: Problem[];
}

export interface GetCompletionsResponse {
  data: Array<{
    assessmentId: string;
    completed: boolean;
    completedAt?: string;
  }>;
}

export interface GetAbilityResponse {
  data: Array<{
    userId: string;
    category: string;
    currentLevel: number;
    confidence: number;
    assessmentsCompleted: number;
  }>;
}

export interface RecommendAssessmentRequest {
  category: string;
  availableAssessments: Array<{
    id: string;
    difficulty: number;
    category: string;
    completed: boolean;
  }>;
}

export interface RecommendAssessmentResponse {
  data: {
    assessmentId: string;
    difficulty: number;
    category: string;
    reason: string;
    expectedSuccessRate: number;
  };
}

