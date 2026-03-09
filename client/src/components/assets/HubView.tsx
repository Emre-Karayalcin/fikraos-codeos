import { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface HubViewProps {
  assets: any[];
  assetsLoading: boolean;
  onAssetSelect: (asset: any) => void;
  previewComponents: { [key: string]: any };
}

// Define the display order for assets
const ASSET_ORDER = [
  'SWOT',
  'LEAN_CANVAS',
  'INTERVIEW_QUESTIONS',
  'PERSONA',
  'USER_STORIES',
  'JOURNEY_MAP',
  'MARKETING_PLAN',
  'BRAND_WHEEL',
  'BRAND_IDENTITY',
  'TAM_SAM_SOM',
  'COMPETITOR_MAP',
  'TEAM_ROLES',
  'PITCH_OUTLINE',
];

export function HubView({ assets, assetsLoading, onAssetSelect, previewComponents }: HubViewProps) {
  const { t } = useTranslation();

  // Sort assets by the predefined order
  const sortedAssets = useMemo(() => {
    if (!Array.isArray(assets)) return [];

    return [...assets].sort((a, b) => {
      const indexA = ASSET_ORDER.indexOf(a.kind);
      const indexB = ASSET_ORDER.indexOf(b.kind);

      // If not in order list, put at end
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }, [assets]);

  if (assetsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          {t('assets.noAssets')}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
          {t('assets.noAssetsDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
        {sortedAssets.map((asset) => {
          const PreviewComponent = previewComponents[asset.id];

          return (
            <div
              key={asset.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAssetSelect(asset);
              }}
              className="relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-orange-300 hover:shadow-lg cursor-pointer transition-all duration-200 min-h-[200px] overflow-hidden group"
            >
              {PreviewComponent ? (
                <PreviewComponent data={asset.data} />
              ) : (
                <div className="w-full h-full p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {t(`assets.types.${asset.kind}`)}
                    </h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-6 min-h-[120px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('assets.businessAsset')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        {t('assets.clickToView')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 dark:bg-gray-800/90 px-3 py-1 rounded-full text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('assets.clickToView')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
