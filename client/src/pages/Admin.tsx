import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Settings, Users, BarChart3, List, CalendarDays } from "lucide-react";
import WorkspaceSettings from "@/components/admin/WorkspaceSettings";
import ModuleManagement from "@/components/admin/ModuleManagement";
import UserManagement from "@/components/admin/UserManagement";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import IdeasOverview from "@/components/admin/IdeasOverview";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import toast from "react-hot-toast";

// ─── Program Progress Manager component (used inside Admin) ──────────────────

interface ProgramStep { titleEn: string; titleAr: string; }
interface ProgramData { orgId: string; currentStep: number; steps: ProgramStep[]; }

const DEFAULT_STEPS: ProgramStep[] = [
  { titleEn: "Ideation & Business Foundations", titleAr: "الريادة وأسس الأعمال" },
  { titleEn: "Product Strategy & Validation",   titleAr: "استراتيجية المنتج والتحقق" },
  { titleEn: "Product Design & Insights",        titleAr: "تصميم المنتج والرؤى" },
  { titleEn: "Pitching & Presentation",          titleAr: "العرض التقديمي" },
];

function ProgramProgressManager({ orgId }: { orgId?: string }) {
  const qc = useQueryClient();
  const queryKey = ["/api/program-progress", orgId];

  const { data, isLoading } = useQuery<ProgramData>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program-progress`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [steps, setSteps] = useState<ProgramStep[] | null>(null);

  // Initialise local state from fetched data
  React.useEffect(() => {
    if (data) {
      setCurrentStep(data.currentStep);
      setSteps(data.steps ?? DEFAULT_STEPS);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program-progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentStep, steps }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Program progress saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const activeSteps = steps ?? DEFAULT_STEPS;
  const activeCurrentStep = currentStep ?? data?.currentStep ?? 1;

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> Program Timeline
        </CardTitle>
        <CardDescription>
          Set the active week and customise step titles in English and Arabic. All workspace members will see the updated progress bar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current step selector */}
        <div className="flex items-center gap-4">
          <Label className="w-40 shrink-0">Active week</Label>
          <Select
            value={String(activeCurrentStep)}
            onValueChange={(v) => setCurrentStep(Number(v))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeSteps.map((_, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  Week {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step editors */}
        <div className="space-y-4">
          {activeSteps.map((step, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  idx + 1 === activeCurrentStep ? "border-primary bg-primary text-white" : "border-gray-300 text-gray-400"
                }`}>
                  {idx + 1}
                </div>
                <span className="text-sm font-medium text-foreground">Week {idx + 1}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">English</Label>
                  <Input
                    value={step.titleEn}
                    onChange={(e) => {
                      const next = [...activeSteps];
                      next[idx] = { ...next[idx], titleEn: e.target.value };
                      setSteps(next);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Arabic (عربي)</Label>
                  <Input
                    dir="rtl"
                    value={step.titleAr}
                    onChange={(e) => {
                      const next = [...activeSteps];
                      next[idx] = { ...next[idx], titleAr: e.target.value };
                      setSteps(next);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();

  // Get tab from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || "dashboard");

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newUrl = tab === "dashboard" ? `/w/${slug}/admin` : `/w/${slug}/admin?tab=${tab}`;
    window.history.pushState({}, '', newUrl);
  };

  // Fetch workspace info to get orgId
  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`/api/workspaces/${slug}`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!slug
  });

  // Check if user has admin access using the orgId from workspace
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['/api/organizations', workspace?.id, 'admin', 'check-role'],
    queryFn: async () => {
      if (!workspace?.id) return null;
      const response = await fetch(`/api/organizations/${workspace.id}/admin/stats`, {
        credentials: 'include'
      });
      if (response.status === 403) {
        throw new Error('Admin access required');
      }
      if (!response.ok) {
        throw new Error('Failed to check admin access');
      }
      return true;
    },
    enabled: !!workspace?.id,
    retry: false
  });

  const currentOrg = workspace;

  if (roleLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need admin or owner privileges to access this area.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <button
              onClick={() => setLocation(`/w/${slug}/dashboard`)}
              className="text-primary hover:underline"
              data-testid="button-back-dashboard"
            >
              Back to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isCollapsed ? 'ml-0' : 'ml-0'}`}>
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-admin-title">
                Workspace Admin
              </h1>
              <p className="text-text-secondary mt-2">
                Manage {currentOrg?.name || 'workspace'} settings and members
              </p>
            </div>
            <Badge variant="secondary" data-testid="badge-admin-role">
              Admin Dashboard
            </Badge>
          </div>

          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
             <TabsList className="grid w-full grid-cols-5" data-testid="tabs-admin-navigation">
              <TabsTrigger value="dashboard" className="flex items-center gap-2" data-testid="tab-dashboard">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="ideas" className="flex items-center gap-2" data-testid="tab-ideas">
                <List className="w-4 h-4" />
                Ideas
              </TabsTrigger>
              <TabsTrigger value="program" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Program
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2" data-testid="tab-settings">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <AnalyticsDashboard orgId={slug!} />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <UserManagement orgId={slug!} />
            </TabsContent>

            <TabsContent value="ideas" className="space-y-6">
              <IdeasOverview orgId={slug!} />
            </TabsContent>

            <TabsContent value="program" className="space-y-6">
              <ProgramProgressManager orgId={currentOrg?.id} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <WorkspaceSettings orgId={slug!} currentOrg={currentOrg} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}