# R5.3 Evaluation Visit investigation — staging blocker unresolved

The bounded client correction passes automated checks. **The physical staging scheduling blocker is not resolved or certified.** The affected authenticated Job request/response was not available, so its underlying 403 cause cannot yet be established. No server modification was made on an inferred diagnosis.

## Verified trace and findings

ContractorDashboard renders the selected canonical Job into its Evaluation accordion, CanonicalJobEvaluation, and CanonicalJobVisits. The latter reconstructs the canonical Job record and calls loadCanonicalVisitWorkspace. Its Evaluation subject calls fetchCanonicalVisits against authenticated GET /jobs/:jobId/visits, before an Evaluation exists. This is separate from the approved Quote visit-authority read. authFetch supplies the existing session bearer; no client account-type test controls that read.

The exact reported text originated in canonicalVisitController.visitErrorMessage: every caught HTTP 403 became “Visit scheduling is not available for this professional account.” This identifies the status mapping, but does not distinguish membership denial, missing/revoked capability, or a different deployed contract. The subject-level error can also originate in a Visit detail read if a Visit already exists. If both preliminary Evaluation and Quote reads fail, the outer controller can show the Evaluation read error instead.

In the isolated server, the Job Visit route uses visitService.listVisits → authorizeRead → requireActorRole/loadJobContext. It returns 403 VISIT_AUTHORITY_REQUIRED for an unrecognized professional/customer role or when neither applicable Job/Evaluation Visit read grants nor approved-work read grants exist. A missing authorized Job context returns 404. A successful collection returns actions.canPropose based on professional role and active capabilities.

The client discarded that collection action. It then created canPropose from details.length === 0. This was a separate verified client authority defect, not an explanation for why staging returned 403.

Corrected condition: the Evaluation collection must include an actual boolean actions.canPropose, and the controller forwards that value. Missing/malformed action fields fail closed. No Evaluation ID is required for the existing Job Visit list. Existing array-only readers retain their response shape. No server command or grant is created by reading/rendering/opening the form.

The existing ordinary Job foundation grants evaluation_visit capabilities before Evaluation creation. Migration 202608250001 explicitly creates no grants and performs no backfill. The business-document Job foundation also has a different capability bootstrap. These are investigation leads, not a proven diagnosis for the affected Job. Job identity, origin, grants and deployed response must be checked before choosing a server correction. No migration was authored or run.

## R5.3 files changed

Production (3, within the six-file limit):
- src/utils/canonicalVisitProjection.js — optional validated collection action alongside the filtered Evaluation Visits.
- src/utils/canonicalVisitController.js — consume that action; replace 403/404 account-blaming copy with a Job-specific fallback.
- src/utils/workCenterPresentationLanguage.js — fallback in EN, ES, FR, PT-BR: “Scheduling isn’t available for this job right now.”

Tests:
- tests/canonicalVisitProjection.test.js — correct the pre-Evaluation fixture, preserve collection actions, and prove Evaluation scheduling remains independent of a locked Approved Work deposit.
- tests/evaluationVisitPhysicalPath.test.js — seven mounted regressions using the exact ContractorDashboard Evaluation accordion JSX and the real accordion, Evaluation component, Visit component, controllers and projection modules. Only authenticated HTTP is mocked. Business/professional presentation mode is set. No saved Evaluation plus a valid server action exposes Propose Visit; clicking opens the existing editor and performs GETs only. 401/403/404, false, missing and string-valued actions expose no proposal.

The rendered test is a production-source-derived section fixture, not a complete authenticated staging app or real iPad test. Its unauthorized/wrong-business cases model denied HTTP responses; they do not independently verify server membership SQL. Existing server authorization was not changed.

## Validation

- Focused: 220 passed, 0 failed, 0 skipped. Visit/Evaluation/professional Schedule/deposit test files.
- Full client: 4930 passed, 0 failed, 0 skipped (baseline 4921; nine tests added).
- npm run build:staging: passed; existing large-chunk advisory remains.
- git diff --check: passed.
- Server files changed: none. Server suite not rerun because no server code changed.

Approved Work deposit gating, mutual confirmation, exact Visit versioning, Start Visit commands, Evaluation creation/completion, downstream Quote gates, and Visit history implementations remain unchanged; their relevant existing client regressions pass. No new Evaluation Visit authority is manufactured when the server denies it. Closed-job scheduling still depends on server action denial; this patch does not infer closure or grant permissions from UI stage.

## Required next evidence

An authenticated staging view of the affected Job (URL/Job ID and access to its current session), or a redacted diagnostic containing the GET /jobs/:jobId/visits status/code/action fields and authorized Job origin. Do not share bearer tokens in chat. This is necessary to distinguish wrong identity, missing grants, revoked authority, and deployment mismatch. A Job ID alone identifies the record but does not supply authenticated access.

Until that trace is available, this patch must not be described as restoring the physical Job's scheduling. No commit, push, deploy, protected-repository edit, reset, clean, stash, or iOS build was performed.
