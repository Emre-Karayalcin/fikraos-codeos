import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Download, 
  Github, 
  Rocket, 
  FolderTree,
  Play,
  Square,
  AlertCircle,
  Zap,
  Target,
  Crown,
  FileText,
  ExternalLink
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/contexts/SidebarContext";
import { FileTree } from "@/components/launch/FileTree";
import { CodeCanvas } from "@/components/launch/CodeCanvas";
import { ChatAnalyzer } from "@/components/launch/ChatAnalyzer";
import { ProjectScaffolder } from "@/components/launch/ProjectScaffolder";
import { AICodeGenerator } from "@/components/launch/AICodeGenerator";
import { EnhancedAIGenerator } from "@/components/launch/EnhancedAIGenerator";
import { AppBuildInspiredGenerator } from "@/components/launch/AppBuildInspiredGenerator";
// ModernHTMLGenerator removed - app.build is now the standard
import { MonacoEditor } from "@/components/launch/MonacoEditor";
import { AgentChatInterface } from "@/components/launch/AgentChatInterface";
import { AgentStatus } from "@/components/launch/AgentStatus";

export default function Launch() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { isCollapsed } = useSidebar();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [agentStatus, setAgentStatus] = useState({
    isActive: false,
    phase: 'idle' as 'planning' | 'generating' | 'deploying' | 'completed' | 'idle',
    currentStep: '',
    progress: 0,
    files: [] as Array<{path: string, status: 'pending' | 'generating' | 'completed', size?: number}>,
    estimatedTime: undefined as string | undefined
  });

  // Helper function to create properly formatted chat messages
  const createChatMessage = (role: 'user' | 'assistant', content: string) => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    role,
    content,
    timestamp: new Date()
  });
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [buildErrors, setBuildErrors] = useState<string[]>([]);
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [showPreview, setShowPreview] = useState(true);
  const [rightPanelMode, setRightPanelMode] = useState<'preview' | 'files' | 'editor'>('preview');
  const [useEnhancedMode, setUseEnhancedMode] = useState(true); // Enable FikraHub-style generation
  // App.build is now the standard generation method
  const [selectedTemplate, setSelectedTemplate] = useState('react-tailwind'); // Default template selection
  const [currentTasks, setCurrentTasks] = useState<any[]>([]); // Track generation tasks
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<'lite' | 'pro' | 'max'>('lite');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [allowAutoDeployment, setAllowAutoDeployment] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Get user's organizations
  const { data: organizations } = useQuery<any[]>({
    queryKey: ['/api/organizations'],
    enabled: !!isAuthenticated
  });
  
  // Get initial idea from URL params or load existing project
  useEffect(() => {
    // Wait for organizations to load
    if (!organizations || organizations.length === 0) {
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const initialIdea = params.get('idea');
    const projectId = params.get('project');
    const modeParam = params.get('mode') as 'lite' | 'pro' | 'max';
    
    // Set generation mode from URL if provided
    console.log('🔍 URL mode parameter found:', modeParam);
    if (modeParam && ['lite', 'pro', 'max'].includes(modeParam)) {
      console.log('✅ Setting generation mode from URL:', modeParam);
      setGenerationMode(modeParam);
    } else {
      console.log('🔄 No valid mode in URL, using default: lite');
    }
    
    if (projectId) {
      // Load existing project
      loadExistingProject(projectId);
    } else if (initialIdea) {
      setChatHistory([createChatMessage('user', initialIdea)]);
      // Auto-start building the initial project
      handleInitialBuild(initialIdea);
    }
    // Don't create empty project immediately - wait for user to submit a prompt
  }, [organizations]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  const handleInitialBuild = async (idea: string) => {
    setIsBuilding(true);
    setBuildStatus('building');
    setBuildErrors([]);
    setAllowAutoDeployment(false); // PREVENT auto-deployment during generation
    
    // Initialize agent status for prompt enhancement
    setAgentStatus({
      isActive: true,
      phase: 'planning',
      currentStep: 'Enhancing your idea with AI...',
      progress: 5,
      files: [],
      estimatedTime: undefined
    });
    
    // Switch to preview mode automatically to show live generation
    setRightPanelMode('preview');
    
    try {
      // STEP 1: Enhance the user's prompt with AI for better generation
      const enhancedIdea = await enhancePrompt(idea);
      
      // Update agent status after enhancement
      setAgentStatus(prev => ({
        ...prev,
        currentStep: 'Creating project and preparing generation...',
        progress: 10
      }));
      
      // Create project and chat first, then save the initial user message
      const projectId = await createProjectForLaunch(enhancedIdea);
      if (!projectId) {
        throw new Error('Failed to create project for initial build');
      }
      console.log('✅ Project created successfully for initial build:', projectId);
      
      // FORCE the state to be updated immediately and persist through closures
      setCurrentProjectId(projectId);
      console.log('🔧 FORCED currentProjectId to:', projectId);
      
      // Also store in a ref for immediate access during generation
      (window as any).currentProjectIdRef = projectId;
      
      // Get the chat ID from the created project and save the initial message
      try {
        // Get chat from the project we just created
        const chatResponse = await fetch(`/api/projects/${projectId}/chats`, {
          credentials: 'include'
        });
        
        if (chatResponse.ok) {
          const chats = await chatResponse.json();
          if (chats && chats.length > 0) {
            const chatId = chats[0].id;
            setCurrentChatId(chatId);
            console.log('✅ Chat ID retrieved and set:', chatId);
            
            // Save the enhanced message directly with the chat ID
            const messageResponse = await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                chatId: chatId,
                role: 'user',
                text: enhancedIdea
              })
            });
            
            if (messageResponse.ok) {
              console.log('✅ Initial user message saved successfully');
            } else {
              console.error('❌ Failed to save initial message');
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to retrieve chat or save initial message:', error);
      }
      
      // DON'T set basic files - wait for AI generation first
      console.log('🤖 Starting AI generation WITHOUT deploying basic templates first...');
      
      // Use app.build-inspired task-based generation as the standard method with enhanced prompt
      console.log('🚀 Using App.build-inspired generator with template:', selectedTemplate);
      console.log('🧠 Using enhanced prompt for better generation quality');
      
      const result = await AppBuildInspiredGenerator.generateApplication(
        enhancedIdea,
        selectedTemplate,
        (tasks: any[]) => {
          console.log('📋 App.build tasks update:', tasks.length, 'tasks');
          setCurrentTasks(tasks);
          
          // Update agent status with current task progression
          if (tasks && tasks.length > 0) {
            const completedTasks = tasks.filter(t => t.status === 'completed').length;
            const currentTask = tasks.find(t => t.status === 'in-progress') || tasks.find(t => t.status === 'pending');
            const progress = Math.round((completedTasks / tasks.length) * 100);
            
            setAgentStatus(prev => ({
              ...prev,
              isActive: true,
              phase: 'generating',
              currentStep: currentTask ? currentTask.name : 'Processing...',
              progress,
              files: tasks.map(t => ({
                path: t.name.toLowerCase().replace(/\s+/g, '-') + '.json',
                status: t.status === 'completed' ? 'completed' : 
                       t.status === 'in-progress' ? 'generating' : 'pending'
              }))
            }));
          }
        },
        (filePath: string, content: string) => {
          console.log(`📄 App.build generated file: ${filePath} (${content.length} chars)`);
          setProjectFiles(prev => {
            const updatedFiles = { ...prev, [filePath]: content };
            
            // Create preview for React/JS files
            if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
              setTimeout(async () => {
                try {
                  const response = await fetch('/api/preview/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                      files: updatedFiles,
                      projectId: currentProjectId 
                    }),
                  });
                  
                  if (response.ok) {
                    const { previewId } = await response.json();
                    const fullPreviewUrl = `${window.location.origin}/preview/${previewId}/`;
                    setPreviewUrl(fullPreviewUrl);
                    console.log('✅ App.build preview created:', previewId, 'Full URL:', fullPreviewUrl);
                  }
                } catch (error) {
                  console.error('❌ Failed to create App.build preview:', error);
                }
              }, 100);
            }
            
            return updatedFiles;
          });
        }
      );
      
      if (result.success && result.files) {
        console.log('🔥 AI generation SUCCESS! Files received:', Object.keys(result.files));
        setProjectFiles(result.files);
        setBuildStatus('success');
        setAllowAutoDeployment(true); // NOW allow auto-deployment with real files
        
        // Mark agent status as completed
        setAgentStatus(prev => ({
          ...prev,
          isActive: true,
          phase: 'completed',
          currentStep: 'All tasks completed!',
          progress: 100,
          files: Object.keys(result.files).map(filePath => ({
            path: filePath,
            status: 'completed' as const
          }))
        }));
        
        // Save the generated files to the project
        await saveGeneratedFiles(result.files);
        
        const successMessage = `Generation complete. Your application is ready and running in the preview.`;
        
        setChatHistory(prev => [...prev, createChatMessage('assistant', successMessage)]);
        
        // Save success message to chat immediately
        await saveMessageToChat(successMessage, 'assistant');
      } else {
        throw new Error(result.error || 'Failed to generate project');
      }
      
    } catch (error) {
      setBuildStatus('error');
      setBuildErrors([error instanceof Error ? error.message : 'Failed to create project']);
      setChatHistory(prev => [...prev, createChatMessage('assistant', `❌ I had trouble generating your project: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a different description.`)]);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleSendMessage = async (inputMessage?: string) => {
    const userMessage = inputMessage || message.trim();
    if (!userMessage.trim()) return;
    
    if (!inputMessage) setMessage(""); // Only clear if using state message
    setChatHistory(prev => [...prev, createChatMessage('user', userMessage)]);
    
    // ALWAYS create project if this is the first message and wait for completion
    if (!currentProjectId) {
      console.log('🔄 Creating new Launch project from user prompt...');
      console.log('🎯 Current generation mode when creating project:', generationMode);
      const projectId = await createProjectForLaunch(userMessage);
      if (!projectId) {
        console.error('❌ Failed to create project, cannot save messages');
        setChatHistory(prev => [...prev, createChatMessage('assistant', '❌ Failed to create project. Please try again.')]);
        return;
      }
      console.log('✅ Project created successfully:', projectId);
      
      // FORCE the state to be updated immediately and persist through closures
      setCurrentProjectId(projectId);
      console.log('🔧 FORCED currentProjectId to:', projectId);
      
      // Also store in a ref for immediate access during generation
      (window as any).currentProjectIdRef = projectId;
      
      // Wait a bit for chat ID to be set
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Enhance user message before processing
    const enhancedMessage = await enhancePrompt(userMessage);
    
    // Save enhanced user message to chat after ensuring project exists
    await saveMessageToChat(enhancedMessage, 'user');
    
    setIsBuilding(true);
    setBuildStatus('building');
    setBuildErrors([]);
    
    // Initialize agent status  
    setAgentStatus({
      isActive: true,
      phase: 'planning',
      currentStep: 'Starting generation...',
      progress: 0,
      files: [],
      estimatedTime: undefined
    });
    
    // Switch to preview mode automatically to show live generation
    setRightPanelMode('preview');
    
    try {
      console.log('🚀 Starting FikraHub AI generation for:', userMessage);
      console.log('🎯 Using generation mode:', generationMode);
      
      // Use modern HTML generation for comprehensive websites
      let generatedFiles: Record<string, string> = {};
      
      const configStyle = generationMode === 'lite' ? 'minimal' : generationMode === 'pro' ? 'modern' : 'creative';
      console.log('📊 Config style mapping:', generationMode, '→', configStyle);
      
      // Use app.build-inspired task-based generation as the standard method
      console.log('🚀 Using App.build-inspired generator with template:', selectedTemplate);
      
      const result = await AppBuildInspiredGenerator.generateApplication(
          enhancedMessage,
          selectedTemplate,
          (tasks: any[]) => {
            console.log('📋 App.build tasks update:', tasks.length, 'tasks');
            setCurrentTasks(tasks);
            
            // Update agent status with current task progression  
            if (tasks && tasks.length > 0) {
              const completedTasks = tasks.filter(t => t.status === 'completed').length;
              const currentTask = tasks.find(t => t.status === 'in-progress') || tasks.find(t => t.status === 'pending');
              const progress = Math.round((completedTasks / tasks.length) * 100);
              
              setAgentStatus(prev => ({
                ...prev,
                isActive: true,
                phase: 'generating',
                currentStep: currentTask ? currentTask.name : 'Processing...',
                progress,
                files: tasks.map(t => ({
                  path: t.name.toLowerCase().replace(/\s+/g, '-') + '.json',
                  status: t.status === 'completed' ? 'completed' : 
                         t.status === 'in-progress' ? 'generating' : 'pending'
                }))
              }));
            }
          },
          (filePath: string, content: string) => {
            console.log(`📄 App.build generated file: ${filePath} (${content.length} chars)`);
            
            // Store files as they're generated
            generatedFiles[filePath] = content;
            
            // Update state immediately
            setProjectFiles(prev => {
              const updatedFiles = { ...prev, [filePath]: content };
              console.log('💾 Updated project files:', Object.keys(updatedFiles));
              
              // Create preview for React/JS files
              if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
                setTimeout(async () => {
                  try {
                    const response = await fetch('/api/preview/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ 
                        files: updatedFiles,
                        projectId: currentProjectId 
                      }),
                    });
                    
                    if (response.ok) {
                      const { previewId } = await response.json();
                      const fullPreviewUrl = `${window.location.origin}/preview/${previewId}/`;
                      setPreviewUrl(fullPreviewUrl);
                      console.log('✅ App.build preview created:', previewId, 'Full URL:', fullPreviewUrl);
                      setRightPanelMode('preview');
                    }
                  } catch (error) {
                    console.error('❌ Failed to create App.build preview:', error);
                  }
                }, 100);
              }
              
              return updatedFiles;
            });
          }
        );
      
      console.log('✅ FikraHub AI result:', { success: result.success, fileCount: Object.keys(result.files || {}).length });
      
      if (result.success && result.files && Object.keys(result.files).length > 0) {
        console.log('🎯 Final FikraHub files:', Object.keys(result.files));
        
        // Force update with final files
        setProjectFiles(result.files);
        setBuildStatus('success');
        
        // Create final preview URL for the completed project
        setTimeout(async () => {
          try {
            const response = await fetch('/api/preview/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ 
                files: result.files,
                projectId: currentProjectId 
              }),
            });
            
            if (response.ok) {
              const { previewId } = await response.json();
              const fullPreviewUrl = `${window.location.origin}/preview/${previewId}/`;
              setPreviewUrl(fullPreviewUrl);
              console.log('✅ Final preview URL created:', previewId, 'Full URL:', fullPreviewUrl);
              
              // Save preview URL to project database
              await savePreviewUrlToProject(fullPreviewUrl);
            }
          } catch (error) {
            console.error('❌ Failed to create final preview:', error);
          }
        }, 200);
        
        // Mark agent status as completed
        setAgentStatus(prev => ({
          ...prev,
          isActive: true,
          phase: 'completed',
          currentStep: 'All tasks completed!',
          progress: 100,
          files: Object.keys(result.files).map(filePath => ({
            path: filePath,
            status: 'completed' as const
          }))
        }));
        
        // Save the generated files to the project
        await saveGeneratedFiles(result.files);
        
        const successMessage = `Generation complete. Your application is ready and running in the preview.`;
        
        setChatHistory(prev => [...prev, createChatMessage('assistant', successMessage)]);
        
        if (currentChatId) {
          await saveMessageToChat(successMessage, 'assistant');
        }
      } else {
        console.error('❌ FikraHub AI failed:', result.error);
        setChatHistory(prev => [...prev, createChatMessage('assistant', `❌ FikraHub AI encountered an issue: ${result.error || 'Unknown error'}. Let me try a different approach.`)]);
        setBuildStatus('error');
        setBuildErrors([result.error || 'FikraHub AI generation failed']);
      }
      
    } catch (error) {
      setChatHistory(prev => [...prev, createChatMessage('assistant', "Sorry, I encountered an error processing your request. Please try again.")]);
      setBuildStatus('error');
      setBuildErrors(['Failed to process request']);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Create a new project for Launch mode
  const createProjectForLaunch = async (idea: string) => {
    try {
      if (!organizations || organizations.length === 0) {
        throw new Error('No organization found');
      }
      
      const org = organizations[0];

      // Create project
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: idea.substring(0, 100), // Truncate long ideas for title
          description: `Launch Mode: ${idea}`,
          type: 'LAUNCH',
          orgId: org.id
        })
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to create project');
      }

      const project = await projectResponse.json();
      console.log('🔧 Setting currentProjectId to:', project.id);
      setCurrentProjectId(project.id);
      console.log('✅ Project created with ID:', project.id);
      
      // Verify state was set
      setTimeout(() => {
        console.log('🔍 currentProjectId after timeout:', project.id);
      }, 100);
      
      // Update URL to include project ID and PRESERVE current mode for proper tracking
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('project', project.id);
      // DON'T override the mode if it's already set in URL
      if (!currentUrl.searchParams.get('mode')) {
        currentUrl.searchParams.set('mode', generationMode);
      }
      window.history.pushState({}, '', currentUrl.toString());
      console.log('✅ URL updated with project ID:', project.id, 'preserving mode:', currentUrl.searchParams.get('mode'));

      // Create chat for this project
      const chatResponse = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: project.id,
          title: 'Launch Mode Chat'
        })
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to create chat');
      }

      const chat = await chatResponse.json();
      console.log('🔧 Setting currentChatId to:', chat.id);
      setCurrentChatId(chat.id);
      console.log('✅ Chat created with ID:', chat.id);
      
      // Verify state was set
      setTimeout(() => {
        console.log('🔍 currentChatId after timeout:', chat.id);
      }, 100);

      console.log('✅ Launch mode project and chat ready for saving messages and files');
      
      // Invalidate projects query to refresh the sidebar and show new launch project
      try {
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.invalidateQueries({
          queryKey: ['/api/organizations', org.id, 'projects']
        });
        console.log('✅ Sidebar projects list will refresh to show new launch project');
      } catch (error) {
        console.log('⚠️ Could not refresh sidebar, but project was created successfully');
      }
      
      return project.id;
    } catch (error) {
      console.error('❌ Failed to create Launch project:', error);
      return null;
    }
  };

  // Create empty project when entering launch mode without an idea
  const createEmptyProjectForLaunch = async () => {
    try {
      if (!organizations || organizations.length === 0) {
        console.log('⏳ Waiting for organizations to load...');
        return;
      }
      
      const org = organizations[0];
      
      // Create project with generic title
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Launch Mode Project',
          description: 'Launch Mode: Ready for AI generation',
          type: 'LAUNCH',
          orgId: org.id
        })
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to create project');
      }

      const project = await projectResponse.json();
      setCurrentProjectId(project.id);
      console.log('✅ Empty project created with ID:', project.id);
      
      // Update URL to include project ID
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('project', project.id);
      window.history.pushState({}, '', currentUrl.toString());
      console.log('✅ URL updated with project ID:', project.id);

      // Create chat for this project
      const chatResponse = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: project.id,
          title: 'Launch Mode Chat'
        })
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to create chat');
      }

      const chat = await chatResponse.json();
      setCurrentChatId(chat.id);
      console.log('✅ Empty project chat created with ID:', chat.id);
      
    } catch (error) {
      console.error('❌ Failed to create empty Launch project:', error);
    }
  };

  // Update URL with generation mode
  const updateUrlWithMode = (mode: 'lite' | 'pro' | 'max') => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('mode', mode);
    if (currentProjectId) {
      currentUrl.searchParams.set('project', currentProjectId);
    }
    window.history.pushState({}, '', currentUrl.toString());
    console.log('✅ URL updated with generation mode:', mode, 'URL:', currentUrl.toString());
  };

  // Save a message to the current chat
  const saveMessageToChat = async (content: string, role: 'user' | 'assistant') => {
    // If we don't have a chat ID, try to get it from the current project
    let chatIdToUse = currentChatId;
    
    if (!chatIdToUse && currentProjectId) {
      try {
        console.log('🔍 No chat ID, trying to get chat from current project:', currentProjectId);
        const chatResponse = await fetch(`/api/projects/${currentProjectId}/chats`, {
          credentials: 'include'
        });
        
        if (chatResponse.ok) {
          const chats = await chatResponse.json();
          if (chats && chats.length > 0) {
            chatIdToUse = chats[0].id;
            setCurrentChatId(chatIdToUse);
            console.log('✅ Retrieved chat ID from project:', chatIdToUse);
          }
        }
      } catch (error) {
        console.error('❌ Failed to retrieve chat ID from project:', error);
      }
    }
    
    if (!chatIdToUse) {
      console.error('❌ Cannot save message: no chat ID available after retrieval attempt');
      return;
    }

    try {
      console.log(`💾 Saving ${role} message to chat ${chatIdToUse}`);
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatIdToUse,
          role,
          text: content
        })
      });
      
      if (response.ok) {
        console.log(`✅ ${role} message saved successfully`);
      } else {
        console.error(`❌ Failed to save ${role} message:`, await response.text());
      }
    } catch (error) {
      console.error('❌ Failed to save message:', error);
    }
  };

  // Enhance user prompt with AI for better generation
  const enhancePrompt = async (originalIdea: string): Promise<string> => {
    try {
      console.log('🧠 Enhancing user prompt for better generation...');
      
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a product requirements analyst. Your job is to take a basic app idea and expand it into a comprehensive, detailed specification that will help generate a high-quality application.

Transform the user's basic idea into a detailed specification that includes:
1. Core functionality and features
2. User interface requirements and layout suggestions  
3. Technical considerations and architecture
4. User experience flows and interactions
5. Visual design preferences and styling
6. Data requirements and storage needs
7. Any integrations or external services needed

Make the enhanced prompt specific, actionable, and comprehensive while keeping the original intent. Focus on creating a modern, polished application.

Return only the enhanced prompt, no explanations or meta-text.`
            },
            {
              role: 'user',
              content: `Enhance this app idea: "${originalIdea}"`
            }
          ],
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (response.ok) {
        const result = await response.json();
        const enhancedPrompt = result.choices?.[0]?.message?.content || originalIdea;
        console.log('✅ Prompt enhanced successfully');
        console.log('📝 Original:', originalIdea);
        console.log('🚀 Enhanced:', enhancedPrompt.substring(0, 200) + '...');
        return enhancedPrompt;
      } else {
        console.warn('⚠️ Prompt enhancement failed, using original prompt');
        return originalIdea;
      }
    } catch (error) {
      console.error('❌ Error enhancing prompt:', error);
      console.log('⚠️ Using original prompt due to enhancement error');
      return originalIdea;
    }
  };

  // Save preview URL to project
  const savePreviewUrlToProject = async (previewUrl: string) => {
    if (!currentProjectId) {
      console.error('❌ Cannot save preview URL: no project ID');
      return;
    }

    try {
      console.log('💾 Saving preview URL to project:', currentProjectId);
      const response = await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          previewUrl: previewUrl
        })
      });
      
      if (response.ok) {
        console.log('✅ Preview URL saved to project successfully');
      } else {
        console.error('❌ Failed to save preview URL:', await response.text());
      }
    } catch (error) {
      console.error('❌ Failed to save preview URL:', error);
    }
  };

  // Load an existing Launch project
  const loadExistingProject = async (projectId: string) => {
    try {
      console.log('🔍 Loading existing Launch project:', projectId);
      
      // Load project details
      const projectResponse = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include'
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to load project');
      }

      const project = await projectResponse.json();
      setCurrentProjectId(project.id);
      console.log('✅ Project loaded:', project.title);

      // Load deployment URL if it exists
      if (project.deploymentUrl) {
        setDeploymentUrl(project.deploymentUrl);
        console.log('✅ Loaded deployment URL:', project.deploymentUrl);
      }

      // Load project files if they exist
      console.log('🔍 Loading project files...');
      console.log('🔍 Project generatedFiles field:', project.generatedFiles);
      console.log('🔍 Type of generatedFiles:', typeof project.generatedFiles);
      
      if (project.generatedFiles && typeof project.generatedFiles === 'object' && Object.keys(project.generatedFiles).length > 0) {
        console.log('✅ Files found:', Object.keys(project.generatedFiles));
        setProjectFiles(project.generatedFiles);
        setBuildStatus('success');
        console.log('✅ Files loaded into state:', Object.keys(project.generatedFiles));
        
        // Auto-select first file for editing
        const firstFile = Object.keys(project.generatedFiles)[0];
        if (firstFile) {
          setSelectedFile(firstFile);
          console.log('✅ Auto-selected file for editing:', firstFile);
        }
        
        // Set right panel to preview mode to show the loaded project
        setRightPanelMode('preview');
        
        // Create preview URL for the loaded files immediately
        if (!project.deploymentUrl) {
          console.log('🔄 Creating preview for loaded project files...');
          setTimeout(async () => {
            try {
              const response = await fetch('/api/preview/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                  files: project.generatedFiles,
                  projectId: currentProjectId 
                }),
              });
              
              if (response.ok) {
                const { previewId } = await response.json();
                const fullPreviewUrl = `${window.location.origin}/preview/${previewId}/`;
                setPreviewUrl(fullPreviewUrl);
                console.log('✅ Preview created for loaded project:', previewId, 'Full URL:', fullPreviewUrl);
              }
            } catch (error) {
              console.error('❌ Failed to create preview for loaded project:', error);
            }
          }, 500);
        }
        
        // If we have files but no deployment URL, the project was built but never deployed
        if (!project.deploymentUrl && allowAutoDeployment) {
          console.log('🔄 Project has files but no deployment URL - trying to redeploy');
          // Auto-deploy the existing files to restore the live preview
          setTimeout(() => {
            handleAutoDeployment(project.generatedFiles);
          }, 2000);
        }
      } else {
        console.log('⚠️ No generated files found in project');
        console.log('🔍 Raw generatedFiles value:', JSON.stringify(project.generatedFiles));
      }

      // Load chat history for the project
      console.log('🔍 Loading chat history for project...');
      const chatsResponse = await fetch(`/api/projects/${projectId}/chats`, {
        credentials: 'include'
      });

      if (chatsResponse.ok) {
        const chats = await chatsResponse.json();
        console.log('📋 Found chats:', chats.length);
        if (chats.length > 0) {
          setCurrentChatId(chats[0].id);

          // Load messages for this chat
          const messagesResponse = await fetch(`/api/chats/${chats[0].id}/messages`, {
            credentials: 'include'
          });

          if (messagesResponse.ok) {
            const messages = await messagesResponse.json();
            console.log('💬 Found messages:', messages.length);
            const chatMessages = messages.map((msg: any) => ({
              id: msg.id || Date.now().toString(),
              role: msg.role as 'user' | 'assistant',
              content: msg.text,
              timestamp: new Date(msg.createdAt || Date.now())
            }));
            setChatHistory(chatMessages);
            console.log('✅ Chat history loaded successfully');
          }
        } else {
          console.log('⚠️ No chats found for project');
        }
      } else {
        console.log('❌ Failed to load chats');
      }

      console.log('✅ Loaded existing Launch project:', project.id);
    } catch (error) {
      console.error('❌ Failed to load existing project:', error);
    }
  };

  // Save generated files to the project
  const saveGeneratedFiles = async (files: Record<string, string>) => {
    console.log('🔍 saveGeneratedFiles called with:', Object.keys(files).length, 'files');
    console.log('🔍 File names:', Object.keys(files));
    console.log('🔍 File sample content:', Object.values(files)[0]?.substring(0, 100) + '...');
    console.log('🔍 Current project ID at save time:', currentProjectId);
    console.log('🔍 Window ref project ID:', (window as any).currentProjectIdRef);
    
    const projectId = currentProjectId || (window as any).currentProjectIdRef;
    
    if (!projectId) {
      console.error('❌ CRITICAL: No project ID available for saving files');
      console.error('❌ Files will NOT be saved to database - only visible in preview');  
      console.error('❌ This means project persistence is broken');
      // Still try auto-deployment even without saving to project
      if (Object.keys(files).length > 0) {
        console.log('🚀 Triggering auto-deployment anyway...');
        setTimeout(() => {
          console.log('🎯 Starting auto-deployment now');
          handleAutoDeployment(files);
        }, 1000);
      }
      return;
    }

    try {
      console.log(`💾 Attempting to save files to project ${projectId}...`);
      console.log('💾 Request body preview:', JSON.stringify({ generatedFiles: Object.keys(files) }, null, 2));
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          generatedFiles: files
        })
      });
      
      console.log('💾 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Saved generated files to project:', projectId);
        console.log('✅ Saved files count:', Object.keys(files).length);
        console.log('✅ Project update response:', result.id || 'success');
        
        // Verify files were saved by checking the response
        console.log('✅ Returned generatedFiles:', result.generatedFiles ? Object.keys(result.generatedFiles) : 'null/undefined');
        if (result.generatedFiles && Object.keys(result.generatedFiles).length > 0) {
          console.log('✅ CONFIRMED: files saved in database:', Object.keys(result.generatedFiles).length);
        } else {
          console.error('❌ WARNING: Response shows no generatedFiles saved!');
          console.error('❌ Response data:', JSON.stringify(result, null, 2));
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save files, response:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Failed to save generated files:', error);
    }

    // Auto-deploy if we have files
    if (Object.keys(files).length > 0) {
      console.log('🚀 Triggering auto-deployment in 1 second...');
      setTimeout(() => {
        console.log('🎯 Starting auto-deployment now');
        handleAutoDeployment(files);
      }, 1000); // Small delay to ensure files are saved
    } else {
      console.log('⚠️ No files to auto-deploy');
    }
  };

  // Auto-deploy after generation completes
  const handleAutoDeployment = async (files: Record<string, string>) => {
    console.log('🎯 handleAutoDeployment called with', Object.keys(files).length, 'files');
    
    if (!allowAutoDeployment) {
      console.log('🚫 Auto-deployment BLOCKED - AI generation still in progress');
      return;
    }
    
    if (Object.keys(files).length === 0) {
      console.log('❌ No files to deploy in handleAutoDeployment');
      return;
    }
    
    console.log('🚀 Setting isDeploying to true and starting deployment...');
    setIsDeploying(true);
    
    try {
      const deployMessage = "🚀 Starting auto-deployment to Vercel... Building your app...";
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: deployMessage
      }]);
      
      // Save deployment start message to chat
      await saveMessageToChat(deployMessage, 'assistant');

      // Convert files to Vercel format
      const vercelFiles = Object.entries(files).map(([path, content]) => ({
        file: path,
        data: content
      }));

      // Generate project name from current idea or use timestamp
      const projectName = chatHistory.length > 0 
        ? chatHistory[0].content.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30) + '-' + Date.now()
        : `fikrahub-project-${Date.now()}`;

      const response = await fetch('/api/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName,
          files: vercelFiles
        })
      });

      const result = await response.json();

      if (result.success && result.url) {
        // Set deployment URL immediately but show as building
        setDeploymentUrl(result.url);
        setBuildStatus('building');
        
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: `🔄 Deployment initiated! Building at: ${result.url}\n\nWaiting for build to complete...`
        }]);
        
        // Save the deployment URL to the project immediately
        if (currentProjectId) {
          console.log('💾 Saving deployment URL to project:', result.url);
          await fetch(`/api/projects/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              deploymentUrl: result.url
            })
          });
          console.log('✅ Deployment URL saved to project');
        }
        
        // Save deployment success message to chat
        await saveMessageToChat(`🔄 Deployment initiated! Building at: ${result.url}\n\nWaiting for build to complete...`, 'assistant');
      } else {
        throw new Error(result.error || 'Auto-deployment failed');
      }

    } catch (error) {
      const errorMessage = `❌ Auto-deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}.`;
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
      
      // Save error message to chat
      await saveMessageToChat(errorMessage, 'assistant');
      setBuildStatus('error');
    } finally {
      setIsDeploying(false);
    }
  };

  // Export project files as ZIP
  const handleExportZip = async () => {
    if (Object.keys(projectFiles).length === 0) {
      console.log('No files to export');
      return;
    }

    try {
      // Create a zip file containing all project files
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add all project files to zip
      Object.entries(projectFiles).forEach(([path, content]) => {
        zip.file(path, content);
      });

      // Generate the zip file
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fikrahub-project-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setChatHistory(prev => [...prev, createChatMessage('assistant', `✅ Project exported successfully! Your ZIP file contains ${Object.keys(projectFiles).length} files and is ready for download.`)]);

    } catch (error) {
      console.error('Export failed:', error);
      setChatHistory(prev => [...prev, createChatMessage('assistant', `❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)]);
    }
  };

  // Wait for Vercel deployment to be ready
  const waitForDeploymentReady = async (url: string) => {
    const maxAttempts = 15; // ~90 seconds max wait
    let attempts = 0;
    
    setChatHistory(prev => [...prev, createChatMessage('assistant', `🔄 Build in progress... This typically takes 30-60 seconds.`)]);
    
    while (attempts < maxAttempts) {
      try {
        // Try to access the deployed site via a simple fetch
        const testResponse = await fetch(`${url}/favicon.ico`, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        // Wait a moment then mark as ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        setBuildStatus('success');
        const completionMessage = `✅ Build complete! Your app is now live at: ${url}`;
        setChatHistory(prev => [...prev, createChatMessage('assistant', completionMessage)]);
        
        // Save completion message to chat
        await saveMessageToChat(completionMessage, 'assistant');
        return;
        
      } catch (error) {
        // Site not ready yet, wait and retry
        attempts++;
        if (attempts % 3 === 0) {
          setChatHistory(prev => [...prev, createChatMessage('assistant', `⏳ Still building... (${Math.round(attempts * 6)}s elapsed)`)]);
        }
        await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
      }
    }
    
    // Timeout reached - assume it's ready
    setBuildStatus('success');
    const timeoutMessage = `✅ Build should be complete! If the app doesn't load, try refreshing in a minute.`;
    setChatHistory(prev => [...prev, createChatMessage('assistant', timeoutMessage)]);
    
    // Save timeout message to chat
    await saveMessageToChat(timeoutMessage, 'assistant');
  };

  // Deploy to Vercel (manual)
  const handleDeploy = async () => {
    if (Object.keys(projectFiles).length === 0) {
      setChatHistory(prev => [...prev, createChatMessage('assistant', "❌ No files to deploy. Please generate some code first by describing what you want to build.")]);
      return;
    }

    setIsDeploying(true);
    
    try {
      setChatHistory(prev => [...prev, createChatMessage('assistant', "🚀 Starting deployment to Vercel... This may take a minute.")]);

      // Convert projectFiles to Vercel format
      const files = Object.entries(projectFiles).map(([path, content]) => ({
        file: path,
        data: content
      }));

      // Generate project name from current idea or use timestamp
      const projectName = chatHistory.length > 0 
        ? chatHistory[0].content.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30) + '-' + Date.now()
        : `fikrahub-project-${Date.now()}`;

      const response = await fetch('/api/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName,
          files,
          projectSettings: {
            framework: 'vite',
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
            installCommand: 'npm install'
          }
        })
      });

      const result = await response.json();

      if (result.success && result.url) {
        setDeploymentUrl(result.url);
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: `✅ Successfully deployed to Vercel! Your app is live at: ${result.url}\n\nYou can share this URL with anyone to show your project. The deployment includes all the generated files and will automatically rebuild if you make changes.`
        }]);
        
        // Save the deployment URL to the project
        if (currentProjectId) {
          await fetch(`/api/projects/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              deploymentUrl: result.url
            })
          });
        }
      } else {
        throw new Error(result.error || 'Deployment failed');
      }

    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure your Vercel token is configured and try again.`
      }]);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>

      {/* Main Launch Interface */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Launch Mode</h1>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                buildStatus === 'building' ? 'bg-yellow-500 animate-pulse' :
                buildStatus === 'success' ? 'bg-green-500' :
                buildStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-muted-foreground">
                {buildStatus === 'building' ? 'Building...' :
                 buildStatus === 'success' ? 'Ready' :
                 buildStatus === 'error' ? 'Error' : 'Idle'}
              </span>
            </div>
          </div>
          
          <TooltipProvider>
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-background/80"
                    onClick={handleExportZip}
                    disabled={Object.keys(projectFiles).length === 0}
                    data-testid="export-zip"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export ZIP</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-background/80"
                    disabled={Object.keys(projectFiles).length === 0}
                  >
                    <Github className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to GitHub</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-primary/10 text-primary hover:text-primary"
                    onClick={handleDeploy}
                    disabled={isDeploying || Object.keys(projectFiles).length === 0}
                  >
                    {isDeploying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <Rocket className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isDeploying ? 'Deploying...' : 'Deploy to Vercel'}</TooltipContent>
              </Tooltip>
              
              {(deploymentUrl || previewUrl) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-background/80"
                      onClick={() => {
                        const urlToOpen = deploymentUrl || previewUrl;
                        if (urlToOpen) {
                          console.log('🔗 Opening in new tab from top bar:', urlToOpen);
                          window.open(urlToOpen, '_blank');
                        }
                      }}
                      data-testid="open-preview-new-tab-topbar"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open in New Tab</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>

        {/* Split Panel Layout */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Chat */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full flex flex-col">
              {/* Chat Header with Generation Mode Selector */}
              <div className="h-16 border-b border-border flex items-center justify-between px-4">
                <h2 className="font-medium">AI Chat</h2>
                
                {/* Generation Mode Selector */}
                
                {/* Generation Mode Selection */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mode:</span>
                  <div className="flex rounded-lg border p-1 bg-muted/50">
                    <Button
                      variant={generationMode === 'lite' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        console.log('🎯 User clicked LITE mode');
                        setGenerationMode('lite');
                        updateUrlWithMode('lite');
                      }}
                      className="flex items-center gap-1 px-3 h-7 text-xs"
                      title="⚡ Lite: Fast, essential features (4 files)"
                    >
                      <Zap className="w-3 h-3" />
                      Lite
                    </Button>
                    <Button
                      variant={generationMode === 'pro' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        console.log('🎯 User clicked PRO mode');
                        setGenerationMode('pro');
                        updateUrlWithMode('pro');
                      }}
                      className="flex items-center gap-1 px-3 h-7 text-xs"
                      title="🚀 Pro: Balanced speed & quality (6 files)"
                    >
                      <Target className="w-3 h-3" />
                      Pro
                    </Button>
                    <Button
                      variant={generationMode === 'max' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        console.log('🎯 User clicked MAX mode');
                        setGenerationMode('max');
                        updateUrlWithMode('max');
                      }}
                      className="flex items-center gap-1 px-3 h-7 text-xs"
                      title="💎 Max: Premium quality, full features (8 files)"
                    >
                      <Crown className="w-3 h-3" />
                      Max
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {isBuilding && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <AgentStatus 
                        isActive={agentStatus.isActive || isBuilding}
                        phase={agentStatus.phase}
                        currentStep={currentPlan || agentStatus.currentStep || ''}
                        progress={agentStatus.progress}
                        files={agentStatus.files}
                        estimatedTime={agentStatus.estimatedTime}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Chat Input */}
              <div className="border-t border-border p-4">
                <div className="relative">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe what you want to build or modify..."
                    className="pr-12 resize-none"
                    rows={3}
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="sm"
                    className="absolute bottom-3 right-3"
                    disabled={!message.trim() || isBuilding}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Toggle between Files and Preview */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col">
              {/* Right Panel Header with Toggle */}
              <div className="h-12 border-b border-border flex items-center justify-between px-4">
                <h2 className="font-medium">
                  {rightPanelMode === 'preview' ? '🌐 Live Website Preview' : 
                   rightPanelMode === 'editor' ? 'Code Editor' : 'Project Files'}
                </h2>
                <div className="flex items-center gap-2">
                  {deploymentUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(deploymentUrl, '_blank')}
                      className="flex items-center gap-1"
                      data-testid="open-deployed-app"
                      title="Open deployed app in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Live</span>
                    </Button>
                  )}
                  <Button
                    variant={rightPanelMode === 'files' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRightPanelMode('files')}
                    className="flex items-center gap-1"
                  >
                    <FolderTree className="w-4 h-4" />
                    <span className="hidden sm:inline">Files</span>
                  </Button>
                  <Button
                    variant={rightPanelMode === 'editor' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRightPanelMode('editor')}
                    className="flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Editor</span>
                  </Button>
                  <Button
                    variant={rightPanelMode === 'preview' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRightPanelMode('preview')}
                    className="flex items-center gap-1"
                  >
                    <Play className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </Button>
                </div>
              </div>

              {/* Right Panel Content */}
              <div className="flex-1">
                {rightPanelMode === 'files' ? (
                  /* File Explorer Mode */
                  <div className="h-full flex">
                    <FileTree 
                      files={projectFiles}
                      selectedFile={selectedFile}
                      onFileSelect={setSelectedFile}
                      isCollapsed={false}
                      onToggleCollapse={() => {}}
                    />
                    
                    {/* Code Viewer */}
                    <div className="flex-1 border-l border-border">
                      {selectedFile && projectFiles[selectedFile] ? (
                        <div className="h-full flex flex-col">
                          <div className="h-10 border-b border-border flex items-center px-4 bg-muted/50">
                            <span className="text-sm text-muted-foreground">{selectedFile}</span>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto overflow-x-auto p-4">
                              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm font-mono leading-relaxed min-h-full">
                                <code className="block whitespace-pre-wrap break-words">{projectFiles[selectedFile]}</code>
                              </pre>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                          <div>
                            <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium mb-2">No File Selected</p>
                            <p className="text-sm">Choose a file from the tree to view its code</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : rightPanelMode === 'editor' ? (
                  /* Monaco Editor Mode */
                  <MonacoEditor
                    files={projectFiles}
                    selectedFile={selectedFile}
                    onFileChange={(path, content) => {
                      setProjectFiles(prev => ({ ...prev, [path]: content }));
                      // Auto-save changes
                      setTimeout(() => saveGeneratedFiles({ ...projectFiles, [path]: content }), 1000);
                    }}
                    className="h-full"
                  />
                ) : (
                  /* Live Preview Mode */
                  <div className="h-full bg-white border rounded-lg m-2 shadow-sm overflow-hidden">
                    <CodeCanvas 
                      files={projectFiles}
                      onBuildStatusChange={setBuildStatus}
                      onErrorsChange={setBuildErrors}
                      showPreview={true}
                      onToggleView={() => {}}
                      selectedFile={selectedFile}
                      onFileChange={(filePath: string, content: string) => {
                        console.log('📝 File edited:', filePath);
                        setProjectFiles(prev => ({ ...prev, [filePath]: content }));
                      }}
                      generationStatus={currentPlan}
                      deploymentUrl={deploymentUrl}
                      buildStatus={buildStatus}
                      previewUrl={previewUrl}
                      onPreviewUrlChange={(url) => {
                        console.log('🔗 Preview URL received in Launch:', url);
                        setPreviewUrl(url);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}