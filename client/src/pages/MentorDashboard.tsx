import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MentorProfileSetup from "@/components/mentors/MentorProfileSetup";
import {
  Calendar,
  Clock,
  Users,
  Star,
  TrendingUp,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";

interface Booking {
  id: string;
  userId: string;
  bookerFirstName?: string;
  bookerLastName?: string;
  ideaTitle?: string;
  bookedDate: string;
  bookedTime: string;
  durationMinutes: number;
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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

export default function MentorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "calendar">("overview");
  const [setupOpen, setSetupOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [showAllBookings, setShowAllBookings] = useState(false);

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

  // Calendar helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const bookedDays = new Set(
    bookings.map((b) => b.bookedDate.split("T")[0])
  );

  const calendarDayBookings = selectedCalendarDay
    ? bookings.filter((b) => b.bookedDate.split("T")[0] === selectedCalendarDay)
    : [];

  const getUserDisplayName = () => {
    if (!user) return "";
    return (user as any).fullName || (user as any).firstName || (user as any).username || "";
  };

  const showProfileBanner = !profile || !profile.bio;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #0d1425 40%, #0f0f1a 100%)" }}
    >
      {/* Header */}
      <header
        className="h-16 flex items-center justify-between px-6 sticky top-0 z-50"
        style={{
          background: "rgba(15,15,26,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white">Mentor Dashboard</h1>
          <p className="text-xs text-gray-400">Welcome back, {getUserDisplayName()}</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
          {(["overview", "calendar"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {activeTab === "overview" && (
            <>
              {/* Profile Completion Banner */}
              {showProfileBanner && (
                <div
                  className="rounded-2xl p-5 flex items-center justify-between gap-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(24,80,238,0.2) 0%, rgba(139,92,246,0.2) 100%)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div>
                    <h3 className="text-white font-semibold mb-1">Complete your profile</h3>
                    <p className="text-gray-400 text-sm">
                      Set up your mentor profile to appear in the Mentors directory and start receiving bookings.
                    </p>
                  </div>
                  <Button
                    onClick={() => setSetupOpen(true)}
                    className="shrink-0 bg-primary hover:bg-primary/90 text-white"
                  >
                    Set Up Profile
                  </Button>
                </div>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Sessions", value: totalSessions, icon: TrendingUp, color: "text-blue-400" },
                  { label: "Active Students", value: activeStudents, icon: Users, color: "text-green-400" },
                  { label: "Average Rating", value: "0.0", icon: Star, color: "text-yellow-400" },
                  { label: "Pending Requests", value: pendingRequests, icon: Clock, color: "text-orange-400" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-400 text-sm">{stat.label}</p>
                      <stat.icon size={18} className={stat.color} />
                    </div>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule */}
                <div
                  className="lg:col-span-2 rounded-2xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-semibold">
                      {showAllBookings ? "All Bookings" : "Today's Schedule"}
                    </h2>
                    <button
                      onClick={() => setShowAllBookings(!showAllBookings)}
                      className="text-primary text-sm hover:underline"
                    >
                      {showAllBookings ? "Show Today" : "View All"}
                    </button>
                  </div>

                  {displayedBookings.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      {showAllBookings ? "No bookings yet" : "No sessions scheduled for today"}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl p-4 flex items-start gap-4"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                            {getInitials(booking.bookerFirstName, booking.bookerLastName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-medium text-sm">
                                {booking.bookerFirstName} {booking.bookerLastName}
                              </p>
                              <Badge
                                className={`text-xs ${
                                  booking.status === "CONFIRMED"
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : booking.status === "CANCELLED"
                                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                }`}
                              >
                                {booking.status === "PENDING" ? "Scheduled" : booking.status.toLowerCase()}
                              </Badge>
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5">
                              {booking.ideaTitle || "General session"}
                            </p>
                            {booking.notes && (
                              <p className="text-gray-500 text-xs mt-1 line-clamp-1">{booking.notes}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 text-xs text-gray-400">
                            <p>{formatTime(booking.bookedTime)}</p>
                            <p>{booking.durationMinutes} min</p>
                            {showAllBookings && (
                              <p className="mt-0.5 text-gray-500">{booking.bookedDate}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Requests */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <h2 className="text-white font-semibold mb-4">New Requests</h2>
                  {pendingBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No pending requests</div>
                  ) : (
                    <div className="space-y-3">
                      {pendingBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl p-3"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                              {getInitials(booking.bookerFirstName, booking.bookerLastName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">
                                {booking.bookerFirstName} {booking.bookerLastName}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {booking.bookedDate} · {formatTime(booking.bookedTime)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmMutation.mutate({ id: booking.id, status: "CONFIRMED" })}
                              disabled={confirmMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-green-400 transition-colors"
                              style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}
                            >
                              <CheckCircle size={12} /> Confirm
                            </button>
                            <button
                              onClick={() => confirmMutation.mutate({ id: booking.id, status: "CANCELLED" })}
                              disabled={confirmMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-red-400 transition-colors"
                              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}
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
            </>
          )}

          {activeTab === "calendar" && (
            <div
              className="rounded-2xl p-6 max-w-lg mx-auto"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">
                  {MONTHS[month]} {year}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs text-gray-500 py-1 font-medium">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateStr === today;
                  const hasBooking = bookedDays.has(dateStr);
                  const isSelected = dateStr === selectedCalendarDay;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedCalendarDay(isSelected ? null : dateStr)}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all relative flex items-center justify-center ${
                        isSelected
                          ? "bg-primary text-white"
                          : isToday
                          ? "bg-primary/20 text-primary"
                          : "text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {day}
                      {hasBooking && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Bookings */}
              {selectedCalendarDay && (
                <div className="mt-6 space-y-2">
                  <h3 className="text-white font-medium text-sm mb-3">
                    Sessions on {selectedCalendarDay}
                  </h3>
                  {calendarDayBookings.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No sessions</p>
                  ) : (
                    calendarDayBookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl p-3 flex items-center gap-3"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {getInitials(b.bookerFirstName, b.bookerLastName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm">
                            {b.bookerFirstName} {b.bookerLastName}
                          </p>
                          <p className="text-gray-400 text-xs">{formatTime(b.bookedTime)} · {b.durationMinutes} min</p>
                        </div>
                        <Badge
                          className={`text-xs ${
                            b.status === "CONFIRMED"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : b.status === "CANCELLED"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }`}
                        >
                          {b.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <MentorProfileSetup open={setupOpen} onOpenChange={setSetupOpen} />
    </div>
  );
}
