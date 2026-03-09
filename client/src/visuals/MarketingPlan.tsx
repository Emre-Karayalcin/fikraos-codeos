import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Users, MessageCircle, TrendingUp, PieChart, Calendar } from 'lucide-react';

const renderComplexItem = (item: any): string => {
  if (typeof item === 'string') return item;
  
  if (typeof item === 'object' && item !== null) {
    if (item.task) {
      const parts = [item.task];
      if (item.description) parts.push(`- ${item.description}`);
      if (item.deadline) parts.push(`(Due: ${item.deadline})`);
      return parts.join(' ');
    }
    
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

interface MarketingPlanProps {
  data: MarketingPlanData;
}

export default function MarketingPlan({ data }: MarketingPlanProps) {
  const { t } = useTranslation();

  const Section = ({ title, icon: Icon, children, className = "" }: { title: string; icon: any; children: React.ReactNode; className?: string }) => (
    <div className={`bg-white border-2 border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center mb-4 ltr:flex-row">
        <Icon className="w-5 h-5 text-orange-600 mr-3" />
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 ltr:text-left rtl:text-right">{t('marketingPlan.title')}</h2>
        <p className="text-gray-600 ltr:text-left rtl:text-right">{t('marketingPlan.subtitle')}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Targeting */}
        <Section title={t('marketingPlan.targeting')} icon={Target}>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2 ltr:text-left rtl:text-right">{t('marketingPlan.primaryAudience')}</h4>
              <p className="text-sm text-gray-700 ltr:text-left rtl:text-right">
                {typeof data.targeting?.primaryAudience === 'string' 
                  ? data.targeting.primaryAudience 
                  : renderComplexItem(data.targeting?.primaryAudience)}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2 ltr:text-left rtl:text-right">{t('marketingPlan.demographics')}</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {data.targeting?.demographics?.map((item, idx) => (
                  <li key={idx} className="flex items-start ltr:flex-row">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {renderComplexItem(item)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Messaging */}
        <Section title={t('marketingPlan.messaging')} icon={MessageCircle}>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2 ltr:text-left rtl:text-right">{t('marketingPlan.valueProposition')}</h4>
              <p className="text-sm text-gray-700 ltr:text-left rtl:text-right">
                {typeof data.messaging?.valueProposition === 'string' 
                  ? data.messaging.valueProposition 
                  : renderComplexItem(data.messaging?.valueProposition)}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2 ltr:text-left rtl:text-right">{t('marketingPlan.keyMessages')}</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {data.messaging?.keyMessages?.map((message, idx) => (
                  <li key={idx} className="flex items-start ltr:flex-row">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {renderComplexItem(message)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Marketing Funnel */}
        <Section title={t('marketingPlan.marketingFunnel')} icon={TrendingUp} className="col-span-1 lg:col-span-2">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-orange-500 text-white rounded-lg p-3 mb-3">
                <h4 className="font-semibold text-sm">{t('marketingPlan.awareness')}</h4>
              </div>
              <ul className="text-xs text-gray-700 space-y-1 ltr:text-left rtl:text-right">
                {data.funnel?.awareness?.map((item, idx) => (
                  <li key={idx}>{renderComplexItem(item)}</li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <div className="bg-orange-600 text-white rounded-lg p-3 mb-3">
                <h4 className="font-semibold text-sm">{t('marketingPlan.consideration')}</h4>
              </div>
              <ul className="text-xs text-gray-700 space-y-1 ltr:text-left rtl:text-right">
                {data.funnel?.consideration?.map((item, idx) => (
                  <li key={idx}>{renderComplexItem(item)}</li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <div className="bg-orange-700 text-white rounded-lg p-3 mb-3">
                <h4 className="font-semibold text-sm">{t('marketingPlan.conversion')}</h4>
              </div>
              <ul className="text-xs text-gray-700 space-y-1 ltr:text-left rtl:text-right">
                {data.funnel?.conversion?.map((item, idx) => (
                  <li key={idx}>{renderComplexItem(item)}</li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <div className="bg-orange-800 text-white rounded-lg p-3 mb-3">
                <h4 className="font-semibold text-sm">{t('marketingPlan.retention')}</h4>
              </div>
              <ul className="text-xs text-gray-700 space-y-1 ltr:text-left rtl:text-right">
                {data.funnel?.retention?.map((item, idx) => (
                  <li key={idx}>{renderComplexItem(item)}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Budget Breakdown */}
        <Section title={t('marketingPlan.budgetOverview')} icon={PieChart}>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{data.budget?.total}</div>
              <div className="text-sm text-gray-600">{t('marketingPlan.totalBudget')}</div>
            </div>
            <div className="space-y-2">
              {data.budget?.breakdown?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 ltr:text-left rtl:text-right">{item.channel}</span>
                  <div className="ltr:text-right rtl:text-left">
                    <div className="text-sm font-semibold text-gray-900">{item.amount}</div>
                    <div className="text-xs text-gray-600">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Timeline */}
        <Section title={t('marketingPlan.launchTimeline')} icon={Calendar}>
          <div className="space-y-4">
            {data.timeline?.map((phase, idx) => (
              <div key={idx} className="ltr:border-l-4 rtl:border-r-4 border-orange-500 ltr:pl-4 rtl:pr-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-sm text-gray-900 ltr:text-left rtl:text-right">{phase.phase}</h4>
                  {phase.duration && <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{phase.duration}</span>}
                </div>
                {phase.activities && Array.isArray(phase.activities) && phase.activities.length > 0 && (
                  <ul className="text-xs text-gray-700 space-y-1">
                    {phase.activities.map((activity, actIdx) => (
                      <li key={actIdx} className="flex items-start ltr:flex-row">
                        <span className="w-1 h-1 bg-orange-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                        {renderComplexItem(activity)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}