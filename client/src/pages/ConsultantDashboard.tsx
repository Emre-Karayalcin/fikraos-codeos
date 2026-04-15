import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, ChevronDown, ChevronRight, User, Lightbulb, Target, Zap, Star } from "lucide-react";

interface Booking {
  bookingId: string;
  bookingStatus: string;
  bookedAt: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  ideaName: string | null;
  sector: string | null;
  problemStatement: string | null;
  solutionDescription: string | null;
  differentiator: string | null;
  targetUser: string | null;
  aiScore: number | null;
}

interface Session {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
  capacity: number;
  filledSlots: number;
  notes: string | null;
  bookings: Booking[];
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-600",
  };
  return map[s] ?? "bg-blue-100 text-blue-700";
}

function bookingBadge(s: string) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

function IdeaPanel({ booking }: { booking: Booking }) {
  if (!booking.ideaName && !booking.problemStatement) {
    return (
      <p className="text-sm text-muted-foreground italic mt-2">
        No idea submission found for this participant.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-l-2 border-primary/30 pl-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary shrink-0" />
        <span className="font-semibold text-sm">{booking.ideaName ?? "Untitled Idea"}</span>
        {booking.sector && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {booking.sector}
          </span>
        )}
        {booking.aiScore != null && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600">
            <Star className="w-3 h-3" /> AI Score: {booking.aiScore}
          </span>
        )}
      </div>

      {booking.problemStatement && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Problem</p>
          <p className="text-sm text-foreground">{booking.problemStatement}</p>
        </div>
      )}

      {booking.solutionDescription && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Solution</p>
          <p className="text-sm text-foreground">{booking.solutionDescription}</p>
        </div>
      )}

      {booking.differentiator && (
        <div className="flex gap-2">
          <Zap className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Why this solution</p>
            <p className="text-sm text-foreground">{booking.differentiator}</p>
          </div>
        </div>
      )}

      {booking.targetUser && (
        <div className="flex gap-2">
          <Target className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Target users</p>
            <p className="text-sm text-foreground">{booking.targetUser}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <button
        className="w-full flex items-center gap-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <User className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{booking.participantName || booking.participantEmail}</p>
          <p className="text-xs text-muted-foreground truncate">{booking.participantEmail}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bookingBadge(booking.bookingStatus)}`}>
          {booking.bookingStatus}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && <IdeaPanel booking={booking} />}
    </div>
  );
}

function SessionCard({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(session.scheduledAt);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <CalendarCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{session.title}</CardTitle>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(session.status)}`}>
                {session.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {" · "}
              {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {session.filledSlots}/{session.capacity} booked
            </p>
          </div>
          <button
            className="text-xs text-primary font-medium shrink-0 hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide" : `Bookings (${session.bookings.length})`}
          </button>
        </div>
        {session.notes && (
          <p className="text-sm text-muted-foreground ml-8">{session.notes}</p>
        )}
      </CardHeader>

      {expanded && session.bookings.length > 0 && (
        <CardContent className="pt-0 space-y-2">
          {session.bookings.map((b) => (
            <BookingRow key={b.bookingId} booking={b} />
          ))}
        </CardContent>
      )}

      {expanded && session.bookings.length === 0 && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground italic">No bookings yet.</p>
        </CardContent>
      )}
    </Card>
  );
}

export default function ConsultantDashboard() {
  const { data: orgs } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const orgId = Array.isArray(orgs) ? orgs[0]?.id : undefined;

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["/api/consultant/my-sessions", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${orgId}/consultant/my-sessions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  const upcoming = sessions.filter((s) => s.status === "ACTIVE");
  const past = sessions.filter((s) => s.status !== "ACTIVE");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">My Consultation Sessions</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View your assigned sessions and participant idea submissions.
            </p>
          </div>

          {isLoading && (
            <p className="text-muted-foreground text-sm">Loading sessions…</p>
          )}

          {!isLoading && sessions.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No sessions have been assigned to you yet.</p>
              </CardContent>
            </Card>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
              {upcoming.map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past</h2>
              {past.map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
