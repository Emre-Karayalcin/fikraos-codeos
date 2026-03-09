import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function WorkspaceRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();

  // Fetch workspace info to get default route
  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
  });

  useEffect(() => {
    if (!slug) {
      setLocation("/");
      return;
    }

    // Map stored route key to actual path
    const routeKeyToPath = (key?: string) => {
      switch (key) {
        case 'navigation.myIdeas': return '/my-ideas';
        case 'navigation.challenges': return '/challenges';
        case 'navigation.radar': return '/radar';
        case 'navigation.experts': return '/experts';
        case 'navigation.dashboard':
        default:
          return '/dashboard';
      }
    };

    const path = routeKeyToPath(workspace?.defaultRoute);
    setLocation(`/w/${slug}${path}`);
  }, [slug, workspace, setLocation]);

  // Show loading while redirecting
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-secondary">Loading workspace...</p>
      </div>
    </div>
  );
}
