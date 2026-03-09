import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, Save, Sparkles, Loader2, Check, AlertCircle } from "lucide-react";

interface AssetEditModalProps {
  asset: any;
  isOpen: boolean;
  onClose: () => void;
  VisualizationComponent: any;
}

export function AssetEditModal({ asset, isOpen, onClose, VisualizationComponent }: AssetEditModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedData, setEditedData] = useState(asset?.data || {});
  const [aiEditSection, setAiEditSection] = useState<string>("");
  const [aiInstructions, setAiInstructions] = useState<string>("");
  const [pendingAiChanges, setPendingAiChanges] = useState<any>(null);

  // Mutation to update asset
  const updateAssetMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data: updatedData }),
      });

      if (!response.ok) {
        throw new Error("Failed to update asset");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset updated",
        description: "Your changes have been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", asset.projectId, "assets"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update asset",
        variant: "destructive",
      });
    },
  });

  // Mutation for AI editing
  const aiEditMutation = useMutation({
    mutationFn: async ({ section, instructions }: { section: string; instructions: string }) => {
      const response = await fetch(`/api/assets/${asset.id}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          section,
          instructions,
          currentData: editedData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate with AI");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Store pending changes for review instead of immediately applying
      setPendingAiChanges(data.data);
      toast({
        title: "AI regeneration complete",
        description: "Review the changes below and approve or cancel",
      });
    },
    onError: (error) => {
      toast({
        title: "AI regeneration failed",
        description: error instanceof Error ? error.message : "Failed to regenerate section",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateAssetMutation.mutate(editedData);
  };

  const handleAiEdit = () => {
    if (!aiEditSection || !aiInstructions.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a section and provide instructions",
        variant: "destructive",
      });
      return;
    }

    aiEditMutation.mutate({
      section: aiEditSection,
      instructions: aiInstructions,
    });
  };

  const handleFieldChange = (path: string, value: any) => {
    const keys = path.split('.');
    const newData = { ...editedData };
    let current: any = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setEditedData(newData);
  };

  const handleApproveChanges = () => {
    if (pendingAiChanges) {
      setEditedData(pendingAiChanges);
      setPendingAiChanges(null);
      setAiInstructions("");
      setAiEditSection("");
      toast({
        title: "Changes approved",
        description: "AI changes have been applied successfully",
      });
    }
  };

  const handleCancelChanges = () => {
    setPendingAiChanges(null);
    setAiInstructions("");
    toast({
      title: "Changes cancelled",
      description: "AI suggestions have been discarded",
    });
  };

  // Render editable fields based on asset type
  const renderEditableFields = () => {
    if (!editedData || typeof editedData !== 'object') {
      return (
        <div className="p-4 text-gray-600">
          No editable data available
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(editedData).map(([key, value]) => {
          // Skip complex nested objects for now
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium text-gray-900 capitalize flex items-center gap-2">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                  <button
                    onClick={() => setAiEditSection(key)}
                    className={`text-xs px-2 py-1 rounded ${
                      aiEditSection === key
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    AI Edit
                  </button>
                </label>
                <Textarea
                  value={JSON.stringify(value, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleFieldChange(key, parsed);
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="font-mono text-sm min-h-[100px] bg-white text-gray-900 border-gray-300"
                />
              </div>
            );
          }

          if (Array.isArray(value)) {
            return (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium text-gray-900 capitalize flex items-center gap-2">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                  <button
                    onClick={() => setAiEditSection(key)}
                    className={`text-xs px-2 py-1 rounded ${
                      aiEditSection === key
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    AI Edit
                  </button>
                </label>
                <Textarea
                  value={value.join('\n')}
                  onChange={(e) => handleFieldChange(key, e.target.value.split('\n').filter(Boolean))}
                  className="min-h-[80px] bg-white text-gray-900 border-gray-300"
                  placeholder="One item per line"
                />
              </div>
            );
          }

          return (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium text-gray-900 capitalize flex items-center gap-2">
                {key.replace(/([A-Z])/g, ' $1').trim()}
                <button
                  onClick={() => setAiEditSection(key)}
                  className={`text-xs px-2 py-1 rounded ${
                    aiEditSection === key
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI Edit
                </button>
              </label>
              {typeof value === 'string' && value.length > 100 ? (
                <Textarea
                  value={value}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="min-h-[80px] bg-white text-gray-900 border-gray-300"
                />
              ) : (
                <Input
                  value={value?.toString() || ''}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="bg-white text-gray-900 border-gray-300"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render AI changes comparison
  const renderChangesComparison = () => {
    if (!pendingAiChanges) return null;

    const compareValues = (key: string, oldValue: any, newValue: any) => {
      // Check if values are actually different
      const oldStr = JSON.stringify(oldValue);
      const newStr = JSON.stringify(newValue);
      if (oldStr === newStr) return null;

      return (
        <div key={key} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-sm text-blue-900 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Current Value */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 uppercase">Current</label>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-gray-900 max-h-32 overflow-y-auto">
                {typeof oldValue === 'object'
                  ? <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(oldValue, null, 2)}</pre>
                  : Array.isArray(oldValue)
                  ? oldValue.map((item, i) => <div key={i}>• {item}</div>)
                  : String(oldValue)}
              </div>
            </div>

            {/* New Value */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 uppercase">AI Suggested</label>
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-gray-900 max-h-32 overflow-y-auto">
                {typeof newValue === 'object'
                  ? <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(newValue, null, 2)}</pre>
                  : Array.isArray(newValue)
                  ? newValue.map((item, i) => <div key={i}>• {item}</div>)
                  : String(newValue)}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const changes: JSX.Element[] = [];

    // Compare all fields
    if (aiEditSection === "_ALL_") {
      // For full edit, compare all fields
      Object.keys({ ...editedData, ...pendingAiChanges }).forEach(key => {
        const comparison = compareValues(key, editedData[key], pendingAiChanges[key]);
        if (comparison) changes.push(comparison);
      });
    } else {
      // For section edit, compare only the edited section
      const comparison = compareValues(aiEditSection, editedData[aiEditSection], pendingAiChanges[aiEditSection]);
      if (comparison) changes.push(comparison);
    }

    if (changes.length === 0) {
      return (
        <div className="text-center text-gray-500 py-4">
          No changes detected
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {changes}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Edit {t(`assets.types.${asset?.kind}`)}</span>
              <button
                onClick={() => setAiEditSection("_ALL_")}
                className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-2 ${
                  aiEditSection === "_ALL_"
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Edit All with AI
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6 relative">
          {/* AI Regeneration Loading Overlay */}
          {aiEditMutation.isPending && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center gap-3 border-2 border-orange-200">
                <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
                <div className="text-center">
                  <p className="font-semibold text-gray-900">Regenerating with AI...</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {aiEditSection === "_ALL_"
                      ? "Regenerating entire output"
                      : `Updating ${aiEditSection}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Left: Editable Fields */}
          <div className="space-y-4 border-r border-gray-300 pr-6">
            <h3 className="font-semibold text-lg text-gray-900">Manual Edit</h3>
            {renderEditableFields()}
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-gray-900">Preview</h3>
              {pendingAiChanges && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  Showing AI Preview
                </span>
              )}
            </div>
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
              {VisualizationComponent && (
                <VisualizationComponent
                  data={pendingAiChanges || editedData}
                  title={asset?.title}
                />
              )}
            </div>
          </div>
        </div>

        {/* AI Edit Section */}
        {aiEditSection && !pendingAiChanges && (
          <div className="border-t border-gray-300 pt-4 space-y-3 bg-orange-50 -mx-6 px-6 -mb-6 pb-6">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-gray-900">
              <Sparkles className="w-4 h-4 text-orange-600" />
              {aiEditSection === "_ALL_" ? "AI Edit: Entire Output" : `AI Edit: ${aiEditSection}`}
            </h4>
            <Textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder={
                aiEditSection === "_ALL_"
                  ? "Tell AI how to improve the entire output... (e.g., \"Make it more professional and detailed\" or \"Focus more on sustainability aspects\")"
                  : `Tell AI what to change in "${aiEditSection}"... (e.g., "Make it more concise" or "Add 2 more items related to sustainability")`
              }
              className="min-h-[60px] bg-white text-gray-900 border-gray-300"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAiEdit}
                disabled={aiEditMutation.isPending || !aiInstructions.trim()}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                {aiEditMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate with AI
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAiEditSection("");
                  setAiInstructions("");
                }}
                size="sm"
              >
                Cancel AI Edit
              </Button>
            </div>
          </div>
        )}

        {/* AI Changes Review Section */}
        {pendingAiChanges && (
          <div className="border-t border-gray-300 pt-4 space-y-4 bg-blue-50 -mx-6 px-6 pb-6">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg flex items-center gap-2 text-blue-900">
                <Check className="w-5 h-5 text-blue-600" />
                Review AI Changes
              </h4>
              <div className="flex gap-2">
                <Button
                  onClick={handleApproveChanges}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelChanges}
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>

            <p className="text-sm text-blue-700">
              Review the changes below. Green highlights show AI suggestions, red shows current values.
            </p>

            {renderChangesComparison()}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-300">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateAssetMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateAssetMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
