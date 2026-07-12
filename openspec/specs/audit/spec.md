# Asset Audit

> **Screen Reference:** Screen 8 — Asset Audit  
> **Route / Endpoint:** `/audits`, `/api/audits`  
> **Affected Roles:** Admin (create cycles), Asset Manager (assign auditors, close), Auditors (verify)

## Purpose

Run structured audit verification cycles instead of ad-hoc checks. Admin creates audit cycles scoped to departments/locations, assigns auditors, and the auditors verify each asset as Verified, Missing, or Damaged. The system auto-generates discrepancy reports for flagged items. Closing the cycle locks it and updates affected asset statuses.

## Requirements

### Requirement: Create Audit Cycle
The system SHALL allow Admin to define audit cycles with scope and date range.

#### Scenario: Create audit cycle
- **GIVEN** an Admin on the Audit screen
- **WHEN** they create an audit cycle:
  - Name: "Q3 Audit: Engineering Dept"
  - Scope: Engineering Department
  - Date Range: 1-15 Jul
- **THEN** the cycle is created in `Open` status

### Requirement: Assign Auditors
The system SHALL allow assigning one or more auditors to a cycle.

#### Scenario: Assign auditors
- **GIVEN** audit cycle "Q3 Audit: Engineering Dept"
- **WHEN** auditors "A. Rao" and "S. Iqbal" are assigned
- **THEN** they can access the audit checklist and verify assets

### Requirement: Asset Verification Checklist
The system SHALL present a checklist of assets for auditors to verify.

#### Scenario: Verification checklist
- **WHEN** an auditor opens the audit cycle
- **THEN** a table shows columns: Asset | Expected Location | Verification
- **AND** example rows:
  - AF-003 Dell Laptop | Desk E12 | ✓ Verified
  - AF-9921 Office Chair | Desk E14 | ✗ Missing
  - AF-9838 Monitor | Desk E15 | ⚠ Damaged

#### Scenario: Mark asset as verified
- **WHEN** auditor marks AF-003 as "Verified"
- **THEN** the asset passes the audit check

#### Scenario: Mark asset as missing
- **WHEN** auditor marks AF-9921 as "Missing"
- **THEN** the asset is flagged for discrepancy report

#### Scenario: Mark asset as damaged
- **WHEN** auditor marks AF-9838 as "Damaged"
- **THEN** the asset is flagged for discrepancy report with condition note

### Requirement: Auto-Generated Discrepancy Report
The system SHALL auto-generate a discrepancy report for flagged items.

#### Scenario: Discrepancy report generated
- **GIVEN** 2 assets flagged (1 Missing, 1 Damaged) during the cycle
- **THEN** the system displays "2 assets flagged - discrepancy report generated automatically"
- **AND** the report lists each flagged asset with its status and location

### Requirement: Close Audit Cycle
The system SHALL allow closing the audit cycle, which locks it and updates asset statuses.

#### Scenario: Close cycle
- **GIVEN** all assets in the cycle have been verified/flagged
- **WHEN** the Admin/Manager clicks "Close Audit Cycle"
- **THEN** the cycle is locked (no further changes allowed)
- **AND** confirmed-missing assets have their status changed to `Lost`
- **AND** confirmed-damaged assets have their condition updated

### Requirement: Audit History
The system SHALL save audit results per cycle.

#### Scenario: View past audit
- **WHEN** viewing audit history
- **THEN** past cycles with their discrepancy reports are accessible

## UI Layout (from Wireframe — Screen 8)

```
┌────────────────────────────────────────────────────────┐
│  AssetFlow                                              │
├────────────┬───────────────────────────────────────────┤
│ Dashboard  │  Q3 Audit: Engineering Dept - 1-15 Jul    │
│ Org setup  │  Auditors: A. Rao, S. Iqbal               │
│ Assets     │                                            │
│ Allocation │  Asset             │ Expected   │ Verify  │
│ Booking    │  ────────────────  │ Location   │ ─────── │
│ Maintenanc │  AF-003 Dell Laptop│ Desk E12   │✓Verified│
│ Audit*     │  AF-9921 Office Chr│ Desk E14   │✗Missing │
│ Reports    │  AF-9838 Monitor   │ Desk E15   │⚠Damaged │
│ Notificati │                                            │
│            │  ⚠ 2 assets flagged - discrepancy report  │
│            │    generated automatically                 │
│            │                                            │
│            │  [Close Audit Cycle]                       │
└────────────┴───────────────────────────────────────────┘
```

## Data Model (Key Fields)

### Audit Cycle (Table: `audit_cycles`)
| Field            | Type        | Constraints                             |
|------------------|-------------|-----------------------------------------|
| name             | string      | Required                                |
| department_id    | foreign_key | → Department (scope, nullable)          |
| location         | string      | Optional location scope                 |
| start_date       | date        | Required                                |
| end_date         | date        | Required, must be > start_date          |
| auditor_ids      | many-to-many| → User (pivot table: `audit_cycle_auditor`) |
| status           | string/enum | Open / In Progress / Closed             |
| is_locked        | boolean     | Set to true on close                    |

### Audit Line (Table: `audit_lines` - per asset in cycle)
| Field            | Type        | Constraints                             |
|------------------|-------------|-----------------------------------------|
| audit_cycle_id   | foreign_key | → Audit Cycle                           |
| asset_id         | foreign_key | → Asset                                 |
| expected_location| string      | Pre-filled from asset.location          |
| verification     | string/enum | Verified / Missing / Damaged            |
| notes            | text        | Optional notes from auditor             |
| audited_by       | foreign_key | → User (nullable, auditor who verified) |

### Discrepancy Report (Table: `discrepancy_reports`)
| Field            | Type        | Constraints                             |
|------------------|-------------|-----------------------------------------|
| audit_cycle_id   | foreign_key | → Audit Cycle                           |
| flagged_lines    | has-many    | → Audit Lines where verification ≠ Verified |
| generated_date   | datetime    | Auto-set                                |

## Business Rules

| Rule                              | Enforcement                              |
|-----------------------------------|------------------------------------------|
| Closing locks the cycle           | is_locked = True, no further edits       |
| Missing → asset status = Lost     | On close, update flagged assets          |
| Damaged → condition updated       | On close, update asset condition field   |
| Report auto-generated             | Triggered when any line ≠ Verified       |
