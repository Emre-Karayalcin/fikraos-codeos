import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

export default function ThemeSelector() {
  const { t } = useTranslation();
  const { theme, setTheme, actualTheme } = useTheme();

  const themeOptions: ThemeOption[] = [
    {
      id: 'light',
      name: t('theme.light') || 'Light',
      description: 'Clean and bright interface for daytime use',
      icon: Sun,
      color: 'text-yellow-500'
    },
    {
      id: 'dark', 
      name: t('theme.dark') || 'Dark',
      description: 'Easy on the eyes with dark backgrounds',
      icon: Moon,
      color: 'text-blue-500'
    },
    {
      id: 'system',
      name: t('theme.system') || 'System',
      description: 'Automatically matches your device settings',
      icon: Monitor,
      color: 'text-gray-500'
    }
  ];

  const selectedThemeData = themeOptions.find(option => option.id === theme);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
          data-testid="button-theme-mode"
          title="Theme Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0 border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800" 
        align="end"
        sideOffset={8}
      >
        <div className="p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">Theme</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Choose your interface appearance</p>
          </div>
          
          <div className="space-y-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setTheme(option.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 ring-2 ring-blue-500/20' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  data-testid={`theme-${option.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${option.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{option.name}</span>
                        {isSelected && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-600">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Settings className="w-3 h-3" />
              <span>Current: </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {selectedThemeData?.name} {theme === 'system' && `(${actualTheme})`}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}