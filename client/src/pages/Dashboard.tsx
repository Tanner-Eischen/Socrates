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
      <div className="min-h-screen bg-bg">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">SocraTeach</h1>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Welcome back!</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <DashboardStatSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">Recent Sessions</h3>
            {[1, 2, 3].map((i) => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">SocraTeach</h1>
          <div className="flex items-center gap-4">
            <Link
              to="/problems"
              className="text-sm text-slate-300 hover:text-white"
            >
              Browse Problems
            </Link>
            <span className="text-sm text-slate-400">
              {user?.name || user?.email}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
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
            <h2 className="text-3xl font-bold text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}!
            </h2>
            <p className="mt-2 text-slate-400">
              Here's your learning progress overview
            </p>
          </div>
          <Link
            to="/submit-problem"
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-black hover:bg-primary/90 flex items-center gap-2"
          >
            <span className="text-xl">✏️</span>
            Submit Problem
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="text-sm text-slate-400">Total Sessions</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {stats?.totalSessions || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="text-sm text-slate-400">Problems Completed</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {stats?.completedProblems || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="text-sm text-slate-400">Time Spent</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {Math.round((stats?.totalTimeSpent || 0) / 60)}h
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="text-sm text-slate-400">Avg. Accuracy</div>
            <div className="mt-2 text-3xl font-bold text-primary">
              {stats?.averageAccuracy || 0}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Sessions */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-white">
              Recent Sessions
            </h3>
            <div className="space-y-3">
              {recentSessions.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-surface p-6 text-center text-slate-400">
                  No sessions yet. Start learning!
                </div>
              ) : (
                recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-white/5 bg-surface p-4 flex items-center justify-between hover:border-primary/30 transition"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {session.problemTitle || 'Untitled Problem'}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {session.interactionCount} interactions • {' '}
                        <span className={
                          session.status === 'completed' 
                            ? 'text-green-400' 
                            : session.status === 'active'
                            ? 'text-primary'
                            : 'text-slate-400'
                        }>
                          {session.status}
                        </span>
                      </div>
                    </div>
                    {session.status === 'active' && (
                      <Link
                        to={`/session/${session.id}`}
                        className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
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
            <h3 className="mb-4 text-xl font-semibold text-white">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Link
                to="/problems"
                className="block rounded-2xl border border-white/5 bg-surface p-6 hover:border-primary/30 transition"
              >
                <div className="font-semibold text-white">Browse Problems</div>
                <div className="mt-2 text-sm text-slate-400">
                  Explore available learning problems
                </div>
              </Link>

              <Link
                to="/analytics"
                className="block rounded-2xl border border-white/5 bg-surface p-6 hover:border-primary/30 transition"
              >
                <div className="font-semibold text-white">View Analytics</div>
                <div className="mt-2 text-sm text-slate-400">
                  Track your learning progress
                </div>
              </Link>

              <Link
                to="/profile"
                className="block rounded-2xl border border-white/5 bg-surface p-6 hover:border-primary/30 transition"
              >
                <div className="font-semibold text-white">Edit Profile</div>
                <div className="mt-2 text-sm text-slate-400">
                  Manage your account settings
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

