import React from 'react';
import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard, Kanban, Settings, Users, Building2,
  Palette, Target, ChevronLeft, ChevronRight,
  GraduationCap, ClipboardList, Mail, BarChart2, BookOpen, CalendarDays,
  ClipboardCheck, MessageSquare, Video,
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

  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${workspaceSlug}`],
    enabled: !!workspaceSlug,
  });

  const { data: roleData } = useQuery({
    queryKey: [`/api/organizations/${workspace?.id}/admin/check-role`],
    enabled: !!workspace?.id,
  });
  const isMentorOnly =
    roleData?.role === 'MENTOR' &&
    !roleData?.isAdmin &&
    roleData?.role !== 'OWNER' &&
    roleData?.role !== 'ADMIN';

  // Grouped sections for full nav
  const navSections = [
    {
      label: 'Main',
      items: [
        {
          titleKey: 'admin.sidebar.dashboard.title',
          href: `/w/${workspaceSlug}/admin`,
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: 'Idea Pipeline',
      items: [
        {
          titleKey: 'admin.sidebar.ideas.title',
          href: `/w/${workspaceSlug}/admin/ideas`,
          icon: Kanban,
        },
        {
          titleKey: 'Applications',
          href: `/w/${workspaceSlug}/admin/applications`,
          icon: ClipboardList,
        },
        {
          titleKey: 'admin.sidebar.challenges.title',
          href: `/w/${workspaceSlug}/admin/challenges`,
          icon: Target,
        },
      ],
    },
    {
      label: 'People',
      items: [
        {
          titleKey: 'admin.sidebar.members.title',
          href: `/w/${workspaceSlug}/admin/members`,
          icon: Users,
        },
        {
          titleKey: 'admin.sidebar.mentors.title',
          href: `/w/${workspaceSlug}/admin/mentors`,
          icon: GraduationCap,
        },
        {
          titleKey: 'Attendance',
          href: `/w/${workspaceSlug}/admin/attendance`,
          icon: ClipboardCheck,
        },
        {
          titleKey: 'Mentor Feedback',
          href: `/w/${workspaceSlug}/admin/mentor-feedback`,
          icon: MessageSquare,
        },
      ],
    },
    {
      label: 'Communications',
      items: [
        {
          titleKey: 'Events',
          href: `/w/${workspaceSlug}/admin/events`,
          icon: CalendarDays,
        },
        {
          titleKey: 'Email Templates',
          href: `/w/${workspaceSlug}/admin/email-templates`,
          icon: Mail,
        },
        {
          titleKey: 'Academy',
          href: `/w/${workspaceSlug}/admin/academy`,
          icon: Video,
        },
      ],
    },
    {
      label: 'Analytics & Config',
      items: [
        {
          titleKey: 'Activity Insights',
          href: `/w/${workspaceSlug}/admin/activity-insights`,
          icon: BarChart2,
        },
        {
          titleKey: 'Scoring Criteria',
          href: `/w/${workspaceSlug}/admin/scoring-criteria`,
          icon: BookOpen,
        },
      ],
    },
    {
      label: 'Workspace',
      items: [
        {
          titleKey: 'admin.sidebar.workspace.title',
          href: `/w/${workspaceSlug}/admin/workspace`,
          icon: Building2,
        },
        {
          titleKey: 'admin.sidebar.branding.title',
          href: `/w/${workspaceSlug}/admin/branding`,
          icon: Palette,
        },
        {
          titleKey: 'admin.sidebar.settings.title',
          href: `/w/${workspaceSlug}/admin/settings`,
          icon: Settings,
        },
      ],
    },
  ];

  // Mentors only see Ideas
  const mentorSection = [
    {
      label: 'Ideas',
      items: [
        {
          titleKey: 'admin.sidebar.ideas.title',
          href: `/w/${workspaceSlug}/admin/ideas`,
          icon: Kanban,
        },
      ],
    },
  ];

  const sections = isMentorOnly ? mentorSection : navSections;

  return (
    <div
      className={cn(
        'h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
        isCollapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        {!isCollapsed && (
          <div>
            <h2 className="font-semibold text-base">{t('admin.sidebar.header.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('admin.sidebar.header.subtitle')}</p>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="ml-auto shrink-0">
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            {/* Section label — hidden when collapsed */}
            {!isCollapsed && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 select-none">
                {section.label}
              </p>
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                const label = t(item.titleKey);
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
                        isCollapsed && 'justify-center'
                      )}
                      title={isCollapsed ? label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!isCollapsed && <span className="font-medium">{label}</span>}
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — exit to workspace */}
      <div className="p-3 border-t border-border shrink-0">
        <Button
          variant="outline"
          className="w-full"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={() => {
            const routeMap: Record<string, { path: string; enabled: boolean }> = {
              'navigation.dashboard':  { path: '/dashboard',  enabled: dashboardEnabled ?? true },
              'navigation.myIdeas':    { path: '/my-ideas',   enabled: true },
              'navigation.challenges': { path: '/challenges', enabled: challengesEnabled ?? true },
              'navigation.radar':      { path: '/radar',      enabled: radarEnabled ?? true },
              'navigation.experts':    { path: '/experts',    enabled: expertsEnabled ?? true },
            };
            let targetRoute = routeMap[defaultRoute || 'navigation.dashboard'];
            if (!targetRoute || !targetRoute.enabled) {
              targetRoute = Object.values(routeMap).find((r) => r.enabled) || { path: '/my-ideas', enabled: true };
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
