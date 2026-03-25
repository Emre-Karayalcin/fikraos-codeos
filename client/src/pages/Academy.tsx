import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, PlayCircle, BookOpen, CheckCircle2, Lock } from "lucide-react";
import { useRoute, useLocation, useParams } from "wouter";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

// Academy Home - Shows list of courses
function AcademyHome() {
  const [, setLocation] = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = useWorkspace();
  const currentSlug = slug || workspaceSlug;

  const { data: courses = [] } = useQuery<AcademyCourse[]>({
    queryKey: ["/api/academy/courses"],
    queryFn: async () => {
      const res = await fetch("/api/academy/courses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

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

        {/* Courses Grid - Aligned to left */}
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
                return (
                  <div
                    key={v.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      v.id === video.id
                        ? 'bg-primary/10 border-primary'
                        : 'border-border/50 hover:border-border hover:bg-accent'
                    }`}
                    onClick={() => setLocation(`/w/${currentSlug}/academy/${courseSlug}/${v.slug}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                        v.id === video.id ? 'bg-primary text-primary-foreground' : prog?.completed ? 'bg-green-500/10' : 'bg-muted'
                      }`}>
                        {prog?.completed && v.id !== video.id ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          v.id === video.id ? 'text-primary' : prog?.completed ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {v.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{v.duration}</span>
                        {prog?.completed && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
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

// Main Academy Component with Routing
export default function Academy() {
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
        {matchVideo && paramsVideo ? (
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
