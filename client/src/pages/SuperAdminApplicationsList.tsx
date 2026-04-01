import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList } from "lucide-react";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { ApplicationDetailModal, AppRow } from "@/components/ApplicationDetailModal";
import toast from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

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
    pitchDeckUrl?: string | null;
    prototypeUrl?: string | null;
  };
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string | null;
  } | null;
  org: {
    id: string;
    name: string;
    slug: string;
  } | null;
  challenge: {
    id: string;
    title: string;
  } | null;
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SuperAdminApplicationsList() {
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<SuperAdminApplication | null>(null);

  const { data: adminApplications = [], isLoading: applicationsLoading } = useQuery<SuperAdminApplication[]>({
    queryKey: ["/api/super-admin/applications"],
    queryFn: () => apiFetch("/api/super-admin/applications"),
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

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Applications</h1>
              <p className="text-muted-foreground">Review all member applications</p>
            </div>
          </div>

          {/* Applications Table */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Member Applications</CardTitle>
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
                    {adminApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                          No applications yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      adminApplications.map((row) => (
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
                            {row.application.status === "APPROVED" && (
                              <Badge className="bg-green-500/15 text-green-600 border-green-200 border text-xs">Accepted</Badge>
                            )}
                            {row.application.status === "REJECTED" && (
                              <Badge className="bg-red-500/15 text-red-600 border-red-200 border text-xs">Rejected</Badge>
                            )}
                            {row.application.status === "PENDING_REVIEW" && (
                              <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-200 border text-xs">Pending Review</Badge>
                            )}
                            {row.application.status === "AI_REVIEWED" && (
                              <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 border text-xs">AI Reviewed</Badge>
                            )}
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

      {/* Application Detail Modal */}
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

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
