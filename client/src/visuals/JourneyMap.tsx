import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight, 
  User, 
  Search, 
  ShoppingCart, 
  Heart, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageCircle,
  Star,
  Frown,
  Meh,
  Smile
} from 'lucide-react';

// Helper function to render complex objects in a readable format
const renderComplexItem = (item: any): string => {
  if (typeof item === 'string') return item;
  
  if (typeof item === 'object' && item !== null) {
    if (item.text) return item.text;
    if (item.description) return item.description;
    if (item.name) return item.name;
    if (item.title) return item.title;
    
    const entries = Object.entries(item).filter(([_, value]) => value != null);
    if (entries.length <= 3) {
      return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
    }
  }
  
  return String(item);
};

interface JourneyStage {
  name: string | any;
  description?: string | any;
  touchpoints?: (string | any)[];
  painPoints?: (string | any)[];
  opportunities?: (string | any)[];
  emotions?: (string | any)[];
  duration?: string | any;
}

interface JourneyMapData {
  persona?: string | any;
  goal?: string | any;
  stages?: JourneyStage[];
  overview?: string | any;
  insights?: (string | any)[];
}

interface JourneyMapProps {
  data: JourneyMapData;
}

export default function JourneyMap({ data }: JourneyMapProps) {
  const { t } = useTranslation();
  const journeyData: JourneyMapData = (data as any)?.journeyMap || (data as any)?.journey || data || {};
  const stages = journeyData.stages || [];

  const getStageIcon = (index: number) => {
    const icons = [User, Search, Target, ShoppingCart, Heart, CheckCircle];
    return icons[index % icons.length];
  };

  const getEmotionIcon = (emotion: string) => {
    const lower = emotion.toLowerCase();
    if (lower.includes('frustrated') || lower.includes('angry') || lower.includes('confused')) {
      return Frown;
    }
    if (lower.includes('satisfied') || lower.includes('happy') || lower.includes('excited')) {
      return Smile;
    }
    return Meh;
  };

  const getEmotionColor = (emotion: string) => {
    const lower = emotion.toLowerCase();
    if (lower.includes('frustrated') || lower.includes('angry') || lower.includes('confused')) {
      return 'text-red-600 bg-red-50';
    }
    if (lower.includes('satisfied') || lower.includes('happy') || lower.includes('excited')) {
      return 'text-green-600 bg-green-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 ltr:text-left rtl:text-right">{t('journeyMap.title')}</h2>
        <p className="text-gray-600 ltr:text-left rtl:text-right">{t('journeyMap.subtitle')}</p>
        
        {journeyData.persona && (
          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-[#4588f5]">
            <div className="flex items-center flex-row">
              <User className="w-5 h-5 text-[#4588f5] mr-2" />
              <span className="font-medium text-gray-900">{t('journeyMap.targetPersona')}: {journeyData.persona}</span>
            </div>
            {journeyData.goal && (
              <div className="flex items-center mt-2 flex-row">
                <Target className="w-4 h-4 text-[#4588f5] mr-2" />
                <span className="text-gray-700 text-sm">{t('journeyMap.goal')}: {journeyData.goal}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Journey Stages */}
      <div className="space-y-6">
        {stages.map((stage, index) => {
          const StageIcon = getStageIcon(index);
          return (
            <div key={index} className="relative">
              {/* Connection Line */}
              {index < stages.length - 1 && (
                <div className="absolute ltr:left-6 rtl:right-6 top-12 w-0.5 h-20 bg-[#4588f5] z-0"></div>
              )}
              
              <div className="bg-white rounded-lg border-2 border-[#4588f5] p-6 relative z-10 shadow-sm">
                <div className="flex items-start gap-4 flex-row">
                  {/* Stage Icon */}
                  <div className="w-12 h-12 bg-[#4588f5] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <StageIcon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 ltr:text-left rtl:text-right">{stage.name}</h3>
                      {stage.duration && (
                        <div className="flex items-center text-sm text-gray-500 flex-row">
                          <Clock className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                          {stage.duration}
                        </div>
                      )}
                    </div>
                    
                    {stage.description && (
                      <p className="text-gray-700 mb-4 ltr:text-left rtl:text-right">{stage.description}</p>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                      {/* Touchpoints */}
                      {stage.touchpoints && stage.touchpoints.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center ltr:flex-row">
                            <MessageCircle className="w-4 h-4 text-[#4588f5] mr-2" />
                            {t('journeyMap.touchpoints')}
                          </h4>
                          <ul className="space-y-1">
                            {stage.touchpoints.map((point, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start ltr:flex-row">
                                <span className="w-1.5 h-1.5 bg-[#4588f5] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {renderComplexItem(point)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Pain Points */}
                      {stage.painPoints && stage.painPoints.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center ltr:flex-row">
                            <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                            {t('journeyMap.painPoints')}
                          </h4>
                          <ul className="space-y-1">
                            {stage.painPoints.map((pain, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start ltr:flex-row">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {renderComplexItem(pain)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Opportunities */}
                      {stage.opportunities && stage.opportunities.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center ltr:flex-row">
                            <Star className="w-4 h-4 text-[#4588f5] mr-2" />
                            {t('journeyMap.opportunities')}
                          </h4>
                          <ul className="space-y-1">
                            {stage.opportunities.map((opp, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start ltr:flex-row">
                                <span className="w-1.5 h-1.5 bg-[#4588f5] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {renderComplexItem(opp)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Emotions */}
                      {stage.emotions && stage.emotions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center ltr:flex-row">
                            <Heart className="w-4 h-4 text-[#4588f5] mr-2" />
                            {t('journeyMap.emotions')}
                          </h4>
                          <div className="space-y-1">
                            {stage.emotions.map((emotion, i) => {
                              const EmotionIcon = getEmotionIcon(emotion);
                              const colorClass = getEmotionColor(emotion);
                              return (
                                <div key={i} className={`text-xs px-2 py-1 rounded-full flex items-center ltr:flex-row ${colorClass}`}>
                                  <EmotionIcon className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                                  {renderComplexItem(emotion)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      {journeyData.insights && journeyData.insights.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border-2 border-[#4588f5] p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center flex-row">
            <Target className="w-5 h-5 text-[#4588f5] mr-2" />
            {t('journeyMap.keyInsights')}
          </h3>
          <ul className="space-y-2">
            {journeyData.insights.map((insight, index) => (
              <li key={index} className="text-gray-700 flex items-start ltr:flex-row">
                <span className="w-1.5 h-1.5 bg-[#4588f5] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                {renderComplexItem(insight)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {journeyData.overview && (
        <div className="mt-6 bg-white rounded-lg border-2 border-[#4588f5] p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 ltr:text-left rtl:text-right">{t('journeyMap.overview')}</h3>
          <p className="text-gray-700 ltr:text-left rtl:text-right">{journeyData.overview}</p>
        </div>
      )}
    </div>
  );
}