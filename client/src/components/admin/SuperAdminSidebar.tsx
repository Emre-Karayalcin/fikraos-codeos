import { useLocation, Link } from "wouter";
import { LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
];

export function SuperAdminSidebar({ isCollapsed, onToggle }: SuperAdminSidebarProps) {
  const [location, setLocation] = useLocation();

  return (
    <div
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h2 className="font-semibold text-lg">Super Admin</h2>
            <p className="text-xs text-muted-foreground">Platform Overview</p>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="ml-auto">
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <div className="font-medium">{item.title}</div>}
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
          size={isCollapsed ? "icon" : "default"}
          onClick={() => setLocation("/")}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <>Exit</>}
        </Button>
      </div>
    </div>
  );
}
