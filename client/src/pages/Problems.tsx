import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import MathRenderer from '../components/MathRenderer';
import { ProblemCardSkeleton } from '../components/SkeletonLoader';

interface Problem {
  id: string;
  title: string;
  description: string;
  type: string;
  difficultyLevel: number;
  tags: string[];
  category: string;
  estimatedTime: number;
}

export default function Problems() {
  const { user, logout } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/problems')
      .then(res => setProblems(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load problems'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/80 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">SocraTeach</h1>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Available Problems</h2>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <ProblemCardSkeleton key={i} />
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
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">SocraTeach</h1>
          <div className="flex items-center gap-4">
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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Available Problems</h2>
            <p className="mt-1 text-slate-400">
              Choose a problem to start a Socratic learning session
            </p>
          </div>
          <Link
            to="/submit-problem"
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-black hover:bg-primary/90 flex items-center gap-2"
          >
            <span className="text-xl">✏️</span>
            Submit Your Problem
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {problems.map((problem) => (
            <div
              key={problem.id}
              className="rounded-2xl border border-white/5 bg-surface p-6 hover:border-primary/30 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{problem.title}</h3>
                  <div className="mt-2 text-slate-400 line-clamp-2">
                    <MathRenderer content={problem.description} />
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {problem.type}
                    </span>
                    <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-300">
                      Level {problem.difficultyLevel}
                    </span>
                    <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-300">
                      ~{problem.estimatedTime} min
                    </span>
                  </div>
                </div>

                <Link
                  to={`/session/${problem.id}`}
                  className="ml-4 rounded-xl bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  Start Session
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

