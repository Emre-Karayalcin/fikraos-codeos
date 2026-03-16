import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, PlayCircle, BookOpen, CheckCircle2 } from "lucide-react";
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

// Parse "MM:SS" duration string to total seconds
function parseDuration(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Course structure with videos
const COURSES = [
  {
    id: "fikrahub-fundamentals",
    slug: "fikrahub-fundamentals",
    title: "FikraHub Course",
    description: "Master the fundamentals of building and launching your startup",
    thumbnail: "/fikracourse-cover.png",
    videoCount: 14,
    duration: "19 min",
    videos: [
      {
        id: "brand-identity",
        slug: "brand-identity",
        url: "https://app.fikrahub.com/videos/FrikaHub-brand-identity.mp4",
        title: "Brand Identity",
        description: "Learn how to create a compelling brand identity for your startup",
        duration: "1:34"
      },
      {
        id: "brand-wheel",
        slug: "brand-wheel",
        url: "https://app.fikrahub.com/videos/FrikaHub-brand-wheel.mp4",
        title: "Brand Wheel",
        description: "Understand your brand positioning with the brand wheel framework",
        duration: "1:34"
      },
      {
        id: "customer-interview",
        slug: "customer-interview",
        url: "https://app.fikrahub.com/videos/FrikaHub-customer-interview-questions.mp4",
        title: "Customer Interview Questions",
        description: "Master the art of customer interviews with the right questions",
        duration: "1:33"
      },
      {
        id: "landing-pages",
        slug: "landing-pages",
        url: "https://app.fikrahub.com/videos/FrikaHub-landing-pages.mp4",
        title: "Landing Pages",
        description: "Build high-converting landing pages that capture leads",
        duration: "1:22"
      },
      {
        id: "launch-roadmap",
        slug: "launch-roadmap",
        url: "https://app.fikrahub.com/videos/FrikaHub-launch-roadmap.mp4",
        title: "Launch Roadmap",
        description: "Plan your product launch with a structured roadmap",
        duration: "1:12"
      },
      {
        id: "lean-canvas",
        slug: "lean-canvas",
        url: "https://app.fikrahub.com/videos/FrikaHub-lean-canvas.mp4",
        title: "Lean Canvas",
        description: "Validate your business model with the Lean Canvas framework",
        duration: "1:33"
      },
      {
        id: "marketing-content",
        slug: "marketing-content",
        url: "https://app.fikrahub.com/videos/FrikaHub-marketing-content.mp4",
        title: "Marketing Content",
        description: "Create engaging marketing content that resonates",
        duration: "1:12"
      },
      {
        id: "marketing-overview",
        slug: "marketing-overview",
        url: "https://app.fikrahub.com/videos/FrikaHub-marketing-overview.mp4",
        title: "Marketing Overview",
        description: "Get a comprehensive overview of marketing strategies",
        duration: "1:42"
      },
      {
        id: "swot-analysis",
        slug: "swot-analysis",
        url: "https://app.fikrahub.com/videos/FrikaHub-swot-analysis.mp4",
        title: "SWOT Analysis",
        description: "Analyze your strengths, weaknesses, opportunities, and threats",
        duration: "1:09"
      },
      {
        id: "tasks-management",
        slug: "tasks-management",
        url: "https://app.fikrahub.com/videos/FrikaHub-tasks-management.mp4",
        title: "Tasks Management",
        description: "Organize and prioritize tasks effectively",
        duration: "1:16"
      },
      {
        id: "team-roles",
        slug: "team-roles",
        url: "https://app.fikrahub.com/videos/FrikaHub-team-roles.mp4",
        title: "Team Roles",
        description: "Define clear roles and responsibilities for your team",
        duration: "1:00"
      },
      {
        id: "user-journey",
        slug: "user-journey",
        url: "https://app.fikrahub.com/videos/FrikaHub-user-journey-map.mp4",
        title: "User Journey Map",
        description: "Map out your customer's journey from awareness to advocacy",
        duration: "1:46"
      },
      {
        id: "user-personas",
        slug: "user-personas",
        url: "https://app.fikrahub.com/videos/FrikaHub-user-personas.mp4",
        title: "User Personas",
        description: "Create detailed personas to understand your target users",
        duration: "1:14"
      },
      {
        id: "user-stories",
        slug: "user-stories",
        url: "https://app.fikrahub.com/videos/FrikaHub-user-stories.mp4",
        title: "User Stories",
        description: "Write effective user stories for product development",
        duration: "1:01"
      },
    ]
  }
];

// Academy Home - Shows list of courses
function AcademyHome() {
  const [, setLocation] = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = useWorkspace();
  const currentSlug = slug || workspaceSlug;

  const { data: homeProgress } = useQuery<CourseProgressEntry[]>({
    queryKey: ["/api/academy/progress/fikrahub-fundamentals"],
    queryFn: async () => {
      const res = await fetch("/api/academy/progress/fikrahub-fundamentals", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const completedCountBySlug = useMemo<Record<string, number>>(() => ({
    "fikrahub-fundamentals": homeProgress?.filter(p => p.completed).length ?? 0,
  }), [homeProgress]);

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
              Learn Anything with FikraHub Academy
            </h1>
            <p className="text-sm sm:text-base text-white/90 max-w-2xl">
              Unleash your potential with FikraHub Academy, our gateway to mastering essential skills and driving personal growth.
            </p>
          </div>
        </div>

        {/* Courses Grid - Aligned to left */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {COURSES.map((course) => {
            const completed = completedCountBySlug[course.slug] ?? 0;
            const pct = Math.round((completed / course.videoCount) * 100);
            return (
              <Card
                key={course.id}
                className="overflow-hidden border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setLocation(`/w/${currentSlug}/academy/${course.slug}`)}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  {/* START / CONTINUE overlay button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white text-orange-600 px-6 py-2 rounded-md font-semibold text-sm">
                      {pct > 0 ? "CONTINUE" : "START COURSE"}
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
                  {pct > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{completed}/{course.videoCount} completed</span>
                        <span className="font-medium text-primary">{pct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary rounded-full h-1.5 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{course.videoCount} lessons</span>
                    <span>{course.duration}</span>
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
  const course = COURSES.find((c) => c.slug === courseSlug);

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
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Course not found</p>
        <Button
          variant="outline"
          onClick={() => setLocation(`/w/${currentSlug}/academy`)}
          className="mt-4"
        >
          Back to Academy
        </Button>
      </div>
    );
  }

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
          Back to Academy
        </Button>
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{course.title}</h1>
            <p className="text-sm text-muted-foreground">
              {course.videoCount} lessons • {course.duration}
              {completedCount > 0 && ` • ${completedCount} completed`}
            </p>
          </div>
        </div>
        {completedCount > 0 && (
          <div className="mt-3 w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary rounded-full h-1.5 transition-all"
              style={{ width: `${Math.round((completedCount / course.videoCount) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {course.videos.map((video, index) => {
            const prog = progressBySlug[video.slug];
            const totalSec = parseDuration(video.duration);
            const watchPct = prog && totalSec > 0 ? Math.min(100, Math.round((prog.watchedSeconds / totalSec) * 100)) : 0;
            return (
              <Card
                key={video.id}
                className="overflow-hidden border border-border/50 hover:border-border hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setLocation(`/w/${currentSlug}/academy/${courseSlug}/${video.slug}`)}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold ${prog?.completed ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                    {prog?.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <span className="text-primary">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold group-hover:text-primary transition-colors truncate ${prog?.completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {video.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {video.description}
                    </p>
                    {prog && !prog.completed && watchPct > 0 && (
                      <div className="mt-1.5 w-28 bg-muted rounded-full h-1">
                        <div
                          className="bg-primary rounded-full h-1 transition-all"
                          style={{ width: `${watchPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{video.duration}</span>
                    {prog?.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
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
  const course = COURSES.find((c) => c.slug === courseSlug);
  const video = course?.videos.find((v) => v.slug === videoSlug);
  const videoIndex = course?.videos.findIndex((v) => v.slug === videoSlug) ?? -1;
  const nextVideo = course?.videos[videoIndex + 1];
  const prevVideo = course?.videos[videoIndex - 1];

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

  if (!course || !video) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Video not found</p>
        <Button
          variant="outline"
          onClick={() => setLocation(`/w/${currentSlug}/academy`)}
          className="mt-4"
        >
          Back to Academy
        </Button>
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
              Lesson {videoIndex + 1} of {course.videos.length}
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
              src={video.url}
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
              {course.videos.map((v, index) => {
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
