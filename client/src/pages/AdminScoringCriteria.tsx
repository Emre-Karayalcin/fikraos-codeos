import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ScoringCriteriaContent } from './SuperAdminScoringCriteria';

export default function AdminScoringCriteria() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Need orgId to call workspace-level API — load from /api/workspaces/by-slug/:slug
  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: ['workspace-by-slug', slug],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!slug,
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar
        workspaceSlug={slug}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((v) => !v)}
      />
      {workspace && (
        <ScoringCriteriaContent apiBase={`/api/workspaces/${workspace.id}/admin`} />
      )}
    </div>
  );
}
