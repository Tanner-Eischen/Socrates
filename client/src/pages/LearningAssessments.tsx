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

interface StudentAbility {
  userId: string;
  category: string;
  currentLevel: number;
  confidence: number;
  assessmentsCompleted: number;
}

interface AdaptiveRecommendation {
  assessmentId: string;
  difficulty: number;
  category: string;
  reason: string;
  expectedSuccessRate: number;
}

export default function LearningAssessments() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [completions, setCompletions] = useState<AssessmentCompletion[]>([]);
  const [abilities, setAbilities] = useState<StudentAbility[]>([]);
  const [recommendations, setRecommendations] = useState<Map<string, AdaptiveRecommendation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/problems?limit=100'), // Request all assessments (we have ~40)
      api.get('/assessments/completions').catch(() => ({ data: { data: [] } })),
      api.get('/adaptive/ability').catch(() => ({ data: { data: [] } }))
    ])
      .then(async ([problemsRes, completionsRes, abilitiesRes]) => {
        // Filter only assessment problems
        const assessmentProblems = problemsRes.data.data.filter((p: Problem) => p.isAssessment);
        setProblems(assessmentProblems);
        setCompletions(completionsRes.data.data);
        setAbilities(abilitiesRes.data.data);
        
        // Get recommendations for each category
        const categories = [...new Set(assessmentProblems.map((p: Problem) => p.category))];
        const recommendationsMap = new Map<string, AdaptiveRecommendation>();
        
        for (const category of categories) {
          try {
            const categoryProblems = assessmentProblems.filter((p: Problem) => p.category === category);
            const completedIds = completionsRes.data.data.map((c: AssessmentCompletion) => c.assessmentId);
            
            const availableAssessments = categoryProblems.map((p: Problem) => ({
              id: p.id,
              difficulty: p.difficultyLevel,
              category: p.category,
              completed: completedIds.includes(p.id)
            }));
            
            const recRes = await api.post('/adaptive/recommend', {
              category: String(category),
              availableAssessments
            });
            
            if (recRes.data.data) {
              recommendationsMap.set(String(category), recRes.data.data);
            }
          } catch (err) {
            console.error(`Failed to get recommendation for ${category}:`, err);
          }
        }
        
        setRecommendations(recommendationsMap);
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
            Learning Assessments
          </h2>
          <p className="mt-1 text-gray-600">
            Complete assessments matched to your learning level
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Assessments by Category */}
        <div className="space-y-8">
          {categories.map(category => {
            const ability = abilities.find(a => a.category === category);
            const recommendation = recommendations.get(category);
            
            return (
            <div key={category}>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></span>
                {category}
                {ability && (
                  <span className="ml-auto text-sm font-normal text-gray-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    📊 Level {ability.currentLevel.toFixed(1)} / 10
                  </span>
                )}
              </h3>
              
              {/* Adaptive Recommendation */}
              {recommendation && (
                <div className="mb-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎯</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">
                        Next Assessment: Level {recommendation.difficulty}
                      </h4>
                      <p className="text-sm text-blue-800 mb-2">
                        {recommendation.reason} • Expected success: {Math.round(recommendation.expectedSuccessRate * 100)}%
                      </p>
                      <p className="text-xs text-blue-600 italic">
                        Complete this to unlock your next challenge
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid gap-4">
                {(() => {
                  // Only show recommended assessment or completed ones
                  const filteredProblems = problemsByCategory[category]
                    .filter((problem) => {
                      const isRecommended = recommendation?.assessmentId === problem.id;
                      const completed = isCompleted(problem.id);
                      return isRecommended || completed;
                    });
                  
                  if (filteredProblems.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p className="mb-2">🎉 All assessments in this category complete!</p>
                        <p className="text-sm">Great job! Check other categories.</p>
                      </div>
                    );
                  }
                  
                  return filteredProblems.map((problem) => {
                  const completed = isCompleted(problem.id);
                  const isRecommended = recommendation?.assessmentId === problem.id;

                  return (
                    <div
                      key={problem.id}
                      className={`rounded-2xl border-2 p-6 transition-all ${
                        completed
                          ? 'border-green-300 bg-green-50/50'
                          : isRecommended
                          ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-xl shadow-blue-100'
                          : 'border-amber-200 bg-white/80 backdrop-blur-sm hover:border-amber-400 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {completed ? (
                              <span className="text-2xl" title="Completed">✅</span>
                            ) : (
                              <span className="text-2xl" title="Available">📚</span>
                            )}
                            <h3 className="text-lg font-semibold text-gray-900">{problem.title}</h3>
                          </div>
                          
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

                        <div className="ml-4">
                          {completed ? (
                            <button
                              disabled
                              className="rounded-xl bg-green-100 border-2 border-green-300 px-4 py-2 text-sm font-medium text-green-700 cursor-not-allowed"
                            >
                              ✓ Completed
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
                  });
                })()}
              </div>
            </div>
            );
          })}
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
