import { useLocation, Link } from "wouter";
import { LayoutDashboard, ChevronLeft, ChevronRight, LogOut, Kanban, BarChart2, Building2, Users, Target, CalendarDays, ClipboardList, Mail, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface SuperAdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Competitions",
    href: "/admin/workspaces",
    icon: Building2,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Idea Management",
    href: "/admin/ideas",
    icon: Kanban,
  },
  {
    title: "Problem Statements",
    href: "/admin/challenges",
    icon: Target,
  },
  {
    title: "Events",
    href: "/admin/events",
    icon: CalendarDays,
  },
  {
    title: "Applications",
    href: "/admin/applications",
    icon: ClipboardList,
  },
  {
    title: "Activity Insights",
    href: "/admin/activity-insights",
    icon: BarChart2,
  },
  {
    title: "Email Templates",
    href: "/admin/email-templates",
    icon: Mail,
  },
  {
    title: "Scoring Criteria",
    href: "/admin/scoring-criteria",
    icon: BookOpen,
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
        isCollapsed ? "w-14" : "w-52"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h2 className="font-semibold text-sm">Super Admin</h2>
            <p className="text-xs text-muted-foreground">Platform Overview</p>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="ml-auto">
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm",
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
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
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
