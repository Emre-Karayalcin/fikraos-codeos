import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput, InputMode } from "@/components/chat/ChatInput";
import { AgentQuestionForm } from "@/components/chat/AgentQuestionForm";
import { AgentMessage } from "@/components/chat/AgentMessage";
import { AssetPreview } from "@/components/assets/AssetPreview";
import { ResearchAgent, AgentState } from "@/components/research/ResearchAgent";
import { ActivityFeed, ActivityItem } from "@/components/research/ActivityFeed";
import { MoreHorizontal, Sparkles, Zap, Brain, Rocket, RefreshCw, Trash2, Copy, Trophy, X, CheckCircle2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAgentChat } from "@/hooks/useAgentChat";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChallengeContext {
  challengeId: string;
  challengeName: string;
}

interface CenterPanelProps {
  chatId?: string;
  challengeContext?: ChallengeContext | null;
  onClearChallenge?: () => void;
  onResearchModeChange?: (mode: boolean) => void;
  onResearchDataChange?: (data: any) => void;
  onResearchLoadingChange?: (loading: boolean) => void;
}

type ChatMode = 'fast' | 'balanced' | 'advanced';

// Expected asset types for business framework
const EXPECTED_ASSET_TYPES = [
  'LEAN_CANVAS',
  'SWOT',
  'PERSONA',
  'USER_STORIES',
  'INTERVIEW_QUESTIONS',
  'JOURNEY_MAP',
  'MARKETING_PLAN',
  'BRAND_WHEEL',
  'BRAND_IDENTITY',
  'COMPETITOR_MAP',
  'TAM_SAM_SOM',
  'TEAM_ROLES',
  'PITCH_OUTLINE'
];

export function CenterPanel({ chatId, challengeContext, onClearChallenge, onResearchModeChange, onResearchDataChange, onResearchLoadingChange }: CenterPanelProps) {
  const { t, i18n } = useTranslation();
  const [useAgentMode, setUseAgentMode] = useState(true);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChatMode>('balanced');
  const [streamingText, setStreamingText] = useState('');
  const inputMode: InputMode = 'develop';
  const [researchState, setResearchState] = useState<AgentState>('IDLE');
  const [researchActivities, setResearchActivities] = useState<ActivityItem[]>([]);
  const [currentResearchStep, setCurrentResearchStep] = useState<string>('');
  
  // Always in develop mode for chat
  useEffect(() => {
    onResearchModeChange?.(false);
  }, [onResearchModeChange]);

  // Notify parent of research loading state
  useEffect(() => {
    onResearchLoadingChange?.(researchState !== 'IDLE' && researchState !== 'DONE' && researchState !== 'ERROR');
  }, [researchState, onResearchLoadingChange]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();


  // Auto-play AI voice responses
  const playAIResponseVoice = async (text: string) => {
    try {
      console.log("🎵 Auto-playing voice for:", text.substring(0, 50) + "...");
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        credentials: 'include'
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        await audio.play();
        console.log("🔊 Auto-played AI response successfully");
      } else {
        console.error("Voice auto-play failed:", response.status, await response.text());
      }
    } catch (error) {
      console.log("Voice auto-play failed (optional feature):", error);
    }
  };

  // Fetch chat data
  const { data: chat } = useQuery({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Get projectId - handle both camelCase and snake_case
  const chatProjectId = (chat as any)?.projectId || (chat as any)?.project_id;

  // Fetch messages (removed aggressive polling to fix lag)
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chats", chatId, "messages"],
    queryFn: async () => {
      if (!chatId) return [];
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return await response.json();
    },
    enabled: !!chatId,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Removed refetchInterval to eliminate constant polling
    staleTime: 5000, // 5 seconds - reasonable cache time
  });

  // Fetch project data for context
  const { data: project = {} } = useQuery({
    queryKey: ["/api/projects", chatProjectId],
    enabled: !!chatProjectId,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch assets with monitoring
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["/api/projects", chatProjectId, "assets"],
    enabled: !!chatProjectId,
    retry: false,
    staleTime: 2000, // 2 seconds cache time
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Add refetch interval to check for new assets every 3 seconds
    refetchInterval: 3000,
  });

  // Monitor assets completion - check when we have all 8 expected asset types
  useEffect(() => {
    if (!chatProjectId || !assets || assets.length === 0) {
      return;
    }

    // Get unique asset types from current assets
    const assetTypes = new Set(
      assets
        .map((asset: any) => asset.kind)
        .filter(Boolean)
    );

    console.log('📊 Asset monitoring:', {
      totalAssets: assets.length,
      assets,
      uniqueTypes: assetTypes.size,
      types: Array.from(assetTypes),
      expected: EXPECTED_ASSET_TYPES.length
    });

    // Check if we have all expected asset types
    const hasAllAssets = EXPECTED_ASSET_TYPES.every(type => assetTypes.has(type));
    const minAssetsReached = assets.length >= 13;

    if (hasAllAssets && minAssetsReached) {
      const handleCompletion = async () => {
        setIsGeneratingResponse(false);
        await queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      };

      handleCompletion();
    }
  }, [assets, chatProjectId, chatId]);

  // Agent chat hook for the new cofounder experience
  const agentChat = useAgentChat((project as any)?.id);

  // Submit project mutation
  const submitProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/submit`, {});
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to submit' }));
        throw new Error(err.error || 'Failed to submit');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', chatProjectId] });
      toast({
        title: 'Idea submitted!',
        description: 'Your idea has been submitted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission failed',
        description: error.message || 'Could not submit your idea.',
        variant: 'destructive',
      });
    },
  });

  // Delete chat mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const response = await apiRequest('DELETE', `/api/chats/${chatId}`);
      return response;
    },
    onSuccess: () => {
      // Redirect to dashboard after deletion
      window.location.href = '/';
    },
    onError: (error) => {
      console.error("Failed to delete chat:", error);
      toast({
        title: t('centerPanel.error'),
        description: t('centerPanel.deleteError'),
        variant: "destructive"
      });
    }
  });

  // Duplicate chat mutation
  const duplicateChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      // Get the current chat and project data
      const chatResponse = await fetch(`/api/chats/${chatId}`, {
        credentials: 'include'
      });
      const chatData = await chatResponse.json();

      // Create a new chat with duplicated data
      const newChatResponse = await apiRequest('POST', '/api/chats', {
        projectId: chatData.projectId || chatData.project_id,
        title: `${chatData.title} (${t('centerPanel.copy')})`
      });
      
      return newChatResponse;
    },
    onSuccess: async (response) => {
      // Parse the response and redirect to the new duplicated chat
      const newChat = await response.json();
      window.location.href = `/chat/${newChat.id}`;
    },
    onError: (error) => {
      console.error("Failed to duplicate chat:", error);
      toast({
        title: t('centerPanel.error'),
        description: t('centerPanel.duplicateError'),
        variant: "destructive"
      });
    }
  });

  // Send message mutation  
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!chatId) throw new Error("No chat selected");
      
      setIsGeneratingResponse(true);
      
      // Use agent chat endpoint for agent mode ONLY
      if (useAgentMode) {
        const agentResponse = await apiRequest("POST", "/api/agent/chat", {
          message: messageText,
          chatId,
          language: i18n.language || 'en',
        });
        
        const agentData = await agentResponse.json();
        console.log("Agent response received:", agentData);
        
        // Single invalidation after agent response
        if ((project as any)?.id) {
          await queryClient.invalidateQueries({ queryKey: ["/api/projects", (project as any).id, "assets"] });
        }
      } else {
        // Regular chat flow
        await apiRequest("POST", "/api/messages", {
          chatId,
          role: "user", 
          text: messageText,
        });

        const chatResponseResponse = await apiRequest("POST", "/api/chat/response", {
          message: messageText,
          mode: selectedMode,
          context: {
            projectId: (project as any)?.id,
            projectTitle: (project as any)?.title,
            projectDescription: (project as any)?.description,
            recentMessages: messages?.slice(-5) || []
          },
        });
        const aiResponse = await chatResponseResponse.json();

        // Voice disabled for now
        // TODO: Re-enable voice when API limits are resolved

        await apiRequest("POST", "/api/messages", {
          chatId,
          role: "assistant",
          text: aiResponse.response,
        });
      }

      setIsGeneratingResponse(false);
    },
    onSuccess: async () => {
      // Single refresh to show new messages
      await queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      setIsGeneratingResponse(false);
    },
    onError: (error) => {
      setIsGeneratingResponse(false);
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t('centerPanel.unauthorized'),
          description: t('centerPanel.unauthorizedDesc'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      console.error("Failed to send message:", error);
      toast({
        title: t('centerPanel.error'),
        description: t('centerPanel.sendError'),
        variant: "destructive"
      });
    },
  });

  // Handle research query
  const handleResearchQuery = async (query: string) => {
    try {
      setResearchState('PLANNING');
      setResearchActivities([]);
      setCurrentResearchStep(t('centerPanel.analyzingQuery'));
      
      // Add query to activity feed
      const queryActivity: ActivityItem = {
        id: Date.now().toString(),
        type: 'query',
        timestamp: new Date(),
        content: query
      };
      setResearchActivities([queryActivity]);

      // Call research endpoint
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Research failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.state) {
                setResearchState(data.state);
              }
              
              if (data.step) {
                setCurrentResearchStep(data.step);
              }
              
              if (data.activity) {
                const activity: ActivityItem = {
                  id: Date.now().toString() + Math.random(),
                  type: data.activity.type,
                  timestamp: new Date(),
                  content: data.activity.content,
                  url: data.activity.url,
                  domain: data.activity.domain,
                  reason: data.activity.reason,
                  snippet: data.activity.snippet,
                  favicon: data.activity.favicon,
                };
                setResearchActivities(prev => [...prev, activity]);
              }
              
              if (data.done) {
                setResearchState('DONE');
                
                // Pass research data to parent
                if (data.researchData) {
                  onResearchDataChange?.(data.researchData);
                }
                
                // Post result to chat if we have a chatId
                if (data.result && chatId) {
                  await apiRequest("POST", "/api/messages", {
                    chatId,
                    role: "assistant",
                    text: data.result,
                  });
                  await queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
                }
                break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Research error:', error);
      setResearchState('ERROR');
      toast({
        title: t('centerPanel.researchFailed'),
        description: t('centerPanel.researchError'),
        variant: 'destructive',
      });
    }
  };

  // Auto scroll to bottom for both regular and agent messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentChat?.messages]);

  // Start agent mode automatically for new chats (fixed duplication)
  useEffect(() => {
    if (chatId && messages !== undefined && !messagesLoading && !sendMessageMutation.isPending) {
      setUseAgentMode(true);
      
      // Only send initial greeting once per chat
      if (Array.isArray(messages) && messages.length === 0) {
        const initKey = `chat_initialized_${chatId}`;
        const hasInitialized = sessionStorage.getItem(initKey);
        
        if (!hasInitialized) {
          sessionStorage.setItem(initKey, 'true');
          // Start immediately without checks to prevent duplication
          sendMessageMutation.mutate("__AGENT_START__");
        }
      }
    }
  }, [chatId, messages?.length, messagesLoading]);

  if (!chatId) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center">
          <p className="text-text-primary text-lg mb-2">{t('centerPanel.noChatSelected')}</p>
          <p className="text-text-secondary">{t('centerPanel.selectChat')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background h-full">
      {/* Chat Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-1" data-testid="chat-title">
                {(project as any)?.title || t('centerPanel.launchpad')}
              </h2>
            </div>
            {/* Submit button - shown when project exists */}
            {chatProjectId && (
              (project as any)?.submitted ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Submitted
                </span>
              ) : (
                <Button
                  size="sm"
                  className="h-8 px-3 gap-1.5 text-xs"
                  disabled={assets.length < 13 || submitProjectMutation.isPending}
                  title={assets.length < 13 ? `Need all 13 assets before submitting (${assets.length}/13 ready)` : 'Submit your idea'}
                  onClick={() => {
                    if (confirm('Submit this idea? You can only submit one idea per workspace.')) {
                      submitProjectMutation.mutate(chatProjectId);
                    }
                  }}
                  data-testid="submit-idea"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitProjectMutation.isPending ? 'Submitting...' : 'Submit idea'}
                </Button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-text-secondary hover:text-text-primary"
                  data-testid="button-more"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    if (chatId) {
                      duplicateChatMutation.mutate(chatId);
                    }
                  }}
                  className="flex items-center gap-2"
                  data-testid="duplicate-chat"
                  disabled={duplicateChatMutation.isPending}
                >
                  <Copy className="w-4 h-4" />
                  <span>{duplicateChatMutation.isPending ? t('centerPanel.duplicating') : t('centerPanel.duplicate')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (chatId && confirm(t('centerPanel.confirmDelete'))) {
                      deleteChatMutation.mutate(chatId);
                    }
                  }}
                  className="flex items-center gap-2 text-red-600"
                  data-testid="delete-chat"
                  disabled={deleteChatMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleteChatMutation.isPending ? t('centerPanel.deleting') : t('centerPanel.delete')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Challenge Context Banner */}
      {challengeContext && (
        <div className="px-6 py-3 bg-primary/5 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{t('centerPanel.challengeSubmission')}</span>
              </div>
              <div>
                <p className="text-sm text-text-primary font-medium">
                  {t('centerPanel.submittingTo')}: <span className="text-primary">{challengeContext.challengeName}</span>
                </p>
                <p className="text-xs text-text-secondary">
                  {t('centerPanel.submittingToDesc')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClearChallenge?.();
                toast({
                  title: t('centerPanel.challengeCleared'),
                  description: t('centerPanel.challengeClearedDesc')
                });
              }}
              className="text-text-secondary hover:text-text-primary"
              data-testid="clear-challenge-context"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages?.map((message: any, index: number) => (
          <ChatMessage 
            key={message.id} 
            message={message}
            completedAssets={assets.length}
            enableTyping={message.role === 'assistant' && index === (messages ?? []).length - 1}
          />
        ))}

        {isGeneratingResponse && useAgentMode && (
          <div className="flex justify-start">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-foreground animate-pulse" />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {messages && messages.length >= 4 ? t('centerPanel.creatingFramework') : t('centerPanel.thinking')}
                </span>
              </div>
              <div className="bg-muted/40 border border-border rounded-2xl px-4 py-4">
                {messages && messages.length >= 4 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-text-secondary">{t('centerPanel.generatingAssets')}</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <span className="text-xs text-text-muted">{t('centerPanel.assetFlow')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isGeneratingResponse && !useAgentMode && (
          <div className="flex justify-start">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-foreground animate-pulse" />
                </div>
                <span className="text-sm font-medium text-text-primary">{t('centerPanel.aiThinking')}</span>
              </div>
              <div className="bg-muted/40 border border-border rounded-2xl px-4 py-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      


      {/* Chat Input */}
      <ChatInput 
        onSendMessage={(message) => sendMessageMutation.mutate(message)}
        onResearchQuery={handleResearchQuery}
        isDisabled={sendMessageMutation.isPending || isGeneratingResponse || researchState !== 'IDLE'}
        placeholder={t('centerPanel.inputPlaceholder')}
        mode={inputMode}
        showModeSwitch={false}
      />
    </div>
  );
}
