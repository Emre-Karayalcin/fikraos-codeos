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
import { Globe, Users, Lightbulb, Target, LayoutDashboard, Filter, Pencil, Trash2, Plus, X, UserPlus } from "lucide-react";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
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

type Tab = "workspaces" | "users" | "ideas";

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

  const userForModal = userModalId ? (users.find((u) => u.id === userModalId) ?? null) : null;
  const isMutating = createWs.isPending || updateWs.isPending || deleteWsMut.isPending ||
    updateUser.isPending || deleteUser.isPending || assignToWs.isPending ||
    updateRole.isPending || removeMember.isPending;

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
        </div>
      </div>
      {/* ── Workspace Create/Edit Modal ──────────────────────────────────── */}
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
                          <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
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
                    <SelectItem key={r} value={r}>{r}</SelectItem>
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

