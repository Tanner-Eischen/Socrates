import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import api from '../api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  activeSessions: number;
}

export default function Admin() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/analytics/system')
    ])
      .then(([usersRes, metricsRes]) => {
        setUsers(usersRes.data.data);
        setMetrics(metricsRes.data.data);
      })
      .catch(err => {
        console.error('Failed to load admin data:', err);
        toast.error('Failed to load admin data');
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/users/${userId}`, { isActive: !currentStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
      toast.success('User status updated');
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-slate-400">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Socrates Admin</h1>
            <Link to="/dashboard" className="text-sm text-slate-300 hover:text-white">
              ← Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.name}</span>
            <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">Admin Panel</h2>
          <p className="mt-2 text-slate-400">Manage users and monitor system health</p>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="text-sm text-slate-400">Total Users</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {metrics?.totalUsers || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="text-sm text-slate-400">Active Users</div>
            <div className="mt-2 text-3xl font-bold text-green-400">
              {metrics?.activeUsers || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="text-sm text-slate-400">Total Sessions</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {metrics?.totalSessions || 0}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <div className="text-sm text-slate-400">Active Sessions</div>
            <div className="mt-2 text-3xl font-bold text-primary">
              {metrics?.activeSessions || 0}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-white/5 bg-surface overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-xl font-semibold text-white">User Management</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{u.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        u.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-400' 
                          : u.role === 'tutor'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-white/5 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        u.isActive
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleUserStatus(u.id, u.isActive)}
                        className="text-primary hover:underline"
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

