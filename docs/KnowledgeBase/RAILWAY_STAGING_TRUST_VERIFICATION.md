# Railway Staging Trust Verification

**Phase:** 4C Railway Staging Deployment & Two-Account Trust Verification  
**Date:** July 5, 2026  
**Scope:** Backend staging trust verification  
**Frontend/Product changes:** Friends & Family media upload deferral guards added  
**Final Backend Decision:** ✅ READY FOR FRIENDS & FAMILY TESTFLIGHT WITH MEDIA DEFERRED

## Executive Summary

Backend source-level security fixes have been documented and locally tested, a Railway staging API is identified, the governed schema baseline has been applied, and the two-account trust verifier has reached the core ownership checks:

```text
https://athletic-rebirth-staging.up.railway.app
```

Core backend trust is now materially improved. Media storage is not yet implemented as governed backend storage, so Friends & Family TestFlight 1 must launch with real-user media upload disabled/deferred.

The latest staging trust work confirms signup/login, posts ownership isolation, message thread isolation, workflow-event isolation, contractor profile ownership, contractor project ownership, safe invalid login behavior, and rejected unapproved CORS origin probes. Phase 4I removes the remaining media release blocker for Friends & Family by preventing real-user builds from starting unsafe upload, object URL, or base64 persistence flows.

## Staging Readiness Decision

✅ READY FOR FRIENDS & FAMILY TESTFLIGHT WITH MEDIA DEFERRED

Reason:

- A Railway staging backend service is identified and reachable.
- The staging schema baseline has been applied.
- Two isolated test accounts can be created and authenticated in staging.
- Core owner-scoped records passed the latest two-account trust checks.
- Media storage durability, privacy, deletion, and validation have not been proven with a governed upload/storage path.
- Friends & Family real-user media upload is now deferred in the UI until governed storage exists.
- Backup, restore, rollback, and deployment parity evidence have not been provided.

Friends & Family users may be invited only under the media-deferred release condition: no real-user profile photos, request photos, business logos, portfolio images, evaluation photos, completion photos, emergency photos, or message attachments may be uploaded or stored as durable media.

## Staging Service Details

| Item | Status | Evidence |
| --- | --- | --- |
| Railway staging backend service | Confirmed by task and reached by script | `https://athletic-rebirth-staging.up.railway.app` |
| Staging API URL | Confirmed | `https://athletic-rebirth-staging.up.railway.app` |
| Deployed branch | Not verified | Requires Railway deployment metadata. |
| Deployed commit | Not verified | `/health` did not expose commit metadata during the live run. |
| Backend source parity | Not verified | Requires deployed commit comparison against reviewed backend source. |
| Staging frontend origin | Not verified | Must be configured in the backend CORS allowlist. |
| Production separation | Not fully verified | Staging hostname is separate; database identity still requires Railway/admin confirmation. |

Required staging rule:

Staging must be a separate Railway service from production. Do not run destructive or write-heavy verification against production.

## Staging Database Details

| Item | Status | Evidence |
| --- | --- | --- |
| Separate staging PostgreSQL database | Reported by task, not independently verified | Founder/admin must confirm Railway database attachment. |
| Production database excluded | Not verified | Founder/admin must verify Railway variables and database attachment. |
| Local/dev database excluded | Not verified | Founder/admin must verify staging `DATABASE_URL`. |
| Migration history | Applied for baseline schema | `users`, `posts`, `contractor_profiles`, `quote_requests`, `messages`, workflow events, and contractor project checks run in staging. |
| Schema matches backend version | Partially proven by verifier | Core auth/posts/messages/profile/project endpoints ran; full schema export still requires founder/admin evidence. |
| Backup policy | Not verified | Must be documented before real users. |
| Restore policy | Not verified | Must be documented before real users. |

Database trust has enough evidence for staged two-account verification, but backup/restore and schema export evidence remain required before real users.

## Health Check Result

Expected staging check:

```text
GET /health
```

Required safe metadata:

- `status`
- `environment`
- `version`
- `commit`
- `uptime`

Must not expose:

- database URLs
- tokens
- credentials
- secret names
- private connection strings
- user data

Current Phase 4C status:

- Live run executed against `https://athletic-rebirth-staging.up.railway.app`.
- `/health` responded with `{"status":"ok"}`.
- `/health` did not include `environment`, `version`, or `commit` metadata.
- Staging must still prove the deployed `/health` endpoint reports safe staging metadata and deployed commit.

## Authentication Verification

Required staging accounts:

- Account A
- Account B

Required staging checks:

| Check | Status |
| --- | --- |
| Account A signup | Passed in staging verifier |
| Account B signup | Passed in staging verifier |
| Account A login | Passed in staging verifier |
| Account B login | Passed in staging verifier |
| Logout clears session | Not verified by backend script |
| Session persistence | Token-based protected checks passed; browser persistence not verified |
| Invalid login returns safe error | Passed |
| Malformed login returns safe error | Passed |
| Unauthenticated protected requests rejected | Passed for protected probes exercised by verifier |
| Invalid token rejected | Not separately verified |
| Expired token rejected | Not run |
| 2FA verification if enabled | Not run |

Authentication core behavior is sufficient for staging trust continuation. Browser logout/session persistence and 2FA remain separate product verification items.

## Two-Account Ownership Verification

Required ownership pattern for each supported resource:

1. Account A creates a record.
2. Account A can read the record.
3. Account B cannot read the record.
4. Unauthenticated access cannot read the record.
5. Response does not expose private owner identity fields.

Required minimum resource coverage:

| Resource | Status |
| --- | --- |
| posts | Passed owner-scoped read/write checks |
| profile/account data | Passed `/auth/me` isolation for profile photo URL |
| business profile | Passed owner-scoped `my-contractor-profile` checks |
| requests | Not run |
| conversations/messages if implemented | Passed message thread read/write isolation for quote request threads |
| schedules/visits if implemented | Not run |
| quotes/proposals if implemented | Workflow-event read/write isolation passed for quote request context |
| invoices if implemented | Not run |
| portfolio/media records if implemented | Contractor project ownership passed; media storage remains blocked |
| emergency records if implemented | Not run |

No resource may be approved from source review alone. The latest two-account verifier proves the implemented ownership paths above, while unimplemented or untested product resources remain outside approval.

## Posts Verification

Previously confirmed blocker:

- `GET /posts` was publicly readable.
- Request records exposed owner identity fields.

Source-level Phase 4B expected behavior:

| Endpoint | Required behavior | Phase 4C staging status |
| --- | --- | --- |
| `GET /posts` | Requires authentication | Passed in latest verifier |
| `GET /posts` | Returns only authenticated user's scoped records | Passed in latest verifier |
| `GET /posts` | Does not expose owner identity fields | Passed in latest verifier |
| `GET /posts/:id` | Requires authentication | Passed in latest verifier |
| `GET /posts/:id` | Allows owner access | Passed in latest verifier |
| `GET /posts/:id` | Rejects non-owner access | Passed in latest verifier |
| `GET /posts/:id` | Rejects unauthenticated access | Passed in latest verifier |
| `GET /posts/:id` | Does not expose owner identity fields | Passed in latest verifier |

Latest live run result:

- Unauthenticated `GET /posts` was rejected.
- Account B `GET /posts` did not include Account A records.
- Account B could not read Account A post by id.
- Owner identity fields were not exposed in owner-scoped post responses.

Posts ownership is no longer the active release blocker.

## CORS Verification

Required staging CORS behavior:

Allowed:

- approved staging frontend origin
- approved production frontend origin only in the correct environment
- local development origins only where appropriate outside production

Rejected:

- random unapproved origin
- wildcard public origin in staging or production

Current status after Phase 4G:

| Check | Status |
| --- | --- |
| Approved staging frontend origin succeeds | Not run |
| Random origin rejected | Passed by staging verifier Node probe |
| `Access-Control-Allow-Origin: *` absent in staging | Passed by staging verifier Node probe |
| Authorization headers available only to approved origins | Not verified |
| CORS environment variables documented | Not verified |

Required founder/admin evidence:

- staging frontend origin
- backend CORS allowlist values
- rejected test origin response
- proof staging does not use wildcard CORS

Historical Phase 4C Node header probe before CORS fix:

```text
OPTIONS /posts
Origin: https://unapproved-origin.example
Result: 204
Access-Control-Allow-Origin: *
```

This historical finding was retested after the Phase 4B/4G backend hardening. Browser-origin enforcement and environment allowlist values still require founder/admin confirmation.

## Media Storage Verification

Media remains the active release gate.

## Phase 4H Media Storage Trust Verification

Status:

❌ BACKEND STILL BLOCKED

Current backend evidence from the Phase 4H verifier:

- The backend currently stores media as URL references in PostgreSQL fields.
- The reviewed backend source has no `multer`, `busboy`, `formidable`, Cloudinary SDK, upload directory, static upload route, or media filesystem write path.
- No Railway filesystem media persistence path was found.
- Staging `/media` is not implemented; the backend does not accept uploaded file bytes. This is recorded as `DEFERRED_NOT_IMPLEMENTED`, not as a backend endpoint failure.
- Profile photo URL references persist for the owning account.
- Account B `/auth/me` does not expose Account A profile photo URL.
- Request photo URL references inherit the owner-scoped `/posts` checks.
- Message attachment URL references inherit quote-thread participant authorization.
- Business logo URL references persist on contractor profiles.
- Portfolio photo URL references persist on public contractor projects.

Current frontend evidence from source audit:

- `src/pages/Upload.jsx`, `src/pages/MyRequests.jsx`, and `src/pages/ProjectGallery.jsx` upload request/project photos directly to Cloudinary using the unsigned `meetro_uploads` preset, then store returned public `secure_url` values.
- `src/pages/ContractorProfile.jsx` uploads business images directly to Cloudinary using the same unsigned preset, then stores the public `secure_url`.
- `src/pages/Profile.jsx` reads profile images as base64 data URLs and stores them locally and through existing profile URL fields.
- `src/pages/ConversationThread.jsx` uses `URL.createObjectURL(file)` for conversation and workflow photos. These object URLs are local and not durable across reload/session boundaries.
- `src/pages/ContractorDashboard.jsx`, `src/pages/CompletedJobDetails.jsx`, `src/pages/EmergencyRequest.jsx`, and `src/pages/CompletionSheet.jsx` use `FileReader.readAsDataURL` for evaluation, concern, emergency, and completion photos.

Phase 4H media decision:

❌ Media blocks real-user release as currently implemented.

Reason:

- user-facing media upload paths exist;
- request/homeowner media uses public Cloudinary URLs without a backend-owned media record, deletion path, file size validation, or private access policy;
- message/evaluation/completion media can appear saved while relying on local object URLs or base64 data URLs;
- the backend has no authoritative upload endpoint or object-storage ownership contract;
- there is no verified delete/replacement behavior;
- file type and size limits are enforced inconsistently, mostly through browser file input hints or local slice limits, not by the backend.

Latest Phase 4H verifier command:

```bash
cd /Users/williammolina/meetro-server/meetro-server
STAGING_API_URL=https://athletic-rebirth-staging.up.railway.app node scripts/verify-staging-trust.js
```

Latest Phase 4H verifier result:

```text
Run started: 2026-07-05T17:29:57.937Z
Run finished: 2026-07-05T17:30:04.563Z
Decision: PASS for core backend ownership checks.
Media verification decision: DEFERRED_NOT_IMPLEMENTED for backend `/media`.
Failed checks: none.
Warnings: public contractor profile exposes `profile.username`, requiring product review.
Release interpretation: FAIL for real users while user-facing media flows remain enabled without governed storage.
```

## Phase 4I Friends & Family Media Deferral Safety

Status:

✅ Media-specific release blocker cleared for Friends & Family TestFlight 1 with media deferred.

Phase 4I does not create governed media storage. It prevents the real-user app from promising or saving media until that storage exists.

Implementation safety gates:

- `src/utils/mediaDeferral.js` centralizes the Friends & Family media deferral rule.
- Production/TestFlight builds defer media by default through `import.meta.env.DEV`.
- Local development can still exercise existing media paths for future implementation work.
- `src/utils/cameraPhotoPicker.js` refuses native/fallback photo selection before returning files in real-user builds.
- Upload handlers now refuse selected files before Cloudinary upload, FileReader/base64 conversion, object URL creation, or record persistence.

Protected real-user flows:

| Area | Phase 4I behavior |
| --- | --- |
| Business logo | Upload control disabled/deferred. Existing logo display remains. |
| Portfolio images | Add/edit photo controls disabled/deferred. Existing portfolio display remains. |
| Request photos | Request photo upload disabled/deferred. Request creation remains available. |
| Evaluation photos | Evaluation photo buttons disabled/deferred. Evaluation notes and work decisions remain available. |
| Completion photos | Completion photo upload disabled/deferred. Completion/closure flow remains available. |
| Emergency photos | Emergency photo upload disabled/deferred. Emergency request flow remains available. |
| Message attachments | Camera/photo/workflow photo actions disabled/deferred. Message sending remains available. |
| Profile photos | Profile photo inputs disabled/deferred. Existing saved avatars still display. |

Release interpretation:

```text
Media storage remains DEFERRED_NOT_IMPLEMENTED.
Real-user media upload is disabled/deferred for Friends & Family.
Backend can proceed to Friends & Family TestFlight with media deferred.
Governed media storage remains required before enabling uploads.
```

Important interpretation:

Phase 4G ownership enforcement passed in staging. The backend does not use Railway ephemeral filesystem for media. However, the product currently exposes media flows that are not governed by backend media ownership, privacy, deletion, file type, and file size rules. Therefore backend/core trust can be marked improved, but real-user release remains blocked by media.

Media matrix:

| Media type | Implemented | Storage location | Redeploy persistence | Public/private access rule | Ownership enforcement | Delete behavior | File size/type limit | Release decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Business logo | Yes, via `ContractorProfile.jsx` and profile update flows | Direct unsigned Cloudinary upload or base64 data URL stored in `contractor_profiles.image_url` | Cloudinary URLs are durable; base64 DB/local entries are not a governed media object | Public business identity by product intent, but no formal media policy | Contractor profile update is owner-scoped; the media asset itself is not backend-owned | No verified delete/replacement of old asset | Browser `accept="image/*"` or none; no backend size/type validation | Limitation requiring product/security review |
| Portfolio photo | Partially, via project gallery/contractor project URL fields | Direct unsigned Cloudinary public URLs stored in `contractor_projects.image_url/image_urls` | Cloudinary URLs are durable | Public portfolio route by product intent | Contractor project create/update is owner-scoped; public read is intentional but media policy is not documented | No verified delete/replacement of old asset | Browser-side only; no backend size/type validation | Limitation requiring review before public portfolio launch |
| Request photo | Yes, via `Upload.jsx`/`MyRequests.jsx` | Direct unsigned Cloudinary public URLs stored in `posts.image_url` and local photo arrays | Cloudinary URLs are durable | Request metadata is owner-scoped; the media URL is public if known | `/posts` ownership is enforced; the media asset itself is not private or backend-owned | No verified delete/replacement | Browser-side only; no backend size/type validation | Release blocker for real homeowner media |
| Evaluation photo | Yes in UI, not as backend media | `FileReader.readAsDataURL` in frontend evaluation records | Not proven durable across logout/redeploy; may rely on client state/local records | Intended private work context, but no backend media access rule | No backend media ownership record | Local remove only | Local selection cap; no backend validation | Release blocker if promised as persistent; otherwise defer/disable |
| Completion photo | Yes in UI, not as backend media | `FileReader.readAsDataURL` or existing local photo arrays | Not proven durable | Intended private/relationship work context | No backend media ownership record | Local remove/concern flow only | Browser-side only | Release blocker if promised as persistent; otherwise defer/disable |
| Message attachment | Yes in UI, not as backend upload | `URL.createObjectURL(file)` in `ConversationThread.jsx`; backend can store `messages.image_url` when given a URL | Object URLs are not durable; caller-supplied external URLs can persist as strings | Thread access is participant-scoped; media asset privacy is not guaranteed | Message thread ownership is enforced; media asset ownership is not | No verified delete/replacement | Browser-side only; no backend validation | Release blocker if photo messaging is enabled as persistent attachment |

Required storage checks:

- uploaded files are stored in cloud-persistent storage;
- uploads survive deploy/restart;
- Railway ephemeral filesystem is not used for real user media;
- file URLs are durable;
- Account B cannot access Account A private media;
- file size limits exist;
- file type validation exists;
- deletion behavior is defined;
- replacement behavior is defined;
- public media is intentionally public;
- private media is owner-scoped or authorized relationship-scoped.

Blocker:

If real user media remains enabled while depending on localStorage, object URLs, base64-only persistence, unsigned public uploads, or caller-supplied URLs without backend ownership, backend readiness remains blocked. If media is removed from the Friends & Family MVP, document it as deferred and make sure the UI does not promise persistent upload.

## Database Verification

## Phase 4E Governed Schema Baseline

Status:

- A governed migration runner now exists in the backend repository at `scripts/run-migrations.js`.
- The first SQL baseline migration now exists at `migrations/202607050001_initial_schema_baseline.sql`.
- The runner records applied migrations in `schema_migrations`.
- The runner is idempotent by migration filename and checksum.
- The runner refuses to execute without `DATABASE_URL`, `MIGRATION_TARGET`, matching confirmation, and staging evidence.
- The runner rejects `production` as a migration target.
- The runner never prints `DATABASE_URL` credentials.
- Backend tests now protect the migration target safety gates.

Initial baseline tables:

- `users`
- `posts`
- `contractor_profiles`
- `quote_requests`
- `messages`
- `workflow_events`
- `reviews`
- `contractor_projects`

Unsupported local migration command:

```bash
cd /Users/williammolina/meetro-server/meetro-server
CONFIRM_STAGING_DATABASE=staging railway run --environment staging --service <staging-backend-service-for-athletic-rebirth-staging> -- npm run db:migrate:staging
```

This is no longer the supported command.

Railway CLI help confirms `railway run` runs a local command with variables pulled from the active Railway environment. It does not execute inside the deployed Railway container. When `DATABASE_URL` points to `postgres.railway.internal`, local execution from a Mac fails because that private hostname resolves only inside Railway networking.

Supported staging migration path A: execute inside Railway runtime.

First deploy the backend revision that contains `scripts/run-migrations.js` and the baseline migration to the staging backend service only:

```bash
cd /Users/williammolina/meetro-server/meetro-server
railway up --environment staging --service athletic-rebirth --message "Deploy Phase 4F staging migration runner"
```

Current staging deployment evidence:

- Staging service: `athletic-rebirth`
- Staging domain: `https://athletic-rebirth-staging.up.railway.app`
- Staging environment: `staging`
- Staging deployed commit observed by Railway status: `6c918a4bfce0aa1b99a0dd80b0b8bb702c26d715`
- That deployed revision predates the local Phase 4E/4F migration runner, so the migration runner must be deployed to staging before the SSH migration command can succeed.

Then run the migration inside the staging backend container:

```bash
cd /Users/williammolina/meetro-server/meetro-server
railway ssh --environment staging --service athletic-rebirth -- 'CONFIRM_STAGING_DATABASE=staging npm run db:migrate:staging'
```

Why this is supported:

- `railway ssh` runs the command inside the active staging service runtime.
- The staging service can resolve `postgres.railway.internal`.
- The existing runner still requires `MIGRATION_TARGET=staging`, `CONFIRM_MIGRATION_TARGET=staging`, and `ALLOW_STAGING_MIGRATIONS=true` through `npm run db:migrate:staging`.
- `CONFIRM_STAGING_DATABASE=staging` provides the final staging-only confirmation.
- Production remains refused by the runner.
- Secrets are never printed.

Supported staging migration path B: temporary staging public TCP proxy.

Use this only if Railway SSH is unavailable and the founder/admin has enabled a temporary public TCP proxy for the staging Postgres service.

```bash
cd /Users/williammolina/meetro-server/meetro-server
DATABASE_URL='<temporary Railway staging public TCP Postgres URL>' \
CONFIRM_STAGING_DATABASE=staging \
CONFIRM_PUBLIC_STAGING_DATABASE_URL=true \
npm run db:migrate:staging
```

Requirements for path B:

- The `DATABASE_URL` must be the staging Postgres public TCP proxy URL only.
- Do not use production database credentials.
- Disable/remove the temporary public TCP proxy immediately after migration verification.
- Do not paste or share the URL in logs, docs, chat, screenshots, or terminal output.
- The runner requires `CONFIRM_PUBLIC_STAGING_DATABASE_URL=true` for local public staging migrations.

Important:

- `athletic-rebirth` is the Railway staging backend service serving `https://athletic-rebirth-staging.up.railway.app`.
- `Postgres` is the Railway staging Postgres service.
- Do not run this command against production.
- Do not paste or print `DATABASE_URL`.
- Do not run the verifier as approval evidence until the staging migration has been reviewed and applied to the staging database.

Post-migration verifier command:

```bash
cd /Users/williammolina/meetro-server/meetro-server
STAGING_API_URL=https://athletic-rebirth-staging.up.railway.app node scripts/verify-staging-trust.js
```

Phase 4E decision:

The migration path is created, but backend readiness is still blocked until the founder/admin applies the baseline to the verified staging database and the two-account trust verifier passes with evidence.

Historical Phase 4E verifier rerun before migration application:

```text
Run started: 2026-07-05T14:38:25.923Z
Run finished: 2026-07-05T14:38:28.666Z
Decision: FAIL
Accounts created: false
Reason: staging schema still lacks users and posts relations because the reviewed migration has not been applied.
```

Required staging checks:

| Check | Status |
| --- | --- |
| Staging PostgreSQL exists | Reported by task, not independently verified |
| Backend points to staging database | Runtime connected to a database, but schema is incomplete |
| Production database is not used | Not verified |
| Local/dev database is not used | Not verified |
| Migration runner exists | Source-level passed |
| Initial schema baseline exists | Source-level passed |
| Migrations are applied | Not yet applied to staging after Phase 4E review |
| Schema matches backend version | Not yet proven in staging |
| Test records persist after relogin | Not run |
| Backup plan documented | Not verified |
| Restore plan documented | Not verified |

Database readiness cannot be approved until the founder/admin confirms database separation and provides recovery evidence.

## Error Safety Verification

Required staging checks:

| Error case | Expected behavior | Status |
| --- | --- | --- |
| Malformed JSON | Safe `400` response | Passed |
| Malformed login | Safe `400` or `401` response | Passed |
| Invalid IDs | Safe `400` or `404` response | Not run |
| Unauthorized access | Safe `401` or `403` response | Passed for protected checks exercised by verifier |
| Cross-owner access | Safe rejection without private data | Passed for posts, messages, workflow events, contractor profiles, and contractor projects |
| Server errors | No stack traces or implementation details | Invalid login and invalid JSON probes passed |
| Logs | No secrets or sensitive data | Not verified |

Source-level error handling was hardened in Phase 4B and the latest staging probes verified the main malformed-auth cases. Log review still requires founder/admin access.

## Basic Load Readiness

Required lightweight staging checks:

- server starts reliably;
- `/health` remains stable;
- signup/login requests respond normally;
- protected request rejection remains stable;
- basic record create/read requests respond normally;
- repeated small requests do not crash the server.

Current Phase 4C status:

- Light verifier traffic ran successfully against staging.
- No destructive load testing should be performed.
- Friends & Family load readiness remains unapproved until founder/admin confirms monitoring, backup, restore, and rollback operations.

Staging can continue load-readiness checks after the media release gate is resolved or explicitly deferred.

## Blockers

1. Media storage durability, ownership, deletion, and privacy are not governed for existing user-facing media flows.
2. Request/homeowner media can be uploaded directly to public Cloudinary URLs without a backend-owned media record.
3. Conversation, evaluation, emergency, and completion photo flows use local object URLs or base64 data URLs in places that can appear persistent.
4. File size/type limits are not enforced by the backend.
5. Media delete/replacement behavior is not implemented or verified.
6. `/health` lacks deployed commit metadata.
7. Deployed branch and commit are not verified.
8. Backup, restore, rollback, and operational monitoring evidence is missing.
9. Basic Friends & Family load readiness was not verified in staging.

## Non-blocking Risks

These risks become non-blocking only after the blockers above are cleared:

- Public business profile data may be acceptable, but the public field contract should be documented.
- Public portfolio content may be acceptable, but private vs public media rules must be explicit.
- Some endpoints may be intentionally public, but they need clear field-level contracts.
- Source-level tests protect expected behavior, but they do not prove deployed environment configuration.

## Required Fixes Before Real Users

1. Decide whether media is in or out of the Friends & Family MVP.
2. If media is deferred, disable or adjust UI that promises persistent upload.
3. If media remains in scope, implement a governed object-storage contract with ownership, privacy, deletion, replacement, size limits, and type validation.
4. Confirm `/health` exposes safe staging metadata and deployed commit.
5. Verify any remaining product resources not covered by the two-account script.
6. Confirm migrations, schema, backup, restore, rollback, and operational ownership.

## What Could Not Be Verified

Could not be verified or completed:

- deployed commit and branch;
- deployed source parity;
- staging environment variables;
- browser-origin CORS enforcement beyond Node probe;
- media upload and access control;
- persistence after relogin, restart, or deploy;
- backup/restore policy;
- rollback process;
- logs and monitoring.

Reason:

The client workspace does not contain Railway credentials, staging database access, staging admin credentials, or deployment metadata. The live staging API was reachable and core two-account checks ran, but media provider configuration, durable upload behavior, deletion behavior, and operational recovery still require founder/admin verification or implementation.

## Founder/Admin Required Checks

Founder/admin must provide or perform:

1. Staging Railway service URL.
2. Staging PostgreSQL database identifier.
3. Proof staging is not connected to production data.
4. Staging environment variable summary with secrets redacted.
5. Deployed backend commit and branch.
6. `/health` response from staging.
7. Two test accounts created only in staging.
8. Two-account ownership test results.
9. CORS allowed and rejected origin test results.
10. Media provider configuration and upload test results.
11. Migration history and schema export.
12. Backup, restore, and rollback process.
13. Log review confirming no sensitive values are emitted.

## Verification Commands

Two-account staging script:

```bash
cd /Users/williammolina/meetro-server/meetro-server
STAGING_API_URL=https://athletic-rebirth-staging.up.railway.app node scripts/verify-staging-trust.js
```

Historical Phase 4C result from this execution:

```text
Run started: 2026-07-05T14:01:56.453Z
Run finished: 2026-07-05T14:01:59.358Z
Decision: FAIL
Exit code: 1
Accounts created: false
Account email formats:
- meetro-stage-a-{timestamp}@example.test
- meetro-stage-b-{timestamp}@example.test
```

Passed checks:

```text
/health responded with ok status.
Malformed login returned a safe client error.
Invalid JSON returned a safe 400 response.
Unauthenticated /auth/me was rejected.
```

Failed checks:

```text
Invalid login returned 500 with database detail: users relation does not exist.
Account A signup failed: users relation does not exist.
Account B signup failed: users relation does not exist.
Account A login failed: users relation does not exist.
Account B login failed: users relation does not exist.
CORS allowed wildcard origin for an unapproved origin.
Two-account ownership verification could not run because auth tokens were not produced.
Unauthenticated GET /posts returned 500: posts relation does not exist.
Unauthenticated GET /posts/:id returned 500: posts relation does not exist.
```

Endpoints tested by script:

```text
/auth/login
/auth/me
/auth/signup
/business-profile
/conversations
/emergency
/health
/invoices
/media
/portfolio
/posts
/posts/:id
/profiles
/proposals
/quotes
/requests
/schedules
/visits
```

Unimplemented or unavailable endpoint families recorded:

```text
/profiles
/business-profile
/requests
/conversations
/schedules
/visits
/quotes
/proposals
/invoices
/portfolio
/emergency
/media
```

Local backend source tests:

```bash
cd /Users/williammolina/meetro-server/meetro-server
npm test
```

Result from this execution:

```text
43 tests passed
1 live staging verifier test skipped by default
```

Client documentation regression test:

```bash
node --test tests/railwayStagingTrustVerification.test.js
```

Result from this execution:

```text
3 tests passed
```

Client full verification:

```bash
npm test
npm run build
```

Result from this execution:

```text
npm test: 1213 tests passed
npm run build: passed
```

## Final Backend Decision

✅ READY FOR FRIENDS & FAMILY TESTFLIGHT WITH MEDIA DEFERRED

Friends & Family TestFlight may proceed only with media upload deferred.

Do not test against production data.

Do not enable real-user media upload until governed storage exists.

Backend readiness for broader release still requires governed media storage, deployment parity, backup/restore, rollback, and operational recovery evidence.

Source-level fixes are not user trust.

Staging proof is user trust.

No real user media enters Meetro until media ownership, persistence, deletion, validation, and privacy are governed by the backend.

🏮 The Lantern stays lit.
