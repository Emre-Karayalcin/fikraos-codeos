import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart2, Users, Trophy, CheckCircle, XCircle, FileText, Activity, UserCog, UserMinus, Layers, CalendarClock, PencilLine } from "lucide-react";

interface Totals {
  totalSubmissions: number;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalInvites: number;
}

interface SubmissionRow {
  workspaceId: string;
  workspaceName: string;
  challengeId: string;
  challengeTitle: string;
  totalSubmissions: number;
  withPitchDeck: number;
  withPrototype: number;
  firstSubmissionAt: string | null;
  lastSubmissionAt: string | null;
}

interface ApplicationRow {
  workspaceId: string;
  workspaceName: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  aiReviewed: number;
}

interface InviteRow {
  workspaceId: string;
  workspaceName: string;
  totalInvited: number;
  members: number;
  mentors: number;
  admins: number;
}

interface ActivityLogEntry {
  type: "submission" | "application" | "invite" | "ROLE_UPDATED" | "MEMBER_REMOVED" | "IDEA_STATUS_CHANGED" | "PROGRAM_PROGRESS_UPDATED";
  id: string;
  eventAt: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  detail: string | null;
  subDetail: string | null;
  workspaceName: string;
  workspaceSlug: string;
  status: string | null;
}

interface InsightsData {
  totals: Totals;
  submissions: SubmissionRow[];
  applications: ApplicationRow[];
  invites: InviteRow[];
  activityLog: ActivityLogEntry[];
}

interface EditHistoryEntry {
  id: string;
  label: string;
  editedAt: string;
  assetTitle: string;
  assetKind: string;
  projectId: string;
  projectTitle: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  username: string | null;
  workspaceName?: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface Challenge {
  challenge: { id: string; title: string };
}

export default function SuperAdminActivityInsights() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("all");
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("all");

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["/api/super-admin/workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/workspaces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });

  const { data: challengesData } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges", selectedWorkspaceId],
    queryFn: async () => {
      if (selectedWorkspaceId === "all") return [];
      const res = await fetch(`/api/challenges?orgId=${selectedWorkspaceId}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: selectedWorkspaceId !== "all",
  });

  const challenges = challengesData || [];

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (selectedWorkspaceId !== "all") params.set("workspaceId", selectedWorkspaceId);
    if (selectedChallengeId !== "all") params.set("challengeId", selectedChallengeId);
    const qs = params.toString();
    return `/api/super-admin/activity-insights${qs ? `?${qs}` : ""}`;
  };

  const { data, isLoading } = useQuery<InsightsData>({
    queryKey: ["/api/super-admin/activity-insights", selectedWorkspaceId, selectedChallengeId],
    queryFn: async () => {
      const res = await fetch(buildUrl(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
  });

  const buildEditHistoryUrl = () => {
    const params = new URLSearchParams();
    if (selectedWorkspaceId !== "all") params.set("workspaceId", selectedWorkspaceId);
    const qs = params.toString();
    return `/api/super-admin/edit-history${qs ? `?${qs}` : ""}`;
  };

  const { data: editHistory = [] } = useQuery<EditHistoryEntry[]>({
    queryKey: ["/api/super-admin/edit-history", selectedWorkspaceId],
    queryFn: async () => {
      const res = await fetch(buildEditHistoryUrl(), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const totals = data?.totals;
  const submissions = data?.submissions || [];
  const applications = data?.applications || [];
  const invites = data?.invites || [];
  const activityLog = data?.activityLog || [];

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const fmtFull = (d: string | null) =>
    d
      ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";

  const activityTypeBadge = (entry: ActivityLogEntry) => {
    if (entry.type === "submission") return <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-500/10 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">🏆 Submission</span>;
    if (entry.type === "application") {
      if (entry.status === "APPROVED") return <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-200 rounded-full px-2 py-0.5">✓ Approved</span>;
      if (entry.status === "REJECTED") return <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-red-500/10 text-red-600 border border-red-200 rounded-full px-2 py-0.5">✗ Rejected</span>;
      if (entry.status === "AI_REVIEWED") return <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-purple-500/10 text-purple-600 border border-purple-200 rounded-full px-2 py-0.5">🤖 AI Reviewed</span>;
      return <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-200 rounded-full px-2 py-0.5">⏳ Applied</span>;
    }
    if (entry.type === "ROLE_UPDATED") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-violet-500/10 text-violet-600 border border-violet-200 rounded-full px-2 py-0.5">
        <UserCog className="w-3 h-3" /> Role Updated
      </span>
    );
    if (entry.type === "MEMBER_REMOVED") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-red-500/10 text-red-600 border border-red-200 rounded-full px-2 py-0.5">
        <UserMinus className="w-3 h-3" /> Removed
      </span>
    );
    if (entry.type === "IDEA_STATUS_CHANGED") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-cyan-500/10 text-cyan-600 border border-cyan-200 rounded-full px-2 py-0.5">
        <Layers className="w-3 h-3" /> Idea Status
      </span>
    );
    if (entry.type === "PROGRAM_PROGRESS_UPDATED") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5">
        <CalendarClock className="w-3 h-3" /> Program Updated
      </span>
    );
    return <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-orange-500/10 text-orange-600 border border-orange-200 rounded-full px-2 py-0.5">👤 Joined</span>;
  };

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Activity Insights</h1>
                <p className="text-muted-foreground">Cross-workspace submissions, applications, and invites — all time</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Select value={selectedWorkspaceId} onValueChange={(v) => { setSelectedWorkspaceId(v); setSelectedChallengeId("all"); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Workspaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {challenges.length > 0 && (
                <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All Challenges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Challenges</SelectItem>
                    {challenges.map((c) => (
                      <SelectItem key={c.challenge.id} value={c.challenge.id}>{c.challenge.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Totals row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground font-medium">Submissions</span>
                  </div>
                  <div className="text-3xl font-bold">{totals?.totalSubmissions ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground font-medium">Applications</span>
                  </div>
                  <div className="text-3xl font-bold">{totals?.totalApplications ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground font-medium">Approved</span>
                  </div>
                  <div className="text-3xl font-bold">{totals?.approvedApplications ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-muted-foreground font-medium">Rejected</span>
                  </div>
                  <div className="text-3xl font-bold">{totals?.rejectedApplications ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground font-medium">Invited</span>
                  </div>
                  <div className="text-3xl font-bold">{totals?.totalInvites ?? 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Log — individual events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Activity Log
                  <span className="text-xs font-normal text-muted-foreground ml-1">(latest 200 events, all time)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-5">No activity recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Date</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Event</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Detail</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Workspace</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLog.map((entry, i) => (
                          <tr key={`${entry.type}-${entry.id}-${i}`} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtFull(entry.eventAt)}</td>
                            <td className="px-4 py-2.5">{activityTypeBadge(entry)}</td>
                            <td className="px-4 py-2.5">
                              <div className="text-xs font-medium">{[entry.firstName, entry.lastName].filter(Boolean).join(" ") || "—"}</div>
                              <div className="text-xs text-muted-foreground">{entry.email}</div>
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              {entry.detail && <span className="font-medium">{entry.detail}</span>}
                              {entry.subDetail && entry.type === "submission" && (
                                <span className="text-muted-foreground"> · {entry.subDetail}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{entry.workspaceName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Output Edit History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PencilLine className="w-4 h-4 text-violet-500" />
                  AI Output Edit History
                  <span className="text-xs font-normal text-muted-foreground ml-1">(latest 200 edits, all time)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {editHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-5">No edits recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Date</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Idea</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Asset</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editHistory.map((entry) => (
                          <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtFull(entry.editedAt)}</td>
                            <td className="px-4 py-2.5">
                              <div className="text-xs font-medium">{[entry.firstName, entry.lastName].filter(Boolean).join(" ") || "—"}</div>
                              <div className="text-xs text-muted-foreground">{entry.email}</div>
                            </td>
                            <td className="px-4 py-2.5 text-xs font-medium">{entry.projectTitle || "—"}</td>
                            <td className="px-4 py-2.5">
                              <div className="text-xs font-medium">{entry.assetTitle}</div>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-200">
                                {entry.assetKind?.replace(/_/g, " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submissions by challenge */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-blue-500" />
                  Submissions by Challenge
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {submissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-5">No submissions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Challenge</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Workspace</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Total</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Pitch Deck</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Prototype</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Last Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((row, i) => (
                          <tr key={`${row.challengeId}-${i}`} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3 font-medium">{row.challengeTitle}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.workspaceName}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="secondary">{row.totalSubmissions}</Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-medium ${row.withPitchDeck > 0 ? "text-blue-600" : "text-muted-foreground"}`}>
                                {row.withPitchDeck}/{row.totalSubmissions}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-medium ${row.withPrototype > 0 ? "text-purple-600" : "text-muted-foreground"}`}>
                                {row.withPrototype}/{row.totalSubmissions}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(row.lastSubmissionAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Applications by workspace */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Applications by Workspace
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {applications.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-6 pb-5">No applications yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Workspace</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Total</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground text-green-600">Approved</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground text-red-500">Rejected</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground text-yellow-600">Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((row) => (
                            <tr key={row.workspaceId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="px-5 py-3 font-medium">{row.workspaceName}</td>
                              <td className="px-3 py-3 text-center"><Badge variant="secondary">{row.total}</Badge></td>
                              <td className="px-3 py-3 text-center text-xs font-medium text-green-600">{row.approved}</td>
                              <td className="px-3 py-3 text-center text-xs font-medium text-red-500">{row.rejected}</td>
                              <td className="px-3 py-3 text-center text-xs font-medium text-yellow-600">{row.pending}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Members by workspace */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500" />
                    Members by Workspace
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {invites.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-6 pb-5">No members yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Workspace</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Total</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Members</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Mentors</th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Admins</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invites.map((row) => (
                            <tr key={row.workspaceId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="px-5 py-3 font-medium">{row.workspaceName}</td>
                              <td className="px-3 py-3 text-center"><Badge variant="secondary">{row.totalInvited}</Badge></td>
                              <td className="px-3 py-3 text-center text-xs font-medium">{row.members}</td>
                              <td className="px-3 py-3 text-center text-xs font-medium">{row.mentors}</td>
                              <td className="px-3 py-3 text-center text-xs font-medium">{row.admins}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
