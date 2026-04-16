import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { RichTextViewer } from "@/components/editor/RichTextViewer";
import { Plus, Edit2, CheckCircle, XCircle, ChevronDown, ChevronRight, Users, Globe } from "lucide-react";
import toast from "react-hot-toast";

const DECLARATION_TYPES = [
  { value: "MENTOR_NDA", label: "Mentor NDA" },
  { value: "PARTICIPANT_CONSENT", label: "Participant Consent" },
  { value: "JUDGE_COI", label: "Judge Conflict-of-Interest" },
  { value: "PMO_COI", label: "PMO Conflict-of-Interest" },
];

const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

interface Declaration {
  id: string;
  orgId: string | null;
  isGlobal: boolean;
  type: string;
  title: string;
  content: string;
  version: string;
  status: string;
  effectiveDate: string | null;
  expiryDate: string | null;
}

interface FormState {
  type: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
  expiryDate: string;
}

const emptyForm = (): FormState => ({
  type: "MENTOR_NDA",
  title: "",
  content: "",
  version: "v1.0",
  effectiveDate: "",
  expiryDate: "",
});

function AcceptancesDrawer({ orgId, declarationId, onClose }: { orgId: string; declarationId: string; onClose: () => void }) {
  const { data: acceptances = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/declarations/acceptances", orgId, declarationId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/declarations/${declarationId}/acceptances`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Acceptance Log</DialogTitle></DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : acceptances.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No acceptances yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Accepted At</th>
                <th className="pb-2 font-medium">Project</th>
              </tr>
            </thead>
            <tbody>
              {acceptances.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2">
                    <p className="font-medium">{a.userName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.userEmail}</p>
                  </td>
                  <td className="py-2">{a.acceptedAt ? new Date(a.acceptedAt).toLocaleString() : "—"}</td>
                  <td className="py-2 text-xs text-muted-foreground">{(a.metadata as any)?.projectId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeclarationRow({
  declaration,
  orgId,
  onEdit,
  onActivate,
  onDeactivate,
  onViewAcceptances,
}: {
  declaration: Declaration;
  orgId: string;
  onEdit: (d: Declaration) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onViewAcceptances: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b hover:bg-muted/20 transition-colors">
        <td className="py-3 px-4">
          <button className="flex items-center gap-1 text-muted-foreground" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </td>
        <td className="py-3 px-2">
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono">
            {DECLARATION_TYPES.find((t) => t.value === declaration.type)?.label ?? declaration.type}
          </span>
        </td>
        <td className="py-3 px-2">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm">{declaration.title}</p>
            {declaration.isGlobal && (
              <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                <Globe className="w-2.5 h-2.5" />Global
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">v{declaration.version}</p>
        </td>
        <td className="py-3 px-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[declaration.status] ?? ""}`}>
            {declaration.status}
          </span>
        </td>
        <td className="py-3 px-2 text-xs text-muted-foreground">
          {declaration.effectiveDate ? new Date(declaration.effectiveDate).toLocaleDateString() : "—"}
        </td>
        <td className="py-3 px-2">
          <div className="flex items-center gap-1">
            {!declaration.isGlobal && (
              <>
                <Button size="sm" variant="ghost" onClick={() => onEdit(declaration)} title="Edit">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                {declaration.status !== "ACTIVE" ? (
                  <Button size="sm" variant="ghost" onClick={() => onActivate(declaration.id)} title="Activate" className="text-green-600 hover:text-green-700">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onDeactivate(declaration.id)} title="Deactivate" className="text-red-500 hover:text-red-600">
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                )}
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => onViewAcceptances(declaration.id)} title="View acceptances">
              <Users className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/10">
          <td colSpan={6} className="px-6 py-4">
            <RichTextViewer content={declaration.content} className="text-sm max-h-48 overflow-y-auto" />
          </td>
        </tr>
      )}
    </>
  );
}

export function DeclarationsManager({ orgId }: { orgId: string | undefined }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [acceptancesId, setAcceptancesId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: declarations = [], isLoading } = useQuery<Declaration[]>({
    queryKey: ["/api/admin/declarations", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/declarations`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/declarations", orgId] });

  const createMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/declarations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          effectiveDate: data.effectiveDate || undefined,
          expiryDate: data.expiryDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { toast.success("Declaration created"); setModalOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormState> }) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/declarations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          effectiveDate: data.effectiveDate || undefined,
          expiryDate: data.expiryDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { toast.success("Updated"); setModalOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/declarations/${id}/activate`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { toast.success("Activated"); invalidate(); },
    onError: () => toast.error("Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/declarations/${id}/deactivate`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { toast.success("Deactivated"); invalidate(); },
    onError: () => toast.error("Failed to deactivate"),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (d: Declaration) => {
    setEditingId(d.id);
    setForm({
      type: d.type, title: d.title, content: d.content, version: d.version,
      effectiveDate: d.effectiveDate ? d.effectiveDate.split("T")[0] : "",
      expiryDate: d.expiryDate ? d.expiryDate.split("T")[0] : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.content || !form.version) { toast.error("Title, content and version are required"); return; }
    if (editingId) editMutation.mutate({ id: editingId, data: form });
    else createMutation.mutate(form);
  };

  const pending = createMutation.isPending || editMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Global declarations (read-only) are shown with a <span className="text-blue-600 font-medium">Global</span> badge.
          Workspace-specific declarations override global ones.
        </p>
        <Button onClick={openCreate} size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />New Declaration</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : declarations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No declarations yet.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="py-3 px-4 w-8" />
                <th className="py-3 px-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="py-3 px-2 text-left font-medium text-muted-foreground">Title / Version</th>
                <th className="py-3 px-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-2 text-left font-medium text-muted-foreground">Effective</th>
                <th className="py-3 px-2 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {declarations.map((d) => (
                <DeclarationRow
                  key={d.id}
                  declaration={d}
                  orgId={orgId!}
                  onEdit={openEdit}
                  onActivate={(id) => activateMutation.mutate(id)}
                  onDeactivate={(id) => deactivateMutation.mutate(id)}
                  onViewAcceptances={(id) => setAcceptancesId(id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) setModalOpen(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Declaration" : "New Declaration"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!!editingId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DECLARATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="v1.0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mentor Non-Disclosure Agreement" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Effective Date <span className="text-muted-foreground">(optional)</span></Label>
                <Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date <span className="text-muted-foreground">(optional)</span></Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={pending}>{pending ? "Saving…" : editingId ? "Save Changes" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {acceptancesId && orgId && (
        <AcceptancesDrawer orgId={orgId} declarationId={acceptancesId} onClose={() => setAcceptancesId(null)} />
      )}
    </div>
  );
}
