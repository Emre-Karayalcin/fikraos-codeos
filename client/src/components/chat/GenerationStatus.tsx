import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface GenerationStatusProps {
  content: string;
  isActive?: boolean;
  completedAssets?: number;
}

export function GenerationStatus({ content, isActive = false, completedAssets = 0 }: GenerationStatusProps) {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // ✅ Translated asset names
  const assets = [
    t('assets.assets.leanCanvas'),
    t('assets.assets.swot'),
    t('assets.assets.personas'),
    t('assets.assets.userStories'),
    t('assets.assets.interviewQuestions'),
    t('assets.assets.journey'),
    t('assets.assets.marketing'),
    t('assets.assets.brandWheel'),
    t('assets.assets.brandIdentity'),
    t('assets.assets.competitors'),
    t('assets.assets.tamSamSom'),
    t('assets.assets.teamRoles'),
    t('assets.assets.pitch')
  ];

  // Map asset names to steps (support multiple name variations)
  const assetMap: { [key: string]: number } = {
    'Lean Canvas': 0,
    'SWOT Analysis': 1, 'SWOT': 1,
    'User Personas': 2, 'Personas': 2,
    'User Stories': 3, 'Stories': 3,
    'Interview Questions': 4, 'Interviews': 4,
    'Customer Journey Map': 5, 'Journey': 5, 'Journey Map': 5,
    'Marketing Plan': 6, 'Marketing': 6,
    'Brand Wheel': 7,
    'Brand Identity': 8,
    'Competitor Analysis': 9, 'Competitors': 9, 'Competitor Map': 9,
    'TAM/SAM/SOM Analysis': 10, 'TAM/SAM/SOM': 10,
    'Team Roles': 11,
    'Pitch Deck Outline': 12, 'Pitch': 12, 'Pitch Outline': 12,
  };

  useEffect(() => {
    setCurrentStep(completedAssets);
  }, [completedAssets]);
  
  // Parse content to determine current step with real-time updates
  useEffect(() => {
    // Check if generation is complete
    if (content.includes('🎉 Complete!') ||
        content.includes('🎉 اكتمل!') ||
        content.includes('All business assets generated successfully') ||
        content.includes('All 8 business assets generated')) {
      setCurrentStep(assets.length);
      setIsCompleted(true);
      return;
    }

    // Parse the new checklist format
    const lines = content.split('\n');
    let completedCount = 0;
    let currentlyGenerating = -1;
    const checkmarksFound: number[] = [];

    lines.forEach(line => {
      // Check for completed assets (✅)
      if (line.includes('✅')) {
        const assetName = line.replace('✅', '').trim();
        const step = assetMap[assetName];
        if (step !== undefined) {
          checkmarksFound.push(step);
          if (step >= completedCount) {
            completedCount = step + 1;
          }
        }
      }
      // Check for currently generating asset (🔄)
      if (line.includes('🔄')) {
        const assetName = line.replace('🔄', '').replace('...', '').trim();
        const step = assetMap[assetName];
        if (step !== undefined) {
          currentlyGenerating = step;
        }
      }
    });

    // If all assets have checkmarks, mark as complete
    if (checkmarksFound.length >= assets.length && currentlyGenerating === -1) {
      setIsCompleted(true);
      return;
    }

    // If no currently generating but all steps completed
    if (currentlyGenerating === -1 && completedCount >= assets.length) {
      setIsCompleted(true);
      return;
    }

    setIsCompleted(false);
  }, [content]);

  const isGenerating = content.includes('🔄') && !isCompleted;

  return (
    <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'} mb-4`} data-testid="generation-status">
      <Card className="w-full max-w-md bg-gray-800 border-gray-600 shadow-lg">
        <CardContent className={`p-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : isGenerating ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="text-white font-medium">
              {isCompleted ? t('chat.frameworkComplete') : t('chat.creatingFramework')}
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-gray-400 text-sm mb-4">
            {isCompleted
              ? t('chat.allAssetsGenerated')
              : t('chat.generatingAssets')
            }
          </p>

          {/* Asset Chain */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {assets.map((asset, index) => (
              <div key={index} className="flex items-center">
                <span
                  className={
                    isCompleted
                      ? 'text-blue-300'
                      : index === currentStep && isGenerating
                      ? 'text-blue-300 animate-pulse'
                      : index < currentStep
                      ? 'text-blue-300'
                      : 'text-gray-500'
                  }
                >
                  {asset}
                </span>
                {index < assets.length - 1 && (
                  <span className="text-gray-600 mx-2">{isRTL ? '←' : '→'}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}