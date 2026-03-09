import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminDashboard() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);


  // Get current organization data first (by slug)
  const { data: currentOrg, isLoading: orgLoading } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug
  });

  // Check if user has admin access (using org ID)
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: [`/api/organizations/${currentOrg?.id}/admin/check-role`],
    enabled: !!currentOrg?.id
  });

  if (orgLoading || roleLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!userRole?.isAdmin && !['OWNER', 'ADMIN'].includes(userRole?.role)) {
    return (
      <div className="flex h-screen">
        <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Overview</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.displayName || user?.username}. Here's your workspace overview.
              </p>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <AnalyticsDashboard orgId={currentOrg?.id!} />
        </div>
      </div>
    </div>
  );
}