import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Eye, Award, Heart, Sparkles } from 'lucide-react';

interface BrandWheelData {
  mission?: string;
  vision?: string;
  brand_positioning?: string;
  brand_values?: string;
  personality?: string;
}

interface BrandWheelPreviewProps {
  data: BrandWheelData;
  title?: string;
}

export default function BrandWheelPreview({ data, title }: BrandWheelPreviewProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentView(prev => (prev + 1) % 5); // Rotate through 5 sections
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Parse comma-separated values
  const parseValues = (text: string | undefined): string[] => {
    if (!text) return [];
    return text.split(',').map(v => v.trim()).filter(Boolean).slice(0, 3); // Max 3 items for preview
  };

  const sections = [
    {
      title: t('brandWheelPreview.mission'),
      icon: Target,
      content: data.mission,
      isList: false
    },
    {
      title: t('brandWheelPreview.vision'),
      icon: Eye,
      content: data.vision,
      isList: false
    },
    {
      title: t('brandWheelPreview.positioning'),
      icon: Award,
      content: data.brand_positioning,
      isList: false
    },
    {
      title: t('brandWheelPreview.values'),
      icon: Heart,
      content: data.brand_values,
      isList: true
    },
    {
      title: t('brandWheelPreview.personality'),
      icon: Sparkles,
      content: data.personality,
      isList: true
    }
  ];

  const currentSection = sections[currentView];
  const SectionIcon = currentSection.icon;

  // Truncate text for preview
  const truncateText = (text: string | undefined, maxLength: number = 100) => {
    if (!text) return t('common.notSpecified');
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Extract trait name from "Trait (explanation)" format
  const extractTraitName = (trait: string): string => {
    const match = trait.match(/^([^(]+)/);
    return match ? match[1].trim() : trait;
  };

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Target className="w-4 h-4 text-blue-500" />
        {title || t('brandWheelPreview.title')}
      </h3>
      
      <div className="relative h-40 overflow-hidden">
        <div className="absolute inset-0 transition-opacity duration-500">
          <div className="bg-white border-2 border-blue-500 rounded-xl p-4 h-full shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-row">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <SectionIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-base font-bold text-blue-600 ltr:text-left rtl:text-right">
                    {currentSection.title}
                  </div>
                  {currentSection.isList && (
                    <div className="text-xs text-gray-500 ltr:text-left rtl:text-right">
                      {t('brandWheelPreview.itemsCount', { count: parseValues(currentSection.content).length })}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs font-medium text-gray-400">
                {currentView + 1}/5
              </div>
            </div>

            {/* Content */}
            <div className="text-sm text-gray-700 leading-relaxed">
              {currentSection.isList ? (
                <ul className="space-y-2">
                  {parseValues(currentSection.content).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 flex-row">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <span className="text-xs leading-tight ltr:text-left rtl:text-right">
                        <span className="font-semibold">{extractTraitName(item)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-tight line-clamp-4 ltr:text-left rtl:text-right">
                  {truncateText(currentSection.content, 180)}
                </p>
              )}
            </div>

            {/* Section Indicator */}
            <div className="absolute bottom-3 ltr:right-3 rtl:left-3 flex gap-1">
              {sections.map((_, index) => (
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

      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 mt-2">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <button
              key={index}
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                currentView === index 
                  ? 'bg-blue-500 text-white scale-110' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              onClick={() => setCurrentView(index)}
              title={section.title}
            >
              <Icon className="w-3 h-3" />
            </button>
          );
        })}
      </div>
    </div>
  );
}