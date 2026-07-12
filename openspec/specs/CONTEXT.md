# AssetFlow — Master Context & Agent Guardrails

> **This document is the single source of truth for the AI agent working on AssetFlow.**  
> It defines the complete project scope, architecture, rules, and out-of-scope boundaries.  
> **If a request is not covered by this documentation, the agent MUST warn the user and explain why.**

---

## 1. Project Overview

**AssetFlow** is an Enterprise Asset & Resource Management System built on the Laravel, React, Tailwind CSS, and MySQL stack.  
It digitizes how organizations track, allocate, and maintain physical assets and shared resources.

- **Industry:** Agnostic (offices, schools, hospitals, factories, agencies)
- **Hackathon Timeline:** 8 hours
- **Platform:** React (Frontend SPA) + Laravel (Backend API) + MySQL (Database)

### Vision
Simplify and digitize asset lifecycle management through a centralized ERP platform with role-based workflows, conflict-free allocation, overlap-free booking, structured maintenance, and periodic audits.

### Mission
Build a user-centric, responsive React application backed by a robust Laravel API that covers the full asset lifecycle from registration to disposal, with real-time dashboards, structured approval workflows, and comprehensive audit trails.

---

## 2. Technology Stack

| Component       | Technology                                      |
|-----------------|------------------------------------------------|
| Backend         | Laravel (PHP 8.2+, Eloquent ORM, REST API)      |
| Frontend        | React (TypeScript, Vite, Tailwind CSS)          |
| Database        | MySQL 8.0+                                      |
| Authentication  | Laravel Sanctum (Token-based Session Auth)      |
| API Protocol    | RESTful JSON API                                |
| Testing         | Pest/PHPUnit (Backend), Vitest/React Testing Lib (Frontend) |
| Package Managers| Composer (PHP), NPM/PNPM (Javascript)           |

### Naming Conventions

| Entity                  | Convention                                      |
|-------------------------|------------------------------------------------|
| Database Tables         | Plural snake_case (e.g., `assets`, `users`)     |
| Eloquent Models         | Singular PascalCase (e.g., `Asset`, `User`)     |
| Controllers             | PascalCase + Controller (e.g., `AssetController`)|
| Routes / API Endpoints  | Plural snake_case (e.g., `/api/asset_transfers`)|
| React Components        | PascalCase (e.g., `AssetDirectory.tsx`)        |
| Asset tags              | `AF-XXXX` (zero-padded auto-sequence)           |
| Dates                   | UTC storage, user-timezone conversion on client |

---

## 3. Directory & Architecture Structure

```
assetflow/
├── backend/                  # Laravel API application
│   ├── app/
│   │   ├── Models/           # Eloquent Models (Asset, User, Department, etc.)
│   │   ├── Http/
│   │   │   ├── Controllers/  # API Controllers
│   │   │   ├── Requests/     # Form Requests (validation rules)
│   │   │   └── Middleware/   # Access & Role verification
│   │   └── Policies/         # Gate Authorization Policies (UserPolicy, AssetPolicy)
│   ├── database/
│   │   ├── migrations/       # MySQL Schema Definitions
│   │   └── seeders/          # Database Seeders (Demo data)
│   ├── tests/                # PHPUnit/Pest Backend Tests
│   └── routes/api.php        # REST API Routes
│
└── frontend/                 # React SPA
    ├── src/
    │   ├── components/       # Reusable components (UI Kit, Kanban, Calendar)
    │   ├── pages/            # Page layouts matching Screens 1-10
    │   ├── context/          # Authentication & State Context
    │   ├── hooks/            # API hook wrappers
    │   ├── App.tsx           # Route definitions
    │   └── main.tsx
    ├── tailwind.config.js    # Tailwind Utility Definitions
    └── package.json
```

---

## 4. User Roles & Policies

| Role             | Laravel Gate Policy check     | Permissions Summary                                |
|------------------|-------------------------------|----------------------------------------------------|
| **Employee**     | `User::isEmployee()`          | View own assets, book resources, raise maintenance |
| **Dept Head**    | `User::isDeptHead()`          | + View dept assets, approve dept transfers, book for dept |
| **Asset Manager**| `User::isAssetManager()`      | + Register assets, allocate, approve transfers/maintenance/audit |
| **Admin**        | `User::isAdmin()`             | + Full org setup, employee roles, org-wide analytics |

### Security Rules (CRITICAL)

1. **Signup = Employee ONLY.** No role selection at registration.
2. **Role assignment = Admin ONLY.** From Organization Setup → Employee Directory (Screen 3, Tab C).
3. **No self-role-elevation.** API-level attempts are blocked with 403 Forbidden and logged.
4. **Authorization Policies:** Employees can only retrieve their own items. Department Heads can retrieve department-scoped items. Managers and Admins can retrieve organization-wide items.

---

## 5. Screen-to-Route Mapping

| Screen # | Screen Name                    | React Component / Route   | Laravel API Controller & Routes         |
|----------|-------------------------------|---------------------------|-----------------------------------------|
| 1        | Login / Signup                | `/login`, `/register`     | `AuthController` (`/api/auth/register`, `/api/auth/login`) |
| 2        | Dashboard / Home              | `/dashboard`              | `DashboardController` (`/api/dashboard`) |
| 3        | Organization Setup (Admin)    | `/setup`                  | `DepartmentController`, `CategoryController`, `EmployeeController` |
| 4        | Asset Registration & Directory| `/assets`                 | `AssetController` (`/api/assets`)       |
| 5        | Asset Allocation & Transfer   | `/allocations`            | `AllocationController`, `TransferController` |
| 6        | Resource Booking              | `/bookings`               | `BookingController` (`/api/bookings`)   |
| 7        | Maintenance Management        | `/maintenance`            | `MaintenanceController` (`/api/maintenance`) |
| 8        | Asset Audit                   | `/audits`                 | `AuditController` (`/api/audits`)       |
| 9        | Reports & Analytics           | `/reports`                | `ReportController` (`/api/reports`)     |
| 10       | Activity Logs & Notifications | `/notifications`          | `NotificationController`, `AuditLogController` |

---

## 6. Asset Lifecycle State Machine

```
                    ┌─────────────┐
                    │  Available  │◄──────────────────────────┐
                    └──────┬──────┘                           │
                           │                                  │
              ┌────────────┼────────────┐                     │
              ▼            ▼            ▼                     │
        ┌──────────┐ ┌──────────┐ ┌──────────────┐           │
        │Allocated │ │ Reserved │ │    Under     │           │
        │          │ │          │ │ Maintenance  │───────────┘
        └────┬─────┘ └────┬─────┘ └──────────────┘
             │            │              ▲
             │            │              │
             ├────────────┘              │
             │ (return)                  │ (maintenance approved)
             ▼                           │
        ┌──────────┐                     │
        │Available │─────────────────────┘
        └──────────┘
        
        Any state ──→ Lost (via audit)
        Any state ──→ Retired (manual)
        Retired   ──→ Disposed (manual)
```

### Valid Transitions Table

| From               | To                  | Trigger                    |
|--------------------|--------------------|----------------------------|
| Available          | Allocated          | Allocation action          |
| Available          | Reserved           | Booking/hold               |
| Available          | Under Maintenance  | Maintenance approved       |
| Allocated          | Available          | Return action              |
| Allocated          | Under Maintenance  | Maintenance approved       |
| Reserved           | Allocated          | Booking confirmed          |
| Under Maintenance  | Available          | Maintenance resolved       |
| Any                | Lost               | Audit finding              |
| Any                | Retired            | Manual retirement          |
| Retired            | Disposed           | Manual disposal            |

---

## 7. Core Workflows

### 7.1 Setup Flow
```
Admin sets up Org → Creates Departments → Creates Categories → Manages Employee Directory → Promotes Employees to Dept Head / Asset Manager
```

### 7.2 Asset Registration
```
Asset Manager → Registers new asset (name, category, tag, serial, cost, location, bookable flag) → Status: Available
```

### 7.3 Allocation & Transfer
```
Asset Manager allocates asset to Employee/Dept → Expected Return Date set
If already allocated → BLOCK → Offer Transfer Request
Transfer: Requested → Approved (by Manager/Dept Head) → Re-allocated
Return: Mark returned → Condition notes → Status: Available
Overdue: Auto-flagged daily → Dashboard + Notifications
```

### 7.4 Resource Booking
```
Employee selects bookable resource → Chooses time slot → Overlap check
If conflict → REJECT ("slot unavailable")
If clear → Booking created: Upcoming → Ongoing → Completed
Cancel/reschedule supported. Reminder notifications sent.
```

### 7.5 Maintenance
```
Holder raises request (asset, issue, priority, photo) → Status: Pending
Asset Manager approves → Asset: Under Maintenance → Technician assigned → In Progress → Resolved → Asset: Available
If rejected → No asset status change. Requester notified.
```

### 7.6 Audit
```
Admin creates audit cycle (scope: dept/location, date range) → Assigns auditors
Auditors verify each asset: Verified / Missing / Damaged
Discrepancy report auto-generated for flagged items
Close cycle → Lock → Missing assets → Lost status
```

### 7.7 Notifications
```
Events trigger notifications: Assignment, Approval, Booking, Transfer, Overdue, Audit discrepancy
All actions logged in immutable audit trail
```

---

## 8. SCOPE BOUNDARIES — What Is NOT Included

> [!CAUTION]
> **If a user requests any of the following features, the agent MUST give a warning explaining that the feature is outside the defined scope of AssetFlow.**

### Explicitly Out of Scope

| Category                    | Reason                                              |
|----------------------------|-----------------------------------------------------|
| **Purchasing/Procurement** | AssetFlow tracks assets post-acquisition only       |
| **Invoicing/Billing**      | No financial transactions — cost is for reports only|
| **Accounting Integration** | Acquisition cost is NOT linked to any GL/accounting |
| **Inventory/Warehouse Mgmt** | Beyond basic location tracking, no stock levels   |
| **HR/Payroll Integration** | Employee directory is standalone, no salary/leave   |
| **Manufacturing/MRP**      | Not a production system                             |
| **CRM/Sales**              | No customer-facing features                         |
| **E-commerce/Website**     | Internal tool only                                  |
| **Multi-company**          | Single organization deployment                      |
| **Mobile App (native)**    | Web-responsive only, no native iOS/Android          |
| **IoT/Sensor Integration** | No real-time sensor tracking                        |
| **GPS/Fleet Tracking**     | Location is manual text, no GPS                     |
| **Barcode/QR Generation**  | Search supports QR input, but no generation module  |
| **Document Management**    | Basic photo/attachment only, no DMS                 |
| **Workflow Builder/Custom**| Fixed workflows as defined, no user-configurable flows |
| **Multi-language/i18n**    | English only for hackathon scope                    |
| **Self-role-elevation**    | Users CANNOT change their own roles. Ever.          |

### Warning Template for Out-of-Scope Requests

When a user requests an out-of-scope feature, the agent should respond:

```
⚠️ WARNING: This feature is outside the defined scope of AssetFlow.

Feature requested: [feature name]
Reason: [explanation from the table above]

AssetFlow is designed as an asset lifecycle management system focused on:
- Asset registration & tracking
- Allocation & transfer workflows  
- Resource booking
- Maintenance management
- Audit cycles
- Reporting & notifications

The requested feature falls under [category] which is explicitly excluded 
from the project scope. Implementing it would require additional modules, 
data models, and workflows not covered by the current architecture.

Would you like to:
1. Continue with an in-scope alternative?
2. Document this as a future enhancement?
```

---

## 9. UI/UX Design Principles

### Layout Structure (All Screens)

```
┌──────────────────────────────────────────────────┐
│  AssetFlow                              [Header] │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Sidebar   │          Content Area               │
│  Navigation│                                     │
│            │                                     │
│  Dashboard │                                     │
│  Org Setup │                                     │
│  Assets    │                                     │
│  Allocation│                                     │
│  Booking   │                                     │
│  Maintenanc│                                     │
│  Audit     │                                     │
│  Reports   │                                     │
│  Notificati│                                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

### Key UI Patterns
- **Sidebar navigation** consistent across all screens (9 menu items)
- **Active screen** highlighted in sidebar with bold text and active colors
- **Tailwind-based layouts** using custom theme properties and flex/grid systems
- **KPI cards** on dashboard with large numbers, labels, and Tailwind styling
- **Data tables** with sorting, search inputs, and badge indicators (e.g. `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`)
- **Kanban board** built with React drag-and-drop or column structures for maintenance stages
- **Calendar component** (like FullCalendar or a custom Tailwind grid) for resource booking with time slots
- **Tabbed view** for Setup page (Departments, Categories, Employees)
- **Modal overlays** for registrations, bookings, and requests
- **Toasts and banner notifications** for errors (e.g. duplicate booking, unauthorized actions)

---

## 10. Data Examples from Wireframes

### Sample Departments
| Department      | Head        | Parent    | Status   |
|----------------|-------------|-----------|----------|
| Engineering    | Aditi Rao   | --        | Active   |
| Facilities     | Rohan Mehta | --        | Active   |
| Field Ops (East)| Sana Iqbal | Field Ops | Inactive |

### Sample Assets
| Tag     | Name         | Category    | Status      | Location    |
|---------|-------------|-------------|-------------|-------------|
| AF-0012 | Dell Laptop | Electronics | Allocated   | Bengaluru   |
| AF-0062 | Projector   | Electronics | Maintenance | HQ Floor 2  |
| AF-0201 | Office Chair| Furniture   | Available   | Warehouse   |

### Sample Maintenance Cards
| Asset   | Issue              | Stage              |
|---------|-------------------|--------------------|
| AF-0062 | Projector bulb    | Pending            |
| AF-003  | AC noisy compress | Approved           |
| AF-0078 | Forklift          | Tech: R. Varma     |
| AF-897  | Printer Jam       | In Progress        |
| AF-873  | Chair repair      | Resolved (7 Jul)   |

### Sample Notifications
| Message                                      | Time    | Category  |
|----------------------------------------------|---------|-----------|
| Laptop AF-0014 assigned to Priya Shah       | 2m ago  | Alert     |
| Maintenance request AF-0055 approved         | 18m ago | Approval  |
| Booking confirmed: Room B2 2:00-3:00 PM     | 1h ago  | Booking   |
| Transfer approved: AF-0033 to Facilities    | 3h ago  | Approval  |
| Overdue return: AF-0021 was due 3 days ago  | 1d ago  | Alert     |
| Audit discrepancy flagged: AF-0088 damaged  | 2d ago  | Alert     |

### Sample Audit Verification
| Asset              | Expected Location | Verification |
|--------------------|--------------------|--------------|
| AF-003 Dell Laptop | Desk E12           | ✓ Verified   |
| AF-9921 Office Chair| Desk E14          | ✗ Missing    |
| AF-9838 Monitor    | Desk E15           | ⚠ Damaged    |

### Sample Reports Data
| Section                    | Data                                    |
|----------------------------|-----------------------------------------|
| Most Used                  | Room B2: 34 bookings, Van AF-343: 21 trips |
| Idle                       | Camera AF-0301: 60+ days, Chair AF-0410: 45 days |
| Due for Maintenance        | Forklift AF-0087: 5 days                |
| Nearing Retirement         | Laptop AF-0020: 4 years old             |

---

## 11. OpenSpec Spec Files Index

All detailed specifications with requirements, scenarios, data models, and validation rules are in:

| Capability             | Path                                           |
|-----------------------|------------------------------------------------|
| Authentication        | `openspec/specs/authentication/spec.md`        |
| Dashboard             | `openspec/specs/dashboard/spec.md`             |
| Organization Setup    | `openspec/specs/organization-setup/spec.md`    |
| Asset Management      | `openspec/specs/asset-management/spec.md`      |
| Allocation & Transfer | `openspec/specs/allocation-transfer/spec.md`   |
| Resource Booking      | `openspec/specs/resource-booking/spec.md`      |
| Maintenance           | `openspec/specs/maintenance/spec.md`           |
| Audit                 | `openspec/specs/audit/spec.md`                 |
| Reports & Analytics   | `openspec/specs/reports-analytics/spec.md`     |
| Notifications         | `openspec/specs/notifications/spec.md`         |

---

## 12. Agent Behavior Rules

### MUST DO
1. **Read specs before implementing.** Always check the relevant spec file before writing code.
2. **Follow the state machine.** Only allow valid state transitions as defined in Section 6.
3. **Enforce Laravel Policies and Middleware.** Protect every API route with Sanctum auth and authorization checks.
4. **Use auto-generated asset tags.** Never allow manual tag editing.
5. **Block double-allocation.** Always check asset status on the backend database level before allocation.
6. **Validate booking overlaps.** Enforce overlap detection checks on the database before creating or updating a booking.
7. **Follow maintenance workflow.** Requests must be approved before work begins.
8. **Lock closed audit cycles.** No edits after status changes to closed.
9. **Log everything.** Write all state changes to the activity logs database table.
10. **Use spec data examples.** When creating seeds or test cases, use the examples from wireframes.

### MUST NOT DO
1. **Never implement out-of-scope features** without warning the user (see Section 8).
2. **Never allow self-role-elevation** — this is a strict security gate constraint.
3. **Never skip approval workflows** — state machine transitions must be validated.
4. **Never allow overlapping bookings** — validation checks must block this.
5. **Never allow double-allocation** — suggest transfer requests instead.
6. **Never link acquisition cost to accounting** — it's for reports only.
7. **Never create non-Employee accounts at signup** — roles are Admin-assigned only.

### SHOULD DO
1. Suggest running `/opsx:propose` or `/opsx:apply` for structured changes.
2. Reference screen numbers (Screen 1-10) when discussing features.
3. Use the wireframe ASCII layouts when building React views with Tailwind CSS.
4. Create Pest/PHPUnit test cases for every API endpoint.
5. Use Laravel task scheduling (`php artisan schedule:run`) for daily overdue scans.
