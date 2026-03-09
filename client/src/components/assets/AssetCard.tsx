import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Asset {
  id: string;
  kind: string;
  title: string;
  description: string;
  status: "complete" | "in_progress" | "queued";
  icon: LucideIcon;
}

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const { t } = useTranslation();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "text-blue-500 bg-blue-500/20";
      case "in_progress":
        return "text-amber bg-amber/20";
      case "queued":
        return "text-text-muted bg-border-gray";
      default:
        return "text-text-muted bg-border-gray";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "complete":
        return t('assets.status.complete');
      case "in_progress":
        return t('assets.status.inProgress');
      case "queued":
        return t('assets.status.queued');
      default:
        return t('assets.status.unknown');
    }
  };

  const Icon = asset.icon;

  return (
    <div className="glass-panel rounded-xl p-4" data-testid={`asset-${asset.id}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{asset.title}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(asset.status)}`}>
          {getStatusText(asset.status)}
        </span>
      </div>
      <p className="text-sm text-text-muted mb-3">{asset.description}</p>
      {asset.status === "complete" ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-panel-gray hover:bg-border-gray text-white border-border-gray"
            data-testid={`button-view-${asset.id}`}
          >
            {t('assets.viewDetails')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 border-blue-500/20"
            data-testid={`button-export-${asset.id}`}
          >
            {t('assets.export')}
          </Button>
        </div>
      ) : asset.status === "in_progress" ? (
        <div className="loading-skeleton h-8 rounded-lg"></div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-panel-gray text-text-muted border-border-gray cursor-not-allowed"
            disabled
            data-testid={`button-waiting-${asset.id}`}
          >
            {t('common.loading')}
          </Button>
        </div>
      )}
    </div>
  );
}
