# AssetFlow — Implementation Roadmap & Task Checklist

This document details the step-by-step development process to implement AssetFlow using the **React, Tailwind CSS, Laravel, and MySQL** technology stack. Mark items as completed (`[x]`) as you make progress.

---

## 📅 Phase 1: Environment Setup & Infrastructure

### Setup Tasks

- [x] **Task 1.1: Backend Initialisation (Laravel)**
  - *Description:* Initialise a new Laravel project in the `backend/` directory using Composer. Setup configuration defaults.
  - *Details:*
    - Run `composer create-project laravel/laravel backend`.
    - Configure `.env` with MySQL credentials, database name (`assetflow_db`), app URL, and mail settings.
    - Set up Laravel Sanctum for API token authentication: run `php artisan sanctum:install`.

- [x] **Task 1.2: Database Migration & Schema Creation**
  - *Description:* Create the database on MySQL server and run default migrations.
  - *Details:*
    - Create a blank MySQL database named `assetflow_db`.
    - Run the default Laravel migrations: `php artisan migrate`.

- [x] **Task 1.3: Frontend Initialisation (React + Vite)**
  - *Description:* Initialise a React TypeScript application in the `frontend/` directory using Vite.
  - *Details:*
    - Run `npm create vite@latest frontend -- --template react-ts` (or use `npx`).
    - Install package dependencies: `react-router-dom`, `lucide-react` (icons), `date-fns`, and `axios`.

- [x] **Task 1.4: Tailwind CSS Configuration**
  - *Description:* Integrate and configure utility-first styling with Tailwind CSS in the frontend SPA.
  - *Details:*
    - Install Tailwind CSS, PostCSS, and Autoprefixer in the React application directory.
    - Run `npx tailwindcss init -p`.
    - Configure `tailwind.config.js` to scan files under `./src` and define a premium color palette (sleek dark colors, smooth greens for Available, reds for Overdue/Alerts, amber for Maintenance).

- [x] **Task 1.5: CORS & API Proxy Config**
  - *Description:* Configure CORS on the backend to allow frontend request parameters, and setup Vite proxy configuration.
  - *Details:*
    - Adjust `config/cors.php` in Laravel to allow requests from the React dev server port (e.g., `http://localhost:5173`).
    - Setup `vite.config.ts` proxy properties so requests starting with `/api` map to the Laravel backend endpoint (`http://localhost:8000/api`).

---

## 🗄️ Phase 2: Database Schemas & Eloquent Relationships

### Model & Migration Tasks

- [x] **Task 2.1: Migrations for Base Tables**
  - *Description:* Write database migrations defining columns and foreign keys for base entities: `departments`, `categories`, and user table alterations.
  - *Details:*
    - Add `role` (enum/string: Employee, Dept Head, Asset Manager, Admin), `department_id` (unsignedBigInteger foreign key, nullable), and `status` (enum/string: Active, Inactive) to the `users` table migration.
    - Create `departments` table migration: `id`, `name` (unique string), `head_id` (foreign key to users, nullable), `parent_id` (foreign key to departments, nullable), `status` (Active/Inactive), timestamps.
    - Create `categories` table migration: `id`, `name` (unique string), `custom_fields` (json, nullable), timestamps.

- [x] **Task 2.2: Migrations for Core Asset Tracking**
  - *Description:* Setup tables for assets, allocations, transfers, and resource bookings.
  - *Details:*
    - Create `assets` migration: `id`, `name` (string), `asset_tag` (string, unique), `serial_number` (string, unique, nullable), `category_id` (foreign key), `acquisition_date` (date, nullable), `acquisition_cost` (decimal, nullable), `condition` (string/enum), `location` (string, nullable), `status` (string/enum), `is_bookable` (boolean), `department_id` (foreign key, nullable), `holder_id` (foreign key to users, nullable), `photo_path` (string, nullable), timestamps.
    - Create `allocations` migration: `id`, `asset_id` (foreign key), `user_id` (foreign key to users), `department_id` (foreign key, nullable), `allocated_date` (datetime), `expected_return` (date, nullable), `actual_return` (datetime, nullable), `condition_notes` (text, nullable), `status` (string/enum: Active/Returned/Overdue), timestamps.
    - Create `asset_transfers` migration: `id`, `asset_id` (foreign key), `from_user_id` (foreign key), `to_user_id` (foreign key), `reason` (text), `status` (string/enum: Requested/Approved/Rejected/Re-allocated), `approved_by` (foreign key, nullable), timestamps.
    - Create `bookings` migration: `id`, `resource_id` (foreign key to assets), `user_id` (foreign key), `department_id` (foreign key, nullable), `start_datetime` (datetime), `end_datetime` (datetime), `purpose` (text, nullable), `status` (string/enum: Upcoming/Ongoing/Completed/Cancelled), timestamps.

- [x] **Task 2.3: Migrations for Maintenance, Audits & Events**
  - *Description:* Setup schemas for maintenance pipeline, audit logs, notifications, and verification records.
  - *Details:*
    - Create `maintenance_requests` migration: `id`, `asset_id` (foreign key), `user_id` (foreign key), `issue_description` (text), `priority` (string/enum: Low/Medium/High/Critical), `photo_path` (string, nullable), `technician_id` (foreign key, nullable), `status` (string/enum), `approved_by` (foreign key, nullable), `resolution_notes` (text, nullable), `resolution_date` (datetime, nullable), timestamps.
    - Create `audit_cycles` migration: `id`, `name` (string), `department_id` (foreign key, nullable), `location` (string, nullable), `start_date` (date), `end_date` (date), `status` (string/enum: Open/In Progress/Closed), `is_locked` (boolean, default false), timestamps.
    - Create `audit_lines` migration: `id`, `audit_cycle_id` (foreign key), `asset_id` (foreign key), `expected_location` (string, nullable), `verification` (string/enum: Verified/Missing/Damaged), `notes` (text, nullable), `audited_by` (foreign key, nullable), timestamps.
    - Create `audit_cycle_auditor` pivot table: `audit_cycle_id`, `user_id`.
    - Create `discrepancy_reports` migration: `id`, `audit_cycle_id` (foreign key), `generated_date` (datetime), timestamps.
    - Create `notifications` migration: `id`, `recipient_id` (foreign key), `type` (string), `title` (string), `message` (text), `is_read` (boolean, default false), `reference_type` (string, polymorphic), `reference_id` (integer, polymorphic), timestamps.
    - Create `audit_logs` migration: `id`, `user_id` (foreign key), `action` (string), `model` (string), `record_id` (integer), `old_values` (json, nullable), `new_values` (json, nullable), `timestamp` (datetime), timestamps.

- [x] **Task 2.4: Eloquent Model Relationships**
  - *Description:* Define database relations on Laravel models.
  - *Details:*
    - Define relations: `Asset` belongsTo `Category` / hasMany `Allocation` / hasMany `Booking` / belongsTo `User` (holder).
    - `User` belongsTo `Department` / hasMany `Allocation` / hasMany `Booking` / belongsTo role enum/method helpers.
    - `Department` hasMany `User` (employees) / belongsTo `User` (head) / belongsTo `Department` (parent) / hasMany `Department` (sub-departments).
    - Setup polymorphic relation methods for `Notification` and JSON casting hooks on `Category` and `AuditLog`.

---

## 🔐 Phase 3: Screen 1 — Authentication & User Management

### Controller & View Tasks

- [x] **Task 3.1: Backend Sanctum Register/Login Endpoints**
  - *Description:* Write authentication controller actions in Laravel handling user registration, credentials lookup, and token generation.
  - *Details:*
    - Create `AuthController.php`.
    - `register()` action: validate fields (name, email, password, department_id). Must hardcode user role default value to `Employee`. Reject any API-level parameter to select another role.
    - `login()` action: validate email/password credentials, return Sanitized user object and plain-text API Sanctum token. Return 401 on failed match with generic error.
    - `logout()` action: invalidate/delete active Sanctum tokens.

- [x] **Task 3.2: Role Authorization Policies**
  - *Description:* Implement Gate Policies to prevent self-role-elevation and secure APIs.
  - *Details:*
    - Create policy classes under `app/Policies` for all models (Asset, Department, Booking, etc.).
    - Setup strict checks in `update()` and `store()` methods restricting operations based on the active session role.
    - Return `403 Forbidden` if a user attempts to update their own `role` attribute.

- [x] **Task 3.3: React Login and Registration Pages**
  - *Description:* Create Screen 1 UI in React using Tailwind CSS utility styles.
  - *Details:*
    - Build login page with clean inputs, validation styles, error displays, and links.
    - Build registration page (defaulting to Employee role warning text).
    - Design a custom logo icon placeholder and configure responsive Tailwind forms.

- [x] **Task 3.4: Route Guards & Auth Context**
  - *Description:* Establish React Context tracking session tokens and securing route parameters.
  - *Details:*
    - Write `AuthContext.tsx` managing global state (logged-in user profile, roles, Sanctum authentication tokens).
    - Create `<ProtectedRoute>` route wrap component checking roles. Redirect unauthorized users back to the dashboard.

---

## 🏢 Phase 4: Screen 3 — Organization Setup (Admin Only)

### Org Setup Tasks

- [x] **Task 4.1: Tab A — Department API & UI**
  - *Description:* Admin portal to view, insert, edit, and deactivate corporate departments.
  - *Details:*
    - Create `DepartmentController` with API resource methods (`index`, `store`, `update`, `destroy`).
    - Restrict endpoints using `auth:sanctum` and Admin Gate middleware.
    - Frontend: React view containing a list/table of active departments (Engineering, Facilities, Field Ops) with edit/deactivate controls, head of department dropdown, and parent hierarchy select element.

- [x] **Task 4.2: Tab B — Category Builder API & UI**
  - *Description:* Setup asset category tables and custom parameter JSON schemes.
  - *Details:*
    - Create `CategoryController` handling category definitions (e.g. Electronics, Furniture, Vehicles).
    - Implement JSON validations for category-specific custom fields.
    - Frontend: Category page showing defined lists, allowing Admin to add/modify templates and custom properties.

- [x] **Task 4.3: Tab C — Employee directory role mapping UI**
  - *Description:* Active employee list where Admins can upgrade user roles.
  - *Details:*
    - Create `EmployeeController` returning lists of registered employees.
    - Implement a PATCH API `updateRole(user_id, role)` restricted to Admins.
    - Frontend: Interactive grid of staff showing Name, Email, Department, active Role, and status switch. Allow Admin to alter Role to `Asset Manager` or `Department Head`.

---

## 🏷️ Phase 5: Screen 4 — Asset Registration & Directory

### Asset Directory Tasks

- [x] **Task 5.1: Unique Tag Generator Sequence**
  - *Description:* Implement backend sequencing logic to generate incremental `AF-XXXX` tags.
  - *Details:*
    - Build database sequence helper or MySQL trigger to automatically increment and yield the next code (e.g., `AF-0012`).
    - Enforce database model configuration preventing updates to the `asset_tag` column once registered.

- [x] **Task 5.2: Register Asset API Endpoint**
  - *Description:* Create Laravel endpoint validating registered assets and condition metadata.
  - *Details:*
    - Create `AssetController@store` validation rules using `FormRequest` rules. Validate uniqueness of serial numbers, valid category association, and check `is_bookable` configurations.
    - Handle photo path file uploads and store locally or on Laravel public storage directory.

- [x] **Task 5.3: Advanced Directory search & filters**
  - *Description:* API search scopes to query tags, category groups, conditions, and locations.
  - *Details:*
    - Implement search scopes on `Asset` model querying tag matches, serial matching, and category filters.
    - Frontend: Layout Screen 4 using Tailwind containing query search bars, Category/Status pill filters, and tables rendering asset entries with relative status badges (Green = Available, Blue = Allocated, Yellow = Maintenance).

- [x] **Task 5.4: Asset Timeline & History Log**
  - *Description:* Retrieve history timeline records tracking asset allocations, transfers, and maintenance logs.
  - *Details:*
    - Add endpoint `/api/assets/{id}/history` fetching related data logs from allocations, transfers, and maintenance.
    - Frontend: Detail modal or slide-over rendering chronological list items.

---

## 🔄 Phase 6: Screen 5 — Asset Allocation & Transfer

### Allocation Tasks

- [x] **Task 6.1: Allocation Conflict Gate validation**
  - *Description:* Backend check to prevent double-allocations on any asset record.
  - *Details:*
    - In `AllocationController@store`, validate that the target asset status is `Available`.
    - If status is `Allocated`, block request and return `422 Unprocessable Entity` with details about the current holder (Employee Name and Department) to trigger the Transfer flow on the client.

- [x] **Task 6.2: Transfer Request State Pipeline**
  - *Description:* Implementation of the `Requested` → `Approved/Rejected` → `Re-allocated` workflow.
  - *Details:*
    - Create `TransferController` endpoints. `store()` registers the request (validating current holder context and recipient).
    - Create `approve()` endpoint. On approval: update asset's `holder_id`, terminate previous active allocation record, launch a new allocation record for the new holder, and update transfer status.
    - Check that only the Asset Manager or Department Head of the recipient department can approve transfers.

- [x] **Task 6.3: Return check-in API**
  - *Description:* Mark assets as returned, collect notes, and restore availability.
  - *Details:*
    - Create `/api/allocations/{id}/return` endpoint.
    - Update actual return date, record condition checks (Good, Damaged, Fair), and restore asset status back to `Available`.

- [x] **Task 6.4: Overdue scheduler command**
  - *Description:* Laravel Scheduler task running daily to detect past-due returns.
  - *Details:*
    - In `app/Console/Kernel.php`, setup a daily scheduled cron command querying active allocations where `expected_return` is past today.
    - Update allocation status to `Overdue` and dispatch overdue return notification records.

- [x] **Task 6.5: Allocation Frontend Portal**
  - *Description:* Screen 5 client UI showing current allocation status and transfer requests.
  - *Details:*
    - Build React form displaying error/warning prompts if an asset is already allocated.
    - Render a Transfer Request form (Target employee selection, reason field).
    - Render a list of past allocations (history timeline).

---

## 📅 Phase 7: Screen 6 — Resource Booking

### Booking Tasks

- [x] **Task 7.1: Zero-Overlap validator algorithm**
  - *Description:* Enforce overlap validation before saving bookings.
  - *Details:*
    - Write a custom validation rule or query scope in Laravel:
      ```php
      $overlapExists = Booking::where('resource_id', $resourceId)
          ->where('status', '!=', 'Cancelled')
          ->where('start_datetime', '<', $newEnd)
          ->where('end_datetime', '>', $newStart)
          ->exists();
      ```
    - Apply this logic before inserting or updating booking records.

- [x] **Task 7.2: Booking API & Middleware checks**
  - *Description:* Bookings creation, cancellation, and retrieval endpoints.
  - *Details:*
    - Create `BookingController` with actions: `index()`, `store()`, `cancel()`.
    - Restrict bookings to shared/bookable assets (`is_bookable = true`).
    - Verify that only the booker or an Admin/Asset Manager can cancel a booking.

- [x] **Task 7.3: React Calendar Dashboard**
  - *Description:* Implement calendar view rendering resource reservations.
  - *Details:*
    - Build a calendar layout page rendering active, ongoing, or pending reservations.
    - Integrate color-coding for time slots (Procurement booked = Red, Open slots = White/Green).

- [x] **Task 7.4: Conflict & Booking Forms UI**
  - *Description:* Layout resource booking modal.
  - *Details:*
    - React forms providing date-time pickers, resource selectors, and warning alerts for rejected overlap configurations.

---

## 🔧 Phase 8: Screen 7 — Maintenance Management

### Maintenance Tasks

- [x] **Task 8.1: Submit Maintenance Request API**
  - *Description:* Route allowing asset holders to request maintenance.
  - *Details:*
    - Write controller validating asset ID, priority levels, and file uploads (photo attachments).
    - Request initializes in `Pending` state.

- [x] **Task 8.2: Approval State Machine Observer**
  - *Description:* Sync asset status fields depending on maintenance pipeline changes.
  - *Details:*
    - Set up a Laravel Model Observer on `MaintenanceRequest`.
    - When status transitions from `Pending` to `Approved` → Update corresponding `Asset` status to `Under Maintenance`.
    - When status transitions to `Resolved` → Update corresponding `Asset` status to `Available`.

- [x] **Task 8.3: Kanban Boards views API**
  - *Description:* Endpoint optimized for kanban representation grouping items by pipeline status.
  - *Details:*
    - Endpoint `/api/maintenance/kanban` returning columns: Pending, Approved, Technician Assigned, In Progress, Resolved.

- [x] **Task 8.4: React Maintenance Board UI**
  - *Description:* Build Screen 7 UI using React and Tailwind CSS.
  - *Details:*
    - Layout a kanban board structure. Let users drag/drop cards or click action buttons to change stages (Manager/Technician only).
    - Render cards with tag IDs, descriptions, priority colors, and assigned technicians.

---

## 🔍 Phase 9: Screen 8 — Asset Audit

### Audit Tasks

- [x] **Task 9.1: Start Audit Cycle API**
  - *Description:* Admin/Manager dashboard to initialise new audit cycles.
  - *Details:*
    - Create `AuditController@store` validating Name, Department Scope, Location Scope, Start Date, End Date, and Auditor IDs.

- [x] **Task 9.2: Verification Checklist & Auditor Checklist UI**
  - *Description:* Render checking sheet tables for assigned auditors.
  - *Details:*
    - API returns all assets matched by department/location scope.
    - Auditor submits verify logs: `Verified` (status ok), `Missing` (flagged), `Damaged` (flagged).

- [x] **Task 9.3: Discrepancy report auto-generation**
  - *Description:* Backend parser compiling verification data and compiling discrepancy logs.
  - *Details:*
    - Whenever an asset is marked as `Missing` or `Damaged`, write records into a draft `DiscrepancyReport`.
    - Keep report updated as auditors proceed through the checklist.

- [x] **Task 9.4: Close & Lock Audit Cycle**
  - *Description:* Lock cycle parameters and cascade modifications to main asset tables.
  - *Details:*
    - Create `AuditController@close` endpoint.
    - Set `is_locked = true` and update cycle status.
    - Trigger background updates: assets marked as `Missing` update to `Lost` status, and `Damaged` assets have condition fields updated.

- [x] **Task 9.5: React Audit Interface**
  - *Description:* Screen 8 implementation displaying verification panels.
  - *Details:*
    - Provide a checklist with buttons (Green check = Verified, Red X = Missing, Yellow Warning = Damaged).
    - Render banner alerts when discrepancy warnings are generated.

---

## 📈 Phase 10: Screen 2 & 9 — Reports, Heatmaps & KPI Dashboards

### Analytics Tasks

- [x] **Task 10.1: KPI Metrics Engine API**
  - *Description:* Endpoint retrieving summary numbers for dashboard cards.
  - *Details:*
    - In `DashboardController`, return counters: Total Assets, Available, Allocated, Under Maintenance, Upcoming/Overdue Returns, Active Bookings.

- [x] **Task 10.2: Usage heatmaps query & charts API**
  - *Description:* Return hourly booking density arrays for shared resources.
  - *Details:*
    - Write aggregated queries grouping booking records by day-of-week and hour-of-day.
    - Fetch list of idle items (assets with zero bookings/allocations in the last 30/60 days).
    - Fetch list of items nearing retirement (e.g., Laptops > 3 years old).

- [x] **Task 10.3: CSV / PDF Exporter**
  - *Description:* Build reports exporter using Laravel.
  - *Details:*
    - Write exporter controllers generating CSV schemas or PDF downloads of allocation lists, maintenance histories, or audit logs.

- [x] **Task 10.4: React Dashboard Analytics**
  - *Description:* Screen 9 UI featuring graphs, heatmaps, and stats.
  - *Details:*
    - Render utilization grids, charts, and tables for idle and nearing retirement assets.
    - Implement export buttons calling backend files.

---

## 🔔 Phase 11: Screen 10 — Activity Logging & Notifications

### Log & Alert Tasks

- [x] **Task 11.1: Event Listener alert hooks**
  - *Description:* Laravel events and listeners to trigger notifications.
  - *Details:*
    - Set up event classes: `AssetAssigned`, `MaintenanceApproved`, `BookingConfirmed`, `TransferApproved`, `AuditDiscrepancyFlagged`.
    - Setup Event Listeners writing records to the `notifications` table.

- [x] **Task 11.2: Immutable Audit Log Middleware**
  - *Description:* Backend interceptor logging CRUD database activities.
  - *Details:*
    - Create a Global/Model middleware or base model logging model changes.
    - Save actions (user, model, action, timestamp, JSON delta changes) to the `audit_logs` table. Prevent update/delete requests on this model.

- [x] **Task 11.3: Real-Time Alerts notifications panel**
  - *Description:* Screen 10 layout containing categorised feed lists.
  - *Details:*
    - Build frontend React view containing tabs: All, Alerts, Approvals, Bookings.
    - Render cards with relative timestamp fields ("5m ago").

---

## 🚀 Phase 12: Production Build & Verification

### Final Review Tasks

- [x] **Task 12.1: Seeder scripts for realistic demo data**
  - *Description:* Setup MySQL seed scripts with wireframe data.
  - *Details:*
    - Populate base tables: Aditi Rao, Rohan Mehta, Sana Iqbal, departments, categories.
    - Register sample assets: Dell Laptop (AF-0012), Projector (AF-0062), Office Chair (AF-0201), AC Unit (AF-003).
    - Seed sample allocations, bookings, and resolved maintenance entries.

- [x] **Task 12.2: Pest/PHPUnit Backend testing suite**
  - *Description:* Write backend controller integration tests.
  - *Details:*
    - Write tests for login signup (Employee-only check).
    - Write tests for double-allocation blocks.
    - Write tests for zero-overlap bookings.
    - Run: `php artisan test`.

- [x] **Task 12.3: Vitest Frontend component testing**
  - *Description:* Verify components render correctly.
  - *Details:*
    - Write frontend tests verifying routing protections and input validations.
    - Run: `npm run test` (or pnpm test).

- [x] **Task 12.4: Production Build compilations**
  - *Description:* Build distribution assets.
  - *Details:*
    - Run frontend build compiler: `npm run build`. Verify no TypeScript compilation errors.
    - Set Laravel optimization settings: `php artisan config:cache`, `php artisan route:cache`.
