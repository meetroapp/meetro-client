# Schema Baseline V1

## Status

- Governance evidence artifact
- Descriptive only
- No schema or data changes
- Baseline classification: **PARTIAL**

## Evidence Metadata

| Field | Evidence |
| --- | --- |
| Report date | June 15, 2026 |
| Production inspection date | Not separately preserved in the supplied evidence |
| Repository path | `/Users/williammolina/meetro-server/meetro-server` |
| Repository remote | `https://github.com/meetroapp/metro-server.git` |
| Branch | `main` |
| Reviewed commit | `feb94b448e30954d00ff61aedd35f721b0137edd` |
| Backend entry point | `index.js` |
| Database technology | PostgreSQL through `pg` |
| Database configuration | `DATABASE_URL` with SSL in reviewed source |
| Database connection verification | Production PostgreSQL connection and read-only schema inspection were reported as successful |
| Database name/schema name | Not preserved in the collected evidence |
| Authoritative deployed commit | Unknown |

## Evidence Boundary

This baseline records facts supplied by the Phase 4 production inspection and
facts preserved in prior Meetro backend audits.

The collected evidence confirms:

- production table inventory;
- row counts;
- primary keys;
- the `users.email` unique constraint;
- selected not-null constraints;
- absence of foreign keys;
- index inventory;
- specific known columns and drift.

The collected evidence does not preserve a full catalog export containing
every production column, data type, default, and nullability rule. Such detail
is marked unavailable rather than inferred.

## Production Table Inventory

| Table | Row count | Current observed purpose |
| --- | ---: | --- |
| `users` | 7 | Account, authentication, and profile identity |
| `posts` | 28 | Existing post/intake-like records |
| `quote_requests` | 1 | Quote Request intake records |
| `messages` | 12 | Request-keyed communication and embedded workflow-card data |
| `contractor_profiles` | 3 | Business/professional profile records |
| `contractor_projects` | 3 | Contractor portfolio/presentation records |
| `reviews` | 0 | Review records |

## Production Table Definitions

### `users`

Production-confirmed:

- table exists;
- primary key exists;
- `email` has a unique constraint;
- row count is 7.

Fields observed in reviewed backend source:

- `id`;
- `username`;
- `email`;
- `password_hash`;
- `role`;
- `account_type`;
- `business_name`;
- `business_category`;
- `profile_photo_url`;
- `created_at`.

Full production data types, defaults, and nullability details were not
preserved in the collected evidence.

### `posts`

Production-confirmed:

- table exists;
- primary key exists;
- row count is 28;
- both `mage_url` and `image_url` exist.

The complete production field list, data types, defaults, and nullability
details were not preserved in the collected evidence.

### `quote_requests`

Production-confirmed:

- table exists;
- primary key exists;
- row count is 1.

Fields observed in reviewed backend source:

- `id`;
- `contractor_id`;
- `homeowner_id`;
- `project_title`;
- `project_description`;
- `location`;
- `created_at`.

No foreign keys were found in production. The complete production data types,
defaults, and nullability details were not preserved in the collected
evidence.

### `messages`

Production-confirmed:

- table exists;
- primary key exists;
- row count is 12;
- `workflow_type` exists;
- `workflow_status` exists;
- `workflow_payload` exists.

Fields observed in reviewed backend source:

- `id`;
- `quote_request_id`;
- `sender_id`;
- `receiver_id`;
- `message_text`;
- `image_url`;
- `message_type`;
- `workflow_type`;
- `workflow_status`;
- `workflow_payload`;
- `created_at`.

No foreign keys or supporting indexes were found for the observed relationship
columns. Complete production data types, defaults, and nullability details
were not preserved in the collected evidence.

### `contractor_profiles`

Production-confirmed:

- table exists;
- primary key exists;
- row count is 3.

Fields observed in reviewed backend source:

- `id`;
- `user_id`;
- business/profile fields;
- `created_at`.

The complete business/profile field list, data types, defaults, and
nullability details were not preserved in the collected evidence.

### `contractor_projects`

Production-confirmed:

- table exists;
- primary key exists;
- row count is 3.

Fields observed in reviewed backend source:

- `id`;
- `contractor_id`;
- `title`;
- `description`;
- `image_url`;
- `image_urls`;
- `created_at`.

The table is currently understood as portfolio/presentation storage. Complete
production data types, defaults, and nullability details were not preserved in
the collected evidence.

### `reviews`

Production-confirmed:

- table exists;
- primary key exists;
- row count is 0.

Reviewed source references user/reviewer relationships, but the complete
production field list, data types, defaults, and nullability details were not
preserved in the collected evidence.

## Constraint Baseline

| Constraint category | Production evidence |
| --- | --- |
| Primary keys | Present on production tables |
| Unique constraints | `users.email` unique constraint present |
| Not-null constraints | Present on selected columns |
| Foreign keys | None found |
| Role check constraints | None found |
| Status check constraints | None found |
| Aggregate-related constraints | None found |
| Idempotency constraints | None found |
| Participant-membership constraints | None found |

## Index Baseline

Found:

- primary-key indexes;
- unique index supporting `users.email`.

No supporting indexes were found for:

- `quote_request_id`;
- `sender_id`;
- `receiver_id`;
- `contractor_id`;
- `homeowner_id`;
- `user_id`;
- `reviewer_id`.

## Known Drift

### Post Image Fields

The production `posts` table contains:

- `mage_url`;
- `image_url`.

Both fields are part of the observed baseline.

### Workflow Data in Messages

The production `messages` table contains:

- `workflow_type`;
- `workflow_status`;
- `workflow_payload`.

These fields place workflow-related data inside communication records.

### Runtime Workflow-Event Definition

Reviewed source contains a workflow-events route that attempts:

```sql
CREATE TABLE IF NOT EXISTS workflow_events
```

The source-intended table includes:

- `id`;
- `quote_request_id`;
- `user_id`;
- `workflow_type`;
- `workflow_status`;
- `workflow_payload`;
- `event_label`;
- `created_at`.

The `workflow_events` table does not exist in the inspected production table
inventory.

## Missing Authority Domains

No production tables were found for:

- `service_requests`;
- `operational_aggregates`;
- `aggregate_references`;
- `workflow_events`;
- `schedules`;
- `completions`;
- `closures`;
- `history`;
- `relationships`;
- `recurring_services`;
- `idempotency`;
- `audit_events`.

## Missing Governance Foundations

The observed backend has:

- no migration framework;
- no backend test framework or test suite.

## Baseline Classification

**PARTIAL**

The table inventory, row counts, constraint summary, index summary, and known
drift are preserved. A complete versioned catalog export with every column,
data type, default, nullability rule, sequence, trigger, view, and
row-security policy is not present in the collected evidence.
