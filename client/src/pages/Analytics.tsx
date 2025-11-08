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
import { TrendingUp, Target, Clock, Award, Brain, Zap } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

interface AnalyticsData {
  accuracyOverTime: Array<{ date: string; accuracy: number }>;
  timeBySubject: Array<{ subject: string; minutes: number }>;
  topicMastery: Array<{ topic: string; mastery: number }>;
}

// Placeholder data
const PLACEHOLDER_ACCURACY_DATA = [
  { date: 'Mon', accuracy: 65 },
  { date: 'Tue', accuracy: 72 },
  { date: 'Wed', accuracy: 68 },
  { date: 'Thu', accuracy: 78 },
  { date: 'Fri', accuracy: 82 },
  { date: 'Sat', accuracy: 85 },
  { date: 'Sun', accuracy: 88 },
];

const PLACEHOLDER_TIME_DATA = [
  { subject: 'Math', minutes: 120 },
  { subject: 'Science', minutes: 85 },
  { subject: 'History', minutes: 60 },
  { subject: 'Language', minutes: 45 },
];

const PLACEHOLDER_MASTERY_DATA = [
  { topic: 'Algebra', mastery: 85 },
  { topic: 'Geometry', mastery: 72 },
  { topic: 'Calculus', mastery: 68 },
  { topic: 'Statistics', mastery: 90 },
];

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
      .catch((err) => {
        console.error('Failed to load analytics:', err);
        // Use placeholder data if API fails
        setData({
          accuracyOverTime: PLACEHOLDER_ACCURACY_DATA,
          timeBySubject: PLACEHOLDER_TIME_DATA,
          topicMastery: PLACEHOLDER_MASTERY_DATA,
        });
      })
      .finally(() => setLoading(false));
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-gray-700">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
              Analytics
            </h1>
            <p className="mt-1 text-gray-600">Track your learning progress and insights</p>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {['week', 'month', 'year'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border-2 border-amber-200 hover:border-amber-400'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-2 border-amber-200 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg. Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">78%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 border-emerald-200 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Study Time</p>
                <p className="text-2xl font-bold text-gray-900">5.2h</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 border-purple-200 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Sessions</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 border-blue-200 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Mastery</p>
                <p className="text-2xl font-bold text-gray-900">76%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Accuracy Over Time */}
          <Card className="p-6 border-2 border-amber-200 bg-white/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-600" />
              Accuracy Over Time
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data?.accuracyOverTime || PLACEHOLDER_ACCURACY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f59e0b22" />
                <XAxis dataKey="date" stroke="#78716c" />
                <YAxis stroke="#78716c" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '2px solid #fbbf24',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Time by Subject */}
          <Card className="p-6 border-2 border-amber-200 bg-white/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Time by Subject
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.timeBySubject || PLACEHOLDER_TIME_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#10b98122" />
                <XAxis dataKey="subject" stroke="#78716c" />
                <YAxis stroke="#78716c" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '2px solid #10b981',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="minutes" fill="url(#emeraldGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Topic Mastery */}
        <Card className="p-6 border-2 border-amber-200 bg-white/80 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Topic Mastery
          </h2>
          <div className="space-y-4">
            {(data?.topicMastery || PLACEHOLDER_MASTERY_DATA).map((topic) => (
              <div key={topic.topic}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{topic.topic}</span>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                    {topic.mastery}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                    style={{ width: `${topic.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Achievements */}
        <Card className="mt-6 p-6 border-2 border-amber-200 bg-white/80 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Recent Achievements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Fast Learner', desc: 'Completed 5 sessions in a day', color: 'amber' },
              { title: 'Deep Thinker', desc: 'Reached depth level 5', color: 'purple' },
              { title: 'Perfect Score', desc: 'Achieved 100% accuracy', color: 'emerald' },
            ].map((achievement) => (
              <div
                key={achievement.title}
                className={`p-4 rounded-xl border-2 border-${achievement.color}-200 bg-${achievement.color}-50`}
              >
                <div className={`inline-block p-2 rounded-lg bg-${achievement.color}-100 mb-2`}>
                  <Award className={`w-5 h-5 text-${achievement.color}-600`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{achievement.title}</h3>
                <p className="text-sm text-gray-600">{achievement.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
