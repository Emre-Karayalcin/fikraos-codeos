import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, User } from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SimpleWorkspace {
  id: string;
  name: string;
  slug: string;
}

interface Challenge {
  id: string;
  title: string;
  problemStatement?: string | null;
  orgId: string;
}

interface IdeaItem {
  idea: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  };
  owner: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

const STATUSES = [
  { id: "BACKLOG", label: "Backlog", color: "bg-gray-500" },
  { id: "UNDER_REVIEW", label: "Under Review", color: "bg-blue-500" },
  { id: "SHORTLISTED", label: "Shortlisted", color: "bg-yellow-500" },
  { id: "IN_INCUBATION", label: "In Incubation", color: "bg-purple-500" },
  { id: "ARCHIVED", label: "Archived", color: "bg-red-500" },
];

// ─── Droppable Column ───────────────────────────────────────────────────────

function DroppableColumn({
  statusId,
  label,
  color,
  children,
}: {
  statusId: string;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: statusId });
  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[280px] flex flex-col bg-muted/40 rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <h3 className="font-semibold text-sm">{label}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Draggable Card ─────────────────────────────────────────────────────────

function DraggableCard({
  item,
  onDelete,
}: {
  item: IdeaItem;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.idea.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <Card className="cursor-move hover:shadow-md transition-shadow mb-3">
        <CardHeader className="p-3 pb-1">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xs font-medium line-clamp-2 flex-1">
              {item.idea.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          {item.idea.tags && item.idea.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {item.idea.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-1">
          {item.idea.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {item.idea.description}
            </p>
          )}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-1">
            <div className="flex items-center gap-1">
              <User className="w-2.5 h-2.5" />
              <span>{item.owner?.username ?? "—"}</span>
            </div>
            <span>{new Date(item.idea.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface Props {
  workspaces: SimpleWorkspace[];
}

export function SuperAdminIdeasKanban({ workspaces }: Props) {
  const qc = useQueryClient();

  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    workspaces[0]?.id ?? ""
  );
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("all");

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIdea, setConfirmIdea] = useState<IdeaItem | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Fetch challenges for workspace ────────────────────────────────────────
  const { data: challengesData } = useQuery<{ data?: Challenge[]; challenges?: Challenge[] } | Challenge[]>({
    queryKey: ["/api/challenges", selectedOrgId],
    queryFn: async () => {
      const res = await fetch(`/api/challenges?orgId=${selectedOrgId}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedOrgId,
  });

  const challengesList: Challenge[] = Array.isArray(challengesData)
    ? (challengesData as any[]).map((c: any) => c.challenge ?? c)
    : [];

  const selectedChallenge = challengesList.find((c) => c.id === selectedChallengeId);

  // ── Fetch ideas ───────────────────────────────────────────────────────────
  const ideasQueryKey = ["/api/super-admin/kanban/ideas", selectedOrgId, selectedChallengeId];

  const { data: ideasData, isLoading } = useQuery<{ data: IdeaItem[] }>({
    queryKey: ideasQueryKey,
    queryFn: async () => {
      const param =
        selectedChallengeId !== "all"
          ? `challengeId=${selectedChallengeId}`
          : `orgId=${selectedOrgId}`;
      const res = await fetch(`/api/super-admin/kanban/ideas?${param}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch ideas");
      return res.json();
    },
    enabled: !!selectedOrgId,
  });

  const ideas: IdeaItem[] = ideasData?.data ?? [];

  // ── Status update mutation ─────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/super-admin/kanban/ideas/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ideasQueryKey });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteIdea = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/organizations/${selectedOrgId}/admin/ideas/${id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ideasQueryKey });
      toast.success("Idea deleted");
    },
    onError: () => toast.error("Failed to delete idea"),
  });

  // ── DnD handlers ──────────────────────────────────────────────────────────
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdea = ideas.find((i) => i.idea.id === active.id);
    if (!activeIdea) return;

    let targetStatus = over.id as string;
    const overIdea = ideas.find((i) => i.idea.id === over.id);
    if (overIdea) targetStatus = overIdea.idea.status;

    if (
      activeIdea.idea.status !== targetStatus &&
      STATUSES.find((s) => s.id === targetStatus)
    ) {
      setConfirmIdea(activeIdea);
      setConfirmStatus(targetStatus);
      setComment("");
      setConfirmOpen(true);
    }
  };

  const confirmChange = () => {
    if (!confirmIdea || !confirmStatus) return;
    updateStatus.mutate({ id: confirmIdea.idea.id, status: confirmStatus });
    setConfirmOpen(false);
    setConfirmIdea(null);
    setConfirmStatus(null);
    setComment("");
  };

  const getByStatus = (status: string) =>
    ideas.filter((i) => i.idea.status === status);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Workspace:</span>
          <Select
            value={selectedOrgId}
            onValueChange={(v) => {
              setSelectedOrgId(v);
              setSelectedChallengeId("all");
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Filter:</span>
          <Select
            value={selectedChallengeId}
            onValueChange={setSelectedChallengeId}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All workspace ideas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workspace Ideas</SelectItem>
              {challengesList.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="secondary" className="ml-auto">
          {ideas.length} idea{ideas.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Problem Statement banner (when a challenge is selected) */}
      {selectedChallenge?.problemStatement && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Problem Statement — {selectedChallenge.title}
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {selectedChallenge.problemStatement}
          </p>
        </div>
      )}

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {STATUSES.map((status) => {
                const col = getByStatus(status.id);
                return (
                  <DroppableColumn
                    key={status.id}
                    statusId={status.id}
                    label={status.label}
                    color={status.color}
                  >
                    <div className="flex items-center gap-1 mb-3">
                      <Badge variant="secondary" className="text-xs">{col.length}</Badge>
                    </div>
                    <SortableContext
                      items={col.map((i) => i.idea.id)}
                      strategy={verticalListSortingStrategy}
                      id={status.id}
                    >
                      <div className="flex-1 min-h-[150px] space-y-0">
                        {col.length === 0 ? (
                          <div className="text-center text-muted-foreground text-xs py-8 border-2 border-dashed border-border rounded-lg">
                            Drop here
                          </div>
                        ) : (
                          col.map((item) => (
                            <DraggableCard
                              key={item.idea.id}
                              item={item}
                              onDelete={() => deleteIdea.mutate(item.idea.id)}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </DroppableColumn>
                );
              })}
            </div>
          </div>
        </DndContext>
      )}

      {/* Status change confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { setConfirmOpen(v); if (!v) { setConfirmIdea(null); setConfirmStatus(null); setComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Idea</DialogTitle>
            <DialogDescription>
              Move <strong>{confirmIdea?.idea.title}</strong> to{" "}
              <strong>{STATUSES.find((s) => s.id === confirmStatus)?.label}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Label htmlFor="sa-comment">Comment (optional)</Label>
            <Textarea
              id="sa-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Reason for status change..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmChange} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
