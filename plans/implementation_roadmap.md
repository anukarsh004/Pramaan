# Pramaan implementation roadmap

## Audit baseline — 2026-09-14

All five source specifications were read before production code was added:

1. `plans/pramaan_prd.md` (including sections 34–40)
2. `plans/pramaan_trd.md`
3. `plans/pramaan_backend_schema.md`
4. `plans/Pramaan_App_Flow_Document.md`
5. `plans/pramaan_uiux_brief.md`

The supplied shorthand filenames map to these existing files; do not duplicate them.

Repository baseline: specification files, a template README, Git metadata, and existing `.claude/` agent configuration. No application implementation, dependency manifests, migrations, fixtures, or tests existed. Pre-existing modifications under `.claude/` are outside this work and remain untouched. No secrets files are inspected.

Node, npm, Python, Docker CLI, and Git are discoverable on Windows. CLI presence does not establish that Docker services, database, identity provider, OCR, or cloud credentials are available. Ripgrep is unavailable; PowerShell supplies the file inventory.

## Architecture decision

**Decision:** React 18/TypeScript/Vite/Tailwind frontend; Python 3.12/FastAPI modular monolith; SQLAlchemy 2/Alembic with PostgreSQL 16; Celery/Redis; Keycloak; S3-compatible storage; Tesseract and a provider-isolated LLM client. No autonomous AI adjudication.

**Reason:** PRD architecture and TRD sections 6–9. Python 3.12 and PostgreSQL 16 satisfy the TRD minimum versions and the backend blueprint.

**Alternatives considered:** microservices, RQ, standalone vector database, Kubernetes.

**Trade-offs:** one deployable backend keeps transactions and operations simple; modules must retain clear service/repository boundaries. Celery follows the higher-priority TRD over the schema's RQ preference. Vector retrieval is not a prerequisite for MVP eligibility evaluation.

Business writes and audit events share one PostgreSQL transaction. External calls stay outside transactions. Async dispatch must recover from a crash between commit and enqueue; settle the durable dispatch design before the first workflow implementation. AI reads, extracts, flags, and drafts; deterministic rules evaluate checks; an officer alone records the final outcome.

## Specification conflicts and dispositions

### SPECIFICATION CONFLICT — incomplete submissions

**File A:** PRD F1 and section 17 explicitly allow submission with missing mandatory documents, with visible gaps.

**File B:** UI brief SCR-006 disables submission until mandatory documents are supplied; app-flow navigation also contains conflicting wording.

**Impact:** valid bidder intake could be blocked by the UI despite the product requirement.

**Recommended resolution:** follow PRD: allow submission, preserve missing-document warnings, and never imply a passed check. Reject corrupt/unsupported files separately. Not yet implemented.

### SPECIFICATION CONFLICT — application states and duplicates

**File A:** TRD section 9 names explicit pipeline states and `awaiting_officer_decision`; section 11 permits a new application after closure via a partial unique index.

**File B:** backend schema uses `processing`/`ready_for_review` and an unconditional bidder+tender unique constraint. App flow introduces further states not present in that enum.

**Impact:** API enums, worker transitions, and migration constraints cannot be copied verbatim from all documents.

**Recommended resolution:** publish a canonical state/transition and API-to-storage mapping before migrations. Preserve TRD pipeline visibility and active-application uniqueness; retain immutable decision history across closure/reopen cycles. Do not introduce guessed columns or silently equate unrelated states.

### SPECIFICATION CONFLICT — request for information

**File A:** PRD F10 includes Request More Information as a decision and section 17 blocks post-decision uploads until an authorized reopen.

**File B:** app flow distinguishes non-closing clarification requests from the closing Request Info decision; its state diagram also models a clarification loop.

**Impact:** confusing these actions could either prevent a bidder responding or allow changes after a recorded decision.

**Recommended resolution:** preserve the explicitly distinct actions: clarification leaves the case open; a formal Request More Information decision closes the case and subsequent upload requires explicit reopen. Document this distinction in API/UI contracts before implementing it.

### SPECIFICATION CONFLICT — contract shapes

**File A:** PRD/TRD API examples use lowercase decision values, flat success responses, `/documents/{id}/extract`, and condition names such as `EQUALS`.

**File B:** backend schema uses uppercase values, nested `data` responses, application-level extraction routes, and `EQ`.

**Impact:** generated frontend clients would drift from the API.

**Recommended resolution:** higher-priority PRD/TRD public contracts govern; explicit mapping can bridge internal enum/condition representation. Resolve and test each endpoint before publishing OpenAPI or generating clients.

### SPECIFICATION CONFLICT — drafts, mobile, and navigation

**File A:** TRD section 8 prohibits case data in browser persistent storage; app flow specifies no bottom navigation and excludes mobile MVP flows.

**File B:** UI brief requests locally saved remarks and mobile-first bidder screens with bottom navigation.

**Impact:** draft persistence and responsive/navigation behavior differ.

**Recommended resolution:** no persistent browser case/remarks storage; use in-memory drafts with navigation warnings. Follow higher-priority app-flow navigation for MVP. Record any deliberate expansion to mobile bidder support before implementation; tablet support and accessibility remain required.

### SPECIFICATION CONFLICT — delivery platform and sequencing

**File A:** PRD/TRD choose GitHub Actions; the workspace remote is GitLab.

**File B:** backend development order places audit after business writes, despite PRD F11 requiring audit from the first mutation.

**Impact:** a workflow on the wrong host will not execute; delaying audit creates unaudited history.

**Recommended resolution:** settle the CI host before adding a workflow; do not silently switch platforms. Move audit infrastructure before business mutations. Tests accompany every slice, not just Phase 6.

## Requirements needing definition before dependent work

- F6: exact weighted formula, anomaly penalties, rounding, risk thresholds, and persisted/versioned weight configuration are not provided. No numerical scoring policy should be invented.
- F4: define fuzzy-name algorithm/normalization and check-type field schemas; a suggested 90% threshold alone is not a complete algorithm.
- Officer assignment is mandatory in TRD, but its persistence relationship is absent from the table definitions.
- Rule second-approver records, consent records, non-case audit events, AI-call metadata, and durable dispatch are mentioned without complete table contracts.
- Define rule-version snapshots and stale-job protection on resubmission; re-extract only changed documents but recompute dependent cross-document comparisons and aggregate results.
- Define deadline time zone/cutoff semantics: schema uses a date, while UI shows a countdown and flow includes post-GeM-close intake.
- Validate actual provider model availability and configuration before LLM integration; do not assume the model identifier/pricing in prose is executable/current.
- Synthetic adapter fixtures are explicitly permitted by PRD, but must be labeled and remain distinct from real external verification. Unknown fixture identifiers must not produce invented success.
- Live integrations and real-data deployment remain gated on institutional access, provider agreements, legal approval, hosting, and independent assessment. They are not demo completion claims.

## Prioritized delivery phases

| Phase | Deliverables | Dependencies / exit gate |
|---|---|---|
| PHASE 0 — PROJECT AUDIT | Read specs, inventory repository, document conflicts, define traceability and open contracts | Initial audit recorded; dependent contract questions remain open |
| PHASE 1 — FOUNDATION | Executable backend, local configuration, error envelopes, test/lint/type tooling; then frontend toolchain and local services | Bootstrap tested; no business routes before auth and audit prerequisites |
| PHASE 2 — CORE FEATURES | Adapter contracts, typed rule evaluation, workflow transitions, blacklist logic, scoring after policy is defined | Unit tests for every result and unavailable/missing-data path |
| PHASE 3 — BACKEND & DATABASE | Canonical migrations, repositories, audit transactions, assignment model, authorized APIs, idempotency, versioned uploads, durable jobs | Real PostgreSQL integration tests, race tests, rollback and audit-failure tests |
| PHASE 4 — FRONTEND & UI | Design tokens, layouts, officer dashboard/detail, bidder intake, rule config, explainability, audit viewer | Real API contracts; loading/empty/error/success states; keyboard and tablet checks |
| PHASE 5 — INTEGRATIONS | Keycloak and storage wiring as early prerequisites; OCR, LLM extraction/flags/drafts, labeled synthetic adapters, notifications | Real service tests; unavailable-provider fallbacks; validated evidence citations |
| PHASE 6 — TESTING | Consolidated unit, API, integration, component, E2E, golden AI evaluation | Full officer/bidder/admin/vigilance journeys and regression suite; tests also run in Phases 1–5 |
| PHASE 7 — SECURITY HARDENING | Independent Security Analyst Agent review and remediation, followed by regression | Required independent review and relevant tests; not self-certified here |
| PHASE 8 — PERFORMANCE | Pagination, query plans, bounded workers, profiling, k6 load tests | Measured p95 dashboard <500ms and pipeline <2min at declared workload; no unmeasured claims |
| PHASE 9 — FINAL QA | Requirements traceability, usability/accessibility, restore rehearsal, deployment verification | Staging acceptance and independent review; unresolved major issues block completion |
| PHASE 10 — SIH DEMO READINESS | Synthetic golden cases, planted inconsistency, unavailable source, human override, audit walkthrough | Rehearsed live demo; clearly labeled recorded fallback; no fake success paths |

Phase labels describe workstreams, not permission to delay prerequisites: database/audit/auth essentials precede the first persisted business feature; testing and review occur throughout.

## Current slice — backend bootstrap

1. **Objective:** reproducible, executable backend foundation without fake product endpoints.
2. **Requirements:** TRD sections 7, 9, 17, 24; backend schema health exception and project structure.
3. **Architecture:** app factory, environment-driven non-secret settings, centralized HTTP errors and request correlation.
4. **Files:** root `.gitignore`; `backend/pyproject.toml`; backend source/config/error modules and tests; this roadmap.
5. **Dependencies:** FastAPI, Pydantic Settings, Uvicorn; pytest, HTTPX, Ruff, mypy and coverage for development.
6. **Steps:** install in an isolated local environment; implement health and error handling; test; lint/type-check; review and rerun.
7. **Testing:** heartbeat, unknown routes/methods, validation and unexpected errors, request IDs, app-factory isolation, invalid settings.
8. **Security considerations:** no business routes; no public Swagger/OpenAPI before auth wiring; no credentials in code or raw exception payload in user errors. Independent security review pending.
9. **Failure cases:** invalid startup settings, invalid request data, unknown resource, unexpected exception, unavailable external tooling. Health reports process liveness only, not dependency readiness.

This slice does not implement database access, authentication, OCR, scoring, production deployment, or the complete product. Do not mark any corresponding feature complete based on bootstrap tests.

### Verification result — 2026-09-14

- Added the application factory, `ENV` configuration, process liveness endpoint, standard HTTP error envelopes, request correlation, and 26 tests.
- Fixed a static-type mismatch: framework exception headers are a `Mapping`, not necessarily a mutable `dict`.
- Final test invocation exited 0: **26 passed**, **100% statement/branch coverage of the bootstrap source only** (62 statements, 4 branches). This is not product test coverage.
- Ruff lint and format checks exited 0; strict mypy passed all 8 Python files; `pip check` found no broken requirements. Dependency compatibility checking is not a vulnerability assessment.
- Two upstream test-client deprecation warnings remain (Starlette/HTTPX and AnyIO portal alias). No warnings were hidden. The initial OneDrive pytest-cache permission warning did not recur on the final run.
- Setup required retries after pip/bootstrap interruptions. A test wrapper timed out after reporting success; the final direct executable invocation completed normally with exit 0.
- Recorded installed package versions in `backend/requirements-dev.lock`; artifact hashes, cross-platform installation, and production dependency assessment remain unverified.
- README now includes local run/check commands and an explicit incomplete-product status. No commits, pushes, or remote changes were made.
- Independent security review and independent engineering approval remain pending; this slice is not declared production-ready or fully Done.

## Expanded implementation plan

1. **Objective:** persistent, connected procurement workflows, not a static mock dashboard.
2. **Requirements:** F1–F12 core intake/review/audit/rules, F16 roles, F18 explainability; synthetic external adapters only where explicitly labeled.
3. **Architecture:** existing FastAPI factory plus SQLAlchemy repositories/services, PostgreSQL migrations, React/Vite client, external-service boundaries. No business transaction commits without audit.
4. **Files:** backend domain/models/repositories/services/controllers, migrations and tests; frontend source/manifests; deployment configuration and README.
5. **Dependencies:** PostgreSQL and Docker daemon; Keycloak realm/client; storage and scanner; configured OCR/LLM providers for automatic processing. Missing providers remain visibly unavailable.
6. **Steps:** domain contracts/tests → persistence/audit → authorized APIs → connected frontend → checks and integration verification where infrastructure is available.
7. **Testing:** deterministic rules/scoring boundaries, workflow transitions, API validation, audit hashes, frontend compile/component checks, and real-service tests when Docker is running.
8. **Security:** no development auth bypass or real PII fixtures; independent Security Analyst Agent review remains required.
9. **Failure cases:** configuration missing, DB unavailable, stale/concurrent writes, incomplete evidence, source unavailable, expired login, and failed AI analysis.

### Explicit implementation decisions

- Use schema-level `processing` and `ready_for_review` for persisted case state; expose named pipeline stages separately when workers are implemented. `ready_for_review` is the storage equivalent of TRD `awaiting_officer_decision`. No automatic final decisions.
- Add a tender/officer assignment relation: this is a documented schema extension required to enforce the TRD's assigned-officer workflow. It is not a replacement for an existing specified field.
- A scoring policy must be supplied explicitly: rule weights, severity penalties and low/medium cutoffs are validated inputs, not hidden default policy. An absent policy must not produce a numerical score. Store the policy with the rule-set version (documented extension).
- Preserve lowercase public decision values from PRD/TRD, and explicit `EQ`/`EQUALS` normalization for internal condition handling.
- Keep formal Request More Information closure distinct from non-closing clarification. Resubmission after a final decision requires an explicit reopen.
- Do not mutate active rule sets in place. Until the specified second-approver workflow has persistence and tests, reject activation over existing applications rather than weakening that requirement.
- Docker Desktop's Linux engine was unreachable at the beginning of this implementation session. CLI availability is not successful service integration.

Independent security review should use Security Analyst Agent rather than being represented as a separate reviewer inside this chat.
