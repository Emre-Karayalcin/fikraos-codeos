import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Target } from 'lucide-react';

interface SwotItem {
  text?: string;
  score?: number;
  impact?: string;
  details?: string;
  category?: string;
  mitigation?: string;
  size?: string;
  growth?: string;
  timeline?: string;
  probability?: string;
}

interface SwotData {
  strengths?: (string | SwotItem)[];
  weaknesses?: (string | SwotItem)[];
  opportunities?: (string | SwotItem)[];
  threats?: (string | SwotItem)[];
}

interface SwotAnalysisProps {
  data: SwotData;
}

export default function SwotAnalysis({ data }: SwotAnalysisProps) {
  const { t } = useTranslation();

  const SwotQuadrant = ({ 
    title, 
    items, 
    icon: Icon
  }: { 
    title: string; 
    items: (string | SwotItem)[]; 
    icon: any;
  }) => {
    
    const renderItem = (item: string | SwotItem, index: number) => {
      if (typeof item === 'string') {
        return (
          <li key={index} className="text-sm text-gray-700 flex items-start ltr:flex-row">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
            {item}
          </li>
        );
      }

      // Handle object format
      const text = item.text || item.size || t('common.notAvailable');
      const hasDetails = item.impact || item.details || item.score || item.growth || item.timeline || item.probability || item.mitigation;

      return (
        <li key={index} className="text-sm text-gray-700 mb-3">
          <div className="flex items-start flex-row">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
            <div className="flex-1 ltr:text-left rtl:text-right">
              <div className="font-medium">{text}</div>
              {hasDetails && (
                <div className="mt-1 text-xs text-gray-600 space-y-1">
                  {item.impact && <div><strong>{t('swot.impact')}:</strong> {item.impact}</div>}
                  {item.score && <div><strong>{t('swot.score')}:</strong> {item.score}/10</div>}
                  {item.growth && <div><strong>{t('swot.growth')}:</strong> {item.growth}</div>}
                  {item.timeline && <div><strong>{t('swot.timeline')}:</strong> {item.timeline}</div>}
                  {item.probability && <div><strong>{t('swot.probability')}:</strong> {item.probability}</div>}
                  {item.mitigation && <div><strong>{t('swot.mitigation')}:</strong> {item.mitigation}</div>}
                  {item.details && <div>{item.details}</div>}
                </div>
              )}
            </div>
          </div>
        </li>
      );
    };

    return (
      <div className="bg-white rounded-lg p-6 border-2 border-[#4588f5]">
        <div className="flex items-center mb-4 ltr:flex-row">
          <Icon className="w-5 h-5 text-[#4588f5] mr-2" />
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        </div>
        <ul className="space-y-2">
          {items?.length > 0 ? (
            items.map((item, index) => renderItem(item, index))
          ) : (
            <li className="text-sm text-gray-500 italic ltr:text-left rtl:text-right">{t('swot.noItems')}</li>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2 flex-row">
          <Target className="w-6 h-6 text-[#4588f5]" />
          {t('swot.title')}
        </h2>
        <p className="text-gray-600 ltr:text-left rtl:text-right">{t('swot.subtitle')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SwotQuadrant
          title={t('swot.strengths')}
          items={data.strengths || []}
          icon={Shield}
        />
        <SwotQuadrant
          title={t('swot.weaknesses')}
          items={data.weaknesses || []}
          icon={TrendingDown}
        />
        <SwotQuadrant
          title={t('swot.opportunities')}
          items={data.opportunities || []}
          icon={TrendingUp}
        />
        <SwotQuadrant
          title={t('swot.threats')}
          items={data.threats || []}
          icon={AlertTriangle}
        />
      </div>
    </div>
  );

}