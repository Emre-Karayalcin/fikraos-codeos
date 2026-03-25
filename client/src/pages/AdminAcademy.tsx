import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpen, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Video } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import toast from "react-hot-toast";

export default function AdminAcademy() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [courseModal, setCourseModal] = useState<{ mode: "create" | "edit"; course?: any } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "course" | "video"; id: string; courseId?: string; title: string } | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<{ courseId: string; mode: "create" | "edit"; video?: any } | null>(null);

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const orgId = workspace?.id;

  const { data: courses = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${orgId}/admin/academy/courses`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/admin/academy/courses`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orgId,
  });

  const apiFetch = async (url: string, opts?: RequestInit) => {
    const res = await fetch(url, { credentials: "include", ...opts });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || "Request failed"); }
    return res.json();
  };

  const createCourse = useMutation({
    mutationFn: (data: any) => apiFetch(`/api/workspaces/${orgId}/admin/academy/courses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/academy/courses`] }); toast.success("Course created"); setCourseModal(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCourse = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiFetch(`/api/workspaces/${orgId}/admin/academy/courses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/academy/courses`] }); toast.success("Course updated"); setCourseModal(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCourse = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/workspaces/${orgId}/admin/academy/courses/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/academy/courses`] }); toast.success("Course deleted"); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createVideo = useMutation({
    mutationFn: ({ courseId, data }: { courseId: string; data: any }) => apiFetch(`/api/workspaces/${orgId}/admin/academy/courses/${courseId}/videos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/academy/courses`] }); toast.success("Video added"); setVideoModal(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateVideo = useMutation({
    mutationFn: ({ courseId, videoId, data }: { courseId: string; videoId: string; data: any }) => apiFetch(`/api/workspaces/${orgId}/admin/academy/courses/${courseId}/videos/${videoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/academy/courses`] }); toast.success("Video updated"); setVideoModal(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteVideo = useMutation({
    mutationFn: ({ courseId, videoId }: { courseId: string; videoId: string }) => apiFetch(`/api/workspaces/${orgId}/admin/academy/courses/${courseId}/videos/${videoId}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/workspaces/${orgId}/admin/academy/courses`] }); toast.success("Video deleted"); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar workspaceSlug={slug} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Training Modules</h1>
                <p className="text-muted-foreground">Manage courses and learning content</p>
              </div>
            </div>
            <Button onClick={() => setCourseModal({ mode: "create" })} disabled={!orgId}>
              <Plus className="w-4 h-4 mr-1" /> New Course
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">No courses yet</p>
                <p className="text-sm mt-1">Create your first course to get started</p>
                <Button className="mt-4" onClick={() => setCourseModal({ mode: "create" })}>
                  <Plus className="w-4 h-4 mr-1" /> New Course
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {courses.map((course: any) => (
                <Card key={course.id} className="border border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <button
                        className="flex items-center gap-2 text-left flex-1"
                        onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                      >
                        {expandedCourse === course.id ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        <div>
                          <CardTitle className="text-base">{course.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {course.videos?.length || 0} video{course.videos?.length !== 1 ? "s" : ""} ·{" "}
                            <span className={`font-medium ${course.isPublished ? "text-green-500" : "text-muted-foreground"}`}>
                              {course.isPublished ? "Published" : "Draft"}
                            </span>
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCourseModal({ mode: "edit", course })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "course", id: course.id, title: course.title })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedCourse === course.id && (
                    <CardContent className="pt-0">
                      <div className="space-y-2 mb-3">
                        {(course.videos || []).map((v: any, idx: number) => (
                          <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/30">
                            <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{idx + 1}</span>
                            <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{v.title}</p>
                              {v.description && <p className="text-xs text-muted-foreground truncate">{v.description}</p>}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVideoModal({ courseId: course.id, mode: "edit", video: v })}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "video", id: v.id, courseId: course.id, title: v.title })}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setVideoModal({ courseId: course.id, mode: "create" })}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Video
                      </Button>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {courseModal && (
        <CourseModal
          mode={courseModal.mode}
          course={courseModal.course}
          onClose={() => setCourseModal(null)}
          onSubmit={(data) => courseModal.mode === "create" ? createCourse.mutate(data) : updateCourse.mutate({ id: courseModal.course!.id, data })}
          isPending={createCourse.isPending || updateCourse.isPending}
        />
      )}

      {videoModal && (
        <VideoModal
          mode={videoModal.mode}
          video={videoModal.video}
          onClose={() => setVideoModal(null)}
          onSubmit={(data) => videoModal.mode === "create"
            ? createVideo.mutate({ courseId: videoModal.courseId, data })
            : updateVideo.mutate({ courseId: videoModal.courseId, videoId: videoModal.video!.id, data })
          }
          isPending={createVideo.isPending || updateVideo.isPending}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "course") deleteCourse.mutate(deleteTarget.id);
                else deleteVideo.mutate({ courseId: deleteTarget.courseId!, videoId: deleteTarget.id });
              }}
              disabled={deleteCourse.isPending || deleteVideo.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CourseModal({ mode, course, onClose, onSubmit, isPending }: any) {
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnailUrl || "");
  const [isPublished, setIsPublished] = useState(course?.isPublished ?? false);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Course" : `Edit — ${course?.title}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course title" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn?" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Thumbnail URL</Label>
            <Input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://example.com/thumbnail.jpg" type="url" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} id="course-published" />
            <Label htmlFor="course-published">Published (visible to members)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={() => onSubmit({ title, description, thumbnailUrl: thumbnailUrl || null, isPublished })} disabled={!title.trim() || isPending}>
            {isPending ? "Saving…" : mode === "create" ? "Create Course" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VideoModal({ mode, video, onClose, onSubmit, isPending }: any) {
  const [title, setTitle] = useState(video?.title || "");
  const [description, setDescription] = useState(video?.description || "");
  const [videoUrl, setVideoUrl] = useState(video?.videoUrl || "");
  const [durationSeconds, setDurationSeconds] = useState(String(video?.durationSeconds || ""));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Video" : `Edit — ${video?.title}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Video URL <span className="text-destructive">*</span></Label>
            <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://example.com/video.mp4 or YouTube/Vimeo link" type="url" />
            <p className="text-xs text-muted-foreground">Direct MP4 link, YouTube, or Vimeo URL</p>
          </div>
          <div className="space-y-1.5">
            <Label>Duration (seconds)</Label>
            <Input value={durationSeconds} onChange={e => setDurationSeconds(e.target.value)} placeholder="e.g. 94" type="number" min="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={() => onSubmit({ title, description: description || null, videoUrl, durationSeconds: parseInt(durationSeconds) || 0 })} disabled={!title.trim() || !videoUrl.trim() || isPending}>
            {isPending ? "Saving…" : mode === "create" ? "Add Video" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
