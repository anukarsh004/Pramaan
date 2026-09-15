# Pramaan — UI/UX Design Brief
### AI-Powered Bid Compliance Verification Platform for GeM
**Version 1.0 · Implementation-Ready · Companion to Pramaan PRD v1.0**

---

## 1. Design Executive Summary

| | |
|---|---|
| **Product** | Pramaan (प्रमाण — "proof, certification, standard of evidence") |
| **One-Line Product Description** | An AI-assisted, human-in-the-loop dashboard that verifies GeM bidders' statutory compliance across multiple government sources and gives procurement officers one auditable compliance score instead of a dozen manual lookups. |
| **Core Problem** | Evaluating a single GeM bid means manually cross-checking a bidder's Udyam, GST, PAN, MCA21, EPFO/ESIC, and blacklist status across 5+ portals and PDFs — slow, inconsistent between officers, and hard to audit later. |
| **Target Audience** | Procurement/tender evaluation officers at CPSUs (CPCL first), MSME bidders, vigilance/audit staff, procurement-systems admins. |
| **Primary User Goal** | Reach a confident, evidence-backed qualify/disqualify decision on a bidder in minutes, not hours. |
| **Primary Business/Product Goal** | Cut manual verification effort per bid materially (target 40–60%, validated in pilot) while producing a 100% auditable decision trail. |
| **Core UX Principle** | Show evidence, not verdicts. The interface must make the officer feel *more* informed and *more* in control — never like a black box is deciding for them. |
| **Design Direction** | Calm, institutional, evidence-first. A serious government tool that borrows the clarity of modern fintech dashboards without ever feeling flashy, gamified, or opaque. |

**Overall Experience**

Pramaan should feel like a well-organized case file, not a chatbot or an analytics toy. An officer opens a tender, sees every bidder's status at a glance, and can drill into any single claim down to the source document in two clicks or fewer. Every AI-authored statement is visually distinct from verified fact, so trust is built by transparency rather than confidence of tone. Bidders experience a simple, guided checklist that tells them exactly what's missing before it costs them a bid. Nothing in the interface should ever imply the system has made a decision — the design's job is to make the human decision faster and better-informed, never to replace it.

---

## 2. Design Objectives

| Priority | Objective | Why It Matters | How Design Achieves It |
|---|---|---|---|
| P0 | Make the compliance status of any bidder scannable in under 5 seconds | Officers evaluate many bidders under deadline pressure | Score + risk badge + icon-coded check list at the top of every case, consistent position across screens |
| P0 | Make every AI claim traceable to its source | Legal defensibility; hallucination risk (§11 of PRD) | Mandatory "View evidence" affordance on every AI-authored statement, linking to the source document region |
| P0 | Make the human decision step impossible to miss or skip | Architecture requires human-in-the-loop (F10); this must be visually enforced too | Decision panel is persistently visible, cannot be dismissed, blocks case closure until completed |
| P0 | Reduce cognitive load when comparing many bidders on one tender | Officers may review dozens of bidders per tender | Consistent card/table layout, sortable by risk, bulk comparison view (F14) |
| P1 | Build trust in the AI layer without over-trusting it | Automation bias is a named risk (§28) | "AI-drafted, review required" label pattern applied consistently; never styled to look like a final verdict |
| P1 | Give bidders (MSMEs, often non-technical) a low-anxiety upload experience | Bidders lose bids over fixable paperwork issues | Plain-language checklist, real-time confidence feedback, no jargon |
| P1 | Make the audit trail legible to non-developers | Vigilance/RTI/CVC review is a named use case | Plain-English event descriptions, chronological timeline, exportable view |
| P2 | Support admins configuring rules without engineering help | F12 requires no-code rule configuration | Structured rule builder with plain-language condition sentences, not raw JSON |
| P2 | Feel institutional and trustworthy, not consumer-flashy | Government procurement context | Restrained color use, no gamification, no decorative motion |

---

## 3. User Personas

### Persona 1 — Rajesh Kumar, Procurement/Tender Evaluation Officer
- **Role:** Senior Manager, Materials & Contracts, CPCL
- **Technical Skill:** Comfortable with GeM portal and office software; not a developer
- **Goals:** Close tender evaluation within cycle time; be confident every qualified bidder is genuinely eligible; avoid decisions that get challenged later
- **Pain Points:** Manually opening documents from many sources per bidder; no single view of eligibility; pressure to move fast without cutting corners
- **Motivations:** Professional accountability, avoiding rework, defensible decisions
- **Behavior:** Works through a queue of cases against a fixed tender deadline; reviews multiple bidders back-to-back
- **Frustrations:** Repetition across bidders; inconsistent document quality/formats
- **Expectations:** A single dashboard with score, risk, and evidence; a faster process; a trail he can point to if challenged
- **Accessibility Considerations:** Desktop-primary user; may work long sessions — needs low visual fatigue, clear focus states, keyboard-friendly review flow

**What this persona needs from the interface:** A dashboard that answers "is this bidder OK, and why" in one glance, with a one-click path to verify any claim himself before signing off. He needs the AI to save him time, not ask him to trust it blindly.

### Persona 2 — Priya Sharma, Bidder / MSME Vendor
- **Role:** Proprietor, small industrial-supplies manufacturing unit (Udyam-registered Micro enterprise)
- **Technical Skill:** Basic smartphone/web use; not comfortable with complex forms
- **Goals:** Win contracts without losing bids over paperwork technicalities she didn't know about
- **Pain Points:** Uncertainty about which documents are required; rejections after the fact with little explanation; no compliance staff
- **Motivations:** Business survival, avoiding wasted effort
- **Behavior:** Uploads what's asked, hopes for the best, checks status occasionally
- **Frustrations:** Finding out about a missing/expired document only after losing the bid
- **Expectations:** A clear, guided checklist and early warning on issues
- **Accessibility Considerations:** Likely mobile-first; may have low bandwidth; needs large touch targets, simple language, minimal steps

**What this persona needs from the interface:** A checklist, not a form — plain language, visible progress, and immediate feedback ("this certificate is expiring soon") before it's too late to fix.

### Persona 3 — Anitha Reddy, Vigilance/Compliance Officer
- **Role:** CPCL Chief Vigilance Officer's team
- **Technical Skill:** Moderate; reviews records, not a system operator
- **Goals:** Reconstruct, for any awarded tender, exactly what was verified and why a bidder was qualified
- **Pain Points:** Manual file notes are inconsistent and hard to audit at scale
- **Expectations:** A structured, timestamped, evidence-linked trail
- **Accessibility Considerations:** Read-only access; needs exportable, printable views for formal review

**What this persona needs from the interface:** A read-only, chronological, plain-English audit view she can hand to an external reviewer without translation.

### Persona 4 — CPCL Procurement-Systems Admin
- **Role:** IT/Procurement Systems Admin
- **Technical Skill:** Moderate-to-high; comfortable with structured configuration, not necessarily code
- **Goals:** Configure eligibility rules per tender/category without a developer; manage mock vs. live verification sources
- **Expectations:** A rule-configuration UI, validation before rules go live
- **Accessibility Considerations:** Desktop-only, infrequent use — clarity over speed

**What this persona needs from the interface:** A rule builder that reads like a sentence ("Udyam category must be Micro or Small") rather than a technical form, with clear validation before anything goes live.

---

## 4. User Experience Principles

1. **Evidence over verdicts** — Every score, flag, or recommendation must be one click from its source. The UI never asserts something without a visible "why."
2. **One primary action per screen** — Every screen has exactly one thing it wants the user to do next; everything else is secondary.
3. **AI is visually subordinate to fact** — AI-drafted content always carries a distinct visual treatment (label + subtle styling) and never occupies the position a verified result would.
4. **Progressive disclosure** — The dashboard shows the minimum needed to triage; details are one click deeper, never dumped all at once.
5. **Nothing fails silently** — Every pending, unavailable, or failed check is visibly and explicitly stated. No blank space ever implies "pass."
6. **Consistency across roles** — Officer, bidder, admin, and vigilance views share the same visual language for status, risk, and evidence, so patterns transfer across roles.
7. **Immediate, honest feedback** — Every action (upload, save, decision) confirms itself instantly; long-running work (extraction, verification) shows visible, real progress, never a spinner with no context.
8. **Accessible by default** — Status is never color-only; every interactive element is keyboard-reachable; every screen works at 200% zoom.
9. **Calm, not alarming** — Even "High Risk" flags are communicated firmly but without red-alert panic styling that could bias an officer before they've reviewed evidence themselves.
10. **Design for the deadline** — Every flow assumes the user is working against a real closing date; nothing should add friction that isn't earning its place.

---

## 5. Information Architecture

```
PRAMAAN
│
├── Public / Auth
│   ├── SSO Login
│   └── Role-aware redirect
│
├── Officer Workspace
│   ├── Tender Selector
│   ├── Compliance Dashboard (per tender: bidder list, score/risk)
│   ├── Bid Application Detail (per bidder)
│   │   ├── Document Checklist & Viewer
│   │   ├── Compliance Checks (per-check pass/fail/pending)
│   │   ├── AI Anomaly Flags
│   │   ├── AI Recommendation Panel
│   │   ├── Explainability View ("Why this score")
│   │   └── Decision Panel (Qualify / Disqualify / Request Info)
│   ├── Bulk Comparison View (multi-bidder, per tender)
│   ├── Notification Center
│   └── Analytics / MIS (aggregate, cycle time, trends)
│
├── Bidder Portal
│   ├── Tender Selection
│   ├── Guided Document Checklist & Upload
│   ├── Submission Status
│   └── Post-Decision Check Results
│
├── Admin Console
│   ├── Tender Eligibility Rule Configuration
│   ├── Verification Source Management (mock/live toggle)
│   └── User & Role Management
│
├── Vigilance (Read-Only)
│   ├── Audit Trail Viewer (per case)
│   └── Cross-Tender Search
│
└── Account
    ├── Profile
    └── Notification Preferences
```

**Primary navigation:** Role-based left sidebar (desktop) — Officer: Dashboard / Comparison / Notifications / Analytics. Admin: Rule Config / Sources / Users. Vigilance: Audit Search.

**Secondary navigation:** Within a Bid Application Detail, a tabbed or anchored sub-nav: Overview · Documents · Checks · Anomalies · Recommendation · Decision · Audit.

**Content hierarchy:** Tender → Bidder → Check → Evidence. Every screen name should make clear which level of this hierarchy the user is at.

**Grouping logic:** Group by tender first (the officer's real unit of work is "this tender's evaluation," not "all bidders everywhere"). Within a bidder, group by compliance domain (identity, tax, MSME status, blacklist) not by raw document type.

**Navigation priorities:** Dashboard is always the officer's home. Every deep screen has a persistent path back to "this tender's dashboard," never just browser-back.

---

## 6. Screen Inventory

| ID | Screen | User | Purpose | Priority | Complexity |
|---|---|---|---|---|---|
| SCR-001 | SSO Login | All | Authenticate, route by role | P0 | Low |
| SCR-002 | Officer Dashboard | Officer | List bidders per tender with score/risk | P0 | Medium |
| SCR-003 | Bid Application Detail | Officer | Core review screen — evidence, checks, decision | P0 | High |
| SCR-004 | Explainability View | Officer | Break score down to source checks | P0 | Medium |
| SCR-005 | Decision Panel (embedded in SCR-003) | Officer | Record Qualify/Disqualify/Request Info | P0 | Low |
| SCR-006 | Bidder Upload Portal | Bidder | Guided document submission | P0 | Medium |
| SCR-007 | Bidder Submission Status | Bidder | Track case status, see flagged issues | P1 | Low |
| SCR-008 | Tender Rule Configuration | Admin | Define eligibility rules per tender/category | P1 | High |
| SCR-009 | Verification Source Management | Admin | Toggle mock/live sources per check | P1 | Low |
| SCR-010 | Audit Trail Viewer | Officer/Vigilance | Reconstruct exactly what happened on a case | P0 | Medium |
| SCR-011 | Multi-Bidder Bulk Comparison | Officer | Side-by-side score/risk across bidders | P1 | Medium |
| SCR-012 | Analytics / MIS Dashboard | Officer/Admin | Cycle-time trends, failure-reason breakdown | P1 | Medium |
| SCR-013 | Notification Center | Officer/Bidder | Reminders, status changes | P1 | Low |
| SCR-014 | Role & User Management | Admin | Manage RBAC assignments | P2 | Low |
| SCR-015 | Profile / Account Settings | All | Manage personal preferences | P2 | Low |

---

## 7. Screen Design Briefs

### SCR-002 — Officer Dashboard

**Purpose:** The officer's daily entry point — see every bidder on a tender, triaged by risk, at a glance.

**User:** Procurement/Tender Evaluation Officer

**User Goal:** Decide which bidder to review next, and understand overall tender health.

**Entry Point:** Post-login redirect; navigation sidebar "Dashboard."

**Exit Points:** Bid Application Detail (per bidder), Bulk Comparison View, Analytics.

**Primary CTA:** "Review" on the highest-priority (highest-risk or longest-pending) case.

**Secondary Actions:** Filter by risk level, search bidder, switch tender, export list.

**Content Hierarchy:**
1. Tender selector + closing date (always visible, top of page)
2. Summary strip: total bidders, # pending review, # high risk, # closed
3. Bidder case table/cards: name, score, risk badge, status, last updated
4. Filters/sort controls
5. "Review" action per row

**Required UI Components:** Tender selector dropdown, summary stat cards, data table with sortable columns, risk badge (icon + color + text), search input, filter chips, pagination.

**Layout:** 12-column grid. Summary strip as 4 equal cards. Table spans full width below. Sidebar persistent at 240px desktop.

**Interaction:**
- Click row → opens Bid Application Detail
- Hover row → highlights, shows quick-preview tooltip of top flag
- Sort column header → re-sorts table, persists per session
- Filter chip → narrows table instantly, shows active-filter count

**Content:** Bidder legal name, application ID, compliance score (0–100), risk band (Low/Medium/High/Incomplete), number of open flags, submission date, current status (Pending Review / Reviewed / Closed).

**Loading State:** Skeleton rows matching table structure; summary cards show pulsing placeholders. Never a blank screen.

**Empty State:** "No bidders yet for this tender" with an icon and a note on when bids close; no false "0 issues" implied.

**Error State:** If case list fails to load, show inline banner: "Couldn't load bidder list — retry" with a retry button; do not hide the sidebar/navigation.

**Success State:** N/A (this is a persistent view); status changes reflect live via row updates when a case is closed elsewhere.

**Accessibility:** Table is a semantic `<table>`; risk badges carry text labels, not color alone; sortable headers are keyboard-operable with `aria-sort`.

**UX Notes:** Risk badges should never look punitive (no harsh red blocks) — use a calm, consistent icon+label+muted-color system so an officer isn't primed before reviewing evidence.

---

### SCR-003 — Bid Application Detail

**Purpose:** The core review screen — every piece of evidence and the decision action, together.

**User:** Procurement/Tender Evaluation Officer

**User Goal:** Understand exactly why the score is what it is, verify anything they're unsure of, and record a decision.

**Entry Point:** From Officer Dashboard "Review," or Notification Center.

**Exit Points:** Back to Dashboard, Explainability View, Audit Trail Viewer, next bidder in queue.

**Primary CTA:** "Record Decision" (opens Decision Panel).

**Secondary Actions:** Request clarification from bidder, view raw document, flag AI recommendation as wrong, jump to Explainability View, jump to Audit Trail.

**Content Hierarchy:**
1. Bidder identity header (name, PAN/GST masked-by-default, application ID)
2. Compliance Score + Risk Band (large, top of page, persistent while scrolling)
3. AI Recommendation panel (clearly labeled "AI-drafted, review required")
4. Per-check list (pass/fail/pending, grouped by domain: Identity, Tax, MSME Status, Blacklist)
5. AI Anomaly flags (each with cited fields/documents)
6. Document viewer (side-by-side extracted field vs. source image)
7. Decision Panel (sticky footer or persistent side panel)

**Required UI Components:** Score gauge/badge, status chip list, accordion/expandable check rows, evidence citation chip (opens document viewer), document viewer with highlight overlay, AI-label badge, decision form (radio + mandatory remarks field when overriding), toast confirmation.

**Layout:** Two-column desktop: left = checks/flags/recommendation (60%), right = document viewer, sticky (40%). Decision Panel spans full width at the bottom, always reachable via a persistent "Decide" button if scrolled away.

**Interaction:**
- Click a check row → expands to show rule logic and evidence
- Click a citation chip on any AI flag → scrolls/opens document viewer to the exact field/region
- Click "Request more info" → opens a message compose to the bidder, logged as an event
- Attempt to close case without decision → blocked, inline message explaining why
- Select a decision that differs from AI recommendation → remarks field becomes required, submit disabled until filled

**Content:** Full compliance check list (name, source, status, evidence link), anomaly flags (description, cited documents/fields, severity), AI recommendation text, extracted document fields with confidence indicators, decision history if reopened.

**Loading State:** If verification/extraction is still running, show a visible pipeline-stage progress ("Extracting documents → Running checks → Analyzing consistency") rather than a generic spinner — this can take up to 2 minutes per PRD NFRs.

**Empty State:** N/A — a case always has at least intake data; if checks haven't run yet, show "Verification in progress" state described above.

**Error State:** A specific unreachable source shows "Pending — source unreachable" inline on that check row (never a false pass); a failed AI output shows "Analysis unavailable — manual review required" in place of the flag, not a blank.

**Success State:** After decision is recorded, panel collapses to a confirmation summary with timestamp, decision, officer name, and a link to the audit entry; case moves to "Closed" in the dashboard.

**Accessibility:** Score and risk are never color-only (icon + numeric + text label); document viewer zoom/pan is keyboard-operable; all evidence citations are focusable links with descriptive `aria-label`s (not just "click here").

**UX Notes:** This is the screen most likely to be scrutinized by judges/auditors — the separation between "verified fact" (rule engine) and "AI-drafted" content must be immediately visually obvious, not just labeled in small text.

---

### SCR-004 — Explainability View ("Why this score")

**Purpose:** Let an officer (or auditor) drill from the final score down to every contributing check and its weight.

**User:** Officer, Vigilance

**User Goal:** Verify the score isn't a black box — see exactly what it's built from.

**Entry Point:** "Why this score?" link next to the score badge on SCR-003.

**Exit Points:** Back to Bid Application Detail, individual check detail.

**Primary CTA:** None — this is a read-focused screen; the implicit action is "close" or "back."

**Content Hierarchy:** Score total → breakdown by check category with individual weights and pass/fail/pending contribution → severity-weighted anomaly contributions → link to each underlying check.

**Required UI Components:** Horizontal stacked bar or waterfall-style breakdown, expandable rows per category, weight labels, link-outs to each check.

**Layout:** Single column, centered, max 800px width for readability; breakdown chart at top, detail list below.

**Interaction:** Click any category → jumps to that check's full detail on SCR-003.

**Loading/Empty/Error:** Same conventions as SCR-003; an "Incomplete" score explicitly shows which checks are still pending rather than a misleading number.

**Accessibility:** Chart must have a text-table equivalent (never chart-only); all values keyboard-navigable.

**UX Notes:** This screen is a trust-building tool, not a dead end — every element should feel like "you can verify this yourself," reinforcing the platform's honesty about AI vs. deterministic logic.

---

### SCR-006 — Bidder Upload Portal

**Purpose:** Guide an MSME bidder through submitting exactly the right documents, with early warning on problems.

**User:** Bidder (Priya persona)

**User Goal:** Submit a complete, correct set of documents without guessing.

**Entry Point:** Link from GeM bid submission flow, or direct portal login.

**Exit Points:** Submission Status screen.

**Primary CTA:** "Upload" per checklist item; "Submit" once all mandatory items are addressed.

**Secondary Actions:** Replace a document, view why a document is required, save and continue later.

**Content Hierarchy:** Tender name + closing countdown → document checklist (mandatory items first, clearly marked) → per-item upload widget → overall completion indicator → submit action.

**Required UI Components:** Progress bar, checklist items with status icons (not started / uploading / extracted / flagged), file upload widget (drag-drop + browse), plain-language help tooltip per document type, confidence/confirmation indicator.

**Layout:** Single column, mobile-first, max 600px on desktop; large touch targets (min 44x44px).

**Interaction:**
- Upload a file → shows immediate "Uploaded — reading document..." then "Read successfully" or a specific issue ("This certificate expired on [date] — please upload a current one")
- Click a checklist item's info icon → plain-language explanation of why it's needed
- Attempt to submit with mandatory items missing → inline list of what's missing, submit disabled

**Content:** Document name in plain language (not "MCA21 extract" but "Company registration proof"), required/optional label, upload status, extraction confidence feedback.

**Loading State:** Per-item "Reading your document..." indicator, never a page-level blocking spinner.

**Empty State:** Checklist populated but nothing uploaded yet — each item shows a clear "Upload" call to action, no false checkmarks.

**Error State:** Corrupted/wrong file type → immediate, specific rejection message with what's needed instead ("This file couldn't be read. Please upload a clear PDF or photo of your GST certificate.").

**Success State:** "Submission received" confirmation with a summary of what was submitted and what happens next.

**Accessibility:** Large text, high contrast, simple vocabulary (avoid "Udyam Registration Number" alone — pair with "MSME registration number"); works fully on a small mobile screen with a basic camera-upload flow.

**UX Notes:** This is the one screen where the audience skews non-technical and anxious about losing a bid — err toward reassurance and clarity over completeness of information density.

---

### SCR-008 — Tender Rule Configuration (Admin)

**Purpose:** Let an admin define which checks and thresholds apply to a tender/category, without code.

**User:** Procurement-Systems Admin

**User Goal:** Set up a correct, conflict-free rule set quickly and confidently.

**Entry Point:** Admin Console → "Rule Configuration."

**Exit Points:** Confirmation → rule set active; back to Admin Console.

**Primary CTA:** "Save & Activate."

**Secondary Actions:** Duplicate an existing rule set as a starting point, preview affected bidders, toggle a check's source (mock/live).

**Content Hierarchy:** Tender/category selector → list of available checks (toggle on/off) → per-check threshold/condition builder → validation summary → save action.

**Required UI Components:** Category selector, toggle list, condition builder (plain-language sentence form: "[Field] must be [operator] [value]"), validation banner, source toggle (mock/live) per check, save/activate button.

**Layout:** Two-column: left = check list/toggles, right = condition detail for the selected check. Full-width validation banner above the save button.

**Interaction:**
- Toggle a check on → condition builder appears for that check
- Save with a conflicting/incomplete rule → blocked with a specific, inline error naming the conflict (not a generic "invalid configuration")
- Save when bid applications already exist against this tender → requires a second-approver confirmation (per §15 insider-misuse mitigation)

**Loading/Empty/Error:** Standard conventions; an empty rule set shows a clear "No checks configured yet — this tender has no eligibility rules" warning, since this is a meaningful gap, not a neutral empty state.

**Accessibility:** Condition builder must be fully operable via keyboard and screen reader — this is a critical-path admin task, not a peripheral one.

**UX Notes:** Never expose raw JSON/code to the admin — every condition should read as a plain sentence, per the product's "no-code" promise.

---

### SCR-010 — Audit Trail Viewer

**Purpose:** Reconstruct exactly what happened on a case, for anyone who wasn't involved in the original review.

**User:** Officer, Vigilance

**User Goal:** Understand, chronologically and in plain English, every action taken on a case.

**Entry Point:** "View Audit Trail" link from Bid Application Detail; direct search from Vigilance role.

**Exit Points:** Export/print, back to case.

**Primary CTA:** None (read-only); "Export" is the closest to an action.

**Content Hierarchy:** Case identity header → chronological event timeline (uploads, extractions, adapter calls, AI outputs, officer actions) → hash-chain integrity indicator → export action.

**Required UI Components:** Vertical timeline component, event-type icons, expandable event detail (before/after state), integrity badge ("Chain verified" / "Compromised — alert raised"), export button, search/filter by actor or date.

**Layout:** Single column, generous line height for scan-reading; timeline on the left with a spine, detail expands inline.

**Interaction:** Click an event → expands full before/after state and any linked evidence; filter by actor/date narrows the timeline instantly.

**Loading/Empty/Error:** If the hash chain fails validation, this is a high-severity state — show a prominent, unambiguous banner, not a subtle icon change, and this must never be dismissible without escalation logged.

**Accessibility:** Timeline must be navigable linearly by screen reader (not spatially dependent); every icon has a text equivalent.

**UX Notes:** This screen is the product's credibility centerpiece — plain language over technical log format is essential, since its real audience (an auditor, a court, an RTI requester) is not a developer.

---

## 8. Primary User Journey Design

**Journey: Officer reviews and decides on a bidder (Flow A core loop)**

```
Entry (Dashboard, sees case needing review)
  ↓
First Decision (which bidder to review — sorted by risk)
  ↓
Primary Action (click "Review")
  ↓
Input (none required yet — officer reads: score, checks, flags)
  ↓
Processing (officer opens evidence for any flag they want to verify)
  ↓
Result (officer forms a judgment, informed by AI recommendation + evidence)
  ↓
Confirmation (officer records decision, remarks if overriding AI)
  ↓
Next Action (return to Dashboard, next case in queue)
```

| Step | Screen | User Intention | UI Element | Interaction | Feedback | Next Step |
|---|---|---|---|---|---|---|
| 1 | Dashboard | Find next case to review | Bidder table, risk sort | Click row | Row highlights, navigates | Bid Application Detail |
| 2 | Bid Detail | Understand overall status | Score badge, check list | Scan | Immediate visual read | Drill into a flag |
| 3 | Bid Detail | Verify a specific flag | Evidence citation chip | Click | Document viewer opens to exact field | Confirm or dismiss concern |
| 4 | Bid Detail | Form a judgment | AI recommendation panel | Read (labeled AI-drafted) | Clear "review required" framing | Open Decision Panel |
| 5 | Decision Panel | Record outcome | Decision radio + remarks | Select, type remarks if overriding | Submit enabled only when valid | Confirmation toast |
| 6 | Bid Detail | Confirm it's done | Confirmation summary | — | Case marked Closed, audit event created | Back to Dashboard |
| 7 | Dashboard | Move to next case | Updated table | — | Reviewed case no longer "pending" | Repeat |

**Optimization note:** The PRD's Flow A includes bidder clarification requests and resubmission loops; those are modeled as an optional branch off Step 3 (not a mandatory step), so the primary path stays as short as steps 1–7 above for the common case where no clarification is needed.

---

## 9. Navigation Design

**Desktop**
- Persistent left sidebar (240px), role-scoped: Officer sees Dashboard / Comparison / Notifications / Analytics; Admin sees Rule Config / Sources / Users; Vigilance sees Audit Search.
- Top bar: current tender selector (officer), search, notification bell, profile menu.
- Active state: filled icon + label + left accent bar on the current sidebar item.

**Mobile / Tablet**
- Bottom navigation bar for the 3–4 most-used destinations (Officer: Dashboard, Notifications, Profile). Full sidebar collapses into a hamburger for less-frequent items (Analytics, Admin functions are desktop-first per NFRs).
- Back behavior: always returns to the immediate parent (Bid Detail → that tender's Dashboard), never a generic "home."

**Breadcrumbs:** Shown on any screen more than one level deep (e.g., Dashboard → Bidder Name → Explainability View), so officers reviewing many cases never lose their place.

**Deep Links:** Notification Center and email/SMS reminders link directly to the specific Bid Application Detail, bypassing the dashboard.

**Protected Routes:** Every screen except SSO Login requires authentication; role mismatch (e.g., a Bidder trying to open another bidder's case) returns a clear 403 screen, logged as a security event per §15.

**Navigation Rules:**
- **Save:** Confirms inline, stays on screen (rule config, profile).
- **Submit (decision):** Confirms, then offers "Next case" as the primary follow-up action.
- **Cancel:** Returns to the previous screen with no changes persisted; if a partial decision/remarks draft exists, prompts to confirm discarding.
- **Delete:** Never truly deletes case data (per §12); always a confirmation modal explaining what will happen (e.g., document versioning).
- **Logout:** Standard OIDC flow, clears session, returns to Login.
- **Session expiration:** Graceful re-auth prompt that preserves the in-progress screen/state where possible (e.g., an unsaved decision draft is warned about before redirecting to login).

---

## 10. Wireframe Requirements

**SCR-002 — Officer Dashboard**
```
┌───────────────────────────────────────────────────┐
│ Top bar: Tender selector · Search · Notifications  │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Summary strip: Total | Pending | High Risk│
│          ├──────────────────────────────────────────┤
│          │ Bidder table (sortable, filterable)       │
│          │  [Name] [Score] [Risk] [Status] [Review]  │
│          │  ...                                       │
└──────────┴──────────────────────────────────────────┘
```
Above the fold: summary strip + first 5–8 table rows. Table scrolls; sidebar and top bar are fixed.

**SCR-003 — Bid Application Detail**
```
┌───────────────────────────────────────────────────┐
│ Bidder header: Name · App ID · Score · Risk badge  │
├───────────────────────┬─────────────────────────────┤
│ AI Recommendation      │                             │
│ (labeled AI-drafted)   │   Document Viewer            │
├───────────────────────┤   (sticky, side-by-side       │
│ Compliance Checks      │    extracted field vs.        │
│ (grouped, expandable)  │    source image)              │
├───────────────────────┤                             │
│ Anomaly Flags (cited)  │                             │
├───────────────────────┴─────────────────────────────┤
│ Decision Panel (sticky footer): Qualify/Disqualify/  │
│ Request Info · Remarks · Submit                      │
└───────────────────────────────────────────────────┘
```
Above the fold: header + score + first 2–3 checks. Decision Panel always reachable via a persistent floating "Decide" button on scroll.

**SCR-006 — Bidder Upload Portal**
```
┌───────────────────────────────────┐
│ Tender name · Closing countdown    │
├─────────────────────────────────────┤
│ Progress bar (X of Y complete)     │
├─────────────────────────────────────┤
│ ☐ Document 1  [Upload]  ⓘ          │
│ ☑ Document 2  Read successfully    │
│ ⚠ Document 3  Expiring — reupload  │
├─────────────────────────────────────┤
│           [Submit]                 │
└─────────────────────────────────────┘
```
Single-column, mobile-first; everything above is visible without horizontal scroll at 360px width.

---

## 11. Visual Design Direction

**Design Personality:** Institutional, trustworthy, clear, modern-but-restrained. Not playful, not clinical/cold, not consumer-flashy.

**Visual Mood:** The feeling of a well-run government office that has modernized properly — calm confidence, not sterile bureaucracy and not startup energy. An officer should feel the tool is serious enough to stake a decision on.

**Design References (patterns, not copies):** The evidence-linked clarity of modern fintech compliance/KYC dashboards; the calm data density of enterprise audit/observability tools (structured, scannable, not decorative); Indian government digital service design patterns (GIGW-aligned, plain language, high contrast) for the bidder-facing portal specifically.

---

## 12. Color System

| Token | Usage | Notes |
|---|---|---|
| **Primary** | Key actions, active nav, links | A deep, institutional blue — signals trust and official process without feeling corporate-cold |
| **Secondary** | Supporting accents, secondary buttons | A muted teal/slate, used sparingly |
| **Background** | Page background | Near-white, very light neutral gray |
| **Surface** | Cards, panels, table rows | White, subtle elevation via shadow not color |
| **Text** | Primary body/headings | Near-black, high contrast |
| **Muted Text** | Secondary labels, timestamps, helper text | Mid-gray, meets AA contrast on Surface |
| **Border** | Dividers, input outlines | Light neutral gray |
| **Success** | Passed checks, confirmations | Muted green, paired always with a checkmark icon |
| **Warning** | Pending, expiring, needs-attention | Muted amber, paired with a clock/alert icon |
| **Error** | Failed checks, blocking issues | Restrained red (not alarm-red), paired with an X/flag icon |
| **Information** | AI-drafted content background tint | A distinct, cool neutral tint (e.g., pale violet-gray) reserved *only* for AI-authored content, never reused elsewhere — this becomes the visual signal for "drafted, not verified" |

All status colors must pair with an icon and a text label — color is never the sole carrier of meaning (§22). Contrast ratios meet WCAG 2.1 AA minimum (4.5:1 text, 3:1 large text/icons) against their background.

---

## 13. Typography System

**Font family:** A humanist sans-serif optimized for screen legibility and multilingual support (English/Hindi/Tamil per F19) — e.g., Inter or Noto Sans as primary, with Noto Sans Devanagari/Tamil as the paired script fallback.

| Style | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| H1 | 28px | Semibold | 1.3 | Page titles ("Compliance Dashboard") |
| H2 | 22px | Semibold | 1.35 | Section headers ("Compliance Checks") |
| H3 | 18px | Medium | 1.4 | Card/subsection titles |
| Body | 15px | Regular | 1.5 | Primary content, check descriptions |
| Body Small | 13px | Regular | 1.5 | Secondary/supporting text |
| Caption | 12px | Regular | 1.4 | Timestamps, metadata |
| Label | 13px | Medium | 1.3 | Form labels, badges |
| Button | 14px | Medium | 1.2 | All button text |

Letter spacing: default (0) throughout — avoid tightened/expanded tracking, which harms legibility for Devanagari/Tamil pairing.

---

## 14. Spacing & Grid System

- **Base spacing unit:** 4px
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px
- **Container width:** Max 1280px on desktop dashboards; 600px max for bidder portal forms
- **Grid:** 12-column, 24px gutters (desktop); 4-column, 16px gutters (mobile)
- **Section spacing:** 32–48px between major sections
- **Component spacing:** 16px default padding inside cards/panels; 8px between related inline elements
- **Border radius:** 8px for cards/inputs, 4px for badges/chips, 999px (pill) for status badges

---

## 15. Component System

### Buttons
- **Purpose:** Trigger primary/secondary/destructive actions
- **Variants:** Primary (filled, primary color), Secondary (outlined), Tertiary (text-only link-style), Destructive (filled, error color, reserved for Disqualify/Delete-type actions)
- **States:** Default, Hover (slight darken), Focus (visible outline ring), Active (pressed), Disabled (reduced opacity, no pointer), Loading (inline spinner, label retained e.g. "Saving...")
- **Behavior:** Destructive actions always require a confirmation step; loading buttons disable re-submission
- **Accessibility:** Minimum 44x44px touch target; visible focus ring; `aria-disabled` when loading

### Inputs
- **Variants:** Text, Number, Search, Select, Checkbox, Radio, Toggle, File Upload
- **States:** Default, Focus, Filled, Error (with inline message), Disabled
- **Behavior:** Labels always visible (never placeholder-only); inline validation on blur; file upload shows progress and per-file status
- **Accessibility:** Every input has a programmatically associated `<label>`; error messages linked via `aria-describedby`

### Navigation
- **Sidebar:** Role-scoped items, active-state accent bar, collapsible on tablet
- **Tabs:** Used within Bid Application Detail sub-sections; keyboard arrow-navigable
- **Breadcrumbs:** Text links separated by a chevron, truncate middle segments on narrow screens

### Data
- **Cards:** Used for summary stats and bidder comparison; consistent padding/shadow
- **Tables:** Used for bidder lists, check lists, audit events; sortable headers, zebra-free (rely on borders, not stripes, for accessibility)
- **Status Badges:** Icon + label + muted color pill (Pass/Fail/Pending/Not Evaluated/Incomplete)
- **Charts:** Used only in Analytics/Explainability where they answer a specific question (§20); always paired with a data-table alternative

### Feedback
- **Toast:** Bottom-right, auto-dismiss after 5s for confirmations, manual-dismiss for warnings
- **Alert/Banner:** Full-width, top-of-section, used for source-unavailable or validation-conflict states
- **Modal:** Reserved for destructive confirmations and unsaved-changes warnings only (§25)
- **Progress Indicator:** Stepped/labeled progress for the extraction/verification pipeline, not a generic spinner

---

## 16. Design States

Every interactive component defines: Default, Hover, Focus, Active, Selected, Disabled, Loading, Success, Error. States are distinguished by a combination of icon, label text, border treatment, and elevation — never color alone. Focus states use a consistent 2px visible outline in the primary color across all components, satisfying keyboard-navigation requirements.

---

## 17. Forms & Input UX

- **Field hierarchy:** Mandatory fields marked with a text "(required)" label, not a color-only asterisk
- **Labels:** Always visible above the input; placeholders used only for format examples ("e.g., 22AAAAA0000A1Z5"), never as the label itself
- **Validation:** Inline, on blur, with a specific message ("GSTIN must be 15 characters") not a generic "Invalid input"
- **Required fields:** The Decision Panel's remarks field becomes required and is visually marked the moment an officer's decision diverges from the AI recommendation
- **Character limits:** Shown as a live counter for remarks/notes fields with a cap
- **Auto-save:** Rule configuration and long remarks drafts auto-save locally to prevent loss on accidental navigation
- **Unsaved changes:** A confirmation modal on navigation-away if a decision or rule form has unsaved input
- **Submission feedback:** Every submit shows an immediate inline confirmation or specific error — never a silent success

---

## 18. Dashboard Design

**Information Hierarchy (first 5 seconds):** How many bidders need attention, and which are highest-risk, must be answerable at a glance — this drives the summary strip + risk-sorted table design in SCR-002.

**KPIs / Metrics:** Total cases, pending review count, high-risk count, average time-to-decision (for management-facing Analytics).

**Primary Actions:** "Review" the next case; for Analytics, "drill into" a trend.

**Data Visualization:** Cards for point-in-time counts; simple bar/line charts only for time-series (cycle-time trend) and category breakdowns (common failure reasons) in Analytics — never a chart where a number or short list would answer the question just as well.

**Personalization:** Officer sees only tenders assigned to them; Admin sees configuration tools; Vigilance sees a read-only audit search bar as their landing view instead of a case list.

---

## 19. AI UX

**AI Entry Point:** Implicit — AI runs automatically after document upload (extraction) and after checks complete (anomaly detection, recommendation). No manual "ask AI" trigger; this keeps AI bounded to the fixed pipeline (§11 of PRD), not a free-form assistant.

**Input:** Extracted document fields + the tender's active rule set + prior flags for this case only (never cross-case data).

**Processing:** Visible, labeled pipeline stages ("Extracting documents" → "Cross-checking sources" → "Analyzing consistency" → "Drafting recommendation"), shown as a progress stepper, not a generic spinner, since this can take up to 2 minutes.

**Output:** Every AI output — extracted field, anomaly flag, or recommendation — is rendered inside a visually distinct "AI-drafted" container (the reserved Information color tint from §12) with a persistent label. It is never styled identically to a deterministic rule-engine result.

**Sources:** Every AI claim carries a citation chip naming the exact document and field; clicking it opens the document viewer scrolled/highlighted to that exact region.

**Confidence:** Extraction confidence is shown as a simple three-tier indicator (High/Medium/Low, icon + label) next to each extracted field, not a raw percentage that implies false precision.

**Correction:** Officers can flag "This looks wrong" on any AI output inline; this doesn't change the record but feeds the model/rule review loop (§11 of PRD) and is itself an audit event.

**Regeneration:** Not offered to end users — the pipeline is deterministic-order and re-running is an explicit "Re-verify" admin/officer action logged as such, not a casual "try again" button, to avoid implying the AI can be nudged toward a different answer.

**Feedback:** A lightweight thumbs-up/down plus optional comment on the AI recommendation panel specifically, separate from correcting individual extracted fields.

**Failure:** A failed extraction or schema-invalid AI output renders as "Analysis unavailable — manual review required," never a partially-parsed guess.

**Human Control:** The Decision Panel is the only place a case's status can change, and it is never pre-filled or defaulted to the AI's recommendation — the officer must actively select an option every time.

---

## 20. Data Visualization

| Chart Type | Used For | Notes |
|---|---|---|
| Horizontal stacked bar | Explainability View score breakdown | Always paired with a text table |
| Line chart | Analytics: cycle-time trend over time | Time range selector required |
| Bar chart | Analytics: common failure-reason breakdown | Sorted descending, labeled directly (no reliance on a legend alone) |
| Simple donut/ring | Dashboard summary (e.g., risk distribution) | Used sparingly; always paired with numeric labels, not color-only segments |

All charts: labeled axes/segments, visible legends with text (not color-only), tooltips on hover/focus, an accessible data-table fallback, explicit empty state ("No data for this period") and error state ("Couldn't load trend data — retry"). Charts are decorative in no case — each one must answer a stated user question (§20 rule).

---

## 21. Responsive Design

| Breakpoint | Range | Primary Use |
|---|---|---|
| Desktop | ≥1280px | Officer/Admin primary workspace |
| Tablet | 768–1279px | Officer read/review use (per NFR §16) |
| Mobile | <768px | Bidder Upload Portal, Notification Center |

**Officer Dashboard/Detail:** Tablet collapses the two-column Bid Application Detail into a stacked single column (checks/flags above, document viewer below, expandable); sidebar collapses to icon-only. Full rule-configuration editing remains desktop-first per NFRs — tablet shows it read-only with a "switch to desktop to edit" note.

**Bidder Upload Portal:** Fully mobile-first single column at all breakpoints; upload widget supports direct camera capture on mobile.

**Tables:** On mobile/tablet, the bidder list collapses from a table to a stacked card list (name + score + risk + a "Review" button per card) rather than a horizontally-scrolling table.

**Modals:** Full-screen on mobile, centered dialog on desktop/tablet.

**Touch targets:** Minimum 44x44px on all interactive elements at mobile/tablet breakpoints.

---

## 22. Accessibility

- **Keyboard navigation:** Every action reachable via Tab/Shift+Tab/Enter/Space; logical tab order following visual hierarchy
- **Focus indicators:** Consistent 2px visible outline, never removed via CSS
- **Screen readers:** Semantic HTML (`<table>`, `<nav>`, `<button>`, headings in order); ARIA only where semantic HTML is insufficient
- **Semantic structure:** One `<h1>` per page; logical heading nesting
- **Color contrast:** WCAG 2.1 AA minimum throughout; verified against both light backgrounds and status-tinted panels
- **Touch target size:** 44x44px minimum
- **Form labels:** Always explicit and programmatically associated
- **Error messaging:** Specific, actionable, linked to the relevant field
- **Motion:** Respects `prefers-reduced-motion`; no motion carries meaning that isn't also conveyed statically
- **Alternative text:** All icons/status graphics have text equivalents
- **Accessible tables:** Proper `<th>` scoping, sortable headers with `aria-sort`
- **Accessible charts:** Text-table equivalent required for every chart

Bidder-facing screens additionally target GIGW alignment, with English + Hindi labels at minimum for the pilot.

---

## 23. Microcopy & Content Design

**Tone:** Professional, direct, plain-language. Never bureaucratic-cold, never casual/jokey.

**Voice:** Pramaan speaks like a careful, well-informed colleague — it states facts plainly, flags concerns clearly, and never oversells certainty it doesn't have.

- **Button labels:** Action-first, specific — "Record Decision," not "Submit"; "Upload GST Certificate," not "Choose File"
- **Error messages:** State what happened and what to do — "This file couldn't be read. Please upload a clear PDF or photo." not "Upload failed."
- **Empty states:** Explain what's missing and why, plus a next action — "No bidders yet — this tender is still accepting bids until [date]."
- **Success messages:** Confirm specifically what happened — "Decision recorded: Disqualified. Audit entry created."
- **Tooltips:** Short, plain-language explanations of why a document/check is needed, never jargon-only.
- **Confirmation dialogs:** State the consequence plainly — "This will permanently close the case. Continue?"
- **AI messages:** Always self-identify — "AI-drafted recommendation. Review the evidence before deciding."

---

## 24. Empty, Loading & Error UX

**Empty**
```
Icon (neutral, not sad/negative)
↓
"No [thing] yet — [reason/context]"
↓
Primary next action, if one exists
```

**Loading**
```
Named pipeline stage ("Extracting documents...")
↓
Progress indicator where duration is known/bounded
↓
Explicit completion state
```

**Error**
```
"[Specific thing] didn't work"
↓
Why it matters ("This check couldn't be verified")
↓
What the user can do ("Retry" / "Mark as manual review")
```

Generic messages like "Something went wrong" are used only as a last-resort fallback when no specific cause is available, and are always paired with a retry action and a way to report the issue.

---

## 25. Modals & Confirmations

**Use modals for:** Delete/deactivate confirmations, unsaved-changes warnings, disqualify confirmation (destructive, consequential), rule-configuration activation when active bid applications already exist (second-approver flow).

**Avoid modals for:** Anything read-only (use an inline panel or dedicated screen instead — e.g., Explainability View is a screen, not a modal), routine confirmations that a toast can handle (document uploaded successfully), multi-step workflows (use a dedicated flow, not a modal wizard).

**Modal overload rule:** No screen should be able to trigger more than one modal in sequence without an intervening user action.

---

## 26. Notification & Feedback UX

| Type | When | Where | Duration | Priority |
|---|---|---|---|---|
| Toast | Action confirmations (saved, uploaded, decision recorded) | Bottom-right (desktop), bottom (mobile) | 5s auto-dismiss | Low |
| Banner/Alert | Source unavailable, rule conflict, hash-chain issue | Top of relevant section | Persistent until resolved/dismissed | Medium–High |
| Notification Center item | Document expiring, case pending near deadline, decision needed | Bell icon, dedicated screen | Persistent until read/actioned | Medium |
| Email/SMS | Bidder document expiry reminder, officer case-pending alert | External | N/A | Medium |

Security/hash-chain alerts are never toast-only — they require a persistent, high-visibility banner and are logged for escalation.

---

## 27. Trust & Credibility

Given Pramaan directly affects real bids and involves AI-generated content:

- **Verification badges:** Each compliance check shows its source and whether it's mock or live data ("GSTN — Sandbox data" during pilot), so the officer always knows the currency/reality of what they're seeing.
- **Source attribution:** Every extracted field and AI flag cites its originating document.
- **Audit history:** Visible, one click away, from every case.
- **Status indicators:** "Last refreshed on [date]" on the blacklist/debarment check, honestly reflecting its non-real-time nature (§0 of PRD).
- **Timestamps:** On every check, flag, and decision.
- **Explanations:** The Explainability View exists specifically to make the score legible, not just displayed.
- **Confirmation steps:** Destructive/consequential actions (Disqualify, rule activation over live cases) require explicit confirmation.

Trust is established primarily at the moment an officer first sees an AI flag — this is where the "AI-drafted, cite your evidence" visual pattern (§19) matters most.

---

## 28. Design System Tokens

```
Colors:      primary, secondary, background, surface, text, text-muted,
             border, success, warning, error, info (AI-content tint)
Typography:  font-family-latin, font-family-devanagari, font-family-tamil,
             h1, h2, h3, body, body-small, caption, label, button
Spacing:     space-1 (4px) … space-8 (64px), per §14 scale
Radius:      radius-sm (4px), radius-md (8px), radius-pill (999px)
Shadows:     shadow-sm (cards), shadow-md (modals/popovers)
Borders:     border-width-1 (1px default), border-width-2 (2px focus ring)
Motion:      duration-fast (120ms), duration-standard (200ms),
             easing-standard
Breakpoints: mobile (<768px), tablet (768–1279px), desktop (≥1280px)
Z-index:     z-nav (10), z-dropdown (20), z-toast (30), z-modal (40)
```

---

## 29. Motion & Interaction Design

- **Page transitions:** Minimal — simple fade/slide under 200ms; never a delay that slows an officer working under a deadline.
- **Hover effects:** Subtle elevation/darken on interactive rows and buttons.
- **Button feedback:** Immediate pressed-state on click, before any network response.
- **Loading:** Named-stage progress (see §24), not decorative spinners with no context.
- **Progress:** Linear progress bar for the extraction/verification pipeline, with stage labels.
- **Modal transitions:** Quick fade + slight scale-in, under 200ms.
- **Success feedback:** Brief checkmark animation on decision confirmation, then settles to a static confirmation state — motion is not the only carrier of the "success" message.
- **Error feedback:** No shake/attention-grabbing animation; a static, clearly-labeled error state communicates urgency without gimmick.

All motion respects `prefers-reduced-motion` and is disabled/replaced with instant state changes when set.

---

## 30. Design Anti-Patterns

Explicitly avoid, for this project:
- Styling AI-drafted content to look identical to verified/deterministic results
- Any implicit or explicit "auto-qualify/auto-disqualify" visual affordance
- Color-only risk/status indicators
- Decorative charts that don't answer a specific question
- Modal overload for routine confirmations
- Placeholder-as-label in any form, especially the Bidder Upload Portal
- Dense, jargon-heavy microcopy on bidder-facing screens
- Alarming/panic-red styling for "High Risk" that could bias an officer before they review evidence
- Gamification elements (streaks, badges, leaderboards) — inappropriate for a compliance/audit tool
- Hiding "Pending/Not Evaluated" states behind a default "pass" appearance
- Excessive animation on a tool used repeatedly, all day, under deadline pressure

---

## 31. Design Handoff Requirements

- **Screens:** All P0/P1 screens from §6, fully specified per §7 pattern
- **Components:** Full component library per §15, with all states per §16
- **States:** Loading/empty/error/success documented for every data-bearing screen
- **Responsive Versions:** Desktop/tablet/mobile for all officer- and bidder-facing screens; desktop-only acceptable for Admin rule configuration per NFRs
- **Prototype:** The primary journey in §8 fully clickable, plus the bidder upload journey and the officer-override journey (Flow C in PRD §8)
- **Design Tokens:** Exported per §28 in a format consumable by the frontend (e.g., Tailwind config or CSS variables, matching the React + TypeScript + Tailwind stack in the PRD's Tech Stack)
- **Assets:** Icon set (consistent style, includes all status icons), any illustrations for empty states
- **Developer Notes:** Interaction specs per component (hover/focus/loading behavior), especially for the pipeline-progress and evidence-citation patterns, which are non-standard and need explicit behavioral documentation

---

## 32. Figma Structure

```
00 — Cover & Overview
01 — Research (Personas, IA)
02 — User Flows (Flow A/B/C/D from PRD §8)
03 — Wireframes (low-fi, per §10)
04 — Design System (tokens, type, color, grid)
05 — Components (buttons, inputs, badges, tables, AI-content pattern)
06 — Screens — Officer
07 — Screens — Bidder Portal
08 — Screens — Admin
09 — Screens — Vigilance/Audit
10 — Responsive (tablet/mobile variants)
11 — Prototype (linked, clickable primary journeys)
12 — Developer Handoff (specs, redlines, tokens export)
```

---

## 33. Design QA Checklist

**UX**
- [ ] Primary user journey (officer review → decision) is clear and minimal
- [ ] Navigation is consistent across officer/bidder/admin/vigilance roles
- [ ] Every important action has one obvious, primary path
- [ ] Cognitive load is minimized on the dashboard and case detail
- [ ] Error and pending states have a clear recovery path

**UI**
- [ ] Typography follows the defined scale, no ad hoc sizes
- [ ] Spacing follows the 4px-based scale
- [ ] Components are reused consistently (no one-off buttons/badges)
- [ ] Visual hierarchy makes score/risk scannable in under 5 seconds
- [ ] AI-drafted content is visually distinct in every instance, with no exceptions

**Accessibility**
- [ ] Full keyboard navigation across every screen
- [ ] Visible focus states on every interactive element
- [ ] Color contrast verified AA across all status colors and tints
- [ ] Screen-reader semantics verified (headings, labels, table structure)
- [ ] Touch targets ≥44x44px on mobile/tablet

**Responsive**
- [ ] Desktop, tablet, and mobile variants exist for all officer/bidder screens
- [ ] Tables degrade to cards appropriately below tablet width
- [ ] Admin rule configuration has a documented tablet/mobile fallback (read-only)

**Handoff**
- [ ] All components documented with states
- [ ] Design tokens exported in dev-ready format
- [ ] Interaction behavior documented for non-standard patterns (evidence citation, pipeline progress)
- [ ] Prototype covers all P0 journeys

---

## 34. Design Priority Matrix

| Priority | Screen / Component | Reason | Design Effort |
|---|---|---|---|
| P0 | Officer Dashboard (SCR-002) | Daily entry point; validates core triage value | Medium |
| P0 | Bid Application Detail (SCR-003) | Core review screen; the product's central value proposition | High |
| P0 | Decision Panel | Architecturally required human-in-the-loop enforcement | Low |
| P0 | AI-drafted content pattern (component) | Trust/safety-critical visual distinction, used everywhere | Medium |
| P0 | Bidder Upload Portal (SCR-006) | Required for intake; MSME-facing, high stakes for adoption | Medium |
| P0 | Audit Trail Viewer (SCR-010) | Core credibility/differentiator feature | Medium |
| P1 | Explainability View (SCR-004) | Strengthens trust; not blocking for a minimal demo | Medium |
| P1 | Tender Rule Configuration (SCR-008) | Needed for real multi-tender use, not for a single-tender demo | High |
| P1 | Bulk Comparison View (SCR-011) | Valuable at scale, secondary for MVP | Medium |
| P2 | Analytics/MIS (SCR-012) | Management visibility, not core evaluation loop | Medium |
| P2 | Notification Center (SCR-013) | Quality-of-life, not core path | Low |
| P2 | Role & User Management (SCR-014) | Admin convenience, can start config-file-based for MVP | Low |

---

## 35. Final Design Direction

### DESIGN THIS

**Product:** Pramaan — AI-Powered Bid Compliance Verification Platform for GeM

**Design Goal:** Make bidder compliance review scannable, evidence-backed, and fast — without ever letting the interface imply the system, rather than the officer, has decided.

**Target User:** Procurement/tender evaluation officers at CPSUs (CPCL pilot), secondarily MSME bidders and vigilance staff.

**Primary User Journey:** Dashboard → open bidder case → review score/checks/AI flags with cited evidence → record decision (Qualify/Disqualify/Request Info) → confirmation → next case.

**Design Personality:** Institutional, trustworthy, clear, modern-but-restrained — a serious government tool, not a consumer app.

**Visual Direction:** Calm, evidence-first UI with a deep institutional blue as primary, muted status colors always paired with icons and labels, and a single reserved visual treatment for all AI-drafted content so trust is built through transparency, not confidence of tone.

**Primary Navigation:** Role-based left sidebar (desktop) / bottom nav (mobile), organized around Tender → Bidder → Check → Evidence.

**Core Screens:** Officer Dashboard, Bid Application Detail (with embedded Decision Panel), Explainability View, Bidder Upload Portal, Audit Trail Viewer, Tender Rule Configuration.

**Primary Components:** Risk/status badge (icon+label+color), evidence citation chip, AI-drafted content container, pipeline-stage progress indicator, sortable data table, decision form with conditional-required remarks.

**Typography:** Humanist sans-serif (Inter/Noto Sans family) with Devanagari/Tamil pairing, consistent type scale per §13.

**Color Direction:** Deep institutional blue primary; muted, icon-paired status colors (never color-only); a single reserved neutral tint exclusively for AI-drafted content.

**Responsive Strategy:** Desktop-first for officer/admin core workflows (tablet-adapted for read/review), fully mobile-first for the Bidder Upload Portal and Notification Center.

**Accessibility Standard:** WCAG 2.1 AA, GIGW-aligned for government-facing screens, full keyboard operability, no color-only meaning anywhere in the system.

**Most Important UX Principle:** Evidence over verdicts — every score, flag, and recommendation must be one click from the fact that produced it.

**Biggest UX Risk:** Automation bias — officers trusting the AI recommendation without reviewing evidence, eroding the human-in-the-loop guarantee the entire architecture depends on.

**Biggest Design Opportunity:** The Explainability View and evidence-citation pattern can become Pramaan's signature interaction — the moment that visibly demonstrates "this AI shows its work," turning a trust risk into the product's strongest differentiator.
