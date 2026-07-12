# Asset Allocation & Transfer

> **Screen Reference:** Screen 5 — Asset Allocation & Transfer  
> **Route / Endpoint:** `/allocations`, `/api/allocations`, `/api/asset_transfers`  
> **Affected Roles:** Asset Manager (allocate/approve), Department Head (approve dept), Employee (request transfer/return)

## Purpose

Manage who holds what asset, with strict conflict rules preventing double-allocation. When an asset is already allocated, the system blocks re-allocation and offers a Transfer Request workflow instead. Supports return flows with condition check-in notes and overdue flagging.

## Requirements

### Requirement: Asset Allocation
The system SHALL allow Asset Managers to allocate available assets to employees or departments with an optional Expected Return Date.

#### Scenario: Successful allocation
- **GIVEN** Asset AF-0201 (Office Chair) with status `Available`
- **WHEN** Asset Manager allocates it to "Raj Kumar" in "Engineering" with Expected Return Date "2024-08-15"
- **THEN** the asset status changes to `Allocated`
- **AND** the holder is set to Raj Kumar
- **AND** an allocation history entry is created

### Requirement: Double-Allocation Block
The system SHALL block allocation of an already-allocated asset and suggest a transfer request instead.

#### Scenario: Attempt to allocate an already-allocated asset
- **GIVEN** Asset AF-0114 (Dell Laptop) is currently allocated to "Priya Shah" (Engineering)
- **WHEN** "Raj Kumar" tries to allocate AF-0114 to himself
- **THEN** the system BLOCKS the allocation
- **AND** displays: "Already Allocated to Priya Shah (Engineering)"
- **AND** displays: "Direct re-allocation is blocked - submit a transfer request below"
- **AND** offers a "Transfer Request" button

### Requirement: Transfer Workflow
The system SHALL route transfers through an approval workflow.

#### Scenario: Transfer request flow
- **GIVEN** an asset allocated to Priya Shah
- **WHEN** a transfer is requested:
  - From: Priya Shah
  - To: Select Employee....
  - Reason: [freetext]
- **THEN** the transfer enters `Requested` state
- **AND** follows: `Requested` → `Approved` (by Asset Manager or Department Head) → `Re-allocated`
- **AND** history is updated automatically with the transfer record

### Requirement: Return Flow
The system SHALL allow assets to be returned with condition check-in notes.

#### Scenario: Asset returned
- **GIVEN** an allocated asset
- **WHEN** the holder initiates a return
- **THEN** the Asset Manager captures condition check-in notes
- **AND** the asset status reverts to `Available`
- **AND** the holder is cleared

### Requirement: Overdue Return Flags
The system SHALL auto-flag allocations past the Expected Return Date.

#### Scenario: Overdue detection
- **GIVEN** an asset allocated with Expected Return Date "2024-07-01" and today is "2024-07-04"
- **THEN** the allocation is auto-flagged as "Overdue"
- **AND** it feeds the Dashboard overdue alerts and Notifications

### Requirement: Allocation History
The system SHALL maintain a per-asset allocation history timeline.

#### Scenario: History display
- **WHEN** viewing allocation history for AF-0114
- **THEN** entries show:
  - "Mar 12 - Allocated to Priya Shah - Engineering"
  - "Jan 04 - Returned by Arjun Nair - condition: good"

## UI Layout (from Wireframe — Screen 5)

```
┌────────────────────────────────────────────────────────┐
│  AssetFlow                                              │
├────────────┬───────────────────────────────────────────┤
│ Dashboard  │  Asset                                     │
│ Org setup  │  AF-0114 - Dell Laptop                     │
│ Assets     │                                            │
│ Allocation*│  ⚠ Already Allocated to Priya Shah        │
│ Booking    │    (Engineering)                           │
│ Maintenanc │  Direct re-allocation is blocked -         │
│ Audit      │  submit a transfer request below           │
│ Reports    │                                            │
│ Notificati │  ── Transfer Request ──                    │
│            │  From: Priya Shah                          │
│            │  To:   [Select Employee....]               │
│            │                                            │
│            │  Reason:                                   │
│            │  ┌──────────────────────────────┐          │
│            │  │                              │          │
│            │  └──────────────────────────────┘          │
│            │                                            │
│            │  [Submit Request]                          │
│            │                                            │
│            │  ── Allocation History ──                  │
│            │  Mar 12 - Allocated to Priya Shah - Eng    │
│            │  Jan 04 - Returned by Arjun Nair - good    │
└────────────┴───────────────────────────────────────────┘
```

## Data Model (Key Fields)

### Allocation (Table: `allocations`)
| Field              | Type        | Constraints                         |
|--------------------|-------------|-------------------------------------|
| asset_id           | foreign_key | → Asset (required)                  |
| user_id            | foreign_key | → User (holder)                     |
| department_id      | foreign_key | → Department (nullable)             |
| allocated_date     | datetime    | Auto-set on allocation              |
| expected_return    | date        | Optional                            |
| actual_return      | datetime    | Set on return                       |
| condition_notes    | text        | Captured on return                  |
| is_overdue         | boolean     | Computed: expected_return < today    |
| status             | string/enum | Active / Returned / Overdue         |

### Transfer Request (Table: `asset_transfers`)
| Field              | Type        | Constraints                         |
|--------------------|-------------|-------------------------------------|
| asset_id           | foreign_key | → Asset (required)                  |
| from_user_id       | foreign_key | → User (current holder)             |
| to_user_id         | foreign_key | → User (target)                     |
| reason             | text        | Required                            |
| status             | string/enum | Requested / Approved / Rejected / Re-allocated |
| approved_by        | foreign_key | → User (manager who approved, nullable) |

## Business Rules

| Rule                           | Enforcement                                |
|--------------------------------|--------------------------------------------|
| Double-allocation blocked      | Check asset.status != 'Allocated' before allocate |
| Transfer requires approval     | Status flows through Requested → Approved  |
| Overdue auto-flag              | Scheduled cron checks expected_return daily |
| Return resets status           | asset.status = 'Available', holder = null  |
