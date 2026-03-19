import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Kanban, Plus, MoreVertical, User, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

interface Idea {
  idea: {
    id: string;
    title: string;
    summary: string;
    status: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    // Challenge project fields (present when filtering by challenge)
    pitchDeckUrl?: string | null;
    deploymentUrl?: string | null;
    submitted?: boolean;
    challengeId?: string | null;
  };
  owner: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

// Droppable Column Component
function DroppableColumn({ status, children }: { status: { id: string; label: string; color: string }; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: status.id
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[320px] flex flex-col bg-surface/50 rounded-lg p-4"
    >
      {children}
    </div>
  );
}

// Draggable Card Component
function DraggableIdeaCard({ item, onClick, onDelete }: { item: Idea; onClick: () => void; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.idea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="cursor-move hover:shadow-md transition-shadow"
        onClick={(e) => {
          console.log('🎯 Card clicked:', { ideaId: item.idea.id, isDragging, title: item.idea.title });
          if (!isDragging) {
            console.log('✨ Calling onClick handler');
            onClick();
          } else {
            console.log('⏸️ Skipping onClick - card is dragging');
          }
        }}
      >
        <CardHeader className="p-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium line-clamp-2 flex-1 ltr:text-left rtl:text-right">
              {item.idea.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          {item.idea.tags && item.idea.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {item.idea.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <p className="text-xs text-muted-foreground line-clamp-2 ltr:text-left rtl:text-right">
            {item.idea.summary}
          </p>
          {/* Show submission assets if this is a challenge project */}
          {item.idea.challengeId && (
            <div className="flex gap-1 flex-wrap pt-1">
              {item.idea.submitted && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-green-500/10 text-green-700 border border-green-500/20 rounded-full px-2 py-0.5">
                  ✓ Submitted
                </span>
              )}
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium border rounded-full px-2 py-0.5 ${item.idea.pitchDeckUrl ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                📊 Pitch Deck
              </span>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium border rounded-full px-2 py-0.5 ${item.idea.deploymentUrl ? 'bg-purple-500/10 text-purple-700 border-purple-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                🚀 Prototype
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-1 flex-row">
              <User className="w-3 h-3" />
              <span>{item.owner.username}</span>
            </div>
            <span>{new Date(item.idea.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminIdeasKanban() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: '', summary: '', tags: '' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('all');
  // status-change confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIdea, setConfirmIdea] = useState<Idea | null>(null);
  const [confirmTargetStatus, setConfirmTargetStatus] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');
  // delete confirmation state
  const [deleteIdeaId, setDeleteIdeaId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  // Status definitions with translation keys
  const STATUSES = [
    { id: 'BACKLOG', labelKey: 'admin.ideas.statuses.backlog', color: 'bg-gray-500' },
    { id: 'UNDER_REVIEW', labelKey: 'admin.ideas.statuses.underReview', color: 'bg-blue-500' },
    { id: 'SHORTLISTED', labelKey: 'admin.ideas.statuses.shortlisted', color: 'bg-yellow-500' },
    { id: 'IN_INCUBATION', labelKey: 'admin.ideas.statuses.inIncubation', color: 'bg-purple-500' },
    { id: 'ARCHIVED', labelKey: 'admin.ideas.statuses.archived', color: 'bg-red-500' }
  ];

  // Get workspace by slug to get its ID
  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug
  });

  // Fetch challenges for filter dropdown
  const { data: challengesData } = useQuery({
    queryKey: ['/api/challenges', workspace?.id],
    queryFn: async () => {
      const response = await fetch(`/api/challenges?orgId=${workspace?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) return { data: [] };
      return response.json();
    },
    enabled: !!workspace?.id
  });

  const challengesList: { challenge: { id: string; title: string } }[] = Array.isArray(challengesData) ? challengesData : [];

  // Fetch ideas (all or filtered by challenge)
  const { data: ideasData, isLoading } = useQuery({
    queryKey: ['/api/ideas/management', workspace?.id, selectedChallengeId] as const,
    queryFn: async () => {
      if (selectedChallengeId !== 'all') {
        const response = await fetch(`/api/challenges/${selectedChallengeId}/ideas`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch challenge ideas');
        return response.json();
      }
      const response = await fetch(`/api/ideas/management?orgId=${workspace?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch ideas');
      return response.json();
    },
    enabled: !!workspace?.id
  });

  const ideas = ideasData?.data || [];

  // Create idea mutation
  const createIdea = useMutation({
     mutationFn: async (data: { title: string; summary: string; tags: string[]; orgId: string }) => {
       const response = await fetch('/api/ideas', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         credentials: 'include',
         body: JSON.stringify(data)
       });
      if (!response.ok) throw new Error('Failed to create idea');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas', workspace?.id] });
      setIsCreateOpen(false);
      setNewIdea({ title: '', summary: '', tags: '' });
      toast.success(`${t('admin.ideas.create.success.title')} — ${t('admin.ideas.create.success.description')}`);
    },
    onError: () => {
      toast.error(`${t('admin.ideas.create.error.title')} — ${t('admin.ideas.create.error.description')}`);
    }
  });

  // Delete idea mutation
  const deleteIdea = useMutation({
    mutationFn: async (ideaId: string) => {
      const response = await fetch(`/api/organizations/${workspace!.id}/admin/ideas/${ideaId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete idea');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas/management', workspace?.id] });
      setIsDeleteOpen(false);
      setDeleteIdeaId(null);
      toast.success('Idea deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete idea');
    }
  });

  // Update status mutation (accept optional commentBody)
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, commentBody }: { id: string; status: string; commentBody?: string }) => {
      const response = await fetch(`/api/ideas/management/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, commentBody })
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      setConfirmOpen(false);
      setStatusComment('');
      queryClient.invalidateQueries({ queryKey: ['/api/ideas/management', workspace?.id] });
    },
    onError: () => {
      toast.error(`${t('admin.ideas.update.error.title')} — ${t('admin.ideas.update.error.description')}`);
    }
  });

  const getIdeasByStatus = (status: string) => {
    if (!ideas) return [];
    return ideas.filter((item: Idea) => item.idea.status === status);
  };

  const handleCreateIdea = () => {
    if (!newIdea.title || !newIdea.summary) {
      toast.error(`${t('admin.ideas.create.validation.title')} — ${t('admin.ideas.create.validation.description')}`);
      return;
    }

    const tags = newIdea.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    createIdea.mutate({
      title: newIdea.title,
      summary: newIdea.summary,
      tags,
      orgId: workspace!.id
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdea = ideas.find((item: Idea) => item.idea.id === active.id);
    if (!activeIdea) return;

    let targetStatus = over.id as string;

    const overIdea = ideas.find((item: Idea) => item.idea.id === over.id);
    if (overIdea) {
      targetStatus = overIdea.idea.status;
    }

    if (activeIdea.idea.status !== targetStatus && STATUSES.find(s => s.id === targetStatus)) {
      // open confirmation modal and require admin comment for the change
      setConfirmIdea(activeIdea);
      setConfirmTargetStatus(targetStatus);
      setStatusComment('');
      setConfirmOpen(true);
    }
  };

  const confirmChange = async () => {
    if (!confirmIdea || !confirmTargetStatus) {
      setConfirmOpen(false);
      return;
    }

    if (!statusComment.trim()) {
      toast({
        title: t('admin.ideas.move.validation.title') ?? 'Comment required',
        description: t('admin.ideas.move.validation.description') ?? 'Please add a comment explaining the status change.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // 1) Post comment (include status + body in the comment payload)
      const commentPayload = {
        bodyMd: `${statusComment.trim()}`,
        status: confirmTargetStatus
      };

      const commentRes = await fetch(`/api/projects/${confirmIdea.idea.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(commentPayload)
      });

      if (!commentRes.ok) {
        const errText = await commentRes.text().catch(() => 'Failed to post comment');
        throw new Error(errText || 'Failed to post comment');
      }

      // invalidate comments cache for this project/idea
      queryClient.invalidateQueries({ queryKey: ['/api/projects', confirmIdea.idea.id, 'comments'] });

      // 2) Update status (separate API call)
      await updateStatus.mutateAsync({ id: confirmIdea.idea.id, status: confirmTargetStatus });

      toast.success(`${t('admin.ideas.move.success.title') ?? 'Status updated'} — ${t('admin.ideas.move.success.description') ?? 'Idea status and comment saved.'}`);
    } catch (e: any) {
      console.error('Error during status change + comment:', e);
      toast.error(`${t('admin.ideas.move.error.title') ?? 'Update failed'} — ${e?.message ?? (t('admin.ideas.move.error.description') ?? 'Failed to change status')}`);
    } finally {
      setConfirmOpen(false);
      setStatusComment('');
      setConfirmIdea(null);
      setConfirmTargetStatus(null);
    }
  };

  const handleIdeaClick = async (ideaId: string) => {
    setLocation(`/w/${slug}/admin/ideas/${ideaId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-row">
              <Kanban className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold ltr:text-left rtl:text-right">
                  {t('admin.ideas.header.title')}
                </h1>
                <p className="text-muted-foreground ltr:text-left rtl:text-right">
                  {t('admin.ideas.header.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {challengesList.length > 0 && (
                <Select value={selectedChallengeId} onValueChange={setSelectedChallengeId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by challenge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ideas</SelectItem>
                    {challengesList.map((c) => (
                      <SelectItem key={c.challenge.id} value={c.challenge.id}>
                        {c.challenge.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('admin.ideas.newIdea')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="ltr:text-left rtl:text-right">
                    {t('admin.ideas.create.title')}
                  </DialogTitle>
                  <DialogDescription className="ltr:text-left rtl:text-right">
                    {t('admin.ideas.create.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="ltr:text-left rtl:text-right">
                      {t('admin.ideas.create.fields.title')}
                    </Label>
                    <Input
                      id="title"
                      value={newIdea.title}
                      onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                      placeholder={t('admin.ideas.create.fields.titlePlaceholder')}
                      dir="auto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="summary" className="ltr:text-left rtl:text-right">
                      {t('admin.ideas.create.fields.summary')}
                    </Label>
                    <Textarea
                      id="summary"
                      value={newIdea.summary}
                      onChange={(e) => setNewIdea({ ...newIdea, summary: e.target.value })}
                      placeholder={t('admin.ideas.create.fields.summaryPlaceholder')}
                      rows={4}
                      dir="auto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags" className="ltr:text-left rtl:text-right">
                      {t('admin.ideas.create.fields.tags')}
                    </Label>
                    <Input
                      id="tags"
                      value={newIdea.tags}
                      onChange={(e) => setNewIdea({ ...newIdea, tags: e.target.value })}
                      placeholder={t('admin.ideas.create.fields.tagsPlaceholder')}
                      dir="auto"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    {t('admin.ideas.create.cancel')}
                  </Button>
                  <Button onClick={handleCreateIdea} disabled={createIdea.isPending}>
                    {createIdea.isPending 
                      ? t('admin.ideas.create.creating') 
                      : t('admin.ideas.create.submit')
                    }
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto p-6">
            <div className="flex gap-4 h-full min-w-max">
              {STATUSES.map((status) => {
                const statusIdeas = getIdeasByStatus(status.id);

                return (
                  <DroppableColumn key={status.id} status={{ ...status, label: t(status.labelKey) }}>
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-row">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <h3 className="font-semibold">{t(status.labelKey)}</h3>
                        <Badge variant="secondary" className="ltr:ml-2 rtl:mr-2">
                          {statusIdeas.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Droppable Area */}
                    <SortableContext
                      items={statusIdeas.map((item: Idea) => item.idea.id)}
                      strategy={verticalListSortingStrategy}
                      id={status.id}
                    >
                      <div
                        className="flex-1 space-y-3 overflow-y-auto min-h-[200px]"
                        data-status={status.id}
                      >
                        {statusIdeas.length === 0 ? (
                          <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed border-border rounded-lg">
                            {t('admin.ideas.dropHere')}
                          </div>
                        ) : (
                          statusIdeas.map((item: Idea) => (
                            <DraggableIdeaCard
                              key={item.idea.id}
                              item={item}
                              onClick={() => handleIdeaClick(item.idea.id)}
                              onDelete={() => { setDeleteIdeaId(item.idea.id); setIsDeleteOpen(true); }}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>

                    {/* Submission summary row — shown when filtering by a specific challenge */}
                    {selectedChallengeId !== 'all' && statusIdeas.length > 0 && (() => {
                      const submittedCount = statusIdeas.filter((item: Idea) => item.idea.submitted).length;
                      const pendingCount = statusIdeas.length - submittedCount;
                      return (
                        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                          {submittedCount > 0 && (
                            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-700 border border-green-500/20 rounded-full px-2 py-0.5 font-medium">
                              ✓ {submittedCount} submitted
                            </span>
                          )}
                          {pendingCount > 0 && (
                            <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-700 border border-yellow-500/20 rounded-full px-2 py-0.5 font-medium">
                              ⏳ {pendingCount} pending
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </DroppableColumn>
                );
              })}
            </div>
          </div>
        </DndContext>

        {/* Loading overlay when navigating */}
        {isNavigating && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">
                {t('admin.ideas.opening')}
              </span>
            </div>
          </div>
        )}

        {/* Delete confirmation dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={(v) => { setIsDeleteOpen(v); if (!v) setDeleteIdeaId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Idea</DialogTitle>
              <DialogDescription>Are you sure you want to delete this idea? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteIdeaId(null); }}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteIdeaId && deleteIdea.mutate(deleteIdeaId)}
                disabled={deleteIdea.isPending}
              >
                {deleteIdea.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation dialog for status change */}
        <Dialog open={confirmOpen} onOpenChange={(v) => { setConfirmOpen(v); if (!v) { setConfirmIdea(null); setConfirmTargetStatus(null); setStatusComment(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.ideas.move.title') ?? 'Move idea status'}</DialogTitle>
              <DialogDescription>
                {confirmIdea ? (
                  <>
                    {t('admin.ideas.move.confirm', { status: confirmTargetStatus }) ?? `Are you sure you want to move the idea to "${confirmTargetStatus}"?`}
                    <div className="mt-3 text-sm text-muted-foreground">
                      {t('admin.ideas.move.instruction') ?? 'Add a comment explaining why this idea is being moved to this status.'}
                    </div>
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <Label htmlFor="status-comment">{t('admin.ideas.move.commentLabel') ?? 'Comment'}</Label>
              <Textarea
                id="status-comment"
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={4}
                placeholder={t('admin.ideas.move.commentPlaceholder') ?? 'Explain the reason for this status change...'}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setConfirmOpen(false); setStatusComment(''); }}>
                {t('common.cancel') ?? 'Cancel'}
              </Button>
              <Button onClick={confirmChange} disabled={updateStatus.isLoading}>
                {updateStatus.isLoading ? t('admin.ideas.move.saving') ?? 'Saving...' : t('admin.ideas.move.confirmButton') ?? 'Confirm and Comment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}