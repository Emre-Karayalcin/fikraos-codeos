import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Mic, Send, Search, Lightbulb } from "lucide-react";

export type InputMode = 'develop' | 'research' | 'launch';

interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  onResearchQuery?: (query: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  mode?: InputMode;
  onModeChange?: (mode: InputMode) => void;
  showModeSwitch?: boolean;
}

export function ChatInput({ 
  onSendMessage, 
  onResearchQuery, 
  isDisabled = false, 
  placeholder, 
  mode = 'develop', 
  onModeChange, 
  showModeSwitch = true 
}: ChatInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    return mode === 'research' 
      ? t('chat.researchPlaceholder')
      : t('chat.typeMessage');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isDisabled) return;
    
    if (mode === 'research' && onResearchQuery) {
      onResearchQuery(message.trim());
    } else if (onSendMessage) {
      onSendMessage(message.trim());
    }
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 sm:p-6 border-t border-border safe-area-bottom">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={isDisabled}
            className="w-full bg-input-bg border border-input-border rounded-xl ltr:pl-4 ltr:pr-20 ltr:sm:pr-24 rtl:px-4 rtl:pl-20 rtl:sm:pl-24 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 text-text-primary placeholder-text-muted min-h-[60px] sm:min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base mobile-chat-input ltr:text-left rtl:text-right"
            rows={2}
            data-testid="input-chat-message"
          />
          
          {/* Action buttons */}
          <div className="absolute bottom-2 sm:bottom-3 ltr:right-2 ltr:sm:right-3 rtl:left-2 rtl:sm:left-3 flex gap-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground p-1.5 h-auto touch-manipulation sm:p-1"
              data-testid="button-attach"
              aria-label={t('chat.attach')}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground p-1.5 h-auto touch-manipulation sm:p-1"
              data-testid="button-voice"
              aria-label={t('chat.voice')}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 transition-all disabled:opacity-50 touch-manipulation min-w-[40px] min-h-[40px]"
              disabled={!message.trim() || isDisabled}
              data-testid="button-send"
              aria-label={t('chat.send')}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Mode switcher buttons */}
        {showModeSwitch && (
          <div className="flex gap-1 sm:gap-2 mt-2 ltr:justify-start rtl:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onModeChange?.('develop')}
              className={`px-3 py-2 h-auto touch-manipulation rounded-lg flex items-center gap-2 transition-all duration-300 min-w-[80px] ${
                mode === 'develop' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="mode-develop"
            >
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">{t('chat.modeDevelop')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onModeChange?.('research')}
              className={`px-3 py-2 h-auto touch-manipulation rounded-lg flex items-center gap-2 transition-all duration-300 min-w-[80px] ${
                mode === 'research' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="mode-research"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">{t('chat.modeResearch')}</span>
            </Button>
          </div>
        )}
        
        {message.trim() && !isDisabled && (
          <p className="text-xs text-text-muted mt-2 ltr:text-right rtl:text-left mobile-hidden">
            {t('chat.sendHint')}
          </p>
        )}
        {isDisabled && (
          <p className="text-xs text-text-muted mt-2 ltr:text-right rtl:text-left">
            {t('chat.generating')}
          </p>
        )}
      </form>
    </div>
  );
}
