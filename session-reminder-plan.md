# Session Reminder Plan

## Context
Three booking types need pre-session reminder emails configurable by PMO:
1. **Mentor Bookings** (`mentorBookings`) — 1:1 sessions, `bookedDate`+`bookedTime` varchar, org via `mentorProfiles.orgId`
2. **Consultation Bookings** (`consultationBookings`) — participant books a slot, date via `consultationSessions.scheduledAt`, direct `orgId`
3. **Module Consultations** (`moduleConsultations`) — PMO-created group events, `scheduledAt` timestamp, org via `programModules.orgId`

A single org-level `sessionReminderHours` (default 24h) controls reminder timing for all types.
Reminders are idempotent — tracked via `sessionReminderSentAt` column per booking.

---

## Phase 1 — DB Schema (`shared/schema.ts`)

Add to `mentorBookings`:
```ts
sessionReminderSentAt: timestamp("session_reminder_sent_at"),
```

Add to `consultationBookings`:
```ts
sessionReminderSentAt: timestamp("session_reminder_sent_at"),
```

Add to `moduleConsultations`:
```ts
sessionReminderSentAt: timestamp("session_reminder_sent_at"),
```

Add to `organizations`:
```ts
sessionReminderHours: integer("session_reminder_hours").default(24),
```

Migration SQL:
```sql
ALTER TABLE mentor_bookings        ADD COLUMN IF NOT EXISTS session_reminder_sent_at TIMESTAMP;
ALTER TABLE consultation_bookings  ADD COLUMN IF NOT EXISTS session_reminder_sent_at TIMESTAMP;
ALTER TABLE module_consultations   ADD COLUMN IF NOT EXISTS session_reminder_sent_at TIMESTAMP;
ALTER TABLE organizations          ADD COLUMN IF NOT EXISTS session_reminder_hours INTEGER DEFAULT 24;
```

---

## Phase 2 — Email Templates (`server/email-templates/`)

Use `application-approved.html` as layout base (logo, dark mode, mobile responsive, CSS vars).

### `mentor-session-reminder.html`
- Variables: `{{ userName }}`, `{{ orgName }}`, `{{ mentorName }}`, `{{ sessionDate }}`, `{{ sessionTime }}`, `{{ durationMinutes }}`, `{{ meetingLink }}`, `{{ dashboardUrl }}`
- Sent to: **participant** and **mentor** (separate emails)
- Header gradient: blue (`#2563eb` → `#6366f1`)

### `consultation-session-reminder.html`
- Variables: `{{ userName }}`, `{{ orgName }}`, `{{ consultantName }}`, `{{ sessionTitle }}`, `{{ sessionDate }}`, `{{ meetingLink }}`, `{{ dashboardUrl }}`
- Sent to: **participant**
- Header gradient: purple (`#7c3aed` → `#6366f1`)

### `event-session-reminder.html`
- Variables: `{{ userName }}`, `{{ orgName }}`, `{{ eventTitle }}`, `{{ sessionDate }}`, `{{ location }}`, `{{ meetingLink }}`, `{{ dashboardUrl }}`
- Sent to: **all org MEMBERs** in the program's org
- Header gradient: teal (`#0891b2` → `#0d9488`)

---

## Phase 3 — Backend (`server/sessionReminderService.ts`) — new file

### `checkAndSendSessionReminders(orgId?: string)`

Called from key API endpoints (fire-and-forget). Logic per booking type:

**Mentor Bookings:**
1. Fetch CONFIRMED/PENDING bookings where `sessionReminderSentAt IS NULL`
2. Reconstruct session datetime from `bookedDate` + `bookedTime`
3. If `now >= sessionStart - sessionReminderHours` AND `now < sessionStart` → send email to participant + mentor
4. Set `sessionReminderSentAt = now()`

**Consultation Bookings:**
1. Fetch PENDING/CONFIRMED bookings joined with `consultationSessions.scheduledAt` where `sessionReminderSentAt IS NULL`
2. If `now >= scheduledAt - sessionReminderHours` AND `now < scheduledAt` → send email to participant
3. Set `sessionReminderSentAt = now()`

**Module Consultations:**
1. Fetch "scheduled" sessions where `sessionReminderSentAt IS NULL`
2. If `now >= scheduledAt - sessionReminderHours` AND `now < scheduledAt` → send to all org MEMBERs in the org
3. Set `moduleConsultations.sessionReminderSentAt = now()`

### Trigger points
- `GET /api/mentor-bookings/mine` (already calls `autoCompleteExpiredBookings`)
- `GET /api/consultation-sessions` or consultation booking routes
- `GET /api/program-modules` or any program route

### New admin endpoint in `server/mentor-routes.ts`
```
PATCH /api/workspaces/:orgId/admin/session-reminder-settings
Body: { sessionReminderHours: number (1–168) }
Auth: isAuthenticated + ADMIN/OWNER check
```

---

## Phase 4 — PMO Settings UI

Extend existing `AdminMentorFeedback.tsx` OR add to a shared Notifications settings page.

Add a second settings card:
- Label: "Send session reminder to participants X hours before session"
- Input: number (1–168, default 24)
- Save → `PATCH /api/workspaces/:orgId/admin/session-reminder-settings`
- Applies to all booking types (mentor, consultation, events)

Update `GET /api/workspaces/:orgId/admin/mentor-feedback` to also return `sessionReminderHours` in the response.

---

## Files to Modify / Create

| File | Change |
|---|---|
| `shared/schema.ts` | +1 col on `mentorBookings`, `consultationBookings`, `moduleConsultations`, `organizations` |
| `server/sessionReminderService.ts` | **New** — centralized reminder logic for all 3 types |
| `server/mentor-routes.ts` | Trigger `checkAndSendSessionReminders` from `/mine`; add settings endpoint |
| `server/consultation-routes.ts` | Trigger `checkAndSendSessionReminders` from key GET routes |
| `server/program-routes.ts` | Trigger `checkAndSendSessionReminders` from key GET routes |
| `server/email-templates/mentor-session-reminder.html` | **New** |
| `server/email-templates/consultation-session-reminder.html` | **New** |
| `server/email-templates/event-session-reminder.html` | **New** |
| `client/src/pages/AdminMentorFeedback.tsx` | Add session reminder settings card |
