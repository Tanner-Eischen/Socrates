import { useState, useRef } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string, imageFile?: File) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      alert('Image must be smaller than 20MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
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

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && !disabled) {
      onSendMessage(input.trim(), selectedImage || undefined);
      setInput('');
      removeImage();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Image Preview */}
      {imagePreview && (
        <div style={{ 
          marginBottom: '10px', 
          position: 'relative', 
          display: 'inline-block' 
        }}>
          <img
            src={imagePreview}
            alt="Preview"
            style={{
              maxWidth: '200px',
              maxHeight: '120px',
              borderRadius: '8px',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              objectFit: 'contain'
            }}
          />
          <button
            type="button"
            onClick={removeImage}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              color: 'white',
              border: '2px solid white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              lineHeight: '1'
            }}
            title="Remove image"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex gap-3 items-center p-4 rounded-lg border-2 border-white/20 bg-slate-900/20">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          style={{
            padding: '8px',
            color: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Upload image"
        >
          <svg
            style={{ width: '20px', height: '20px' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your tutor a question..."
          className="flex-1 bg-transparent chalk-input outline-none"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || (!input.trim() && !selectedImage)}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white/90 hover:bg-white transition-colors flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <svg 
            className="h-5 w-5 text-slate-800" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      <style>{`
        .chalk-input {
          font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
          font-size: 1rem;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        
        .chalk-input::placeholder {
          color: rgba(255,255,255,0.4);
          text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
        }
      `}</style>
    </form>
  );
}

