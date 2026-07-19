# Meetro Community Production Media Truth Audit

**Audit:** MC-MEDIA-AUDIT-001

**Repositories:** `meetro-client`, `meetro-server`

**Client revision audited:** `66a47ee7286517e47e570bf5acd35c66cc884be3`

**Mode:** Source-backed audit only; no runtime, schema, configuration, or deployment changes.

## 1. Executive Summary

The Personal Profile photo workflow is the only governed media implementation. Its
server contract provides authenticated signatures, a server-derived owner folder,
format and 10 MB validation, canonical metadata persistence, replacement cleanup,
failure rollback, and orphan cleanup. It is classified **B - READY**, rather than A,
because the production client gate remains off pending controlled production rollout.

All other product media workflows remain unavailable, incomplete, unsafe, or require
private-media protection. Production UI deferral prevents the legacy upload handlers
from running, but it does not make the underlying APIs governed. Active authenticated
server routes still accept arbitrary client-supplied media URLs for posts, messages,
business profiles, and contractor projects. Public portfolio/Spotlight selectors can
also consume browser-local media records. Those active surfaces are governance
violations even when normal UI upload controls are disabled.

| Classification | Count |
|---|---:|
| A - Governed | 0 |
| B - Ready | 1 |
| C - Backend missing | 2 |
| D - Unsafe | 5 |
| E - Placeholder | 8 |
| F - Sensitive | 5 |
| **Total workflows** | **21** |

**Audit certification: FAIL.** Active APIs accept unowned media references, and an
active public projection can read browser-local media. Additional media rollout must
wait until the affected routes and public projections fail closed.

## 2. Audit Method

### Repositories and directories

- Client: `src/pages`, `src/components`, `src/utils`, `tests`, Vite configuration and
  repository-visible environment references.
- Server: `index.js`, `server/media`, `server/profile`, `migrations`, and `test`.
- Database structures: `users.profile_photo_url`, `users.profile_photo_details`,
  `posts.image_url`, `messages.image_url`, `contractor_profiles.image_url`, and
  `contractor_projects.image_url/image_urls`.

### Search and tracing

The audit searched both repositories for Cloudinary, upload/signature, image/photo,
attachment, logo/cover/gallery/portfolio, workflow media terms, file inputs,
`FileReader`, `readAsDataURL`, `URL.createObjectURL`, Base64/data URLs, blob URLs,
browser storage, arbitrary HTTP(S) URLs, feature gates, media fields, and deletion.
Each product workflow was traced from visible control or reader to its final server or
browser persistence behavior. Keyword hits that only produce temporary PDFs for
native sharing were excluded from image-upload workflow counts.

### Backend routes reviewed

- `POST /media/upload-signature`
- `PUT /auth/profile-photo`
- `POST /posts`
- `POST /messages`
- business-profile authenticated reads and writes
- `POST /contractor-projects`
- `PUT /contractor-projects/:id`
- public contractor-project reads

### Gates reviewed

- `VITE_ENABLE_PERSONAL_PROFILE_MEDIA`
- production API-origin fallback in `isPersonalProfilePhotoUploadEnabled()`
- `isFriendsAndFamilyMediaDeferred()`
- business-mode Profile media disabling

### Test suites reviewed

Client evidence includes `personalProfilePhoto.test.js`,
`mediaDeferralSafety.test.js`, `profilePhotoScoping.test.js`,
`businessPortfolioStorage.test.js`, and `localSpotlightVisibility.test.js`. Server
evidence includes `cloudinaryConfiguration.test.js`, `uploadSignature.test.js`, and
`personalProfileImage.test.js`. No meaningful end-to-end authorization coverage was
found for the remaining media workflows.

## 3. Classification Definitions

- **A - Governed:** authenticated signed upload, approved purpose, server-derived
  ownership, canonical metadata, correct replacement/collection behavior, cleanup,
  and backend-supported persistence are active.
- **B - Ready:** the governed capability exists, but client rollout or controlled
  production verification is incomplete.
- **C - Backend missing:** product concept exists without canonical backend authority.
- **D - Unsafe:** an active path trusts unsigned uploads, arbitrary URLs, browser-local
  media authority, client ownership, or false success.
- **E - Placeholder:** intentionally disabled, absent, presentation-only, or coming
  soon, with no active product upload.
- **F - Sensitive:** enhanced authorization, retention, auditing, and protected
  delivery are the primary requirement.

## 4. Master Inventory

| ID | Account Area | Workflow | UI Location | Client Implementation | Backend/API | Persistence | Ownership | Cleanup | Feature Gate | Tests | Classification | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|:---:|---|
| MEDIA-PERSONAL-001 | Personal | Profile photo | Profile identity editor | Signed upload, temporary object URL preview, canonical refresh | Signature + `/auth/profile-photo` | `users.profile_photo_url/profile_photo_details` | Authenticated user folder and metadata validated | Replacement and orphan cleanup | Production fails closed unless explicitly enabled | Strong client/server | B | `src/utils/personalProfilePhoto.js`; server `server/profile/personalProfileImage.js` |
| MEDIA-PERSONAL-002 | Personal | Request Help photos | New/edit request forms | UI deferred; dormant unsigned Cloudinary preset remains | `/posts` accepts `image_url`; no governed edit media route | `posts.image_url`; edit also uses browser records | Post owner known; asset ownership unverified | None | Global production deferral | Deferral only | D | `src/pages/Upload.jsx:271`; `MyRequests.jsx:907`; server `index.js:1223` |
| MEDIA-PERSONAL-003 | Personal | Property photos | Property/home surfaces | No active image control | None | None | None | None | Function unavailable | None | E | No property media input or route found |
| MEDIA-PERSONAL-004 | Personal | Message attachments | Conversation composer/workflow cards | Deferred; development path creates blob/local message records | `/messages` accepts `image_url` | `messages.image_url` or local outgoing message | Participants checked; media reference unverified | None | Global production deferral | Delivery truth only | F | `ConversationThread.jsx:3367,6395`; server `index.js:1546` |
| MEDIA-PERSONAL-005 | Personal | Moments media | Moments feed/details | Presentation and local timeline readers; no uploader | No canonical Moments media API | Local/derived Moment records and staged images | Client filtering only | None | No upload exposed | Projection tests only | C | `MeetroMoments.jsx:20,184`; `MeetroMomentDetails.jsx:193` |
| MEDIA-PERSONAL-006 | Personal | Review photos | Review surfaces | No active image control | None | None | None | None | Function unavailable | None | E | No review media input, route, or field found |
| MEDIA-PERSONAL-007 | Personal | Emergency photos | Emergency workflow | Emergency workflow unavailable; no active media input | None | None | None | None | Whole workflow unavailable | Unavailable-state tests only | E | Emergency unavailable state; no media route found |
| MEDIA-PERSONAL-008 | Personal/shared | Evaluation photos | Evaluation workspace | Deferred; development FileReader stores Base64 in local evaluation records | No canonical evaluation media API | Browser-local schedule/evaluation data | No server media owner | None | Global production deferral | Deferral only | F | `ContractorDashboard.jsx:1861,1938,2525` |
| MEDIA-PERSONAL-009 | Personal/shared | Completion and concern photos | Completion Sheet/Completed Job | Deferred; FileReader/canvas creates Base64 and local completion/concern records | No canonical completion evidence API | Browser-local completion and concern state | No server evidence owner | None | Global production deferral | Truth/deferral tests only | F | `CompletionSheet.jsx:151,197,308`; `CompletedJobDetails.jsx:497,537` |
| MEDIA-BUSINESS-001 | Business | Business logo | Business Profile and Profile avatar | Deferred; dormant unsigned preset; local fallback reader | Business profile write accepts arbitrary HTTPS `image_url` | `contractor_profiles.image_url` | Business row owned; media URL/public ID unverified | None | Global deferral/business Profile disabled | Persistence shape only | D | `ContractorProfile.jsx:414,1451`; server `businessProfile.js:119` |
| MEDIA-BUSINESS-002 | Business | Business cover | No active editor | No control; signing purpose exists only | Signature supports `business_cover`; no persistence endpoint | No canonical cover field/metadata | Signature derives owned business folder | Deletion helper not exposed | No client rollout | Signature tests only | E | Server `server/media/cloudinary.js`; `uploadSignature.js` |
| MEDIA-BUSINESS-003 | Business | Project gallery create/edit | Project Gallery | Deferred; dormant unsigned preset and browser cache updates | Contractor-project create/update accept URLs | `contractor_projects.image_url/image_urls` | Parent project owner checked; assets unverified | None | Global production deferral | Portfolio storage tests only | D | `ProjectGallery.jsx:131,258`; server `index.js:1833,1883` |
| MEDIA-BUSINESS-004 | Business | Public portfolio | Portfolio/profile projections | Active readers merge backend and browser-cached projects/media | Public contractor-project reads | Server URLs plus local portfolio keys | Server parent ownership on writes; local projection uses client matching | None | Reader is not media-gated | Projection tests confirm local behavior | D | `businessPortfolioStorage.js:218`; `businessPortfolioProof.js` |
| MEDIA-BUSINESS-005 | Business/shared | Before/after workflow media | Conversation workflow cards | Deferred blob/local workflow messages | Message URL field exists but no evidence contract | Local message/workflow state | No media evidence ownership | None | Global production deferral | Deferral only | F | `ConversationThread.jsx:3348-3402` |
| MEDIA-BUSINESS-006 | Business | Quote/proposal attachments | Quote Builder/workflow | No active attachment upload | None | None | None | None | Function unavailable | None | E | No quote/proposal media input, route, or field found |
| MEDIA-BUSINESS-007 | Business | Invoice attachments | Invoice Builder/workflow | No active attachment upload | None | None | None | None | Function unavailable | None | E | No invoice media input, route, or field found |
| MEDIA-BUSINESS-008 | Business/shared | Communication attachments | Conversation/customer communications | Same deferred blob path as personal messages | `/messages` accepts arbitrary `image_url` | Server URL or local outgoing record | Participant checks do not validate media ownership | None | Global production deferral | Delivery truth only | F | `ConversationThread.jsx:3367,6395`; server `index.js:1546` |
| MEDIA-BUSINESS-009 | Business | Hiring media | Hiring/Team workspaces | Truthfully unavailable; no upload | None | None | No personnel backend authority | None | Hiring persistence unavailable | Unavailable-state tests only | E | No applicant document/image API found |
| MEDIA-BUSINESS-010 | Business/public | Spotlight media | Home/Community Spotlight | Active public projection can consume local portfolio URLs | Public project/profile reads | API data plus local portfolio/Spotlight storage | Local media association is client-authoritative | None | Reader is not media-gated | Local behavior explicitly tested | D | `localSpotlightVisibility.js:192`; `Home.jsx:1506` |
| MEDIA-BUSINESS-011 | Business | Business Moments | Moments projections | Same staged/local Moment model; no business uploader | No canonical Moments media API | Local/derived records | Client filtering only | None | No upload exposed | Projection tests only | C | `MeetroMoments.jsx`; Moment utility readers |
| MEDIA-BUSINESS-012 | Business | Team-member photos | Team Members | Personnel workflow unavailable; no image control | None | None | No canonical personnel owner/model | None | Whole workflow unavailable | Unavailable-state tests only | E | No team avatar media route or persistence found |

## 5. Detailed Findings

### MEDIA-PERSONAL-001 - Personal Profile photo

- **Visible/client:** enabled for staging or an explicit flag; production API defaults
  to disabled. JPEG/PNG/WebP files are limited to 10 MB before signing. Preview object
  URLs are revoked and success reconciles through `/auth/me`.
- **Server/authority:** the signature and persistence routes authenticate the user,
  derive the folder from user ID, validate returned Cloudinary metadata, and persist
  URL plus metadata transactionally.
- **Replacement:** old owned media is deleted after persistence; failed persistence
  cleans the new orphan. Server deletion is folder constrained.
- **Tests/action:** strong ownership, size, format, persistence, replacement, cleanup,
  and gate tests exist. Keep Class B until controlled production rollout is approved.

### MEDIA-PERSONAL-002 - Request Help photos

- **Visible/client:** production displays deferred copy. Create and edit modules still
  contain a hardcoded Cloudinary cloud name and unsigned upload preset.
- **Server/authority:** authenticated post creation knows the post owner but accepts
  the submitted `image_url` without proving Cloudinary ownership. Edit media lacks a
  canonical server path and also writes browser request state.
- **Security/tests/action:** active API acceptance makes this Class D. Remove unsigned
  code and add purpose-specific metadata, multi-image persistence, owned replacement,
  and route tests before enabling the control.

### MEDIA-PERSONAL-003, 006, and 007 - Property, review, and emergency photos

- **Visible/client:** no actionable media controls exist; Emergency is explicitly
  unavailable.
- **Server/authority:** no canonical media routes, fields, ownership, or cleanup were
  found.
- **Tests/action:** only surrounding unavailable states are covered. Keep Class E;
  establish each parent aggregate before designing media.

### MEDIA-PERSONAL-004 and MEDIA-BUSINESS-008 - Message attachments

- **Visible/client:** production deferral blocks selection. Development creates blob
  URLs and local outgoing messages; the object URL lifecycle is not governed.
- **Server/authority:** the message route checks conversation participants but accepts
  an arbitrary media URL. It has no private asset ownership, retention, or retrieval
  authorization model.
- **Security/tests/action:** Class F. Build private, participant-authorized delivery,
  scanning, expiry/retention, and cleanup before any rollout.

### MEDIA-PERSONAL-005 and MEDIA-BUSINESS-011 - Moments

- **Visible/client:** staged imagery and local/derived Moment records are rendered,
  with no real upload control.
- **Server/authority:** no canonical Moment ownership, privacy, publication, or media
  persistence exists.
- **Tests/action:** current tests cover projections, not authorization or persistence.
  Class C; create the Moment aggregate and publication/privacy rules first.

### MEDIA-PERSONAL-008 - Evaluation photos

- **Visible/client:** development FileReader paths create Base64 data URLs for overall
  evaluation and work-item photos; production deferral blocks the controls.
- **Server/authority:** evaluation/schedule records are browser-local and cannot own
  evidence media.
- **Security/tests/action:** Class F because these are customer/property findings.
  Require canonical evaluations, access controls, retention, and protected delivery.

### MEDIA-PERSONAL-009 - Completion and concern photos

- **Visible/client:** Completion Sheet compresses images to Base64 and stores them in
  browser completion records; Resolve Together holds Base64 concern evidence in local
  state. Production controls are deferred.
- **Server/authority:** no canonical completion/concern evidence aggregate exists.
- **Security/tests/action:** Class F. Do not reuse public profile-image delivery for
  dispute or completion evidence.

### MEDIA-BUSINESS-001 - Business logo

- **Visible/client:** both business image surfaces are disabled, but the dormant
  Contractor Profile handler uses an unsigned upload preset.
- **Server/authority:** the business profile row is user-owned, yet persistence only
  checks that `image_url` begins with HTTPS. The existing `business_profile` signing
  purpose is not connected to metadata persistence or replacement cleanup.
- **Security/tests/action:** active arbitrary URL acceptance makes this Class D. This
  is the first implementation target after closing the route-level blocker.

### MEDIA-BUSINESS-002 - Business cover

- **Visible/client:** no editor exists.
- **Server/authority:** an owned `business_cover` signature can be issued, but there is
  no canonical cover field, metadata contract, persistence route, or replacement.
- **Tests/action:** signing is covered; persistence is absent. Class E until the data
  contract exists.

### MEDIA-BUSINESS-003 and 004 - Gallery and portfolio

- **Visible/client:** create/edit upload controls are deferred, but dormant unsigned
  upload code remains. Portfolio readers and public projections actively consume
  browser-cached projects and URLs.
- **Server/authority:** contractor project writes enforce parent ownership but accept
  arbitrary `image_url/image_urls`; public reads return those values. No public IDs,
  media metadata, deletion, moderation, or publication state are tracked.
- **Security/tests/action:** both are Class D. Remove browser publication authority,
  then add owned project-media metadata and collection cleanup.

### MEDIA-BUSINESS-005 - Before/after workflow media

- **Visible/client:** production-gated workflow controls create blob/local messages in
  development.
- **Server/authority:** no canonical before/after evidence event or protected media
  model exists.
- **Tests/action:** Class F. Couple protected media to server-owned workflow events.

### MEDIA-BUSINESS-006 and 007 - Quote and invoice attachments

- **Visible/client:** no attachment controls remain in the truthfully limited quote
  and invoice experiences.
- **Server/authority:** no attachment tables, routes, or ownership model exist.
- **Tests/action:** Class E. Keep unavailable until server-owned document workflows and
  a private document architecture exist.

### MEDIA-BUSINESS-009 and 012 - Hiring and team-member media

- **Visible/client:** Hiring and Team Members fail closed because governed personnel
  persistence is unavailable; no media controls are active.
- **Server/authority:** no applicant-document or employee-avatar persistence and no
  personnel privacy projection exist.
- **Tests/action:** unavailable states are tested, media is not. Class E; personnel
  authority must precede media.

### MEDIA-BUSINESS-010 - Spotlight

- **Visible/client:** active selectors can combine backend profile/project images with
  local portfolio and Spotlight storage.
- **Server/authority:** server project reads are public, but local association and
  feature preference can alter public presentation without backend publication truth.
- **Security/tests/action:** Class D. Existing tests prove the local behavior rather
  than rejecting it. Move publication and featured-media selection to the backend.

## 6. Unsafe Pattern Review

| Pattern | Result | Severity | Affected evidence |
|---|---|---|---|
| Base64 persistence | Confirmed in development paths; production-gated | High latent | `CompletionSheet.jsx`, `ContractorDashboard.jsx`, `CompletedJobDetails.jsx` |
| Browser-local media authority | Active in portfolio/Spotlight readers | High active | `businessPortfolioStorage.js`, `localSpotlightVisibility.js`, `Home.jsx` |
| Arbitrary remote image URLs | Active authenticated server acceptance | Critical active | server `index.js:1223,1546,1833,1883`; `businessProfile.js:119` |
| Unsigned uploads | Dormant client code, blocked by production UI gate | Critical latent | `Upload.jsx`, `MyRequests.jsx`, `ContractorProfile.jsx`, `ProjectGallery.jsx` |
| Missing media ownership validation | Confirmed for submitted URLs | Critical active | posts, messages, business profile, contractor projects |
| Exposed Cloudinary secrets | Not found | None | signature response/tests exclude API secret |
| Cross-user media risk | Possible through arbitrary URLs/local public association | High active | server URL fields; local Spotlight projection |
| False upload success | Blocked in production; possible in dormant local message/blob paths | High latent | `ConversationThread.jsx` |
| Unreleased object URLs | Governed Profile preview revokes; conversation blobs lack a governed lifecycle | Medium latent | `personalProfilePhoto.js`; `ConversationThread.jsx` |
| Orphaned asset risk | Governed only for Personal Profile; absent elsewhere | High | no collection/replacement cleanup outside Profile |

No client path was found that receives or logs `CLOUDINARY_API_SECRET`. The governed
signature validator rejects client-supplied folder, owner, user/business ID, public
ownership fields, and timestamp.

## 7. Feature-Gate Review

### Personal Profile gate

`isPersonalProfilePhotoUploadEnabled()` reads
`VITE_ENABLE_PERSONAL_PROFILE_MEDIA` first. Explicit `true` enables and explicit
`false` disables. Without an explicit value, only the known staging API origin enables
the feature; the production API origin returns false. Repository search found no
checked-in production configuration enabling this variable.

### Global media deferral

`isFriendsAndFamilyMediaDeferred()` returns true whenever `import.meta.env.DEV` is not
true. It protects Request Help, business logo/gallery, conversation, evaluation,
completion, concern, and camera-picker controls in staging and production. The gate
does not secure direct API calls and must not be treated as server authorization.

### Business-mode Profile

Profile disables personal-photo mutation while in business mode. The hidden business
file input cannot complete and points users to the deferred business profile path.

**Production flag conclusion:** repository-observable code keeps client uploads off in
production. No feature flag or environment file was changed by this audit.

## 8. Test Coverage Matrix

| Workflow | Backend Tests | Client Tests | Authorization Tests | Persistence Tests | Cleanup Tests | Coverage Assessment |
|---|---|---|---|---|---|---|
| Personal Profile | `cloudinaryConfiguration`, `uploadSignature`, `personalProfileImage` | `personalProfilePhoto`, `profilePhotoScoping` | Yes | Yes | Yes | Strong; production rollout remains operationally unverified |
| Request Help | No media ownership tests | `mediaDeferralSafety` | No | No governed media persistence | No | Insufficient; active arbitrary URL acceptance unguarded |
| Messages/communication | No media-specific authorization tests | deferral and message-delivery truth | Participant only, not asset | URL field only | No | Insufficient for private media |
| Business logo/cover | Signature ownership only; business profile shape tests | deferral/business profile tests | Signature yes; persisted media no | URL only/cover absent | No | Insufficient |
| Gallery/portfolio | Parent project behavior only | portfolio storage/proof tests | Parent record only | URL fields and local cache | No | Tests preserve unsafe/local behavior |
| Spotlight | Public projection only | Spotlight/local visibility tests | No publication authority | Local and API projections | No | Insufficient; local behavior explicitly expected |
| Moments | None | projection tests | No | No canonical media persistence | No | Missing |
| Evaluation/completion | None | deferral/truth tests | No | Browser-local only | No | Missing for governed media |
| Property/review/emergency | None | surrounding unavailable-state tests | No | None | No | No media implementation to cover |
| Hiring/team | None | unavailable-state tests | No | None | No | No media implementation to cover |
| Quote/invoice documents | None | truthful limitation tests | No | None | No | Private document architecture missing |

Focused tests confirm the current governed and deferred behavior; they do not close
the active arbitrary-URL or public local-projection findings.

## 9. Recommended Rollout Order

0. **Close shared governance blockers.** Reject arbitrary media URLs unless accompanied
   by purpose-specific, owner-validated metadata; remove unsigned code and browser
   publication authority.
1. **Business logo.** Reuse the existing signing purpose with canonical metadata,
   owner-folder validation, transactional replacement, and orphan cleanup.
2. **Business cover.** Add a canonical field/metadata contract and public
   transformation policy before exposing an editor.
3. **Business portfolio/project gallery.** Add collection metadata, publication state,
   moderation, deletion, and backend-owned Spotlight projection.
4. **Request Help photos.** Add owned multi-image metadata and a canonical edit route.
5. **Moments.** First establish Moment ownership, privacy, and publication authority.
6. **Project completion media.** Establish server-owned workflow/completion evidence
   and protected delivery.
7. **Message attachments.** Add participant-authorized private retrieval, scanning,
   retention, and expiry.
8. **Sensitive documents.** Build a separate restricted-document model for hiring,
   proposals, invoices, licenses, and other private records.

## 10. Blocking Findings

### Security blockers

- Authenticated backend routes accept arbitrary media URLs without asset ownership.
- Unsigned Cloudinary upload code remains in four client modules.
- Sensitive workflow media has no protected retrieval, retention, or audit model.
- No governed deletion/replacement lifecycle exists outside Personal Profile.

### Production-truth blockers

- Public portfolio/Spotlight rendering can consume browser-local media authority.
- Development blob/Base64 paths can imply sent or historical evidence without backend
  confirmation if their gate is removed.

### Backend gaps

- No canonical cover, Moments, evaluation, completion-evidence, attachment, hiring,
  team-member, quote-document, or invoice-document media aggregates exist.
- Posts and contractor projects lack owned media metadata collections.

### Client-only placeholders

- Property, review, emergency, business cover, quote/invoice attachment, hiring, and
  team-member media have no active uploader.
- Global deferred copy is safer than the dormant handlers and must remain.

### Missing tests

- No tests reject unowned media references on posts, messages, business profiles, or
  contractor projects.
- No tests enforce backend-owned Spotlight publication media.
- No authorization, persistence, or cleanup suites exist for incomplete workflows.

### Non-blocking UX issues

- Global deferred copy says governed storage is unfinished even though the shared
  foundation exists; parent workflow authority is the actual blocker.
- Business-mode Profile relies on a tooltip rather than persistent inline explanation.

## 11. Final Certification Statement

**FAIL — An active unsafe media workflow exists and must be remediated before
additional media rollout.**

The Personal Profile implementation remains governed and ready but production-gated.
No other media workflow should be enabled until arbitrary URL acceptance and
browser-local public media authority are removed, followed by workflow-specific
ownership, persistence, cleanup, and test coverage.
