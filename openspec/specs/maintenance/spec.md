# Maintenance Management

> **Screen Reference:** Screen 7 — Maintenance Management  
> **Route / Endpoint:** `/maintenance`, `/api/maintenance`  
> **Affected Roles:** Employee (raise request), Asset Manager (approve/reject), Technician (resolve)

## Purpose

Route repairs through an approval workflow before work starts. Maintenance requests follow a structured pipeline displayed as a kanban board: Pending → Approved → Technician Assigned → In Progress → Resolved. Approving a request auto-updates the asset to `Under Maintenance`; resolving returns it to `Available`.

## Requirements

### Requirement: Raise Maintenance Request
The system SHALL allow any asset holder to raise a maintenance request.

#### Scenario: Employee raises a request
- **GIVEN** an Employee holding asset AF-0062 (Projector)
- **WHEN** they submit a maintenance request with:
  - Asset: AF-0062
  - Issue: "Projector bulb not turning on"
  - Priority: High
  - Photo: (optional attachment)
- **THEN** a maintenance request is created in `Pending` status
- **AND** the Asset Manager is notified

### Requirement: Approval Workflow
The system SHALL enforce a structured approval workflow before repair work begins.

#### Scenario: Workflow stages as kanban
- **THEN** the Maintenance screen displays a kanban board with columns:
  - **Pending** — e.g., "AF-0062 | Projector bulb | not turning on"
  - **Approved** — e.g., "AF-003 | AC unit | noisy compressor"
  - **Technician Assigned** — e.g., "AF-0078 | Forklift | tech: R. Varma"
  - **In Progress** — e.g., "AF-897 | Printer Jam | parts ordered"
  - **Resolved** — e.g., "AF-873 | Chair repair | resolved 7 Jul"

#### Scenario: Approve a request
- **GIVEN** a pending maintenance request for AF-0062
- **WHEN** the Asset Manager approves it
- **THEN** the request moves to `Approved`
- **AND** the asset status auto-updates to `Under Maintenance`

#### Scenario: Reject a request
- **GIVEN** a pending maintenance request
- **WHEN** the Asset Manager rejects it
- **THEN** the request moves to `Rejected`
- **AND** the asset status remains unchanged
- **AND** the requester is notified with the rejection reason

### Requirement: Technician Assignment
The system SHALL allow assigning a technician after approval.

#### Scenario: Assign technician
- **GIVEN** an approved maintenance request
- **WHEN** a technician "R. Varma" is assigned
- **THEN** the request moves to `Technician Assigned`

### Requirement: Resolution & Lifecycle Sync
The system SHALL sync asset status with maintenance resolution.

#### Scenario: Resolve maintenance
- **GIVEN** an in-progress maintenance request for AF-873
- **WHEN** it is marked as Resolved
- **THEN** the asset status reverts to `Available`
- **AND** the resolution date and notes are recorded
- **AND** maintenance history is added to the asset's record

### Requirement: Maintenance History
The system SHALL retain maintenance history per asset.

#### Scenario: View maintenance history
- **WHEN** viewing asset AF-0062's history
- **THEN** all past maintenance requests (dates, issues, resolutions) are listed

## UI Layout (from Wireframe — Screen 7)

```
┌────────────────────────────────────────────────────────────────────┐
│  AssetFlow                                                          │
├────────────┬───────────────────────────────────────────────────────┤
│ Dashboard  │  Kanban Board                                         │
│ Org setup  │                                                       │
│ Assets     │  Pending    │ Approved    │ Tech Assign │ In Progress │ Resolved │
│ Allocation │  ─────────  │ ──────────  │ ──────────  │ ─────────── │ ──────── │
│ Booking    │ ┌─────────┐│┌──────────┐ │┌──────────┐ │┌───────────┐│┌────────┐│
│ Maintenanc*│ │AF-0062  ││ │AF-003    │ ││AF-0078   │ ││AF-897     │││AF-873  ││
│ Audit      │ │Projector││ │AC unit   │ ││Forklift  │ ││Printer Jam│││Chair   ││
│ Reports    │ │bulb not ││ │noisy     │ ││tech:     │ ││parts      │││repair  ││
│ Notificati │ │turning on│││compressor│ ││R. Varma  │ ││ordered    │││resolved││
│            │ └─────────┘│└──────────┘ │└──────────┘ │└───────────┘││7 Jul   ││
│            │            │             │             │             │└────────┘│
│            │                                                       │
│            │  Note: Approving moves asset to Under Maintenance     │
│            │        Resolving returns it to Available               │
└────────────┴───────────────────────────────────────────────────────┘
```

## Data Model (Key Fields)

### Maintenance Request (Table: `maintenance_requests`)
| Field            | Type        | Constraints                             |
|------------------|-------------|-----------------------------------------|
| asset_id         | foreign_key | → Asset (required)                      |
| user_id          | foreign_key | → User (auto-set to current logged-in user) |
| issue_description| text        | Required                                |
| priority         | string/enum | Low / Medium / High / Critical          |
| photo_path       | string      | Optional file path to stored image      |
| technician_id    | foreign_key | → User (nullable, assigned after approval) |
| status           | string/enum | Pending / Approved / Rejected / Technician Assigned / In Progress / Resolved |
| approved_by      | foreign_key | → User (nullable, Asset Manager who approved) |
| resolution_notes | text        | Filled on resolution                    |
| resolution_date  | datetime    | Set on resolution                       |

## State Machine

```
Pending ──→ Approved ──→ Technician Assigned ──→ In Progress ──→ Resolved
   │
   └──→ Rejected (terminal)
```

### Lifecycle Sync Rules

| Maintenance Event    | Asset Status Change            |
|---------------------|--------------------------------|
| Request approved    | Asset → `Under Maintenance`    |
| Request rejected    | No change                      |
| Request resolved    | Asset → `Available`            |
