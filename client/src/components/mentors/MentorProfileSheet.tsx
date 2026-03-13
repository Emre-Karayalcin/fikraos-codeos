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
  availability?: Availability[];
}

interface Idea {
  id: string;
  title: string;
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
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>("");

  const { data: mentorDetail } = useQuery<MentorDetail>({
    queryKey: [`/api/mentors/${mentor.id}`],
    enabled: open,
  });

  const { data: ideas = [] } = useQuery<Idea[]>({
    queryKey: ["/api/ideas"],
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
    },
    onError: (err: any) => {
      toast({ title: "Booking failed", description: err.message || "Please try again.", variant: "destructive" });
    },
  });

  const availability = mentorDetail?.availability ?? mentor && (mentor as any).availability ?? [];

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

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const d = new Date(selectedDate);
    const dow = d.getDay();
    const slot = (availability as Availability[]).find((a) => a.dayOfWeek === dow);
    if (!slot) return [];
    return generateTimeSlots(slot.startTime, slot.endTime, mentorDetail?.sessionDurationMinutes ?? 60);
  }, [selectedDate, availability, mentorDetail]);

  const handleBook = () => {
    if (!selectedDate || !selectedTime) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }
    bookMutation.mutate({
      mentorProfileId: mentor.id,
      ideaId: selectedIdeaId || undefined,
      bookedDate: selectedDate,
      bookedTime: selectedTime,
      durationMinutes: mentorDetail?.sessionDurationMinutes ?? 60,
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
              </div>
            </div>

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

            {/* Idea selector */}
            {ideas.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Meeting Topic (optional)
                </label>
                <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select one of your ideas…" />
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
            )}

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
                    {timeSlots.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
