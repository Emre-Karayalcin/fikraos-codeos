import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RefreshCw, Sparkles, Pencil, Check, X } from "lucide-react";

export interface AppRow {
  application: {
    id: string;
    status: string;
    ideaName?: string | null;
    sector?: string | null;
    problemStatement?: string | null;
    solutionDescription?: string | null;
    differentiator?: string | null;
    targetUser?: string | null;
    relevantSkills?: string | null;
    previousWinner?: string | null;
    hasValidation?: string | null;
    validationDetails?: string | null;
    aiScore?: number | null;
    aiMetrics?: any[] | null;
    aiStrengths?: any[] | null;
    aiRecommendations?: any[] | null;
    aiInsights?: string | null;
  };
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  org?: { id: string; name: string; slug: string } | null;
  challenge?: { id: string; title: string } | null;
}

interface Props {
  row: AppRow;
  onClose: () => void;
  onUpdate: (data: Record<string, any>) => void;
  onRescreen: () => void;
  onRefine: (context: string) => Promise<void>;
  isPending: boolean;
}

function statusBadge(status: string) {
  if (status === "APPROVED") return <Badge className="bg-green-500/15 text-green-600 border-green-200 border text-xs">Approved</Badge>;
  if (status === "REJECTED") return <Badge className="bg-red-500/15 text-red-600 border-red-200 border text-xs">Rejected</Badge>;
  if (status === "AI_REVIEWED") return <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 border text-xs">AI Reviewed</Badge>;
  return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-200 border text-xs">Pending Review</Badge>;
}

export function ApplicationDetailModal({ row, onClose, onUpdate, onRescreen, onRefine, isPending }: Props) {
  const app = row.application;

  const initMetrics = () => (Array.isArray(app.aiMetrics) ? app.aiMetrics.map((m: any) => ({ ...m })) : []);
  const initStrengths = () => (Array.isArray(app.aiStrengths) ? [...(app.aiStrengths as string[])] : []);
  const initRecs = () => (Array.isArray(app.aiRecommendations) ? [...(app.aiRecommendations as string[])] : []);

  const [editMetrics, setEditMetrics] = useState<any[]>(initMetrics);
  const [editInsights, setEditInsights] = useState<string>(app.aiInsights || "");
  const [editStrengths, setEditStrengths] = useState<string[]>(initStrengths);
  const [editRecs, setEditRecs] = useState<string[]>(initRecs);
  const [editScoreFallback, setEditScoreFallback] = useState<number>(app.aiScore ?? 0);

  // Edit-with-AI state
  const [showEditAI, setShowEditAI] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  // Reset when row data changes (e.g. after AI refine)
  useEffect(() => {
    setEditMetrics(initMetrics());
    setEditInsights(app.aiInsights || "");
    setEditStrengths(initStrengths());
    setEditRecs(initRecs());
    setEditScoreFallback(app.aiScore ?? 0);
  }, [row]);

  // Auto-compute weighted overall score from editable metrics
  const computedScore =
    editMetrics.length > 0
      ? Math.round(editMetrics.reduce((sum, m) => sum + (Number(m.score) * Number(m.weight)) / 100, 0))
      : editScoreFallback;

  const updateMetricScore = (i: number, val: number) => {
    setEditMetrics((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], score: Math.max(0, Math.min(100, val)) };
      return next;
    });
  };

  const updateMetricRationale = (i: number, val: string) => {
    setEditMetrics((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], rationale: val };
      return next;
    });
  };

  const handleSaveAll = () => {
    onUpdate({
      aiScore: computedScore,
      aiMetrics: editMetrics,
      aiInsights: editInsights,
      aiStrengths: editStrengths,
      aiRecommendations: editRecs,
    });
  };

  const handleRefineSubmit = async () => {
    if (!aiContext.trim()) return;
    setIsRefining(true);
    try {
      await onRefine(aiContext.trim());
      setAiContext("");
      setShowEditAI(false);
    } finally {
      setIsRefining(false);
    }
  };

  const qaItems = [
    { label: "Idea Name", value: app.ideaName },
    { label: "Sector", value: app.sector },
    { label: "Problem Statement", value: app.problemStatement },
    { label: "Solution Description", value: app.solutionDescription },
    { label: "Differentiator", value: app.differentiator },
    { label: "Target User", value: app.targetUser },
    { label: "Relevant Skills", value: app.relevantSkills },
    { label: "Previous Winner", value: app.previousWinner },
    { label: "Has Validation", value: app.hasValidation },
    { label: "Validation Details", value: app.validationDetails },
  ].filter((i) => i.value);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <DialogTitle className="text-base">
              {app.ideaName || "Application"} —{" "}
              {[row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") || row.user?.email}
            </DialogTitle>
            {statusBadge(app.status)}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left: Q&A */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Answers</h3>
            <div className="space-y-4">
              {qaItems.map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">{item.label}</p>
                  <p className="text-sm text-foreground leading-relaxed">{item.value}</p>
                </div>
              ))}
              {qaItems.length === 0 && <p className="text-sm text-muted-foreground">No answers recorded.</p>}
            </div>
          </div>

          {/* Right: AI Scoring */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Scoring</h3>

            {/* Overall score — auto-computed */}
            <div className="text-center py-3 rounded-xl bg-muted/30">
              <div className={`text-5xl font-bold ${computedScore >= 70 ? "text-green-500" : "text-red-500"}`}>
                {computedScore}<span className="text-xl font-normal text-muted-foreground">/100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">≥ 70 to pass · auto-computed from categories</p>
            </div>

            {/* Editable category metrics */}
            {editMetrics.length > 0 ? (
              <div className="space-y-3">
                {editMetrics.map((m, i) => (
                  <div key={m.name} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold flex-1">{m.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={m.score}
                          onChange={(e) => updateMetricScore(i, Number(e.target.value))}
                          className="w-16 h-7 text-xs text-right px-2"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">/100 ({m.weight}%)</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${m.score >= 70 ? "bg-green-500" : m.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                    {/* Editable rationale */}
                    <Textarea
                      value={m.rationale || ""}
                      onChange={(e) => updateMetricRationale(i, e.target.value)}
                      className="text-xs min-h-[60px] resize-none"
                      placeholder="Rationale..."
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback: no metrics yet, show manual score input */
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">No AI category breakdown yet.</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editScoreFallback}
                    onChange={(e) => setEditScoreFallback(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
            )}

            {/* Save all changes */}
            <Button size="sm" className="w-full" onClick={handleSaveAll} disabled={isPending}>
              <Check className="w-3.5 h-3.5 mr-1" /> Save All Changes
            </Button>

            {/* Edit with AI section */}
            {showEditAI ? (
              <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs font-medium text-muted-foreground">Tell the AI what it may have missed:</p>
                <Textarea
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  placeholder="e.g. The applicant has 3 years of industry experience and a working prototype..."
                  className="text-xs min-h-[72px] resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleRefineSubmit}
                    disabled={!aiContext.trim() || isRefining || isPending}
                    className="flex-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {isRefining ? "Updating…" : "Update with AI"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowEditAI(false); setAiContext(""); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setShowEditAI(true)}
                disabled={isPending}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Edit with AI
              </Button>
            )}

            {/* Full rescreen */}
            <Button
              size="sm"
              variant="secondary"
              className="w-full flex items-center gap-2"
              onClick={onRescreen}
              disabled={isPending}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate with AI
            </Button>
          </div>
        </div>

        {/* AI Insights section — editable */}
        {(editStrengths.length > 0 || editRecs.length > 0 || editInsights) && (
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Insights</h3>
            {editStrengths.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Strengths</p>
                <div className="space-y-1">
                  {editStrengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1.5 flex-shrink-0">●</span>
                      <Input
                        value={s}
                        onChange={(e) => setEditStrengths((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                        className="h-7 text-xs flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editRecs.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Recommendations</p>
                <div className="space-y-1">
                  {editRecs.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1.5 flex-shrink-0">●</span>
                      <Input
                        value={r}
                        onChange={(e) => setEditRecs((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                        className="h-7 text-xs flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editInsights !== undefined && (
              <div>
                <p className="text-xs font-medium mb-1.5">Overall Assessment</p>
                <Textarea
                  value={editInsights}
                  onChange={(e) => setEditInsights(e.target.value)}
                  className="text-xs min-h-[80px] resize-none"
                  placeholder="Overall assessment..."
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row items-center gap-2 pt-4 border-t border-border">
          {(app.status === "PENDING_REVIEW" || app.status === "AI_REVIEWED") && (
            <>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
                disabled={isPending}
                onClick={() => onUpdate({ status: "APPROVED", manualOverride: true })}
              >
                Accept
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => onUpdate({ status: "REJECTED", manualOverride: true })}
              >
                Reject
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
