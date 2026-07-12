# Authentication & User Management

> **Screen Reference:** Screen 1 — Login / Signup  
> **Route / Endpoint:** `/login`, `/register`, `/api/auth/login`, `/api/auth/register`  
> **Affected Roles:** All (Employee, Department Head, Asset Manager, Admin)

## Purpose

Provide secure, realistic authentication with role-gated signup. Users register as Employee-only accounts. Role elevation (to Department Head, Asset Manager) is exclusively performed by Admin from the Employee Directory (Screen 3, Tab C). This prevents self-assigned admin privileges and enforces a controlled role hierarchy.

## Requirements

### Requirement: Employee-Only Signup
The system SHALL create only Employee-level accounts on signup. No role selection field is presented at registration.

#### Scenario: New user registers
- **GIVEN** a visitor on the signup page
- **WHEN** they submit Name, Email, Password, and Department
- **THEN** an Employee account is created with role=Employee and status=Active
- **AND** the user is redirected to the Employee Dashboard

#### Scenario: Attempt to select a role at signup
- **WHEN** inspecting the signup form
- **THEN** no role-selection dropdown or admin checkbox exists
- **AND** the backend ignores any role parameter submitted via API

### Requirement: Email & Password Login
The system SHALL authenticate users via email and password with session validation.

#### Scenario: Valid login
- **GIVEN** a registered user with email `name@company.com` and a valid password
- **WHEN** they submit credentials on the login screen
- **THEN** a session is created and the user is redirected to their role-appropriate Dashboard

#### Scenario: Invalid login
- **WHEN** wrong credentials are submitted
- **THEN** the system displays "Invalid email or password" without revealing which field is wrong

#### Scenario: Forgot password
- **WHEN** a user clicks "Forgot password"
- **THEN** a password reset email is sent with a time-limited token

### Requirement: Session Validation
The system SHALL validate user sessions on every request and expire inactive sessions.

#### Scenario: Expired session
- **GIVEN** a session that has been inactive beyond the timeout threshold
- **WHEN** the user attempts any action
- **THEN** they are redirected to the login screen with a "Session expired" message

### Requirement: No Self-Role-Elevation
The system SHALL prevent any user from changing their own role at any time.

#### Scenario: API-level role change attempt
- **GIVEN** a logged-in Employee
- **WHEN** they submit a direct API call to change their role
- **THEN** the system rejects the request with 403 Forbidden
- **AND** the action is logged as a security event

## UI Layout (from Wireframe — Screen 1)

```
┌─────────────────────────────────────┐
│         AssetFlow - login           │  ← Title bar
├─────────────────────────────────────┤
│              ( AF )                 │  ← Logo circle
│                                     │
│  Email                              │
│  ┌─────────────────────────────┐    │
│  │ name@company.com            │    │
│  └─────────────────────────────┘    │
│                                     │
│  Password                           │
│  ┌─────────────────────────────┐    │
│  │ **********                  │    │
│  └─────────────────────────────┘    │
│                        Forgot password │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Log in               │    │
│  └─────────────────────────────┘    │
│                                     │
│  New here?                          │
│  Sign up creates an employee account│
│  admin roles assigned later         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     Create Account          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## Validation Rules

| Field    | Rule                                            |
|----------|-------------------------------------------------|
| Email    | Valid email format, unique in system             |
| Password | Min 8 chars, 1 uppercase, 1 number, 1 special   |
| Name     | Required, 2-100 characters                       |

## Error Messages

| Condition              | Message                                      |
|------------------------|----------------------------------------------|
| Invalid credentials    | "Invalid email or password"                  |
| Email already exists   | "An account with this email already exists"  |
| Weak password          | "Password must be at least 8 characters..."  |
| Session expired        | "Your session has expired. Please log in again" |
