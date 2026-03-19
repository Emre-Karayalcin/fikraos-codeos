import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Trophy,
  Clock,
  Users,
  Calendar,
  ArrowLeft,
  Target,
  Send,
  Loader2,
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  Rocket,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  FileText,
  Upload,
  Link,
  Eye
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation, useParams } from 'wouter';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Challenge {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  slug: string;
  deadline: string;
  tags: string[];
  submissionCount: number;
  maxSubmissions: number;
  emoji: string;
  status: 'draft' | 'active' | 'upcoming' | 'ended';
  prize?: string;
  orgId: string;
  projects?: Project[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  type: 'RESEARCH' | 'DEVELOP' | 'LAUNCH';
  status: string;
  createdAt: string;
  updatedAt: string;
  deploymentUrl?: string;
  pitchDeckUrl?: string;
  createdBy: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

interface Submission {
  id: string;
  challengeId: string;
  userId: string;
  title: string;
  description: string;
  submissionUrl?: string;
  pitchDeckUrl?: string | null;
  prototypeUrl?: string | null;
  status: string;
  score?: number;
  feedback?: string;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    username?: string;
  };
}

interface PitchDeck {
  id: string;
  projectId: string;
  projectTitle?: string;
  status: string;
  downloadUrl?: string;
  createdAt: string;
}

export default function ChallengeDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { workspaceSlug } = useWorkspace();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const challengeSlug = params.challengeSlug || params.slug;
  const currentWorkspaceSlug = params.slug || workspaceSlug;

  interface ChallengeWithCreator {
    challenge: Challenge;
    creator: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
    };
  }

  const { data: challengeData, isLoading: challengeLoading } = useQuery<ChallengeWithCreator>({
    queryKey: ['challenge', challengeSlug],
    queryFn: async () => {
      const response = await fetch(`/api/challenges/slug/${challengeSlug}`, {
        credentials: 'include'
      });
      // Handle 304 (Not Modified) as valid - browser uses cached response
      if (!response.ok && response.status !== 304) {
        throw new Error('Challenge not found');
      }
      return response.json();
    },
    enabled: !!challengeSlug
  });

  const challenge = challengeData?.challenge;
  const projects = challenge?.projects || [];

  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ['/api/organizations', challenge?.orgId, 'admin', 'check-role'],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${challenge!.orgId}/admin/check-role`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!challenge?.orgId,
    retry: false,
  });
  const isMentor = userRole?.role === 'MENTOR';

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: ['submissions', challenge?.id],
    queryFn: async () => {
      if (!challenge?.id) return [];
      const response = await fetch(`/api/challenges/${challenge.id}/submissions`, {
        credentials: 'include'
      });
      if (!response.ok) return [];

      // API returns nested structure { submission: {...}, user: {...} }
      // Transform to flat structure to match Submission interface
      // This prevents RangeError when accessing submission.createdAt for date formatting
      const data = await response.json();
      return data.map((item: any) => ({
        ...item.submission,  // Spread all submission fields to root level
        user: item.user      // Keep user object nested
      }));
    },
    enabled: !!challenge?.id
  });

  const { data: myPitchDecks = [] } = useQuery<PitchDeck[]>({
    queryKey: ['my-pitch-decks'],
    queryFn: async () => {
      const res = await fetch('/api/my-pitch-decks', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  // State for submit modal (per project)
  const [submitModalProject, setSubmitModalProject] = useState<Project | null>(null);
  const [submitPitchDeckUrl, setSubmitPitchDeckUrl] = useState('');
  const [submitPrototypeUrl, setSubmitPrototypeUrl] = useState('');
  const [pitchDeckMode, setPitchDeckMode] = useState<'select' | 'upload'>('select');
  const [uploadingPitch, setUploadingPitch] = useState(false);

  // State for submission preview dialog
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const deleteChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('challenge.delete.errorGeneric'));
      }

      return response.json();
    },
    onSuccess: async () => {
      toast.success(t('challenge.delete.successTitle'));
      
      // ✅ Invalidate queries FIRST before navigating
      await queryClient.invalidateQueries({ queryKey: ['challenges'] });
      await queryClient.invalidateQueries({ queryKey: ['challenge'] });
      
      // ✅ Then navigate after a short delay
      setTimeout(() => {
        if (currentWorkspaceSlug) {
          setLocation(`/w/${currentWorkspaceSlug}/challenges`);
        } else {
          setLocation('/challenges');
        }
      }, 300);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('challenge.delete.errorGeneric'));
    }
  });

  const handleDeleteChallenge = () => {
    if (window.confirm(t('challenge.delete.confirm')) && challenge?.id) {
      deleteChallengeMutation.mutate(challenge?.id);
    }
  };

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => {
      return fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge'] });
      toast.success(t('challenge.projectDeleted'));
    },
    onError: () => {
      toast.error(t('challenge.deleteFailed'));
    }
  });

  const submitProjectMutation = useMutation({
    mutationFn: async ({ projectId, pitchDeckUrl, prototypeUrl }: { projectId: string; pitchDeckUrl: string; prototypeUrl: string }) => {
      const response = await fetch(
        `/api/challenges/${challenge.id}/submit-project/${projectId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ pitchDeckUrl, prototypeUrl }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit project');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', challenge?.id] });
      setSubmitModalProject(null);
      setSubmitPitchDeckUrl('');
      setSubmitPrototypeUrl('');
      toast.success(t('challenge.projectSubmitted') || 'Project submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleProjectClick = async (project: Project) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/chats`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error('Failed to fetch chats');
      
      const chats = await response.json();

      const slug = currentWorkspaceSlug;
      
      if (chats.length > 0) {
        setLocation(`/w/${slug}/chat/${chats[0].id}`);
      } else {
        const chatResponse = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            title: t('chat.defaultTitle')
          }),
          credentials: "include",
        });
        
        if (!chatResponse.ok) throw new Error('Failed to create chat');
        
        const chat = await chatResponse.json();
        setLocation(`/w/${slug}/chat/${chat.id}`);
      }
    } catch (error) {
      console.error("Error navigating to project:", error);
      toast.error(t('challenge.navigationFailed'));
    }
  };

  if (challengeLoading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('challenge.notFound')}</h2>
          <Button onClick={() => {
            if (currentWorkspaceSlug) {
              setLocation(`/w/${currentWorkspaceSlug}/challenges`);
            } else {
              setLocation('/challenges');
            }
          }}>{t('challenge.backToChallenges')}</Button>
        </div>
      </div>
    );
  }

  const deadline = new Date(challenge.deadline);
  const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const progress = (challenge.submissionCount / challenge.maxSubmissions) * 100;

  const getStatusBadge = () => {
    switch (challenge.status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{t('challenge.status.active')}</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{t('challenge.status.upcoming')}</Badge>;
      case 'ended':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">{t('challenge.status.ended')}</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{t('challenge.status.draft')}</Badge>;
    }
  };

  const canSubmit = challenge.status === 'active' && daysLeft >= 0;

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex relative">
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>

      <div className="flex-1 overflow-hidden pb-20 sm:pb-0">
        <div className="h-full overflow-y-auto">
          <div className="absolute top-4 sm:top-6 ltr:right-4 ltr:sm:right-6 rtl:left-4 rtl:sm:left-6 flex items-center gap-2 sm:gap-3 z-10">
            <LanguageSwitcher />
          </div>
          <div className="max-w-5xl mx-auto p-6">
            <Button
              variant="ghost"
              className="mb-6 gap-2"
              onClick={() => {
                if (currentWorkspaceSlug) {
                  setLocation(`/w/${currentWorkspaceSlug}/challenges`);
                } else {
                  setLocation('/challenges');
                }
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('challenge.backToChallenges')}
            </Button>

            <div className="mb-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-5xl">{challenge.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{challenge.title}</h1>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDeleteChallenge}
                        disabled={deleteChallengeMutation.isPending}
                        title={t('challenge.delete.button')}
                      >
                        {deleteChallengeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                      {getStatusBadge()}
                    </div>
                  </div>
                  <p className="text-lg text-muted-foreground mb-4">
                    {challenge.shortDescription}
                  </p>

                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t('challenge.deadline')}: {format(deadline, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {daysLeft > 0 ? t('challenge.daysLeft', { count: daysLeft }) : t('challenge.ended')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t('challenge.submissions', { count: challenge.submissionCount })}
                      </span>
                    </div>
                    {challenge.prize && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-primary">{challenge.prize}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {challenge.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-3">
                {canSubmit && (
                  <SubmitDialog challengeId={challenge.id} onSuccess={() => {}} />
                )}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">{t('challenge.description')}</h2>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap">{challenge.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        {t('challenge.myIdeas', { count: projects.length })}
                      </h2>
                    </div>

                    {/* Submit Your Solution Modal */}
                    <Dialog open={!!submitModalProject} onOpenChange={(open) => { if (!open) { setSubmitModalProject(null); setSubmitPitchDeckUrl(''); setSubmitPrototypeUrl(''); setPitchDeckMode('select'); } }}>
                      <DialogContent className="sm:max-w-[560px]">
                        <DialogHeader>
                          <DialogTitle>{t('challenge.submitYourSolution')}</DialogTitle>
                          <DialogDescription>
                            {t('challenge.submitDescription') || 'Provide your pitch deck and prototype URL to submit your solution.'}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-2">
                          {/* Pitch Deck Section */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Pitch Deck <span className="text-destructive">*</span></Label>
                            <div className="flex gap-2 mb-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={pitchDeckMode === 'select' ? 'default' : 'outline'}
                                onClick={() => setPitchDeckMode('select')}
                              >
                                Select from my decks
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={pitchDeckMode === 'upload' ? 'default' : 'outline'}
                                onClick={() => setPitchDeckMode('upload')}
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Upload PPTX
                              </Button>
                            </div>

                            {pitchDeckMode === 'select' && (
                              <>
                                {myPitchDecks.filter(d => d.status === 'COMPLETED' && d.downloadUrl).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No completed pitch decks found. Generate one in the Pitch Deck section or upload a PPTX file.</p>
                                ) : (
                                  <Select value={submitPitchDeckUrl} onValueChange={setSubmitPitchDeckUrl}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a pitch deck..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {myPitchDecks
                                        .filter(d => d.status === 'COMPLETED' && d.downloadUrl)
                                        .map(deck => (
                                          <SelectItem key={deck.id} value={deck.downloadUrl!}>
                                            {deck.projectTitle || 'Untitled'} — {format(new Date(deck.createdAt), 'MMM d, yyyy')}
                                          </SelectItem>
                                        ))
                                      }
                                    </SelectContent>
                                  </Select>
                                )}
                              </>
                            )}

                            {pitchDeckMode === 'upload' && (
                              <div className="space-y-2">
                                <Input
                                  type="file"
                                  accept=".pptx"
                                  disabled={uploadingPitch}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingPitch(true);
                                    try {
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      const res = await fetch('/api/uploads/pitch-deck', {
                                        method: 'POST',
                                        credentials: 'include',
                                        body: formData,
                                      });
                                      if (!res.ok) throw new Error('Upload failed');
                                      const { url } = await res.json();
                                      setSubmitPitchDeckUrl(url);
                                      toast.success('Pitch deck uploaded');
                                    } catch {
                                      toast.error('Failed to upload pitch deck');
                                    } finally {
                                      setUploadingPitch(false);
                                    }
                                  }}
                                />
                                {uploadingPitch && <p className="text-sm text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</p>}
                                {submitPitchDeckUrl && !uploadingPitch && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Uploaded successfully</p>}
                              </div>
                            )}
                          </div>

                          {/* Prototype URL Section */}
                          <div className="space-y-2">
                            <Label htmlFor="prototypeUrl" className="text-sm font-semibold">
                              Prototype URL <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="prototypeUrl"
                              type="url"
                              placeholder="https://..."
                              value={submitPrototypeUrl}
                              onChange={(e) => setSubmitPrototypeUrl(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Link className="w-3 h-3" />
                              You can create your prototype at{' '}
                              <a href="https://ai.fikrahub.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                ai.fikrahub.com
                              </a>
                            </p>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setSubmitModalProject(null); setSubmitPitchDeckUrl(''); setSubmitPrototypeUrl(''); }}>
                            {t('common.cancel')}
                          </Button>
                          <Button
                            disabled={!submitPitchDeckUrl || !submitPrototypeUrl || submitProjectMutation.isPending || uploadingPitch}
                            onClick={() => {
                              if (submitModalProject) {
                                submitProjectMutation.mutate({ projectId: submitModalProject.id, pitchDeckUrl: submitPitchDeckUrl, prototypeUrl: submitPrototypeUrl });
                              }
                            }}
                          >
                            {submitProjectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t('challenge.submitSolutionButton') || 'Submit Your Solution'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[180px]">Idea</TableHead>
                            <TableHead className="hidden sm:table-cell">Submission Checklist</TableHead>
                            <TableHead className="hidden md:table-cell">Status</TableHead>
                            <TableHead className="ltr:text-right rtl:text-left min-w-[80px]">{t('challenge.table.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projects.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8">
                                <div className="text-text-secondary">
                                  <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p>{t('challenge.noIdeasYet')}</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            projects.map((project) => (
                              <TableRow key={project.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium">
                                  <div
                                    onClick={() => handleProjectClick(project)}
                                    className="cursor-pointer hover:text-primary transition-colors font-semibold"
                                  >
                                    {project.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Last Edited: {format(new Date(project.updatedAt), 'MMM d, yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> AI Built
                                    </Badge>
                                    <Badge className={project.pitchDeckUrl ? "bg-green-500/10 text-green-600 border-green-500/20 text-xs gap-1" : "bg-muted text-muted-foreground text-xs gap-1"}>
                                      <FileText className="w-3 h-3" /> Pitch Deck
                                    </Badge>
                                    <Badge className={project.deploymentUrl ? "bg-green-500/10 text-green-600 border-green-500/20 text-xs gap-1" : "bg-muted text-muted-foreground text-xs gap-1"}>
                                      <Rocket className="w-3 h-3" /> Prototype
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                                    Pending Submission
                                  </Badge>
                                </TableCell>
                                <TableCell className="ltr:text-right rtl:text-left">
                                  <div className="flex items-center gap-2 ltr:justify-end rtl:justify-start">
                                    {canSubmit && !isMentor && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => { setSubmitModalProject(project); setSubmitPitchDeckUrl(''); setSubmitPrototypeUrl(''); setPitchDeckMode('select'); }}
                                        className="h-8"
                                      >
                                        <Send className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                                        Submit
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleProjectClick(project)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {project.deploymentUrl && (
                                          <DropdownMenuItem
                                            onClick={() => window.open(project.deploymentUrl, '_blank')}
                                            className="flex items-center gap-2"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            <span>{t('challenge.openInNewTab')}</span>
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() => {
                                            if (confirm(t('challenge.confirmDelete'))) {
                                              deleteProjectMutation.mutate(project.id);
                                            }
                                          }}
                                          className="flex items-center gap-2 text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span>{t('common.delete')}</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">
                        {t('challenge.submissionsTitle', { count: challenge.submissionCount })}
                      </h2>
                    </div>

                    {submissionsLoading && (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}

                    <div className="space-y-4">
                      {submissions.length === 0 && !submissionsLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>{t('challenge.noSubmissionsYet')}</p>
                        </div>
                      )}

                      {submissions.map(submission => (
                        <SubmissionCard
                          key={submission.id}
                          submission={submission}
                          onViewDetails={() => setSelectedSubmission(submission)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t('challenge.submissionProgress')}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('challenge.capacity')}</span>
                        <span className="font-medium">
                          {challenge.submissionCount}/{challenge.maxSubmissions}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t('challenge.challengeStatus')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('challenge.statusLabel')}</span>
                        {getStatusBadge()}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('challenge.deadline')}</span>
                        <span className="text-sm font-medium">
                          {format(deadline, 'MMM d')}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('challenge.timeLeft')}</span>
                        <span className="text-sm font-medium">
                          {daysLeft > 0 ? `${daysLeft}${t('challenge.days')}` : t('challenge.ended')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Preview Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.title}</DialogTitle>
            <DialogDescription>
              {t('challenge.submittedBy')} {selectedSubmission?.user
                ? `${selectedSubmission.user.firstName || ''} ${selectedSubmission.user.lastName || ''}`.trim() || selectedSubmission.user.username || t('common.anonymous')
                : t('common.anonymous')}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">{t('challenge.description')}</h4>
                <p className="whitespace-pre-wrap text-sm">{selectedSubmission.description || t('challenge.noDescription')}</p>
              </div>

              {selectedSubmission.submissionUrl && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">{t('challenge.projectUrl')}</h4>
                  <a
                    href={selectedSubmission.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 break-all"
                  >
                    {selectedSubmission.submissionUrl}
                  </a>
                </div>
              )}

              {selectedSubmission.pitchDeckUrl && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Pitch Deck</h4>
                  <a
                    href={selectedSubmission.pitchDeckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 break-all"
                  >
                    Download Pitch Deck ↗
                  </a>
                </div>
              )}

              {selectedSubmission.prototypeUrl && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Prototype</h4>
                  <a
                    href={selectedSubmission.prototypeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 break-all"
                  >
                    {selectedSubmission.prototypeUrl}
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">{t('challenge.statusLabel')}</h4>
                  <Badge variant={selectedSubmission.status === 'submitted' ? 'secondary' : 'default'}>
                    {selectedSubmission.status}
                  </Badge>
                </div>

                {selectedSubmission.score && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">{t('challenge.score')}</h4>
                    <p className="text-sm font-medium">{selectedSubmission.score}/100</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">{t('challenge.submittedAt')}</h4>
                <p className="text-sm">{format(new Date(selectedSubmission.createdAt), 'MMMM d, yyyy - h:mm a')}</p>
              </div>

              {selectedSubmission.feedback && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">{t('challenge.feedback')}</h4>
                  <p className="whitespace-pre-wrap text-sm">{selectedSubmission.feedback}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
              {t('common.close')}
            </Button>
            {selectedSubmission?.submissionUrl && (
              <Button onClick={() => window.open(selectedSubmission.submissionUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('challenge.openProject')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}

function SubmitDialog({ challengeId, onSuccess }: { challengeId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    submissionUrl: ''
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/challenges/${challengeId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('challenge.submitFailed'));
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(t('challenge.submitSuccess'), {
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['challenge'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setOpen(false);
      setFormData({ title: '', description: '', submissionUrl: '' });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || t('challenge.submitFailed'), {
        duration: 3000,
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error(t('challenge.fillRequired'), {
        duration: 3000,
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Send className="w-4 h-4" />
          {t('challenge.submitSolution')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('challenge.submitYourSolution')}</DialogTitle>
          <DialogDescription>
            {t('challenge.submitDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('challenge.form.title')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('challenge.form.titlePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('challenge.form.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('challenge.form.descriptionPlaceholder')}
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submissionUrl">{t('challenge.form.demoUrl')}</Label>
            <Input
              id="submissionUrl"
              type="url"
              value={formData.submissionUrl}
              onChange={(e) => setFormData({ ...formData, submissionUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('challenge.submitSolutionButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionCard({ submission, onViewDetails }: { submission: Submission; onViewDetails: () => void }) {
  const { t } = useTranslation();

  const userName = submission.user
    ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim() || submission.user.username || t('common.anonymous')
    : t('common.anonymous');

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-base mb-1">{submission.title}</h4>
            <p className="text-sm text-muted-foreground">{t('challenge.by')} {userName}</p>
          </div>
          <Badge variant={submission.status === 'submitted' ? 'secondary' : 'default'}>
            {submission.status}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
          {submission.description}
        </p>

        <div className="flex items-center gap-2 mb-3">
          {submission.submissionUrl && (
            <a
              href={submission.submissionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {t('challenge.viewDemo')} →
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="gap-2 ml-auto"
          >
            <Eye className="h-4 w-4" />
            {t('challenge.viewDetails')}
          </Button>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
          <span>{format(new Date(submission.createdAt), 'MMM d, yyyy')}</span>
          {submission.score && (
            <span className="font-medium">{t('challenge.score')}: {submission.score}/100</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
