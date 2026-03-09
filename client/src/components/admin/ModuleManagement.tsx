import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Users, Radar, Settings, BarChart3, Sparkles, FileText } from "lucide-react";

interface ModuleManagementProps {
  orgId: string;
  currentOrg: any;
}

export default function ModuleManagement({ orgId, currentOrg }: ModuleManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateModulesMutation = useMutation({
    mutationFn: async (moduleUpdates: Record<string, boolean>) => {
      const response = await fetch(`/api/organizations/${orgId}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(moduleUpdates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update modules');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Modules updated",
        description: "Module settings have been successfully updated."
      });
      
      // Refresh organization data
      queryClient.invalidateQueries({
        queryKey: ['/api/organizations']
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating modules",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleModuleToggle = (module: string, enabled: boolean) => {
    updateModulesMutation.mutate({ [module]: enabled });
  };

  const modules = [
    {
      key: 'dashboardEnabled',
      name: 'Dashboard',
      description: 'Enable dashboard analytics and overview',
      icon: BarChart3,
      enabled: currentOrg?.dashboardEnabled ?? true
    },
    {
      key: 'challengesEnabled',
      name: 'Challenges',
      description: 'Enable challenge competitions and submissions',
      icon: Trophy,
      enabled: currentOrg?.challengesEnabled ?? true
    },
    {
      key: 'expertsEnabled',
      name: 'Experts',
      description: 'Enable expert consultations and mentorship',
      icon: Users,
      enabled: currentOrg?.expertsEnabled ?? true
    },
    {
      key: 'radarEnabled',
      name: 'Radar',
      description: 'Enable trend tracking and market insights',
      icon: Radar,
      enabled: currentOrg?.radarEnabled ?? true
    },
    {
      key: 'aiBuilderEnabled',
      name: 'AI Builder',
      description: 'Enable AI-powered project building on challenges',
      icon: Sparkles,
      enabled: currentOrg?.aiBuilderEnabled ?? true
    },
    {
      key: 'formSubmissionEnabled',
      name: 'Form Submission',
      description: 'Enable manual form submission on challenges',
      icon: FileText,
      enabled: currentOrg?.formSubmissionEnabled ?? true
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="text-module-management-title">
          <Settings className="w-5 h-5" />
          Module Management
        </CardTitle>
        <CardDescription>
          Control which features are available in your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <div
              key={module.key}
              className="flex items-center justify-between p-4 border rounded-lg"
              data-testid={`card-module-${module.key}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-lg">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold" data-testid={`text-module-${module.key}-name`}>
                    {module.name}
                  </h4>
                  <p className="text-sm text-text-secondary" data-testid={`text-module-${module.key}-description`}>
                    {module.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={module.enabled}
                onCheckedChange={(enabled) => handleModuleToggle(module.key, enabled)}
                disabled={updateModulesMutation.isPending}
                data-testid={`switch-module-${module.key}`}
              />
            </div>
          );
        })}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2" data-testid="text-module-impact-title">
            Module Impact
          </h4>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>• Disabled modules will be hidden from navigation</li>
            <li>• Existing data will be preserved when modules are disabled</li>
            <li>• Changes take effect immediately for all workspace members</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}