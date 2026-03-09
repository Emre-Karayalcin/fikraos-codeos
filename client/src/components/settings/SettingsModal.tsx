import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  Palette, 
  Globe, 
  Bell, 
  Shield, 
  Download,
  Trash2,
  Save,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX
} from 'lucide-react';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar';
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  autoSave: boolean;
  dataRetention: '30' | '90' | '365' | 'forever';
  profileVisibility: 'public' | 'private';
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<UserProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    profileImageUrl: user?.profileImageUrl || ''
  });

  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    language: 'en',
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: true,
    autoSave: true,
    dataRetention: '365',
    profileVisibility: 'private'
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [settings]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (profileData: UserProfile) => 
      apiRequest('PATCH', '/api/user/profile', profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        title: t('settings.updateFailed'), 
        description: error.message || t('settings.updateFailedDesc'),
        variant: "destructive"
      });
    }
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/user/export'),
    onSuccess: (data: any) => {
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fikrahub-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: t('settings.dataExported'),
        description: t('settings.dataExportedDesc')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('settings.exportFailed'),
        description: error.message || t('settings.exportFailedDesc'),
        variant: "destructive"
      });
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/user/delete'),
    onSuccess: () => {
      toast({
        title: t('settings.accountDeleted'),
        description: t('settings.accountDeletedDesc')
      });
      // Redirect to home or login page
      window.location.href = '/';
    },
    onError: (error: any) => {
      toast({
        title: t('settings.deletionFailed'),
        description: error.message || t('settings.deletionFailedDesc'),
        variant: "destructive"
      });
    }
  });

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profile);
  };

  const handleSettingsChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply theme immediately
    if (key === 'theme') {
      const root = document.documentElement;
      if (value === 'dark') {
        root.classList.add('dark');
      } else if (value === 'light') {
        root.classList.remove('dark');
      } else {
        // System theme
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    }

    toast({
      title: t('settings.settingsUpdated'),
      description: t('settings.settingsUpdatedDesc')
    });
  };

  const handleExportData = () => {
    exportDataMutation.mutate();
  };

  const handleDeleteAccount = () => {
    if (confirm(t('settings.deleteConfirmation'))) {
      deleteAccountMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-hidden settings-modal ${isRTL ? 'rtl' : 'ltr'}`}>
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <User className="w-6 h-6" />
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {t('settings.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-6 h-12 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-3 px-4 text-sm">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2 py-3 px-4 text-sm">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.theme')}</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2 py-3 px-4 text-sm">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.language')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-3 px-4 text-sm">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.alerts')}</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2 py-3 px-4 text-sm">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.privacy')}</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2 py-3 px-4 text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.data')}</span>
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto flex-1 pr-2">
            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6 mt-0 p-1">
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">{t('auth.firstName')}</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                      data-testid="input-firstname"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">{t('auth.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                      data-testid="input-lastname"
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-email"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileImage" className="text-sm font-medium">{t('settings.profileImage')}</Label>
                  <Input
                    id="profileImage"
                    value={profile.profileImageUrl}
                    onChange={(e) => setProfile(prev => ({ ...prev, profileImageUrl: e.target.value }))}
                    placeholder={t('settings.profileImagePlaceholder')}
                    data-testid="input-profile-image"
                    className="h-10"
                  />
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={handleProfileSave} 
                    disabled={updateProfileMutation.isPending}
                    className="px-6 py-2 h-10"
                    data-testid="button-save-profile"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? t('settings.saving') : t('settings.saveProfile')}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-6 mt-0 p-1">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('settings.theme')}</Label>
                  <Select 
                    value={settings.theme} 
                    onValueChange={(value: 'light' | 'dark' | 'system') => 
                      handleSettingsChange('theme', value)
                    }
                  >
                    <SelectTrigger data-testid="select-theme" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          {t('theme.light')}
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4" />
                          {t('theme.dark')}
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          {t('theme.system')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Language Settings */}
            <TabsContent value="language" className="space-y-6 mt-0 p-1">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('settings.language')}</Label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value: 'en' | 'ar') => 
                      handleSettingsChange('language', value)
                    }
                  >
                    <SelectTrigger data-testid="select-language" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('language.english')}</SelectItem>
                      <SelectItem value="ar">{t('language.arabic')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6 mt-0 p-1">
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t('settings.emailNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.emailNotificationsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => 
                      handleSettingsChange('emailNotifications', checked)
                    }
                    data-testid="switch-email-notifications"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('settings.pushNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.pushNotificationsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => 
                      handleSettingsChange('pushNotifications', checked)
                    }
                    data-testid="switch-push-notifications"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <div>
                      <Label>{t('settings.soundEffects')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.soundEffectsDesc')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => 
                      handleSettingsChange('soundEnabled', checked)
                    }
                    data-testid="switch-sound-enabled"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy" className="space-y-6 mt-0 p-1">
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t('settings.autoSave')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.autoSaveDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSave}
                    onCheckedChange={(checked) => 
                      handleSettingsChange('autoSave', checked)
                    }
                    data-testid="switch-auto-save"
                  />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('settings.profileVisibility')}</Label>
                  <Select 
                    value={settings.profileVisibility} 
                    onValueChange={(value: 'public' | 'private') => 
                      handleSettingsChange('profileVisibility', value)
                    }
                  >
                    <SelectTrigger data-testid="select-profile-visibility" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">{t('settings.public')}</SelectItem>
                      <SelectItem value="private">{t('settings.private')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('settings.dataRetention')}</Label>
                  <Select 
                    value={settings.dataRetention} 
                    onValueChange={(value: '30' | '90' | '365' | 'forever') => 
                      handleSettingsChange('dataRetention', value)
                    }
                  >
                    <SelectTrigger data-testid="select-data-retention" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">{t('settings.30days')}</SelectItem>
                      <SelectItem value="90">{t('settings.90days')}</SelectItem>
                      <SelectItem value="365">{t('settings.1year')}</SelectItem>
                      <SelectItem value="forever">{t('settings.forever')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Data Management */}
            <TabsContent value="data" className="space-y-6 mt-0 p-1">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t('settings.exportData')}</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t('settings.exportDataDesc')}
                  </p>
                  <Button 
                    onClick={handleExportData}
                    disabled={exportDataMutation.isPending}
                    variant="outline"
                    className="px-6 py-2 h-10"
                    data-testid="button-export-data"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {exportDataMutation.isPending ? t('settings.exporting') : t('settings.exportData')}
                  </Button>
                </div>
                <Separator />
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <h3 className="text-lg font-semibold mb-3 text-destructive">
                    {t('settings.dangerZone')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t('settings.deleteAccountDesc')}
                  </p>
                  <Button 
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending}
                    variant="destructive"
                    className="px-6 py-2 h-10"
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteAccountMutation.isPending ? t('settings.deleting') : t('settings.deleteAccount')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}