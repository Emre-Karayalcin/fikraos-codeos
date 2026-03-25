import { useLocation, useParams } from "wouter";
import { BarChart3, MessageCircle, Radar, UserCheck, Plus, Trophy, Settings, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const { workspaceSlug } = useWorkspace();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Get workspace slug from URL or context
  const currentWorkspaceSlug = slug || workspaceSlug;

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      // Create project
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "046c0661-1ce9-4b73-9268-80e92f4e6be1", // Default org for now
          title: t('projects.newConversation'),
          description: t('projects.newConversationDescription')
        }),
        credentials: "include",
      });
      
      if (!projectResponse.ok) {
        throw new Error("Failed to create project");
      }
      
      const project = await projectResponse.json();
      
      // Create initial chat
      const chatResponse = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: "Chat"
        }),
        credentials: "include",
      });
      
      if (!chatResponse.ok) {
        throw new Error(t('errors.failedToCreateChat'));
      }
      
      const chat = await chatResponse.json();
      
      // Invalidate projects query to refresh the sidebar
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', "046c0661-1ce9-4b73-9268-80e92f4e6be1", 'projects']
      });
      
      return { project, chat };
    },
    onSuccess: ({ chat }) => {
      // Navigate to the new chat
      if (currentWorkspaceSlug) {
        setLocation(`/w/${currentWorkspaceSlug}/chat/${chat.id}`);
      } else {
        setLocation(`/chat/${chat.id}`);
      }
    },
    onError: (error) => {
      console.error("Error creating conversation:", error);
    },
  });

  const handleNewConversation = () => {
    createProjectMutation.mutate();
  };

  // Fetch organizations to get module settings
  const { data: organizations } = useQuery({
    queryKey: ['/api/organizations'],
    queryFn: async () => {
      const response = await fetch('/api/organizations', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch organizations');
      return response.json();
    },
    enabled: isAuthenticated
  });

  // Get current organization (assuming first one for now)
  const currentOrg = organizations?.[0];

  // Temporarily disable admin detection to prevent regular users seeing admin interface
  const isAdmin = false;

  // Don't show bottom navigation if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Build navigation items based on module flags
  const baseNavigationItems = [
    {
      id: "my-ideas",
      icon: MessageCircle,
      label: t('navigation.myIdeas'),
      path: currentWorkspaceSlug ? `/w/${currentWorkspaceSlug}/my-ideas` : "/my-ideas",
      testId: "nav-my-ideas",
      enabled: true
    },
    {
      id: "challenges",
      icon: Trophy,
      label: "Challenges",
      path: currentWorkspaceSlug ? `/w/${currentWorkspaceSlug}/challenges` : "/challenges",
      testId: "nav-challenges",
      enabled: currentOrg?.challengesEnabled !== false
    },
    {
      id: "dashboard",
      icon: BarChart3,
      label: t('navigation.dashboard'),
      path: currentWorkspaceSlug ? `/w/${currentWorkspaceSlug}/dashboard` : "/dashboard",
      testId: "nav-dashboard",
      isAction: true,
      enabled: true
    },
    {
      id: "experts",
      icon: UserCheck,
      label: "Experts",
      path: currentWorkspaceSlug ? `/w/${currentWorkspaceSlug}/experts` : "/experts",
      testId: "nav-experts",
      enabled: currentOrg?.expertsEnabled !== false
    },
    {
      id: "radar",
      icon: Radar,
      label: "Radar",
      path: currentWorkspaceSlug ? `/w/${currentWorkspaceSlug}/radar` : "/radar",
      testId: "nav-radar",
      enabled: currentOrg?.radarEnabled !== false
    },
    {
      id: "academy",
      icon: GraduationCap,
      label: "Training Modules",
      path: currentWorkspaceSlug ? `/w/${currentWorkspaceSlug}/academy` : "/academy",
      testId: "nav-academy",
      enabled: currentOrg?.academyEnabled !== false
    }
  ];

  // Add admin navigation for users with admin access
  if (isAdmin && currentWorkspaceSlug) {
    baseNavigationItems.push({
      id: "admin",
      icon: Settings,
      label: "Admin",
      path: `/w/${currentWorkspaceSlug}/admin`,
      testId: "nav-admin",
      enabled: true
    });
  }

  // Filter enabled navigation items
  const navigationItems = baseNavigationItems.filter(item => item.enabled);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 sm:hidden">
      <div className="flex items-center justify-around px-2 py-3 max-w-md mx-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.includes(item.id);
          const isDashboard = item.id === "dashboard";

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.path) {
                  setLocation(item.path);
                }
              }}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 touch-manipulation min-h-[60px] ${
                isDashboard
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground scale-110 shadow-lg"
                  : isActive
                  ? "text-primary bg-primary/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-muted/30"
              }`}
              data-testid={item.testId}
            >
              <Icon className={`w-5 h-5 ${isDashboard ? "w-6 h-6" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}