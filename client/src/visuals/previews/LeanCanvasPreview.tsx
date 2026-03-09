import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Target, Users, DollarSign, Zap, BarChart3 } from 'lucide-react';

interface LeanCanvasData {
  problem?: Array<{ text: string; priority: string; impact: string } | string>;
  solution?: Array<{ text: string; feature: string; differentiator: string } | string>;
  uniqueValueProposition?: {
    headline: string;
    subheading: string;
    keyBenefits: string[];
  } | string;
  unfairAdvantage?: {
    primary: string;
    details: string[];
    competitiveEdge: string;
  } | string;
  customerSegments?: Array<{ segment: string; size: string; characteristics: string[] } | string>;
  keyMetrics?: Array<{ metric: string; target: string; current: string; growth?: string } | string>;
  channels?: Array<{ channel: string; effectiveness: string; cost: string; roi: string } | string>;
  costStructure?: Array<{ category: string; percentage: number; amount: string } | string>;
  revenueStreams?: Array<{ stream: string; percentage: number; amount: string; margin: string } | string>;
}

interface LeanCanvasPreviewProps {
  data: LeanCanvasData;
  title?: string;
}

export default function LeanCanvasPreview({ data, title }: LeanCanvasPreviewProps) {
  const { t } = useTranslation();

  const renderText = (item: any, key: string, maxLength: number = 35) => {
    const text = typeof item === 'string' ? item : item?.[key] || item?.text || '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const Section = ({ 
    sectionTitle, 
    icon: Icon, 
    items, 
    renderItem 
  }: { 
    sectionTitle: string; 
    icon: any; 
    items: any; 
    renderItem: (item: any, index: number) => React.ReactNode;
  }) => (
    <div className="bg-white border-2 border-[#4588f5] p-2 rounded-lg shadow-sm">
      <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1 text-xs flex-row">
        <Icon className="w-3 h-3 text-[#4588f5]" />
        <span className="ltr:text-left rtl:text-right">{sectionTitle}</span>
      </div>
      <div className="space-y-1">
        {Array.isArray(items) ? (
          items.slice(0, 2).map(renderItem)
        ) : (
          <div className="text-gray-700 text-xs leading-tight ltr:text-left rtl:text-right">
            {renderText(items, 'headline', 60)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Target className="w-4 h-4 text-[#4588f5]" />
        {title || t('leanCanvasPreview.title')}
      </h3>
      
      <div className="grid grid-cols-3 gap-2 text-xs h-32">
        {/* Problem */}
        <Section
          sectionTitle={t('leanCanvasPreview.problem')}
          icon={Zap}
          items={data.problem}
          renderItem={(item, index) => (
            <div key={index} className="text-gray-700 text-xs leading-tight flex items-center gap-1 flex-row">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span className="ltr:text-left rtl:text-right">{renderText(item, 'text')}</span>
            </div>
          )}
        />

        {/* Solution */}
        <Section
          sectionTitle={t('leanCanvasPreview.solution')}
          icon={Target}
          items={data.solution}
          renderItem={(item, index) => (
            <div key={index} className="text-gray-700 text-xs leading-tight flex items-center gap-1 flex-row">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span className="ltr:text-left rtl:text-right">{renderText(item, 'text')}</span>
            </div>
          )}
        />

        {/* UVP */}
        <div className="bg-white border-2 border-[#4588f5] p-2 rounded-lg shadow-sm">
          <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1 text-xs flex-row">
            <TrendingUp className="w-3 h-3 text-[#4588f5]" />
            <span className="ltr:text-left rtl:text-right">{t('leanCanvasPreview.valueProp')}</span>
          </div>
          <div className="text-gray-700 text-xs leading-tight ltr:text-left rtl:text-right">
            {typeof data.uniqueValueProposition === 'string' 
              ? data.uniqueValueProposition.substring(0, 60) + '...'
              : data.uniqueValueProposition?.headline?.substring(0, 60) + '...'
            }
          </div>
        </div>

        {/* Customer Segments */}
        <Section
          sectionTitle={t('leanCanvasPreview.customers')}
          icon={Users}
          items={data.customerSegments}
          renderItem={(item, index) => {
            const segment = typeof item === 'string' ? item : item?.segment;
            const size = typeof item === 'object' ? item?.size : undefined;
            return (
              <div key={index} className="text-gray-700 text-xs leading-tight flex items-center gap-1 flex-row">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <div className="ltr:text-left rtl:text-right">
                  {size && <span className="font-medium">{size}</span>}
                  {' '}
                  {segment?.length > 25 ? `${segment.substring(0, 25)}...` : segment}
                </div>
              </div>
            );
          }}
        />

        {/* Revenue */}
        <Section
          sectionTitle={t('leanCanvasPreview.revenue')}
          icon={DollarSign}
          items={data.revenueStreams}
          renderItem={(item, index) => {
            const stream = typeof item === 'string' ? item : item?.stream;
            const percentage = typeof item === 'object' ? item?.percentage : undefined;
            return (
              <div key={index} className="text-gray-700 text-xs leading-tight flex items-center gap-1 flex-row">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <div className="ltr:text-left rtl:text-right">
                  {percentage && <span className="font-medium">{percentage}%</span>}
                  {' '}
                  {stream?.length > 20 ? `${stream.substring(0, 20)}...` : stream}
                </div>
              </div>
            );
          }}
        />

        {/* Metrics */}
        <Section
          sectionTitle={t('leanCanvasPreview.metrics')}
          icon={BarChart3}
          items={data.keyMetrics}
          renderItem={(item, index) => {
            const metric = typeof item === 'string' ? item : item?.metric;
            const target = typeof item === 'object' ? item?.target : undefined;
            return (
              <div key={index} className="text-gray-700 text-xs leading-tight ltr:text-left rtl:text-right">
                {target && <div className="font-medium">{target}</div>}
                <div className="text-gray-600">{metric?.length > 20 ? `${metric.substring(0, 20)}...` : metric}</div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}