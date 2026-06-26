# Completion Phase 5 - Obligation Evidence Characterization

## Status

- Fixture-only measurement
- Pure utilities only
- No browser storage
- No runtime adoption
- No Closure authority

## Purpose

This phase measures representative Meetro completion-related data against:

- `obligationEvidenceProvenance.js`, which determines whether an evidence item
  has trustworthy provenance; and
- `closureReadinessContract.js`, which determines whether reviewed obligations
  are advisory-ready for Closure.

The harness uses sanitized fixtures only. It does not inspect application
storage, create evidence, resolve obligations, or change workflow state.

## Harness Strategy

`obligationEvidenceCharacterization.js` evaluates each fixture independently
and groups the results into:

- usable authoritative evidence;
- supporting-only evidence;
- unsafe evidence;
- blocked evidence;
- missing provenance;
- human-review triggers.

For the mixed completed-project fixture, only evidence that passes provenance
validation is made available to the Closure readiness evaluator. A display
status, claim, review, message, or unsupported document cannot satisfy an
obligation merely because its fixture ID is referenced.

## Representative Fixture Coverage

| Fixture family | Result | Finding |
| --- | --- | --- |
| Completion Sheet photos and notes | Supporting only | A linked completion artifact is usable support, but it does not resolve an obligation by itself |
| Closeout awaiting customer confirmation | Blocked | Awaiting state is not confirmation evidence |
| Closeout shown as confirmed | Unsafe | Display status is presentation, not authority |
| Self-reported payment received | Unsafe | Professional claim is not payment authority |
| Payment receipt with external reference | Authoritative | Payment-processor provenance and external reference are usable |
| Project Folder document | Supporting only | Document existence is supported; obligation resolution remains separate |
| Conversation follow-up message/card | Unsafe | Current-viewer or message context is not task completion authority |
| Emergency completed with review submitted | Unsafe | Review belongs to Relationship History and is not Closure evidence |
| Permit mentioned without permit owner | Unsafe | A document mention cannot establish permit status |
| Inspection result with external reference | Authoritative | External inspection authority and artifact reference are usable |
| Warranty offered without acknowledgement | Blocked | Handoff acknowledgement is missing |
| Dispute/follow-up requested | Unsafe and blocked | A request is not a domain-owned resolution and lacks acknowledgement |
| Mixed completed-but-not-closed project | Blocked from Closure | Open, disputed, unsupported, and outstanding obligations remain |

## Usable Authoritative Evidence

The representative current shapes can support authoritative evidence only when
the owning or external domain supplies explicit provenance:

- payment receipt from a payment processor with an external transaction
  reference;
- inspection result from an explicit external inspection authority with an
  evidence reference.

These records may be considered by a future obligation adapter. They do not
independently authorize Closure.

## Supporting-Only Evidence

The current shapes can preserve useful supporting artifacts:

- Completion Sheet photos tied to an operational aggregate;
- Project Folder documents tied to the project and document authority.

Supporting evidence proves that an artifact exists. It does not prove customer
acceptance, payment settlement, permit closeout, warranty acknowledgement, or
other domain decisions.

## Unsafe Evidence

The following evidence forms must not feed Closure as resolution authority:

- closeout-card display labels;
- self-reported payment claims;
- Conversation messages or workflow cards attributed from current-viewer
  context;
- emergency review submission;
- permit mentions without permit authority;
- dispute or follow-up requests without domain-owned resolution.

Their information may remain visible for review. Visibility does not increase
provenance trust.

## Blocked Evidence

Evidence remains blocked when it lacks:

- the correct domain authority;
- required artifact references;
- required confirmation or acknowledgement references;
- trustworthy actor provenance;
- trustworthy aggregate provenance;
- occurrence and recording timestamps.

The warranty fixture is specifically blocked because a warranty document
without recipient acknowledgement is not a completed handoff.

## Missing Provenance

The representative fixtures expose three recurring gaps:

1. Awaiting closeout state lacks an explicit customer confirmation reference.
2. Warranty handoff lacks an explicit acknowledgement reference.
3. Dispute/follow-up requests lack an explicit resolution confirmation.

Current display and conversation shapes also commonly lack an approved domain
authority even when actor, date, or aggregate fields are present.

## Mixed Evidence Bundle

The completed-project characterization includes:

- usable completion documentation;
- an authoritative payment receipt;
- an authoritative inspection result;
- display-only customer confirmation;
- a permit mention without permit authority;
- a warranty without acknowledgement;
- a Conversation follow-up claim;
- an unresolved dispute;
- an outstanding follow-up visit.

The result remains `closureReady: false` and `riskLevel: HIGH`.

This demonstrates:

- Completion does not imply Closure.
- Usable supporting evidence does not resolve unrelated obligations.
- Unusable evidence references do not satisfy evidence requirements.
- Display confirmation does not satisfy customer confirmation.
- Open and disputed obligations remain blockers.
- Outstanding items remain blockers.

## Human Review Triggers

Human review is required when:

- an authority is unapproved for the evidence type;
- a participant or current viewer self-reports resolution;
- a presentation source is offered as evidence;
- permit or inspection provenance lacks the proper domain owner;
- review activity is offered as Closure evidence;
- required references are missing;
- an obligation remains open, disputed, unknown, or outstanding.

Human review may decide what to investigate. This harness does not grant review
authority to waive or resolve an obligation.

## Characterization Findings

1. Current Completion Sheet artifacts can support documentation evidence when
   actor, aggregate, timestamps, and attachment references are explicit.
2. Current Project Folder artifacts can support document-delivery evidence,
   but not domain outcomes represented by those documents.
3. External payment and inspection evidence are the strongest representative
   paths because their authorities and external references are explicit.
4. Current closeout display state is not reliable customer-confirmation
   evidence.
5. Conversation activity can reveal follow-up or dispute signals, but it does
   not own their resolution.
6. Emergency review remains Relationship evidence, not Closure evidence.
7. Permit, warranty, follow-up, confirmation, and dispute paths still lack
   authoritative owners or acknowledgements in the representative shapes.

## What Current Data Can Support

- Read-only inventory of completion artifacts and project documents
- Review queues for unsupported claims and missing provenance
- External receipt and inspection evidence when explicit references exist
- Advisory Closure blocker reporting
- A durable distinction between Completion evidence and Closure authority

## What Remains Blocked

- Runtime Closure adoption
- Automatic obligation resolution
- Customer confirmation from display state
- Payment resolution from user-entered text
- Permit resolution from document mentions
- Follow-up completion from Conversation state
- Emergency Closure from review submission
- Warranty handoff without acknowledgement
- Dispute resolution without owning-domain confirmation
- Any rule deciding which obligations are mandatory or who may authorize
  Closure

## Recommended Completion Phase 6

Create an audit-only **Obligation Owner and Adapter Readiness Report**.

Phase 6 should map each obligation category to:

- current candidate sources;
- required future domain owner;
- minimum evidence adapter input;
- actor and aggregate identity requirements;
- timestamp and recording authority;
- readiness for shadow-only reconciliation;
- product decisions that still block adoption.

Phase 6 must not connect the harness to runtime data, create obligation
records, or select mandatory obligation and Closure-authorization policy.
