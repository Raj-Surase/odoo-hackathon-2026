# Resource Booking

> **Screen Reference:** Screen 6 — Resource Booking  
> **Route / Endpoint:** `/bookings`, `/api/bookings`  
> **Affected Roles:** Employee (book), Department Head (book on behalf of dept), Asset Manager (manage)

## Purpose

Time-slot booking of shared resources (rooms, vehicles, equipment) with zero overlaps. Provides a calendar view of existing bookings with real-time overlap validation that blocks conflicting requests automatically.

## Requirements

### Requirement: Calendar View
The system SHALL display a visual calendar overview of a resource's existing bookings.

#### Scenario: View resource calendar
- **GIVEN** resource "Conference Room B2" on "Tue, 7 Jul"
- **WHEN** the booking screen loads
- **THEN** a time-slot calendar shows:
  - 9:00 — "Booked - Procurement Team - 9 to 10" (highlighted)
  - 10:00 — open
  - 11:00 — open
  - 12:00 — open
  - 1:00 — open

### Requirement: Overlap Validation
The system SHALL block overlapping bookings with zero tolerance.

#### Scenario: Overlapping booking rejected
- **GIVEN** Room B2 is booked 9:00–10:00
- **WHEN** a user requests 9:30–10:30
- **THEN** the system rejects with "Requested 9:30 to 10:30 - conflict - slot is unavailable"

#### Scenario: Adjacent booking approved
- **GIVEN** Room B2 is booked 9:00–10:00
- **WHEN** a user requests 10:00–11:00
- **THEN** the booking is approved (end time = next start time is allowed)

### Requirement: Booking Status Lifecycle
The system SHALL track booking status through its lifecycle.

#### Scenario: Booking statuses
- **THEN** bookings flow through: `Upcoming` → `Ongoing` → `Completed`
- **AND** a booking can be `Cancelled` at any time before it starts

### Requirement: Booking Management
The system SHALL support cancellation, rescheduling, and reminders.

#### Scenario: Cancel a booking
- **GIVEN** an upcoming booking
- **WHEN** the user cancels it
- **THEN** the time slot is freed and status changes to `Cancelled`

#### Scenario: Booking reminder
- **GIVEN** a booking starting in 15 minutes
- **THEN** the system sends a reminder notification to the booker

### Requirement: Resource Selection
The system SHALL allow users to select from shared/bookable resources.

#### Scenario: Only bookable assets shown
- **WHEN** the Resource Booking screen loads
- **THEN** only assets with `is_bookable = True` appear in the resource dropdown

## UI Layout (from Wireframe — Screen 6)

```
┌────────────────────────────────────────────────────────┐
│  AssetFlow                                              │
├────────────┬───────────────────────────────────────────┤
│ Dashboard  │  Resource: Conference Room B2              │
│ Org setup  │  Date: Tue, 7 Jul                         │
│ Assets     │                                            │
│ Allocation │  9:00  │ Booked - Procurement Team 9-10   │
│ Booking*   │  10:00 │                                  │
│ Maintenanc │  11:00 │ ⚠ Requested 9:30-10:30 conflict │
│ Audit      │  12:00 │                                  │
│ Reports    │  1:00  │                                  │
│ Notificati │                                            │
│            │  [Book a slot]                             │
└────────────┴───────────────────────────────────────────┘
```

## Data Model (Key Fields)

### Resource Booking (Table: `bookings`)
| Field            | Type        | Constraints                             |
|------------------|-------------|-----------------------------------------|
| resource_id      | foreign_key | → Asset (where is_bookable = true)      |
| user_id          | foreign_key | → User (required)                       |
| department_id    | foreign_key | → Department (nullable, for dept booking)|
| start_datetime   | datetime    | Required                                |
| end_datetime     | datetime    | Required, must be > start_datetime      |
| purpose          | text        | Optional description                    |
| status           | string/enum | Upcoming / Ongoing / Completed / Cancelled |

## Validation Rules

| Rule                          | Error Message                                    |
|-------------------------------|--------------------------------------------------|
| Overlap detected              | "Conflict - slot is unavailable"                 |
| End before start              | "End time must be after start time"              |
| Booking in the past           | "Cannot book a time slot in the past"            |
| Resource not bookable         | "This asset is not available for booking"         |

## Overlap Detection Algorithm

```
CONFLICT exists when:
  existing.resource_id == new.resource_id
  AND existing.status NOT IN ('Cancelled')
  AND existing.start_datetime < new.end_datetime
  AND existing.end_datetime > new.start_datetime
```
