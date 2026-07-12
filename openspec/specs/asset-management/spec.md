# Asset Registration & Directory

> **Screen Reference:** Screen 4 — Asset Registration & Directory  
> **Route / Endpoint:** `/assets`, `/api/assets`  
> **Affected Roles:** Asset Manager (register), All (search/view)

## Purpose

Register new assets into the system and provide a centralized, searchable directory for tracking all assets. Each asset enters the system as `Available` and follows a structured lifecycle. Assets can be marked as "shared/bookable" to enable time-slot booking (Screen 6).

## Requirements

### Requirement: Asset Registration
The system SHALL allow Asset Managers to register new assets with comprehensive metadata.

#### Scenario: Register a new asset
- **GIVEN** an Asset Manager on the Asset Registration screen
- **WHEN** they fill in:
  - Name: "Dell Laptop"
  - Category: "Electronics" (from Screen 3 categories)
  - Asset Tag: auto-generated as "AF-0012"
  - Serial Number: "SN-DL-2024-0012"
  - Acquisition Date: "2024-01-15"
  - Acquisition Cost: "₹85,000" (for reporting only, NOT linked to accounting)
  - Condition: "New"
  - Location: "Bengaluru"
  - Shared/Bookable: No
  - Photo/Documents: optional attachments
- **THEN** the asset is created with status `Available`
- **AND** appears in the asset directory table

#### Scenario: Auto-generated asset tag
- **WHEN** a new asset is registered
- **THEN** the system generates a unique tag in format `AF-XXXX` (zero-padded, sequential)
- **AND** the tag cannot be manually edited

#### Scenario: Mark asset as shared/bookable
- **WHEN** Asset Manager checks the "Shared/Bookable" flag
- **THEN** the asset becomes available in the Resource Booking screen (Screen 6)
- **AND** it cannot be allocated to a single employee (only booked by time slot)

### Requirement: Asset Directory & Search
The system SHALL provide searchable, filterable access to all registered assets.

#### Scenario: Search by asset tag
- **GIVEN** the search bar with placeholder "Search by tag, serial, or QR code.."
- **WHEN** a user searches "AF-0012"
- **THEN** the Dell Laptop asset is displayed

#### Scenario: Filter by status/category/department
- **WHEN** using filter controls
- **THEN** assets can be filtered by:
  - Category (Electronics, Furniture, etc.)
  - Status (Available, Allocated, Under Maintenance, etc.)
  - Department
  - Location

#### Scenario: Asset directory table
- **WHEN** the directory loads
- **THEN** a table shows columns: Tag | Name | Category | Status | Department | Location
- **AND** example rows:
  - AF-0012 | Dell Laptop | Electronics | Allocated | — | Bengaluru
  - AF-0062 | Projector | Electronics | Maintenance | — | HQ Floor 2
  - AF-0201 | Office Chair | Furniture | Available | — | Warehouse

### Requirement: Asset Lifecycle States
The system SHALL display and enforce valid lifecycle state transitions.

#### Scenario: Valid state transitions
- **THEN** the following transitions are allowed:
  - `Available` → `Allocated` (via allocation)
  - `Available` → `Reserved` (via booking/hold)
  - `Available` ↔ `Under Maintenance` (via maintenance workflow)
  - `Allocated` → `Available` (via return)
  - `Allocated` → `Under Maintenance` (via maintenance approval)
  - `Under Maintenance` → `Available` (via resolution)
  - Any → `Lost` (via audit finding)
  - Any → `Retired` (manual)
  - `Retired` → `Disposed` (manual)

#### Scenario: Invalid state transition blocked
- **GIVEN** an asset in `Disposed` state
- **WHEN** a user tries to change it to `Available`
- **THEN** the system blocks the transition with "Cannot reactivate a disposed asset"

### Requirement: Per-Asset History
The system SHALL maintain a complete history log for each asset.

#### Scenario: View asset history
- **WHEN** viewing a specific asset's detail page
- **THEN** a history section shows entries like:
  - "Mar 12 - Allocated to Priya Shah - Engineering"
  - "Jan 04 - Returned by Arjun Nair - condition: good"

## UI Layout (from Wireframe — Screen 4)

```
┌────────────────────────────────────────────────────────┐
│  AssetFlow                                              │
├────────────┬───────────────────────────────────────────┤
│ Dashboard  │  [Search by tag, serial, or QR code..]    │
│ Org setup  │                          [+ Register Asset]│
│ Assets*    │                                            │
│ Allocation │  Tag     │ Name       │ Category │ Status  │
│ Booking    │  ─────── │ ────────── │ ──────── │ ─────── │
│ Maintenanc │  AF-0012 │ Dell Laptop│ Electron.│Allocated│
│ Audit      │  AF-0062 │ Projector  │ Electron.│ Maint.  │
│ Reports    │  AF-0201 │ Office Chr │ Furniture│Available│
│ Notificati │          │            │          │         │
│            │  Department │ Location                     │
│            │  ──────────  │ ──────────                  │
│            │  —          │ Bengaluru                    │
│            │  —          │ HQ Floor 2                   │
│            │  —          │ Warehouse                    │
└────────────┴───────────────────────────────────────────┘
```

## Data Model (Key Fields)

### Asset (Table: `assets`)
| Field            | Type        | Constraints                             |
|------------------|-------------|-----------------------------------------|
| name             | string      | Required                                |
| asset_tag        | string      | Auto-generated AF-XXXX, readonly        |
| serial_number    | string      | Optional, unique if provided            |
| category_id      | foreign_key | → Category (required)                   |
| acquisition_date | date        | Optional                                |
| acquisition_cost | decimal     | Optional, reporting only                |
| condition        | string/enum | New / Good / Fair / Poor / Damaged      |
| location         | string      | Freetext location                       |
| status           | string/enum | Available / Allocated / Reserved / Under Maintenance / Lost / Retired / Disposed |
| is_bookable      | boolean     | If true, appears in Resource Booking    |
| department_id    | foreign_key | → Department (nullable, set via allocation) |
| holder_id        | foreign_key | → User (nullable, current holder)       |
| photo_path       | string      | Optional path to stored image file      |

## Access Rules

| Role           | Register | View All | View Own Dept | Edit Status |
|----------------|----------|----------|---------------|-------------|
| Admin          | ✗        | ✓        | ✓             | ✗           |
| Asset Manager  | ✓        | ✓        | ✓             | ✓           |
| Department Head| ✗        | ✗        | ✓             | ✗           |
| Employee       | ✗        | ✗        | own assets    | ✗           |
