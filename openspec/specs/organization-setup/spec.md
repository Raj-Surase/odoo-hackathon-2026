# Organization Setup

> **Screen Reference:** Screen 3 — Organization Setup (Admin Only, 3 Tabs)  
> **Route / Endpoint:** `/setup`, `/api/departments`, `/api/categories`, `/api/employees`  
> **Affected Roles:** Admin (exclusive access)

## Purpose

Maintain the master data that everything else depends on: departments, asset categories, and the employee directory. This is the single source for department hierarchy, category definitions, and the ONLY place where roles are assigned. Editing a department here drives the picklist in Screen 4 (Asset Registration) and Screen 5 (Allocation).

## Requirements

### Requirement: Tab A — Department Management
The system SHALL allow Admin to create, edit, and deactivate departments with hierarchical structure.

#### Scenario: Create a new department
- **GIVEN** an Admin on the Organization Setup screen, Departments tab
- **WHEN** they click "+ Add" and fill in:
  - Department Name: "Engineering"
  - Department Head: "Aditi Rao" (from employee list)
  - Parent Department: "--" (none, top-level)
  - Status: "Active"
- **THEN** the department is created and appears in the department table
- **AND** it becomes available as a picklist option in Screens 4 and 5

#### Scenario: Department table display
- **WHEN** the Departments tab loads
- **THEN** a table shows columns: Department | Head | Parent Dept | Status
- **AND** example rows include:
  - Engineering | Aditi Rao | -- | Active
  - Facilities | Rohan Mehta | -- | Active
  - Field Ops (East) | Sana Iqbal | Field Ops | Inactive

#### Scenario: Deactivate a department
- **GIVEN** a department with allocated assets
- **WHEN** Admin sets Status to "Inactive"
- **THEN** the department is hidden from new allocation picklists
- **AND** existing allocations remain unaffected

### Requirement: Tab B — Asset Category Management
The system SHALL allow Admin to create and edit asset categories with optional category-specific fields.

#### Scenario: Create a category
- **GIVEN** an Admin on the Categories tab
- **WHEN** they create a category "Electronics" with optional field "Warranty Period"
- **THEN** the category is saved and available in the Asset Registration form (Screen 4)

#### Scenario: Category examples
- **THEN** categories include: Electronics, Furniture, Vehicles, etc.
- **AND** each may have category-specific fields (e.g., warranty period for Electronics)

### Requirement: Tab C — Employee Directory
The system SHALL allow Admin to manage employees and assign roles. This is the ONLY place roles are assigned.

#### Scenario: View employee directory
- **WHEN** the Employee Directory tab loads
- **THEN** a table shows: Name | Email | Department | Role | Status

#### Scenario: Promote employee to Asset Manager
- **GIVEN** an Employee named "Priya Shah" with role "Employee"
- **WHEN** Admin changes her role to "Asset Manager"
- **THEN** Priya gains Asset Manager permissions immediately
- **AND** the change is logged in the audit trail

#### Scenario: Promote employee to Department Head
- **GIVEN** an Employee named "Rohan Mehta"
- **WHEN** Admin assigns role "Department Head" and assigns him as head of "Facilities" department
- **THEN** Rohan gains Department Head permissions for the Facilities department

#### Scenario: Deactivate employee
- **WHEN** Admin sets an employee's Status to "Inactive"
- **THEN** their login is disabled and assets must be re-allocated

## UI Layout (from Wireframe — Screen 3)

```
┌────────────────────────────────────────────────────────┐
│  AssetFlow                                              │
├────────────┬───────────────────────────────────────────┤
│ Dashboard  │  [Departments] [Categories] [Employee]    │  ← 3 tabs
│ Org setup* │                                  [+ Add]  │
│ Assets     │                                            │
│ Allocation │  Department  │ Head       │ Parent │Status │
│ Booking    │  ──────────  │ ────────── │ ────── │────── │
│ Maintenanc │  Engineering │ Aditi Rao  │ --     │Active │
│ Audit      │  Facilities  │ Rohan Mehta│ --     │Active │
│ Reports    │  Field Ops   │ Sana Iqbal │ FieldOp│Inactv │
│ Notificati │              │            │        │       │
│            │  Note: Editing a department here also      │
│            │  drives the picklist in Screen 4 & 5      │
└────────────┴───────────────────────────────────────────┘
```

## Data Model (Key Fields)

### Department (Table: `departments`)
| Field          | Type        | Constraints                      |
|----------------|-------------|----------------------------------|
| name           | string      | Required, unique                 |
| head_id        | foreign_key | → User (role=Dept Head, nullable)|
| parent_id      | foreign_key | → Department (self-referential, nullable) |
| status         | string/enum | Active / Inactive (default: Active) |

### Asset Category (Table: `categories`)
| Field          | Type        | Constraints                      |
|----------------|-------------|----------------------------------|
| name           | string      | Required, unique                 |
| custom_fields  | json        | Optional category-specific fields key-value schema |

### Employee (Table: `users`)
| Field          | Type        | Constraints                      |
|----------------|-------------|----------------------------------|
| name           | string      | Required                         |
| email          | string      | Required, unique, valid email    |
| department_id  | foreign_key | → Department (nullable)          |
| role           | string/enum | Employee / Dept Head / Asset Mgr / Admin |
| status         | string/enum | Active / Inactive (default: Active) |

## Access Rules

| Role           | Create | Read | Update | Delete |
|----------------|--------|------|--------|--------|
| Admin          | ✓      | ✓    | ✓      | ✓      |
| Asset Manager  | ✗      | ✓    | ✗      | ✗      |
| Department Head| ✗      | ✓ (own dept) | ✗ | ✗   |
| Employee       | ✗      | ✗    | ✗      | ✗      |
