import type { SessionReport } from '../api';
import { Brain } from 'lucide-react';

interface ReasoningScoreCardProps {
  report: SessionReport;
}

export default function ReasoningScoreCard({ report }: ReasoningScoreCardProps) {
  const avgScore = report.avgReasoningScore;
  const scorePercentage = (avgScore / 4) * 100;

  const getScoreColor = (score: number) => {
    if (score >= 3) return 'text-success-400';
    if (score >= 2) return 'text-accent-400';
    if (score >= 1) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 3) return 'from-success-500 to-success-400';
    if (score >= 2) return 'from-accent-600 to-accent-400';
    if (score >= 1) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
  };

  return (
    <div className="glass-strong rounded-2xl p-6 card-hover group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Reasoning Score</h3>
        <div className="p-3 rounded-xl bg-accent-500/10 group-hover:bg-accent-500/20 transition-colors">
          <Brain className="w-5 h-5 text-accent-400" />
        </div>
      </div>
      
      <div className="space-y-5">
        <div className="flex items-end gap-2">
          <span className={`text-5xl font-bold tabular-nums ${getScoreColor(avgScore)}`}>
            {avgScore.toFixed(1)}
          </span>
          <span className="text-2xl text-gray-400 mb-1.5">/ 4.0</span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-dark-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getScoreGradient(avgScore)} rounded-full transition-all duration-700 ease-out shadow-glow`}
            style={{ width: `${scorePercentage}%` }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-primary animate-pulse" />
          <p className="text-sm text-gray-300">
            {avgScore >= 3 ? 'Excellent reasoning demonstrated' :
             avgScore >= 2 ? 'Good reasoning skills' :
             avgScore >= 1 ? 'Developing reasoning skills' :
             'Needs improvement'}
          </p>
        </div>
      </div>
    </div>
  );
}

