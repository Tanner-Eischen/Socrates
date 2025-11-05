import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">SocraTeach</h1>
          <p className="mt-2 text-slate-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/5 bg-surface p-8">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm text-slate-300 mb-2">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-slate-300 mb-2">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary p-3 font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

