import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface PublicWorkspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
}

export default function WorkspaceEntry() {
  const [selectedSlug, setSelectedSlug] = useState("");
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const { data: workspaces = [], isLoading } = useQuery<PublicWorkspace[]>({
    queryKey: ["/api/public/workspaces"],
    queryFn: async () => {
      const response = await fetch("/api/public/workspaces");
      if (!response.ok) throw new Error("Failed to fetch workspaces");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlug) return;
    setLocation(`/w/${selectedSlug}`);
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
                {isLoading ? (
                  <div className="flex items-center justify-center h-10">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                    <SelectTrigger id="workspace" className="w-full">
                      <SelectValue placeholder={t('workspace.yourWorkspacePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.slug}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!selectedSlug || isLoading}
              >
                {t('workspace.continueToWorkspace')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>

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
