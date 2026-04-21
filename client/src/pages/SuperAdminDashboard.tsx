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
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Globe, Users, Lightbulb, Target, LayoutDashboard, Filter, CalendarDays, ClipboardList, X, GraduationCap, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { format, subDays, isAfter, parseISO } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  memberCount: number;
  projectCount: number;
  challengeCount: number;
  assetCount: number;
  mentorCount: number;
  pitchDeckCount: number;
  backlogCount: number;
  underReviewCount: number;
  shortlistedCount: number;
  inIncubationCount: number;
  archivedCount: number;
}

interface SuperAdminUser {
  id: string;
  email: string;
  createdAt: string;
  workspaces: { name: string; slug: string; role: string }[];
}

interface SuperAdminApplication {
  application: {
    id: string;
    status: string;
    submittedAt: string;
  };
  workspace?: { id: string; name: string };
}

interface SuperAdminEvent {
  id: string;
  title: string;
  startDate: string;
  isPublished: boolean;
  organizationId: string;
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

const DATE_RANGES = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Last 365 days", value: "365" },
];

const APP_STATUSES = [
  { label: "All statuses", value: "all" },
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "AI Reviewed", value: "AI_REVIEWED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const PIE_COLORS = ["#22c55e", "#ef4444", "#eab308", "#3b82f6", "#64748b"];

// ─── Main component ──────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterOrgId, setFilterOrgId] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [filterAppStatus, setFilterAppStatus] = useState<string>("all");

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

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [workspaces]
  );

  const selectedWorkspace = useMemo(
    () => (filterOrgId !== "all" ? workspaces.find((w) => w.id === filterOrgId) : null) ?? null,
    [filterOrgId, workspaces]
  );

  // Date cutoff
  const dateCutoff = useMemo(() => {
    if (filterDateRange === "all") return null;
    return subDays(new Date(), parseInt(filterDateRange));
  }, [filterDateRange]);

  // Filtered datasets
  const filteredUsers = useMemo(() => {
    let list = users;
    if (filterOrgId !== "all") {
      list = list.filter((u) => u.workspaces.some((w) => w.slug === selectedWorkspace?.slug));
    }
    if (dateCutoff) {
      list = list.filter((u) => isAfter(parseISO(u.createdAt), dateCutoff));
    }
    return list;
  }, [users, filterOrgId, selectedWorkspace, dateCutoff]);

  const filteredApplications = useMemo(() => {
    let list = adminApplications;
    if (filterOrgId !== "all") {
      list = list.filter((a) => a.workspace?.id === filterOrgId);
    }
    if (dateCutoff) {
      list = list.filter((a) => isAfter(parseISO(a.application.submittedAt), dateCutoff));
    }
    if (filterAppStatus !== "all") {
      list = list.filter((a) => a.application.status === filterAppStatus);
    }
    return list;
  }, [adminApplications, filterOrgId, dateCutoff, filterAppStatus]);

  const filteredEvents = useMemo(() => {
    let list = adminEvents;
    if (filterOrgId !== "all") {
      list = list.filter((e) => e.organizationId === filterOrgId);
    }
    if (dateCutoff) {
      list = list.filter((e) => isAfter(parseISO(e.startDate), dateCutoff));
    }
    return list;
  }, [adminEvents, filterOrgId, dateCutoff]);

  const activeFiltersCount = [
    filterOrgId !== "all",
    filterDateRange !== "all",
    filterAppStatus !== "all",
  ].filter(Boolean).length;

  const isLoading = workspacesLoading || usersLoading;

  // ── Summary totals ────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (selectedWorkspace) {
      return {
        workspaces: 1,
        users: filteredUsers.length,
        ideas: selectedWorkspace.projectCount,
        challenges: selectedWorkspace.challengeCount,
        mentors: selectedWorkspace.mentorCount,
        pitchDecks: selectedWorkspace.pitchDeckCount,
      };
    }
    return {
      workspaces: workspaces.length,
      users: filteredUsers.length,
      ideas: workspaces.reduce((s, w) => s + w.projectCount, 0),
      challenges: workspaces.reduce((s, w) => s + w.challengeCount, 0),
      mentors: workspaces.reduce((s, w) => s + w.mentorCount, 0),
      pitchDecks: workspaces.reduce((s, w) => s + w.pitchDeckCount, 0),
    };
  }, [selectedWorkspace, workspaces, filteredUsers]);

  const summaryCards = [
    { title: selectedWorkspace ? "Workspace" : "Total Workspaces", value: totals.workspaces, icon: Globe, iconBg: "bg-blue-500/10", iconColor: "text-blue-400", sub: "registered" },
    { title: "Total Users", value: totals.users, icon: Users, iconBg: "bg-green-500/10", iconColor: "text-green-400", sub: "registered profiles" },
    { title: "Total Ideas", value: totals.ideas, icon: Lightbulb, iconBg: "bg-purple-500/10", iconColor: "text-purple-400", sub: "submitted ideas" },
    { title: "Total Challenges", value: totals.challenges, icon: Target, iconBg: "bg-orange-500/10", iconColor: "text-orange-400", sub: "active challenges" },
    { title: "Events", value: filteredEvents.length, icon: CalendarDays, iconBg: "bg-teal-500/10", iconColor: "text-teal-400", sub: "platform events" },
    { title: "Applications", value: filteredApplications.length, icon: ClipboardList, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-400", sub: "member applications" },
    { title: "Mentors", value: totals.mentors, icon: GraduationCap, iconBg: "bg-pink-500/10", iconColor: "text-pink-400", sub: "assigned mentors" },
    { title: "Pitch Decks", value: totals.pitchDecks, icon: FileText, iconBg: "bg-cyan-500/10", iconColor: "text-cyan-400", sub: "generated" },
  ];

  // ── Chart data ────────────────────────────────────────────────────────

  const membersIdeasChartData = useMemo(() => {
    const source = selectedWorkspace ? [selectedWorkspace] : sortedWorkspaces;
    return source.map((w) => ({
      name: w.name.length > 12 ? w.name.slice(0, 12) + "…" : w.name,
      Members: w.memberCount,
      Ideas: w.projectCount,
    }));
  }, [sortedWorkspaces, selectedWorkspace]);

  const challengesAssetsChartData = useMemo(() => {
    const source = selectedWorkspace ? [selectedWorkspace] : sortedWorkspaces;
    return source.map((w) => ({
      name: w.name.length > 12 ? w.name.slice(0, 12) + "…" : w.name,
      Challenges: w.challengeCount,
      Assets: w.assetCount,
    }));
  }, [sortedWorkspaces, selectedWorkspace]);

  const mentorsPitchDecksChartData = useMemo(() => {
    const source = selectedWorkspace ? [selectedWorkspace] : sortedWorkspaces;
    return source.map((w) => ({
      name: w.name.length > 12 ? w.name.slice(0, 12) + "…" : w.name,
      Mentors: w.mentorCount,
      "Pitch Decks": w.pitchDeckCount,
    }));
  }, [sortedWorkspaces, selectedWorkspace]);

  const ideaStatusChartData = useMemo(() => {
    const source = selectedWorkspace ? [selectedWorkspace] : sortedWorkspaces;
    return source.map((w) => ({
      name: w.name.length > 12 ? w.name.slice(0, 12) + "…" : w.name,
      Backlog: w.backlogCount,
      "Under Review": w.underReviewCount,
      Shortlisted: w.shortlistedCount,
      "In Incubation": w.inIncubationCount,
      Archived: w.archivedCount,
    }));
  }, [sortedWorkspaces, selectedWorkspace]);

  const appStatusPieData = useMemo(() => {
    const apps = filteredApplications;
    const approved = apps.filter((a) => a.application.status === "APPROVED").length;
    const rejected = apps.filter((a) => a.application.status === "REJECTED").length;
    const pending = apps.filter((a) => a.application.status === "PENDING_REVIEW").length;
    const aiReviewed = apps.filter((a) => a.application.status === "AI_REVIEWED").length;
    return [
      { name: "Approved", value: approved },
      { name: "Rejected", value: rejected },
      { name: "Pending", value: pending },
      { name: "AI Reviewed", value: aiReviewed },
    ].filter((d) => d.value > 0);
  }, [filteredApplications]);

  // Workspace growth over time (workspaces created per month)
  const workspaceGrowthData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    const source = selectedWorkspace ? [selectedWorkspace] : workspaces;
    for (const w of source) {
      if (dateCutoff && !isAfter(parseISO(w.createdAt), dateCutoff)) continue;
      const key = format(parseISO(w.createdAt), "MMM yy");
      monthMap[key] = (monthMap[key] ?? 0) + 1;
    }
    return Object.entries(monthMap)
      .sort((a, b) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const [aM, aY] = a[0].split(" ");
        const [bM, bY] = b[0].split(" ");
        return parseInt(aY) !== parseInt(bY) ? parseInt(aY) - parseInt(bY) : months.indexOf(aM) - months.indexOf(bM);
      })
      .map(([month, count]) => ({ month, Workspaces: count }));
  }, [workspaces, selectedWorkspace, dateCutoff]);

  // User registrations per month
  const userGrowthData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    for (const u of filteredUsers) {
      const key = format(parseISO(u.createdAt), "MMM yy");
      monthMap[key] = (monthMap[key] ?? 0) + 1;
    }
    return Object.entries(monthMap)
      .sort((a, b) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const [aM, aY] = a[0].split(" ");
        const [bM, bY] = b[0].split(" ");
        return parseInt(aY) !== parseInt(bY) ? parseInt(aY) - parseInt(bY) : months.indexOf(aM) - months.indexOf(bM);
      })
      .map(([month, count]) => ({ month, Users: count }));
  }, [filteredUsers]);

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  const ChartLoading = () => (
    <div className="flex items-center justify-center h-[260px]">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const ChartEmpty = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">{message}</div>
  );

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-7 h-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <p className="text-muted-foreground text-sm">Platform-wide overview</p>
              </div>
            </div>
          </div>

          {/* ── Comprehensive Filters ── */}
          <Card className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{activeFiltersCount}</Badge>
                  )}
                </div>

                {/* Workspace filter */}
                <Select value={filterOrgId} onValueChange={setFilterOrgId}>
                  <SelectTrigger className="w-48 h-9 text-sm">
                    <SelectValue placeholder="All Workspaces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workspaces</SelectItem>
                    {sortedWorkspaces.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date range filter */}
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger className="w-40 h-9 text-sm">
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Application status filter */}
                <Select value={filterAppStatus} onValueChange={setFilterAppStatus}>
                  <SelectTrigger className="w-44 h-9 text-sm">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear filters */}
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { setFilterOrgId("all"); setFilterDateRange("all"); setFilterAppStatus("all"); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear filters
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="border border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 leading-tight">{card.title}</p>
                        <p className="text-2xl font-bold">
                          {isLoading ? (
                            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                          ) : card.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${card.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts — 2×2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Chart 1: Members & Ideas per Workspace */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Members &amp; Ideas per Workspace</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {workspacesLoading ? <ChartLoading /> : membersIdeasChartData.length === 0 ? (
                  <ChartEmpty message="No workspace data" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={membersIdeasChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Members" fill="#4588f5" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Ideas" fill="#a855f7" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Challenges & Assets per Workspace */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Challenges &amp; Assets per Workspace</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {workspacesLoading ? <ChartLoading /> : challengesAssetsChartData.length === 0 ? (
                  <ChartEmpty message="No workspace data" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={challengesAssetsChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Challenges" fill="#f97316" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Assets" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 3: Application Status (Pie) */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Application Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {appStatusPieData.length === 0 ? (
                  <ChartEmpty message="No applications yet" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={appStatusPieData}
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {appStatusPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 4: User Registrations over time */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">User Registrations Over Time</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {usersLoading ? <ChartLoading /> : userGrowthData.length === 0 ? (
                  <ChartEmpty message="No user data in range" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={userGrowthData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="Users" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 5: Workspace Creation over time */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Workspace Creation Over Time</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {workspacesLoading ? <ChartLoading /> : workspaceGrowthData.length === 0 ? (
                  <ChartEmpty message="No workspace data in range" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={workspaceGrowthData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="Workspaces" stroke="#4588f5" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 6: Applications over time */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Applications Submitted Over Time</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {(() => {
                  const monthMap: Record<string, number> = {};
                  for (const a of filteredApplications) {
                    const key = format(parseISO(a.application.submittedAt), "MMM yy");
                    monthMap[key] = (monthMap[key] ?? 0) + 1;
                  }
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const appTimeData = Object.entries(monthMap)
                    .sort((a, b) => {
                      const [aM, aY] = a[0].split(" ");
                      const [bM, bY] = b[0].split(" ");
                      return parseInt(aY) !== parseInt(bY) ? parseInt(aY) - parseInt(bY) : months.indexOf(aM) - months.indexOf(bM);
                    })
                    .map(([month, count]) => ({ month, Applications: count }));

                  if (appTimeData.length === 0) return <ChartEmpty message="No applications in range" />;
                  return (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={appTimeData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="Applications" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Chart 7: Mentors & Pitch Decks per Workspace */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Mentors &amp; Pitch Decks per Workspace</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {workspacesLoading ? <ChartLoading /> : mentorsPitchDecksChartData.length === 0 ? (
                  <ChartEmpty message="No workspace data" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={mentorsPitchDecksChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Mentors" fill="#ec4899" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Pitch Decks" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 8: Idea Status per Workspace */}
            <Card className="border border-border/50 md:col-span-2">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Idea Status per Workspace</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {workspacesLoading ? <ChartLoading /> : ideaStatusChartData.length === 0 ? (
                  <ChartEmpty message="No workspace data" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ideaStatusChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Backlog" fill="#94a3b8" stackId="status" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Under Review" fill="#f59e0b" stackId="status" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Shortlisted" fill="#3b82f6" stackId="status" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="In Incubation" fill="#22c55e" stackId="status" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Archived" fill="#6b7280" stackId="status" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Exports */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Download className="w-4 h-4" />
                Data Exports
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const params = filterOrgId !== "all" ? `?orgId=${filterOrgId}` : "";
                  window.location.href = `/api/super-admin/judge-scores/export-csv${params}`;
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Export Judge Scores
                {filterOrgId !== "all" && selectedWorkspace && (
                  <span className="ml-1 text-muted-foreground">({selectedWorkspace.name})</span>
                )}
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
