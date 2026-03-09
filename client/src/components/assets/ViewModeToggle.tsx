import { LayoutGrid, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ViewModeToggleProps {
  mode: 'hub' | 'chat';
  onChange: (mode: 'hub' | 'chat') => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => onChange('hub')}
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
          mode === 'hub'
            ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        )}
        title={t('assets.viewMode.hub')}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">{t('assets.viewMode.hub')}</span>
      </button>
      <button
        onClick={() => onChange('chat')}
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
          mode === 'chat'
            ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        )}
        title={t('assets.viewMode.chat')}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">{t('assets.viewMode.chat')}</span>
      </button>
    </div>
  );
}
