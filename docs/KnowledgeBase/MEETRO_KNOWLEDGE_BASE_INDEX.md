# Meetro Knowledge Base Index

**Status:** Knowledge Base navigation  
**Runtime effect:** None

## Foundation

| Document | Purpose |
| --- | --- |
| [MEETRO_CORE_DOMAIN_MODEL.md](./MEETRO_CORE_DOMAIN_MODEL.md) | Authoritative vision, domains, ownership boundaries, lifecycle, and relationship model |
| [MEETRO_REQUEST_CLASSIFICATION_PRINCIPLE.md](./MEETRO_REQUEST_CLASSIFICATION_PRINCIPLE.md) | William-approved classification and information-sufficiency principles separating intent, Service Request, classification, and operational path |
| [LEAD_ELIGIBILITY_MATCHING_CONTRACT.md](./LEAD_ELIGIBILITY_MATCHING_CONTRACT.md) | Service-domain, specialty, service-area, and lead eligibility safety contract for frontend/local matching and future backend lead distribution |
| [MEETRO_UNIVERSAL_WORKFLOW_ENGINE.md](./MEETRO_UNIVERSAL_WORKFLOW_ENGINE.md) | Universal workflow stages, conditional paths, classification rules, and information-sufficiency boundaries |
| [CANONICAL_WORKFLOW_EVENT_ENVELOPE.md](./CANONICAL_WORKFLOW_EVENT_ENVELOPE.md) | Canonical workflow event shape and validation policy |
| [WORKFLOW_IDENTITY_OWNERSHIP_SPEC.md](./WORKFLOW_IDENTITY_OWNERSHIP_SPEC.md) | Ownership and provenance of workflow identity |
| [MEETRO_COMMUNITY_TERMS_OF_USE.md](./MEETRO_COMMUNITY_TERMS_OF_USE.md) | Meetro Community user-facing Terms of Use |
| [MEETRO_COMMUNITY_PRIVACY_POLICY.md](./MEETRO_COMMUNITY_PRIVACY_POLICY.md) | Meetro Community user-facing Privacy Policy |
| [MEETRO_COMMUNITY_GUIDELINES.md](./MEETRO_COMMUNITY_GUIDELINES.md) | Meetro Community behavior and relationship guidelines |
| [MEETRO_COMMUNITY_EMERGENCY_DISCLAIMER.md](./MEETRO_COMMUNITY_EMERGENCY_DISCLAIMER.md) | Meetro Community emergency workflow disclaimer |
| [MEETRO_COMMUNITY_AI_ASSISTANCE_DISCLAIMER.md](./MEETRO_COMMUNITY_AI_ASSISTANCE_DISCLAIMER.md) | Meetro Community AI assistance disclaimer |

## Current Universal Model

```text
Intent
  -> Service Request
  -> Information Gathering
  -> Classification
  -> Operational Path
  -> Work
  -> Completion
  -> Closure
  -> History
  -> Relationship
```

This model supersedes any interpretation that every Request is automatically a
Project. Existing implementation and audit documents may describe legacy
Project-first behavior; those descriptions are evidence of current reality,
not authority to override this principle.

## Interpretation Rules

1. Knowledge Base principles and approved specifications override legacy
   implementation behavior.
2. Categories guide information gathering; they do not determine workflow.
3. Information determines classification.
4. Category provides context but does not determine classification.
5. Information gathering comes before commitment and classification
   confidence.
6. Information sufficiency determines whether Unknown, human review,
   Appointment, Consultation, or an operational classification is responsible.
7. Meetro must not force classification when evidence is insufficient.
8. Classification determines the supported operational path only after
   approved authority confirms it.
9. Project is one possible classification, not the universal request type.
10. Completion, Closure, History, and Relationship remain distinct.
11. Audit and phase documents record findings and migration readiness. They do
   not silently change product authority.

## Lead Phase 4 Boundary

Lead Phase 4 must remain audit-only. It may identify where classification can
eventually be read, displayed, or recommended, but it must not adopt
classification into UI, workflow, routing, storage, or operational authority
before William reviews the model.
