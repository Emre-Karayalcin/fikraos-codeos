import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Trophy, Mail, Users, AlertTriangle, Settings } from "lucide-react";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { ApplicationDetailModal, AppRow } from "@/components/ApplicationDetailModal";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

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
    acceptanceEmailSentAt: string | null;
    rejectionEmailSentAt: string | null;
    pitchDeckUrl?: string | null;
    prototypeUrl?: string | null;
  };
  user: { id: string; email: string; firstName: string | null; lastName: string | null; status: string | null } | null;
  org: { id: string; name: string; slug: string } | null;
  challenge: { id: string; title: string } | null;
}

interface Stats {
  approved: number;
  rejected: number;
  capacity: number;
  pendingAcceptanceEmail: number;
  pendingRejectionEmail: number;
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || (e as any).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SuperAdminApplicationsList() {
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedApplication, setSelectedApplication] = useState<SuperAdminApplication | null>(null);
  const [confirmBulkAccept, setConfirmBulkAccept] = useState(false);
  const [confirmBulkReject, setConfirmBulkReject] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityInput, setCapacityInput] = useState("");

  // All workspaces for selector
  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: () => apiFetch("/api/super-admin/workspaces"),
    select: (data) => data.map((w: any) => ({ id: w.id, name: w.name, slug: w.slug })),
  });

  // All applications (used for the full table, filtered by selected workspace)
  const { data: allApplications = [], isLoading: applicationsLoading } = useQuery<SuperAdminApplication[]>({
    queryKey: ["/api/super-admin/applications"],
    queryFn: () => apiFetch("/api/super-admin/applications"),
  });

  // Per-workspace stats (only when a workspace is selected)
  const { data: stats, refetch: refetchStats } = useQuery<Stats>({
    queryKey: ["/api/super-admin/workspaces", selectedOrgId, "applications/stats"],
    queryFn: () => apiFetch(`/api/super-admin/workspaces/${selectedOrgId}/applications/stats`),
    enabled: !!selectedOrgId,
  });

  const updateApplication = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiFetch(`/api/super-admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/applications"] });
      if (selectedOrgId) refetchStats();
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

  const refineApplication = useMutation({
    mutationFn: ({ id, additionalContext }: { id: string; additionalContext: string }) =>
      apiFetch(`/api/super-admin/applications/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalContext }),
      }),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/applications"] });
      if (selectedApplication) {
        setSelectedApplication({
          ...selectedApplication,
          application: {
            ...selectedApplication.application,
            aiScore: result.aiScore,
            aiMetrics: result.aiMetrics,
            aiStrengths: result.aiStrengths,
            aiRecommendations: result.aiRecommendations,
            aiInsights: result.aiInsights,
            status: "AI_REVIEWED",
          },
        });
      }
      toast.success("AI scoring updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setCapacity = useMutation({
    mutationFn: (capacity: number) =>
      apiFetch(`/api/super-admin/workspaces/${selectedOrgId}/acceptance-capacity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacity }),
      }),
    onSuccess: () => {
      refetchStats();
      setEditingCapacity(false);
      toast.success("Capacity updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkAcceptEmail = useMutation({
    mutationFn: () => apiFetch(`/api/super-admin/workspaces/${selectedOrgId}/applications/bulk-accept-email`, { method: "POST" }),
    onSuccess: (result: { sent: number; failed: number }) => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/applications"] });
      refetchStats();
      setConfirmBulkAccept(false);
      toast.success(`Sent ${result.sent} acceptance email${result.sent !== 1 ? "s" : ""}${result.failed > 0 ? ` (${result.failed} failed)` : ""}`);
    },
    onError: (e: Error) => { setConfirmBulkAccept(false); toast.error(e.message); },
  });

  const bulkRejectEmail = useMutation({
    mutationFn: () => apiFetch(`/api/super-admin/workspaces/${selectedOrgId}/applications/bulk-reject-email`, { method: "POST" }),
    onSuccess: (result: { sent: number; failed: number }) => {
      qc.invalidateQueries({ queryKey: ["/api/super-admin/applications"] });
      refetchStats();
      setConfirmBulkReject(false);
      toast.success(`Sent ${result.sent} rejection email${result.sent !== 1 ? "s" : ""}${result.failed > 0 ? ` (${result.failed} failed)` : ""}`);
    },
    onError: (e: Error) => { setConfirmBulkReject(false); toast.error(e.message); },
  });

  // Filtered applications for the table (and leaderboard derivation)
  const wsApplications = selectedOrgId
    ? allApplications.filter((r) => r.application.orgId === selectedOrgId)
    : allApplications;

  const capacity = stats?.capacity ?? 280;

  const acceptedLeaderboard = wsApplications
    .filter((r) => r.application.status === "APPROVED")
    .sort((a, b) => (b.application.aiScore ?? 0) - (a.application.aiScore ?? 0))
    .slice(0, capacity);

  const rejectedList = wsApplications.filter((r) => r.application.status === "REJECTED");

  const approvedCount = stats?.approved ?? wsApplications.filter((r) => r.application.status === "APPROVED").length;
  const capacityPct = Math.min(100, Math.round((approvedCount / capacity) * 100));
  const pendingAcceptEmail = stats?.pendingAcceptanceEmail ?? 0;
  const pendingRejectEmail = stats?.pendingRejectionEmail ?? 0;

  const handleSetCapacity = () => {
    const val = parseInt(capacityInput, 10);
    if (!val || val < 1) { toast.error("Enter a valid number"); return; }
    setCapacity.mutate(val);
  };

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Header + workspace selector */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Applications</h1>
                <p className="text-muted-foreground">Review all member applications</p>
              </div>
            </div>
            <Select value={selectedOrgId} onValueChange={(v) => { setSelectedOrgId(v); setConfirmBulkAccept(false); setConfirmBulkReject(false); setEditingCapacity(false); }}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All workspaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All workspaces</SelectItem>
                {workspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workspace management panels — only when a workspace is selected */}
          {selectedOrgId && (
            <>
              {/* Capacity bar + editor */}
              <Card className="border border-border/50">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Accepted capacity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${approvedCount >= capacity ? "text-red-500" : "text-foreground"}`}>
                        {approvedCount} / {capacity}
                      </span>
                      {editingCapacity ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={capacityInput}
                            onChange={(e) => setCapacityInput(e.target.value)}
                            className="h-7 w-20 text-xs"
                            placeholder={String(capacity)}
                            autoFocus
                          />
                          <Button size="sm" className="h-7 text-xs" onClick={handleSetCapacity} disabled={setCapacity.isPending}>
                            {setCapacity.isPending ? "Saving…" : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingCapacity(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setCapacityInput(String(capacity)); setEditingCapacity(true); }}>
                          <Settings className="w-3 h-3" /> Edit
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${capacityPct >= 100 ? "bg-red-500" : capacityPct >= 80 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${capacityPct}%` }}
                    />
                  </div>
                  {approvedCount >= capacity && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Capacity full — no more acceptances allowed
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Leaderboard + Rejected side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Accepted leaderboard */}
                <Card className="border border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-green-500" />
                        Accepted — Top {capacity} by AI Score
                        <Badge className="bg-green-500/15 text-green-600 border-green-200 border text-xs">{acceptedLeaderboard.length}</Badge>
                      </CardTitle>
                      {confirmBulkAccept ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Send to {pendingAcceptEmail} unsent?</span>
                          <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => bulkAcceptEmail.mutate()} disabled={bulkAcceptEmail.isPending}>
                            {bulkAcceptEmail.isPending ? "Sending…" : "Confirm"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmBulkAccept(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => setConfirmBulkAccept(true)} disabled={pendingAcceptEmail === 0}>
                          <Mail className="w-3 h-3 mr-1" />
                          Send Acceptance Emails{pendingAcceptEmail > 0 ? ` (${pendingAcceptEmail})` : ""}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 max-h-80 overflow-y-auto">
                    {acceptedLeaderboard.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No accepted applicants yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Email</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {acceptedLeaderboard.map((row, idx) => (
                            <TableRow key={row.application.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedApplication(row)}>
                              <TableCell className="text-xs font-bold text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell>
                                <p className="text-sm font-medium">{[row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") || "—"}</p>
                                <p className="text-xs text-muted-foreground">{row.user?.email}</p>
                              </TableCell>
                              <TableCell>
                                <span className={`font-bold text-sm ${(row.application.aiScore ?? 0) >= 70 ? "text-green-500" : "text-red-500"}`}>
                                  {row.application.aiScore ?? "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                {row.application.acceptanceEmailSentAt ? (
                                  <Badge className="bg-green-500/15 text-green-600 border-green-200 border text-xs">Sent</Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-200 border text-xs">Pending</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Rejected list */}
                <Card className="border border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        Rejected
                        <Badge className="bg-red-500/15 text-red-600 border-red-200 border text-xs">{rejectedList.length}</Badge>
                      </CardTitle>
                      {confirmBulkReject ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Send to {pendingRejectEmail} unsent?</span>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => bulkRejectEmail.mutate()} disabled={bulkRejectEmail.isPending}>
                            {bulkRejectEmail.isPending ? "Sending…" : "Confirm"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmBulkReject(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setConfirmBulkReject(true)} disabled={pendingRejectEmail === 0}>
                          <Mail className="w-3 h-3 mr-1" />
                          Send Rejection Emails{pendingRejectEmail > 0 ? ` (${pendingRejectEmail})` : ""}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 max-h-80 overflow-y-auto">
                    {rejectedList.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No rejected applicants yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Email</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rejectedList.map((row) => (
                            <TableRow key={row.application.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedApplication(row)}>
                              <TableCell>
                                <p className="text-sm font-medium">{[row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") || "—"}</p>
                                <p className="text-xs text-muted-foreground">{row.user?.email}</p>
                              </TableCell>
                              <TableCell>
                                <span className={`font-bold text-sm ${(row.application.aiScore ?? 0) >= 70 ? "text-green-500" : "text-red-500"}`}>
                                  {row.application.aiScore ?? "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                {row.application.rejectionEmailSentAt ? (
                                  <Badge className="bg-muted text-muted-foreground border text-xs">Sent</Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-200 border text-xs">Pending</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* All applications table */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {selectedOrgId ? `${wsApplications.length} applications in selected workspace` : "All Member Applications"}
              </CardTitle>
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
                    {wsApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                          No applications yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      wsApplications.map((row) => (
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
                            {row.application.status === "APPROVED" && <Badge className="bg-green-500/15 text-green-600 border-green-200 border text-xs">Accepted</Badge>}
                            {row.application.status === "REJECTED" && <Badge className="bg-red-500/15 text-red-600 border-red-200 border text-xs">Rejected</Badge>}
                            {row.application.status === "PENDING_REVIEW" && <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-200 border text-xs">Pending Review</Badge>}
                            {row.application.status === "AI_REVIEWED" && <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 border text-xs">AI Reviewed</Badge>}
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

      {selectedApplication && (
        <ApplicationDetailModal
          row={selectedApplication as AppRow}
          onClose={() => setSelectedApplication(null)}
          onUpdate={(data) => updateApplication.mutate({ id: selectedApplication.application.id, data })}
          onRescreen={() => rescreenApplication.mutate(selectedApplication.application.id)}
          onRefine={async (context) => refineApplication.mutateAsync({ id: selectedApplication.application.id, additionalContext: context })}
          isPending={updateApplication.isPending || rescreenApplication.isPending || refineApplication.isPending}
        />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
