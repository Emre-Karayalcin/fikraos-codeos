import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { loadVisualization, VisualizationFallback } from '../../visuals';
import { loadPreview } from '../../visuals/previews';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Target,
  Users,
  BarChart3,
  FileText,
  Sparkles,
  Zap,
  ArrowLeft,
  Maximize2,
  Minimize2,
  TrendingUp,
  Heart,
  Megaphone,
  Presentation,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { HubView } from '@/components/assets/HubView';
import { ViewModeToggle } from '@/components/assets/ViewModeToggle';
import { AssetEditModal } from '@/components/assets/AssetEditModal';
import { Edit } from "lucide-react";

interface RightPanelProps {
  chatId?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onHubViewChange?: (isHubView: boolean) => void;
  researchData?: any;
  isResearchMode?: boolean;
  isResearchLoading?: boolean;
}

// ✅ Asset types with translation keys
const assetTypes = [
  { kind: "SWOT", icon: Zap, category: "strategy" },
  { kind: "LEAN_CANVAS", icon: Target, category: "strategy" },
  { kind: "PERSONA", icon: Users, category: "customer" },
  { kind: "USER_STORIES", icon: FileText, category: "customer" },
  { kind: "INTERVIEW_QUESTIONS", icon: FileText, category: "customer" },
  { kind: "TAM_SAM_SOM", icon: BarChart3, category: "market" },
  { kind: "COMPETITOR_MAP", icon: BarChart3, category: "market" },
  { kind: "JOURNEY_MAP", icon: FileText, category: "customer" },
  { kind: "MARKETING_PLAN", icon: Sparkles, category: "marketing" },
  { kind: "BRAND_WHEEL", icon: Sparkles, category: "marketing" },
  { kind: "BRAND_IDENTITY", icon: Sparkles, category: "marketing" },
  { kind: "TEAM_ROLES", icon: Users, category: "strategy" },
  { kind: "PITCH_OUTLINE", icon: FileText, category: "pitch" },
];

// ✅ Asset categories with translation keys
const assetCategories = [
  { id: "strategy", icon: Target },
  { id: "market", icon: TrendingUp },
  { id: "customer", icon: Heart },
  { id: "marketing", icon: Megaphone },
  { id: "pitch", icon: Presentation },
];

interface AssetGridProps {
  assets: any[];
  assetsLoading: boolean;
  previewComponents: { [key: string]: any };
  onAssetSelect: (asset: any) => void;
}

const sortAssetsByKind = (assets: any[]) => {
  if (!Array.isArray(assets)) return [];
  const kindOrderMap = new Map(
    assetTypes.map((type, index) => [type.kind, index])
  );
  
  return [...assets].sort((a, b) => {
    const orderA = kindOrderMap.get(a.kind) ?? Number.MAX_SAFE_INTEGER;
    const orderB = kindOrderMap.get(b.kind) ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
};

function AssetGrid({ assets, assetsLoading, previewComponents, onAssetSelect }: AssetGridProps) {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const sortedAssets = sortAssetsByKind(assets);

  // ✅ Monitor panel width and adjust columns
  useEffect(() => {
    if (!gridRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // 768px breakpoint for 2 columns
        setColumns(width >= 768 ? 2 : 1);
      }
    });

    resizeObserver.observe(gridRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (assetsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('assets.loading')}</p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(assets) || assets.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('assets.noAssets')}</h4>
        <p className="text-gray-600">{t('assets.noAssetsDesc')}</p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className={`grid gap-4 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {sortedAssets.map((asset: any) => {
        const assetType = assetTypes.find(type => type.kind === asset.kind);
        const PreviewComponent = previewComponents[asset.id];
        
        return (
          <div
            key={asset.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAssetSelect(asset);
            }}
            className="relative bg-white border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-lg cursor-pointer transition-all duration-200 w-full min-h-[200px] overflow-hidden group"
          >
            {PreviewComponent ? (
              <PreviewComponent data={asset.data} />
            ) : (
              <div className="w-full h-full p-6">
                <div className="flex items-center gap-3 mb-4 ltr:flex-row">
                  {assetType && <assetType.icon className="w-5 h-5 text-gray-500" />}
                  <h3 className="text-lg font-bold text-gray-900">
                    {t(`assets.types.${asset.kind}`)}
                  </h3>
                </div>
                <div className="bg-gray-50 rounded p-6 min-h-[120px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">{t('assets.businessAsset')}</div>
                    <div className="text-sm text-gray-500 mt-2">{t('assets.clickToView')}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="bg-white/90 px-3 py-1 rounded-full text-sm font-medium text-gray-900">
                {t('assets.clickToView')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RightPanel({ chatId, isFullscreen = false, onToggleFullscreen, onHubViewChange }: RightPanelProps) {
  const { t } = useTranslation();
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [VisualizationComponent, setVisualizationComponent] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [previewComponents, setPreviewComponents] = useState<{ [key: string]: any }>({});
  const [activeTab, setActiveTab] = useState<string>("all");
  const [tabOffset, setTabOffset] = useState<number>(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Determine default view mode based on localStorage
  const determineDefaultView = (): 'hub' | 'chat' => {
    if (!chatId) return 'chat'; // Default to chat if no chatId

    // Check localStorage first
    const saved = localStorage.getItem(`project_${chatId}_viewMode`);
    if (saved === 'hub' || saved === 'chat') return saved;

    // Default to chat view (changed from hub to chat)
    return 'chat';
  };

  const [viewMode, setViewMode] = useState<'hub' | 'chat'>(determineDefaultView());

  // Save preference when changed
  const handleViewModeChange = (mode: 'hub' | 'chat') => {
    setViewMode(mode);
    if (chatId) {
      localStorage.setItem(`project_${chatId}_viewMode`, mode);
    }
    // Notify parent about Hub View state
    onHubViewChange?.(mode === 'hub');
  };

  // Notify parent on initial mount if Hub View is active
  useEffect(() => {
    onHubViewChange?.(viewMode === 'hub');
  }, [viewMode, onHubViewChange]);

  const { data: chat } = useQuery({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId,
    retry: false,
  });

  const projectId = (chat as any)?.projectId || (chat as any)?.project_id;

  const handleExportPdf = useCallback(async () => {
    if (!projectId || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export-pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-export.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setIsExporting(false);
    }
  }, [projectId, isExporting]);

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "assets"],
    enabled: !!projectId,
    retry: false,
    staleTime: 2000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: 3000,
  });

  useEffect(() => {
    const loadPreviews = async () => {
      if (Array.isArray(assets) && assets.length > 0) {
        const previews: { [key: string]: any } = {};
        for (const asset of assets) {
          try {
            const PreviewComponent = await loadPreview(asset.kind);
            previews[asset.id] = PreviewComponent;
          } catch (error) {
            console.error(`Failed to load preview for ${asset.kind}:`, error);
          }
        }
        setPreviewComponents(previews);
      }
    };
    loadPreviews();
  }, [assets]);

  useEffect(() => {
    const loadVisualizationComponent = async () => {
      if (selectedAsset) {
        try {
          const Component = await loadVisualization(selectedAsset.kind);
          setVisualizationComponent(() => Component);
        } catch (error) {
          console.error(`Failed to load visualization for ${selectedAsset.kind}:`, error);
          setVisualizationComponent(() => null);
        }
      } else {
        setVisualizationComponent(null);
      }
    };
    loadVisualizationComponent();
  }, [selectedAsset]);

  const filterAssetsByCategory = (category: string) => {
    if (category === "all") return Array.isArray(assets) ? assets : [];
    return Array.isArray(assets) ? assets.filter((asset: any) => {
      const assetType = assetTypes.find(type => type.kind === asset.kind);
      return assetType?.category === category;
    }) : [];
  };

  const getCategoryCount = (category: string) => {
    if (category === "all") return Array.isArray(assets) ? assets.length : 0;
    return filterAssetsByCategory(category).length;
  };

  if (!chatId) {
    return (
      <div className="w-full bg-card border-l border-border flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-primary text-lg mb-2">{t('assets.noChatSelected')}</p>
            <p className="text-text-secondary">{t('assets.noChatDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white flex flex-col h-full">
      {selectedAsset ? (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedAsset(null);
                setVisualizationComponent(null);
              }}
              className="flex items-center justify-start text-sm text-gray-600 hover:text-gray-900 transition-colors flex-row"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('assets.backToOverview')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditModalOpen(true);
              }}
              className="absolute top-4 right-4 z-10 p-2 text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 shadow-sm transition-all"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            {VisualizationComponent ? (
              <VisualizationComponent 
                data={selectedAsset.data} 
                title={selectedAsset.title}
                projectId={selectedAsset.projectId}
                assetId={selectedAsset.id}
              />
            ) : selectedAsset ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <VisualizationFallback data={selectedAsset.data} title={selectedAsset.title} />
            )}
          </div>
        </>
      ) : (
        <>
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900 rtl:mr-10">{t('assets.title')}</h3>
              <div className="flex items-center gap-3 flex-row">
                {/* View Mode Toggle */}
                <ViewModeToggle mode={viewMode} onChange={handleViewModeChange} />

                {/* Asset Count Badge */}
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                  {Array.isArray(assets) ? assets.length : 0} {t('assets.generated')}
                </span>

                {/* Export PDF */}
                {projectId && Array.isArray(assets) && assets.length > 0 && (
                  <button
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    title="Export as PDF"
                  >
                    {isExporting
                      ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      : <Download className="w-4 h-4" />
                    }
                  </button>
                )}

                {/* Fullscreen Toggle */}
                {onToggleFullscreen && (
                  <button
                    onClick={onToggleFullscreen}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600">{t('assets.subtitle')}</p>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {viewMode === 'hub' ? (
              <HubView
                assets={Array.isArray(assets) ? assets : []}
                assetsLoading={assetsLoading}
                onAssetSelect={setSelectedAsset}
                previewComponents={previewComponents}
              />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="px-6 pt-4 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTabOffset(Math.max(0, tabOffset - 1))}
                    disabled={tabOffset === 0}
                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>

                  <div className="flex-1 overflow-hidden">
                    <TabsList className="flex bg-gray-100 rounded-lg p-1 gap-1">
                      {(() => {
                        const allTabs = [
                          { id: "all", icon: null },
                          ...assetCategories
                        ];
                        const visibleTabs = allTabs.slice(tabOffset, tabOffset + 3);

                        return visibleTabs.map((tab) => {
                          const Icon = tab.icon;
                          const count = getCategoryCount(tab.id);

                          return (
                            <TabsTrigger 
                              key={tab.id}
                              value={tab.id} 
                              className="flex-1 text-xs font-medium data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center justify-center gap-1 px-3 py-2"
                            >
                              {Icon && <Icon className="w-3 h-3" />}
                              <span className="truncate">{t(`assets.categories.${tab.id}`)}</span>
                              {count > 0 && (
                                <span className="ltr:ml-1 rtl:mr-1 px-1.5 py-0.5 bg-gray-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs rounded-full">
                                  {count}
                                </span>
                              )}
                            </TabsTrigger>
                          );
                        });
                      })()}
                    </TabsList>
                  </div>

                  <button
                    onClick={() => {
                      const allTabs = [{ id: "all", icon: null }, ...assetCategories];
                      const maxOffset = Math.max(0, allTabs.length - 3);
                      setTabOffset(Math.min(maxOffset, tabOffset + 1));
                    }}
                    disabled={(() => {
                      const allTabs = [{ id: "all", icon: null }, ...assetCategories];
                      return tabOffset >= Math.max(0, allTabs.length - 3);
                    })()}
                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="flex justify-center mt-2 gap-1">
                  {(() => {
                    const allTabs = [{ id: "all", icon: null }, ...assetCategories];
                    const totalPages = Math.ceil(allTabs.length / 3);
                    const currentPage = Math.floor(tabOffset / 3);
                    
                    return Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setTabOffset(index * 3)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          index === currentPage ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      />
                    ));
                  })()}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="all" className="p-6 m-0">
                  <AssetGrid 
                    assets={Array.isArray(assets) ? assets : []}
                    assetsLoading={assetsLoading}
                    previewComponents={previewComponents}
                    onAssetSelect={setSelectedAsset}
                  />
                </TabsContent>

                {assetCategories.map((category) => {
                  const categoryAssets = filterAssetsByCategory(category.id);
                  return (
                    <TabsContent key={category.id} value={category.id} className="p-6 m-0">
                      {categoryAssets.length === 0 ? (
                        <div className="text-center py-16">
                          <category.icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {t(`assets.empty.${category.id}`)}
                          </h4>
                          <p className="text-gray-600">
                            {t(`assets.empty.${category.id}Desc`)}
                          </p>
                        </div>
                      ) : (
                        <AssetGrid 
                          assets={categoryAssets}
                          assetsLoading={assetsLoading && categoryAssets.length === 0}
                          previewComponents={previewComponents}
                          onAssetSelect={setSelectedAsset}
                        />
                      )}
                    </TabsContent>
                  );
                })}
              </div>
              </Tabs>
            )}
          </div>
        </>
      )}

      {/* Asset Edit Modal */}
      {selectedAsset && (
        <AssetEditModal
          asset={selectedAsset}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          VisualizationComponent={VisualizationComponent}
        />
      )}
    </div>
  );
}