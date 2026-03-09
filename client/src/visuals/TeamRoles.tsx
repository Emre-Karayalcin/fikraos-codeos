import React, { useRef, useEffect, useState } from 'react';
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

interface TeamRolesProps {
  data: TeamRolesData;
}

export default function TeamRoles({ data }: TeamRolesProps) {
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

  if (!data || !data.roles || data.roles.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('teamRoles.noData')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-7xl mx-auto px-6 py-8 bg-white">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 flex-row">
          {t('teamRoles.title')}
          <Users className="w-5 h-5 text-orange-500" />
        </h2>
      </div>
      
      <div className="space-y-12">
        {data.roles.map((role, index) => (
          <div key={index} className="space-y-4">
            {/* Role Header */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 ltr:text-left rtl:text-right">
                {role.name}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed ltr:text-left rtl:text-right">
                {role.description}
              </p>
            </div>

            {/* Three Columns */}
            <div className={`grid gap-6 ${isNarrow ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {/* Responsibilities */}
              <div>
                <div className="flex items-center gap-2 mb-3 ltr:flex-row">
                  <Lightbulb className="w-5 h-5 text-orange-500" />
                  <h4 className="font-bold text-gray-900 text-base">
                    {t('teamRoles.responsibilities')}
                  </h4>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.responsibilities_1}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.responsibilities_2}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.responsibilities_3}</span>
                  </li>
                </ul>
              </div>

              {/* Personal Attributes */}
              <div>
                <div className="flex items-center gap-2 mb-3 ltr:flex-row">
                  <UserCircle className="w-5 h-5 text-orange-500" />
                  <h4 className="font-bold text-gray-900 text-base">
                    {t('teamRoles.personalAttributes')}
                  </h4>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.personal_attributes_1}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.personal_attributes_2}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.personal_attributes_3}</span>
                  </li>
                </ul>
              </div>

              {/* Driving Motivators */}
              <div>
                <div className="flex items-center gap-2 mb-3 ltr:flex-row">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h4 className="font-bold text-gray-900 text-base">
                    {t('teamRoles.drivingMotivators')}
                  </h4>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.driving_motivators_1}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.driving_motivators_2}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 ltr:flex-row">
                    <span className="text-gray-400 mt-1">○</span>
                    <span>{role.driving_motivators_3}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Divider (except last role) */}
            {index < data.roles.length - 1 && (
              <div className="border-t border-gray-200 mt-8" />
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-row">
            <Users className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-gray-900">{t('teamRoles.summary')}</span>
          </div>
          <div className="text-2xl font-bold text-orange-500">
            {data.roles.length}
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1 ltr:text-left rtl:text-right">
          {t('teamRoles.summaryDesc')}
        </div>
      </div>
    </div>
  );
}