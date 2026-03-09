import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Target, 
  Eye, 
  Award, 
  Heart, 
  Sparkles
} from 'lucide-react';

interface BrandWheelData {
  mission?: string;
  vision?: string;
  brand_positioning?: string;
  brand_values?: string;
  personality?: string;
}

interface BrandWheelProps {
  data: BrandWheelData;
}

export default function BrandWheel({ data }: BrandWheelProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const observeWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setIsNarrow(width < 768);
      }
    };

    observeWidth();

    const resizeObserver = new ResizeObserver(observeWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Parse comma-separated values and traits
  const parseValues = (text: string | undefined): string[] => {
    if (!text) return [];
    return text.split(',').map(v => v.trim()).filter(Boolean);
  };

  const Section = ({ 
    title, 
    content, 
    icon: Icon, 
    className = "",
    listFormat = false
  }: { 
    title: string; 
    content: string | undefined; 
    icon: any;
    className?: string;
    listFormat?: boolean;
  }) => {
    const items = listFormat ? parseValues(content) : null;

    return (
      <div className={`bg-white border-2 border-[#4588f5] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
        <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide flex items-center gap-2 flex-row">
          <div className="w-8 h-8 bg-[#4588f5] rounded-full flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          {title}
        </h3>
        <div className="text-sm text-gray-700 leading-relaxed ltr:text-left rtl:text-right">
          {listFormat && items ? (
            <ul className="space-y-3">
              {items.map((item, index) => {
                // Check if item contains parentheses for explanation
                const match = item.match(/^([^(]+)(\(.*\))?$/);
                const name = match?.[1]?.trim() || item;
                const explanation = match?.[2]?.trim();

                return (
                  <li key={index} className="flex items-start flex-row">
                    <span className="w-2 h-2 bg-[#4588f5] rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                    <span className="flex-1">
                      <span className="font-semibold text-gray-900">{name}</span>
                      {explanation && (
                        <span className="text-gray-600 ltr:ml-1 rtl:mr-1">{explanation}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="leading-relaxed whitespace-pre-line">{content || t('common.notSpecified')}</p>
          )}
        </div>
      </div>
    );
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('brandWheel.noData')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3 flex-row">
          <div className="w-10 h-10 bg-[#4588f5] rounded-full flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          {t('brandWheel.title')}
        </h2>
        <p className="text-gray-600 mt-2 ltr:ml-[52px] rtl:mr-[52px] ltr:text-left rtl:text-right">
          {t('brandWheel.subtitle')}
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Row 1: Mission and Vision */}
        <div className={`grid gap-4 ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <Section 
            title={t('brandWheel.mission')} 
            content={data.mission} 
            icon={Target}
          />
          <Section 
            title={t('brandWheel.vision')} 
            content={data.vision} 
            icon={Eye}
          />
        </div>

        {/* Row 2: Brand Positioning (full width) */}
        <Section 
          title={t('brandWheel.brandPositioning')} 
          content={data.brand_positioning} 
          icon={Award}
        />

        {/* Row 3: Brand Values and Personality */}
        <div className={`grid gap-4 ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <Section 
            title={t('brandWheel.brandValues')} 
            content={data.brand_values} 
            icon={Heart}
            listFormat={true}
          />
          <Section 
            title={t('brandWheel.personality')} 
            content={data.personality} 
            icon={Sparkles}
            listFormat={true}
          />
        </div>
      </div>

      {/* Brand Summary Card */}
      <div className="mt-6 bg-gradient-to-r from-[#4588f5]/10 to-blue-100/50 border-2 border-[#4588f5] rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
          <Target className="w-5 h-5 text-[#4588f5]" />
          {t('brandWheel.brandSummary')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-[#4588f5]">
              {parseValues(data.brand_values).length}
            </div>
            <div className="text-xs text-gray-600 mt-1">{t('brandWheel.coreValues')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#4588f5]">
              {parseValues(data.personality).length}
            </div>
            <div className="text-xs text-gray-600 mt-1">{t('brandWheel.personalityTraits')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#4588f5]">
              {data.mission ? '✓' : '−'}
            </div>
            <div className="text-xs text-gray-600 mt-1">{t('brandWheel.mission')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#4588f5]">
              {data.vision ? '✓' : '−'}
            </div>
            <div className="text-xs text-gray-600 mt-1">{t('brandWheel.vision')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#4588f5]">
              {data.brand_positioning ? '✓' : '−'}
            </div>
            <div className="text-xs text-gray-600 mt-1">{t('brandWheel.positioning')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}