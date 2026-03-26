import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Map, Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  FileText, Video, Link, BookOpen, Presentation,
  Users, CalendarDays, Lock, Globe, Building, Blend,
  CheckCircle, Clock, Archive,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProgramModule {
  id: string;
  orgId: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  stageIndex: number;
  order: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  locationType: string;
  meetingLink: string | null;
  unlockRules: UnlockRules | null;
  createdAt: string;
  updatedAt: string;
}

interface ModuleResource {
  id: string;
  moduleId: string;
  title: string;
  type: string;
  url: string;
  description: string | null;
  order: number;
}

interface ModuleMentorRow {
  id: string;
  moduleId: string;
  mentorProfileId: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  title: string | null;
}

interface OrgMentor {
  id: string;
  userId: string;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface Consultation {
  id: string;
  moduleId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  mentorProfileId: string | null;
  maxAttendees: number | null;
  location: string | null;
  meetingLink: string | null;
  notes: string | null;
  status: string;
  mentorFirstName: string | null;
  mentorLastName: string | null;
}

interface UnlockCondition {
  type: "always_open" | "requires_module" | "requires_score_gte";
  moduleId?: string;
  scoreGte?: number;
}

interface UnlockRules {
  mode: "all" | "any";
  conditions: UnlockCondition[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_LABELS = [
  "Stage 1 — Ideation & Business Foundations",
  "Stage 2 — Product Strategy & Validation",
  "Stage 3 — Product Design & Insights",
  "Stage 4 — Pitching & Presentation",
];

const RESOURCE_TYPES = [
  { value: "link", label: "Link", icon: Link },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "doc", label: "Document", icon: BookOpen },
  { value: "slides", label: "Slides", icon: Presentation },
];

const LOCATION_TYPES = [
  { value: "online", label: "Online", icon: Globe },
  { value: "in_person", label: "In-Person", icon: Building },
  { value: "hybrid", label: "Hybrid", icon: Blend },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", color: "bg-muted text-muted-foreground" },
  { value: "published", label: "Published", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "archived", label: "Archived", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
      {status === "published" && <CheckCircle size={11} />}
      {status === "draft" && <Clock size={11} />}
      {status === "archived" && <Archive size={11} />}
      {opt.label}
    </span>
  );
}

function locationIcon(type: string) {
  if (type === "in_person") return <Building size={13} className="text-muted-foreground" />;
  if (type === "hybrid") return <Blend size={13} className="text-muted-foreground" />;
  return <Globe size={13} className="text-muted-foreground" />;
}

function resourceIcon(type: string) {
  const found = RESOURCE_TYPES.find((r) => r.value === type);
  if (!found) return <Link size={14} />;
  const Icon = found.icon;
  return <Icon size={14} />;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toDateTimeInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  // format as YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

// ── Empty form states ─────────────────────────────────────────────────────────

function emptyModuleForm() {
  return {
    title: "",
    titleAr: "",
    description: "",
    descriptionAr: "",
    stageIndex: 1,
    status: "draft",
    startDate: "",
    endDate: "",
    location: "",
    locationType: "online",
    meetingLink: "",
    unlockRules: null as UnlockRules | null,
  };
}

function emptyResourceForm() {
  return { title: "", type: "link", url: "", description: "", order: 0 };
}

function emptyConsultationForm() {
  return {
    title: "",
    scheduledAt: "",
    durationMinutes: 60,
    mentorProfileId: "",
    maxAttendees: "",
    location: "",
    meetingLink: "",
    notes: "",
    status: "scheduled",
  };
}

// ── Unlock Rules Editor ───────────────────────────────────────────────────────

function UnlockRulesEditor({
  rules,
  onChange,
  allModules,
}: {
  rules: UnlockRules | null;
  onChange: (r: UnlockRules | null) => void;
  allModules: ProgramModule[];
}) {
  const active = rules ?? { mode: "all", conditions: [] };

  const addCondition = () => {
    onChange({ ...active, conditions: [...active.conditions, { type: "always_open" }] });
  };

  const removeCondition = (i: number) => {
    const conditions = active.conditions.filter((_, idx) => idx !== i);
    onChange(conditions.length === 0 ? null : { ...active, conditions });
  };

  const updateCondition = (i: number, patch: Partial<UnlockCondition>) => {
    const conditions = active.conditions.map((c, idx) =>
      idx === i ? { ...c, ...patch } : c
    );
    onChange({ ...active, conditions });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Match</span>
        <Select
          value={active.mode}
          onValueChange={(v) => onChange({ ...active, mode: v as "all" | "any" })}
        >
          <SelectTrigger className="w-24 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL</SelectItem>
            <SelectItem value="any">ANY</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">of these conditions</span>
      </div>

      <div className="space-y-2">
        {active.conditions.map((cond, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border">
            <Select
              value={cond.type}
              onValueChange={(v) =>
                updateCondition(i, { type: v as UnlockCondition["type"], moduleId: undefined, scoreGte: undefined })
              }
            >
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always_open">Always open</SelectItem>
                <SelectItem value="requires_module">Requires module</SelectItem>
                <SelectItem value="requires_score_gte">Min score</SelectItem>
              </SelectContent>
            </Select>

            {cond.type === "requires_module" && (
              <Select
                value={cond.moduleId ?? ""}
                onValueChange={(v) => updateCondition(i, { moduleId: v })}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
                  <SelectValue placeholder="Select module..." />
                </SelectTrigger>
                <SelectContent>
                  {allModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {cond.type === "requires_score_gte" && (
              <Input
                type="number"
                min={0}
                max={100}
                value={cond.scoreGte ?? ""}
                onChange={(e) => updateCondition(i, { scoreGte: Number(e.target.value) })}
                className="w-24 h-8 text-sm"
                placeholder="0–100"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive ml-auto"
              onClick={() => removeCondition(i)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition} className="gap-1">
        <Plus size={13} /> Add Condition
      </Button>
    </div>
  );
}

// ── Module Detail panel tabs ──────────────────────────────────────────────────

function ModuleDetail({
  module,
  orgId,
  allModules,
  orgMentors,
}: {
  module: ProgramModule;
  orgId: string;
  allModules: ProgramModule[];
  orgMentors: OrgMentor[];
}) {
  const qc = useQueryClient();

  // Resources
  const { data: resources = [] } = useQuery<ModuleResource[]>({
    queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/resources`],
    queryFn: () => apiFetch(`/api/organizations/${orgId}/program/modules/${module.id}/resources`),
  });

  // Mentors
  const { data: mentors = [] } = useQuery<ModuleMentorRow[]>({
    queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/mentors`],
    queryFn: () => apiFetch(`/api/organizations/${orgId}/program/modules/${module.id}/mentors`),
  });

  // Consultations
  const { data: consultations = [] } = useQuery<Consultation[]>({
    queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/consultations`],
    queryFn: () => apiFetch(`/api/organizations/${orgId}/program/modules/${module.id}/consultations`),
  });

  // ── Resource CRUD ───────────────────────────────────────────────────────
  const [resourceDialog, setResourceDialog] = useState(false);
  const [editResource, setEditResource] = useState<ModuleResource | null>(null);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm());
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);

  const saveResourceMutation = useMutation({
    mutationFn: (data: typeof resourceForm) => {
      if (editResource) {
        return apiFetch(
          `/api/organizations/${orgId}/program/modules/${module.id}/resources/${editResource.id}`,
          { method: "PUT", body: JSON.stringify(data) }
        );
      }
      return apiFetch(
        `/api/organizations/${orgId}/program/modules/${module.id}/resources`,
        { method: "POST", body: JSON.stringify(data) }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/resources`] });
      setResourceDialog(false);
      toast.success(editResource ? "Resource updated" : "Resource added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/organizations/${orgId}/program/modules/${module.id}/resources/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/resources`] });
      toast.success("Resource removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAddResource() {
    setEditResource(null);
    setResourceForm(emptyResourceForm());
    setResourceDialog(true);
  }

  function openEditResource(r: ModuleResource) {
    setEditResource(r);
    setResourceForm({ title: r.title, type: r.type, url: r.url, description: r.description ?? "", order: r.order });
    setResourceDialog(true);
  }

  // ── Mentor CRUD ─────────────────────────────────────────────────────────
  const [mentorDialog, setMentorDialog] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [selectedMentorRole, setSelectedMentorRole] = useState("support");
  const [deleteMentorId, setDeleteMentorId] = useState<string | null>(null);

  const assignMentorMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/organizations/${orgId}/program/modules/${module.id}/mentors`, {
        method: "POST",
        body: JSON.stringify({ mentorProfileId: selectedMentorId, role: selectedMentorRole }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/mentors`] });
      setMentorDialog(false);
      toast.success("Mentor assigned");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMentorMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/organizations/${orgId}/program/modules/${module.id}/mentors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/mentors`] });
      toast.success("Mentor removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Consultation CRUD ───────────────────────────────────────────────────
  const [consultationDialog, setConsultationDialog] = useState(false);
  const [editConsultation, setEditConsultation] = useState<Consultation | null>(null);
  const [consultationForm, setConsultationForm] = useState(emptyConsultationForm());
  const [deleteConsultationId, setDeleteConsultationId] = useState<string | null>(null);

  const saveConsultationMutation = useMutation({
    mutationFn: (data: typeof consultationForm) => {
      const body = {
        ...data,
        durationMinutes: Number(data.durationMinutes),
        maxAttendees: data.maxAttendees ? Number(data.maxAttendees) : null,
        mentorProfileId: data.mentorProfileId || null,
      };
      if (editConsultation) {
        return apiFetch(
          `/api/organizations/${orgId}/program/modules/${module.id}/consultations/${editConsultation.id}`,
          { method: "PUT", body: JSON.stringify(body) }
        );
      }
      return apiFetch(
        `/api/organizations/${orgId}/program/modules/${module.id}/consultations`,
        { method: "POST", body: JSON.stringify(body) }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/consultations`] });
      setConsultationDialog(false);
      toast.success(editConsultation ? "Consultation updated" : "Consultation created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteConsultationMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(
        `/api/organizations/${orgId}/program/modules/${module.id}/consultations/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules/${module.id}/consultations`] });
      toast.success("Consultation deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAddConsultation() {
    setEditConsultation(null);
    setConsultationForm(emptyConsultationForm());
    setConsultationDialog(true);
  }

  function openEditConsultation(c: Consultation) {
    setEditConsultation(c);
    setConsultationForm({
      title: c.title,
      scheduledAt: toDateTimeInput(c.scheduledAt),
      durationMinutes: c.durationMinutes,
      mentorProfileId: c.mentorProfileId ?? "",
      maxAttendees: c.maxAttendees != null ? String(c.maxAttendees) : "",
      location: c.location ?? "",
      meetingLink: c.meetingLink ?? "",
      notes: c.notes ?? "",
      status: c.status,
    });
    setConsultationDialog(true);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Tabs defaultValue="overview" className="h-full flex flex-col">
        <TabsList className="mx-4 mt-4 w-auto self-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="materials">
            Materials
            {resources.length > 0 && (
              <span className="ml-1.5 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {resources.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="mentors">
            Mentors
            {mentors.length > 0 && (
              <span className="ml-1.5 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {mentors.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="consultations">
            Sessions
            {consultations.length > 0 && (
              <span className="ml-1.5 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {consultations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unlock">
            <Lock size={13} className="mr-1" />
            Unlock Rules
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-0.5">Status</p>
              {statusBadge(module.status)}
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Stage</p>
              <p className="font-medium">Stage {module.stageIndex}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Start date</p>
              <p className="font-medium">{fmtDate(module.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">End date</p>
              <p className="font-medium">{fmtDate(module.endDate)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground mb-0.5">Location</p>
              <div className="flex items-center gap-1.5">
                {locationIcon(module.locationType)}
                <span className="font-medium">{module.location || "Not set"}</span>
                <span className="text-muted-foreground capitalize">({module.locationType.replace("_", "-")})</span>
              </div>
              {module.meetingLink && (
                <a href={module.meetingLink} target="_blank" rel="noreferrer"
                  className="text-primary text-xs underline mt-0.5 block truncate">
                  {module.meetingLink}
                </a>
              )}
            </div>
            {module.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground mb-0.5">Description</p>
                <p className="text-sm leading-relaxed">{module.description}</p>
              </div>
            )}
            {module.descriptionAr && (
              <div className="col-span-2">
                <p className="text-muted-foreground mb-0.5">Description (AR)</p>
                <p className="text-sm leading-relaxed text-right" dir="rtl">{module.descriptionAr}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── MATERIALS ── */}
        <TabsContent value="materials" className="flex-1 overflow-y-auto px-4 pb-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Learning Materials</h3>
            <Button size="sm" variant="outline" onClick={openAddResource} className="gap-1 h-8">
              <Plus size={13} /> Add
            </Button>
          </div>
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No materials yet.</p>
          ) : (
            <div className="space-y-2">
              {resources.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <span className="text-muted-foreground shrink-0">{resourceIcon(r.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.title}</p>
                    <a href={r.url} target="_blank" rel="noreferrer"
                      className="text-xs text-primary underline truncate block">{r.url}</a>
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  </div>
                  <Badge variant="outline" className="capitalize text-xs shrink-0">{r.type}</Badge>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditResource(r)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                      onClick={() => setDeleteResourceId(r.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resource dialog */}
          <Dialog open={resourceDialog} onOpenChange={setResourceDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={resourceForm.title}
                    onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={resourceForm.type}
                    onValueChange={(v) => setResourceForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((rt) => (
                        <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL</Label>
                  <Input value={resourceForm.url}
                    onChange={(e) => setResourceForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..." />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea value={resourceForm.description}
                    onChange={(e) => setResourceForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResourceDialog(false)}>Cancel</Button>
                <Button disabled={saveResourceMutation.isPending}
                  onClick={() => saveResourceMutation.mutate(resourceForm)}>
                  {saveResourceMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete resource confirm */}
          <AlertDialog open={!!deleteResourceId} onOpenChange={(o) => !o && setDeleteResourceId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove resource?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
                  onClick={() => { deleteResourceMutation.mutate(deleteResourceId!); setDeleteResourceId(null); }}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* ── MENTORS ── */}
        <TabsContent value="mentors" className="flex-1 overflow-y-auto px-4 pb-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Assigned Mentors</h3>
            <Button size="sm" variant="outline" className="gap-1 h-8"
              onClick={() => { setSelectedMentorId(""); setSelectedMentorRole("support"); setMentorDialog(true); }}>
              <Plus size={13} /> Assign
            </Button>
          </div>
          {mentors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No mentors assigned.</p>
          ) : (
            <div className="space-y-2">
              {mentors.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {(m.firstName?.[0] ?? m.email?.[0] ?? "M").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                    {m.title && <p className="text-xs text-muted-foreground">{m.title}</p>}
                  </div>
                  <Badge variant={m.role === "lead" ? "default" : "secondary"} className="capitalize text-xs shrink-0">
                    {m.role}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive shrink-0"
                    onClick={() => setDeleteMentorId(m.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Assign mentor dialog */}
          <Dialog open={mentorDialog} onOpenChange={setMentorDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Assign Mentor</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Mentor</Label>
                  <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                    <SelectTrigger><SelectValue placeholder="Select mentor..." /></SelectTrigger>
                    <SelectContent>
                      {orgMentors
                        .filter((om) => !mentors.some((m) => m.mentorProfileId === om.id))
                        .map((om) => (
                          <SelectItem key={om.id} value={om.id}>
                            {[om.firstName, om.lastName].filter(Boolean).join(" ") || om.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={selectedMentorRole} onValueChange={setSelectedMentorRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMentorDialog(false)}>Cancel</Button>
                <Button disabled={!selectedMentorId || assignMentorMutation.isPending}
                  onClick={() => assignMentorMutation.mutate()}>
                  {assignMentorMutation.isPending ? "Assigning..." : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Remove mentor confirm */}
          <AlertDialog open={!!deleteMentorId} onOpenChange={(o) => !o && setDeleteMentorId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove mentor?</AlertDialogTitle>
                <AlertDialogDescription>This will unassign the mentor from this module.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
                  onClick={() => { removeMentorMutation.mutate(deleteMentorId!); setDeleteMentorId(null); }}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* ── CONSULTATIONS ── */}
        <TabsContent value="consultations" className="flex-1 overflow-y-auto px-4 pb-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Consultation Sessions</h3>
            <Button size="sm" variant="outline" className="gap-1 h-8" onClick={openAddConsultation}>
              <Plus size={13} /> Add Session
            </Button>
          </div>
          {consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {consultations.map((c) => (
                <div key={c.id} className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtDateTime(c.scheduledAt)} · {c.durationMinutes} min
                        {c.maxAttendees ? ` · max ${c.maxAttendees}` : ""}
                      </p>
                      {(c.mentorFirstName || c.mentorLastName) && (
                        <p className="text-xs text-muted-foreground">
                          Mentor: {[c.mentorFirstName, c.mentorLastName].filter(Boolean).join(" ")}
                        </p>
                      )}
                      {c.location && <p className="text-xs text-muted-foreground">{c.location}</p>}
                      {c.meetingLink && (
                        <a href={c.meetingLink} target="_blank" rel="noreferrer"
                          className="text-xs text-primary underline block truncate">{c.meetingLink}</a>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {statusBadge(c.status)}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditConsultation(c)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        onClick={() => setDeleteConsultationId(c.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{c.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Consultation dialog */}
          <Dialog open={consultationDialog} onOpenChange={setConsultationDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editConsultation ? "Edit Session" : "Add Consultation Session"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Title</Label>
                  <Input value={consultationForm.title}
                    onChange={(e) => setConsultationForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Scheduled At</Label>
                  <Input type="datetime-local" value={consultationForm.scheduledAt}
                    onChange={(e) => setConsultationForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input type="number" value={consultationForm.durationMinutes}
                    onChange={(e) => setConsultationForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Mentor (optional)</Label>
                  <Select value={consultationForm.mentorProfileId}
                    onValueChange={(v) => setConsultationForm((f) => ({ ...f, mentorProfileId: v }))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {orgMentors.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Attendees</Label>
                  <Input type="number" value={consultationForm.maxAttendees}
                    onChange={(e) => setConsultationForm((f) => ({ ...f, maxAttendees: e.target.value }))}
                    placeholder="Unlimited" />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={consultationForm.location}
                    onChange={(e) => setConsultationForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Room / address" />
                </div>
                <div>
                  <Label>Meeting Link</Label>
                  <Input value={consultationForm.meetingLink}
                    onChange={(e) => setConsultationForm((f) => ({ ...f, meetingLink: e.target.value }))}
                    placeholder="https://..." />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={consultationForm.status}
                    onValueChange={(v) => setConsultationForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Notes (optional)</Label>
                  <Textarea value={consultationForm.notes}
                    onChange={(e) => setConsultationForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConsultationDialog(false)}>Cancel</Button>
                <Button disabled={saveConsultationMutation.isPending}
                  onClick={() => saveConsultationMutation.mutate(consultationForm)}>
                  {saveConsultationMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete consultation confirm */}
          <AlertDialog open={!!deleteConsultationId} onOpenChange={(o) => !o && setDeleteConsultationId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete session?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
                  onClick={() => { deleteConsultationMutation.mutate(deleteConsultationId!); setDeleteConsultationId(null); }}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* ── UNLOCK RULES ── */}
        <TabsContent value="unlock" className="flex-1 overflow-y-auto px-4 pb-4 mt-4">
          <UnlockRulesDisplay module={module} orgId={orgId} allModules={allModules} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Unlock Rules Display + Edit ───────────────────────────────────────────────

function UnlockRulesDisplay({
  module,
  orgId,
  allModules,
}: {
  module: ProgramModule;
  orgId: string;
  allModules: ProgramModule[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [rules, setRules] = useState<UnlockRules | null>(module.unlockRules);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/organizations/${orgId}/program/modules/${module.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...module, unlockRules: rules }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules`] });
      setEditing(false);
      toast.success("Unlock rules saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Unlock Rules</h3>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => { setRules(module.unlockRules); setEditing(true); }}>
            <Pencil size={13} /> Edit
          </Button>
        </div>
        {!module.unlockRules || module.unlockRules.conditions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe size={14} /> This module is always accessible (no unlock conditions).
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Must satisfy <strong>{module.unlockRules.mode.toUpperCase()}</strong> of:
            </p>
            <ul className="space-y-1">
              {module.unlockRules.conditions.map((c, i) => (
                <li key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                  <Lock size={13} className="text-muted-foreground shrink-0" />
                  {c.type === "always_open" && "Always open"}
                  {c.type === "requires_module" && (
                    <>
                      Complete module:{" "}
                      <strong>
                        {allModules.find((m) => m.id === c.moduleId)?.title ?? c.moduleId}
                      </strong>
                    </>
                  )}
                  {c.type === "requires_score_gte" && (
                    <>Achieve score ≥ <strong>{c.scoreGte}</strong></>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Edit Unlock Rules</h3>
      </div>
      <UnlockRulesEditor rules={rules} onChange={setRules} allModules={allModules.filter((m) => m.id !== module.id)} />
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "Saving..." : "Save Rules"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminProgramRoadmap() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editModule, setEditModule] = useState<ProgramModule | null>(null);
  const [moduleForm, setModuleForm] = useState(emptyModuleForm());
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null);

  // Fetch org id from slug
  const { data: workspace } = useQuery<{ id: string; name: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
    queryFn: () => apiFetch(`/api/workspaces/${slug}`),
  });
  const orgId = workspace?.id ?? "";

  const { data: modules = [], isLoading } = useQuery<ProgramModule[]>({
    queryKey: [`/api/organizations/${orgId}/program/modules`],
    enabled: !!orgId,
    queryFn: () => apiFetch(`/api/organizations/${orgId}/program/modules`),
  });

  const { data: orgMentors = [] } = useQuery<OrgMentor[]>({
    queryKey: [`/api/organizations/${orgId}/program/mentors`],
    enabled: !!orgId,
    queryFn: () => apiFetch(`/api/organizations/${orgId}/program/mentors`),
  });

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? null;

  // ── Module CRUD ─────────────────────────────────────────────────────────
  const saveModuleMutation = useMutation({
    mutationFn: (data: typeof moduleForm) => {
      const body = {
        ...data,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      };
      if (editModule) {
        return apiFetch(`/api/organizations/${orgId}/program/modules/${editModule.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      return apiFetch(`/api/organizations/${orgId}/program/modules`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (saved: ProgramModule) => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules`] });
      setModuleDialog(false);
      setSelectedModuleId(saved.id);
      toast.success(editModule ? "Module updated" : "Module created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/organizations/${orgId}/program/modules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules`] });
      if (selectedModuleId === deleteModuleId) setSelectedModuleId(null);
      toast.success("Module deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Move a module up/down in order
  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; order: number; stageIndex: number }[]) =>
      apiFetch(`/api/organizations/${orgId}/program/modules/reorder`, {
        method: "PUT",
        body: JSON.stringify(items),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/program/modules`] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function moveModule(mod: ProgramModule, dir: "up" | "down") {
    const stageModules = modules
      .filter((m) => m.stageIndex === mod.stageIndex)
      .sort((a, b) => a.order - b.order);
    const idx = stageModules.findIndex((m) => m.id === mod.id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === stageModules.length - 1) return;

    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const updated = stageModules.map((m, i) => {
      if (i === idx) return { id: m.id, order: stageModules[swapIdx].order, stageIndex: m.stageIndex };
      if (i === swapIdx) return { id: m.id, order: stageModules[idx].order, stageIndex: m.stageIndex };
      return { id: m.id, order: m.order, stageIndex: m.stageIndex };
    });
    reorderMutation.mutate(updated);
  }

  function openCreateModule() {
    setEditModule(null);
    setModuleForm(emptyModuleForm());
    setModuleDialog(true);
  }

  function openEditModule(m: ProgramModule) {
    setEditModule(m);
    setModuleForm({
      title: m.title,
      titleAr: m.titleAr ?? "",
      description: m.description ?? "",
      descriptionAr: m.descriptionAr ?? "",
      stageIndex: m.stageIndex,
      status: m.status,
      startDate: toDateInput(m.startDate),
      endDate: toDateInput(m.endDate),
      location: m.location ?? "",
      locationType: m.locationType,
      meetingLink: m.meetingLink ?? "",
      unlockRules: m.unlockRules,
    });
    setModuleDialog(true);
  }

  // Group modules by stage
  const byStage = [1, 2, 3, 4].map((s) =>
    modules.filter((m) => m.stageIndex === s).sort((a, b) => a.order - b.order)
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar
        workspaceSlug={slug ?? ""}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: module list ── */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="text-primary" size={18} />
              <h1 className="font-semibold text-sm">Program Roadmap</h1>
            </div>
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={openCreateModule}>
              <Plus size={13} /> Module
            </Button>
          </div>

          {/* Stage groups */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : (
              byStage.map((stageModules, stageIdx) => (
                <div key={stageIdx}>
                  <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 select-none">
                    Stage {stageIdx + 1}
                  </p>
                  {stageModules.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2">No modules yet.</p>
                  ) : (
                    <div className="space-y-0.5">
                      {stageModules.map((m, idx) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedModuleId(m.id)}
                          className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm
                            ${selectedModuleId === m.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent hover:text-accent-foreground"
                            }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{m.title}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {statusBadge(m.status)}
                            </div>
                          </div>
                          {/* Reorder buttons */}
                          <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveModule(m, "up"); }}
                              disabled={idx === 0}
                              className="disabled:opacity-30 hover:opacity-70"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveModule(m, "down"); }}
                              disabled={idx === stageModules.length - 1}
                              className="disabled:opacity-30 hover:opacity-70"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          {/* Edit / delete */}
                          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModule(m); }}
                              className="hover:opacity-70 p-0.5"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteModuleId(m.id); }}
                              className="hover:opacity-70 p-0.5"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: module detail ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedModule ? (
            <>
              {/* Module header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">{selectedModule.title}</h2>
                    {selectedModule.titleAr && (
                      <p className="text-sm text-muted-foreground" dir="rtl">{selectedModule.titleAr}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {statusBadge(selectedModule.status)}
                      <span className="text-xs text-muted-foreground">
                        {STAGE_LABELS[selectedModule.stageIndex - 1]}
                      </span>
                      {selectedModule.startDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays size={11} />
                          {fmtDate(selectedModule.startDate)}
                          {selectedModule.endDate && ` → ${fmtDate(selectedModule.endDate)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 shrink-0"
                    onClick={() => openEditModule(selectedModule)}>
                    <Pencil size={13} /> Edit
                  </Button>
                </div>
              </div>

              <ModuleDetail
                module={selectedModule}
                orgId={orgId}
                allModules={modules}
                orgMentors={orgMentors}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <Map size={48} className="mb-3 opacity-20" />
              <p className="font-medium">Select a module to view details</p>
              <p className="text-sm mt-1">Or create a new module to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Module Dialog ── */}
      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editModule ? "Edit Module" : "Create Module"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="col-span-2">
              <Label>Title (EN)</Label>
              <Input value={moduleForm.title}
                onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Title (AR)</Label>
              <Input value={moduleForm.titleAr} dir="rtl"
                onChange={(e) => setModuleForm((f) => ({ ...f, titleAr: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Description (EN)</Label>
              <Textarea rows={2} value={moduleForm.description}
                onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Description (AR)</Label>
              <Textarea rows={2} value={moduleForm.descriptionAr} dir="rtl"
                onChange={(e) => setModuleForm((f) => ({ ...f, descriptionAr: e.target.value }))} />
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={String(moduleForm.stageIndex)}
                onValueChange={(v) => setModuleForm((f) => ({ ...f, stageIndex: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGE_LABELS.map((l, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={moduleForm.status}
                onValueChange={(v) => setModuleForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={moduleForm.startDate}
                onChange={(e) => setModuleForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={moduleForm.endDate}
                onChange={(e) => setModuleForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <Label>Location Type</Label>
              <Select value={moduleForm.locationType}
                onValueChange={(v) => setModuleForm((f) => ({ ...f, locationType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={moduleForm.location}
                onChange={(e) => setModuleForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Room / address" />
            </div>
            <div className="col-span-2">
              <Label>Meeting Link</Label>
              <Input value={moduleForm.meetingLink}
                onChange={(e) => setModuleForm((f) => ({ ...f, meetingLink: e.target.value }))}
                placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog(false)}>Cancel</Button>
            <Button disabled={!moduleForm.title || saveModuleMutation.isPending}
              onClick={() => saveModuleMutation.mutate(moduleForm)}>
              {saveModuleMutation.isPending ? "Saving..." : editModule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Module Confirm ── */}
      <AlertDialog open={!!deleteModuleId} onOpenChange={(o) => !o && setDeleteModuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module and all its resources, mentors, and sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => { deleteModuleMutation.mutate(deleteModuleId!); setDeleteModuleId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
