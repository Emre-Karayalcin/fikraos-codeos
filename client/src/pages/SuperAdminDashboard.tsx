import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Users, Lightbulb, Target, LayoutDashboard, Filter } from "lucide-react";
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

interface UserWorkspace {
  name: string;
  slug: string;
  role: string;
}

interface SuperAdminUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  workspaces: UserWorkspace[];
}

interface SuperAdminIdea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  createdAt: string;
  workspaceName: string;
  workspaceSlug: string;
  creatorFirstName: string | null;
  creatorLastName: string | null;
  creatorUsername: string | null;
  creatorEmail: string | null;
}

type Tab = "workspaces" | "users" | "ideas";

// ─── Main component ─────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("workspaces");
  const [filterOrgId, setFilterOrgId] = useState<string>("all");

  const { data: workspaces, isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/workspaces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery<SuperAdminUser[]>({
    queryKey: ["/api/super-admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: ideas, isLoading: ideasLoading } = useQuery<SuperAdminIdea[]>({
    queryKey: ["/api/super-admin/ideas"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/ideas", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ideas");
      return res.json();
    },
  });

  const selectedWorkspace = useMemo(
    () => (filterOrgId !== "all" ? workspaces?.find((w) => w.id === filterOrgId) : null) ?? null,
    [filterOrgId, workspaces]
  );

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
  ];

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const sorted = [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!selectedWorkspace) return sorted;
    return sorted.filter((u) => u.workspaces.some((ws) => ws.slug === selectedWorkspace.slug));
  }, [users, selectedWorkspace]);

  const filteredIdeas = useMemo(() => {
    if (!ideas) return [];
    const sorted = [...ideas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!selectedWorkspace) return sorted;
    return sorted.filter((i) => i.workspaceSlug === selectedWorkspace.slug);
  }, [ideas, selectedWorkspace]);

  const sortedWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    return [...workspaces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [workspaces]);

  const isLoading = workspacesLoading || usersLoading || ideasLoading;

  const TABS: { key: Tab; label: string }[] = [
    { key: "workspaces", label: "Workspaces" },
    { key: "users", label: "Users" },
    { key: "ideas", label: "Ideas" },
  ];

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
                <p className="text-muted-foreground">Platform-wide overview of all workspaces</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Tab navigation */}
          <div className="border-b border-border">
            <nav className="flex gap-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Workspaces table ────────────────────────────────────────── */}
          {activeTab === "workspaces" && (
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Workspaces {selectedWorkspace ? `— ${selectedWorkspace.name}` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {workspacesLoading ? (
                  <Spinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Ideas</TableHead>
                        <TableHead>Challenges</TableHead>
                        <TableHead>Assets</TableHead>
                        <TableHead>Features</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedWorkspaces.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                            No workspaces found
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedWorkspaces.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>
                              <div className="font-medium">{w.name}</div>
                              <div className="text-xs text-muted-foreground">{w.slug}</div>
                            </TableCell>
                            <TableCell>{w.memberCount}</TableCell>
                            <TableCell>{w.projectCount}</TableCell>
                            <TableCell>{w.challengeCount}</TableCell>
                            <TableCell>{w.assetCount}</TableCell>
                            <TableCell>
                              <FeatureBadges workspace={w} />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(w.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Users table ─────────────────────────────────────────────── */}
          {activeTab === "users" && (
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Users {selectedWorkspace ? `— ${selectedWorkspace.name}` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <Spinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Workspaces</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="font-medium">
                                {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "—"}
                              </div>
                              {u.username && (u.firstName || u.lastName) && (
                                <div className="text-xs text-muted-foreground">@{u.username}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                            <TableCell>
                              <WorkspacePills workspaces={u.workspaces} />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Ideas table ──────────────────────────────────────────────── */}
          {activeTab === "ideas" && (
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Ideas {selectedWorkspace ? `— ${selectedWorkspace.name}` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {ideasLoading ? (
                  <Spinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Creator</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIdeas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                            No ideas found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredIdeas.map((idea) => (
                          <TableRow key={idea.id}>
                            <TableCell>
                              <div className="font-medium">{idea.title}</div>
                              {idea.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                  {idea.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell><StatusBadge status={idea.status} /></TableCell>
                            <TableCell><TypeBadge type={idea.type} /></TableCell>
                            <TableCell>
                              <div className="font-medium">{idea.workspaceName}</div>
                              <div className="text-xs text-muted-foreground">{idea.workspaceSlug}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {[idea.creatorFirstName, idea.creatorLastName].filter(Boolean).join(" ") ||
                                idea.creatorUsername ||
                                idea.creatorEmail ||
                                "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(idea.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Feature badges ──────────────────────────────────────────────────────────

const FEATURES = [
  { key: "challengesEnabled" as const, label: "Challenges" },
  { key: "expertsEnabled" as const, label: "Experts" },
  { key: "radarEnabled" as const, label: "Radar" },
  { key: "dashboardEnabled" as const, label: "Dashboard" },
  { key: "aiBuilderEnabled" as const, label: "AI Builder" },
  { key: "formSubmissionEnabled" as const, label: "Form Sub" },
];

function FeatureBadges({ workspace }: { workspace: Workspace }) {
  return (
    <div className="flex flex-wrap gap-1">
      {FEATURES.map((f) => (
        <Badge
          key={f.key}
          variant={workspace[f.key] ? "secondary" : "outline"}
          className={workspace[f.key] ? "" : "opacity-40"}
        >
          {f.label}
        </Badge>
      ))}
    </div>
  );
}

// ─── Workspace pills ─────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  OWNER:  "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  ADMIN:  "bg-blue-500/15  text-blue-400  border border-blue-500/20",
  MENTOR: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  MEMBER: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
};

function WorkspacePills({ workspaces }: { workspaces: UserWorkspace[] }) {
  if (!workspaces || workspaces.length === 0) {
    return <span className="text-muted-foreground text-xs">None</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {workspaces.map((ws) => (
        <span
          key={ws.slug}
          className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${ROLE_COLORS[ws.role] || ROLE_COLORS.MEMBER}`}
        >
          {ws.name}
          <span className="opacity-60">· {ws.role}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Status & type badges ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  BACKLOG:       "bg-slate-500/15 text-slate-400",
  UNDER_REVIEW:  "bg-amber-500/15 text-amber-400",
  SHORTLISTED:   "bg-blue-500/15  text-blue-400",
  IN_INCUBATION: "bg-green-500/15 text-green-400",
  ARCHIVED:      "bg-red-500/15   text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-400";
  const label = status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center text-xs rounded-full px-2.5 py-0.5 font-medium ${style}`}>
      {label}
    </span>
  );
}

const TYPE_STYLES: Record<string, string> = {
  STARTUP:    "bg-indigo-500/15 text-indigo-400",
  PROJECT:    "bg-teal-500/15   text-teal-400",
  INNOVATION: "bg-pink-500/15   text-pink-400",
};

function TypeBadge({ type }: { type: string }) {
  const style = TYPE_STYLES[type] ?? "bg-slate-500/15 text-slate-400";
  const label = type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center text-xs rounded-full px-2.5 py-0.5 font-medium ${style}`}>
      {label}
    </span>
  );
}


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

interface UserWorkspace {
  name: string;
  slug: string;
  role: string;
}

interface SuperAdminUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  workspaces: UserWorkspace[];
}

interface SuperAdminIdea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  createdAt: string;
  workspaceName: string;
  workspaceSlug: string;
  creatorFirstName: string | null;
  creatorLastName: string | null;
  creatorUsername: string | null;
  creatorEmail: string | null;
}

type Tab = "workspaces" | "users" | "ideas";

// ─── Main component ─────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("workspaces");
  // "all" means All Workspaces; otherwise the selected workspace id
  const [filterOrgId, setFilterOrgId] = useState<string>("all");

  // ── data fetches ─────────────────────────────────────────────────────────
  const { data: workspaces, isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/workspaces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery<SuperAdminUser[]>({
    queryKey: ["/api/super-admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: ideas, isLoading: ideasLoading } = useQuery<SuperAdminIdea[]>({
    queryKey: ["/api/super-admin/ideas"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/ideas", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ideas");
      return res.json();
    },
  });

  // ── derive the selected workspace (for slug lookups) ────────────────────
  const selectedWorkspace = useMemo(
    () => (filterOrgId !== "all" ? workspaces?.find((w) => w.id === filterOrgId) : null) ?? null,
    [filterOrgId, workspaces]
  );

  // ── summary card values, reactive to filter ─────────────────────────────
  const totals = useMemo(() => {
    if (selectedWorkspace) {
      // single-workspace view
      return {
        workspaces: 1,
        users: selectedWorkspace.memberCount,
        ideas: selectedWorkspace.projectCount,
        challenges: selectedWorkspace.challengeCount,
      };
    }
    // platform-wide
    return {
      workspaces: workspaces?.length ?? 0,
      users: users?.length ?? 0,
      ideas: workspaces?.reduce((s, w) => s + w.projectCount, 0) ?? 0,
      challenges: workspaces?.reduce((s, w) => s + w.challengeCount, 0) ?? 0,
    };
  }, [selectedWorkspace, workspaces, users]);

  const summaryCards = [
    { title: selectedWorkspace ? "Workspace" : "Total Workspaces", value: totals.workspaces, icon: Globe, color: "text-blue-600" },
    { title: "Total Users", value: totals.users, icon: Users, color: "text-green-600" },
    { title: "Total Ideas", value: totals.ideas, icon: Lightbulb, color: "text-purple-600" },
    { title: "Total Challenges", value: totals.challenges, icon: Target, color: "text-orange-600" },
  ];

  // ── filtered table data ──────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const sorted = [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!selectedWorkspace) return sorted;
    return sorted.filter((u) => u.workspaces.some((ws) => ws.slug === selectedWorkspace.slug));
  }, [users, selectedWorkspace]);

  const filteredIdeas = useMemo(() => {
    if (!ideas) return [];
    const sorted = [...ideas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!selectedWorkspace) return sorted;
    return sorted.filter((i) => i.workspaceSlug === selectedWorkspace.slug);
  }, [ideas, selectedWorkspace]);

  const sortedWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    return [...workspaces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [workspaces]);

  const isLoading = workspacesLoading || usersLoading || ideasLoading;

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Header row: title + workspace filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Super Admin</h1>
                <p className="text-muted-foreground">Platform-wide overview of all workspaces</p>
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
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoading ? (
                        <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        card.value
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 border-b border-border">
            {(["workspaces", "users", "ideas"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? "bg-card border border-border border-b-card -mb-px text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Workspaces tab ─────────────────────────────────────────────── */}
          {activeTab === "workspaces" && (
            <Card>
              <CardHeader>
                <CardTitle>Workspaces</CardTitle>
              </CardHeader>
              <CardContent>
                {workspacesLoading ? (
                  <SpinnerRow />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <Th>Name</Th>
                          <Th>Members</Th>
                          <Th>Ideas</Th>
                          <Th>Challenges</Th>
                          <Th>Assets</Th>
                          <Th>Features</Th>
                          <Th>Created</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedWorkspaces.map((w) => (
                          <tr key={w.id} className="border-b last:border-0">
                            <td className="py-3 px-4">
                              <div className="font-medium">{w.name}</div>
                              <div className="text-xs text-muted-foreground">{w.slug}</div>
                            </td>
                            <td className="py-3 px-4">{w.memberCount}</td>
                            <td className="py-3 px-4">{w.projectCount}</td>
                            <td className="py-3 px-4">{w.challengeCount}</td>
                            <td className="py-3 px-4">{w.assetCount}</td>
                            <td className="py-3 px-4">
                              <FeatureBadges workspace={w} />
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(w.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {sortedWorkspaces.length === 0 && <EmptyRow cols={7} />}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Users tab ──────────────────────────────────────────────────── */}
          {activeTab === "users" && (
            <Card>
              <CardHeader>
                <CardTitle>Users{selectedWorkspace ? ` — ${selectedWorkspace.name}` : ""}</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <SpinnerRow />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th>Workspaces</Th>
                          <Th>Joined</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b last:border-0">
                            <td className="py-3 px-4">
                              <div className="font-medium">
                                {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "—"}
                              </div>
                              {u.username && (u.firstName || u.lastName) && (
                                <div className="text-xs text-muted-foreground">{u.username}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{u.email || "—"}</td>
                            <td className="py-3 px-4">
                              <WorkspacePills workspaces={u.workspaces} />
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && <EmptyRow cols={4} />}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Ideas tab ──────────────────────────────────────────────────── */}
          {activeTab === "ideas" && (
            <Card>
              <CardHeader>
                <CardTitle>Ideas{selectedWorkspace ? ` — ${selectedWorkspace.name}` : ""}</CardTitle>
              </CardHeader>
              <CardContent>
                {ideasLoading ? (
                  <SpinnerRow />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <Th>Title</Th>
                          <Th>Status</Th>
                          <Th>Type</Th>
                          <Th>Workspace</Th>
                          <Th>Creator</Th>
                          <Th>Created</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIdeas.map((idea) => (
                          <tr key={idea.id} className="border-b last:border-0">
                            <td className="py-3 px-4">
                              <div className="font-medium">{idea.title}</div>
                              {idea.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                  {idea.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={idea.status} />
                            </td>
                            <td className="py-3 px-4">
                              <TypeBadge type={idea.type} />
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{idea.workspaceName}</div>
                              <div className="text-xs text-muted-foreground">{idea.workspaceSlug}</div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {[idea.creatorFirstName, idea.creatorLastName].filter(Boolean).join(" ") ||
                                idea.creatorUsername ||
                                idea.creatorEmail ||
                                "—"}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(idea.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {filteredIdeas.length === 0 && <EmptyRow cols={6} />}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small shared helpers ────────────────────────────────────────────────────

function Th({ children }: { children: string }) {
  return <th className="text-left py-3 px-4 font-medium text-muted-foreground">{children}</th>;
}

function SpinnerRow() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-8 text-center text-muted-foreground">
        No records found
      </td>
    </tr>
  );
}

// ─── Feature badges (Workspaces tab) ────────────────────────────────────────

const FEATURES = [
  { key: "challengesEnabled" as const, label: "Challenges" },
  { key: "expertsEnabled" as const, label: "Experts" },
  { key: "radarEnabled" as const, label: "Radar" },
  { key: "dashboardEnabled" as const, label: "Dashboard" },
  { key: "aiBuilderEnabled" as const, label: "AI Builder" },
  { key: "formSubmissionEnabled" as const, label: "Form Sub" },
];

function FeatureBadges({ workspace }: { workspace: Workspace }) {
  return (
    <div className="flex flex-wrap gap-1">
      {FEATURES.map((f) => (
        <Badge
          key={f.key}
          variant={workspace[f.key] ? "secondary" : "outline"}
          className={workspace[f.key] ? "" : "opacity-40"}
        >
          {f.label}
        </Badge>
      ))}
    </div>
  );
}

// ─── Workspace pills (Users tab) ─────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  OWNER:  "bg-amber-500/20  text-amber-400",
  ADMIN:  "bg-blue-500/20   text-blue-400",
  MENTOR: "bg-purple-500/20 text-purple-400",
  MEMBER: "bg-slate-500/20  text-slate-400",
};

function WorkspacePills({ workspaces }: { workspaces: UserWorkspace[] }) {
  if (!workspaces || workspaces.length === 0) {
    return <span className="text-muted-foreground text-xs">None</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {workspaces.map((ws) => (
        <span
          key={ws.slug}
          className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${ROLE_COLORS[ws.role] || ROLE_COLORS.MEMBER}`}
        >
          {ws.name}
          <span className="opacity-60">({ws.role})</span>
        </span>
      ))}
    </div>
  );
}

// ─── Status + type badges (Ideas tab) ────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  BACKLOG:        "bg-slate-500/20  text-slate-400",
  UNDER_REVIEW:   "bg-amber-500/20  text-amber-400",
  SHORTLISTED:    "bg-blue-500/20   text-blue-400",
  IN_INCUBATION:  "bg-green-500/20  text-green-400",
  ARCHIVED:       "bg-red-500/20    text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[status] || STATUS_STYLES.BACKLOG}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const TYPE_STYLES: Record<string, string> = {
  RESEARCH: "bg-indigo-500/20 text-indigo-400",
  DEVELOP:  "bg-teal-500/20   text-teal-400",
  LAUNCH:   "bg-rose-500/20   text-rose-400",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-block text-xs rounded-full px-2 py-0.5 ${TYPE_STYLES[type] || TYPE_STYLES.RESEARCH}`}>
      {type}
    </span>
  );
}
