import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { submitProblemImage, submitProblemText } from '../api';
import { Upload, BookOpen, Play, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TEST_PROBLEMS = [
  'Solve 3x + 5 = 11',
  'Explain why the sky is blue',
  'How do I find the area of a circle?',
  'What is the difference between speed and velocity?',
];

export default function ProblemInput() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const navigate = useNavigate();

  const handleImageChange = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }
    
    setError(null);
    setImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageChange(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageChange(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, []);

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image) {
      setError('Please provide either text or an image');
      return;
    }
    
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      let submittedProblemId: string;
      
      if (image) {
        // Simulate progress for image upload
        setUploadProgress(30);
        const res = await submitProblemImage(image);
        setUploadProgress(70);
        
        if (!res.success || !res.data?.id) {
          throw new Error(res.message || 'Failed to process image');
        }
        
        submittedProblemId = res.data.id;
        setUploadProgress(90);
      } else {
        setUploadProgress(50);
        const res = await submitProblemText(text);
        
        if (!res.success || !res.data?.id) {
          throw new Error(res.message || 'Failed to process problem');
        }
        
        submittedProblemId = res.data.id;
        setUploadProgress(80);
      }
      
      setUploadProgress(100);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate to session page with submittedProblemId - Session component will create the actual session
      navigate(`/session/new?submittedProblemId=${submittedProblemId}`);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'An error occurred. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-6 border-2 border-amber-200">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">Socrates</h1>
        <p className="text-center text-gray-700">Ask a question or upload a problem to begin your Socratic journey.</p>

        {/* Text Input */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900">Type your problem</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full bg-white border-2 border-amber-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="e.g. How do I solve quadratic equations?"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900">Or upload an image</label>
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative w-full min-h-32 bg-amber-50 border-2 border-dashed rounded-lg transition-all ${
              isDragging 
                ? 'border-amber-500 bg-amber-100' 
                : 'border-amber-300 hover:border-amber-500'
            }`}
          >
            {imagePreview ? (
              <div className="relative p-4">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white transition"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs text-gray-600 mt-2 text-center">{image?.name || 'Image'}</p>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer p-4">
                <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-amber-600' : 'text-amber-500'}`} />
                <span className={`text-sm ${isDragging ? 'text-amber-700' : 'text-gray-600'}`}>
                  {isDragging ? 'Drop image here' : 'Click to choose or drag and drop'}
                </span>
                <span className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</span>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileInputChange} 
                  className="hidden" 
                />
              </label>
            )}
          </div>
          
          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">Uploading...</span>
                <span className="text-xs text-gray-700">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="mt-2 flex items-center gap-2 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Quick Picker */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900">Quick start from bank</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEST_PROBLEMS.map((p) => (
              <button
                key={p}
                onClick={() => setText(p)}
                className="text-left p-3 rounded-lg bg-white border-2 border-amber-200 hover:border-amber-400 hover:shadow-md transition text-gray-900 text-sm"
              >
                <BookOpen className="inline w-4 h-4 mr-2 text-amber-600" />
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || (!text.trim() && !image)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-lg transition-all"
        >
          <Play className="w-5 h-5" />
          {loading ? 'Starting session…' : 'Start Socratic Session'}
        </button>
      </div>
    </div>
  );
}