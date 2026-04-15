/**
 * Minimal iCalendar (.ics) generator — no external dependencies.
 * Produces a VCALENDAR/VEVENT string suitable as an email attachment.
 */

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Fold long lines per RFC 5545 (max 75 octets, continuation via CRLF + space) */
function fold(line: string): string {
  const LIMIT = 75;
  if (line.length <= LIMIT) return line;
  let out = "";
  while (line.length > LIMIT) {
    out += (out ? "\r\n " : "") + line.slice(0, LIMIT);
    line = line.slice(LIMIT);
  }
  if (line) out += "\r\n " + line;
  return out;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface CalendarEventOptions {
  uid: string;
  summary: string;
  start: Date;
  durationMinutes?: number;
  location?: string | null;
  description?: string | null;
  organizerName?: string;
  organizerEmail?: string;
  attendeeEmail?: string;
  attendeeName?: string;
  /** CONFIRMED (default) or TENTATIVE */
  status?: "CONFIRMED" | "TENTATIVE";
}

export function generateIcs(opts: CalendarEventOptions): string {
  const {
    uid,
    summary,
    start,
    durationMinutes = 60,
    location,
    description,
    organizerName,
    organizerEmail,
    attendeeEmail,
    attendeeName,
    status = "CONFIRMED",
  } = opts;

  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const now = new Date();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FikraOS//CodeOS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    fold(`UID:${uid}`),
    fold(`DTSTAMP:${icsDate(now)}`),
    fold(`DTSTART:${icsDate(start)}`),
    fold(`DTEND:${icsDate(end)}`),
    fold(`SUMMARY:${icsEscape(summary)}`),
    fold(`STATUS:${status}`),
    "SEQUENCE:0",
  ];

  if (description) lines.push(fold(`DESCRIPTION:${icsEscape(description)}`));
  if (location)    lines.push(fold(`LOCATION:${icsEscape(location)}`));

  if (organizerEmail) {
    const organizer = organizerName
      ? `ORGANIZER;CN=${icsEscape(organizerName)}:mailto:${organizerEmail}`
      : `ORGANIZER:mailto:${organizerEmail}`;
    lines.push(fold(organizer));
  }

  if (attendeeEmail) {
    const cnPart = attendeeName ? `;CN=${icsEscape(attendeeName)}` : "";
    lines.push(fold(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED${cnPart}:mailto:${attendeeEmail}`));
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

/** Returns a nodemailer-compatible attachment object */
export function icsAsNodemailerAttachment(icsContent: string) {
  return {
    filename:    "invite.ics",
    content:     Buffer.from(icsContent, "utf-8"),
    contentType: "text/calendar; method=REQUEST; charset=UTF-8",
  };
}
