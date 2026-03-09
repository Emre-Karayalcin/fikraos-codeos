import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/super-admin/check"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/check", { credentials: "include" });
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.isSuperAdmin) {
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
              <CardTitle className="text-2xl">Access Denied</CardTitle>
              <CardDescription className="mt-2">
                You do not have super admin privileges. Only designated platform administrators can access this dashboard.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => setLocation("/")} className="w-full">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
