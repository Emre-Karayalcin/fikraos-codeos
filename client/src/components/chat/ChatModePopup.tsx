import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings, Zap, Brain, MessageCircle, Target, Lightbulb } from 'lucide-react';

export type ChatMode = 'creative' | 'analytical' | 'conversational' | 'strategic' | 'innovative';

interface ChatModeOption {
  id: ChatMode;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const chatModes: ChatModeOption[] = [
  {
    id: 'creative',
    name: 'Creative Mode',
    description: 'Generate innovative and out-of-the-box business ideas',
    icon: Lightbulb,
    color: 'text-yellow-500'
  },
  {
    id: 'analytical',
    name: 'Analytical Mode', 
    description: 'Focus on data-driven insights and market analysis',
    icon: Brain,
    color: 'text-blue-500'
  },
  {
    id: 'conversational',
    name: 'Conversational Mode',
    description: 'Natural dialogue with follow-up questions',
    icon: MessageCircle,
    color: 'text-green-500'
  },
  {
    id: 'strategic',
    name: 'Strategic Mode',
    description: 'Business strategy and planning focused approach',
    icon: Target,
    color: 'text-red-500'
  },
  {
    id: 'innovative',
    name: 'Innovation Mode',
    description: 'Rapid prototyping and MVP development focus',
    icon: Zap,
    color: 'text-purple-500'
  }
];

interface ChatModePopupProps {
  selectedMode: ChatMode;
  onModeSelect: (mode: ChatMode) => void;
}

export default function ChatModePopup({ selectedMode, onModeSelect }: ChatModePopupProps) {
  const selectedModeData = chatModes.find(mode => mode.id === selectedMode);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
          data-testid="button-chat-mode"
          title="Chat Mode Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0 border-gray-200 shadow-lg" 
        align="end"
        sideOffset={8}
      >
        <div className="p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Chat Mode</h3>
            <p className="text-xs text-gray-600">Choose how the AI assistant should respond</p>
          </div>
          
          <div className="space-y-2">
            {chatModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => onModeSelect(mode.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                    isSelected 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  data-testid={`mode-${mode.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${mode.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{mode.name}</span>
                        {isSelected && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{mode.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Settings className="w-3 h-3" />
              <span>Current: </span>
              <span className="font-medium text-gray-700">{selectedModeData?.name}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}