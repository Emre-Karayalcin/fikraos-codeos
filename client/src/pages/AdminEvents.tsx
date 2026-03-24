import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, Pencil, Trash2, Plus } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import toast from "react-hot-toast";

interface WorkspaceEvent {
  id: string;
  orgId: string | null;
  title: string;
  shortDescription: string | null;
  description: string | null;
  location: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
  isPublished: boolean;
  createdAt: string;
}

interface EventFormData {
  title: string;
  shortDescription: string;
  description: string;
  location: string;
  websiteUrl: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  isPublished: boolean;
}

const DEFAULT_FORM: EventFormData = {
  title: "", shortDescription: "", description: "", location: "",
  websiteUrl: "", imageUrl: "", startDate: "", endDate: "", isPublished: false,
};

export default function AdminEvents() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [eventModal, setEventModal] = useState<{ mode: "create" | "edit"; event?: WorkspaceEvent } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceEvent | null>(null);

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return res.json();
    },
  });

  const orgId = workspace?.id;

  const { data: wsEvents = [], isLoading } = useQuery<WorkspaceEvent[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/events`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/events`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    enabled: !!orgId,
  });

  const sortedEvents = useMemo(
    () => [...wsEvents].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [wsEvents]
  );

  const apiFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, { credentials: "include", ...options });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error((e as any).error || `Request failed: ${res.status}`);
    }
    return res.json();
  };

  const createEvent = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiFetch(`/api/workspaces/${orgId}/admin/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/events`] });
      toast.success("Event created");
      setEventModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiFetch(`/api/workspaces/${orgId}/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/events`] });
      toast.success("Event updated");
      setEventModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/workspaces/${orgId}/admin/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/events`] });
      toast.success("Event deleted");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Events</h1>
                <p className="text-muted-foreground">Manage events for this workspace</p>
              </div>
            </div>
            <Button onClick={() => setEventModal({ mode: "create" })} disabled={!orgId}>
              <Plus className="w-4 h-4 mr-1" /> New Event
            </Button>
          </div>

          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">All Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24 text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                          No events yet — create your first one
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedEvents.map((e) => {
                        const isGlobal = !e.orgId;
                        return (
                        <TableRow key={e.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{e.title}</span>
                              {isGlobal && (
                                <span className="inline-flex items-center text-[10px] rounded-full px-2 py-0.5 font-medium bg-blue-500/10 text-blue-500 border border-blue-200">Platform</span>
                              )}
                            </div>
                            {e.shortDescription && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">{e.shortDescription}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(e.startDate).toLocaleDateString()}
                            {e.endDate && ` — ${new Date(e.endDate).toLocaleDateString()}`}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{e.location || "—"}</TableCell>
                          <TableCell>
                            {e.isPublished ? (
                              <span className="inline-flex items-center text-xs rounded-full px-2.5 py-0.5 font-medium bg-green-500/15 text-green-400">Published</span>
                            ) : (
                              <span className="inline-flex items-center text-xs rounded-full px-2.5 py-0.5 font-medium bg-slate-500/15 text-slate-400">Draft</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isGlobal && (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => setEventModal({ mode: "edit", event: e })} title="Edit">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(e)} title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {eventModal && (
        <EventModal
          mode={eventModal.mode}
          event={eventModal.event}
          onClose={() => setEventModal(null)}
          onSubmit={(data) =>
            eventModal.mode === "create"
              ? createEvent.mutate(data)
              : updateEvent.mutate({ id: eventModal.event!.id, data })
          }
          isPending={createEvent.isPending || updateEvent.isPending}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the event and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteEvent.mutate(deleteTarget.id)}
              disabled={deleteEvent.isPending}
            >
              {deleteEvent.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface EventModalProps {
  mode: "create" | "edit";
  event?: WorkspaceEvent;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  isPending: boolean;
}

function EventModal({ mode, event, onClose, onSubmit, isPending }: EventModalProps) {
  const [form, setForm] = useState<EventFormData>(() =>
    event
      ? {
          title: event.title,
          shortDescription: event.shortDescription ?? "",
          description: event.description ?? "",
          location: event.location ?? "",
          websiteUrl: event.websiteUrl ?? "",
          imageUrl: event.imageUrl ?? "",
          startDate: event.startDate ? event.startDate.slice(0, 10) : "",
          endDate: event.endDate ? event.endDate.slice(0, 10) : "",
          isPublished: event.isPublished,
        }
      : DEFAULT_FORM
  );

  const set = (k: keyof EventFormData, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const data: Record<string, any> = {
      title: form.title,
      isPublished: form.isPublished,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
    };
    if (form.shortDescription) data.shortDescription = form.shortDescription;
    if (form.description) data.description = form.description;
    if (form.location) data.location = form.location;
    if (form.websiteUrl) data.websiteUrl = form.websiteUrl;
    if (form.imageUrl) data.imageUrl = form.imageUrl;
    if (form.endDate) data.endDate = new Date(form.endDate).toISOString();
    onSubmit(data);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Event" : `Edit — ${event?.title}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Event title" />
          </div>
          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="One-line summary" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Full description…" rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Dubai, UAE or Online" />
          </div>
          <div className="space-y-1.5">
            <Label>Website URL</Label>
            <Input value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://example.com" type="url" />
          </div>
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://example.com/image.jpg" type="url" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.isPublished} onCheckedChange={(v) => set("isPublished", v)} id="event-published" />
            <Label htmlFor="event-published">Published (visible to workspace members)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.startDate || isPending}>
            {isPending ? "Saving…" : mode === "create" ? "Create Event" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
