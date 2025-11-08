import type { SessionReport } from '../api';
import { Zap } from 'lucide-react';

interface TransferGaugeProps {
  report: SessionReport;
}

export default function TransferGauge({ report }: TransferGaugeProps) {
  const successRate = report.transferSuccessRate * 100;
  
  const getBadgeColor = (rate: number) => {
    if (rate >= 75) return 'bg-success-500/20 text-success-400 border-success-500/30';
    if (rate >= 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getBadgeText = (rate: number) => {
    if (rate >= 75) return 'Excellent';
    if (rate >= 50) return 'Good';
    if (rate >= 25) return 'Developing';
    return 'Needs Work';
  };

  const getGaugeColor = (rate: number) => {
    if (rate >= 75) return 'text-success-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="glass-strong rounded-2xl p-6 card-hover group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Transfer Success</h3>
        <div className="p-3 rounded-xl bg-success-500/10 group-hover:bg-success-500/20 transition-colors">
          <Zap className="w-5 h-5 text-success-400" />
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className={`text-5xl font-bold tabular-nums ${getGaugeColor(successRate)}`}>
            {successRate.toFixed(0)}%
          </span>
          <span className={`px-4 py-2 rounded-xl text-sm font-semibold border ${getBadgeColor(successRate)}`}>
            {getBadgeText(successRate)}
          </span>
        </div>
        
        {/* Circular Gauge Visualization */}
        <div className="relative w-40 h-40 mx-auto">
          <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-dark-800"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#success-gradient)"
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - successRate / 100)}`}
              className="transition-all duration-1000 ease-out drop-shadow-glow"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="success-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className={`text-3xl font-bold ${getGaugeColor(successRate)}`}>
                {successRate.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-300">
            Ability to apply concepts to new problems
          </p>
        </div>
      </div>
    </div>
  );
}

