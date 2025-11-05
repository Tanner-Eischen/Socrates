import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import { DashboardStatSkeleton, SessionCardSkeleton } from '../components/SkeletonLoader';

interface DashboardStats {
  totalSessions: number;
  completedProblems: number;
  totalTimeSpent: number;
  averageAccuracy: number;
}

interface RecentSession {
  id: string;
  problemTitle: string;
  status: string;
  startTime: string;
  interactionCount: number;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/sessions?limit=5')
    ])
      .then(([statsRes, sessionsRes]) => {
        setStats(statsRes.data.data);
        setRecentSessions(sessionsRes.data.data);
      })
      .catch(err => console.error('Failed to load dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-100">SocraTeach</h1>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-100">Welcome back!</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <DashboardStatSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-100">Recent Sessions</h3>
            {[1, 2, 3].map((i) => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-100">SocraTeach</h1>
          <div className="flex items-center gap-4">
            <Link
              to="/new"
              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm transition"
            >
              New Session
            </Link>
            <span className="text-sm text-gray-300">
              {user?.name || user?.email}
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-100">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}!
            </h2>
            <p className="mt-2 text-gray-400">
              Here's your learning progress overview
            </p>
          </div>
          <Link
            to="/new"
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-500 flex items-center gap-2 transition"
          >
            <span className="text-xl">✏️</span>
            New Session
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-800 p-6">
            <div className="text-sm text-gray-400">Total Sessions</div>
            <div className="mt-2 text-3xl font-bold text-gray-100">
              {stats?.totalSessions || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800 p-6">
            <div className="text-sm text-gray-400">Problems Completed</div>
            <div className="mt-2 text-3xl font-bold text-gray-100">
              {stats?.completedProblems || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800 p-6">
            <div className="text-sm text-gray-400">Time Spent</div>
            <div className="mt-2 text-3xl font-bold text-gray-100">
              {Math.round((stats?.totalTimeSpent || 0) / 60)}h
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800 p-6">
            <div className="text-sm text-gray-400">Avg. Accuracy</div>
            <div className="mt-2 text-3xl font-bold text-green-400">
              {stats?.averageAccuracy || 0}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Sessions */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-gray-100">
              Recent Sessions
            </h3>
            <div className="space-y-3">
              {recentSessions.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-800 p-6 text-center text-gray-400">
                  No sessions yet. Start learning!
                </div>
              ) : (
                recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-slate-800 bg-slate-800 p-4 flex items-center justify-between hover:border-green-500/50 transition"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-100">
                        {session.problemTitle || 'Untitled Problem'}
                      </div>
                      <div className="mt-1 text-sm text-gray-400">
                        {session.interactionCount} interactions • {' '}
                        <span className={
                          session.status === 'completed' 
                            ? 'text-green-400' 
                            : session.status === 'active'
                            ? 'text-green-400'
                            : 'text-gray-500'
                        }>
                          {session.status}
                        </span>
                      </div>
                    </div>
                    {session.status === 'active' && (
                      <Link
                        to={`/session/${session.id}`}
                        className="rounded-lg bg-green-600/20 border border-green-700/40 px-4 py-2 text-sm font-medium text-green-300 hover:bg-green-600/30 transition"
                      >
                        Resume
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-gray-100">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Link
                to="/new"
                className="rounded-2xl border border-slate-800 bg-slate-800 p-4 block hover:border-green-500/50 transition"
              >
                <div className="font-medium text-gray-100">Start New Session</div>
                <div className="mt-1 text-sm text-gray-400">Ask a question or upload a problem image</div>
              </Link>
              <Link
                to="/problems"
                className="rounded-2xl border border-slate-800 bg-slate-800 p-4 block hover:border-green-500/50 transition"
              >
                <div className="font-medium text-gray-100">Browse Problem Bank</div>
                <div className="mt-1 text-sm text-gray-400">Explore curated practice questions</div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

