import { FileText, Edit3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface AssetData {
  problem?: string[];
  solution?: string[];
  keyMetrics?: string[];
  uniqueValueProposition?: string[];
  unfairAdvantage?: string[];
}

interface Asset {
  id: string;
  kind: string;
  title: string;
  data: AssetData;
}

interface AssetPreviewProps {
  asset: Asset;
}

export function AssetPreview({ asset }: AssetPreviewProps) {
  const { t } = useTranslation();
  const canvasBlocks = [
    { key: "problem", title: t('leanCanvas.problem'), color: "text-orange-400", data: asset.data.problem },
    { key: "solution", title: t('leanCanvas.solution'), color: "text-blue-500", data: asset.data.solution },
    { key: "keyMetrics", title: t('leanCanvas.keyMetrics'), color: "text-purple-400", data: asset.data.keyMetrics },
    { key: "uniqueValueProposition", title: t('leanCanvas.uniqueValueProposition'), color: "text-blue-400", data: asset.data.uniqueValueProposition },
    { key: "unfairAdvantage", title: t('leanCanvas.unfairAdvantage'), color: "text-pink-400", data: asset.data.unfairAdvantage },
  ];

  return (
    <div className="flex justify-start" data-testid={`asset-preview-${asset.id}`}>
      <div className="max-w-4xl w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-500 rounded-full flex items-center justify-center">
            <FileText className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-blue-500">Generated Asset</span>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-500 text-xs rounded-full">
            {asset.kind.replace('_', ' ')}
          </span>
        </div>
        
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{asset.title}</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-text-muted hover:text-white p-1 h-auto"
                data-testid="button-edit-asset"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-text-muted hover:text-white p-1 h-auto"
                data-testid="button-download-asset"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Lean Canvas Grid */}
          <div className="grid grid-cols-5 gap-3 text-sm">
            {canvasBlocks.map((block) => (
              <div key={block.key} className="bg-panel-gray rounded-lg p-3">
                <div className={`font-medium ${block.color} mb-2`}>{block.title}</div>
                <ul className="text-text-gray space-y-1 text-xs">
                  {block.data?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
