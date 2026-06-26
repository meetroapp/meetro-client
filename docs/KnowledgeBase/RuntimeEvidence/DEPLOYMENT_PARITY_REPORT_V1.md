# Deployment Parity Report V1

## Status

- Read-only governance evidence
- No deployment or runtime changes
- Overall classification: **PARTIAL**

## Evidence Date

June 15, 2026

## Purpose

This report records what is known and unknown about parity between reviewed
backend source, deployed backend behavior, and the inspected production
database.

Unknown facts remain unknown.

## Known Evidence

| Evidence | Value |
| --- | --- |
| Repository path | `/Users/williammolina/meetro-server/meetro-server` |
| Repository remote | `https://github.com/meetroapp/metro-server.git` |
| Reviewed branch | `main` |
| Reviewed commit | `feb94b448e30954d00ff61aedd35f721b0137edd` |
| Backend entry point | `index.js` |
| Production database | Identified and inspected through the collected production evidence |
| Production schema | Table inventory, row counts, constraints, indexes, and known drift inspected |
| Database connectivity | Verified during production evidence collection |

## Unknown Evidence

- authoritative deployed commit;
- whether the deployed source exactly matches the reviewed commit;
- deployment owner;
- release owner;
- rollback owner;
- production database owner;
- deployment procedure;
- release approval procedure;
- rollback procedure;
- build and start procedure used by production;
- migration execution location;
- source-to-deployment parity automation;
- deployment artifact retention.

## Parity Classification Matrix

| Parity category | Classification | Evidence |
| --- | --- | --- |
| Repository remote | `PASS` | Remote is identified |
| Reviewed branch | `PASS` | `main` is identified |
| Reviewed commit | `PASS` | Commit hash is identified |
| Backend entry point | `PASS` | Single-file `index.js` structure is identified |
| Production database connection | `PASS` | Connection and inspection were verified |
| Production table inventory | `PASS` | Existing and missing tables are recorded |
| Production row counts | `PASS` | Counts are recorded for all existing tables |
| Production constraint inventory | `PASS` | Existing and absent constraint categories are recorded |
| Production index inventory | `PASS` | Existing and absent supporting indexes are recorded |
| Authoritative deployed commit | `FAIL` | Not identified |
| Source-to-deployment commit parity | `FAIL` | Cannot be proven without deployed commit evidence |
| Deployment owner | `FAIL` | Not identified |
| Release owner | `FAIL` | Not identified |
| Rollback owner | `FAIL` | Not identified |
| Database owner | `FAIL` | Not identified |
| Deployment procedure | `FAIL` | Not documented in collected evidence |
| Rollback procedure | `FAIL` | Not documented in collected evidence |
| Environment ownership | `FAIL` | Not documented in collected evidence |
| Overall deployment parity | `PARTIAL` | Source and database evidence exist, but deployed revision and ownership remain unknown |

## Source and Production Observations

- Reviewed source contains a `workflow_events` route with request-time table
  creation.
- The inspected production database does not contain `workflow_events`.
- This difference is recorded as an unresolved source/production observation.
- The production database contains seven application tables.
- The reviewed source references those current application domains.
- No authoritative deployed commit is available to prove exact parity.

## Final Classification

**Deployment Parity: PARTIAL**

Repository and production database evidence are available. Exact deployed
source parity and operational ownership are unresolved.
