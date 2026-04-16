import React from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { OrbVisualization } from "@/components/orb/OrbVisualization";
import MentorDashboard from "./MentorDashboard";
import JudgeDashboard from "./JudgeDashboard";
import ClientDashboard from "./ClientDashboard";
import ConsultantDashboard from "./ConsultantDashboard";

import { useState } from "react";
import {
  FiZap,
  FiUsers,
  FiBookOpen,
  FiLogOut,
  FiSearch,
  FiCalendar,
  FiStar,
  FiPhone,
} from "react-icons/fi";
import { useBranding } from "@/contexts/BrandingContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildIdeaInitialMessage } from "@/lib/buildIdeaMessage";
import { RichTextViewer } from "@/components/editor/RichTextViewer";
import toast from "react-hot-toast";

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  path: string;
}

interface ProgramStep { titleEn: string; titleAr: string; }
interface ProgramProgress { orgId: string; currentStep: number; steps: ProgramStep[]; }

const DEFAULT_PROGRAM_STEPS: ProgramStep[] = [
  { titleEn: "Ideation & Business Foundations", titleAr: "الريادة وأسس الأعمال" },
  { titleEn: "Product Strategy & Validation",   titleAr: "استراتيجية المنتج والتحقق" },
  { titleEn: "Product Design & Insights",       titleAr: "تصميم المنتج والرؤى" },
  { titleEn: "Pitching & Presentation",         titleAr: "العرض التقديمي" },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { slug } = useParams<{ slug?: string }>();
  const { consultationEnabled } = useBranding();

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

  // Fetch program timeline progress
  const { data: programData } = useQuery<ProgramProgress>({
    queryKey: ['/api/program-progress', currentOrg?.id],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${currentOrg!.id}/program-progress`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!currentOrg?.id,
    staleTime: 60_000,
  });

  const programSteps: ProgramStep[] = programData?.steps ?? DEFAULT_PROGRAM_STEPS;
  const currentProgramStep: number = programData?.currentStep ?? 1;
  const lang = typeof navigator !== 'undefined' && navigator.language?.startsWith('ar') ? 'ar' : 'en';

  const isMentor = userRole?.role === 'MENTOR';
  // If user is already known to be admin (from /api/user response), skip spinner
  const userIsAdmin = !!(user as any)?.isAdmin;
  // Wait for role to resolve only for non-admin users (to avoid flash of member dashboard for mentors)
  const isResolvingRole = !userIsAdmin && (orgLoading || (!!currentOrg?.id && roleLoading));

  // Popup: show on first visit for approved-via-application members with no projects
  const [popupDismissed, setPopupDismissed] = React.useState(() => {
    return !!sessionStorage.getItem('onboarding_popup_shown');
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
    myApplication != null;

  // Participant consent gate — check for unaccepted PARTICIPANT_CONSENT declaration
  const [consentAgreed, setConsentAgreed] = useState(false);
  const { data: pendingConsent = [], refetch: refetchConsent } = useQuery<any[]>({
    queryKey: ["/api/declarations/my-pending/consent", currentOrg?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/workspaces/${currentOrg!.id}/declarations/my-pending?type=PARTICIPANT_CONSENT`,
        { credentials: "include" },
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentOrg?.id && !!user && !isMentor && !userIsAdmin,
  });

  const acceptConsentMutation = useMutation({
    mutationFn: async (declarationId: string) => {
      const res = await fetch(
        `/api/workspaces/${currentOrg!.id}/declarations/${declarationId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { setConsentAgreed(false); refetchConsent(); },
  });

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

  const isPmoOrOwner = userRole?.role === 'ADMIN' || userRole?.role === 'OWNER' || userIsAdmin;

  const cards: DashboardCard[] = [
    isPmoOrOwner
      ? {
          id: 'pmo-panel',
          title: 'PMO Panel',
          description: 'Manage ideas, members & workspace',
          icon: FiStar,
          color: 'text-amber-600',
          path: `/w/${slug}/admin`,
        }
      : {
          id: 'my-ideas',
          title: 'My Ideas',
          description: 'View and develop your ideas',
          icon: FiStar,
          color: 'text-gray-600',
          path: `/w/${slug}/my-ideas`,
        },
    {
      id: 'challenges',
      title: 'Sectors',
      description: 'Compete in active sectors',
      icon: FiZap,
      color: 'text-blue-600',
      path: `/w/${slug}/challenges`,
    },
    {
      id: 'events',
      title: 'Events',
      description: 'View upcoming events',
      icon: FiCalendar,
      color: 'text-purple-600',
      path: `/w/${slug}/events`,
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
      title: 'Training Modules',
      description: 'Learn essential business skills',
      icon: FiBookOpen,
      color: 'text-orange-600',
      path: `/w/${slug}/academy`,
    },
    ...(consultationEnabled ? [{
      id: 'consultation',
      title: 'Consultation',
      description: 'One-on-one expert sessions',
      icon: FiPhone,
      color: 'text-teal-600',
      path: `/w/${slug}/consultation`,
    }] : []),
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

  const isJudge = userRole?.role === 'JUDGE';
  if (isJudge) {
    return <JudgeDashboard />;
  }

  const isClient = userRole?.role === 'CLIENT';
  if (isClient) {
    return <ClientDashboard />;
  }

  const isConsultant = userRole?.role === 'CONSULTANT';
  if (isConsultant) {
    return <ConsultantDashboard />;
  }

  if (isMentor) {
    return <MentorDashboard />;
  }

  return (
    <>
    {/* Participant consent gate — non-dismissable, appears before everything else */}
    {pendingConsent.length > 0 && (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-y-auto [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{pendingConsent[0].title}</DialogTitle>
          </DialogHeader>
          <RichTextViewer content={pendingConsent[0].content} className="text-sm" />
          <div className="space-y-3 pt-4 border-t">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAgreed}
                onChange={(e) => setConsentAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600"
              />
              <span className="text-sm">I consent to share my idea data for program evaluation purposes</span>
            </label>
            <Button
              className="w-full"
              disabled={!consentAgreed || acceptConsentMutation.isPending}
              onClick={() => acceptConsentMutation.mutate(pendingConsent[0].id)}
            >
              {acceptConsentMutation.isPending ? "Saving…" : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )}

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(200,210,255,0.35)', boxShadow: '0 1px 16px rgba(24,80,238,0.06)' }}>
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <img src="/codelogo.png" alt="Logo" className="h-7 object-contain dark:hidden" style={{ display: 'block', marginTop: '-2px' }} loading="eager" />
          <img src="/logo-code-light.jpeg" alt="Logo" className="h-7 object-contain hidden dark:block" style={{ display: 'none', marginTop: '-2px' }} loading="eager" />
          <span className="text-2xl font-bold text-gray-900">OS</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-medium shadow-sm">
              {getUserInitials()}
            </div>
            <div className="text-sm hidden sm:block">
              <p className="font-medium text-gray-900">{getUserDisplayName()}</p>
              <p className="text-xs text-gray-500 capitalize">
                {userRole?.role === 'ADMIN' ? 'PMO' : (userRole?.role?.toLowerCase() || 'member')}
              </p>
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

      {/* Background Gradient Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(24, 80, 238, 0.12)' }}></div>
        <div className="absolute top-40 right-20 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(39, 75, 219, 0.15)' }}></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(24, 80, 238, 0.10)' }}></div>
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
        <div className="mx-auto px-12 space-y-6 py-6 pb-4 relative z-10">

          {/* Progress Indicator */}
          <div style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            borderRadius: '30px',
            padding: '16px',
          }}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                {programSteps.map((step, idx) => {
                  const isActive = idx + 1 === currentProgramStep;
                  const isDone = idx + 1 < currentProgramStep;
                  return (
                    <div key={idx} className={`flex items-center space-x-2 ${!isActive && !isDone ? 'opacity-50' : ''}`}>
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isDone
                          ? 'bg-primary'
                          : isActive
                          ? 'bg-gradient-to-br from-primary to-primary/70'
                          : 'bg-gray-300'
                      }`} style={isActive ? { boxShadow: '0 0 6px rgba(24,80,238,0.5)' } : {}} />
                      <span className={`font-medium whitespace-nowrap ${
                        isActive ? 'text-primary' : isDone ? 'text-gray-600' : 'text-muted-foreground'
                      }`}>
                        {lang === 'ar' ? step.titleAr : step.titleEn}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-muted-foreground text-sm">
                {lang === 'ar'
                  ? `أسبوع ${currentProgramStep} من ${programSteps.length}`
                  : `Week ${currentProgramStep} of ${programSteps.length}`}
              </div>
            </div>
          </div>

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