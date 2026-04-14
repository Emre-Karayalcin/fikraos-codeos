import { useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Search, Trophy, Mail, Users, AlertTriangle, Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { ApplicationDetailModal, type AppRow } from "@/components/ApplicationDetailModal";

const CAPACITY = 280;

type AppRowFull = AppRow & {
  application: AppRow["application"] & {
    submittedAt?: string | null;
    acceptanceEmailSentAt?: string | null;
    rejectionEmailSentAt?: string | null;
  };
};

interface Stats {
  approved: number;
  rejected: number;
  capacity: number;
  pendingAcceptanceEmail: number;
  pendingRejectionEmail: number;
}

export default function AdminApplications() {
  const { slug } = useParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selected, setSelected] = useState<AppRowFull | null>(null);
  const [confirmBulkAccept, setConfirmBulkAccept] = useState(false);
  const [confirmBulkReject, setConfirmBulkReject] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; warnings: string[]; errors: string[]; total: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: workspace } = useQuery<{ id: string; name: string; slug: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
  });

  const { data: rows = [], isLoading } = useQuery<AppRowFull[]>({
    queryKey: [`/api/workspaces/${workspace?.id}/admin/applications`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspace!.id}/admin/applications`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
    enabled: !!workspace?.id,
  });

  const { data: stats, refetch: refetchStats } = useQuery<Stats>({
    queryKey: [`/api/workspaces/${workspace?.id}/admin/applications/stats`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspace!.id}/admin/applications/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!workspace?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      fetch(`/api/workspaces/${workspace!.id}/admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error((e as any).error || "Update failed");
        }
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${workspace?.id}/admin/applications`] });
      refetchStats();
      toast.success("Application updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescreenMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/workspaces/${workspace!.id}/admin/applications/${id}/rescreen`, {
        method: "POST",
        credentials: "include",
      }).then((r) => { if (!r.ok) throw new Error("Rescreen failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${workspace?.id}/admin/applications`] });
      toast.success("Re-screening started — check back shortly");
      setSelected(null);
    },
    onError: () => toast.error("Failed to start re-screening"),
  });

  const refineMutation = useMutation({
    mutationFn: ({ id, additionalContext }: { id: string; additionalContext: string }) =>
      fetch(`/api/workspaces/${workspace!.id}/admin/applications/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ additionalContext }),
      }).then((r) => { if (!r.ok) throw new Error("Refine failed"); return r.json(); }),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${workspace?.id}/admin/applications`] });
      if (selected) {
        setSelected({
          ...selected,
          application: {
            ...selected.application,
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
    onError: () => toast.error("AI refinement failed"),
  });

  const bulkAcceptEmail = useMutation({
    mutationFn: () =>
      fetch(`/api/workspaces/${workspace!.id}/admin/applications/bulk-accept-email`, { method: "POST", credentials: "include" })
        .then(async (r) => { if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || "Failed"); } return r.json(); }),
    onSuccess: (result: { sent: number; failed: number }) => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${workspace?.id}/admin/applications`] });
      refetchStats();
      setConfirmBulkAccept(false);
      toast.success(`Sent ${result.sent} acceptance email${result.sent !== 1 ? "s" : ""}${result.failed > 0 ? ` (${result.failed} failed)` : ""}`);
    },
    onError: (e: Error) => { setConfirmBulkAccept(false); toast.error(e.message); },
  });

  const bulkRejectEmail = useMutation({
    mutationFn: () =>
      fetch(`/api/workspaces/${workspace!.id}/admin/applications/bulk-reject-email`, { method: "POST", credentials: "include" })
        .then(async (r) => { if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || "Failed"); } return r.json(); }),
    onSuccess: (result: { sent: number; failed: number }) => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${workspace?.id}/admin/applications`] });
      refetchStats();
      setConfirmBulkReject(false);
      toast.success(`Sent ${result.sent} rejection email${result.sent !== 1 ? "s" : ""}${result.failed > 0 ? ` (${result.failed} failed)` : ""}`);
    },
    onError: (e: Error) => { setConfirmBulkReject(false); toast.error(e.message); },
  });

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`/api/workspaces/${workspace!.id}/admin/applications/import-csv`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Import failed");
      return data as { imported: number; warnings: string[]; errors: string[]; total: number };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${workspace?.id}/admin/applications`] });
      refetchStats();
      setCsvResult(result);
      toast.success(`Imported ${result.imported} of ${result.total} applicants`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.application.ideaName?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.user?.firstName?.toLowerCase().includes(q) ||
      r.user?.lastName?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || r.application.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const acceptedLeaderboard = rows
    .filter((r) => r.application.status === "APPROVED")
    .sort((a, b) => (b.application.aiScore ?? 0) - (a.application.aiScore ?? 0));

  const rejectedList = rows.filter((r) => r.application.status === "REJECTED");

  const approvedCount = stats?.approved ?? 0;
  const capacityPct = Math.min(100, Math.round((approvedCount / CAPACITY) * 100));
  const pendingAcceptEmail = stats?.pendingAcceptanceEmail ?? 0;
  const pendingRejectEmail = stats?.pendingRejectionEmail ?? 0;

  const statusBadge = (status: string) => {
    if (status === "APPROVED") return <Badge className="bg-green-500/15 text-green-600 border-green-200 border text-xs">Accepted</Badge>;
    if (status === "REJECTED") return <Badge className="bg-red-500/15 text-red-600 border-red-200 border text-xs">Rejected</Badge>;
    if (status === "AI_REVIEWED") return <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 border text-xs">AI Reviewed</Badge>;
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-200 border text-xs">Pending Review</Badge>;
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-7 h-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Applications</h1>
                <p className="text-muted-foreground text-sm">Review member applications and AI screening results</p>
              </div>
            </div>
            <div>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) csvImportMutation.mutate(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => csvInputRef.current?.click()}
                disabled={csvImportMutation.isPending || !workspace?.id}
              >
                <Upload className="w-4 h-4 mr-2" />
                {csvImportMutation.isPending ? "Importing…" : "Import CSV"}
              </Button>
            </div>
          </div>
        </div>

        {/* CSV Import Result Dialog */}
        <Dialog open={!!csvResult} onOpenChange={() => setCsvResult(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>CSV Import Results</DialogTitle>
            </DialogHeader>
            {csvResult && (
              <div className="space-y-4 text-sm">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">{csvResult.imported} imported</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">{csvResult.warnings.length} warnings</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="font-medium">{csvResult.errors.length} errors</span>
                  </div>
                </div>

                {csvResult.warnings.length > 0 && (
                  <div>
                    <p className="font-medium text-yellow-700 mb-1">Warnings (skipped):</p>
                    <ul className="max-h-32 overflow-y-auto space-y-1 bg-yellow-50 rounded p-2">
                      {csvResult.warnings.map((w, i) => <li key={i} className="text-yellow-700">{w}</li>)}
                    </ul>
                  </div>
                )}
                {csvResult.errors.length > 0 && (
                  <div>
                    <p className="font-medium text-red-700 mb-1">Errors:</p>
                    <ul className="max-h-32 overflow-y-auto space-y-1 bg-red-50 rounded p-2">
                      {csvResult.errors.map((e, i) => <li key={i} className="text-red-700">{e}</li>)}
                    </ul>
                  </div>
                )}

                <p className="text-muted-foreground text-xs">
                  AI screening has been triggered for all imported applications. Onboarding emails sent to new participants.
                </p>
                <Button className="w-full" onClick={() => setCsvResult(null)}>Close</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="p-6 space-y-5">

          {/* Capacity bar */}
          <Card>
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Accepted capacity</span>
                </div>
                <span className={`text-sm font-bold ${approvedCount >= CAPACITY ? "text-red-500" : "text-foreground"}`}>
                  {approvedCount} / {CAPACITY}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${capacityPct >= 100 ? "bg-red-500" : capacityPct >= 80 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
              {approvedCount >= CAPACITY && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Capacity full — no more acceptances allowed
                </p>
              )}
            </CardContent>
          </Card>

          {/* Accepted leaderboard + Rejected side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Accepted Leaderboard */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-green-500" />
                    Accepted — Top {CAPACITY} by AI Score
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
                        <TableRow key={row.application.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(row)}>
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
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
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
                        <TableRow key={row.application.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(row)}>
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

          {/* Filters + All Applications table */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="AI_REVIEWED">AI Reviewed</SelectItem>
                <SelectItem value="APPROVED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {filtered.length} application{filtered.length !== 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No applications found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Idea</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>AI Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow
                        key={row.application.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setSelected(row)}
                      >
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {[row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">{row.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{row.application.ideaName || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.application.sector || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.application.submittedAt
                            ? new Date(row.application.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
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
                        <TableCell>{statusBadge(row.application.status)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Accept"
                              disabled={row.application.status === "APPROVED" || updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: row.application.id, data: { status: "APPROVED" } })}
                              className={`p-1.5 rounded-md transition-colors ${row.application.status === "APPROVED" ? "text-green-500 bg-green-50 cursor-default" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              title="Reject"
                              disabled={row.application.status === "REJECTED" || updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: row.application.id, data: { status: "REJECTED" } })}
                              className={`p-1.5 rounded-md transition-colors ${row.application.status === "REJECTED" ? "text-red-500 bg-red-50 cursor-default" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {selected && (
          <ApplicationDetailModal
            row={selected}
            onClose={() => setSelected(null)}
            onUpdate={(data) => updateMutation.mutate({ id: selected.application.id, data })}
            onRescreen={() => rescreenMutation.mutate(selected.application.id)}
            onRefine={async (context) => { await refineMutation.mutateAsync({ id: selected.application.id, additionalContext: context }); }}
            isPending={updateMutation.isPending || rescreenMutation.isPending || refineMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
