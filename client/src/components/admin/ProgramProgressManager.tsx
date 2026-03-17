import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import toast from "react-hot-toast";

interface ProgramStep { titleEn: string; titleAr: string; }
interface ProgramData { orgId: string; currentStep: number; steps: ProgramStep[]; }

const DEFAULT_STEPS: ProgramStep[] = [
  { titleEn: "Ideation & Business Foundations", titleAr: "الريادة وأسس الأعمال" },
  { titleEn: "Product Strategy & Validation",   titleAr: "استراتيجية المنتج والتحقق" },
  { titleEn: "Product Design & Insights",        titleAr: "تصميم المنتج والرؤى" },
  { titleEn: "Pitching & Presentation",          titleAr: "العرض التقديمي" },
];

export function ProgramProgressManager({ orgId }: { orgId?: string }) {
  const qc = useQueryClient();
  const queryKey = ["/api/program-progress", orgId];

  const { data, isLoading } = useQuery<ProgramData>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program-progress`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [steps, setSteps] = useState<ProgramStep[] | null>(null);

  React.useEffect(() => {
    if (data) {
      setCurrentStep(data.currentStep);
      setSteps(data.steps ?? DEFAULT_STEPS);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program-progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentStep, steps }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Program progress saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const activeSteps = steps ?? DEFAULT_STEPS;
  const activeCurrentStep = currentStep ?? data?.currentStep ?? 1;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> Program Timeline
        </CardTitle>
        <CardDescription>
          Set the active week and customise step titles in English and Arabic. All workspace members will see the updated progress bar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current step selector */}
        <div className="flex items-center gap-4">
          <Label className="w-40 shrink-0">Active week</Label>
          <Select
            value={String(activeCurrentStep)}
            onValueChange={(v) => setCurrentStep(Number(v))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeSteps.map((_, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  Week {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step editors */}
        <div className="space-y-4">
          {activeSteps.map((step, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    idx + 1 === activeCurrentStep
                      ? "border-primary bg-primary text-white"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="text-sm font-medium text-foreground">Week {idx + 1}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">English</Label>
                  <Input
                    value={step.titleEn}
                    onChange={(e) => {
                      const next = [...activeSteps];
                      next[idx] = { ...next[idx], titleEn: e.target.value };
                      setSteps(next);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Arabic (عربي)</Label>
                  <Input
                    dir="rtl"
                    value={step.titleAr}
                    onChange={(e) => {
                      const next = [...activeSteps];
                      next[idx] = { ...next[idx], titleAr: e.target.value };
                      setSteps(next);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
