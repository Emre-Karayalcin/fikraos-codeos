import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ClipboardList, Plus, Trash2, GripVertical, Star, ToggleLeft, AlignLeft, Hash,
  Eye, EyeOff, Pencil, Check, X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type QuestionType = "rating" | "boolean" | "text" | "scale";

interface SurveyQuestion {
  id: string;
  orgId: string;
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  orderIndex: number;
  isActive: boolean;
}

const TYPE_LABELS: Record<QuestionType, { label: string; icon: any; description: string }> = {
  rating: { label: "Star rating", icon: Star, description: "1–5 stars" },
  boolean: { label: "Yes / No", icon: ToggleLeft, description: "Binary choice" },
  text: { label: "Open text", icon: AlignLeft, description: "Free-form answer" },
  scale: { label: "Scale 1–5", icon: Hash, description: "Numeric scale" },
};

function TypeBadge({ type }: { type: QuestionType }) {
  const { label, icon: Icon } = TYPE_LABELS[type] || TYPE_LABELS.text;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
      <Icon size={10} /> {label}
    </span>
  );
}

function QuestionRow({
  question,
  orgId,
  onDeleted,
}: {
  question: SurveyQuestion;
  orgId: string;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.questionText);
  const [type, setType] = useState<QuestionType>(question.questionType as QuestionType);
  const [required, setRequired] = useState(question.isRequired);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/mentor-survey-questions`] });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SurveyQuestion>) =>
      apiRequest("PATCH", `/api/workspaces/${orgId}/admin/mentor-survey-questions/${question.id}`, data),
    onSuccess: () => { invalidate(); setEditing(false); toast({ title: "Question updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/workspaces/${orgId}/admin/mentor-survey-questions/${question.id}`),
    onSuccess: () => { invalidate(); onDeleted(); toast({ title: "Question deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const toggleActive = () => updateMutation.mutate({ isActive: !question.isActive });
  const saveEdit = () => updateMutation.mutate({ questionText: text, questionType: type, isRequired: required });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border transition-colors ${question.isActive ? "border-border bg-card" : "border-dashed border-border/50 bg-muted/20"}`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 mt-0.5 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {editing ? (
            <>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="text-sm"
                placeholder="Question text…"
                autoFocus
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">{TYPE_LABELS[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Switch checked={required} onCheckedChange={setRequired} className="scale-75" />
                  Required
                </label>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <p className={`text-sm font-medium ${!question.isActive ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {question.questionText}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge type={question.questionType as QuestionType} />
                {question.isRequired && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Required</span>
                )}
                {!question.isActive && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Hidden</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={updateMutation.isPending || !text.trim()}
                className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                title="Save"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => { setEditing(false); setText(question.questionText); setType(question.questionType as QuestionType); setRequired(question.isRequired); }}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                title="Cancel"
              >
                <X size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Edit question"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={toggleActive}
                disabled={updateMutation.isPending}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={question.isActive ? "Hide from survey" : "Show in survey"}
              >
                {question.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Delete question"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminMentorSurvey() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<QuestionType>("text");
  const [newRequired, setNewRequired] = useState(false);
  const [adding, setAdding] = useState(false);
  const [localQuestions, setLocalQuestions] = useState<SurveyQuestion[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const orgId = workspace?.id;

  const { data: questions = [], isLoading } = useQuery<SurveyQuestion[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/mentor-survey-questions`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/mentor-survey-questions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  // Keep local state in sync with server data
  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  const reorderMutation = useMutation({
    mutationFn: (updates: { id: string; orderIndex: number }[]) =>
      Promise.all(
        updates.map(({ id, orderIndex }) =>
          apiRequest("PATCH", `/api/workspaces/${orgId}/admin/mentor-survey-questions/${id}`, { orderIndex })
        )
      ),
    onError: () => {
      // Revert on failure
      setLocalQuestions(questions);
      toast({ title: "Failed to save order", variant: "destructive" });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localQuestions.findIndex((q) => q.id === active.id);
    const newIndex = localQuestions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(localQuestions, oldIndex, newIndex);

    // Optimistic update
    setLocalQuestions(reordered);

    // Persist new orderIndexes
    reorderMutation.mutate(
      reordered.map((q, i) => ({ id: q.id, orderIndex: i }))
    );
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/workspaces/${orgId}/admin/mentor-survey-questions`, {
        questionText: newText.trim(),
        questionType: newType,
        isRequired: newRequired,
        orderIndex: localQuestions.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/mentor-survey-questions`] });
      toast({ title: "Question added" });
      setNewText("");
      setNewType("text");
      setNewRequired(false);
      setAdding(false);
    },
    onError: () => toast({ title: "Failed to add question", variant: "destructive" }),
  });

  const activeCount = localQuestions.filter((q) => q.isActive).length;

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Post-Session Survey</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Manage the questions participants answer after each mentor session
                </p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-foreground">{activeCount}</p>
              <p className="text-muted-foreground text-xs">active question{activeCount !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Info banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800/50 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
            Questions marked as <strong>hidden</strong> (<EyeOff className="inline w-3.5 h-3.5 mx-0.5" />) are still saved but won't appear in the member's survey.
            Changes take effect immediately for future survey submissions.
          </div>

          {/* Question list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localQuestions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localQuestions.map((q) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      orgId={orgId!}
                      onDeleted={() => {}}
                    />
                  ))}

                  {localQuestions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No questions yet. Add your first question below.</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add question */}
          {adding ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-medium">New question</p>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. How actionable was the advice you received?"
                autoFocus
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={newType} onValueChange={(v) => setNewType(v as QuestionType)}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {TYPE_LABELS[t].label} — {TYPE_LABELS[t].description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Switch checked={newRequired} onCheckedChange={setNewRequired} className="scale-75" />
                  Required
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewText(""); }}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={createMutation.isPending || !newText.trim()}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? "Adding…" : "Add Question"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => setAdding(true)}
            >
              <Plus size={16} /> Add Question
            </Button>
          )}

          {/* Preview hint */}
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Question types</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
              {(Object.entries(TYPE_LABELS) as [QuestionType, typeof TYPE_LABELS[QuestionType]][]).map(([t, { label, icon: Icon, description }]) => (
                <div key={t} className="flex items-center gap-1.5 text-xs">
                  <Icon size={12} className="text-muted-foreground" />
                  <span className="font-medium text-foreground">{label}</span>
                  <span>— {description}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
