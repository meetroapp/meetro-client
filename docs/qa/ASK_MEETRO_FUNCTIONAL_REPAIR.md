# Ask Meetro functional repair — pre-change audit

Frozen client HEAD: `50112adf2e8e80c5df7660f513a143e67a78a48e` (904563).

## Response and false-action root cause

Before any implementation changes, traced `AskMeetroWorkspace.send` → `resolveAskMeetroActions` → `planAskMeetroActions` → `askMeetroReply`. The workspace does not invoke an intelligence transport. Empty actions yield the generic "open Ask Meetro from a Job" response. Worse, `if (!actions.length && context.page)` creates a synthetic `RECORD` action titled "Review this record". Keyword matches for visit/payment/quote/etc. do not first require an instruction to change state, and proposals can have empty routes. Consequently ordinary help is either discarded or misclassified. Role/page presence does not establish exact record authority.

The older `MeetroAssistant.getVoiceResponse` is also local guidance/routing, not a general reasoning transport. Client `server/intelligence` contains an older question/answer gateway but `runtimeAuthority.js` explicitly marks it compatibility-reference-only; its controller and route registration throw. It must not be revived or imported into the client.

Initial read-only inspection of the protected local server checkout (`/Users/williammolina/meetro-server/meetro-server`, HEAD `377a3b8`) found the following contract (that local HEAD alone did not establish remote staging or deployed authority): `/api/companion/ask` requires operation, capability, locale/context/input and an idempotency key. Its registry contains job-request interpretation, Quote composition, Quick Quote photo assistance, evaluation assistance, estimate composition and Invoice assistance. It has no general conversational operation. Sending the old `{question}` contract would fail validation. No existing endpoint should be invented and no workflow operation should be misused for context-free troubleshooting. The subsequent remote staging verification below establishes the branch-source contract; no server files changed.

## Native voice findings

The workspace already selects the custom Capacitor `SpeechRecognition` plugin on native platforms and browser SpeechRecognition/webkitSpeechRecognition otherwise. Native code imports Apple's Speech and AVFoundation frameworks; no new package is needed. `MainViewController` registers the plugin, the storyboard uses that controller, and both Swift files are in the Xcode Sources phase. Info.plist already includes microphone and speech-recognition usage descriptions matching the capability.

Confirmed implementation defects: workspace ignores returned permission state, does not check native availability, has no startup/stop serialization, does not observe native listening/partial-result events, and replaces every native exception with "Voice is unavailable." Native `stop` only ends audio, leaving the pending start call dependent on a future final callback; cleanup does not deactivate the audio session or explicitly cancel a pending task; callbacks are not protected against an earlier session settling a later one; format/service availability and interruptions are not handled explicitly. The physical device's precise rejection is not recoverable from its generic message. Permission denial, interrupted recognition, service unavailability, and a missing bridge cannot truthfully be distinguished without repaired error reporting/device verification.

## Review button

The action row is flex layout with shrinkable text and button. There is no button no-wrap/minimum-width rule, so its label can shrink to "Revie" / "w". Fix only the action-control sizing, not review authority or workspace composition.

## Implemented client boundary

The user confirmed there is no approved alternate conversational contract and instructed that general response delivery remain a backend blocker. No conversational endpoint, provider SDK, local canned-answer engine or workflow-operation substitution was added.

`send` still uses the governed local planner/resolver for explicit operational instructions. Intent is classified by clause openings, not question words embedded inside operational instructions. Pure informational requests stay conversational. Mixed information/change requests are held in full with zero proposals and a truthful status explaining that the question was not answered and the change was not proposed. Explicit operational clauses still require their existing exact route. The unconditional RECORD fallback is removed. Statements reporting approval/payment/completion are not independently instructions to record them. Existing multi-action tests now explicitly request each operation. Exact Quote lookup failures remain fail-closed and no longer render an unusable Review card. Standalone New Quote retains its existing reviewed navigation to an unsaved working document, not a canonical mutation. General questions receive a truthful connection-unavailable message with zero actions; this is a status message, not an AI answer. A request to change an unidentified record receives clarification only because that operation requires a record. Parser failure clears stale proposals and preserves the typed request. No backend operations are invoked for ordinary help.

Native voice uses the existing plugin through an isolated input controller: capability/permission checks; startup, permission and listening feedback; partial-result buffering; editable final transcription; stop, cancellation and timeout cleanup; distinct informational failure categories. The native plugin now serializes audio work on the main queue, retains its recognizer, validates service/audio format, handles interruptions, retires old callbacks by generation, settles pending start on stop, and releases the audio session/tap/task. Voice never sends a message, creates an action card, or applies a change. Permissions/descriptions and dependencies remain unchanged.

Review controls alone now have an 84px minimum width, no-wrap text and no flex shrink. No navigation, global CSS, Login, Home, palette, typography, or workspace composition changes.

## Required separate backend contract follow-up

The canonical `POST /api/companion/ask` gateway needs a separately approved, registered informational/conversational operation and matching capability. The exact operation name/schema must be owned by the server contract, not invented by the client. It must accept a bounded user question and supported locale; optional conversation continuity and exact existing record pointers must be validated, never synthesized. Context-free questions must be allowed. The gateway must authenticate and govern usage, invoke its provider/orchestrator, and return bounded conversational text with explicit success/error semantics. The operation must have zero record mutation authority, must not return fabricated completion/payment/approval evidence, and must not turn returned text into client action instructions. Existing operational capability gates and Review → Confirm & Apply remain separate. Define supported roles, optional-context authorization, timeout/retry/idempotency behavior, and response/error schemas before client integration. No server implementation is part of this change.

## Certification boundary

The generic physical "unavailable" message does not reveal which native rejection occurred on 904563. Confirmed code defects are repaired, but the physical-device cause and microphone success still require iPhone/iPad QA with the revised state/error reporting. Verify first grant, denied/re-enabled permission, spoken transcription, manual stop, repeated attempts, interruption/background, typed recovery, and no automatic Send/Apply. General conversational answers remain blocked pending the approved backend operation.

## Initial repair validation results

- Focused Ask/voice suites: 71 passed (17 voice capability/lifecycle tests).
- Full client suite: 4,386 passed, zero failures; 39 new tests over frozen 904563.
- Changed JS/JSX ESLint: zero errors/warnings; zero added diagnostics against frozen HEAD. CSS/Swift are outside this ESLint configuration.
- Staging build: passed, 691 modules; existing large-chunk advisory remains.
- Native validation: unsigned iOS Simulator build passed using cached dependencies and an isolated `/private/tmp` project copy. The initial in-place build lacked generated Capacitor resources; generated resources were supplied only to the isolated copy. No device installation, signing, version bump, or deployment occurred.
- Browser QA: actual Ask component at 375x812, 390x844, 393x852, 428x926, 1024x1366 and 1366x1024. Outlet help produced zero actions. All four Review controls for an explicit three-action instruction remained single-line, at least 84px wide, and inside the viewport. No horizontal document overflow.
- `git diff --check`: passed. No server, dependency, permission-description, global visual, navigation, or lifecycle-authority file changes.

## Remote staging verification — 2026-09-09

VERIFIED against remote staging source, not inferred from the protected checkout:

- `git ls-remote https://github.com/meetroapp/metro-server.git refs/heads/staging` returned `574f3f99e9290ca4f959ffc26e13d771e503400d`.
- Created an isolated bare clone at `/private/tmp/meetro-companion-staging-audit.git` and detached worktree at `/private/tmp/meetro-companion-staging-574f3f9`, pinned to that exact SHA. The protected repository was not fetched into, checked out, reset or modified.
- `server/intelligence/intelligenceRoutes.js:24,315` defines and registers authenticated `POST /api/companion/ask`. `index.js:979` mounts those routes with the canonical defaults.
- `server/intelligence/intelligenceOperationRegistry.js:123` registers exactly six operations with matching capabilities: `job_request.interpret`, `quote.compose`, `quick_quote.photo_assist`, `evaluation.assist`, `estimate.compose`, `invoice.assist`.
- `intelligenceGatewayContracts.js:11` allows operation, locale, capability, context and input. `intelligenceGateway.js:89` rejects unregistered operations with `INTELLIGENCE_OPERATION_FORBIDDEN` and mismatched capabilities with `INTELLIGENCE_CAPABILITY_FORBIDDEN`, before provider invocation.
- `intelligenceOrchestrator.js:54` selects operation-owned context/engines, builds the provider request and parses the operation-specific result. `openAiWorkflowProvider.js` supplies Responses/transcription integration, not an independently callable general conversational route. No registered general informational operation or capability exists.
- The separate `POST /api/intelligence/quick-quote-analysis/sessions/:sessionId/continue` path uses `quick_quote.analysis.continue` through a private internal registry (`quickQuoteAnalysisContinuationService.js:55`). Its conversational output requires an authorized private analysis session, current evidence and bounded review history. It is not a context-free Ask operation and was not repurposed.
- All committed `server/intelligence` files are identical between protected local HEAD `377a3b852df8b2bee8459d87abdc334fd6727be1` and exact remote staging. The root route-registration difference adds Quote customer options and payment reminders; Companion registration is unchanged. The overall commits differ (81 files), but this Companion contract does not.
- Protected local HEAD and its pre-existing dirty-file inventory remained unchanged; the detached audit worktree remains clean. No API POST, provider request, database access, deployment or server edit was performed. The deployed Railway revision was not queried, so this is remote-source verification, not proof of the currently running deployment revision.

The separate backend follow-up above is therefore required: add an approved general conversational operation/capability to the canonical Companion contract before wiring general Ask responses. No alternate endpoint or local answer engine was introduced.

## Clause-intent follow-up

Regression coverage distinguishes `Why/How/Explain/Help` clause openings from subordinate `what/how/why/whether/explain` inside a change instruction. The supplied Update Invoice, Schedule Job and Record Payment examples retain exact-record review proposals; missing or blocked context still produces none. Mixed requests in either order, across punctuation/conjunctions, including exact Quote lookup requests, are held before lookup. Real composer tests prove stale proposals are cleared, no Review/receipt appears for mixed intent, and no navigation/network mutation occurs. A status message explains the conversational blocker without pretending to answer the question.

Follow-up validation: 101 focused Ask/voice tests passed; 4,416 full client tests passed (30 added in this continuation). Changed-file ESLint: zero errors, zero warnings and zero new diagnostics against frozen HEAD. Staging build passed with the existing large-chunk advisory. `git diff --check` passed. Client HEAD remains `50112adf2e8e80c5df7660f513a143e67a78a48e`; no commit, push or deployment.
