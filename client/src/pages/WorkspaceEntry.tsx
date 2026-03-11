import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowRight, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function WorkspaceEntry() {
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = workspaceSlug.trim().toLowerCase();
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slug) return;
    if (!slugPattern.test(slug)) {
      alert(t('workspace.invalidWorkspaceName'));
      return;
    }
    setLocation(`/w/${slug}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-2">
                <img
                  src="/logo-code-light.jpeg"
                  alt="CodeOS Logo"
                  className="h-12 w-auto object-contain hidden dark:block"
                />
                <img
                  src="/codelogo.png"
                  alt="CodeOS Logo"
                  className="h-12 w-auto object-contain dark:hidden"
                />
                <span className="text-3xl font-bold text-foreground">OS</span>
              </div>
            </div>

          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace">{t('workspace.workspaceNameLabel')}</Label>
                <Input
                  id="workspace"
                  type="text"
                  placeholder={t('workspace.yourWorkspacePlaceholder')}
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                  autoFocus
                  required
                  title={t('workspace.workspaceSlugDesc')}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!workspaceSlug.trim()}
              >
                {t('workspace.continueToWorkspace')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-text-secondary">
                  {t('workspace.or')}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => setLocation("/create-workspace")}
            >
              <Plus className="mr-2 w-4 h-4" />
              {t('workspace.createNewWorkspaceBtn')}
            </Button>

            <div className="text-center text-xs text-text-secondary">
              <p>
                {t('workspace.dontKnowWorkspace')}
                <br />
                {t('workspace.contactWorkspaceAdmin')}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
