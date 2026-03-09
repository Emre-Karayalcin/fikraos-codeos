import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import toast from 'react-hot-toast';
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface WorkspaceData {
  workspaceName: string;
  workspaceSlug: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export default function WorkspaceCreate() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const { t } = useTranslation();

  const [formData, setFormData] = useState<WorkspaceData>({
    workspaceName: "",
    workspaceSlug: "",
    adminEmail: "",
    adminPassword: "",
    adminFirstName: "",
    adminLastName: "",
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: WorkspaceData) => {
      const response = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create workspace");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(t('workspace.welcomeMessage', { name: data.workspace.name }), {
        duration: 2000,
      });
      setTimeout(() => {
        setLocation(`/w/${data.workspace.slug}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleWorkspaceNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    setFormData(prev => ({
      ...prev,
      workspaceName: name,
      workspaceSlug: slug
    }));
  };

  const handleSlugChange = (slug: string) => {
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

    setFormData(prev => ({ ...prev, workspaceSlug: cleanSlug }));
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.workspaceName || !formData.workspaceSlug) {
        toast.error(t('workspace.provideWorkspaceName'));
        return;
      }

      setIsChecking(true);
      try {
        const response = await fetch(`/api/workspaces/check-slug/${formData.workspaceSlug}`);
        const data = await response.json();

        if (data.available) {
          setIsChecking(false);
          setStep(2);
        } else {
          setIsChecking(false);
          toast.error(data.reason || t('workspace.nameNotAvailable'));
        }
      } catch (error) {
        setIsChecking(false);
        toast.error(t('workspace.failedToCheck'));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.adminEmail || !formData.adminPassword) {
      toast.error(t('workspace.provideEmailPassword'));
      return;
    }

    if (formData.adminPassword.length < 8) {
      toast.error(t('workspace.passwordTooShort'));
      return;
    }

    createWorkspaceMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('workspace.createYourWorkspace')}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {step === 1 ? t('workspace.step1') : t('workspace.step2')}
          </CardDescription>

          <div className="flex gap-2 mt-4 justify-center">
            <div className={`h-2 w-20 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`} />
            <div className={`h-2 w-20 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">{t('workspace.workspaceName')}</Label>
                <Input
                  id="workspaceName"
                  placeholder={t('workspace.workspaceNamePlaceholder')}
                  value={formData.workspaceName}
                  onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                />
                <p className="text-xs text-text-secondary">
                  {t('workspace.workspaceNameDesc')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspaceSlug">{t('workspace.workspaceUrl')}</Label>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-surface">
                  <span className="text-text-secondary text-sm">
                    {window.location.origin}/w/
                  </span>
                  <Input
                    id="workspaceSlug"
                    placeholder={t('workspace.workspaceSlugPlaceholder')}
                    value={formData.workspaceSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="border-0 p-0 h-auto focus-visible:ring-0"
                  />
                </div>
                <p className="text-xs text-text-secondary">
                  {t('workspace.workspaceSlugDesc')}
                </p>
              </div>

              <Button
                onClick={handleNext}
                className="w-full"
                size="lg"
                disabled={isChecking}
              >
                {isChecking ? t('workspace.checking') : t('workspace.continue')}
              </Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminFirstName">{t('workspace.firstName')}</Label>
                  <Input
                    id="adminFirstName"
                    placeholder={t('workspace.firstNamePlaceholder')}
                    value={formData.adminFirstName}
                    onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminLastName">{t('workspace.lastName')}</Label>
                  <Input
                    id="adminLastName"
                    placeholder={t('workspace.lastNamePlaceholder')}
                    value={formData.adminLastName}
                    onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">{t('workspace.emailAddress')}</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder={t('workspace.emailPlaceholder')}
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">{t('workspace.password')}</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder={t('workspace.passwordPlaceholder')}
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="text-xs text-text-secondary">
                  {t('workspace.passwordDesc')}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  size="lg"
                >
                  {t('workspace.back')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  size="lg"
                  disabled={createWorkspaceMutation.isPending}
                >
                  {createWorkspaceMutation.isPending ? t('workspace.creating') : t('workspace.createWorkspace')}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
