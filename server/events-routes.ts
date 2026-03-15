import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./auth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { events } from "../shared/schema";

export function registerEventRoutes(app: Express) {
  // GET /api/events — list published events, sorted by startDate asc
  app.get("/api/events", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const rows = await db
        .select()
        .from(events)
        .where(eq(events.isPublished, true))
        .orderBy(events.startDate);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // GET /api/events/:id — single published event
  app.get("/api/events/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, id));
      if (!event || !event.isPublished) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });
}
