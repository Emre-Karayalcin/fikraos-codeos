import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, Search } from "lucide-react";

export type InputMode = 'develop' | 'research' | 'launch';

interface ModeSelectorProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const { t } = useTranslation();

  // Persist mode in localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('fikrahub-input-mode') as InputMode;
    if (savedMode && (savedMode === 'develop' || savedMode === 'research')) {
      onModeChange(savedMode);
    }
  }, [onModeChange]);

  useEffect(() => {
    localStorage.setItem('fikrahub-input-mode', mode);
  }, [mode]);

  return (
    <div className="flex items-center justify-center mb-4">
      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onModeChange('develop')}
          className={`
            inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${mode === 'develop' 
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-600' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }
          `}
          data-testid="mode-develop"
        >
          <Lightbulb className="w-4 h-4" />
          Develop an idea
        </button>
        <button
          onClick={() => onModeChange('research')}
          className={`
            inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${mode === 'research' 
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-600' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }
          `}
          data-testid="mode-research"
        >
          <Search className="w-4 h-4" />
          Search for an idea
        </button>
      </div>
    </div>
  );
}