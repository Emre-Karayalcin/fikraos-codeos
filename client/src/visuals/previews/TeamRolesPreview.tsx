import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Lightbulb, UserCircle, TrendingUp } from 'lucide-react';

interface TeamRole {
  name: string;
  description: string;
  responsibilities_1: string;
  responsibilities_2: string;
  responsibilities_3: string;
  personal_attributes_1: string;
  personal_attributes_2: string;
  personal_attributes_3: string;
  driving_motivators_1: string;
  driving_motivators_2: string;
  driving_motivators_3: string;
}

interface TeamRolesData {
  roles: TeamRole[];
}

interface TeamRolesPreviewProps {
  data: TeamRolesData;
  title?: string;
}

export default function TeamRolesPreview({ data, title }: TeamRolesPreviewProps) {
  const { t } = useTranslation();
  const [currentRole, setCurrentRole] = useState(0);

  useEffect(() => {
    if (!data?.roles || data.roles.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentRole(prev => (prev + 1) % data.roles.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [data?.roles]);

  if (!data || !data.roles || data.roles.length === 0) {
    return (
      <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="text-center text-gray-400 py-8">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">{t('teamRoles.noRoles')}</p>
        </div>
      </div>
    );
  }

  const role = data.roles[currentRole];

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Users className="w-4 h-4 text-blue-500" />
        {title || t('teamRoles.title')}
      </h3>
      
      <div className="relative h-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="bg-white border-2 border-blue-500 rounded-xl p-4 h-full shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate ltr:text-left rtl:text-right">
                  {role.name}
                </div>
                <div className="text-xs text-gray-500 ltr:text-left rtl:text-right">
                  {t('teamRoles.roleCount', { current: currentRole + 1, total: data.roles.length })}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-600 leading-tight line-clamp-2 mb-3 ltr:text-left rtl:text-right">
              {role.description}
            </p>

            {/* Compact Info */}
            <div className="space-y-2">
              {/* Responsibilities */}
              <div className="flex items-start gap-2 flex-row">
                <Lightbulb className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 ltr:text-left rtl:text-right">
                    {t('teamRoles.responsibilities')}
                  </div>
                  <div className="text-xs text-gray-600 truncate ltr:text-left rtl:text-right">
                    {role.responsibilities_1}
                  </div>
                </div>
              </div>

              {/* Personal Attributes */}
              <div className="flex items-start gap-2 flex-row">
                <UserCircle className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 ltr:text-left rtl:text-right">
                    {t('teamRoles.attributes')}
                  </div>
                  <div className="text-xs text-gray-600 truncate ltr:text-left rtl:text-right">
                    {role.personal_attributes_1}
                  </div>
                </div>
              </div>

              {/* Driving Motivators */}
              <div className="flex items-start gap-2 flex-row">
                <TrendingUp className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 ltr:text-left rtl:text-right">
                    {t('teamRoles.motivators')}
                  </div>
                  <div className="text-xs text-gray-600 truncate ltr:text-left rtl:text-right">
                    {role.driving_motivators_1}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Dots */}
            <div className="absolute bottom-2 ltr:right-2 rtl:left-2 flex gap-1">
              {data.roles.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    currentRole === index ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-1 mt-2">
        {data.roles.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentRole === index 
                ? 'bg-blue-500 w-6' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            onClick={() => setCurrentRole(index)}
            title={data.roles[index].name}
            aria-label={t('teamRoles.viewRole', { name: data.roles[index].name })}
          />
        ))}
      </div>
    </div>
  );
}