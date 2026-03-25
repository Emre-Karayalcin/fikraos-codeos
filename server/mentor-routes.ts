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

const router = Router();

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

async function createCalendlySchedulingLink(eventTypeUri: string): Promise<{ bookingUrl: string; resourceUri?: string } | null> {
  const calendlyToken = process.env.CALENDLY_PAT_TOKEN;
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

    // Try to generate a single-use scheduling link via Calendly API at booking time
    let initialMeetingLink: string | null = null;
    if (effectiveEventTypeUri) {
      const generated = await createCalendlySchedulingLink(effectiveEventTypeUri);
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

    // Check for conflicts
    const [existing] = await db
      .select()
      .from(mentorBookings)
      .where(
        and(
          eq(mentorBookings.mentorProfileId, mentorProfileId),
          eq(mentorBookings.bookedDate, bookedDate),
          eq(mentorBookings.bookedTime, bookedTime)
        )
      );

    if (existing) {
      return res.status(409).json({ message: "This time slot is already booked" });
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

// GET /api/mentor-bookings/mine - Get user's bookings with mentor details
router.get("/mentor-bookings/mine", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

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
      if (confirmEventTypeUri) {
        const generated = await createCalendlySchedulingLink(confirmEventTypeUri);
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

    const { rating, feedback } = req.body;
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
      .set({ status: "COMPLETED", rating, feedback: feedback?.trim() || null, updatedAt: new Date() })
      .where(eq(mentorBookings.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error completing booking:", error);
    res.status(500).json({ message: "Failed to complete booking" });
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
        mentorFeedback: mentorBookings.mentorFeedback,
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
