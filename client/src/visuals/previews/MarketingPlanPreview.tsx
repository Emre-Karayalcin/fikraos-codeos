import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Users, DollarSign, TrendingUp, Calendar, Megaphone, BarChart3, Radio, Zap } from 'lucide-react';

interface MarketingPlanData {
  targeting?: {
    primaryAudience: string | any;
    demographics: (string | any)[];
    psychographics: (string | any)[];
  };
  messaging?: {
    valueProposition: string | any;
    keyMessages: (string | any)[];
    brandVoice: string | any;
  };
  channels?: {
    digital: (string | any)[];
    traditional: (string | any)[];
    budget: string;
  };
  funnel?: {
    awareness: (string | any)[];
    consideration: (string | any)[];
    conversion: (string | any)[];
    retention: (string | any)[];
  };
  budget?: {
    total: string;
    breakdown: { channel: string; percentage: number; amount: string }[];
  };
  timeline?: {
    phase: string;
    duration: string;
    activities: (string | any)[];
  }[];
}

interface MarketingPlanPreviewProps {
  data: MarketingPlanData;
  title?: string;
}

export default function MarketingPlanPreview({ data, title }: MarketingPlanPreviewProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentView(prev => (prev + 1) % 5);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const views = [
    {
      title: t('marketingPlan.targetAudience'),
      icon: Users,
      content: (
        <div className="space-y-2">
          <div className="bg-white/70 rounded-lg p-2">
            <div className="text-xs font-semibold text-gray-900 mb-1 ltr:text-left rtl:text-right">
              {t('marketingPlan.primaryAudience')}
            </div>
            <div className="text-xs text-gray-700 line-clamp-2 ltr:text-left rtl:text-right">
              {data.targeting?.primaryAudience || t('marketingPlan.notDefined')}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-white/50 rounded p-1.5">
              <div className="text-[10px] text-gray-600 mb-0.5 ltr:text-left rtl:text-right">
                {t('marketingPlan.demographics')}
              </div>
              <div className="text-xs text-gray-900 font-medium ltr:text-left rtl:text-right">
                {t('marketingPlan.traitsCount', { count: data.targeting?.demographics?.length || 0 })}
              </div>
            </div>
            <div className="bg-white/50 rounded p-1.5">
              <div className="text-[10px] text-gray-600 mb-0.5 ltr:text-left rtl:text-right">
                {t('marketingPlan.psychographics')}
              </div>
              <div className="text-xs text-gray-900 font-medium ltr:text-left rtl:text-right">
                {t('marketingPlan.traitsCount', { count: data.targeting?.psychographics?.length || 0 })}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('marketingPlan.messaging'),
      icon: Megaphone,
      content: (
        <div className="space-y-2">
          <div className="bg-white/70 rounded-lg p-2">
            <div className="text-xs font-semibold text-gray-900 mb-1 ltr:text-left rtl:text-right">
              {t('marketingPlan.valueProposition')}
            </div>
            <div className="text-xs text-gray-700 line-clamp-2 ltr:text-left rtl:text-right">
              {data.messaging?.valueProposition || t('marketingPlan.notDefined')}
            </div>
          </div>
          <div className="bg-white/50 rounded p-1.5">
            <div className="text-xs text-gray-700 font-medium mb-1 ltr:text-left rtl:text-right">
              {t('marketingPlan.brandVoice')}
            </div>
            <div className="text-xs text-[#4588f5] ltr:text-left rtl:text-right">
              {data.messaging?.brandVoice || t('marketingPlan.notDefined')}
            </div>
          </div>
          <div className="text-[10px] text-gray-600 ltr:text-left rtl:text-right">
            {t('marketingPlan.keyMessages', { count: data.messaging?.keyMessages?.length || 0 })}
          </div>
        </div>
      )
    },
    {
      title: t('marketingPlan.channels'),
      icon: Radio,
      content: (
        <div className="space-y-2">
          <div className="bg-white/70 rounded-lg p-2">
            <div className="text-xs font-semibold text-gray-900 mb-1 ltr:text-left rtl:text-right">
              {t('marketingPlan.marketingChannels')}
            </div>
            <div className="text-xs text-gray-600 ltr:text-left rtl:text-right">
              {t('marketingPlan.budget')}: {data.channels?.budget || t('marketingPlan.notSpecified')}
            </div>
          </div>
          <div className="space-y-1">
            <div className="bg-white/50 rounded p-1.5">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-700 font-medium ltr:text-left rtl:text-right">
                  {t('marketingPlan.digital')}
                </div>
                <div className="text-xs text-[#4588f5] font-bold">
                  {data.channels?.digital?.length || 0}
                </div>
              </div>
              <div className="text-[10px] text-gray-600 mt-0.5 line-clamp-1 ltr:text-left rtl:text-right">
                {data.channels?.digital?.[0] || t('marketingPlan.notSpecified')}
              </div>
            </div>
            <div className="bg-white/50 rounded p-1.5">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-700 font-medium ltr:text-left rtl:text-right">
                  {t('marketingPlan.traditional')}
                </div>
                <div className="text-xs text-[#4588f5] font-bold">
                  {data.channels?.traditional?.length || 0}
                </div>
              </div>
              <div className="text-[10px] text-gray-600 mt-0.5 line-clamp-1 ltr:text-left rtl:text-right">
                {data.channels?.traditional?.[0] || t('marketingPlan.notSpecified')}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('marketingPlan.funnel'),
      icon: Zap,
      content: (
        <div className="space-y-1">
          <div className="bg-white/70 rounded-lg p-2 mb-1">
            <div className="text-xs font-semibold text-gray-900 ltr:text-left rtl:text-right">
              {t('marketingPlan.customerJourney')}
            </div>
          </div>
          {[
            { label: t('marketingPlan.awareness'), data: data.funnel?.awareness },
            { label: t('marketingPlan.consideration'), data: data.funnel?.consideration },
            { label: t('marketingPlan.conversion'), data: data.funnel?.conversion },
            { label: t('marketingPlan.retention'), data: data.funnel?.retention }
          ].map((stage, index) => (
            <div key={index} className="bg-white/50 rounded p-1.5 flex justify-between items-center">
              <div className="text-xs text-gray-700 font-medium ltr:text-left rtl:text-right">{stage.label}</div>
              <div className="text-xs text-[#4588f5] font-bold">
                {t('marketingPlan.tactics', { count: stage.data?.length || 0 })}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: t('marketingPlan.budgetTimeline'),
      icon: DollarSign,
      content: (
        <div className="space-y-2">
          <div className="bg-white/70 rounded-lg p-2 text-center">
            <div className="text-xs font-semibold text-gray-900 mb-1">{t('marketingPlan.totalBudget')}</div>
            <div className="text-xl font-bold text-[#4588f5]">
              {data.budget?.total || '$0'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-white/50 rounded p-1.5">
              <div className="text-[10px] text-gray-600 mb-0.5 ltr:text-left rtl:text-right">
                {t('marketingPlan.budgetItems')}
              </div>
              <div className="text-xs text-gray-900 font-medium ltr:text-left rtl:text-right">
                {data.budget?.breakdown?.length || 0}
              </div>
            </div>
            <div className="bg-white/50 rounded p-1.5">
              <div className="text-[10px] text-gray-600 mb-0.5 ltr:text-left rtl:text-right">
                {t('marketingPlan.timelinePhases')}
              </div>
              <div className="text-xs text-gray-900 font-medium ltr:text-left rtl:text-right">
                {data.timeline?.length || 0}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-600 text-center">
            {data.timeline?.[0]?.phase || t('marketingPlan.timelineNotDefined')}
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
        {title || t('marketingPlan.title')}
      </h3>
      
      <div className="h-32 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-white rounded-xl border-2 border-[#4588f5] p-3 shadow-sm transition-all duration-500"
        >
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