# Reports & Analytics

> **Screen Reference:** Screen 9 — Reports & Analytics  
> **Route / Endpoint:** `/reports`, `/api/reports`  
> **Affected Roles:** Admin (full), Asset Manager (full), Department Head (department-scoped)

## Purpose

Give managers actionable operational insights through utilization trends, maintenance frequency, most-used/idle assets, booking heatmaps, and retirement alerts. All reports are exportable.

## Requirements

### Requirement: Utilization by Department
The system SHALL display asset utilization metrics grouped by department.

#### Scenario: Department utilization chart
- **WHEN** the Reports screen loads
- **THEN** a "Utilization by Department" chart shows allocation rates per department

### Requirement: Maintenance Frequency
The system SHALL show maintenance frequency by asset and category.

#### Scenario: Maintenance frequency report
- **WHEN** viewing maintenance frequency
- **THEN** charts show which assets/categories require the most maintenance

### Requirement: Most-Used vs Idle Assets
The system SHALL identify the most-used and idle assets.

#### Scenario: Most-used assets
- **WHEN** viewing the "Most Used Assets" section
- **THEN** entries show:
  - "Room B2: 34 bookings this month"
  - "Van AF-343: 21 trips this month"
  - "Projector AF-335: 18 uses"

#### Scenario: Idle assets
- **WHEN** viewing the "Idle Assets" section
- **THEN** entries show:
  - "Camera AF-0301: unused 60+ days"
  - "Chair AF-0410: unused 45 days"

### Requirement: Assets Due for Maintenance / Nearing Retirement
The system SHALL flag assets approaching maintenance schedules or retirement age.

#### Scenario: Maintenance/retirement alerts
- **WHEN** viewing the alerts section
- **THEN** entries show:
  - "Forklift AF-0087: service due in 5 days"
  - "Laptop AF-0020: 4 years old - nearing retirement"

### Requirement: Resource Booking Heatmap
The system SHALL display a booking heatmap showing peak usage windows.

#### Scenario: Heatmap display
- **WHEN** viewing the booking heatmap
- **THEN** a visual grid shows booking density by hour/day for shared resources

### Requirement: Department-wise Allocation Summary
The system SHALL show allocation summaries grouped by department.

### Requirement: Export Reports
The system SHALL allow exporting reports.

#### Scenario: Export
- **WHEN** a manager clicks "Export Report"
- **THEN** the current report is downloadable as PDF/CSV

## UI Layout (from Wireframe — Screen 9)

```
┌────────────────────────────────────────────────────────┐
│  AssetFlow                                              │
├────────────┬───────────────────────────────────────────┤
│ Dashboard  │  [Utilization by Dept] [Maint. Frequency] │
│ Org setup  │                                            │
│ Assets     │  Most Used Assets    │ Idle Assets         │
│ Allocation │  ─────────────────── │ ──────────────────  │
│ Booking    │  Room B2: 34 booking │ Camera AF-0301:     │
│ Maintenanc │  Van AF-343: 21 trip │   unused 60+ days   │
│ Audit      │  Projector AF-335:   │ Chair AF-0410:      │
│ Reports*   │    18 uses           │   unused 45 days    │
│ Notificati │                                            │
│            │  Assets due for maintenance / retirement   │
│            │  Forklift AF-0087: service due in 5 days   │
│            │  Laptop AF-0020: 4 yrs - nearing retire    │
│            │                                            │
│            │  [Export Report]                           │
└────────────┴───────────────────────────────────────────┘
```
