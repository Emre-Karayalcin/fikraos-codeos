import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Presentation, Download, Lock, Unlock, MessageSquare, History,
  CheckCircle2, XCircle, AlertCircle, Clock, FileCheck,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────

type LifecycleStatus = "DRAFT" | "PENDING_REVIEW" | "REVIEWED" | "SUBMITTED" | "REJECTED";
type ReviewStatus = "APPROVED" | "REJECTED" | "NEEDS_REVISION";

interface DeckRow {
  id: string;
  projectId: string;
  projectTitle: string;
  creatorFirstName: string;
  creatorLastName: string;
  creatorEmail: string;
  template: string;
  status: string;
  lifecycleStatus: LifecycleStatus;
  downloadUrl: string | null;
  isLocked: boolean;
  lockedReason: string | null;
  submittedAt: string | null;
  lastAutoSavedAt: string | null;
  draftNotes: string | null;
  versionCount: number;
  latestReview: {
    reviewStatus: ReviewStatus;
    feedback: string | null;
    reviewedAt: string;
  } | null;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const LIFECYCLE_CONFIG: Record<LifecycleStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT:          { label: "Draft",          color: "bg-muted text-muted-foreground",        icon: <Clock className="w-3 h-3" /> },
  PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-500/15 text-yellow-500",      icon: <AlertCircle className="w-3 h-3" /> },
  REVIEWED:       { label: "Reviewed",       color: "bg-blue-500/15 text-blue-400",          icon: <CheckCircle2 className="w-3 h-3" /> },
  SUBMITTED:      { label: "Submitted",      color: "bg-green-500/15 text-green-400",        icon: <FileCheck className="w-3 h-3" /> },
  REJECTED:       { label: "Rejected",       color: "bg-red-500/15 text-red-400",            icon: <XCircle className="w-3 h-3" /> },
};

const REVIEW_CONFIG: Record<ReviewStatus, { label: string; color: string }> = {
  APPROVED:       { label: "Approved",       color: "bg-green-500/15 text-green-400" },
  REJECTED:       { label: "Rejected",       color: "bg-red-500/15 text-red-400" },
  NEEDS_REVISION: { label: "Needs Revision", color: "bg-orange-500/15 text-orange-400" },
};

function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  const cfg = LIFECYCLE_CONFIG[status] ?? LIFECYCLE_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Review Dialog ──────────────────────────────────────────────────────────

function ReviewDialog({
  deck,
  orgId,
  onClose,
}: {
  deck: DeckRow;
  orgId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("APPROVED");
  const [feedback, setFeedback] = useState("");

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/pitch-decks/${deck.id}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus, feedback: feedback || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    },
    onSuccess: () => {
      toast.success("Review submitted");
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/pitch-decks/lifecycle`] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Pitch Deck</DialogTitle>
          <DialogDescription>{deck.projectTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Decision</Label>
            <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as ReviewStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="NEEDS_REVISION">Needs Revision</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Feedback (optional)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Leave feedback for the team…"
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
            {reviewMutation.isPending ? "Submitting…" : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Version History Dialog ─────────────────────────────────────────────────

function VersionHistoryDialog({
  deck,
  orgId,
  onClose,
}: {
  deck: DeckRow;
  orgId: string;
  onClose: () => void;
}) {
  const { data: versions = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/pitch-decks/${deck.id}/versions`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/pitch-decks/${deck.id}/versions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>{deck.projectTitle}</DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No versions saved yet</p>
          ) : (
            versions.map((v: any) => (
              <div key={v.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{v.label}</p>
                  {(v.createdByFirstName || v.createdByUsername) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {v.createdByFirstName ? `${v.createdByFirstName} ${v.createdByLastName ?? ''}`.trim() : v.createdByUsername}
                    </p>
                  )}
                  {v.notes && <p className="text-xs text-muted-foreground mt-0.5">{v.notes}</p>}
                </div>
                {v.snapshotUrl && (
                  <a href={v.snapshotUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 shrink-0">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminPitchDecks() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reviewDeck, setReviewDeck] = useState<DeckRow | null>(null);
  const [historyDeck, setHistoryDeck] = useState<DeckRow | null>(null);

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const orgId = workspace?.id;

  const { data: decks = [], isLoading } = useQuery<DeckRow[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/pitch-decks/lifecycle`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/pitch-decks/lifecycle`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const lockMutation = useMutation({
    mutationFn: async ({ deckId, locked, reason }: { deckId: string; locked: boolean; reason?: string }) => {
      const res = await fetch(`/api/pitch-decks/${deckId}/lock`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked, reason: reason ?? null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    },
    onSuccess: () => {
      toast.success("Lock status updated");
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/pitch-decks/lifecycle`] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitted = decks.filter((d) => d.lifecycleStatus === "SUBMITTED").length;
  const pendingReview = decks.filter((d) => d.lifecycleStatus === "PENDING_REVIEW").length;
  const completed = decks.filter((d) => d.status === "COMPLETED").length;

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Presentation className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Pitch Decks</h1>
              <p className="text-muted-foreground">Lifecycle management for all generated pitch decks</p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Generated</p>
                <p className="text-2xl font-bold mt-1">{decks.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold mt-1">{completed}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold mt-1">{pendingReview}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold mt-1">{submitted}</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Pitch Decks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Idea</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Latest Review</TableHead>
                      <TableHead>Versions</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                          No pitch decks generated yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      decks.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.projectTitle || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {d.creatorFirstName} {d.creatorLastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{d.template || "—"}</TableCell>
                          <TableCell>
                            <LifecycleBadge status={d.lifecycleStatus ?? "DRAFT"} />
                            {d.isLocked && (
                              <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-orange-400">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {d.latestReview ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REVIEW_CONFIG[d.latestReview.reviewStatus]?.color || ""}`}>
                                {REVIEW_CONFIG[d.latestReview.reviewStatus]?.label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground text-center">
                            {d.versionCount ?? 0}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {d.submittedAt ? new Date(d.submittedAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {d.downloadUrl && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Download">
                                  <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Version history"
                                onClick={() => setHistoryDeck(d)}
                              >
                                <History className="w-3.5 h-3.5" />
                              </Button>
                              {d.status === "COMPLETED" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Review"
                                  onClick={() => setReviewDeck(d)}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title={d.isLocked ? "Unlock" : "Lock"}
                                onClick={() =>
                                  lockMutation.mutate({
                                    deckId: d.id,
                                    locked: !d.isLocked,
                                    reason: d.isLocked ? undefined : "Locked by admin",
                                  })
                                }
                              >
                                {d.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
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

      {reviewDeck && orgId && (
        <ReviewDialog deck={reviewDeck} orgId={orgId} onClose={() => setReviewDeck(null)} />
      )}
      {historyDeck && orgId && (
        <VersionHistoryDialog deck={historyDeck} orgId={orgId} onClose={() => setHistoryDeck(null)} />
      )}
    </div>
  );
}
