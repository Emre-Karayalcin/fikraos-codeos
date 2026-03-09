import { useState, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

export interface AgentMessage {
  id: string;
  type: 'user' | 'assistant' | 'status' | 'asset' | 'codeFile';
  content: string;
  data?: any;
  timestamp: Date;
}

export interface AgentChatState {
  messages: AgentMessage[];
  isRunning: boolean;
  currentStep: string | null;
  progress: { current: number; total: number } | null;
}

export function useAgentChat(projectId?: string) {
  const [state, setState] = useState<AgentChatState>({
    messages: [],
    isRunning: false,
    currentStep: null,
    progress: null
  });
  
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  const addMessage = useCallback((message: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    const newMessage: AgentMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
    
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<AgentMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }));
  }, []);

  const startAgent = useCallback(async (ideaName: string, launchLocation: string) => {
    if (state.isRunning) {
      console.warn('Agent is already running');
      return;
    }

    // Add user questions and responses to chat
    addMessage({
      type: 'user',
      content: `Idea Name: ${ideaName}`
    });
    
    addMessage({
      type: 'user', 
      content: `Launch Location: ${launchLocation}`
    });

    addMessage({
      type: 'assistant',
      content: '🚀 Perfect! I\'m now going to generate your complete business framework step by step. Let\'s build something amazing together!'
    });

    setState(prev => ({
      ...prev,
      isRunning: true,
      currentStep: null,
      progress: null
    }));

    try {
      // Add initial generation start message
      const statusMessageId = addMessage({
        type: 'status',
        content: '🔄 Creating business framework...'
      });

      // Start SSE connection to agent
      const response = await fetch('/api/agent/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ideaName, 
          launchLocation,
          projectId 
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Agent failed to start: ${response.status}`);
      }

      // Set up SSE to read the response stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data.trim()) {
                    try {
                      const event = JSON.parse(data);
                      
                      // Handle different event types
                      if (event.type === 'status') {
                        // Update the status message with current step
                        updateMessage(statusMessageId, {
                          content: `${event.data.message} ${event.data.progress ? `(${event.data.progress}/${event.data.total})` : ''}`,
                          data: event.data
                        });
                        
                        // Update state with current step and progress
                        setState(prev => ({
                          ...prev,
                          currentStep: event.data.step,
                          progress: event.data.progress ? { current: event.data.progress, total: event.data.total } : prev.progress
                        }));

                      } else if (event.type === 'complete' || event.type === 'done') {
                        // Mark as completed
                        updateMessage(statusMessageId, {
                          content: '🎉 Complete business framework generated!'
                        });
                        
                        setState(prev => ({
                          ...prev,
                          isRunning: false,
                          currentStep: null,
                          progress: null
                        }));
                        
                        toast({
                          title: "Success!",
                          description: "Your business framework has been generated successfully.",
                        });
                        
                        break;
                        
                      } else if (event.type === 'error') {
                        updateMessage(statusMessageId, {
                          content: `❌ Generation failed: ${event.data.error}`
                        });
                        
                        setState(prev => ({
                          ...prev,
                          isRunning: false,
                          currentStep: null,
                          progress: null
                        }));
                        
                        toast({
                          title: "Error",
                          description: `Generation failed: ${event.data.error}`,
                          variant: "destructive"
                        });
                        break;
                      }
                    } catch (e) {
                      console.warn('Failed to parse SSE data:', e);
                    }
                  }
                }
              }
            }
          } catch (streamError) {
            console.error('Stream processing error:', streamError);
          } finally {
            setState(prev => ({
              ...prev,
              isRunning: false,
              currentStep: null,
              progress: null
            }));
          }
        };
        
        processStream();
      }

    } catch (error) {
      console.error('Failed to start agent:', error);
      
      addMessage({
        type: 'assistant',
        content: `❌ Failed to start business framework generation: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentStep: null,
        progress: null
      }));
      
      toast({
        title: "Error",
        description: "Failed to start the agent. Please try again.",
        variant: "destructive"
      });
    }
  }, [state.isRunning, projectId, addMessage, updateMessage, toast]);

  const stopAgent = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentStep: null,
      progress: null
    }));
  }, []);

  const clearChat = useCallback(() => {
    setState({
      messages: [],
      isRunning: false,
      currentStep: null,
      progress: null
    });
  }, []);

  return {
    ...state,
    startAgent,
    stopAgent,
    clearChat,
    addMessage
  };
}