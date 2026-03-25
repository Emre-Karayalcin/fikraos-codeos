import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { OrbVisualization } from "@/components/orb/OrbVisualization";
import { RatingModal, useAutoRatingTrigger } from "@/components/entrepreneur/RatingModal";
import {
  FiTool,
  FiZap,
  FiUsers,
  FiBookOpen,
  FiBarChart2,
  FiBell,
  FiLogOut
} from "react-icons/fi";

interface CleanCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  path: string;
}

export default function EntrepreneurDashboard() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();

  // Auto-trigger rating modal for unrated completed sessions
  const {
    sessionToRate,
    showRatingModal,
    setShowRatingModal,
    handleSkip,
  } = useAutoRatingTrigger(user?.id || 0);

  const handleSignOut = () => {
    signOut();
    localStorage.removeItem('user');
    window.location.href = '/signin';
  };

  const getUserInitials = () => {
    if (!user) return "";
    return user.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const cards: CleanCard[] = [
    {
      id: 'overview',
      title: 'Overview',
      description: 'Track your progress and stats',
      icon: FiBarChart2,
      color: 'text-gray-600',
      path: '/overview'
    },
    {
      id: 'launchpad',
      title: 'Launchpad',
      description: 'AI-powered idea development',
      icon: FiZap,
      color: 'text-blue-600',
      path: '/launchpad'
    },
    {
      id: 'toolkit',
      title: 'Toolkit',
      description: 'Essential tools for startups',
      icon: FiTool,
      color: 'text-purple-600',
      path: '/toolkit'
    },
    {
      id: 'mentorship',
      title: 'Mentorship',
      description: 'Connect with expert mentors',
      icon: FiUsers,
      color: 'text-green-600',
      path: '/mentorship'
    },
    {
      id: 'academy',
      title: 'Training Modules',
      description: 'Learn essential business skills',
      icon: FiBookOpen,
      color: 'text-orange-600',
      path: '/academy'
    }
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-premium-gradient">
      {/* Header */}
      <header className="header-premium h-16 flex items-center justify-between px-6 sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <img src="/codelogo.png" alt="CODE" className="h-7 code-logo" style={{ display: 'block', marginTop: '-4px', width: 'auto' }} loading="eager" />
          <span className="text-2xl font-bold text-gray-900">OS</span>
        </div>

        {/* Right Side - Notifications and User */}
        <div className="flex items-center gap-4">
          {/* Notification Icon */}
          <button className="relative p-2 rounded-xl hover:bg-white/80 hover:shadow-sm transition-all duration-200 interactive-hover">
            <FiBell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-sm font-medium shadow-sm">
              {getUserInitials()}
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">{user.fullName}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl hover:bg-white/80 hover:shadow-sm transition-all duration-200 interactive-hover"
            title="Sign Out"
          >
            <FiLogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      {/* Background Gradient Blobs - Full Viewport */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(24, 80, 238, 0.12)' }}></div>
        <div className="absolute top-40 right-20 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(39, 75, 219, 0.15)' }}></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(24, 80, 238, 0.1)' }}></div>
      </div>

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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="page-container space-y-6 py-6 pb-4 relative z-10">
          {/* Progress Indicator */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-br from-primary to-primary-hover rounded-full shadow-glow-sm"></div>
                  <span className="font-medium text-primary">Application Phase</span>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-muted-foreground">Evaluation</span>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-muted-foreground">Incubation</span>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-muted-foreground">Demo Day</span>
                </div>
              </div>
              <div className="text-muted-foreground">
                Phase 1 of 4 • 45 days remaining
              </div>
            </div>
          </div>

          {/* Welcome Section - Glassmorphic Hero */}
          <div className="text-center py-12 relative min-h-[200px]">
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <div className="w-96 h-96 bg-gradient-to-br from-primary/30 to-purple-400/30 rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h1 className="text-5xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
                <span>Welcome to</span>
                <img src="/codelogo.png" alt="CODE" className="h-12 code-logo" style={{ display: 'block', marginTop: '-8px', width: 'auto' }} loading="eager" />
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">OS</span>
              </h1>
              <p className="text-muted-foreground text-lg font-medium">Choose a module to accelerate your entrepreneurial journey</p>
            </div>
          </div>

          {/* Premium OS Tiles Grid with Glassmorphism */}
          <div className="flex justify-center px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-7xl w-full min-h-[180px]">
            {cards.map((card, index) => (
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
                {/* Gradient Glow on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-500/0 group-hover:from-primary/5 group-hover:to-purple-500/5 transition-all duration-300 rounded-3xl"></div>

                {/* Top Light Reflection */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>

                {/* Icon with Premium Container */}
                <div className="relative z-10 flex items-center justify-start">
                  <div className="p-3 rounded-2xl transition-all duration-300 group-hover:scale-110" style={{
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  }}>
                    <card.icon size={36} className={`${card.color} transition-transform duration-300 group-hover:scale-110`} />
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10 space-y-2">
                  <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{card.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 opacity-80">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </main>

      {/* Auto-triggered Rating Modal */}
      {sessionToRate && (
        <RatingModal
          session={sessionToRate}
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
