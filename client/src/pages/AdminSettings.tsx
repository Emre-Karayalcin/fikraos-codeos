import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import WorkspaceSettings from "@/components/admin/WorkspaceSettings";
import ModuleManagement from "@/components/admin/ModuleManagement";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminSettings() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
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

  // Get current organization data (using workspace ID)
  const { data: currentOrg } = useQuery({
    queryKey: ['/api/organizations', workspace?.id],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${workspace?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch organization');
      return response.json();
    },
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
            <h1 className="text-2xl font-bold mb-2">
              {t('admin.settings.accessDenied.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('admin.settings.accessDenied.description')}
            </p>
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
          <div className="flex items-center gap-3 mb-8 flex-row">
            <Settings className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold ltr:text-left rtl:text-right">
                {t('admin.settings.header.title')}
              </h1>
              <p className="text-muted-foreground ltr:text-left rtl:text-right">
                {t('admin.settings.header.subtitle')}
              </p>
            </div>
          </div>

          {/* Workspace Settings */}
          <WorkspaceSettings orgId={workspace?.id!} currentOrg={currentOrg} />

          {/* Module Management */}
          <ModuleManagement orgId={workspace?.id!} currentOrg={currentOrg} />
        </div>
      </div>
    </div>
  );
}