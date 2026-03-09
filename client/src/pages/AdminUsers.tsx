import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import UserManagement from "@/components/admin/UserManagement";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminUsers() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
            <Users className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Members</h1>
              <p className="text-muted-foreground">
                Manage workspace members, roles, and permissions.
              </p>
            </div>
          </div>

          {/* User Management */}
          <UserManagement orgId={workspace?.id!} />
        </div>
      </div>
    </div>
  );
}