import { useState } from 'react';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';
import { Brain, ClipboardList, Trophy, ChevronDown, ChevronRight, Info, FileCode2, Cpu } from 'lucide-react';

// ─── Data ──────────────────────────────────────────────────────────────────────

const AI_SCREENING = {
  title: 'AI Screening',
  icon: Brain,
  color: 'blue',
  description: 'Automatically runs when a member application is submitted. Uses Azure OpenAI (GPT-4o) to evaluate the applicant\'s idea across three weighted categories and returns a score 0–100.',
  trigger: 'Triggered automatically on application submission (fire-and-forget via setImmediate). Can also be re-run with admin-provided context ("Refine with context" in the Applications view).',
  file: 'server/lib/applicationScreening.ts',
  categories: [
    {
      name: 'Business Maturity',
      weight: 40,
      color: 'emerald',
      description: 'Clarity of problem, market differentiation, user understanding',
      inputs: ['Idea Name', 'Sector', 'Problem Statement', 'Differentiator', 'Target User'],
    },
    {
      name: 'Technical Maturity',
      weight: 30,
      color: 'violet',
      description: 'Solution completeness, feasibility, validation evidence',
      inputs: ['Solution Description', 'Has Validation', 'Validation Details', 'Relevant Skills'],
    },
    {
      name: 'Strategic Alignment',
      weight: 30,
      color: 'amber',
      description: 'Relevance to competition brief, sector fit, strategic potential',
      inputs: ['Sector', 'Challenge Evaluation Criteria (if applicable)', 'Previous Winner status'],
    },
  ],
  output: 'overallScore (0–100) · per-category scores · strengths[] · recommendations[] · insights (paragraph)',
  scoreFormula: 'overallScore = weighted sum decided by AI model, clamped to 0–100.',
  changeNote: 'To modify criteria, edit the systemPrompt string in server/lib/applicationScreening.ts (two places: screenApplicationAsync and refineApplicationAsync). The prompt directly instructs the AI on what to evaluate.',
};

const PMO_EVALUATION = {
  title: 'PMO Evaluation',
  icon: ClipboardList,
  color: 'purple',
  description: 'Manual scoring done by PMO staff on SHORTLISTED ideas before Demo Day. 12 questions across 3 categories, each scored 1–5.',
  trigger: 'Admin opens an idea in the Ideas Kanban (SHORTLISTED column), navigates to the "PMO Evaluation" tab, and fills in the form.',
  file: 'server/routes.ts (POST /api/workspaces/:orgId/admin/idea-evaluations/:projectId)',
  categories: [
    {
      name: 'Business Viability',
      weight: 40,
      color: 'emerald',
      description: '',
      questions: [
        { id: 'b1', label: 'Market opportunity & size', weight: 10 },
        { id: 'b2', label: 'Revenue model clarity', weight: 8 },
        { id: 'b3', label: 'Competitive advantage', weight: 8 },
        { id: 'b4', label: 'Target customer definition', weight: 8 },
        { id: 'b5', label: 'Go-to-market strategy', weight: 6 },
      ],
    },
    {
      name: 'Technical Maturity',
      weight: 30,
      color: 'violet',
      description: '',
      questions: [
        { id: 't1', label: 'Solution completeness', weight: 10 },
        { id: 't2', label: 'Technical feasibility', weight: 8 },
        { id: 't3', label: 'Prototype / MVP evidence', weight: 6 },
        { id: 't4', label: 'Scalability potential', weight: 6 },
      ],
    },
    {
      name: 'Strategic Alignment',
      weight: 30,
      color: 'amber',
      description: '',
      questions: [
        { id: 's1', label: 'Alignment with program goals', weight: 12 },
        { id: 's2', label: 'Sector / national priority fit', weight: 10 },
        { id: 's3', label: 'Impact potential', weight: 8 },
      ],
    },
  ],
  scoreFormula: `totalScore = round(
  (b1/5)×10 + (b2/5)×8 + (b3/5)×8 + (b4/5)×8 + (b5/5)×6   // Business 40%
  (t1/5)×10 + (t2/5)×8 + (t3/5)×6 + (t4/5)×6               // Technical 30%
  (s1/5)×12 + (s2/5)×10 + (s3/5)×8                          // Strategic 30%
)`,
  changeNote: 'To add/rename questions: edit the server-side upsert handler and the client-side PMO Evaluation form component. To change weights: update both the formula in routes.ts and the form labels.',
};

const JUDGE_SCORING = {
  title: 'Judge Scoring',
  icon: Trophy,
  color: 'yellow',
  description: 'Manual scoring by invited Judges on IN_INCUBATION (Demo Day) ideas. 13 questions across 3 categories, each scored 1–5. Each judge scores independently — leaderboard shows combined total across all judges.',
  trigger: 'Judge logs in → Judge Dashboard → clicks "Score Idea" on any Demo Day idea.',
  file: 'server/routes.ts (POST /api/workspaces/:orgId/judge/evaluations/:projectId)',
  categories: [
    {
      name: 'Demo Deck Slides',
      weight: 40,
      color: 'orange',
      description: 'Quality and completeness of the pitch deck slides',
      questions: [
        { id: 'd1', label: 'Problem statement', weight: 8 },
        { id: 'd2', label: 'Solution statement', weight: 8 },
        { id: 'd3', label: 'Prototype slide', weight: 8 },
        { id: 'd4', label: 'Target audience', weight: 8 },
        { id: 'd5', label: 'Revenue streams', weight: 8 },
      ],
    },
    {
      name: 'Pitching Quality',
      weight: 30,
      color: 'rose',
      description: 'Live presentation delivery and communication',
      questions: [
        { id: 'p1', label: 'Time allocated', weight: 8 },
        { id: 'p2', label: 'Problem demonstrated', weight: 8 },
        { id: 'p3', label: 'Solution demonstrated', weight: 8 },
        { id: 'p4', label: 'Storytelling & body language', weight: 6 },
      ],
    },
    {
      name: 'Project Evaluation',
      weight: 30,
      color: 'cyan',
      description: 'Depth of research, impact, and national relevance',
      questions: [
        { id: 'e1', label: 'Market research evidence', weight: 10 },
        { id: 'e2', label: 'Impact measurable', weight: 10 },
        { id: 'e3', label: 'National/sector priorities', weight: 10 },
      ],
    },
  ],
  scoreFormula: `totalScore = round(
  (d1/5)×8 + (d2/5)×8 + (d3/5)×8 + (d4/5)×8 + (d5/5)×8   // Demo Deck 40%
  (p1/5)×8 + (p2/5)×8 + (p3/5)×8 + (p4/5)×6               // Pitching  30%
  (e1/5)×10 + (e2/5)×10 + (e3/5)×10                        // Eval      30%
)`,
  changeNote: 'To add/rename questions: edit the judge scoring form in client/src/pages/JudgeDashboard.tsx (DEMO_DECK_QUESTIONS, PITCHING_QUESTIONS, EVAL_QUESTIONS arrays) and update the server-side formula in routes.ts. Weights must always sum to 100.',
};

// ─── Color helpers ──────────────────────────────────────────────────────────────

const ACCENT: Record<string, string> = {
  blue:   'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  purple: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
  yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800',
  emerald:'bg-emerald-500/10 text-emerald-600',
  violet: 'bg-violet-500/10 text-violet-600',
  amber:  'bg-amber-500/10 text-amber-600',
  orange: 'bg-orange-500/10 text-orange-600',
  rose:   'bg-rose-500/10 text-rose-600',
  cyan:   'bg-cyan-500/10 text-cyan-600',
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

// ─── Category card ──────────────────────────────────────────────────────────────

function CategoryCard({ cat, hasPmo }: { cat: any; hasPmo: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ACCENT[cat.color]}`}>{cat.weight}%</span>
          <span className="font-semibold text-sm">{cat.name}</span>
          {cat.description && <span className="text-xs text-muted-foreground hidden sm:inline">— {cat.description}</span>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && cat.questions && (
        <div className="divide-y divide-border">
          {cat.questions.map((q: any) => (
            <div key={q.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${ACCENT[cat.color]} opacity-70`}>{q.id}</span>
              <span className="flex-1 text-sm">{q.label}</span>
              <div className={`w-28 ${ACCENT[cat.color].split(' ')[1]}`}>
                <WeightBar weight={q.weight} max={hasPmo ? 12 : 10} />
              </div>
            </div>
          ))}
        </div>
      )}

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

// ─── Section card ───────────────────────────────────────────────────────────────

function SectionCard({ data, hasPmo = false }: { data: typeof AI_SCREENING | typeof PMO_EVALUATION | typeof JUDGE_SCORING; hasPmo?: boolean }) {
  const Icon = data.icon;
  const [formulaOpen, setFormulaOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${HEADER_BG[data.color]} p-5`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">{data.title}</h2>
            <p className="text-white/75 text-xs mt-0.5">{data.description}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5 bg-card">
        {/* Meta row */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex gap-2 text-xs">
            <div className="mt-0.5 shrink-0"><Info className="w-3.5 h-3.5 text-muted-foreground" /></div>
            <div><span className="font-semibold text-foreground">Trigger: </span><span className="text-muted-foreground">{data.trigger}</span></div>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="mt-0.5 shrink-0"><FileCode2 className="w-3.5 h-3.5 text-muted-foreground" /></div>
            <div><span className="font-semibold text-foreground">Code: </span><code className="text-muted-foreground bg-muted px-1 py-0.5 rounded text-xs">{data.file}</code></div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories & Weights</h3>
          <div className="space-y-2">
            {data.categories.map((cat: any) => (
              <CategoryCard key={cat.name} cat={cat} hasPmo={hasPmo} />
            ))}
          </div>
        </div>

        {/* Score formula */}
        <div className="space-y-1">
          <button
            onClick={() => setFormulaOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            {formulaOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Cpu className="w-3.5 h-3.5" /> Score Formula
          </button>
          {formulaOpen && (
            <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto border border-border text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap">
              {data.scoreFormula}
            </pre>
          )}
        </div>

        {/* Change note */}
        <div className="flex gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 text-xs">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div><span className="font-semibold text-amber-700 dark:text-amber-400">To make changes: </span><span className="text-amber-700/80 dark:text-amber-400/80">{data.changeNote}</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function SuperAdminScoringCriteria() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SuperAdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed((v) => !v)} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold">Scoring Criteria Reference</h1>
            <p className="text-sm text-muted-foreground mt-1">
              A read-only overview of every scoring system on the platform — what it evaluates, how it is calculated, and where in the code to make changes.
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
                  <td className="px-4 py-2.5 text-muted-foreground">12 questions (1–5 each)</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium"><span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-yellow-500" /> Judge Scoring</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground">IN_INCUBATION → Demo Day</td>
                  <td className="px-4 py-2.5 text-muted-foreground">Invited Judges (per-judge)</td>
                  <td className="px-4 py-2.5 font-mono text-xs">0–100 per judge</td>
                  <td className="px-4 py-2.5 text-muted-foreground">13 questions (1–5 each)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detail sections */}
          <SectionCard data={AI_SCREENING} />
          <SectionCard data={PMO_EVALUATION} hasPmo />
          <SectionCard data={JUDGE_SCORING} />

        </div>
      </main>
    </div>
  );
}
