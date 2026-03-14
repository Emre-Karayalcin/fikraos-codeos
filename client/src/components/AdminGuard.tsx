import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Validate workspace exists
  const { data: workspace, isLoading: workspaceLoading, error: workspaceError } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Check if user is a member of this workspace
  const { data: userInfo, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
    enabled: !!user && isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Check admin role for this workspace
  const { data: roleData, isLoading: roleLoading, error: roleError } = useQuery({
    queryKey: [`/api/organizations/${workspace?.id}/admin/check-role`],
    enabled: !!workspace?.id && isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Block null, undefined, empty strings, or reserved keywords
  const isInvalidSlug =
    !slug ||
    slug === "null" ||
    slug === "undefined" ||
    slug === "" ||
    slug.trim() === "";

  // Check if user is a member of this workspace
  const isMember = userInfo?.memberships?.some(
    (m: any) => m.orgSlug === slug
  );

  // Check if user is admin (OWNER or ADMIN role) or mentor
  const isAdmin = roleData?.isAdmin === true || roleData?.role === 'OWNER' || roleData?.role === 'ADMIN';
  const isMentorRole = roleData?.role === 'MENTOR';
  const hasAccess = isAdmin || isMentorRole;

  const isLoading = workspaceLoading || userLoading || roleLoading;

  useEffect(() => {
    // If slug is invalid or reserved, redirect to home immediately
    if (isInvalidSlug) {
      setLocation("/");
    }
  }, [isInvalidSlug, setLocation]);

  // Redirect mentors away from non-ideas admin pages to the ideas page
  useEffect(() => {
    if (!isLoading && isMentorRole && !isAdmin) {
      const ideasPath = `/w/${slug}/admin/ideas`;
      if (!location.startsWith(ideasPath)) {
        setLocation(ideasPath);
      }
    }
  }, [isLoading, isMentorRole, isAdmin, location, slug, setLocation]);

  // Show loading state while checking workspace and admin access
  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">{t('admin.guard.verifying')}</p>
        </div>
      </div>
    );
  }

  // If workspace doesn't exist or there was an error, show error page
  if (isInvalidSlug || workspaceError || !workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">{t('admin.guard.workspaceNotFound.title')}</CardTitle>
              <CardDescription className="mt-2">
                {isInvalidSlug
                  ? t('admin.guard.workspaceNotFound.invalidSlug')
                  : t('admin.guard.workspaceNotFound.notAccessible', { slug })
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
            >
              {t('admin.guard.goToHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is not a member of this workspace
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
              <CardTitle className="text-2xl">{t('admin.guard.accessDenied.title')}</CardTitle>
              <CardDescription className="mt-2">
                {t('admin.guard.accessDenied.notMember', { workspace: workspace?.name || slug })}
                <br />
                {t('admin.guard.accessDenied.contactAdmin')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
            >
              {t('admin.guard.goToMyWorkspaces')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has neither admin nor mentor access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">{t('admin.guard.adminRequired.title')}</CardTitle>
              <CardDescription className="mt-2">
                {t('admin.guard.adminRequired.needsPrivileges')}
                <br />
                {t('admin.guard.adminRequired.currentRole', { role: roleData?.role || 'MEMBER' })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => setLocation(`/w/${slug}`)}
              className="w-full"
            >
              {t('admin.guard.goToWorkspace')}
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
            >
              {t('admin.guard.goToMyWorkspaces')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Workspace exists, user is a member and has access (admin or mentor), render children
  return <>{children}</>;
}
