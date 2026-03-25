import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import NewChatModal from "@/components/new-chat/NewChatModal";
import {
  Plus,
  MessageCircle,
  Settings,
  LogOut,
  Trash2,
  BarChart3,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  LogIn,
  CreditCard,
  Users,
  Radar,
  UserCheck,
  Trophy,
  Shield,
  GraduationCap,
  Presentation,
  CalendarDays
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SettingsModal from '@/components/settings/SettingsModal';
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useSidebar } from "@/contexts/SidebarContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useBranding } from "@/contexts/BrandingContext";
import { buildIdeaInitialMessage } from "@/lib/buildIdeaMessage";


const ALL_COUNTRIES: { code: string; name: string }[] = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "CD", name: "Democratic Republic of the Congo" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "The Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "XK", name: "Kosovo" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" }
];

export function UnifiedSidebar() {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const { workspaceSlug } = useWorkspace();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { theme, setTheme, actualTheme } = useTheme();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const {
    logo,
    darkLogo,
    radarEnabled,
    challengesEnabled,
    expertsEnabled,
    dashboardEnabled,
    academyEnabled,
    isLoading: brandingLoading,
    dashboardNameEn,
    dashboardNameAr,
    myIdeasNameEn,
    myIdeasNameAr,
    challengesNameEn,
    challengesNameAr,
    radarNameEn,
    radarNameAr,
    expertsNameEn,
    expertsNameAr
  } = useBranding();
  const { i18n } = useTranslation();
  const lang = i18n?.language?.startsWith('ar') ? 'ar' : 'en';

  // compute labels: prefer branding org-level overrides, fallback to translations
  const dashboardLabel = (lang === 'ar' ? dashboardNameAr : dashboardNameEn) || t('navigation.dashboard');
  const myIdeasLabel = (lang === 'ar' ? myIdeasNameAr : myIdeasNameEn) || t('navigation.myIdeas');
  const challengesLabel = (lang === 'ar' ? challengesNameAr : challengesNameEn) || t('navigation.challenges');
  const radarLabel = (lang === 'ar' ? radarNameAr : radarNameEn) || t('navigation.radar');
  const expertsLabel = (lang === 'ar' ? expertsNameAr : expertsNameEn) || t('navigation.experts');
  const defaultLogo = '/codelogo.png';
  const defaultDarkLogo = '/logo-code-light.jpeg';

  // Get workspace slug from URL or context
  const currentWorkspaceSlug = slug || workspaceSlug;

  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations'],
    enabled: !!isAuthenticated
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/organizations', Array.isArray(organizations) && organizations[0]?.id, 'projects'],
    enabled: !!isAuthenticated && Array.isArray(organizations) && !!organizations.length && !!organizations[0]?.id
  });

  // Get current organization
  const currentOrg = Array.isArray(organizations) ? organizations[0] : undefined;

  // Check user role for admin access
  const { data: userRole } = useQuery({
    queryKey: ['/api/organizations', currentOrg?.id, 'admin', 'check-role'],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      const response = await fetch(`/api/organizations/${currentOrg.id}/admin/check-role`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: isAuthenticated && !!currentOrg?.id,
    retry: false
  });

  const isAdmin = userRole && (userRole.role === 'OWNER' || userRole.role === 'ADMIN');
  const isMentor = userRole?.role === 'MENTOR';
  const isJudge = userRole?.role === 'JUDGE';

  const createProjectAndChat = async (payload?: { title?: string; description?: string }) => {
    if (!isAuthenticated) {
      setLocation("/auth");
      return;
    }
    if (!Array.isArray(organizations) || !organizations.length || !organizations[0]?.id) {
      setLocation("/");
      return;
    }
    const orgId = organizations[0].id;
    const title = payload?.title ?? t('projects.newConversation');
    const description = payload?.description ?? t('projects.newConversationDescription');

    const projectResponse = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, title, description }),
      credentials: "include"
    });
    if (!projectResponse.ok) throw new Error("Failed to create project");
    const project = await projectResponse.json();

    const chatResponse = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, title: "Chat" }),
      credentials: "include"
    });
    if (!chatResponse.ok) throw new Error("Failed to create chat");
    const chat = await chatResponse.json();

    queryClient.invalidateQueries({ queryKey: ['/api/organizations', orgId, 'projects'] });

    if (currentWorkspaceSlug) {
      setLocation(`/w/${currentWorkspaceSlug}/chat/${chat.id}`);
    } else {
      setLocation(`/chat/${chat.id}`);
    }
  };

  const handleNewConversation = () => {
    setIsNewChatOpen(true);
  };

  const handleManualCreate = async (data: { ideaName: string; ideaDescription: string; country: string; uniqueness: string; }) => {
    try {
      const orgsResp = await fetch('/api/organizations', { credentials: 'include' });
      if (!orgsResp.ok) throw new Error('Failed to fetch organizations');
      const organizations = await orgsResp.json();
      if (!organizations?.length) throw new Error('No organizations found');
      const orgId = organizations[0].id;

      // create project
      const projectResp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          title: data.ideaName || 'Untitled idea',
          description: `${data.ideaDescription}\n\nCountry: ${data.country}\nUnique: ${data.uniqueness}`
        }),
        credentials: 'include'
      });
      if (!projectResp.ok) throw new Error('Failed to create project');
      const project = await projectResp.json();

      // create chat
      const chatResp = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, title: 'Chat' }),
        credentials: 'include'
      });
      if (!chatResp.ok) throw new Error('Failed to create chat');
      const chat = await chatResp.json();

      // build initial message
      const countryObj = ALL_COUNTRIES.find(c => c.code === data.country) || { code: data.country, name: data.country };
      const initialMessage = buildIdeaInitialMessage({
        ideaName: data.ideaName,
        ideaDescription: data.ideaDescription,
        countryCode: countryObj.code,
        countryName: countryObj.name,
        uniqueness: data.uniqueness
      });

      // post first user message
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

      // optionally trigger agent to respond
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

      // refresh sidebar projects
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', orgId, 'projects'] });

      // navigate to chat
      if (currentWorkspaceSlug) {
        setLocation(`/w/${currentWorkspaceSlug}/chat/${chat.id}`);
      } else {
        setLocation(`/chat/${chat.id}`);
      }
    } catch (err) {
      console.error('Manual create failed', err);
      throw err;
    }
  };

  // const handleNewConversation = async () => {
  //   console.log("Creating new conversation...", { isAuthenticated, organizations });
    
  //   if (!isAuthenticated) {
  //     console.log("User not authenticated, redirecting to auth");
  //     setLocation("/auth");
  //     return;
  //   }
    
  //   if (!Array.isArray(organizations) || !organizations.length || !organizations[0]?.id) {
  //     console.error("No organization found, organizations:", organizations);
  //     setLocation("/");
  //     return;
  //   }
    
  //   try {
  //     const orgId = Array.isArray(organizations) ? organizations[0].id : null;
  //     console.log("Creating project for org:", orgId);
      
  //     // Create project
  //     const projectResponse = await fetch("/api/projects", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         orgId,
  //         title: t('projects.newConversation'),
  //         description: t('projects.newConversationDescription')
  //       }),
  //       credentials: "include",
  //     });
      
  //     if (!projectResponse.ok) {
  //       throw new Error("Failed to create project");
  //     }
      
  //     const project = await projectResponse.json();
      
  //     // Create initial chat
  //     const chatResponse = await fetch("/api/chats", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         projectId: project.id,
  //         title: "Chat"
  //       }),
  //       credentials: "include",
  //     });
      
  //     if (!chatResponse.ok) {
  //       throw new Error(t('errors.failedToCreateChat'));
  //     }
      
  //     const chat = await chatResponse.json();
  //     console.log("Created chat:", chat);
      
  //     // Invalidate projects query to refresh the sidebar
  //     queryClient.invalidateQueries({
  //       queryKey: ['/api/organizations', orgId, 'projects']
  //     });
      
  //     // Navigate to the new chat
  //     console.log("Navigating to chat:", chat.id);
  //     if (currentWorkspaceSlug) {
  //       setLocation(`/w/${currentWorkspaceSlug}/chat/${chat.id}`);
  //     } else {
  //       setLocation(`/chat/${chat.id}`);
  //     }
      
  //   } catch (error) {
  //     console.error("Error creating conversation:", error);
  //     // Fallback to landing page if creation fails
  //     setLocation("/");
  //   }
  // };

  const handleProjectClick = async (project: any) => {
    try {
      // For Launch projects, navigate to Launch mode with project context
      if (project.type === 'LAUNCH') {
        if (currentWorkspaceSlug) {
          setLocation(`/w/${currentWorkspaceSlug}/launch?project=${project.id}`);
        } else {
          setLocation(`/launch?project=${project.id}`);
        }
        return;
      }

      // For regular projects, get chats and navigate to first chat
      const response = await fetch(`/api/projects/${project.id}/chats`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(t('errors.failedToFetch'));
      }
      
      const chats = await response.json();
      
      // Navigate to the first chat, or create one if none exist
      if (chats.length > 0) {
        if (currentWorkspaceSlug) {
          setLocation(`/w/${currentWorkspaceSlug}/chat/${chats[0].id}`);
        } else {
          setLocation(`/chat/${chats[0].id}`);
        }
      } else {
        // Create a new chat for this project
        const chatResponse = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            title: t('navigation.chat')
          }),
          credentials: "include",
        });

        if (!chatResponse.ok) {
          throw new Error(t('errors.failedToCreateChat'));
        }

        const chat = await chatResponse.json();
        if (currentWorkspaceSlug) {
          setLocation(`/w/${currentWorkspaceSlug}/chat/${chat.id}`);
        } else {
          setLocation(`/chat/${chat.id}`);
        }
      }
    } catch (error) {
      console.error("Error navigating to project:", error);
      // Fallback to landing page
      setLocation("/");
    }
  };

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => apiRequest('DELETE', `/api/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', Array.isArray(organizations) && organizations[0]?.id, 'projects']
      });
    }
  });

  return (
    <TooltipProvider>
      <NewChatModal
        open={isNewChatOpen}
        onOpenChange={setIsNewChatOpen}
        onBuildWithAI={async () => {
          setIsNewChatOpen(false);
          try {
            await createProjectAndChat();
          } catch (e) {
            console.error('AI create failed', e);
            setLocation("/");
          }
        }}
        onManualSubmit={async (payload) => {
          try {
            await handleManualCreate(payload);
          } catch (e) {
            // rethrow so modal handles disabling, parent can show toast
            throw e;
          }
        }}
      />
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} lg:${isCollapsed ? 'w-16' : 'w-64'} md:${isCollapsed ? 'w-14' : 'w-56'} sm:${isCollapsed ? 'w-12' : 'w-48'} bg-sidebar-bg border-r border-sidebar-border flex flex-col h-screen transition-all duration-300 relative z-30`}>
        {/* Header */}
        <div className="p-3 sm:p-4 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1">
              {(logo || darkLogo) ? (
                <>
                  <img src={darkLogo || logo} alt="Logo" className="h-6 sm:h-8 object-contain hidden dark:block" />
                  <img src={logo || darkLogo} alt="Logo" className="h-6 sm:h-8 object-contain block dark:hidden" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 hidden dark:flex">
                    <img src={defaultDarkLogo} alt="Logo" className="h-6 sm:h-8 w-auto object-contain" />
                    <span className="text-lg sm:text-xl font-bold text-foreground">OS</span>
                  </div>
                  <div className="flex items-center gap-1 dark:hidden">
                    <img src={defaultLogo} alt="Logo" className="h-6 sm:h-8 w-auto object-contain" />
                    <span className="text-lg sm:text-xl font-bold text-foreground">OS</span>
                  </div>
                </>
              )}
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 sm:p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 touch-manipulation"
            data-testid="button-collapse"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

        {/* New Idea Button - Only show when authenticated and expanded, not for mentors or judges */}
        {isAuthenticated && !isCollapsed && !isMentor && !isJudge && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <button
              onClick={handleNewConversation}
              className="w-full bg-transparent border border-border hover:border-primary text-text-secondary hover:text-text-primary rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px]"
              data-testid="button-new-conversation"
            >
              {t('sidebar.newIdea')}
            </button>
          </div>
        )}
        
        {/* Navigation */}
        <div className="flex-1 px-2 overflow-y-auto">
          <nav className="space-y-1 mb-6">
            {isAuthenticated ? (
              // Authenticated Navigation
              isCollapsed ? (
                // Collapsed Authenticated Navigation
                <>
                  {dashboardEnabled && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-center p-2 sm:p-3 rounded-md cursor-pointer transition-all duration-200 touch-manipulation min-h-[44px] ${
                            location.includes("/dashboard") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                          }`}
                          onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/dashboard`)}
                          data-testid="nav-dashboard"
                        >
                          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{dashboardLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {!isMentor && !isJudge && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center justify-center p-3 rounded-md cursor-pointer transition-all duration-200 ${
                          location.includes("/my-ideas") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                        }`}
                        onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/my-ideas`)}
                        data-testid="nav-my-ideas"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{myIdeasLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                  )}

                  {!isMentor && !isJudge && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center justify-center p-3 rounded-md cursor-pointer transition-all duration-200 ${
                          location.includes("/pitch") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                        }`}
                        onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/pitch`)}
                        data-testid="nav-pitch"
                      >
                        <Presentation className="w-5 h-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Pitch</p>
                    </TooltipContent>
                  </Tooltip>
                  )}

                  {/* Challenges - Only show if enabled */}
                  {challengesEnabled && !isJudge && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-center p-3 rounded-md cursor-pointer transition-all duration-200 ${
                            location.includes("/challenges") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                          }`}
                          onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/challenges`)}
                          data-testid="nav-challenges"
                        >
                          <Trophy className="w-5 h-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{challengesLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Radar - Only show if enabled */}
                  {radarEnabled && !isMentor && !isJudge && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-center p-3 rounded-md cursor-pointer transition-all duration-200 ${
                            location.includes("/radar") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                          }`}
                          onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/radar`)}
                          data-testid="nav-radar"
                        >
                          <Radar className="w-5 h-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{radarLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Experts - Only show if enabled */}
                  {expertsEnabled && !isJudge && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-center p-3 rounded-md cursor-pointer transition-all duration-200 ${
                            location.includes("/experts") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                          }`}
                          onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/experts`)}
                          data-testid="nav-experts"
                        >
                          <UserCheck className="w-5 h-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{expertsLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Academy - Only show if enabled */}
                  {academyEnabled && !isJudge && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-center p-3 rounded-md cursor-pointer transition-all duration-200 ${
                            location.includes("/academy") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                          }`}
                          onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/academy`)}
                          data-testid="nav-academy"
                        >
                          <GraduationCap className="w-5 h-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Training Modules</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Events - always visible */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center justify-center p-3 rounded-md cursor-pointer transition-all duration-200 ${
                          location.includes("/events") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                        }`}
                        onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/events`)}
                        data-testid="nav-events"
                      >
                        <CalendarDays className="w-5 h-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{t('navigation.events')}</p>
                    </TooltipContent>
                  </Tooltip>

                  {isJudge && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-center p-3 rounded-md cursor-pointer transition-all duration-200 ${
                            location.includes("/dashboard") && new URLSearchParams(window.location.search).get('tab') === 'leaderboard' ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                          }`}
                          onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/dashboard?tab=leaderboard`)}
                          data-testid="nav-judge-leaderboard"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Leaderboard</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {handleNewConversation && !isMentor && !isJudge && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleNewConversation}
                          className="w-full flex items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 hover:border-[#4588f5] rounded-md transition-all duration-200"
                          data-testid="button-new-conversation-collapsed"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{t('sidebar.newIdea')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              ) : (
                // Expanded Authenticated Navigation
                <>
                  {dashboardEnabled && (
                    <div
                      className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                        location.includes("/dashboard") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/dashboard`)}
                      data-testid="nav-dashboard"
                    >
                      <BarChart3 className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                      <span className="text-sm font-medium">{dashboardLabel}</span>
                    </div>
                  )}

                  {!isMentor && !isJudge && (
                  <div
                    className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                      location.includes("/my-ideas") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                    onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/my-ideas`)}
                    data-testid="nav-my-ideas"
                  >
                    <MessageCircle className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                    <span className="text-sm font-medium">{myIdeasLabel}</span>
                  </div>
                  )}

                  {!isMentor && !isJudge && (
                  <div
                    className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                      location.includes("/pitch") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                    onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/pitch`)}
                    data-testid="nav-pitch"
                  >
                    <Presentation className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                    <span className="text-sm font-medium">Pitch</span>
                  </div>
                  )}

                  {/* Challenges - Only show if enabled */}
                  {challengesEnabled && !isJudge && (
                    <div
                      className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                        location.includes("/challenges") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/challenges`)}
                      data-testid="nav-challenges"
                    >
                      <Trophy className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                      <span className="text-sm font-medium">{challengesLabel}</span>
                    </div>
                  )}

                  {/* Radar - Only show if enabled */}
                  {radarEnabled && !isMentor && !isJudge && (
                    <div
                      className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                        location.includes("/radar") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/radar`)}
                      data-testid="nav-radar"
                    >
                      <Radar className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                      <span className="text-sm font-medium">{radarLabel}</span>
                    </div>
                  )}

                  {/* Experts - Only show if enabled */}
                  {expertsEnabled && !isJudge && (
                    <div
                      className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                        location.includes("/experts") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/experts`)}
                      data-testid="nav-experts"
                    >
                      <UserCheck className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                      <span className="text-sm font-medium">{expertsLabel}</span>
                    </div>
                  )}

                  {/* Academy - Only show if enabled */}
                  {academyEnabled && !isJudge && (
                    <div
                      className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                        location.includes("/academy") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/academy`)}
                      data-testid="nav-academy"
                    >
                      <GraduationCap className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                      <span className="text-sm font-medium">Training Modules</span>
                    </div>
                  )}

                  {/* Events - always visible */}
                  <div
                    className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                      location.includes("/events") ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                    onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/events`)}
                    data-testid="nav-events"
                  >
                    <CalendarDays className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                    <span className="text-sm font-medium">{t('navigation.events')}</span>
                  </div>

                  {isJudge && (
                    <div
                      className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                        location.includes("/dashboard") && new URLSearchParams(window.location.search).get('tab') === 'leaderboard' ? "text-white bg-primary" : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/dashboard?tab=leaderboard`)}
                      data-testid="nav-judge-leaderboard"
                    >
                      <BarChart3 className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                      <span className="text-sm font-medium">Leaderboard</span>
                    </div>
                  )}
                </>
              )
            ) : (
              // Logged Out Navigation
              isCollapsed ? (
                // Collapsed Logged Out Navigation
                <>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                        onClick={() => setLocation("/auth")}
                        data-testid="nav-login"
                      >
                        <LogIn className="w-5 h-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{t('common.login')}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center justify-center p-3 text-[#4588f5] hover:text-white hover:bg-primary/20 border border-[#4588f5]/30 hover:border-[#4588f5] rounded-md cursor-pointer transition-all duration-200"
                        onClick={() => setLocation("/auth")}
                        data-testid="nav-register"
                      >
                        <UserPlus className="w-5 h-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{t('auth.createAccount')}</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                // Expanded Logged Out Navigation
                <>
                  
                  <div 
                    className="flex items-center px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                    onClick={() => window.location.href = "/api/login"}
                    data-testid="nav-login"
                  >
                    <LogIn className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                    <span className="text-sm font-medium">{t('common.login')}</span>
                  </div>
                  
                  <div
                    className="flex items-center px-3 py-2 text-[#4588f5] hover:text-white hover:bg-primary/20 border border-[#4588f5]/30 hover:border-[#4588f5] rounded-md cursor-pointer transition-all duration-200"
                    onClick={() => window.location.href = "/api/login"}
                    data-testid="nav-register"
                  >
                    <UserPlus className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                    <span className="text-sm font-medium">{t('auth.createAccount')}</span>
                  </div>
                </>
              )
            )}
          </nav>
        </div>
        
        {/* Bottom Section */}
        <div className="p-2 border-t border-sidebar-border flex-shrink-0 space-y-1">
          {isAuthenticated ? (
            // Authenticated Bottom Section
            isCollapsed ? (
              // Collapsed Bottom Navigation
              <>
                {/* User Avatar for collapsed view */}
                {user && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center p-3 mb-2 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white">
                          {user.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="text-sm">
                        <div className="font-semibold">{user.username}</div>
                        <div className="text-xs text-gray-400 mt-1">{t('user.creditsRemaining', { used: 85, total: 100 })}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Admin Mode Button - For admins and mentors (collapsed) */}
                {(user?.isAdmin || isMentor) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center justify-center p-3 text-primary hover:text-white hover:bg-blue-500/20 rounded-md cursor-pointer transition-all duration-200 mb-1"
                        onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/admin${isMentor ? '/ideas' : ''}`)}
                        data-testid="button-admin-mode-collapsed"
                      >
                        <Shield className="w-5 h-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{isMentor ? 'Ideas Overview' : t('admin.mode')}</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                      onClick={() => setIsSettingsOpen(true)}
                      data-testid="button-settings"
                    >
                      <Settings className="w-5 h-5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{t('settings.title')}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                      onClick={() => logout()}
                      data-testid="button-logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{t('common.logout')}</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                      onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
                      data-testid="button-theme-toggle"
                    >
                      {actualTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{actualTheme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              // Expanded Bottom Navigation
              <>
                {/* Admin Mode Button - For admins and mentors */}
                {(user?.isAdmin || isMentor) && (
                  <div
                    className="flex items-center px-3 py-2 text-primary hover:text-white hover:bg-blue-500/20 rounded-md cursor-pointer transition-all duration-200 mb-1"
                    onClick={() => currentWorkspaceSlug && setLocation(`/w/${currentWorkspaceSlug}/admin${isMentor ? '/ideas' : ''}`)}
                    data-testid="button-admin-mode"
                  >
                    <Shield className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                    <span className="text-sm font-semibold">{isMentor ? 'Ideas Overview' : t('admin.mode')}</span>
                  </div>
                )}

                <div
                  className="flex items-center px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                  onClick={() => setIsSettingsOpen(true)}
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                  <span className="text-sm font-medium">{t('settings.title')}</span>
                </div>

                <div
                  className="flex items-center px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                  onClick={() => logout()}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />
                  <span className="text-sm font-medium">{t('common.logout')}</span>
                </div>
                
                {/* Minimal User Info */}
                {user && (
                  <div className="px-3 py-3 mb-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                        {user.username?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-200 truncate">{user.username}</div>
                        <div className="text-xs text-gray-400">{t('user.freePlan')}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div 
                  className="flex items-center px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                  onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
                  data-testid="button-theme-toggle"
                >
                  {actualTheme === 'dark' ? <Sun className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" /> : <Moon className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />}
                  <span className="text-sm font-medium">{actualTheme === 'dark' ? t('theme.light') : t('theme.dark')}</span>
                </div>

                {/* Language Switcher */}
                <div className="px-3 py-2">
                  <LanguageSwitcher />
                </div>
              </>
            )
          ) : (
            // Logged Out Bottom Section
            isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="flex items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                    onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
                    data-testid="button-theme-toggle"
                  >
                    {actualTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{actualTheme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div 
                className="flex items-center px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer transition-all duration-200"
                onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
                data-testid="button-theme-toggle"
              >
                {actualTheme === 'dark' ? <Sun className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" /> : <Moon className="w-4 h-4 ltr:mr-2.5 rtl:ml-2.5" />}
                <span className="text-sm font-medium">{actualTheme === 'dark' ? t('theme.light') : t('theme.dark')}</span>
              </div>
            )
          )}
        </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </TooltipProvider>
  );
}