import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, MousePointer, Frown, Lightbulb, Sparkles } from 'lucide-react';

interface JourneyStage {
  name: string;
  description: string;
  actions: string[];
  emotions: string[];
  painPoints: string[];
  touchpoints: string[];
  opportunities: string[];
}

interface JourneyMapPreviewProps {
  data: {
    stages?: JourneyStage[];
    persona?: string;
  };
  title?: string;
}

export default function JourneyMapPreview({ data, title }: JourneyMapPreviewProps) {
  const { t } = useTranslation();
  const [currentStage, setCurrentStage] = useState(0);
  
  const stages = data?.stages || [];
  const persona = data?.persona || t('journeyMapPreview.defaultPersona');

  useEffect(() => {
    if (stages.length > 1) {
      const timer = setInterval(() => {
        setCurrentStage(prev => (prev + 1) % stages.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [stages.length]);

  const getCurrentStage = () => {
    if (!stages || stages.length === 0) return null;
    const stage = stages[currentStage];
    if (!stage) return null;
    return stage;
  };

  const stage = getCurrentStage();

  const getEmotionIcon = (emotion: string) => {
    const lowerEmotion = emotion.toLowerCase();
    if (lowerEmotion.includes('happy') || lowerEmotion.includes('excited') || lowerEmotion.includes('satisfied') || lowerEmotion.includes('pleased') || lowerEmotion.includes('confident')) {
      return '😊';
    }
    if (lowerEmotion.includes('sad') || lowerEmotion.includes('frustrated') || lowerEmotion.includes('skeptical')) {
      return '😟';
    }
    if (lowerEmotion.includes('curious') || lowerEmotion.includes('interest') || lowerEmotion.includes('hopeful')) {
      return '🤔';
    }
    if (lowerEmotion.includes('loyal') || lowerEmotion.includes('relieved')) {
      return '😌';
    }
    return '😐';
  };

  const getStageEmoji = (index: number) => {
    const emojis = ['👀', '🤔', '✅', '⭐', '❤️'];
    return emojis[index] || '🎯';
  };

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Map className="w-4 h-4 text-[#4588f5]" />
        {title || t('journeyMapPreview.title')}
      </h3>
      
      <div className="relative h-32 overflow-hidden">
        {stage ? (
          <div className="absolute inset-0 transition-opacity duration-500">
            <div className="bg-white border-2 border-[#4588f5] rounded-xl p-3 h-full shadow-sm">
              <div className="flex items-start gap-3 h-full flex-row">
                {/* Stage Icon */}
                <div className="w-12 h-12 bg-[#4588f5] rounded-full flex items-center justify-center shadow-md flex-shrink-0 text-2xl">
                  {getStageEmoji(currentStage)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col h-full">
                  <div className="text-sm font-bold text-gray-900 truncate mb-1 ltr:text-left rtl:text-right">
                    {stage.name}
                  </div>

                  <div className="text-[10px] text-gray-600 mb-2 line-clamp-2 ltr:text-left rtl:text-right">
                    {stage.description}
                  </div>

                  {/* Emotions */}
                  {stage.emotions && stage.emotions.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mb-2 flex-row">
                      {stage.emotions.slice(0, 3).map((emotion, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-100 text-gray-800 border-gray-300">
                          {getEmotionIcon(emotion)} {emotion}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-1 mt-auto">
                    <div className="flex items-center gap-1 flex-row">
                      <MousePointer className="w-3 h-3 text-[#4588f5]" />
                      <span className="text-[10px] text-gray-700">{stage.actions?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-row">
                      <Frown className="w-3 h-3 text-gray-500" />
                      <span className="text-[10px] text-gray-700">{stage.painPoints?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-row">
                      <Lightbulb className="w-3 h-3 text-[#4588f5]" />
                      <span className="text-[10px] text-gray-700">{stage.opportunities?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-gray-500 text-center">
              <Map className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              {t('journeyMapPreview.loading')}
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Dots */}
      {stages && stages.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {stages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                currentStage === index ? 'bg-[#4588f5] scale-125' : 'bg-gray-300'
              }`}
              onClick={() => setCurrentStage(index)}
            />
          ))}
        </div>
      )}

      {/* Persona Footer */}
      <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1 flex-row">
        <Sparkles className="w-3 h-3 text-[#4588f5]" />
        <span>{t('journeyMapPreview.personaJourney', { persona })}</span>
      </div>
    </div>
  );
}