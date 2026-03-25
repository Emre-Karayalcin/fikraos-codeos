import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ArrowLeft, User, Calendar, Tag, MessageSquare, TrendingUp, Edit, Trash2, Sparkles, Clock, FileText, Info, RefreshCw, Loader2, ExternalLink, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { AllAIOutputsView } from '@/components/idea/AllAIOutputsView';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SCORE_DESCRIPTIONS: Record<string, string[]> = {
  b1: ['No clear problem statement and no evidence of market need.','Problem is vaguely stated; market need is assumed only.','Problem is somewhat defined; limited or anecdotal evidence of need.','Problem is clear; some research, interviews, or evidence supports demand.','Problem is well defined and supported by solid market research or validation.','Problem is exceptionally clear, urgent, and strongly validated by robust market evidence.'],
  b2: ['No clear target customer identified.','Customer definition is extremely broad or unclear.','Customer segment is partially identified but lacks specificity.','Target customer is reasonably clear, with some segmentation and rationale.','Target customer is clearly defined, specific, and well justified.','Target customer is highly specific, deeply understood, and supported by strong insight or evidence.'],
  b3: ['No revenue model presented.','Revenue model is unclear or unrealistic.','Basic revenue model provided, but assumptions are weak or incomplete.','Revenue model is clear and somewhat realistic, with reasonable assumptions.','Revenue model is well explained, realistic, and supported by sound assumptions.','Revenue model is highly credible, financially robust, and clearly linked to business viability.'],
  b4: ['No traction or validation evidence.','Minimal claims of interest with no real proof.','Early validation exists, such as conversations, surveys, or informal testing.','Some meaningful traction exists, such as pilots, early users, or partnership interest.','Strong traction exists, such as active pilots, paying users, signed partnerships, or measurable engagement.','Compelling traction exists with multiple strong validation signals and measurable market pull.'],
  b5: ['No scaling plan provided.','Scaling plan is vague and unrealistic.','Some scaling ideas are mentioned, but they lack detail or feasibility.','Scaling plan is reasonably clear and achievable.','Scaling plan is clear, realistic, and supported by logical growth steps.','Scaling plan is highly credible, well structured, and demonstrates strong understanding of growth levers and constraints.'],
  t1: ['No prototype or proof of concept exists.','Only a concept or mockup exists.','Early prototype exists, but functionality is very limited.','A working prototype or proof of concept demonstrates core functionality.','A strong working prototype exists and demonstrates key use cases well.','A highly functional prototype exists, is tested, and clearly proves feasibility.'],
  t2: ['Technical feasibility is not demonstrated.','Feasibility appears doubtful or unsupported.','Feasibility is partially addressed, but significant uncertainty remains.','Feasibility is reasonably demonstrated based on current progress.','Feasibility is clearly demonstrated with solid technical progress.','Feasibility is strongly proven, with substantial progress and minimal uncertainty.'],
  t3: ['No consideration of technical scalability.','Major technical barriers are evident and unresolved.','Some scalability thinking exists, but major concerns remain.','Solution appears moderately scalable with manageable barriers.','Solution is designed with clear scalability considerations and limited barriers.','Solution shows strong technical scalability with a well considered architecture and low execution risk.'],
  t4: ['No technical risks identified.','Risks are barely acknowledged and no mitigation is provided.','Some risks are identified, but mitigation is weak or incomplete.','Key risks are identified with reasonable mitigation plans.','Risks are clearly identified and supported by strong, practical mitigation plans.','Risk management is comprehensive, proactive, and shows strong technical judgment.'],
  s1: ['No alignment with the Program Objective is shown.','Alignment is weak or asserted without explanation.','Some alignment exists, but the connection is not fully clear.','Project is reasonably aligned with the Program Objective.','Project is clearly and strongly aligned with the Program Objective.','Project is exceptionally well aligned and directly advances the Program Objective in a compelling way.'],
  s2: ['No impact is defined.','Impact is vague and not measurable.','Some intended impact is stated, but measures are weak or unclear.','Expected impact is clear and partially measurable.','Expected impact is clearly defined with strong measurable indicators.','Expected impact is highly clear, meaningful, and supported by specific, credible metrics.'],
  s3: ['No contribution to national or sector priorities is evident.','Contribution is claimed but not explained.','Some relevance exists, but the connection is weak or generic.','Solution shows reasonable contribution to relevant priorities.','Solution clearly contributes to important national or sector-level priorities.','Solution strongly advances strategic national or sector priorities in a clear and well evidenced way.'],
};

const SCORE_COLORS = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-lime-500','bg-green-400','bg-green-600'];

const STATUSES = [
  { id: 'BACKLOG', label: 'Registration & Idea Evaluation', color: 'bg-gray-500' },
  { id: 'UNDER_REVIEW', label: 'Program Participation', color: 'bg-blue-500' },
  { id: 'SHORTLISTED', label: 'Pre-Demo Evaluation & Qualification', color: 'bg-amber-500' },
  { id: 'IN_INCUBATION', label: 'Demo Day & Final Selection', color: 'bg-purple-500' },
  { id: 'ARCHIVED', label: 'Results Published', color: 'bg-teal-500' }
];

interface CommentItem {
  comment: {
    id: string;
    bodyMd: string;
    createdAt: string;
  };
  author: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function AdminIdeaDetail() {
  const { slug, ideaId } = useParams();
  const [, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    summary: '',
    tags: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  // PMO evaluation form state
  const [pmoScores, setPmoScores] = useState<Record<string, number | null>>({
    b1: null, b2: null, b3: null, b4: null, b5: null,
    t1: null, t2: null, t3: null, t4: null,
    s1: null, s2: null, s3: null,
  });
  const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set());
  const toggleGuide = (key: string) => setExpandedGuides(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // Fetch idea details (from projects API since ideas are stored as projects)
  const { data: ideaData, isLoading } = useQuery({
    queryKey: ['/api/projects', ideaId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${ideaId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch idea');
      return response.json();
    },
    enabled: !!ideaId
  });

  // Fetch comments for this project (new API)
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/projects', ideaId, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${ideaId}/comments`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!ideaId
  });

  // Update idea mutation - using projects API
  const updateIdea = useMutation({
    mutationFn: async (data: { title?: string; summary?: string; tags?: string[]; status?: string }) => {
      const response = await fetch(`/api/projects/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update idea');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', ideaId] });
      setIsEditOpen(false);
      toast.success('Idea updated successfully');
    },
    onError: () => {
      toast.error('Failed to update idea');
    }
  });

  // Delete idea mutation - using projects API
  const deleteIdea = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${ideaId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete idea');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Idea deleted successfully');
      setLocation(`/w/${slug}/admin/ideas`);
    },
    onError: () => {
      toast.error('Failed to delete idea');
    }
  });

  // Add comment to project
  const addComment = useMutation({
    mutationFn: async (bodyMd: string) => {
      const response = await fetch(`/api/projects/${ideaId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bodyMd })
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(txt || 'Failed to add comment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', ideaId, 'comments'] });
      setNewComment('');
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    }
  });

  // Status changes work through management API (used by Kanban board)
  const changeStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/ideas/management/${ideaId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', ideaId] });
      toast.success('Status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  // Fetch project evaluation
  const { 
    data: evaluationData, 
    isLoading: evaluationLoading,
    error: evaluationError,
    refetch: refetchEvaluation
  } = useQuery({
    queryKey: ['/api/projects', ideaId, 'evaluation'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${ideaId}/evaluation`, {
        credentials: 'include'
      });
      
      // If no evaluation exists yet, return null instead of throwing
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch evaluation');
      }
      
      return response.json();
    },
    enabled: !!ideaId && activeTab === 'evaluation',
    retry: false
  });

  // Generate evaluation mutation
  const generateEvaluationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${ideaId}/evaluate`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate evaluation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Evaluation generated successfully');
      
      // Refresh evaluation data
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', ideaId, 'evaluation']
      });
      
      // Refetch to get the new data
      refetchEvaluation();
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate evaluation — ${error.message}`);
    }
  });

  // PMO Evaluation query
  const { data: pmoEvalData } = useQuery({
    queryKey: ['/api/workspaces', slug, 'idea-evaluations', ideaId],
    queryFn: async () => {
      const wsRes = await fetch(`/api/workspaces/${slug}`, { credentials: 'include' });
      if (!wsRes.ok) return null;
      const ws = await wsRes.json();
      const res = await fetch(`/api/workspaces/${ws.id}/admin/idea-evaluations/${ideaId}`, { credentials: 'include' });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!ideaId && !!slug && activeTab === 'evaluation',
  });

  // Pre-fill form when data loads
  React.useEffect(() => {
    if (pmoEvalData) {
      setPmoScores({
        b1: pmoEvalData.b1 ?? null, b2: pmoEvalData.b2 ?? null, b3: pmoEvalData.b3 ?? null,
        b4: pmoEvalData.b4 ?? null, b5: pmoEvalData.b5 ?? null,
        t1: pmoEvalData.t1 ?? null, t2: pmoEvalData.t2 ?? null, t3: pmoEvalData.t3 ?? null, t4: pmoEvalData.t4 ?? null,
        s1: pmoEvalData.s1 ?? null, s2: pmoEvalData.s2 ?? null, s3: pmoEvalData.s3 ?? null,
      });
    }
  }, [pmoEvalData]);

  // PMO Evaluation save mutation
  const savePmoEval = useMutation({
    mutationFn: async () => {
      const wsRes = await fetch(`/api/workspaces/${slug}`, { credentials: 'include' });
      if (!wsRes.ok) throw new Error('Failed to get workspace');
      const ws = await wsRes.json();
      const res = await fetch(`/api/workspaces/${ws.id}/admin/idea-evaluations/${ideaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pmoScores),
      });
      if (!res.ok) throw new Error('Failed to save evaluation');
      return res.json();
    },
    onSuccess: () => {
      toast.success('PMO Evaluation saved');
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', slug, 'idea-evaluations', ideaId] });
    },
    onError: () => toast.error('Failed to save PMO Evaluation'),
  });

  // Compute live PMO total score from current pmoScores
  const computePmoTotal = () => {
    const get = (k: string) => pmoScores[k] ?? 0;
    const raw =
      (get('b1')/5)*10 + (get('b2')/5)*8 + (get('b3')/5)*8 + (get('b4')/5)*8 + (get('b5')/5)*6 +
      (get('t1')/5)*10 + (get('t2')/5)*8 + (get('t3')/5)*6 + (get('t4')/5)*6 +
      (get('s1')/5)*12 + (get('s2')/5)*10 + (get('s3')/5)*8;
    return Math.round(raw);
  };

  // Fetch pitch deck generations for this idea
  const { data: pitchDecks = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', ideaId, 'pitch-deck-generations'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${ideaId}/pitch-deck-generations`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ideaId && activeTab === 'pitch-decks',
  });

  // DEFINE MISSING VARIABLES
  // Extract evaluation data from response
  const evaluation = evaluationData?.evaluation || null;
  const hasEvaluation = !!evaluation;
  const isGenerating = generateEvaluationMutation.isPending;

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleEdit = () => {
    if (!idea) return;
    setEditForm({
      title: idea.title,
      summary: idea.summary,
      tags: idea.tags?.join(', ') || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    const tags = editForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    updateIdea.mutate({
      title: editForm.title,
      summary: editForm.summary,
      tags
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    addComment.mutate(newComment);
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

  if (!ideaData) {
    return (
      <div className="flex h-screen">
        <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Idea not found</h2>
            <Button onClick={() => setLocation(`/w/${slug}/admin/ideas`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Ideas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Projects API returns different structure than ideas API
  const idea = ideaData?.idea || ideaData;
  const owner = ideaData?.owner || {
    id: idea?.createdById,
    username: 'Unknown',
    firstName: '',
    lastName: ''
  };
  const statusInfo = STATUSES.find(s => s.id === idea?.status) || STATUSES[0];

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Button variant="ghost" onClick={() => setLocation(`/w/${slug}/admin/ideas`)} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Ideas
              </Button>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2">{idea.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{owner.firstName} {owner.lastName} (@{owner.username})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Badge className={`${statusInfo.color} text-white`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Idea</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this idea? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={() => deleteIdea.mutate()} disabled={deleteIdea.isPending}>
                      {deleteIdea.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="evaluation" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Evaluation
              </TabsTrigger>
              <TabsTrigger value="ai-outputs" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                AI Outputs
              </TabsTrigger>
              <TabsTrigger value="pitch-decks" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Pitch Decks
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments ({comments.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="overflow-hidden border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Age</p>
                          <p className="text-3xl font-bold mt-2">
                            {Math.floor((Date.now() - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">days</p>
                        </div>
                        <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
                          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <p className="text-lg font-bold mt-2">{statusInfo.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">current</p>
                        </div>
                        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                          <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Owner</p>
                          <p className="text-lg font-bold mt-2">{owner.firstName?.charAt(0)}{owner.lastName?.charAt(0)}</p>
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">@{owner.username}</p>
                        </div>
                        <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
                          <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-l-4 border-l-orange-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Tags</p>
                          <p className="text-3xl font-bold mt-2">{idea.tags?.length || 0}</p>
                          <p className="text-xs text-muted-foreground mt-1">total</p>
                        </div>
                        <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
                          <Tag className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-6">
                    {idea.description && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Summary</CardTitle>
                        <CardDescription>Detailed description of the idea</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg leading-relaxed whitespace-pre-wrap">
                          {idea.description}
                        </p>
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex gap-2 mt-6 flex-wrap">
                            {idea.tags.map((tag: string) => (
                              <Badge key={tag} variant="outline" className="px-3 py-1">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    )}

                    {/* Progress Indicators */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Progress Indicators</CardTitle>
                        <CardDescription>Development milestones and completion</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Research Phase</span>
                            <span className="text-sm text-muted-foreground">75%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Planning</span>
                            <span className="text-sm text-muted-foreground">60%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Documentation</span>
                            <span className="text-sm text-muted-foreground">45%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-sm font-medium mb-2">Status</div>
                          <Select
                            value={idea.status}
                            onValueChange={(value) => changeStatus.mutate(value)}
                            disabled={changeStatus.isPending}
                          >
                            <SelectTrigger>
                              <SelectValue>
                                <Badge className={`${statusInfo.color} text-white`}>
                                  {statusInfo.label}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((status) => (
                                <SelectItem key={status.id} value={status.id}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${status.color}`} />
                                    {status.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-sm font-medium mb-1">Created</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(idea.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-sm font-medium mb-1">Last Updated</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(idea.updatedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-sm font-medium mb-1">Owner</div>
                          <div className="text-sm text-muted-foreground">
                            {owner.firstName} {owner.lastName}
                            <br />
                            @{owner.username}
                          </div>
                        </div>
                        {(idea.pitchDeckUrl || idea.deploymentUrl) && (
                          <div className="pt-2 border-t space-y-3">
                            <div className="text-sm font-medium">Submission Assets</div>
                            {idea.pitchDeckUrl && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Pitch Deck</div>
                                <a
                                  href={idea.pitchDeckUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary underline hover:text-primary/80 flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Download ↗
                                </a>
                              </div>
                            )}
                            {idea.deploymentUrl && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Prototype URL</div>
                                <a
                                  href={idea.deploymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary underline hover:text-primary/80 break-all flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Prototype ↗
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Quick Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Time in Current Status</span>
                          <span className="text-sm font-medium">
                            {Math.floor((Date.now() - new Date(idea.updatedAt).getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Total Activity</span>
                          <span className="text-sm font-medium">12 events</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-muted-foreground">Last Activity</span>
                          <span className="text-sm font-medium">
                            {Math.floor((Date.now() - new Date(idea.updatedAt).getTime()) / (1000 * 60 * 60))}h ago
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Evaluation Tab — always shows AI screening, PMO scoring form shown when SHORTLISTED */}
            <TabsContent value="evaluation" className="mt-6">
              <div className="space-y-8">

              {/* ── AI Screening Evaluation — hidden when idea is SHORTLISTED (Step 3) ── */}
              <div className={idea?.status === 'SHORTLISTED' ? 'hidden' : ''}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Screening Evaluation
                </h2>

              {/* Loading State */}
              {evaluationLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Loading evaluation...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {evaluationError && !evaluationLoading && (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className="text-destructive">
                        <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold">Failed to Load Evaluation</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          {(evaluationError as Error).message}
                        </p>
                      </div>
                      <Button onClick={() => refetchEvaluation()} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No Evaluation - Generate Prompt */}
              {!evaluationLoading && !evaluationError && !hasEvaluation && (
                <Card className="border-dashed border-2">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4 py-8">
                      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">No AI Evaluation Yet</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          Generate an AI-powered evaluation for this idea based on your organization's criteria.
                          This will analyze market opportunity, innovation level, feasibility, and more.
                        </p>
                      </div>
                      <Button
                        onClick={() => generateEvaluationMutation.mutate()}
                        disabled={isGenerating}
                        size="lg"
                        className="mt-4"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Evaluation...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Evaluation
                          </>
                        )}
                      </Button>
                      {isGenerating && (
                        <p className="text-xs text-muted-foreground mt-4">
                          This may take 10-30 seconds. Please wait...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Evaluation Results */}
              {!evaluationLoading && hasEvaluation && (
                <div className="space-y-6">
                  {/* Header with Regenerate Button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">Evaluation Results</h3>
                      <p className="text-sm text-muted-foreground">
                        Generated on {new Date(evaluation.evaluatedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => generateEvaluationMutation.mutate()}
                      disabled={isGenerating}
                      variant="outline"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Overall Score */}
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Overall Evaluation Score
                          </CardTitle>
                          <CardDescription>Comprehensive idea assessment</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center mb-8">
                        <div className="relative">
                          <div className="text-7xl font-bold text-primary">
                            {evaluation.overallScore}
                          </div>
                          <div className="text-sm text-muted-foreground text-center mt-2">out of 100</div>
                        </div>
                        <div className="ml-12 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              evaluation.overallScore >= 80 ? 'bg-green-500' :
                              evaluation.overallScore >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}></div>
                            <span className="text-sm">
                              {evaluation.overallScore >= 80 ? 'Strong Performance' :
                               evaluation.overallScore >= 60 ? 'Good Performance' :
                               'Needs Improvement'}
                            </span>
                          </div>
                          {evaluation.insights && (
                            <div className="text-sm text-muted-foreground mt-2 max-w-md">
                              {evaluation.insights.split('\n')[0]}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Score Distribution */}
                      {evaluation.metrics && evaluation.metrics.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                          {evaluation.metrics.slice(0, 5).map((metric: any, index: number) => (
                            <div key={index} className="text-center">
                              <div className="h-32 bg-secondary rounded-lg relative overflow-hidden">
                                <div
                                  className="absolute bottom-0 left-0 right-0 bg-primary transition-all"
                                  style={{ height: `${metric.score}%` }}
                                ></div>
                              </div>
                              <div className="text-xs font-medium mt-2 truncate" title={metric.name}>
                                {metric.name}
                              </div>
                              <div className="text-xs text-muted-foreground">{metric.score}/100</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Detailed Metrics */}
                  {evaluation.metrics && evaluation.metrics.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {evaluation.metrics.map((metric: any, index: number) => (
                        <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl">{metric.icon || '📊'}</span>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-primary">{metric.score}</div>
                                {metric.trend && (
                                  <div className={`text-xs font-medium ${
                                    metric.trend.startsWith('+') ? 'text-green-600 dark:text-green-400' :
                                    metric.trend.startsWith('-') ? 'text-red-600 dark:text-red-400' :
                                    'text-muted-foreground'
                                  }`}>
                                    {metric.trend}
                                  </div>
                                )}
                              </div>
                            </div>
                            <h3 className="font-semibold text-sm">{metric.name}</h3>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {metric.rationale}
                            </p>
                            <div className="mt-4 w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${metric.score}%` }}
                              ></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Strengths & Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    {evaluation.strengths && evaluation.strengths.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
                            <span>✓</span> Key Strengths
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {evaluation.strengths.map((strength: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                              <p className="text-sm">{strength}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {evaluation.recommendations && evaluation.recommendations.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" /> Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {evaluation.recommendations.map((rec: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                              <p className="text-sm">{rec}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Full Insights */}
                  {evaluation.insights && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Info className="w-5 h-5" />
                          Detailed Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {evaluation.insights}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Criteria Used */}
                  {evaluation.criteriaSnapshot && (
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Evaluation Criteria Used
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          {evaluation.criteriaSnapshot.files?.length > 0 && (
                            <div>
                              <span className="font-medium">Files:</span>{' '}
                              {evaluation.criteriaSnapshot.files.join(', ')}
                            </div>
                          )}
                          {evaluation.criteriaSnapshot.text && (
                            <div>
                              <span className="font-medium">Custom criteria:</span> Included
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              </div>{/* end AI Screening section */}

              {/* ── PMO Evaluation (only when SHORTLISTED) ──────────────── */}
              {idea?.status === 'SHORTLISTED' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    PMO Evaluation
                  </h2>
                  <div className="space-y-6">
                    {/* Live score banner */}
                    <Card className="border-amber-500/30 bg-amber-500/5">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Live PMO Total Score</p>
                          <p className="text-4xl font-bold">{computePmoTotal()}<span className="text-lg text-muted-foreground">/100</span></p>
                        </div>
                        <Button onClick={() => savePmoEval.mutate()} disabled={savePmoEval.isPending}>
                          {savePmoEval.isPending ? 'Saving...' : 'Save Evaluation'}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Business Maturity */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Business Maturity <span className="text-muted-foreground font-normal text-sm">(40%)</span></CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { key: 'b1', label: 'Problem clearly defined', weight: '10%' },
                          { key: 'b2', label: 'Target customer identified', weight: '8%' },
                          { key: 'b3', label: 'Revenue model established', weight: '8%' },
                          { key: 'b4', label: 'Traction / early validation', weight: '8%' },
                          { key: 'b5', label: 'Scalability plan', weight: '6%' },
                        ].map(({ key, label, weight }) => (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{label}</p>
                                <span className="text-xs text-muted-foreground">{weight}</span>
                              </div>
                              <button onClick={() => toggleGuide(key)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <BookOpen className="w-3 h-3" />
                                Guide
                                {expandedGuides.has(key) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                              <div className="flex gap-1">
                                {[1,2,3,4,5].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setPmoScores(s => ({ ...s, [key]: v }))}
                                    className={`w-8 h-8 rounded text-xs font-semibold border transition-colors ${
                                      pmoScores[key] === v
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'border-border hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950'
                                    }`}
                                  >{v}</button>
                                ))}
                              </div>
                            </div>
                            {expandedGuides.has(key) && (
                              <div className="ml-2 p-3 bg-muted/40 rounded-lg border border-border space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Score Guide (0–5)</p>
                                {SCORE_DESCRIPTIONS[key]?.map((desc, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white shrink-0 mt-0.5 ${SCORE_COLORS[i]}`}>{i}</span>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Technical Maturity */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Technical Maturity <span className="text-muted-foreground font-normal text-sm">(30%)</span></CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { key: 't1', label: 'Working prototype exists', weight: '10%' },
                          { key: 't2', label: 'Technical feasibility demonstrated', weight: '8%' },
                          { key: 't3', label: 'Scalability considered', weight: '6%' },
                          { key: 't4', label: 'Risk mitigation planned', weight: '6%' },
                        ].map(({ key, label, weight }) => (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{label}</p>
                                <span className="text-xs text-muted-foreground">{weight}</span>
                              </div>
                              <button onClick={() => toggleGuide(key)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <BookOpen className="w-3 h-3" />
                                Guide
                                {expandedGuides.has(key) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                              <div className="flex gap-1">
                                {[1,2,3,4,5].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setPmoScores(s => ({ ...s, [key]: v }))}
                                    className={`w-8 h-8 rounded text-xs font-semibold border transition-colors ${
                                      pmoScores[key] === v
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                                    }`}
                                  >{v}</button>
                                ))}
                              </div>
                            </div>
                            {expandedGuides.has(key) && (
                              <div className="ml-2 p-3 bg-muted/40 rounded-lg border border-border space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Score Guide (0–5)</p>
                                {SCORE_DESCRIPTIONS[key]?.map((desc, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white shrink-0 mt-0.5 ${SCORE_COLORS[i]}`}>{i}</span>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Strategic Alignment */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Strategic Alignment <span className="text-muted-foreground font-normal text-sm">(30%)</span></CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { key: 's1', label: 'Program alignment', weight: '12%' },
                          { key: 's2', label: 'Impact is measurable', weight: '10%' },
                          { key: 's3', label: 'National / sector priorities', weight: '8%' },
                        ].map(({ key, label, weight }) => (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{label}</p>
                                <span className="text-xs text-muted-foreground">{weight}</span>
                              </div>
                              <button onClick={() => toggleGuide(key)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <BookOpen className="w-3 h-3" />
                                Guide
                                {expandedGuides.has(key) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                              <div className="flex gap-1">
                                {[1,2,3,4,5].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setPmoScores(s => ({ ...s, [key]: v }))}
                                    className={`w-8 h-8 rounded text-xs font-semibold border transition-colors ${
                                      pmoScores[key] === v
                                        ? 'bg-purple-500 text-white border-purple-500'
                                        : 'border-border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950'
                                    }`}
                                  >{v}</button>
                                ))}
                              </div>
                            </div>
                            {expandedGuides.has(key) && (
                              <div className="ml-2 p-3 bg-muted/40 rounded-lg border border-border space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Score Guide (0–5)</p>
                                {SCORE_DESCRIPTIONS[key]?.map((desc, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white shrink-0 mt-0.5 ${SCORE_COLORS[i]}`}>{i}</span>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              </div>{/* end space-y-8 wrapper */}
            </TabsContent>

            {/* AI Outputs Tab */}
            <TabsContent value="ai-outputs" className="mt-6">
              <AllAIOutputsView ideaId={ideaId!} />
            </TabsContent>

            {/* Pitch Decks Tab */}
            <TabsContent value="pitch-decks" className="mt-6 space-y-4">
              {/* Uploaded pitch deck (from user submission) */}
              {idea?.pitchDeckUrl && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Uploaded Pitch Deck
                    </CardTitle>
                    <CardDescription>Submitted by the idea owner</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 border border-blue-500/20 rounded-lg bg-background">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-sm font-medium truncate">{idea.pitchDeckUrl}</span>
                      </div>
                      <a
                        href={idea.pitchDeckUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline shrink-0 ml-3"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI-generated pitch decks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Generated Pitch Decks
                  </CardTitle>
                  <CardDescription>AI-generated pitch decks for this idea</CardDescription>
                </CardHeader>
                <CardContent>
                  {pitchDecks.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No pitch decks generated yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pitchDecks.map((deck: any) => (
                        <div key={deck.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{deck.template || 'Pitch Deck'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(deck.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              deck.status === 'COMPLETED' ? 'bg-green-500/15 text-green-500' :
                              deck.status === 'FAILED' ? 'bg-red-500/15 text-red-500' :
                              'bg-yellow-500/15 text-yellow-500'
                            }`}>{deck.status}</span>
                            {deck.downloadUrl && (
                              <a
                                href={deck.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Download
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Comments ({comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Comment */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleAddComment} disabled={addComment.isPending}>
                      {addComment.isPending ? 'Adding...' : 'Add Comment'}
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    {comments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No comments yet</p>
                    ) : (
                      comments.map((item: CommentItem) => (
                        <div key={item.comment.id} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {item.author.firstName} {item.author.lastName} (@{item.author.username})
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{item.comment.bodyMd}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Idea</DialogTitle>
            <DialogDescription>Update the idea details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={editForm.summary}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateIdea.isPending}>
              {updateIdea.isPending ? 'Updating...' : 'Update Idea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
