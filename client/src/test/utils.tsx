import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../AuthContext'

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </AuthProvider>
  )
}

export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'student',
}

export const mockProblem = {
  id: '1',
  title: 'Quadratic Equations',
  description: 'Solve x² - 5x + 6 = 0',
  type: 'math',
  difficultyLevel: 3,
  tags: ['algebra', 'quadratic'],
  category: 'Mathematics',
  estimatedTime: 15,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  createdBy: 'system',
  hints: ['Try factoring', 'Look for two numbers'],
}

export const mockSession = {
  id: 'session-1',
  userId: '1',
  problemId: '1',
  problemText: 'Solve x² - 5x + 6 = 0',
  problemType: 'math',
  difficultyLevel: 3,
  status: 'active',
  startTime: '2024-01-01T00:00:00Z',
  interactionCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

