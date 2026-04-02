import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AllAIOutputsView } from "@/components/idea/AllAIOutputsView";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MentorProfileSetup from "@/components/mentors/MentorProfileSetup";
import {
  TrendingUp,
  Users,
  Star,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  ExternalLink,
  Layers,
  Rocket,
  RefreshCw,
} from "lucide-react";

interface Booking {
  id: string;
  userId: string;
  bookerFirstName?: string;
  bookerLastName?: string;
  ideaId?: string;
  ideaTitle?: string;
  ideaSummary?: string;
  ideaTags?: string[];
  ideaStatus?: string;
  pitchDeckId?: string;
  pitchDeckDownloadUrl?: string;
  pitchDeckStatus?: string;
  bookedDate: string;
  bookedTime: string;
  durationMinutes: number;
  meetingProvider?: string | null;
  meetingLink?: string | null;
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  mentorFeedback?: string | null;
  rating?: number | null;
  feedback?: string | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getInitials(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "CONFIRMED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
    status === "CANCELLED" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {status === "PENDING" ? "Scheduled" : status.toLowerCase()}
    </span>
  );
}

function IdeaViewDialog({ booking, open, onClose }: { booking: Booking; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-text-primary text-lg">{booking.ideaTitle || "Idea"}</DialogTitle>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {booking.ideaStatus && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                {booking.ideaStatus.toLowerCase().replace(/_/g, " ")}
              </span>
            )}
            {booking.ideaSummary && (
              <span className="text-xs text-text-secondary line-clamp-1 flex-1">{booking.ideaSummary}</span>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {booking.ideaId ? (
            <AllAIOutputsView ideaId={booking.ideaId} />
          ) : (
            <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
              No idea linked to this booking.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IdeaResourcesDialog({ idea, open, onClose }: { idea: any; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-text-primary text-lg">{idea?.title || "Idea Resources"}</DialogTitle>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {idea?.status && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                {idea.status.toLowerCase().replace(/_/g, " ")}
              </span>
            )}
            {idea?.description && (
              <span className="text-xs text-text-secondary line-clamp-1 flex-1">{idea.description}</span>
            )}
          </div>
          {/* Quick resource links */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {idea?.pitchDeckUrl && (
              <a href={idea.pitchDeckUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-full px-3 py-1 hover:bg-primary/5 transition-colors">
                <FileText size={11} /> Pitch Deck <ExternalLink size={10} />
              </a>
            )}
            {idea?.pitchDecks?.filter((d: any) => d.downloadUrl).map((deck: any) => (
              <a key={deck.id} href={deck.downloadUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-purple-600 border border-purple-300 rounded-full px-3 py-1 hover:bg-purple-50 transition-colors">
                <FileText size={11} /> Generated Deck <ExternalLink size={10} />
              </a>
            ))}
            {idea?.deploymentUrl && (
              <a href={idea.deploymentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-green-600 border border-green-300 rounded-full px-3 py-1 hover:bg-green-50 transition-colors">
                <Rocket size={11} /> Prototype / Live App <ExternalLink size={10} />
              </a>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {idea?.id ? (
            <AllAIOutputsView ideaId={idea.id} />
          ) : (
            <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
              No AI outputs yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MentorDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "feedback" | "profile" | "participants">("overview");
  const [setupOpen, setSetupOpen] = useState(false);

  // Handle Calendly OAuth redirect result (?calendly=connected|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendly = params.get("calendly");
    if (!calendly) return;
    // Clean the URL
    const clean = window.location.pathname;
    window.history.replaceState({}, "", clean);
    if (calendly === "connected") {
      toast({ title: "Calendly connected!", description: "Your Calendly account is now linked. Select an event type in your profile." });
      setSetupOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/calendly/status"] });
    } else {
      const reason = params.get("reason") || "unknown";
      toast({ title: "Calendly connection failed", description: reason, variant: "destructive" });
    }
  }, []);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [viewingIdeaBooking, setViewingIdeaBooking] = useState<Booking | null>(null);
  const [viewingParticipantIdea, setViewingParticipantIdea] = useState<any | null>(null);
  const [mentorFeedbackDrafts, setMentorFeedbackDrafts] = useState<Record<string, string>>({});
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/mentor-profile/me"],
    queryFn: async () => {
      const res = await fetch("/api/mentor-profile/me", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/mentor-profile/my-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/mentor-profile/my-bookings", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const { data: participants = [] } = useQuery<any[]>({
    queryKey: ["/api/mentor-profile/my-participants"],
    queryFn: async () => {
      const res = await fetch("/api/mentor-profile/my-participants", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/mentor-bookings/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor-profile/my-bookings"] });
      toast({ title: "Booking updated" });
    },
    onError: () => toast({ title: "Failed to update booking", variant: "destructive" }),
  });

  const mentorFeedbackMutation = useMutation({
    mutationFn: async ({ id, mentorFeedback }: { id: string; mentorFeedback: string }) => {
      return apiRequest("PATCH", `/api/mentor-bookings/${id}/mentor-feedback`, { mentorFeedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor-profile/my-bookings"] });
      toast({ title: "Participant feedback saved" });
    },
    onError: () => toast({ title: "Failed to save feedback", variant: "destructive" }),
  });

  const cancelConfirmedMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("PATCH", `/api/mentor-bookings/${id}/status`, { status: "CANCELLED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor-profile/my-bookings"] });
      toast({ title: "Session cancelled" });
      setCancelTarget(null);
    },
    onError: () => toast({ title: "Failed to cancel booking", variant: "destructive" }),
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, bookedDate, bookedTime }: { id: string; bookedDate: string; bookedTime: string }) =>
      apiRequest("PATCH", `/api/mentor-bookings/${id}/reschedule`, { bookedDate, bookedTime }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor-profile/my-bookings"] });
      toast({ title: "Reschedule proposed", description: "The member will be notified." });
      setRescheduleTarget(null);
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to reschedule", variant: "destructive" }),
  });

  const totalSessions = bookings.length;
  const activeStudents = new Set(bookings.map((b) => b.userId)).size;
  const pendingRequests = bookings.filter((b) => b.status === "PENDING").length;
  const todayBookings = bookings.filter((b) => b.bookedDate === today);
  const pendingBookings = bookings.filter((b) => b.status === "PENDING");
  const displayedBookings = showAllBookings ? bookings : todayBookings;
  const ratedBookings = bookings.filter((b) => b.rating != null && b.rating > 0);
  const averageRating = ratedBookings.length > 0
    ? ratedBookings.reduce((s, b) => s + (b.rating ?? 0), 0) / ratedBookings.length
    : null;
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const totalHours = Math.round(completedBookings.reduce((sum, b) => sum + (b.durationMinutes ?? 60), 0) / 60 * 10) / 10;
  const confirmedOrCompleted = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED").length;
  const attendanceRate = confirmedOrCompleted > 0 ? Math.round((completedBookings.length / confirmedOrCompleted) * 100) : null;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const bookedDays = new Set(bookings.map((b) => b.bookedDate.split("T")[0]));
  const calendarDayBookings = selectedCalendarDay
    ? bookings.filter((b) => b.bookedDate.split("T")[0] === selectedCalendarDay)
    : [];

  const showProfileBanner = !profile || !profile.bio;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "calendar", label: "Calendar" },
    { key: "feedback", label: "Feedback" },
    { key: "profile", label: "Profile" },
    { key: "participants", label: "Participants" },
  ] as const;

  const stats = [
    { label: "Total Sessions", value: totalSessions, icon: TrendingUp, colorClass: "text-blue-600" },
    { label: "Hours Logged", value: `${totalHours}h`, icon: Clock, colorClass: "text-purple-500" },
    { label: "Assigned Participants", value: participants.length, icon: Users, colorClass: "text-primary", onClick: () => setActiveTab("participants") },
    { label: "Avg Rating", value: averageRating != null ? averageRating.toFixed(1) : "—", icon: Star, colorClass: "text-yellow-500" },
    { label: "Attendance Rate", value: attendanceRate != null ? `${attendanceRate}%` : "—", icon: CheckCircle, colorClass: "text-green-500" },
    { label: "Pending Requests", value: pendingRequests, icon: Clock, colorClass: "text-orange-500" },
  ];

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
        {getInitials(booking.bookerFirstName, booking.bookerLastName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-text-primary">
            {booking.bookerFirstName} {booking.bookerLastName}
          </p>
          <StatusPill status={booking.status} />
        </div>
        <p className="text-text-secondary text-xs mt-0.5">{booking.ideaTitle || "General session"}</p>
        {booking.notes && <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{booking.notes}</p>}
        {/* Idea / Pitch Deck / Meeting actions */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {booking.ideaId && (
            <button
              onClick={() => setViewingIdeaBooking(booking)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Eye size={11} /> View Idea
            </button>
          )}
          {booking.pitchDeckId && booking.pitchDeckDownloadUrl && (
            <a
              href={booking.pitchDeckDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <FileText size={11} /> View Pitch Deck <ExternalLink size={10} />
            </a>
          )}
          {booking.meetingLink && (
            <a
              href={booking.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink size={11} /> Meeting Link
            </a>
          )}
        </div>
        {/* Cancel / Reschedule for confirmed bookings */}
        {booking.status === "CONFIRMED" && (
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => { setRescheduleTarget(booking); setRescheduleDate(booking.bookedDate); setRescheduleTime(booking.bookedTime); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw size={11} /> Reschedule
            </button>
            <button
              onClick={() => setCancelTarget(booking)}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
            >
              <XCircle size={11} /> Cancel
            </button>
          </div>
        )}
      </div>
      <div className="text-right shrink-0 text-xs text-text-secondary">
        <p className="font-medium text-text-primary">{formatTime(booking.bookedTime)}</p>
        <p>{booking.durationMinutes} min</p>
        {showAllBookings && <p className="mt-0.5 text-muted-foreground">{booking.bookedDate}</p>}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-0">

        {/* Page Header */}
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Mentor Dashboard</h1>
              <p className="text-text-secondary mt-1 text-sm sm:text-base">Manage your sessions and bookings</p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex gap-1 p-1 rounded-lg bg-muted">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-background text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto space-y-4 sm:space-y-6">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <>
              {showProfileBanner && (
                <div className="bg-card border border-border rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h3 className="font-semibold text-text-primary">Complete your profile</h3>
                    <p className="text-text-secondary text-sm mt-0.5">
                      Set up your mentor profile to appear in the Mentors directory and start receiving bookings.
                    </p>
                  </div>
                  <Button onClick={() => setSetupOpen(true)} className="shrink-0">
                    Set Up Profile
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    onClick={stat.onClick}
                    className={`bg-card border border-border rounded-lg p-4 sm:p-5 ${stat.onClick ? "cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <p className="text-text-secondary text-xs sm:text-sm">{stat.label}</p>
                      <stat.icon size={16} className={stat.colorClass} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-text-primary">{stat.value}</p>
                    {stat.onClick && (
                      <p className="text-xs text-primary mt-1.5">View all →</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Today's Schedule */}
                <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
                    <h2 className="font-semibold text-text-primary">
                      {showAllBookings ? "All Bookings" : "Today's Schedule"}
                    </h2>
                    <button
                      onClick={() => setShowAllBookings(!showAllBookings)}
                      className="text-primary text-sm hover:opacity-80 transition-opacity"
                    >
                      {showAllBookings ? "Show Today" : "View All"}
                    </button>
                  </div>
                  <div className="p-4 sm:p-5">
                    {displayedBookings.length === 0 ? (
                      <p className="text-center text-text-secondary text-sm py-8">
                        {showAllBookings ? "No bookings yet" : "No sessions scheduled for today"}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {displayedBookings.map((b) => <BookingCard key={b.id} booking={b} />)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Requests */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-border">
                    <h2 className="font-semibold text-text-primary">New Requests</h2>
                  </div>
                  <div className="p-4 sm:p-5">
                    {pendingBookings.length === 0 ? (
                      <p className="text-center text-text-secondary text-sm py-8">No pending requests</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingBookings.map((booking) => (
                          <div key={booking.id} className="p-3 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {getInitials(booking.bookerFirstName, booking.bookerLastName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                  {booking.bookerFirstName} {booking.bookerLastName}
                                </p>
                                <p className="text-text-secondary text-xs">{booking.bookedDate} · {formatTime(booking.bookedTime)}</p>
                              </div>
                            </div>
                            {booking.ideaId && (
                              <button
                                onClick={() => setViewingIdeaBooking(booking)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                              >
                                <Eye size={11} /> {booking.ideaTitle || "View Idea"}
                              </button>
                            )}
                            {booking.pitchDeckDownloadUrl && (
                              <a
                                href={booking.pitchDeckDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                              >
                                <FileText size={11} /> View Pitch Deck <ExternalLink size={10} />
                              </a>
                            )}
                            {booking.meetingLink && (
                              <a
                                href={booking.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                              >
                                <ExternalLink size={11} /> Open Meeting Link <ExternalLink size={10} />
                              </a>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => confirmMutation.mutate({ id: booking.id, status: "CONFIRMED" })}
                                disabled={confirmMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 transition-colors"
                              >
                                <CheckCircle size={12} /> Confirm
                              </button>
                              <button
                                onClick={() => confirmMutation.mutate({ id: booking.id, status: "CANCELLED" })}
                                disabled={confirmMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-colors"
                              >
                                <XCircle size={12} /> Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── PARTICIPANTS TAB ── */}
          {activeTab === "participants" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-primary" />
                <h2 className="font-semibold text-text-primary">My Participants</h2>
                <span className="text-xs text-text-secondary ml-1">({participants.length} assigned)</span>
              </div>

              {participants.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-text-secondary text-sm">
                    No participants assigned yet. Ask your PMO to assign members to you.
                  </p>
                </div>
              ) : (
                participants.map((p: any) => (
                  <div key={p.user.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    {/* Member header */}
                    <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/20">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        {getInitials(p.user.firstName, p.user.lastName)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-text-primary text-sm">
                          {p.user.firstName} {p.user.lastName}
                        </p>
                        <p className="text-xs text-text-secondary">{p.user.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {p.ideas?.length ?? 0} idea{p.ideas?.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    <div className="p-4 space-y-3">
                      {p.ideas?.length === 0 && (
                        <p className="text-xs text-text-secondary italic text-center py-2">No ideas created yet.</p>
                      )}
                      {p.ideas?.map((idea: any) => {
                        const hasGeneratedDecks = idea.pitchDecks?.some((d: any) => d.downloadUrl);
                        const hasPitchDeck = idea.pitchDeckUrl || hasGeneratedDecks;
                        const hasPrototype = !!idea.deploymentUrl;
                        return (
                          <div key={idea.id} className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm text-text-primary truncate">{idea.title}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                                    {idea.status?.replace(/_/g, " ").toLowerCase() ?? "backlog"}
                                  </span>
                                </div>
                                {idea.description && (
                                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{idea.description}</p>
                                )}
                                {/* Resource badges */}
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  {hasPitchDeck && (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-200">
                                      <FileText size={10} /> Pitch Deck
                                    </span>
                                  )}
                                  {hasPrototype && (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-200">
                                      <Rocket size={10} /> Prototype
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Action buttons */}
                              <div className="flex items-center gap-2 flex-wrap shrink-0">
                                <button
                                  onClick={() => setViewingParticipantIdea(idea)}
                                  className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-md px-2.5 py-1.5 hover:bg-primary/5 transition-colors"
                                >
                                  <Layers size={11} /> AI Outputs
                                </button>
                                {idea.pitchDeckUrl && (
                                  <a href={idea.pitchDeckUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-purple-600 border border-purple-300 rounded-md px-2.5 py-1.5 hover:bg-purple-50 transition-colors">
                                    <FileText size={11} /> Pitch Deck <ExternalLink size={10} />
                                  </a>
                                )}
                                {idea.pitchDecks?.filter((d: any) => d.downloadUrl).slice(0, 1).map((deck: any) => (
                                  <a key={deck.id} href={deck.downloadUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-purple-600 border border-purple-300 rounded-md px-2.5 py-1.5 hover:bg-purple-50 transition-colors">
                                    <FileText size={11} /> Gen. Deck <ExternalLink size={10} />
                                  </a>
                                ))}
                                {idea.deploymentUrl && (
                                  <a href={idea.deploymentUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-green-600 border border-green-300 rounded-md px-2.5 py-1.5 hover:bg-green-50 transition-colors">
                                    <Rocket size={11} /> Prototype <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── CALENDAR TAB ── */}
          {activeTab === "calendar" && (
            <div className="flex flex-col lg:flex-row gap-5 items-start">

              {/* Left: Calendar */}
              <div className="bg-card border border-border rounded-lg overflow-hidden w-full lg:w-80 xl:w-96 shrink-0">
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-text-primary">{MONTHS[month]} {year}</h2>
                  <div className="flex gap-1">
                    <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-muted transition-colors"><ChevronLeft size={16} /></button>
                    <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-muted transition-colors"><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-7 mb-2">
                    {DAYS.map((d) => <div key={d} className="text-center text-xs text-text-secondary py-1 font-medium">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isToday = dateStr === today;
                      const hasBooking = bookedDays.has(dateStr);
                      const isSelected = dateStr === selectedCalendarDay;
                      return (
                        <button key={day} onClick={() => setSelectedCalendarDay(isSelected ? null : dateStr)}
                          className={`aspect-square rounded-lg text-sm font-medium transition-all relative flex items-center justify-center ${isSelected ? "bg-primary text-white" : isToday ? "text-primary font-bold" : "text-text-primary hover:bg-muted"}`}>
                          {day}
                          {hasBooking && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                  {selectedCalendarDay && calendarDayBookings.length > 0 && (
                    <p className="text-xs text-text-secondary mt-4 pt-3 border-t border-border text-center">
                      {calendarDayBookings.length} session{calendarDayBookings.length !== 1 ? "s" : ""} on {selectedCalendarDay} — see right panel
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Bookings grid */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary">
                    {selectedCalendarDay ? `Sessions on ${selectedCalendarDay}` : "All Sessions"}
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedCalendarDay && (
                      <button
                        onClick={() => setSelectedCalendarDay(null)}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear filter
                      </button>
                    )}
                    <span className="text-xs text-text-secondary bg-muted px-2 py-0.5 rounded-full">
                      {(selectedCalendarDay ? calendarDayBookings : bookings).length} booking{(selectedCalendarDay ? calendarDayBookings : bookings).length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {(selectedCalendarDay ? calendarDayBookings : bookings).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                    <Calendar size={36} className="mb-3 opacity-30" />
                    <p className="text-sm">{selectedCalendarDay ? "No sessions on this day" : "No bookings yet"}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {(selectedCalendarDay ? calendarDayBookings : bookings).map((b) => (
                      <div key={b.id} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors">
                        {/* Booker */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                            {getInitials(b.bookerFirstName, b.bookerLastName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{b.bookerFirstName} {b.bookerLastName}</p>
                            {b.ideaTitle && <p className="text-xs text-muted-foreground truncate">💡 {b.ideaTitle}</p>}
                          </div>
                          <StatusPill status={b.status} />
                        </div>
                        {/* Time */}
                        <div className="flex items-center gap-3 text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {b.bookedDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatTime(b.bookedTime)} · {b.durationMinutes} min
                          </span>
                        </div>
                        {/* Notes */}
                        {b.notes && (
                          <p className="text-xs text-text-secondary bg-muted/40 rounded-md px-2.5 py-1.5 line-clamp-2">{b.notes}</p>
                        )}
                        {b.meetingLink && (
                          <a
                            href={b.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink size={11} /> Open Meeting Link
                          </a>
                        )}
                        {b.status === "CONFIRMED" && (
                          <div className="flex items-center gap-3 pt-1 border-t border-border">
                            <button
                              onClick={() => { setRescheduleTarget(b); setRescheduleDate(b.bookedDate); setRescheduleTime(b.bookedTime); }}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <RefreshCw size={11} /> Reschedule
                            </button>
                            <button
                              onClick={() => setCancelTarget(b)}
                              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                            >
                              <XCircle size={11} /> Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── FEEDBACK TAB ── */}
          {activeTab === "feedback" && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-text-primary">Member Reviews</h2>
                  <p className="text-text-secondary text-sm mt-0.5">
                    {ratedBookings.length === 0
                      ? "No reviews yet"
                      : `${ratedBookings.length} review${ratedBookings.length !== 1 ? "s" : ""} · avg ${averageRating!.toFixed(1)} / 5`}
                  </p>
                </div>
                {averageRating != null && (
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={18}
                        className={s <= Math.round(averageRating!) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}
                      />
                    ))}
                  </div>
                )}
              </div>

              {ratedBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-secondary bg-card border border-border rounded-xl">
                  <Star size={32} className="mb-3 opacity-20" />
                  <p className="text-sm">No feedback from members yet</p>
                  <p className="text-xs mt-1 text-muted-foreground">Reviews will appear here after completed sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratedBookings.map((b) => (
                    <div key={b.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {getInitials(b.bookerFirstName, b.bookerLastName)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {b.bookerFirstName} {b.bookerLastName}
                            </p>
                            {b.ideaTitle && (
                              <p className="text-xs text-muted-foreground">💡 {b.ideaTitle}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-text-secondary">{b.bookedDate}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={s <= (b.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}
                          />
                        ))}
                      </div>
                      {b.feedback && (
                        <p className="text-sm text-muted-foreground italic">"{b.feedback}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-text-primary">Feedback to Participants</h3>
                <p className="text-text-secondary text-sm mt-0.5">
                  Share post-session notes that participants can view in their My Sessions panel.
                </p>

                <div className="space-y-3 mt-4">
                  {bookings.filter((b) => b.status === "COMPLETED").length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-4 text-sm text-text-secondary">
                      Completed sessions will appear here.
                    </div>
                  ) : (
                    bookings
                      .filter((b) => b.status === "COMPLETED")
                      .map((b) => {
                        const value = mentorFeedbackDrafts[b.id] ?? b.mentorFeedback ?? "";
                        return (
                          <div key={`mentor-feedback-${b.id}`} className="bg-card border border-border rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-text-primary">
                                {b.bookerFirstName} {b.bookerLastName}
                                {b.ideaTitle ? ` · ${b.ideaTitle}` : ""}
                              </p>
                              <span className="text-xs text-muted-foreground">{b.bookedDate}</span>
                            </div>
                            <Textarea
                              value={value}
                              onChange={(e) => setMentorFeedbackDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))}
                              placeholder="Write actionable feedback for this participant..."
                              rows={3}
                            />
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                disabled={mentorFeedbackMutation.isPending}
                                onClick={() => mentorFeedbackMutation.mutate({ id: b.id, mentorFeedback: value })}
                              >
                                Save Feedback
                              </Button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <ProfileTab profile={profile} onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/mentor-profile/me"] })} />
          )}

        </div>
      </div>

      <BottomNavigation />

      {/* Profile setup sheet (from banner) */}
      <MentorProfileSetup open={setupOpen} onOpenChange={setSetupOpen} />

      {/* Idea view dialog (from bookings) */}
      {viewingIdeaBooking && (
        <IdeaViewDialog
          booking={viewingIdeaBooking}
          open={!!viewingIdeaBooking}
          onClose={() => setViewingIdeaBooking(null)}
        />
      )}

      {/* Idea resources dialog (from participants tab) */}
      {viewingParticipantIdea && (
        <IdeaResourcesDialog
          idea={viewingParticipantIdea}
          open={!!viewingParticipantIdea}
          onClose={() => setViewingParticipantIdea(null)}
        />
      )}

      {/* Cancel booking confirmation dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel session?</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm text-muted-foreground">
            <p>
              You are about to cancel the session with{" "}
              <strong className="text-foreground">
                {cancelTarget?.bookerFirstName} {cancelTarget?.bookerLastName}
              </strong>{" "}
              on <strong className="text-foreground">{cancelTarget?.bookedDate} at {cancelTarget?.bookedTime && formatTime(cancelTarget.bookedTime)}</strong>.
            </p>
            <p>The member will be notified. This cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>Keep Session</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelConfirmedMutation.isPending}
              onClick={() => cancelTarget && cancelConfirmedMutation.mutate(cancelTarget.id)}
            >
              {cancelConfirmedMutation.isPending ? "Cancelling…" : "Yes, Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Propose new time</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Proposing a reschedule for{" "}
              <strong className="text-foreground">
                {rescheduleTarget?.bookerFirstName} {rescheduleTarget?.bookerLastName}
              </strong>. The booking will revert to pending until the member accepts.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setRescheduleTarget(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={rescheduleMutation.isPending || !rescheduleDate || !rescheduleTime}
              onClick={() => rescheduleTarget && rescheduleMutation.mutate({ id: rescheduleTarget.id, bookedDate: rescheduleDate, bookedTime: rescheduleTime })}
            >
              {rescheduleMutation.isPending ? "Sending…" : "Propose Reschedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Inline Profile Tab ──────────────────────────────────────────────────────

import { useEffect, KeyboardEvent } from "react";
import { apiRequest as _apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Trash2 } from "lucide-react";
import { useMutation as _useMutation, useQueryClient as _useQueryClient, useQuery as _useQuery } from "@tanstack/react-query";
import { useToast as _useToast } from "@/hooks/use-toast";
import { CheckCircle2, Link2, Unlink } from "lucide-react";

const DAYS_OF_WEEK = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

interface AvailabilitySlot { dayOfWeek: number; startTime: string; endTime: string; }

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const addTag = (val: string) => {
    const t = val.trim().replace(/,$/, "").trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); }
    else if (e.key === "Backspace" && !input && tags.length > 0) onChange(tags.slice(0, -1));
  };
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
      <div className="min-h-[42px] rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-text bg-background border border-border"
        onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {t}
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)); }} className="hover:text-primary/60"><X size={10} /></button>
          </span>
        ))}
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
          onBlur={() => { if (input.trim()) addTag(input); }}
          placeholder={tags.length === 0 ? "Type and press Enter or comma" : ""}
          className="flex-1 min-w-[120px] bg-transparent text-text-primary text-sm outline-none placeholder:text-text-secondary" />
      </div>
    </div>
  );
}

function CalendlySection() {
  const { toast } = _useToast();
  const queryClient = _useQueryClient();

  const { data: status, refetch } = _useQuery<any>({
    queryKey: ["/api/mentor/calendly/status"],
    queryFn: async () => {
      const res = await fetch("/api/mentor/calendly/status", { credentials: "include" });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const disconnectMutation = _useMutation({
    mutationFn: () => _apiRequest("DELETE", "/api/mentor/calendly/disconnect"),
    onSuccess: () => { refetch(); toast({ title: "Calendly disconnected" }); },
  });

  const selectEventTypeMutation = _useMutation({
    mutationFn: (eventTypeUri: string) => _apiRequest("PUT", "/api/mentor/calendly/event-type", { eventTypeUri }),
    onSuccess: () => { refetch(); queryClient.invalidateQueries({ queryKey: ["/api/mentor/calendly/status"] }); toast({ title: "Event type saved" }); },
  });

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <h2 className="font-semibold text-text-primary mb-4">Calendly Integration</h2>
      {status?.connected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">{status.name}</p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70">{status.email}</p>
              </div>
            </div>
            <button
              onClick={() => disconnectMutation.mutate()}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              <Unlink className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>

          {status.eventTypes?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Select event type for bookings:</p>
              <div className="space-y-2">
                {status.eventTypes.map((et: any) => (
                  <button
                    key={et.uri}
                    type="button"
                    onClick={() => selectEventTypeMutation.mutate(et.uri)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      status.selectedEventTypeUri === et.uri
                        ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300"
                        : "border-border bg-muted/30 text-text-primary hover:border-primary/40"
                    }`}
                  >
                    <span className="font-medium">{et.name}</span>
                    <span className="text-xs text-text-secondary ml-2">{et.duration} min</span>
                    {status.selectedEventTypeUri === et.uri && <span className="text-xs text-green-600 dark:text-green-400 ml-2">✓ Active</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Connect your Calendly account so members receive a personal scheduling link when they book a session with you.
          </p>
          <a
            href={`/api/mentor/calendly/connect?returnTo=${encodeURIComponent(window.location.pathname)}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-sm font-medium transition-opacity"
          >
            <Link2 className="w-4 h-4" /> Connect Calendly
          </a>
        </div>
      )}
    </div>
  );
}

function ProfileTab({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const { toast } = _useToast();
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState("60");
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  useEffect(() => {
    if (profile) {
      setTitle(profile.title || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setWebsite(profile.website || "");
      setExpertise(profile.expertise || []);
      setIndustries(profile.industries || []);
      setSessionDuration(String(profile.sessionDurationMinutes || 60));
      setAvailability(profile.availability || []);
    }
  }, [profile]);

  const mutation = _useMutation({
    mutationFn: (data: any) => _apiRequest("PUT", "/api/mentor-profile/me", data),
    onSuccess: () => { toast({ title: "Profile saved" }); onSaved(); },
    onError: () => toast({ title: "Failed to save profile", variant: "destructive" }),
  });

  const handleSave = () => mutation.mutate({
    title, bio, location, website, expertise, industries,
    sessionDurationMinutes: parseInt(sessionDuration),
    isActive: true, availability,
  });

  const addSlot = () => setAvailability([...availability, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
  const updateSlot = (i: number, field: keyof AvailabilitySlot, val: string | number) =>
    setAvailability(availability.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const removeSlot = (i: number) => setAvailability(availability.filter((_, idx) => idx !== i));

  const inputClass = "w-full rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none placeholder:text-text-secondary bg-background border border-border focus:border-primary/50 transition-colors";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h2 className="font-semibold text-text-primary mb-5">Edit Profile</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CEO of Betterhelp" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell mentees about your background and expertise..." rows={4} className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Riyadh, Saudi Arabia" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Website</label>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" className={inputClass} />
            </div>
          </div>
          <TagInput label="Expertise" tags={expertise} onChange={setExpertise} />
          <TagInput label="Industries" tags={industries} onChange={setIndustries} />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Session Duration</label>
            <Select value={sessionDuration} onValueChange={setSessionDuration}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[30, 45, 60, 90].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-secondary">Availability</label>
              <button type="button" onClick={addSlot} className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity">
                <Plus size={14} /> Add Slot
              </button>
            </div>
            {availability.length === 0 && (
              <p className="text-text-secondary text-sm py-2">No slots yet. Click "Add Slot" to add one.</p>
            )}
            <div className="space-y-2">
              {availability.map((slot, i) => (
                <div key={i} className="rounded-lg p-3 flex items-center gap-3 flex-wrap bg-muted/30 border border-border">
                  <Select value={String(slot.dayOfWeek)} onValueChange={(v) => updateSlot(i, "dayOfWeek", parseInt(v))}>
                    <SelectTrigger className="w-36 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="time" value={slot.startTime} onChange={(e) => updateSlot(i, "startTime", e.target.value)} className="rounded-lg px-2 py-1.5 text-text-primary text-sm outline-none bg-background border border-border" />
                  <span className="text-text-secondary text-sm">to</span>
                  <input type="time" value={slot.endTime} onChange={(e) => updateSlot(i, "endTime", e.target.value)} className="rounded-lg px-2 py-1.5 text-text-primary text-sm outline-none bg-background border border-border" />
                  <button type="button" onClick={() => removeSlot(i)} className="ml-auto text-text-secondary hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleSave} disabled={mutation.isPending} className="w-full sm:w-auto">
            {mutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>

      <CalendlySection />
    </div>
  );
}
