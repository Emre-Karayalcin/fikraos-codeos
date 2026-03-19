import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart2, Users, Trophy, CheckCircle, XCircle, FileText } from "lucide-react";

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
  workspaceSlug: string;
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
}

interface InviteRow {
  workspaceId: string;
  workspaceName: string;
  totalInvited: number;
  members: number;
  mentors: number;
  admins: number;
}

interface InsightsData {
  totals: Totals;
  submissions: SubmissionRow[];
  applications: ApplicationRow[];
  invites: InviteRow[];
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

  const totals = data?.totals;
  const submissions = data?.submissions || [];
  const applications = data?.applications || [];
  const invites = data?.invites || [];

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

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
                <p className="text-muted-foreground">Cross-workspace submissions, applications, and invites</p>
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
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                              <span className="text-green-600">Approved</span>
                            </th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                              <span className="text-red-500">Rejected</span>
                            </th>
                            <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                              <span className="text-yellow-600">Pending</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((row) => (
                            <tr key={row.workspaceId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="px-5 py-3 font-medium">{row.workspaceName}</td>
                              <td className="px-3 py-3 text-center">
                                <Badge variant="secondary">{row.total}</Badge>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="text-xs font-medium text-green-600">{row.approved}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="text-xs font-medium text-red-500">{row.rejected}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="text-xs font-medium text-yellow-600">{row.pending}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invites by workspace */}
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
                              <td className="px-3 py-3 text-center">
                                <Badge variant="secondary">{row.totalInvited}</Badge>
                              </td>
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
