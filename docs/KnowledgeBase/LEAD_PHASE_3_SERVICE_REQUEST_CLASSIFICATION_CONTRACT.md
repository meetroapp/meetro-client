# Lead Phase 3 Service Request Classification Contract

**Status:** Pure advisory contract  
**Scope:** Read-only Service Request classification decision support  
**Runtime effect:** None  
**Authority:** `MEETRO_REQUEST_CLASSIFICATION_PRINCIPLE.md`

## Why Classification Exists

Meetro receives customer intent before it knows the correct operational path.
A Service Request is the neutral record of that intent.

```text
Intent
  -> Service Request
  -> Information Gathering
  -> Classification
  -> Operational Path
```

Classification prevents Project and quote behavior from being applied to every
request. It helps distinguish complex work from simple tasks, recurring
services, emergencies, consultations, transportation, and managed-property
maintenance.

This phase creates decision support only. It does not approve, create, or
start an operational workflow.

## Utility

`src/utils/serviceRequestClassification.js` exports:

- `SERVICE_REQUEST_CLASSIFICATIONS`;
- `SERVICE_REQUEST_CLASSIFICATION_CONFIDENCE`;
- `classifyServiceRequest(serviceRequest)`.

The utility is:

- pure;
- deterministic;
- non-mutating;
- storage-independent;
- UI-independent;
- advisory only.

## Service Request Input

The classifier reads a neutral Service Request shape:

```js
{
  serviceRequestId,
  category,
  intent: {
    outcome
  },
  information: {
    location,
    urgency: {
      level,
      immediateSafetyRisk,
      lifeSafetyRisk,
      activeDamage,
      reportedAt
    },
    scope: {
      defined,
      complexity,
      singleTask,
      multiPhase,
      structuralChange,
      requiresPermits
    },
    recurrence: {
      isRecurring,
      frequency
    },
    transportation: {
      pickupLocation,
      destination,
      scheduledAt,
      passengerCount
    },
    property: {
      isManagedProperty,
      reportedByRole,
      assetOrUnit,
      maintenanceResponsibility
    },
    consultation: {
      requested,
      assessmentRequired,
      reason
    },
    condition: {
      immediateHazard,
      hazardousMaterials,
      biohazard,
      habitabilityRisk
    }
  }
}
```

The input is a read contract, not an approved persistence schema.

## Output

```js
{
  classificationCandidates: [
    {
      classification,
      confidence,
      reasons
    }
  ],
  confidence,
  missingInformation,
  informationWarnings,
  requiresClassificationReview
}
```

Multiple candidates are valid. `Unknown` is valid when structured evidence is
insufficient.

Confidence describes evidence strength. It does not grant workflow authority.

## Classification Definitions

| Classification | Meaning |
| --- | --- |
| `Project` | Complex, multi-phase, structural, permit-dependent, or otherwise coordinated work requiring a Project aggregate |
| `WorkOrder` | Defined, one-time, low-complexity task suitable for direct operational execution after proper authorization |
| `RecurringService` | Repeating service governed by frequency, term, or an ongoing service relationship |
| `Emergency` | Time-sensitive condition involving explicit safety, life-safety, immediate hazard, or urgent active-damage evidence |
| `Consultation` | Advice, feasibility review, assessment, or information-gathering engagement before another operational decision |
| `TransportationService` | Time-and-route-based movement service with pickup, destination, and schedule evidence |
| `MaintenanceRequest` | Managed-property or asset issue requiring responsibility, unit/asset, authorization, and maintenance context |
| `Unknown` | Insufficient or unsupported evidence for a responsible classification recommendation |

## Classification Rules

### Category Is Context Only

Category values are never used to select a candidate.

A category such as `cleaning`, `plumbing`, `propertyManagement`, or
`privateTransportation` generates context only. Structured information must
support the classification.

### Information-Driven Evidence

| Candidate | Supporting evidence |
| --- | --- |
| Project | High complexity, multiple phases, structural change, or permit dependency |
| Work Order | Defined, one-time, low-complexity task |
| Recurring Service | Explicit recurrence flag or frequency |
| Emergency | Explicit emergency/critical urgency, safety risk, immediate hazard, or urgent active damage |
| Consultation | Explicit consultation request or assessment requirement |
| Transportation Service | Pickup, destination, and scheduled time |
| Maintenance Request | Managed property, tenant/resident report, asset/unit, or maintenance responsibility |

### Review Rules

Human classification review is required when:

- Emergency evidence exists;
- hazard, biohazard, or habitability evidence exists;
- evidence conflicts;
- multiple equally supported candidates exist;
- the result is `Unknown`;
- important information is missing and confidence is not high.

Emergency review does not mean delay. It means the operational authority must
confirm or handle the high-risk path rather than treating an advisory result
as self-authorizing.

## Fixture Findings

| Fixture | Candidate result | Review |
| --- | --- | --- |
| Airport ride | Transportation Service | No, when itinerary evidence is sufficient |
| Weekly cleaning | Recurring Service | No, when recurrence is explicit |
| Hoarder cleanup | Project and Consultation | Yes, due to hazard and uncertain scope |
| Kitchen remodel | Project | No, when scope and complexity are explicit |
| Tenant leak | Maintenance Request and Emergency | Yes, when active damage is urgent |
| Emergency plumbing issue | Emergency | Always |
| Consultation request | Consultation | No, when explicitly requested and explained |
| Insufficient-information request | Unknown | Always |

The test suite also characterizes a defined low-complexity task as a Work
Order.

## Decision Support, Not Workflow Authority

The classifier cannot:

- create a Project;
- create a Work Order;
- create a quote;
- schedule an appointment;
- dispatch an Emergency;
- create a recurring agreement;
- change a request status;
- select a professional;
- grant access;
- write storage;
- navigate the application.

Its output means:

> These operational paths are supported by the currently available
> information, with these gaps and warnings.

It does not mean:

> Meetro has authorized or created this workflow.

Classification authority, review authority, persistence authority, and
operational aggregate creation remain unresolved product/backend decisions.

## Requests That Still Require Human Review

The current contract deliberately requires review for:

- every Emergency candidate;
- tenant/property issues with urgent active damage;
- hazardous or biohazard cleanup;
- conflicting urgency and safety facts;
- equally supported multiple paths;
- requests with insufficient structured information;
- future workflow types not represented by the approved registry.

## Remaining Blockers Before Lead Phase 4

1. William must review and approve the candidate evidence rules.
2. Classification authority and reclassification authority are undefined.
3. Information-sufficiency requirements need industry-independent policy plus
   path-specific evidence rules.
4. Emergency review and dispatch timing policy require approval.
5. Work Order authorization and identity do not exist.
6. Recurring Service agreement and occurrence identity do not exist.
7. Maintenance responsibility and property/tenant authority are not canonical.
8. Service Request identity is not canonical across current sources.
9. No approved request-to-operational-aggregate linking contract exists.
10. Future workflow types need a registry/approval policy.
11. Advisory language has not been reviewed for runtime display or added
    through `language.js`.
12. Legacy posts and quote requests have not been characterized through this
    contract.

## Why Lead Phase 4 Must Not Adopt Classification Yet

William must review this model before any UI, writer, route, storage, or
workflow adoption.

The rules in this phase are architecture hypotheses expressed as a pure,
testable contract. They demonstrate that information-driven classification is
possible without forcing every request into a Project. They do not settle:

- who may classify;
- when classification becomes authoritative;
- which missing facts block action;
- which paths may be automated;
- how a selected path is persisted;
- how existing legacy requests are migrated or displayed.

Lead Phase 4 should therefore be a **Classification Model Review and Legacy
Characterization Audit**, not runtime adoption.

It should evaluate representative real source shapes, measure candidate and
Unknown rates, identify false-positive risks, and present policy decisions for
William. No operational path should be created automatically.

