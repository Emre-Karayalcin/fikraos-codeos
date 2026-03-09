import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Kanban, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
function DraggableIdeaCard({ item, onClick }: { item: Idea; onClick: () => void }) {
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
          if (!isDragging) {
            onClick();
          }
        }}
      >
        <CardHeader className="p-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium line-clamp-2 flex-1 ltr:text-left rtl:text-right">
              {item.idea.title}
            </CardTitle>
          </div>
          {item.idea.tags && item.idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.idea.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{item.owner.firstName || item.owner.username}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminChallengeIdeas() {
  const { slug, challengeId } = useParams<{ slug: string; challengeId: string }>();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIdea, setConfirmIdea] = useState<Idea | null>(null);
  const [confirmTargetStatus, setConfirmTargetStatus] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  // Status definitions
  const STATUSES = [
    { id: 'BACKLOG', labelKey: 'admin.ideas.statuses.backlog', color: 'bg-gray-500' },
    { id: 'UNDER_REVIEW', labelKey: 'admin.ideas.statuses.underReview', color: 'bg-blue-500' },
    { id: 'SHORTLISTED', labelKey: 'admin.ideas.statuses.shortlisted', color: 'bg-yellow-500' },
    { id: 'IN_INCUBATION', labelKey: 'admin.ideas.statuses.inIncubation', color: 'bg-purple-500' },
    { id: 'ARCHIVED', labelKey: 'admin.ideas.statuses.archived', color: 'bg-red-500' }
  ];

  // Fetch challenge details
  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: [`/api/challenges/${challengeId}`],
    enabled: !!challengeId
  });

  // Fetch challenge-specific ideas
  const { data: ideasData, isLoading: ideasLoading } = useQuery({
    queryKey: ['/api/challenges', challengeId, 'ideas'],
    queryFn: async () => {
      const response = await fetch(`/api/challenges/${challengeId}/ideas`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch challenge ideas');
      }
      const json = await response.json();
      return json.data || [];
    },
    enabled: !!challengeId
  });

  const ideas = ideasData || [];

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/projects/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges', challengeId, 'ideas'] });
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const ideaId = active.id as string;
    const newStatus = over.id as string;
    const idea = ideas.find((i: Idea) => i.idea.id === ideaId);

    if (idea && idea.idea.status !== newStatus) {
      setConfirmIdea(idea);
      setConfirmTargetStatus(newStatus);
      setConfirmOpen(true);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmIdea || !confirmTargetStatus) return;

    try {
      // Post comment
      const commentPayload = {
        content: statusComment || 'Status changed via admin board',
        ideaId: confirmIdea.idea.id
      };

      const commentRes = await fetch(`/api/projects/${confirmIdea.idea.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(commentPayload)
      });

      if (!commentRes.ok) {
        throw new Error('Failed to post comment');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/projects', confirmIdea.idea.id, 'comments'] });

      // Update status
      await updateStatus.mutateAsync({ id: confirmIdea.idea.id, status: confirmTargetStatus });

      toast.success(t('admin.ideas.move.success.title'));
    } catch (e: any) {
      console.error('Error during status change + comment:', e);
      toast.error(t('admin.ideas.move.error.title'));
    } finally {
      setConfirmOpen(false);
      setStatusComment('');
      setConfirmIdea(null);
      setConfirmTargetStatus(null);
    }
  };

  const handleIdeaClick = (ideaId: string) => {
    setLocation(`/w/${slug}/admin/ideas/${ideaId}`);
  };

  const activeIdea = activeId ? ideas.find((i: Idea) => i.idea.id === activeId) : null;

  if (challengeLoading || ideasLoading) {
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
        {/* Header with back button */}
        <div className="p-6 border-b border-border">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/w/${slug}/challenges`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToChallenges')}
          </Button>

          <div className="flex items-center gap-3">
            <Kanban className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">
                {challenge?.title ? `Ideas: ${challenge.title}` : t('admin.ideas.header.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('admin.ideas.challengeBoard.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full">
              {STATUSES.map((status) => {
                const statusIdeas = ideas.filter((i: Idea) => i.idea.status === status.id);
                return (
                  <DroppableColumn key={status.id} status={status}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <h3 className="font-semibold">{t(status.labelKey)}</h3>
                        <Badge variant="secondary">{statusIdeas.length}</Badge>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                      {statusIdeas.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          {t('admin.ideas.dropHere')}
                        </div>
                      ) : (
                        <SortableContext
                          items={statusIdeas.map((i: Idea) => i.idea.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {statusIdeas.map((idea: Idea) => (
                            <DraggableIdeaCard
                              key={idea.idea.id}
                              item={idea}
                              onClick={() => handleIdeaClick(idea.idea.id)}
                            />
                          ))}
                        </SortableContext>
                      )}
                    </div>
                  </DroppableColumn>
                );
              })}
            </div>

            <DragOverlay>
              {activeIdea && (
                <Card className="w-[320px] shadow-lg">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">
                      {activeIdea.idea.title}
                    </CardTitle>
                  </CardHeader>
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Status change confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.ideas.move.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.ideas.move.confirm', {
                status: confirmTargetStatus ? t(STATUSES.find(s => s.id === confirmTargetStatus)?.labelKey || '') : ''
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.ideas.move.commentLabel')}</label>
              <Textarea
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                placeholder={t('admin.ideas.move.commentPlaceholder')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirmStatusChange}
              disabled={!statusComment.trim()}
            >
              {t('admin.ideas.move.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
