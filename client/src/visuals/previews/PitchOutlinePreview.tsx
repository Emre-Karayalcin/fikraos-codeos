import React from 'react';
import { useTranslation } from 'react-i18next';
import { Presentation, TrendingUp, DollarSign, Target, Users, Rocket, Lightbulb, Shield } from 'lucide-react';

interface PitchSlide {
  slideNumber: number;
  title: string;
  content: string;
  keyPoints: string[];
}

interface PitchOutlineData {
  slides?: PitchSlide[];
  fundingAsk?: {
    amount: string;
    use: Array<{
      category: string;
      amount: string;
    }>;
  };
  duration?: string;
}

interface PitchOutlinePreviewProps {
  data: PitchOutlineData;
}

export default function PitchOutlinePreview({ data }: PitchOutlinePreviewProps) {
  const { t } = useTranslation();
  console.log('PitchOutlinePreview data:', data);
  
  const slides = data?.slides || [];
  const totalSlides = slides.length;
  const fundingAsk = data?.fundingAsk;

  const getSlideIcon = (index: number) => {
    if (index === 0) return Presentation;
    if (index === 1) return TrendingUp;
    if (index === 2) return Target;
    if (index === 3) return Lightbulb;
    if (index === 4) return Shield;
    if (index === 5) return Rocket;
    if (index === 6) return Rocket;
    if (index === 7) return Users;
    if (index === 8) return DollarSign;
    return DollarSign;
  };

  const formatAmount = (amount: string) => {
    const match = amount.match(/[\d,]+/);
    if (match) {
      const num = parseInt(match[0].replace(/,/g, ''));
      if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
      return `$${num}`;
    }
    return amount;
  };

  return (
    <div className="w-full h-full p-4 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Presentation className="w-4 h-4 text-[#4588f5]" />
        {t('pitchOutlinePreview.title')}
      </h3>
      
      <div className="grid grid-cols-3 gap-1 mb-3">
        {slides.slice(0, 9).map((slide, index) => {
          const Icon = getSlideIcon(index);
          return (
            <div key={index} className="bg-white rounded border-2 border-[#4588f5] aspect-[4/3] p-1 shadow-sm">
              <div className="flex items-center gap-1 mb-0.5 flex-row">
                <Icon className="w-2.5 h-2.5 text-[#4588f5] flex-shrink-0" />
                <div className="text-[9px] font-medium text-gray-900 truncate ltr:text-left rtl:text-right">
                  {slide.title}
                </div>
              </div>
              <div className="text-[8px] text-gray-600 line-clamp-2 mb-1 ltr:text-left rtl:text-right">
                {slide.content}
              </div>
              {slide.keyPoints && slide.keyPoints.length > 0 && (
                <div className="space-y-0.5">
                  {slide.keyPoints.slice(0, 2).map((point, idx) => (
                    <div key={idx} className="flex items-start gap-0.5 flex-row">
                      <div className="w-0.5 h-0.5 bg-[#4588f5] rounded-full mt-1 flex-shrink-0" />
                      <div className="text-[7px] text-gray-600 line-clamp-1 ltr:text-left rtl:text-right">{point}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-2 text-gray-700 flex-row">
          <div className="w-2 h-2 bg-[#4588f5] rounded-full"></div>
          <span>{t('pitchOutlinePreview.slidePresentation', { count: totalSlides })}</span>
        </div>
        {data.duration && (
          <div className="text-gray-500">
            {data.duration}
          </div>
        )}
      </div>

      {fundingAsk && (
        <div className="bg-white/70 rounded-lg p-2 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 flex-row">
              <DollarSign className="w-3 h-3 text-[#4588f5]" />
              <span className="text-xs font-medium text-gray-700">{t('pitchOutlinePreview.fundingAsk')}</span>
            </div>
            <div className="text-sm font-bold text-[#4588f5]">
              {formatAmount(fundingAsk.amount)}
            </div>
          </div>
          {fundingAsk.use && fundingAsk.use.length > 0 && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              {fundingAsk.use.map((item, index) => (
                <div key={index} className="flex justify-between flex-row">
                  <span className="text-gray-600 truncate ltr:text-left rtl:text-right">{item.category}:</span>
                  <span className="font-medium text-gray-900 ltr:ml-1 rtl:mr-1 whitespace-nowrap">
                    {formatAmount(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}