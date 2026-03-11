import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, LogOut, Search, Lightbulb, Settings, Users, BarChart3, Code, Zap, Target, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import toast from 'react-hot-toast';
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import ThemeSelector from "@/components/theme/ThemeSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranding } from "@/contexts/BrandingContext";
import { apiRequest } from "@/lib/queryClient";

export type InputMode = 'develop' | 'research' | 'launch';
import { useSidebar } from "@/contexts/SidebarContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [idea, setIdea] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>('develop');
  const [generationMode, setGenerationMode] = useState<'lite' | 'pro' | 'max'>('pro');
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { isCollapsed } = useSidebar();
  const { slug } = useParams<{ slug?: string }>();
  const { logo, darkLogo, isLoading: brandingLoading } = useBranding();
  
  const defaultLogo = '/logo-code.jpeg';
  const defaultDarkLogo = '/logo-code-light.jpeg';

  // Fetch workspace info based on URL slug
  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`/api/workspaces/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: isAuthenticated && !!slug,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Get current organization ID from workspace
  const currentOrg = workspace ? { id: workspace.id, slug: workspace.slug } : null;

  // Check user role for admin access
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['/api/organizations', currentOrg?.id, 'admin', 'check-role'],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      try {
        const response = await fetch(`/api/organizations/${currentOrg.id}/admin/check-role`, {
          credentials: 'include'
        });
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        console.warn('Failed to check admin role:', error);
        return null;
      }
    },
    enabled: isAuthenticated && !!currentOrg?.id,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = !roleLoading && userRole && (userRole.role === 'OWNER' || userRole.role === 'ADMIN');

  // Fetch admin stats if user is admin
  const { data: adminStats } = useQuery({
    queryKey: ['/api/organizations', currentOrg?.id, 'admin', 'stats'],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      const response = await fetch(`/api/organizations/${currentOrg.id}/admin/stats`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: isAuthenticated && !!currentOrg?.id && !!isAdmin,
    retry: false
  });

  // Random greeting messages with translation
  const getRandomGreeting = () => {
    const name = user?.firstName || user?.username || t('common.you') || "there";
    const greetings = [
      t('dashboard.greetings.backAtIt', { name }),
      t('dashboard.greetings.salam', { name }),
      t('dashboard.greetings.welcome', { name }),
      t('dashboard.greetings.feelingCreative'),
      t('dashboard.greetings.readyTo')
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const [greeting, setGreeting] = useState(() => getRandomGreeting());

  useEffect(() => {
    setGreeting(getRandomGreeting());
  }, [user?.firstName, user?.username, t]);

  const createProjectMutation = useMutation({
    mutationFn: async (ideaText: string) => {
      const projectResponse = await apiRequest(
        "POST",
        "/api/projects",
        {
          orgId: currentOrg?.id || "046c0661-1ce9-4b73-9268-80e92f4e6be1",
          title: ideaText.substring(0, 50) + (ideaText.length > 50 ? "..." : ""),
          description: `Business idea: ${ideaText}`
        }
      );
      const project = await projectResponse.json();

      const chatResponse = await apiRequest(
        "POST",
        "/api/chats",
        {
          projectId: project.id,
          title: t('projects.initialConversation')
        }
      );
      const chat = await chatResponse.json();

      await apiRequest(
        "POST",
        "/api/messages",
        {
          chatId: chat.id,
          role: "user",
          text: ideaText
        }
      );

      await apiRequest(
        "POST",
        "/api/agent/chat",
        {
          message: "__AGENT_START__",
          chatId: chat.id,
          language: i18n.language || 'en',
        }
      );

      return { project, chat };
    },
    onSuccess: ({ project, chat }) => {
      setLocation(`/w/${slug}/chat/${chat.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || t('errors.failedToCreate'));
    },
  });

  const handleSubmit = () => {
    if (idea.trim()) {
      if (inputMode === 'research') {
        setLocation(`/w/${slug}/research?q=${encodeURIComponent(idea.trim())}`);
      } else if (inputMode === 'launch') {
        toast.error(t('dashboard.modes.launch.disabled'));
        return;
      } else {
        createProjectMutation.mutate(idea.trim());
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Get mode-specific greeting
  const getModeGreeting = () => {
    if (inputMode === 'research') return t('dashboard.modes.research.greeting');
    if (inputMode === 'launch') return t('dashboard.modes.launch.greeting');
    return greeting;
  };

  // Get mode-specific placeholder
  const getModePlaceholder = () => {
    if (inputMode === 'research') return t('dashboard.modes.research.placeholder');
    if (inputMode === 'launch') return t('dashboard.modes.launch.placeholder');
    return t('dashboard.modes.develop.placeholder');
  };

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative min-w-0 pb-20 sm:pb-0">
        {/* FikraHub Logo */}
        {isCollapsed && (
          <>
            <div className="absolute top-4 sm:top-6 left-1/2 transform -translate-x-1/2 z-10">
              {(logo || darkLogo) ? (
                <>
                  <img src={darkLogo || logo} alt="Logo" className="h-7 sm:h-10 object-contain hidden dark:block" />
                  <img src={logo || darkLogo} alt="Logo" className="h-7 sm:h-10 object-contain block dark:hidden" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 hidden dark:flex">
                    <img src={defaultDarkLogo} alt="Logo" className="h-7 sm:h-10 object-contain" />
                    <span className="text-xl sm:text-2xl font-bold text-foreground">OS</span>
                  </div>
                  <div className="flex items-center gap-1.5 dark:hidden">
                    <img src={defaultLogo} alt="Logo" className="h-7 sm:h-10 object-contain" />
                    <span className="text-xl sm:text-2xl font-bold text-foreground">OS</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
        
        {/* Top Right Controls */}
        <div className="absolute top-4 sm:top-6 ltr:right-4 ltr:sm:right-6 rtl:left-4 rtl:sm:left-6 flex items-center gap-2 sm:gap-3 z-10">
          {isAuthenticated ? (
            <LanguageSwitcher />
          ) : (
            <span className="px-2 sm:px-3 py-1 bg-muted/30 text-text-secondary text-xs font-medium rounded-full border border-border">
              {t('dashboard.admin.betaMode')}
            </span>
          )}
        </div>

        {/* Main Content */}
        <div className={`w-full mx-auto text-center ${isAdmin ? 'max-w-6xl' : 'max-w-xl sm:max-w-2xl'}`}>
          {/* Main Heading */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 sm:mb-6 text-text-primary leading-tight px-4 transition-all duration-500 ease-in-out">
              {getModeGreeting()}
            </h1>
          </div>

          {/* Generation Mode Selector - Only for Launch mode */}
          {inputMode === 'launch' && (
            <div className="w-full max-w-2xl mx-auto px-4 mb-6">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">{t('dashboard.generationModes.speed')}</span>
                <div className="bg-background border border-border rounded-lg p-1 flex gap-1 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setGenerationMode('lite')}
                    className={`px-3 py-2 h-auto rounded text-xs font-medium ${generationMode === 'lite' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    title={t('dashboard.generationModes.lite.description')}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {t('dashboard.generationModes.lite.label')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setGenerationMode('pro')}
                    className={`px-3 py-2 h-auto rounded text-xs font-medium ${generationMode === 'pro' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    title={t('dashboard.generationModes.pro.description')}
                  >
                    <Target className="w-3 h-3 mr-1" />
                    {t('dashboard.generationModes.pro.label')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setGenerationMode('max')}
                    className={`px-3 py-2 h-auto rounded text-xs font-medium ${generationMode === 'max' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    title={t('dashboard.generationModes.max.description')}
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    {t('dashboard.generationModes.max.label')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getModePlaceholder()}
                className="w-full bg-input-bg border border-input-border rounded-xl pl-4 pr-12 sm:pr-16 py-4 sm:py-6 text-base sm:text-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 min-h-[120px] sm:min-h-[140px] text-text-primary placeholder-text-muted"
                rows={3}
                data-testid="input-idea"
              />
              
              {/* Mode Switcher */}
              <div className="absolute bottom-3 left-3 flex gap-1 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setInputMode('develop')}
                  className={`p-1.5 h-auto touch-manipulation sm:p-1 rounded-lg ${
                    inputMode === 'develop' 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="mode-develop"
                  title={t('dashboard.modes.develop.title')}
                >
                  <Lightbulb className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setInputMode('research')}
                  className={`p-1.5 h-auto touch-manipulation sm:p-1 rounded-lg ${
                    inputMode === 'research' 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="mode-research"
                  title={t('dashboard.modes.research.title')}
                >
                  <Search className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    toast.error(t('dashboard.modes.launch.disabled'));
                  }}
                  className="p-1.5 h-auto touch-manipulation sm:p-1 rounded-lg text-muted-foreground/50 cursor-not-allowed opacity-50"
                  data-testid="mode-launch"
                  title={t('dashboard.modes.launch.comingSoon')}
                  disabled
                >
                  <Code className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Submit Button/Help Text */}
              <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4">
                {idea.trim() ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={createProjectMutation.isPending}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 touch-manipulation min-h-[44px]"
                    data-testid="button-submit-idea"
                  >
                    {createProjectMutation.isPending ? (
                      <Sparkles className="w-4 h-4 mr-1.5 animate-pulse" />
                    ) : (
                      <Send className="w-4 h-4 mr-1.5" />
                    )}
                    {createProjectMutation.isPending ? t('dashboard.starting') : t('dashboard.enter')}
                  </Button>
                ) : (
                  <div className="text-xs text-text-muted flex items-center gap-1 hidden sm:flex">
                    <span>{t('dashboard.helpText.pressEnter')}</span>
                    <span className="bg-muted/20 px-1 py-0.5 rounded text-xs">Enter</span>
                    <span>{t('dashboard.helpText.toSubmit')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}