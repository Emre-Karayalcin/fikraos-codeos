import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, MessageCircle, TrendingUp, PieChart } from 'lucide-react';

interface MarketingPlanData {
  targeting?: any;
  messaging?: any;
  channels?: any;
  funnel?: any;
  budget?: {
    total: string;
    breakdown: { channel: string; percentage: number; amount: string }[];
  };
  timeline?: any;
}

interface MarketingPreviewProps {
  data: MarketingPlanData;
}

export default function MarketingPreview({ data }: MarketingPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full p-3">
      <h3 className="text-sm font-bold text-gray-900 mb-3 ltr:text-left rtl:text-right">
        {t('marketingPreview.title')}
      </h3>
      <div className="space-y-2">
        {/* Funnel Preview */}
        <div className="grid grid-cols-4 gap-1">
          <div className="bg-orange-500 rounded px-1 py-1 text-center">
            <div className="text-xs font-medium text-white">{t('marketingPreview.awareness')}</div>
          </div>
          <div className="bg-orange-600 rounded px-1 py-1 text-center">
            <div className="text-xs font-medium text-white">{t('marketingPreview.consider')}</div>
          </div>
          <div className="bg-orange-700 rounded px-1 py-1 text-center">
            <div className="text-xs font-medium text-white">{t('marketingPreview.convert')}</div>
          </div>
          <div className="bg-orange-800 rounded px-1 py-1 text-center">
            <div className="text-xs font-medium text-white">{t('marketingPreview.retain')}</div>
          </div>
        </div>
        
        {/* Budget Preview */}
        <div className="bg-white border border-gray-200 rounded p-2 text-center">
          <div className="text-xs font-medium text-gray-700">{t('marketingPreview.totalBudget')}</div>
          <div className="text-sm font-bold text-gray-900">{data.budget?.total || t('common.na')}</div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-1">
          <div className="bg-gray-50 rounded p-1 text-center">
            <Target className="w-3 h-3 text-orange-600 mx-auto mb-1" />
            <div className="text-xs text-gray-600">{t('marketingPreview.targeting')}</div>
          </div>
          <div className="bg-gray-50 rounded p-1 text-center">
            <MessageCircle className="w-3 h-3 text-blue-600 mx-auto mb-1" />
            <div className="text-xs text-gray-600">{t('marketingPreview.messaging')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}