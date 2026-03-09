import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle, Loader2, Eye, Code } from 'lucide-react';
import { VoicePlayer } from '@/components/ui/voice-player';
import { AgentMessage as AgentMessageType } from '@/hooks/useAgentChat';
import { useTranslation } from 'react-i18next';
import { loadVisualization, VisualizationFallback } from '@/visuals';

interface AgentMessageProps {
  message: AgentMessageType;
  isLatest?: boolean;
}

export function AgentMessage({ message, isLatest }: AgentMessageProps) {
  const { t } = useTranslation();
  const [showVisualization, setShowVisualization] = useState(false);
  const [VisualizationComponent, setVisualizationComponent] = useState<any>(null);

  // Load visualization component for asset messages
  useEffect(() => {
    if (message.type === 'asset' && message.data?.assetType) {
      loadVisualization(message.data.assetType).then(component => {
        setVisualizationComponent(() => component);
      }).catch(error => {
        console.error('Failed to load visualization:', error);
        setVisualizationComponent(null);
      });
    }
  }, [message]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // User message
  if (message.type === 'user') {
    return (
      <div className="flex justify-end" data-testid={`message-${message.id}`}>
        <div className="max-w-3xl">
          <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3">
            <p className="text-sm">{message.content}</p>
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // Status message (generating banners)
  if (message.type === 'status') {
    const isCompleted = message.data?.completed;
    const isGenerating = !isCompleted && message.content.includes('🔄');

    return (
      <div className="flex justify-center my-4" data-testid={`status-${message.id}`}>
        <Card className={`max-w-md ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : isGenerating ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-blue-600" />
              )}
              <span className={`text-sm font-medium ${isCompleted ? 'text-green-800' : 'text-blue-800'}`}>
                {message.content}
              </span>
              {message.data?.progress && (
                <span className="text-xs text-muted-foreground">
                  ({message.data.progress}/{message.data.total})
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Asset message (generated business asset)
  if (message.type === 'asset') {
    return (
      <div className="flex justify-start group" data-testid={`message-${message.id}`}>
        <div className="max-w-4xl w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{t('chat.cofounderName')}</span>
          </div>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-lg">{message.data?.name}</h3>
              </div>
              
              <p className="text-muted-foreground mb-4">{message.content}</p>
              
              {message.data?.data && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVisualization(!showVisualization)}
                    data-testid={`button-view-${message.data.assetType}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showVisualization ? 'Hide' : 'View'} Visualization
                  </Button>
                </div>
              )}
              
              {showVisualization && message.data?.data && (
                <div className="mt-4 border-t pt-4">
                  {VisualizationComponent ? (
                    <VisualizationComponent 
                      data={message.data.data} 
                      projectId={message.data.projectId}
                      assetId={message.data.assetId || message.data.id}
                    />
                  ) : (
                    <VisualizationFallback 
                      data={message.data.data} 
                      title={message.data.name} 
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="text-xs text-muted-foreground mt-2">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message (regular AI responses)
  return (
    <div className="flex justify-start group" data-testid={`message-${message.id}`}>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">{t('chat.cofounderName')}</span>
          <VoicePlayer text={message.content} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="bg-muted/40 border border-border rounded-2xl px-4 py-4">
          {message.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="text-foreground">{paragraph}</p>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}