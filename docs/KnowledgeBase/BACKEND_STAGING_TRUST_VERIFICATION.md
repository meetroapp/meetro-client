# Backend Staging Trust Verification

**Date:** July 4, 2026  
**Status:** Backend-only verification evidence  
**Runtime changes:** Friends & Family media upload deferral guards added after Phase 4H  
**Final Backend Decision:** ✅ READY FOR FRIENDS & FAMILY TESTFLIGHT WITH MEDIA DEFERRED

## Executive Summary

The deployed Meetro backend was probed through the frontend-configured Railway
API using safe read-only and no-body unauthenticated checks.

### Phase 4H Update: Media Storage Trust

On July 5, 2026, the staging verifier was updated and rerun against:

```text
https://athletic-rebirth-staging.up.railway.app
```

The verifier created two isolated staging accounts and confirmed that the Phase
4G ownership failures remain fixed:

- Account B cannot read Account A-only message threads.
- Account B cannot write Account A-only message threads.
- Account B cannot read Account A-only workflow events.
- Account B cannot write workflow events into Account A-only quote requests.
- Account B cannot update Account A contractor projects.

Phase 4H did not approve real-user readiness. Core backend ownership checks can pass, but media remains a release blocker while user-facing media flows are enabled without a governed storage contract.

Current media evidence:

- The backend stores media as URL references in PostgreSQL fields.
- No server-side upload endpoint is implemented.
- No Railway filesystem media write path was found in the reviewed server source.
- Staging `/media` is not implemented and is recorded as deferred/not implemented, not as a broken endpoint.
- Profile photo, request photo, business logo, portfolio photo, and message
  attachment URL references can persist through existing records.
- Private request and message media URL references inherit the owner and
  participant scoping already verified by `/posts` and `/messages`.
- Frontend request/project/business image flows use direct unsigned Cloudinary uploads and store returned public URLs.
- Frontend profile/evaluation/completion/emergency/conversation photo flows also use base64 data URLs or local object URLs in several places.

Blocking media gaps:

- upload persistence is not governed through an authoritative backend-owned
  object-storage write path;
- delete behavior is not implemented;
- file size/type limits are not enforced by the backend;
- evaluation, completion, emergency, and message photo storage are not governed
  by backend media records;
- private homeowner/work media may be represented by public Cloudinary URLs or
  local-only object/data URLs.

Latest Phase 4H verifier result:

```text
Run started: 2026-07-05T17:29:57.937Z
Run finished: 2026-07-05T17:30:04.563Z
Backend verifier decision: PASS for core ownership checks.
Media verifier decision: DEFERRED_NOT_IMPLEMENTED for backend `/media`.
Failed checks: none.
Warnings: public contractor profile exposes `profile.username`, requiring product review.
Release interpretation: FAIL for real users while media UI remains enabled without governed storage.
```

### Phase 4I Update: Friends & Family Media Deferral Safety

On July 5, 2026, the client was updated so Friends & Family real-user builds no longer start unsafe media persistence flows.

Phase 4I does not approve media storage. It defers media until governed storage exists.

Implemented safeguards:

- `src/utils/mediaDeferral.js` centralizes the media deferral decision.
- Real-user builds defer media upload by default; local development keeps existing paths available for future media work.
- Native/fallback camera and photo picking stops before returning files in real-user builds.
- Direct unsigned Cloudinary flows are guarded before `FormData` upload.
- Base64 and object URL flows are guarded before `FileReader`, canvas conversion, `URL.createObjectURL(file)`, or record persistence.
- Visible upload affordances are disabled or converted to a calm "Photos coming soon" state.

Protected surfaces:

- Business logo
- Portfolio images
- Request photos
- Evaluation photos
- Completion photos
- Emergency photos
- Message attachments
- Profile photos

Phase 4I release interpretation:

```text
Media storage remains deferred/not implemented.
Friends & Family real-user upload controls are disabled.
Unsafe Cloudinary/base64/object URL persistence is blocked for real users.
Backend can proceed to Friends & Family TestFlight with media deferred.
Governed media storage is required before upload controls return.
```

The verification did not approve backend readiness. It found concrete blockers:

- the only confirmed backend URL is production-named, not a confirmed staging
  environment;
- the deployed commit and branch are not exposed by the API;
- broad CORS allows arbitrary origins and authorization headers;
- unauthenticated `GET /posts` returns request records with owner identity
  fields;
- malformed login input returns a `500` response with implementation details;
- database schema, migrations, backups, restore policy, and direct ownership
  constraints were not verifiable locally;
- real two-account signup/login/ownership/media/persistence tests were not run
  because no confirmed staging environment or admin credentials were available.

No real test users or records were created during this verification. The known
API URL includes `production` in the Railway hostname, so this phase did not
mutate data.

## Verification Environment

| Item | Evidence |
| --- | --- |
| Local repository | `/Users/williammolina/meetro-client` |
| Frontend default API target | `https://athletic-rebirth-production-0a28.up.railway.app` |
| Backend source repository from prior inventory | `https://github.com/meetroapp/metro-server` |
| Probe type | Safe read-only GET/OPTIONS and no-body unauthenticated mutation probes |
| Confirmed staging environment | Not confirmed |
| Production/staging separation | Not verified |
| PostgreSQL direct access | Not available locally |
| Railway admin access | Not available locally |

## Accounts Used

No accounts were created or used.

Reason:

- The only confirmed API target is production-named.
- No staging URL, staging database, test credentials, Railway access, or
  explicit throwaway environment was available in this workspace.
- Creating test users or records against an unconfirmed production backend would
  violate the verification rule against speculative changes.

Founder/admin verification is still required with two isolated test accounts:

- Homeowner Test User
- Professional Test User
- one professional business profile

## Deployment Parity Findings

**Status:** Blocked for real users unless media is explicitly deferred/disabled for the Friends & Family MVP.

Verified:

- `GET /health` returned `200` with `{"status":"ok"}`.
- Response headers identify `server: railway-hikari`.
- Root path `GET /` returned `404` with an Express-style `Cannot GET /`.
- `GET /__version` returned `404`.

Not verified:

- deployed commit;
- deployed branch;
- deployment environment name;
- whether the backend is staging or production;
- whether deployed code matches the reviewed `metro-server` source;
- build/start command used by Railway;
- release and rollback process.

Important parity note:

- Prior backend inventory references workflow-event source code.
- The deployed API returned `404` for `GET /workflow-events`.
- That does not prove the source is absent, but it does reinforce that deployed
  parity cannot be approved without Railway/source revision evidence.

## Database Findings

**Status:** Blocked.

Not verified during this phase:

- PostgreSQL database name;
- database owner;
- schema export;
- migration framework;
- migration history;
- foreign keys;
- ownership constraints;
- backup policy;
- restore policy.

Prior evidence still applies:

- PostgreSQL was identified in earlier backend audits.
- Existing schema evidence was partial.
- No migration framework was confirmed.
- No foreign keys were found in the preserved baseline.

Founder/admin must provide a current schema export and backup/restore evidence
before real users.

## Authentication Findings

**Status:** Blocked.

Verified:

- `GET /messages/1` without a token returned `401` with `No token provided`.
- `GET /messages/1` with an invalid bearer token returned `401` with
  `Invalid token`.
- No-body unauthenticated `POST /messages` returned `401`.
- No-body unauthenticated `POST /posts` returned `401`.
- No-body unauthenticated `PUT /auth/profile-photo` returned `401`.

Blocking issue:

- No-body `POST /auth/login` returned `500` and exposed implementation detail:
  the response included a JavaScript property-read failure for `email`.

Not verified:

- real signup;
- real login;
- logout/session invalidation;
- session persistence;
- expired token behavior;
- password reset;
- real 2FA request/verify flow;
- role-aware protected route enforcement after login.

Authentication cannot be approved while malformed auth input produces unsafe
server errors and real account flows remain untested.

## Identity Findings

**Status:** Blocked.

Identity separation could not be verified with real accounts.

Not verified:

- homeowner role persistence;
- professional role persistence;
- professional business profile ownership;
- role switching without cross-scope leakage;
- server-side rejection of frontend mode spoofing;
- personal vs business scoped data stores.

The public request endpoint also exposes owner identity fields, which prevents
approval of identity protection.

## Ownership Findings

**Status:** Blocked.

Concrete finding:

- Unauthenticated `GET /posts` returned `200` and exposed many request records.
- The response included owner identity fields such as user IDs, emails, and
  usernames. Values are intentionally not copied into this document.

Additional observations:

- `GET /contractor-profiles` is publicly readable and includes business contact
  information, `user_id`, and username fields. Some public business profile
  information may be intentional, but the public contract and allowed fields are
  not documented or proven safe.
- `GET /contractor-projects/:contractorId` is publicly readable. This may be
  acceptable for public portfolio data, but owner scoping and field policy were
  not verified.
- Message reads are protected from unauthenticated access at `/messages/:id`.

The public request exposure is a blocker. Requests can include homeowner need,
location, category, owner identity, and media references. They must not be
globally readable unless there is an explicit public marketplace contract that
removes private identity fields and enforces safe visibility.

Resources still requiring owner-scoped allowed/forbidden tests:

- messages;
- conversations;
- relationships;
- requests;
- projects;
- schedules;
- evaluations;
- proposals;
- quotes;
- invoices;
- work history;
- portfolio;
- emergency records;
- business profiles.

## Media Findings

**Status:** Deferred for Friends & Family TestFlight 1.

Observed:

- The backend has no `multer`, `busboy`, `formidable`, Cloudinary SDK, S3 SDK,
  Firebase SDK, upload directory, static upload route, or user-media filesystem
  write path.
- The database schema stores media as URL strings:
  `users.profile_photo_url`, `posts.image_url`,
  `contractor_profiles.image_url`, `messages.image_url`, and
  `contractor_projects.image_url/image_urls`.
- `src/pages/Upload.jsx`, `src/pages/MyRequests.jsx`,
  `src/pages/ProjectGallery.jsx`, and `src/pages/ContractorProfile.jsx`
  upload directly to Cloudinary using the unsigned `meetro_uploads` preset.
- `src/pages/Profile.jsx`, `src/pages/ContractorDashboard.jsx`,
  `src/pages/CompletedJobDetails.jsx`, `src/pages/EmergencyRequest.jsx`,
  `src/pages/CompletionSheet.jsx`, and `src/pages/ConversationThread.jsx`
  use base64 data URLs or `URL.createObjectURL(file)` for some media flows.
- The backend does not use Railway ephemeral filesystem for user media.

Media matrix:

| Media type | Current behavior | Release decision |
| --- | --- | --- |
| Business logo | Direct Cloudinary URL or profile data URL stored as `contractor_profiles.image_url`; profile ownership is enforced but media asset ownership/delete/limits are not. | Limitation requiring review |
| Portfolio photo | Direct Cloudinary URLs can be stored in contractor project URL fields and read publicly as portfolio identity. | Limitation requiring review before public portfolio launch |
| Request photo | Direct Cloudinary public URL stored through request/post fields; request rows are owner-scoped but the image URL is public if known. | Release blocker for real homeowner media |
| Evaluation photo | Frontend FileReader/base64 flow; no backend media record or durable storage contract. | Release blocker if persistent evaluation photos are in MVP; otherwise defer/disable |
| Completion photo | Frontend FileReader/base64/local photo flow; no backend media record or durable storage contract. | Release blocker if persistent completion photos are in MVP; otherwise defer/disable |
| Message attachment | Conversation UI uses object URLs and/or caller-supplied `image_url`; thread access is scoped but media asset persistence/privacy is not. | Release blocker if photo messaging is enabled |

Phase 4I safety decision:

Friends & Family TestFlight may proceed only because user-facing media upload is
now disabled/deferred in real-user builds. If any real-user build can upload or
rely on request photos, message attachments, evaluation photos, completion
photos, emergency photos, business logos, portfolio images, or private profile
media before governed storage exists, backend readiness returns to blocked.

## Persistence Findings

**Status:** Blocked.

No real persistence lifecycle was executed because a safe staging environment
was not confirmed.

Not verified to survive refresh, logout/login, browser restart, backend restart,
or deploy:

- request;
- message;
- visit;
- evaluation;
- quote;
- approval;
- invoice;
- business profile edit;
- portfolio item;
- uploaded media.

The deployed API proves that some records exist, but it does not prove safe
creation, ownership, update, deletion, or recovery behavior for real users.

## Security Findings

**Status:** Core source-level and staging probes improved; operations still need founder/admin verification.

Historical concrete findings before Phase 4B/4G fixes:

- `Access-Control-Allow-Origin: *` is returned by probed endpoints.
- CORS preflight from an arbitrary origin allowed:
  - `authorization`;
  - `content-type`;
  - `GET,HEAD,PUT,PATCH,POST,DELETE`.
- `GET /posts` is publicly readable and returns owner identity fields.
- Malformed `POST /auth/login` returns `500` with implementation details.
- `x-powered-by: Express` is exposed.

Current staging interpretation:

- the unapproved-origin CORS probe now passes in the staging verifier;
- malformed login and invalid JSON return safe client errors;
- posts are owner-scoped in the two-account verifier;
- operational log review, deployment parity, and browser-origin CORS behavior still require founder/admin evidence.

Positive findings:

- `GET /messages/1` rejects missing and invalid tokens.
- No-body unauthenticated mutation probes for `messages`, `posts`, and
  `profile-photo` rejected with `401`.

Not verified:

- rate limiting;
- sensitive logging;
- secret exposure in logs or runtime;
- safe error handling across all endpoints;
- endpoint-by-endpoint authorization;
- cross-user access rejection;
- security monitoring;
- abuse prevention for auth and upload endpoints.

## Operations Findings

**Status:** Blocked.

Verified:

- Health endpoint responds.

Not verified:

- monitoring/log access;
- production error alerting;
- Railway service configuration;
- environment variables;
- backup process;
- restore drill;
- rollback process;
- deployment owner;
- database owner;
- release owner;
- Friends & Family load capacity.

Health alone is not backend readiness.

## Blockers

1. No confirmed staging environment was available.
2. Deployed backend commit and branch are not exposed.
3. Public `GET /posts` exposes request records and owner identity fields.
4. CORS allows arbitrary origins and authorization headers.
5. Malformed login input returns `500` with implementation details.
6. Database schema, migration history, foreign keys, and ownership constraints
   were not verified.
7. Backup, restore, rollback, and operational ownership are not verified.
8. Real two-account signup/login/ownership tests were not run.
9. Real media upload durability and privacy were not verified.
10. Core workflow persistence was not verified end to end.

## Non-blocking Risks

- Public business profiles may be acceptable, but the public field contract is
  not documented.
- Public portfolio routes may be acceptable, but portfolio visibility rules are
  not documented.
- The backend has a health endpoint but no version/commit endpoint.
- Some API behavior may be legacy marketplace behavior, but it is not separated
  from private user data by an explicit contract.

## Founder/Admin Verification Needed

Founder/admin must provide or perform:

1. Confirmed staging API URL.
2. Confirmed staging PostgreSQL database.
3. Railway service access or deployment metadata showing deployed commit.
4. Backend source commit currently deployed.
5. Two isolated test users.
6. Current schema export.
7. Migration history.
8. Backup/restore evidence.
9. Log review confirming no sensitive values are emitted.
10. Media storage provider configuration and access policy.
11. Endpoint-level allowed/forbidden ownership test run.

## Final Backend Decision

✅ READY FOR FRIENDS & FAMILY TESTFLIGHT WITH MEDIA DEFERRED

Friends & Family users may be invited only under the explicit media-deferred
condition. The backend/core trust evidence has improved through the later
staging verifier work, but media upload itself is not approved.

Do not enable real-user media upload until Meetro has durable backend-governed
storage with ownership, privacy, deletion, replacement, file type validation,
and file size validation.

No real user media enters Meetro until the backend proves media trust.
