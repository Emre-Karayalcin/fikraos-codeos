import React, { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from 'react-hot-toast';
import { Palette, Upload, Globe, FileText, Sparkles, X, Download, Eye, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

const workspaceSettingsSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens").optional()
});

type WorkspaceSettingsForm = z.infer<typeof workspaceSettingsSchema>;

interface CriteriaFile {
  id: string;
  name: string;
  path: string;
  uploadedAt: string;
  uploadedBy: string;
  size: number;
  mimetype: string;
}

interface WorkspaceSettingsProps {
  orgId: string;
  currentOrg: any;
}

export default function WorkspaceSettings({ orgId, currentOrg }: WorkspaceSettingsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [evaluationCriteria, setEvaluationCriteria] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CriteriaFile | null>(null);
  const [viewFileContent, setViewFileContent] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current evaluation criteria (old system - for backward compatibility)
  const { data: metricsSet } = useQuery({
    queryKey: ['/api/organizations', orgId, 'metrics'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${orgId}/metrics`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!orgId
  });

  // ✅ NEW: Fetch all uploaded criteria files
  const { data: criteriaFiles, isLoading: filesLoading } = useQuery<{ files: CriteriaFile[] }>({
    queryKey: ['/api/organizations', orgId, 'criteria-files'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${orgId}/criteria-files`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch criteria files');
      return response.json();
    },
    enabled: !!orgId
  });

  // ✅ NEW: Fetch saved criteria text
  const { data: savedCriteriaText, isLoading: criteriaTextLoading } = useQuery({
    queryKey: ['/api/organizations', orgId, 'evaluation-criteria-text'],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${orgId}/evaluation-criteria-text`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch criteria text');
      return response.json();
    },
    enabled: !!orgId
  });

  const form = useForm<WorkspaceSettingsForm>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      logoUrl: currentOrg?.logoUrl || "",
      primaryColor: currentOrg?.primaryColor || "#4588f5",
      slug: currentOrg?.slug || ""
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: WorkspaceSettingsForm) => {
      const response = await fetch(`/api/organizations/${orgId}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(`${t('admin.settings-page.success.title')} — ${t('admin.settings-page.success.description')}`);
      
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations']
      });
    },
    onError: (error: Error) => {
      toast.error(`${t('admin.settings-page.error.title')} — ${error.message}`);
    }
  });

  const onSubmit = (data: WorkspaceSettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  // ✅ NEW: Upload JSON file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('criteria', file);

      const response = await fetch(`/api/organizations/${orgId}/upload-criteria`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`${t('admin.criteria.upload.success.title')} — ${data.file.name}`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh files list
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', orgId, 'criteria-files']
      });
    },
    onError: (error: Error) => {
      toast.error(`${t('admin.criteria.upload.error.title')} — ${error.message}`);
    }
  });

  // ✅ NEW: Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/organizations/${orgId}/criteria-files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete file');
      }

      return response.json();
    },
    onSuccess: (data, fileId) => {
      toast.success(`${t('admin.criteria.delete.success.title')} — ${t('admin.criteria.delete.success.description')}`);
      
      // Refresh files list
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', orgId, 'criteria-files']
      });
    },
    onError: (error: Error) => {
      toast.error(`${t('admin.criteria.delete.error.title')} — ${error.message}`);
    }
  });

  // ✅ NEW: View file content
  const viewFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/organizations/${orgId}/criteria-files/${fileId}/content`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch file content');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setViewFileContent(data);
      setIsViewDialogOpen(true);
    },
    onError: (error: Error) => {
      toast.error(`${t('admin.criteria.view.error.title')} — ${error.message}`);
    }
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      toast.error(`${t('admin.criteria.validation.invalidType.title')} — ${t('admin.criteria.validation.invalidType.description')}`);
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`${t('admin.criteria.validation.tooLarge.title')} — ${t('admin.criteria.validation.tooLarge.description')}`);
      return;
    }

    uploadFileMutation.mutate(file);
  };

  // Handle delete file
  const handleDeleteFile = (fileId: string, fileName: string) => {
    if (confirm(`${t('admin.criteria.delete.confirm')} "${fileName}"?`)) {
      deleteFileMutation.mutate(fileId);
    }
  };

  // Handle view file
  const handleViewFile = (fileId: string) => {
    viewFileMutation.mutate(fileId);
  };

  // Old system: Upload criteria as text
  const uploadEvaluationCriteria = useMutation({
    mutationFn: async (criteria: string) => {
      const response = await fetch(`/api/organizations/${orgId}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ criteria })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload evaluation criteria');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(`${t('admin.criteria.legacy.success.title')} — ${t('admin.criteria.legacy.success.description')}`);
      setEvaluationCriteria("");
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', orgId, 'metrics']
      });
    },
    onError: (error: Error) => {
      toast.error(`${t('admin.criteria.legacy.error.title')} — ${error.message}`);
    }
  });

  const handleUploadCriteria = () => {
    if (!evaluationCriteria.trim()) {
      toast.error(`${t('admin.criteria.validation.empty.title')} — ${t('admin.criteria.validation.empty.description')}`);
      return;
    }
    uploadEvaluationCriteria.mutate(evaluationCriteria);
  };

  // ✅ NEW: Save criteria text mutation
  const saveCriteriaTextMutation = useMutation({
    mutationFn: async (criteriaText: string) => {
      const response = await fetch(`/api/organizations/${orgId}/evaluation-criteria-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ criteriaText })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save criteria');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(`${t('admin.criteria.text.success.title')} — ${t('admin.criteria.text.success.description')}`);
      setHasUnsavedChanges(false);
      
      // Refresh saved criteria
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations', orgId, 'evaluation-criteria-text']
      });
    },
    onError: (error: Error) => {
      toast.error(`${t('admin.criteria.text.error.title')} — ${error.message}`);
    }
  });

  // ✅ Initialize textarea with saved value
  React.useEffect(() => {
    if (savedCriteriaText?.criteriaText) {
      setEvaluationCriteria(savedCriteriaText.criteriaText);
      setHasUnsavedChanges(false);
    }
  }, [savedCriteriaText]);

  // ✅ Handle textarea change
  const handleCriteriaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEvaluationCriteria(newValue);
    
    // Check if there are unsaved changes
    const isDifferent = newValue.trim() !== (savedCriteriaText?.criteriaText || '').trim();
    setHasUnsavedChanges(isDifferent);
  };

  // ✅ Handle save button click - UPDATED: Allow empty text
  const handleSaveCriteriaText = () => {
    const trimmedValue = evaluationCriteria.trim();
    
    // ✅ Allow empty text - just save it
    if (trimmedValue === '') {
      saveCriteriaTextMutation.mutate('');
      return;
    }

    // Validate JSON format only if text is not empty
    try {
      JSON.parse(trimmedValue);
    } catch (e) {
      toast.error(`${t('admin.criteria.validation.invalidJson.title')} — ${t('admin.criteria.validation.invalidJson.description')}`);
      return;
    }

    saveCriteriaTextMutation.mutate(trimmedValue);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(t('common.locale') || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-workspace-settings-title">
            <Globe className="w-5 h-5" />
            {t('admin.settings-page.title')}
          </CardTitle>
          <CardDescription>
            {t('admin.settings-page.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {t('admin.settings-page.logoUrl.label')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('admin.settings-page.logoUrl.placeholder')}
                        {...field}
                        data-testid="input-logo-url"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('admin.settings-page.logoUrl.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      {t('admin.settings-page.primaryColor.label')}
                    </FormLabel>
                    <div className="flex gap-3 items-center">
                      <FormControl>
                        <Input
                          type="color"
                          {...field}
                          className="w-20 h-10"
                          data-testid="input-primary-color"
                        />
                      </FormControl>
                      <FormControl>
                        <Input
                          placeholder="#4588f5"
                          {...field}
                          className="flex-1"
                          data-testid="input-primary-color-text"
                        />
                      </FormControl>
                    </div>
                    <FormDescription>
                      {t('admin.settings-page.primaryColor.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.settings-page.slug.label')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="text-sm text-text-secondary mr-2">
                          workspace.com/
                        </span>
                        <Input
                          placeholder="my-workspace"
                          {...field}
                          className="flex-1"
                          data-testid="input-workspace-slug"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t('admin.settings-page.slug.description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {(form.watch("logoUrl") || form.watch("primaryColor")) && (
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-preview-title">{t('admin.settings-page.preview.title')}</CardTitle>
            <CardDescription>
              {t('admin.settings-page.preview.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 border rounded-lg" data-testid="card-workspace-preview">
              {form.watch("logoUrl") && (
                <img
                  src={form.watch("logoUrl")}
                  alt="Workspace Logo"
                  className="w-12 h-12 rounded-lg object-cover"
                  data-testid="img-preview-logo"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg" data-testid="text-preview-name">
                  {currentOrg?.name || "Workspace Name"}
                </h3>
                <div
                  className="w-16 h-2 rounded-full mt-2"
                  style={{ backgroundColor: form.watch("primaryColor") }}
                  data-testid="div-preview-color"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ NEW: Evaluation Criteria Card with File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('admin.criteria.title')}
          </CardTitle>
          <CardDescription>
            {t('admin.criteria.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                id="criteria-file-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadFileMutation.isPending}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadFileMutation.isPending ? t('admin.criteria.uploading') : t('admin.criteria.upload.button')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('admin.criteria.upload.hint')}
              </p>
            </div>

            {/* ✅ Uploaded Files List as Tags */}
            {filesLoading ? (
              <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
            ) : criteriaFiles?.files && criteriaFiles.files.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {t('admin.criteria.files.label')} ({criteriaFiles.files.length})
                  </label>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {criteriaFiles.files.map((file) => (
                    <Badge
                      key={file.id}
                      variant="secondary"
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="max-w-[200px] truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleViewFile(file.id)}
                          className="hover:text-primary transition-colors"
                          title={t('admin.criteria.files.view')}
                          disabled={viewFileMutation.isPending}
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="hover:text-destructive transition-colors"
                          title={t('admin.criteria.files.delete')}
                          disabled={deleteFileMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {t('admin.criteria.files.hint')}
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                {t('admin.criteria.files.empty')}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('admin.criteria.legacy.divider')}
              </span>
            </div>
          </div>

          {/* ✅ Legacy: Current Criteria Display */}
          {metricsSet && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('admin.criteria.legacy.current')}</span>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                {JSON.stringify(metricsSet.payload, null, 2)}
              </pre>
            </div>
          )}

          {/* ✅ UPDATED: Text Input with Save Button */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('admin.criteria.legacy.label')}</label>
            <Textarea
              placeholder={t('admin.criteria.legacy.placeholder')}
              value={evaluationCriteria}
              onChange={handleCriteriaChange}
              rows={8}
              className="font-mono text-sm"
              disabled={criteriaTextLoading}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.criteria.legacy.hint')}
            </p>
            
            {/* ✅ Show save button when there are unsaved changes */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
                  {t('admin.criteria.text.unsavedChanges')}
                </p>
                <Button
                  onClick={handleSaveCriteriaText}
                  disabled={saveCriteriaTextMutation.isPending}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {saveCriteriaTextMutation.isPending 
                    ? t('common.saving') 
                    : t('admin.criteria.text.save')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ✅ NEW: View File Content Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.criteria.view.title')}</DialogTitle>
            <DialogDescription>
              {viewFileContent?.file?.name || t('admin.criteria.view.description')}
            </DialogDescription>
          </DialogHeader>
          
          {viewFileContent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{t('admin.criteria.view.uploaded')}: {formatDate(viewFileContent.file.uploadedAt)}</span>
                <span>•</span>
                <span>{t('admin.criteria.view.by')}: {viewFileContent.file.uploadedBy}</span>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(viewFileContent.content, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}