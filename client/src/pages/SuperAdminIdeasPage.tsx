import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { SuperAdminIdeasKanban } from "@/components/admin/SuperAdminIdeasKanban";
import { Kanban } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export default function SuperAdminIdeasPage() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/workspaces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-full mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Kanban className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Idea Management</h1>
              <p className="text-muted-foreground">Manage ideas across all workspaces</p>
            </div>
          </div>

          <SuperAdminIdeasKanban workspaces={workspaces} />
        </div>
      </div>
    </div>
  );
}
