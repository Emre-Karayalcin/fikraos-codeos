import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Trophy,
  Clock,
  Users,
  Target,
  Plus,
  Loader2,
  ChevronDownIcon,
  Trash2,
  Kanban
} from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useTranslation } from 'react-i18next';
import { useBranding } from '@/contexts/BrandingContext';

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
  image?: string;
  emoji: string;
  status: 'draft' | 'active' | 'upcoming' | 'ended';
  prize?: string;
  orgId: string;
  sortOrder: number;
  isActive: boolean;
}

interface CreateChallengeForm {
  title: string;
  description: string;
  shortDescription: string;
  slug: string;
  deadline: string;
  tags: string;
  maxSubmissions: number;
  emoji: string;
  status: 'draft' | 'active' | 'upcoming' | 'ended';
  prize: string;
  evaluationCriteria: string;
}

interface ChallengeWithCreator {
  challenge: Challenge;
  creator: {
    id: string;
    username: string;
  };
}

function ChallengeCard({ challenge, workspaceSlug, isAdmin, userApplicationChallengeId }: { challenge: Challenge; workspaceSlug?: string; isAdmin?: boolean; userApplicationChallengeId?: string | null }) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const progress = (challenge.submissionCount / challenge.maxSubmissions) * 100;
  const deadline = new Date(challenge.deadline);
  const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Check admin role for this workspace
  const { data: roleData } = useQuery({
    queryKey: [`/api/organizations/${challenge.orgId}/admin/check-role`],
    enabled: !!challenge.orgId && !!user,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Check if user is admin (OWNER or ADMIN role)
  const isAdminUser = isAdmin || roleData?.isAdmin === true || (roleData as any)?.role === 'OWNER' || (roleData as any)?.role === 'ADMIN';

  // Per-user blur: non-admin users with an approved application only see their challenge
  const isLockedForUser = !isAdminUser && !!userApplicationChallengeId && challenge.id !== userApplicationChallengeId;

  const deleteMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('challenges.delete.errorGeneric'));
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(t('challenges.delete.successTitle'));
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('challenges.delete.errorGeneric'));
    }
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('challenges.delete.confirm'))) {
      deleteMutation.mutate(challenge.id);
    }
  };

  const getStatusBadge = () => {
    switch (challenge.status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{t('challenges.status.active')}</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{t('challenges.status.upcoming')}</Badge>;
      case 'ended':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">{t('challenges.status.ended')}</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{t('challenges.status.draft')}</Badge>;
      default:
        return null;
    }
  };

  const getDaysLeftText = () => {
    if (challenge.status === 'ended') return t('challenges.timeLeft.ended');
    if (challenge.status === 'upcoming') return t('challenges.timeLeft.startsIn', { days: Math.abs(daysLeft) });
    if (daysLeft < 0) return t('challenges.timeLeft.ended');
    if (daysLeft === 0) return t('challenges.timeLeft.endsToday');
    if (daysLeft === 1) return t('challenges.timeLeft.oneDay');
    return t('challenges.timeLeft.daysLeft', { days: daysLeft });
  };

  return (
    <div className={`relative ${!challenge.isActive || isLockedForUser ? 'group/inactive' : ''}`}>
      {/* Blur overlay for inactive challenges */}
      {!challenge.isActive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm border border-dashed border-border pointer-events-none">
          <span className="text-xs font-semibold text-muted-foreground bg-background/80 px-2 py-1 rounded-md">
            Coming Soon
          </span>
        </div>
      )}
      {/* Blur overlay for challenges not matching user's application */}
      {isLockedForUser && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm border border-dashed border-border pointer-events-none">
          <span className="text-xs font-semibold text-muted-foreground bg-background/80 px-2 py-1 rounded-md">
            Not Available
          </span>
        </div>
      )}
      <Card
        className={`group hover:shadow-lg transition-all cursor-pointer border border-border/50 hover:border-border h-full ${!challenge.isActive || isLockedForUser ? 'opacity-50 pointer-events-none select-none' : ''}`}
        onClick={() => {
          if (!challenge.isActive || isLockedForUser) return;
          if (workspaceSlug) {
            setLocation(`/w/${workspaceSlug}/challenges/${challenge.slug}`);
          } else {
            setLocation(`/challenges/${challenge.slug}`);
          }
        }}
        data-testid={`challenge-card-${challenge.slug}`}
      >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="text-3xl mb-2">{challenge.emoji}</div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {isAdminUser && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/w/${workspaceSlug}/admin/challenges/${challenge.id}/ideas`);
                    }}
                    title={t('challenges.manageIdeas')}
                  >
                    <Kanban className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    title={t('challenges.delete.button')}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </>
              )}
              {getStatusBadge()}
            </div>
            {challenge.prize && (
              <Badge variant="outline" className="text-xs">
                {challenge.prize}
              </Badge>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {challenge.title}
        </h3>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {challenge.shortDescription}
        </p>

        <div className="flex flex-wrap gap-1 mb-4">
          {(challenge.tags || []).slice(0, 3).map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              {getDaysLeftText()}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-4 h-4" />
              {t('challenges.submissions', { count: challenge.submissionCount })}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('challenges.submissionsLabel')}</span>
              <span>{challenge.submissionCount}/{challenge.maxSubmissions}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}

function CreateChallengeDialog({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("23:59");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreateChallengeForm>({
    title: '',
    description: '',
    shortDescription: '',
    slug: '',
    deadline: '',
    tags: '',
    maxSubmissions: 100,
    emoji: '🎯',
    status: 'draft',
    prize: '',
    evaluationCriteria: ''
  });

  React.useEffect(() => {
    if (selectedDate) {
      const [hours, minutes] = selectedTime.split(':');
      const datetime = new Date(selectedDate);
      datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      setFormData(prev => ({ ...prev, deadline: datetime.toISOString() }));
    }
  }, [selectedDate, selectedTime]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateChallengeForm) => {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
          orgId: user?.primaryOrgId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('challenges.create.errorGeneric'));
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(t('challenges.create.successTitle'));
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        shortDescription: '',
        slug: '',
        deadline: '',
        tags: '',
        maxSubmissions: 100,
        emoji: '🎯',
        status: 'draft',
        prize: '',
        evaluationCriteria: ''
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || t('challenges.create.errorGeneric'));
    }
  });

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.deadline) {
      toast.error(t('challenges.create.missingFieldsTitle'));
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 justify-center">
          <Plus className="w-4 h-4" />
          {t('challenges.create.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('challenges.create.title')}</DialogTitle>
          <DialogDescription>
            {t('challenges.create.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="title">{t('challenges.form.title')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={t('challenges.form.titlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="slug">{t('challenges.form.slug')}</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder={t('challenges.form.slugPlaceholder')}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="shortDescription">{t('challenges.form.shortDescription')} *</Label>
              <Input
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder={t('challenges.form.shortDescriptionPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">{t('challenges.form.description')} *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('challenges.form.descriptionPlaceholder')}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="px-1">{t('challenges.form.deadline')} *</Label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="date-picker" className="px-1 text-xs text-muted-foreground">
                    {t('challenges.form.date')}
                  </Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="date-picker"
                        className="w-full justify-between font-normal"
                      >
                        {selectedDate ? selectedDate.toLocaleDateString() : t('challenges.form.selectDate')}
                        <ChevronDownIcon className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <Label htmlFor="time-picker" className="px-1 text-xs text-muted-foreground">
                    {t('challenges.form.time')}
                  </Label>
                  <Input
                    type="time"
                    id="time-picker"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('challenges.form.status')}</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('challenges.status.draft')}</SelectItem>
                  <SelectItem value="active">{t('challenges.status.active')}</SelectItem>
                  <SelectItem value="upcoming">{t('challenges.status.upcoming')}</SelectItem>
                  <SelectItem value="ended">{t('challenges.status.ended')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emoji">{t('challenges.form.emoji')}</Label>
              <Input
                id="emoji"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                placeholder="🎯"
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSubmissions">{t('challenges.form.maxSubmissions')}</Label>
              <Input
                id="maxSubmissions"
                type="number"
                value={formData.maxSubmissions}
                onChange={(e) => setFormData({ ...formData, maxSubmissions: parseInt(e.target.value) || 100 })}
                min={1}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="prize">{t('challenges.form.prize')}</Label>
              <Input
                id="prize"
                value={formData.prize}
                onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                placeholder={t('challenges.form.prizePlaceholder')}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="tags">{t('challenges.form.tags')}</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder={t('challenges.form.tagsPlaceholder')}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="evaluationCriteria">
                {t('challenges.form.evaluationCriteria')}
              </Label>
              <Textarea
                id="evaluationCriteria"
                value={formData.evaluationCriteria}
                onChange={(e) => setFormData({ ...formData, evaluationCriteria: e.target.value })}
                placeholder={t('challenges.form.evaluationCriteriaPlaceholder')}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t('challenges.form.evaluationCriteriaHelp')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('challenges.create.button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Challenges() {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language?.startsWith('ar') ? 'ar' : 'en';
  const { challengesNameEn, challengesNameAr, challengesDescEn, challengesDescAr } = useBranding();
  const challengesTitle = (lang === 'ar' ? challengesNameAr : challengesNameEn) || t('challenges.title');
  const challengesSubtitle = (lang === 'ar' ? challengesDescAr : challengesDescEn) || t('challenges.subtitle');
   const [activeFilter, setActiveFilter] = useState<'all' | 'draft' | 'active' | 'upcoming' | 'ended'>('all');
   const { user } = useAuth();
   const { slug } = useParams<{ slug?: string }>();
   const { workspaceSlug } = useWorkspace();

   const currentWorkspaceSlug = slug || workspaceSlug || undefined;

   const { data: challengesData = [], isLoading } = useQuery<ChallengeWithCreator[]>({
     queryKey: ['challenges', user?.primaryOrgId],
     queryFn: async () => {
       const response = await fetch(`/api/challenges?orgId=${user?.primaryOrgId}`, {
         credentials: 'include'
       });
       if (!response.ok) throw new Error(t('challenges.errorFetch'));
       return response.json();
     },
     enabled: !!user?.primaryOrgId
   });

   const challenges = challengesData.map(item => item.challenge);

   // Sort by sortOrder, then by createdAt
   const sortedChallenges = [...challenges].sort((a, b) => {
     if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
     return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
   });

   const filteredChallenges = sortedChallenges.filter(challenge => {
     if (activeFilter === 'all') return true;
     return challenge.status === activeFilter;
   });

   const activeChallenges = challenges.filter(c => c.status === 'active').length;
   const upcomingChallenges = challenges.filter(c => c.status === 'upcoming').length;

   const { data: workspaceRoleData } = useQuery({
     queryKey: [`/api/organizations/${user?.primaryOrgId}/admin/check-role`],
     enabled: !!user?.primaryOrgId,
     retry: false,
     staleTime: 5 * 60 * 1000,
   });
   const isAdmin = user?.isAdmin === true || (workspaceRoleData as any)?.isAdmin === true || (workspaceRoleData as any)?.role === 'OWNER' || (workspaceRoleData as any)?.role === 'ADMIN';

   const { data: myApplication } = useQuery({
     queryKey: ['/api/my-application'],
     queryFn: async () => {
       const response = await fetch('/api/my-application', { credentials: 'include' });
       if (!response.ok) return null;
       return response.json();
     },
     enabled: !!user && !isAdmin,
     staleTime: 5 * 60 * 1000,
   });

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
           <div className="max-w-7xl mx-auto p-6">
             {/* Header */}
             <div className="mb-8">
               <div className="rtl:hidden flex items-center justify-between rtl:flex-row mb-4">
                 <div className="flex items-center gap-3">
                   <Trophy className="w-8 h-8 text-primary" />
                   <h1 className="text-3xl font-bold">{challengesTitle}</h1>
                 </div>
                 <div className='ltr:mr-28 rtl:ml-28'>
                   {isAdmin && (
                     <CreateChallengeDialog onSuccess={() => {}} />
                   )}
                 </div>
               </div>
               <div className="ltr:hidden flex items-center justify-between rtl:flex-row mb-4">
                 {isAdmin && (
                   <CreateChallengeDialog onSuccess={() => {}} />
                 )}
                 <div className="flex items-center gap-3">
                   <Trophy className="w-8 h-8 text-primary" />
                   <h1 className="text-3xl font-bold">{challengesTitle}</h1>
                 </div>
               </div>
               <p className="text-muted-foreground text-lg">
                 {challengesSubtitle}
               </p>
               <div className="flex gap-6 mt-4 text-sm">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                   <span className="text-muted-foreground">
                     {t('challenges.activeChallenges', { count: activeChallenges })}
                   </span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                   <span className="text-muted-foreground">
                     {t('challenges.upcomingChallenges', { count: upcomingChallenges })}
                   </span>
                 </div>
               </div>
             </div>

             {/* Filter Tabs */}
             <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg w-fit">
               {[
                 { key: 'all', label: t('challenges.filters.all') },
                 { key: 'active', label: t('challenges.filters.active') },
                 { key: 'upcoming', label: t('challenges.filters.upcoming') },
                 { key: 'ended', label: t('challenges.filters.ended') }
               ].map(filter => (
                 <Button
                   key={filter.key}
                   variant={activeFilter === filter.key ? "default" : "ghost"}
                   size="sm"
                   onClick={() => setActiveFilter(filter.key as any)}
                   className="text-sm"
                   data-testid={`filter-${filter.key}`}
                 >
                   {filter.label}
                 </Button>
               ))}
             </div>

             {/* Loading State */}
             {isLoading && (
               <div className="flex items-center justify-center py-12">
                 <Loader2 className="w-8 h-8 animate-spin text-primary" />
               </div>
             )}

             {/* Challenges Grid */}
             {!isLoading && filteredChallenges.length > 0 && (
               <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="challenges-grid">
                 {filteredChallenges.map(challenge => (
                   <ChallengeCard key={challenge.id} challenge={challenge} workspaceSlug={currentWorkspaceSlug} isAdmin={isAdmin} userApplicationChallengeId={myApplication?.challengeId ?? null} />
                 ))}
               </div>
             )}

             {/* Empty State */}
             {!isLoading && filteredChallenges.length === 0 && (
               <div className="text-center py-12">
                 <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-muted-foreground mb-2">
                   {t('challenges.empty.title')}
                 </h3>
                 <p className="text-sm text-muted-foreground mb-4">
                   {activeFilter === 'all'
                     ? t('challenges.empty.noCreated')
                     : t('challenges.empty.tryFilters')
                   }
                 </p>
                 {isAdmin && activeFilter === 'all' && (
                   <CreateChallengeDialog onSuccess={() => {}} />
                 )}
               </div>
             )}
           </div>
         </div>
       </div>

       <BottomNavigation />
     </div>
   );
}
