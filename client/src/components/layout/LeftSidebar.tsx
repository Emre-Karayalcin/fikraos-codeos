import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  BrainCircuit, 
  Plus, 
  MessageCircle, 
  Folder, 
  Settings,
  ChevronDown
} from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";

export function LeftSidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { slug } = useParams<{ slug?: string }>();

  const { logo, darkLogo, isLoading: brandingLoading } = useBranding(); // ✅ Get logo from branding
  
  // ✅ Fallback logo if branding is not loaded or no custom logo
  const defaultLogo = '/logo-code.jpeg';
  const defaultDarkLogo = '/logo-code-light.jpeg';
  
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/organizations", organizations[0]?.id, "projects"],
    enabled: !!organizations[0]?.id,
  });

  return (
    <div className="w-full bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-6">
          {brandingLoading ? (
            // Loading skeleton
            <div className="h-6 w-6 bg-muted animate-pulse rounded" />
          ) : (logo || darkLogo) ? (
            <>
              <img 
                src={darkLogo || logo}
                alt="Logo" 
                className="w-6 h-6 hidden dark:block"
              />
              <img 
                src={logo || darkLogo}
                alt="Logo" 
                className="w-6 h-6 block dark:hidden"
              />
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 hidden dark:flex">
                <img src={defaultDarkLogo} alt="Logo" className="h-6 w-auto object-contain" />
                <span className="text-base font-bold text-foreground">OS</span>
              </div>
              <div className="flex items-center gap-1 dark:hidden">
                <img src={defaultLogo} alt="Logo" className="h-6 w-auto object-contain" />
                <span className="text-base font-bold text-foreground">OS</span>
              </div>
            </>
          )}
        </div>
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-2.5 font-medium transition-all"
          onClick={() => window.location.href = "/"}
          data-testid="button-new-project"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('projects.newConversation')}
        </Button>
      </div>
      
      {/* Projects List */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary">
              {t('projects.title')}
            </h3>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </div>
          
          <div className="space-y-1">
            {projects.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-text-secondary text-sm">{t('projects.noProjects')}</p>
                <p className="text-text-muted text-xs mt-1">{t('sidebar.startWithIdea')}</p>
              </div>
            ) : (
              projects.map((project: any) => (
                <div key={project.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors group">
                  <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                    {project.title?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-text-primary group-hover:text-primary">
                      {project.title}
                    </div>
                    <div className="text-xs text-text-muted">
                      {new Date(project.createdAt).toLocaleDateString()} • In progress
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Quick Access */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary">
              {t('sidebar.quickStats')}
            </h3>
          </div>
          
          <nav className="space-y-1">
            <a 
              href="#" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-muted/30 transition-colors"
              data-testid="nav-chats"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium text-sm">{t('navigation.allConversations')}</span>
            </a>
            <a 
              href="#" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-muted/30 transition-colors"
              data-testid="nav-projects"
            >
              <Folder className="w-4 h-4" />
              <span className="font-medium text-sm">{t('common.templates')}</span>
            </a>
          </nav>
        </div>
      </div>
      
      {/* User Profile */}
      <div className="p-6 mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-sm font-bold text-white">
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-text-primary" data-testid="user-name">
              {user?.username || "User"}
            </div>
            <div className="text-xs text-text-muted">{t('auth.freePlan')}</div>
          </div>
          <button className="text-text-secondary hover:text-text-primary transition-colors" data-testid="button-settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
