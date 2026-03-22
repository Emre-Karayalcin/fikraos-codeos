import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import { CheckCircle, Star, Trophy } from "lucide-react";

interface JudgeIdea {
  projectId: string;
  title: string;
  tags: string[] | null;
  ownerName: string;
  scored: boolean;
  totalScore: number | null;
}

interface JudgeEvaluation {
  d1: number | null; d2: number | null; d3: number | null; d4: number | null; d5: number | null;
  p1: number | null; p2: number | null; p3: number | null; p4: number | null;
  e1: number | null; e2: number | null; e3: number | null;
  totalScore: number | null;
}

const DEMO_DECK_QUESTIONS = [
  { key: "d1", label: "Problem statement", weight: 8 },
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
  const s = (key: string, weight: number) => {
    const v = scores[key];
    return v != null ? (v / 5) * weight : 0;
  };
  return Math.round(
    s("d1",8)+s("d2",8)+s("d3",8)+s("d4",8)+s("d5",8)+
    s("p1",8)+s("p2",8)+s("p3",8)+s("p4",6)+
    s("e1",10)+s("e2",10)+s("e3",10)
  );
}

function RatingButtons({ questionKey, value, onChange }: { questionKey: string; value: number | null; onChange: (k: string, v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(questionKey, n)}
          className={`w-8 h-8 rounded text-sm font-semibold border transition-colors ${
            value === n
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-muted"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ScoreSection({ title, totalPct, questions, scores, onChange }: {
  title: string;
  totalPct: number;
  questions: { key: string; label: string; weight: number }[];
  scores: ScoreMap;
  onChange: (k: string, v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm text-foreground">
        {title} <span className="text-muted-foreground font-normal">({totalPct}%)</span>
      </h4>
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
  idea: JudgeIdea;
  orgId: string;
  open: boolean;
  onClose: () => void;
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

  // Pre-fill scores when existing evaluation loads
  useEffect(() => {
    if (existing) {
      const filled: ScoreMap = {};
      [...DEMO_DECK_QUESTIONS, ...PITCHING_QUESTIONS, ...EVAL_QUESTIONS].forEach(({ key }) => {
        filled[key] = (existing as any)[key] ?? null;
      });
      setScores(filled);
    }
  }, [existing]);

  const handleChange = (key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

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

        {/* Live total */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="font-semibold text-sm">Total Score</span>
          <span className="text-2xl font-bold text-primary">{totalScore}<span className="text-sm text-muted-foreground">/100</span></span>
        </div>

        <div className="space-y-6 pt-2">
          <ScoreSection
            title="Demo Deck Slides"
            totalPct={40}
            questions={DEMO_DECK_QUESTIONS}
            scores={scores}
            onChange={handleChange}
          />
          <ScoreSection
            title="Pitching Quality"
            totalPct={30}
            questions={PITCHING_QUESTIONS}
            scores={scores}
            onChange={handleChange}
          />
          <ScoreSection
            title="Project Evaluation"
            totalPct={30}
            questions={EVAL_QUESTIONS}
            scores={scores}
            onChange={handleChange}
          />
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

export default function JudgeDashboard() {
  const { data: orgs } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const orgId = Array.isArray(orgs) ? orgs[0]?.id : undefined;

  const { data: ideas = [], isLoading } = useQuery<JudgeIdea[]>({
    queryKey: ["/api/judge/ideas", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/judge/ideas`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  const [selectedIdea, setSelectedIdea] = useState<JudgeIdea | null>(null);

  const scoredCount = ideas.filter((i) => i.scored).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <UnifiedSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Judge Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {scoredCount}/{ideas.length} ideas scored
              </p>
            </div>
          </div>

          {/* Idea list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No ideas in Demo Day &amp; Final Selection yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {ideas.map((idea) => (
                <div
                  key={idea.projectId}
                  onClick={() => setSelectedIdea(idea)}
                  className="p-4 border border-border rounded-xl bg-card hover:bg-muted/50 cursor-pointer transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug">{idea.title}</h3>
                    {idea.scored ? (
                      <Badge className="shrink-0 gap-1 bg-green-500/10 text-green-600 border-green-200">
                        <CheckCircle className="w-3 h-3" />
                        Scored
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">Pending</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{idea.ownerName}</p>
                  {idea.scored && idea.totalScore != null && (
                    <p className="text-xs font-medium text-primary">Score: {idea.totalScore}/100</p>
                  )}
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {idea.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant={idea.scored ? "outline" : "default"} className="w-full mt-1">
                    {idea.scored ? "Edit Score" : "Score Idea"}
                  </Button>
                </div>
              ))}
            </div>
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
    </div>
  );
}
