import type { SessionReport } from '../api';

interface CalibrationCardProps {
  report: SessionReport;
}

export default function CalibrationCard({ report }: CalibrationCardProps) {
  const calibrationError = report.calibrationErrorAvg;
  const isWellCalibrated = calibrationError < 0.25;
  
  const getStatusColor = (error: number) => {
    if (error < 0.25) return 'text-green-600';
    if (error < 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = (error: number) => {
    if (error < 0.25) return 'Well Calibrated';
    if (error < 0.5) return 'Moderately Calibrated';
    return 'Poorly Calibrated';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Confidence Calibration</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className={`text-3xl font-bold ${getStatusColor(calibrationError)}`}>
            {calibrationError.toFixed(3)}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isWellCalibrated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {getStatusText(calibrationError)}
          </span>
        </div>
        
        {/* Threshold Indicator */}
        <div className="relative w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-300 ${
              isWellCalibrated ? 'bg-green-600' : 'bg-yellow-600'
            }`}
            style={{ width: `${Math.min(100, (calibrationError / 1.0) * 100)}%` }}
          />
          <div className="absolute top-0 left-1/4 w-0.5 h-4 bg-blue-600" title="Well-calibrated threshold (0.25)" />
        </div>
        
        <div className="text-sm text-gray-600">
          <div className="mb-1">
            <strong>Threshold:</strong> &lt; 0.25 is well-calibrated
          </div>
          <div>
            Lower error means better alignment between predicted and actual confidence.
          </div>
        </div>
      </div>
    </div>
  );
}

