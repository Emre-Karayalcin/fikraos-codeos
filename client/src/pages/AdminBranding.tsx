import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Palette, Save, Upload } from 'lucide-react';
import { useRef } from 'react';
import toast from 'react-hot-toast';

export default function AdminBranding() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const darkFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDark, setIsUploadingDark] = useState(false);

  // Get workspace by slug first
  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug
  });

  // Fetch organization data using workspace ID
  const { data: org, isLoading } = useQuery({
    queryKey: ['/api/organizations', workspace?.id],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${workspace?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch organization');
      return response.json();
    },
    enabled: !!workspace?.id
  });

  const [formData, setFormData] = useState({
    logoUrl: '',
    darkLogoUrl: '',
    primaryColor: '#4588f5'
  });

  React.useEffect(() => {
    if (org) {
      setFormData({
        logoUrl: org.logoUrl || '',
        darkLogoUrl: org.darkLogoUrl || '',
        primaryColor: org.primaryColor || '#4588f5'
      });
    }
  }, [org]);

  // Update organization mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/organizations/${workspace?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', workspace?.id] });
      toast.success(t('admin.branding.success.description'));
    },
    onError: () => {
      toast.error(t('admin.branding.error.description'));
    }
  });

  // Upload logo mutation
  const uploadDarkLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Try both variations to see which one works
      const darkLogoUrl = data.url.startsWith('http') ? data.url : `${window.location.origin}${data.url}`;
      
      setFormData(prev => {
        const updated = { ...prev, darkLogoUrl };
        return updated;
      });
      
      setIsUploadingDark(false);
      toast.success(t('admin.branding.upload.success.description'));
      
      // ✅ Auto-save after upload (optional but recommended)
      // This ensures the logo is saved immediately
      setTimeout(() => {
        updateMutation.mutate({ ...formData, darkLogoUrl });
      }, 500);
    },
    onError: (error: Error) => {
      setIsUploadingDark(false);
      toast.error(error.message || t('admin.branding.upload.error.description'));
    }
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Try both variations to see which one works
      const logoUrl = data.url.startsWith('http') ? data.url : `${window.location.origin}${data.url}`;
      
      setFormData(prev => {
        const updated = { ...prev, logoUrl };
        return updated;
      });
      
      setIsUploading(false);
      toast.success(t('admin.branding.upload.success.description'));
      
      // ✅ Auto-save after upload (optional but recommended)
      // This ensures the logo is saved immediately
      setTimeout(() => {
        updateMutation.mutate({ ...formData, logoUrl });
      }, 500);
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast.error(error.message || t('admin.branding.upload.error.description'));
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('admin.branding.validation.fileSize.description'));
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('admin.branding.validation.fileType.description'));
      return;
    }

    setIsUploading(true);
    uploadLogoMutation.mutate(file);
  };


  const handleDarkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('admin.branding.validation.fileSize.description'));
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('admin.branding.validation.fileType.description'));
      return;
    }

    setIsUploadingDark(true);
    uploadDarkLogoMutation.mutate(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug!} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 flex-row">
            <Palette className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold ltr:text-left rtl:text-right">
                {t('admin.branding.header.title')}
              </h1>
              <p className="text-muted-foreground ltr:text-left rtl:text-right">
                {t('admin.branding.header.subtitle')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="ltr:text-left rtl:text-right">
                  {t('admin.branding.logo.title')}
                </CardTitle>
                <CardDescription className="ltr:text-left rtl:text-right">
                  {t('admin.branding.logo.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl" className="ltr:text-left rtl:text-right">
                    {t('admin.branding.logo.urlLabel')}
                  </Label>
                  <div className="flex gap-2 flex-row">
                    <Input
                      id="logoUrl"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      placeholder={t('admin.branding.logo.urlPlaceholder')}
                      dir="ltr"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading 
                        ? t('admin.branding.logo.uploading')
                        : t('admin.branding.logo.upload')
                      }
                    </Button>
                  </div>
                </div>

                {formData.logoUrl && (
                  <div className="mt-4">
                    <Label className="ltr:text-left rtl:text-right">
                      {t('admin.branding.logo.preview')}
                    </Label>
                    <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50">
                      <img
                        src={formData.logoUrl}
                        alt={t('admin.branding.logo.previewAlt')}
                        className="h-16 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" text-anchor="middle" dy=".3em">Invalid URL</text></svg>';
                        }}
                      />
                    </div>
                  </div>
                )}

              {/* Dark logo field */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="darkLogoUrl" className="ltr:text-left rtl:text-right">
                  {t('admin.branding.logo.darkLabel') || 'Dark logo URL'}
                </Label>
                <div className="flex gap-2 flex-row">
                  <Input
                    id="darkLogoUrl"
                    value={formData.darkLogoUrl}
                    onChange={(e) => setFormData({ ...formData, darkLogoUrl: e.target.value })}
                    placeholder={t('admin.branding.logo.urlPlaceholder')}
                    dir="ltr"
                  />
                  <input
                    ref={darkFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDarkFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => darkFileInputRef.current?.click()}
                    disabled={isUploadingDark}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploadingDark 
                      ? t('admin.branding.logo.uploading')
                      : t('admin.branding.logo.upload')
                    }
                  </Button>
                </div>


              {formData.darkLogoUrl && (
                <div className="mt-4">
                  <Label className="ltr:text-left rtl:text-right">
                    {t('admin.branding.logo.darkPreview') || 'Dark logo preview'}
                  </Label>
                  <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50">
                    <img
                      src={formData.darkLogoUrl}
                      alt={t('admin.branding.logo.previewAlt')}
                      className="h-16 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" text-anchor="middle" dy=".3em">Invalid URL</text></svg>';
                      }}
                    />
                  </div>
                </div>
              )}
              </div>
              </CardContent>
            </Card>

            {/* Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="ltr:text-left rtl:text-right">
                  {t('admin.branding.colors.title')}
                </CardTitle>
                <CardDescription className="ltr:text-left rtl:text-right">
                  {t('admin.branding.colors.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor" className="ltr:text-left rtl:text-right">
                    {t('admin.branding.colors.primaryLabel')}
                  </Label>
                  <div className="flex gap-4 items-center flex-row">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      placeholder="#4588f5"
                      className="flex-1"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Color preview */}
                <div className="mt-4">
                  <Label className="ltr:text-left rtl:text-right">
                    {t('admin.branding.colors.preview')}
                  </Label>
                  <div className="mt-2 grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div
                        className="h-16 rounded-lg"
                        style={{ backgroundColor: formData.primaryColor }}
                      />
                      <p className="text-xs text-center text-muted-foreground">
                        {t('admin.branding.colors.variants.primary')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div
                        className="h-16 rounded-lg"
                        style={{ backgroundColor: `${formData.primaryColor}E6` }}
                      />
                      <p className="text-xs text-center text-muted-foreground">
                        {t('admin.branding.colors.variants.hover')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div
                        className="h-16 rounded-lg border-2"
                        style={{ borderColor: formData.primaryColor }}
                      />
                      <p className="text-xs text-center text-muted-foreground">
                        {t('admin.branding.colors.variants.outline')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div
                        className="h-16 rounded-lg flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        {t('admin.branding.colors.variants.button')}
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        {t('admin.branding.colors.variants.button')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex ltr:justify-end rtl:justify-start">
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending 
                  ? t('admin.branding.saving')
                  : t('admin.branding.save')
                }
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}