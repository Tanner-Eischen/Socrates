import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">Available Problems</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">Available Problems</h2>
            <p className="mt-1 text-gray-600">
              Choose a problem to start a Socratic learning session
            </p>
          </div>
          <Link
            to="/submit"
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-6 py-3 font-semibold text-white flex items-center gap-2 shadow-md transition-all"
          >
            <span className="text-xl">✏️</span>
            Submit Your Problem
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {problems.map((problem) => (
            <div
              key={problem.id}
              className="rounded-2xl border-2 border-amber-200 bg-white/80 backdrop-blur-sm p-6 hover:border-amber-400 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{problem.title}</h3>
                  <div className="mt-2 text-gray-700 line-clamp-2">
                    <MathRenderer content={problem.description} />
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-medium">
                      {problem.type}
                    </span>
                    <span className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs text-orange-700 font-medium">
                      Level {problem.difficultyLevel}
                    </span>
                    <span className="rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs text-yellow-700 font-medium">
                      ~{problem.estimatedTime} min
                    </span>
                  </div>
                </div>

                <Link
                  to={`/session/${problem.id}`}
                  className="ml-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all"
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

