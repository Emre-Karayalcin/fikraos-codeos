import React from 'react';
import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard,
  Kanban,
  Settings,
  Users,
  Building2,
  Palette,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useBranding } from '@/contexts/BrandingContext';
import { useQuery } from '@tanstack/react-query';

interface AdminSidebarProps {
  workspaceSlug: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ workspaceSlug, isCollapsed, onToggle }: AdminSidebarProps) {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const { dashboardEnabled, challengesEnabled, expertsEnabled, radarEnabled, defaultRoute } = useBranding();

  // Get workspace by slug to get org ID
  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${workspaceSlug}`],
    enabled: !!workspaceSlug
  });

  const navItems = [
    {
      titleKey: 'admin.sidebar.dashboard.title',
      descKey: 'admin.sidebar.dashboard.description',
      href: `/w/${workspaceSlug}/admin`,
      icon: LayoutDashboard,
    },
    {
      titleKey: 'admin.sidebar.ideas.title',
      descKey: 'admin.sidebar.ideas.description',
      href: `/w/${workspaceSlug}/admin/ideas`,
      icon: Kanban,
    },
    {
      titleKey: 'admin.sidebar.workspace.title',
      descKey: 'admin.sidebar.workspace.description',
      href: `/w/${workspaceSlug}/admin/workspace`,
      icon: Building2,
    },
    {
      titleKey: 'admin.sidebar.branding.title',
      descKey: 'admin.sidebar.branding.description',
      href: `/w/${workspaceSlug}/admin/branding`,
      icon: Palette,
    },
    {
      titleKey: 'admin.sidebar.members.title',
      descKey: 'admin.sidebar.members.description',
      href: `/w/${workspaceSlug}/admin/members`,
      icon: Users,
    },
    {
      titleKey: 'admin.sidebar.settings.title',
      descKey: 'admin.sidebar.settings.description',
      href: `/w/${workspaceSlug}/admin/settings`,
      icon: Settings,
    }
  ];

  return (
    <div
      className={cn(
        'h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h2 className="font-semibold text-lg">{t('admin.sidebar.header.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('admin.sidebar.header.subtitle')}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  isCollapsed && 'justify-center'
                )}
                title={isCollapsed ? t(item.titleKey) : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1">
                    <div className="font-medium">{t(item.titleKey)}</div>
                    <div className="text-xs opacity-70">{t(item.descKey)}</div>
                  </div>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={() => {
            // Smart routing: respect disabled modules and default route
            const routeMap: Record<string, { path: string; enabled: boolean }> = {
              'navigation.dashboard': { path: '/dashboard', enabled: dashboardEnabled ?? true },
              'navigation.myIdeas': { path: '/my-ideas', enabled: true },
              'navigation.challenges': { path: '/challenges', enabled: challengesEnabled ?? true },
              'navigation.radar': { path: '/radar', enabled: radarEnabled ?? true },
              'navigation.experts': { path: '/experts', enabled: expertsEnabled ?? true }
            };

            // Get default route config
            let targetRoute = routeMap[defaultRoute || 'navigation.dashboard'];

            // If default route is disabled or doesn't exist, find first enabled route
            if (!targetRoute || !targetRoute.enabled) {
              targetRoute = Object.values(routeMap).find(r => r.enabled) || { path: '/my-ideas' };
            }

            window.location.href = `/w/${workspaceSlug}${targetRoute.path}`;
          }}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <>{t('admin.sidebar.exit')}</>
          )}
        </Button>
      </div>
    </div>
  );
}