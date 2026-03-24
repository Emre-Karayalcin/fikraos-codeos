import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Calendar, Clock, ChevronDown, ChevronUp, Star, CheckCircle, ExternalLink, MessageSquareText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  averageRating?: number | null;
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
  meetingProvider?: string | null;
  meetingLink?: string | null;
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  mentorFeedback?: string | null;
  rating?: number | null;
  feedback?: string | null;
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
  if (status === "COMPLETED") return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Completed</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Pending</Badge>;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: MyBooking;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const completeMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/mentor-bookings/${booking.id}/complete`, {
        rating,
        feedback: feedback.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor-bookings/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      toast({ title: "Session marked as complete!", description: "Thank you for your feedback." });
      onClose();
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  const canComplete = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";
  const alreadyRated = booking.status === "COMPLETED" && booking.rating;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Session Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Mentor */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={booking.mentorProfileImageUrl} />
              <AvatarFallback className="text-sm font-semibold bg-primary/15 text-primary">
                {`${booking.mentorFirstName?.[0] ?? ""}${booking.mentorLastName?.[0] ?? ""}`.toUpperCase() || "M"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">
                {booking.mentorFirstName} {booking.mentorLastName}
              </p>
              {booking.mentorTitle && (
                <p className="text-xs text-muted-foreground">{booking.mentorTitle}</p>
              )}
            </div>
            <div className="ml-auto">
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 bg-muted/30 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{booking.bookedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(booking.bookedTime)} · {booking.durationMinutes} min</span>
            </div>
            {booking.ideaTitle && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>💡</span>
                <span>{booking.ideaTitle}</span>
              </div>
            )}
            {booking.notes && (
              <p className="text-muted-foreground pt-1 border-t border-border">{booking.notes}</p>
            )}
            {booking.meetingLink && (
              <a
                href={booking.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline pt-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Meeting Link
              </a>
            )}
            {!booking.meetingLink && booking.status === "CONFIRMED" && booking.meetingProvider === "CALENDLY" && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                Meeting link will appear once the mentor finishes Calendly setup.
              </p>
            )}
          </div>

          {booking.mentorFeedback && (
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <MessageSquareText className="h-3.5 w-3.5" /> Mentor Feedback
              </p>
              <p className="text-sm text-foreground">{booking.mentorFeedback}</p>
            </div>
          )}

          {/* Already rated */}
          {alreadyRated && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Your Rating</p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${s <= (booking.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
                  />
                ))}
              </div>
              {booking.feedback && (
                <p className="text-sm text-muted-foreground italic">"{booking.feedback}"</p>
              )}
            </div>
          )}

          {/* Rate session flow */}
          {canComplete && !showRating && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowRating(true)}
            >
              <CheckCircle className="w-4 h-4 text-green-500" />
              Session Complete
            </Button>
          )}

          {canComplete && showRating && (
            <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
              <div>
                <p className="text-sm font-medium mb-1">How was your session?</p>
                <p className="text-xs text-muted-foreground">Rate your experience with this mentor</p>
              </div>
              <div className="flex justify-center">
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Feedback <span className="font-normal">(optional)</span>
                </label>
                <Textarea
                  placeholder="Share your experience with this mentor…"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canComplete && showRating && (
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={rating === 0 || completeMutation.isPending}
            >
              {completeMutation.isPending ? "Submitting…" : "Submit Review"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MyBookingsSection() {
  const [showAll, setShowAll] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<MyBooking | null>(null);

  const { data: bookings = [], isLoading } = useQuery<MyBooking[]>({
    queryKey: ["/api/mentor-bookings/mine"],
  });

  if (isLoading || bookings.length === 0) return null;

  const visible_bookings = bookings.filter((b) => b.status !== "CANCELLED");
  const visible = showAll ? visible_bookings : visible_bookings.slice(0, 3);

  if (visible_bookings.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">My Sessions</h3>
        <span className="text-xs text-muted-foreground">
          {visible_bookings.length} booking{visible_bookings.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {visible.map((booking) => {
          const initials =
            `${booking.mentorFirstName?.[0] ?? ""}${booking.mentorLastName?.[0] ?? ""}`.toUpperCase() || "M";
          return (
            <div
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-muted/20 transition-colors cursor-pointer"
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
                {/* Show star summary if completed and rated */}
                {booking.status === "COMPLETED" && booking.rating && (
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${s <= booking.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0">
                <BookingStatusBadge status={booking.status} />
              </div>
            </div>
          );
        })}
      </div>

      {visible_bookings.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {showAll ? (
            <><ChevronUp className="h-3 w-3" /> Show less</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> Show all {visible_bookings.length} sessions</>
          )}
        </button>
      )}

      <div className="border-t border-border pt-2" />

      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
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
      <MyBookingsSection />

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
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              onClick={() => handleCardClick(mentor)}
            />
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
