import React, { useState, useMemo } from 'react';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  ExternalLink,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';

interface Event {
  id: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  location: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
  isPublished: boolean;
  createdAt: string;
}

async function fetchEvents(): Promise<Event[]> {
  const res = await fetch('/api/events', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

// ── Event Detail Modal ────────────────────────────────────────────────────────

function EventDetailModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {event.imageUrl && (
          <div className="w-full h-56 overflow-hidden rounded-lg -mt-2 mb-2">
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}
        <DialogHeader>
          <DialogTitle className="text-xl leading-snug">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4 flex-shrink-0 text-primary" />
            <span>
              {format(startDate, 'MMMM d, yyyy')}
              {endDate && ` — ${format(endDate, 'MMMM d, yyyy')}`}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Website */}
          {event.websiteUrl && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="w-4 h-4 flex-shrink-0 text-primary" />
              <a
                href={event.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                {event.websiteUrl}
              </a>
            </div>
          )}

          {/* Short description */}
          {event.shortDescription && (
            <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 italic">
              {event.shortDescription}
            </p>
          )}

          {/* Full description */}
          {event.description && (
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              {event.description}
            </div>
          )}

          {/* CTA */}
          {event.websiteUrl && (
            <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full gap-2 mt-2">
                <ExternalLink className="w-4 h-4" />
                Learn More
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const startDate = new Date(event.startDate);

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border/50 rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      {event.imageUrl ? (
        <div className="w-full h-36 overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <CalendarDays className="w-10 h-10 text-primary/30" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
          <CalendarDays className="w-3 h-3" />
          {format(startDate, 'MMM d, yyyy')}
        </div>
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{event.title}</h3>
        {event.shortDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2">{event.shortDescription}</p>
        )}
        {event.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Month Calendar ────────────────────────────────────────────────────────────

function MonthCalendar({
  events,
  onDaySelect,
  selectedDay,
}: {
  events: Event[];
  onDaySelect: (date: Date | null) => void;
  selectedDay: Date | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  const eventDates = useMemo(() => events.map((e) => new Date(e.startDate)), [events]);
  const hasEvent = (date: Date) => eventDates.some((ed) => isSameDay(ed, date));

  const handleDayClick = (day: Date) => {
    onDaySelect(selectedDay && isSameDay(selectedDay, day) ? null : day);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden w-full lg:w-80 xl:w-96 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const isSelected = selectedDay && isSameDay(selectedDay, day);
            const isToday = isSameDay(day, new Date());
            const eventDay = hasEvent(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`relative aspect-square rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                    ? 'text-primary font-bold hover:bg-muted'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {day.getDate()}
                {eventDay && (
                  <span
                    className={`absolute bottom-1 w-1 h-1 rounded-full ${
                      isSelected ? 'bg-primary-foreground' : 'bg-primary'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Hint text */}
        {selectedDay && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border text-center">
            Showing events for {format(selectedDay, 'MMM d')} — see right panel
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Events() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'browse' | 'calendar'>('browse');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    queryFn: fetchEvents,
    staleTime: Infinity,
  });

  const calendarFilteredEvents = useMemo(() => {
    if (!selectedDay) return events;
    return events.filter((e) => isSameDay(new Date(e.startDate), selectedDay));
  }, [events, selectedDay]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <UnifiedSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6 space-y-6">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold">{t('events.title')}</h1>
              <p className="text-muted-foreground text-sm mt-1">{t('events.subtitle')}</p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-0 border-b border-border">
              {(['browse', 'calendar'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(`events.tabs.${tab}`)}
                </button>
              ))}
            </div>

            {/* ── Browse tab ── */}
            {activeTab === 'browse' && (
              isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
                  <p>{t('events.noEvents')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} onClick={() => setDetailEvent(event)} />
                  ))}
                </div>
              )
            )}

            {/* ── Calendar tab ── */}
            {activeTab === 'calendar' && (
              <div className="flex flex-col lg:flex-row gap-5 items-start">

                {/* Left: Calendar */}
                <MonthCalendar
                  events={events}
                  selectedDay={selectedDay}
                  onDaySelect={setSelectedDay}
                />

                {/* Right: Events panel */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {selectedDay
                        ? `Events on ${format(selectedDay, 'MMM d, yyyy')}`
                        : 'All Events'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedDay && (
                        <button
                          onClick={() => setSelectedDay(null)}
                          className="text-xs text-primary hover:underline"
                        >
                          Clear filter
                        </button>
                      )}
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {calendarFilteredEvents.length} event{calendarFilteredEvents.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : calendarFilteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <CalendarDays size={36} className="mb-3 opacity-30" />
                      <p className="text-sm">
                        {selectedDay
                          ? `No events on ${format(selectedDay, 'MMM d, yyyy')}`
                          : t('events.noEvents')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {calendarFilteredEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={() => setDetailEvent(event)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <BottomNavigation />
      </div>

      {/* Event detail modal */}
      {detailEvent && (
        <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
      )}
    </div>
  );
}
