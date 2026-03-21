import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Target, Pencil, Trash2, Plus } from "lucide-react";
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

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SuperAdminChallenges() {
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [challengeModal, setChallengeModal] = useState<{ mode: "create" | "edit"; challenge?: SuperAdminChallenge } | null>(null);
  const [deleteChallenge, setDeleteChallenge] = useState<SuperAdminChallenge | null>(null);

  const { data: adminChallenges = [], isLoading: challengesLoading } = useQuery<SuperAdminChallenge[]>({
    queryKey: ["/api/super-admin/challenges"],
    queryFn: () => apiFetch("/api/super-admin/challenges"),
  });

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: () => apiFetch("/api/super-admin/workspaces"),
  });

  const sortedChallenges = useMemo(() => {
    return [...adminChallenges].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [adminChallenges]);

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

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Challenges</h1>
                <p className="text-muted-foreground">Manage all platform challenges</p>
              </div>
            </div>
            <Button onClick={() => setChallengeModal({ mode: "create" })}>
              <Plus className="w-4 h-4 mr-1" /> New Challenge
            </Button>
          </div>

          {/* Challenges Table */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">All Challenges</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {challengesLoading ? (
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
                    {sortedChallenges.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                          No challenges found
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedChallenges.map((c) => (
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
        </div>
      </div>

      {/* Challenge Create/Edit Modal */}
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

      {/* Delete Challenge Confirm */}
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

// ─── ChallengeStatusBadge ─────────────────────────────────────────────────────

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
              Store as plain text for simple criteria, or as a JSON array of objects for weighted scoring.
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
