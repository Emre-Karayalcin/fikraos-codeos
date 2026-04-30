import { useQuery } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  BarChart3, Users, Trophy, Lightbulb, TrendingUp, ArrowRight, HandCoins, CalendarCheck, AlertCircle, UserCheck,
} from "lucide-react";

interface DashboardStats {
  totalIdeas: number;
  totalMembers: number;
  totalChallenges: number;
  pipeline: Record<string, number>;
}

interface LeaderboardEntry {
  projectId: string;
  title: string;
  tags: string[] | null;
  status: string;
  ownerName: string;
  aiScore: number | null;
  pmoScore: number | null;
  pmoBusinessScore: number | null;
  pmoTechnicalScore: number | null;
  pmoStrategicScore: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  IN_INCUBATION: "In Incubation",
  ARCHIVED: "Results Published",
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-gray-500/15 text-gray-500",
  UNDER_REVIEW: "bg-blue-500/15 text-blue-500",
  SHORTLISTED: "bg-yellow-500/15 text-yellow-600",
  IN_INCUBATION: "bg-orange-500/15 text-orange-600",
  ARCHIVED: "bg-green-500/15 text-green-600",
};

const PIPELINE_ORDER = ["BACKLOG", "UNDER_REVIEW", "SHORTLISTED", "IN_INCUBATION", "ARCHIVED"];

export default function ClientDashboard() {
  const { slug } = useParams<{ slug?: string }>();
  const { workspaceSlug } = useWorkspace();
  const currentSlug = slug || workspaceSlug;
  const [, setLocation] = useLocation();

  const { data: orgs } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const orgId = Array.isArray(orgs) ? orgs[0]?.id : undefined;

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/client/dashboard-stats", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/client/dashboard-stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: consultationStats } = useQuery<any>({
    queryKey: ["/api/client/consultation-analytics", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/client/consultation-analytics`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/client/leaderboard", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/client/leaderboard`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  const totalIdeas = stats?.totalIdeas ?? 0;
  const pipeline = stats?.pipeline ?? {};
  const topIdeas = leaderboard.slice(0, 5);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <UnifiedSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Executive Dashboard</h1>
              <p className="text-sm text-muted-foreground">Program overview — read-only</p>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Ideas", value: stats?.totalIdeas ?? "—", icon: Lightbulb, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Participants", value: stats?.totalMembers ?? "—", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Challenges", value: stats?.totalChallenges ?? "—", icon: Trophy, color: "text-orange-500", bg: "bg-orange-500/10" },
            ].map((card) => (
              <div key={card.label} className="border border-border rounded-xl p-5 flex items-center gap-4">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsLoading ? "…" : card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div className="border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Idea Pipeline</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {PIPELINE_ORDER.map((status) => {
                const count = pipeline[status] ?? 0;
                const pct = totalIdeas > 0 ? Math.round((count / totalIdeas) * 100) : 0;
                return (
                  <div key={status} className="flex flex-col gap-1.5">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{STATUS_LABELS[status]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consultation Analytics */}
          {consultationStats && (
            <div className="border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <HandCoins className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Consultation</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Sessions", value: consultationStats.totalSessions ?? 0, sub: `${consultationStats.completedSessions ?? 0} completed`, icon: CalendarCheck, color: "text-violet-600", bg: "bg-violet-500/10" },
                  { label: "Credits Awarded", value: consultationStats.totalCreditsAwarded ?? 0, sub: `${consultationStats.uniqueParticipantsWithCredits ?? 0} participants`, icon: HandCoins, color: "text-amber-600", bg: "bg-amber-500/10" },
                  { label: "No-Shows", value: consultationStats.noShows ?? 0, sub: "unconfirmed on completed", icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
                  { label: "Utilisation", value: `${consultationStats.utilizationRate ?? 0}%`, sub: "participants with credits", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                ].map(card => (
                  <div key={card.label} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${card.bg} shrink-0`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-tight">{card.value}</p>
                      <p className="text-xs font-medium">{card.label}</p>
                      <p className="text-xs text-muted-foreground">{card.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Ideas */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Top Scoring Ideas</h2>
              {leaderboard.length > 5 && currentSlug && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-primary"
                  onClick={() => setLocation(`/w/${currentSlug}/client/leaderboard`)}
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {topIdeas.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-6">No scored ideas yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-xs text-muted-foreground font-medium">#</th>
                    <th className="text-left px-5 py-2.5 text-xs text-muted-foreground font-medium">Idea</th>
                    <th className="text-left px-5 py-2.5 text-xs text-muted-foreground font-medium">Status</th>
                    <th className="text-right px-5 py-2.5 text-xs text-muted-foreground font-medium">AI Score</th>
                    <th className="text-right px-5 py-2.5 text-xs text-muted-foreground font-medium">PMO Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topIdeas.map((idea, i) => (
                    <tr key={idea.projectId} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{idea.title}</p>
                        <p className="text-xs text-muted-foreground">{idea.ownerName}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[idea.status] ?? ""}`} variant="secondary">
                          {STATUS_LABELS[idea.status] ?? idea.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm">
                        {idea.aiScore != null ? idea.aiScore.toFixed(1) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm">
                        {idea.pmoScore != null ? idea.pmoScore : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
