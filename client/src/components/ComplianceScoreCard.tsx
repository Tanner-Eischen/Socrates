import type { ComplianceMetrics } from '../api';

interface ComplianceScoreCardProps {
  compliance: ComplianceMetrics;
}

export default function ComplianceScoreCard({ compliance }: ComplianceScoreCardProps) {
  const compliancePercentage = compliance.complianceScore;
  const isCompliant = compliancePercentage >= 95;
  
  const getStatusColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Socratic Compliance</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className={`text-3xl font-bold ${getStatusColor(compliancePercentage)}`}>
            {compliancePercentage.toFixed(1)}%
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isCompliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isCompliant ? '✓ Compliant' : '⚠ Needs Improvement'}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-300 ${
              isCompliant ? 'bg-green-600' : 'bg-red-600'
            }`}
            style={{ width: `${compliancePercentage}%` }}
          />
        </div>
        
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            <strong>Violations:</strong> {compliance.directAnswerViolations}
          </div>
          {compliance.lastViolationTurn > 0 && (
            <div className="text-sm text-gray-600">
              <strong>Last Violation:</strong> Turn {compliance.lastViolationTurn}
            </div>
          )}
          
          {compliance.examples.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">Example Violations:</div>
              <ul className="space-y-1">
                {compliance.examples.slice(0, 2).map((example, index) => (
                  <li key={index} className="text-xs text-gray-600 italic">
                    "{example.substring(0, 60)}..."
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

