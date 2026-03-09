import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface WorkspaceGuardProps {
  children: React.ReactNode;
}

export function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Validate workspace exists
  const { data: workspace, isLoading: workspaceLoading, error: workspaceError } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Check if user is a member of this workspace
  const { data: userInfo, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ["/api/user"],
    enabled: !!user,
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (user && !userLoading && userInfo && !(userInfo as any)?.memberships) {
      refetchUser();
    }
  }, [user, userLoading, userInfo, refetchUser]);

  const isInvalidSlug =
    !slug ||
    slug === "null" ||
    slug === "undefined" ||
    slug === "" ||
    slug.trim() === "";

  useEffect(() => {
    if (isInvalidSlug) {
      setLocation("/");
    }
  }, [isInvalidSlug, setLocation]);

  const isMember = (userInfo as any)?.memberships?.some(
    (m: any) => m.orgSlug === slug
  );

  const isLoadingMemberships = user && userInfo && !(userInfo as any)?.memberships;
  const isLoading = workspaceLoading || userLoading || isLoadingMemberships;

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">{t('workspace.verifyingAccess')}</p>
        </div>
      </div>
    );
  }

  if (isInvalidSlug || workspaceError || !workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">{t('workspace.notFound')}</CardTitle>
              <CardDescription className="mt-2">
                {isInvalidSlug
                  ? t('workspace.invalidIdentifier')
                  : t('workspace.doesNotExist', { slug })
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => setLocation("/create-workspace")}
              className="w-full"
            >
              {t('workspace.createNew')}
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
            >
              {t('workspace.goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">{t('workspace.accessDenied')}</CardTitle>
              <CardDescription className="mt-2">
                {t('workspace.notMember', { name: (workspace as any)?.name || slug })}
                <br />
                {t('workspace.contactAdmin')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
            >
              {t('workspace.goToMyWorkspaces')}
            </Button>
            <Button
              onClick={() => setLocation("/create-workspace")}
              variant="outline"
              className="w-full"
            >
              {t('workspace.createNewWorkspace')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
