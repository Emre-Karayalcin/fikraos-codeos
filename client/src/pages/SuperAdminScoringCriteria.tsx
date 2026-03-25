import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';
import { Brain, ClipboardList, Trophy, ChevronDown, ChevronRight, Info, FileCode2, Cpu, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ScoringQuestion { id: string; label: string; weight: number; }
interface ScoringCategory { id: string; name: string; weight: number; color: string; questions: ScoringQuestion[]; }
interface ScoringConfig { categories: ScoringCategory[]; }
interface CriteriaData { pmo: ScoringConfig; judge: ScoringConfig; }

// ─── Static AI Screening data (not DB-backed, prompts-only) ─────────────────────

const AI_SCREENING = {
  title: 'AI Screening',
  icon: Brain,
  color: 'blue',
  description: 'Automatically runs when a member application is submitted. Uses Azure OpenAI (GPT-4o) to evaluate the applicant\'s idea across three weighted categories and returns a score 0–100.',
  trigger: 'Triggered automatically on application submission (fire-and-forget via setImmediate). Can also be re-run with admin-provided context ("Refine with context" in the Applications view).',
  file: 'server/lib/applicationScreening.ts',
  categories: [
    { name: 'Business Maturity', weight: 40, color: 'emerald', description: 'Clarity of problem, market differentiation, user understanding', inputs: ['Idea Name', 'Sector', 'Problem Statement', 'Differentiator', 'Target User'] },
    { name: 'Technical Maturity', weight: 30, color: 'violet', description: 'Solution completeness, feasibility, validation evidence', inputs: ['Solution Description', 'Has Validation', 'Validation Details', 'Relevant Skills'] },
    { name: 'Strategic Alignment', weight: 30, color: 'amber', description: 'Relevance to competition brief, sector fit, strategic potential', inputs: ['Sector', 'Challenge Evaluation Criteria (if applicable)', 'Previous Winner status'] },
  ],
  output: 'overallScore (0–100) · per-category scores · strengths[] · recommendations[] · insights (paragraph)',
  scoreFormula: 'overallScore = weighted sum decided by AI model, clamped to 0–100.',
  changeNote: 'To modify criteria, edit the systemPrompt string in server/lib/applicationScreening.ts (two places: screenApplicationAsync and refineApplicationAsync). The prompt directly instructs the AI on what to evaluate.',
};

// ─── Color helpers ──────────────────────────────────────────────────────────────

const ACCENT: Record<string, string> = {
  blue:    'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  purple:  'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
  yellow:  'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800',
  emerald: 'bg-emerald-500/10 text-emerald-600',
  violet:  'bg-violet-500/10 text-violet-600',
  amber:   'bg-amber-500/10 text-amber-600',
  orange:  'bg-orange-500/10 text-orange-600',
  rose:    'bg-rose-500/10 text-rose-600',
  cyan:    'bg-cyan-500/10 text-cyan-600',
};

const HEADER_BG: Record<string, string> = {
  blue:   'from-blue-600 to-indigo-700',
  purple: 'from-purple-600 to-violet-700',
  yellow: 'from-yellow-500 to-amber-600',
};

// ─── Weight bar ─────────────────────────────────────────────────────────────────

function WeightBar({ weight, max = 12 }: { weight: number; max?: number }) {
  const pct = Math.round((weight / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-current rounded-full opacity-60 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-6 text-right">{weight}%</span>
    </div>
  );
}

// ─── AI Screening category card (read-only, no DB) ─────────────────────────────

function AiCategoryCard({ cat }: { cat: any }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ACCENT[cat.color]}`}>{cat.weight}%</span>
          <span className="font-semibold text-sm">{cat.name}</span>
          {cat.description && <span className="text-xs text-muted-foreground hidden sm:inline">— {cat.description}</span>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && cat.inputs && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {cat.inputs.map((inp: string) => (
            <span key={inp} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border">{inp}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Editable scoring section ─────────────────────────────────────────────────

interface EditableSectionProps {
  title: string;
  icon: React.ElementType;
  headerColor: string;
  description: string;
  trigger: string;
  file: string;
  config: ScoringConfig;
  type: 'pmo' | 'judge';
}

function EditableScoringSection({ title, icon: Icon, headerColor, description, trigger, file, config, type }: EditableSectionProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ScoringConfig>(config);
  const [formulaOpen, setFormulaOpen] = useState(false);

  // Keep draft in sync if config changes (e.g. after refetch)
  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(config))); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const totalW = draft.categories.flatMap(c => c.questions).reduce((s, q) => s + (q.weight || 0), 0);
  const warnWeight = Math.abs(totalW - 100) > 1;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/super-admin/scoring-criteria/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
    },
    onSuccess: () => {
      toast.success('Saved');
      queryClient.invalidateQueries({ queryKey: ['scoring-criteria'] });
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateQuestion = (catIdx: number, qIdx: number, field: 'label' | 'weight', value: string | number) => {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as ScoringConfig;
      const q = next.categories[catIdx].questions[qIdx];
      if (field === 'weight') q.weight = Number(value) || 0;
      else q.label = value as string;
      return next;
    });
  };

  const displayConfig = editing ? draft : config;

  const formulaLines = displayConfig.categories.map(cat => {
    const expr = cat.questions.map(q => `(${q.id}/5)×${q.weight}`).join(' + ');
    return `  ${expr}  // ${cat.name} ${cat.weight}%`;
  }).join('\n');
  const formula = `totalScore = round(\n${formulaLines}\n)`;

  return (
    <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${HEADER_BG[headerColor]} p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Icon className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-white font-bold text-lg">{title}</h2>
              <p className="text-white/75 text-xs mt-0.5">{description}</p>
            </div>
          </div>
          {!editing ? (
            <Button size="sm" variant="secondary" onClick={startEdit} className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0">
              <Pencil className="w-3.5 h-3.5" /> Edit weights
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={cancelEdit} className="gap-1 bg-white/20 hover:bg-white/30 text-white border-0">
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || warnWeight} className="gap-1 bg-white text-gray-900 hover:bg-white/90 border-0">
                <Save className="w-3.5 h-3.5" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5 bg-card">
        {/* Meta row */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex gap-2 text-xs">
            <div className="mt-0.5 shrink-0"><Info className="w-3.5 h-3.5 text-muted-foreground" /></div>
            <div><span className="font-semibold text-foreground">Trigger: </span><span className="text-muted-foreground">{trigger}</span></div>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="mt-0.5 shrink-0"><FileCode2 className="w-3.5 h-3.5 text-muted-foreground" /></div>
            <div><span className="font-semibold text-foreground">Code: </span><code className="text-muted-foreground bg-muted px-1 py-0.5 rounded text-xs">{file}</code></div>
          </div>
        </div>

        {/* Weight total warning */}
        {editing && warnWeight && (
          <div className="flex gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 text-xs">
            <Info className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
            <span className="text-red-700 dark:text-red-400">Weights sum to <strong>{totalW}</strong> — must equal exactly 100 before saving.</span>
          </div>
        )}
        {editing && !warnWeight && (
          <div className="flex gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-lg p-3 text-xs">
            <Info className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
            <span className="text-green-700 dark:text-green-400">Weights sum to <strong>{totalW}</strong> ✓</span>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories & Weights</h3>
          <div className="space-y-2">
            {displayConfig.categories.map((cat, catIdx) => (
              <CategoryBlock
                key={cat.id}
                cat={cat}
                catIdx={catIdx}
                editing={editing}
                onUpdateQuestion={updateQuestion}
              />
            ))}
          </div>
        </div>

        {/* Score formula */}
        <div className="space-y-1">
          <button onClick={() => setFormulaOpen(v => !v)} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            {formulaOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Cpu className="w-3.5 h-3.5" /> Score Formula
          </button>
          {formulaOpen && (
            <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto border border-border text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap">
              {formula}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryBlock({ cat, catIdx, editing, onUpdateQuestion }: {
  cat: ScoringCategory; catIdx: number; editing: boolean;
  onUpdateQuestion: (catIdx: number, qIdx: number, field: 'label' | 'weight', value: string | number) => void;
}) {
  const [open, setOpen] = useState(true);
  const maxW = cat.questions.reduce((mx, q) => Math.max(mx, q.weight), 0);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ACCENT[cat.color]}`}>{cat.weight}%</span>
          <span className="font-semibold text-sm">{cat.name}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="divide-y divide-border">
          {cat.questions.map((q, qIdx) => (
            <div key={q.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${ACCENT[cat.color]} opacity-70`}>{q.id}</span>
              <span className="flex-1 text-sm">{q.label}</span>
              {editing ? (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={q.weight}
                  onChange={e => onUpdateQuestion(catIdx, qIdx, 'weight', e.target.value)}
                  className="w-16 h-7 text-xs text-center px-1"
                />
              ) : (
                <div className={`w-28 ${ACCENT[cat.color].split(' ')[1]}`}>
                  <WeightBar weight={q.weight} max={maxW || 12} />
                </div>
              )}
              {editing && <span className="text-xs text-muted-foreground w-4">%</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Screening section (read-only) ───────────────────────────────────────────

function AiScreeningSection() {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const Icon = AI_SCREENING.icon;
  return (
    <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className={`bg-gradient-to-br ${HEADER_BG['blue']} p-5`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl"><Icon className="w-5 h-5 text-white" /></div>
          <div>
            <h2 className="text-white font-bold text-lg">{AI_SCREENING.title}</h2>
            <p className="text-white/75 text-xs mt-0.5">{AI_SCREENING.description}</p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-5 bg-card">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex gap-2 text-xs">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div><span className="font-semibold">Trigger: </span><span className="text-muted-foreground">{AI_SCREENING.trigger}</span></div>
          </div>
          <div className="flex gap-2 text-xs">
            <FileCode2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div><span className="font-semibold">Code: </span><code className="text-muted-foreground bg-muted px-1 py-0.5 rounded text-xs">{AI_SCREENING.file}</code></div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories & Inputs</h3>
          <div className="space-y-2">
            {AI_SCREENING.categories.map(cat => <AiCategoryCard key={cat.name} cat={cat} />)}
          </div>
        </div>
        <div className="space-y-1">
          <button onClick={() => setFormulaOpen(v => !v)} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            {formulaOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Cpu className="w-3.5 h-3.5" /> Score Formula
          </button>
          {formulaOpen && (
            <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto border border-border text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap">
              {AI_SCREENING.scoreFormula}
            </pre>
          )}
        </div>
        <div className="flex gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 text-xs">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div><span className="font-semibold text-amber-700 dark:text-amber-400">To make changes: </span><span className="text-amber-700/80 dark:text-amber-400/80">{AI_SCREENING.changeNote}</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared content ──────────────────────────────────────────────────────────────

export function ScoringCriteriaContent() {
  const { data, isLoading, error } = useQuery<CriteriaData>({
    queryKey: ['scoring-criteria'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/scoring-criteria', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load criteria');
      return res.json();
    },
  });

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">Scoring Criteria Reference</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of every scoring system. PMO and Judge weights are editable — click "Edit weights" to change numeric values.
          </p>
        </div>

        {/* Summary table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-2.5 font-semibold">System</th>
                <th className="px-4 py-2.5 font-semibold">Stage</th>
                <th className="px-4 py-2.5 font-semibold">Who scores</th>
                <th className="px-4 py-2.5 font-semibold">Range</th>
                <th className="px-4 py-2.5 font-semibold">Questions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-blue-500" /> AI Screening</td>
                <td className="px-4 py-2.5 text-muted-foreground">Registration → Under Review</td>
                <td className="px-4 py-2.5 text-muted-foreground">GPT-4o (automatic)</td>
                <td className="px-4 py-2.5 font-mono text-xs">0–100</td>
                <td className="px-4 py-2.5 text-muted-foreground">3 categories (AI-decided)</td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium"><span className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-purple-500" /> PMO Evaluation</span></td>
                <td className="px-4 py-2.5 text-muted-foreground">SHORTLISTED → Pre-Demo</td>
                <td className="px-4 py-2.5 text-muted-foreground">Admin / PMO staff</td>
                <td className="px-4 py-2.5 font-mono text-xs">0–100</td>
                <td className="px-4 py-2.5 text-muted-foreground">{data ? data.pmo.categories.flatMap(c => c.questions).length : 12} questions (1–5 each)</td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium"><span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-yellow-500" /> Judge Scoring</span></td>
                <td className="px-4 py-2.5 text-muted-foreground">IN_INCUBATION → Demo Day</td>
                <td className="px-4 py-2.5 text-muted-foreground">Invited Judges (per-judge)</td>
                <td className="px-4 py-2.5 font-mono text-xs">0–100 per judge</td>
                <td className="px-4 py-2.5 text-muted-foreground">{data ? data.judge.categories.flatMap(c => c.questions).length : 13} questions (1–5 each)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detail sections */}
        <AiScreeningSection />

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading criteria…</div>
        )}
        {error && (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load criteria. Make sure you are logged in as super admin.</div>
        )}
        {data && (
          <>
            <EditableScoringSection
              title="PMO Evaluation"
              icon={ClipboardList}
              headerColor="purple"
              description="Manual scoring done by PMO staff on SHORTLISTED ideas before Demo Day. Questions scored 1–5."
              trigger="Admin opens an idea in the Ideas Kanban (SHORTLISTED column), navigates to the 'PMO Evaluation' tab, and fills in the form."
              file="server/routes.ts (POST /api/workspaces/:orgId/admin/idea-evaluations/:projectId)"
              config={data.pmo}
              type="pmo"
            />
            <EditableScoringSection
              title="Judge Scoring"
              icon={Trophy}
              headerColor="yellow"
              description="Manual scoring by invited Judges on IN_INCUBATION (Demo Day) ideas. Questions scored 1–5. Each judge scores independently."
              trigger="Judge logs in → Judge Dashboard → clicks 'Score Idea' on any Demo Day idea."
              file="server/routes.ts (POST /api/workspaces/:orgId/judge/evaluations/:projectId)"
              config={data.judge}
              type="judge"
            />
          </>
        )}
      </div>
    </main>
  );
}

// ─── Super Admin page ────────────────────────────────────────────────────────

export default function SuperAdminScoringCriteria() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(v => !v)} />
      <ScoringCriteriaContent />
    </div>
  );
}
