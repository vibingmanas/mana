# Plan 04 — Appointment Booking (Test Drives & Visits)

## Goal
Let buyers book test drives or dealer visits for a specific car, and let dealers manage their availability and confirm/reschedule — converting online interest into in-person, high-conversion meetings. Support both **at-dealer** and **doorstep/home** test drives.

## User stories
- As a **buyer**, I want to pick a slot to test drive a specific car so I don't waste a trip.
- As a **buyer**, I want a doorstep test drive option so I don't have to visit a scattered dealer lot.
- As a **dealer**, I want to set my availability and get notified of bookings so I can prepare the car.
- As a **dealer**, I want to confirm, reschedule, or mark no-show so my calendar stays clean.
- As **admin/ops**, I want booking analytics (book→show→sale) to measure funnel health.

## Scope
**In:** Dealer availability config, slot generation, buyer booking flow, doorstep vs at-dealer, confirmations & reminders (WhatsApp/SMS/push), reschedule/cancel/no-show, calendar views, booking→lead linkage, post-visit feedback.
**Out:** The lead model (see [03](./03-customer-buyer.md)); CRM pipeline (see [05](./05-inventory-management.md)); payments for paid test drives (optional, via [12](./12-monetization.md)).

## Data model
```
DealerAvailability
  id, dealer_id, weekday, start_time, end_time, slot_minutes
  doorstep_enabled(bool), doorstep_radius_km, blackout_dates(json)

Appointment
  id, vehicle_id, dealer_id, buyer_id, lead_id
  type (at_dealer|doorstep)
  scheduled_start, scheduled_end, location(json/geo for doorstep)
  status (requested|confirmed|rescheduled|completed|no_show|cancelled)
  reminder_sent_at[], created_at, updated_at

AppointmentFeedback
  id, appointment_id, by (buyer|dealer)
  showed(bool), outcome (interested|negotiating|not_interested|sold)
  rating, notes
```

## API / endpoints
```
GET  /dealers/:id/availability               -> open slots for a vehicle/date range
PUT  /dealer/availability                     -> dealer sets weekly availability/blackouts
POST /appointments                            -> buyer requests slot (creates/links Lead)
POST /appointments/:id/confirm                -> dealer confirms
POST /appointments/:id/reschedule
POST /appointments/:id/cancel
POST /appointments/:id/complete               -> mark showed + outcome
GET  /buyer/appointments  /  /dealer/appointments
```

## UI / screens
**Buyer:** "Book test drive" on listing → choose **at-dealer** or **doorstep** → pick date/slot from real availability → confirm with OTP → confirmation screen + calendar add + WhatsApp confirmation. Manage/reschedule in "My activity."
**Dealer:** availability settings (weekly grid, doorstep toggle + radius), incoming requests with accept/reschedule, day/week calendar, prep checklist, mark show/no-show + outcome.

## Integrations
- **Notifications:** WhatsApp Business API (primary), DLT SMS fallback, push. Reminders at T-24h and T-2h.
- **Maps/geo** for doorstep location & routing; **calendar** (.ics) export.

## Edge cases & failure modes
- **Double booking** same car/slot → atomic slot locking (DB transaction / Redis lock).
- **Doorstep outside radius** → block or offer at-dealer alternative.
- **Buyer no-show** → mark, optional cooldown/limit on repeat no-shows.
- **Dealer doesn't confirm** in X hours → auto-nudge, escalate, or auto-expire.
- **Car sold/reserved** before the appointment → notify buyer, suggest alternatives.
- **Timezone/locale** — all IST; clear AM/PM in vernacular.
- **Reschedule loops** — cap reschedules.

## Acceptance criteria
- A buyer can book a real, non-conflicting slot for a specific car in under a minute.
- Doorstep bookings respect the dealer's radius and capture a valid location.
- Confirmations and T-24h/T-2h reminders are sent on the buyer's opted-in channel.
- No two confirmed appointments can occupy the same dealer slot for the same car.
- Booking creates/links a Lead and surfaces outcome data into dealer CRM + ops analytics.

## Dependencies
[03](./03-customer-buyer.md) (buyer + leads), [05](./05-inventory-management.md) (dealer CRM/calendar), [02](./02-car-registration-listing.md) (vehicle status), notifications infra ([11](./11-architecture-tech-stack.md)).
