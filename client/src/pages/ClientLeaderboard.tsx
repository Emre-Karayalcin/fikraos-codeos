import { useQuery } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

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
  SHORTLISTED: "Shortlisted",
  IN_INCUBATION: "In Incubation",
  ARCHIVED: "Results Published",
};

const STATUS_COLORS: Record<string, string> = {
  SHORTLISTED: "bg-yellow-500/15 text-yellow-600",
  IN_INCUBATION: "bg-orange-500/15 text-orange-600",
  ARCHIVED: "bg-green-500/15 text-green-600",
};

function ScoreBar({ value, max = 100 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[48px]">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{value}</span>
    </div>
  );
}

export default function ClientLeaderboard() {
  const { data: orgs } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const orgId = Array.isArray(orgs) ? orgs[0]?.id : undefined;

  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/client/leaderboard", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/client/leaderboard`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <UnifiedSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 rounded-xl">
              <BarChart3 className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Leaderboard</h1>
              <p className="text-sm text-muted-foreground">Shortlisted & in-incubation ideas ranked by AI score</p>
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-10 text-center">No scored ideas yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium w-8">#</th>
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Idea</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-28">AI Score</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-28">PMO Score</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-28">Business</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-28">Technical</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-28">Strategic</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((idea, i) => (
                    <tr key={idea.projectId} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-5 py-3 font-medium text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{idea.title}</p>
                        <p className="text-xs text-muted-foreground">{idea.ownerName}</p>
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {idea.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{tag}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[idea.status] ?? ""}`} variant="secondary">
                          {STATUS_LABELS[idea.status] ?? idea.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3"><ScoreBar value={idea.aiScore != null ? Math.round(idea.aiScore) : null} /></td>
                      <td className="px-4 py-3"><ScoreBar value={idea.pmoScore} /></td>
                      <td className="px-4 py-3"><ScoreBar value={idea.pmoBusinessScore} /></td>
                      <td className="px-4 py-3"><ScoreBar value={idea.pmoTechnicalScore} /></td>
                      <td className="px-4 py-3"><ScoreBar value={idea.pmoStrategicScore} /></td>
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
