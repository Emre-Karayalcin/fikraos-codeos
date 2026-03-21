import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Globe, Users, Lightbulb, Target, LayoutDashboard, Filter, CalendarDays, ClipboardList } from "lucide-react";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  createdAt: string;
  challengesEnabled: boolean;
  expertsEnabled: boolean;
  radarEnabled: boolean;
  dashboardEnabled: boolean;
  aiBuilderEnabled: boolean;
  formSubmissionEnabled: boolean;
  dashboardNameEn: string | null;
  myIdeasNameEn: string | null;
  challengesNameEn: string | null;
  radarNameEn: string | null;
  expertsNameEn: string | null;
  memberCount: number;
  projectCount: number;
  challengeCount: number;
  assetCount: number;
}

interface SuperAdminUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  workspaces: { name: string; slug: string; role: string }[];
}

interface SuperAdminApplication {
  application: {
    id: string;
    status: string;
    submittedAt: string;
  };
}

interface SuperAdminEvent {
  id: string;
  title: string;
  startDate: string;
  isPublished: boolean;
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterOrgId, setFilterOrgId] = useState<string>("all");

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: () => apiFetch("/api/super-admin/workspaces"),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<SuperAdminUser[]>({
    queryKey: ["/api/super-admin/users"],
    queryFn: () => apiFetch("/api/super-admin/users"),
  });

  const { data: adminEvents = [] } = useQuery<SuperAdminEvent[]>({
    queryKey: ["/api/super-admin/events"],
    queryFn: () => apiFetch("/api/super-admin/events"),
  });

  const { data: adminApplications = [] } = useQuery<SuperAdminApplication[]>({
    queryKey: ["/api/super-admin/applications"],
    queryFn: () => apiFetch("/api/super-admin/applications"),
  });

  const sortedWorkspaces = useMemo(() => {
    return [...workspaces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [workspaces]);

  const selectedWorkspace = useMemo(
    () => (filterOrgId !== "all" ? workspaces?.find((w) => w.id === filterOrgId) : null) ?? null,
    [filterOrgId, workspaces]
  );

  const isLoading = workspacesLoading || usersLoading;

  // ── Summary totals ────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (selectedWorkspace) {
      return {
        workspaces: 1,
        users: selectedWorkspace.memberCount,
        ideas: selectedWorkspace.projectCount,
        challenges: selectedWorkspace.challengeCount,
      };
    }
    return {
      workspaces: workspaces?.length ?? 0,
      users: users?.length ?? 0,
      ideas: workspaces?.reduce((s, w) => s + w.projectCount, 0) ?? 0,
      challenges: workspaces?.reduce((s, w) => s + w.challengeCount, 0) ?? 0,
    };
  }, [selectedWorkspace, workspaces, users]);

  const summaryCards = [
    {
      title: selectedWorkspace ? "Workspace" : "Total Workspaces",
      value: totals.workspaces,
      icon: Globe,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      sub: "registered workspaces",
    },
    {
      title: "Total Users",
      value: totals.users,
      icon: Users,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-400",
      sub: "registered profiles",
    },
    {
      title: "Total Ideas",
      value: totals.ideas,
      icon: Lightbulb,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
      sub: "submitted ideas",
    },
    {
      title: "Total Challenges",
      value: totals.challenges,
      icon: Target,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400",
      sub: "active challenges",
    },
    {
      title: "Total Events",
      value: adminEvents.length,
      icon: CalendarDays,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-400",
      sub: "platform events",
    },
    {
      title: "Applications",
      value: adminApplications.length,
      icon: ClipboardList,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      sub: "member applications",
    },
  ];

  // ── Chart data ────────────────────────────────────────────────────────

  // Members & Ideas per Workspace chart data
  const membersIdeasChartData = useMemo(() => {
    const source = selectedWorkspace ? [selectedWorkspace] : sortedWorkspaces;
    return source.map((w) => ({
      name: w.name.length > 14 ? w.name.slice(0, 14) + "…" : w.name,
      Members: w.memberCount,
      Ideas: w.projectCount,
    }));
  }, [sortedWorkspaces, selectedWorkspace]);

  // Challenges per Workspace chart data
  const challengesChartData = useMemo(() => {
    const source = selectedWorkspace ? [selectedWorkspace] : sortedWorkspaces;
    return source.map((w) => ({
      name: w.name.length > 14 ? w.name.slice(0, 14) + "…" : w.name,
      Challenges: w.challengeCount,
    }));
  }, [sortedWorkspaces, selectedWorkspace]);

  // Application Status chart data
  const appStatusChartData = useMemo(() => {
    const apps = adminApplications;
    return [
      {
        name: "Applications",
        Total: apps.length,
        Approved: apps.filter((a) => a.application.status === "APPROVED").length,
        Rejected: apps.filter((a) => a.application.status === "REJECTED").length,
        Pending: apps.filter((a) => a.application.status === "PENDING_REVIEW").length,
        "AI Reviewed": apps.filter((a) => a.application.status === "AI_REVIEWED").length,
      },
    ];
  }, [adminApplications]);

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Super Admin</h1>
                <p className="text-muted-foreground">Platform Overview</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterOrgId} onValueChange={setFilterOrgId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="All Workspaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {sortedWorkspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="border border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                        <p className="text-3xl font-bold">
                          {isLoading ? (
                            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            card.value
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${card.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Chart: Members & Ideas per Workspace */}
          <Card className="border border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Members &amp; Ideas per Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              {workspacesLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : membersIdeasChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  No workspace data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={membersIdeasChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Members" fill="#4588f5" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Ideas" fill="#a855f7" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart: Challenges per Workspace */}
          <Card className="border border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Challenges per Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              {workspacesLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : challengesChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  No workspace data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={challengesChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Challenges" fill="#f97316" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart: Application Status */}
          <Card className="border border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              {adminApplications.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  No applications yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={appStatusChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Total" fill="#64748b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Approved" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Rejected" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Pending" fill="#eab308" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="AI Reviewed" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
