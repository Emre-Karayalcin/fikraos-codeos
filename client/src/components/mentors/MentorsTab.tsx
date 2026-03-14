import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import MentorCard from "./MentorCard";
import MentorProfileSheet from "./MentorProfileSheet";

interface Mentor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  title?: string;
  bio?: string;
  expertise?: string[];
  industries?: string[];
  sessionDurationMinutes?: number;
  location?: string;
  website?: string;
}

interface MyBooking {
  id: string;
  mentorProfileId: string;
  mentorFirstName?: string;
  mentorLastName?: string;
  mentorProfileImageUrl?: string;
  mentorTitle?: string;
  ideaId?: string;
  ideaTitle?: string;
  pitchDeckId?: string;
  bookedDate: string;
  bookedTime: string;
  durationMinutes: number;
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function BookingStatusBadge({ status }: { status: string }) {
  if (status === "CONFIRMED") return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Confirmed</Badge>;
  if (status === "CANCELLED") return <Badge className="bg-red-100 text-red-600 border-0 text-xs">Cancelled</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Pending</Badge>;
}

function MyBookingsSection() {
  const [showAll, setShowAll] = useState(false);

  const { data: bookings = [], isLoading } = useQuery<MyBooking[]>({
    queryKey: ["/api/mentor-bookings/mine"],
  });

  if (isLoading || bookings.length === 0) return null;

  const upcoming = bookings.filter((b) => b.status !== "CANCELLED");
  const visible = showAll ? upcoming : upcoming.slice(0, 3);

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">My Sessions</h3>
        <span className="text-xs text-muted-foreground">{upcoming.length} booking{upcoming.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-2">
        {visible.map((booking) => {
          const initials = `${booking.mentorFirstName?.[0] ?? ""}${booking.mentorLastName?.[0] ?? ""}`.toUpperCase() || "M";
          return (
            <div
              key={booking.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={booking.mentorProfileImageUrl} />
                <AvatarFallback className="text-xs font-semibold bg-primary/15 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {booking.mentorFirstName} {booking.mentorLastName}
                  </span>
                  {booking.mentorTitle && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      · {booking.mentorTitle}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {booking.bookedDate}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(booking.bookedTime)} · {booking.durationMinutes} min
                  </span>
                  {booking.ideaTitle && (
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      💡 {booking.ideaTitle}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <BookingStatusBadge status={booking.status} />
              </div>
            </div>
          );
        })}
      </div>

      {upcoming.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {showAll ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {upcoming.length} sessions</>}
        </button>
      )}

      <div className="border-t border-border pt-2" />
    </div>
  );
}

export default function MentorsTab() {
  const [search, setSearch] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: mentors = [], isLoading } = useQuery<Mentor[]>({
    queryKey: ["/api/mentors"],
  });

  const filtered = mentors.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${m.firstName} ${m.lastName}`.toLowerCase();
    const exp = (m.expertise || []).join(" ").toLowerCase();
    return name.includes(q) || exp.includes(q) || (m.title || "").toLowerCase().includes(q);
  });

  const handleCardClick = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6 p-1">
      {/* My Bookings */}
      <MyBookingsSection />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Who are you searching for?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No mentors found</p>
          <p className="text-sm mt-1">
            {search ? "Try a different search term" : "No mentors available yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} onClick={() => handleCardClick(mentor)} />
          ))}
        </div>
      )}

      {selectedMentor && (
        <MentorProfileSheet
          mentor={selectedMentor}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </div>
  );
}
