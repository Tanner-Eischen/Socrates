import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { submitProblemImage, submitProblemText } from '../api';
import { Upload, BookOpen, Play } from 'lucide-react';

const TEST_PROBLEMS = [
  'Solve 3x + 5 = 11',
  'Explain why the sky is blue',
  'How do I find the area of a circle?',
  'What is the difference between speed and velocity?',
];

export default function ProblemInput() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImage(file);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image) return;
    setLoading(true);
    try {
      let submittedProblemId: string;
      if (image) {
        const res = await submitProblemImage(image);
        submittedProblemId = res.data.id;
      } else {
        const res = await submitProblemText(text);
        submittedProblemId = res.data.id;
      }
      
      // Create a session with the submitted problem
      const sessionRes = await api.post('/sessions', {
        submittedProblemId,
        problemType: 'math',
        difficultyLevel: 1,
        useEnhancedEngine: true,
      });
      
      const sessionId = sessionRes.data.data.id;
      navigate(`/session/${sessionId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl p-8 space-y-6 border border-slate-700">
        <h1 className="text-3xl font-bold text-center text-green-400">SocraTeach</h1>
        <p className="text-center text-gray-300">Ask a question or upload a problem to begin your Socratic journey.</p>

        {/* Text Input */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Type your problem</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-400 focus:border-green-400"
            placeholder="e.g. How do I solve quadratic equations?"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Or upload an image</label>
          <label className="flex items-center justify-center w-full h-32 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-green-400 transition">
            <div className="flex flex-col items-center">
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-sm text-gray-400">{image ? image.name : 'Click to choose image'}</span>
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        {/* Quick Picker */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Quick start from bank</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEST_PROBLEMS.map((p) => (
              <button
                key={p}
                onClick={() => setText(p)}
                className="text-left p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-green-400 hover:bg-slate-800 transition text-gray-300 text-sm"
              >
                <BookOpen className="inline w-4 h-4 mr-2 text-green-400" />
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || (!text.trim() && !image)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition"
        >
          <Play className="w-5 h-5" />
          {loading ? 'Starting session…' : 'Start Socratic Session'}
        </button>
      </div>
    </div>
  );
}