import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, MessageCircle, Bell, Calendar, Clock, MoreHorizontal, Copy, Search, Code, Rocket, ExternalLink, X } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import toast from "react-hot-toast";
import { useBranding } from "@/contexts/BrandingContext";

export default function MyIdeas() {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n?.language?.startsWith('ar') ? 'ar' : 'en';
  const { myIdeasNameEn, myIdeasNameAr, myIdeasDescEn, myIdeasDescAr } = useBranding();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const qc = useQueryClient();

  // Messages modal state
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [messagesProject, setMessagesProject] = useState<any | null>(null);
  const [newComment, setNewComment] = useState('');

  const { data: organizations } = useQuery({
    queryKey: ['/api/organizations'],
    enabled: !!isAuthenticated
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/organizations', Array.isArray(organizations) && organizations[0]?.id, 'projects-user'],
    enabled: !!isAuthenticated && Array.isArray(organizations) && !!organizations[0]?.id
  });

  const commentsQuery = useQuery({
    queryKey: ['/api/projects', messagesProject?.id, 'comments'],
    queryFn: async () => {
      if (!messagesProject?.id) return [];
      const res = await fetch(`/api/projects/${messagesProject.id}/comments`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load comments');
      return res.json();
    },
    enabled: messagesOpen && !!messagesProject?.id
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => {
      return fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', Array.isArray(organizations) && organizations[0]?.id, 'projects']
      });
      toast.success(t('projects.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('projects.deleteError'));
    }
  });

  const duplicateProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `${project.title} (${t('common.copy')})`,
          description: project.description,
          orgId: Array.isArray(organizations) ? organizations[0]?.id : null,
          type: project.type,
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(t('projects.duplicateError'));
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', Array.isArray(organizations) && organizations[0]?.id, 'projects']
      });
      toast.success(t('projects.duplicateSuccess'));
    },
    onError: () => {
      toast.error(t('projects.duplicateError'));
    }
  });

  const postComment = useMutation({
    mutationFn: async (bodyMd: string) => {
      const res = await fetch(`/api/projects/${messagesProject!.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bodyMd })
      });
      if (!res.ok) {
        const err = await res.text().catch(() => 'Failed');
        throw new Error(err);
      }
      return res.json();
    },
    onSuccess: () => {
      setNewComment('');
      qc.invalidateQueries({ queryKey: ['/api/projects', messagesProject?.id, 'comments'] });
      toast.success(t('comments.posted') ?? 'Comment posted');
    },
    onError: () => toast.error(t('comments.postError') ?? 'Failed to post comment')
  });
  
  const handleProjectClick = async (project: any) => {
    try {
      // For Research/Develop projects, go to regular chat
      const response = await fetch(`/api/projects/${project.id}/chats`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(t('errors.failedToFetch'));
      }
      
      const chats = await response.json();

      let slug = Array.isArray(organizations) ? organizations[0]?.slug : null;
      if (chats.length > 0) {
        setLocation(`/w/${slug}/chat/${chats[0].id}`);
      } else {
        const chatResponse = await apiRequest(
          "POST",
          "/api/chats",
          {
            projectId: project.id,
            title: t('navigation.chat')
          }
        );

        if (!chatResponse.ok) {
          throw new Error(t('errors.failedToCreate'));
        }
        
        const chat = await chatResponse.json();
        setLocation(`/w/${slug}/chat/${chat.id}`);
      }
    } catch (error) {
      console.error("Error navigating to project:", error);
      toast.error(t('errors.navigationFailed'));
      setLocation("/");
    }
  };

  // Pagination logic
  const totalProjects = Array.isArray(projects) ? projects.length : 0;
  const totalPages = Math.ceil(totalProjects / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProjects = Array.isArray(projects) ? projects.slice(startIndex, endIndex) : [];

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <p>{t('projects.loginToView')}</p>
      </div>
    );
  }

  return (
    <>
      {/* Messages modal / panel */}
      {messagesOpen && messagesProject && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMessagesOpen(false)} />
          <div className="relative w-full sm:max-w-2xl max-h-[80vh] overflow-auto bg-card rounded-lg p-6 m-4"> {/* increased padding */}
            <div className="flex items-start justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="text-lg font-semibold">{messagesProject.title}</h3>
                <p className="text-sm text-muted-foreground">{t('comments.thread') ?? 'Messages'}</p>
              </div>
              <button
                aria-label={t('common.close') ?? 'Close'}
                onClick={() => setMessagesOpen(false)}
                className="p-2 rounded hover:bg-muted/30"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              {commentsQuery.isLoading ? (
                <div className="text-center py-6">{t('comments.loading') ?? 'Loading...'}</div>
              ) : (Array.isArray(commentsQuery.data) && commentsQuery.data.length > 0) ? (
                commentsQuery.data.map((row: any) => (
                  <div key={row.comment.id} className="border-b pb-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {row.author ? `${row.author.firstName || ''} ${row.author.lastName || ''}`.trim() || `@${row.author.username}` : t('common.anonymous')}
                        <span className="text-sm text-muted-foreground ml-2">(@{row.author?.username})</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{new Date(row.comment.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 text-text-secondary whitespace-pre-wrap">
                      {row.comment.bodyMd}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-text-secondary">{t('comments.noMessages') ?? 'No messages yet'}</div>
              )}
            </div>

            <div className="mt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-2 border rounded bg-background text-foreground"
                placeholder={t('comments.placeholder') ?? 'Add a comment...'}
                rows={3}
              />
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={() => { setNewComment(''); setMessagesOpen(false); }}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    if (!newComment.trim()) return;
                    postComment.mutate(newComment.trim());
                  }}
                  disabled={postComment.isLoading}
                >
                  {postComment.isLoading ? t('comments.sending') ?? 'Sending...' : t('comments.send') ?? 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="h-screen bg-background text-foreground flex overflow-hidden">
        {/* Left Sidebar - Hide on mobile when bottom nav is present */}
        <div className="hidden sm:block">
          <UnifiedSidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-0">
          {/* Header */}
          <div className="absolute top-4 sm:top-6 ltr:right-4 ltr:sm:right-6 rtl:left-4 rtl:sm:left-6 flex items-center gap-2 sm:gap-3 z-10">
            <LanguageSwitcher />
          </div>
          <div className="p-4 sm:p-6 border-b border-border">
            <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
              { (lang === 'ar' ? myIdeasNameAr : myIdeasNameEn) || t('projects.title') }
            </h1>
            <p className="text-text-secondary mt-1 text-sm sm:text-base">
              { (lang === 'ar' ? myIdeasDescAr : myIdeasDescEn) || t('projects.manageIdeas') }
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-auto">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Table Controls */}
              <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary hidden sm:inline">{t('common.show')}</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-text-secondary text-xs sm:text-sm hidden sm:inline">{t('common.entries')}</span>
                </div>
                
                <div className="text-xs sm:text-sm text-text-secondary">
                  <span className="hidden sm:inline">{t('projects.showingIdeas', { start: startIndex + 1, end: Math.min(endIndex, totalProjects), total: totalProjects })}</span>
                  <span className="sm:hidden">{t('projects.totalIdeas', { count: totalProjects })}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">{t('projects.ideaTitle')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('common.type')}</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[200px]">{t('common.description')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('common.created')}</TableHead>
                      <TableHead className="hidden xl:table-cell">{t('common.lastActivity')}</TableHead>
                      <TableHead className="ltr:text-right rtl:text-left min-w-[80px]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            {t('projects.loadingIdeas')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-text-secondary">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>{t('common.noIdeasYet')}</p>
                            <p className="text-sm mt-1">{t('common.startCreating')}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedProjects.map((project: any) => (
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
                              {!project.type && (
                                <>
                                  <Search className="w-4 h-4 text-blue-500" />
                                  <span className="text-blue-500 text-sm font-medium">{t('project.type.research')}</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="max-w-xs truncate text-text-secondary">
                              {project.description || t('errors.noDescription')}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2 text-text-secondary">
                              <Calendar className="w-4 h-4" />
                              {new Date(project.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <div className="flex items-center gap-2 text-text-secondary">
                              <Clock className="w-4 h-4" />
                              {new Date(project.updatedAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="ltr:text-right rtl:text-left">
                            <div className="flex items-center gap-2 ltr:justify-end rtl:justify-start">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleProjectClick(project)}
                                className="h-8 w-8 p-0"
                                data-testid={`open-chat-${project.id}`}
                              >
                                {project.type === 'LAUNCH' ? <Rocket className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                              </Button>
                              
                              {/* Notify / Messages indicator outside dropdown */}
                              {((project.commentsCount ?? project.commentCount ?? project.messagesCount ?? 0) > 0) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMessagesProject(project);
                                    setMessagesOpen(true);
                                  }}
                                  className="h-8 w-8 p-0 relative"
                                  data-testid={`project-notify-${project.id}`}
                                  aria-label="Open messages"
                                >
                                  <Bell className="w-4 h-4" />
                                  {(project.commentsCount ?? project.commentCount ?? project.messagesCount) ? (
                                    <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full bg-red-600 text-white">
                                      {Math.min(99, (project.commentsCount ?? project.commentCount ?? project.messagesCount) as number)}
                                    </span>
                                  ) : (
                                    <span className="absolute top-0 -right-0.5 inline-block w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </Button>
                              )}
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    data-testid={`more-options-${project.id}`}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {project.type === 'LAUNCH' && project.deploymentUrl && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(project.deploymentUrl, '_blank');
                                      }}
                                      className="flex items-center gap-2"
                                      data-testid={`open-project-${project.id}`}
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      <span>{t('common.openInNewTab')}</span>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicateProjectMutation.mutate(project);
                                    }}
                                    className="flex items-center gap-2"
                                    data-testid={`duplicate-project-${project.id}`}
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span>{t('common.duplicate')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(t('projects.confirmDelete'))) {
                                        deleteProjectMutation.mutate(project.id);
                                      }
                                    }}
                                    className="flex items-center gap-2 text-red-600"
                                    data-testid={`delete-project-${project.id}`}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    {t('common.previous')}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    </>
  );
}