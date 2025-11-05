import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const role = formData.get('role') as string;

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', { name, email, password, role });
      // Redirect to login after successful registration
      navigate('/', { state: { message: 'Registration successful! Please login.' } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">SocraTeach</h1>
          <p className="mt-2 text-slate-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/5 bg-surface p-8">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm text-slate-300 mb-2">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
              placeholder="John Doe"
            />
          </div>

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
              minLength={6}
              className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-slate-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm text-slate-300 mb-2">I am a...</label>
            <select
              id="role"
              name="role"
              required
              defaultValue="student"
              className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white focus:border-primary focus:outline-none"
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary p-3 font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

