# Work Center Focus Audit

Date: June 29, 2026

## Purpose

This audit evaluates Work Center through the Focus Workspace philosophy.

It asks whether Work Center currently protects the professional's attention, where it already directs attention correctly, and where unnecessary competition exists.

This is an observation and architectural review only. It does not change UI, routing, lifecycle, projections, storage, or runtime behavior.

## Audit Lens

Work Center should not behave like a collection of equal destinations.

It should answer:

What deserves my attention right now?

The interface should not organize screens. It should organize attention.

## Current Jobs

Question: Does this deserve primary attention?

Current Jobs should usually be the strongest Work Center focus because it represents accepted responsibility. These are not possibilities or reports. They are promises already in motion.

Evaluation:

- It deserves primary attention when a job is accepted, scheduled, in evaluation, waiting on proposal, active, awaiting completion, or needing closure review.
- It preserves current work when it keeps the professional inside the job rather than sending them to unrelated tools.
- It reduces thinking when the card clearly communicates the next meaningful action, such as Confirm Visit, Record Evaluation, Prepare Proposal, Continue Work, Record Completion, or Review Closure.

Attention risk:

If Current Jobs appears beside equally weighted opportunities, reports, revenue, and history, active responsibility can lose visual priority. Work Center should make current responsibility feel like the anchor.

## Schedule

Question: Does it help today's work?

Schedule supports Current Jobs when it clarifies where and when the professional needs to be. It should serve the workday, not compete with the work itself.

Evaluation:

- Schedule helps today's work when it highlights today's visits, pending confirmations, arrivals, travel, and time-sensitive appointments.
- Schedule can compete with Current Jobs if it appears as a separate destination rather than a time view of the same accepted work.
- Schedule should usually be considered today's attention, not broad active attention.

Attention model:

Schedule is strongest in morning planning, travel, upcoming visit, and arrival moments. Outside those moments, it should remain available without overpowering current responsibility.

## Opportunities

Question: Should Opportunities compete with active work?

Opportunities are not current responsibility yet. They are possible future work. They should not outrank accepted jobs, scheduled visits, emergencies, or active completion obligations.

Evaluation:

- Opportunities become primary when there is no immediate active work requiring attention, or when a lead is urgent and available.
- Opportunities should remain secondary when accepted work, scheduled visits, active jobs, completion, closure, or emergency states exist.
- Opportunities should feel like business intake, not an active job queue.

Attention risk:

If Opportunities visually compete with active work, the professional may be pulled toward future work while current promises need attention.

## Quotes

Question: Should Quotes exist independently?

Quotes should emerge from Evaluation and project lifecycle truth. They should not feel like disconnected financial objects.

Evaluation:

- Quotes are meaningful when they represent a lifecycle step after findings, evaluation notes, or customer-requested scope.
- Quotes weaken lifecycle integrity when they appear as independent workspace objects without visible relationship to the evaluation or request that produced them.
- Quotes should be today's attention when a proposal needs preparation, review, sending, or customer follow-up.

Attention model:

Quotes should stay tied to the job. The user should feel: this proposal belongs to this work, this customer, and this evaluation.

## Revenue

Question: Is Revenue a workspace?

Revenue is not usually active work. It is a business review.

Evaluation:

- Revenue helps professionals understand business performance.
- Revenue does not usually tell the professional what job needs attention right now.
- Revenue belongs to reflective attention, unless a specific invoice, payment, or receipt requires immediate action.

Attention model:

Revenue should not compete with Current Jobs. It belongs in reference attention or business review, while invoice/payment actions should surface through the job lifecycle when they require action.

## Job History

Question: Should History compete with current work?

History should not compete with current work. It preserves memory and proof.

Evaluation:

- Job History supports understanding, relationship memory, receipts, completion proof, and future reference.
- It should remain accessible but should not visually compete with active jobs.
- Closed jobs belong in history; they should not reappear as active work.

Attention model:

History is reference attention. It becomes important when reviewing past work, proving completion, checking receipts, or preparing relationship context.

## Attention Categories

Every Work Center workspace should map to an attention category.

### Immediate Attention

Needs action now.

Examples:

- Current Job
- Emergency
- Arrival
- Completion
- Active Work
- Resolution Needed
- Closure Review when final obligations remain

Immediate Attention should be visually and structurally strongest.

### Today's Attention

Needs action today.

Examples:

- Schedule
- Follow-up
- Opportunities when no immediate work is waiting
- Quotes needing preparation, review, or customer follow-up
- Payment or invoice tasks due today

Today's Attention should support the workday without drowning current responsibility.

### Reference Attention

Supports understanding.

Examples:

- Revenue
- Job History
- Reports
- Completed work records
- Portfolio proof references

Reference Attention should be easy to reach, but it should not behave like urgent work.

## Empty State Review

Empty states should reduce uncertainty. They should not merely say that nothing exists.

Each empty state should answer:

- What does this mean?
- What happens next?
- Is there anything I should do?

Current Jobs empty state should reassure the professional that no accepted work needs attention right now, and may point toward Opportunities or Schedule if relevant.

Schedule empty state should clarify that no visits are planned for the selected time and, if appropriate, guide the professional toward scheduling from a job or request.

Opportunities empty state should say that no new opportunities are available yet, without backfilling stale or demo leads.

Quotes empty state should explain that proposals appear after evaluation or project scope exists.

Revenue empty state should frame revenue as business review, not missing work.

Job History empty state should explain that completed and closed work will appear there after the lifecycle is fulfilled.

## Dynamic Attention Through The Day

Work Center should evolve by emphasis, not by forcing navigation.

Morning:

- Today's Schedule and Current Jobs become important.
- The professional needs to understand where to go and what is waiting.

Travel:

- The next appointment, address, arrival state, and customer communication become the strongest focus.

Arrival:

- The job and arrival workflow become immediate attention.
- Schedule becomes context, not the main task.

Work:

- Active Work, evaluation, documentation, photos, notes, and scope become the focus.

Completion:

- Completion notes, photos, customer-visible summary, invoice readiness, and closure requirements become prominent.

Invoice:

- Payment, receipt, and customer documentation become the active lifecycle focus when owed.

History:

- Once obligations are satisfied, the work moves into reference memory.
- It remains accessible without competing with active work.

The goal is not to move the professional between pages. The goal is to let attention naturally change while the work remains continuous.

## Relationship To Focus Workspace

Work Center should become a strong candidate for the first Focus Workspace implementation.

Reason:

- Work Center already represents professional responsibility.
- It already contains the domains that compete for attention: jobs, schedule, opportunities, quotes, revenue, and history.
- It has the clearest need for an explicit attention hierarchy.

Future implementation should not begin by redesigning Work Center. It should begin by making the current work the anchor and letting focus change around it.

Work Center can become the place where Phase 5 proves the principle:

The current work remains. The tools come to the work.

## Preservation Boundary

This audit does not modify:

- UI
- routing
- lifecycle
- projections
- storage
- current behavior

It establishes the attention model future implementation should follow.

## Success Criteria

Work Center has a documented attention hierarchy.

Future implementation decisions should follow this audit rather than individual UI preferences.

The professional should not feel that Work Center is a dashboard of equal boxes.

They should feel:

I know what deserves my attention.

## Closing Principle

The interface should not organize screens.

It should organize attention.

The current work deserves the professional's attention before everything else.

The Lantern stays lit.
