import { useState } from 'react';

interface DemoScenario {
  id: string;
  name: string;
  problem: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'algebra-beginner',
    name: 'Algebra - Beginner',
    problem: 'Solve 2x + 5 = 13',
    difficulty: 'beginner',
    description: 'Learn to solve linear equations step by step',
  },
  {
    id: 'geometry-intermediate',
    name: 'Geometry - Intermediate',
    problem: 'Find the area of a triangle with base 10 cm and height 7 cm',
    difficulty: 'intermediate',
    description: 'Explore triangle area formulas and calculations',
  },
  {
    id: 'calculus-advanced',
    name: 'Calculus - Advanced',
    problem: 'Given f(x) = x³ - 3x, find the critical points and determine local extrema.',
    difficulty: 'advanced',
    description: 'Master critical points and optimization techniques',
  },
];

interface DemoPanelProps {
  onSelectScenario: (scenario: DemoScenario) => void;
}

export function DemoPanel({ onSelectScenario }: DemoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'advanced':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 rounded-full bg-white/90 hover:bg-white transition-all shadow-lg flex items-center justify-center border-2 border-white/30"
        style={{
          fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
        }}
        aria-label={isExpanded ? 'Close demo panel' : 'Open demo panel'}
      >
        {isExpanded ? (
          <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )}
      </button>

      {/* Expandable Panel */}
      {isExpanded && (
        <div
          className="mt-2 w-80 bg-slate-900/95 backdrop-blur-sm rounded-lg border-2 border-white/20 shadow-2xl p-4"
          style={{
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          <h3
            className="text-xl font-semibold mb-4 text-white"
            style={{
              fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            🎯 Demo Scenarios
          </h3>

          <div className="space-y-3">
            {DEMO_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  onSelectScenario(scenario);
                  setIsExpanded(false);
                }}
                className="w-full text-left p-3 rounded-lg border-2 transition-all hover:scale-105 hover:border-white/40 bg-white/5 hover:bg-white/10"
                style={{
                  fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-semibold text-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                    {scenario.name}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-xs border ${getDifficultyColor(scenario.difficulty)}`}
                    style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}
                  >
                    {scenario.difficulty}
                  </span>
                </div>
                <p className="text-white/70 text-xs mb-2" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
                  {scenario.description}
                </p>
                <p className="text-yellow-200/80 text-xs italic" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
                  "{scenario.problem}"
                </p>
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-white/50 text-center italic" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
            Click a scenario to start a demo session
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

