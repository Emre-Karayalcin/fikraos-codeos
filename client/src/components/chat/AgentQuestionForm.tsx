import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AgentQuestionFormProps {
  onSubmit: (ideaName: string, launchLocation: string) => void;
  isRunning: boolean;
}

export function AgentQuestionForm({ onSubmit, isRunning }: AgentQuestionFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [ideaName, setIdeaName] = useState('');
  const [launchLocation, setLaunchLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ideaName.trim() && launchLocation.trim()) {
      onSubmit(ideaName.trim(), launchLocation.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className={`w-full max-w-md ${isRTL ? 'text-right' : 'text-left'}`}>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">{t('chat.cofounderName')}</CardTitle>
          <p className="text-muted-foreground">
            {t('chat.helpTurnIdea')}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ideaName" className="text-base font-medium">
                {t('chat.businessIdeaQuestion')}
              </Label>
              <Input
                id="ideaName"
                value={ideaName}
                onChange={(e) => setIdeaName(e.target.value)}
                placeholder={t('chat.ideaPlaceholder')}
                disabled={isRunning}
                data-testid="input-idea-name"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="launchLocation" className="text-base font-medium">
                {t('chat.launchFirstQuestion')}
              </Label>
              <Input
                id="launchLocation"
                value={launchLocation}
                onChange={(e) => setLaunchLocation(e.target.value)}
                placeholder={t('chat.launchFirstPlaceholder')}
                disabled={isRunning}
                data-testid="input-launch-location"
                className="h-12"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg"
              disabled={!ideaName.trim() || !launchLocation.trim() || isRunning}
              data-testid="button-start-agent"
            >
              {isRunning ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t('chat.generatingFramework')}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Rocket className="w-5 h-5" />
                  {t('chat.generateMyFramework')}
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t('chat.willGenerate')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}