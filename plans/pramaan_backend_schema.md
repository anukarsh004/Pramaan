# Pramaan — Complete Backend Schema
### AI-Powered Bid Compliance Verification Platform for GeM
Technical Blueprint for Implementation · v1.0

**Backend Technology:** Python 3.12 · **Framework:** FastAPI · **Database:** PostgreSQL 16 (+pgvector) · **Auth:** OIDC/OAuth2 via Keycloak (RBAC) · **Cache/Queue:** Redis · **Object Storage:** S3-compatible (MinIO → empanelled cloud) · **Team size:** 6 developers

---

## 1. Backend Overview

**Purpose.** Pramaan orchestrates a bounded pipeline — intake → AI document extraction → verification-adapter cross-check → deterministic rule evaluation → AI anomaly detection → scoring → AI-drafted recommendation → officer decision → immutable audit log — for every bidder on every GeM tender submitted to a CPSU (CPCL for the pilot).

**Architecture style.** Modular monolith. Six internal modules (Auth, Case/Workflow, Document/AI, Verification Adapters, Rule Engine, Audit) behind a single FastAPI app and API Gateway/BFF. Microservices are explicitly rejected for v1 (team size, operational overhead, and the fact that the whole pipeline shares one transactional boundary around a Bid Application). Revisit only at Phase 3 (multi-CPSU) if a module's load profile genuinely diverges from the rest.

**Database.** PostgreSQL as the single source of truth for structured data (bidders, tenders, checks, scores, decisions), plus `pgvector` for the modest amount of reference-text embeddings (tender clauses). Object storage is separate from the database — documents never touch Postgres as blobs.

**Authentication/Authorization.** Keycloak (OIDC/OAuth2) issues short-lived JWTs; the backend enforces RBAC at the API layer (never only in the UI) for four roles: `OFFICER`, `ADMIN`, `VIGILANCE` (read-only), `BIDDER`.

**External integrations.** All external statutory-data sources (Udyam, GSTN, PAN, MCA21, EPFO, ESIC, DigiLocker, NSIC, Startup India, BIS-DPIIT) sit behind a single `VerificationAdapter` interface. MVP ships mock adapters over seeded dummy data; Phase 2 swaps in live aggregator/API Setu adapters — same interface, same rule engine, same UI.

**AI services.** Claude Sonnet 5 (extraction, anomaly detection, recommendation drafting) with Claude Haiku 4.5 as a cheap first-pass extractor, escalating to Sonnet 5 on low confidence. AI is architecturally barred from writing to `bid_applications.status`; only an authenticated officer action can do that.

**File storage.** S3-compatible object storage, randomized keys, AES-256 at rest, malware-scanned before OCR ever touches a file.

**Background jobs.** Redis-backed queue (RQ/Celery) for OCR/extraction, adapter calls, and notification delivery — nothing in the synchronous request path blocks on an external call.

**Caching.** Redis for sessions, job queues, and idempotency keys; a per-tender prompt-cache key for the (mostly static) active rule set to cut LLM cost.

**Notifications.** Async email/SMS via a dedicated `NotificationService`, queued, never sent inline from a request handler.

---

## 2. Backend Architecture

```text
Client (Officer Dashboard / Bidder Portal / Admin Console — React SPA)
   ↓
API Gateway / BFF  (TLS, auth token validation, rate limiting)
   ↓
Middleware  (AuthN → AuthZ/RBAC → request validation → idempotency check)
   ↓
Controllers  (FastAPI routers — thin, no business logic)
   ↓
Services  (CaseService, DocumentService, VerificationService, RuleEngineService,
           AIReasoningService, ScoringService, DecisionService, AuditService,
           NotificationService)
   ↓
Repositories  (SQLAlchemy repositories — one per aggregate root)
   ↓
Database (PostgreSQL)         Object Storage (S3)         Redis (queue/cache)
```

With AI/external services:

```text
                         ┌── PostgreSQL (case/rule/audit data)
                         │
Client → API Gateway → CaseService ── VerificationAdapterLayer ── Mock Adapters (MVP)
                         │                                     └── Live Aggregator/API Setu (Phase 2+)
                         ├── AIReasoningService ── Claude Sonnet 5 / Haiku 4.5 (extraction, anomaly, recommendation)
                         ├── Object Storage (S3 — original documents)
                         └── AuditService ── hash-chained Audit Event Store
```

```mermaid
flowchart TD
    CLIENT["Client (React SPA)"] --> GW["API Gateway / BFF"]
    GW --> AUTH["Auth Middleware (Keycloak JWT + RBAC)"]
    AUTH --> CTRL["Controllers (FastAPI routers)"]
    CTRL --> CASESVC["Case & Workflow Service"]
    CASESVC --> DOCSVC["Document/AI Extraction Service"]
    CASESVC --> VERISVC["Verification Adapter Layer"]
    CASESVC --> RULESVC["Deterministic Rule Engine"]
    CASESVC --> AISVC["AI Reasoning Service (anomaly + recommendation)"]
    CASESVC --> SCORESVC["Scoring Service"]
    CASESVC --> DECSVC["Decision Service"]
    CASESVC --> AUDITSVC["Audit Service (hash-chained)"]
    DOCSVC --> REPO["Repository Layer"]
    VERISVC --> REPO
    RULESVC --> REPO
    SCORESVC --> REPO
    DECSVC --> REPO
    AUDITSVC --> REPO
    REPO --> DB[("PostgreSQL")]
    DOCSVC --> S3[("Object Storage")]
    CASESVC --> REDIS[("Redis: queue/cache/idempotency")]
```

**Layer responsibilities.**
- **Middleware:** token validation, role extraction, request-schema validation, idempotency-key check — all before a controller runs.
- **Controllers:** parse request → call one service method → shape response. No branching business logic.
- **Services:** own business rules, transaction boundaries, and orchestration across repositories/adapters/AI calls.
- **Repositories:** the only layer that writes SQL; own pagination, filtering, sorting, and transaction participation.
- **Database/External services:** PostgreSQL for transactional data; S3 for binaries; the Adapter Layer for anything outside the system boundary.

---

## 3. Backend Modules

| Module ID | Module | Purpose | Priority |
|---|---|---|---|
| MOD-001 | Auth | AuthN via Keycloak, RBAC enforcement, session/token handling | P0 |
| MOD-002 | Bidders & Tenders | Bidder/tender master data | P0 |
| MOD-003 | Case & Intake | Bid Application lifecycle, document intake | P0 |
| MOD-004 | Document/AI Extraction | OCR + LLM structured extraction | P0 |
| MOD-005 | Verification Adapters | Mock/live cross-checks against statutory sources | P0 |
| MOD-006 | Rule Engine | Deterministic tender-eligibility evaluation | P0 |
| MOD-007 | AI Reasoning | Anomaly detection + recommendation drafting | P0 |
| MOD-008 | Scoring | Compliance score + risk classification | P0 |
| MOD-009 | Blacklist/Debarment | Curated registry lookup | P0 |
| MOD-010 | Decision & Override | Officer decision workflow | P0 |
| MOD-011 | Audit | Hash-chained immutable event log | P0 |
| MOD-012 | Rule Configuration (Admin) | Tender-specific rule builder | P1 |
| MOD-013 | Notifications | Email/SMS reminders and alerts | P1 |
| MOD-014 | Analytics/MIS | Cycle-time and failure-reason reporting | P1 |
| MOD-015 | RBAC/User Management | Role assignment, officer/admin accounts | P1 |

For each module: responsibility, entities, APIs, business logic, and dependencies are detailed in §5, §14, §15, §18 respectively — module boundaries are enforced by keeping each module's repository and service classes in their own package, with cross-module calls only through service interfaces (never direct repository access across module lines).

---

## 4. Domain Model

**Core entities and lifecycle:**

```text
Bidder ──registers/updates──> (persistent across tenders)
Tender ──configured with──> EligibilityRuleSet
Bidder + Tender ──submits──> BidApplication (case)
BidApplication ──contains──> Document(s)
BidApplication ──generates──> ComplianceCheck(s) [one per CheckType from the rule set]
ComplianceCheck ──logged by──> VerificationSourceLog
BidApplication ──produces──> ComplianceScore
BidApplication ──resolved by──> Decision (by ProcurementOfficer)
BidApplication ──checked against──> BlacklistEntry
Every state change on the above ──> AuditEvent (hash-chained)
```

**Business rules baked into the domain model, not just the UI:**
- A `BidApplication` cannot reach `Closed` status without an associated `Decision` row (enforced by a DB trigger *and* the service layer — defense in depth).
- A `ComplianceScore` cannot exist without at least one `ComplianceCheck` (FK constraint).
- A `Document` is never overwritten — a resubmission creates a new versioned row; the prior version is retained.
- An `AuditEvent` is written in the *same transaction* as the state change it describes; if the audit write fails, the state change is rolled back (see §22).
- AI-authored content (`ComplianceCheck.evidence` from F5, `recommendation` text) is always tagged with its source (`AI` vs `RULE_ENGINE` vs `HUMAN`) so the officer UI can label it correctly and it can never be conflated with a deterministic result.

---

## 5. Database Schema

All tables use `uuid` primary keys (`gen_random_uuid()`), `created_at`/`updated_at` (`timestamptz`, default `now()`), and soft-delete via `deleted_at` (`timestamptz`, nullable) except `audit_events` (never deletable, soft or hard).

### `users`
**Purpose:** unified account table for Officer/Admin/Vigilance/Bidder roles, backed by Keycloak `sub` as external identity.

| Column | Type | Required | Default | Description |
|---|---|---|---|---|
| id | uuid | Y | gen_random_uuid() | PK |
| keycloak_sub | text | Y | — | Unique external identity id from Keycloak |
| email | text | Y | — | Unique |
| full_name | text | Y | — | Display name |
| role | enum(user_role) | Y | — | OFFICER / ADMIN / VIGILANCE / BIDDER |
| designation | text | N | null | e.g. "Senior Manager, Materials & Contracts" |
| department | text | N | null | e.g. "CPCL" |
| is_active | boolean | Y | true | Deactivation flag (never hard-delete a user) |
| mfa_enabled | boolean | Y | false | Enforced true for OFFICER/ADMIN at app layer |
| created_at | timestamptz | Y | now() | |
| updated_at | timestamptz | Y | now() | |

Constraints: unique(`keycloak_sub`), unique(`email`). Index: btree(`role`).

### `bidders`
**Purpose:** persistent bidder/vendor master record, one per legal entity.

| Column | Type | Required | Default | Description |
|---|---|---|---|---|
| id | uuid | Y | gen_random_uuid() | PK |
| legal_name | text | Y | — | As per PAN/GST |
| pan_number | text | Y | — | Unique, tokenized at rest (see §31) |
| gstin | text | N | null | |
| udyam_number | text | N | null | |
| cin | text | N | null | MCA21 CIN, if a company |
| registered_address | text | N | null | |
| user_id | uuid FK→users.id | N | null | Set once the bidder has a portal login |
| created_at | timestamptz | Y | now() | |
| updated_at | timestamptz | Y | now() | |

Constraints: unique(`pan_number`). Index: btree(`gstin`), btree(`udyam_number`).

### `tenders`
| Column | Type | Required | Default | Description |
|---|---|---|---|---|
| id | uuid | Y | gen_random_uuid() | PK |
| gem_bid_number | text | Y | — | Unique GeM identifier |
| title | text | Y | — | |
| category | text | Y | — | e.g. "Goods > ₹10L, MSE-reserved" |
| estimated_value | numeric(14,2) | N | null | |
| eligibility_rule_set_id | uuid FK→eligibility_rule_sets.id | N | null | Nullable until Admin configures rules (F12) |
| closing_date | date | Y | — | |
| created_by | uuid FK→users.id | Y | — | Admin who created it |
| created_at | timestamptz | Y | now() | |
| updated_at | timestamptz | Y | now() | |

Constraints: unique(`gem_bid_number`). Index: btree(`closing_date`).

### `eligibility_rule_sets` / `eligibility_rules` (F12)
`eligibility_rule_sets`: id, tender_category (text), version (int), is_active (boolean), created_by (FK users), created_at.
`eligibility_rules`: id, rule_set_id (FK), check_type_id (FK check_types), condition (jsonb — structured condition, e.g. `{"field":"udyam_category","op":"IN","value":["Micro","Small"]}`), severity_if_fail (enum: LOW/MEDIUM/HIGH), is_mandatory (boolean), created_at.

Rationale for `jsonb` condition: keeps the rule engine data-driven (no code deploy to add a rule) while still being queryable and validated at save-time (see §7, §10).

### `bid_applications`
| Column | Type | Required | Default | Description |
|---|---|---|---|---|
| id | uuid | Y | gen_random_uuid() | PK |
| bidder_id | uuid FK→bidders.id | Y | — | |
| tender_id | uuid FK→tenders.id | Y | — | |
| status | enum(app_status) | Y | 'intake_pending' | intake_pending / intake_complete / processing / ready_for_review / closed / reopened |
| submitted_at | timestamptz | N | null | |
| closed_at | timestamptz | N | null | |
| created_at | timestamptz | Y | now() | |
| updated_at | timestamptz | Y | now() | |

Constraints: unique(`bidder_id`,`tender_id`) — one active application per bidder per tender. Composite index: btree(`tender_id`,`bidder_id`).

### `documents`
| Column | Type | Required | Default | Description |
|---|---|---|---|---|
| id | uuid | Y | gen_random_uuid() | PK |
| application_id | uuid FK→bid_applications.id | Y | — | |
| doc_type | enum(doc_type) | Y | — | UDYAM / GST / PAN / MCA21 / EPFO / ESIC / OTHER |
| version | int | Y | 1 | Incremented on resubmission; prior versions retained |
| storage_uri | text | Y | — | S3 object key, never a public URL |
| extraction_status | enum(extraction_status) | Y | 'pending' | pending / success / failed / manual_entry |
| extracted_fields | jsonb | N | null | Structured output, schema-validated per doc_type |
| extraction_confidence | numeric(4,3) | N | null | 0–1 |
| uploaded_at | timestamptz | Y | now() | |
| uploaded_by | uuid FK→users.id | Y | — | |

Index: btree(`application_id`,`doc_type`,`version` desc).

### `check_types`
id, name (text, unique), source_system (enum: UDYAM/GSTN/PAN/MCA21/EPFO/ESIC/DIGILOCKER/NSIC/STARTUP_INDIA/BIS_DPIIT/BLACKLIST), mandatory (boolean), created_at.

### `compliance_checks`
| Column | Type | Required | Default | Description |
|---|---|---|---|---|
| id | uuid | Y | gen_random_uuid() | PK |
| application_id | uuid FK→bid_applications.id | Y | — | |
| check_type_id | uuid FK→check_types.id | Y | — | |
| result | enum(check_result) | Y | — | pass / fail / pending / not_evaluated |
| severity | enum(severity) | N | null | low / medium / high |
| source | enum(check_source) | Y | — | RULE_ENGINE / AI_ANOMALY / ADAPTER / BLACKLIST |
| evidence | jsonb | N | null | Cited field(s)/document(s)/source_region — mandatory if source=AI_ANOMALY |
| checked_at | timestamptz | Y | now() | |

Constraint: check(`source != 'AI_ANOMALY' OR evidence IS NOT NULL`) — enforces the "no unattributed AI claim" rule at the database level, not just app logic. Index: btree(`application_id`,`check_type_id`).

### `verification_source_logs`
id, check_id (FK compliance_checks), source_name (text), request_ref (text), response_hash (text — hash of raw adapter response, for tamper-evidence without storing raw PII redundantly), is_mock (boolean), called_at.

### `compliance_scores`
id, application_id (FK, unique — one-to-one), overall_score (int, 0–100), risk_level (enum: LOW/MEDIUM/HIGH/INCOMPLETE), score_breakdown (jsonb — per-check contribution), computed_at.

### `ai_recommendations`
id, application_id (FK), recommendation_text (text), suggested_action (enum: QUALIFY/DISQUALIFY/REQUEST_INFO), model_used (text, e.g. "claude-sonnet-5"), prompt_tokens (int), completion_tokens (int), generated_at.
*(Kept separate from `compliance_scores` so every AI draft — including superseded ones after a document resubmission — is retained for the evaluation loop in §11/§45, never overwritten.)*

### `decisions`
id, application_id (FK, unique per closure), officer_id (FK users), decision_value (enum: QUALIFY/DISQUALIFY/REQUEST_MORE_INFO), remarks (text), overrode_ai_recommendation (boolean), decided_at.
Constraint: check(`remarks IS NOT NULL OR overrode_ai_recommendation = false`) — remarks are mandatory whenever the officer disagrees with the AI (F10).

### `blacklist_entries`
id, pan_number (text, indexed, tokenized), reason (text), effective_from (date), effective_to (date, nullable), issuing_authority (text), source_refreshed_at (timestamptz — drives the "last refreshed" UI label), created_at.

### `audit_events`
| Column | Type | Required | Default | Description |
|---|---|---|---|---|
| id | uuid | Y | gen_random_uuid() | PK |
| application_id | uuid FK→bid_applications.id | Y | — | |
| actor | text | Y | — | user id or "SYSTEM" |
| action | text | Y | — | e.g. "DOCUMENT_UPLOADED", "DECISION_RECORDED" |
| before_state | jsonb | N | null | |
| after_state | jsonb | N | null | |
| prev_event_hash | text | N | null | null only for the first event of an application |
| event_hash | text | Y | — | sha256(prev_event_hash \|\| payload) |
| event_at | timestamptz | Y | now() | |

Table is `INSERT`-only at the DB grant level (no `UPDATE`/`DELETE` privilege granted to the app role) — immutability is enforced by database permissions, not just application discipline. Index: btree(`application_id`,`event_at`).

### `notifications`
id, user_id (FK), type (enum), payload (jsonb), status (enum: pending/sent/read), created_at, sent_at, read_at.

### `idempotency_keys`
key (text, PK), endpoint (text), request_hash (text), response_snapshot (jsonb), created_at, expires_at. TTL-cleaned via scheduled job.

---

## 6. Database Relationships

```mermaid
erDiagram
    USERS ||--o{ BIDDERS : "may own"
    USERS ||--o{ TENDERS : creates
    USERS ||--o{ DECISIONS : records
    BIDDERS ||--o{ BID_APPLICATIONS : submits
    TENDERS ||--o{ BID_APPLICATIONS : receives
    TENDERS ||--|| ELIGIBILITY_RULE_SETS : "configured with"
    ELIGIBILITY_RULE_SETS ||--o{ ELIGIBILITY_RULES : contains
    CHECK_TYPES ||--o{ ELIGIBILITY_RULES : referenced_by
    BID_APPLICATIONS ||--o{ DOCUMENTS : contains
    BID_APPLICATIONS ||--o{ COMPLIANCE_CHECKS : generates
    CHECK_TYPES ||--o{ COMPLIANCE_CHECKS : defines
    COMPLIANCE_CHECKS ||--o{ VERIFICATION_SOURCE_LOGS : "logged by"
    BID_APPLICATIONS ||--|| COMPLIANCE_SCORES : has
    BID_APPLICATIONS ||--o{ AI_RECOMMENDATIONS : receives
    BID_APPLICATIONS ||--o{ DECISIONS : "decided via"
    BID_APPLICATIONS ||--o{ AUDIT_EVENTS : produces
    BIDDERS ||--o{ BLACKLIST_ENTRIES : "checked against"
```

**Notable relationships:**
- `bidders 1—N bid_applications`: a bidder can bid on many tenders; each is a distinct case with its own document set and score.
- `bid_applications 1—1 compliance_scores`: exactly one current score per application (recomputed in place on document resubmission; history retained via `ai_recommendations` and `audit_events`, not by versioning the score row itself).
- `eligibility_rule_sets 1—N eligibility_rules`: many-to-many in effect between tenders and check types, mediated by rule sets so a rule set can be cloned/reused across similar tender categories (F12).
- `bid_applications 1—N audit_events`: every stage transition, without exception — this is the relationship the whole security/legal defensibility story (§30, §31) depends on.

---

## 7. Database Normalization

The schema targets **3NF** for all transactional tables:
- **1NF:** every column atomic; multi-valued data (extracted fields, rule conditions, score breakdowns) is intentionally `jsonb`, not because normalization was skipped but because that data is schema-per-document-type / schema-per-rule and doesn't benefit from being split into an EAV table — validated by a JSON Schema at the application layer instead.
- **2NF/3NF:** no partial or transitive dependencies — e.g., `bidders.legal_name` lives once, not duplicated onto every `bid_applications` row; `check_types` is factored out so `mandatory`/`source_system` aren't repeated per check.

**Deliberate denormalization (with justification):**
- `compliance_scores.score_breakdown` duplicates per-check contribution data already derivable from `compliance_checks` — justified because the Explainability View (F18) is read far more often than checks change, and recomputing the breakdown on every dashboard load would mean an N+1 join across `compliance_checks` for every case in a tender's list view.
- `verification_source_logs.response_hash` stores a hash rather than a foreign key back to a canonical "external response" table — there is no canonical store for third-party raw responses by design (data minimization, §34).

Referential integrity is enforced by FK constraints throughout, with `ON DELETE RESTRICT` on every FK into `audit_events`-adjacent tables (a bidder, tender, or application row is never hard-deleted while any dependent row exists) and soft-delete (`deleted_at`) as the only deletion path elsewhere.

---

## 8. Enums & Constants

```text
user_role: OFFICER, ADMIN, VIGILANCE, BIDDER
app_status: intake_pending, intake_complete, processing, ready_for_review, closed, reopened
doc_type: UDYAM, GST, PAN, MCA21, EPFO, ESIC, BLACKLIST_SUPPORT, OTHER
extraction_status: pending, success, failed, manual_entry
check_result: pass, fail, pending, not_evaluated
severity: low, medium, high
check_source: RULE_ENGINE, AI_ANOMALY, ADAPTER, BLACKLIST
decision_value: QUALIFY, DISQUALIFY, REQUEST_MORE_INFO
risk_level: LOW, MEDIUM, HIGH, INCOMPLETE
source_system: UDYAM, GSTN, PAN, MCA21, EPFO, ESIC, DIGILOCKER, NSIC, STARTUP_INDIA, BIS_DPIIT, BLACKLIST
notification_type: DOC_EXPIRING, CASE_PENDING, DECISION_REQUIRED, SOURCE_DEGRADED
```

Usage: `user_role` gates every RBAC middleware check (§13). `app_status` drives which controller actions are legal (§17, §18). `check_result`/`severity`/`check_source` together drive both the rule engine output (§4) and the schema constraint in §5 that ties `AI_ANOMALY` to mandatory evidence. `risk_level` is never set to a "false" high score — `INCOMPLETE` is a first-class value precisely so a partially-evaluated case can't misleadingly read as low-risk (F6 edge case).

---

## 9. Indexing Strategy

| Table | Column(s) | Index Type | Reason |
|---|---|---|---|
| bidders | pan_number | btree unique | Enforce uniqueness; primary lookup for blacklist/adapter calls |
| bid_applications | (tender_id, bidder_id) | btree unique composite | Officer Dashboard's per-tender bidder list; prevents duplicate cases |
| bid_applications | status | btree | Dashboard filters ("pending review") |
| documents | (application_id, doc_type, version desc) | btree composite | Fetch latest document per type for a case |
| compliance_checks | (application_id, check_type_id) | btree composite | Rule-engine re-evaluation and Explainability View lookups |
| compliance_checks | source | btree | Distinguish AI-authored vs deterministic checks in bulk queries |
| audit_events | (application_id, event_at) | btree composite | Chronological audit-trail reconstruction (§13, F11) |
| blacklist_entries | pan_number | btree | F8 lookup by PAN |
| tenders | closing_date | btree | Upcoming-deadline queries, notification scheduling |
| notifications | (user_id, status) | btree composite | "unread notifications for this user" |

Indexes are not created speculatively — each one above maps directly to a query already named in §13/§14. Foreign key columns not listed (e.g. `documents.application_id` alone) get Postgres's automatic FK index coverage where the composite above doesn't already include them as a leading column.

---

## 10. Migrations

- **Tool:** Alembic (pairs naturally with SQLAlchemy).
- **Versioning:** one migration file per schema change, auto-generated from model diffs then hand-reviewed (auto-generation misses `jsonb` check constraints and enum changes).
- **Rollbacks:** every migration implements both `upgrade()` and `downgrade()`; migrations touching `audit_events` are additive-only (new columns nullable, never a destructive `downgrade`) since that table's integrity guarantee must never be weakened, even temporarily during a rollback.
- **Seed data:** a `seed.py` script (idempotent, safe to re-run) loads: one ADMIN user, one OFFICER user, the dummy bidder/tender/document dataset with 2–3 planted inconsistencies (per PRD §21), and a starter `check_types` table.
- **Environments:** Dev applies migrations automatically on container start; Staging/Production require a manual promotion gate in CI/CD (§26) — migrations never auto-apply against real bidder data without a reviewed PR.
- **Safe schema change process for developers:** (1) write migration + downgrade, (2) run against a copy of staging data locally, (3) check the migration doesn't lock `audit_events` or `bid_applications` for more than a few seconds (use `CREATE INDEX CONCURRENTLY` for new indexes on those tables), (4) PR review required before merge to `main`.

---

## 11. User Model

The `users` table (§5) is deliberately thin — Keycloak owns credentials, sessions, and MFA; Postgres owns only the profile/role data the app needs to authorize and display.

**Sensitive fields never returned in a normal API response:** `keycloak_sub` (internal identity linkage only), and — on `bidders` — the raw (untokenized) `pan_number` is never returned in list views; detail views return a masked form (`XXXXX1234F`) unless the caller is OFFICER/ADMIN/VIGILANCE viewing that specific case, and even then the full value is logged as an access event.

**No password storage in this system at all** — authentication is fully delegated to Keycloak (Argon2/bcrypt-backed), per PRD §15.

---

## 12. Authentication Schema

Pramaan does not implement its own registration/login — Keycloak is the identity provider. The backend's job is token validation and role sync.

### Login (via Keycloak, backend validates)
```text
Client
↓
Redirect to Keycloak login (OIDC Authorization Code + PKCE)
↓
Keycloak validates credentials (+ MFA for OFFICER/ADMIN)
↓
Client receives id_token + access_token
↓
Client calls Pramaan API with Bearer access_token
↓
Auth Middleware validates JWT signature/expiry against Keycloak JWKS
↓
Middleware looks up/creates local `users` row by keycloak_sub (JIT provisioning)
↓
Request proceeds with role attached to request context
```

### Logout
Client calls Keycloak's end-session endpoint; Pramaan additionally revokes any server-side session cache entries in Redis keyed by the token's `jti`.

### Refresh token
Handled by the client directly against Keycloak's token endpoint; Pramaan never stores refresh tokens.

### Password reset / email verification / MFA
Delegated entirely to Keycloak's built-in flows — Pramaan has no code path that touches a password.

### Session expiration
Access tokens: 15 minutes. Refresh tokens: 8 hours (matches a working shift), configurable per role (BIDDER tokens shorter-lived than OFFICER for defense-in-depth given the portal is more internet-exposed).

### Account lockout
Configured in Keycloak (5 failed attempts → 15-minute lockout); Pramaan's Auth Middleware additionally logs an `AUTH_FAILURE` audit-adjacent security event (not tied to a `bid_application`, so stored in a separate `security_events` table, not `audit_events`) for anomaly-alerting (§31).

---

## 13. Authorization & RBAC

| Role | Resource | Create | Read | Update | Delete | Special Permission |
|---|---:|---:|---:|---:|---:|---|
| BIDDER | own bid_applications/documents | ✔ (own) | ✔ (own only) | ✔ (own, pre-close) | ✘ | Cannot view another bidder's case (403) |
| OFFICER | bid_applications, compliance_checks, decisions | ✘ | ✔ (assigned tenders) | ✔ (decision only) | ✘ | Can trigger re-verification; cannot edit rule sets |
| ADMIN | tenders, eligibility_rule_sets, check_types, users | ✔ | ✔ | ✔ | ✔ (soft) | Rule changes on tenders with active applications require second-approver (§31) |
| VIGILANCE | everything (read) | ✘ | ✔ | ✘ | ✘ | Read-only across all cases and audit trails |

**Authentication = identity** (who is this, verified by Keycloak). **Authorization = permission** (what can this identity do, enforced per-request by Pramaan's own middleware — never trust the JWT's role claim alone without re-checking resource ownership, e.g. a BIDDER token is valid but must still be checked against `bid_applications.bidder_id == current_user.bidder_id`).

**Required middleware, applied in order:** `AuthNMiddleware` (JWT validation) → `RoleMiddleware` (coarse role check against the endpoint's declared allowed roles) → `ResourceOwnershipMiddleware` (fine-grained: does this BIDDER own this application? is this OFFICER assigned to this tender's cases?) → controller.

---

## 14. API Structure

```text
/api/v1/
├── /auth/session          (token introspection, JIT profile sync)
├── /users
├── /bidders
├── /tenders
│   └── /{id}/eligibility-rules
├── /bid-applications
│   ├── /{id}/documents
│   ├── /{id}/extract
│   ├── /{id}/verify
│   ├── /{id}/compliance-score
│   └── /{id}/decision
├── /check-types
├── /blacklist
├── /audit
├── /notifications
└── /analytics
```

All endpoints versioned under `/api/v1/`; a breaking change ships as `/api/v2/` with the old version maintained per a documented deprecation window (minimum 6 months once real bidders depend on it).

---

## 15. API Specification

*(Representative subset — full spec covers every endpoint in §14 in this format.)*

### API-01 — Create Bid Application
- **Method / Endpoint:** `POST /api/v1/bid-applications`
- **Purpose:** Open a new compliance case for a bidder against a tender.
- **Auth:** Required (Bearer JWT). **Authorization:** OFFICER or SYSTEM (auto-created on GeM sync, Phase 2) — not BIDDER (a bidder's upload flow creates its own case implicitly via F1).
- **Request body:** `{"tender_id": "uuid", "bidder_id": "uuid"}`
- **Validation:** both IDs must reference existing, non-deleted rows; `tenders.closing_date` must not have passed unless `force=true` is set by an ADMIN (late-submission override, logged).
- **Business logic:** reject if a non-deleted application already exists for this (bidder, tender) pair (409); else create with `status='intake_pending'`.
- **DB operations:** `INSERT bid_applications`; `INSERT audit_events` (action=`CASE_CREATED`) in the same transaction.
- **Response (201):** `{"success": true, "data": {"application_id": "...", "status": "intake_pending"}}`
- **Errors:** 400 (bad IDs), 404 (tender/bidder not found), 409 (duplicate), 403 (role not permitted).

### API-02 — Upload Document
- **Method / Endpoint:** `POST /api/v1/bid-applications/{id}/documents`
- **Auth/Authz:** BIDDER (own case) or OFFICER.
- **Request:** multipart/form-data — file + `doc_type`.
- **Validation:** file type allow-list (`pdf`,`jpg`,`png`), max 10MB, malware scan (ClamAV) before persisting.
- **Business logic:** if a document of this `doc_type` already exists for the application, insert as `version = max(version)+1`; do not delete the prior row. Enqueue an async extraction job (F2).
- **DB operations:** `INSERT documents` (`extraction_status='pending'`); `INSERT audit_events` (`DOCUMENT_UPLOADED`).
- **Response (202):** `{"success": true, "data": {"document_id": "...", "extraction_status": "pending"}}` — 202 because extraction is async.
- **Errors:** 400 (invalid file/type), 413 (too large), 422 (malware detected), 404 (application not found or not owned by caller).

### API-03 — Trigger Verification Run
- **Method / Endpoint:** `POST /api/v1/bid-applications/{id}/verify`
- **Auth/Authz:** SYSTEM (auto-triggered after F2 completes) or OFFICER (manual re-run).
- **Business logic:** for every `eligibility_rule` on the tender's active rule set, invoke the corresponding `VerificationAdapter`; write one `compliance_check` row per rule with `result` and `source='ADAPTER'` or `'RULE_ENGINE'`; on adapter timeout, write `result='pending'`, never `'pass'`.
- **Response (202):** verification is async; caller polls `/compliance-score` or receives a webhook/notification.
- **Errors:** `SOURCE_UNAVAILABLE` (200-level partial success, some checks pending — not a hard error), 429 (adapter rate limit — queued, not dropped).

### API-04 — Record Officer Decision
- **Method / Endpoint:** `POST /api/v1/bid-applications/{id}/decision`
- **Auth/Authz:** OFFICER only.
- **Request:** `{"decision_value": "DISQUALIFY", "remarks": "string", "overrode_ai_recommendation": true}`
- **Validation:** `remarks` required if `overrode_ai_recommendation=true`; application must be in `ready_for_review` status (else 409).
- **Business logic:** insert `decisions` row; set `bid_applications.status='closed'`, `closed_at=now()`; write `audit_events` (`DECISION_RECORDED`) — all in one DB transaction (§22).
- **Response (200):** `{"success": true, "data": {"decision_id": "...", "case_status": "closed"}}`
- **Errors:** 400 (missing remarks on override), 403 (not the case's assigned officer, if assignment is enforced), 409 (case not ready / already closed).

*(APIs for tenders, eligibility-rules, blacklist, audit, notifications, analytics follow the same documentation shape and are omitted here for length — same rigor applies to every one.)*

---

## 16. Request & Response Standard

### Success
```json
{ "success": true, "data": { }, "message": "Operation successful" }
```

### Error
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [] } }
```

### Status code usage
| Code | When |
|---|---|
| 200 | Successful read/update |
| 201 | Resource created (e.g., bid application) |
| 202 | Accepted for async processing (extraction, verification) |
| 204 | Successful delete/no content (e.g., notification dismissed) |
| 400 | Malformed request / failed validation |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated but not authorized for this resource |
| 404 | Resource not found (or hidden from this role — never leak existence across bidders) |
| 409 | Conflict (duplicate application, case already closed) |
| 422 | Semantically invalid (malware detected, schema-valid but business-invalid) |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error (never exposes stack trace) |
| 503 | Dependent service unavailable (e.g., all adapters down) |

---

## 17. Validation Schema

Validation is layered: **Client (UX only) → API (Pydantic models) → Business Logic (service-layer rules) → Database (constraints)** — the API and DB layers are the ones that actually matter; client-side validation is never trusted.

Representative field specs:

```text
tender.gem_bid_number:
  required = true, type = string, maxLength = 64, unique = true,
  format = ^[A-Z0-9/-]+$

bidder.pan_number:
  required = true, type = string, format = ^[A-Z]{5}[0-9]{4}[A-Z]{1}$,
  unique = true, sanitization = uppercase-trim

document.doc_type:
  required = true, type = enum, allowed = [UDYAM,GST,PAN,MCA21,EPFO,ESIC,BLACKLIST_SUPPORT,OTHER]

decision.remarks:
  required = conditional (true if overrode_ai_recommendation = true),
  type = string, minLength = 10, maxLength = 2000

eligibility_rule.condition:
  required = true, type = jsonb, validated against a JSON Schema per
  check_type (rejects unknown operators, e.g. only IN/EQ/GTE/LTE/FUZZY_MATCH allowed)
```

Every important input in §13's API spec gets an equivalent entry; PAN/GSTIN/Udyam formats are validated against their published statutory formats, not just "non-empty string."

---

## 18. Business Logic

### Workflow: Create Bid Application → Full Pipeline (Flow A)
```text
Input: tender_id, bidder_id (or bidder-initiated upload)
↓
Validate tender is open (closing_date not passed) and rule set exists
↓
Business Rule: one active application per (bidder, tender)
↓
Create bid_application (status=intake_pending)
↓
[Documents uploaded → F2 extraction → F3 adapter checks → F4 rule
 evaluation → F5 anomaly detection → F6 scoring → F7 recommendation]
↓
External Service: Claude Sonnet 5/Haiku 4.5 for F2/F5/F7; Verification
 Adapters for F3
↓
Result: bid_application.status → ready_for_review; officer notified
```

### Workflow: Officer Decision
```text
Input: application_id, decision_value, remarks?
↓
Validate: application.status == ready_for_review
↓
Business Rule: remarks mandatory if overriding AI recommendation
↓
Database Operation: INSERT decision + UPDATE application.status=closed
  (single transaction with audit event — see §22)
↓
Result: case closed, bidder notified, audit trail finalized for this case
```

Every workflow in F1–F11 is implemented as a service-layer method following this same Input → Validation → Business Rule → DB Operation → External Service → Result shape, kept out of controllers (§20) and out of raw SQL (§21).

---

## 19. Service Layer

```text
AuthService         — token/role resolution, JIT user provisioning
BidderService        — bidder CRUD, PAN/GST format checks
TenderService        — tender CRUD, rule-set assignment
CaseService          — bid_application lifecycle, orchestrates the pipeline
DocumentService      — upload handling, versioning, malware scan trigger
ExtractionService    — OCR + LLM extraction (F2), confidence scoring
VerificationService  — Adapter Layer orchestration (F3)
RuleEngineService     — deterministic evaluation (F4)
AIReasoningService    — anomaly detection (F5) + recommendation drafting (F7)
ScoringService        — compliance score + risk classification (F6)
BlacklistService      — registry lookup (F8)
DecisionService        — officer decision + override capture (F10)
AuditService           — hash-chained event writing and verification (F11)
NotificationService    — async email/SMS dispatch (F13)
AnalyticsService       — MIS aggregation queries (F15)
```

Each service: owns its transaction boundary (via a unit-of-work pattern), depends only on repositories and other services (never on controllers), never constructs raw SQL (delegates to repositories), and wraps every external call (adapter, LLM, notification provider) in a retry-with-backoff + explicit failure state (never a silent swallow — see §33).

---

## 20. Controller Layer

```text
Request
↓
Pydantic request-model validation (automatic via FastAPI)
↓
AuthN/AuthZ (dependency-injected middleware)
↓
Service call (single method, e.g. case_service.create_application(...))
↓
Response model serialization
```

Controllers contain **no** business logic — no conditional eligibility checks, no direct repository/database calls, no LLM calls. A controller that grows an `if` statement beyond routing/authorization concerns is a signal that logic belongs in the service layer instead. This separation is what makes the rule engine and AI layer independently testable without spinning up the HTTP layer.

---

## 21. Repository / Data Access Layer

```text
BidApplicationRepository
  - create(bidder_id, tender_id) -> BidApplication
  - get_by_id(id) -> BidApplication | None
  - list_by_tender(tender_id, status=None, page, limit) -> Page[BidApplication]
  - update_status(id, new_status) -> None

DocumentRepository
  - create_version(application_id, doc_type, storage_uri) -> Document
  - get_latest(application_id, doc_type) -> Document | None
  - list_by_application(application_id) -> list[Document]

ComplianceCheckRepository
  - upsert_result(application_id, check_type_id, result, source, evidence=None)
  - list_by_application(application_id) -> list[ComplianceCheck]

AuditEventRepository
  - append(application_id, actor, action, before, after) -> AuditEvent
    # computes event_hash from prev_event_hash + payload; append-only
  - list_by_application(application_id, since=None) -> list[AuditEvent]
```

**Cross-cutting responsibilities:** every `list_*` method supports pagination (§23) and takes explicit `filters`/`sort` parameters (§24) rather than accepting raw query strings; every `create`/`update` participates in the caller's transaction (passed-in session, never opening its own) so service-layer transactions (§22) actually span multiple repository calls atomically.

---

## 22. Transaction Management

**Operations requiring atomicity (all-or-nothing):**

```text
Record Officer Decision
↓
INSERT decisions row
↓
UPDATE bid_applications.status = 'closed'
↓
INSERT audit_events (DECISION_RECORDED)
↓
(all three succeed together, or none do)
```

```text
Compute Compliance Score
↓
INSERT/UPDATE compliance_scores
↓
INSERT audit_events (SCORE_COMPUTED)
↓
(atomic — a score is never visible without its audit trail entry)
```

**Rule:** any write to `bid_applications`, `decisions`, `compliance_checks`, or `compliance_scores` is *always* paired with an `audit_events` write in the same DB transaction. If the audit insert fails, the whole transaction rolls back — per §30/F11's acceptance criteria, a state change without a corresponding audit event is a system failure, not an acceptable degradation. This is enforced by a service-layer `UnitOfWork` context manager wrapping both writes, not left to developer discipline per call site.

External calls (LLM, adapters, notification providers) are **never** inside a DB transaction — those go through the async job queue (§27) so a slow/failed external call can't hold a DB lock.

---

## 23. Pagination

**Choice: offset pagination** for all list endpoints (`/bid-applications`, `/audit/{id}`, `/tenders/{id}/eligibility-rules`) — justified because CPCL's pilot scale (hundreds, not millions, of cases per tender) doesn't need cursor pagination's complexity, and officers expect page numbers ("page 2 of 5") over infinite scroll for a review workflow.

```text
GET /api/v1/bid-applications?tender_id=...&page=1&limit=20
```

**Maximum page size:** 100 (requests for `limit>100` are clamped, not rejected, to keep the API forgiving). Default `limit=20`. Response includes `{"page":1,"limit":20,"total":137,"data":[...]}`.

Exception: `/audit/{application_id}` uses **cursor pagination** (`?cursor=<event_id>&limit=50`) — audit trails are append-only and can grow unbounded for a long-lived case, and cursor pagination avoids the "page 3 shifted because a new event was appended" problem offset pagination has on a live-growing list.

---

## 24. Search & Filtering

```text
GET /api/v1/bid-applications
  ?tender_id=...
  &status=ready_for_review
  &risk_level=HIGH
  &q=<bidder legal_name substring, case-insensitive>
  &sort=submitted_at
  &order=desc
  &page=1&limit=20
```

- **Search fields:** `bidders.legal_name` (case-insensitive `ILIKE`, partial match) — full-text search is not justified at this data volume; a trigram index (`pg_trgm`) backs this for performance if `ILIKE '%...%'` scans become slow at scale.
- **Filters:** `status`, `risk_level`, `tender_id`, `doc_type` (on `/documents`), `check_type_id` (on `/compliance-checks`).
- **Sorting:** allow-listed columns only (`submitted_at`, `overall_score`, `legal_name`) — never accept an arbitrary `sort` value that gets interpolated into SQL (prevents SQL injection via the sort parameter, a commonly-missed vector).

---

## 25. File Storage

- **Upload API:** `POST /bid-applications/{id}/documents`, multipart, per §15 API-02.
- **File types:** `pdf`, `jpg`, `jpeg`, `png` only — allow-list, never a deny-list; extension is re-verified against actual file magic bytes server-side (never trust the client-reported extension or MIME type, per PRD §25).
- **Maximum size:** 10MB per document.
- **Storage provider:** MinIO (MVP) → empanelled-cloud S3-compatible storage (pilot/production).
- **File metadata table:** `documents` (§5) — `storage_uri` is a randomized, non-guessable object key, never derived from the bidder's name or PAN.
- **Access control:** object storage bucket is private; the API issues short-lived pre-signed URLs (5-minute expiry) for an authorized viewer, never a permanent public link.
- **File scanning:** ClamAV scan on upload, before the file is persisted to its final bucket location (staged in a quarantine bucket first, moved only after a clean scan).
- **Processing:** OCR/extraction reads from the final bucket location asynchronously.
- **Download:** pre-signed URL, logged as an audit event (`DOCUMENT_ACCESSED`) when accessed by anyone other than the uploading bidder.
- **Deletion:** documents are never hard-deleted while the case is active or within the statutory retention window (§12 of PRD); DPDPA erasure requests are a reviewed exception process, not an API-triggered delete.
- **Retention:** aligned to CVC/GFR procurement record-retention norms; archival to cold storage after the tender's retention period (§48).

---

## 26. AI Backend

```text
User/System Request (document uploaded / verification complete)
↓
API (async job enqueued, not a blocking call)
↓
AIReasoningService
↓
Input Validation (document exists, extraction_status != 'failed' before anomaly detection runs)
↓
Context Retrieval (this case's own extracted fields + this tender's active
 rule set + this case's own prior AI outputs — never another case's data, §11 PRD)
↓
Prompt Construction (per-task schema, explicit citation requirement)
↓
LLM Call (Claude Haiku 4.5 first pass → escalate to Sonnet 5 on low
 confidence, per model-provider abstraction in §19)
↓
Structured Output Validation (strict JSON Schema per task; on failure,
 retry once, then fall back to "manual review required" — never a
 partially-parsed guess)
↓
Business Rule Validation (an AI_ANOMALY check without evidence is
 rejected by the DB constraint in §5, not just app code)
↓
Database (compliance_checks / ai_recommendations, §5)
↓
Response (surfaced to officer, always labeled "AI-drafted")
```

- **AI service:** internal `LLMClientInterface` abstraction — Anthropic Claude today, swappable without touching `AIReasoningService`'s callers (§38 exit strategy).
- **Model provider:** Anthropic (Claude Sonnet 5 / Haiku 4.5), pricing/availability re-verified before each budget cycle (rates change).
- **Prompt management:** versioned prompt templates per task (`extraction/udyam.jinja2`, `anomaly_detection.jinja2`, `recommendation.jinja2`), stored in-repo, not hardcoded inline — enables the golden-test-set evaluation in §45 to be re-run against a specific prompt version.
- **Context retrieval / RAG:** minimal — tender eligibility rules are structured data (§5), not free text needing retrieval; a future `pgvector`-backed lookup over GFR/CVC guideline text is a stretch enhancement for the Admin rule-authoring UI only, never part of the core verification path.
- **Embeddings/vector DB:** `pgvector` on the primary Postgres instance — no dedicated vector database is justified at this text volume.
- **Tool/function calling:** the AI layer only calls internal tools — `get_extracted_document(doc_id)`, `get_rule_engine_result(check_id)`, `get_prior_case_notes(case_id)` — never a raw external API directly; this keeps the LLM's context restricted to already-validated internal data.
- **Output validation:** every response validated against a per-task JSON Schema before it touches the database; failure → retry once → fallback to a `not_evaluated`/`extraction_failed` state.
- **AI request logging:** every LLM call is itself logged (`ai_recommendations` for outputs; a lighter `ai_call_logs` table for token counts/latency/model version) — necessary for §34's "what left the system boundary" requirement.
- **Token/cost tracking:** `prompt_tokens`/`completion_tokens` stored per call; aggregated in Analytics (§14 PRD F15) for cost monitoring (§27 PRD).
- **Retry strategy:** one retry on schema-validation failure, exponential backoff on transient API errors (timeouts, 5xx), circuit-breaker after N consecutive failures to avoid hammering a degraded provider.
- **Rate limiting:** per-application and global rate limits on LLM calls to control cost and stay within provider quotas (§32).

**Hard rule, enforced architecturally, not by convention:** no code path exists from an AI output directly to `bid_applications.status`. Only `DecisionService.record_decision()`, called from an OFFICER-authenticated request, can transition a case to `closed`.

---

## 27. Background Jobs

Tasks that must not block the request/response cycle: document extraction (F2), verification adapter calls (F3), AI anomaly detection (F5), AI recommendation drafting (F7), notification delivery (F13), analytics aggregation (F15).

```text
API (enqueues job, returns 202 immediately)
↓
Redis Queue (RQ or Celery)
↓
Worker process (separate from the API process, horizontally scalable)
↓
Processing (OCR call / adapter call / LLM call)
↓
Database (result written via the same repository layer as sync code)
↓
Notification (officer/bidder notified of stage completion, or of a failure needing attention)
```

- **Queue technology:** Redis + RQ (simpler ops for a 6-person team) or Celery if job routing complexity grows.
- **Job structure:** one job per pipeline stage per document/application — `extract_document(document_id)`, `run_verification(application_id)`, `detect_anomalies(application_id)`, `draft_recommendation(application_id)` — chained via job dependencies, not one giant job.
- **Retry count:** 3 attempts with exponential backoff for transient failures (network timeout to an adapter/LLM provider); non-retryable failures (malformed file, schema-validation failure after its own internal retry) go straight to a failed state visible to the officer.
- **Failure handling:** every job failure updates the relevant row's status field (`extraction_status='failed'`, `check_result='pending'`) — never leaves a silent gap.
- **Dead-letter strategy:** after exhausting retries, the job payload is moved to a dead-letter queue and an ops alert fires (§34); the case itself is not blocked — the officer sees the specific stage as failed/pending, per PRD §17.

---

## 28. Caching

**Cacheable data:**
- Active `eligibility_rule_set` per tender (read far more often than it changes — an admin edits it rarely; hundreds of bid applications on the same tender read it identically).
- LLM prompt-cache bookkeeping for the tender's rule-set text (cuts token cost per PRD §11/§27).
- `check_types` reference table (near-static).

**Not cached:** `bid_applications.status`, `compliance_scores`, anything an officer is actively deciding against — these must always reflect the current DB state; caching them risks an officer acting on stale risk data, which is an unacceptable trade for the latency savings.

```text
GET Tender Eligibility Rules
↓
Check Redis cache (key: rule_set:{tender_id}:{version})
↓
Cache Hit → Return
↓
Cache Miss → Query PostgreSQL
↓
Store in Redis (TTL 1 hour, or invalidated explicitly on rule update)
↓
Return
```

- **Cache technology:** Redis. **TTL:** 1 hour for rule sets, invalidated immediately (not just TTL-expired) on any `PUT /tenders/{id}/eligibility-rules` write. **Fallback:** on Redis unavailability, fall through to Postgres directly (degraded latency, not degraded correctness).

---

## 29. Notification Backend

```text
Event (document nearing expiry / case ready for review / adapter source degraded)
↓
NotificationService.enqueue(user_id, type, payload)
↓
Redis Queue
↓
Provider (email via SMTP/SES-equivalent; SMS via a gateway — Phase 2)
↓
Delivery
↓
Status update on notifications row (sent / failed)
```

Channels: in-app (always, via the `notifications` table + a lightweight polling/websocket read on the dashboard), email (officer/admin/bidder), SMS (bidder-facing document-expiry reminders, Phase 2). A `notifications` row is created for every dispatch attempt regardless of channel, so delivery status is queryable and auditable.

---

## 30. Audit Logging

**Actions requiring an audit event (non-exhaustive — see §4 for the "every write" rule):** login/logout (security_events, adjacent table), case creation, document upload/resubmission, extraction completion/failure, adapter call completion, rule evaluation, AI recommendation generation, score computation, officer decision (including overrides), rule-set changes (F12), blacklist registry refresh, case reopen.

| Field | Purpose |
|---|---|
| actor | Who performed the action (user id, or "SYSTEM" for automated pipeline stages) |
| action | What happened (`DOCUMENT_UPLOADED`, `DECISION_RECORDED`, etc.) |
| resource / application_id | What was affected |
| before_state / after_state | Diff-able snapshot for reconstruction |
| event_at | When |
| metadata | Additional context (e.g., which AI model version produced a flagged output) |

**Never logged in `audit_events` metadata:** raw PAN/Aadhaar values (store a masked reference instead), raw LLM prompt/response bodies (store a hash + pointer to the `ai_recommendations` row instead, which itself is access-controlled) — audit logs must be reconstructable without becoming a second, less-controlled copy of sensitive PII (§35).

---

## 31. Security Architecture

| Threat | Attack | Impact | Mitigation |
|---|---|---|---|
| Credential compromise | Phished/stolen officer credentials | Unauthorized case access/decisions | Keycloak MFA on OFFICER/ADMIN, short-lived tokens, anomaly alerts on unusual access patterns |
| SQL injection | Malicious input in search/sort params | Data breach/corruption | ORM-parameterized queries only; sort/filter fields allow-listed (§24), never raw SQL interpolation |
| XSS | Malicious script in an uploaded document's metadata or bidder-entered text | Session hijack in the React SPA | React's default escaping + strict CSP headers; extracted fields rendered as text, never `dangerouslySetInnerHTML` |
| CSRF | Forged state-changing request | Unauthorized decision recorded | CSRF tokens on state-changing requests; SameSite cookies where cookies are used at all (primarily bearer-token auth, which is inherently less CSRF-exposed) |
| Malicious file upload | Executable/exploit disguised as a certificate PDF | Server compromise | Type allow-list + magic-byte verification + ClamAV scan before the file ever reaches OCR (§25) |
| Prompt injection | Document text instructing the LLM to alter its output | A manipulated AI flag/recommendation | Strict output-schema validation (§26); rule engine always wins over AI judgment; AI can never write case status |
| Insider misuse | Admin quietly relaxes a rule to qualify a specific bidder | Corrupted eligibility decision | Second-approver requirement for rule changes on a tender with active applications; all rule changes audit-logged |
| Data exfiltration | Bulk API scraping of case data | Bidder PII exposure | Per-user rate limiting (§32), audit alerts on abnormal export volume |
| Brute force | Repeated login attempts | Account takeover | Keycloak lockout policy + rate-limited login endpoint |
| API abuse | Automated scripted access bypassing UI | Resource exhaustion / data scraping | Global + per-endpoint rate limits, WAF at the gateway |

Cross-cutting: TLS 1.2+ everywhere, AES-256 at rest, secrets in a KMS/Vault (never in code/config), dependency vulnerability scanning in CI (§26), structured logs with PII redaction by default.

---

## 32. Rate Limiting

| Endpoint class | Limit |
|---|---|
| Login/auth (via Keycloak, mirrored at gateway) | 5/min per IP |
| Document upload | 20/hour per bidder |
| Verification trigger (`/verify`) | 10/hour per application (prevents adapter-quota burn from repeated manual re-runs) |
| AI extraction/anomaly/recommendation calls | Global budget cap per day (cost control, §27 PRD), plus 30/hour per application |
| Public/general read APIs | 300/min per authenticated user |
| Search (`?q=`) | 60/min per user |

**On limit exceeded:** `429` with a `Retry-After` header; sensitive endpoints (login, decision recording) queue rather than hard-fail where safe to do so (e.g., a verification trigger queues rather than dropping), while auth endpoints hard-fail to avoid masking a brute-force attempt as a retryable condition.

---

## 33. Error Handling

```text
Request
↓
Exception raised in service/repository layer
↓
Centralized FastAPI exception handler (one handler per exception class:
 ValidationError, NotFoundError, ConflictError, AuthzError, ExternalServiceError)
↓
Error Classification (user-facing message vs. internal detail)
↓
Safe Response (standard error envelope, §16 — no stack trace, no SQL, no
 internal file paths)
↓
Logging (full internal detail + stack trace to structured logs, correlated
 by a request_id that IS returned to the client for support purposes)
```

Internal error detail (stack traces, raw exception messages, DB constraint names) is logged server-side only; the client always receives the standard `{"success": false, "error": {...}}` envelope with a generic, safe `message` and a `request_id` they can quote to support (§40).

---

## 34. Observability

- **Logs:** structured JSON, correlated by `request_id`, PII-redacted by default (§35), shipped to Loki/ELK.
- **Metrics:** Prometheus — request latency (p50/p95/p99) per endpoint, error rate per pipeline stage, DB query latency, queue depth, LLM call latency/cost, adapter call success rate.
- **Traces:** OpenTelemetry spans across Controller → Service → Repository/External-call boundaries, so a slow case can be traced to the specific pipeline stage.
- **Dashboards:** Grafana — one for API health, one for pipeline-stage health (extraction success rate, adapter availability, AI schema-validation failure rate), one for cost (LLM token spend, adapter call volume).
- **Alerts:** error rate spike, queue depth growth (jobs backing up), adapter source down > 15 min, LLM cost anomaly, audit hash-chain integrity failure (§31 — should never fire; treated as a P0 page if it does).

---

## 35. Data Privacy

- **Personal data:** bidder legal name, PAN, GSTIN, Udyam number, CIN, registered address; officer/admin name and email.
- **Sensitive data:** PAN (tokenized at rest per §31/§34 of PRD), any Aadhaar-linked identifier surfaced via a future DigiLocker integration (Phase 2+).
- **Never logged (application logs, not the access-controlled audit store):** raw PAN/Aadhaar values, raw LLM prompt/response bodies, uploaded document contents.
- **Data retention:** aligned to CVC/GFR procurement norms; audit events retained permanently in the append-only store even after case data is archived to cold storage (§48).
- **Data deletion/export:** DPDPA data-principal requests routed through the Grievance Officer process (§35 PRD addendum), never a direct API-triggered hard delete on a case with an active or reviewable decision.
- **Access control:** RBAC (§13) plus row-level ownership checks (a bidder can never read another bidder's case, enforced in the repository layer, not just the controller).
- **Encryption:** AES-256 at rest (DB and object storage), TLS 1.2+ in transit, field-level tokenization for PAN.

---

## 36. API Security

- **Authentication middleware:** JWT validation against Keycloak JWKS on every request except `/health`.
- **Authorization middleware:** role check + resource-ownership check (§13), applied before any controller logic runs.
- **Request validation:** Pydantic models on every endpoint — rejects unexpected fields, wrong types, out-of-range values before business logic ever sees the payload.
- **Rate limiting:** §32.
- **CORS:** allow-list of known frontend origins only (no wildcard `*`) — Officer Dashboard, Bidder Portal, Admin Console domains.
- **API versioning:** `/api/v1/` (§14).
- **API keys:** for SYSTEM-to-SYSTEM calls (e.g., a future GeM sync job), a separate service-account JWT with a narrowly-scoped role, not a shared static key.
- **Request size limits:** 10MB body cap (matches the document upload limit); JSON bodies capped far lower (e.g., 1MB) since only document upload needs the large limit.
- **Idempotency:** required on `POST /bid-applications`, `POST /bid-applications/{id}/decision`, and any adapter-triggering endpoint (§37).

---

## 37. Idempotency

**Operations that could accidentally execute twice:** case creation (double-click "submit"), officer decision recording (double-submit under network lag), verification-adapter triggers (a retried request re-billing a metered aggregator call), notification dispatch.

```text
Client sends Idempotency-Key header (client-generated UUID) on the request
↓
Middleware checks idempotency_keys table for (key, endpoint, request_hash)
↓
Already Processed → Return the stored previous response verbatim (same
  status code, same body) — the operation is NOT re-executed
↓
New Request → Process normally, then store the response snapshot keyed
  by (idempotency_key, endpoint) before returning it, TTL 24h
```

Decision recording specifically also has a natural idempotency guard beyond the header: `bid_applications.status` transitions are checked (`ready_for_review → closed` only), so even without a client-supplied key, a duplicate decision POST after the first succeeded gets a clean `409`, not a corrupted double-decision.

---

## 38. Concurrency & Race Conditions

**Operations where multiple actors could update the same data:**
- Two officers opening the same case simultaneously and both attempting to record a decision → `bid_applications.status` transition uses an optimistic-locking `WHERE status='ready_for_review'` clause on the `UPDATE`; the second writer's `UPDATE` affects zero rows, service layer detects this and returns `409 Conflict` ("already decided by another officer").
- A bidder resubmitting a document while extraction on the prior version is still running → `documents.version` is assigned via `INSERT ... SELECT max(version)+1 ...` inside a `SERIALIZABLE`-isolated transaction (or a DB-level unique constraint on `(application_id, doc_type, version)` with retry-on-conflict) to avoid two concurrent uploads landing on the same version number.
- Two admins editing the same tender's rule set concurrently → rule sets are versioned (`eligibility_rule_sets.version`); a save includes the version it was read at, and a mismatch at write time is a `409` requiring the admin to reload and reapply changes (optimistic concurrency, not row locking, since rule edits are infrequent and interactive).
- Blacklist registry refresh running while a check is being evaluated → the check reads a specific `blacklist_entries.source_refreshed_at` snapshot, so a case's evaluation is internally consistent even if the registry updates mid-evaluation; the next re-verification picks up the newer data.

Chosen strategy overall: **optimistic locking** (version/status-guarded updates) over row-level pessimistic locking — this system's contention is rare-but-possible (single officer per case in normal operation), so optimistic locking avoids unnecessary lock contention while still catching the genuine race conditions above.

---

## 39. Webhooks

No inbound webhooks in the MVP (all adapters are request/response, mock or live-aggregator-polled). Phase 2+ (live DigiLocker consent-based fetch, or a future GeM-initiated tender sync) will receive webhooks; the required handling, specified now so it's ready when needed:

- **Endpoint:** `POST /api/v1/webhooks/{source}` (one per integration partner).
- **Authentication/signature verification:** HMAC signature validated against a per-partner shared secret before the payload is parsed at all — an unsigned or badly-signed webhook is rejected with `401` and never touches business logic.
- **Payload validation:** strict schema per source, same rigor as §17.
- **Idempotency:** partner-supplied event ID checked against a `webhook_events` dedup table before processing (mirrors §37).
- **Processing:** enqueued to the background job system (§27), never processed synchronously in the webhook handler (must return fast to avoid the partner's own retry/timeout logic firing).
- **Retry/failure handling:** if processing fails after the webhook is accepted, the job's own retry/dead-letter path (§27) applies — the webhook response to the partner is not held open waiting for internal processing to finish.

---

## 40. Third-Party Integrations

| Integration | Purpose | Authentication | API | Failure Strategy | Retry |
|---|---|---|---|---|---|
| Keycloak | Identity/SSO | OIDC client credentials | REST/OIDC | Circuit-break on repeated auth-service errors; block login, don't fail open | 3x backoff |
| Claude API (Anthropic) | Document extraction, anomaly detection, recommendation drafting | API key (server-side only, never client-exposed) | REST | Schema-validation retry once → manual-review fallback (§26) | 3x backoff on 5xx/timeout |
| KYC/KYB Aggregator (Setu/Decentro, Phase 2) | Live PAN/GST/Udyam/MCA21 verification | API key / OAuth per provider | REST | Mark check "pending — source unreachable"; never default to pass | 3x backoff, then dead-letter + ops alert |
| API Setu (MeitY, Phase 2/3) | EPFO/ESIC/other government KYC sources | Departmental approval + API key | REST | Same as above | Same as above |
| DigiLocker (Phase 2+) | Consent-based document fetch | Partner Organisation OAuth | REST | Fall back to manual upload path | 2x, then manual fallback |
| Email/SMS provider | Notifications | API key | REST | Queue for later retry; never block case processing on notification failure | 5x backoff over 24h |
| ClamAV | Malware scanning | Local/internal service | Socket/REST | Fail closed — an unscannable file is rejected, never persisted unscanned | 2x, then reject |

Only integrations with a genuine current need are included — the full 11-source live integration list from the original problem statement is deliberately phased (PRD §22), not built as day-one dependencies.

---

## 41. Environment Configuration

```text
# Database
DATABASE_URL=postgresql://user:pass@host:5432/pramaan

# Auth
KEYCLOAK_URL=
KEYCLOAK_REALM=
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=

# AI
ANTHROPIC_API_KEY=
AI_MODEL_PRIMARY=claude-sonnet-5
AI_MODEL_FALLBACK=claude-haiku-4-5-20251001

# Storage
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

# Queue/Cache
REDIS_URL=

# Adapters (Phase 2+)
AGGREGATOR_API_KEY=
AGGREGATOR_BASE_URL=

# App
ENV=development|staging|production
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
```

Separate `.env` files per environment (`development`, `testing`, `staging`, `production`), none committed to Git (`.env.example` only, with placeholder values). Secrets in Staging/Production are pulled from a KMS/Vault at container start, never baked into the image or committed.

---

## 42. Project Folder Structure

```text
backend/
│
├── src/
│   ├── config/            # settings.py (Pydantic Settings, env-driven)
│   ├── controllers/        # FastAPI routers — one per module (§3)
│   ├── services/            # business logic, one class per §19 service
│   ├── repositories/        # SQLAlchemy data access, one per aggregate root
│   ├── models/              # SQLAlchemy ORM models (§5 tables)
│   ├── schemas/              # Pydantic request/response models (§17)
│   ├── routes/                # route registration/wiring
│   ├── middleware/            # auth, RBAC, idempotency, rate limiting
│   ├── validators/             # JSON Schema validators (rule conditions, AI outputs)
│   ├── utils/                   # hashing, tokenization, pagination helpers
│   ├── jobs/                     # background job definitions (§27)
│   ├── integrations/              # adapters (§40), LLM client (§26), ClamAV client
│   └── main.py
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── api/
│   ├── security/
│   └── ai_eval/                 # golden-dataset evaluation (§45)
├── migrations/                  # Alembic versions
├── seeds/                        # seed.py, dummy dataset fixtures
├── docs/
├── .env.example
├── pyproject.toml
└── README.md
```

---

## 43. API Route Map

```text
/api/v1
│
├── /auth
│   └── GET /session
│
├── /users
│   ├── GET /me
│   └── PATCH /me
│
├── /bidders
│   ├── GET /
│   ├── POST /
│   └── GET /:id
│
├── /tenders
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   └── /:id/eligibility-rules
│       ├── GET /
│       └── POST /
│
├── /bid-applications
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── /:id/documents
│   │   ├── GET /
│   │   └── POST /
│   ├── POST /:id/extract
│   ├── POST /:id/verify
│   ├── GET /:id/compliance-score
│   └── POST /:id/decision
│
├── /check-types
│   └── GET /
│
├── /blacklist
│   └── GET /check?pan=
│
├── /audit
│   └── GET /:application_id
│
├── /notifications
│   ├── GET /
│   └── PATCH /:id/read
│
└── /analytics
    └── GET /cycle-times
```

---

## 44. Database Seeding

`seeds/seed.py` (idempotent — safe to re-run against a fresh dev DB):

- 1 ADMIN user, 1 OFFICER user (`Rajesh Kumar`-style test persona), 1 VIGILANCE user.
- 3–5 dummy bidders (including one MSME-persona `Priya Sharma`-style record), with realistic-but-fake PAN/GSTIN/Udyam numbers.
- 2 dummy tenders with configured `eligibility_rule_sets` (one MSE-reserved category, one general).
- A seeded `check_types` table covering all ten statutory sources + blacklist.
- 2–3 **deliberately planted inconsistencies** in the dummy document set: a name mismatch between PAN and GST records, an expired Udyam certificate, and a PAN present in the seeded `blacklist_entries` table — these exist specifically to validate F5/F8/F4 in testing and demo (per PRD §21, §23).
- Never uses real production bidder PII, per master-prompt rule 44.

---

## 45. Testing Schema

### Unit Tests
`RuleEngineService` (every condition/operator path), `ScoringService` (weighted formula edge cases including the all-pending → `INCOMPLETE` case), `AuditService` hash-chaining logic, adapter response normalization.

### Integration Tests
Full pipeline stage-to-stage (intake → extraction → adapter → rule engine → scoring → recommendation) against the seeded dummy dataset, run against a real (test) Postgres instance, not mocks.

### API Tests
Every endpoint in §15 — success paths, auth failures, malformed input, adapter-unavailable scenarios, idempotency-key replay.

### Security Tests
Auth/RBAC boundary tests (a BIDDER token attempting to read another bidder's case → `403`/`404`), SQL-injection attempts against filter/sort parameters, malicious file upload rejection, prompt-injection payloads in document text (verify anomaly detection output is still schema-valid and doesn't leak an injected instruction).

### Performance Tests
k6 load test simulating a tender-closing spike (peak concurrent bid applications, per §16 NFR targets).

### AI Tests
Golden dummy-document test set — extraction precision/recall per field per document type; anomaly-detection precision/recall specifically against the planted-inconsistency cases (§44); evidence-citation completeness (every `AI_ANOMALY` check resolves to a real, existing document/field — enforced both by the DB constraint in §5 and by this test suite).

| Test ID | Module | Scenario | Expected Result | Priority |
|---|---|---|---|---|
| T-001 | Rule Engine | All checks pass, no pending | Score high, risk LOW, recommendation "Qualify" | P0 |
| T-002 | Rule Engine | Rule references unconfigured adapter | Check marked `not_evaluated`, visibly surfaced | P0 |
| T-003 | AI Anomaly | Name mismatch across PAN/GST (planted) | Flagged with citation to both docs/fields | P0 |
| T-004 | AI Anomaly | Model output missing evidence citation | Discarded, never shown to officer | P0 |
| T-005 | Decision | Officer overrides AI recommendation, no remarks | `400`, save blocked | P0 |
| T-006 | Decision | Case closed without any decision row | Blocked by both service logic and DB trigger | P0 |
| T-007 | Audit | Tamper attempt on `audit_events` | Hash-chain break detected, high-severity alert | P0 |
| T-008 | Adapter | Source timeout | Check = `pending`, never `pass` | P0 |
| T-009 | Auth | Bidder attempts cross-bidder case read | `403`/`404`, logged as security event | P0 |
| T-010 | Idempotency | Duplicate decision POST (retry) | Second call returns stored first response, no double-decision | P1 |

### User Acceptance Testing
Walkthrough with a real (or role-played) procurement officer, focused on whether the dashboard reduces manual cross-checking effort and whether the audit trail is legible to a non-developer (per PRD §25 addendum).

---

## 46. Performance Requirements

| Metric | Target |
|---|---|
| Dashboard read (p95) | < 500ms |
| Document upload acknowledgment | < 2s |
| Full extraction+verification pipeline per bid application | < 2 minutes (async, visible progress) |
| API p95 latency (non-pipeline endpoints) | < 300ms |
| Concurrent bid applications in flight (peak tender-closing window) | ≥ 500 |
| Background job processing time (single extraction job) | < 30s typical, < 2min p99 |

Sized to CPCL's realistic pilot scale (per PRD §16) — not an inflated hypothetical.

---

## 47. Backup & Recovery

- **Database backups:** daily automated PostgreSQL backups (`pg_dump` or managed-service snapshot), plus continuous WAL archiving for point-in-time recovery.
- **Frequency:** daily full + continuous WAL. **Retention:** 30 days rolling, plus monthly archives retained per the statutory record-retention window.
- **Restore process:** documented, tested runbook — restore to a scratch instance, verify row counts/hash-chain integrity on `audit_events`, then promote.
- **Disaster recovery:** backups held in a second, India-resident region/availability zone on the empanelled cloud (per PRD §37 addendum).
- **RPO:** ≤ 15 minutes (continuous WAL archiving). **RTO:** case/workflow service restored within 4 hours of a detected outage.
- **If the primary database is lost:** failover to the standby region using the most recent WAL-replayed state; any gap (up to the 15-minute RPO) is reconciled against the object-storage audit trail and adapter call logs where possible; officers fall back to the documented manual verification SOP for the affected tender-closing window (PRD §37).

---

## 48. Scalability Plan

### Stage 1 — MVP
Modular monolith, single Postgres instance, mock adapters, single CPSU (CPCL). No caching beyond rule-set reads, no read replicas.

### Stage 2 — Growth (CPCL pilot, live sources)
Add Redis caching (§28) more aggressively, add indexes based on real query patterns observed in the pilot (§9 targets are educated guesses, not final), background job workers scaled horizontally, live adapter integrations behind the same interface.

### Stage 3 — Scale (multi-CPSU)
Postgres read replicas for dashboard/analytics reads, tenant-isolated data partitioning (`tenant_id` column added to core tables, or schema-per-tenant if isolation requirements demand it), message queue (not just Redis) if job volume grows significantly, STQC-certified hosting.

### Stage 4 — Large Scale
Split out the Document/AI Extraction module as an independently-scaled service only if its load profile genuinely diverges from the rest (e.g., extraction volume scales faster than case-review volume) — microservices are introduced where justified by actual operational data, never pre-emptively.

---

## 49. Backend Acceptance Criteria

```text
Given a verified authenticated OFFICER
When POST /api/v1/bid-applications is called with a valid tender_id and bidder_id
Then:
  - Request is authorized (role check passes)
  - Input is validated (both IDs exist, no duplicate application)
  - A bid_application row is created with status='intake_pending'
  - An audit_event (CASE_CREATED) is written in the same transaction
  - 201 response is returned with the application_id
```

```text
Given a bid_application with status='ready_for_review'
When POST /:id/decision is called by the case's assigned OFFICER with
  decision_value='DISQUALIFY' and overrode_ai_recommendation=true but no remarks
Then:
  - Validation fails before any database write occurs
  - 400 response with error.code='VALIDATION_ERROR' is returned
  - No decisions row is created, no audit event is written
```

```text
Given an AI anomaly-detection call returns a flag with no evidence citation
When the output passes through schema validation
Then:
  - The flag is discarded before reaching the database
  - No compliance_checks row with source='AI_ANOMALY' and evidence=NULL can exist
    (enforced by the CHECK constraint in §5)
  - The officer never sees an unattributed AI claim
```

```text
Given a verification adapter times out during a /verify run
When the rule engine attempts to evaluate the dependent rule
Then:
  - The corresponding compliance_check.result is set to 'pending'
  - It is never set to 'pass' by default
  - The overall compliance_score.risk_level reflects 'INCOMPLETE' if any
    mandatory check is still pending
```

---

## 50. Technical Risks

| Risk | Probability | Impact | Severity | Mitigation |
|---|---|---|---|---|
| Live government/aggregator API access delayed | High | High | High | Architecture never depends on it for MVP (mock adapters); pursue one real integration in parallel |
| AI hallucination in extraction/anomaly detection | Medium | High | High | Mandatory citation, schema validation, rule engine always wins over AI |
| Database contention during tender-closing spikes | Medium | Medium | Medium | Optimistic locking (§38), connection pooling, load-tested against §46 targets |
| Audit hash-chain corruption (bug, not attack) | Low | High | High | Append-only DB grants (§5), integrity check job run periodically, alerting on any break |
| LLM/cloud vendor cost scaling unpredictably | Low–Medium | Medium | Medium | Token/cost tracking (§26), rate limits (§32), prompt caching |
| Multi-tenant migration complexity (Stage 3) | Medium | Medium | Medium | `tenant_id` column reserved in schema design now, even if unused in v1 |
| Team unfamiliarity with a modular-monolith discipline (services bleeding into controllers) | Medium | Low–Medium | Low–Medium | Code review checklist enforcing §20/§21 separation; linting rule flagging DB imports in controllers |

---

## 51. Final Backend Blueprint

## BUILD THIS BACKEND

**Architecture:** Modular monolith (single FastAPI app, module-isolated services/repositories); microservices deliberately deferred.

**Backend Language:** Python 3.12

**Framework:** FastAPI

**Database:** PostgreSQL 16 + pgvector extension

**ORM:** SQLAlchemy 2.x (async) + Alembic for migrations

**Authentication:** OIDC/OAuth2 via Keycloak (JWT bearer tokens)

**Authorization:** RBAC (OFFICER / ADMIN / VIGILANCE / BIDDER) enforced at the API layer with resource-ownership checks

**Cache:** Redis

**Queue:** Redis + RQ (Celery if job complexity grows)

**Storage:** S3-compatible object storage (MinIO dev → empanelled-cloud production)

**AI:** Claude Sonnet 5 (extraction/anomaly/recommendation) + Claude Haiku 4.5 (cheap first-pass extraction), behind an internal `LLMClientInterface`

**Core Modules:** Auth, Bidders & Tenders, Case & Intake, Document/AI Extraction, Verification Adapters, Rule Engine, AI Reasoning, Scoring, Blacklist, Decision & Override, Audit, Rule Configuration, Notifications, Analytics

**Core Tables:** `users`, `bidders`, `tenders`, `eligibility_rule_sets`/`eligibility_rules`, `bid_applications`, `documents`, `check_types`, `compliance_checks`, `verification_source_logs`, `compliance_scores`, `ai_recommendations`, `decisions`, `blacklist_entries`, `audit_events`, `notifications`, `idempotency_keys`

**Core APIs:** `POST /bid-applications`, `POST /bid-applications/{id}/documents`, `POST /bid-applications/{id}/verify`, `GET /bid-applications/{id}/compliance-score`, `POST /bid-applications/{id}/decision`, `GET /audit/{application_id}`, `GET /blacklist/check`

**Critical Business Rules:** rule engine (not AI) decides eligibility; every AI claim must cite evidence or be discarded; no case closes without a human `decisions` row; every state change is paired with an audit event in the same transaction; adapter/AI failures produce `pending`/`not_evaluated`, never a false pass.

**Security Strategy:** Keycloak-delegated auth, layered RBAC + resource ownership, tokenized PAN, hash-chained append-only audit log, malware-scanned uploads, rule engine as the sole source of eligibility truth (§31, §26).

**Deployment:** Docker + GitHub Actions → MeitY-empanelled cloud (production); Dev/Test on free-tier or local Docker Compose.

**Monitoring:** Prometheus + Grafana, structured JSON logs (Loki/ELK), OpenTelemetry tracing.

**MVP Backend Scope:** Single CPSU (CPCL), mock Verification Adapters over seeded dummy data, full pipeline intake → decision → audit trail, no live external government integrations.

**Biggest Technical Risk:** Dependence on external government/aggregator API access for live integration — an institutional/legal process, deliberately designed around via the swappable Adapter Layer.

**Recommended Architecture:** Modular monolith for v1, with module boundaries clean enough to extract a service (most likely Document/AI Extraction) later if its load profile genuinely diverges — never split prematurely.

---

## 52. Exact Development Order

| Task | Dependency | Output | Priority |
|---|---|---|---|
| 01. Project init (repo, Docker Compose, FastAPI skeleton) | — | Running local stack | P0 |
| 02. Environment configuration (§41) | 01 | `.env.example`, settings module | P0 |
| 03. Database setup (Postgres container, pgvector extension) | 02 | DB reachable | P0 |
| 04. Database schema (§5 tables, SQLAlchemy models) | 03 | ORM models defined | P0 |
| 05. Migration system (Alembic init + first migration) | 04 | Versioned schema | P0 |
| 06. Auth integration (Keycloak client, JWT validation middleware) | 02 | Login round-trip works | P0 |
| 07. Authorization (RBAC + resource-ownership middleware) | 06 | Role-gated endpoints | P0 |
| 08. Core models/repositories (Bidder, Tender, BidApplication) | 04 | CRUD-capable repos | P0 |
| 09. Core services (CaseService, BidderService, TenderService) | 08 | Business logic layer | P0 |
| 10. Core APIs (bid-applications, tenders, bidders CRUD) | 09, 07 | Working REST endpoints | P0 |
| 11. Validation (Pydantic schemas, §17) | 10 | Rejects malformed input | P0 |
| 12. Error handling (centralized exception handlers, §33) | 10 | Safe, consistent error envelope | P0 |
| 13. File storage (S3 client, upload endpoint, ClamAV integration) | 10 | Document upload works (F1) | P0 |
| 14. AI integration (LLMClientInterface, extraction pipeline, F2) | 13 | Structured extraction from a document | P0 |
| 15. Verification Adapter Layer (mock adapters, F3) | 09 | Cross-checks return normalized results | P0 |
| 16. Rule Engine (F4) | 15, 04 | Deterministic pass/fail/pending per rule | P0 |
| 17. AI Anomaly Detection + Recommendation (F5, F7) | 14, 16 | Cited flags + drafted recommendation | P0 |
| 18. Scoring (F6) | 16, 17 | Score + risk level computed | P0 |
| 19. Blacklist check (F8) | 04 | Registry lookup by PAN | P0 |
| 20. Decision workflow (F10) | 18 | Officer can qualify/disqualify | P0 |
| 21. Audit trail (F11, hash-chaining) | all writes above | Every state change logged immutably | P0 |
| 22. Background jobs (§27, wiring 14–20 async) | 14–20 | Non-blocking pipeline | P0 |
| 23. Notifications (F13) | 22 | Reminders/alerts dispatched | P1 |
| 24. Rule Configuration Admin API (F12) | 16 | No-code rule editing | P1 |
| 25. Logging/observability (§34) | all | Structured logs, metrics, traces | P0 |
| 26. Testing (§45 — unit, integration, API, security, AI eval) | all | Test suite passing | P0 |
| 27. Security testing (§15 PRD, §31 here) | 26 | Pen-test-ready | P0 |
| 28. Performance testing (k6, §46) | all | Meets latency/concurrency targets | P1 |
| 29. Deployment (§26 PRD, CI/CD) | all | Staging/production pipelines live | P0 |
| 30. Monitoring/alerting live (§34) | 29 | Dashboards + alerts operational | P0 |

Reordered from the generic template specifically to put Auth/RBAC (06–07) immediately after the schema, ahead of any business API, since every endpoint from Task 10 onward depends on authorization being enforceable from day one — not bolted on afterward.
