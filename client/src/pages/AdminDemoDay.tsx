import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Users, CheckCircle, Clock, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

interface PresentationState {
  project: { id: string; title: string; ownerName: string } | null;
  allJudgesScored: boolean;
  judgeCount: number;
  scoredCount: number;
}

interface Idea {
  id: string;
  title: string;
  ownerName: string;
  ownerUsername: string;
  status: string;
}

export default function AdminDemoDay() {
  const { slug } = useParams<{ slug: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const qc = useQueryClient();

  const { data: workspace } = useQuery<{ id: string; name: string }>({
    queryKey: ['workspace-by-slug', slug],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!slug,
  });

  const orgId = workspace?.id;

  const { data: ideas = [] } = useQuery<Idea[]>({
    queryKey: ['/api/workspaces', orgId, 'judge/ideas'],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/judge/ideas`, { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        ownerName: `${d.ownerFirstName || ''} ${d.ownerLastName || ''}`.trim() || d.ownerUsername,
        ownerUsername: d.ownerUsername,
        status: d.status,
      }));
    },
    enabled: !!orgId,
  });

  const { data: presState } = useQuery<PresentationState>({
    queryKey: ['/api/presentation/current', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/presentation/current`, { credentials: 'include' });
      if (!res.ok) return { project: null, allJudgesScored: false, judgeCount: 0, scoredCount: 0 };
      return res.json();
    },
    enabled: !!orgId,
    refetchInterval: 8000,
  });

  const setPresenterMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/presentation/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      toast.success('Presenter set');
      qc.invalidateQueries({ queryKey: ['/api/presentation/current', orgId] });
    },
    onError: () => toast.error('Failed to set presenter'),
  });

  const clearPresenterMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/presentation/clear`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      toast.success('Presenter cleared');
      qc.invalidateQueries({ queryKey: ['/api/presentation/current', orgId] });
    },
    onError: () => toast.error('Failed to clear presenter'),
  });

  const currentId = presState?.project?.id ?? null;
  const allScored = presState?.allJudgesScored ?? false;
  const judgeCount = presState?.judgeCount ?? 0;
  const scoredCount = presState?.scoredCount ?? 0;

  const inIncubation = ideas.filter(i => i.status === 'IN_INCUBATION');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar
        workspaceSlug={slug}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(v => !v)}
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Demo Day Control
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set the current presenter. Judges can only score the active presenter.
          </p>
        </div>

        {/* Current presenter banner */}
        {presState?.project ? (
          <Card className="border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-amber-600 animate-pulse" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Now Presenting</p>
                  <p className="font-bold text-lg">{presState.project.title}</p>
                  <p className="text-sm text-muted-foreground">{presState.project.ownerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {allScored ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <span>{scoredCount}/{judgeCount} judges scored</span>
                  </div>
                  {allScored && (
                    <Badge variant="default" className="bg-green-500 mt-1 text-xs">Ready to advance</Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearPresenterMutation.mutate()}
                  disabled={clearPresenterMutation.isPending}
                >
                  <MicOff className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4 flex items-center gap-2 text-muted-foreground">
              <MicOff className="w-4 h-4" />
              <span className="text-sm">No presenter currently set. Select an idea below.</span>
            </CardContent>
          </Card>
        )}

        {/* Idea list */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Presenters ({inIncubation.length})
          </h2>
          {inIncubation.length === 0 && (
            <p className="text-sm text-muted-foreground">No ideas in Demo Day stage (IN_INCUBATION).</p>
          )}
          <div className="space-y-2">
            {inIncubation.map(idea => {
              const isCurrent = idea.id === currentId;
              return (
                <Card key={idea.id} className={`transition-all ${isCurrent ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                  <CardContent className="pt-3 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isCurrent && <Mic className="w-4 h-4 text-amber-500 shrink-0" />}
                      <div>
                        <p className="font-medium text-sm">{idea.title}</p>
                        <p className="text-xs text-muted-foreground">{idea.ownerName} (@{idea.ownerUsername})</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">
                          Presenting
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (currentId && !allScored) {
                              toast.error(`Wait for all ${judgeCount} judges to score the current presenter (${scoredCount}/${judgeCount} done)`);
                              return;
                            }
                            setPresenterMutation.mutate(idea.id);
                          }}
                          disabled={setPresenterMutation.isPending}
                        >
                          <Mic className="w-3.5 h-3.5 mr-1" />
                          Set as Presenting
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
