# Completion Phase 3 - Closure Obligation Source and Provenance Audit

## Status

- Audit only
- Documentation only
- No runtime adoption
- No persistence
- No workflow or authority changes

## Mission

This audit identifies where Closure-relevant facts currently appear and whether
their identity, actor, timestamp, and evidence provenance are strong enough to
support the advisory `closureReadinessContract`.

The audit does not decide:

- which obligations are mandatory;
- whether payment is authoritative;
- which confirmation exceptions are allowed;
- who may waive an obligation;
- who may authorize Closure.

## Executive Finding

No reviewed source can safely feed a complete Closure readiness decision today.

Several sources can become **candidate evidence** after a read-only adapter and
an authoritative operational aggregate link:

- completion records, photos, notes, and timestamps;
- an explicit `awaiting_customer_confirmation` closeout state;
- invoice/payment claims and questions;
- Project Folder document, issue, approval, and payment-request records;
- follow-up and dispute-like workflow records.

However, these sources are client-written, locally persisted, inconsistently
identified, and frequently derive actor role from the current viewer. They can
show that an event or claim exists. They cannot prove that an obligation was
authoritatively resolved.

Permit, inspection, tenant confirmation, utility approval, warranty handoff,
and general dispute resolution do not have real owning domains in the reviewed
implementation. Their current appearances are labels, descriptions, generic
records, or future-tool promises.

## Provenance Standard

A source is safe to feed `closureReadinessContract()` only when an adapter can
provide:

1. explicit operational `aggregateId`;
2. explicit `aggregateType`;
3. stable obligation identity;
4. explicit obligation category and status;
5. actor identity from the owning/authenticated authority;
6. actor role from authorization;
7. authoritative occurrence and recorded timestamps;
8. evidence or confirmation IDs when required;
9. evidence provenance from the correct domain owner;
10. no inference from display text, title, archive, History, review, or
    completed status.

Current sources fail at least one of these requirements.

## Readiness Classification

| Classification | Meaning |
| --- | --- |
| CANDIDATE | Captures a potentially useful fact, but requires identity/provenance adaptation and cannot prove resolution |
| PRESENTATION-ONLY | Displays or summarizes a status without owning the underlying obligation |
| UNSAFE | Uses inference, compatibility identity, client-only claims, or unrelated state that must not feed Closure |
| MISSING | No actual obligation source exists |

## Obligation Source Inventory

| Obligation | Primary source | Classification | Can safely feed contract now? | Correct future owner |
| --- | --- | --- | --- | --- |
| Customer Confirmation | Completion closeout message | CANDIDATE for open state only | No | Completion confirmation authority on the operational aggregate |
| Tenant Confirmation | None | MISSING | No | Maintenance/tenant participation authority |
| Payment | Completion form and invoice workflow | CANDIDATE claims; display resolution unsafe | No | Invoice/payment domain |
| Permit | Command Center label and generic records | PRESENTATION-ONLY | No | Permit domain |
| Inspection | Language/tool descriptions only | MISSING | No | Inspection domain |
| Warranty Handoff | `warrantyOffered` and confirmation label | PRESENTATION-ONLY | No | Warranty/document handoff domain |
| Required Documentation | Completion photos and Project Folder records | CANDIDATE artifacts | No | Project Folder/document requirements domain |
| Follow-Up | Visit outcome, closeout status label, reminders tool | CANDIDATE intent; no post-completion owner | No | Task/scheduling obligation owner |
| Utility Approval | None | MISSING | No | Utility approval domain |
| Dispute Resolution | Invoice question, issue/change records | CANDIDATE dispute signals | No | Dispute/change authority |
| Emergency Review | Review state and later `closed` status | CANDIDATE relationship evidence; UNSAFE for Closure | No | Relationship/review domain |
| Future Obligation Types | Generic Project Folder records | CANDIDATE container only | No | Future owning domain plus aggregate link |

## 1. Customer Confirmation

### Source: Completion closeout message

| Field | Audit result |
| --- | --- |
| File | `src/pages/CompletionSheet.jsx` |
| Current data captured | `workflow_completion_closeout`, generated message ID, `completionStatus: "awaiting_customer_confirmation"`, completion payload, `warrantyOffered`, `reviewRequested`, `createdAt` |
| Owner implied today | Conversation card created by Completion Sheet |
| Correct future owner | Completion confirmation authority associated with the operational aggregate |
| Evidence available | Explicit evidence that confirmation is still awaited |
| Missing evidence | No customer confirmation record, confirmation ID, authenticated customer actor, authorization, backend acknowledgement, decision reason, or authoritative recorded time |
| Actor provenance | Message says `sender: "business"` and `role: "business"` without a stable actor ID |
| Timestamp provenance | Client clock (`completedAt`) |
| Aggregate identity provenance | `requestId` falls back to `activeRequestId` or `conversationId`; no authoritative aggregate ID |
| Safe contract feed | **No.** After a future adapter and authoritative aggregate link, it may safely create an **open** Customer Confirmation obligation |
| Blockers | No confirmation writer, no customer actor provenance, unsafe request/conversation fallback, no backend timestamp |
| Recommended adapter | `completionConfirmationObligationAdapter` mapping only explicit statuses and preserving unresolved state |

### Source: Workflow closeout presentation

| Field | Audit result |
| --- | --- |
| File | `src/components/workflows/WorkflowCompletionCloseoutCard.jsx` |
| Current data captured | Displays `confirmed` or `followup_requested` when already present on the message |
| Owner implied today | Conversation presentation |
| Correct future owner | Completion confirmation authority |
| Evidence available | None beyond the supplied display state |
| Missing evidence | No mutation/writer, actor, decision event, confirmation reference, authority, or authoritative timestamp |
| Actor provenance | None |
| Timestamp provenance | None at card level |
| Aggregate identity provenance | Inherited from an unsafe message shape |
| Safe contract feed | **No; presentation-only** |
| Blockers | The card renders state but does not establish it |
| Recommended adapter | None from the card; adapt the future authoritative confirmation source instead |

### Finding

The only current trustworthy meaning is that the professional-created closeout
expects confirmation. A visible `confirmed` label must not be treated as
authoritative confirmation without its owning event and actor provenance.

## 2. Tenant Confirmation

| Field | Audit result |
| --- | --- |
| File | No tenant completion/confirmation writer found in reviewed files |
| Current data captured | Tenant concepts exist elsewhere in relationship and classification contracts, not in Completion |
| Owner implied today | None |
| Correct future owner | Maintenance Request or operational aggregate participant authority, role-scoped to the tenant |
| Evidence available | None |
| Missing evidence | Tenant identity, participant role, authorized aggregate membership, confirmation status, evidence ID, actor, timestamp, landlord/property-manager visibility rules |
| Actor provenance | Missing |
| Timestamp provenance | Missing |
| Aggregate identity provenance | Missing |
| Safe contract feed | **No; source missing** |
| Blockers | No tenant-aware completion path or confirmation domain |
| Recommended adapter | Future `tenantConfirmationObligationAdapter` over an authoritative tenant decision source |

Tenant confirmation must not be inferred from customer confirmation, a message,
property category, tenant display label, or conversation participation.

## 3. Payment

### Source: Completion form

| Field | Audit result |
| --- | --- |
| File | `src/pages/CompletionSheet.jsx` |
| Current data captured | `paymentReceived` (`yes`, `no`, `partial`), `paymentType`, amount, completion timestamp |
| Owner implied today | Professional completing the Completion Sheet |
| Correct future owner | Invoice/payment domain |
| Evidence available | Professional-entered payment claim |
| Missing evidence | Invoice ID, payment transaction/reference ID, payer/payee identity, payment processor/backend acknowledgement, settlement time, refund/dispute state, authorization |
| Actor provenance | No stable actor ID; business role is implied by screen context |
| Timestamp provenance | Client completion timestamp, not payment occurrence/recorded time |
| Aggregate identity provenance | Completion record lacks authoritative project/work-order identity |
| Safe contract feed | **No.** It may become a payment claim or warning, never resolved payment evidence by itself |
| Blockers | Self-report, default value is `yes`, no transaction evidence, no payment owner |
| Recommended adapter | `completionPaymentClaimAdapter` that always marks provenance as self-reported and never resolves Payment |

### Source: Invoice workflow card

| Field | Audit result |
| --- | --- |
| File | `src/components/workflows/WorkflowInvoiceRequestCard.jsx` |
| Current data captured | Customer can mark an invoice paid or ask a question; request fields and project timeline receive client timestamps |
| Owner implied today | Conversation workflow card |
| Correct future owner | Invoice/payment domain with participant authorization |
| Evidence available | Customer assertion that payment was made; explicit payment question |
| Missing evidence | Stable payer actor ID, payment transaction, invoice authority, backend acknowledgement, settlement verification, canonical aggregate link |
| Actor provenance | `currentViewerRole !== "business"` only; no authenticated actor ID in the written record |
| Timestamp provenance | Client `new Date().toISOString()` |
| Aggregate identity provenance | `updateMatchingHomeownerRequests()` permits request ID or title matching |
| Safe contract feed | **No for resolution.** A future adapter may emit `open` or `disputed`/review-needed candidate evidence |
| Blockers | Customer assertion is not settlement; title matching; client role and clock |
| Recommended adapter | `invoicePaymentObligationAdapter` consuming future invoice/payment authority, not card display state |

### Source: Completed Job Details and PDF

| Field | Audit result |
| --- | --- |
| Files | `src/pages/CompletedJobDetails.jsx`, `src/utils/completionShare.js` |
| Current data captured | Displays Paid/Partial/Pending and prints `paymentReceived` |
| Owner implied today | Completed History presentation/export |
| Correct future owner | Invoice/payment domain |
| Evidence available | None beyond the legacy completion claim |
| Missing evidence | Same payment authority and transaction evidence gaps |
| Actor provenance | None |
| Timestamp provenance | Completion date may be displayed; payment timestamp absent |
| Aggregate identity provenance | `lastCompletedProject` plus scalar fallback keys |
| Safe contract feed | **No; presentation-only** |
| Blockers | Stale scalar fallbacks and label transformation |
| Recommended adapter | None; exports should consume a future payment projection |

### Finding

No current source proves payment resolution. Text such as "Paid," a selected
form value, a customer "Mark Paid" click, or a generated PDF must not satisfy a
Payment obligation.

## 4. Permit

| Field | Audit result |
| --- | --- |
| Files | `src/pages/BusinessCommandCenter.jsx`, `src/pages/ContractorDashboard.jsx` |
| Current data captured | Command Center exposes a Permits tool and routes it to generic Records; Project Folder may contain scans or records |
| Owner implied today | Command Center/Work Center Records presentation |
| Correct future owner | Permit domain linked to the operational aggregate |
| Evidence available | Possible generic document/scan artifacts only |
| Missing evidence | Permit ID, jurisdiction, type, required status, application status, approval/closeout status, authority, inspection dependency, evidence IDs, authoritative timestamps |
| Actor provenance | Generic records may reflect current viewer, not issuing authority |
| Timestamp provenance | Local message/job-record timestamps |
| Aggregate identity provenance | Records are grouped by conversation compatibility identity |
| Safe contract feed | **No; presentation-only container** |
| Blockers | No permit model or state machine; tool is routing, not authority |
| Recommended adapter | Future `permitObligationAdapter` over an authoritative permit source |

A scanned file named "permit" cannot prove that a permit was required,
approved, finalized, or closed.

## 5. Inspection

| Field | Audit result |
| --- | --- |
| Files | `src/pages/BusinessCommandCenter.jsx` and language descriptions |
| Current data captured | Text describes future permit/inspection tracking |
| Owner implied today | None; tool concept only |
| Correct future owner | Inspection domain, potentially linked to permit or operational aggregate |
| Evidence available | None |
| Missing evidence | Inspection ID, type, authority, scheduled date, result, failure corrections, reinspection, signed evidence, timestamps |
| Actor provenance | Missing |
| Timestamp provenance | Missing |
| Aggregate identity provenance | Missing |
| Safe contract feed | **No; source missing** |
| Blockers | No inspection entity or writer |
| Recommended adapter | Future `inspectionObligationAdapter` |

## 6. Warranty Handoff

| Field | Audit result |
| --- | --- |
| Files | `src/pages/CompletionSheet.jsx`, `src/components/workflows/WorkflowCompletionCloseoutCard.jsx` |
| Current data captured | `warrantyOffered: true`; confirmed display can say "Warranty acknowledged" |
| Owner implied today | Completion/conversation presentation |
| Correct future owner | Warranty/document handoff domain |
| Evidence available | A boolean offer flag and a conditional label |
| Missing evidence | Warranty document ID, terms/version, issuer, recipient, delivery event, acknowledgement actor, acknowledgement time, coverage dates, exception/claim state |
| Actor provenance | Offer has implied business role; acknowledgement has none |
| Timestamp provenance | Completion message client time only |
| Aggregate identity provenance | Unsafe completion message request/conversation fallback |
| Safe contract feed | **No; presentation-only** |
| Blockers | Offer is not handoff; confirmation label is not acknowledgement evidence |
| Recommended adapter | `warrantyHandoffObligationAdapter` over document delivery and authorized acknowledgement events |

## 7. Required Documentation

### Source: Completion record and photos

| Field | Audit result |
| --- | --- |
| File | `src/pages/CompletionSheet.jsx` |
| Current data captured | Work summary, AI draft, materials/labor values, up to six completion photos with generated IDs and upload timestamps |
| Owner implied today | Completion |
| Correct future owner | Completion for work evidence; Project Folder/document requirements for required-document completeness |
| Evidence available | Concrete local photo artifacts, notes, completion record, completion timestamp |
| Missing evidence | Required-document checklist, file integrity/backend persistence, uploader actor ID, aggregate ID, evidence classification, authoritative recorded time |
| Actor provenance | Screen context only; no stable actor ID on artifacts |
| Timestamp provenance | Client clock for photos and completion |
| Aggregate identity provenance | Schedule/conversation/emergency identifiers are partial; no canonical aggregate ID |
| Safe contract feed | **No today.** Strongest candidate source after identity and provenance adaptation |
| Blockers | Local data URLs, generated client IDs, no requirement-to-artifact references |
| Recommended adapter | `completionEvidenceAdapter` preserving artifact IDs and never claiming document requirements are satisfied without a checklist |

### Source: Project Folder/job records

| Field | Audit result |
| --- | --- |
| Files | `src/pages/ConversationThread.jsx`, `src/pages/ProjectDetails.jsx`, `src/pages/ContractorDashboard.jsx`, `src/utils/workCenter.js` |
| Current data captured | Photos, updates, approvals, materials, scans, payment requests, issues, completion-like records, `savedAt` |
| Owner implied today | Conversation writes; Project Folder/Work Center reads |
| Correct future owner | Project Folder/document domain |
| Evidence available | Durable local operating artifacts with source-local IDs |
| Missing evidence | Required-document policy, canonical document type, uploader identity, authorization, backend acknowledgement, stable aggregate link |
| Actor provenance | Some conversation messages carry `senderRole`; auto-saved records often omit actor identity |
| Timestamp provenance | Client `createdAt`/`savedAt` |
| Aggregate identity provenance | Stored under `meetro_job_record_${conversationId}`; Project Details may manufacture `active-job-${id}` and fall back through many identifiers |
| Safe contract feed | **No today.** Candidate evidence only after explicit aggregate/document adapters |
| Blockers | Conversation identity is not aggregate identity; title/type heuristics; no required-evidence policy |
| Recommended adapter | `projectDocumentObligationAdapter` that maps only registered document types and authoritative links |

### Source: Completion PDF/share

| Field | Audit result |
| --- | --- |
| File | `src/utils/completionShare.js` |
| Current data captured | Generated PDF summary of existing completion data |
| Owner implied today | Export utility |
| Correct future owner | None; export is a consumer |
| Evidence available | Copy of existing record |
| Missing evidence | Export event, immutable document identity, signer, delivery acknowledgement, aggregate authority |
| Actor provenance | None |
| Timestamp provenance | Derived display date |
| Aggregate identity provenance | Whatever the input record contains |
| Safe contract feed | **No; derivative presentation artifact** |
| Blockers | A generated copy cannot strengthen source provenance |
| Recommended adapter | None; consume future canonical document/evidence projection |

## 8. Follow-Up

| Field | Audit result |
| --- | --- |
| Files | `src/pages/ContractorDashboard.jsx`, `src/pages/ConversationThread.jsx`, `src/components/workflows/WorkflowCompletionCloseoutCard.jsx`, `src/pages/BusinessCommandCenter.jsx` |
| Current data captured | Visit outcome `follow_up_required`, timeline event, closeout display state `followup_requested`, quick-reply text, reminders tool route |
| Owner implied today | Scheduling/Work Center before work; Conversation/Command Center presentation after completion |
| Correct future owner | Task/scheduling obligation domain linked to the operational aggregate |
| Evidence available | Explicit intent that follow-up is required/requested in some flows |
| Missing evidence | Follow-up task ID, reason, assignee, due date, completion state, waiver, authorized requester, post-completion aggregate link |
| Actor provenance | Visit outcome uses current business screen context; closeout state has no writer provenance |
| Timestamp provenance | Client timeline timestamps |
| Aggregate identity provenance | Compatibility project/request identity or conversation fallback |
| Safe contract feed | **No today.** A future adapter may create an `open` Follow-Up obligation from explicit source events |
| Blockers | Pre-work and post-completion follow-up concepts are mixed; no task lifecycle |
| Recommended adapter | `followUpObligationAdapter` over a future task/reminder owner |

Quick-reply text such as "Send follow-up" is not evidence that a follow-up
obligation exists or was resolved.

## 9. Utility Approval

| Field | Audit result |
| --- | --- |
| File | No utility approval source found |
| Current data captured | None |
| Owner implied today | None |
| Correct future owner | Utility approval/integration domain |
| Evidence available | None |
| Missing evidence | Utility identity, approval request, authority, status, approval evidence, timestamps, aggregate link |
| Actor provenance | Missing |
| Timestamp provenance | Missing |
| Aggregate identity provenance | Missing |
| Safe contract feed | **No; source missing** |
| Blockers | Entire domain absent |
| Recommended adapter | Future `utilityApprovalObligationAdapter` |

## 10. Dispute Resolution

### Source: Invoice question

| Field | Audit result |
| --- | --- |
| File | `src/components/workflows/WorkflowInvoiceRequestCard.jsx` |
| Current data captured | Customer asks a payment question; request and message state become `payment_question`/`question` |
| Owner implied today | Conversation/invoice card |
| Correct future owner | Invoice dispute/payment support domain |
| Evidence available | Explicit unresolved payment question |
| Missing evidence | Dispute ID, actor ID, issue classification, owner, resolution, settlement, authoritative timestamps |
| Actor provenance | Non-business viewer role only |
| Timestamp provenance | Client clock |
| Aggregate identity provenance | Request ID/title matching |
| Safe contract feed | **No today.** Could become an open/disputed candidate after identity adaptation |
| Blockers | Question is not a formal dispute or resolution |
| Recommended adapter | `paymentDisputeObligationAdapter` |

### Source: Issue and change records

| Field | Audit result |
| --- | --- |
| Files | `src/pages/ConversationThread.jsx`, `src/pages/ProjectDetails.jsx`, `src/pages/ContractorDashboard.jsx` |
| Current data captured | Issue photos/records, customer change request with `pending_review`, pending professional change orders |
| Owner implied today | Conversation and Work Center |
| Correct future owner | Change-order or dispute domain appropriate to the operational path |
| Evidence available | Candidate evidence that an unresolved issue/change exists |
| Missing evidence | Canonical issue/dispute ID, resolution state, decision authority, completion impact, aggregate identity, backend acknowledgement |
| Actor provenance | `senderRole` often comes from current viewer; no stable actor ID |
| Timestamp provenance | Client-generated |
| Aggregate identity provenance | Conversation/request compatibility values |
| Safe contract feed | **No today.** May feed `outstandingItems` only after explicit classification and linking |
| Blockers | Not every issue or change is a Closure dispute; no resolution lifecycle |
| Recommended adapter | `unresolvedIssueObligationAdapter` with explicit product-approved issue types |

Message text must never be parsed to infer dispute resolution.

## 11. Emergency Review

| Field | Audit result |
| --- | --- |
| Files | `src/pages/CompletionSheet.jsx`, `src/pages/CompletedJobDetails.jsx`, related emergency completion flow |
| Current data captured | `emergencyNeedsReview`, `reviewRequested`, `reviewSubmitted`, review display state; emergency later becomes `closed` after review submission |
| Owner implied today | Emergency completion and relationship review |
| Correct future owner | Relationship/review domain; emergency aggregate separately owns Closure |
| Evidence available | Review requested/submitted state |
| Missing evidence | Review event actor provenance in completion record, relationship event ID, backend timestamp, proof of obligation resolution |
| Actor provenance | Implied homeowner/current screen in review flow |
| Timestamp provenance | Client timestamp |
| Aggregate identity provenance | Emergency record ID may exist, but project/work-order identity and review linkage are inconsistent |
| Safe contract feed | **No for Closure.** It may feed Relationship History only |
| Blockers | Review is optional feedback and unrelated to payment, permits, inspection, warranty, documentation, or follow-up |
| Recommended adapter | `relationshipReviewHistoryAdapter`, explicitly excluded from Closure readiness |

Review submission must not create, resolve, waive, or authorize a Closure
obligation unless a future product policy explicitly defines a separate
obligation and authority. It must never be treated as universal Closure.

## 12. Future Obligation Types

| Field | Audit result |
| --- | --- |
| Files | `src/pages/ConversationThread.jsx`, `src/pages/ProjectDetails.jsx`, `src/pages/ContractorDashboard.jsx`, `src/utils/closureReadinessContract.js` |
| Current data captured | Generic workflow messages, job records, scans, approvals, updates, materials, and future-category preservation |
| Owner implied today | Conversation/Project Folder container |
| Correct future owner | The future domain that creates and resolves the obligation |
| Evidence available | Generic artifacts and source-local IDs |
| Missing evidence | Category registry, obligation policy, domain owner, authority, status semantics, aggregate links, provenance |
| Actor provenance | Inconsistent |
| Timestamp provenance | Usually client-generated |
| Aggregate identity provenance | Usually conversation or compatibility identity |
| Safe contract feed | **No.** Future types remain unknown and unresolved |
| Blockers | Generic storage cannot confer domain authority |
| Recommended adapter | One adapter per future owning domain, never a text/title inference adapter |

## Cross-Cutting Source Audit

### Work Center selectors

`workCenterSelectors.js` is useful for read-only inventory and warning
collection. It cannot establish Closure provenance because:

- completed work is selected by status;
- project identity may come from compatibility normalization;
- timeline timestamps are client/saved timestamps;
- Project Folder records are conversation-keyed;
- no obligation owner or requirement policy exists.

It may support a future source audit adapter, but its output must not be passed
directly into `closureReadinessContract()`.

### Workflow commands

`workflowCommands.js` creates append-only local bridge records with generated
client command IDs and client timestamps. It supports `completeProject()` but no
obligation or Closure command.

Its explicit project link is better than title matching, but it does not prove:

- aggregate authority;
- actor identity;
- actor authorization;
- backend acknowledgement;
- obligation resolution.

It cannot currently provide authoritative Closure evidence.

### Project identity

`projectIdentity.js` may normalize request, job, quote request, conversation,
emergency, post, or generic IDs into `projectId`.

That compatibility behavior is unsafe for Closure. Obligation evidence must
reference the same authoritative operational aggregate, not merely any available
workflow identifier.

### Work Center storage helpers

`workCenter.js` stores schedules, quotes, conversation metadata, Project Folder
records, and active snapshots in local storage. These helpers preserve current
behavior but add no actor, authorization, backend timestamp, or aggregate
provenance.

### Project Gallery

`ProjectGallery.jsx` manages professional portfolio records. Portfolio images
and descriptions are not Completion evidence, Required Documentation, Project
Folder records, or Closure obligations. Project Gallery must not feed Closure.

### Command Center

`BusinessCommandCenter.jsx` routes to Work Center tools. It may eventually
surface obligation alerts and navigate to their owners, but it cannot create,
resolve, or authorize obligations.

## Currently Usable Evidence

No source is ready for direct authoritative Closure evaluation.

The following facts are usable for **read-only candidate evidence** after a
future adapter and authoritative aggregate link:

1. A completion record exists with a source-local ID and client completion time.
2. Completion photos and notes exist as work-evidence artifacts.
3. A closeout explicitly says customer confirmation is awaiting.
4. An invoice/payment request exists.
5. A customer marked payment paid or asked a payment question.
6. A Project Folder artifact, issue, scan, approval, or completion photo exists.
7. An explicit follow-up-required/requested state exists.
8. An unresolved issue or change request exists.
9. An emergency review was requested or submitted, for Relationship History
   only.

These facts indicate events or claims. They do not establish obligation
resolution.

## Presentation-Only Sources

The following must not be treated as evidence:

- Completed Job Details Paid/Partial/Pending labels;
- generated completion PDF wording;
- Work Center Completed placement;
- Completed counts or revenue;
- `recordArchived` and `saved_to_history`;
- Workflow closeout confirmed/warranty labels without owning events;
- Project Details memory counts and generated live status;
- Command Center Permit tool labels;
- language text describing future permit/inspection features;
- Project Gallery portfolio entries;
- quick-reply text;
- icons, badges, titles, and subtitles.

## Unsafe Obligation Evidence

The following are unsafe for Closure:

1. Completion status used as proof that obligations are resolved.
2. Conversation archive or saved-History state.
3. Completed History membership.
4. Review submission used as Closure.
5. `paymentReceived` used as settlement authority.
6. "Mark Paid" used as verified payment.
7. Message text parsed for payment, confirmation, dispute, or resolution.
8. Warranty offered used as warranty handoff.
9. A generic scan used as permit/inspection approval.
10. Project Folder presence used as required-document completeness.
11. Conversation ID, schedule ID, emergency ID, title, or generic ID used as
    authoritative aggregate identity.
12. Client timestamps used as backend acknowledgement.
13. Current viewer role used as actor authorization.

## Missing Obligation Owners

| Obligation | Missing or incomplete owner |
| --- | --- |
| Customer Confirmation | Completion confirmation decision authority |
| Tenant Confirmation | Tenant participation/maintenance authority |
| Payment | Invoice/payment settlement authority |
| Permit | Permit lifecycle authority |
| Inspection | Inspection lifecycle authority |
| Warranty Handoff | Warranty/document delivery and acknowledgement authority |
| Required Documentation | Required-document checklist authority |
| Follow-Up | Post-completion task/scheduling authority |
| Utility Approval | Utility integration/approval authority |
| Dispute Resolution | Dispute/change resolution authority |
| Emergency Closure | Emergency aggregate Closure authority distinct from review |
| Future Obligation Types | One explicit owner per domain |

## What Must Not Be Inferred

1. Customer confirmation from Completion, silence, archive, review, or History.
2. Tenant confirmation from customer confirmation or conversation membership.
3. Payment resolution from text, display labels, form selection, invoice status,
   or exported PDF.
4. Permit approval from a scan, note, Records tab, or Command Center tool.
5. Inspection approval from permit presence or completion photos.
6. Warranty handoff from `warrantyOffered`.
7. Required-document completeness from any document being present.
8. Follow-up resolution from a reminder, quick reply, or conversation message.
9. Utility approval from a generic approval record.
10. Dispute resolution from issue disappearance or completed status.
11. Closure from review submission.
12. Closure from conversation archive.
13. Closure from completed History.

## Recommended Completion Phase 4

**Completion Phase 4 - Pure Obligation Evidence Provenance Contract**

Create a pure, non-persisting validator for candidate obligation evidence. It
should determine whether a supplied evidence record is authoritative,
self-reported, presentation-derived, inferred, conflicting, or missing.

Recommended input:

```js
{
  obligation,
  evidence,
  aggregate,
  actorContext,
  recordingContext
}
```

Recommended output:

```js
{
  trusted,
  obligationTrust,
  evidenceTrust,
  actorTrust,
  timestampTrust,
  aggregateTrust,
  blockers,
  warnings,
  riskLevel
}
```

Required rules:

- authoritative aggregate identity is mandatory;
- stable obligation/evidence identity is mandatory;
- current viewer is not actor authority;
- client clock is not backend acknowledgement;
- self-reported payment is not settlement;
- presentation labels are never evidence;
- archive, History, review, and Completion are never Closure evidence;
- unknown provenance remains untrusted;
- no obligation is created, persisted, resolved, waived, or adopted.

Phase 4 should stop if it requires choosing mandatory obligations, payment
authority, confirmation exceptions, waiver authority, or Closure authorization.

## Required Conclusions

### 1. Which obligation sources are currently usable as evidence?

Completion artifacts, explicit awaiting-confirmation state, invoice/payment
claims, Project Folder artifacts, follow-up signals, and issue/change signals
are usable only as candidate facts after adaptation. None proves authoritative
resolution.

### 2. Which obligation sources are presentation-only?

Completed Job Details labels, PDFs, Work Center placement/counts, closeout
labels, Project Details summaries, Command Center tools, language descriptions,
and Project Gallery records are presentation-only.

### 3. Which obligation sources are unsafe?

Archive, History, Completion, review submission, generic scans, message text,
current-viewer actor inference, client timestamps, title matching, and
compatibility project identity are unsafe as Closure evidence.

### 4. Which obligations need future domain owners?

All obligation categories need explicit owners. Payment, permit, inspection,
warranty, documentation requirements, follow-up, utility approval, dispute
resolution, tenant confirmation, and emergency Closure are currently missing or
incomplete.

### 5. Which obligations must not be inferred from completion, archive, review, or history state?

No obligation may be inferred as resolved from those states. In particular,
customer/tenant confirmation, payment, permit, inspection, warranty,
documentation, follow-up, utility approval, dispute resolution, and emergency
Closure must remain unresolved until their owning domain supplies explicit
evidence.
