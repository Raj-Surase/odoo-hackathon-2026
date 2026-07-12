# Dashboard & Home Screen

> **Screen Reference:** Screen 2 — Dashboard / Home Screen  
> **Route / Endpoint:** `/dashboard`, `/api/dashboard`  
> **Affected Roles:** All (role-aware KPI display)

## Purpose

Provide every role a real-time operational snapshot with KPI cards, overdue return alerts, recent activity feed, and quick action buttons. The dashboard is the landing page after login and adapts its content based on the user's role.

## Requirements

### Requirement: KPI Cards
The system SHALL display real-time KPI cards showing key operational metrics.

#### Scenario: Dashboard load for Asset Manager
- **GIVEN** a logged-in Asset Manager
- **WHEN** they view the Dashboard
- **THEN** the following KPI cards are displayed:
  - **Assets Available** (e.g., 128)
  - **Assets Allocated** (e.g., 76)
  - **Under Maintenance** (e.g., 4)
  - **Active Bookings** (e.g., 9)
  - **Pending Transfers** (e.g., 3)
  - **Upcoming Returns** (e.g., 12)

#### Scenario: Dashboard load for Employee
- **GIVEN** a logged-in Employee
- **WHEN** they view the Dashboard
- **THEN** they see only KPIs relevant to their own assets and bookings

### Requirement: Overdue Return Alerts
The system SHALL highlight overdue returns separately from upcoming returns.

#### Scenario: Assets past expected return date
- **GIVEN** 3 assets have passed their Expected Return Date
- **WHEN** the Dashboard loads
- **THEN** a prominent alert reads "3 assets overdue for return - flagged for follow-up"
- **AND** overdue items are visually distinguished (red/warning style)

### Requirement: Quick Actions
The system SHALL provide contextual quick action buttons based on role.

#### Scenario: Quick actions for Asset Manager
- **WHEN** an Asset Manager views the Dashboard
- **THEN** quick action buttons include:
  - "+ Register Asset" (links to Screen 4)
  - "Book Resource" (links to Screen 6)
  - "Raise Request" (links to Screen 7)

### Requirement: Recent Activity Feed
The system SHALL display a chronological feed of recent actions.

#### Scenario: Activity items displayed
- **WHEN** the Dashboard loads
- **THEN** recent activities show entries like:
  - "Laptop AF-0114 - allocated to Priya Shah - IT dept"
  - "Room B2 - booking confirmed - 2:00 to 3:00 PM"
  - "Projector AF-0062 - maintenance resolved"

## UI Layout (from Wireframe — Screen 2)

```
┌────────────────────────────────────────────────────────┐
│  AssetFlow                                              │
├────────────┬───────────────────────────────────────────┤
│ Dashboard  │  Today's Overview                          │
│ Org setup  │                                            │
│ Assets     │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ Allocation │  │Available │ │Allocated │ │  Under   │  │
│ Booking    │  │   128    │ │    76    │ │ Maint: 4 │  │
│ Maintenanc │  └──────────┘ └──────────┘ └──────────┘  │
│ Audit      │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ Reports    │  │Active    │ │Pending   │ │Upcoming  │  │
│ Notificati │  │Bookings:9│ │Transf: 3 │ │Returns:12│  │
│            │  └──────────┘ └──────────┘ └──────────┘  │
│            │                                            │
│            │  ⚠ 3 assets overdue for return             │
│            │                                            │
│            │  [+ Register Asset] [Book Resource]        │
│            │  [Raise Request]                           │
│            │                                            │
│            │  Recent Activity                           │
│            │  • Laptop AF-0114 - allocated to Priya...  │
│            │  • Room B2 - booking confirmed 2-3 PM      │
│            │  • Projector AF-0062 - maintenance resolved│
└────────────┴───────────────────────────────────────────┘
```

## Navigation Sidebar (All Screens)

The left sidebar is consistent across all screens with the following menu items:
1. Dashboard
2. Organization Setup (Admin only)
3. Assets
4. Allocation & Transfer
5. Resource Booking
6. Maintenance
7. Audit
8. Reports
9. Notifications
