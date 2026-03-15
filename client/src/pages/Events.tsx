import React, { useState, useMemo } from 'react';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, ExternalLink, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

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

function EventCard({ event }: { event: Event }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const startDate = new Date(event.startDate);
  const formattedDate = format(startDate, 'MMM d, yyyy');

  return (
    <Card className="border border-border/50 overflow-hidden hover:border-border transition-colors">
      {/* Image */}
      {event.imageUrl ? (
        <div className="w-full h-44 overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <CalendarDays className="w-12 h-12 text-primary/40" />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Date badge */}
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1">
          <CalendarDays className="w-3 h-3" />
          {formattedDate}
          {event.endDate && ` — ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base leading-snug">{event.title}</h3>

        {/* Short description */}
        {event.shortDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.shortDescription}</p>
        )}

        {/* Expanded description */}
        {expanded && event.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-line">{event.description}</p>
        )}

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{event.location}</span>
          </div>
        )}

        {/* Action button */}
        {event.websiteUrl ? (
          <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="w-full gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              {t('events.learnMore')}
            </Button>
          </a>
        ) : event.description && (
          <Button size="sm" variant="outline" className="w-full" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : t('events.learnMore')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

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

  const firstDayOfWeek = startOfMonth(currentMonth).getDay(); // 0=Sun

  const eventDates = useMemo(() => {
    return events.map((e) => new Date(e.startDate));
  }, [events]);

  const hasEvent = (date: Date) => eventDates.some((ed) => isSameDay(ed, date));

  const handleDayClick = (day: Date) => {
    if (selectedDay && isSameDay(selectedDay, day)) {
      onDaySelect(null);
    } else {
      onDaySelect(day);
    }
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 max-w-sm mx-auto">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</span>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
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
              className={`relative flex flex-col items-center justify-center h-9 w-full rounded-md text-sm transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isToday
                  ? 'bg-muted font-semibold'
                  : 'hover:bg-muted'
              } ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}`}
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
    </div>
  );
}

export default function Events() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'browse' | 'calendar'>('browse');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    queryFn: fetchEvents,
    staleTime: Infinity,
  });

  const filteredEvents = useMemo(() => {
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
            <div className="flex gap-1 border-b border-border">
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

            {activeTab === 'browse' && (
              <>
                {selectedDay && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Showing events for {format(selectedDay, 'MMM d, yyyy')}</span>
                    <button
                      onClick={() => setSelectedDay(null)}
                      className="text-primary hover:underline text-xs"
                    >
                      Clear
                    </button>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
                    <p>{t('events.noEvents')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <MonthCalendar
                  events={events}
                  selectedDay={selectedDay}
                  onDaySelect={setSelectedDay}
                />
                {selectedDay && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">
                      Events on {format(selectedDay, 'MMM d, yyyy')}
                    </h3>
                    {filteredEvents.length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t('events.noEvents')}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredEvents.map((event) => (
                          <EventCard key={event.id} event={event} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <BottomNavigation />
      </div>
    </div>
  );
}
