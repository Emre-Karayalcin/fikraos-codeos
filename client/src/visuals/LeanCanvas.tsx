import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Target, 
  Lightbulb, 
  Users, 
  TrendingUp, 
  Shield, 
  Radio, 
  BarChart3, 
  DollarSign 
} from 'lucide-react';

interface LeanCanvasProps {
  data: {
    problem?: (string | any)[];
    solution?: (string | any)[];
    keyMetrics?: (string | any)[];
    uniqueValueProposition?: string | any;
    unfairAdvantage?: string | any;
    channels?: (string | any)[];
    customerSegments?: (string | any)[];
    costStructure?: (string | any)[];
    revenueStreams?: (string | any)[];
  };
}

export default function LeanCanvas({ data }: LeanCanvasProps) {
  const { t } = useTranslation();
  console.log('LeanCanvas data:', data);
  
  const renderContent = (item: any) => {
    if (typeof item === 'string') {
      return item;
    }
    if (typeof item === 'object' && item !== null) {
      if (item.primary) return item.primary;
      if (item.competitiveEdge) return item.competitiveEdge;
      if (item.text) return item.text;
      if (item.description) return item.description;
      if (item.name) return item.name;
      if (item.details && Array.isArray(item.details)) {
        return item.details.join(', ');
      }
      
      const entries = Object.entries(item);
      if (entries.length === 1) {
        return String(entries[0][1]);
      }
      
      return entries
        .filter(([key, value]) => value !== null && value !== undefined)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(', ')}`;
          }
          return `${key}: ${value}`;
        })
        .join(' | ');
    }
    return String(item);
  };

  const Section = ({ 
    title, 
    content, 
    icon: Icon, 
    className = "" 
  }: { 
    title: string; 
    content: any; 
    icon: any;
    className?: string; 
  }) => {
    return (
      <div className={`bg-white border-2 border-[#4588f5] rounded-lg p-3 min-h-[120px] ${className}`}>
        <h3 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wide flex items-center gap-2 ltr:flex-row">
          <Icon className="w-4 h-4 text-[#4588f5]" />
          {title}
        </h3>
        <div className="text-xs text-gray-700 ltr:text-left rtl:text-right">
          {Array.isArray(content) ? (
            <ul className="space-y-2">
              {content.map((item, index) => (
                <li key={index} className="flex items-start ltr:flex-row">
                  <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  <span className="leading-tight">{renderContent(item)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="leading-tight">{renderContent(content)}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-full @container">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2 flex-row">
          <Target className="w-6 h-6 text-[#4588f5]" />
          {t('leanCanvas.title')}
        </h2>
        <p className="text-gray-600 ltr:text-left rtl:text-right">{t('leanCanvas.subtitle')}</p>
      </div>
      
      <div className="space-y-3">
        {/* Row 1 */}
        <div 
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))'
          }}
        >
          <Section 
            title={t('leanCanvas.problem')} 
            content={data.problem} 
            icon={Target}
          />
          <Section 
            title={t('leanCanvas.solution')} 
            content={data.solution} 
            icon={Lightbulb}
          />
          <Section 
            title={t('leanCanvas.uniqueValueProposition')} 
            content={data.uniqueValueProposition} 
            icon={TrendingUp}
            className="@lg:col-span-1 @sm:col-span-2" 
          />
          <Section 
            title={t('leanCanvas.unfairAdvantage')} 
            content={data.unfairAdvantage} 
            icon={Shield}
          />
          <Section 
            title={t('leanCanvas.customerSegments')} 
            content={data.customerSegments} 
            icon={Users}
          />
        </div>

        {/* Row 2 */}
        <div 
          className="grid gap-3 @container"
          style={{
            gridTemplateColumns: 'minmax(160px, 2fr) minmax(300px, 1fr)'
          }}
        >
          <Section 
            title={t('leanCanvas.keyMetrics')} 
            content={data.keyMetrics} 
            icon={BarChart3}
          />
          <Section 
            title={t('leanCanvas.channels')} 
            content={data.channels} 
            icon={Radio}
          />
        </div>

        {/* Row 3 */}
        <div 
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))'
          }}
        >
          <Section 
            title={t('leanCanvas.costStructure')} 
            content={data.costStructure} 
            icon={DollarSign}
          />
          <Section 
            title={t('leanCanvas.revenueStreams')} 
            content={data.revenueStreams} 
            icon={TrendingUp}
          />
        </div>
      </div>
    </div>
  );
}