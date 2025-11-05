import { X } from 'lucide-react';

interface EndSessionModalProps {
  open: boolean;
  onClose: () => void;
  analytics: {
    totalQuestions: number;
    socraticCompliance: number;
    difficultyProgression: number[];
    conceptsExplored: string[];
    questionTypes: Record<string, number>;
    metacognitivePrompts: number;
  } | null;
}

export default function EndSessionModal({ open, onClose, analytics }: EndSessionModalProps) {
  if (!open || !analytics) return null;

  const { totalQuestions, socraticCompliance, difficultyProgression, conceptsExplored, questionTypes, metacognitivePrompts } = analytics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-2xl rounded-xl bg-slate-800 border border-slate-700 shadow-2xl p-6 text-gray-100">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-green-400">Session Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-green-300 mb-2">Overview</h3>
            <p className="text-sm text-gray-300">Total questions: <span className="font-semibold text-white">{totalQuestions}</span></p>
            <p className="text-sm text-gray-300">Socratic compliance: <span className="font-semibold text-white">{(socraticCompliance * 100).toFixed(0)}%</span></p>
            <p className="text-sm text-gray-300">Metacognitive prompts: <span className="font-semibold text-white">{metacognitivePrompts}</span></p>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-green-300 mb-2">Difficulty Path</h3>
            <div className="flex items-center gap-2">
              {difficultyProgression.map((d, i) => (
                <span key={i} className="px-2 py-1 rounded text-xs bg-slate-700 text-gray-200">{d}</span>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-green-300 mb-2">Concepts Explored</h3>
            <div className="flex flex-wrap gap-2">
              {conceptsExplored.map((c) => (
                <span key={c} className="px-2 py-1 rounded text-xs bg-slate-700 text-gray-200">{c}</span>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-green-300 mb-2">Question Types</h3>
            <div className="space-y-1">
              {Object.entries(questionTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="text-gray-400">{type.replace('_',' ')}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-200 transition">Close</button>
          <button onClick={() => { onClose(); window.location.href = '/dashboard'; }} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition">Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}