import React from "react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, PlayCircle, BookOpen } from "lucide-react";
import { useRoute, useLocation, useParams } from "wouter";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// Course structure with videos
const COURSES = [
  {
    id: "fikrahub-fundamentals",
    slug: "fikrahub-fundamentals",
    title: "FikraHub Course",
    description: "Master the fundamentals of building and launching your startup",
    thumbnail: "/fikracourse-cover.png",
    videoCount: 14,
    duration: "2h 30min",
    videos: [
      {
        id: "brand-identity",
        slug: "brand-identity",
        url: "https://edu.fikrahub.com/videos/FrikaHub-brand-identity.mp4",
        title: "Brand Identity",
        description: "Learn how to create a compelling brand identity for your startup",
        duration: "12:45"
      },
      {
        id: "brand-wheel",
        slug: "brand-wheel",
        url: "https://edu.fikrahub.com/videos/FrikaHub-brand-wheel.mp4",
        title: "Brand Wheel",
        description: "Understand your brand positioning with the brand wheel framework",
        duration: "10:30"
      },
      {
        id: "customer-interview",
        slug: "customer-interview",
        url: "https://edu.fikrahub.com/videos/FrikaHub-customer-interview-questions.mp4",
        title: "Customer Interview Questions",
        description: "Master the art of customer interviews with the right questions",
        duration: "15:20"
      },
      {
        id: "landing-pages",
        slug: "landing-pages",
        url: "https://edu.fikrahub.com/videos/FrikaHub-landing-pages.mp4",
        title: "Landing Pages",
        description: "Build high-converting landing pages that capture leads",
        duration: "18:15"
      },
      {
        id: "launch-roadmap",
        slug: "launch-roadmap",
        url: "https://edu.fikrahub.com/videos/FrikaHub-launch-roadmap.mp4",
        title: "Launch Roadmap",
        description: "Plan your product launch with a structured roadmap",
        duration: "14:40"
      },
      {
        id: "lean-canvas",
        slug: "lean-canvas",
        url: "https://edu.fikrahub.com/videos/FrikaHub-lean-canvas.mp4",
        title: "Lean Canvas",
        description: "Validate your business model with the Lean Canvas framework",
        duration: "16:25"
      },
      {
        id: "marketing-content",
        slug: "marketing-content",
        url: "https://edu.fikrahub.com/videos/FrikaHub-marketing-content.mp4",
        title: "Marketing Content",
        description: "Create engaging marketing content that resonates",
        duration: "11:50"
      },
      {
        id: "marketing-overview",
        slug: "marketing-overview",
        url: "https://edu.fikrahub.com/videos/FrikaHub-marketing-overview.mp4",
        title: "Marketing Overview",
        description: "Get a comprehensive overview of marketing strategies",
        duration: "13:30"
      },
      {
        id: "swot-analysis",
        slug: "swot-analysis",
        url: "https://edu.fikrahub.com/videos/FrikaHub-swot-analysis.mp4",
        title: "SWOT Analysis",
        description: "Analyze your strengths, weaknesses, opportunities, and threats",
        duration: "9:45"
      },
      {
        id: "tasks-management",
        slug: "tasks-management",
        url: "https://edu.fikrahub.com/videos/FrikaHub-tasks-management.mp4",
        title: "Tasks Management",
        description: "Organize and prioritize tasks effectively",
        duration: "8:20"
      },
      {
        id: "team-roles",
        slug: "team-roles",
        url: "https://edu.fikrahub.com/videos/FrikaHub-team-roles.mp4",
        title: "Team Roles",
        description: "Define clear roles and responsibilities for your team",
        duration: "10:15"
      },
      {
        id: "user-journey",
        slug: "user-journey",
        url: "https://edu.fikrahub.com/videos/FrikaHub-user-journey-map.mp4",
        title: "User Journey Map",
        description: "Map out your customer's journey from awareness to advocacy",
        duration: "12:30"
      },
      {
        id: "user-personas",
        slug: "user-personas",
        url: "https://edu.fikrahub.com/videos/FrikaHub-user-personas.mp4",
        title: "User Personas",
        description: "Create detailed personas to understand your target users",
        duration: "11:40"
      },
      {
        id: "user-stories",
        slug: "user-stories",
        url: "https://edu.fikrahub.com/videos/FrikaHub-user-stories.mp4",
        title: "User Stories",
        description: "Write effective user stories for product development",
        duration: "9:55"
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
          {COURSES.map((course) => (
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
                {/* START COURSE overlay button */}
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
                  <span>{course.videoCount} lessons</span>
                  <span>{course.duration}</span>
                </div>
              </CardContent>
            </Card>
          ))}
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
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {course.videos.map((video, index) => (
            <Card
              key={video.id}
              className="overflow-hidden border border-border/50 hover:border-border hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setLocation(`/w/${currentSlug}/academy/${courseSlug}/${video.slug}`)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {video.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {video.description}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{video.duration}</span>
                  <PlayCircle className="w-5 h-5 text-primary" />
                </div>
              </div>
            </Card>
          ))}
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
              className="w-full h-full object-contain"
              controls
              autoPlay
              preload="metadata"
              src={video.url}
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
              {course.videos.map((v, index) => (
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
                      v.id === video.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        v.id === video.id ? 'text-primary' : 'text-foreground'
                      }`}>
                        {v.title}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{v.duration}</span>
                  </div>
                </div>
              ))}
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
