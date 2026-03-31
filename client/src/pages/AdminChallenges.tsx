import React, { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Archive,
  Send,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
}

interface RoleData {
  role: string;
  isAdmin: boolean;
}

interface Challenge {
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
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  orgId: string;
}

interface ChallengeRow {
  challenge: Challenge;
  creator: { id: string; username: string; firstName: string | null; lastName: string | null } | null;
}

interface ChallengeFormData {
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

const DEFAULT_FORM: ChallengeFormData = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Use apiRequest from queryClient so CSRF token is automatically included
async function apiFetch(url: string, options?: RequestInit) {
  const method = (options?.method ?? "GET").toUpperCase();
  if (["POST", "PATCH", "DELETE"].includes(method)) {
    const res = await apiRequest(method, url, options?.body ? JSON.parse(options.body as string) : undefined);
    return res.json();
  }
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || (e as any).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function ChallengeStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
    upcoming: { label: "Upcoming", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    active: { label: "Active", className: "bg-green-500/15 text-green-400 border-green-500/30" },
    ended: { label: "Ended / Archived", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  };
  const cfg = map[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center text-xs rounded-full px-2 py-0.5 border capitalize ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableChallengeRow({
  row,
  onEdit,
  onArchive,
  onPublish,
  onDelete,
  onToggleActive,
}: {
  row: ChallengeRow;
  onEdit: (c: Challenge) => void;
  onArchive: (c: Challenge) => void;
  onPublish: (c: Challenge) => void;
  onDelete: (c: Challenge) => void;
  onToggleActive: (c: Challenge) => void;
}) {
  const c = row.challenge;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isArchived = c.status === "ended";
  const isActive = c.status === "active";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-border/50 hover:bg-accent/30 transition-colors group ${!c.isActive ? 'opacity-50' : ''}`}
    >
      {/* Drag handle */}
      <td className="pl-4 pr-2 py-3 w-8">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </span>
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{c.emoji || "🎯"}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{c.title}</span>
              {!c.isActive && (
                <span className="inline-flex items-center text-xs rounded-full px-1.5 py-0.5 bg-destructive/15 text-destructive border border-destructive/30">
                  Hidden
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono">{c.slug}</div>
            {c.prize && (
              <div className="text-xs text-yellow-500 mt-0.5">🏆 {c.prize}</div>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <ChallengeStatusBadge status={c.status} />
      </td>

      {/* Deadline */}
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {new Date(c.deadline).toLocaleDateString()}
      </td>

      {/* Submissions */}
      <td className="px-4 py-3 text-sm">
        {c.submissionCount} / {c.maxSubmissions}
      </td>

      {/* Criteria */}
      <td className="px-4 py-3">
        {c.evaluationCriteria ? (
          <span className="inline-flex items-center text-xs rounded-full px-2 py-0.5 bg-green-500/15 text-green-400">
            Set
          </span>
        ) : (
          <span className="inline-flex items-center text-xs rounded-full px-2 py-0.5 bg-slate-500/15 text-slate-400">
            None
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(c)}
            title="Edit challenge"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Activate / Deactivate */}
              <DropdownMenuItem onClick={() => onToggleActive(c)}>
                {c.isActive ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    Deactivate (hide from users)
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-2 text-green-400" />
                    Activate (show to users)
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {!isActive && (
                <DropdownMenuItem onClick={() => onPublish(c)}>
                  <Send className="w-3.5 h-3.5 mr-2 text-green-400" />
                  Publish (set active)
                </DropdownMenuItem>
              )}
              {!isArchived && (
                <DropdownMenuItem onClick={() => onArchive(c)}>
                  <Archive className="w-3.5 h-3.5 mr-2 text-orange-400" />
                  Archive (set ended)
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(c)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

// ─── Challenge Modal ──────────────────────────────────────────────────────────

interface ChallengeModalProps {
  mode: "create" | "edit";
  challenge?: Challenge;
  orgId: string;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  isPending: boolean;
}

function ChallengeModal({ mode, challenge, orgId, onClose, onSubmit, isPending }: ChallengeModalProps) {
  const [form, setForm] = useState<ChallengeFormData>(() =>
    challenge
      ? {
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
      : DEFAULT_FORM
  );
  const [isActive, setIsActive] = useState<boolean>(() =>
    mode === "edit" ? (challenge?.isActive ?? true) : true
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

    const payload: Record<string, any> = {
      orgId,
      title: form.title,
      slug: form.slug,
      description: form.description,
      status: form.status,
      emoji: form.emoji || "🎯",
      maxSubmissions: parseInt(form.maxSubmissions) || 100,
      isActive,
    };

    // Optional fields — only include when non-empty
    if (form.shortDescription.trim()) payload.shortDescription = form.shortDescription.trim();
    if (form.prize.trim()) payload.prize = form.prize.trim();
    if (form.evaluationCriteria.trim()) payload.evaluationCriteria = form.evaluationCriteria.trim();

    // Convert YYYY-MM-DD → full ISO datetime (required by server validation)
    if (form.deadline) {
      payload.deadline = form.deadline + "T00:00:00.000Z";
    }

    onSubmit(payload);
  };

  const isValid = form.title.trim() && form.slug.trim() && form.description.trim() && form.deadline;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Sector" : `Edit — ${challenge?.title}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Emoji + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <Input
                value={form.emoji}
                onChange={(e) => set("emoji", e.target.value)}
                placeholder="🎯"
                className="w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["draft", "upcoming", "active", "ended"].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visible to users toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Visible to users</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isActive ? "Users can see and interact with this challenge" : "Hidden — only admins can see this"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isActive ? "bg-green-500" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Sector title"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label>
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="problem-slug"
              className="font-mono"
            />
          </div>

          {/* Short desc */}
          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input
              value={form.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              placeholder="One-line summary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Full description of the sector…"
              rows={4}
            />
          </div>

          {/* Deadline + Max Submissions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Deadline <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Submissions</Label>
              <Input
                type="number"
                min="1"
                value={form.maxSubmissions}
                onChange={(e) => set("maxSubmissions", e.target.value)}
              />
            </div>
          </div>

          {/* Prize */}
          <div className="space-y-1.5">
            <Label>Prize</Label>
            <Input
              value={form.prize}
              onChange={(e) => set("prize", e.target.value)}
              placeholder="e.g. $5,000 or Trophy"
            />
          </div>

          {/* Evaluation Criteria */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              Evaluation Criteria
              <span className="text-xs text-muted-foreground font-normal">(plain text or JSON array)</span>
            </Label>
            <Textarea
              value={form.evaluationCriteria}
              onChange={(e) => {
                set("evaluationCriteria", e.target.value);
                validateCriteria(e.target.value);
              }}
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
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending || !!criteriaError}>
            {isPending ? "Saving…" : mode === "create" ? "Create Sector" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminChallenges() {
  const { slug } = useParams();
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [modal, setModal] = useState<{ mode: "create" | "edit"; challenge?: Challenge } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);

  // Workspace resolution
  const { data: workspace } = useQuery<WorkspaceInfo>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
  });

  // Check admin role
  const { data: roleData, isLoading: roleLoading } = useQuery<RoleData>({
    queryKey: [`/api/organizations/${workspace?.id}/admin/check-role`],
    enabled: !!workspace?.id,
  });

  // Fetch challenges for this workspace
  const { data: rows = [], isLoading: challengesLoading } = useQuery<ChallengeRow[]>({
    queryKey: [`/api/challenges`, workspace?.id],
    queryFn: () => apiFetch(`/api/challenges?orgId=${workspace!.id}`),
    enabled: !!workspace?.id,
  });

  // Local order state (ids) — allows reordering without a backend sort field
  const [order, setOrder] = useState<string[]>([]);

  // Derive sorted rows from local order (or default to API order)
  const sortedRows = useMemo(() => {
    if (order.length === 0) return rows;
    const map = new Map(rows.map((r) => [r.challenge.id, r]));
    return order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  }, [rows, order]);

  // Sync order when rows change from server
  React.useEffect(() => {
    if (rows.length > 0) {
      setOrder((prev) => {
        // If new rows were added or existing ones removed, reconcile
        const prevSet = new Set(prev);
        const serverIds = rows.map((r) => r.challenge.id);
        const serverSet = new Set(serverIds);
        if (prev.length === 0 || !serverIds.every((id) => prevSet.has(id)) || !prev.every((id) => serverSet.has(id))) {
          // Preserve existing order, append new ids at end, remove stale ones
          const existing = prev.filter((id) => serverSet.has(id));
          const newIds = serverIds.filter((id) => !prevSet.has(id));
          return [...existing, ...newIds];
        }
        return prev;
      });
    }
  }, [rows]);

  // Mutations
  const createChallenge = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiFetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/challenges", workspace?.id] });
      toast.success("Sector created");
      setModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateChallenge = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiFetch(`/api/challenges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/challenges", workspace?.id] });
      toast.success("Challenge updated");
      setModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteChallenge = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/challenges/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/challenges", workspace?.id] });
      toast.success("Challenge deleted");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderChallenges = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch("/api/challenges/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: workspace!.id, ids }),
      }),
    onError: (e: Error) => toast.error("Failed to save order: " + e.message),
  });

  // Status quick-actions
  const handleArchive = (c: Challenge) => {
    updateChallenge.mutate({ id: c.id, data: { status: "ended" } });
  };
  const handlePublish = (c: Challenge) => {
    updateChallenge.mutate({ id: c.id, data: { status: "active" } });
  };
  const handleToggleActive = (c: Challenge) => {
    updateChallenge.mutate(
      { id: c.id, data: { isActive: !c.isActive } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/challenges", workspace?.id] });
          toast.success(c.isActive ? "Challenge hidden from users" : "Challenge visible to users");
          setModal(null);
        },
      }
    );
  };

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.indexOf(String(active.id));
        const newIndex = prev.indexOf(String(over.id));
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        // Persist new order to server
        if (workspace?.id) reorderChallenges.mutate(newOrder);
        return newOrder;
      });
    }
  };

  // Summary counts
  const counts = useMemo(() => {
    const all = rows.map((r) => r.challenge);
    return {
      total: all.length,
      active: all.filter((c) => c.status === "active").length,
      draft: all.filter((c) => c.status === "draft").length,
      ended: all.filter((c) => c.status === "ended").length,
    };
  }, [rows]);

  if (roleLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar
          workspaceSlug={slug!}
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!roleData?.isAdmin && !["OWNER", "ADMIN"].includes(roleData?.role ?? "")) {
    return (
      <div className="flex h-screen">
        <AdminSidebar
          workspaceSlug={slug!}
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You need admin access to manage challenges.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        workspaceSlug={slug!}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Sectors</h1>
                <p className="text-muted-foreground">
                  Create and manage challenges for your workspace
                </p>
              </div>
            </div>
            <Button onClick={() => setModal({ mode: "create" })}>
              <Plus className="w-4 h-4 mr-2" />
              New Sector
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total", value: counts.total, color: "text-foreground" },
              { label: "Active", value: counts.active, color: "text-green-400" },
              { label: "Draft", value: counts.draft, color: "text-slate-400" },
              { label: "Ended", value: counts.ended, color: "text-orange-400" },
            ].map((card) => (
              <Card key={card.label} className="border border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Challenges table */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                All Sectors
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Drag rows to reorder. Use the actions menu to publish or archive.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {challengesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sortedRows.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No sectors yet</p>
                  <p className="text-sm mt-1">Click "New Sector" to get started.</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedRows.map((r) => r.challenge.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="w-8 pl-4" />
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Title
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Deadline
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Submissions
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Criteria
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide pr-4">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row) => (
                          <SortableChallengeRow
                            key={row.challenge.id}
                            row={row}
                            onEdit={(c) => setModal({ mode: "edit", challenge: c })}
                            onArchive={handleArchive}
                            onPublish={handlePublish}
                            onDelete={setDeleteTarget}
                            onToggleActive={handleToggleActive}
                          />
                        ))}
                      </tbody>
                    </table>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modal && workspace?.id && (
        <ChallengeModal
          mode={modal.mode}
          challenge={modal.challenge}
          orgId={workspace.id}
          onClose={() => setModal(null)}
          onSubmit={(data) =>
            modal.mode === "create"
              ? createChallenge.mutate(data)
              : updateChallenge.mutate({ id: modal.challenge!.id, data })
          }
          isPending={createChallenge.isPending || updateChallenge.isPending}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the sector and all its submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteChallenge.mutate(deleteTarget.id)}
              disabled={deleteChallenge.isPending}
            >
              {deleteChallenge.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
