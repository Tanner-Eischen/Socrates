import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import ProblemInput from './components/ProblemInput';
import Session from './pages/Session';
import TutorCLI from './pages/TutorCLI';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#11151B',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          success: {
            iconTheme: {
              primary: '#6EE7F5',
              secondary: '#11151B',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<TutorCLI />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new" element={<ProblemInput />} />
        <Route path="/session/:id" element={<Session />} />
        <Route path="/tutor" element={<TutorCLI />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}