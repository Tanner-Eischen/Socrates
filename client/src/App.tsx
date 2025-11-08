import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import LearningAssessments from './pages/LearningAssessments';
import Problems from './pages/Problems';
import ProblemInput from './components/ProblemInput';
import Session from './pages/Session';
import Analytics from './pages/Analytics';
import Collaboration from './pages/Collaboration';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import SubmitProblem from './pages/SubmitProblem';
import TutorCLI from './pages/TutorCLI';
import Chat from './pages/Chat';
import SocraticDemo from './pages/SocraticDemo';

function AppContent() {
  const location = useLocation();
  const hideNavPaths = ['/tutor', '/chat', '/demo'];
  const hideNavOnSession = location.pathname.startsWith('/session/');
  const showNav = !hideNavPaths.includes(location.pathname) && !hideNavOnSession;

  return (
    <>
      {showNav && <Navigation />}
      <div className={showNav ? 'ml-72' : ''}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assessments" element={<LearningAssessments />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/new" element={<ProblemInput />} />
          <Route path="/submit" element={<SubmitProblem />} />
          <Route path="/session/:id" element={<Session />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/collaboration" element={<Collaboration />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/tutor" element={<TutorCLI />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/demo" element={<SocraticDemo />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#fff',
              color: '#1f2937',
              border: '2px solid #fbbf24',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#f59e0b',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}