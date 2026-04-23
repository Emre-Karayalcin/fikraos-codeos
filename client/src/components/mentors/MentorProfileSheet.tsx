import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar,
  MapPin,
  Globe,
  Clock,
  Video,
  Mail,
  ChevronLeft,
  ChevronRight,
  Star,
  ExternalLink,
  Paperclip,
  Loader2,
  X,
} from "lucide-react";

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface MentorDetail {
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
  calendlyLink?: string | null;
  availability?: Availability[];
}

interface Idea {
  id: string;
  title: string;
}

interface PitchDeck {
  id: string;
  status: string;
  template?: string;
  downloadUrl?: string;
  projectId: string;
}

interface Review {
  id: string;
  rating: number;
  feedback?: string | null;
  bookedDate: string;
  bookerFirstName?: string;
  bookerLastName?: string;
}

interface Props {
  mentor: { id: string; firstName: string; lastName: string; profileImageUrl?: string; title?: string };
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function generateTimeSlots(startTime: string, endTime: string, step = 60): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  while (current < end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += step;
  }
  return slots;
}

export default function MentorProfileSheet({ mentor, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date();
  const [profileTab, setProfileTab] = useState<"about" | "reviews">("about");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>("");
  const [selectedPitchDeckId, setSelectedPitchDeckId] = useState<string>("");
  const [pptxFileUrl, setPptxFileUrl] = useState<string>("");
  const [pptxFileName, setPptxFileName] = useState<string>("");
  const [pptxUploading, setPptxUploading] = useState(false);

  const { data: mentorDetail } = useQuery<MentorDetail>({
    queryKey: [`/api/mentors/${mentor.id}`],
    enabled: open,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [`/api/mentors/${mentor.id}/reviews`],
    enabled: open,
  });

  const { data: ideas = [] } = useQuery<Idea[]>({
    queryKey: ["/api/my-ideas"],
    enabled: open,
  });

  const { data: pitchDecks = [] } = useQuery<PitchDeck[]>({
    queryKey: ["/api/my-pitch-decks"],
    enabled: open,
  });

  const bookMutation = useMutation({
    mutationFn: async (payload: object) => {
      return apiRequest("POST", "/api/mentor-bookings", payload);
    },
    onSuccess: () => {
      toast({ title: "Session booked!", description: "Your booking is confirmed." });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor-bookings/mine"] });
      setSelectedDate(null);
      setSelectedTime("");
      setSelectedIdeaId("");
      setSelectedPitchDeckId("");
      setPptxFileUrl("");
      setPptxFileName("");
    },
    onError: (err: any) => {
      toast({ title: "Booking failed", description: err.message || "Please try again.", variant: "destructive" });
    },
  });

  const availability = mentorDetail?.availability ?? (mentor && (mentor as any).availability) ?? [];

  const availableDaySet = useMemo(
    () => new Set((availability as Availability[]).map((a) => a.dayOfWeek)),
    [availability]
  );

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handleDayClick = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    if (!availableDaySet.has(date.getDay())) return;
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setSelectedTime("");
  };

  const { data: bookedSlots = [] } = useQuery<{ bookedTime: string; durationMinutes: number }[]>({
    queryKey: [`/api/mentors/${mentor.id}/booked-slots`, selectedDate],
    queryFn: () =>
      fetch(`/api/mentors/${mentor.id}/booked-slots?date=${selectedDate}`, { credentials: "include" })
        .then((r) => r.json()),
    enabled: !!selectedDate && open,
  });

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const d = new Date(selectedDate);
    const dow = d.getDay();
    const slot = (availability as Availability[]).find((a) => a.dayOfWeek === dow);
    if (!slot) return [];
    return generateTimeSlots(slot.startTime, slot.endTime, mentorDetail?.sessionDurationMinutes ?? 60);
  }, [selectedDate, availability, mentorDetail]);

  // A slot is taken if any existing booking overlaps its time window
  const isSlotTaken = (time: string): boolean => {
    const duration = mentorDetail?.sessionDurationMinutes ?? 60;
    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + duration;
    return bookedSlots.some(({ bookedTime, durationMinutes }) => {
      const existStart = timeToMinutes(bookedTime);
      const existEnd = existStart + (durationMinutes ?? 60);
      return existStart < slotEnd && existEnd > slotStart;
    });
  };

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  const handlePptxSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPptxUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/pptx", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      setPptxFileUrl(data.url);
      setPptxFileName(data.fileName || file.name);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setPptxUploading(false);
    }
  };

  const handleBook = () => {
    if (!selectedDate || !selectedTime) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }
    bookMutation.mutate({
      mentorProfileId: mentor.id,
      ideaId: selectedIdeaId || undefined,
      pitchDeckId: (selectedPitchDeckId && selectedPitchDeckId !== "none") ? selectedPitchDeckId : undefined,
      bookedDate: selectedDate,
      bookedTime: selectedTime,
      durationMinutes: mentorDetail?.sessionDurationMinutes ?? 60,
      pptxFileUrl: pptxFileUrl || undefined,
      pptxFileName: pptxFileName || undefined,
    });
  };

  const detail = mentorDetail ?? mentor as MentorDetail;
  const initials = `${detail.firstName?.[0] ?? ""}${detail.lastName?.[0] ?? ""}`.toUpperCase();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Left: Profile */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto border-r border-border/50">
            <SheetHeader>
              <SheetTitle className="sr-only">Mentor Profile</SheetTitle>
            </SheetHeader>

            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 shrink-0">
                <AvatarImage src={detail.profileImageUrl} />
                <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-xl font-bold">
                  {detail.firstName} {detail.lastName}
                </h2>
                {detail.title && <p className="text-muted-foreground text-sm">{detail.title}</p>}
                {detail.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {detail.location}
                  </div>
                )}
                {detail.website && (
                  <a
                    href={detail.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" /> {detail.website}
                  </a>
                )}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">
                      {(reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1)}
                    </span>
                    <span>({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
              {(["about", "reviews"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setProfileTab(tab)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                    profileTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "reviews" ? `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}` : "About"}
                </button>
              ))}
            </div>

            {profileTab === "about" && (
              <>
                {detail.bio && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">About</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{detail.bio}</p>
                  </div>
                )}

                {detail.expertise && detail.expertise.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Expertise</h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.expertise.map((tag) => (
                        <Badge key={tag} className="bg-primary/15 text-primary border-0 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detail.industries && detail.industries.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Industries</h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.industries.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold mb-4">How It Works</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Calendar, label: "Select a Time", desc: "Choose a date and time that works for you." },
                      { icon: Mail, label: "Receive Invite", desc: "Get a calendar invite with meeting details." },
                      { icon: Video, label: "Hop on a Call", desc: "Connect with your mentor via video call." },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {profileTab === "reviews" && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Star className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No reviews yet</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {review.bookerFirstName} {review.bookerLastName}
                        </p>
                        <span className="text-xs text-muted-foreground">{review.bookedDate}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
                          />
                        ))}
                      </div>
                      {review.feedback && (
                        <p className="text-sm text-muted-foreground italic">"{review.feedback}"</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right: Booking */}
          <div className="w-full lg:w-80 xl:w-96 p-6 space-y-5 bg-muted/20 overflow-y-auto shrink-0">
            <div>
              <h3 className="text-base font-bold">
                Book a Session with {detail.firstName}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {mentorDetail?.sessionDurationMinutes ?? 60} mins
              </div>
            </div>

            {/* Calendly shortcut — bypass internal calendar entirely */}
            {mentorDetail?.calendlyLink && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This mentor uses Calendly for scheduling. Click below to pick a time directly on their calendar.
                </p>
                <Button
                  className="w-full gap-2"
                  onClick={() => window.open(mentorDetail.calendlyLink!, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Book via Calendly
                </Button>
                <p className="text-xs text-muted-foreground text-center">You'll be redirected to Calendly to complete your booking.</p>
              </div>
            )}

            {/* Internal calendar — only shown when no Calendly link */}
            {!mentorDetail?.calendlyLink && (<>

            {/* Idea selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Meeting Topic (optional)
              </label>
              <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId} disabled={ideas.length === 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={ideas.length === 0 ? "No ideas yet" : "Select one of your ideas…"} />
                </SelectTrigger>
                <SelectContent>
                  {ideas.map((idea) => (
                    <SelectItem key={idea.id} value={idea.id}>
                      {idea.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pitch Deck selector (optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Attach Pitch Deck (optional)
              </label>
              {(() => {
                const completedDecks = pitchDecks.filter((d) => d.status === "COMPLETED");
                return (
                  <Select value={selectedPitchDeckId} onValueChange={setSelectedPitchDeckId} disabled={completedDecks.length === 0}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={completedDecks.length === 0 ? "No pitch decks available" : "Select a pitch deck…"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {completedDecks.map((deck) => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deck.template || "Pitch Deck"} — {deck.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>

            {/* PPTX upload (optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Upload Presentation (optional)
              </label>
              {pptxFileUrl ? (
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm bg-muted/40">
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{pptxFileName}</span>
                  <button
                    type="button"
                    onClick={() => { setPptxFileUrl(""); setPptxFileName(""); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 transition-colors ${pptxUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {pptxUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> Uploading…</>
                  ) : (
                    <><Paperclip className="h-4 w-4 text-muted-foreground" /> Attach PPTX / PPT file</>
                  )}
                  <input
                    type="file"
                    accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
                    className="sr-only"
                    onChange={handlePptxSelect}
                    disabled={pptxUploading}
                  />
                </label>
              )}
            </div>

            {/* Calendar */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Select Date
              </label>
              <div className="rounded-xl border border-border/60 bg-card p-3">
                {/* Month nav */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium">
                    {MONTHS[viewMonth]} {viewYear}
                  </span>
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAYS.map((d) => (
                    <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const date = new Date(viewYear, viewMonth, day);
                    const isAvailable = availableDaySet.has(date.getDay());
                    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSelected = selectedDate === dateStr;
                    return (
                      <button
                        key={day}
                        onClick={() => handleDayClick(day)}
                        disabled={!isAvailable || isPast}
                        className={`
                          text-xs py-1.5 rounded-lg transition-colors font-medium
                          ${isSelected ? "bg-primary text-primary-foreground" : ""}
                          ${isAvailable && !isPast && !isSelected ? "hover:bg-primary/20 text-foreground" : ""}
                          ${!isAvailable || isPast ? "text-muted-foreground/30 cursor-not-allowed" : ""}
                        `}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time slot selector */}
            {selectedDate && timeSlots.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Select Time
                </label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a time slot…" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((t) => {
                      const taken = isSlotTaken(t);
                      return (
                        <SelectItem key={t} value={t} disabled={taken}>
                          {t}{taken ? " — Booked" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleBook}
              disabled={!selectedDate || !selectedTime || bookMutation.isPending}
            >
              {bookMutation.isPending ? "Booking…" : "Book Session"}
            </Button>
            </>)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
