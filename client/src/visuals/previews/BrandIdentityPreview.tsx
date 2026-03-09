import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, Type, Image, MessageCircle, Heart, Sparkles, Award } from 'lucide-react';

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

interface BrandIdentityPreviewProps {
  data: BrandIdentityData;
  title?: string;
}

export default function BrandIdentityPreview({ data, title }: BrandIdentityPreviewProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentView(prev => (prev + 1) % 3); // Rotate through 3 views
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Parse comma-separated values
  const parseTraits = (text: string | undefined): string[] => {
    if (!text) return [];
    return text.split(',').map(v => v.trim()).filter(Boolean).slice(0, 4);
  };

  const views = [
    {
      title: t('brandIdentityPreview.colorPalette'),
      icon: Palette,
      render: () => (
        <div className="space-y-2">
          {/* Color Bar */}
          <div className="flex gap-1 h-16 rounded-lg overflow-hidden shadow-sm">
            {[1, 2, 3, 4, 5].map(i => {
              const hex = data[`color_hex_${i}` as keyof BrandIdentityData] as string;
              const name = data[`color_name_${i}` as keyof BrandIdentityData] as string;
              return hex ? (
                <div
                  key={i}
                  className="flex-1 group relative"
                  style={{ backgroundColor: hex }}
                  title={name}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              ) : null;
            })}
          </div>
          
          {/* Description */}
          {data.color_des && (
            <p className="text-xs text-gray-600 leading-tight line-clamp-2 bg-gray-50 rounded-lg p-2 ltr:text-left rtl:text-right">
              {data.color_des}
            </p>
          )}
        </div>
      )
    },
    {
      title: t('brandIdentityPreview.typographyLogo'),
      icon: Type,
      render: () => (
        <div className="space-y-2">
          {/* Typography Preview */}
          {data.typography && (
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1 flex-row">
                <Type className="w-3 h-3 text-blue-500" />
                {t('brandIdentityPreview.typography')}
              </div>
              <p className="text-xs text-gray-600 leading-tight line-clamp-2 ltr:text-left rtl:text-right">
                {data.typography.substring(0, 100)}...
              </p>
            </div>
          )}
          
          {/* Logo Idea */}
          {data.logo_idea && (
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1 flex-row">
                <Award className="w-3 h-3 text-blue-500" />
                {t('brandIdentityPreview.logo')}
              </div>
              <p className="text-xs text-gray-600 leading-tight line-clamp-2 ltr:text-left rtl:text-right">
                {data.logo_idea.substring(0, 100)}...
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      title: t('brandIdentityPreview.brandPersonality'),
      icon: Sparkles,
      render: () => (
        <div className="space-y-2">
          {/* Personality Traits */}
          {data.brand_personality_traits && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-900 flex items-center gap-1 flex-row">
                <Sparkles className="w-3 h-3 text-blue-500" />
                {t('brandIdentityPreview.traits')}
              </div>
              <div className="flex flex-wrap gap-1">
                {parseTraits(data.brand_personality_traits).map((trait, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Brand Voice */}
          {data.brand_voice && (
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1 flex-row">
                <MessageCircle className="w-3 h-3 text-blue-500" />
                {t('brandIdentityPreview.voice')}
              </div>
              <p className="text-xs text-gray-600 leading-tight line-clamp-2 ltr:text-left rtl:text-right">
                {data.brand_voice.substring(0, 80)}...
              </p>
            </div>
          )}
        </div>
      )
    }
  ];

  const currentViewData = views[currentView];
  const ViewIcon = currentViewData.icon;

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Palette className="w-4 h-4 text-blue-500" />
        {title || t('brandIdentityPreview.title')}
      </h3>
      
      <div className="relative h-40 overflow-hidden">
        <div className="absolute inset-0 transition-opacity duration-500">
          <div className="bg-white border-2 border-blue-500 rounded-xl p-4 h-full shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-row">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <ViewIcon className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-bold text-blue-600 ltr:text-left rtl:text-right">
                  {currentViewData.title}
                </div>
              </div>
              <div className="text-xs font-medium text-gray-400">
                {currentView + 1}/3
              </div>
            </div>

            {/* Content */}
            <div className="h-[calc(100%-2.5rem)] overflow-hidden">
              {currentViewData.render()}
            </div>

            {/* Progress Dots */}
            <div className="absolute bottom-2 ltr:right-2 rtl:left-2 flex gap-1">
              {views.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    currentView === index ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center gap-2 mt-2">
        {views.map((view, index) => {
          const Icon = view.icon;
          return (
            <button
              key={index}
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                currentView === index 
                  ? 'bg-blue-500 text-white scale-110' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              onClick={() => setCurrentView(index)}
              title={view.title}
            >
              <Icon className="w-3 h-3" />
            </button>
          );
        })}
      </div>
    </div>
  );
}