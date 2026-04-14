# Consultation Feature — Testing Guide

All 14 requirements are implemented. Use this guide to test each one end-to-end.

---

## Accounts Needed

| Role | Purpose |
|---|---|
| Admin / Owner | Configure consultation, award credits, manage sessions |
| Member A | Will become eligible (top rank) |
| Member B | Will be below threshold (not eligible) |

---

## Step 1 — Enable Consultation + Configure Thresholds (Req 6, 7, 9)

1. Log in as **Admin**
2. Go to **Admin → Consultation → Settings** tab
3. Set:
   - **Minimum Credits Required**: `5`
   - **Max Eligible Participants (Top N)**: `3`
4. Toggle **Enable Consultation** → ON
5. Click **Save Settings**

**Expected:** Toast "Consultation settings saved"

---

## Step 2 — Award Credits (Req 4, 5)

1. Go to **Award Credits** tab
2. Select **Member A** from the dropdown
3. Enter credits: `10`, add an optional reason: `"Strong pitch"`
4. Click **Award Credits**

**Expected:**
- Toast "Credits awarded"
- Credit entry appears in the ledger below with: participant name, credits, timestamp, awarded-by (your name), reason

5. Repeat for **Member B** with only `2` credits (below threshold)

---

## Step 3 — View Rankings (Req 8, 9)

1. Go to **Rankings** tab

**Expected:**
- Member A: 10 credits → badge **Eligible** (rank 1, within top 3, above min 5)
- Member B: 2 credits → badge **Not Eligible** (below min credits of 5)

---

## Step 4 — Participant View: Not Eligible State (Req 2, 3)

1. Log in as **Member B**
2. Go to sidebar → **Consultation**

**Expected:**
- Card shows "Not Eligible Yet"
- Progress bar shows 2/5 credits
- No sessions or booking options visible (section locked)

---

## Step 5 — Participant View: Eligible State (Req 2, 3)

1. Log in as **Member A**
2. Go to **Consultation**

**Expected:**
- Card shows "You Are Eligible!" in green
- Credit total (10) and rank (1) displayed
- Available sessions list shown below (may be empty if no sessions created yet)

---

## Step 6 — Create a Session (Req 10)

1. Log in as **Admin**
2. Go to **Admin → Consultation → Sessions** tab
3. Fill in the form:
   - **Title**: `Business Model Review`
   - **Date & Time**: any future date
   - **Capacity**: `2`
   - **Meeting Link**: `https://meet.google.com/test-link`
   - **Notes**: optional
4. Click **Create Session**

**Expected:**
- Toast "Session created"
- Session appears with status `ACTIVE`, `0/2 booked`

---

## Step 7 — Book a Session (Req 10, 11, 12, 13, 14)

1. Log in as **Member A**
2. Go to **Consultation** → session list appears under eligible card
3. Click **Book** on the session

**Expected:**
- Toast "Booking confirmed!"
- Page transitions to **Booked** state:
  - Session title shown
  - Scheduled date shown
  - Status: **Pending**
- Email notification sent to Member A (if SMTP configured; otherwise logged to console)
- `platform_events` row created with `event_type = CONSULTATION_BOOKED` and `actor_id = Member A's ID`

### Test double-booking prevention (Req 12)

4. Try to book a **second** session while already booked

**Expected:** Error "You already have an active booking" (HTTP 409)

---

## Step 8 — Admin Manages Bookings (Req 11)

1. Log in as **Admin**
2. Go to **Sessions** tab → click chevron on the session
3. Booking row shows: Member A's name, status `PENDING`

### Confirm booking

4. Click the **green checkmark** to confirm

**Expected:**
- Status changes to `CONFIRMED`
- Email sent to Member A with meeting link (if SMTP configured)
- `platform_events` row: `event_type = CONSULTATION_CONFIRMED`
- Member A's Consultation page now shows **"Join Meeting"** button linking to `https://meet.google.com/test-link`

### Cancel booking

5. Click the **red X** to cancel

**Expected:**
- Status changes to `CANCELLED`
- `filledSlots` decremented (1/2 → 0/2)
- Member A's page reverts to ELIGIBLE state (can book again)
- `platform_events` row: `event_type = CONSULTATION_CANCELLED`

---

## Step 9 — Test Slot Deduction (Req 11)

1. Have 2 different eligible members book the same session (capacity = 2)
2. Try to have a 3rd member book

**Expected:** After 2 bookings: slot counter = `2/2`. 3rd booking returns "Session is full" (HTTP 409)

---

## Step 10 — Session Management (Admin)

In the Sessions list:
- **Complete** button → session status → `COMPLETED` (no longer bookable)
- **Cancel** button → session status → `CANCELLED` (no longer bookable)

Cancelled/completed sessions do NOT appear in the participant's available sessions list.

---

## Step 11 — Consultant Role Is Distinct (Req 1)

Verify via DB:

```sql
-- consultant_profiles table exists, separate from mentor_profiles
SELECT * FROM consultant_profiles LIMIT 5;
SELECT * FROM mentor_profiles LIMIT 5;
```

Both tables are independent. The CONSULTANT role is also listed in the `role_enum` DB type alongside MEMBER, MENTOR, JUDGE, etc.

---

## Audit Log Verification (Req 14)

```sql
SELECT event_type, actor_id, metadata, created_at
FROM platform_events
WHERE event_type LIKE 'CONSULTATION_%'
ORDER BY created_at DESC;
```

Expected rows after testing:
| event_type | actor_id | metadata |
|---|---|---|
| CONSULTATION_BOOKED | Member A's ID | `{ bookingId, sessionId }` |
| CONSULTATION_CONFIRMED | Admin's ID | `{ bookingId, sessionId, participantId }` |
| CONSULTATION_CANCELLED | Admin's ID | `{ bookingId, sessionId, participantId }` |

---

## Email Notifications (Req 13)

| Trigger | Recipient | Content |
|---|---|---|
| Member books session | Member | Session title, date, status = Pending |
| Admin confirms booking | Member | Session title, date, meeting link, status = Confirmed |
| Admin cancels booking | Member | Session title, cancellation notice |

If `RESEND_API_KEY` is not set → emails are printed to server console logs instead.

---

## Quick Checklist

- [ ] Admin can enable consultation and set min credits + top N cap
- [ ] Admin can award credits with full audit fields (participant, amount, reason, timestamp, awarded-by)
- [ ] Rankings tab shows participants sorted by credits with Eligible/Not Eligible badge
- [ ] Member below threshold sees locked "Not Eligible" card with progress bar
- [ ] Member above threshold + within top N sees "Eligible" card with session list
- [ ] Admin can create sessions with capacity and meeting link
- [ ] Eligible member can book a session (status → Pending)
- [ ] Double-booking is blocked (409)
- [ ] Full session blocks new bookings (409)
- [ ] Admin can confirm booking → participant sees "Confirmed" + Join Meeting link
- [ ] Admin can cancel booking → slot freed, participant reverts to Eligible
- [ ] Admin can mark session Completed or Cancelled
- [ ] Audit log records BOOKED / CONFIRMED / CANCELLED with correct actor_id
- [ ] consultant_profiles table is separate from mentor_profiles
