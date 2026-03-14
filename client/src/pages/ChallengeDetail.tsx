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
  Search,
  Code,
  Rocket,
  MoreHorizontal,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  FileText,
  Eye,
  Edit
} from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useTranslation } from 'react-i18next';
import { buildIdeaInitialMessage } from '@/lib/buildIdeaMessage';
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

const ALL_COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'EG', name: 'Egypt' },
  { code: 'JO', name: 'Jordan' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'QA', name: 'Qatar' },
  { code: 'OM', name: 'Oman' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
];

export default function ChallengeDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { workspaceSlug } = useWorkspace();
  const { aiBuilderEnabled, formSubmissionEnabled, manualBuildEnabled } = useBranding();
  const { t, i18n } = useTranslation();
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

  // State for creation dialog and quick submit form
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [showQuickSubmitForm, setShowQuickSubmitForm] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [quickFormData, setQuickFormData] = useState({
    title: '',
    description: '',
    submissionUrl: '',
  });

  // State for manual build form
  const [showManualBuildForm, setShowManualBuildForm] = useState(false);
  const [manualBuildStep, setManualBuildStep] = useState(1);
  const [manualFormData, setManualFormData] = useState({
    ideaDescription: '',
    country: 'SA',
    uniqueness: '',
    ideaName: '',
  });

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

  const duplicateProjectMutation = useMutation({
    mutationFn: async (project: Project) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${project.title} (${t('common.copy')})`,
          description: project.description,
          orgId: challenge?.orgId,
          challengeId: challenge?.id
        }),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to duplicate project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge'] });
      toast.success(t('challenge.projectDuplicated'));
    },
    onError: () => {
      toast.error(t('challenge.duplicateFailed'));
    }
  });

  const submitProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(
        `/api/challenges/${challenge.id}/submit-project/${projectId}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit project');
      }
      return response.json();
    },
    onSuccess: () => {
      // Refresh both projects and submissions
      queryClient.invalidateQueries({
        queryKey: [`/api/challenges/slug/${challengeSlug}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/challenges/${challenge.id}/submissions`],
      });
      toast.success(t('challenge.projectSubmitted') || 'Project submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmitProject = (projectId: string) => {
    if (window.confirm(t('challenge.confirmSubmit') || 'Submit this project to the challenge? This action cannot be undone.')) {
      submitProjectMutation.mutate(projectId);
    }
  };

  const quickSubmitMutation = useMutation({
    mutationFn: async (data: typeof quickFormData) => {
      // Create a project instead of a direct submission
      // This keeps the flow consistent: both "Build with AI" and "Submit via Form"
      // create projects that appear in "My Challenge Ideas", then user clicks Submit
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgId: challenge.orgId,
          challengeId: challenge.id,
          title: data.title,
          description: data.description,
          deploymentUrl: data.submissionUrl || '',
          type: 'LAUNCH'
        }),
      });
      if (!response.ok) throw new Error('Failed to create idea');
      return response.json();
    },
    onSuccess: () => {
      // Refresh the challenge data to show new project in "My Challenge Ideas"
      queryClient.invalidateQueries({
        queryKey: [`/api/challenges/slug/${challengeSlug}`],
      });
      queryClient.invalidateQueries({
        queryKey: ['challenge'],
      });
      setShowQuickSubmitForm(false);
      setFormStep(1);
      setQuickFormData({ title: '', description: '', submissionUrl: '' });
      toast.success(t('challenge.ideaCreated') || 'Idea created successfully! Click Submit to enter the challenge.');
    },
    onError: () => {
      toast.error(t('challenge.ideaCreationFailed') || 'Failed to create idea');
    },
  });

  const handleQuickSubmit = () => {
    quickSubmitMutation.mutate(quickFormData);
  };

  const manualBuildMutation = useMutation({
    mutationFn: async (data: typeof manualFormData) => {
      // Step 1: Create project
      const projectResp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgId: challenge.orgId,
          challengeId: challenge.id,
          title: data.ideaName || 'Untitled idea',
          description: `${data.ideaDescription}\n\nCountry: ${data.country}\nUnique: ${data.uniqueness}`,
          type: 'LAUNCH'
        }),
      });
      if (!projectResp.ok) throw new Error('Failed to create project');
      const project = await projectResp.json();

      // Step 2: Create chat
      const chatResp = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, title: 'Chat' }),
        credentials: 'include'
      });
      if (!chatResp.ok) throw new Error('Failed to create chat');
      const chat = await chatResp.json();

      // Step 3: Build initial message
      const countryObj = ALL_COUNTRIES.find(c => c.code === data.country) || { code: data.country, name: data.country };
      const initialMessage = buildIdeaInitialMessage({
        ideaName: data.ideaName,
        ideaDescription: data.ideaDescription,
        countryCode: countryObj.code,
        countryName: countryObj.name,
        uniqueness: data.uniqueness
      });

      // Step 4: Post first user message
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          content: initialMessage,
          role: 'user'
        }),
        credentials: 'include'
      });

      // Step 5: Trigger AI agent to respond
      await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: initialMessage,
          chatId: chat.id,
          language: i18n.language || 'en'
        }),
        credentials: 'include'
      });

      return { project, chat };
    },
    onSuccess: (data) => {
      // Refresh queries
      queryClient.invalidateQueries({
        queryKey: [`/api/challenges/slug/${challengeSlug}`],
      });
      queryClient.invalidateQueries({
        queryKey: ['challenge'],
      });

      // Reset form
      setShowManualBuildForm(false);
      setManualBuildStep(1);
      setManualFormData({ ideaDescription: '', country: 'SA', uniqueness: '', ideaName: '' });

      // Navigate to chat
      if (currentWorkspaceSlug) {
        setLocation(`/w/${currentWorkspaceSlug}/chat/${data.chat.id}`);
      } else {
        setLocation(`/chat/${data.chat.id}`);
      }
    },
    onError: () => {
      toast.error(t('challenge.ideaCreationFailed') || 'Failed to create idea');
    },
  });

  const handleManualBuildSubmit = () => {
    manualBuildMutation.mutate(manualFormData);
  };

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

  const createIdeaMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error(t('auth.signInRequired'));
      }

      const orgId = challenge?.orgId;
      if (!orgId) {
        throw new Error(t('challenge.noOrganization'));
      }

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgId,
          challengeId: challenge?.id,
          title: challenge?.title + " #" + ((challenge?.projects?.length || 0) + 1),
          description: challenge?.description,
          type: 'LAUNCH'
        })
      });

      if (!projectResponse.ok) {
        throw new Error(t('challenge.createProjectFailed'));
      }

      const project = await projectResponse.json();

      const chatResponse = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: project.id,
          title: t('chat.defaultTitle')
        })
      });

      if (!chatResponse.ok) {
        throw new Error(t('challenge.createChatFailed'));
      }

      const chat = await chatResponse.json();

      // ✅ FIX: Send initial user message
      const initialMessage = `I want to create an idea for the challenge: "${challenge.title}"\n\nChallenge Description: ${challenge.description}`;

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          role: 'user',
          text: initialMessage
        }),
        credentials: 'include'
      });

      // ✅ FIX: Trigger agent to start conversation
      await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '__AGENT_START__',
          chatId: chat.id,
          language: i18n.language || 'en',
        }),
        credentials: 'include'
      });

      return { project, chat };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenge'] });

      const slug = currentWorkspaceSlug;
      if (slug) {
        setLocation(`/w/${slug}/chat/${data.chat.id}`);
      } else {
        setLocation(`/chat/${data.chat.id}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t('challenge.createIdeaFailed'), {
        duration: 3000,
      });
    }
  });

  const handleCreateIdea = () => {
    createIdeaMutation.mutate();
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
                      {!isMentor && <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
                        <DialogTrigger asChild>
                          <Button size="lg" className="gap-2">
                            <Lightbulb className="w-4 h-4" />
                            {t('challenge.createIdea')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>{t('challenge.chooseCreationMethod')}</DialogTitle>
                            <DialogDescription>
                              {t('challenge.chooseMethodDescription')}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid gap-4 py-4">
                            {/* Build with AI Option */}
                            {aiBuilderEnabled && (
                              <button
                                onClick={() => {
                                  setShowCreationDialog(false);
                                  handleCreateIdea();
                                }}
                                className="flex flex-col items-start gap-2 rounded-lg border-2 border-border p-4 hover:border-primary hover:bg-accent transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="rounded-full bg-primary/10 p-2">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="font-semibold text-lg">{t('challenge.buildWithAI')}</div>
                                </div>
                                <p className="text-sm text-muted-foreground ltr:ml-11 rtl:mr-11">
                                  {t('challenge.buildWithAIDescription')}
                                </p>
                              </button>
                            )}

                            {/* Submit via Form Option */}
                            {formSubmissionEnabled && (
                              <button
                                onClick={() => {
                                  setShowCreationDialog(false);
                                  setShowQuickSubmitForm(true);
                                }}
                                className="flex flex-col items-start gap-2 rounded-lg border-2 border-border p-4 hover:border-primary hover:bg-accent transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="rounded-full bg-primary/10 p-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="font-semibold text-lg">{t('challenge.submitViaForm')}</div>
                                </div>
                                <p className="text-sm text-muted-foreground ltr:ml-11 rtl:mr-11">
                                  {t('challenge.submitViaFormDescription')}
                                </p>
                              </button>
                            )}

                            {/* Build Manually Option */}
                            {manualBuildEnabled && (
                              <button
                                onClick={() => {
                                  setShowCreationDialog(false);
                                  setShowManualBuildForm(true);
                                }}
                                className="flex flex-col items-start gap-2 rounded-lg border-2 border-border p-4 hover:border-primary hover:bg-accent transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="rounded-full bg-primary/10 p-2">
                                    <Edit className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="font-semibold text-lg">{t('challenge.buildManually')}</div>
                                </div>
                                <p className="text-sm text-muted-foreground ltr:ml-11 rtl:mr-11">
                                  {t('challenge.buildManuallyDescription')}
                                </p>
                              </button>
                            )}

                            {/* Show message if all options are disabled */}
                            {!aiBuilderEnabled && !formSubmissionEnabled && !manualBuildEnabled && (
                              <div className="text-center text-muted-foreground py-8">
                                <p>{t('challenge.submissionDisabled') || 'Submission options are currently disabled for this workspace.'}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>}
                    </div>

                    {/* 3-Step Quick Submit Form Dialog */}
                    <Dialog open={showQuickSubmitForm} onOpenChange={setShowQuickSubmitForm}>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>
                            {t('challenge.createYourIdea')} - {t('challenge.step')} {formStep} {t('challenge.of')} 3
                          </DialogTitle>
                          <DialogDescription>
                            {formStep === 1 && t('challenge.step1Description')}
                            {formStep === 2 && t('challenge.step2Description')}
                            {formStep === 3 && t('challenge.reviewBeforeCreate')}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                          {/* Step 1: Basic Info */}
                          {formStep === 1 && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="title">{t('challenge.ideaTitle')} *</Label>
                                <Input
                                  id="title"
                                  value={quickFormData.title}
                                  onChange={(e) => setQuickFormData({ ...quickFormData, title: e.target.value })}
                                  placeholder={t('challenge.ideaTitlePlaceholder')}
                                  maxLength={100}
                                />
                              </div>
                              <div>
                                <Label htmlFor="description">{t('challenge.description')} *</Label>
                                <Textarea
                                  id="description"
                                  value={quickFormData.description}
                                  onChange={(e) => setQuickFormData({ ...quickFormData, description: e.target.value })}
                                  placeholder={t('challenge.descriptionPlaceholder')}
                                  rows={6}
                                  maxLength={5000}
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                  {quickFormData.description.length} / 5000 {t('challenge.characters')}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Step 2: Additional Details */}
                          {formStep === 2 && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="url">{t('challenge.projectUrl')} ({t('challenge.optional')})</Label>
                                <Input
                                  id="url"
                                  type="url"
                                  value={quickFormData.submissionUrl}
                                  onChange={(e) => setQuickFormData({ ...quickFormData, submissionUrl: e.target.value })}
                                  placeholder={t('challenge.appendixPlaceholder') || 'Add links to supporting documents, research papers, or related resources'}
                                />
                              </div>
                            </div>
                          )}

                          {/* Step 3: Review */}
                          {formStep === 3 && (
                            <div className="space-y-4">
                              <div className="rounded-lg border p-4 space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground">{t('challenge.title')}</h4>
                                  <p>{quickFormData.title}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground">{t('challenge.description')}</h4>
                                  <p className="whitespace-pre-wrap">{quickFormData.description}</p>
                                </div>
                                {quickFormData.submissionUrl && (
                                  <div>
                                    <h4 className="font-semibold text-sm text-muted-foreground">{t('challenge.url')}</h4>
                                    <a href={quickFormData.submissionUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                      {quickFormData.submissionUrl}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {t('challenge.reviewSubmissionNote')}
                              </p>
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          {formStep > 1 && (
                            <Button
                              variant="outline"
                              onClick={() => setFormStep(formStep - 1)}
                            >
                              {t('challenge.back')}
                            </Button>
                          )}
                          {formStep < 3 ? (
                            <Button
                              onClick={() => {
                                // Validation
                                if (formStep === 1) {
                                  if (!quickFormData.title.trim()) {
                                    toast.error(t('challenge.titleRequired'));
                                    return;
                                  }
                                  if (quickFormData.description.length < 50) {
                                    toast.error(t('challenge.descriptionMinLength'));
                                    return;
                                  }
                                }
                                setFormStep(formStep + 1);
                              }}
                            >
                              {t('challenge.next')}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleQuickSubmit()}
                              disabled={quickSubmitMutation.isPending}
                            >
                              {quickSubmitMutation.isPending ? t('challenge.creatingIdea') : t('challenge.createIdeaButton')}
                            </Button>
                          )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* 4-Step Manual Build Form Dialog */}
                    <Dialog open={showManualBuildForm} onOpenChange={setShowManualBuildForm}>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>
                            {t('challenge.buildManually')} - {t('challenge.step')} {manualBuildStep} {t('challenge.of')} 4
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                          {/* Step 1: Idea Description */}
                          {manualBuildStep === 1 && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="ideaDescription">{t('manual.step1.title') || 'What is your idea? Explain it comprehensively.'}</Label>
                                <Textarea
                                  id="ideaDescription"
                                  value={manualFormData.ideaDescription}
                                  onChange={(e) => setManualFormData({ ...manualFormData, ideaDescription: e.target.value })}
                                  rows={5}
                                  className="mt-2"
                                  placeholder={t('manual.step1.placeholder') || 'Describe your idea...'}
                                />
                              </div>
                            </div>
                          )}

                          {/* Step 2: Country */}
                          {manualBuildStep === 2 && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="country">{t('manual.step2.title') || 'Where are you launching your idea?'}</Label>
                                <select
                                  id="country"
                                  value={manualFormData.country}
                                  onChange={(e) => setManualFormData({ ...manualFormData, country: e.target.value })}
                                  className="w-full mt-2 bg-transparent rounded-lg border px-4 py-3"
                                >
                                  <option value="SA">Saudi Arabia</option>
                                  <option value="AE">United Arab Emirates</option>
                                  <option value="EG">Egypt</option>
                                  <option value="JO">Jordan</option>
                                  <option value="LB">Lebanon</option>
                                  <option value="KW">Kuwait</option>
                                  <option value="BH">Bahrain</option>
                                  <option value="QA">Qatar</option>
                                  <option value="OM">Oman</option>
                                  <option value="US">United States</option>
                                  <option value="GB">United Kingdom</option>
                                  <option value="CA">Canada</option>
                                  <option value="AU">Australia</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Step 3: Uniqueness */}
                          {manualBuildStep === 3 && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="uniqueness">{t('manual.step3.title') || 'What makes your idea unique?'}</Label>
                                <Input
                                  id="uniqueness"
                                  value={manualFormData.uniqueness}
                                  onChange={(e) => setManualFormData({ ...manualFormData, uniqueness: e.target.value })}
                                  className="mt-2"
                                  placeholder={t('manual.step3.placeholder') || 'Enter what makes your idea stand out...'}
                                />
                              </div>
                            </div>
                          )}

                          {/* Step 4: Idea Name */}
                          {manualBuildStep === 4 && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="ideaName">{t('manual.step5.title') || 'What\'s your idea name?'}</Label>
                                <Input
                                  id="ideaName"
                                  value={manualFormData.ideaName}
                                  onChange={(e) => setManualFormData({ ...manualFormData, ideaName: e.target.value })}
                                  className="mt-2"
                                  placeholder={t('manual.step4.placeholder') || 'Enter your idea name...'}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          {manualBuildStep > 1 && (
                            <Button
                              variant="outline"
                              onClick={() => setManualBuildStep(manualBuildStep - 1)}
                            >
                              {t('challenge.back')}
                            </Button>
                          )}
                          {manualBuildStep < 4 ? (
                            <Button
                              onClick={() => {
                                // Validation
                                if (manualBuildStep === 1 && !manualFormData.ideaDescription.trim()) {
                                  toast.error(t('challenge.ideaDescriptionRequired') || 'Please enter your idea description');
                                  return;
                                }
                                if (manualBuildStep === 3 && !manualFormData.uniqueness.trim()) {
                                  toast.error(t('challenge.uniquenessRequired') || 'Please enter what makes your idea unique');
                                  return;
                                }
                                setManualBuildStep(manualBuildStep + 1);
                              }}
                              disabled={
                                (manualBuildStep === 1 && !manualFormData.ideaDescription.trim()) ||
                                (manualBuildStep === 3 && !manualFormData.uniqueness.trim())
                              }
                            >
                              {t('challenge.next')}
                            </Button>
                          ) : (
                            <Button
                              onClick={handleManualBuildSubmit}
                              disabled={manualBuildMutation.isPending || !manualFormData.ideaName.trim()}
                            >
                              {manualBuildMutation.isPending ? t('challenge.creatingIdea') : t('challenge.createIdeaButton')}
                            </Button>
                          )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px]">{t('challenge.table.title')}</TableHead>
                            <TableHead className="hidden sm:table-cell">{t('challenge.table.type')}</TableHead>
                            <TableHead className="hidden lg:table-cell">{t('challenge.table.created')}</TableHead>
                            <TableHead className="ltr:text-right rtl:text-left min-w-[80px]">{t('challenge.table.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projects.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8">
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
                                    className="cursor-pointer hover:text-primary transition-colors"
                                  >
                                    {project.title}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <div className="flex items-center gap-2">
                                    {project.type === 'RESEARCH' && (
                                      <>
                                        <Search className="w-4 h-4 text-blue-500" />
                                        <span className="text-blue-500 text-sm font-medium">{t('project.type.research')}</span>
                                      </>
                                    )}
                                    {project.type === 'DEVELOP' && (
                                      <>
                                        <Code className="w-4 h-4 text-green-500" />
                                        <span className="text-green-500 text-sm font-medium">{t('project.type.develop')}</span>
                                      </>
                                    )}
                                    {project.type === 'LAUNCH' && (
                                      <>
                                        <Rocket className="w-4 h-4 text-orange-500" />
                                        <span className="text-orange-500 text-sm font-medium">{t('project.type.launch')}</span>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <div className="flex items-center gap-2 text-text-secondary">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(project.createdAt), 'MMM d, yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell className="ltr:text-right rtl:text-left">
                                  <div className="flex items-center gap-2 ltr:justify-end rtl:justify-start">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleSubmitProject(project.id)}
                                      disabled={submitProjectMutation.isPending}
                                      className="h-8"
                                    >
                                      <Send className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                                      {t('challenge.submit')}
                                    </Button>
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
                                          onClick={() => duplicateProjectMutation.mutate(project)}
                                          className="flex items-center gap-2"
                                        >
                                          <Copy className="w-4 h-4" />
                                          <span>{t('common.duplicate')}</span>
                                        </DropdownMenuItem>
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
