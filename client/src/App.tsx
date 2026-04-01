import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { fetchCsrfToken } from "@/lib/csrf";
import "./i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import MyIdeas from "@/pages/MyIdeas";
import PresentationViewer from "@/pages/PresentationViewer";
import Experts from "@/pages/Experts";
import Radar from "@/pages/Radar";
import Research from "@/pages/Research";
import Launch from "@/pages/Launch";
import Chat from "@/pages/Chat";
import Auth from "@/pages/Auth";
import Challenges from "@/pages/Challenges";
import ChallengeDetail from "@/pages/ChallengeDetail";
import Events from "@/pages/Events";
import Academy from "@/pages/Academy";
import Admin from "@/pages/Admin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminIdeas from "@/pages/AdminIdeas";
import AdminSettings from "@/pages/AdminSettings";
import AdminWorkspace from "@/pages/AdminWorkspace";
import AdminIdeasKanban from "@/pages/AdminIdeasKanban";
import AdminChallengeIdeas from "@/pages/AdminChallengeIdeas";
import AdminChallenges from "@/pages/AdminChallenges";
import AdminIdeaDetail from "@/pages/AdminIdeaDetail";
import AdminApplications from "@/pages/AdminApplications";
import AdminBranding from "@/pages/AdminBranding";
import AdminMentors from "@/pages/AdminMentors";
import WorkspaceCreate from "@/pages/WorkspaceCreate";
import WorkspaceLanding from "@/pages/WorkspaceLanding";
import MemberOnboarding from "@/pages/MemberOnboarding";
import OnboardingThankYou from "@/pages/OnboardingThankYou";
import WorkspaceEntry from "@/pages/WorkspaceEntry";
import WorkspaceSelector from "@/pages/WorkspaceSelector";
import WorkspaceRedirect from "@/pages/WorkspaceRedirect";
import { WorkspaceGuard } from "@/components/WorkspaceGuard";
import { AdminGuard } from "@/components/AdminGuard";
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import SuperAdminIdeasPage from "@/pages/SuperAdminIdeasPage";
import SuperAdminActivityInsights from "@/pages/SuperAdminActivityInsights";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import SuperAdminWorkspaces from "@/pages/SuperAdminWorkspaces";
import SuperAdminUsers from "@/pages/SuperAdminUsers";
import SuperAdminChallenges from "@/pages/SuperAdminChallenges";
import SuperAdminEvents from "@/pages/SuperAdminEvents";
import SuperAdminApplicationsList from "@/pages/SuperAdminApplicationsList";
import SuperAdminEmailTemplates from "@/pages/SuperAdminEmailTemplates";
import SuperAdminScoringCriteria from "@/pages/SuperAdminScoringCriteria";
import SuperAdminPitchDecks from "@/pages/SuperAdminPitchDecks";
import AdminEmailTemplates from "@/pages/AdminEmailTemplates";
import AdminActivityInsights from "@/pages/AdminActivityInsights";
import AdminScoringCriteria from "@/pages/AdminScoringCriteria";
import AdminEvents from "@/pages/AdminEvents";
import AdminAttendance from "@/pages/AdminAttendance";
import AdminMentorFeedback from "@/pages/AdminMentorFeedback";
import AdminAcademy from "@/pages/AdminAcademy";
import AdminPitchDecks from "@/pages/AdminPitchDecks";
import AdminProgramRoadmap from "@/pages/AdminProgramRoadmap";
import Pitch from "@/pages/Pitch";
import PitchViewer from "@/pages/PitchViewer";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { BrandingProvider } from "@/contexts/BrandingContext";

function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="h-screen w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show stable loading state only on initial load
  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading FikraHub...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={() => <PageTransition><WorkspaceEntry /></PageTransition>} />
        <Route path="/admin/login" component={() => <PageTransition><SuperAdminLogin /></PageTransition>} />
        <Route path="/w/:slug/register" component={() => <PageTransition><WorkspaceLanding /></PageTransition>} />
        <Route path="/w/:slug/reset-password" component={() => <PageTransition><WorkspaceLanding /></PageTransition>} />
        <Route path="/w/:slug/onboard/thank-you" component={() => <PageTransition><OnboardingThankYou /></PageTransition>} />
        <Route path="/w/:slug/onboard" component={() => <PageTransition><MemberOnboarding /></PageTransition>} />
        <Route path="/create-workspace" component={() => <PageTransition><WorkspaceCreate /></PageTransition>} />
        <Route path="/w/:slug" component={() => <PageTransition><WorkspaceLanding /></PageTransition>} />
        <Route path="/:rest*" component={() => <PageTransition><NotFound /></PageTransition>} />
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Root route - workspace selector for authenticated users */}
      <Route path="/" component={() => <PageTransition><WorkspaceSelector /></PageTransition>} />

      {/* Workspace redirect - handles /w/:slug/ and redirects to default workspace page */}
      <Route path="/w/:slug" component={() => (
        <PageTransition>
          <WorkspaceGuard><WorkspaceRedirect /></WorkspaceGuard>
        </PageTransition>
      )} />

      {/* Workspace-scoped routes - all protected by WorkspaceGuard */}
      <Route path="/w/:slug/dashboard" component={() => (
        <PageTransition>
          <WorkspaceGuard><Dashboard /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/my-ideas" component={() => (
        <PageTransition>
          <WorkspaceGuard><MyIdeas /></WorkspaceGuard>
        </PageTransition>
      )} />
      
      <Route path="/w/:slug/presentation/:fileId" component={() => (
        <PageTransition>
          <PresentationViewer />
        </PageTransition>
      )} />

      <Route path="/w/:slug/experts" component={() => (
        <PageTransition>
          <WorkspaceGuard><Experts /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/radar" component={() => (
        <PageTransition>
          <WorkspaceGuard><Radar /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/challenges" component={() => (
        <PageTransition>
          <WorkspaceGuard><Challenges /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/challenges/:challengeSlug" component={() => (
        <PageTransition>
          <WorkspaceGuard><ChallengeDetail /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/events" component={() => (
        <PageTransition>
          <WorkspaceGuard><Events /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/academy" component={() => (
        <PageTransition>
          <WorkspaceGuard><Academy /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/academy/:courseSlug" component={() => (
        <PageTransition>
          <WorkspaceGuard><Academy /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/academy/:courseSlug/:videoSlug" component={() => (
        <PageTransition>
          <WorkspaceGuard><Academy /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/research" component={() => (
        <PageTransition>
          <WorkspaceGuard><Research /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/launch" component={() => (
        <PageTransition>
          <WorkspaceGuard><Launch /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/pitch" component={() => (
        <PageTransition>
          <WorkspaceGuard><Pitch /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/pitch/:id" component={() => (
        <PageTransition>
          <WorkspaceGuard><PitchViewer /></WorkspaceGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/chat/:chatId" component={() => (
        <PageTransition>
          <WorkspaceGuard><Chat /></WorkspaceGuard>
        </PageTransition>
      )} />

      {/* Admin routes - workspace-scoped with admin role verification */}
      <Route path="/w/:slug/admin" component={() => (
        <PageTransition>
          <AdminGuard><AdminDashboard /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/applications" component={() => (
        <PageTransition>
          <AdminGuard><AdminApplications /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/ideas" component={() => (
        <PageTransition>
          <AdminGuard><AdminIdeasKanban /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/ideas/:ideaId" component={() => (
        <PageTransition>
          <AdminGuard><AdminIdeaDetail /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/challenges" component={() => (
        <PageTransition>
          <AdminGuard><AdminChallenges /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/challenges/:challengeId/ideas" component={() => (
        <PageTransition>
          <AdminGuard><AdminChallengeIdeas /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/workspace" component={() => (
        <PageTransition>
          <AdminGuard><AdminWorkspace /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/branding" component={() => (
        <PageTransition>
          <AdminGuard><AdminBranding /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/mentors" component={() => (
        <PageTransition>
          <AdminGuard><AdminMentors /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/members" component={() => (
        <PageTransition>
          <AdminGuard><AdminUsers /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/settings" component={() => (
        <PageTransition>
          <AdminGuard><AdminSettings /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/email-templates" component={() => (
        <PageTransition>
          <AdminGuard><AdminEmailTemplates /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/activity-insights" component={() => (
        <PageTransition>
          <AdminGuard><AdminActivityInsights /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/scoring-criteria" component={() => (
        <PageTransition>
          <AdminGuard><AdminScoringCriteria /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/events" component={() => (
        <PageTransition>
          <AdminGuard><AdminEvents /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/attendance" component={() => (
        <PageTransition>
          <AdminGuard><AdminAttendance /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/mentor-feedback" component={() => (
        <PageTransition>
          <AdminGuard><AdminMentorFeedback /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/academy" component={() => (
        <PageTransition>
          <AdminGuard><AdminAcademy /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/pitch-decks" component={() => (
        <PageTransition>
          <AdminGuard><AdminPitchDecks /></AdminGuard>
        </PageTransition>
      )} />

      <Route path="/w/:slug/admin/program-roadmap" component={() => (
        <PageTransition>
          <AdminGuard><AdminProgramRoadmap /></AdminGuard>
        </PageTransition>
      )} />

      {/* Super admin platform dashboard */}
      <Route path="/admin/login" component={() => (
        <PageTransition>
          <SuperAdminLogin />
        </PageTransition>
      )} />

      <Route path="/admin" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminDashboard /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/ideas" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminIdeasPage /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/workspaces" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminWorkspaces /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/users" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminUsers /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/challenges" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminChallenges /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/events" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminEvents /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/applications" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminApplicationsList /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/activity-insights" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminActivityInsights /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/email-templates" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminEmailTemplates /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/scoring-criteria" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminScoringCriteria /></SuperAdminGuard>
        </PageTransition>
      )} />

      <Route path="/admin/pitch-decks" component={() => (
        <PageTransition>
          <SuperAdminGuard><SuperAdminPitchDecks /></SuperAdminGuard>
        </PageTransition>
      )} />

      {/* Create workspace route (accessible when authenticated) */}
      <Route path="/create-workspace" component={() => <PageTransition><WorkspaceCreate /></PageTransition>} />

      {/* Catch-all 404 */}
      <Route path="/:rest*" component={() => <PageTransition><NotFound /></PageTransition>} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Fetch CSRF token on app load
    fetchCsrfToken().catch(err => {
      console.error('Failed to fetch CSRF token:', err);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <ThemeProvider defaultTheme="light" storageKey="codeos-theme">
        <TooltipProvider>
          <SidebarProvider>
            <WorkspaceProvider>
              <BrandingProvider>
                <ErrorBoundary>
                  <div>
                    <Toaster
                      position="bottom-right"
                      toastOptions={{
                        duration: 3000,
                        style: {
                          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                          color: '#f1f5f9',
                          border: '1px solid rgba(148, 163, 184, 0.1)',
                          borderRadius: '0.75rem',
                          padding: '1rem 1.25rem',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                          backdropFilter: 'blur(8px)',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                        },
                        success: {
                          style: {
                            background: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
                            color: '#d1fae5',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '0.75rem',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.2), 0 8px 10px -6px rgba(16, 185, 129, 0.15)',
                            backdropFilter: 'blur(8px)',
                          },
                          icon: null,
                        },
                        error: {
                          style: {
                            background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)',
                            color: '#fecaca',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0.75rem',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.2), 0 8px 10px -6px rgba(239, 68, 68, 0.15)',
                            backdropFilter: 'blur(8px)',
                          },
                          icon: null,
                        },
                        loading: {
                          style: {
                            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                            color: '#dbeafe',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '0.75rem',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.2), 0 8px 10px -6px rgba(59, 130, 246, 0.15)',
                            backdropFilter: 'blur(8px)',
                          },
                          icon: null,
                        },
                      }}
                    />
                    <Router />
                  </div>
                </ErrorBoundary>
              </BrandingProvider>
            </WorkspaceProvider>
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
