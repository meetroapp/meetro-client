# Manual Customers Phase 4 Context Contract

## Scope

This phase creates pure, non-persisting contracts and validation tooling for
Manual Customer and Manual Project context.

It does not:

- create production identity;
- choose or modify backend schema;
- write storage;
- change onboarding, workflow, UI, routes, or writers;
- link registered accounts;
- merge customer records;
- connect Manual Customers to Work Center or other runtime consumers.

Manual Customers remain non-runtime and blocked for product adoption.

## Architecture Boundary

The contract preserves the ownership decisions from Phases 1 through 3:

- Customer onboarding owns `manualCustomerId`.
- Project aggregate owns `projectId`.
- Authentication owns professional and linked-user identity.
- Customer/contact policy owns contact and consent evidence.
- Project membership owns customer participation in a project.
- Work Center, Dashboard, Conversation, and Project Folder are consumers.

The utilities shape and validate caller-supplied records only. They never
generate IDs, timestamps, links, consent, or persistence records.

## Manual Customer Context Contract

```js
{
  manualCustomerId,
  customerType,
  displayName,
  owningBusinessId,
  createdByUserId,
  source,
  createdAt,
  contactMethods,
  consent,
  accountLinkStatus,
  linkedUserId,
  metadata
}
```

### Required Fields

| Field | Rule | Authority |
| --- | --- | --- |
| `manualCustomerId` | Required immutable external-customer ID | Customer onboarding |
| `customerType` | Required; `manual` or `external` | Customer onboarding |
| `displayName` | Required for presentation; never identity | Customer onboarding |
| `owningBusinessId` | Required business scope | Business membership/customer onboarding |
| `createdByUserId` | Required authenticated creator | Authentication context |
| `source` | Required entry provenance | Customer onboarding |
| `createdAt` | Required valid timestamp | Customer persistence |
| `accountLinkStatus` | Required account-link state | Account-link authority |

`contactMethods` and `consent` are structurally present. Consent fields become
required when at least one contact method is actionable.

### Identity Separation

The following values are attributes or separate entity IDs and must never
become `manualCustomerId`:

- display name;
- phone or email;
- address;
- schedule ID;
- quote ID;
- Conversation ID;
- request ID;
- project ID;
- linked registered-user ID;
- generic source record ID.

The contract constructor preserves a missing `manualCustomerId` as missing.
It does not infer one from contact or source data.

## Manual Project Context Contract

```js
{
  projectId,
  manualCustomerId,
  professionalUserId,
  participantRole,
  workflowType,
  projectSource,
  createdAt,
  status,
  metadata
}
```

### Required Fields

| Field | Rule | Authority |
| --- | --- | --- |
| `projectId` | Required immutable project ID | Project aggregate |
| `manualCustomerId` | Required participant reference | Customer onboarding/project membership |
| `professionalUserId` | Required professional participant | Authentication context |
| `participantRole` | Required project role | Project membership |
| `workflowType` | Required workflow classification | Workflow/project authority |
| `projectSource` | Required creation provenance | Project aggregate |
| `createdAt` | Required valid timestamp | Project persistence |
| `status` | Required project status supplied by its owner | Project/workflow authority |

`projectId` must be different from `manualCustomerId`.
`professionalUserId` must be different from `projectId`.

A combined customer/project validation also requires the project's
`manualCustomerId` to match the supplied Manual Customer.

## Contract Helpers

`src/utils/manualCustomerContextContract.js` exports:

- `createManualCustomerContext(input)`
- `createManualProjectContext(input)`
- required-field registries;
- supported customer, contact, consent, and account-link values.

Both constructors:

- return a predictable read shape;
- deep-copy arrays and nested records;
- preserve caller-supplied metadata;
- use empty values for absent fields;
- do not mutate input;
- do not generate production values.

## Validation Strategy

`src/utils/manualCustomerContextValidation.js` exports:

- `validateManualCustomerContext(input)`
- `validateManualProjectContext(input)`
- `validateManualCustomerProjectContext(input)`

Each validator returns:

```js
{
  valid,
  riskLevel,
  missingFields,
  warnings,
  blockers,
  provenance,
  duplicateSignals
}
```

### Validity

`valid` means the supplied context satisfies the structural and policy rules
implemented by this phase. It does not mean the record is persisted,
authorized by a backend, or approved for runtime workflow participation.

### Risk

| Risk | Meaning |
| --- | --- |
| `LOW` | No blockers or warnings and all checked provenance is authoritative |
| `MEDIUM` | Structurally valid, but warnings or incomplete provenance remain |
| `HIGH` | One or more blocking identity, consent, membership, link, or structure problems |

### Missing Data

Required missing fields are returned in `missingFields` and as structured
blockers. The validators do not fill them from legacy aliases or nearby
records.

## Contact and Consent Rules

A contact method has:

- `type`;
- `value`;
- optional `actionable` flag;
- optional display or source metadata.

Supported types are:

- `phone`;
- `email`;
- `sms`;
- `in_person`;
- `other`.

Rules:

1. A contact method must be a record with a supported type and value.
2. A method is actionable unless `actionable` is explicitly `false`.
3. Actionable contact requires consent `status`, `recordedAt`, and `source`.
4. The current pure contract accepts actionable use only when status is
   `granted`.
5. Missing, unknown, denied, or revoked consent blocks actionable contact.
6. Invalid consent timestamps block validation.
7. In-person consent remains flagged for product-policy review.
8. Contact values never establish customer identity or account ownership.

This contract measures evidence. It does not send communication or determine
legal sufficiency.

## Duplicate Candidate Rules

Duplicate evaluation is warning/reporting infrastructure only.

Rules:

1. A matching display name may produce a low-confidence signal.
2. A normalized shared phone, SMS number, or email produces a review
   candidate.
3. Every signal includes `autoMerge: false`.
4. A name-only match does not require merge review.
5. A shared contact match requires human review.
6. Candidate records retain their own `manualCustomerId`.
7. No project, history, document, consent, or account state is moved.

Households, offices, shared devices, recycled contact values, and data-entry
errors make contact equality insufficient for identity.

## Account-Link Rules

Supported link states are:

- `unlinked`;
- `invited`;
- `linked`;
- `revoked`.

Rules:

1. `linked` requires an explicit `linkedUserId`.
2. `linkedUserId` is not allowed under another link state.
3. `linkedUserId` must remain different from `manualCustomerId`.
4. Validation does not create an invitation, authenticate a user, or approve a
   link.
5. Linking does not replace or delete Manual Customer identity.
6. Invitation identity, expiry, acceptance, visibility, and revocation remain
   backend/runtime prerequisites.

## Provenance Rules

Completeness and provenance are evaluated separately.

The current harness recognizes these authoritative sources:

| Field | Authoritative provenance |
| --- | --- |
| Customer `manualCustomerId` | `customer-onboarding` |
| Customer `owningBusinessId` | `business-membership`, `customer-onboarding` |
| Customer `createdByUserId` | `authentication-context` |
| Customer `source` | `customer-onboarding` |
| Customer `createdAt` | `customer-persistence` |
| Project `projectId` | `project-aggregate` |
| Project `manualCustomerId` | `customer-onboarding`, `project-membership` |
| Project `professionalUserId` | `authentication-context` |
| Project `createdAt` | `project-persistence` |

Provenance is supplied through `metadata.provenance`.

Quality is:

- `HIGH` when every checked field has approved authority;
- `PARTIAL` when some checked fields are authoritative;
- `LOW` when none are authoritative or required values are missing.

Missing provenance does not cause the utility to invent ownership. It lowers
readiness and produces a warning.

## Test Coverage

The Phase 4 harness verifies:

- valid Manual Customer context;
- valid Manual Project context;
- required Manual Customer identity;
- customer/project ID separation;
- contact values not becoming identity;
- actionable-contact consent evidence;
- name-only duplicate handling;
- shared contact duplicate candidates;
- linked-account consistency;
- project/customer participation;
- conflicting membership;
- deterministic output;
- no mutation;
- no browser storage or global access.

## Remaining Runtime Blockers

| Blocker | Why it remains |
| --- | --- |
| Backend customer creation authority | The pure contract cannot issue or guarantee `manualCustomerId` |
| Backend project creation authority | The pure contract cannot issue or guarantee `projectId` |
| Business authorization | A client record cannot prove business ownership or creator membership |
| Consent policy and retention | The harness validates evidence shape but cannot approve policy or legal sufficiency |
| Invitation/account-link service | No signed invitation, authenticated acceptance, visibility, or revocation authority exists |
| Duplicate review and merge authority | Candidate signals require human review and backend audit |
| Workflow propagation | Scheduling, Quotes, Work, Invoice, Completion, and History do not consume canonical context |
| Communication separation | External recorded contact and authenticated chat lack runtime authority and visibility rules |
| Project document ownership | Existing documents lack consistent project identity and visibility |
| Reporting projections | Dashboard and Work Center must consume owned projections rather than local customer arrays |

## Readiness Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Identity Contract | READY | Pure shape, required fields, separation rules, provenance, and validation exist. Backend identity authority does not. |
| Project Contract | READY | Pure project/membership shape and customer-project matching rules exist. Backend project authority does not. |
| Contact/Consent | PARTIAL | Structure and blocking validation exist; product/legal policy and persistence authority remain unresolved. |
| Duplicate Detection | PARTIAL | Deterministic candidate signals exist; review, relationship, merge, and audit flows do not. |
| Account Linking | PARTIAL | Link-state consistency is validated; invitation and authenticated acceptance are not implemented. |
| Workflow Participation | BLOCKED | Runtime workflow domains do not receive or trust these contexts. |
| Runtime Adoption | BLOCKED | No backend authority, persistence, authorization, or approved consumer integration exists. |

## Phase 5 Recommendation

Phase 5 should be **Representative Context Fixture and Backend Readiness
Audit**.

Safe scope:

1. Adapt sanitized representative manual schedule and external quote shapes
   into contract candidates without promoting source IDs.
2. Measure missing required fields and provenance across those fixtures.
3. Add fixtures for multiple projects per customer, shared contacts,
   conflicting business ownership, linked-account conflict, and missing
   consent.
4. Audit whether the existing backend has customer, project, membership,
   invitation, and consent persistence capable of satisfying the contract.
5. Produce an additive backend prerequisite report.

Phase 5 must not:

- persist contract records;
- create production IDs;
- add frontend adoption;
- auto-link or merge;
- alter storage or writers;
- treat a passing pure validation result as backend authorization.

Stop if backend schema, consent policy, merge authority, invitation security,
or history visibility requires a product decision.

## Decision

The pure Manual Customer and Manual Project contracts are ready for
characterization and backend-readiness analysis.

Manual Customers remain **BLOCKED** for runtime adoption. The contract now
makes the missing authorities measurable; it does not replace them.

