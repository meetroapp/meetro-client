# Backend User Readiness Audit

**Date:** July 4, 2026  
**Status:** Release-gate audit  
**Runtime changes:** None  
**Decision:** BACKEND NOT READY FOR REAL USERS

## Executive Summary

Meetro's frontend/product experience may be ready for Friends & Family
preparation, but the backend is not approved for real users from the evidence
available in this workspace.

The current `meetro-client` repository does not contain the deployed backend
application. It contains frontend code, backend-adjacent matching utilities,
and backend governance/audit documents. The frontend defaults to the Railway
API:

```text
https://athletic-rebirth-production-0a28.up.railway.app
```

Prior backend discovery identifies the authoritative backend source as a
separate repository:

```text
https://github.com/meetroapp/metro-server
```

Because the deployed backend source, production environment, Railway service,
database credentials, migration history, backups, and production logs are not
available in this local audit, this review cannot approve real-user backend
readiness. Existing evidence also shows concrete blockers: no migration
framework, incomplete authorization/ownership proof, incomplete workflow
persistence, partial schema evidence, no foreign keys in the inspected baseline,
and incomplete media storage readiness.

## Backend Readiness Decision

**BACKEND NOT READY FOR REAL USERS**

This decision is based on release safety, not product direction. The backend
must prove identity, ownership, persistence, media durability, and operational
recovery before Friends & Family users are invited.

## Evidence Reviewed

- `src/api.js`
- `src/services/authService.js`
- `src/utils/authFetch.js`
- `src/utils/twoFactorVerification.js`
- `src/pages/Login.jsx`
- `src/pages/Profile.jsx`
- `src/pages/Upload.jsx`
- `src/pages/ProjectGallery.jsx`
- `src/pages/ConversationThread.jsx`
- `src/utils/qaMobileWorkflowSeed.js`
- `server/tests/*.test.js`
- `docs/KnowledgeBase/BACKEND_SOURCE_INVENTORY.md`
- `docs/KnowledgeBase/BACKEND_IDENTITY_READINESS_AUDIT.md`
- `docs/KnowledgeBase/BACKEND_DATABASE_RELATIONSHIP_AUDIT.md`
- `docs/KnowledgeBase/BACKEND_FOUNDATION_PHASE_4_COMPATIBILITY_AUTHORIZATION_AND_IDENTITY_READINESS_REVIEW.md`
- `docs/KnowledgeBase/RuntimeEvidence/SCHEMA_BASELINE_V1.md`
- `docs/KnowledgeBase/RuntimeEvidence/DEPLOYMENT_PARITY_REPORT_V1.md`
- `docs/KnowledgeBase/RuntimeEvidence/OWNERSHIP_MATRIX_V1.md`
- `docs/backend-qa-seed-data-contract.md`

## Authentication Findings

**Status:** Not verified for real users.

Client evidence shows:

- Signup calls `POST /auth/signup`.
- Login calls `POST /auth/login`.
- Two-factor verification uses `/auth/request-2fa-code` and
  `/auth/verify-2fa-code`.
- Authenticated frontend requests send `Authorization: Bearer <token>` through
  `authFetch`.
- Client-side invalid-token handling clears local session state and routes back
  to login.

What was not verifiable locally:

- Real signup against production.
- Real login against production.
- Logout invalidation on the server.
- Password reset backend flow.
- Session expiration and refresh behavior.
- Protected route rejection across every API endpoint.
- Whether every endpoint derives user identity from the token instead of client
  payload fields.

Backend readiness requires direct production/staging verification with real test
accounts and server-side logs.

## Role / Account Findings

**Status:** Blocked.

The client supports personal and business modes, and prior work restored the
distinction between:

- business profile existence;
- current session state;
- current active role.

However, backend role/account readiness cannot be approved from this repository.
The audit could not verify:

- homeowner role persistence;
- professional role persistence;
- role switching without cross-scope data bleed;
- business profile ownership enforced server-side;
- business records inaccessible to unrelated users;
- personal contacts and business contacts isolated by active profile scope.

The existing governance documents classify authorization and identity readiness
as incomplete. A real-user backend must not rely on frontend mode state for data
ownership.

## Database Findings

**Status:** Blocked.

The production database is identified as PostgreSQL through prior backend
inventory and schema baseline evidence. The exact production database name,
owner, backup policy, restore policy, and currently deployed backend commit were
not verifiable in this local audit.

Prior schema baseline evidence found tables for:

- `users`
- `posts`
- `quote_requests`
- `messages`
- `contractor_profiles`
- `contractor_projects`
- `reviews`

The same baseline reports:

- no preserved full schema export;
- no tracked migration framework;
- no foreign keys found;
- no participant-membership constraints;
- no idempotency constraints;
- no role/status check constraints;
- no canonical schedule, job, invoice, closure, history, relationship, or audit
  event tables confirmed.

Database readiness is not stable enough for real-user trust.

## Data Separation Findings

**Status:** Blocked.

Strict ownership could not be proven for:

- messages;
- conversations;
- requests;
- jobs;
- quotes;
- invoices;
- business profiles;
- schedules;
- emergency records;
- portfolio items.

Specific risks:

- The observable message API is request-keyed, not conversation-keyed.
- No canonical Conversation persistence model is confirmed.
- Participant authorization is not proven.
- Prior evidence found no foreign keys in the production baseline.
- Many workflow records still appear to be client/localStorage-led.
- Several product concepts exist in the frontend without confirmed backend
  authority tables/routes.

Before real users, every fetch/update/delete path must prove owner scoping by
server-side authenticated principal, role/profile scope, and resource
membership.

## Demo / QA Safety Findings

**Status:** Needs production confirmation.

Positive local evidence:

- `src/utils/qaMobileWorkflowSeed.js` refuses to seed unless
  `import.meta.env.DEV` is true.
- The seed writes a clearly fake token, fake user, and local workflow state.
- `docs/backend-qa-seed-data-contract.md` describes staging-only seed behavior
  and states production seed execution must be refused.

Remaining risks:

- This local audit did not inspect the deployed production bundle.
- Production environment flags were not verified.
- Public QA/debug controls were not exhaustively tested in a deployed build.
- Demo users and real users were not tested against production data separation.

Demo safety is promising in the frontend source, but still requires production
verification.

## Core Persistence Findings

**Status:** Blocked.

The following real-user persistence requirements were not verified end to end:

- request;
- message;
- schedule visit;
- evaluation;
- quote;
- approval;
- invoice;
- business profile edit;
- portfolio upload.

Client evidence shows some backend persistence paths:

- requests/posts through `/posts`;
- contractor profiles through `/contractor-profiles`;
- portfolio projects through `/contractor-projects`;
- messages through `/messages`.

However, the current evidence does not prove full lifecycle persistence. Several
core workflow objects are still represented heavily in localStorage, local
registries, or frontend-derived records. The backend source inventory and schema
baseline do not confirm stable authority for schedules, evaluations, quotes,
approvals, invoices, completion, closure, history, or relationship memory.

Friends & Family users should not enter until these records survive refresh,
logout/login, app reinstall, backend restart, and deploy using backend-owned
data.

## Media / File Storage Findings

**Status:** Blocked.

Media storage readiness is not approved.

Positive evidence:

- Request photos use Cloudinary unsigned upload in `src/pages/Upload.jsx`.
- Portfolio/project photos use Cloudinary unsigned upload in
  `src/pages/ProjectGallery.jsx`.

Blocking evidence and gaps:

- Profile photos and business images can be read as base64 data URLs in
  `src/pages/Profile.jsx` and sent to profile endpoints or stored locally.
- Some completion/emergency/workflow photo flows read files as data URLs.
- Conversation image attachments in `src/pages/ConversationThread.jsx` can use
  `URL.createObjectURL(file)`, which is not durable across sessions or devices.
- No backend media ownership policy was verified.
- No private vs public media separation was verified.
- No file deletion behavior was verified.
- No signed upload, signed read, antivirus/safety, or access-control contract
  was verified.
- No file size/type limit enforcement was verified server-side.
- Upload survival across deploy/restart was not verified.
- Portfolio, profile logo, request photos, completion photos, and message
  attachments do not share a proven canonical storage contract.

If any uploaded user photos/files are stored only in localStorage, object URLs,
base64 database fields, or Railway ephemeral disk, that is a blocker before real
users. This audit found local/object/base64 media paths that must be replaced or
formally bounded before release.

## Security Findings

**Status:** Blocked.

Not verified locally:

- all API endpoints require authentication;
- all API endpoints enforce resource ownership;
- users cannot fetch another user's record by ID;
- logs avoid sensitive data;
- production environment variables are complete and correct;
- CORS is restricted to intended origins;
- rate limiting exists for auth, 2FA, upload, and message endpoints;
- error responses are safe and do not expose internals;
- secrets are rotated and not present in client/public bundles.

Existing evidence shows authentication is used, but authentication alone is not
authorization. Backend readiness requires endpoint-by-endpoint ownership tests.

## Production Readiness Findings

**Status:** Blocked.

Not verified locally:

- Railway service health at the current deployed revision;
- deployed commit parity with reviewed backend source;
- production environment variable inventory;
- production database backup and restore plan;
- release owner;
- rollback owner;
- migration owner;
- production logs/error handling;
- Friends & Family load tolerance.

Prior deployment parity evidence marks the authoritative deployed commit as
unknown. That is a release blocker because the team cannot prove what code is
serving real users.

## Blockers

1. Deployed backend source and commit parity are not proven.
2. No tracked backend migration framework is confirmed.
3. Full production schema export is not available in this repo.
4. Prior schema evidence found no foreign keys or participant membership
   constraints.
5. Authorization and role/profile ownership are not proven endpoint by endpoint.
6. Conversation persistence and conversation membership are not canonical.
7. Core lifecycle records are not fully backend-owned or persistence-tested.
8. Media storage is not release-ready for real users.
9. Production backup/restore and rollback ownership are not verified.
10. Production CORS, rate limiting, safe errors, and sensitive-log behavior are
    not verified.
11. Demo/QA safety is not proven against the deployed production build.

## Non-blocking Risks

These are lower than the blockers but should still be addressed:

- API documentation/OpenAPI contract is missing.
- Backend tests in this repo cover only matching utilities.
- Some frontend fallback behavior may mask backend persistence failures.
- Some workflow data names still reflect older request/quote concepts.
- Production monitoring/alerting evidence was not reviewed.
- Media storage uses more than one pattern, which increases drift risk.

## Required Fixes Before Real Users

1. Verify the deployed Railway backend commit and make deployment parity
   inspectable.
2. Establish a migration framework and capture a complete schema baseline.
3. Add ownership constraints and authorization checks for every user-owned
   resource.
4. Create endpoint-level tests proving cross-user access is rejected.
5. Canonicalize conversations, participants, and message membership.
6. Move real workflow persistence out of localStorage-only authority.
7. Define and enforce profile-scoped personal vs business data stores.
8. Standardize media storage on durable cloud storage with ownership controls.
9. Add file size/type/deletion/private-public media policies.
10. Verify production environment variables, CORS, rate limits, logs, backups,
    rollback, and health.
11. Run end-to-end persistence tests for request, message, schedule, evaluation,
    quote, approval, invoice, business profile, and portfolio upload.

## Recommended Verification Checklist

### Authentication

- Create a real staging user.
- Verify signup, login, 2FA, logout, and session expiration.
- Verify invalid/expired/timed-out 2FA states.
- Verify password reset if available.
- Verify protected endpoints reject unauthenticated requests.

### Roles and Ownership

- Create one homeowner and one professional.
- Create a business profile for the professional.
- Switch personal/business modes.
- Confirm business profile availability does not depend on transient session
  connection state.
- Attempt cross-user reads and writes for every resource class.

### Persistence

- Create, refresh, logout/login, and re-open:
  - request;
  - message;
  - schedule visit;
  - evaluation;
  - quote;
  - approval;
  - invoice;
  - business profile edit;
  - portfolio item.
- Restart/redeploy backend and confirm records remain.

### Media

- Upload request photos, portfolio photos, profile photos, business logos,
  message attachments, and completion photos.
- Confirm each upload is cloud-persistent.
- Confirm private media is not publicly enumerable.
- Confirm delete/replacement behavior.
- Confirm server-side file size/type enforcement.

### Production Operations

- Confirm Railway health.
- Confirm deployed commit.
- Confirm production database name/owner.
- Confirm backups and restore drill.
- Confirm migrations can run and rollback.
- Confirm CORS and rate limits.
- Confirm logs do not expose tokens, passwords, 2FA codes, or private media
  URLs.

## What Could Not Be Verified Locally

- Production Railway service state.
- Production database credentials, name, backups, and restore policy.
- Deployed backend commit.
- Backend environment variables.
- Server-side auth implementation beyond client-observable endpoint use.
- Server-side authorization and row ownership enforcement.
- Real production media storage behavior.
- Real production CORS/rate limiting/logging behavior.
- Friends & Family load tolerance.

## Final Decision

**BACKEND NOT READY FOR REAL USERS**

Exact next step before inviting real users:

Run a backend-only staging audit against the deployed Railway API and
PostgreSQL database with founder/admin access, using two isolated test accounts
and real media uploads. Do not invite Friends & Family users until identity,
ownership, persistence, media storage, and recovery are verified end to end.

Real users require real trust.
