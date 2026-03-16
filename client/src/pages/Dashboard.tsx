import React from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { OrbVisualization } from "@/components/orb/OrbVisualization";
import MentorDashboard from "./MentorDashboard";
import { CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  FiZap,
  FiUsers,
  FiBookOpen,
  FiBarChart2,
  FiLogOut,
  FiSearch,
  FiStar,
} from "react-icons/fi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildIdeaInitialMessage } from "@/lib/buildIdeaMessage";
import toast from "react-hot-toast";

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

  const { data: organizations, isLoading: orgLoading } = useQuery<any[]>({
    queryKey: ['/api/organizations'],
    queryFn: async () => {
      const res = await fetch('/api/organizations', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const currentOrg = Array.isArray(organizations) ? organizations[0] : undefined;

  // Fetch user's submitted project to show idea status bar
  const { data: userProjects } = useQuery<any[]>({
    queryKey: ['/api/organizations', currentOrg?.id, 'projects-user'],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${currentOrg!.id}/projects-user`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !!currentOrg?.id,
    staleTime: 30_000,
  });

  const submittedProjects = Array.isArray(userProjects)
    ? userProjects.filter((p: any) => p.submitted)
    : [];

  const [activeSlide, setActiveSlide] = useState(0);
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (submittedProjects.length <= 1) return;
    slideTimer.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % submittedProjects.length);
    }, 4000);
    return () => { if (slideTimer.current) clearInterval(slideTimer.current); };
  }, [submittedProjects.length]);

  const goToSlide = (idx: number) => {
    setActiveSlide(idx);
    if (slideTimer.current) clearInterval(slideTimer.current);
    slideTimer.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % submittedProjects.length);
    }, 4000);
  };

  const { data: userRole, isLoading: roleLoading } = useQuery<{ role: string } | null>({
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
  // If user is already known to be admin (from /api/user response), skip spinner
  const userIsAdmin = !!(user as any)?.isAdmin;
  // Wait for role to resolve only for non-admin users (to avoid flash of member dashboard for mentors)
  const isResolvingRole = !userIsAdmin && (orgLoading || (!!currentOrg?.id && roleLoading));

  // Popup: show on first visit for approved-via-application members with no projects
  const [popupDismissed, setPopupDismissed] = React.useState(() => {
    return !!sessionStorage.getItem('onboarding_popup_shown');
  });

  const { data: userProjects } = useQuery<any[]>({
    queryKey: ['/api/organizations', currentOrg?.id, 'projects-user'],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const res = await fetch(`/api/organizations/${currentOrg.id}/projects-user`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !!currentOrg?.id && !isMentor && !userIsAdmin,
  });

  const { data: myApplication } = useQuery<any>({
    queryKey: ['/api/my-application'],
    queryFn: async () => {
      const res = await fetch('/api/my-application', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && !isMentor && !userIsAdmin,
  });

  const showPopup =
    !popupDismissed &&
    myApplication != null &&
    Array.isArray(userProjects) &&
    userProjects.length === 0;

  const dismissPopup = () => {
    sessionStorage.setItem('onboarding_popup_shown', '1');
    setPopupDismissed(true);
  };

  const buildMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg || !myApplication) throw new Error('Missing data');

      // Step 1: Create project
      const projectResp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgId: currentOrg.id,
          challengeId: myApplication.challengeId || null,
          title: myApplication.ideaName || 'My Idea',
          description: `${myApplication.solutionDescription || ''}\n\nDifferentiator: ${myApplication.differentiator || ''}\n\nTarget User: ${myApplication.targetUser || ''}`,
          type: 'LAUNCH',
        }),
      });
      if (!projectResp.ok) throw new Error('Failed to create project');
      const project = await projectResp.json();

      // Step 2: Create chat
      const chatResp = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId: project.id, title: 'Chat' }),
      });
      if (!chatResp.ok) throw new Error('Failed to create chat');
      const chat = await chatResp.json();

      // Step 3: Build and post initial message
      const initialMessage = buildIdeaInitialMessage({
        ideaName: myApplication.ideaName || 'My Idea',
        ideaDescription: myApplication.solutionDescription || '',
        countryCode: 'SA',
        countryName: 'Saudi Arabia',
        uniqueness: myApplication.differentiator || '',
      });

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatId: chat.id, content: initialMessage, role: 'user' }),
      });

      // Step 4: Trigger AI agent
      await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: initialMessage, chatId: chat.id, language: 'en' }),
      });

      return { chat };
    },
    onSuccess: ({ chat }) => {
      dismissPopup();
      setLocation(`/w/${slug}/chat/${chat.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to start generation');
    },
  });

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

  if (isResolvingRole) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isMentor) {
    return <MentorDashboard />;
  }

  return (
    <>
    {/* First-visit idea generation popup */}
    <Dialog open={showPopup} onOpenChange={(open) => { if (!open) dismissPopup(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Generate Your Business Model &amp; Marketing Overview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600 leading-relaxed">
            Based on your idea submission, our AI is ready to build your complete business model
            — including SWOT analysis, lean canvas, market research, and more.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={() => buildMutation.mutate()}
              disabled={buildMutation.isPending}
            >
              {buildMutation.isPending ? "Generating…" : "Get Started"}
            </Button>
            <Button variant="ghost" onClick={dismissPopup} disabled={buildMutation.isPending}>
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
        <div className="flex items-center gap-4 relative-z-20-2">
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

          {/* Submitted Ideas Status Bar — auto-slides when multiple */}
          {submittedProjects.length > 0 && (() => {
            const STEPS = [
              { key: 'BACKLOG',       label: 'Backlog' },
              { key: 'UNDER_REVIEW',  label: 'Under Review' },
              { key: 'SHORTLISTED',   label: 'Shortlisted' },
              { key: 'IN_INCUBATION', label: 'In Incubation' },
            ];
            const currentSlideIdx = activeSlide % submittedProjects.length;
            const submittedProject = submittedProjects[currentSlideIdx];
            const status = submittedProject.status || 'BACKLOG';
            const isArchived = status === 'ARCHIVED';
            const currentIdx = STEPS.findIndex(s => s.key === status);
            const activeIdx = currentIdx === -1 ? 0 : currentIdx;
            const phaseNum = activeIdx + 1;
            const totalSteps = STEPS.length;
            const fillPct = activeIdx === 0 ? 0 : (activeIdx / (totalSteps - 1)) * 100;
            const multi = submittedProjects.length > 1;

            return (
              <div
                className="relative z-10 mx-auto w-full max-w-2xl rounded-xl px-5 py-3 mb-2"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Prev arrow */}
                    {multi && (
                      <button
                        onClick={() => goToSlide((currentSlideIdx - 1 + submittedProjects.length) % submittedProjects.length)}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                    {isArchived ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 flex-shrink-0">
                        Archived
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Submitted
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-700 truncate">{submittedProject.title}</span>
                    {/* Next arrow */}
                    {multi && (
                      <button
                        onClick={() => goToSlide((currentSlideIdx + 1) % submittedProjects.length)}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Dot indicators */}
                    {multi && (
                      <div className="flex items-center gap-1">
                        {submittedProjects.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => goToSlide(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              i === currentSlideIdx ? 'bg-primary' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    {!isArchived && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Phase {phaseNum} of {totalSteps}
                      </span>
                    )}
                  </div>
                </div>

                {/* Step track */}
                <div className="relative flex items-start justify-between">
                  <div className="absolute top-[5px] left-0 right-0 h-px bg-gray-200" />
                  {!isArchived && (
                    <div
                      className="absolute top-[5px] left-0 h-px bg-primary transition-all duration-500"
                      style={{ width: `${fillPct}%` }}
                    />
                  )}
                  {STEPS.map((step, idx) => {
                    const isDone = idx < activeIdx;
                    const isActive = idx === activeIdx && !isArchived;
                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center" style={{ minWidth: 0 }}>
                        <div
                          className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
                            isArchived
                              ? 'border-gray-300 bg-gray-200'
                              : isDone
                              ? 'border-primary bg-primary'
                              : isActive
                              ? 'border-primary bg-white ring-2 ring-primary/20'
                              : 'border-gray-300 bg-white'
                          }`}
                        />
                        <span
                          className={`mt-1.5 text-[10px] font-medium whitespace-nowrap ${
                            isArchived ? 'text-gray-400' : isActive ? 'text-primary' : isDone ? 'text-gray-500' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
    </>
  );
}