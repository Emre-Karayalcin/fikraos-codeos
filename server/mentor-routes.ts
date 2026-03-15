import { Router } from "express";
import { db } from "./db";
import { mentorProfiles, mentorAvailability, mentorBookings, users, ideas, projects, organizationMembers, pitchDeckGenerations } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@fikrahub.com";

const router = Router();

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

    res.json(mentors);
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
        notes: mentorBookings.notes,
        status: mentorBookings.status,
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

    const { title, bio, location, website, expertise, industries, sessionDurationMinutes, isActive, availability: availabilityData } = req.body;

    // Upsert mentor profile
    const [existing] = await db
      .select()
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, req.user.id));

    let profile;
    if (existing) {
      [profile] = await db
        .update(mentorProfiles)
        .set({ title, bio, location, website, expertise, industries, sessionDurationMinutes, isActive, updatedAt: new Date() })
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
          title, bio, location, website, expertise, industries, sessionDurationMinutes, isActive,
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
        notes: mentorBookings.notes,
        status: mentorBookings.status,
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

    const [updated] = await db
      .update(mentorBookings)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(mentorBookings.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Failed to update booking" });
  }
});

export default router;
