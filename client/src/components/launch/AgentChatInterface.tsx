import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./ChatMessage";
import { AgentStatus } from "./AgentStatus";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FileProgress {
  path: string;
  status: 'pending' | 'generating' | 'completed';
  size?: number;
}

interface AgentChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  generationMode: 'lite' | 'pro' | 'max';
  onModeChange: (mode: 'lite' | 'pro' | 'max') => void;
  agentStatus: {
    isActive: boolean;
    phase: 'planning' | 'generating' | 'deploying' | 'completed' | 'idle';
    currentStep: string;
    progress: number;
    files: FileProgress[];
    estimatedTime?: string;
  };
}

export function AgentChatInterface({
  messages,
  onSendMessage,
  isGenerating,
  generationMode,
  onModeChange,
  agentStatus
}: AgentChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, agentStatus]);

  const handleSend = () => {
    if (message.trim() && !isGenerating) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could add a toast notification here
  };

  const handleMessageFeedback = (isPositive: boolean) => {
    // Could track feedback for improving the agent
    console.log('Message feedback:', isPositive);
  };

  const getModeIcon = (mode: 'lite' | 'pro' | 'max') => {
    switch (mode) {
      case 'lite': return <Zap className="w-4 h-4" />;
      case 'pro': return <Sparkles className="w-4 h-4" />;
      case 'max': return <Crown className="w-4 h-4" />;
    }
  };

  const getModeColor = (mode: 'lite' | 'pro' | 'max') => {
    switch (mode) {
      case 'lite': return 'from-green-500 to-emerald-500';
      case 'pro': return 'from-blue-500 to-purple-500';
      case 'max': return 'from-purple-500 to-pink-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Mode Selector */}
      <CardHeader className="pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">FikraHub Agent</h3>
              <p className="text-xs text-gray-400">Powered by FikraHub AI</p>
            </div>
          </div>

          {/* Generation Mode Selector */}
          <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
            {(['lite', 'pro', 'max'] as const).map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs transition-all duration-200",
                  generationMode === mode
                    ? `bg-gradient-to-r ${getModeColor(mode)} text-white shadow-lg`
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                )}
                onClick={() => onModeChange(mode)}
                disabled={isGenerating}
              >
                {getModeIcon(mode)}
                <span className="ml-1 capitalize">{mode}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  Welcome to FikraHub Agent
                </h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  Describe your idea and I'll generate a complete React application with live preview and deployment.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                onCopy={handleCopyMessage}
                onFeedback={handleMessageFeedback}
              />
            ))}

            {/* Agent Status (outside of chat bubbles) */}
            {agentStatus.isActive && (
              <div className="py-2">
                <AgentStatus {...agentStatus} />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isGenerating 
                  ? "Agent is working..." 
                  : "Describe your app idea..."
              }
              className="min-h-[44px] max-h-32 resize-none pr-12 bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500"
              disabled={isGenerating}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {message.length}/2000
            </div>
          </div>
          
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isGenerating}
            className={cn(
              "h-11 w-11 p-0 transition-all duration-200",
              message.trim() && !isGenerating
                ? "bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-600 hover:to-blue-600 shadow-lg"
                : "bg-gray-700 text-gray-500"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="flex items-center gap-1">
            {getModeIcon(generationMode)}
            <span className="capitalize">{generationMode} Mode</span>
          </span>
        </div>
      </div>
    </div>
  );
}