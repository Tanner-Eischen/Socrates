import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  accuracyOverTime: Array<{ date: string; accuracy: number }>;
  timeBySubject: Array<{ subject: string; minutes: number }>;
  topicMastery: Array<{ topic: string; mastery: number }>;
}

export default function Analytics() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    api
      .get(`/analytics/user?timeframe=${timeframe}`)
      .then((res) => {
        setData(res.data.data);
      })
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false));
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-slate-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
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
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Analytics</h2>
            <p className="mt-2 text-slate-400">
              Track your learning progress and insights
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2 rounded-xl border border-white/10 bg-surface p-1">
            {['week', 'month', 'year'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  timeframe === tf
                    ? 'bg-primary text-black'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* Accuracy Over Time */}
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <h3 className="mb-6 text-xl font-semibold text-white">
              Accuracy Over Time
            </h3>
            {data?.accuracyOverTime && data.accuracyOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.accuracyOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#11151B',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#6EE7F5"
                    strokeWidth={2}
                    dot={{ fill: '#6EE7F5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-slate-400">
                No data available for this timeframe
              </div>
            )}
          </div>

          {/* Time Spent by Subject */}
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <h3 className="mb-6 text-xl font-semibold text-white">
              Time Spent by Subject
            </h3>
            {data?.timeBySubject && data.timeBySubject.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.timeBySubject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="subject" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#11151B',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="minutes" fill="#6EE7F5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-slate-400">
                No data available for this timeframe
              </div>
            )}
          </div>

          {/* Topic Mastery */}
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <h3 className="mb-6 text-xl font-semibold text-white">
              Topic Mastery
            </h3>
            {data?.topicMastery && data.topicMastery.length > 0 ? (
              <div className="space-y-4">
                {data.topicMastery.map((topic) => (
                  <div key={topic.topic}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-slate-300">{topic.topic}</span>
                      <span className="text-sm font-semibold text-primary">
                        {topic.mastery}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${topic.mastery}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                No data available for this timeframe
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

