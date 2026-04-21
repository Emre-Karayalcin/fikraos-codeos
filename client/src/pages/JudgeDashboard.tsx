import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/editor/RichTextViewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";
import {
  CheckCircle, Star, Trophy, FileText, Globe, Send,
  ChevronDown, ChevronRight, Brain, ClipboardList, BarChart2,
  User, Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JudgeIdea {
  projectId: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  pitchDeckUrl: string | null;
  submitted: boolean | null;
  deploymentUrl: string | null;
  ownerName: string;
  scored: boolean;
  totalScore: number | null;
  pmoScore: number | null;
  aiScore: number | null;
}

interface JudgeEvaluation {
  d1: number | null; d2: number | null; d3: number | null; d4: number | null; d5: number | null;
  p1: number | null; p2: number | null; p3: number | null; p4: number | null;
  e1: number | null; e2: number | null; e3: number | null;
  totalScore: number | null;
}

interface LeaderboardRow {
  projectId: string;
  title: string;
  tags: string[] | null;
  status: string;
  ownerName: string;
  aiScore: number | null;
  aiInsights: string | null;
  aiStrengths: any;
  aiRecommendations: any;
  aiMetrics: any;
  pmoScore: number | null;
  pmoBusinessScore: number | null;
  pmoTechnicalScore: number | null;
  pmoStrategicScore: number | null;
}

// ─── Scoring form constants ────────────────────────────────────────────────────

const DEMO_DECK_QUESTIONS = [
  { key: "d1", label: "Sector", weight: 8 },
  { key: "d2", label: "Solution statement", weight: 8 },
  { key: "d3", label: "Prototype slide", weight: 8 },
  { key: "d4", label: "Target audience", weight: 8 },
  { key: "d5", label: "Revenue streams", weight: 8 },
];
const PITCHING_QUESTIONS = [
  { key: "p1", label: "Time allocated", weight: 8 },
  { key: "p2", label: "Problem demonstrated", weight: 8 },
  { key: "p3", label: "Solution demonstrated", weight: 8 },
  { key: "p4", label: "Storytelling & body language", weight: 6 },
];
const EVAL_QUESTIONS = [
  { key: "e1", label: "Market research evidence", weight: 10 },
  { key: "e2", label: "Impact measurable", weight: 10 },
  { key: "e3", label: "National/sector priorities", weight: 10 },
];

type ScoreMap = Record<string, number | null>;

function computeTotal(scores: ScoreMap): number {
  const s = (key: string, w: number) => {
    const v = scores[key];
    return v != null ? (v / 5) * w : 0;
  };
  return Math.round(
    s("d1",8)+s("d2",8)+s("d3",8)+s("d4",8)+s("d5",8)+
    s("p1",8)+s("p2",8)+s("p3",8)+s("p4",6)+
    s("e1",10)+s("e2",10)+s("e3",10)
  );
}

// ─── Scoring dialog sub-components ────────────────────────────────────────────

function RatingButtons({ questionKey, value, onChange }: { questionKey: string; value: number | null; onChange: (k: string, v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(questionKey, n)}
          className={`w-8 h-8 rounded text-sm font-semibold border transition-colors ${
            value === n ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ScoreSection({ title, totalPct, questions, scores, onChange }: {
  title: string; totalPct: number;
  questions: { key: string; label: string; weight: number }[];
  scores: ScoreMap; onChange: (k: string, v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">{title} <span className="text-muted-foreground font-normal">({totalPct}%)</span></h4>
      {questions.map((q) => (
        <div key={q.key} className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-sm">{q.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">{q.weight}%</span>
          </div>
          <RatingButtons questionKey={q.key} value={scores[q.key] ?? null} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}

function ScoringDialog({ idea, orgId, open, onClose }: {
  idea: JudgeIdea; orgId: string; open: boolean; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: existing } = useQuery<JudgeEvaluation>({
    queryKey: ["/api/judge/evaluations", orgId, idea.projectId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/judge/evaluations/${idea.projectId}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open,
    retry: false,
  });

  const [scores, setScores] = useState<ScoreMap>({});
  useEffect(() => {
    if (existing) {
      const filled: ScoreMap = {};
      [...DEMO_DECK_QUESTIONS, ...PITCHING_QUESTIONS, ...EVAL_QUESTIONS].forEach(({ key }) => {
        filled[key] = (existing as any)[key] ?? null;
      });
      setScores(filled);
    }
  }, [existing]);

  const handleChange = (key: string, value: number) => setScores((prev) => ({ ...prev, [key]: value }));
  const totalScore = computeTotal(scores);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/judge/evaluations/${idea.projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(scores),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Score saved!");
      queryClient.invalidateQueries({ queryKey: ["/api/judge/ideas", orgId] });
      queryClient.invalidateQueries({ queryKey: ["/api/judge/evaluations", orgId, idea.projectId] });
      onClose();
    },
    onError: () => toast.error("Failed to save score"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Score: {idea.title}
          </DialogTitle>
          <DialogDescription>Owner: {idea.ownerName}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="font-semibold text-sm">Total Score</span>
          <span className="text-2xl font-bold text-primary">{totalScore}<span className="text-sm text-muted-foreground">/100</span></span>
        </div>
        <div className="space-y-6 pt-2">
          <ScoreSection title="Demo Deck Slides" totalPct={40} questions={DEMO_DECK_QUESTIONS} scores={scores} onChange={handleChange} />
          <ScoreSection title="Pitching Quality" totalPct={30} questions={PITCHING_QUESTIONS} scores={scores} onChange={handleChange} />
          <ScoreSection title="Project Evaluation" totalPct={30} questions={EVAL_QUESTIONS} scores={scores} onChange={handleChange} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Score"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Idea card ─────────────────────────────────────────────────────────────────

const CARD_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-violet-600 to-purple-700",
  "from-emerald-600 to-teal-700",
  "from-rose-600 to-pink-700",
  "from-amber-600 to-orange-700",
];

function ideaGradient(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

function IdeaCard({ idea, onClick, disabled }: { idea: JudgeIdea; onClick: () => void; disabled?: boolean }) {
  const gradient = ideaGradient(idea.title);
  const initials = idea.ownerName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all ${
        disabled
          ? 'opacity-40 cursor-not-allowed select-none'
          : 'hover:shadow-md cursor-pointer group'
      }`}
    >
      {/* Colored header */}
      <div className={`bg-gradient-to-br ${gradient} px-4 pt-4 pb-6 relative`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-white text-base leading-snug line-clamp-2">{idea.title}</h3>
          {idea.scored ? (
            <span className="shrink-0 flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              <CheckCircle className="w-3 h-3" /> Scored
            </span>
          ) : (
            <span className="shrink-0 bg-white/10 text-white/80 text-xs px-2 py-0.5 rounded-full font-medium border border-white/20">Pending</span>
          )}
        </div>
        {/* Owner */}
        <div className="flex items-center gap-1.5 mt-3">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
          <span className="text-white/80 text-xs">{idea.ownerName}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-4 space-y-3 -mt-3 bg-card rounded-t-2xl relative">
        {/* Description */}
        {idea.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{idea.description}</p>
        )}

        {/* Scores row — judge's own score only */}
        <div className="flex items-center gap-2 flex-wrap">
          {idea.scored && idea.totalScore != null && (
            <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs px-2 py-1 rounded-lg font-semibold">
              <Star className="w-3 h-3" />
              My Score: {idea.totalScore}
            </div>
          )}
        </div>

        {/* Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {idea.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{tag}</span>
            ))}
          </div>
        )}

        {/* Attachments */}
        <div className="flex flex-wrap gap-1.5">
          {idea.submitted && (
            <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
              <Send className="w-3 h-3" /> Submitted
            </span>
          )}
          {idea.pitchDeckUrl && (
            <span className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full">
              <FileText className="w-3 h-3" /> Pitch Deck
            </span>
          )}
          {idea.deploymentUrl && (
            <span className="flex items-center gap-1 text-xs bg-sky-500/10 text-sky-600 px-2 py-0.5 rounded-full">
              <Globe className="w-3 h-3" /> Prototype
            </span>
          )}
        </div>

        {/* CTA */}
        <Button
          size="sm"
          variant={idea.scored ? "outline" : "default"}
          className="w-full"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          {idea.scored ? "Edit Score" : "Score Idea"}
        </Button>
      </div>
    </div>
  );
}

// ─── Leaderboard tab ───────────────────────────────────────────────────────────

function LeaderboardTab({ orgId }: { orgId: string }) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery<LeaderboardRow[]>({
    queryKey: ["/api/judge/program-leaderboard", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/judge/program-leaderboard`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (rows.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>No evaluated ideas yet.</p>
    </div>
  );

  // Sort by AI score desc (nulls last)
  const sorted = [...rows].sort((a, b) => {
    if (a.aiScore == null && b.aiScore == null) return 0;
    if (a.aiScore == null) return 1;
    if (b.aiScore == null) return -1;
    return b.aiScore - a.aiScore;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <Star className="w-4 h-4 text-yellow-500" />
        <h2 className="font-semibold text-sm">Program Leaderboard</h2>
        <span className="text-xs text-muted-foreground">click a row to expand details</span>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-10 text-center">Rank</TableHead>
              <TableHead>Idea</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, idx) => (
              <>
                <TableRow
                  key={row.projectId}
                  className={`cursor-pointer hover:bg-muted/30 ${
                    idx === 0 ? 'bg-yellow-500/5' : idx === 1 ? 'bg-gray-400/5' : idx === 2 ? 'bg-amber-700/5' : ''
                  }`}
                  onClick={() => setExpandedRow(expandedRow === row.projectId ? null : row.projectId)}
                >
                  <TableCell className="text-muted-foreground">
                    {expandedRow === row.projectId
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />
                    }
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm max-w-[200px] truncate">{row.title}</div>
                    {row.tags && row.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {row.tags.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-xs px-1.5 py-0 bg-muted rounded-full text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.ownerName}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      row.status === 'IN_INCUBATION'
                        ? 'bg-purple-500/10 text-purple-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {row.status === 'IN_INCUBATION' ? 'Demo Day' : 'Pre-Demo'}
                    </span>
                  </TableCell>
                </TableRow>

                {expandedRow === row.projectId && (
                  <TableRow key={`${row.projectId}-expand`}>
                    <TableCell colSpan={5} className="p-0 bg-muted/20">
                      <div className="px-6 py-4 grid gap-4 sm:grid-cols-2">
                        {/* AI Review */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-600 dark:text-blue-400">
                            <Brain className="w-3.5 h-3.5" /> AI Screening Review
                          </div>
                          {row.aiInsights && (
                            <p className="text-xs text-muted-foreground leading-relaxed bg-background rounded-lg p-3 border border-border">{row.aiInsights}</p>
                          )}
                          {Array.isArray(row.aiStrengths) && row.aiStrengths.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">Strengths</p>
                              <ul className="space-y-0.5">
                                {row.aiStrengths.slice(0, 3).map((s: string, i: number) => (
                                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-green-500 shrink-0">✓</span>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {Array.isArray(row.aiRecommendations) && row.aiRecommendations.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-600 mb-1">Recommendations</p>
                              <ul className="space-y-0.5">
                                {row.aiRecommendations.slice(0, 3).map((r: string, i: number) => (
                                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-amber-500 shrink-0">→</span>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {!row.aiInsights && (!Array.isArray(row.aiStrengths) || row.aiStrengths.length === 0) && (
                            <p className="text-xs text-muted-foreground italic">No AI review available.</p>
                          )}
                        </div>

                        {/* PMO Scores */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-purple-600 dark:text-purple-400">
                            <ClipboardList className="w-3.5 h-3.5" /> PMO Evaluation
                          </div>
                          {row.pmoScore != null ? (
                            <div className="bg-background rounded-lg p-3 border border-border space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Total Score</span>
                                <span className="font-bold text-purple-600">{row.pmoScore}/100</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Business Viability (40%)</span>
                                <span className="font-medium">{row.pmoBusinessScore}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Technical Maturity (30%)</span>
                                <span className="font-medium">{row.pmoTechnicalScore}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Strategic Alignment (30%)</span>
                                <span className="font-medium">{row.pmoStrategicScore}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No PMO evaluation yet.</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function JudgeDashboard() {
  const search = useSearch();
  const activeTab = new URLSearchParams(search).get('tab') === 'leaderboard' ? 'leaderboard' : 'scoring';

  const { data: orgs } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const orgId = Array.isArray(orgs) ? orgs[0]?.id : undefined;

  // COI (Conflict-of-Interest) declaration — checked once per idea
  const [coiPendingIdea, setCoiPendingIdea] = useState<JudgeIdea | null>(null);
  const [coiAgreed, setCoiAgreed] = useState(false);

  const { data: coiDeclaration } = useQuery<any>({
    queryKey: ["/api/declarations/active/judge-coi", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/declarations/active?type=JUDGE_COI`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgId,
  });

  const acceptCoiMutation = useMutation({
    mutationFn: async ({ declarationId, projectId }: { declarationId: string; projectId: string }) => {
      const res = await fetch(`/api/workspaces/${orgId}/declarations/${declarationId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      const idea = coiPendingIdea;
      setCoiPendingIdea(null);
      setCoiAgreed(false);
      setSelectedIdea(idea);
    },
  });

  async function handleScoreClick(idea: JudgeIdea) {
    if (!coiDeclaration || !orgId) { setSelectedIdea(idea); return; }
    try {
      const res = await fetch(
        `/api/workspaces/${orgId}/declarations/has-accepted?declarationId=${coiDeclaration.id}&projectId=${idea.projectId}`,
        { credentials: "include" },
      );
      const { accepted } = await res.json();
      if (accepted) { setSelectedIdea(idea); } else { setCoiPendingIdea(idea); }
    } catch { setSelectedIdea(idea); }
  }

  const [selectedIdea, setSelectedIdea] = useState<JudgeIdea | null>(null);

  const { data: ideas = [], isLoading } = useQuery<JudgeIdea[]>({
    queryKey: ["/api/judge/ideas", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/judge/ideas`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  // Poll for current presenter (Demo Day control)
  const { data: presState } = useQuery<{ project: { id: string } | null }>({
    queryKey: ["/api/presentation/current", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/presentation/current`, { credentials: "include" });
      if (!res.ok) return { project: null };
      return res.json();
    },
    enabled: !!orgId,
    refetchInterval: 8000,
  });

  const currentPresentingId = presState?.project?.id ?? null;

  const scoredCount = ideas.filter((i) => i.scored).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <UnifiedSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500/10 rounded-xl">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Judge Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'scoring' ? `${scoredCount}/${ideas.length} ideas scored` : 'Program leaderboard'}
                </p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <a
                href="?tab=scoring"
                onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '?tab=scoring'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'scoring' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Star className="w-3.5 h-3.5" /> Scoring
              </a>
              <a
                href="?tab=leaderboard"
                onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '?tab=leaderboard'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'leaderboard' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Leaderboard
              </a>
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'scoring' ? (
            isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No ideas in Demo Day &amp; Final Selection yet.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ideas.map((idea) => (
                  <IdeaCard
                    key={idea.projectId}
                    idea={idea}
                    onClick={() => handleScoreClick(idea)}
                    disabled={currentPresentingId === null || idea.projectId !== currentPresentingId}
                  />
                ))}
              </div>
            )
          ) : (
            orgId && <LeaderboardTab orgId={orgId} />
          )}

        </div>
      </main>

      <BottomNavigation />

      {selectedIdea && orgId && (
        <ScoringDialog
          idea={selectedIdea}
          orgId={orgId}
          open={!!selectedIdea}
          onClose={() => setSelectedIdea(null)}
        />
      )}

      {/* COI declaration modal — shown before scoring dialog when not yet accepted for this idea */}
      {coiPendingIdea && coiDeclaration && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent
            className="max-w-2xl max-h-[85vh] overflow-y-auto [&>button]:hidden"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{coiDeclaration.title}</DialogTitle>
              <DialogDescription>
                Please confirm before scoring: <strong>{coiPendingIdea.title}</strong>
              </DialogDescription>
            </DialogHeader>
            <RichTextViewer content={coiDeclaration.content} className="text-sm" />
            <div className="space-y-3 pt-4 border-t">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coiAgreed}
                  onChange={(e) => setCoiAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600"
                />
                <span className="text-sm">I confirm I have no conflict of interest with this specific idea</span>
              </label>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setCoiPendingIdea(null); setCoiAgreed(false); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!coiAgreed || acceptCoiMutation.isPending}
                  onClick={() => acceptCoiMutation.mutate({ declarationId: coiDeclaration.id, projectId: coiPendingIdea.projectId })}
                >
                  {acceptCoiMutation.isPending ? "Saving…" : "Proceed to Score"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
