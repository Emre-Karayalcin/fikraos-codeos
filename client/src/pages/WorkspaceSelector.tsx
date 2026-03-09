import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface Organization {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  defaultRoute?: string | null;
}

export default function WorkspaceSelector() {
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();

  // Fetch user's organizations
  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data after login
    refetchOnMount: true,
  });

  // If user has only one workspace, redirect automatically
  useEffect(() => {
    if (organizations && organizations.length === 1) {
      const org = organizations[0];
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
      const path = routeKeyToPath(org?.defaultRoute || 'navigation.dashboard');
      setLocation(`/w/${org.slug}${path}`);
    }
  }, [organizations, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading your workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Select a Workspace</h1>
            <p className="text-text-secondary mt-1">
              Choose a workspace to continue
            </p>
          </div>
          <Button variant="ghost" onClick={() => logout()}>
            <LogOut className="mr-2 w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Workspace Grid */}
        {organizations && organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {organizations.map((org, index) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50"
                  onClick={() => {
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
                    const path = routeKeyToPath(org?.defaultRoute || 'navigation.dashboard');
                    setLocation(`/w/${org.slug}${path}`);
                  }}
                >
                  <CardHeader className="space-y-4">
                    {org.logoUrl ? (
                      <div className="flex justify-center">
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="h-12 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: org.primaryColor
                              ? `${org.primaryColor}20`
                              : "var(--primary-10)",
                          }}
                        >
                          <Building2
                            className="w-6 h-6"
                            style={{
                              color: org.primaryColor || "var(--primary)",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-center">
                      <CardTitle className="text-xl">{org.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        /{org.slug}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => {
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
                        const path = routeKeyToPath(org?.defaultRoute || 'navigation.dashboard');
                        setLocation(`/w/${org.slug}${path}`);
                      }}
                    >
                      Open Workspace
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Workspaces Found</h3>
              <p className="text-text-secondary mb-6">
                You don't have access to any workspaces yet.
                <br />
                Create one to get started.
              </p>
              <Button onClick={() => setLocation("/create-workspace")}>
                <Plus className="mr-2 w-4 h-4" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create New Workspace Button */}
        {organizations && organizations.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/create-workspace")}
            >
              <Plus className="mr-2 w-4 h-4" />
              Create New Workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
