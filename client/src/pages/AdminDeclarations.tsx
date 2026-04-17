import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { DeclarationsManager } from '@/components/admin/DeclarationsManager';

export default function AdminDeclarations() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      <div className="flex-1 overflow-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Declarations</h1>
        <DeclarationsManager orgId={workspace?.id} />
      </div>
    </div>
  );
}
