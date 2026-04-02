import { Router } from "express";
import { db } from "./db";
import { mentorProfiles, mentorAvailability, mentorBookings, users, ideas, projects, organizationMembers, pitchDeckGenerations, attendanceRecords } from "../shared/schema";
import { eq, and, isNotNull, inArray, sql, desc, avg, count } from "drizzle-orm";
import { Resend } from "resend";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@fikrahub.com";
const CALENDLY_API_BASE = process.env.CALENDLY_API_BASE || "https://api.calendly.com";
// Platform-wide fallback event type URI — used when mentor has no personal Calendly config
const CALENDLY_DEFAULT_EVENT_TYPE_URI = process.env.CALENDLY_EVENT_TYPE_URI || null;
const CALENDLY_CLIENT_ID = process.env.CALENDLY_CLIENT_ID || null;
const CALENDLY_CLIENT_SECRET = process.env.CALENDLY_CLIENT_SECRET || null;
const CALENDLY_REDIRECT_URI = process.env.CALENDLY_REDIRECT_URI || null;

const router = Router();

// Convert "HH:MM" to total minutes
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function normalizeCalendlyUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function buildCalendlyPrefillLink(
  baseUrl: string,
  userName: string,
  userEmail: string,
  bookedDate: string,
  bookedTime: string,
): string {
  const url = new URL(baseUrl);
  if (userName) url.searchParams.set("name", userName);
  if (userEmail) url.searchParams.set("email", userEmail);
  url.searchParams.set("utm_source", "codeos");
  url.searchParams.set("utm_campaign", "mentor-booking");
  url.searchParams.set("date", bookedDate);
  url.searchParams.set("time", bookedTime);
  return url.toString();
}

async function refreshCalendlyToken(mentorProfileId: string, refreshToken: string): Promise<string | null> {
  if (!CALENDLY_CLIENT_ID || !CALENDLY_CLIENT_SECRET) return null;
  try {
    const res = await fetch("https://auth.calendly.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CALENDLY_CLIENT_ID,
        client_secret: CALENDLY_CLIENT_SECRET,
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const expiry = new Date(Date.now() + (data.expires_in || 7200) * 1000);
    await db.update(mentorProfiles)
      .set({ calendlyAccessToken: data.access_token, calendlyRefreshToken: data.refresh_token, calendlyTokenExpiry: expiry })
      .where(eq(mentorProfiles.id, mentorProfileId));
    return data.access_token;
  } catch {
    return null;
  }
}

async function getMentorCalendlyToken(mentorProfileId: string): Promise<string | null> {
  const [profile] = await db
    .select({ accessToken: mentorProfiles.calendlyAccessToken, refreshToken: mentorProfiles.calendlyRefreshToken, tokenExpiry: mentorProfiles.calendlyTokenExpiry })
    .from(mentorProfiles)
    .where(eq(mentorProfiles.id, mentorProfileId));
  if (!profile?.accessToken) return null;
  if (profile.tokenExpiry && new Date() > profile.tokenExpiry && profile.refreshToken) {
    return refreshCalendlyToken(mentorProfileId, profile.refreshToken);
  }
  return profile.accessToken;
}

async function createCalendlySchedulingLink(eventTypeUri: string, mentorToken?: string | null): Promise<{ bookingUrl: string; resourceUri?: string } | null> {
  const calendlyToken = mentorToken || process.env.CALENDLY_PAT_TOKEN;
  if (!calendlyToken || !eventTypeUri) return null;

  try {
    const response = await fetch(`${CALENDLY_API_BASE}/scheduling_links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${calendlyToken}`,
      },
      body: JSON.stringify({
        owner: eventTypeUri,
        owner_type: "EventType",
        max_event_count: 1,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("❌ Calendly scheduling link generation failed:", response.status, body);
      return null;
    }

    const data: any = await response.json();
    const bookingUrl = data?.resource?.booking_url;
    if (!bookingUrl) return null;

    return {
      bookingUrl,
      resourceUri: data?.resource?.owner,
    };
  } catch (error) {
    console.error("❌ Calendly scheduling link generation error:", error);
    return null;
  }
}

// Helper: get the user's primary orgId from organizationMembers
async function getUserOrgId(userId: string): Promise<string | null> {
  const [membership] = await db
    .select({ orgId: organizationMembers.orgId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  return membership?.orgId ?? null;
}

// GET /api/mentors - List active mentors in current org
router.get("/mentors", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const orgId = await getUserOrgId(req.user.id);
    if (!orgId) return res.json([]);

    const mentors = await db
      .select({
        id: mentorProfiles.id,
        userId: mentorProfiles.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        title: mentorProfiles.title,
        bio: mentorProfiles.bio,
        expertise: mentorProfiles.expertise,
        industries: mentorProfiles.industries,
        sessionDurationMinutes: mentorProfiles.sessionDurationMinutes,
        location: mentorProfiles.location,
        website: mentorProfiles.website,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.userId, mentorProfiles.userId),
          eq(organizationMembers.orgId, orgId)
        )
      )
      .where(
        and(
          eq(mentorProfiles.orgId, orgId),
          eq(mentorProfiles.isActive, true)
        )
      );

    // Compute average ratings for these mentor profiles
    const mentorIds = mentors.map((m) => m.id);
    let ratingMap: Record<string, number | null> = {};
    if (mentorIds.length > 0) {
      const ratings = await db
        .select({
          mentorProfileId: mentorBookings.mentorProfileId,
          avgRating: sql<number>`ROUND(AVG(${mentorBookings.rating})::numeric, 1)`,
        })
        .from(mentorBookings)
        .where(and(inArray(mentorBookings.mentorProfileId, mentorIds), isNotNull(mentorBookings.rating)))
        .groupBy(mentorBookings.mentorProfileId);
      ratingMap = Object.fromEntries(ratings.map((r) => [r.mentorProfileId, r.avgRating]));
    }

    res.json(mentors.map((m) => ({ ...m, averageRating: ratingMap[m.id] ?? null })));
  } catch (error) {
    console.error("Error fetching mentors:", error);
    res.status(500).json({ message: "Failed to fetch mentors" });
  }
});

// GET /api/mentors/:id - Get mentor profile + availability
router.get("/mentors/:id", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const [mentor] = await db
      .select({
        id: mentorProfiles.id,
        userId: mentorProfiles.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        title: mentorProfiles.title,
        bio: mentorProfiles.bio,
        expertise: mentorProfiles.expertise,
        industries: mentorProfiles.industries,
        sessionDurationMinutes: mentorProfiles.sessionDurationMinutes,
        location: mentorProfiles.location,
        website: mentorProfiles.website,
        calendlyLink: mentorProfiles.calendlyLink,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .where(eq(mentorProfiles.id, req.params.id));

    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    const availability = await db
      .select()
      .from(mentorAvailability)
      .where(eq(mentorAvailability.mentorProfileId, req.params.id));

    res.json({ ...mentor, availability });
  } catch (error) {
    console.error("Error fetching mentor:", error);
    res.status(500).json({ message: "Failed to fetch mentor" });
  }
});

// GET /api/mentors/:mentorId/booked-slots?date=YYYY-MM-DD
// Returns non-cancelled bookings for a date so the frontend can grey out taken slots
router.get("/mentors/:mentorId/booked-slots", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const { mentorId } = req.params;
    const { date } = req.query as { date?: string };
    if (!date) return res.status(400).json({ message: "date query param required (YYYY-MM-DD)" });

    const booked = await db
      .select({ bookedTime: mentorBookings.bookedTime, durationMinutes: mentorBookings.durationMinutes })
      .from(mentorBookings)
      .where(
        and(
          eq(mentorBookings.mentorProfileId, mentorId),
          eq(mentorBookings.bookedDate, date),
          inArray(mentorBookings.status, ["PENDING", "CONFIRMED", "COMPLETED"])
        )
      );

    res.json(booked);
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    res.status(500).json({ message: "Failed to fetch booked slots" });
  }
});

// POST /api/mentor-bookings - Create booking
router.post("/mentor-bookings", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { mentorProfileId, ideaId, pitchDeckId, bookedDate, bookedTime, durationMinutes, notes } = req.body;

    const [mentorProfile] = await db
      .select({
        id: mentorProfiles.id,
        calendlyLink: mentorProfiles.calendlyLink,
        calendlyEventTypeUri: mentorProfiles.calendlyEventTypeUri,
        calendlyAccessToken: mentorProfiles.calendlyAccessToken,
        calendlyRefreshToken: mentorProfiles.calendlyRefreshToken,
        calendlyTokenExpiry: mentorProfiles.calendlyTokenExpiry,
      })
      .from(mentorProfiles)
      .where(eq(mentorProfiles.id, mentorProfileId))
      .limit(1);

    if (!mentorProfile) {
      return res.status(404).json({ message: "Mentor profile not found" });
    }

    const memberName = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim();
    const normalizedCalendlyLink = normalizeCalendlyUrl(mentorProfile.calendlyLink);

    // Resolve which event type URI to use: mentor-specific → platform default
    const effectiveEventTypeUri = mentorProfile.calendlyEventTypeUri || CALENDLY_DEFAULT_EVENT_TYPE_URI;
    const meetingProvider = normalizedCalendlyLink || effectiveEventTypeUri ? "CALENDLY" : "INTERNAL";

    // Prefer mentor's personal OAuth token, fall back to platform PAT
    const mentorToken = await getMentorCalendlyToken(mentorProfile.id);

    // Try to generate a single-use scheduling link via Calendly API at booking time
    let initialMeetingLink: string | null = null;
    if (effectiveEventTypeUri) {
      const generated = await createCalendlySchedulingLink(effectiveEventTypeUri, mentorToken);
      if (generated?.bookingUrl) {
        // Append date/time prefill so Calendly opens directly on the chosen slot
        try {
          const url = new URL(generated.bookingUrl);
          if (bookedDate) {
            url.searchParams.set('month', bookedDate.substring(0, 7)); // YYYY-MM
            url.searchParams.set('date', bookedDate); // YYYY-MM-DD
          }
          // Calendly expects ISO 8601 UTC timestamp for time prefill
          // e.g. 2026-03-31T08:00:00.000000Z
          if (bookedDate && bookedTime) {
            const isoTime = `${bookedDate}T${bookedTime}:00.000000Z`;
            url.searchParams.set('time', isoTime);
          }
          if (memberName) url.searchParams.set('name', memberName);
          if (req.user.email) url.searchParams.set('email', req.user.email);
          initialMeetingLink = url.toString();
        } catch {
          initialMeetingLink = generated.bookingUrl;
        }
      }
    }
    // Fallback to prefill link from mentor's public Calendly URL
    if (!initialMeetingLink && normalizedCalendlyLink) {
      initialMeetingLink = buildCalendlyPrefillLink(normalizedCalendlyLink, memberName, req.user.email || "", bookedDate, bookedTime);
    }

    // ── 1. Validate mentor availability (day-of-week + time window) ──────────
    const availSlots = await db
      .select()
      .from(mentorAvailability)
      .where(eq(mentorAvailability.mentorProfileId, mentorProfileId));

    // Use noon UTC to avoid date-boundary timezone issues
    const bookingDow = new Date(`${bookedDate}T12:00:00Z`).getUTCDay();
    const matchingSlot = availSlots.find((a) => a.dayOfWeek === bookingDow);

    if (!matchingSlot) {
      return res.status(400).json({ message: "Mentor is not available on this day" });
    }

    const sessionDuration = durationMinutes || 60;
    const newStart = timeToMinutes(bookedTime);
    const newEnd = newStart + sessionDuration;
    const slotStart = timeToMinutes(matchingSlot.startTime);
    const slotEnd = timeToMinutes(matchingSlot.endTime);

    if (newStart < slotStart || newEnd > slotEnd) {
      return res.status(400).json({
        message: `Selected time is outside mentor's available hours (${matchingSlot.startTime}–${matchingSlot.endTime})`,
      });
    }

    // ── 2. Duration-aware overlap check (ignore cancelled bookings) ──────────
    const existingBookings = await db
      .select({ bookedTime: mentorBookings.bookedTime, durationMinutes: mentorBookings.durationMinutes })
      .from(mentorBookings)
      .where(
        and(
          eq(mentorBookings.mentorProfileId, mentorProfileId),
          eq(mentorBookings.bookedDate, bookedDate),
          inArray(mentorBookings.status, ["PENDING", "CONFIRMED", "COMPLETED"])
        )
      );

    for (const existing of existingBookings) {
      const existStart = timeToMinutes(existing.bookedTime);
      const existEnd = existStart + (existing.durationMinutes ?? 60);
      if (existStart < newEnd && existEnd > newStart) {
        return res.status(409).json({ message: "This time slot overlaps with an existing booking" });
      }
    }

    const [booking] = await db
      .insert(mentorBookings)
      .values({
        mentorProfileId,
        userId: req.user.id,
        ideaId: ideaId || null,
        pitchDeckId: pitchDeckId || null,
        bookedDate,
        bookedTime,
        durationMinutes: durationMinutes || 60,
        meetingProvider,
        meetingLink: initialMeetingLink,
        notes: notes || null,
        status: "PENDING",
      })
      .returning();

    // Send email notifications to mentor + member (fire-and-forget via Resend)
    if (resendClient) {
      (async () => {
        try {
          const [mentorUser] = await db
            .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(mentorProfiles)
            .innerJoin(users, eq(mentorProfiles.userId, users.id))
            .where(eq(mentorProfiles.id, mentorProfileId));

          const booker = req.user;
          const bookerName = `${booker.firstName || ""} ${booker.lastName || ""}`.trim() || booker.email;
          const bookerEmail: string = booker.email;

          let ideaTitle: string | undefined;
          if (ideaId) {
            const [project] = await db.select({ title: projects.title }).from(projects).where(eq(projects.id, ideaId));
            ideaTitle = project?.title;
          }

          const duration = durationMinutes || 60;
          const detailRows = `
            <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">📅 Date</td><td style="padding:10px 14px;color:#111827;font-size:14px">${bookedDate}</td></tr>
            <tr style="background:#f9fafb"><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">🕐 Time</td><td style="padding:10px 14px;color:#111827;font-size:14px">${bookedTime}</td></tr>
            <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">⏱ Duration</td><td style="padding:10px 14px;color:#111827;font-size:14px">${duration} minutes</td></tr>
            ${ideaTitle ? `<tr style="background:#f9fafb"><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">💡 Topic</td><td style="padding:10px 14px;color:#111827;font-size:14px">${ideaTitle}</td></tr>` : ""}
            ${pitchDeckId ? `<tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">📊 Pitch Deck</td><td style="padding:10px 14px;color:#111827;font-size:14px">Attached (view in dashboard)</td></tr>` : ""}
          `;

          const baseStyle = `
            body{margin:0;background:#f6f8fb;font-family:Inter,system-ui,Arial,sans-serif;color:#111}
            .wrap{max-width:640px;margin:28px auto;padding:24px}
            .card{background:#fff;border-radius:12px;box-shadow:0 6px 30px rgba(16,24,40,0.06);overflow:hidden}
            .header{padding:28px 32px;background:linear-gradient(135deg,#478af5 0%,#6366f1 100%);color:#fff}
            .header h1{margin:0;font-size:22px;font-weight:700}
            .header p{margin:6px 0 0;font-size:14px;opacity:.85}
            .body{padding:28px 32px;line-height:1.6;color:#0f172a}
            table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin:20px 0}
            .cta{display:inline-block;margin:8px 0;padding:12px 24px;background:#478af5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
            .footer{padding:18px 32px;background:#fbfdff;border-top:1px solid #f1f5f9;text-align:center;color:#64748b;font-size:13px}
          `;

          // ── Email to MENTOR ──────────────────────────────────────────────
          if (mentorUser?.email) {
            const mentorName = `${mentorUser.firstName || ""} ${mentorUser.lastName || ""}`.trim() || mentorUser.email;
            const mentorHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${baseStyle}</style></head><body>
              <div class="wrap"><div class="card">
                <div class="header">
                  <h1>📅 New Session Request</h1>
                  <p>${bookerName} has requested a mentoring session with you</p>
                </div>
                <div class="body">
                  <p>Hi ${mentorName},</p>
                  <p><strong>${bookerName}</strong> has booked a mentoring session with you. Here are the details:</p>
                  <table>${detailRows}</table>
                  <p>Please log in to your mentor dashboard to confirm or manage this booking.</p>
                  <p style="text-align:center"><a class="cta" href="${process.env.APP_URL || "https://os.fikrahub.com"}/dashboard">View Booking Request</a></p>
                  <p style="font-size:13px;color:#64748b;margin-top:24px">This is an automated notification from CodeOS.</p>
                </div>
                <div class="footer">© 2025 CodeOS — All rights reserved</div>
              </div></div>
            </body></html>`;

            await resendClient.emails.send({
              from: EMAIL_FROM,
              to: mentorUser.email,
              subject: `New booking request from ${bookerName}`,
              html: mentorHtml,
            });
            console.log(`✅ Mentor booking email sent to mentor: ${mentorUser.email}`);
          }

          // ── Email to MEMBER (booker) ──────────────────────────────────────
          if (mentorUser) {
            const mentorName = `${mentorUser.firstName || ""} ${mentorUser.lastName || ""}`.trim() || mentorUser.email;
            const memberHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${baseStyle}</style></head><body>
              <div class="wrap"><div class="card">
                <div class="header">
                  <h1>✅ Session Booked</h1>
                  <p>Your session with ${mentorName} has been requested</p>
                </div>
                <div class="body">
                  <p>Hi ${bookerName},</p>
                  <p>Your mentoring session with <strong>${mentorName}</strong> has been submitted and is pending confirmation. Here are the details:</p>
                  <table>${detailRows}</table>
                  <p>You'll be notified once the mentor confirms your session. You can also view or cancel your bookings from the dashboard.</p>
                  <p style="text-align:center"><a class="cta" href="${process.env.APP_URL || "https://os.fikrahub.com"}/dashboard">View My Bookings</a></p>
                  <p style="font-size:13px;color:#64748b;margin-top:24px">This is an automated notification from CodeOS.</p>
                </div>
                <div class="footer">© 2025 CodeOS — All rights reserved</div>
              </div></div>
            </body></html>`;

            await resendClient.emails.send({
              from: EMAIL_FROM,
              to: bookerEmail,
              subject: `Your session with ${mentorName} is pending confirmation`,
              html: memberHtml,
            });
            console.log(`✅ Mentor booking confirmation email sent to member: ${bookerEmail}`);
          }
        } catch (emailErr) {
          console.error("❌ Failed to send mentor booking emails:", emailErr);
        }
      })();
    } else {
      console.log("ℹ️ Resend not configured — skipping mentor booking emails");
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// Helper: auto-complete CONFIRMED bookings whose session time has passed
async function autoCompleteExpiredBookings(userId?: string, mentorProfileId?: string) {
  const now = new Date();
  const conditions = [inArray(mentorBookings.status, ["CONFIRMED", "PENDING"])];
  if (userId) conditions.push(eq(mentorBookings.userId, userId));
  if (mentorProfileId) conditions.push(eq(mentorBookings.mentorProfileId, mentorProfileId));

  const active = await db.select({
    id: mentorBookings.id,
    bookedDate: mentorBookings.bookedDate,
    bookedTime: mentorBookings.bookedTime,
    durationMinutes: mentorBookings.durationMinutes,
  }).from(mentorBookings).where(and(...conditions));

  const toComplete: string[] = [];
  for (const b of active) {
    const [h, m] = b.bookedTime.split(":").map(Number);
    const sessionEnd = new Date(`${b.bookedDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + (b.durationMinutes ?? 60));
    if (sessionEnd < now) toComplete.push(b.id);
  }

  if (toComplete.length > 0) {
    await db.update(mentorBookings)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(inArray(mentorBookings.id, toComplete));
  }
}

// GET /api/mentor-bookings/mine - Get user's bookings with mentor details
router.get("/mentor-bookings/mine", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Auto-complete sessions whose time has passed
    await autoCompleteExpiredBookings(req.user.id);

    const mentorUsers = users;
    const bookings = await db
      .select({
        id: mentorBookings.id,
        mentorProfileId: mentorBookings.mentorProfileId,
        mentorFirstName: mentorUsers.firstName,
        mentorLastName: mentorUsers.lastName,
        mentorProfileImageUrl: mentorUsers.profileImageUrl,
        mentorTitle: mentorProfiles.title,
        ideaId: mentorBookings.ideaId,
        ideaTitle: projects.title,
        pitchDeckId: mentorBookings.pitchDeckId,
        bookedDate: mentorBookings.bookedDate,
        bookedTime: mentorBookings.bookedTime,
        durationMinutes: mentorBookings.durationMinutes,
        meetingProvider: mentorBookings.meetingProvider,
        meetingLink: mentorBookings.meetingLink,
        notes: mentorBookings.notes,
        mentorFeedback: mentorBookings.mentorFeedback,
        status: mentorBookings.status,
        rating: mentorBookings.rating,
        feedback: mentorBookings.feedback,
        sessionGoalMet: mentorBookings.sessionGoalMet,
        wouldRecommend: mentorBookings.wouldRecommend,
        surveyCompletedAt: mentorBookings.surveyCompletedAt,
        createdAt: mentorBookings.createdAt,
      })
      .from(mentorBookings)
      .innerJoin(mentorProfiles, eq(mentorBookings.mentorProfileId, mentorProfiles.id))
      .innerJoin(mentorUsers, eq(mentorProfiles.userId, mentorUsers.id))
      .leftJoin(projects, eq(mentorBookings.ideaId, projects.id))
      .where(eq(mentorBookings.userId, req.user.id))
      .orderBy(mentorBookings.bookedDate, mentorBookings.bookedTime);

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// GET /api/mentor-profile/me - Get own mentor profile
router.get("/mentor-profile/me", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const [profile] = await db
      .select()
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, req.user.id));

    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const availability = await db
      .select()
      .from(mentorAvailability)
      .where(eq(mentorAvailability.mentorProfileId, profile.id));

    res.json({ ...profile, availability });
  } catch (error) {
    console.error("Error fetching mentor profile:", error);
    res.status(500).json({ message: "Failed to fetch mentor profile" });
  }
});

// PUT /api/mentor-profile/me - Update own profile + availability
router.put("/mentor-profile/me", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const {
      title,
      bio,
      location,
      website,
      calendlyLink,
      calendlyEventTypeUri,
      expertise,
      industries,
      sessionDurationMinutes,
      isActive,
      availability: availabilityData,
    } = req.body;

    // Upsert mentor profile
    const [existing] = await db
      .select()
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, req.user.id));

    let profile;
    if (existing) {
      [profile] = await db
        .update(mentorProfiles)
        .set({
          title,
          bio,
          location,
          website,
          calendlyLink: normalizeCalendlyUrl(calendlyLink),
          calendlyEventTypeUri: calendlyEventTypeUri?.trim() || null,
          expertise,
          industries,
          sessionDurationMinutes,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(mentorProfiles.userId, req.user.id))
        .returning();
    } else {
      const orgId = await getUserOrgId(req.user.id);
      if (!orgId) return res.status(400).json({ message: "No organization found for this user" });

      [profile] = await db
        .insert(mentorProfiles)
        .values({
          userId: req.user.id,
          orgId,
          title,
          bio,
          location,
          website,
          calendlyLink: normalizeCalendlyUrl(calendlyLink),
          calendlyEventTypeUri: calendlyEventTypeUri?.trim() || null,
          expertise,
          industries,
          sessionDurationMinutes,
          isActive,
        })
        .returning();
    }

    // Update availability if provided
    if (availabilityData && Array.isArray(availabilityData)) {
      await db.delete(mentorAvailability).where(eq(mentorAvailability.mentorProfileId, profile.id));
      if (availabilityData.length > 0) {
        await db.insert(mentorAvailability).values(
          availabilityData.map((slot: any) => ({
            mentorProfileId: profile.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }))
        );
      }
    }

    const updatedAvailability = await db
      .select()
      .from(mentorAvailability)
      .where(eq(mentorAvailability.mentorProfileId, profile.id));

    res.json({ ...profile, availability: updatedAvailability });
  } catch (error) {
    console.error("Error updating mentor profile:", error);
    res.status(500).json({ message: "Failed to update mentor profile" });
  }
});

// GET /api/mentor-profile/my-bookings - Get all bookings received by the logged-in mentor
router.get("/mentor-profile/my-bookings", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Find the mentor's own profile
    const [profile] = await db
      .select({ id: mentorProfiles.id })
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, req.user.id));

    if (!profile) return res.json([]);

    // Auto-complete sessions whose time has passed
    await autoCompleteExpiredBookings(undefined, profile.id);

    const bookings = await db
      .select({
        id: mentorBookings.id,
        userId: mentorBookings.userId,
        bookerFirstName: users.firstName,
        bookerLastName: users.lastName,
        ideaId: mentorBookings.ideaId,
        ideaTitle: projects.title,
        ideaSummary: projects.description,
        ideaTags: projects.tags,
        ideaStatus: projects.status,
        pitchDeckId: mentorBookings.pitchDeckId,
        pitchDeckDownloadUrl: pitchDeckGenerations.downloadUrl,
        pitchDeckStatus: pitchDeckGenerations.status,
        bookedDate: mentorBookings.bookedDate,
        bookedTime: mentorBookings.bookedTime,
        durationMinutes: mentorBookings.durationMinutes,
        meetingProvider: mentorBookings.meetingProvider,
        meetingLink: mentorBookings.meetingLink,
        notes: mentorBookings.notes,
        mentorFeedback: mentorBookings.mentorFeedback,
        status: mentorBookings.status,
        rating: mentorBookings.rating,
        feedback: mentorBookings.feedback,
        sessionGoalMet: mentorBookings.sessionGoalMet,
        wouldRecommend: mentorBookings.wouldRecommend,
        surveyCompletedAt: mentorBookings.surveyCompletedAt,
        participantEngagement: mentorBookings.participantEngagement,
        areasCoached: mentorBookings.areasCoached,
        mentorSurveyCompletedAt: mentorBookings.mentorSurveyCompletedAt,
        createdAt: mentorBookings.createdAt,
      })
      .from(mentorBookings)
      .innerJoin(users, eq(mentorBookings.userId, users.id))
      .leftJoin(projects, eq(mentorBookings.ideaId, projects.id))
      .leftJoin(pitchDeckGenerations, eq(mentorBookings.pitchDeckId, pitchDeckGenerations.id))
      .where(eq(mentorBookings.mentorProfileId, profile.id));

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching mentor bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// PATCH /api/mentor-bookings/:id/status - Confirm or decline a booking
router.patch("/mentor-bookings/:id/status", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { status } = req.body;
    if (!["CONFIRMED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be CONFIRMED or CANCELLED" });
    }

    // Find the mentor's profile to verify ownership
    const [profile] = await db
      .select({ id: mentorProfiles.id })
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, req.user.id));

    if (!profile) return res.status(403).json({ message: "No mentor profile found" });

    const [booking] = await db
      .select()
      .from(mentorBookings)
      .where(
        and(
          eq(mentorBookings.id, req.params.id),
          eq(mentorBookings.mentorProfileId, profile.id)
        )
      );

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    let meetingLink = booking.meetingLink;
    let calendlyEventUri = booking.calendlyEventUri;
    if (status === "CONFIRMED") {
      const [mentorConfig] = await db
        .select({
          id: mentorProfiles.id,
          calendlyLink: mentorProfiles.calendlyLink,
          calendlyEventTypeUri: mentorProfiles.calendlyEventTypeUri,
        })
        .from(mentorProfiles)
        .where(eq(mentorProfiles.id, booking.mentorProfileId))
        .limit(1);

      const [booker] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, booking.userId))
        .limit(1);

      // Use mentor-specific URI or fall back to platform-wide default
      const confirmEventTypeUri = mentorConfig?.calendlyEventTypeUri || CALENDLY_DEFAULT_EVENT_TYPE_URI;
      const confirmMentorToken = mentorConfig?.id ? await getMentorCalendlyToken(mentorConfig.id) : null;
      if (confirmEventTypeUri) {
        const generated = await createCalendlySchedulingLink(confirmEventTypeUri, confirmMentorToken);
        if (generated?.bookingUrl) {
          meetingLink = generated.bookingUrl;
          calendlyEventUri = generated.resourceUri || null;
        }
      }

      if (!meetingLink && mentorConfig?.calendlyLink) {
        const normalizedCalendlyLink = normalizeCalendlyUrl(mentorConfig.calendlyLink);
        if (normalizedCalendlyLink) {
          const bookerName = `${booker?.firstName || ""} ${booker?.lastName || ""}`.trim();
          meetingLink = buildCalendlyPrefillLink(
            normalizedCalendlyLink,
            bookerName,
            booker?.email || "",
            booking.bookedDate,
            booking.bookedTime,
          );
        }
      }
    }

    const [updated] = await db
      .update(mentorBookings)
      .set({
        status: status as any,
        meetingLink,
        calendlyEventUri,
        updatedAt: new Date(),
      })
      .where(eq(mentorBookings.id, req.params.id))
      .returning();

    // Auto-create attendance record when booking is CONFIRMED
    if (status === "CONFIRMED" && updated) {
      try {
        const [mentorProfile] = await db
          .select({ orgId: mentorProfiles.orgId })
          .from(mentorProfiles)
          .where(eq(mentorProfiles.id, updated.mentorProfileId))
          .limit(1);

        if (mentorProfile?.orgId) {
          const existing = await db
            .select({ id: attendanceRecords.id })
            .from(attendanceRecords)
            .where(eq(attendanceRecords.bookingId, updated.id))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(attendanceRecords).values({
              orgId: mentorProfile.orgId,
              userId: updated.userId,
              bookingId: updated.id,
              sessionType: "MENTOR_SESSION",
              scheduledDate: updated.bookedDate,
              scheduledTime: updated.bookedTime || undefined,
              status: "SCHEDULED",
            });
          }
        }
      } catch (attendanceErr) {
        console.error("Failed to create attendance record:", attendanceErr);
      }
    }

    res.json(updated);

    // Fire-and-forget: notify member when booking is CONFIRMED or CANCELLED
    if (resendClient && updated && (status === "CONFIRMED" || status === "CANCELLED")) {
      (async () => {
        try {
          const [memberUser] = await db
            .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, updated.userId));

          const [mentorUser] = await db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(mentorProfiles)
            .innerJoin(users, eq(mentorProfiles.userId, users.id))
            .where(eq(mentorProfiles.id, updated.mentorProfileId));

          if (!memberUser?.email) return;

          const memberName = `${memberUser.firstName || ""} ${memberUser.lastName || ""}`.trim() || memberUser.email;
          const mentorName = `${mentorUser?.firstName || ""} ${mentorUser?.lastName || ""}`.trim() || "your mentor";
          const hostUrl = process.env.HOST_URL || "https://os.fikrahub.com";

          if (status === "CONFIRMED") {
            const meetingLinkRow = `
              ${updated.meetingLink ? `<tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">🔗 Meeting Link</td><td style="padding:10px 14px;font-size:14px"><a href="${updated.meetingLink}" style="color:#4f46e5;font-weight:600">Join Session</a></td></tr>` : ""}
            `;
            await resendClient.emails.send({
              from: EMAIL_FROM,
              to: memberUser.email,
              subject: `✅ Your session with ${mentorName} is confirmed`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;border-radius:12px 12px 0 0">
                    <h2 style="color:white;margin:0;font-size:22px">✅ Session Confirmed</h2>
                    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Your session with ${mentorName} is confirmed</p>
                  </div>
                  <div style="background:#f9fafb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
                    <p style="color:#374151">Hi ${memberName},</p>
                    <p style="color:#374151">Great news! <strong>${mentorName}</strong> has confirmed your mentoring session.</p>
                    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:white;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
                      <tr style="background:#f3f4f6"><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">📅 Date</td><td style="padding:10px 14px;color:#111827;font-size:14px">${updated.bookedDate}</td></tr>
                      <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">🕐 Time</td><td style="padding:10px 14px;color:#111827;font-size:14px">${updated.bookedTime}</td></tr>
                      <tr style="background:#f3f4f6"><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap">⏱ Duration</td><td style="padding:10px 14px;color:#111827;font-size:14px">${updated.durationMinutes} minutes</td></tr>
                      ${meetingLinkRow}
                    </table>
                    ${updated.meetingLink
                      ? `<div style="text-align:center;margin:24px 0"><a href="${updated.meetingLink}" style="background:#4f46e5;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Join Session via Calendly</a></div>`
                      : `<p style="color:#6b7280;font-size:13px">The meeting link will be shared by your mentor before the session.</p>`
                    }
                    <p style="color:#6b7280;font-size:12px;margin-top:24px">This is an automated notification from CodeOS.</p>
                  </div>
                </div>`,
            });
            console.log(`✅ Booking confirmation email sent to member: ${memberUser.email}`);
          } else if (status === "CANCELLED") {
            await resendClient.emails.send({
              from: EMAIL_FROM,
              to: memberUser.email,
              subject: `Session with ${mentorName} has been cancelled`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
                  <p>Hi ${memberName},</p>
                  <p>Unfortunately, your session with <strong>${mentorName}</strong> on <strong>${updated.bookedDate} at ${updated.bookedTime}</strong> has been cancelled.</p>
                  <p>You can book a new session from the <a href="${hostUrl}" style="color:#4f46e5">dashboard</a>.</p>
                  <p style="color:#6b7280;font-size:12px">This is an automated notification from CodeOS.</p>
                </div>`,
            });
            console.log(`✅ Booking cancellation email sent to member: ${memberUser.email}`);
          }
        } catch (emailErr) {
          console.error("Failed to send booking status email:", emailErr);
        }
      })();
    }
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Failed to update booking" });
  }
});

// PATCH /api/mentor-bookings/:id/complete - Member marks session complete + submits rating
router.patch("/mentor-bookings/:id/complete", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { rating, feedback, sessionGoalMet, wouldRecommend } = req.body;
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
    }

    // Verify the user owns this booking
    const [booking] = await db
      .select()
      .from(mentorBookings)
      .where(and(eq(mentorBookings.id, req.params.id), eq(mentorBookings.userId, req.user.id)));

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "CANCELLED") return res.status(400).json({ message: "Cannot complete a cancelled booking" });

    const [updated] = await db
      .update(mentorBookings)
      .set({
        status: "COMPLETED",
        rating,
        feedback: feedback?.trim() || null,
        sessionGoalMet: typeof sessionGoalMet === "boolean" ? sessionGoalMet : null,
        wouldRecommend: typeof wouldRecommend === "boolean" ? wouldRecommend : null,
        surveyCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mentorBookings.id, req.params.id))
      .returning();

    res.json(updated);

    // Fire-and-forget: post-session thank-you email to member + notify mentor
    if (resendClient && updated) {
      (async () => {
        try {
          const [memberUser] = await db
            .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, updated.userId));
          const [mentorData] = await db
            .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(mentorProfiles)
            .innerJoin(users, eq(mentorProfiles.userId, users.id))
            .where(eq(mentorProfiles.id, updated.mentorProfileId));

          if (!memberUser?.email) return;
          const memberName = `${memberUser.firstName || ""} ${memberUser.lastName || ""}`.trim() || memberUser.email;
          const mentorName = `${mentorData?.firstName || ""} ${mentorData?.lastName || ""}`.trim() || "your mentor";

          await resendClient.emails.send({
            from: EMAIL_FROM,
            to: memberUser.email,
            subject: `🎉 Session completed — thanks for the feedback!`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#059669,#0d9488);padding:28px 32px;border-radius:12px 12px 0 0">
                <h2 style="color:white;margin:0;font-size:22px">🎉 Session Completed!</h2>
                <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">Thank you for your feedback</p>
              </div>
              <div style="background:#f9fafb;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
                <p style="color:#374151">Hi ${memberName},</p>
                <p style="color:#374151">Your mentoring session with <strong>${mentorName}</strong> on <strong>${updated.bookedDate} at ${updated.bookedTime}</strong> has been marked as complete.</p>
                ${rating ? `<p style="color:#374151">You rated this session <strong>${rating}/5 stars</strong>. Thank you for helping improve our mentorship program!</p>` : ""}
                <p style="color:#6b7280;font-size:13px;margin-top:24px">You can book another session anytime from your dashboard.</p>
              </div>
            </div>`,
          });

          // Notify mentor of completed session + rating
          if (mentorData?.email) {
            await resendClient.emails.send({
              from: EMAIL_FROM,
              to: mentorData.email,
              subject: `Session with ${memberName} completed`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
                <p>Hi ${mentorName},</p>
                <p><strong>${memberName}</strong> has marked your session on <strong>${updated.bookedDate} at ${updated.bookedTime}</strong> as completed.</p>
                ${rating ? `<p>They rated the session <strong>${rating}/5 stars</strong>${feedback ? ` with feedback: "<em>${feedback}</em>"` : ""}.</p>` : ""}
                <p style="color:#6b7280;font-size:12px">This is an automated notification from CodeOS.</p>
              </div>`,
            });
          }
        } catch (emailErr) {
          console.error("Failed to send post-session emails:", emailErr);
        }
      })();
    }
  } catch (error) {
    console.error("Error completing booking:", error);
    res.status(500).json({ message: "Failed to complete booking" });
  }
});

// PATCH /api/mentor-bookings/:id/cancel - Member cancels their own booking
router.patch("/mentor-bookings/:id/cancel", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const [booking] = await db
      .select()
      .from(mentorBookings)
      .where(and(eq(mentorBookings.id, req.params.id), eq(mentorBookings.userId, req.user.id)));

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "COMPLETED") return res.status(400).json({ message: "Cannot cancel a completed session" });
    if (booking.status === "CANCELLED") return res.status(400).json({ message: "Booking is already cancelled" });

    const [updated] = await db
      .update(mentorBookings)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(mentorBookings.id, req.params.id))
      .returning();

    res.json(updated);

    // Fire-and-forget: notify mentor of cancellation
    if (resendClient && updated) {
      (async () => {
        try {
          const [mentorUser] = await db
            .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(mentorProfiles)
            .innerJoin(users, eq(mentorProfiles.userId, users.id))
            .where(eq(mentorProfiles.id, updated.mentorProfileId));

          if (!mentorUser?.email) return;
          const mentorName = `${mentorUser.firstName || ""} ${mentorUser.lastName || ""}`.trim() || mentorUser.email;
          const memberName = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.email;
          const hostUrl = process.env.HOST_URL || "https://os.fikrahub.com";

          await resendClient.emails.send({
            from: EMAIL_FROM,
            to: mentorUser.email,
            subject: `Session cancelled by ${memberName}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
              <p>Hi ${mentorName},</p>
              <p><strong>${memberName}</strong> has cancelled their session scheduled for <strong>${updated.bookedDate} at ${updated.bookedTime}</strong>.</p>
              <p>The slot is now available for other bookings.</p>
              <p style="color:#6b7280;font-size:12px">This is an automated notification from CodeOS — <a href="${hostUrl}" style="color:#4f46e5">View Dashboard</a></p>
            </div>`,
          });
        } catch (emailErr) {
          console.error("Failed to send cancellation email to mentor:", emailErr);
        }
      })();
    }
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// PATCH /api/mentor-bookings/:id/reschedule - Member or mentor proposes new date/time
router.patch("/mentor-bookings/:id/reschedule", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { bookedDate, bookedTime } = req.body;
    if (!bookedDate || !bookedTime) {
      return res.status(400).json({ message: "bookedDate and bookedTime are required" });
    }

    // Find booking and determine if requester is member or mentor
    const [booking] = await db.select().from(mentorBookings).where(eq(mentorBookings.id, req.params.id));
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "COMPLETED") return res.status(400).json({ message: "Cannot reschedule a completed session" });
    if (booking.status === "CANCELLED") return res.status(400).json({ message: "Cannot reschedule a cancelled session" });

    const [mentorProfile] = await db.select({ id: mentorProfiles.id, userId: mentorProfiles.userId })
      .from(mentorProfiles).where(eq(mentorProfiles.id, booking.mentorProfileId)).limit(1);

    const isMember = booking.userId === req.user.id;
    const isMentor = mentorProfile?.userId === req.user.id;
    if (!isMember && !isMentor) return res.status(403).json({ message: "Not authorized to reschedule this booking" });

    // Validate availability
    const availSlots = await db.select().from(mentorAvailability).where(eq(mentorAvailability.mentorProfileId, booking.mentorProfileId));
    const bookingDow = new Date(`${bookedDate}T12:00:00Z`).getUTCDay();
    const matchingSlot = availSlots.find((a) => a.dayOfWeek === bookingDow);
    if (!matchingSlot) return res.status(400).json({ message: "Mentor is not available on this day" });

    const newStart = timeToMinutes(bookedTime);
    const newEnd = newStart + (booking.durationMinutes ?? 60);
    const slotStart = timeToMinutes(matchingSlot.startTime);
    const slotEnd = timeToMinutes(matchingSlot.endTime);
    if (newStart < slotStart || newEnd > slotEnd) {
      return res.status(400).json({ message: `Selected time is outside mentor's available hours (${matchingSlot.startTime}–${matchingSlot.endTime})` });
    }

    // Overlap check — exclude this booking itself
    const existing = await db
      .select({ bookedTime: mentorBookings.bookedTime, durationMinutes: mentorBookings.durationMinutes })
      .from(mentorBookings)
      .where(and(
        eq(mentorBookings.mentorProfileId, booking.mentorProfileId),
        eq(mentorBookings.bookedDate, bookedDate),
        inArray(mentorBookings.status, ["PENDING", "CONFIRMED", "COMPLETED"])
      ));

    for (const ex of existing.filter((e) => e.bookedTime !== booking.bookedTime || bookedDate !== booking.bookedDate)) {
      const exStart = timeToMinutes(ex.bookedTime);
      const exEnd = exStart + (ex.durationMinutes ?? 60);
      if (exStart < newEnd && exEnd > newStart) {
        return res.status(409).json({ message: "The new time slot overlaps with an existing booking" });
      }
    }

    const [updated] = await db
      .update(mentorBookings)
      .set({ bookedDate, bookedTime, status: "PENDING", updatedAt: new Date() })
      .where(eq(mentorBookings.id, req.params.id))
      .returning();

    res.json(updated);

    // Fire-and-forget: notify the other party
    if (resendClient && updated) {
      (async () => {
        try {
          const [memberUser] = await db
            .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, booking.userId));
          const [mentorUser] = await db
            .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(mentorProfiles)
            .innerJoin(users, eq(mentorProfiles.userId, users.id))
            .where(eq(mentorProfiles.id, booking.mentorProfileId));

          const memberName = `${memberUser?.firstName || ""} ${memberUser?.lastName || ""}`.trim() || memberUser?.email || "Member";
          const mentorName = `${mentorUser?.firstName || ""} ${mentorUser?.lastName || ""}`.trim() || mentorUser?.email || "Mentor";
          const requesterName = isMember ? memberName : mentorName;
          const hostUrl = process.env.HOST_URL || "https://os.fikrahub.com";

          const body = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
            <p>Hi {NAME},</p>
            <p><strong>${requesterName}</strong> has proposed rescheduling your session to <strong>${bookedDate} at ${bookedTime}</strong>.</p>
            <p>The booking is now <strong>pending confirmation</strong>. Please log in to confirm the new time.</p>
            <p><a href="${hostUrl}/dashboard" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">View Booking</a></p>
            <p style="color:#6b7280;font-size:12px;margin-top:20px">This is an automated notification from CodeOS.</p>
          </div>`;

          // Notify the other party (not the requester)
          if (isMember && mentorUser?.email) {
            await resendClient.emails.send({
              from: EMAIL_FROM,
              to: mentorUser.email,
              subject: `${memberName} proposed a reschedule — please confirm`,
              html: body.replace("{NAME}", mentorName),
            });
          } else if (isMentor && memberUser?.email) {
            await resendClient.emails.send({
              from: EMAIL_FROM,
              to: memberUser.email,
              subject: `${mentorName} proposed rescheduling your session`,
              html: body.replace("{NAME}", memberName),
            });
          }
        } catch (emailErr) {
          console.error("Failed to send reschedule notification email:", emailErr);
        }
      })();
    }
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    res.status(500).json({ message: "Failed to reschedule booking" });
  }
});

// PATCH /api/mentor-bookings/:id/mentor-feedback - Mentor writes feedback for participant
router.patch("/mentor-bookings/:id/mentor-feedback", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const mentorFeedback = typeof req.body?.mentorFeedback === "string"
      ? req.body.mentorFeedback.trim()
      : "";

    if (mentorFeedback.length > 2000) {
      return res.status(400).json({ message: "Feedback must be 2000 characters or less" });
    }

    const [profile] = await db
      .select({ id: mentorProfiles.id })
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, req.user.id))
      .limit(1);

    if (!profile) return res.status(403).json({ message: "No mentor profile found" });

    const [booking] = await db
      .select({ id: mentorBookings.id })
      .from(mentorBookings)
      .where(
        and(
          eq(mentorBookings.id, req.params.id),
          eq(mentorBookings.mentorProfileId, profile.id),
        )
      )
      .limit(1);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const [updated] = await db
      .update(mentorBookings)
      .set({
        mentorFeedback: mentorFeedback || null,
        mentorFeedbackUpdatedAt: mentorFeedback ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(mentorBookings.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error saving mentor feedback:", error);
    res.status(500).json({ message: "Failed to save mentor feedback" });
  }
});

// PATCH /api/mentor-bookings/:id/mentor-survey - Mentor submits post-session survey
router.patch("/mentor-bookings/:id/mentor-survey", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { mentorFeedback, participantEngagement, areasCoached } = req.body;

    if (participantEngagement !== undefined && (typeof participantEngagement !== "number" || participantEngagement < 1 || participantEngagement > 5)) {
      return res.status(400).json({ message: "participantEngagement must be 1–5" });
    }
    if (areasCoached !== undefined && !Array.isArray(areasCoached)) {
      return res.status(400).json({ message: "areasCoached must be an array" });
    }

    const [profile] = await db
      .select({ id: mentorProfiles.id })
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, req.user.id))
      .limit(1);

    if (!profile) return res.status(403).json({ message: "No mentor profile found" });

    const [booking] = await db
      .select({ id: mentorBookings.id, status: mentorBookings.status })
      .from(mentorBookings)
      .where(and(eq(mentorBookings.id, req.params.id), eq(mentorBookings.mentorProfileId, profile.id)))
      .limit(1);

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "COMPLETED") return res.status(400).json({ message: "Session must be completed before submitting a survey" });

    const [updated] = await db
      .update(mentorBookings)
      .set({
        mentorFeedback: typeof mentorFeedback === "string" ? mentorFeedback.trim() || null : undefined,
        mentorFeedbackUpdatedAt: typeof mentorFeedback === "string" && mentorFeedback.trim() ? new Date() : undefined,
        participantEngagement: participantEngagement ?? undefined,
        areasCoached: areasCoached ?? undefined,
        mentorSurveyCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mentorBookings.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error saving mentor survey:", error);
    res.status(500).json({ message: "Failed to save mentor survey" });
  }
});

// GET /api/mentors/:id/reviews - Public reviews for a mentor profile
router.get("/mentors/:id/reviews", async (req: any, res) => {
  try {
    const reviews = await db
      .select({
        id: mentorBookings.id,
        rating: mentorBookings.rating,
        feedback: mentorBookings.feedback,
        bookedDate: mentorBookings.bookedDate,
        bookerFirstName: users.firstName,
        createdAt: mentorBookings.createdAt,
      })
      .from(mentorBookings)
      .innerJoin(users, eq(mentorBookings.userId, users.id))
      .where(
        and(
          eq(mentorBookings.mentorProfileId, req.params.id),
          eq(mentorBookings.status, "COMPLETED"),
          isNotNull(mentorBookings.rating)
        )
      )
      .orderBy(desc(mentorBookings.createdAt));

    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// GET /api/workspaces/:orgId/admin/mentor-insights
router.get("/workspaces/:orgId/admin/mentor-insights", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { orgId } = req.params;

    // Get all mentors in this org
    const mentors = await db
      .select({
        id: mentorProfiles.id,
        userId: mentorProfiles.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        title: mentorProfiles.title,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .where(eq(mentorProfiles.orgId, orgId));

    const insights = await Promise.all(mentors.map(async (mentor) => {
      const bookings = await db
        .select({
          status: mentorBookings.status,
          durationMinutes: mentorBookings.durationMinutes,
          userId: mentorBookings.userId,
          rating: mentorBookings.rating,
        })
        .from(mentorBookings)
        .where(eq(mentorBookings.mentorProfileId, mentor.id));

      const completed = bookings.filter(b => b.status === 'COMPLETED');
      const confirmed = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED');
      const totalHours = completed.reduce((sum, b) => sum + (b.durationMinutes || 60), 0) / 60;
      const attendanceRate = confirmed.length > 0 ? Math.round((completed.length / confirmed.length) * 100) : 0;
      const uniqueParticipants = new Set(bookings.map(b => b.userId)).size;
      const ratings = completed.filter(b => b.rating).map(b => b.rating as number);
      const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;

      const riskFlags: string[] = [];
      if (completed.length === 0) riskFlags.push("no_sessions");
      if (avgRating !== null && avgRating < 3) riskFlags.push("low_rating");
      if (attendanceRate < 50 && confirmed.length >= 3) riskFlags.push("low_attendance");

      return {
        ...mentor,
        totalSessions: completed.length,
        totalHours: Math.round(totalHours * 10) / 10,
        attendanceRate,
        uniqueParticipants,
        avgRating,
        riskFlags,
      };
    }));

    res.json(insights);
  } catch (error) {
    console.error("Error fetching mentor insights:", error);
    res.status(500).json({ message: "Failed to fetch mentor insights" });
  }
});

// GET /api/workspaces/:orgId/admin/mentor-feedback
router.get("/workspaces/:orgId/admin/mentor-feedback", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { orgId } = req.params;
    const { mentorId, minRating, maxRating } = req.query as Record<string, string>;

    const mentorUsers = users;
    const memberUsers = users;

    // Get org's mentor profile IDs
    const orgMentors = await db
      .select({ id: mentorProfiles.id, userId: mentorProfiles.userId })
      .from(mentorProfiles)
      .where(eq(mentorProfiles.orgId, orgId));

    if (orgMentors.length === 0) return res.json([]);

    const mentorProfileIds = mentorId
      ? orgMentors.filter(m => m.userId === mentorId).map(m => m.id)
      : orgMentors.map(m => m.id);

    if (mentorProfileIds.length === 0) return res.json([]);

    const rows = await db
      .select({
        id: mentorBookings.id,
        bookedDate: mentorBookings.bookedDate,
        bookedTime: mentorBookings.bookedTime,
        durationMinutes: mentorBookings.durationMinutes,
        rating: mentorBookings.rating,
        feedback: mentorBookings.feedback,
        sessionGoalMet: mentorBookings.sessionGoalMet,
        wouldRecommend: mentorBookings.wouldRecommend,
        surveyCompletedAt: mentorBookings.surveyCompletedAt,
        mentorFeedback: mentorBookings.mentorFeedback,
        participantEngagement: mentorBookings.participantEngagement,
        areasCoached: mentorBookings.areasCoached,
        mentorSurveyCompletedAt: mentorBookings.mentorSurveyCompletedAt,
        memberFirstName: memberUsers.firstName,
        memberLastName: memberUsers.lastName,
        mentorProfileId: mentorBookings.mentorProfileId,
      })
      .from(mentorBookings)
      .innerJoin(memberUsers, eq(mentorBookings.userId, memberUsers.id))
      .where(
        and(
          inArray(mentorBookings.mentorProfileId, mentorProfileIds),
          eq(mentorBookings.status, "COMPLETED"),
          isNotNull(mentorBookings.rating),
        )
      )
      .orderBy(desc(mentorBookings.createdAt));

    // Attach mentor name
    const mentorMap: Record<string, string> = {};
    for (const m of orgMentors) {
      const [u] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, m.userId));
      if (u) mentorMap[m.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    }

    let result = rows.map(r => ({ ...r, mentorName: mentorMap[r.mentorProfileId] || "" }));

    if (minRating) result = result.filter(r => (r.rating || 0) >= parseInt(minRating));
    if (maxRating) result = result.filter(r => (r.rating || 0) <= parseInt(maxRating));

    res.json(result);
  } catch (error) {
    console.error("Error fetching mentor feedback:", error);
    res.status(500).json({ message: "Failed to fetch mentor feedback" });
  }
});

// ─── Calendly OAuth endpoints ─────────────────────────────────────────────────

// GET /api/mentor/calendly/connect — redirect mentor to Calendly OAuth page
router.get("/mentor/calendly/connect", async (req: any, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (!CALENDLY_CLIENT_ID || !CALENDLY_REDIRECT_URI) {
    return res.status(501).json({ message: "Calendly OAuth not configured (CALENDLY_CLIENT_ID / CALENDLY_REDIRECT_URI missing)" });
  }
  // Encode returnTo in state: "userId|/w/slug/dashboard"
  const returnTo = (req.query.returnTo as string) || "/";
  const state = `${req.user.id}|${returnTo}`;
  const params = new URLSearchParams({
    client_id: CALENDLY_CLIENT_ID,
    response_type: "code",
    redirect_uri: CALENDLY_REDIRECT_URI,
    state,
  });
  res.redirect(`https://auth.calendly.com/oauth/authorize?${params}`);
});

// GET /api/mentor/calendly/callback — handle OAuth redirect from Calendly
router.get("/mentor/calendly/callback", async (req: any, res) => {
  // Derive base URL from request — works in both dev and production
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
  const frontendBase = `${proto}://${host}`;

  const { code, state, error } = req.query as Record<string, string>;
  // Parse state: "userId|returnPath" — state is the source of truth since session
  // cookie is often absent on cross-site redirects (SameSite restrictions)
  const [stateUserId, ...returnParts] = (state || "").split("|");
  const returnPath = returnParts.join("|") || "/";
  const returnBase = `${frontendBase}${returnPath}`;

  console.log("📅 Calendly callback — stateUserId:", stateUserId, "| returnPath:", returnPath);

  if (error) return res.redirect(`${returnBase}?calendly=error&reason=${encodeURIComponent(error)}`);
  if (!code || !stateUserId) return res.redirect(`${frontendBase}?calendly=error&reason=no_code`);
  if (!CALENDLY_CLIENT_ID || !CALENDLY_CLIENT_SECRET || !CALENDLY_REDIRECT_URI) {
    return res.redirect(`${returnBase}?calendly=error&reason=misconfigured`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://auth.calendly.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: CALENDLY_REDIRECT_URI,
        client_id: CALENDLY_CLIENT_ID,
        client_secret: CALENDLY_CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("❌ Calendly token exchange failed:", tokenRes.status, body);
      return res.redirect(`${returnBase}?calendly=error&reason=token_exchange`);
    }
    const tokenData: any = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    const tokenExpiry = new Date(Date.now() + (expires_in || 7200) * 1000);

    // Get the Calendly user URI and first event type
    const meRes = await fetch(`${CALENDLY_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const meData: any = await meRes.json();
    const calendlyUserUri: string = meData?.resource?.uri || "";

    // Fetch their event types and auto-pick the first active one
    let autoEventTypeUri: string | null = null;
    if (calendlyUserUri) {
      const etRes = await fetch(`${CALENDLY_API_BASE}/event_types?user=${encodeURIComponent(calendlyUserUri)}&active=true`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const etData: any = await etRes.json();
      autoEventTypeUri = etData?.collection?.[0]?.uri || null;
    }

    // Store in mentor_profiles using userId from state (session unavailable on cross-site redirect)
    const updateResult = await db.update(mentorProfiles)
      .set({
        calendlyAccessToken: access_token,
        calendlyRefreshToken: refresh_token || null,
        calendlyTokenExpiry: tokenExpiry,
        calendlyUserUri: calendlyUserUri || null,
        ...(autoEventTypeUri ? { calendlyEventTypeUri: autoEventTypeUri } : {}),
      })
      .where(eq(mentorProfiles.userId, stateUserId))
      .returning({ id: mentorProfiles.id });

    console.log("📅 Calendly tokens saved for", stateUserId, "— rows updated:", updateResult.length);

    res.redirect(`${returnBase}?calendly=connected`);
  } catch (err) {
    console.error("❌ Calendly OAuth callback error:", err);
    res.redirect(`${returnBase}?calendly=error&reason=server_error`);
  }
});

// GET /api/mentor/calendly/status — return connection status + event types
router.get("/mentor/calendly/status", async (req: any, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  const [profile] = await db
    .select({
      id: mentorProfiles.id,
      calendlyUserUri: mentorProfiles.calendlyUserUri,
      calendlyAccessToken: mentorProfiles.calendlyAccessToken,
      calendlyTokenExpiry: mentorProfiles.calendlyTokenExpiry,
      calendlyEventTypeUri: mentorProfiles.calendlyEventTypeUri,
    })
    .from(mentorProfiles)
    .where(eq(mentorProfiles.userId, req.user.id));

  if (!profile?.calendlyAccessToken) {
    return res.json({ connected: false });
  }

  try {
    // Get a valid token — refresh if expired
    const effectiveToken = await getMentorCalendlyToken(profile.id) || profile.calendlyAccessToken;

    // Fetch user info
    const meRes = await fetch(`${CALENDLY_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${effectiveToken}` },
    });
    if (!meRes.ok) return res.json({ connected: false });
    const meData: any = await meRes.json();
    const userInfo = meData?.resource;

    // Fetch event types
    let eventTypes: any[] = [];
    if (profile.calendlyUserUri) {
      const etRes = await fetch(`${CALENDLY_API_BASE}/event_types?user=${encodeURIComponent(profile.calendlyUserUri)}&active=true`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      const etData: any = await etRes.json();
      eventTypes = (etData?.collection || []).map((et: any) => ({
        uri: et.uri,
        name: et.name,
        duration: et.duration,
        schedulingUrl: et.scheduling_url,
      }));
    }

    return res.json({
      connected: true,
      name: userInfo?.name || "",
      email: userInfo?.email || "",
      avatarUrl: userInfo?.avatar_url || null,
      selectedEventTypeUri: profile.calendlyEventTypeUri || null,
      eventTypes,
    });
  } catch {
    return res.json({ connected: false });
  }
});

// PUT /api/mentor/calendly/event-type — mentor selects which event type to use
router.put("/mentor/calendly/event-type", async (req: any, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  const { eventTypeUri } = req.body;
  if (!eventTypeUri) return res.status(400).json({ message: "eventTypeUri required" });

  await db.update(mentorProfiles)
    .set({ calendlyEventTypeUri: eventTypeUri })
    .where(eq(mentorProfiles.userId, req.user.id));

  return res.json({ ok: true });
});

// DELETE /api/mentor/calendly/disconnect — revoke OAuth connection
router.delete("/mentor/calendly/disconnect", async (req: any, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  await db.update(mentorProfiles)
    .set({ calendlyAccessToken: null, calendlyRefreshToken: null, calendlyTokenExpiry: null, calendlyUserUri: null })
    .where(eq(mentorProfiles.userId, req.user.id));
  return res.json({ ok: true });
});

// GET /api/debug/calendly — test Calendly integration (dev only)
router.get("/debug/calendly", async (req: any, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  const token = process.env.CALENDLY_PAT_TOKEN;
  const eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;
  const apiBase = CALENDLY_API_BASE;

  const result: any = {
    env: {
      CALENDLY_PAT_TOKEN: token ? `set (${token.length} chars)` : "NOT SET",
      CALENDLY_EVENT_TYPE_URI: eventTypeUri || "NOT SET",
      CALENDLY_API_BASE: apiBase,
    },
  };

  if (!token) {
    return res.json({ ...result, error: "CALENDLY_PAT_TOKEN not set — restart server after updating .env" });
  }
  if (!eventTypeUri) {
    return res.json({ ...result, error: "CALENDLY_EVENT_TYPE_URI not set" });
  }

  try {
    const response = await fetch(`${apiBase}/scheduling_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ owner: eventTypeUri, owner_type: "EventType", max_event_count: 1 }),
    });
    const body = await response.json();
    result.apiStatus = response.status;
    result.apiResponse = body;
    result.bookingUrl = body?.resource?.booking_url || null;
    result.success = !!result.bookingUrl;
  } catch (err: any) {
    result.error = err.message;
    result.success = false;
  }

  res.json(result);
});

export default router;
