import { Router } from "express";
import { db } from "./db";
import { mentorProfiles, mentorAvailability, mentorBookings, users } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/mentors - List active mentors in current org
router.get("/mentors", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

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
      .where(
        and(
          eq(mentorProfiles.orgId, req.user.orgId),
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

    const { mentorProfileId, ideaId, bookedDate, bookedTime, durationMinutes, notes } = req.body;

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
        bookedDate,
        bookedTime,
        durationMinutes: durationMinutes || 60,
        notes: notes || null,
        status: "PENDING",
      })
      .returning();

    res.status(201).json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// GET /api/mentor-bookings/mine - Get user's bookings
router.get("/mentor-bookings/mine", async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const bookings = await db
      .select()
      .from(mentorBookings)
      .where(eq(mentorBookings.userId, req.user.id));

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
      [profile] = await db
        .insert(mentorProfiles)
        .values({
          userId: req.user.id,
          orgId: req.user.orgId,
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

export default router;
