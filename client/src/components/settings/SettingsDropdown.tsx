import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings, Moon, Sun, Languages, Check, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SettingsDropdownProps {
  onOpenFullSettings?: () => void;
}

export function SettingsDropdown({ onOpenFullSettings }: SettingsDropdownProps) {
  const { t } = useTranslation();
  const { language, changeLanguage, isRTL } = useLanguage();
  const { user, logout } = useAuth();

  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
          data-testid="button-settings"
          title={t('settings.title')}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-64 p-0 border-gray-200 dark:border-gray-700 shadow-lg" 
        align={isRTL ? "start" : "end"}
        sideOffset={8}
      >
        <div className="p-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Header */}
          <div className="mb-3">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
              {t('settings.quickSettings')}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('settings.essentialOptions')}
            </p>
          </div>
          
          <div className="space-y-3">

            {/* Language Selection */}
            <div className="space-y-1">
              <div className="flex items-center gap-3 p-2">
                <Languages className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {t('settings.language')}
                </span>
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full text-left px-8 py-1.5 rounded-lg transition-colors ${
                    language === lang.code
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  data-testid={`language-option-${lang.code}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{lang.nativeName}</span>
                    {language === lang.code && (
                      <Check className="w-3 h-3" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {user && (
              <>
                {/* Separator */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-3" />
                
                {/* User Info */}
                <div className="flex items-center gap-3 p-2 text-xs text-gray-600 dark:text-gray-400">
                  <User className="w-3 h-3" />
                  <span>{user.username}</span>
                </div>

                {/* Logout */}
                <button
                  onClick={() => logout()}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-red-600 dark:text-red-400"
                  data-testid="button-logout-dropdown"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">{t('auth.logout')}</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}