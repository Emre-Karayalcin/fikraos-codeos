import { Card } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import { Shield, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Swot({ data }: { data: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] } }) {
  const { t } = useTranslation();
  
  const Box = ({ 
    title, 
    items, 
    icon: Icon 
  }: { 
    title: string; 
    items: string[]; 
    icon: any;
  }) => (
    <Card className="p-4 rounded-2xl">
      <h3 className="font-semibold mb-3 flex items-center gap-2 ltr:flex-row">
        <Icon className="w-4 h-4 text-[#14b8a6]" />
        {title}
      </h3>
      <ul className="space-y-2 text-sm">
        {items?.length > 0 ? (
          items.map((i, idx) => (
            <li key={idx} className="flex items-start ltr:flex-row">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
              <span>{i}</span>
            </li>
          ))
        ) : (
          <li className="text-gray-500 italic">{t('defaults.noItemsIdentified')}</li>
        )}
      </ul>
    </Card>
  );
  
  return (
  <div className="grid md:grid-cols-2 gap-4">
      <Box 
        title={t('swot.strengths')} 
        items={data.strengths} 
        icon={Shield}
      />
      <Box 
        title={t('swot.weaknesses')} 
        items={data.weaknesses} 
        icon={TrendingDown}
      />
      <Box 
        title={t('swot.opportunities')} 
        items={data.opportunities} 
        icon={TrendingUp}
      />
      <Box 
        title={t('swot.threats')} 
        items={data.threats} 
        icon={AlertTriangle}
      />
    </div>
  );
}