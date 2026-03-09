import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'wouter';

interface WorkspaceContextType {
  workspaceSlug: string | null;
  setWorkspaceSlug: (slug: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug?: string }>();
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(
    slug || localStorage.getItem('currentWorkspace') || null
  );

  // Update workspace slug when URL changes
  useEffect(() => {
    if (slug) {
      setWorkspaceSlug(slug);
      localStorage.setItem('currentWorkspace', slug);
    }
  }, [slug]);

  return (
    <WorkspaceContext.Provider value={{ workspaceSlug, setWorkspaceSlug }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
