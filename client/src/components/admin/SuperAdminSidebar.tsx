import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, ChevronLeft, ChevronRight, LogOut,
  Kanban, BarChart2, Building2, Users, Target,
  CalendarDays, ClipboardList, Mail, BookOpen, Brain, Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface SuperAdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navSections = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Competitions",
    items: [
      { title: "Competitions",       href: "/admin/workspaces",       icon: Building2 },
      { title: "Applications",       href: "/admin/applications",     icon: ClipboardList },
      { title: "Sectors", href: "/admin/challenges",       icon: Target },
      { title: "Idea Management",    href: "/admin/ideas",            icon: Kanban },
      { title: "Pitch Decks",        href: "/admin/pitch-decks",      icon: Presentation },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Users", href: "/admin/users", icon: Users },
    ],
  },
  {
    label: "Communications",
    items: [
      { title: "Events",          href: "/admin/events",          icon: CalendarDays },
      { title: "Email Templates", href: "/admin/email-templates", icon: Mail },
    ],
  },
  {
    label: "Analytics & Config",
    items: [
      { title: "Activity Insights", href: "/admin/activity-insights", icon: BarChart2 },
      { title: "Scoring Criteria",  href: "/admin/scoring-criteria",  icon: BookOpen },
    ],
  },
];

export function SuperAdminSidebar({ isCollapsed, onToggle }: SuperAdminSidebarProps) {
  const [location, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/admin/login");
    },
  });

  return (
    <div
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-14" : "w-56"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        {!isCollapsed && (
          <div>
            <h2 className="font-semibold text-sm">Super Admin</h2>
            <p className="text-xs text-muted-foreground">Platform Overview</p>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="ml-auto shrink-0">
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map((section) => (
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
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                        isCollapsed && "justify-center"
                      )}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border shrink-0">
        <Button
          variant="outline"
          className={cn("w-full text-muted-foreground hover:text-destructive hover:border-destructive", isCollapsed && "px-0")}
          size={isCollapsed ? "icon" : "default"}
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          title="Logout"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );
}
