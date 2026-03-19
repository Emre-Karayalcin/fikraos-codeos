import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ClipboardList, Search } from "lucide-react";
import toast from "react-hot-toast";
import { ApplicationDetailModal, type AppRow } from "@/components/ApplicationDetailModal";

type AppRowFull = AppRow & {
  application: AppRow["application"] & {
    submittedAt?: string | null;
  };
};

export default function AdminApplications() {
  const { slug } = useParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selected, setSelected] = useState<AppRowFull | null>(null);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      fetch(`/api/workspaces/${workspace!.id}/admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then((r) => { if (!r.ok) throw new Error("Update failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${workspace?.id}/admin/applications`] });
      toast.success("Application updated");
    },
    onError: () => toast.error("Failed to update application"),
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
          <div className="flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Applications</h1>
              <p className="text-muted-foreground text-sm">Review member applications and AI screening results</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters */}
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
