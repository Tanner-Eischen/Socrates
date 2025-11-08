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
  isAssessment: boolean;
  prerequisites?: string[];
}

interface AssessmentCompletion {
  assessmentId: string;
  completed: boolean;
  completedAt?: Date;
}

export default function LearningAssessments() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [completions, setCompletions] = useState<AssessmentCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/problems'),
      api.get('/assessments/completions').catch(() => ({ data: { data: [] } }))
    ])
      .then(([problemsRes, completionsRes]) => {
        // Filter only assessment problems
        const assessmentProblems = problemsRes.data.data.filter((p: Problem) => p.isAssessment);
        setProblems(assessmentProblems);
        setCompletions(completionsRes.data.data);
      })
      .catch(err => {
        console.error('API Error:', err);
        setError(err.response?.data?.message || 'Failed to load assessments');
      })
      .finally(() => setLoading(false));
  }, []);

  // Group problems by category
  const problemsByCategory = problems.reduce((acc, problem) => {
    if (!acc[problem.category]) {
      acc[problem.category] = [];
    }
    acc[problem.category].push(problem);
    return acc;
  }, {} as Record<string, Problem[]>);

  const categories = Object.keys(problemsByCategory).sort();

  // Check if a problem is completed
  const isCompleted = (problemId: string) => {
    return completions.some(c => c.assessmentId === problemId && c.completed);
  };

  // Check if prerequisites are met
  const prerequisitesMet = (problem: Problem) => {
    if (!problem.prerequisites || problem.prerequisites.length === 0) {
      return true;
    }
    return problem.prerequisites.every(prereqId => isCompleted(prereqId));
  };

  // Get prerequisite titles
  const getPrerequisiteTitles = (problem: Problem): string[] => {
    if (!problem.prerequisites) return [];
    return problem.prerequisites
      .map(prereqId => problems.find(p => p.id === prereqId)?.title)
      .filter(Boolean) as string[];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
              Learning Assessments
            </h2>
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
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
              Learning Assessments
            </h2>
            <p className="mt-1 text-gray-600">
              Test your understanding with these learning checkpoints
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

        {/* Progress Summary */}
        <div className="mb-8 rounded-2xl border-2 border-amber-200 bg-white/80 backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Progress</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 bg-amber-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
                  style={{ width: `${problems.length > 0 ? (completions.length / problems.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">
              {completions.length} / {problems.length} Completed
            </div>
          </div>
        </div>

        {/* Assessments by Category */}
        <div className="space-y-8">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></span>
                {category}
              </h3>
              <div className="grid gap-4">
                {problemsByCategory[category].map((problem) => {
                  const completed = isCompleted(problem.id);
                  const locked = !prerequisitesMet(problem);
                  const prereqTitles = getPrerequisiteTitles(problem);

                  return (
                    <div
                      key={problem.id}
                      className={`rounded-2xl border-2 p-6 transition-all ${
                        completed
                          ? 'border-green-300 bg-green-50/50'
                          : locked
                          ? 'border-gray-300 bg-gray-50/50 opacity-60'
                          : 'border-amber-200 bg-white/80 backdrop-blur-sm hover:border-amber-400 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {completed && (
                              <span className="text-2xl" title="Completed">✅</span>
                            )}
                            {locked && (
                              <span className="text-2xl" title="Locked - Prerequisites not met">🔒</span>
                            )}
                            {!completed && !locked && (
                              <span className="text-2xl" title="Available">📚</span>
                            )}
                            <h3 className="text-lg font-semibold text-gray-900">{problem.title}</h3>
                          </div>
                          
                          <div className="mt-2 text-gray-700 line-clamp-2">
                            <MathRenderer content={problem.description} />
                          </div>
                          
                          {/* Prerequisites Display */}
                          {prereqTitles.length > 0 && (
                            <div className="mt-3 flex items-start gap-2">
                              <span className="text-xs text-gray-500 font-medium">Prerequisites:</span>
                              <div className="flex flex-wrap gap-1">
                                {prereqTitles.map((title, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      locked
                                        ? 'bg-red-100 text-red-700 border border-red-200'
                                        : 'bg-green-100 text-green-700 border border-green-200'
                                    }`}
                                  >
                                    {title}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
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

                        <div className="ml-4">
                          {completed ? (
                            <button
                              disabled
                              className="rounded-xl bg-green-100 border-2 border-green-300 px-4 py-2 text-sm font-medium text-green-700 cursor-not-allowed"
                            >
                              ✓ Completed
                            </button>
                          ) : locked ? (
                            <button
                              disabled
                              className="rounded-xl bg-gray-200 border-2 border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
                              title={`Complete ${prereqTitles.join(', ')} first`}
                            >
                              🔒 Locked
                            </button>
                          ) : (
                            <Link
                              to={`/session/${problem.id}`}
                              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all"
                            >
                              Take Assessment
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {problems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No assessments available yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}

