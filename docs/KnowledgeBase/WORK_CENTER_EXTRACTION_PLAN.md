# Work Center Extraction Plan

## Objective

Reduce the Work Center from a multi-domain state owner into an operational
workspace that consumes authoritative Leads, Scheduling, Quotes, Work,
Completion, and Timeline services.

This is an extraction plan only. It does not authorize a refactor.

## Current Responsibility Map

`src/pages/ContractorDashboard.jsx` currently owns or directly manipulates:

- appointment creation, editing, deletion, and outcomes;
- quote history, decisions, PDF sharing, and conversion;
- active work state and status transitions;
- materials catalog and materials pause/resume;
- completion navigation and completed history;
- project records and global workflow timelines;
- dashboard-like metrics and mission selection;
- manual customer warnings and invitations.

## Findings

### WC-01: The Work Center page is a domain monolith

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** One page contains presentation, persistence, workflow
  rules, PDF generation, event creation, and cross-module navigation.
- **Problem:** A change to one workflow can regress unrelated tabs.
- **Correct owner:** Thin Work Center shell plus domain modules.
- **Recommended fix:** Extract behavior by ownership boundary, not merely by UI
  component.
- **Severity:** Critical

### WC-02: Existing utility is only a storage facade

- **File name:** `src/utils/workCenter.js`
- **Current behavior:** It wraps local storage for schedule, quotes, job records,
  selected project, and active snapshots.
- **Problem:** The utility is named as the module owner but still combines
  unrelated domains.
- **Correct owner:** Separate repositories for Scheduling, Quotes, Work, and
  Timeline.
- **Recommended fix:** Treat this utility as a compatibility adapter during
  extraction, not the final architecture.
- **Severity:** High

### WC-03: Tabs are treated as workflow destinations

- **File name:** `src/pages/BusinessCommandCenter.jsx`,
  `src/pages/BusinessDashboard.jsx`,
  `src/pages/ContractorDashboard.jsx`
- **Current behavior:** Other modules set storage keys to force Work Center tabs.
- **Problem:** Navigation state is used as an inter-module command protocol.
- **Correct owner:** Navigation/router state.
- **Recommended fix:** Pass explicit route intent and entity ID; let Work Center
  choose the view from a typed navigation request.
- **Severity:** High

### WC-04: Project context is reconstructed heuristically

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** Request, quote, job, schedule, emergency, and
  conversation IDs are checked in fallback order.
- **Problem:** Context selection can bind actions to the wrong project.
- **Correct owner:** Project context loader.
- **Recommended fix:** Require a project ID at Work Center entry and load a
  project-scoped read model.
- **Severity:** Critical

### WC-05: Timeline and records are generated inside the page

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** The page writes global workflow timelines and scans
  storage keys to discover project records.
- **Problem:** Work Center creates and discovers domain history through storage
  implementation details.
- **Correct owner:** Project event/timeline repository.
- **Recommended fix:** Query project records and append events through a
  dedicated interface.
- **Severity:** High

### WC-06: Completed history is a merged UI construct

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** Completed schedule rows, completion records, and
  homeowner requests are merged at render time.
- **Problem:** Deduplication is partial and revenue can be counted twice.
- **Correct owner:** Completion history projection.
- **Recommended fix:** Read a canonical completed-work collection.
- **Severity:** Critical

## Proposed Boundaries

### Work Center Shell

Owns:

- active tab;
- selected project;
- tab navigation;
- loading and error states;
- composition of module-owned read models.

Does not own:

- lead filtering;
- appointment lifecycle rules;
- quote lifecycle rules;
- project activation;
- completion writes;
- timeline persistence.

### Leads Module

Owns lead eligibility, visibility, review state, and conversion into a contacted
project.

### Scheduling Module

Owns appointment creation, update, cancellation, completion, and visit outcome.

### Quotes Module

Owns drafts, send, customer decision, revision, external-response evidence, and
quote-to-next-step state.

### Work Module

Owns project activation, status, materials pause/resume, and active-job
projection.

### Completion Module

Owns closeout, completion record, homeowner visibility, confirmation,
follow-up, and reporting events.

### Timeline Module

Owns immutable workflow events and supplies conversation, project record, and
history views.

## Safe Extraction Sequence

### Phase 0: Characterize

1. Document IDs, statuses, and storage precedence.
2. Add tests around current appointment, quote, active-work, and completion
   behavior.
3. Do not move UI yet.

### Phase 1: Read Interfaces

1. Introduce read-only selectors for schedule, quote history, active work,
   completed history, and timeline.
2. Switch Work Center rendering to selectors without changing writes.
3. Verify parity.

### Phase 2: Command Interfaces

1. Route appointment writes through Scheduling commands.
2. Route quote writes through Quote commands.
3. Route active-work writes through Work commands.
4. Route completion through one Completion command.

### Phase 3: Project Scope

1. Require project IDs for commands.
2. Replace global active-work fields with project records.
3. Retain compatibility reads until all call sites migrate.

### Phase 4: UI Split

1. Extract tab components after behavior is centralized.
2. Keep the Work Center shell responsible only for orchestration.
3. Remove old compatibility paths once telemetry and tests show no use.

## Extraction Opportunities by File

| File | Extract first | Destination owner | Risk |
| --- | --- | --- | --- |
| `ContractorDashboard.jsx` | appointment CRUD and outcomes | Scheduling | High |
| `ContractorDashboard.jsx` | quote lifecycle helpers | Quotes | Critical |
| `ContractorDashboard.jsx` | active snapshot transitions | Work | Critical |
| `ContractorDashboard.jsx` | completed-history assembly | Completion projection | High |
| `ContractorDashboard.jsx` | timeline append and scans | Timeline | High |
| `workCenter.js` | schedule access | Scheduling repository | Medium |
| `workCenter.js` | quote access | Quote repository | Medium |
| `workCenter.js` | job records | Timeline repository | Medium |
| `workCenter.js` | active snapshots | Work repository | High |

## Stop Conditions

Pause extraction and request human review if:

- a record cannot be tied to one project ID;
- emergency and standard workflows require incompatible status semantics;
- an existing screen depends on title matching;
- a cleanup operation could erase another active project;
- moving a write would change cross-device behavior;
- a compatibility adapter would become a new permanent authority.
