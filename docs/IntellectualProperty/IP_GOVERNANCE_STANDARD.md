# Meetro Community IP Governance Standard

## Purpose

This standard makes IP review a repeatable part of Meetro Community delivery. It preserves chronology and evidence while minimizing disclosure of confidential know-how. Classification remains preliminary until reviewed by qualified counsel.

## Required Review Triggers

Perform an IP review after:

- a major architecture milestone;
- a new intelligence engine;
- a new product name;
- a new logo, symbol, or mascot;
- a new workflow system;
- a new recommendation or ranking method;
- a major investor presentation;
- a public launch;
- a patent-related disclosure; or
- an external contractor contribution.

## Operating Process

```text
Build
  -> Test
  -> Commit
  -> Record in IP Ledger
  -> Classify
  -> Mark public or confidential
  -> Assign follow-up action
```

1. **Build:** Identify contributors, the problem, the solution, and confidential boundaries.
2. **Test:** Preserve objective evidence that the claimed implementation works.
3. **Commit:** Use a focused commit and retain its full hash. Do not call uncommitted work implemented in the ledger.
4. **Record:** Add or update an `MC-IP-XXXX` entry with repository-relative paths.
5. **Classify:** Record preliminary patent, trade-secret, copyright, trademark, or mixed treatment.
6. **Disclosure state:** Record known public disclosures and unknown evidence honestly.
7. **Follow-up:** Assign ownership, legal, confidentiality, registration, prior-art, contributor, or evidence actions.

## Evidence Rules

- Never mix planned concepts with implemented claims.
- Never backdate. Use `Pending repository verification` when evidence is incomplete.
- Always record full commit hashes for implemented milestones.
- Always use repository-relative paths; never local machine paths.
- Record public disclosures with date, audience, medium, and confidentiality status.
- Record every external contributor and preserve signed assignment or license evidence outside broadly accessible documentation.
- Preserve authorship, work-made-for-hire, license, and assignment records.
- Update ownership language after a formal assignment to WM FLEX LABS, LLC is verified.
- Never state “patented,” “patent pending,” “registered,” or “protected” without documentary evidence and approved legal wording.

## Confidentiality Rules

- Do not disclose trade secrets merely to prove that they exist.
- Never include API keys, passwords, tokens, credentials, full private prompts, customer records, payment data, private messages, production database details, undisclosed investor terms, or exploitable security details.
- Describe confidential systems by function and value, not operative algorithms, thresholds, or bypass conditions.
- Store restricted evidence only in an approved access-controlled location with retention and review ownership.
- Review disclosure risk before investor materials, demonstrations, contractor access, publications, talks, or public launches.

## Classification Review

- **Patent:** Confirm inventors, technical contribution, prior art, alternative embodiments, ownership, and public-disclosure timing with counsel.
- **Trade secret:** Confirm business value, secrecy, access limitation, employee and contractor obligations, and actual protection controls.
- **Copyright:** Confirm original authorship, assignments, licenses, publication status, and registration evidence.
- **Trademark:** Confirm mark format, goods or services, first use, specimens, domains, ownership, clearance, and filing status.

## Review Ownership

The technical owner prepares factual evidence. Product leadership confirms commercial context. Security reviews confidentiality boundaries. Legal counsel determines legal classification and filing strategy. No single repository entry substitutes for those reviews.

## Maintenance

Review active and in-development entries at each major milestone and at least quarterly. Superseded entries remain in the ledger to preserve chronology; update their status and link the successor rather than deleting history.
