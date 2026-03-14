import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';

const Navigation = lazy(() => import('./components/Navigation'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const LearningAssessments = lazy(() => import('./pages/LearningAssessments'));
const Problems = lazy(() => import('./pages/Problems'));
const ProblemInput = lazy(() => import('./components/ProblemInput'));
const Session = lazy(() => import('./pages/Session'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Collaboration = lazy(() => import('./pages/Collaboration'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const SubmitProblem = lazy(() => import('./pages/SubmitProblem'));
const TutorCLI = lazy(() => import('./pages/TutorCLI'));
const Chat = lazy(() => import('./pages/Chat'));
const SocraticDemo = lazy(() => import('./pages/SocraticDemo'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="text-gray-700">Loading...</div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const hideNavPaths = ['/tutor', '/chat', '/demo', '/login'];
  const hideNavOnSession = location.pathname.startsWith('/session/');
  const showNav = !hideNavPaths.includes(location.pathname) && !hideNavOnSession;

  return (
    <>
      {showNav && (
        <Suspense fallback={null}>
          <Navigation />
        </Suspense>
      )}
      <div className={showNav ? 'ml-72' : ''}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
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
        </Suspense>
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
