import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Globe, Users, Lightbulb, Target, LayoutDashboard, Filter, Pencil, Trash2, Plus, X, UserPlus, Trophy, CalendarDays, ClipboardList, RefreshCw, Kanban } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { SuperAdminIdeasKanban } from "@/components/admin/SuperAdminIdeasKanban";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

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

interface SuperAdminChallenge {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  status: string;
  deadline: string;
  prize: string | null;
  emoji: string | null;
  tags: string[];
  maxSubmissions: number;
  submissionCount: number;
  evaluationCriteria: string | null;
  createdAt: string;
  orgId: string;
  workspaceName: string | null;
  workspaceSlug: string | null;
}

interface SuperAdminEvent {
  id: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  location: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
  isPublished: boolean;
  createdAt: string;
}

type Tab = "workspaces" | "users" | "ideas" | "challenges" | "events" | "applications" | "kanban";

interface SuperAdminApplication {
  application: {
    id: string;
    userId: string;
    orgId: string;
    challengeId: string | null;
    ideaName: string | null;
    sector: string | null;
    problemStatement: string | null;
    solutionDescription: string | null;
    differentiator: string | null;
    targetUser: string | null;
    relevantSkills: string | null;
    previousWinner: string | null;
    hasValidation: string | null;
    validationDetails: string | null;
    status: string;
    aiScore: number | null;
    aiMetrics: any[] | null;
    aiStrengths: string[] | null;
    aiRecommendations: string[] | null;
    aiInsights: string | null;
    submittedAt: string;
    reviewedAt: string | null;
  };
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string | null;
  } | null;
  org: {
    id: string;
    name: string;
    slug: string;
  } | null;
  challenge: {
    id: string;
    title: string;
  } | null;
}

interface WorkspaceFormData {
  name: string;
  slug: string;
  primaryColor: string;
  challengesEnabled: boolean;
  expertsEnabled: boolean;
  radarEnabled: boolean;
  dashboardEnabled: boolean;
  aiBuilderEnabled: boolean;
  formSubmissionEnabled: boolean;
}

const DEFAULT_WS_FORM: WorkspaceFormData = {
  name: "",
  slug: "",
  primaryColor: "#4588f5",
  challengesEnabled: true,
  expertsEnabled: true,
  radarEnabled: true,
  dashboardEnabled: true,
  aiBuilderEnabled: true,
  formSubmissionEnabled: true,
};

const VALID_ROLES = ["OWNER", "ADMIN", "MENTOR", "MEMBER"] as const;
type Role = typeof VALID_ROLES[number];

const FEATURE_TOGGLES: { key: keyof WorkspaceFormData; label: string }[] = [
  { key: "challengesEnabled", label: "Challenges" },
  { key: "expertsEnabled", label: "Experts" },
  { key: "radarEnabled", label: "Radar" },
  { key: "dashboardEnabled", label: "Dashboard" },
  { key: "aiBuilderEnabled", label: "AI Builder" },
  { key: "formSubmissionEnabled", label: "Form Submission" },
];

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("workspaces");
  const [filterOrgId, setFilterOrgId] = useState<string>("all");

  // Modal state
  const [wsModal, setWsModal] = useState<{ mode: "create" | "edit"; workspace?: Workspace } | null>(null);
  const [deleteWs, setDeleteWs] = useState<Workspace | null>(null);
  const [userModalId, setUserModalId] = useState<string | null>(null);
  const [challengeModal, setChallengeModal] = useState<{ mode: "create" | "edit"; challenge?: SuperAdminChallenge } | null>(null);
  const [deleteChallenge, setDeleteChallenge] = useState<SuperAdminChallenge | null>(null);
  const [eventModal, setEventModal] = useState<{ mode: "create" | "edit"; event?: SuperAdminEvent } | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<SuperAdminEvent | null>(null);

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: () => apiFetch("/api/super-admin/workspaces"),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<SuperAdminUser[]>({
    queryKey: ["/api/super-admin/users"],
    queryFn: () => apiFetch("/api/super-admin/users"),
  });

  const { data: ideas = [], isLoading: ideasLoading } = useQuery<SuperAdminIdea[]>({
    queryKey: ["/api/super-admin/ideas"],
    queryFn: () => apiFetch("/api/super-admin/ideas"),
  });

  const { data: adminChallenges = [], isLoading: challengesAdminLoading } = useQuery<SuperAdminChallenge[]>({
    queryKey: ["/api/super-admin/challenges"],
    queryFn: () => apiFetch("/api/super-admin/challenges"),
  });

  const { data: adminEvents = [], isLoading: eventsAdminLoading } = useQuery<SuperAdminEvent[]>({
    queryKey: ["/api/super-admin/events"],
    queryFn: () => apiFetch("/api/super-admin/events"),
  });

  const { data: adminApplications = [], isLoading: applicationsLoading } = useQuery<SuperAdminApplication[]>({
    queryKey: ["/api/super-admin/applications"],
    queryFn: () => apiFetch("/api/super-admin/applications"),
  });

  const [selectedApplication, setSelectedApplication] = useState<SuperAdminApplication | null>(null);

  // ── Workspace mutations ───────────────────────────────────────────────
  const createWs = useMutation({
    mutationFn: (data: WorkspaceFormData) =>
      apiFetch("/api/super-admin/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/workspaces"] });
      toast.success("Workspace created");
      setWsModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateWs = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkspaceFormData }) =>
      apiFetch(`/api/super-admin/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/workspaces"] });
      toast.success("Workspace updated");
      setWsModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteWsMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/super-admin/workspaces/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/workspaces"] });
      qc.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast.success("Workspace deleted");
      setDeleteWs(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── User mutations ──────────────────────────────────────────────────
  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      apiFetch(`/api/super-admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast.success("User updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/super-admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast.success("User deleted");
      setUserModalId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignToWs = useMutation({
    mutationFn: ({ wsId, userId, role }: { wsId: string; userId: string; role: string }) =>
      apiFetch(`/api/super-admin/workspaces/${wsId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast.success("Assigned to workspace");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: ({ wsId, userId, role }: { wsId: string; userId: string; role: string }) =>
      apiFetch(`/api/super-admin/workspaces/${wsId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: ({ wsId, userId }: { wsId: string; userId: string }) =>
      apiFetch(`/api/super-admin/workspaces/${wsId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast.success("Removed from workspace");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [createUserOpen, setCreateUserOpen] = useState(false);

  const createUser = useMutation({
    mutationFn: (data: { email: string; password: string; firstName: string; lastName: string; username: string }) =>
      apiFetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast.success("User created");
      setCreateUserOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Challenge mutations ──────────────────────────────────────────────
  const createChallenge = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiFetch("/api/super-admin/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/challenges"] });
      qc.invalidateQueries({ queryKey: ["/api/super-admin/workspaces"] });
      toast.success("Challenge created");
      setChallengeModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateChallenge = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiFetch(`/api/super-admin/challenges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/challenges"] });
      toast.success("Challenge updated");
      setChallengeModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteChallengeMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/super-admin/challenges/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/challenges"] });
      qc.invalidateQueries({ queryKey: ["/api/super-admin/workspaces"] });
      toast.success("Challenge deleted");
      setDeleteChallenge(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Event mutations ──────────────────────────────────────────────────
  const createEvent = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiFetch("/api/super-admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/events"] });
      toast.success("Event created");
      setEventModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiFetch(`/api/super-admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/events"] });
      toast.success("Event updated");
      setEventModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEventMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/super-admin/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/events"] });
      toast.success("Event deleted");
      setDeleteEvent(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Application mutations ────────────────────────────────────────────
  const updateApplication = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiFetch(`/api/super-admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/applications"] });
      toast.success("Application updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescreenApplication = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/super-admin/applications/${id}/rescreen`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/applications"] });
      toast.success("Re-screening started — check back shortly");
      setSelectedApplication(null);
    },
    onError: (e: Error) => toast.error(e.message),
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

  const filteredChallenges = useMemo(() => {
    const sorted = [...adminChallenges].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!selectedWorkspace) return sorted;
    return sorted.filter((c) => c.orgId === selectedWorkspace.id);
  }, [adminChallenges, selectedWorkspace]);

  const userForModal = userModalId ? (users.find((u) => u.id === userModalId) ?? null) : null;
  const isMutating = createWs.isPending || updateWs.isPending || deleteWsMut.isPending ||
    updateUser.isPending || deleteUser.isPending || assignToWs.isPending ||
    updateRole.isPending || removeMember.isPending;

  const TABS: { key: Tab; label: string }[] = [
    { key: "workspaces", label: "Workspaces" },
    { key: "users", label: "Users" },
    { key: "ideas", label: "Ideas" },
    { key: "challenges", label: "Challenges" },
    { key: "events", label: "Events" },
    { key: "applications", label: "Applications" },
    { key: "kanban", label: "Idea Kanban" },
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
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Workspaces {selectedWorkspace ? `— ${selectedWorkspace.name}` : ""}
                </CardTitle>
                <Button size="sm" onClick={() => setWsModal({ mode: "create" })}>
                  <Plus className="w-4 h-4 mr-1" /> New Workspace
                </Button>
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
                        <TableHead>Features</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-24 text-right pr-4">Actions</TableHead>
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
                            <TableCell><FeatureBadges workspace={w} /></TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(w.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => setWsModal({ mode: "edit", workspace: w })}
                                  title="Edit workspace"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteWs(w)}
                                  title="Delete workspace"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Users {selectedWorkspace ? `— ${selectedWorkspace.name}` : ""}
                </CardTitle>
                <Button size="sm" onClick={() => setCreateUserOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> New User
                </Button>
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
                        <TableHead className="w-16 text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
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
                            <TableCell className="text-right">
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => setUserModalId(u.id)}
                                title="Edit user"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
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

          {/* ── Events table ──────────────────────────────────────────────── */}
          {activeTab === "events" && (
            <Card className="border border-border/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Events</CardTitle>
                <Button size="sm" onClick={() => setEventModal({ mode: "create" })}>
                  <Plus className="w-4 h-4 mr-1" /> New Event
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {eventsAdminLoading ? (
                  <Spinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24 text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                            No events found
                          </TableCell>
                        </TableRow>
                      ) : (
                        adminEvents.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <div className="font-medium">{e.title}</div>
                              {e.shortDescription && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">{e.shortDescription}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(e.startDate).toLocaleDateString()}
                              {e.endDate && ` — ${new Date(e.endDate).toLocaleDateString()}`}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {e.location || "—"}
                            </TableCell>
                            <TableCell>
                              {e.isPublished ? (
                                <span className="inline-flex items-center text-xs rounded-full px-2.5 py-0.5 font-medium bg-green-500/15 text-green-400">Published</span>
                              ) : (
                                <span className="inline-flex items-center text-xs rounded-full px-2.5 py-0.5 font-medium bg-slate-500/15 text-slate-400">Draft</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => setEventModal({ mode: "edit", event: e })}
                                  title="Edit event"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteEvent(e)}
                                  title="Delete event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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

          {/* ── Applications table ───────────────────────────────────────── */}
          {activeTab === "applications" && (
            <>
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Member Applications</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {applicationsLoading ? (
                  <Spinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Challenge</TableHead>
                        <TableHead>Idea Name</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>AI Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminApplications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                            No applications yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        adminApplications.map((row) => (
                          <TableRow
                            key={row.application.id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => setSelectedApplication(row)}
                          >
                            <TableCell>
                              <div className="font-medium text-sm">
                                {[row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") || "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">{row.user?.email}</div>
                            </TableCell>
                            <TableCell className="text-sm">{row.org?.name || "—"}</TableCell>
                            <TableCell className="text-sm">{row.challenge?.title || "—"}</TableCell>
                            <TableCell className="text-sm font-medium">{row.application.ideaName || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.application.sector || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(row.application.submittedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {row.application.aiScore != null ? (
                                <span className={`font-bold text-sm ${row.application.aiScore >= 70 ? "text-green-500" : "text-red-500"}`}>
                                  {row.application.aiScore}/100
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">Pending</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.application.status === "APPROVED" && (
                                <Badge className="bg-green-500/15 text-green-600 border-green-200 border text-xs">Approved</Badge>
                              )}
                              {row.application.status === "REJECTED" && (
                                <Badge className="bg-red-500/15 text-red-600 border-red-200 border text-xs">Rejected</Badge>
                              )}
                              {row.application.status === "PENDING_REVIEW" && (
                                <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-200 border text-xs">Pending Review</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Application Detail Modal */}
            {selectedApplication && (
              <ApplicationDetailModal
                row={selectedApplication}
                onClose={() => setSelectedApplication(null)}
                onUpdate={(data) => updateApplication.mutate({ id: selectedApplication.application.id, data })}
                onRescreen={() => rescreenApplication.mutate(selectedApplication.application.id)}
                isPending={updateApplication.isPending || rescreenApplication.isPending}
              />
            )}
            </>
          )}

          {/* ── Challenges table ─────────────────────────────────────────── */}
          {activeTab === "kanban" && (
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Kanban className="w-4 h-4" /> Idea Kanban
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SuperAdminIdeasKanban workspaces={sortedWorkspaces} />
              </CardContent>
            </Card>
          )}

          {activeTab === "challenges" && (
            <Card className="border border-border/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Challenges {selectedWorkspace ? `— ${selectedWorkspace.name}` : ""}
                </CardTitle>
                <Button size="sm" onClick={() => setChallengeModal({ mode: "create" })}>
                  <Plus className="w-4 h-4 mr-1" /> New Challenge
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {challengesAdminLoading ? (
                  <Spinner />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Submissions</TableHead>
                        <TableHead>Criteria</TableHead>
                        <TableHead className="w-24 text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChallenges.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                            No challenges found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredChallenges.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{c.emoji || "🎯"}</span>
                                <div>
                                  <div className="font-medium">{c.title}</div>
                                  <div className="text-xs text-muted-foreground">{c.slug}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{c.workspaceName || "—"}</div>
                              <div className="text-xs text-muted-foreground">{c.workspaceSlug}</div>
                            </TableCell>
                            <TableCell>
                              <ChallengeStatusBadge status={c.status} />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(c.deadline).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {c.submissionCount} / {c.maxSubmissions}
                            </TableCell>
                            <TableCell>
                              {c.evaluationCriteria ? (
                                <span className="inline-flex items-center text-xs rounded-full px-2 py-0.5 bg-green-500/15 text-green-400">Set</span>
                              ) : (
                                <span className="inline-flex items-center text-xs rounded-full px-2 py-0.5 bg-slate-500/15 text-slate-400">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => setChallengeModal({ mode: "edit", challenge: c })}
                                  title="Edit challenge"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteChallenge(c)}
                                  title="Delete challenge"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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

      {/* ── Event Create/Edit Modal ───────────────────────────────────── */}
      {eventModal && (
        <EventModal
          mode={eventModal.mode}
          event={eventModal.event}
          onClose={() => setEventModal(null)}
          onSubmit={(data) =>
            eventModal.mode === "create"
              ? createEvent.mutate(data)
              : updateEvent.mutate({ id: eventModal.event!.id, data })
          }
          isPending={createEvent.isPending || updateEvent.isPending}
        />
      )}

      {/* ── Delete Event Confirm ───────────────────────────────────────── */}
      <AlertDialog open={!!deleteEvent} onOpenChange={(open) => !open && setDeleteEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event "{deleteEvent?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteEvent && deleteEventMut.mutate(deleteEvent.id)}
              disabled={deleteEventMut.isPending}
            >
              {deleteEventMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Challenge Create/Edit Modal ────────────────────────────────── */}
      {challengeModal && (
        <ChallengeModal
          mode={challengeModal.mode}
          challenge={challengeModal.challenge}
          workspaces={workspaces}
          onClose={() => setChallengeModal(null)}
          onSubmit={(data) =>
            challengeModal.mode === "create"
              ? createChallenge.mutate(data)
              : updateChallenge.mutate({ id: challengeModal.challenge!.id, data })
          }
          isPending={createChallenge.isPending || updateChallenge.isPending}
        />
      )}

      {/* ── Delete Challenge Confirm ───────────────────────────────────── */}
      <AlertDialog open={!!deleteChallenge} onOpenChange={(open) => !open && setDeleteChallenge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete challenge "{deleteChallenge?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the challenge and all its submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteChallenge && deleteChallengeMut.mutate(deleteChallenge.id)}
              disabled={deleteChallengeMut.isPending}
            >
              {deleteChallengeMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {wsModal && (
        <WorkspaceModal
          mode={wsModal.mode}
          workspace={wsModal.workspace}
          onClose={() => setWsModal(null)}
          onSubmit={(data) =>
            wsModal.mode === "create"
              ? createWs.mutate(data)
              : updateWs.mutate({ id: wsModal.workspace!.id, data })
          }
          isPending={createWs.isPending || updateWs.isPending}
        />
      )}

      {/* ── Delete Workspace Confirm ─────────────────────────────────────── */}
      <AlertDialog open={!!deleteWs} onOpenChange={(open) => !open && setDeleteWs(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace "{deleteWs?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the workspace and all associated members, ideas,
              challenges, and assets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteWs && deleteWsMut.mutate(deleteWs.id)}
              disabled={deleteWsMut.isPending}
            >
              {deleteWsMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create User Modal ────────────────────────────────────────────── */}
      {createUserOpen && (
        <CreateUserModal
          onClose={() => setCreateUserOpen(false)}
          onSubmit={(data) => createUser.mutate(data)}
          isPending={createUser.isPending}
        />
      )}

      {/* ── Edit User Modal ───────────────────────────────────────────────── */}
      {userForModal && (
        <UserModal
          user={userForModal}
          workspaces={workspaces}
          isPending={isMutating}
          onClose={() => setUserModalId(null)}
          onUpdateProfile={(data) => updateUser.mutate({ id: userForModal.id, data })}
          onDeleteUser={() => deleteUser.mutate(userForModal.id)}
          onAssign={({ wsId, role }) => assignToWs.mutate({ wsId, userId: userForModal.id, role })}
          onChangeRole={({ wsSlug, role }) => {
            const ws = workspaces.find((w) => w.slug === wsSlug);
            if (ws) updateRole.mutate({ wsId: ws.id, userId: userForModal.id, role });
          }}
          onRemoveFromWs={(wsSlug) => {
            const ws = workspaces.find((w) => w.slug === wsSlug);
            if (ws) removeMember.mutate({ wsId: ws.id, userId: userForModal.id });
          }}
        />
      )}    </div>
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

const ROLE_DISPLAY: Record<string, string> = {
  OWNER: "OWNER",
  ADMIN: "PMO",
  MENTOR: "MENTOR",
  MEMBER: "MEMBER",
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
          <span className="opacity-60">· {ROLE_DISPLAY[ws.role] ?? ws.role}</span>
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

// ─── Challenge status badge ───────────────────────────────────────────────────

const CHALLENGE_STATUS_STYLES: Record<string, string> = {
  draft:    "bg-slate-500/15 text-slate-400",
  active:   "bg-green-500/15 text-green-400",
  upcoming: "bg-blue-500/15  text-blue-400",
  ended:    "bg-red-500/15   text-red-400",
};

function ChallengeStatusBadge({ status }: { status: string }) {
  const style = CHALLENGE_STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-400";
  return (
    <span className={`inline-flex items-center text-xs rounded-full px-2.5 py-0.5 font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}

// ─── ChallengeModal ───────────────────────────────────────────────────────────

interface ChallengeFormData {
  orgId: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  deadline: string;
  status: string;
  prize: string;
  emoji: string;
  maxSubmissions: string;
  evaluationCriteria: string;
}

const DEFAULT_CHALLENGE_FORM: ChallengeFormData = {
  orgId: "",
  title: "",
  slug: "",
  description: "",
  shortDescription: "",
  deadline: "",
  status: "draft",
  prize: "",
  emoji: "🎯",
  maxSubmissions: "100",
  evaluationCriteria: "",
};

interface ChallengeModalProps {
  mode: "create" | "edit";
  challenge?: SuperAdminChallenge;
  workspaces: Workspace[];
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  isPending: boolean;
}

function ChallengeModal({ mode, challenge, workspaces, onClose, onSubmit, isPending }: ChallengeModalProps) {
  const [form, setForm] = useState<ChallengeFormData>(() =>
    challenge
      ? {
          orgId: challenge.orgId,
          title: challenge.title,
          slug: challenge.slug,
          description: challenge.description,
          shortDescription: challenge.shortDescription ?? "",
          deadline: challenge.deadline ? challenge.deadline.slice(0, 10) : "",
          status: challenge.status,
          prize: challenge.prize ?? "",
          emoji: challenge.emoji ?? "🎯",
          maxSubmissions: String(challenge.maxSubmissions),
          evaluationCriteria: challenge.evaluationCriteria ?? "",
        }
      : DEFAULT_CHALLENGE_FORM
  );

  const [criteriaError, setCriteriaError] = useState("");

  const set = (k: keyof ChallengeFormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleTitleChange = (title: string) => {
    set("title", title);
    if (mode === "create") {
      set("slug", title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
  };

  const validateCriteria = (val: string) => {
    if (!val.trim()) { setCriteriaError(""); return true; }
    if (val.trim().startsWith("[") || val.trim().startsWith("{")) {
      try { JSON.parse(val); setCriteriaError(""); return true; }
      catch { setCriteriaError("Invalid JSON — fix the format or use plain text instead."); return false; }
    }
    setCriteriaError("");
    return true;
  };

  const handleSubmit = () => {
    if (!validateCriteria(form.evaluationCriteria)) return;
    onSubmit({
      ...form,
      maxSubmissions: parseInt(form.maxSubmissions) || 100,
      evaluationCriteria: form.evaluationCriteria.trim() || null,
    });
  };

  const isValid = form.title.trim() && form.slug.trim() && form.description.trim() && form.deadline && form.orgId;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Challenge" : `Edit — ${challenge?.title}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Workspace selector (create only) */}
          {mode === "create" && (
            <div className="space-y-1.5">
              <Label>Workspace <span className="text-destructive">*</span></Label>
              <Select value={form.orgId} onValueChange={(v) => set("orgId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace…" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <Input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} placeholder="🎯" className="w-24" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft", "upcoming", "active", "ended"].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Challenge title" />
          </div>

          <div className="space-y-1.5">
            <Label>Slug <span className="text-destructive">*</span></Label>
            <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="challenge-slug" className="font-mono" />
          </div>

          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="One-line summary" />
          </div>

          <div className="space-y-1.5">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Full description of the challenge…"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Deadline <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Submissions</Label>
              <Input type="number" min="1" value={form.maxSubmissions} onChange={(e) => set("maxSubmissions", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prize</Label>
            <Input value={form.prize} onChange={(e) => set("prize", e.target.value)} placeholder="e.g. $5,000 or Trophy" />
          </div>

          {/* Evaluation Criteria */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              Evaluation Criteria
              <span className="text-xs text-muted-foreground font-normal">(plain text or JSON array)</span>
            </Label>
            <Textarea
              value={form.evaluationCriteria}
              onChange={(e) => { set("evaluationCriteria", e.target.value); validateCriteria(e.target.value); }}
              placeholder={`Plain text:\nInnovation, Feasibility, Impact\n\nOr JSON:\n[\n  {"name":"Innovation","weight":30},\n  {"name":"Feasibility","weight":40},\n  {"name":"Impact","weight":30}\n]`}
              rows={6}
              className="font-mono text-sm"
            />
            {criteriaError && <p className="text-xs text-destructive">{criteriaError}</p>}
            <p className="text-xs text-muted-foreground">
              Store as plain text for simple criteria, or as a JSON array of objects for weighted scoring (e.g. name, weight, description fields).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending || !!criteriaError}>
            {isPending ? "Saving…" : mode === "create" ? "Create Challenge" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EventModal ───────────────────────────────────────────────────────────────

interface EventFormData {
  title: string;
  shortDescription: string;
  description: string;
  location: string;
  websiteUrl: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  isPublished: boolean;
}

const DEFAULT_EVENT_FORM: EventFormData = {
  title: "",
  shortDescription: "",
  description: "",
  location: "",
  websiteUrl: "",
  imageUrl: "",
  startDate: "",
  endDate: "",
  isPublished: false,
};

interface EventModalProps {
  mode: "create" | "edit";
  event?: SuperAdminEvent;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  isPending: boolean;
}

function EventModal({ mode, event, onClose, onSubmit, isPending }: EventModalProps) {
  const [form, setForm] = useState<EventFormData>(() =>
    event
      ? {
          title: event.title,
          shortDescription: event.shortDescription ?? "",
          description: event.description ?? "",
          location: event.location ?? "",
          websiteUrl: event.websiteUrl ?? "",
          imageUrl: event.imageUrl ?? "",
          startDate: event.startDate ? event.startDate.slice(0, 10) : "",
          endDate: event.endDate ? event.endDate.slice(0, 10) : "",
          isPublished: event.isPublished,
        }
      : DEFAULT_EVENT_FORM
  );

  const set = (k: keyof EventFormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const data: Record<string, any> = {
      title: form.title,
      isPublished: form.isPublished,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
    };
    if (form.shortDescription) data.shortDescription = form.shortDescription;
    if (form.description) data.description = form.description;
    if (form.location) data.location = form.location;
    if (form.websiteUrl) data.websiteUrl = form.websiteUrl;
    if (form.imageUrl) data.imageUrl = form.imageUrl;
    if (form.endDate) data.endDate = new Date(form.endDate).toISOString();
    onSubmit(data);
  };

  const isValid = form.title.trim() && form.startDate;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Event" : `Edit — ${event?.title}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Event title" />
          </div>

          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="One-line summary" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Full description of the event…"
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Dubai, UAE or Online" />
          </div>

          <div className="space-y-1.5">
            <Label>Website URL</Label>
            <Input value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://example.com" type="url" />
          </div>

          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://example.com/image.jpg" type="url" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.isPublished}
              onCheckedChange={(v) => set("isPublished", v)}
              id="event-published"
            />
            <Label htmlFor="event-published">Published (visible to all users)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending}>
            {isPending ? "Saving…" : mode === "create" ? "Create Event" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ApplicationDetailModal ───────────────────────────────────────────────────

interface ApplicationDetailModalProps {
  row: SuperAdminApplication;
  onClose: () => void;
  onUpdate: (data: Record<string, any>) => void;
  onRescreen: () => void;
  isPending: boolean;
}

function ApplicationDetailModal({ row, onClose, onUpdate, onRescreen, isPending }: ApplicationDetailModalProps) {
  const app = row.application;
  const [editScore, setEditScore] = useState<number>(app.aiScore ?? 0);

  const statusBadge = (status: string) => {
    if (status === "APPROVED") return <Badge className="bg-green-500/15 text-green-600 border-green-200 border text-xs">Approved</Badge>;
    if (status === "REJECTED") return <Badge className="bg-red-500/15 text-red-600 border-red-200 border text-xs">Rejected</Badge>;
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-200 border text-xs">Pending Review</Badge>;
  };

  const qaItems = [
    { label: "Idea Name", value: app.ideaName },
    { label: "Sector", value: app.sector },
    { label: "Problem Statement", value: app.problemStatement },
    { label: "Solution Description", value: app.solutionDescription },
    { label: "Differentiator", value: app.differentiator },
    { label: "Target User", value: app.targetUser },
    { label: "Relevant Skills", value: app.relevantSkills },
    { label: "Previous Winner", value: app.previousWinner },
    { label: "Has Validation", value: app.hasValidation },
    { label: "Validation Details", value: app.validationDetails },
  ].filter((i) => i.value);

  const metrics: any[] = Array.isArray(app.aiMetrics) ? app.aiMetrics : [];
  const strengths: string[] = Array.isArray(app.aiStrengths) ? app.aiStrengths : [];
  const recommendations: string[] = Array.isArray(app.aiRecommendations) ? app.aiRecommendations : [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <DialogTitle className="text-base">
              {app.ideaName || "Application"} — {[row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") || row.user?.email}
            </DialogTitle>
            {statusBadge(app.status)}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left: Q&A */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Answers</h3>
            <div className="space-y-4">
              {qaItems.map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">{item.label}</p>
                  <p className="text-sm text-foreground leading-relaxed">{item.value}</p>
                </div>
              ))}
              {qaItems.length === 0 && (
                <p className="text-sm text-muted-foreground">No answers recorded.</p>
              )}
            </div>
          </div>

          {/* Right: AI Scoring */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Scoring</h3>

            {/* Overall score */}
            <div className="text-center py-3 rounded-xl bg-muted/30">
              <div className={`text-5xl font-bold ${(app.aiScore ?? 0) >= 70 ? "text-green-500" : "text-red-500"}`}>
                {app.aiScore ?? "—"}<span className="text-xl font-normal text-muted-foreground">/100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">≥ 70 to pass</p>
            </div>

            {/* Metric sliders */}
            <div className="space-y-3">
              {metrics.map((m) => (
                <div key={m.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.score}/100 ({m.weight}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${m.score >= 70 ? "bg-green-500" : m.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${m.score}%` }}
                    />
                  </div>
                  {m.rationale && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.rationale}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Manual score edit */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Override Score</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[editScore]}
                  onValueChange={([v]) => setEditScore(v)}
                  min={0} max={100} step={1}
                  className="flex-1"
                />
                <span className="text-sm font-bold w-10 text-right">{editScore}</span>
              </div>
              <Button
                size="sm" variant="outline" className="mt-2 w-full"
                onClick={() => onUpdate({ aiScore: editScore })}
                disabled={isPending}
              >
                Save Score
              </Button>
            </div>

            {/* Rescreen */}
            <Button
              size="sm" variant="secondary" className="w-full flex items-center gap-2"
              onClick={onRescreen}
              disabled={isPending}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate with AI
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        {(strengths.length > 0 || recommendations.length > 0 || app.aiInsights) && (
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Insights</h3>
            {strengths.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Strengths</p>
                <ul className="space-y-1">
                  {strengths.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">●</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recommendations.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Recommendations</p>
                <ul className="space-y-1">
                  {recommendations.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">●</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {app.aiInsights && (
              <p className="text-sm text-muted-foreground leading-relaxed">{app.aiInsights}</p>
            )}
          </div>
        )}

        {/* Footer actions */}
        <DialogFooter className="flex-row items-center gap-2 pt-4 border-t border-border">
          {app.status === "PENDING_REVIEW" && (
            <>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
                disabled={isPending}
                onClick={() => onUpdate({ status: "APPROVED", manualOverride: true })}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => onUpdate({ status: "REJECTED", manualOverride: true })}
              >
                Reject
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose} className="ml-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CreateUserModal ──────────────────────────────────────────────────────────

interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (data: { email: string; password: string; firstName: string; lastName: string; username: string }) => void;
  isPending: boolean;
}

function CreateUserModal({ onClose, onSubmit, isPending }: CreateUserModalProps) {
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", username: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const isValid = form.email.trim() !== "" && form.password.length >= 8;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jane" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Doe" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="janedoe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Password <span className="text-destructive">*</span></Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min 8 characters" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={!isValid || isPending}>
            {isPending ? "Creating…" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── WorkspaceModal ───────────────────────────────────────────────────────────

interface WorkspaceModalProps {
  mode: "create" | "edit";
  workspace?: Workspace;
  onClose: () => void;
  onSubmit: (data: WorkspaceFormData) => void;
  isPending: boolean;
}

function WorkspaceModal({ mode, workspace, onClose, onSubmit, isPending }: WorkspaceModalProps) {
  const [form, setForm] = useState<WorkspaceFormData>(() =>
    workspace
      ? {
          name: workspace.name,
          slug: workspace.slug,
          primaryColor: workspace.primaryColor || "#4588f5",
          challengesEnabled: workspace.challengesEnabled,
          expertsEnabled: workspace.expertsEnabled,
          radarEnabled: workspace.radarEnabled,
          dashboardEnabled: workspace.dashboardEnabled,
          aiBuilderEnabled: workspace.aiBuilderEnabled,
          formSubmissionEnabled: workspace.formSubmissionEnabled,
        }
      : DEFAULT_WS_FORM
  );

  const set = <K extends keyof WorkspaceFormData>(k: K, v: WorkspaceFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleNameChange = (name: string) => {
    set("name", name);
    if (mode === "create") {
      set("slug", name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Workspace" : `Edit — ${workspace?.name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Workspace"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="my-workspace"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => set("primaryColor", e.target.value)}
                className="w-10 h-9 rounded border border-input cursor-pointer p-0.5"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => set("primaryColor", e.target.value)}
                className="font-mono"
                placeholder="#4588f5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Features</Label>
            <div className="grid grid-cols-2 gap-2">
              {FEATURE_TOGGLES.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                >
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={form[key] as boolean}
                    onCheckedChange={(v) => set(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.name.trim() || !form.slug.trim()}
          >
            {isPending ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── UserModal ────────────────────────────────────────────────────────────────

interface UserModalProps {
  user: SuperAdminUser;
  workspaces: Workspace[];
  isPending: boolean;
  onClose: () => void;
  onUpdateProfile: (data: Record<string, string>) => void;
  onDeleteUser: () => void;
  onAssign: (data: { wsId: string; role: string }) => void;
  onChangeRole: (data: { wsSlug: string; role: string }) => void;
  onRemoveFromWs: (wsSlug: string) => void;
}

function UserModal({
  user, workspaces, isPending, onClose,
  onUpdateProfile, onDeleteUser, onAssign, onChangeRole, onRemoveFromWs,
}: UserModalProps) {
  const [profile, setProfile] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignWsId, setAssignWsId] = useState("");
  const [assignRole, setAssignRole] = useState<Role>("MEMBER");

  const setP = (k: keyof typeof profile, v: string) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const assignableWorkspaces = workspaces.filter(
    (w) => !user.workspaces.some((uw) => uw.slug === w.slug)
  );

  const handleAssign = () => {
    if (!assignWsId) return;
    onAssign({ wsId: assignWsId, role: assignRole });
    setAssignWsId("");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit User — {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Profile */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={profile.firstName} onChange={(e) => setP("firstName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={profile.lastName} onChange={(e) => setP("lastName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={profile.username} onChange={(e) => setP("username", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={profile.email} onChange={(e) => setP("email", e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={() => onUpdateProfile(profile as unknown as Record<string, string>)} disabled={isPending}>
                Save Profile
              </Button>
            </div>
          </section>

          {/* Workspace Memberships */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Workspace Memberships ({user.workspaces.length})
            </h3>
            {user.workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No workspace memberships yet.</p>
            ) : (
              <div className="space-y-2">
                {user.workspaces.map((ws) => (
                  <div
                    key={ws.slug}
                    className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{ws.name}</div>
                      <div className="text-xs text-muted-foreground">{ws.slug}</div>
                    </div>
                    <Select
                      value={ws.role}
                      onValueChange={(role) => onChangeRole({ wsSlug: ws.slug, role })}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">{ROLE_DISPLAY[r] ?? r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => onRemoveFromWs(ws.slug)}
                      disabled={isPending}
                      title="Remove from workspace"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Assign to Workspace */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Assign to Workspace
            </h3>
            <div className="flex items-center gap-2">
              <Select value={assignWsId} onValueChange={setAssignWsId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select workspace…" />
                </SelectTrigger>
                <SelectContent>
                  {assignableWorkspaces.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">All workspaces already assigned</div>
                  ) : assignableWorkspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignRole} onValueChange={(v) => setAssignRole(v as Role)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_DISPLAY[r] ?? r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAssign} disabled={!assignWsId || isPending}>
                <UserPlus className="w-4 h-4 mr-1" /> Assign
              </Button>
            </div>
          </section>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 pt-2">
          <Button
            variant="destructive" size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete User
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{user.email}</strong> and all their
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteUser}
              disabled={isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

