import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  TrendingUp, 
  Users, 
  User, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

export default function Navigation() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/assessments', label: 'Learning Assessments', icon: BookOpen },
    { path: '/new', label: 'New Session', icon: PlusCircle },
    { path: '/analytics', label: 'Analytics', icon: TrendingUp },
    { path: '/collaboration', label: 'Collaborate', icon: Users },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  // Add admin link if user is admin
  if (user?.role === 'admin') {
    navLinks.push({ path: '/admin', label: 'Admin', icon: Settings });
  }

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-white border-r-2 border-amber-200 z-50 transition-all duration-300 shadow-lg ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b-2 border-amber-200">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-3 group"
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent tracking-tight">
                Socrates
              </span>
            )}
          </Link>
          
          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-amber-50 text-amber-700 hover:text-amber-900 transition-all"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${active 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-amber-50 hover:text-amber-900'
                  }
                `}
                title={isCollapsed ? link.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? '' : 'group-hover:scale-110 transition-transform'}`} />
                {!isCollapsed && (
                  <span className="font-medium text-sm">
                    {link.label}
                  </span>
                )}
                {active && !isCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        {!loading && (
          <div className="p-4 border-t-2 border-amber-200">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold shadow-md">
                  {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {user?.email || 'user@example.com'}
                  </div>
                </div>
              )}
            </div>
            
            {/* Logout Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                try {
                  logout();
                  navigate('/dashboard', { replace: true });
                } catch (error) {
                  console.error('Logout error:', error);
                  // Force logout even if there's an error
                  localStorage.setItem('hasLoggedOut', 'true');
                  localStorage.removeItem('token');
                  navigate('/dashboard', { replace: true });
                }
              }}
              className={`
                mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl 
                bg-amber-50 hover:bg-red-50 text-gray-700 hover:text-red-600 
                transition-all duration-200 group border border-amber-200 hover:border-red-200
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? 'Logout' : ''}
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {!isCollapsed && (
                <span className="text-sm font-medium">Logout</span>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

