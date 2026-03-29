import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  PresentationIcon,
  Plus,
  Trash2,
  Download,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lightbulb,
  Lock,
  Send,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// ── Types ──────────────────────────────────────────────────────────────────
type LifecycleStatus = "DRAFT" | "PENDING_REVIEW" | "REVIEWED" | "SUBMITTED" | "REJECTED";

interface PitchDeck {
  id: string;
  projectId: string;
  taskId: string;
  status: "GENERATING" | "COMPLETED" | "FAILED" | "CANCELLED";
  lifecycleStatus: LifecycleStatus;
  template: string;
  theme: string;
  downloadUrl: string | null;
  errorMessage: string | null;
  isLocked: boolean;
  lockedReason: string | null;
  submittedAt: string | null;
  draftNotes: string | null;
  latestReview?: { reviewStatus: string; feedback: string | null } | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  projectTitle?: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
}

// ── Helper ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PitchDeck["status"] }) {
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    GENERATING: {
      label: "Generating",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      className: "bg-amber-100 text-amber-700 border border-amber-200",
    },
    COMPLETED: {
      label: "Completed",
      icon: <CheckCircle className="w-3 h-3" />,
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    },
    FAILED: {
      label: "Failed",
      icon: <XCircle className="w-3 h-3" />,
      className: "bg-red-100 text-red-700 border border-red-200",
    },
    CANCELLED: {
      label: "Cancelled",
      icon: <XCircle className="w-3 h-3" />,
      className: "bg-muted text-muted-foreground border border-border",
    },
  };
  const { label, icon, className } = map[status] ?? map.GENERATING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {icon} {label}
    </span>
  );
}

// ── Lifecycle badge ─────────────────────────────────────────────────────────
const LIFECYCLE_MAP: Record<LifecycleStatus, { label: string; className: string }> = {
  DRAFT:          { label: "Draft",          className: "bg-muted text-muted-foreground" },
  PENDING_REVIEW: { label: "In Review",      className: "bg-yellow-500/15 text-yellow-500" },
  REVIEWED:       { label: "Reviewed",       className: "bg-blue-500/15 text-blue-400" },
  SUBMITTED:      { label: "Submitted",      className: "bg-green-500/15 text-green-400" },
  REJECTED:       { label: "Rejected",       className: "bg-red-500/15 text-red-400" },
};

function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  const cfg = LIFECYCLE_MAP[status] ?? LIFECYCLE_MAP.DRAFT;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── PitchCard ──────────────────────────────────────────────────────────────
function PitchCard({
  deck,
  onDelete,
  onView,
  onRequestReview,
  onSubmit,
}: {
  deck: PitchDeck;
  onDelete: (id: string) => void;
  onView: (deck: PitchDeck) => void;
  onRequestReview: (id: string) => void;
  onSubmit: (id: string) => void;
}) {
  const lifecycle = deck.lifecycleStatus ?? "DRAFT";
  const canRequestReview = deck.status === "COMPLETED" && !deck.isLocked &&
    (lifecycle === "DRAFT" || lifecycle === "REJECTED");
  const canSubmit = deck.status === "COMPLETED" && !deck.isLocked && lifecycle === "REVIEWED";

  return (
    <div
      className="group relative flex flex-col gap-4 rounded-xl border-2 border-transparent bg-card p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
      onClick={() => deck.status === "COMPLETED" && onView(deck)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="rounded-md bg-muted p-2">
          <PresentationIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex items-center gap-1">
          {deck.isLocked && (
            <span title={deck.lockedReason ?? "Locked"} className="text-orange-400">
              <Lock className="w-3.5 h-3.5" />
            </span>
          )}
          {!deck.isLocked && (
            <button
              className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(deck.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1">
        <h5 className="text-sm font-semibold text-foreground truncate">
          {deck.projectTitle || "Pitch Deck"}
        </h5>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeAgo(deck.createdAt)}
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={deck.status} />
        {deck.status === "COMPLETED" && <LifecycleBadge status={lifecycle} />}
      </div>

      {/* Mentor feedback note */}
      {deck.latestReview?.feedback && lifecycle === "REJECTED" && (
        <p className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1.5 line-clamp-2">
          {deck.latestReview.feedback}
        </p>
      )}

      {/* Actions */}
      {deck.status === "COMPLETED" && deck.downloadUrl && (
        <div className="flex gap-2 mt-1">
          <a
            href={deck.downloadUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="w-3 h-3" />
            Download PPTX
          </a>
          <span className="text-border">|</span>
          <button
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onView(deck);
            }}
          >
            <Eye className="w-3 h-3" />
            View
          </button>
        </div>
      )}

      {deck.status === "GENERATING" && (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          Generating your deck…
        </div>
      )}

      {/* Lifecycle actions */}
      {(canRequestReview || canSubmit) && (
        <div className="border-t border-border pt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {canRequestReview && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 flex-1"
              onClick={() => onRequestReview(deck.id)}
            >
              <MessageSquare className="w-3 h-3" />
              Request Review
            </Button>
          )}
          {canSubmit && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 flex-1"
              onClick={() => onSubmit(deck.id)}
            >
              <Send className="w-3 h-3" />
              Submit Final
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Slide length option ────────────────────────────────────────────────────
function LengthOption({
  label,
  description,
  value,
  active,
  onClick,
}: {
  label: string;
  description: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex gap-2 rounded-lg border p-3 text-sm transition-colors text-left w-full ${
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-card text-foreground hover:border-border/80"
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        active ? "border-primary bg-primary" : "border-border bg-background"
      }`}>
        {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

// ── Template card ──────────────────────────────────────────────────────────
// Uses real SlideSpeak S3 thumbnail images (cover shown by default, content on hover)
const TEMPLATES: Array<{ id: string; label: string; cover: string; content: string }> = [
  {
    id: "default",
    label: "Default",
    cover: "https://slidespeak-files.s3.amazonaws.com/default-cover_2025-04-03_12-37-38.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/default-content_2025-04-03_12-37-38.jpg",
  },
  {
    id: "adam",
    label: "Adam",
    cover: "https://slidespeak-files.s3.amazonaws.com/adam-cover_2025-04-03_12-32-20.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/adam-content_2025-04-03_12-32-22.jpg",
  },
  {
    id: "aurora",
    label: "Aurora",
    cover: "https://slidespeak-files.s3.amazonaws.com/aurora-cover_2025-04-03_12-30-25.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/aurora-content_2025-04-03_12-30-26.jpg",
  },
  {
    id: "bruno",
    label: "Bruno",
    cover: "https://slidespeak-files.s3.amazonaws.com/Cover_2025-03-19_13-48-57.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/Content_2025-03-19_13-59-14.jpg",
  },
  {
    id: "clyde",
    label: "Clyde",
    cover: "https://slidespeak-files.s3.amazonaws.com/clyde-cover_2025-04-03_12-31-29.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/clyde-content_2025-04-03_12-31-31.jpg",
  },
  {
    id: "daniel",
    label: "Daniel",
    cover: "https://slidespeak-files.s3.amazonaws.com/daniel-cover_2025-04-03_12-28-49.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/daniel-content_2025-04-03_12-28-52.jpg",
  },
  {
    id: "eddy",
    label: "Eddy",
    cover: "https://slidespeak-files.s3.amazonaws.com/eddy-cover_2025-04-03_12-36-13.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/eddy-content_2025-04-03_12-36-15.jpg",
  },
  {
    id: "felix",
    label: "Felix",
    cover: "https://slidespeak-files.s3.amazonaws.com/felix-cover_2025-04-03_12-27-56.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/felix-content_2025-04-03_12-27-59.jpg",
  },
  {
    id: "gradient",
    label: "Gradient",
    cover: "https://slidespeak-files.s3.amazonaws.com/gradient-cover_2025-04-03_12-36-55.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/gradient-content_2025-04-03_12-36-57.jpg",
  },
  {
    id: "iris",
    label: "Iris",
    cover: "https://slidespeak-files.s3.amazonaws.com/iris-cover_2025-04-03_12-26-29.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/iris-content_2025-04-03_12-26-33.jpg",
  },
  {
    id: "lavender",
    label: "Lavender",
    cover: "https://slidespeak-files.s3.amazonaws.com/lavender-cover_2025-04-03_12-34-02.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/lavender-content_2025-04-03_12-34-04.jpg",
  },
  {
    id: "monolith",
    label: "Monolith",
    cover: "https://slidespeak-files.s3.amazonaws.com/monolith-cover_2025-04-03_12-35-35.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/monolith-content_2025-04-03_12-35-40.jpg",
  },
  {
    id: "nebula",
    label: "Nebula",
    cover: "https://slidespeak-files.s3.amazonaws.com/nebula-cover_2025-04-03_12-29-34.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/nebula-content_2025-04-03_12-29-37.jpg",
  },
  {
    id: "nexus",
    label: "Nexus",
    cover: "https://slidespeak-files.s3.amazonaws.com/nexus-cover_2025-04-03_12-34-52.jpg",
    content: "https://slidespeak-files.s3.amazonaws.com/nexus-content_2025-04-03_12-34-54.jpg",
  },
];

function TemplateCard({
  template,
  active,
  onClick,
}: {
  template: typeof TEMPLATES[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col gap-1.5 rounded-xl border-[3px] p-1.5 transition-all text-left ${
        active ? "border-primary shadow-sm" : "border-transparent hover:border-primary/40"
      }`}
    >
      {/* Slide thumbnail with cover/content hover like PHP */}
      <div className="relative w-full aspect-video rounded-md overflow-hidden border border-border shadow-sm bg-muted">
        {/* Content slide (shown beneath) */}
        <img
          src={template.content}
          alt={`${template.label} content`}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Cover slide (shown by default, fades out on hover) */}
        <img
          src={template.cover}
          alt={`${template.label} cover`}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
        />
      </div>
      <div className="flex items-center gap-1.5 px-0.5 pb-0.5">
        <div className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
          active ? "border-primary bg-primary" : "border-border"
        }`} />
        <span className="text-xs font-medium text-foreground">{template.label}</span>
      </div>
    </button>
  );
}

// ── Generating Progress Dialog ─────────────────────────────────────────────
// Matches PHP #progressPptx modal: pulsing icon + animated progress bar + step text + polling
const PROGRESS_STEPS = [
  { percent: 10, text: "Validating your data…" },
  { percent: 30, text: "Generating outline…" },
  { percent: 55, text: "Creating slide content…" },
  { percent: 75, text: "Formatting pitch deck…" },
  { percent: 90, text: "Finalizing and uploading…" },
  { percent: 99, text: "Waiting for final confirmation…" },
];

function GeneratingDialog({
  open,
  taskId,
  generationId,
  slideCount,
  onSuccess,
  onFailure,
}: {
  open: boolean;
  taskId: string;
  generationId: string;
  slideCount: number;
  onSuccess: (generationId: string) => void;
  onFailure: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [status, setStatus] = useState<"generating" | "completed" | "failed">("generating");
  const [error, setError] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estimated time: same formula as PHP — 20 + (slides - 3) * 2 seconds
  const estimatedMs = Math.round(20 + (slideCount - 3) * 2) * 1000;
  const intervalMs = estimatedMs / PROGRESS_STEPS.length;

  useEffect(() => {
    if (!open || !taskId) return;

    // Reset
    setStepIdx(0);
    setStatus("generating");
    setError(null);

    // Animate progress steps
    progressIntervalRef.current = setInterval(() => {
      setStepIdx((i) => {
        if (i >= PROGRESS_STEPS.length - 1) {
          clearInterval(progressIntervalRef.current!);
          return PROGRESS_STEPS.length - 1;
        }
        return i + 1;
      });
    }, intervalMs);

    // Poll status endpoint
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/check-pitch-status/${taskId}`, { credentials: "include" });
        const data = await res.json();
        const s = data?.generation?.status ?? data?.status;
        if (s === "COMPLETED" || data?.success) {
          clearInterval(progressIntervalRef.current!);
          clearInterval(pollIntervalRef.current!);
          setStepIdx(PROGRESS_STEPS.length - 1);
          setStatus("completed");
          // short delay so user sees 99%
          setTimeout(() => onSuccess(generationId), 800);
        } else if (s === "FAILED" || s === "FAILURE" || s === "REVOKED") {
          clearInterval(progressIntervalRef.current!);
          clearInterval(pollIntervalRef.current!);
          setStatus("failed");
          setError(data?.error || "Generation failed. Please try again.");
          setTimeout(onFailure, 3000);
        }
      } catch { /* keep polling */ }
    }, 3000);

    return () => {
      clearInterval(progressIntervalRef.current!);
      clearInterval(pollIntervalRef.current!);
    };
  }, [open, taskId]);

  const currentStep = PROGRESS_STEPS[stepIdx];

  return (
    <Dialog open={open} onOpenChange={() => { /* block close during generation */ }}>
      <DialogContent
        className="sm:max-w-sm text-center p-8"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {status === "generating" && (
          <div className="flex flex-col items-center gap-5">
            {/* Pulsing icon — matches PHP animation */}
            <div
              className="text-primary"
              style={{ animation: "pitch-pulse 1.5s infinite" }}
            >
              <PresentationIcon style={{ width: 48, height: 48 }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Your pitch deck is being generated…
              </h3>
              <p className="text-sm text-muted-foreground" id="progress-step-text">
                {currentStep.text}
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-full">
              <div className="w-full h-4 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-in-out"
                  style={{ width: `${currentStep.percent}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-foreground mt-2">{currentStep.percent}%</p>
            </div>
          </div>
        )}
        {status === "completed" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-foreground">Pitch deck ready!</p>
          </div>
        )}
        {status === "failed" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Generation failed</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Create Dialog ──────────────────────────────────────────────────────────
// Steps: 1=topic+idea  2=settings  3=template  4=instructions
function CreatePitchDialog({
  open,
  onClose,
  onStartGeneration,
}: {
  open: boolean;
  onClose: () => void;
  onStartGeneration: (taskId: string, generationId: string, slideCount: number) => void;
}) {
  const { t } = useTranslation();
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [slideLength, setSlideLength] = useState(6);
  const [tone, setTone] = useState("professional");
  const [verbosity, setVerbosity] = useState("standard");
  const [language, setLanguage] = useState("ORIGINAL");
  const [speakerNotes, setSpeakerNotes] = useState(false);
  const [fetchImages, setFetchImages] = useState(true);
  const [stockImages, setStockImages] = useState(false);
  const [useBrandedLogo, setUseBrandedLogo] = useState(false);
  const [contentExpansion, setContentExpansion] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState("cmm1wzc65002pjn04a14llb35");
  const [customInstructions, setCustomInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [overwriteConfirm, setOverwriteConfirm] = useState<{ pendingId: string; description: string } | null>(null);

  const { data: organizations } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    enabled: open,
  });
  const orgId = Array.isArray(organizations) && organizations[0]?.id;

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/organizations", orgId, "projects-user"],
    enabled: !!orgId && open,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/projects-user`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setTopic("");
      setSelectedProjectId("");
      setSlideLength(6);
      setTone("professional");
      setVerbosity("standard");
      setLanguage("ORIGINAL");
      setSpeakerNotes(false);
      setFetchImages(true);
      setStockImages(false);
      setUseBrandedLogo(false);
      setContentExpansion(true);
      setSelectedTemplate("cmm1wzc65002pjn04a14llb35");
      setCustomInstructions("");
      setError(null);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, any> = {
        plain_text: topic.trim(),
        projectId: selectedProjectId,
        length: slideLength,
        tone,
        template: selectedTemplate,
        verbosity,
        language,
        speaker_notes: speakerNotes,
        fetch_images: fetchImages,
        stock_images: stockImages,
        use_branded_logo: useBrandedLogo,
        content_expansion: contentExpansion,
      };
      if (customInstructions.trim()) {
        body.custom_user_instructions = customInstructions.trim();
      }
      const res = await fetch("/api/my-pitch-decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start generation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      onClose();
      onStartGeneration(data.taskId, data.generationId, slideLength);
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  function handleProjectSelect(projectId: string) {
    const project = Array.isArray(projects) ? projects.find((p) => p.id === projectId) : undefined;
    const description = project?.description?.trim() ?? "";
    if (description) {
      if (topic.trim()) {
        setOverwriteConfirm({ pendingId: projectId, description });
      } else {
        setSelectedProjectId(projectId);
        setTopic(description);
      }
    } else {
      setSelectedProjectId(projectId);
    }
  }

  const INSTRUCTION_SUGGESTIONS = [
    "Focus on the market opportunity",
    "Highlight the competitive advantage",
    "Emphasize the revenue model",
    "Include traction and milestones",
  ];

  const stepDescriptions: Record<number, string> = {
    1: "Enter a topic and select your idea",
    2: "Configure your presentation settings",
    3: "Choose a presentation template",
    4: "Add custom instructions (optional)",
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 p-6 pb-0 flex-shrink-0">
          <div className="grid w-12 h-12 place-items-center rounded-full bg-primary/10 text-primary flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 28 28" fill="none">
              <path d="M14.0036 18.6667V24.5M14.0036 18.6667L21.0036 24.5M14.0036 18.6667L7.00358 24.5M24.5036 3.5V13.0667C24.5036 15.0268 24.5036 16.0069 24.1221 16.7556C23.7865 17.4142 23.2511 17.9496 22.5925 18.2852C21.8439 18.6667 20.8638 18.6667 18.9036 18.6667H9.10358C7.1434 18.6667 6.16331 18.6667 5.41461 18.2852C4.75605 17.9496 4.22061 17.4142 3.88506 16.7556C3.50358 16.0069 3.50358 15.0268 3.50358 13.0667V3.5M9.33691 10.5V14M14.0036 8.16667V14M18.6702 12.8333V14M25.6702 3.5H2.33691" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold text-foreground">Create a Pitch Deck</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {step <= TOTAL_STEPS ? stepDescriptions[step] : "AI is building your pitch deck…"}
            </DialogDescription>
          </div>
        </div>

        {/* Step indicator (steps 1–4 only) */}
        {step <= TOTAL_STEPS && (
          <div className="flex items-center gap-1.5 px-6 pt-4 flex-shrink-0">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1 whitespace-nowrap">Step {step}/{TOTAL_STEPS}</span>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Step 1: Topic + idea ──────────────────────────────────── */}
          {step === 1 && (
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Pitch topic or description
                  </span>
                </Label>
                <Textarea
                  rows={5}
                  maxLength={3000}
                  placeholder="Type a topic or description for your pitch deck…"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="resize-none bg-background border-border focus:border-primary"
                />
                <div className="self-end text-xs text-muted-foreground">{topic.length}/3000</div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4" />
                    Which idea would you like to use?
                  </span>
                </Label>
                <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Choose an idea…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(projects) && projects.length > 0 ? (
                      projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none" disabled>No ideas found — create one first</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The pitch will be associated with the selected idea.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Settings ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="p-6 flex flex-col gap-6">
              {/* Length */}
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium text-foreground">Presentation length</Label>
                <div className="grid grid-cols-3 gap-2">
                  <LengthOption label="Short" description="3–8 slides" value={6} active={slideLength === 6} onClick={() => setSlideLength(6)} />
                  <LengthOption label="Informative" description="8–12 slides" value={10} active={slideLength === 10} onClick={() => setSlideLength(10)} />
                  <LengthOption label="Detailed" description="12+ slides" value={14} active={slideLength === 14} onClick={() => setSlideLength(14)} />
                </div>
              </div>

              {/* Tone + Verbosity side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {([
                        ["professional", "Professional"],
                        ["casual", "Casual"],
                        ["educational", "Educational"],
                        ["sales_pitch", "Sales Pitch"],
                        ["funny", "Funny"],
                        ["default", "Default"],
                      ] as [string, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">Verbosity</Label>
                  <Select value={verbosity} onValueChange={setVerbosity}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Language */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORIGINAL">Auto-detect (match input)</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle options */}
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium text-foreground">Options</Label>
                <div className="flex flex-col gap-2">
                  {([
                    [fetchImages, setFetchImages, "Include relevant images"],
                    [stockImages, setStockImages, "Include stock photos"],
                    [speakerNotes, setSpeakerNotes, "Generate speaker notes"],
                    [useBrandedLogo, setUseBrandedLogo, "Use branded logo"],
                    [contentExpansion, setContentExpansion, "Expand content with general knowledge"],
                  ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label]) => (
                    <label key={label} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors">
                      <span className="text-sm text-foreground">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={val}
                        onClick={() => setter(!val)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${val ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Template ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="p-6 flex flex-col gap-4">
              <Label className="text-sm font-medium text-foreground">Choose a template</Label>
              {/* Scrollable 2-col grid matching PHP layout */}
              <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {TEMPLATES.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    active={selectedTemplate === tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Custom instructions ──────────────────────────── */}
          {step === 4 && (
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">Custom instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  rows={4}
                  placeholder="Add any specific instructions for your pitch deck…"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="resize-none bg-background border-border focus:border-primary"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {INSTRUCTION_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCustomInstructions((prev) => prev ? `${prev}, ${s}` : s)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>{/* end scrollable */}

        {/* ── Footer / navigation ──────────────────────────────────────── */}
        {step <= TOTAL_STEPS && (
          <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={step === 1}
              onClick={() => setStep((s) => s - 1)}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>

            {step < TOTAL_STEPS && (
              <Button
                size="sm"
                disabled={step === 1 && (topic.trim().length === 0 || !selectedProjectId)}
                onClick={() => setStep((s) => s + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            {step === TOTAL_STEPS && (
              <Button
                size="sm"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="gap-1"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
                ) : (
                  <><Plus className="w-4 h-4" /> Generate</>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* ── Overwrite confirmation dialog ────────────────────────────────── */}
    <Dialog open={!!overwriteConfirm} onOpenChange={(v) => !v && setOverwriteConfirm(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Overwrite description?</DialogTitle>
          <DialogDescription>
            You already have text in the pitch topic field. Do you want to replace it with this idea's description?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (overwriteConfirm) setSelectedProjectId(overwriteConfirm.pendingId);
            setOverwriteConfirm(null);
          }}>
            Keep existing text
          </Button>
          <Button size="sm" onClick={() => {
            if (overwriteConfirm) {
              setSelectedProjectId(overwriteConfirm.pendingId);
              setTopic(overwriteConfirm.description);
            }
            setOverwriteConfirm(null);
          }}>
            Overwrite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ── Confirm delete dialog ──────────────────────────────────────────────────
function ConfirmDeleteDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete pitch deck?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="rounded-2xl bg-muted p-6">
        <PresentationIcon className="w-12 h-12 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">No pitch decks yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Create your first AI-powered pitch deck in seconds.</p>
      </div>
      <Button onClick={onCreate} className="mt-2 gap-2">
        <Plus className="w-4 h-4" />
        Create Pitch Deck
      </Button>
    </div>
  );
}

// ── Generating decks polling ───────────────────────────────────────────────
function useAutoPolling(decks: PitchDeck[], refetch: () => void) {
  const generatingDecks = decks.filter((d) => d.status === "GENERATING");
  useEffect(() => {
    if (generatingDecks.length === 0) return;
    const interval = setInterval(async () => {
      for (const deck of generatingDecks) {
        try {
          const res = await fetch(`/api/check-pitch-status/${deck.taskId}`, { credentials: "include" });
          const data = await res.json();
          const status = data?.generation?.status ?? data?.status;
          if (status === "COMPLETED" || status === "FAILED") {
            refetch();
            return;
          }
        } catch {
          // swallow
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [generatingDecks.length]);
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Pitch() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { workspaceSlug } = useWorkspace();
  const params = useParams<{ slug: string }>();
  const currentWorkspaceSlug = params.slug || workspaceSlug;
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [generatingState, setGeneratingState] = useState<{
    taskId: string;
    generationId: string;
    slideCount: number;
  } | null>(null);

  // Fetch all user pitch decks
  const { data: decks = [], isLoading, refetch } = useQuery<PitchDeck[]>({
    queryKey: ["/api/my-pitch-decks"],
    queryFn: async () => {
      const res = await fetch("/api/my-pitch-decks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pitch decks");
      return res.json();
    },
    enabled: !!isAuthenticated,
    refetchInterval: false,
  });

  // Auto-poll for decks that are generating
  useAutoPolling(decks, refetch);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pitch-deck-generations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Pitch deck deleted");
      qc.invalidateQueries({ queryKey: ["/api/my-pitch-decks"] });
      setDeleteTargetId(null);
    },
    onError: () => {
      toast.error("Failed to delete pitch deck");
      setDeleteTargetId(null);
    },
  });

  const requestReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pitch-decks/${id}/request-review`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    },
    onSuccess: () => {
      toast.success("Review requested");
      qc.invalidateQueries({ queryKey: ["/api/my-pitch-decks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pitch-decks/${id}/submit`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    },
    onSuccess: () => {
      toast.success("Pitch deck submitted successfully!");
      qc.invalidateQueries({ queryKey: ["/api/my-pitch-decks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleView = (deck: PitchDeck) => {
    if (deck.downloadUrl) {
      setLocation(`/w/${currentWorkspaceSlug}/pitch/${deck.id}`);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <UnifiedSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Pitch</h1>
            <p className="text-sm text-text-secondary">AI-powered pitch deck generator</p>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Create button */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all shadow-sm group max-w-sm"
            >
              <div className="flex items-center justify-center rounded-lg border border-border bg-card text-primary p-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 28 28" fill="none">
                  <path d="M14.0036 18.6667V24.5M14.0036 18.6667L21.0036 24.5M14.0036 18.6667L7.00358 24.5M24.5036 3.5V13.0667C24.5036 15.0268 24.5036 16.0069 24.1221 16.7556C23.7865 17.4142 23.2511 17.9496 22.5925 18.2852C21.8439 18.6667 20.8638 18.6667 18.9036 18.6667H9.10358C7.1434 18.6667 6.16331 18.6667 5.41461 18.2852C4.75605 17.9496 4.22061 17.4142 3.88506 16.7556C3.50358 16.0069 3.50358 15.0268 3.50358 13.0667V3.5M9.33691 10.5V14M14.0036 8.16667V14M18.6702 12.8333V14M25.6702 3.5H2.33691" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground text-sm">Create Pitch Deck with AI</div>
                <div className="text-xs text-muted-foreground mt-0.5">Create or design a Pitch Deck from your idea.</div>
              </div>
            </button>
          </div>

          {/* Deck grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : decks.length === 0 ? (
            <EmptyState onCreate={() => setShowCreate(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {decks.map((deck) => (
                <PitchCard
                  key={deck.id}
                  deck={deck}
                  onDelete={(id) => setDeleteTargetId(id)}
                  onView={handleView}
                  onRequestReview={(id) => requestReviewMutation.mutate(id)}
                  onSubmit={(id) => submitMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
        <BottomNavigation />
      </div>

      {/* Dialogs */}
      <CreatePitchDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onStartGeneration={(taskId, generationId, slideCount) => {
          setGeneratingState({ taskId, generationId, slideCount });
        }}
      />

      {generatingState && (
        <GeneratingDialog
          open={!!generatingState}
          taskId={generatingState.taskId}
          generationId={generatingState.generationId}
          slideCount={generatingState.slideCount}
          onSuccess={(genId) => {
            setGeneratingState(null);
            qc.invalidateQueries({ queryKey: ["/api/my-pitch-decks"] });
            setLocation(`/w/${currentWorkspaceSlug}/pitch/${genId}`);
          }}
          onFailure={() => {
            setGeneratingState(null);
            qc.invalidateQueries({ queryKey: ["/api/my-pitch-decks"] });
            toast.error("Pitch deck generation failed. Please try again.");
          }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteTargetId}
        onConfirm={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
