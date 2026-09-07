# External Customer Relationship and History Contract

**Status:** Canonical Meetro product requirement
**Runtime effect:** Documentation only
**Authority:** Relationship, Customer Information, Commercial Workflow, History
**Terminology:** External Customer supersedes “Manual Customer” for the current product model where a Business owns the customer relationship.

## Purpose

Meetro must support customers who belong to a Business relationship even when they did not originate as Meetro marketplace customers.

An External Customer is a real Business-owned customer relationship. It is not a fabricated Meetro marketplace customer, a fake registered User, a fabricated Job Request participant, a fabricated selected-Professional relationship, or a substitute for marketplace request/selection authority.

The durable relationship must survive individual Jobs and preserve the complete commercial and work history of the customer relationship.

## Canonical External Customer Authority

External Customer authority comes from:

```text
business_contacts.id
+
active CUSTOMER role
+
business_customer_relationships.id
```

`business_contacts.id` identifies the Business-owned contact. A Contact alone does not establish workflow or marketplace authority.

The active `CUSTOMER` role establishes that the Contact is recognized by the Business in a customer capacity. Name, phone, email, Quote, Schedule, or Job title must never substitute for this role.

`business_customer_relationships.id` is the durable Business-to-customer relationship identity and the continuity owner across multiple Jobs.

The relationship is not replaced when a Job completes, a Quote is revised, payment is completed, a Final Invoice is issued, a later Job begins, or the customer later creates or links a Meetro account.

## Relationship Is Not Job Identity

One External Customer relationship may contain many Jobs:

```text
External Customer Relationship
  -> Job A
  -> Job B
  -> Job C
  -> future repeat Jobs
```

Every new piece of work requires a distinct Job identity. Repeat work reuses the durable customer relationship and creates a new Job; it must not overwrite or reopen an old Job merely because the customer is the same.

## Business-Origin Job Rule

A Business may create work for an External Customer without a Meetro marketplace Job Request.

A legitimate Business-origin Job may therefore have:

```text
job_request_id = NULL
```

This is valid and must not cause the Job to disappear from Customer Information, History, Quotes, Scheduling, Work Center, Invoice, or other authorized relationship projections.

The absence of `job_request_id` must never be repaired by inventing a request.

The system must not fabricate a marketplace Job Request, request participant authority, Professional-response authority, customer-selection authority, or marketplace Conversation authority.

Business-origin authority must remain business-origin authority.

## Customer Information History

Customer Information must ultimately aggregate the full lifecycle of the durable customer relationship:

```text
Customer Relationship
  -> Job
  -> Photos / Notes
  -> Quote
  -> Quote revisions
  -> Approval evidence
  -> Deposit obligation
  -> Deposit Request
  -> Payment evidence
  -> Scheduling
  -> Work start
  -> Work progress
  -> Work completion
  -> Final Invoice
  -> Final payment
  -> Closure
  -> Follow-up
  -> Repeat Job
```

Later Meetro account-link events belong to the same durable customer relationship history when authoritative linking exists.

Customer Information is a relationship-history projection. It may aggregate authorized evidence from Contacts, Customer Relationships, Jobs, Quotes/revisions, approval evidence, Deposit Requests, Payments, Visits/Schedule history, Work, Completion, Invoices, Closure, follow-up, and later account-link events. It does not become the authority owner of those domains.

## Commercial States Remain Separate

The lifecycle must not collapse commercial states:

```text
Quote approval
!= payment
!= scheduling
!= work start
!= completion
!= invoice
!= final payment
!= closure
```

An approved Quote does not prove payment. A satisfied deposit does not prove work was scheduled. A scheduled Visit does not prove work started. Work completion does not prove a Final Invoice was issued. A Final Invoice does not prove final payment. Final payment does not by itself prove Closure.

Customer Information may display these stages together as history, but the underlying authorities remain independent.

## Quote, Approval, Deposit, and Payment Continuity

All Quotes created for a Job must remain associated with that Job and the durable External Customer relationship.

Quote revisions must preserve prior versions, customer-visible terms, delivery evidence, and decision evidence.

External Customer approval must preserve its actual governed evidence source. External approval evidence must not be rewritten as Meetro marketplace customer-authenticated approval.

Deposit obligations, Deposit Requests, and payment evidence are distinct. Customer Information should preserve required deposit terms, Deposit Request issuance, recorded payment evidence, amount/status where authorized, and the relationship between deposit satisfaction and scheduling eligibility.

Payment evidence must never be inferred merely from Quote approval or Schedule state.

## Scheduling and Visit History

Scheduling belongs to the exact Job and canonical Visit identity.

Relationship history may show proposal, customer-requested change, reschedule, confirmation, cancellation, Visit start, and Visit completion.

Rescheduling must preserve the same Visit identity when it is a revision of the same Visit. Historical schedule versions must not be replaced by the latest displayed time.

## Work, Completion, Final Invoice, and Closure

Work start, progress, completion, and closeout evidence remain Job-scoped.

Completion must not erase Schedule history, Quote history, payment evidence, photos, notes, customer approval provenance, Final Invoice state, or open follow-up obligations.

The completed Job remains part of the durable customer relationship.

Customer Information must distinguish:

```text
Work completed
-> Final Invoice
-> Final payment
-> Closure
```

where those stages apply.

Closure concludes one Job. It does not terminate the customer relationship.

## Follow-Up and Repeat Business

Post-completion follow-up belongs to the same customer relationship and should remain traceable to the Job that caused it.

Warranty communication, service follow-up, customer questions, and later relationship activity must not require fabrication of a new marketplace Request.

Repeat business creates:

```text
same business_customer_relationships.id
+
new Job
```

It must not create a duplicate External Customer merely because a new Job, Quote, Schedule, or Invoice exists.

Customers must not be merged solely by name, email, phone, address, or Job title. Authoritative relationship lookup controls reuse.

## Later Meetro Account Linking

An External Customer may later become or link to a registered Meetro account.

Account linking must preserve the historical External Customer relationship. It must not erase the original Business-owned relationship, rewrite historical Business-origin Jobs as marketplace Requests, fabricate past authenticated participation, rewrite external approval evidence as Meetro approval, or duplicate completed Jobs.

The account link is a later relationship event, not a historical rewrite.

## Identity and History Safety

The following values must never be promoted into customer or relationship identity:

- customer name;
- phone number;
- email address;
- physical address;
- Job title;
- Quote ID;
- Schedule ID;
- Visit ID;
- Invoice ID;
- Conversation ID;
- generic UI record ID.

History entries must retain their real domain identity and provenance.

## Historical Manual Customer Documents

Earlier `MANUAL_CUSTOMERS_PHASE_*` documents are retained as historical audits. They describe architecture and backend readiness at the time they were written and must not override this canonical External Customer product contract.

Where an older audit says Manual Customer runtime authority is unavailable or blocked, that statement remains historical evidence for that phase rather than a permanent prohibition against the current Business-owned External Customer model.

This contract does not claim that every Customer Information history stage is already implemented. Missing runtime aggregation must remain truthful and must be implemented through the governing domain rather than fabricated in the presentation layer.

## Non-Negotiable Invariants

1. External Customers are Business-owned relationships.
2. External Customers are not fake marketplace Users.
3. Durable customer identity is separate from Job identity.
4. One customer relationship may own many Jobs.
5. Repeat work creates a new Job under the same relationship.
6. Business-origin Jobs may validly have `job_request_id = NULL`.
7. Missing marketplace identity must never be fabricated.
8. Quote approval, payment, scheduling, work, Invoice, payment completion, and Closure remain separate states.
9. Customer Information aggregates history but does not own every underlying domain.
10. Later Meetro account linking preserves prior External Customer history.
11. Historical evidence must not be rewritten to imply authority that did not exist when the event occurred.
12. Relationship continuity survives Job completion and enables legitimate repeat business.
