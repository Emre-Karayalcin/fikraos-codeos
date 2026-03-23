import { useState } from 'react';
import { useParams } from 'wouter';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ScoringCriteriaContent } from './SuperAdminScoringCriteria';

export default function AdminScoringCriteria() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar
        workspaceSlug={slug}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((v) => !v)}
      />
      <ScoringCriteriaContent />
    </div>
  );
}
