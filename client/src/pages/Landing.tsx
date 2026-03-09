import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { 
  Send,
  Sparkles,
  LogOut,
  Lightbulb,
  Search
} from "lucide-react";

export type InputMode = 'develop' | 'research' | 'launch';

export default function Landing() {
  const { t } = useTranslation();
  const [idea, setIdea] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>('develop');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  // Check for pending idea after authentication
  useEffect(() => {
    if (isAuthenticated) {
      const pendingIdea = sessionStorage.getItem("pendingIdea");
      if (pendingIdea) {
        sessionStorage.removeItem("pendingIdea");
        setIdea(pendingIdea);
        createProjectMutation.mutate(pendingIdea);
      }
    }
  }, [isAuthenticated]);

  
  // Project creation mutation for authenticated users
  const createProjectMutation = useMutation({
    mutationFn: async (ideaText: string) => {
      // First, get or create an organization
      const orgResponse = await fetch("/api/organizations", {
        credentials: "include",
      });
      let organizations = [];
      if (orgResponse.ok) {
        organizations = await orgResponse.json();
      }
      
      let orgId;
      if (organizations.length === 0) {
        const newOrgResponse = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: t('projects.myVentures') }),
          credentials: "include",
        });
        const newOrg = await newOrgResponse.json();
        orgId = newOrg.id;
      } else {
        orgId = organizations[0].id;
      }
      
      // Create project
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          title: ideaText.length > 50 ? ideaText.substring(0, 47) + "..." : ideaText,
          description: ideaText
        }),
        credentials: "include",
      });
      const project = await projectResponse.json();
      
      // Create initial chat
      const chatResponse = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: t('projects.initialConversation')
        }),
        credentials: "include",
      });
      const chat = await chatResponse.json();
      
      // Create initial user message
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chat.id,
          role: "user",
          text: ideaText
        }),
        credentials: "include",
      });
      
      // Trigger agent response to the user's message
      await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: ideaText,
          chatId: chat.id
        }),
        credentials: "include",
      });
      
      return { project, chat };
    },
    onSuccess: ({ project, chat }) => {
      toast({
        title: "Project Created!",
        description: t('projects.projectCreated')
      });
      // Navigate to the chat
      setLocation(`/chat/${chat.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || t('errors.failedToCreate'),
        variant: "destructive"
      });
    },
  });

  const handleSubmit = () => {
    if (idea.trim()) {
      if (isAuthenticated) {
        // User is logged in, create project directly
        createProjectMutation.mutate(idea.trim());
      } else {
        // Redirect to auth page with the idea stored temporarily
        sessionStorage.setItem("pendingIdea", idea.trim());
        setLocation("/auth");
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Left Sidebar */}
      <UnifiedSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative min-w-0">
        {/* Top Right Controls */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-2 sm:gap-3 z-10">
          {isAuthenticated ? (
            <>
              <span className="text-xs sm:text-sm text-text-secondary hidden sm:inline">Welcome back, {user?.username}!</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-text-secondary hover:text-text-primary touch-manipulation min-h-[44px] px-2 sm:px-3"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/create-workspace")}
                className="touch-manipulation min-h-[44px]"
              >
                Create Workspace
              </Button>
              <span className="px-2 sm:px-3 py-1 bg-muted/30 text-text-secondary text-xs font-medium rounded-full border border-border hidden sm:inline">
                Beta Mode
              </span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="w-full max-w-xl sm:max-w-2xl mx-auto text-center">
          {/* Main Heading */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 sm:mb-6 text-text-primary leading-tight px-4">
              {t('dashboard.whatsYourIdea')}
            </h1>
          </div>

          {/* Input Area */}
          <div className="relative">
            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('dashboard.explainBriefly')}
              className="w-full bg-input-bg border border-input-border rounded-xl px-4 sm:px-6 py-4 sm:py-6 text-base sm:text-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 min-h-[120px] sm:min-h-[140px] text-text-primary placeholder-text-muted"
              rows={3}
              data-testid="input-idea"
            />
            
            {/* Input Mode Toggle */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-input-bg border border-input-border rounded-lg p-1">
              <Button
                variant={inputMode === 'develop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInputMode('develop')}
                className={`h-8 px-3 text-xs font-medium transition-all touch-manipulation ${
                  inputMode === 'develop' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-muted/50'
                }`}
                data-testid="button-mode-develop"
              >
                <Lightbulb className="w-3 h-3 mr-1.5" />
                Develop
              </Button>
              <Button
                variant={inputMode === 'research' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInputMode('research')}
                className={`h-8 px-3 text-xs font-medium transition-all touch-manipulation ${
                  inputMode === 'research' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-muted/50'
                }`}
                data-testid="button-mode-research"
              >
                <Search className="w-3 h-3 mr-1.5" />
                Research
              </Button>
            </div>
            
            <div className="absolute bottom-3 right-3">
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
                  <span>Shift</span>
                  <span>+</span>
                  <span className="bg-muted/20 px-1 py-0.5 rounded text-xs">{t('dashboard.enter')}</span>
                  <span>for new line</span>
                </div>
              )}
            </div>
          </div>

          {idea.trim() && (
            <p className="text-sm text-text-muted mt-3 text-center hidden sm:block">
              Develop Idea Mode
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
