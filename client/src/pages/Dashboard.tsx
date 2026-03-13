import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { OrbVisualization } from "@/components/orb/OrbVisualization";
import MentorDashboard from "./MentorDashboard";
import {
  FiZap,
  FiUsers,
  FiBookOpen,
  FiBarChart2,
  FiBell,
  FiLogOut,
  FiSearch,
  FiStar,
} from "react-icons/fi";

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  path: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { slug } = useParams<{ slug?: string }>();

  const { data: organizations } = useQuery<any[]>({
    queryKey: ['/api/organizations'],
    queryFn: async () => {
      const res = await fetch('/api/organizations', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const currentOrg = Array.isArray(organizations) ? organizations[0] : undefined;

  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ['/api/organizations', currentOrg?.id, 'admin', 'check-role'],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      const res = await fetch(`/api/organizations/${currentOrg.id}/admin/check-role`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && !!currentOrg?.id,
    retry: false,
  });

  const isMentor = userRole?.role === 'MENTOR';

  const handleSignOut = () => {
    logout();
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const getUserInitials = () => {
    if (!user) return "";
    const name = (user as any).fullName || `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || (user as any).username || '';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return (user as any).fullName || (user as any).firstName || (user as any).username || '';
  };

  const cards: DashboardCard[] = [
    {
      id: 'my-ideas',
      title: 'My Ideas',
      description: 'View and develop your ideas',
      icon: FiStar,
      color: 'text-gray-600',
      path: `/w/${slug}/my-ideas`,
    },
    {
      id: 'challenges',
      title: 'Challenges',
      description: 'Compete in active challenges',
      icon: FiZap,
      color: 'text-blue-600',
      path: `/w/${slug}/challenges`,
    },
    {
      id: 'research',
      title: 'Research',
      description: 'Explore market insights',
      icon: FiSearch,
      color: 'text-purple-600',
      path: `/w/${slug}/research`,
    },
    {
      id: 'experts',
      title: 'Experts',
      description: 'Connect with expert mentors',
      icon: FiUsers,
      color: 'text-green-600',
      path: `/w/${slug}/experts`,
    },
    {
      id: 'academy',
      title: 'Academy',
      description: 'Learn essential business skills',
      icon: FiBookOpen,
      color: 'text-orange-600',
      path: `/w/${slug}/academy`,
    },
  ];

  if (!user) {
    return null;
  }

  if (isMentor) {
    return <MentorDashboard />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 40%, #ede8ff 100%)' }}>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <img src="/codelogo.png" alt="Logo" className="h-7 object-contain dark:hidden" style={{ display: 'block', marginTop: '-2px' }} loading="eager" />
          <img src="/logo-code-light.jpeg" alt="Logo" className="h-7 object-contain hidden dark:block" style={{ display: 'none', marginTop: '-2px' }} loading="eager" />
          <span className="text-2xl font-bold text-gray-900">OS</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Notification Icon */}
          <button className="relative p-2 rounded-xl hover:bg-white/80 hover:shadow-sm transition-all duration-200">
            <FiBell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-medium shadow-sm">
              {getUserInitials()}
            </div>
            <div className="text-sm hidden sm:block">
              <p className="font-medium text-gray-900">{getUserDisplayName()}</p>
              <p className="text-xs text-gray-500 capitalize">{(user as any).role || 'Member'}</p>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl hover:bg-white/80 hover:shadow-sm transition-all duration-200"
            title="Sign Out"
          >
            <FiLogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      {/* 3D Orb - Fixed to Bottom of Viewport */}
      <div className="absolute left-1/2 pointer-events-none" style={{
        bottom: '-450px',
        transform: 'translateX(-50%)',
        zIndex: 1,
        opacity: 0.85,
        width: '1000px',
        height: '1000px',
      }}>
        <OrbVisualization state="idle" size={1000} />
      </div>

      {/* Background Gradient Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(24, 80, 238, 0.10)' }}></div>
        <div className="absolute top-40 right-20 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(99, 74, 219, 0.12)' }}></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(24, 80, 238, 0.08)' }}></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="max-w-7xl mx-auto px-6 space-y-6 py-6 pb-4 relative z-10">

          {/* Welcome Section */}
          <div className="text-center py-12 relative min-h-[180px]">
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <div className="w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(24,80,238,0.25) 0%, rgba(139,92,246,0.15) 100%)' }}></div>
            </div>
            <div className="relative z-10">
              <h1 className="text-5xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3 flex-wrap">
                <span>Welcome to</span>
                <img src="/codelogo.png" alt="Logo" className="h-12 object-contain dark:hidden" style={{ display: 'inline-block', marginTop: '-6px' }} loading="eager" />
                <img src="/logo-code-light.jpeg" alt="Logo" className="h-12 object-contain hidden dark:inline-block" style={{ marginTop: '-6px' }} loading="eager" />
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">OS</span>
              </h1>
              <p className="text-gray-500 text-lg font-medium">Choose a module to accelerate your entrepreneurial journey</p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex justify-center px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-7xl w-full min-h-[180px]">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="group relative overflow-hidden cursor-pointer rounded-3xl p-6 aspect-square min-h-[160px] flex flex-col justify-between transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.03)',
                    willChange: 'transform',
                  }}
                  onClick={() => setLocation(card.path)}
                >
                  {/* Hover Gradient */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(24,80,238,0.04) 0%, rgba(139,92,246,0.04) 100%)' }}></div>

                  {/* Top Light Reflection */}
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }}></div>

                  {/* Icon */}
                  <div className="relative z-10 flex items-center justify-start">
                    <div
                      className="p-3 rounded-2xl transition-all duration-300 group-hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    >
                      <card.icon size={36} className={`${card.color} transition-transform duration-300 group-hover:scale-110`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors">{card.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 opacity-80">{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}