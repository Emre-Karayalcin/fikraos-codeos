import { Card } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

const Block = ({ title, lines, t }: { title: string; lines: string | string[] | undefined; t: any }) => {
  // Normalize lines to always be an array
  const normalizedLines = Array.isArray(lines) 
    ? lines 
    : lines 
      ? [lines] 
      : [];

  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-wide opacity-70">{title}</h4>
      <Card className="p-3 rounded-xl border-neutral-800 h-24">
        <ul className="text-sm space-y-1 overflow-y-auto h-full">
          {normalizedLines.length > 0 ? (
            normalizedLines.map((l, i) => (
              <li key={i} className="text-xs">{l}</li>
            ))
          ) : (
            <li className="text-xs opacity-50">{t('common.notSpecified')}</li>
          )}
        </ul>
      </Card>
    </div>
  );
};

export default function LeanCanvas({ data }: { data: any }) {
  const { t } = useTranslation();
  
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('leanCanvas.noData', 'No Lean Canvas data available')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <Block title={t('leanCanvas.problem', 'Problem')} lines={data.problem} t={t} />
      <Block title={t('leanCanvas.solution', 'Solution')} lines={data.solution} t={t} />
      <Block 
        title={t('leanCanvas.uniqueValueProposition', 'Unique Value Proposition')} 
        lines={data.uniqueValueProposition || data.uniqueValueProp} 
        t={t} 
      />
      <Block title={t('leanCanvas.customerSegments', 'Customer Segments')} lines={data.customerSegments} t={t} />
      <Block title={t('leanCanvas.channels', 'Channels')} lines={data.channels} t={t} />
      <Block title={t('leanCanvas.keyMetrics', 'Key Metrics')} lines={data.keyMetrics} t={t} />
      <Block title={t('leanCanvas.costStructure', 'Cost Structure')} lines={data.costStructure} t={t} />
      <Block title={t('leanCanvas.revenueStreams', 'Revenue Streams')} lines={data.revenueStreams} t={t} />
      <Block title={t('leanCanvas.unfairAdvantage', 'Unfair Advantage')} lines={data.unfairAdvantage} t={t} />
    </div>
  );
}