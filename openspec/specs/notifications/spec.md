# Activity Logs & Notifications

> **Screen Reference:** Screen 10 — Activity Logs & Notifications  
> **Route / Endpoint:** `/notifications`, `/api/notifications`, `/api/audit_logs`  
> **Affected Roles:** All (role-filtered notifications)

## Purpose

Keep every role informed without digging for updates. Provides filterable notification alerts for all key events and a complete system-wide audit log of admin, manager, and employee actions.

## Requirements

### Requirement: Notification Alerts
The system SHALL deliver real-time notifications for key events.

#### Scenario: Notification types and examples
- **THEN** the following notification types are supported:
  - **Asset Assigned**: "Laptop AF-0014 assigned to Priya Shah" (2m ago)
  - **Maintenance Approved**: "Maintenance request AF-0055 approved" (18m ago)
  - **Booking Confirmed**: "Booking confirmed: Room B2: 2:00 to 3:00 PM" (1h ago)
  - **Transfer Approved**: "Transfer approved: AF-0033 to Facilities dept" (3h ago)
  - **Overdue Return**: "Overdue return: AF-0021 was due 3 days ago" (1d ago)
  - **Audit Discrepancy**: "Audit discrepancy flagged: AF-0088 damaged" (2d ago)
  - **Booking Reminder**: Sent before slot starts
  - **Booking Cancelled**: When a booking is cancelled
  - **Maintenance Rejected**: When a request is rejected

### Requirement: Notification Filtering
The system SHALL allow filtering notifications by category.

#### Scenario: Filter tabs
- **WHEN** viewing the Notifications screen
- **THEN** filter tabs include: All | Alerts | Approvals | Bookings
- **AND** selecting a tab filters the list accordingly

### Requirement: Notification Timestamps
The system SHALL display relative timestamps for each notification.

#### Scenario: Relative time display
- **THEN** notifications show relative times: "2m ago", "18m ago", "1h ago", "3h ago", "1d ago", "2d ago"

### Requirement: System-Wide Audit Log
The system SHALL maintain a complete audit log of all admin, manager, and employee actions.

#### Scenario: Audit log entries
- **THEN** the log records: who did what, when, and what changed
- **AND** log entries are immutable (cannot be edited or deleted)

## UI Layout (from Wireframe — Screen 10)

```
┌────────────────────────────────────────────────────────┐
│  AssetFlow                                              │
├────────────┬───────────────────────────────────────────┤
│ Dashboard  │  [All] [Alerts] [Approvals] [Bookings]    │
│ Org setup  │                                            │
│ Assets     │  Laptop AF-0014 assigned to          2m ago│
│ Allocation │    Priya Shah                              │
│ Booking    │                                            │
│ Maintenanc │  Maintenance request AF-0055        18m ago│
│ Audit      │    approved                                │
│ Reports    │                                            │
│ Notificati*│  Booking confirmed: Room B2          1h ago│
│            │    2:00 to 3:00 PM                        │
│            │                                            │
│            │  Transfer approved: AF-0033          3h ago│
│            │    to Facilities dept                      │
│            │                                            │
│            │  Overdue return: AF-0021             1d ago│
│            │    was due 3 days ago                      │
│            │                                            │
│            │  Audit discrepancy flagged:          2d ago│
│            │    AF-0088 damaged                         │
└────────────┴───────────────────────────────────────────┘
```

## Data Model (Key Fields)

### Notification (Table: `notifications`)
| Field            | Type        | Constraints                             |
|------------------|-------------|-----------------------------------------|
| recipient_id     | foreign_key | → User (who receives)                   |
| type             | string/enum | asset_assigned / maintenance_approved / maintenance_rejected / booking_confirmed / booking_cancelled / booking_reminder / transfer_approved / overdue_return / audit_discrepancy |
| title            | string      | Short summary                           |
| message          | text        | Full notification text                  |
| is_read          | boolean     | Default false                           |
| created_at       | datetime    | Auto-set                                |
| reference_type   | string      | Model name of related record (polymorphic) |
| reference_id     | integer     | ID of related record (polymorphic)      |

### Audit Log Entry (Table: `audit_logs`)
| Field            | Type        | Constraints                             |
|------------------|-------------|-----------------------------------------|
| user_id          | foreign_key | → User (who acted)                      |
| action           | string      | Description of action                   |
| model            | string      | Affected model name                     |
| record_id        | integer     | Affected record ID                      |
| old_values       | json        | JSON of previous values                 |
| new_values       | json        | JSON of new values                      |
| timestamp        | datetime    | Auto-set, immutable                     |
