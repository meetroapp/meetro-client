# Backend Source Inventory

**Phase:** Backend Discovery Phase 1  
**Status:** Inventory only  
**Inventory date:** June 13, 2026  
**Runtime changes:** None

## Executive Summary

The authoritative public backend source exists in a separate GitHub
repository:

```text
https://github.com/meetroapp/metro-server
```

The repository name is `metro-server`, with one `e`, even though its
`package.json` name is `meetro-server`.

The backend is a small JavaScript CommonJS application using Express and
PostgreSQL. All routes and SQL persistence logic are currently held in one
root `index.js` file.

Message routes and message persistence are available for architecture review.
There is no independent Conversation route or Conversation persistence model.
No database schema files, migrations, OpenAPI specification, Swagger
specification, deployment configuration, or backend tests are present.

The frontend points to a Railway deployment:

```text
https://athletic-rebirth-production-0a28.up.railway.app
```

The backend repository metadata lists a Vercel homepage:

```text
https://metro-server-omega.vercel.app
```

Both deployments return `{"status":"ok"}` from `/health` and Express-style
404 responses from undocumented metadata endpoints. The repository contains
no deployment manifest that proves which commit or environment owns either
deployment.

## Inventory Method

The inventory used:

- `meetro-client` Git metadata and source references
- the public GitHub user repository listing for `meetroapp`
- the public `meetroapp/metro-server` repository metadata and file tree
- read-only inspection of public backend source through the GitHub API
- read-only health and API-documentation endpoint checks

No separate repository was cloned. No local folder outside `meetro-client`
was accessed.

## Artifact Inventory

| Artifact | Found | Location | Classification |
| --- | --- | --- | --- |
| Backend source | Yes | `https://github.com/meetroapp/metro-server` | **AVAILABLE** |
| Backend entry point | Yes | `metro-server/index.js` | **AVAILABLE** |
| Message routes | Yes | `POST /messages` and `GET /messages/:quoteRequestId` in `index.js` | **AVAILABLE** |
| Message persistence | Yes | Inline PostgreSQL `INSERT` and `SELECT` queries in `index.js` | **AVAILABLE** |
| Conversation routes | No | No route found | **MISSING** |
| Conversation persistence | No | No Conversation query or model found | **MISSING** |
| Database schema | No standalone schema | Table/column expectations are visible only through inline SQL | **PARTIAL** |
| Migrations | No | No migration files or migration framework | **MISSING** |
| Auth implementation | Yes | JWT middleware and auth routes in `index.js` | **AVAILABLE** |
| API documentation | No | No OpenAPI, Swagger, README API contract, or live docs endpoint | **MISSING** |
| Deployment config | No | No Railway, Vercel, Docker, or Procfile configuration | **MISSING** |
| Backend tests | No | `npm test` is an error placeholder | **MISSING** |

## 1. Backend Repository Location

### Repository

```text
Owner: meetroapp
Repository: metro-server
URL: https://github.com/meetroapp/metro-server
Visibility: Public
Default branch: main
```

Public repository metadata observed:

- created May 4, 2026
- latest inspected push June 8, 2026
- primary language JavaScript
- four tracked files:
  - `.gitignore`
  - `index.js`
  - `package.json`
  - `package-lock.json`

The `meetroapp` public account exposes two repositories:

- `meetro-client`
- `metro-server`

No additional public Meetro backend, API, schema, or infrastructure repository
was found.

**Classification: AVAILABLE**

## 2. Backend Language and Framework

### Runtime

- JavaScript
- Node.js
- CommonJS modules

### Framework and libraries

The backend declares:

- Express `5.2.1`
- PostgreSQL client `pg`
- JSON Web Token authentication with `jsonwebtoken`
- password hashing with `bcrypt`
- CORS
- dotenv

The server starts directly from:

```text
index.js
```

There is no route/controller/service/model directory structure. Routes,
authentication, SQL, and server startup are colocated.

**Classification: AVAILABLE**

## 3. Database Technology

The backend uses PostgreSQL through:

```js
const { Pool } = require("pg");
```

The connection is configured through:

```text
DATABASE_URL
```

with SSL enabled.

The source references these tables:

- `users`
- `posts`
- `contractor_profiles`
- `quote_requests`
- `messages`
- `workflow_events`
- `reviews`
- `contractor_projects`

This confirms PostgreSQL use and expected table names. It does not provide a
complete schema.

**Classification: AVAILABLE for technology; PARTIAL for schema evidence**

## 4. Message Route Implementation Status

The backend implements:

```text
POST /messages
GET /messages/:quoteRequestId
```

Both routes use JWT authentication middleware.

### Message creation

`POST /messages` inserts:

- `quote_request_id`
- authenticated `sender_id`
- `receiver_id`
- `message_text`
- `image_url`
- `message_type`
- `workflow_type`
- `workflow_status`
- `workflow_payload`

The route returns the inserted PostgreSQL row through `RETURNING *`.

### Message fetch

`GET /messages/:quoteRequestId` selects messages by:

```text
messages.quote_request_id
```

It joins `users` to return sender email and orders by `messages.created_at`.

### Inventory limitations

The implementation does not expose:

- a canonical Conversation route
- a canonical Project relation
- idempotency
- participant authorization checks beyond authentication
- a canonical `MESSAGE_CREATED` event response

These are architecture findings from existing source, not proposed changes.

**Classification: AVAILABLE**

## 5. Conversation Route Implementation Status

No Conversation route, model, table reference, or persistence operation was
found.

Messages are grouped by `quote_request_id`. The backend source does not expose
a persisted Conversation relationship or participant registry.

Frontend-local Conversation identifiers therefore do not have a matching
backend authority in the discovered source.

**Classification: MISSING**

## 6. Schema Availability

No standalone schema file was found.

There is no:

- SQL schema dump
- ORM schema
- table definition directory
- database documentation
- entity relationship diagram

Column expectations can be reconstructed partially from inline SQL statements.
The `workflow_events` routes also execute `CREATE TABLE IF NOT EXISTS` at
request time, providing a partial definition for that table only.

The definitions for `messages`, `quote_requests`, `users`, and other tables
are not present.

**Classification: PARTIAL**

## 7. Migration Availability

No migration files or migration tooling were found.

The dependency list does not include Prisma, Sequelize, Knex, TypeORM, or
another migration framework.

The request-time `CREATE TABLE IF NOT EXISTS workflow_events` statement is
runtime table creation, not a versioned migration history.

**Classification: MISSING**

## 8. Authentication Implementation

Authentication is implemented in `index.js`.

Available evidence:

- JWT creation
- Bearer-token middleware
- token verification
- authenticated principal assigned to `req.user`
- signup, login, current-user, and profile-photo routes
- password hashing with bcrypt

Message creation uses:

```text
req.user.id
```

as `sender_id`, so sender identity is backend-derived for that route.

Role data is embedded in the JWT at token creation, but message records do not
persist or return a dedicated message-time role snapshot.

**Classification: AVAILABLE**

## 9. Deployment Ownership

### Railway

The current frontend API base URL is:

```text
https://athletic-rebirth-production-0a28.up.railway.app
```

Observed evidence:

- `/health` returns `{"status":"ok"}`
- response headers identify Railway
- response behavior identifies Express

### Vercel

The GitHub repository homepage is:

```text
https://metro-server-omega.vercel.app
```

Observed evidence:

- `/health` returns `{"status":"ok"}`
- Express-style responses match the repository's implementation style

### Ownership limitation

The public GitHub owner is `meetroapp`, but no deployment configuration or
repository integration metadata proves:

- who owns the Railway service
- who owns the Vercel project
- which deployment is authoritative
- which Git commit is deployed
- whether both deployments use the same database
- how environment variables and secrets are managed

**Classification: PARTIAL**

## 10. API Documentation

No API specification exists in the backend repository.

These checked endpoints return 404 on both known deployments:

- `/openapi.json`
- `/swagger.json`
- `/api-docs`

The backend repository has no README.

Current API knowledge must be derived from `index.js` and frontend calls.

**Classification: MISSING**

## Missing Artifacts

The following evidence remains unavailable:

- complete PostgreSQL schema
- versioned migrations
- Conversation data model
- Conversation routes
- canonical Project data model
- Project-to-Conversation relationship
- message participant authorization rules
- idempotency storage and policy
- canonical workflow event schema
- OpenAPI or other API specification
- backend tests
- deployment manifests
- environment inventory
- database ownership information
- Railway project-to-repository linkage
- Vercel project-to-repository linkage
- production commit/version evidence

## Classification Summary

| Area | Classification |
| --- | --- |
| Authoritative public backend source | **AVAILABLE** |
| Language/framework | **AVAILABLE** |
| Database technology | **AVAILABLE** |
| Message routes and persistence logic | **AVAILABLE** |
| Auth implementation | **AVAILABLE** |
| Database schema | **PARTIAL** |
| Deployment ownership | **PARTIAL** |
| Conversation routes and persistence | **MISSING** |
| Versioned migrations | **MISSING** |
| API documentation | **MISSING** |
| Deployment configuration | **MISSING** |
| Backend tests | **MISSING** |

## Inventory Conclusion

The backend source is available for architecture review at
`meetroapp/metro-server`.

It is sufficient to audit current message and authentication implementation.
It is not sufficient to verify complete database structure, migration
history, Conversation authority, deployment ownership, or production-source
alignment because those artifacts are absent.
