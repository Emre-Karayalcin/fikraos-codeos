import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, TrendingDown, TrendingUp, AlertTriangle, Star, Award, Target, Zap } from 'lucide-react';

interface SwotItem {
  text: string;
  impact: string;
  score: number;
  category: string;
  details?: string;
  mitigation?: string;
}

interface SwotData {
  strengths?: SwotItem[];
  weaknesses?: SwotItem[];
  opportunities?: Array<{ text: string; size: string; growth: string; probability: string; timeline: string }>;
  threats?: Array<{ text: string; probability: string; impact: string; timeline: string; mitigation: string }>;
  strategicInsights?: {
    overallScore: { strengths: number; weaknesses: number; opportunities: number; threats: number };
    keyRecommendations: string[];
    riskProfile: string;
    opportunityRating: string;
  };
}

interface SwotPreviewProps {
  data: SwotData;
  title?: string;
}

export default function SwotPreview({ data, title }: SwotPreviewProps) {
  const { t } = useTranslation();

  const quadrants = [
    {
      title: t('swot.strengths'),
      icon: Shield,
      data: data.strengths,
      borderColor: 'border-[#4588f5]',
      iconColor: 'text-[#4588f5]',
      count: (Array.isArray(data.strengths) && data.strengths.length) || 0,
      avgScore: (Array.isArray(data.strengths) && data.strengths.length > 0)
        ? (data.strengths.reduce((sum, item) => {
            const score = typeof item === 'object' && item.score ? item.score : 7;
            return sum + score;
          }, 0) / data.strengths.length).toFixed(1)
        : '0'
    },
    {
      title: t('swot.weaknesses'),
      icon: TrendingDown,
      data: data.weaknesses,
      borderColor: 'border-[#4588f5]',
      iconColor: 'text-[#4588f5]',
      count: (Array.isArray(data.weaknesses) && data.weaknesses.length) || 0,
      avgScore: (Array.isArray(data.weaknesses) && data.weaknesses.length > 0)
        ? (data.weaknesses.reduce((sum, item) => {
            const score = typeof item === 'object' && item.score ? item.score : 5;
            return sum + score;
          }, 0) / data.weaknesses.length).toFixed(1)
        : '0'
    },
    {
      title: t('swot.opportunities'),
      icon: TrendingUp,
      data: data.opportunities,
      borderColor: 'border-[#4588f5]',
      iconColor: 'text-[#4588f5]',
      count: (Array.isArray(data.opportunities) && data.opportunities.length) || 0,
      totalSize: (Array.isArray(data.opportunities) && data.opportunities.length > 0)
        ? `$${(data.opportunities.reduce((sum, opp) => {
            if (typeof opp === 'object' && opp.size) {
              return sum + parseFloat(opp.size.replace(/[^0-9.]/g, ''));
            }
            return sum;
          }, 0) / 1000).toFixed(1)}B`
        : '$0B'
    },
    {
      title: t('swot.threats'),
      icon: AlertTriangle,
      data: data.threats,
      borderColor: 'border-[#4588f5]',
      iconColor: 'text-[#4588f5]',
      count: (Array.isArray(data.threats) && data.threats.length) || 0,
      highRisk: (Array.isArray(data.threats) && data.threats.length > 0)
        ? data.threats.filter(t => typeof t === 'object' && t.probability === 'High' && t.impact === 'High').length
        : 0
    }
  ];

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Target className="w-4 h-4 text-[#4588f5]" />
        {title || t('swot.title')}
      </h3>
      
      <div className="grid grid-cols-2 gap-2 h-32">
        {quadrants.map((quadrant, index) => {
          const Icon = quadrant.icon;
          
          return (
            <div
              key={quadrant.title}
              className={`bg-white border-2 ${quadrant.borderColor} rounded-xl p-3 shadow-sm`}
            >
              <div className="text-center h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${quadrant.iconColor}`} />
                  <div className="text-xs font-bold text-gray-900">
                    {quadrant.title}
                  </div>
                </div>
                
                {/* Main Metric */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-xl font-bold text-gray-900 mb-1">
                    {quadrant.count}
                  </div>
                  <div className="text-xs text-gray-600">
                    {index < 2 
                      ? t('swot.items') 
                      : index === 2 
                        ? t('swot.opportunitiesLabel') 
                        : t('swot.threatsLabel')
                    }
                  </div>
                </div>
                
                {/* Sub Metric */}
                <div className="text-xs font-medium text-gray-700 flex items-center justify-center gap-1 flex-row">
                  {index < 2 && (
                    <>
                      <Star className="w-2 h-2" />
                      {t('swot.avgScore', { score: quadrant.avgScore })}
                    </>
                  )}
                  {index === 2 && (
                    <>
                      <Award className="w-2 h-2" />
                      {quadrant.totalSize} {t('swot.market')}
                    </>
                  )}
                  {index === 3 && (
                    <>
                      <Zap className="w-2 h-2" />
                      {t('swot.highRisk', { count: quadrant.highRisk })}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Strategic Insights */}
      {data.strategicInsights && (
        <div className="mt-2 bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 flex-row">
              <Target className="w-3 h-3 text-[#4588f5]" />
              <span className="font-medium text-slate-700">{t('swot.strategicProfile')}</span>
            </div>
            <div className="flex items-center gap-2 flex-row">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {t('swot.risk')}: {data.strategicInsights.riskProfile}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {t('swot.opportunity')}: {data.strategicInsights.opportunityRating}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}