import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { submitProblemText, submitProblemImage } from '../api';
import MathRenderer from '../components/MathRenderer';

type TabType = 'text' | 'image';

export default function SubmitProblem() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [problemText, setProblemText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTextSubmit = async () => {
    if (!problemText.trim()) {
      toast.error('Please enter a problem');
      return;
    }

    setLoading(true);
    try {
      const result = await submitProblemText(problemText);
      toast.success('Problem parsed successfully!');
      
      // Navigate to create session with submitted problem
      navigate(`/session/new?submittedProblemId=${result.data.id}`);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to process problem');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be smaller than 20MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    setSelectedImage(file);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSubmit = async () => {
    if (!selectedImage) {
      toast.error('Please select an image');
      return;
    }

    setLoading(true);
    try {
      const result = await submitProblemImage(selectedImage);
      toast.success('Image processed successfully!');
      
      // Navigate to create session with submitted problem
      navigate(`/session/new?submittedProblemId=${result.data.id}`);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  const insertMathSymbol = (symbol: string) => {
    setProblemText(prev => prev + symbol);
  };

  const mathSymbols = [
    { symbol: '∫', label: 'Integral' },
    { symbol: '√', label: 'Square root' },
    { symbol: 'π', label: 'Pi' },
    { symbol: 'θ', label: 'Theta' },
    { symbol: '∞', label: 'Infinity' },
    { symbol: '≤', label: 'Less than or equal' },
    { symbol: '≥', label: 'Greater than or equal' },
    { symbol: '≠', label: 'Not equal' },
    { symbol: '±', label: 'Plus minus' },
    { symbol: '×', label: 'Times' },
    { symbol: '÷', label: 'Divide' },
    { symbol: '²', label: 'Squared' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Socrates</h1>
            <Link to="/dashboard" className="text-sm text-slate-300 hover:text-white">
              ← Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.name || user?.email}</span>
            <button 
              onClick={() => {
                logout();
                navigate('/dashboard', { replace: true });
              }} 
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">Submit Your Problem</h2>
          <p className="mt-2 text-slate-400">
            Paste your math problem or upload an image, and our AI tutor will guide you through solving it
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex gap-2 rounded-xl border border-white/10 bg-surface p-1 w-fit">
          <button
            onClick={() => setActiveTab('text')}
            className={`rounded-lg px-6 py-2 text-sm font-medium transition ${
              activeTab === 'text'
                ? 'bg-primary text-black'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Type Problem
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`rounded-lg px-6 py-2 text-sm font-medium transition ${
              activeTab === 'image'
                ? 'bg-primary text-black'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Upload Image
          </button>
        </div>

        {/* Text Input Tab */}
        {activeTab === 'text' && (
          <div className="space-y-6">
            {/* Math Symbols Helper */}
            <div className="rounded-2xl border border-white/5 bg-surface p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-300">Quick Math Symbols</h3>
              <div className="flex flex-wrap gap-2">
                {mathSymbols.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => insertMathSymbol(item.symbol)}
                    className="rounded-lg border border-white/10 bg-bg px-3 py-2 text-white hover:bg-white/5 transition"
                    title={item.label}
                  >
                    {item.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div className="rounded-2xl border border-white/5 bg-surface p-6">
              <label htmlFor="problemText" className="block text-sm font-medium text-slate-300 mb-3">
                Enter Your Problem
              </label>
              <textarea
                id="problemText"
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                placeholder="Example: Solve for x: 2x + 5 = 13&#10;&#10;You can also use LaTeX notation like: $x^2 + 3x - 4 = 0$"
                className="w-full h-48 rounded-xl bg-bg border border-white/10 p-4 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none resize-none font-mono"
              />
            </div>

            {/* Preview */}
            {problemText && (
              <div className="rounded-2xl border border-white/5 bg-surface p-6">
                <h3 className="mb-3 text-sm font-medium text-slate-300">Preview</h3>
                <div className="text-white">
                  <MathRenderer content={problemText} />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleTextSubmit}
              disabled={loading || !problemText.trim()}
              className="w-full rounded-xl bg-primary p-4 font-semibold text-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Submit Problem'}
            </button>
          </div>
        )}

        {/* Image Upload Tab */}
        {activeTab === 'image' && (
          <div className="space-y-6">
            {/* Upload Zone */}
            <div className="rounded-2xl border-2 border-dashed border-white/10 bg-surface p-12 text-center hover:border-primary/30 transition">
              <input
                type="file"
                id="imageUpload"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
              <label htmlFor="imageUpload" className="cursor-pointer">
                <div className="mb-4 text-6xl">📷</div>
                <div className="mb-2 text-lg font-medium text-white">
                  Click to upload or drag and drop
                </div>
                <div className="text-sm text-slate-400">
                  PNG, JPG, GIF, WebP (max 20MB)
                </div>
              </label>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="rounded-2xl border border-white/5 bg-surface p-6">
                <h3 className="mb-3 text-sm font-medium text-slate-300">Image Preview</h3>
                <img
                  src={imagePreview}
                  alt="Problem preview"
                  className="max-w-full h-auto rounded-xl border border-white/10"
                />
                <div className="mt-3 text-sm text-slate-400">
                  {selectedImage?.name} ({(selectedImage!.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleImageSubmit}
              disabled={loading || !selectedImage}
              className="w-full rounded-xl bg-primary p-4 font-semibold text-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing Image...' : 'Submit Image'}
            </button>
          </div>
        )}

        {/* Info Note */}
        <div className="mt-8 rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-slate-400">
          <strong className="text-slate-300"></strong> 
        </div>
      </main>
    </div>
  );
}

