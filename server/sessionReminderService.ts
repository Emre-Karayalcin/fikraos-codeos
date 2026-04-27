import { db } from "./db";
import {
  mentorBookings, mentorProfiles, consultationBookings, consultationSessions,
  moduleConsultations, programModules, organizations, organizationMembers, users,
} from "../shared/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { Resend } from "resend";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@fikrahub.com";
const APP_URL = process.env.APP_URL || "https://os.fikrahub.com";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTimeForEmail(dt: Date): string {
  return dt.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function buildSessionEmail({
  accentColor, gradientFrom, gradientTo, titleDark,
  icon, title, orgName, rows, userName, dashboardUrl,
}: {
  accentColor: string; gradientFrom: string; gradientTo: string; titleDark: string;
  icon: string; title: string; orgName: string;
  rows: { label: string; value: string; link?: string }[];
  userName: string; dashboardUrl: string;
}): string {
  const rowsHtml = rows.map((r, i) =>
    `<tr${i % 2 === 1 ? ' style="background:#f9fafb"' : ""}><td style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:13px;white-space:nowrap;width:140px">${r.label}</td><td style="padding:10px 14px;font-size:14px;color:#111827">${r.link ? `<a href="${r.link}" style="color:${accentColor}">${r.value}</a>` : r.value}</td></tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;background:#f6f8fb;font-family:Inter,system-ui,Arial,sans-serif;color:#111}
  .wrap{max-width:680px;margin:28px auto;padding:24px}
  .card{background:#fff;border-radius:12px;box-shadow:0 6px 30px rgba(16,24,40,0.06);overflow:hidden}
  .header{display:flex;gap:16px;align-items:center;padding:28px 32px;border-bottom:1px solid #f1f5f9;background:linear-gradient(135deg,${gradientFrom},${gradientTo})}
  .logo{flex:0 0 56px;height:56px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center}
  .logo img{width:44px;height:44px;border-radius:8px;display:block}
  .ht{font-size:17px;font-weight:600;color:${titleDark}}
  .hm{font-size:13px;color:#64748b;margin:3px 0 0}
  .body{padding:28px 32px;line-height:1.6;color:#0f172a}
  table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin:18px 0}
  .cta{display:inline-block;margin:16px 0;padding:12px 24px;background:${accentColor};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}
  .small{font-size:13px;color:#64748b}
  .footer{padding:18px 32px;background:#fbfdff;border-top:1px solid #f1f5f9;text-align:center;color:#64748b;font-size:13px}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="header">
    <div class="logo"><img src="${APP_URL}/logo-code.jpeg" alt="FikraHub" /></div>
    <div><div class="ht">${icon} ${title}</div><div class="hm"><strong>${orgName}</strong></div></div>
  </div>
  <div class="body">
    <p style="margin:0 0 12px;font-size:16px">Hi ${userName},</p>
    <p>This is a reminder about your upcoming session.</p>
    <table>${rowsHtml}</table>
    <p style="text-align:center"><a class="cta" href="${dashboardUrl}">View Session Details →</a></p>
    <p class="small">If the button doesn't work, copy this link:<br/><a href="${dashboardUrl}" style="color:${accentColor};word-break:break-all">${dashboardUrl}</a></p>
  </div>
  <div class="footer">© 2025 FikraHub — All rights reserved</div>
</div></div>
</body></html>`;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function checkAndSendSessionReminders(): Promise<void> {
  if (!resendClient) return;

  // Load all org reminder configs in one pass
  const orgsData = await db
    .select({ id: organizations.id, name: organizations.name, sessionReminderHours: organizations.sessionReminderHours })
    .from(organizations);
  const orgMap = new Map(orgsData.map((o) => [o.id, o]));

  const now = new Date();

  await Promise.all([
    sendMentorSessionReminders(now, orgMap),
    sendConsultationSessionReminders(now, orgMap),
    sendEventSessionReminders(now, orgMap),
  ]);
}

// ─── Mentor Booking Reminders ─────────────────────────────────────────────────

async function sendMentorSessionReminders(
  now: Date,
  orgMap: Map<string, { id: string; name: string; sessionReminderHours: number | null }>
) {
  const bookings = await db
    .select({
      id: mentorBookings.id,
      bookedDate: mentorBookings.bookedDate,
      bookedTime: mentorBookings.bookedTime,
      durationMinutes: mentorBookings.durationMinutes,
      meetingLink: mentorBookings.meetingLink,
      userId: mentorBookings.userId,
      mentorProfileId: mentorBookings.mentorProfileId,
      orgId: mentorProfiles.orgId,
    })
    .from(mentorBookings)
    .innerJoin(mentorProfiles, eq(mentorBookings.mentorProfileId, mentorProfiles.id))
    .where(
      and(
        inArray(mentorBookings.status, ["PENDING", "CONFIRMED"]),
        isNull(mentorBookings.sessionReminderSentAt),
      )
    );

  for (const b of bookings) {
    const org = orgMap.get(b.orgId);
    if (!org) continue;
    const reminderHours = org.sessionReminderHours ?? 24;

    const [hh, mm] = b.bookedTime.split(":").map(Number);
    const sessionStart = new Date(`${b.bookedDate}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
    const windowStart = new Date(sessionStart.getTime() - reminderHours * 3_600_000);

    if (now < windowStart || now >= sessionStart) continue;

    // Fetch participant + mentor
    const [participant] = await db
      .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(users).where(eq(users.id, b.userId)).limit(1);

    const [mentorUser] = await db
      .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .where(eq(mentorProfiles.id, b.mentorProfileId)).limit(1);

    const mentorName = mentorUser
      ? `${mentorUser.firstName || ""} ${mentorUser.lastName || ""}`.trim() || mentorUser.email || "Your mentor"
      : "Your mentor";
    const sessionDateStr = formatDateTimeForEmail(sessionStart);

    const rows = [
      { label: "👤 Mentor", value: mentorName },
      { label: "📅 Date & Time", value: sessionDateStr },
      { label: "⏱ Duration", value: `${b.durationMinutes ?? 60} minutes` },
      ...(b.meetingLink ? [{ label: "🔗 Meeting", value: "Join Session", link: b.meetingLink }] : []),
    ];

    // Email to participant
    if (participant?.email) {
      const participantName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim() || participant.email || "";
      await resendClient!.emails.send({
        from: EMAIL_FROM,
        to: participant.email,
        subject: `Reminder: Your mentoring session is coming up — ${b.bookedDate}`,
        html: buildSessionEmail({
          accentColor: "#2563eb", gradientFrom: "#eff6ff", gradientTo: "#eef2ff", titleDark: "#1e40af",
          icon: "📅", title: "Upcoming Mentoring Session", orgName: org.name,
          rows, userName: participantName, dashboardUrl: `${APP_URL}/dashboard`,
        }),
      });
    }

    // Email to mentor
    if (mentorUser?.email) {
      const participantDisplayName = participant
        ? (`${participant.firstName || ""} ${participant.lastName || ""}`.trim() || participant.email || participant.email) ?? "a participant"
        : "a participant";
      const mentorRows = [
        { label: "👤 Participant", value: participantDisplayName },
        { label: "📅 Date & Time", value: sessionDateStr },
        { label: "⏱ Duration", value: `${b.durationMinutes ?? 60} minutes` },
        ...(b.meetingLink ? [{ label: "🔗 Meeting", value: "Join Session", link: b.meetingLink }] : []),
      ];
      const mentorDisplayName = `${mentorUser.firstName || ""} ${mentorUser.lastName || ""}`.trim() || mentorUser.email;
      await resendClient!.emails.send({
        from: EMAIL_FROM,
        to: mentorUser.email,
        subject: `Reminder: Mentoring session with ${participantDisplayName} — ${b.bookedDate}`,
        html: buildSessionEmail({
          accentColor: "#2563eb", gradientFrom: "#eff6ff", gradientTo: "#eef2ff", titleDark: "#1e40af",
          icon: "📅", title: "Upcoming Mentoring Session", orgName: org.name,
          rows: mentorRows, userName: mentorDisplayName, dashboardUrl: `${APP_URL}/dashboard`,
        }),
      });
    }

    await db.update(mentorBookings)
      .set({ sessionReminderSentAt: now, updatedAt: now })
      .where(eq(mentorBookings.id, b.id));
  }
}

// ─── Consultation Booking Reminders ──────────────────────────────────────────

async function sendConsultationSessionReminders(
  now: Date,
  orgMap: Map<string, { id: string; name: string; sessionReminderHours: number | null }>
) {
  const bookings = await db
    .select({
      id: consultationBookings.id,
      userId: consultationBookings.userId,
      orgId: consultationBookings.orgId,
      scheduledAt: consultationSessions.scheduledAt,
      sessionTitle: consultationSessions.title,
      meetingLink: consultationSessions.externalMeetingLink,
      consultantUserId: consultationSessions.consultantUserId,
    })
    .from(consultationBookings)
    .innerJoin(consultationSessions, eq(consultationBookings.sessionId, consultationSessions.id))
    .where(
      and(
        inArray(consultationBookings.status, ["PENDING", "CONFIRMED"]),
        isNull(consultationBookings.sessionReminderSentAt),
      )
    );

  for (const b of bookings) {
    if (!b.scheduledAt) continue;
    const org = orgMap.get(b.orgId);
    if (!org) continue;
    const reminderHours = org.sessionReminderHours ?? 24;

    const windowStart = new Date(b.scheduledAt.getTime() - reminderHours * 3_600_000);
    if (now < windowStart || now >= b.scheduledAt) continue;

    const [participant] = await db
      .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(users).where(eq(users.id, b.userId)).limit(1);

    let consultantName = "Your consultant";
    if (b.consultantUserId) {
      const [cu] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, b.consultantUserId)).limit(1);
      if (cu) consultantName = `${cu.firstName || ""} ${cu.lastName || ""}`.trim() || consultantName;
    }

    if (participant?.email) {
      const userName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim() || participant.email;
      const sessionDateStr = formatDateTimeForEmail(b.scheduledAt);
      const rows = [
        { label: "📋 Session", value: b.sessionTitle ?? "" },
        { label: "👤 Consultant", value: consultantName },
        { label: "📅 Date & Time", value: sessionDateStr },
        ...(b.meetingLink ? [{ label: "🔗 Meeting", value: "Join Session", link: b.meetingLink }] : []),
      ];
      await resendClient!.emails.send({
        from: EMAIL_FROM,
        to: participant.email,
        subject: `Reminder: Your consultation session is coming up`,
        html: buildSessionEmail({
          accentColor: "#7c3aed", gradientFrom: "#f5f3ff", gradientTo: "#ede9fe", titleDark: "#5b21b6",
          icon: "💼", title: "Upcoming Consultation Session", orgName: org.name,
          rows, userName, dashboardUrl: `${APP_URL}/dashboard`,
        }),
      });
    }

    await db.update(consultationBookings)
      .set({ sessionReminderSentAt: now })
      .where(eq(consultationBookings.id, b.id));
  }
}

// ─── Module Consultation (Event) Reminders ───────────────────────────────────

async function sendEventSessionReminders(
  now: Date,
  orgMap: Map<string, { id: string; name: string; sessionReminderHours: number | null }>
) {
  const events = await db
    .select({
      id: moduleConsultations.id,
      title: moduleConsultations.title,
      scheduledAt: moduleConsultations.scheduledAt,
      durationMinutes: moduleConsultations.durationMinutes,
      location: moduleConsultations.location,
      meetingLink: moduleConsultations.meetingLink,
      moduleId: moduleConsultations.moduleId,
      orgId: programModules.orgId,
    })
    .from(moduleConsultations)
    .innerJoin(programModules, eq(moduleConsultations.moduleId, programModules.id))
    .where(
      and(
        eq(moduleConsultations.status, "scheduled"),
        isNull(moduleConsultations.sessionReminderSentAt),
      )
    );

  for (const ev of events) {
    const org = orgMap.get(ev.orgId);
    if (!org) continue;
    const reminderHours = org.sessionReminderHours ?? 24;

    const windowStart = new Date(ev.scheduledAt.getTime() - reminderHours * 3_600_000);
    if (now < windowStart || now >= ev.scheduledAt) continue;

    // Fetch all MEMBER-role users in the org
    const members = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, ev.orgId), eq(organizationMembers.role, "MEMBER")));

    const memberUsers = members.length > 0
      ? await db
          .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, members.map((m) => m.userId)))
      : [];

    const sessionDateStr = formatDateTimeForEmail(ev.scheduledAt);
    const rows = [
      { label: "📋 Session", value: ev.title },
      { label: "📅 Date & Time", value: sessionDateStr },
      { label: "⏱ Duration", value: `${ev.durationMinutes} minutes` },
      ...(ev.location ? [{ label: "📍 Location", value: ev.location ?? "" }] : []),
      ...(ev.meetingLink ? [{ label: "🔗 Meeting", value: "Join Session", link: ev.meetingLink }] : []),
    ];

    for (const u of memberUsers) {
      if (!u.email) continue;
      const userName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      await resendClient!.emails.send({
        from: EMAIL_FROM,
        to: u.email,
        subject: `Reminder: ${ev.title} is coming up`,
        html: buildSessionEmail({
          accentColor: "#0891b2", gradientFrom: "#ecfeff", gradientTo: "#f0fdfa", titleDark: "#0e7490",
          icon: "🗓", title: "Upcoming Program Session", orgName: org.name,
          rows, userName, dashboardUrl: `${APP_URL}/dashboard`,
        }),
      });
    }

    await db.update(moduleConsultations)
      .set({ sessionReminderSentAt: now })
      .where(eq(moduleConsultations.id, ev.id));
  }
}
