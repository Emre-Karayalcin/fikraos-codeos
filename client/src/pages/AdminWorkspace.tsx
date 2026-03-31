import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Building2, Save } from 'lucide-react';
import { ProgramProgressManager } from '@/components/admin/ProgramProgressManager';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { getCsrfToken } from '@/lib/csrf';

export default function AdminWorkspace() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const qc = useQueryClient();

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
    name: '',
    dashboardEnabled: true,
    challengesEnabled: true,
    expertsEnabled: true,
    radarEnabled: true,
    aiBuilderEnabled: true,
    formSubmissionEnabled: true,
    manualBuildEnabled: true,
    academyEnabled: true
    // defaultRoute will store the selected default page key (e.g. 'navigation.dashboard')
    , defaultRoute: 'navigation.dashboard'
  });

  React.useEffect(() => {
    if (org) {
      setFormData({
        name: org.name || '',
        dashboardEnabled: org.dashboardEnabled ?? true,
        challengesEnabled: org.challengesEnabled ?? true,
        expertsEnabled: org.expertsEnabled ?? true,
        radarEnabled: org.radarEnabled ?? true,
        aiBuilderEnabled: org.aiBuilderEnabled ?? true,
        formSubmissionEnabled: org.formSubmissionEnabled ?? true,
        manualBuildEnabled: org.manualBuildEnabled ?? true,
        academyEnabled: org.academyEnabled ?? true,
        // try multiple possible server fields, fallback to navigation.dashboard
        defaultRoute: org.defaultRoute || org.defaultPage || org.default_home || 'navigation.dashboard'
      });
    }
  }, [org]);

  // ROUTE NAMES editable UI
  // include a prefix used to map into organization fields (e.g. dashboardNameEn)
  const editableRoutesDefault = [
    { key: 'navigation.dashboard', prefix: 'dashboard', path: '/dashboard', label: { en: 'Dashboard', ar: 'لوحة القيادة' } },
    { key: 'navigation.myIdeas', prefix: 'myIdeas', path: '/my-ideas', label: { en: 'My Ideas', ar: 'أفكاري' }, desc: { en: 'Manage and track all your project ideas', ar: 'إدارة وتتبع جميع أفكار مشاريعك' } },
    { key: 'navigation.challenges', prefix: 'challenges', path: '/challenges', label: { en: 'Sectors', ar: 'القطاعات' }, desc: { en: 'Join innovative sectors and compete with entrepreneurs across the MENA region', ar: 'انضم إلى قطاعات مبتكرة وتنافس مع رواد الأعمال في منطقة الشرق الأوسط وشمال أفريقيا' } },
    { key: 'navigation.radar', prefix: 'radar', path: '/radar', label: { en: 'Radar', ar: 'الرادار' }, desc: { en: 'Stay updated with the latest developments in MENA technology, innovation, and business', ar: 'ابقَ على اطلاع بأحدث التطورات في تكنولوجيا وابتكار وأعمال منطقة الشرق الأوسط وشمال أفريقيا' } },
    { key: 'navigation.experts', prefix: 'experts', path: '/experts', title: { en: 'Talk to Experts', ar: 'تحدث إلى الخبراء' }, label: { en: 'Experts', ar: 'الخبراء' }, desc: { en: 'Get personalized advice from industry specialists', ar: 'احصل على نصائح شخصية من المتخصصين في الصناعة' } }
  ];

  const [routesState, setRoutesState] = useState(() =>
    editableRoutesDefault.reduce((acc, r) => {
      const enLabel = r.label?.en ?? '';
      const arLabel = r.label?.ar ?? '';
      const enDesc = (r as any).desc?.en ?? '';
      const arDesc = (r as any).desc?.ar ?? '';
      const enTitle = (r as any).title?.en ?? '';
      const arTitle = (r as any).title?.ar ?? '';
      acc[r.key] = {
        key: r.key,
        prefix: (r as any).prefix,
        enName: enLabel,
        arName: arLabel,
        enDesc,
        arDesc,
        enTitle,
        arTitle,
        original: { enName: enLabel, arName: arLabel, enDesc, arDesc, enTitle, arTitle },
        path: r.path
      };
      return acc;
    }, {} as Record<string, any>)
  );

  // explicit reference to dashboard entry to simplify rendering and avoid IIFE issues
  const dashboardEntry = routesState && routesState['navigation.dashboard'] ? routesState['navigation.dashboard'] : null;

  // populate routesState from organization detail (org) — do NOT fetch /routes
  useEffect(() => {
    if (!org) return;
    setRoutesState(prev => {
      const updated: Record<string, any> = { ...prev };
      // use organization-level fields (e.g. dashboardNameEn) as source of truth when present
      editableRoutesDefault.forEach((def) => {
        const p = (def as any).prefix;
        const key = def.key;
        if (!p || !updated[key]) return;
        const nameEnField = `${p}NameEn`;
        const nameArField = `${p}NameAr`;
        const descEnField = `${p}DescEn`;
        const descArField = `${p}DescAr`;
        const titleEnField = `${p}TitleEn`;
        const titleArField = `${p}TitleAr`;

        updated[key] = {
          ...updated[key],
          enName: (org as any)[nameEnField] ?? updated[key].enName,
          arName: (org as any)[nameArField] ?? updated[key].arName,
          enDesc: (org as any)[descEnField] ?? updated[key].enDesc,
          arDesc: (org as any)[descArField] ?? updated[key].arDesc,
          enTitle: (org as any)[titleEnField] ?? updated[key].enTitle,
          arTitle: (org as any)[titleArField] ?? updated[key].arTitle,
          original: {
            enName: (org as any)[nameEnField] ?? updated[key].original.enName,
            arName: (org as any)[nameArField] ?? updated[key].original.arName,
            enDesc: (org as any)[descEnField] ?? updated[key].original.enDesc,
            arDesc: (org as any)[descArField] ?? updated[key].original.arDesc,
            enTitle: (org as any)[titleEnField] ?? updated[key].original.enTitle,
            arTitle: (org as any)[titleArField] ?? updated[key].original.arTitle
          }
        };
      });
      return updated;
    });
  }, [org]);

  // Update default route immediately when changed (single-field PATCH)
  const updateDefaultRouteMutation = useMutation({
    mutationFn: async (payload: { orgId: string; defaultRoute: string }) => {
      const res = await fetch(`/api/organizations/${payload.orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ defaultRoute: payload.defaultRoute })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed' }));
        throw new Error(err.message || 'Failed to update default route');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/organizations', org?.id] });
      toast({ title: t('admin.workspace.defaultPage.updated') ?? 'Default page updated' });
    },
    onError: (err: any) => {
      toast({ title: t('admin.workspace.error.title') ?? 'Error', description: err?.message || 'Failed to update default page', variant: 'destructive' });
    }
  });

  // Update organization mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const csrfToken = getCsrfToken();
      const response = await fetch(`/api/organizations/${workspace?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', workspace?.id] });
      toast({
        title: t('admin.workspace.success.title'),
        description: t('admin.workspace.success.description')
      });
    },
    onError: () => {
      toast({
        title: t('admin.workspace.error.title'),
        description: t('admin.workspace.error.description'),
        variant: 'destructive'
      });
    }
  });

  // Build payload for update (used by form submit and fixed Save button)
  const buildOrgPayload = () => {
    const routeFields: Record<string, any> = {};
    Object.values(routesState).forEach((r: any) => {
      const prefix = r.prefix;
      if (!prefix) return;
      routeFields[`${prefix}NameEn`] = r.enName;
      routeFields[`${prefix}NameAr`] = r.arName;
      routeFields[`${prefix}DescEn`] = r.enDesc ?? '';
      routeFields[`${prefix}DescAr`] = r.arDesc ?? '';
      if (r.enTitle !== undefined || r.arTitle !== undefined) {
        routeFields[`${prefix}TitleEn`] = r.enTitle ?? '';
        routeFields[`${prefix}TitleAr`] = r.arTitle ?? '';
      }
    });
    return { ...formData, ...routeFields };
  };

  // Called when user clicks Save (fixed button) or submits form
  const saveAll = () => {
    const payload = buildOrgPayload();
    updateMutation.mutate(payload);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAll();
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

      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto p-6 space-y-6 pb-28"> {/* pad bottom so fixed Save doesn't cover content */}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="ltr:text-left rtl:text-right">
                  {t('admin.workspace.basic.title')}
                </CardTitle>
                <CardDescription className="ltr:text-left rtl:text-right">
                  {t('admin.workspace.basic.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="ltr:text-left rtl:text-right">
                    {t('admin.workspace.basic.name')}
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('admin.workspace.basic.namePlaceholder')}
                    dir="auto"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Feature Toggles */}
            <Card>
              <CardHeader>
                <CardTitle className="ltr:text-left rtl:text-right">
                  {t('admin.workspace.features.title')}
                </CardTitle>
                <CardDescription className="ltr:text-left rtl:text-right">
                  {t('admin.workspace.features.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between flex-row">
                  <div className="space-y-0.5 ltr:text-left rtl:text-right">
                    <Label htmlFor="dashboard">
                      {t('admin.workspace.features.dashboard.label')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.workspace.features.dashboard.description')}
                    </p>
                  </div>
                  <Switch
                    id="dashboard"
                    checked={formData.dashboardEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, dashboardEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between flex-row">
                  <div className="space-y-0.5 ltr:text-left rtl:text-right">
                    <Label htmlFor="challenges">
                      {t('admin.workspace.features.challenges.label')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.workspace.features.challenges.description')}
                    </p>
                  </div>
                  <Switch
                    id="challenges"
                    checked={formData.challengesEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, challengesEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between flex-row">
                  <div className="space-y-0.5 ltr:text-left rtl:text-right">
                    <Label htmlFor="experts">
                      {t('admin.workspace.features.experts.label')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.workspace.features.experts.description')}
                    </p>
                  </div>
                  <Switch
                    id="experts"
                    checked={formData.expertsEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, expertsEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between flex-row">
                  <div className="space-y-0.5 ltr:text-left rtl:text-right">
                    <Label htmlFor="radar">
                      {t('admin.workspace.features.radar.label')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.workspace.features.radar.description')}
                    </p>
                  </div>
                  <Switch
                    id="radar"
                    checked={formData.radarEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, radarEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between flex-row">
                  <div className="space-y-0.5 ltr:text-left rtl:text-right">
                    <Label htmlFor="aiBuilder">
                      {t('admin.workspace.features.aiBuilder.label') || 'AI Builder'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.workspace.features.aiBuilder.description') || 'Enable AI-powered project building on challenges'}
                    </p>
                  </div>
                  <Switch
                    id="aiBuilder"
                    checked={formData.aiBuilderEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, aiBuilderEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between flex-row">
                  <div className="space-y-0.5 ltr:text-left rtl:text-right">
                    <Label htmlFor="formSubmission">
                      {t('admin.workspace.features.formSubmission.label') || 'Form Submission'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.workspace.features.formSubmission.description') || 'Enable manual form submission on challenges'}
                    </p>
                  </div>
                  <Switch
                    id="formSubmission"
                    checked={formData.formSubmissionEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, formSubmissionEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between flex-row">
                  <div className="space-y-0.5 ltr:text-left rtl:text-right">
                    <Label htmlFor="manualBuild">
                      {t('admin.workspace.features.manualBuild.label') || 'Manual Build'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.workspace.features.manualBuild.description') || 'Enable manual idea building with structured 4-step form'}
                    </p>
                  </div>
                  <Switch
                    id="manualBuild"
                    checked={formData.manualBuildEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, manualBuildEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between flex-row">
                  <div className="space-y-0.5 ltr:text-left rtl:text-right">
                    <Label htmlFor="academy">Training Modules</Label>
                    <p className="text-sm text-muted-foreground">
                      Show the Training Modules video tutorial library for workspace members
                    </p>
                  </div>
                  <Switch
                    id="academy"
                    checked={formData.academyEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, academyEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Editable route names (exclude dashboard) */}
            {/* Default after-login page selector */}
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.workspace.defaultPage.title') ?? 'Default page after login'}</CardTitle>
                <CardDescription>{t('admin.workspace.defaultPage.description') ?? 'Choose which page users land on after signing in.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="default-route">{t('admin.workspace.defaultPage.label') ?? 'Default page'}</Label>
                  <select
                    id="default-route"
                    value={formData.defaultRoute}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((s) => ({ ...s, defaultRoute: v }));
                    }}
                    className="w-full p-2 border rounded bg-background text-foreground"
                  >
                    {editableRoutesDefault.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label?.en ?? r.key}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
             <Card>
               <CardHeader>
                 <CardTitle>{t('admin.workspace.routes.title') ?? 'Route names'}</CardTitle>
                 <CardDescription>{t('admin.workspace.routes.description') ?? 'Customize page names and descriptions (EN / AR). Changes show Save per card.'}</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 {/* Dashboard - editable name only (always shown) */}
                 {dashboardEntry ? (
                   <div key={dashboardEntry.key} className="border rounded p-4 space-y-3">
                     <div className="flex items-center justify-between">
                       <div>
                         <div className="font-medium">{t(dashboardEntry.key) ?? dashboardEntry.original.enName}</div>
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                       <div>
                         <Label>{t('admin.workspace.routes.nameEn') ?? 'Name (EN)'}</Label>
                         <Input
                           value={dashboardEntry.enName}
                           onChange={(e) => setRoutesState(prev => ({ ...prev, [dashboardEntry.key]: { ...prev[dashboardEntry.key], enName: e.target.value } }))}
                           placeholder={dashboardEntry.original.enName}
                         />
                       </div>
                       <div>
                         <Label>{t('admin.workspace.routes.nameAr') ?? 'Name (AR)'}</Label>
                         <Input
                           value={dashboardEntry.arName}
                           onChange={(e) => setRoutesState(prev => ({ ...prev, [dashboardEntry.key]: { ...prev[dashboardEntry.key], arName: e.target.value } }))}
                           placeholder={dashboardEntry.original.arName}
                         />
                       </div>
                     </div>
                   </div>
                 ) : null}
                  
                  {Object.values(routesState)
                    .filter((r: any) => r.key !== 'navigation.dashboard')
                    .map((r: any) => {
                      const isDirty =
                        r.enName !== r.original.enName ||
                        r.arName !== r.original.arName ||
                        r.enDesc !== r.original.enDesc ||
                        r.arDesc !== r.original.arDesc ||
                        r.enTitle !== r.original.enTitle ||
                        r.arTitle !== r.original.arTitle;
  
                     return (
                       <div key={r.key} className="border rounded p-4 space-y-3">
                         <div className="flex items-center justify-between">
                           <div>
                             <div className="font-medium">{t(r.key) ?? r.original.enName}</div>
                           </div>
                           
                         </div>
 
                         {/* title field (special for experts or when title exists) */}
                         {(r.path === '/experts' || r.original.enTitle || r.original.arTitle) && (
                           <div className="grid grid-cols-2 gap-3">
                             <div>
                               <Label>{t('admin.workspace.routes.titleEn') ?? 'Title (EN)'}</Label>
                               <Input value={r.enTitle} onChange={(e) => setRoutesState(prev => ({ ...prev, [r.key]: { ...prev[r.key], enTitle: e.target.value } }))} />
                             </div>
                             <div>
                               <Label>{t('admin.workspace.routes.titleAr') ?? 'Title (AR)'}</Label>
                               <Input value={r.arTitle} onChange={(e) => setRoutesState(prev => ({ ...prev, [r.key]: { ...prev[r.key], arTitle: e.target.value } }))} />
                             </div>
                           </div>
                         )}
 
                         <div className="grid grid-cols-2 gap-3">
                           <div>
                             <Label>{t('admin.workspace.routes.nameEn') ?? 'Name (EN)'}</Label>
                             <Input value={r.enName} onChange={(e) => setRoutesState(prev => ({ ...prev, [r.key]: { ...prev[r.key], enName: e.target.value } }))} />
                           </div>
                           <div>
                             <Label>{t('admin.workspace.routes.nameAr') ?? 'Name (AR)'}</Label>
                             <Input value={r.arName} onChange={(e) => setRoutesState(prev => ({ ...prev, [r.key]: { ...prev[r.key], arName: e.target.value } }))} />
                           </div>
                         </div>
 
                         <div className="grid grid-cols-2 gap-3">
                           <div>
                             <Label>{t('admin.workspace.routes.descEn') ?? 'Description (EN)'}</Label>
                             <Textarea value={r.enDesc} onChange={(e: any) => setRoutesState(prev => ({ ...prev, [r.key]: { ...prev[r.key], enDesc: e.target.value } }))} />
                           </div>
                           <div>
                             <Label>{t('admin.workspace.routes.descAr') ?? 'Description (AR)'}</Label>
                             <Textarea value={r.arDesc} onChange={(e: any) => setRoutesState(prev => ({ ...prev, [r.key]: { ...prev[r.key], arDesc: e.target.value } }))} />
                           </div>
                         </div>
                       </div>
                     );
                   })}
               </CardContent>
             </Card>
             {/* end routes card */}
 
            {/* Save Button */}
            {/* keep form without inline save - Save is fixed to viewport */}
           </form>

          {/* Program Timeline */}
          <ProgramProgressManager orgId={workspace?.id} />

         </div>
       </div>

      {/* Fixed Save button - visible on the right side, above footer */}
      <div className="fixed right-6 bottom-6 z-50">
        <Button
          onClick={() => saveAll()}
          disabled={updateMutation.isPending}
          className="flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? t('admin.workspace.saving') : t('admin.workspace.save')}
        </Button>
      </div>
     </div>
   );
 }