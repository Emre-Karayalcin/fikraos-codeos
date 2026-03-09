import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import IdeasOverview from "@/components/admin/IdeasOverview";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useSidebar } from "@/contexts/SidebarContext";

export default function AdminIdeas() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();

  // Get workspace by slug first
  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug
  });

  // Check if user has admin access (using workspace ID)
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: [`/api/organizations/${workspace?.id}/admin/check-role`],
    enabled: !!workspace?.id
  });

  if (roleLoading) {
    return (
      <div className="flex h-screen">
        <UnifiedSidebar />
        <div className={`flex-1 transition-all duration-200 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!userRole?.isAdmin && !['OWNER', 'ADMIN'].includes(userRole?.role)) {
    return (
      <div className="flex h-screen">
        <UnifiedSidebar />
        <div className={`flex-1 transition-all duration-200 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
              <p className="text-text-secondary">You don't have permission to access the admin panel.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <UnifiedSidebar />

      <div className={`flex-1 transition-all duration-200 ${isCollapsed ? 'ml-16' : 'ml-64'} overflow-hidden`}>
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-admin-ideas-title">
                  <MessageCircle className="w-8 h-8 text-primary" />
                  Ideas Management
                </h1>
                <p className="text-text-secondary mt-1">
                  Review, evaluate and manage submitted ideas with table and kanban views.
                </p>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                Ideas
              </Badge>
            </div>

            {/* Ideas Overview */}
            <IdeasOverview orgId={workspace?.id!} />
          </div>
        </div>
      </div>
    </div>
  );
}