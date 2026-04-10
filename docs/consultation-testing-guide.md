# Consultation Feature — Testing Guide

## Overview

The Consultation feature has 4 main flows:
1. **Admin: Enable + Configure** consultation settings
2. **Admin: Award credits** to participants
3. **Admin: Create sessions** and manage bookings
4. **Participant: View eligibility** and book a session

---

## Prerequisites

- A workspace (e.g. `test-workspace`)
- At least 2 accounts: 1 **Admin/Owner**, 1 **Member** (participant)
- Email service is optional — if not configured, emails are logged to console

---

## Step 1 — Enable Consultation (Admin)

1. Log in as **Admin/Owner**
2. Navigate to: `Admin → Consultation` (sidebar)
3. Click the **Settings** tab
4. Toggle **Enable Consultation** → ON
5. Set:
   - **Minimum Credits Required**: e.g. `5`
   - **Max Eligible Participants (Top N)**: e.g. `3`
6. Click **Save Settings**

**Expected:** Toast "Consultation settings saved"

---

## Step 2 — Award Credits to a Participant (Admin)

1. Go to **Admin → Consultation → Award Credits** tab
2. Select a participant from the dropdown
3. Set credits (e.g. `10`)
4. Optionally select a challenge and add a reason
5. Click **Award Credits**

**Expected:**
- Toast "Credits awarded"
- Entry appears in the Credit Ledger table below
- Rankings tab updates to show participant with their credit total

### Verify Rankings

1. Go to **Rankings** tab
2. Participant should appear with their credit total
3. If `totalCredits >= minCredits` AND rank is within Top N → badge shows **Eligible**

---

## Step 3 — Create a Consultation Session (Admin)

1. Go to **Admin → Consultation → Sessions** tab
2. Fill in the **Create Session** form:
   - **Title**: e.g. "Business Model Review"
   - **Scheduled Date & Time**: pick a future date/time
   - **Capacity**: e.g. `2`
   - **Meeting Link** (optional): e.g. `https://meet.google.com/abc-xyz`
   - **Notes** (optional)
3. Click **Create Session**

**Expected:**
- Toast "Session created"
- Session appears in the Sessions list with status `ACTIVE` and `0/2 booked`

---

## Step 4 — Participant Views Eligibility

1. Log in as the **Member** who received credits
2. Navigate to: Sidebar → **Consultation** (CalendarCheck icon)

**If NOT eligible** (below credit threshold or not in top N):
- Card shows "Not Eligible Yet" with a progress bar toward minimum credits
- Rank is shown if participant has any credits

**If ELIGIBLE:**
- Card shows "You Are Eligible!" in green
- Credit total and rank are shown
- Available sessions are listed below

---

## Step 5 — Participant Books a Session

1. On the Consultation page (ELIGIBLE state), find an available session
2. Click **Book**

**Expected:**
- Toast "Booking confirmed! You will receive a confirmation email."
- Page transitions to **BOOKED** state showing:
  - Session title
  - Scheduled date & time
  - Booking status: **Pending**
- If email is configured, participant receives a "Consultation Booked" email

**Edge cases to test:**
- If participant tries to book a second session → should get error "You already have an active booking"
- If session is full (filledSlots = capacity) → should get error "Session is full"

---

## Step 6 — Admin Confirms / Cancels Booking

1. Log in as **Admin**
2. Go to **Admin → Consultation → Sessions** tab
3. Click the **expand** button (chevron) on the session
4. Booking row appears with participant name, status "PENDING"
5. Click the **green checkmark** to confirm, or **red X** to cancel

**On Confirm:**
- Booking status changes to `CONFIRMED`
- If email is configured, participant receives "Consultation Confirmed" email with meeting link (if set)
- Participant's Consultation page now shows meeting link + "Join Meeting" button

**On Cancel:**
- Booking status changes to `CANCELLED`
- `filledSlots` is decremented — session becomes bookable again
- Participant's Consultation page should revert to ELIGIBLE state (after page refresh)

---

## Step 7 — Session Status Management (Admin)

In the Sessions list, for ACTIVE sessions:
- **Complete** button → marks session as `COMPLETED`
- **Cancel** button → marks session as `CANCELLED`

Cancelled or completed sessions no longer appear in the participant's available sessions list.

---

## Step 8 — Admin Removes a Credit Entry

1. Go to **Award Credits** tab → Credit Ledger
2. Click the **trash icon** on any entry
3. Entry is removed and rankings update accordingly

---

## Audit Log Verification (Optional)

The following events are recorded in `platform_events` table:
| Event | Trigger |
|---|---|
| `CONSULTATION_BOOKED` | Participant books a session |
| `CONSULTATION_CONFIRMED` | Admin confirms a booking |
| `CONSULTATION_CANCELLED` | Admin cancels a booking |

Check via DB:
```sql
SELECT event_type, user_id, metadata, created_at
FROM platform_events
WHERE event_type LIKE 'CONSULTATION_%'
ORDER BY created_at DESC;
```

---

## Email Notifications Summary

| Trigger | Recipient | Subject |
|---|---|---|
| Participant books session | Participant | "📅 Consultation Booked: {title}" |
| Admin confirms booking | Participant | "✅ Consultation Confirmed: {title}" |
| Admin cancels booking | Participant | "📅 Consultation Booking Received: {title}" |

If `SMTP_*` env vars are not set, emails are logged to console (mock mode).

---

## Quick Checklist

- [ ] Admin can enable consultation and configure thresholds
- [ ] Admin can award credits and see rankings
- [ ] Admin can create sessions with capacity and meeting link
- [ ] Participant sees "Not Eligible" if below threshold
- [ ] Participant sees "Eligible" + available sessions when qualifying
- [ ] Participant can book a session (PENDING status)
- [ ] Double-booking is blocked (409 error)
- [ ] Full session is blocked (409 error)
- [ ] Admin can expand session and see bookings
- [ ] Admin can confirm booking → participant sees "CONFIRMED" + meeting link
- [ ] Admin can cancel booking → slot freed, participant reverts to ELIGIBLE
- [ ] Admin can mark session as Completed or Cancelled
- [ ] Admin can delete credit entries
- [ ] Audit events recorded in platform_events
