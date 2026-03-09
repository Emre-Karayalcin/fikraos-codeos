import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Target, Users, DollarSign } from 'lucide-react';

interface MarketData {
  tam?: {
    value: string | any;
    description: string | any;
    methodology: string | any;
  };
  sam?: {
    value: string | any;
    description: string | any;
    methodology: string | any;
  };
  som?: {
    value: string | any;
    description: string | any;
    methodology: string | any;
  };
  marketPenetration?: {
    year1: string | { percentage?: string; customers?: number; revenue?: string };
    year3: string | { percentage?: string; customers?: number; revenue?: string };
    year5: string | { percentage?: string; customers?: number; revenue?: string };
  };
  revenueProjection?: {
    year1: string | { revenue?: string; value?: string };
    year3: string | { revenue?: string; value?: string };
    year5: string | { revenue?: string; value?: string };
  };
}

interface TamSamSomProps {
  data: MarketData;
}

export default function TamSamSom({ data }: TamSamSomProps) {
  const { t } = useTranslation();

  const MarketSegment = ({ 
    title, 
    value, 
    description, 
    methodology, 
    icon: Icon, 
    color, 
    size = "normal" 
  }: { 
    title: string; 
    value: string | any; 
    description: string | any; 
    methodology: string | any; 
    icon: any; 
    color: string; 
    size?: string; 
  }) => {
    const renderValue = (val: any) => {
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null) {
        return val.value || val.text || val.description || JSON.stringify(val);
      }
      return String(val);
    };
    
    return (
      <div className={`bg-white border-2 border-gray-200 rounded-lg p-4 text-center ${
        size === "large" ? "col-span-3" : size === "medium" ? "col-span-2" : "col-span-1"
      }`}>
        <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center mx-auto mb-3`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">{title}</h3>
        <div className={`text-xl font-bold mb-2 ${color.replace('bg-', 'text-')} break-words`}>
          {renderValue(value)}
        </div>
        <p className="text-xs text-gray-700 mb-2 line-clamp-3">{renderValue(description)}</p>
        <div className="border-t pt-2">
          <p className="text-xs text-gray-600 font-medium mb-1">{t('tamSamSom.methodology')}:</p>
          <p className="text-xs text-gray-600 line-clamp-2">{renderValue(methodology)}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('tamSamSom.title')}</h2>
        <p className="text-gray-600 text-sm">{t('tamSamSom.subtitle')}</p>
      </div>
      
      {/* Concentric Circles Visual */}
      <div className="mb-8 bg-white rounded-lg p-4 sm:p-6 border-2 border-gray-200">
        <div className="relative w-56 h-56 sm:w-72 sm:h-72 mx-auto">
          {/* TAM - Outer Circle (Light Teal) */}
          <div className="absolute inset-0 rounded-full bg-blue-50 border-4 border-blue-300 flex items-center justify-center">
            <div className="text-center px-2">
              <div className="text-sm font-bold text-blue-900 mb-1">{t('tamSamSom.tam')}</div>
              <div className="text-base sm:text-lg font-bold text-blue-900 break-words">
                {typeof data.tam?.value === 'string' ? data.tam.value : data.tam?.value?.value || data.tam?.value?.text || JSON.stringify(data.tam?.value)}
              </div>
            </div>
          </div>
          
          {/* SAM - Middle Circle (Medium Teal) */}
          <div className="absolute inset-6 sm:inset-8 rounded-full bg-blue-100 border-4 border-blue-500 flex items-center justify-center">
            <div className="text-center px-2">
              <div className="text-xs sm:text-sm font-bold text-blue-900 mb-1">{t('tamSamSom.sam')}</div>
              <div className="text-sm sm:text-base font-bold text-blue-900 break-words">
                {typeof data.sam?.value === 'string' ? data.sam.value : data.sam?.value?.value || data.sam?.value?.text || JSON.stringify(data.sam?.value)}
              </div>
            </div>
          </div>
          
          {/* SOM - Inner Circle (Dark Teal) */}
          <div className="absolute inset-12 sm:inset-16 rounded-full bg-blue-200 border-4 border-blue-700 flex items-center justify-center">
            <div className="text-center px-2">
              <div className="text-xs font-bold text-blue-900 mb-1">{t('tamSamSom.som')}</div>
              <div className="text-xs sm:text-sm font-bold text-blue-900 break-words">
                {typeof data.som?.value === 'string' ? data.som.value : data.som?.value?.value || data.som?.value?.text || JSON.stringify(data.som?.value)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Segments Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MarketSegment
          title={t('tamSamSom.tamFull')}
          value={data.tam?.value || t('common.notAvailable')}
          description={data.tam?.description || ""}
          methodology={data.tam?.methodology || ""}
          icon={TrendingUp}
          color="bg-blue-400"
          size="normal"
        />
        <MarketSegment
          title={t('tamSamSom.samFull')}
          value={data.sam?.value || t('common.notAvailable')}
          description={data.sam?.description || ""}
          methodology={data.sam?.methodology || ""}
          icon={Target}
          color="bg-blue-500"
          size="normal"
        />
        <MarketSegment
          title={t('tamSamSom.somFull')}
          value={data.som?.value || t('common.notAvailable')}
          description={data.som?.description || ""}
          methodology={data.som?.methodology || ""}
          icon={Users}
          color="bg-blue-600"
          size="normal"
        />
      </div>

      {/* Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-3 ltr:flex-row">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-base font-bold text-gray-900">{t('tamSamSom.marketPenetration')}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-gray-700">{t('tamSamSom.year1')}</span>
              <span className="text-sm font-bold text-blue-600 break-words ltr:text-right rtl:text-left">
                {typeof data.marketPenetration?.year1 === 'object' 
                  ? (data.marketPenetration.year1 as any)?.percentage || (data.marketPenetration.year1 as any)?.revenue || JSON.stringify(data.marketPenetration.year1)
                  : data.marketPenetration?.year1 || t('common.notAvailable')
                }
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-gray-700">{t('tamSamSom.year3')}</span>
              <span className="text-sm font-bold text-blue-600 break-words ltr:text-right rtl:text-left">
                {typeof data.marketPenetration?.year3 === 'object' 
                  ? (data.marketPenetration.year3 as any)?.percentage || (data.marketPenetration.year3 as any)?.revenue || JSON.stringify(data.marketPenetration.year3)
                  : data.marketPenetration?.year3 || t('common.notAvailable')
                }
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-gray-700">{t('tamSamSom.year5')}</span>
              <span className="text-sm font-bold text-blue-600 break-words ltr:text-right rtl:text-left">
                {typeof data.marketPenetration?.year5 === 'object' 
                  ? (data.marketPenetration.year5 as any)?.percentage || (data.marketPenetration.year5 as any)?.revenue || JSON.stringify(data.marketPenetration.year5)
                  : data.marketPenetration?.year5 || t('common.notAvailable')
                }
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-3 ltr:flex-row">
            <DollarSign className="w-5 h-5 text-emerald-600 mr-2" />
            <h3 className="text-base font-bold text-gray-900">{t('tamSamSom.revenueProjection')}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-gray-700">{t('tamSamSom.year1')}</span>
              <span className="text-sm font-bold text-emerald-600 break-words ltr:text-right rtl:text-left">
                {typeof data.revenueProjection?.year1 === 'object' 
                  ? (data.revenueProjection.year1 as any)?.revenue || (data.revenueProjection.year1 as any)?.value || JSON.stringify(data.revenueProjection.year1)
                  : data.revenueProjection?.year1 || t('common.notAvailable')
                }
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-gray-700">{t('tamSamSom.year3')}</span>
              <span className="text-sm font-bold text-emerald-600 break-words ltr:text-right rtl:text-left">
                {typeof data.revenueProjection?.year3 === 'object' 
                  ? (data.revenueProjection.year3 as any)?.revenue || (data.revenueProjection.year3 as any)?.value || JSON.stringify(data.revenueProjection.year3)
                  : data.revenueProjection?.year3 || t('common.notAvailable')
                }
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-gray-700">{t('tamSamSom.year5')}</span>
              <span className="text-sm font-bold text-emerald-600 break-words ltr:text-right rtl:text-left">
                {typeof data.revenueProjection?.year5 === 'object' 
                  ? (data.revenueProjection.year5 as any)?.revenue || (data.revenueProjection.year5 as any)?.value || JSON.stringify(data.revenueProjection.year5)
                  : data.revenueProjection?.year5 || t('common.notAvailable')
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}