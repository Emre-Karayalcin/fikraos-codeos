import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Users, Pencil, Trash2, UserPlus, Plus, X, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import toast from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
  slug: string;
  primaryColor: string | null;
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
  createdAt: string;
  logoUrl: string | null;
  dashboardNameEn: string | null;
  myIdeasNameEn: string | null;
  challengesNameEn: string | null;
  radarNameEn: string | null;
  expertsNameEn: string | null;
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

const VALID_ROLES = ["OWNER", "ADMIN", "MENTOR", "MEMBER"] as const;
type Role = typeof VALID_ROLES[number];

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

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SuperAdminUsers() {
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userModalId, setUserModalId] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterWorkspace, setFilterWorkspace] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");

  const { data: users = [], isLoading: usersLoading } = useQuery<SuperAdminUser[]>({
    queryKey: ["/api/super-admin/users"],
    queryFn: () => apiFetch("/api/super-admin/users"),
  });

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: () => apiFetch("/api/super-admin/workspaces"),
  });

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users]);

  const filteredUsers = useMemo(() => {
    let list = sortedUsers;

    // Search by name, email, username
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) =>
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(q)
      );
    }

    // Filter by workspace
    if (filterWorkspace !== "all") {
      list = list.filter((u) => u.workspaces.some((w) => w.slug === filterWorkspace));
    }

    // Filter by role (only relevant when workspace is also selected, but apply globally)
    if (filterRole !== "all") {
      list = list.filter((u) => u.workspaces.some((w) => w.role === filterRole));
    }

    // Filter by join date
    if (filterDateRange !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(filterDateRange));
      list = list.filter((u) => new Date(u.createdAt) >= cutoff);
    }

    return list;
  }, [sortedUsers, search, filterWorkspace, filterRole, filterDateRange]);

  const activeFiltersCount = [
    filterWorkspace !== "all",
    filterRole !== "all",
    filterDateRange !== "all",
  ].filter(Boolean).length;

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

  const inviteUser = useMutation({
    mutationFn: (data: { email: string; role: string; orgId: string }) =>
      apiFetch("/api/super-admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast.success("Invitation sent");
      setCreateUserOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const userForModal = userModalId ? (users.find((u) => u.id === userModalId) ?? null) : null;
  const isMutating = updateUser.isPending || deleteUser.isPending || assignToWs.isPending ||
    updateRole.isPending || removeMember.isPending;

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Users</h1>
                <p className="text-muted-foreground">Manage all platform users</p>
              </div>
            </div>
            <Button onClick={() => setCreateUserOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Invite User
            </Button>
          </div>

          {/* Search + Filters */}
          <Card className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Search by name, email or username…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{activeFiltersCount}</Badge>
                  )}
                </div>

                {/* Workspace filter */}
                <Select value={filterWorkspace} onValueChange={setFilterWorkspace}>
                  <SelectTrigger className="w-44 h-9 text-sm">
                    <SelectValue placeholder="All Workspaces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workspaces</SelectItem>
                    {workspaces.map((w) => (
                      <SelectItem key={w.slug} value={w.slug}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Role filter */}
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {VALID_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_DISPLAY[r] ?? r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date joined filter */}
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear filters */}
                {(activeFiltersCount > 0 || search) && (
                  <button
                    onClick={() => { setSearch(""); setFilterWorkspace("all"); setFilterRole("all"); setFilterDateRange("all"); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">All Users</CardTitle>
                <span className="text-sm text-muted-foreground">{filteredUsers.length} of {sortedUsers.length}</span>
              </div>
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
                          No users match your filters
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
        </div>
      </div>

      {/* Invite User Modal */}
      {createUserOpen && (
        <InviteUserModal
          workspaces={workspaces}
          onClose={() => setCreateUserOpen(false)}
          onSubmit={(data) => inviteUser.mutate(data)}
          isPending={inviteUser.isPending}
        />
      )}

      {/* Edit User Modal */}
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
      )}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── WorkspacePills ──────────────────────────────────────────────────────────

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

// ─── InviteUserModal ──────────────────────────────────────────────────────────

interface InviteUserModalProps {
  workspaces: Workspace[];
  onClose: () => void;
  onSubmit: (data: { email: string; role: string; orgId: string }) => void;
  isPending: boolean;
}

function InviteUserModal({ workspaces, onClose, onSubmit, isPending }: InviteUserModalProps) {
  const [form, setForm] = useState({ email: "", role: "MEMBER", orgId: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isValid = form.email.trim() !== "" && form.orgId !== "";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="MENTOR">Mentor</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="JUDGE">Judge</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Workspace <span className="text-destructive">*</span></Label>
            <Select value={form.orgId} onValueChange={(v) => set("orgId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={!isValid || isPending}>
            {isPending ? "Sending…" : "Send Invite"}
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
