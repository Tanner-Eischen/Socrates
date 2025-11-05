import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import api from '../api';

export default function Profile() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProfileUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    try {
      await api.patch('/users/me', { name, email });
      toast.success('Profile updated successfully!');
      setEditing(false);
      // Optionally refetch user data here
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully!');
      setChangingPassword(false);
      e.currentTarget.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">SocraTeach</h1>
            <Link
              to="/dashboard"
              className="text-sm text-slate-300 hover:text-white"
            >
              ← Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {user?.name || user?.email}
            </span>
            <button
              onClick={logout}
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
          <h2 className="text-3xl font-bold text-white">Profile Settings</h2>
          <p className="mt-2 text-slate-400">Manage your account information</p>
        </div>

        {success && (
          <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Information */}
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                Profile Information
              </h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm text-slate-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    defaultValue={user?.name}
                    className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={user?.email}
                    className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-primary px-6 py-2 font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-white/10 px-6 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-slate-400">Name</div>
                  <div className="text-white">{user?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Email</div>
                  <div className="text-white">{user?.email}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Role</div>
                  <div className="text-white capitalize">{user?.role}</div>
                </div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                Change Password
              </h3>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                >
                  Change Password
                </button>
              )}
            </div>

            {changingPassword && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm text-slate-300 mb-2">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm text-slate-300 mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-primary px-6 py-2 font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangingPassword(false)}
                    className="rounded-lg border border-white/10 px-6 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

