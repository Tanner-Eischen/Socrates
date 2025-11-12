import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import toast from 'react-hot-toast';
import { GraduationCap, Mail, Lock, User } from 'lucide-react';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        // Register new user
        const { data } = await api.post('/auth/register', {
          email,
          password,
          name: name || email.split('@')[0], // Use email prefix if name not provided
        });
        localStorage.setItem('token', data.token);
        toast.success('Account created successfully!');
        navigate('/dashboard', { replace: true });
      } else {
        // Login existing user
        await login(email, password);
        toast.success('Logged in successfully!');
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
        (isRegistering ? 'Registration failed. Please try again.' : 'Login failed. Please try again.');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SocraTeach</h1>
          <p className="text-gray-600">
            {isRegistering ? 'Create your account to get started' : 'Sign in to continue your learning journey'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-10"
                  required={isRegistering}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegistering ? "At least 8 characters" : "Enter your password"}
                className="pl-10"
                required
                minLength={isRegistering ? 8 : undefined}
              />
            </div>
            {isRegistering && (
              <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {loading 
              ? (isRegistering ? 'Creating account...' : 'Signing in...') 
              : (isRegistering ? 'Create Account' : 'Sign In')
            }
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-600">
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setName('');
                setEmail('');
                setPassword('');
              }}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              {isRegistering ? 'Sign in instead' : 'Create account'}
            </button>
          </p>
          
          {!isRegistering && (
            <p className="text-xs text-gray-500">
              Or{' '}
              <button
                onClick={() => {
                  setEmail('test@example.com');
                  setPassword('password123');
                }}
                className="text-amber-600 hover:text-amber-700 font-medium"
              >
                use test account
              </button>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

