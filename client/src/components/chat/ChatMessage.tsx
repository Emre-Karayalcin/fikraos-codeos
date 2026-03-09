import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { VoicePlayer } from "@/components/ui/voice-player";
import { GenerationStatus } from "./GenerationStatus";
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  text: string;
  createdAt: Date | string;
}

interface ChatMessageProps {
  message: Message;
  enableTyping?: boolean;
  completedAssets?: number;
}

export function ChatMessage({ message, enableTyping = false, completedAssets = 0 }: ChatMessageProps) {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const [displayedText, setDisplayedText] = useState(enableTyping && isAssistant ? '' : message.text);
  const [isTyping, setIsTyping] = useState(enableTyping && isAssistant);

  useEffect(() => {
    if (enableTyping && isAssistant && message.text) {
      setDisplayedText('');
      setIsTyping(true);
      
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < message.text.length) {
          setDisplayedText(message.text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typingInterval);
        }
      }, 15); // Faster typing speed

      return () => clearInterval(typingInterval);
    } else {
      setDisplayedText(message.text);
      setIsTyping(false);
    }
  }, [message.text, enableTyping, isAssistant]);
  
  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isUser && message.text) {
    return (
      <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`} data-testid={`message-${message.id}`}>
        <div className="max-w-2xl">
          <div className={`bg-primary text-primary-foreground rounded-2xl px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <p>{message.text}</p>
          </div>
          <div className={`text-xs text-muted-foreground mt-2 ${isRTL ? 'text-left' : 'text-right'}`}>
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  if (isAssistant) {
    // Check if this is a generation status message
    const isGenerationStatus = message.text && (
      message.text.includes('🔄 Generating') ||
      message.text.includes('✅ Generated') ||
      message.text.includes('🚀 Starting Business Framework Generation') ||
      message.text.includes('🚀 Generating Business Framework') ||
      message.text.includes('🚀 Building your business framework') ||
      message.text.includes('🚀 جاري إنشاء إطار العمل الخاص بك') ||
      message.text.includes('🎉 Complete!') ||
      message.text.includes('All 8 business assets generated')
    );

    if (isGenerationStatus) {
      return (
        <GenerationStatus 
          completedAssets={completedAssets}
          content={displayedText} 
          isActive={isTyping || enableTyping}
        />
      );
    }

    return (
      <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'} group`} data-testid={`message-${message.id}`}>
        <div className="max-w-3xl">
          <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{t('chat.cofounderName')}</span>
          </div>
          <div className={`bg-muted/40 border border-border rounded-2xl px-4 py-4 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {displayedText.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-foreground">
                {paragraph}
                {isTyping && index === displayedText.split('\n\n').length - 1 && (
                  <span className="animate-pulse">|</span>
                )}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
