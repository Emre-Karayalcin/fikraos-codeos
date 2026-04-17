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
import { Building2, Pencil, Trash2, Plus, CalendarDays } from "lucide-react";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import toast from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  location: string | null;
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

interface WorkspaceFormData {
  name: string;
  slug: string;
  primaryColor: string;
  location: string;
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
  location: "",
  challengesEnabled: true,
  expertsEnabled: true,
  radarEnabled: true,
  dashboardEnabled: true,
  aiBuilderEnabled: true,
  formSubmissionEnabled: true,
};

const FEATURE_TOGGLES: { key: keyof WorkspaceFormData; label: string }[] = [
  { key: "challengesEnabled", label: "Challenges" },
  { key: "expertsEnabled", label: "Experts" },
  { key: "radarEnabled", label: "Radar" },
  { key: "dashboardEnabled", label: "Dashboard" },
  { key: "aiBuilderEnabled", label: "AI Builder" },
  { key: "formSubmissionEnabled", label: "Form Submission" },
];

interface PStep { titleEn: string; titleAr: string; }
interface ProgData { orgId: string; currentStep: number; steps: PStep[]; }

const REGIONS = [
  "Riyadh",
  "Jeddah",
  "Mecca (Makkah)",
  "Medina (Madinah)",
  "Dammam",
  "Taif",
  "Tabuk",
  "Al-Ahsa (Hofuf)",
  "Buraydah",
  "Khobar (Al-Khobar)",
  "Abha",
  "Jizan (Jazan)",
  "Najran",
];

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SuperAdminWorkspaces() {
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [wsModal, setWsModal] = useState<{ mode: "create" | "edit"; workspace?: Workspace } | null>(null);
  const [deleteWs, setDeleteWs] = useState<Workspace | null>(null);
  const [progModal, setProgModal] = useState<Workspace | null>(null);

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: () => apiFetch("/api/super-admin/workspaces"),
  });

  const sortedWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    return [...workspaces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [workspaces]);

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

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Workspaces</h1>
                <p className="text-muted-foreground">Manage all platform workspaces</p>
              </div>
            </div>
            <Button onClick={() => setWsModal({ mode: "create" })}>
              <Plus className="w-4 h-4 mr-1" /> New Workspace
            </Button>
          </div>

          {/* Workspaces Table */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">All Workspaces</CardTitle>
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
                            {w.location && (
                              <div className="text-xs text-muted-foreground">{w.location}</div>
                            )}
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
                                variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary"
                                onClick={() => setProgModal(w)}
                                title="Manage program timeline"
                              >
                                <CalendarDays className="w-3.5 h-3.5" />
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
        </div>
      </div>

      {/* Workspace Create/Edit Modal */}
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

      {/* Delete Workspace Confirm */}
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

      {/* Program Timeline Modal */}
      {progModal && (
        <ProgTimelineModal
          workspace={progModal}
          onClose={() => setProgModal(null)}
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

// ─── Feature badges ───────────────────────────────────────────────────────────

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

// ─── Program Timeline Modal ───────────────────────────────────────────────────

const DEFAULT_PROG_STEPS: PStep[] = [
  { titleEn: "Ideation & Business Foundations", titleAr: "الريادة وأسس الأعمال" },
  { titleEn: "Product Strategy & Validation",   titleAr: "استراتيجية المنتج والتحقق" },
  { titleEn: "Product Design & Insights",       titleAr: "تصميم المنتج والرؤى" },
  { titleEn: "Pitching & Presentation",         titleAr: "العرض التقديمي" },
];

function ProgTimelineModal({ workspace, onClose }: { workspace: Workspace; onClose: () => void }) {
  const qc = useQueryClient();
  const queryKey = ["/api/program-progress", workspace.id];

  const { data, isLoading } = useQuery<ProgData>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${workspace.id}/program-progress`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [currentStep, setCurrentStep] = React.useState<number | null>(null);
  const [steps, setSteps] = React.useState<PStep[] | null>(null);

  React.useEffect(() => {
    if (data) {
      setCurrentStep(data.currentStep);
      setSteps(data.steps ?? DEFAULT_PROG_STEPS);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/${workspace.id}/program-progress`, {
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
      onClose();
    },
    onError: () => toast.error("Failed to save"),
  });

  const activeSteps = steps ?? DEFAULT_PROG_STEPS;
  const activeCurrentStep = currentStep ?? data?.currentStep ?? 1;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Program Timeline — {workspace.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-4">
              <Label className="w-36 shrink-0">Active week</Label>
              <Select
                value={String(activeCurrentStep)}
                onValueChange={(v) => setCurrentStep(Number(v))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeSteps.map((_, i) => (
                    <SelectItem key={i} value={String(i + 1)}>Week {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {activeSteps.map((step, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      idx + 1 === activeCurrentStep ? "border-primary bg-primary text-white" : "border-gray-300 text-gray-400"
                    }`}>{idx + 1}</div>
                    <span className="text-sm font-medium">Week {idx + 1}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
            {save.isPending ? "Saving…" : "Save changes"}
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
          location: workspace.location || "",
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

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={form.location} onValueChange={(v) => set("location", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a region…" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
