import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Palette, 
  Type, 
  Image, 
  MessageCircle, 
  Heart, 
  Sparkles, 
  Award,
  CheckCircle
} from 'lucide-react';

interface BrandIdentityData {
  // Color Palette (5 colors from light to dark)
  color_name_1?: string;
  color_name_2?: string;
  color_name_3?: string;
  color_name_4?: string;
  color_name_5?: string;
  color_hex_1?: string;
  color_hex_2?: string;
  color_hex_3?: string;
  color_hex_4?: string;
  color_hex_5?: string;
  color_des?: string;
  
  // Visual Identity
  logo_idea?: string;
  typography?: string;
  imagery_photography?: string;
  
  // Brand Voice & Values
  brand_voice?: string;
  brand_values?: string;
  brand_personality_traits?: string;
  customer_promise?: string;
}

interface BrandIdentityProps {
  data: BrandIdentityData;
}

export default function BrandIdentity({ data }: BrandIdentityProps) {
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

  // Parse comma-separated values
  const parseValues = (text: string | undefined): string[] => {
    if (!text) return [];
    return text.split(',').map(v => v.trim()).filter(Boolean);
  };

  // Extract trait name from "Trait (explanation)" format
  const extractTraitName = (trait: string): string => {
    const match = trait.match(/^([^(]+)/);
    return match ? match[1].trim() : trait;
  };

  const values = parseValues(data.brand_values);
  const traits = parseValues(data.brand_personality_traits);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('brandIdentity.noData')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-7xl mx-auto px-6 py-8 bg-white">
      {/* Title */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 flex-row">
          {t('brandIdentity.title')}
          <Palette className="w-5 h-5 text-orange-500" />
        </h2>
      </div>
      
      <div className="space-y-8">
        {/* Color Palette */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 text-base ltr:text-left rtl:text-right">
            {t('brandIdentity.colorPalette')}
          </h3>
          
          {/* Color Bar - Only 4 colors displayed */}
          <div className="flex gap-0 h-28 mb-6">
            {[1, 2, 3, 4].map(i => {
              const hex = data[`color_hex_${i}` as keyof BrandIdentityData] as string;
              return hex ? (
                <div
                  key={i}
                  className="flex-1"
                  style={{ backgroundColor: hex }}
                />
              ) : null;
            })}
          </div>
        </div>

        {/* Typography */}
        {data.typography && (
          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-base ltr:text-left rtl:text-right">
              {t('brandIdentity.typography')}
            </h3>
            
            <div className={`grid gap-8 ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {/* Left side - Font samples */}
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1 ltr:text-left rtl:text-right">{t('brandIdentity.headline')}</div>
                  <div className="text-4xl font-bold text-gray-900 ltr:text-left rtl:text-right" style={{ fontFamily: 'Monaco, monospace' }}>
                    Monaco Display
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 ltr:text-left rtl:text-right">{t('brandIdentity.subheadline')}</div>
                  <div className="text-3xl font-bold text-gray-900 ltr:text-left rtl:text-right" style={{ fontFamily: 'Monaco, monospace' }}>
                    Monaco Bold
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 ltr:text-left rtl:text-right">{t('brandIdentity.headline')}</div>
                  <div className="text-3xl text-gray-900 ltr:text-left rtl:text-right" style={{ fontFamily: 'Monaco, monospace' }}>
                    Monaco Regular
                  </div>
                </div>
              </div>
              
              {/* Right side - Sample text */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-2xl font-bold mb-2 text-gray-900 ltr:text-left rtl:text-right">{t('brandIdentity.sampleTitle')}</h4>
                <p className="text-xs text-gray-600 mb-3 ltr:text-left rtl:text-right">{t('brandIdentity.sampleSubtitle')}</p>
                <p className="text-xs text-gray-600 leading-relaxed ltr:text-left rtl:text-right">
                  {t('brandIdentity.sampleText')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Logo Idea */}
        {data.logo_idea && (
          <div>
            <h3 className="font-bold text-gray-900 mb-2 text-base ltr:text-left rtl:text-right">
              {t('brandIdentity.logoIdea')}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed ltr:text-left rtl:text-right">{data.logo_idea}</p>
          </div>
        )}

        {/* Imagery & Photography */}
        {data.imagery_photography && (
          <div>
            <h3 className="font-bold text-gray-900 mb-2 text-base ltr:text-left rtl:text-right">
              {t('brandIdentity.imageryPhotography')}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed ltr:text-left rtl:text-right">{data.imagery_photography}</p>
          </div>
        )}

        {/* Brand Personality Traits */}
        {data.brand_personality_traits && (
          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-base ltr:text-left rtl:text-right">
              {t('brandIdentity.personalityTraits')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {traits.map((trait, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm font-medium"
                >
                  {extractTraitName(trait)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Brand Voice */}
        {data.brand_voice && (
          <div>
            <h3 className="font-bold text-gray-900 mb-2 text-base ltr:text-left rtl:text-right">
              {t('brandIdentity.brandVoice')}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed ltr:text-left rtl:text-right">{data.brand_voice}</p>
          </div>
        )}

        {/* Brand Values */}
        {data.brand_values && (
          <div>
            <h3 className="font-bold text-gray-900 mb-2 text-base ltr:text-left rtl:text-right">
              {t('brandIdentity.brandValues')}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed ltr:text-left rtl:text-right">{data.brand_values}</p>
          </div>
        )}

        {/* Customer Promise */}
        {data.customer_promise && (
          <div>
            <h3 className="font-bold text-gray-900 mb-2 text-base ltr:text-left rtl:text-right">
              {t('brandIdentity.customerPromise')}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed ltr:text-left rtl:text-right">{data.customer_promise}</p>
          </div>
        )}
      </div>
    </div>
  );
}