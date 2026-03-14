import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  ExternalLink,
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
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
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

export default function MentorDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "profile">("overview");
  const [setupOpen, setSetupOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [viewingIdeaBooking, setViewingIdeaBooking] = useState<Booking | null>(null);

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

  const totalSessions = bookings.length;
  const activeStudents = new Set(bookings.map((b) => b.userId)).size;
  const pendingRequests = bookings.filter((b) => b.status === "PENDING").length;
  const todayBookings = bookings.filter((b) => b.bookedDate === today);
  const pendingBookings = bookings.filter((b) => b.status === "PENDING");
  const displayedBookings = showAllBookings ? bookings : todayBookings;

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
    { key: "profile", label: "Profile" },
  ] as const;

  const stats = [
    { label: "Total Sessions", value: totalSessions, icon: TrendingUp, colorClass: "text-blue-600" },
    { label: "Active Students", value: activeStudents, icon: Users, colorClass: "text-green-600" },
    { label: "Average Rating", value: "0.0", icon: Star, colorClass: "text-yellow-500" },
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
        {/* Idea / Pitch Deck actions */}
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
        </div>
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
        <div className="absolute top-4 sm:top-6 ltr:right-4 ltr:sm:right-6 rtl:left-4 rtl:sm:left-6 flex items-center gap-2 sm:gap-3 z-10">
          <LanguageSwitcher />
        </div>

        {/* Page Header */}
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Mentor Dashboard</h1>
              <p className="text-text-secondary mt-1 text-sm sm:text-base">Manage your sessions and bookings</p>
            </div>
            <div className="flex gap-1 p-1 rounded-lg bg-muted mt-1">
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

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-card border border-border rounded-lg p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <p className="text-text-secondary text-xs sm:text-sm">{stat.label}</p>
                      <stat.icon size={16} className={stat.colorClass} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-text-primary">{stat.value}</p>
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

          {/* ── CALENDAR TAB ── */}
          {activeTab === "calendar" && (
            <div className="bg-card border border-border rounded-lg overflow-hidden max-w-lg">
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
                {selectedCalendarDay && (
                  <div className="mt-5 space-y-2 border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Sessions on {selectedCalendarDay}</h3>
                    {calendarDayBookings.length === 0 ? (
                      <p className="text-text-secondary text-sm text-center py-3">No sessions</p>
                    ) : (
                      calendarDayBookings.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {getInitials(b.bookerFirstName, b.bookerLastName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{b.bookerFirstName} {b.bookerLastName}</p>
                            <p className="text-text-secondary text-xs">{formatTime(b.bookedTime)} · {b.durationMinutes} min</p>
                          </div>
                          <StatusPill status={b.status} />
                        </div>
                      ))
                    )}
                  </div>
                )}
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

      {/* Idea view dialog */}
      {viewingIdeaBooking && (
        <IdeaViewDialog
          booking={viewingIdeaBooking}
          open={!!viewingIdeaBooking}
          onClose={() => setViewingIdeaBooking(null)}
        />
      )}
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
import { useMutation as _useMutation, useQueryClient as _useQueryClient } from "@tanstack/react-query";
import { useToast as _useToast } from "@/hooks/use-toast";

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
    <div className="max-w-2xl space-y-5">
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
    </div>
  );
}
