import { Card } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

export default function BusinessModel({ data }: { data: any }) {
  const { t } = useTranslation();

  const Section = ({ title, content }: { title: string; content: any }) => (
    <Card className="p-4 rounded-xl bg-card border-border">
      <h4 className="font-medium mb-2 text-primary ltr:text-left rtl:text-right">{title}</h4>
      {Array.isArray(content) ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {content.map((item, idx) => (
            <li key={idx} className="ltr:text-left rtl:text-right">
              <span className="ltr:mr-2 rtl:ml-2">•</span>
              {typeof item === 'string' ? item : JSON.stringify(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground ltr:text-left rtl:text-right">{content}</p>
      )}
    </Card>
  );

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('adminAssets.businessModel.noData', 'No Business Model data available')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">{data.productName}</h2>
        <p className="text-muted-foreground mt-2">{data.valueProposition}</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Section 
          title={t('adminAssets.businessModel.customerSegments', 'Customer Segments')} 
          content={data.segments} 
        />
        <Section 
          title={t('adminAssets.businessModel.revenueStreams', 'Revenue Streams')} 
          content={data.revenueStreams?.map((r: any) => 
            `${r.model} ${r.pricePoint ? `(${r.pricePoint.currency} ${r.pricePoint.amount})` : ''}`
          )} 
        />
        <Section 
          title={t('adminAssets.businessModel.keyActivities', 'Key Activities')} 
          content={data.keyActivities} 
        />
        <Section 
          title={t('adminAssets.businessModel.keyPartners', 'Key Partners')} 
          content={data.keyPartners} 
        />
        <Section 
          title={t('adminAssets.businessModel.costStructure', 'Cost Structure')} 
          content={data.costs} 
        />
      </div>
      
      {data.assumptions && Array.isArray(data.assumptions) && data.assumptions.length > 0 && (
        <Card className="p-4 rounded-xl bg-yellow-500/10 border-yellow-500/20">
          <h4 className="font-medium mb-2 text-yellow-600 dark:text-yellow-400 ltr:text-left rtl:text-right">
            {t('adminAssets.businessModel.keyAssumptions', 'Key Assumptions')}
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {data.assumptions.map((assumption: any, idx: number) => (
              <li 
                key={idx} 
                className="border-l-2 ltr:border-l-2 rtl:border-r-2 ltr:border-r-0 rtl:border-l-0 border-yellow-600 dark:border-yellow-500 ltr:pl-2 rtl:pr-2 ltr:text-left rtl:text-right"
              >
                <span className="font-medium text-foreground">{assumption.statement}</span>
                <span className="text-xs text-yellow-600 dark:text-yellow-400 ltr:ml-2 rtl:mr-2">
                  ({assumption.confidence} {t('adminAssets.businessModel.confidence', 'confidence')})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}