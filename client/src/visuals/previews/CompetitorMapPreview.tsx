import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertCircle, Target, Award, TrendingUp, Lightbulb } from 'lucide-react';

interface Competitor {
  name: string | any;
  description?: string | any;
  marketPosition?: string | any;
  strengths?: (string | any)[];
  weaknesses?: (string | any)[];
  marketShare?: string | any;
  pricing?: string | any;
  targetAudience?: string | any;
  keyProducts?: (string | any)[];
  threats?: (string | any)[];
  opportunities?: (string | any)[];
  competitiveAdvantage?: (string | any)[];
}

interface CompetitorMapPreviewProps {
  data: {
    overview?: string;
    competitors?: Competitor[];
    marketGaps?: string[];
    competitiveAdvantages?: string[];
    threats?: string[];
    recommendations?: string[];
  };
  title?: string;
}

export default function CompetitorMapPreview({ data, title }: CompetitorMapPreviewProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState(0);
  
  const competitors = data?.competitors || [];
  const marketGaps = data?.marketGaps || [];
  const competitiveAdvantages = data?.competitiveAdvantages || [];
  const threats = data?.threats || [];
  const recommendations = data?.recommendations || [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentView(prev => (prev + 1) % 3); // 3 views: Competitors, Insights, Strategy
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const [currentCompetitor, setCurrentCompetitor] = useState(0);

  useEffect(() => {
    if (currentView === 0 && competitors.length > 1) {
      const timer = setInterval(() => {
        setCurrentCompetitor(prev => (prev + 1) % competitors.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [currentView, competitors.length]);

  const parseMarketShare = (share: string) => {
    const match = share?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const views = [
    // View 1: Competitor Detail
    {
      icon: Target,
      title: t('competitorMapPreview.competitors'),
      content: competitors.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 flex-row">
            <div className="w-10 h-10 bg-[#4588f5] rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate ltr:text-left rtl:text-right">
                {competitors[currentCompetitor]?.name}
              </div>
              <div className="text-[10px] text-gray-600 mb-1 ltr:text-left rtl:text-right">
                {competitors[currentCompetitor]?.marketPosition}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-row">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
              {competitors[currentCompetitor]?.pricing}
            </span>
          </div>

          {/* Market Share Bar */}
          {competitors[currentCompetitor]?.marketShare && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-gray-600 mb-1">
                <span className="ltr:text-left rtl:text-right">{t('competitorMapPreview.marketShare')}</span>
                <span className="font-semibold text-[#4588f5]">
                  {competitors[currentCompetitor]?.marketShare}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-[#4588f5] rounded-full transition-all duration-500"
                  style={{ width: `${parseMarketShare(competitors[currentCompetitor]?.marketShare)}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white/50 rounded p-1.5 flex items-center gap-1 flex-row">
              <Shield className="w-3 h-3 text-[#4588f5] flex-shrink-0" />
              <span className="text-xs text-gray-700 truncate ltr:text-left rtl:text-right">
                {t('competitorMapPreview.strengthsCount', { count: competitors[currentCompetitor]?.strengths?.length || 0 })}
              </span>
            </div>
            <div className="bg-white/50 rounded p-1.5 flex items-center gap-1 flex-row">
              <AlertCircle className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-700 truncate ltr:text-left rtl:text-right">
                {t('competitorMapPreview.weaknessesCount', { count: competitors[currentCompetitor]?.weaknesses?.length || 0 })}
              </span>
            </div>
          </div>

          {/* Competitor Navigation Dots */}
          {competitors.length > 1 && (
            <div className="flex justify-center gap-1 pt-1">
              {competitors.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    currentCompetitor === index ? 'bg-[#4588f5] scale-125' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-xs text-gray-500 text-center">
            <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            {t('competitorMapPreview.noData')}
          </div>
        </div>
      )
    },
    // View 2: Market Insights
    {
      icon: TrendingUp,
      title: t('competitorMapPreview.marketInsights'),
      content: (
        <div className="space-y-2">
          <div className="bg-white/70 rounded-lg p-2">
            <div className="text-xs font-semibold text-gray-900 mb-1 ltr:text-left rtl:text-right">
              {t('competitorMapPreview.marketGaps')}
            </div>
            <div className="text-[10px] text-gray-700 ltr:text-left rtl:text-right">
              {marketGaps.length > 0 
                ? t('competitorMapPreview.opportunitiesIdentified', { count: marketGaps.length })
                : t('competitorMapPreview.noGapsIdentified')
              }
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-2">
            <div className="text-xs font-semibold text-gray-900 mb-1 ltr:text-left rtl:text-right">
              {t('competitorMapPreview.competitiveThreats')}
            </div>
            <div className="text-[10px] text-gray-700 ltr:text-left rtl:text-right">
              {threats.length > 0 
                ? t('competitorMapPreview.threatsToMonitor', { count: threats.length })
                : t('competitorMapPreview.noThreatsIdentified')
              }
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white/50 rounded p-1.5">
              <div className="text-[10px] text-gray-600 mb-0.5 ltr:text-left rtl:text-right">
                {t('competitorMapPreview.competitors')}
              </div>
              <div className="text-sm text-gray-900 font-bold">
                {competitors.length}
              </div>
            </div>
            <div className="bg-white/50 rounded p-1.5">
              <div className="text-[10px] text-gray-600 mb-0.5 ltr:text-left rtl:text-right">
                {t('competitorMapPreview.advantages')}
              </div>
              <div className="text-sm text-gray-900 font-bold">
                {competitiveAdvantages.length}
              </div>
            </div>
          </div>
        </div>
      )
    },
    // View 3: Strategy
    {
      icon: Lightbulb,
      title: t('competitorMapPreview.strategy'),
      content: (
        <div className="space-y-2">
          <div className="bg-white/70 rounded-lg p-2">
            <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1 flex-row">
              <Shield className="w-3 h-3 text-[#4588f5]" />
              {t('competitorMapPreview.yourAdvantages')}
            </div>
            <div className="text-[10px] text-gray-700 ltr:text-left rtl:text-right">
              {competitiveAdvantages.length > 0 
                ? competitiveAdvantages[0]
                : t('competitorMapPreview.noAdvantagesListed')}
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-2">
            <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1 flex-row">
              <Lightbulb className="w-3 h-3 text-[#4588f5]" />
              {t('competitorMapPreview.topRecommendation')}
            </div>
            <div className="text-[10px] text-gray-700 line-clamp-2 ltr:text-left rtl:text-right">
              {recommendations.length > 0 
                ? recommendations[0]
                : t('competitorMapPreview.noRecommendationsAvailable')}
            </div>
          </div>

          <div className="text-[10px] text-gray-600 text-center">
            {recommendations.length > 1 && t('competitorMapPreview.moreStrategies', { count: recommendations.length - 1 })}
          </div>
        </div>
      )
    }
  ];

  const currentViewData = views[currentView];
  const ViewIcon = currentViewData.icon;

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Target className="w-4 h-4 text-[#4588f5]" />
        {title || t('competitorMapPreview.title')}
      </h3>
      
      <div className="h-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-white rounded-xl border-2 border-[#4588f5] p-3 shadow-sm transition-all duration-500">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-row">
            <ViewIcon className="w-4 h-4 text-[#4588f5]" />
            <div className="text-sm font-bold text-gray-900 ltr:text-left rtl:text-right">
              {currentViewData.title}
            </div>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto max-h-20">
            {currentViewData.content}
          </div>
        </div>
      </div>

      {/* View Navigation */}
      <div className="mt-2 flex justify-center gap-2">
        {views.map((view, index) => {
          const Icon = view.icon;
          return (
            <button
              key={index}
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                currentView === index 
                  ? 'bg-[#4588f5] text-white scale-110' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              onClick={() => setCurrentView(index)}
            >
              <Icon className="w-3 h-3" />
            </button>
          );
        })}
      </div>

      {/* Progress indicator */}
      <div className="mt-2 flex justify-center">
        <div className="flex gap-1">
          {views.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                currentView === i ? 'bg-[#4588f5] scale-125' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}