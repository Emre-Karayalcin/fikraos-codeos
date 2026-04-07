import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Calendar, Clock, ChevronDown, ChevronUp, Star, CheckCircle, ExternalLink, MessageSquareText, XCircle, RefreshCw } from "lucide-react";
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

interface SurveyQuestion {
  id: string;
  questionText: string;
  questionType: "rating" | "boolean" | "text" | "scale";
  isRequired: boolean;
  orderIndex: number;
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
  surveyResponses?: Record<string, string | number | boolean> | null;
  surveyCompletedAt?: string | null;
}

function isSessionPastDue(booking: MyBooking): boolean {
  const [h, m] = booking.bookedTime.split(":").map(Number);
  const end = new Date(`${booking.bookedDate}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
  end.setMinutes(end.getMinutes() + (booking.durationMinutes ?? 60));
  return end < new Date();
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
  const pastDue = isSessionPastDue(booking);
  const surveyPending = booking.status === "COMPLETED" && !booking.surveyCompletedAt;
  const autoShowSurvey = pastDue && (booking.status === "CONFIRMED" || surveyPending);

  const [showSurvey, setShowSurvey] = useState(autoShowSurvey);
  const [responses, setResponses] = useState<Record<string, string | number | boolean>>({});
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(booking.bookedDate);
  const [newTime, setNewTime] = useState(booking.bookedTime);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/mentor-bookings/mine"] });
    queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
  };

  const { data: surveyQuestions = [] } = useQuery<SurveyQuestion[]>({
    queryKey: [`/api/mentor-bookings/${booking.id}/survey-questions`],
    queryFn: async () => {
      const res = await fetch(`/api/mentor-bookings/${booking.id}/survey-questions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showSurvey || autoShowSurvey,
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/mentor-bookings/${booking.id}/complete`, { surveyResponses: responses }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Survey submitted!", description: "Thank you for your feedback." });
      onClose();
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/mentor-bookings/${booking.id}/cancel`, {}),
    onSuccess: () => {
      invalidate();
      toast({ title: "Session cancelled" });
      onClose();
    },
    onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/mentor-bookings/${booking.id}/reschedule`, { bookedDate: newDate, bookedTime: newTime }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Reschedule requested", description: "The mentor will confirm the new time." });
      onClose();
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to reschedule", variant: "destructive" }),
  });

  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const canReschedule = (booking.status === "PENDING" || booking.status === "CONFIRMED") && !pastDue;
  const canComplete = (booking.status !== "CANCELLED" && booking.status !== "COMPLETED") || surveyPending;
  const alreadyRated = booking.status === "COMPLETED" && booking.surveyCompletedAt;
  const hasRequiredAnswers = surveyQuestions.filter((q) => q.isRequired).every((q) => responses[q.id] !== undefined && responses[q.id] !== "");

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
              <div className="pt-1 space-y-1.5 border-t border-border">
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>When Calendly opens, please select <strong>{formatTime(booking.bookedTime)}</strong> to match your booked time.</span>
                </div>
                <a
                  href={booking.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Meeting Link
                </a>
              </div>
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

          {/* Reschedule form */}
          {canReschedule && showReschedule && (
            <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/20">
              <p className="text-sm font-medium">Propose new date & time</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">The booking will revert to pending until the mentor confirms.</p>
            </div>
          )}

          {/* Cancel confirm */}
          {canCancel && cancelConfirm && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 space-y-2">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Cancel this session?</p>
              <p className="text-xs text-red-600 dark:text-red-400/80">This action cannot be undone. The mentor will be notified.</p>
            </div>
          )}

          {/* Completed survey summary */}
          {alreadyRated && booking.surveyResponses && (
            <div className="space-y-2 rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Survey</p>
              <div className="space-y-1.5">
                {Object.entries(booking.surveyResponses).map(([qId, val]) => {
                  const q = surveyQuestions.find((x) => x.id === qId);
                  if (!q) return null;
                  return (
                    <div key={qId} className="text-xs">
                      <span className="text-muted-foreground">{q.questionText}: </span>
                      {q.questionType === "rating" || q.questionType === "scale" ? (
                        <span className="font-medium">{val}/5</span>
                      ) : q.questionType === "boolean" ? (
                        <span className={`font-medium ${val ? "text-green-600" : "text-red-500"}`}>{val ? "Yes" : "No"}</span>
                      ) : (
                        <span className="font-medium italic">"{val}"</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt for past-due sessions */}
          {pastDue && booking.status === "CONFIRMED" && !showSurvey && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Session time has passed</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Please complete a short post-session survey to close this booking.</p>
            </div>
          )}

          {/* Survey trigger button */}
          {canComplete && !showSurvey && !showReschedule && !cancelConfirm && !alreadyRated && (
            <Button
              variant={pastDue ? "default" : "outline"}
              className="w-full gap-2"
              onClick={() => setShowSurvey(true)}
            >
              <CheckCircle className="w-4 h-4" />
              {pastDue ? "Complete Post-Session Survey" : "Session Complete"}
            </Button>
          )}

          {/* Dynamic survey form */}
          {canComplete && showSurvey && (
            <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
              <div>
                <p className="text-sm font-semibold">Post-Session Survey</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your feedback helps improve the mentorship program</p>
              </div>

              {surveyQuestions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Loading questions…</p>
              )}

              {surveyQuestions.map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {q.questionText}{q.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                  </p>

                  {(q.questionType === "rating") && (
                    <div className="flex justify-center">
                      <StarRating
                        value={(responses[q.id] as number) ?? 0}
                        onChange={(v) => setResponses((r) => ({ ...r, [q.id]: v }))}
                      />
                    </div>
                  )}

                  {q.questionType === "scale" && (
                    <div className="flex gap-1.5 justify-center">
                      {[1,2,3,4,5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setResponses((r) => ({ ...r, [q.id]: v }))}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-colors ${
                            responses[q.id] === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.questionType === "boolean" && (
                    <div className="flex gap-2">
                      {([true, false] as const).map((val) => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => setResponses((r) => ({ ...r, [q.id]: val }))}
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            responses[q.id] === val
                              ? val ? "bg-green-100 border-green-400 text-green-700" : "bg-red-50 border-red-400 text-red-600"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {val ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.questionType === "text" && (
                    <Textarea
                      value={(responses[q.id] as string) ?? ""}
                      onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
                      placeholder="Your answer…"
                      rows={2}
                      className="resize-none"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Cancel row */}
          {canCancel && !showSurvey && !showReschedule && !cancelConfirm && (
            <div className="flex gap-2 w-full sm:w-auto sm:mr-auto">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setCancelConfirm(true)}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Session
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setShowReschedule(true)}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reschedule
              </Button>
            </div>
          )}

          {/* Cancel confirm actions */}
          {cancelConfirm && (
            <>
              <Button variant="outline" size="sm" onClick={() => setCancelConfirm(false)}>Keep Session</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel"}
              </Button>
            </>
          )}

          {/* Reschedule actions */}
          {showReschedule && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowReschedule(false)}>Back</Button>
              <Button
                size="sm"
                onClick={() => rescheduleMutation.mutate()}
                disabled={rescheduleMutation.isPending || !newDate || !newTime}
              >
                {rescheduleMutation.isPending ? "Sending…" : "Request Reschedule"}
              </Button>
            </>
          )}

          {!cancelConfirm && !showReschedule && (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              {canComplete && showSurvey && (
                <Button
                  onClick={() => completeMutation.mutate()}
                  disabled={!hasRequiredAnswers || completeMutation.isPending}
                >
                  {completeMutation.isPending ? "Submitting…" : "Submit Survey"}
                </Button>
              )}
            </>
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

              <div className="shrink-0 flex flex-col items-end gap-1">
                <BookingStatusBadge status={booking.status} />
                {booking.status === "COMPLETED" && !booking.surveyCompletedAt && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Survey pending</span>
                )}
                {isSessionPastDue(booking) && booking.status === "CONFIRMED" && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Survey pending</span>
                )}
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
