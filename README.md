# GIGKROO — OpenSpec Documentation Index

> **Version**: Enterprise Master Plan v8.1 | Platform Blueprint v4.0 | PRD v4.0 | SAD v3.0
> **Status**: APPROVED — Development-Ready
> **Generated from**: 4 source documents (Master Plan, Blueprint, PRD, SAD)

---

## How to Use These Specs

These specifications are the **single source of truth** for all GIGKROO platform development. When building any feature:

1. **Start with** `00-overview.md` for product context
2. **Check** `17-business-rules.md` for non-negotiable rules and T&C clauses
3. **Find your module** in `15-platform-modules.md` for dependencies and phase
4. **Reference** the relevant feature spec for detailed logic
5. **Verify** RBAC access in `02-rbac-and-security.md` for every endpoint
6. **Check** DPDP compliance in `13-compliance-dpdp.md` for any PII handling

---

## Document Map

### Foundation
| # | Document | Contents |
|---|----------|----------|
| 00 | [overview.md](00-overview.md) | Project identity, 3 products, 13 Assured modules, 6 competitive moats, financial targets |
| 01 | [architecture.md](01-architecture.md) | Tech stack, AWS infrastructure, 7-layer security, API conventions, key constraints |
| 02 | [rbac-and-security.md](02-rbac-and-security.md) | 19 RBAC roles, role-to-endpoint matrix, JWT scope enforcement, MFA, encryption |

### Data & State
| # | Document | Contents |
|---|----------|----------|
| 03 | [database-schema.md](03-database-schema.md) | All marketplace + Assured tables with column types, constraints, indexes |
| 04 | [state-machines.md](04-state-machines.md) | Project, freelancer registration, Assured engagement, deliverable, regulatory change state machines |

### Features
| # | Document | Contents |
|---|----------|----------|
| 05 | [api-endpoints.md](05-api-endpoints.md) | All API endpoints — auth, freelancer, projects, Assured, disputes, admin, webhooks |
| 06 | [matching-engine.md](06-matching-engine.md) | 6 hard gates, 5-factor soft scoring, 3 matching modes, fallback chain, queue integration |
| 07 | [vdi.md](07-vdi.md) | VDI enforcement rules, session lifecycle, security controls, recording retention, DPDP compliance |
| 08 | [escrow-payments.md](08-escrow-payments.md) | 20% commission, escrow flow, dual approval, auto-accept, TDS, reconciliation, Assured billing |
| 09 | [kyc-and-assessment.md](09-kyc-and-assessment.md) | 4-step KYC, badge tiers, assessment system, Assured empanelment, Skill Passport |
| 10 | [assured-modules.md](10-assured-modules.md) | All 13 Assured modules (M1–M13), deliverables, guarantees, scope limitations, technical systems |
| 11 | [disputes.md](11-disputes.md) | D1–D25 dispute types, SLAs, auto-resolve logic, escalation matrix |

### Infrastructure
| # | Document | Contents |
|---|----------|----------|
| 12 | [queue-architecture.md](12-queue-architecture.md) | 9 SQS queues + DLQs, visibility timeouts, message schemas, SNS fan-out topics |
| 13 | [compliance-dpdp.md](13-compliance-dpdp.md) | DPDP Act 2023, data classification, consent records, DSAR, breach protocol, GDPR |
| 14 | [integrations.md](14-integrations.md) | 14 P1 integrations — UIDAI, Karza, RazorpayX, Rekognition, Digio, ClearTax, Mettl, etc. |

### Planning
| # | Document | Contents |
|---|----------|----------|
| 15 | [platform-modules.md](15-platform-modules.md) | All 36 platform modules with phase, tables, dependencies, rules |
| 16 | [implementation-phases.md](16-implementation-phases.md) | P0–P9 build phases with objectives, deliverable checklists, exit criteria |
| 17 | [business-rules.md](17-business-rules.md) | 10 non-negotiable rules, 18 T&C clauses, 45 loophole resolutions, risk register K9–K18 |
| 18 | [revenue-and-pricing.md](18-revenue-and-pricing.md) | 25 revenue streams, bundle pricing, gross margins, financial projections |

---

## Quick Reference — Non-Negotiable Rules

| # | Rule | Spec |
|---|------|------|
| 1 | Dispatch engine, NOT bidding | `17-business-rules.md` |
| 2 | GIGKROO Assured = GIGKROO is the vendor | `17-business-rules.md` |
| 3 | Commission = 20% FIXED | `08-escrow-payments.md` |
| 4 | VDI = MANDATORY (system-enforced) | `07-vdi.md` |
| 5 | TAT starts at `nda_executed_at` | `04-state-machines.md` |
| 6 | Audit logs immutable at DB layer | `03-database-schema.md` |
| 7 | BSE = marketplace only | `06-matching-engine.md` |
| 8 | Skill Passport = nanoid slug | `09-kyc-and-assessment.md` |
| 9 | Cold Start = round-robin | `06-matching-engine.md` |
| 10 | Datadog deployed FIRST | `01-architecture.md` |

---

## Source Documents

| Document | Path | Version |
|----------|------|---------|
| Master Plan | `docs/GIGKROO_Definitive_Master_Plan_v8_1.txt` | v8.1 |
| Platform Blueprint | `docs/Gigkroo_Platform_Blueprint_v4_0.txt` | v4.0 |
| PRD | `docs/Gigkroo_PRD_v4_0.txt` | v4.0 |
| SAD | `docs/Gigkroo_SAD_v3_0.txt` | v3.0 |
