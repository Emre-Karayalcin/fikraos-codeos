import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { User, Bot, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
  onCopy?: (content: string) => void;
  onFeedback?: (isPositive: boolean) => void;
}

export function ChatMessage({ 
  role, 
  content, 
  timestamp, 
  isStreaming = false,
  onCopy,
  onFeedback 
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex gap-3 group animate-in slide-in-from-bottom-2 duration-300",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
        isUser 
          ? "bg-gradient-to-r from-blue-500 to-blue-500" 
          : "bg-gradient-to-r from-purple-500 to-pink-500"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <Card className={cn(
          "border transition-all duration-200",
          isUser 
            ? "bg-gradient-to-r from-blue-500/10 to-blue-500/10 border-blue-500/20 ml-auto" 
            : "bg-gray-800/50 border-gray-700 backdrop-blur-sm"
        )}>
          <CardContent className="p-3">
            <div className="prose prose-sm prose-invert max-w-none">
              <p className={cn(
                "text-sm leading-relaxed m-0",
                isUser ? "text-gray-100" : "text-gray-200"
              )}>
                {content}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse" />
                )}
              </p>
            </div>

            {/* Timestamp */}
            {timestamp && (
              <div className={cn(
                "text-xs text-gray-500 mt-2",
                isUser ? "text-right" : "text-left"
              )}>
                {timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons (only for assistant messages) */}
        {!isUser && !isStreaming && (
          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onCopy && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
                onClick={() => onCopy(content)}
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
            
            {onFeedback && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-500 hover:text-green-400"
                  onClick={() => onFeedback(true)}
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                  onClick={() => onFeedback(false)}
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}