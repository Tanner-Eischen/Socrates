import { useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import api from '../api';

export default function Profile() {
  const { user } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">Profile Settings</h2>
          <p className="mt-2 text-gray-600">Manage your account information</p>
        </div>

        {success && (
          <div className="mb-6 rounded-xl bg-emerald-50 border-2 border-emerald-200 p-4 text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Information */}
          <div className="rounded-2xl border-2 border-amber-200 bg-white/80 backdrop-blur-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Profile Information
              </h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    defaultValue={user?.name}
                    className="w-full rounded-xl bg-white border-2 border-amber-200 p-3 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={user?.email}
                    className="w-full rounded-xl bg-white border-2 border-amber-200 p-3 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-6 py-2 font-semibold text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border-2 border-amber-200 px-6 py-2 text-sm text-gray-700 hover:bg-amber-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-600">Name</div>
                  <div className="text-gray-900 font-medium">{user?.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Email</div>
                  <div className="text-gray-900 font-medium">{user?.email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Role</div>
                  <div className="text-gray-900 font-medium capitalize">{user?.role}</div>
                </div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="rounded-2xl border-2 border-amber-200 bg-white/80 backdrop-blur-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Change Password
              </h3>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all"
                >
                  Change Password
                </button>
              )}
            </div>

            {changingPassword && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-900 mb-2">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    className="w-full rounded-xl bg-white border-2 border-amber-200 p-3 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900 mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-xl bg-white border-2 border-amber-200 p-3 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-xl bg-white border-2 border-amber-200 p-3 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-6 py-2 font-semibold text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangingPassword(false)}
                    className="rounded-lg border-2 border-amber-200 px-6 py-2 text-sm text-gray-700 hover:bg-amber-50 transition-all"
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

