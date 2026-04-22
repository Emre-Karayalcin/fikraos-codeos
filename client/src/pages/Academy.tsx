import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, ArrowLeft, PlayCircle, BookOpen, CheckCircle2, Lock,
  FileText, Video, Link as LinkIcon, Presentation, ExternalLink, Map, ClipboardList,
} from "lucide-react";
import { useRoute, useLocation, useParams } from "wouter";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import toast from "react-hot-toast";

// Per-video progress entry returned by the API
interface CourseProgressEntry {
  videoSlug: string;
  watchedSeconds: number;
  completed: boolean;
}

interface AcademyVideo {
  id: string;
  slug: string;
  title: string;
  description: string;
  videoUrl: string;
  durationSeconds: number;
  displayOrder: number;
}

interface AcademyCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  isPublished: boolean;
  displayOrder: number;
  videos: AcademyVideo[];
}

interface ProgramModule {
  id: string;
  title: string;
  description: string | null;
  stageIndex: number;
  order: number;
  status: string;
}

interface ProgramResource {
  id: string;
  moduleId: string;
  title: string;
  type: string;
  url: string;
  description: string | null;
  order: number;
  hasAssignment: boolean;
  assignmentDescription: string | null;
}

interface ResourceSubmission {
  id: string;
  submissionUrl: string;
  fileName: string | null;
  submittedAt: string;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCourseDuration(videos: AcademyVideo[]): string {
  const total = videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);
  const mins = Math.round(total / 60);
  return `${mins} min`;
}

function resourceTypeIcon(type: string) {
  switch (type) {
    case "video": return <Video size={14} />;
    case "pdf": return <FileText size={14} />;
    case "slides": return <Presentation size={14} />;
    case "doc": return <BookOpen size={14} />;
    default: return <LinkIcon size={14} />;
  }
}

function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace("/", "");
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    // ignore
  }
  return null;
}

// Academy Home - Shows list of courses
function AcademyHome() {
  const [, setLocation] = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = useWorkspace();
  const currentSlug = slug || workspaceSlug;

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${currentSlug}`],
    enabled: !!currentSlug,
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${currentSlug}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });
  const orgId = workspace?.id ?? "";

  const { data: courses = [] } = useQuery<AcademyCourse[]>({
    queryKey: ["/api/academy/courses"],
    queryFn: async () => {
      const res = await fetch("/api/academy/courses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: programModules = [] } = useQuery<ProgramModule[]>({
    queryKey: [`/api/organizations/${orgId}/program/modules/published`],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program/modules/published`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const STAGE_LABELS = [
    "Ideation & Business Foundations",
    "Product Strategy & Validation",
    "Product Design & Insights",
    "Pitching & Presentation",
  ];

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Banner - Contained with rounded corners */}
        <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white overflow-hidden rounded-2xl">
          {/* Decorative graduation cap icons */}
          <div className="absolute top-4 right-4 opacity-20">
            <GraduationCap className="w-16 h-16" />
          </div>
          <div className="absolute bottom-4 right-20 opacity-10">
            <GraduationCap className="w-20 h-20" />
          </div>

          <div className="relative z-10 px-6 py-8 sm:px-8 sm:py-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">
              Learn Anything with FikraHub Training Modules
            </h1>
            <p className="text-sm sm:text-base text-white/90 max-w-2xl">
              Unleash your potential with FikraHub Training Modules, our gateway to mastering essential skills and driving personal growth.
            </p>
          </div>
        </div>

        {/* Program Modules */}
        {programModules.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Map className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Program Roadmap</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {programModules.map((mod) => (
                <Card
                  key={mod.id}
                  className="overflow-hidden border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => setLocation(`/w/${currentSlug}/academy/module/${mod.id}`)}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <Map className="w-16 h-16 text-white/40" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white text-blue-600 px-6 py-2 rounded-md font-semibold text-sm">
                        VIEW MODULE
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Stage {mod.stageIndex} — {STAGE_LABELS[mod.stageIndex - 1]}
                    </p>
                    <h3 className="font-semibold text-sm mb-2">{mod.title}</h3>
                    {mod.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Academy Courses Grid */}
        {courses.length > 0 && (
          <div>
            {programModules.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Courses</h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course) => {
                const videoCount = course.videos?.length ?? 0;
                const duration = formatCourseDuration(course.videos ?? []);
                return (
                  <Card
                    key={course.id}
                    className="overflow-hidden border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => setLocation(`/w/${currentSlug}/academy/${course.slug}`)}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GraduationCap className="w-16 h-16 text-white/60" />
                        </div>
                      )}
                      {/* START / CONTINUE overlay button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white text-orange-600 px-6 py-2 rounded-md font-semibold text-sm">
                          START COURSE
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-2">
                        {course.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                        {course.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>{videoCount} lessons</span>
                        <span>{duration}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Course Contents - Shows list of videos in a course
function CourseContents({ courseSlug }: { courseSlug: string }) {
  const [, setLocation] = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = useWorkspace();
  const currentSlug = slug || workspaceSlug;

  const { data: course } = useQuery<AcademyCourse>({
    queryKey: [`/api/academy/courses/${courseSlug}`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/courses/${courseSlug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Course not found");
      return res.json();
    },
  });

  const { data: courseProgress } = useQuery<CourseProgressEntry[]>({
    queryKey: [`/api/academy/progress/${courseSlug}`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/progress/${courseSlug}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const progressBySlug = useMemo(() => {
    if (!courseProgress) return {} as Record<string, CourseProgressEntry>;
    return Object.fromEntries(courseProgress.map(p => [p.videoSlug, p]));
  }, [courseProgress]);

  const completedCount = courseProgress?.filter(p => p.completed).length ?? 0;

  if (!course) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const videos = course?.videos ?? [];
  const videoCount = videos.length;

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/w/${currentSlug}/academy`)}
          className="mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Training Modules
        </Button>
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{course?.title}</h1>
            <p className="text-sm text-muted-foreground">
              {videoCount} lessons • {formatCourseDuration(videos)}
              {completedCount > 0 && ` • ${completedCount} completed`}
            </p>
          </div>
        </div>
        {completedCount > 0 && videoCount > 0 && (
          <div className="mt-3 w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary rounded-full h-1.5 transition-all"
              style={{ width: `${Math.round((completedCount / videoCount) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {videos.map((video, index) => {
            const prog = progressBySlug[video.slug];
            const totalSec = video.durationSeconds || 0;
            const watchPct = prog && totalSec > 0 ? Math.min(100, Math.round((prog.watchedSeconds / totalSec) * 100)) : 0;

            // First video always unlocked; each subsequent video requires previous to be 100% complete
            const prevVideo = index > 0 ? videos[index - 1] : null;
            const prevProg = prevVideo ? progressBySlug[prevVideo.slug] : null;
            const isLocked = index > 0 && !prevProg?.completed;

            return (
              <Card
                key={video.id}
                className={`overflow-hidden border transition-all ${
                  isLocked
                    ? "border-border/30 opacity-60 cursor-not-allowed"
                    : "border-border/50 hover:border-border hover:shadow-md cursor-pointer group"
                }`}
                onClick={() => !isLocked && setLocation(`/w/${currentSlug}/academy/${courseSlug}/${video.slug}`)}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Number / status icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                    prog?.completed ? 'bg-green-500/10' : isLocked ? 'bg-muted' : 'bg-primary/10'
                  }`}>
                    {prog?.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <span className="text-primary">{index + 1}</span>
                    )}
                  </div>

                  {/* Title + description + progress bar */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate transition-colors ${
                      prog?.completed
                        ? 'text-muted-foreground'
                        : isLocked
                        ? 'text-muted-foreground'
                        : 'text-foreground group-hover:text-primary'
                    }`}>
                      {video.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                      {video.description}
                    </p>

                    {/* Always-visible progress bar (full width) */}
                    <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`rounded-full h-1.5 transition-all ${prog?.completed ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${prog?.completed ? 100 : watchPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {prog?.completed ? "Completed" : watchPct > 0 ? `${watchPct}% watched` : isLocked ? "Complete previous video to unlock" : "Not started"}
                    </p>
                  </div>

                  {/* Duration + action icon */}
                  <div className="flex-shrink-0 flex items-center gap-3 ml-2">
                    <span className="text-xs text-muted-foreground">{formatSeconds(video.durationSeconds)}</span>
                    {prog?.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <PlayCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Video Player - Shows the selected video
function VideoPlayer({ courseSlug, videoSlug }: { courseSlug: string; videoSlug: string }) {
  const [, setLocation] = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = useWorkspace();
  const currentSlug = slug || workspaceSlug;

  const { data: course } = useQuery<AcademyCourse>({
    queryKey: [`/api/academy/courses/${courseSlug}`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/courses/${courseSlug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Course not found");
      return res.json();
    },
  });

  const videos = course?.videos ?? [];
  const video = videos.find((v) => v.slug === videoSlug);
  const videoIndex = videos.findIndex((v) => v.slug === videoSlug) ?? -1;
  const nextVideo = videos[videoIndex + 1];
  const prevVideo = videos[videoIndex - 1];

  // Progress tracking
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedAtRef = useRef<number>(0);
  const hasSeekedRef = useRef<boolean>(false);
  const isCompletedRef = useRef<boolean>(false);

  const qClient = useQueryClient();

  const { data: courseProgress } = useQuery<CourseProgressEntry[]>({
    queryKey: [`/api/academy/progress/${courseSlug}`],
    queryFn: async () => {
      const res = await fetch(`/api/academy/progress/${courseSlug}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const progressBySlug = useMemo(() => {
    if (!courseProgress) return {} as Record<string, CourseProgressEntry>;
    return Object.fromEntries(courseProgress.map(p => [p.videoSlug, p]));
  }, [courseProgress]);

  // Core save function
  const doSave = useCallback(async (watchedSeconds: number, completed: boolean) => {
    try {
      await apiRequest("POST", "/api/academy/progress", { courseSlug, videoSlug, watchedSeconds, completed });
      lastSavedAtRef.current = watchedSeconds;
      qClient.invalidateQueries({ queryKey: [`/api/academy/progress/${courseSlug}`] });
    } catch {
      // silently ignore save failures
    }
  }, [courseSlug, videoSlug, qClient]);

  // Stable ref to doSave so the unmount cleanup always uses latest version
  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  // Restore playback position from saved progress
  useEffect(() => {
    if (!courseProgress || hasSeekedRef.current) return;
    const entry = courseProgress.find(p => p.videoSlug === videoSlug);
    hasSeekedRef.current = true;
    if (!entry || entry.completed || entry.watchedSeconds <= 5) return;
    isCompletedRef.current = entry.completed;
    const doSeek = () => {
      if (videoRef.current) videoRef.current.currentTime = entry.watchedSeconds;
    };
    if (videoRef.current) {
      if (videoRef.current.readyState >= 1) {
        doSeek();
      } else {
        videoRef.current.addEventListener("loadedmetadata", doSeek, { once: true });
      }
    }
  }, [courseProgress, videoSlug]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v && v.currentTime > 5) {
        doSaveRef.current(Math.floor(v.currentTime), isCompletedRef.current);
      }
    };
  }, []);

  // Save every 10 seconds of watch time
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const current = Math.floor(v.currentTime);
    if (current > 0 && current - lastSavedAtRef.current >= 10) {
      doSave(current, false);
    }
  };

  const handlePause = () => {
    const v = videoRef.current;
    if (v && v.currentTime > 5 && !v.ended) {
      doSave(Math.floor(v.currentTime), false);
    }
  };

  const handleEnded = () => {
    isCompletedRef.current = true;
    const v = videoRef.current;
    doSave(v ? Math.floor(v.duration || 0) : 0, true);
  };

  if (course && !video) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Video not found</p>
        <Button
          variant="outline"
          onClick={() => setLocation(`/w/${currentSlug}/academy`)}
          className="mt-4"
        >
          Back to Training Modules
        </Button>
      </div>
    );
  }

  if (!course || !video) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/w/${currentSlug}/academy/${courseSlug}`)}
          className="mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Course
        </Button>
        <div className="flex items-center gap-3">
          <PlayCircle className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{video.title}</h1>
            <p className="text-sm text-muted-foreground">
              Lesson {videoIndex + 1} of {videos.length}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Video Player */}
          <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              preload="metadata"
              src={video.videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onPause={handlePause}
              onEnded={handleEnded}
            />
          </div>

          {/* Video Info */}
          <div>
            <h2 className="text-2xl font-bold mb-2">{video.title}</h2>
            <p className="text-muted-foreground">{video.description}</p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => prevVideo && setLocation(`/w/${currentSlug}/academy/${courseSlug}/${prevVideo.slug}`)}
              disabled={!prevVideo}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={() => nextVideo && setLocation(`/w/${currentSlug}/academy/${courseSlug}/${nextVideo.slug}`)}
              disabled={!nextVideo}
            >
              Next
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </div>

          {/* All Lessons in Course */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">All Lessons</h3>
            <div className="space-y-2">
              {videos.map((v, index) => {
                const prog = progressBySlug[v.slug];
                const prevVid = index > 0 ? videos[index - 1] : null;
                const prevProg = prevVid ? progressBySlug[prevVid.slug] : null;
                const isLocked = index > 0 && !prevProg?.completed;
                const isCurrent = v.id === video.id;
                return (
                  <div
                    key={v.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-primary/10 border-primary'
                        : isLocked
                        ? 'border-border/30 opacity-60 cursor-not-allowed'
                        : 'border-border/50 hover:border-border hover:bg-accent cursor-pointer'
                    }`}
                    onClick={() => !isLocked && setLocation(`/w/${currentSlug}/academy/${courseSlug}/${v.slug}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                        isCurrent ? 'bg-primary text-primary-foreground' : prog?.completed ? 'bg-green-500/10' : isLocked ? 'bg-muted' : 'bg-muted'
                      }`}>
                        {prog?.completed && !isCurrent ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isCurrent ? 'text-primary' : prog?.completed ? 'text-muted-foreground' : isLocked ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {v.title}
                        </p>
                        {isLocked && (
                          <p className="text-xs text-muted-foreground mt-0.5">Complete previous video to unlock</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{v.duration}</span>
                        {prog?.completed && !isCurrent && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        )}
                        {isLocked && (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Program Module View - lists resources in a published module
function ProgramModuleView({ moduleId }: { moduleId: string }) {
  const [, setLocation] = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = useWorkspace();
  const currentSlug = slug || workspaceSlug;

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${currentSlug}`],
    enabled: !!currentSlug,
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${currentSlug}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });
  const orgId = workspace?.id ?? "";

  const { data: module } = useQuery<ProgramModule>({
    queryKey: [`/api/organizations/${orgId}/program/modules/${moduleId}/info`],
    enabled: !!orgId,
    queryFn: async () => {
      // Published modules list — find the one we need
      const res = await fetch(`/api/organizations/${orgId}/program/modules/published`, { credentials: "include" });
      if (!res.ok) return null;
      const list: ProgramModule[] = await res.json();
      return list.find((m) => m.id === moduleId) ?? null;
    },
  });

  const { data: resources = [] } = useQuery<ProgramResource[]>({
    queryKey: [`/api/organizations/${orgId}/program/modules/${moduleId}/resources/participant`],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program/modules/${moduleId}/resources/participant`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation(`/w/${currentSlug}/academy`)} className="mb-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Training Modules
        </Button>
        <div className="flex items-center gap-3">
          <Map className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{module?.title ?? "Loading..."}</h1>
            <p className="text-sm text-muted-foreground">{resources.length} materials</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {resources.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No materials available yet.</p>
          ) : (
            resources.map((r) => (
              <Card
                key={r.id}
                className="border border-border/50 hover:border-border hover:shadow-md transition-all cursor-pointer"
                onClick={() => setLocation(`/w/${currentSlug}/academy/module/${moduleId}/${r.id}`)}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {resourceTypeIcon(r.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{r.title}</p>
                      {r.hasAssignment && (
                        <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                          Assignment
                        </Badge>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="capitalize text-xs shrink-0">{r.type}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// Program Resource View - shows a single resource with assignment section
function ProgramResourceView({ moduleId, resourceId }: { moduleId: string; resourceId: string }) {
  const [, setLocation] = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = useWorkspace();
  const currentSlug = slug || workspaceSlug;
  const [submissionUrl, setSubmissionUrl] = useState("");

  const { data: workspace } = useQuery<{ id: string }>({
    queryKey: [`/api/workspaces/${currentSlug}`],
    enabled: !!currentSlug,
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${currentSlug}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });
  const orgId = workspace?.id ?? "";

  const { data: resources = [] } = useQuery<ProgramResource[]>({
    queryKey: [`/api/organizations/${orgId}/program/modules/${moduleId}/resources/participant`],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program/modules/${moduleId}/resources/participant`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const resource = resources.find((r) => r.id === resourceId);
  const resourceIndex = resources.findIndex((r) => r.id === resourceId);
  const prevResource = resourceIndex > 0 ? resources[resourceIndex - 1] : null;
  const nextResource = resourceIndex < resources.length - 1 ? resources[resourceIndex + 1] : null;

  const { data: mySubmission, refetch: refetchSubmission } = useQuery<ResourceSubmission | null>({
    queryKey: [`/api/organizations/${orgId}/program/resources/${resourceId}/my-submission`],
    enabled: !!orgId && !!resource?.hasAssignment,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program/resources/${resourceId}/my-submission`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/program/resources/${resourceId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ submissionUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Assignment submitted!");
      refetchSubmission();
      setSubmissionUrl("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!resource && resources.length > 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Resource not found</p>
        <Button variant="outline" onClick={() => setLocation(`/w/${currentSlug}/academy/module/${moduleId}`)} className="mt-4">
          Back to Module
        </Button>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const embed = embedUrl(resource.url);

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation(`/w/${currentSlug}/academy/module/${moduleId}`)} className="mb-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Module
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-primary">{resourceTypeIcon(resource.type)}</div>
          <div>
            <h1 className="text-xl font-bold">{resource.title}</h1>
            <p className="text-sm text-muted-foreground">
              Material {resourceIndex + 1} of {resources.length}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Content */}
          {embed ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                src={embed}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <Card className="border border-border">
              <div className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {resourceTypeIcon(resource.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{resource.title}</p>
                  {resource.description && <p className="text-sm text-muted-foreground mt-0.5">{resource.description}</p>}
                  <a href={resource.url} target="_blank" rel="noreferrer"
                    className="text-primary text-sm underline mt-1 inline-flex items-center gap-1">
                    Open resource <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Description */}
          {resource.description && embed && (
            <div>
              <p className="text-muted-foreground text-sm">{resource.description}</p>
            </div>
          )}

          {/* Assignment Section */}
          {resource.hasAssignment && (
            <Card className="border border-purple-200 dark:border-purple-800">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">Assignment</h3>
                </div>
                {resource.assignmentDescription && (
                  <p className="text-sm text-muted-foreground">{resource.assignmentDescription}</p>
                )}
                {mySubmission ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Submitted</p>
                    <a href={mySubmission.submissionUrl} target="_blank" rel="noreferrer"
                      className="text-sm text-primary underline break-all">
                      {mySubmission.submissionUrl}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(mySubmission.submittedAt).toLocaleString()}
                    </p>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Update your submission:</p>
                      <div className="flex gap-2">
                        <Input
                          value={submissionUrl}
                          onChange={(e) => setSubmissionUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          disabled={!submissionUrl.trim() || submitMutation.isPending}
                          onClick={() => submitMutation.mutate()}
                        >
                          {submitMutation.isPending ? "Updating..." : "Update"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="submission-url">Submission URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="submission-url"
                        value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        disabled={!submissionUrl.trim() || submitMutation.isPending}
                        onClick={() => submitMutation.mutate()}
                      >
                        {submitMutation.isPending ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => prevResource && setLocation(`/w/${currentSlug}/academy/module/${moduleId}/${prevResource.id}`)}
              disabled={!prevResource}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={() => nextResource && setLocation(`/w/${currentSlug}/academy/module/${moduleId}/${nextResource.id}`)}
              disabled={!nextResource}
            >
              Next
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// Main Academy Component with Routing
export default function Academy() {
  const [matchResource, paramsResource] = useRoute("/w/:slug/academy/module/:moduleId/:resourceId");
  const [matchModule, paramsModule] = useRoute("/w/:slug/academy/module/:moduleId");
  const [matchCourse, paramsCourse] = useRoute("/w/:slug/academy/:courseSlug");
  const [matchVideo, paramsVideo] = useRoute("/w/:slug/academy/:courseSlug/:videoSlug");

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex relative">
      {/* Left sidebar — hidden on mobile (bottom nav takes over) */}
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20 sm:pb-0">
        {matchResource && paramsResource ? (
          <ProgramResourceView
            key={`${paramsResource.moduleId}/${paramsResource.resourceId}`}
            moduleId={paramsResource.moduleId}
            resourceId={paramsResource.resourceId}
          />
        ) : matchModule && paramsModule ? (
          <ProgramModuleView
            key={paramsModule.moduleId}
            moduleId={paramsModule.moduleId}
          />
        ) : matchVideo && paramsVideo ? (
          <VideoPlayer
            key={`${paramsVideo.courseSlug}/${paramsVideo.videoSlug}`}
            courseSlug={paramsVideo.courseSlug}
            videoSlug={paramsVideo.videoSlug}
          />
        ) : matchCourse && paramsCourse ? (
          <CourseContents courseSlug={paramsCourse.courseSlug} />
        ) : (
          <AcademyHome />
        )}
      </div>

      {/* Mobile bottom nav */}
      <BottomNavigation />
    </div>
  );
}
