import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MentorAssignments } from "@/components/admin/MentorAssignments";
import { GraduationCap } from "lucide-react";

export default function AdminMentors() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: workspace } = useQuery<any>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
  });

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        workspaceSlug={slug!}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Mentor Assignments</h1>
              <p className="text-sm text-muted-foreground">
                Assign workspace members to mentors so mentors can track their participants' progress.
              </p>
            </div>
          </div>

          {workspace?.id && <MentorAssignments orgId={workspace.id} />}
        </div>
      </div>
    </div>
  );
}
