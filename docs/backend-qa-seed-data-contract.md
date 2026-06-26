# Backend QA Seed Data Contract

## Backend Assessment

The inspected local backend backup is:

```txt
/Users/williammolina/Desktop/meetro-server-backup-2026-05-21/meetro-server
```

It is an Express/PostgreSQL server with:

- normal `/auth/signup`
- normal `/auth/login`
- `users`
- `contractor_profiles`
- `quote_requests`
- `messages`
- reviews and contractor project gallery routes

It does not currently expose canonical Work Center, customer workflow, schedule,
proposal, payment, completion, receipt, closure, or history API routes.

## Seed Approach

Use a staging-only database seed script. Do not add a public seed endpoint.

The seed script creates:

- backend-authenticated QA professional account
- contractor profile
- Sarah homeowner account
- William homeowner account
- Sarah quote request and messages
- William quote request and messages
- `qa_workflow_records` JSON contract table with Sarah/William active workflow
  and closed history records

The `qa_workflow_records` table is intentionally staging-only. It gives backend
and frontend work a concrete contract without pretending that current production
routes already serve workflow-first customer pages.

## Seed Command

Run from the backend repo root so the script can use backend dependencies:

```sh
QA_SEED_ALLOW_STAGING=true \
QA_SEED_TARGET=staging \
QA_SEED_PASSWORD='store-this-outside-the-repo' \
DATABASE_URL='postgres://staging-db-url' \
node /Users/williammolina/meetro-client/scripts/backend/seedStagingQaWorkflow.cjs
```

Optional for local non-SSL Postgres:

```sh
PGSSLMODE=disable
```

## Credentials Placeholder

```txt
Email: qa-mobile-pro@meetro.local
Password: <set in QA_SEED_PASSWORD; do not commit>
Role: handyman
Account type: professional
Business name: QA Pro Services
Business category: handyman
```

## Sarah Record Map

```txt
customerId: qa-sarah-customer
conversationId: qa-sarah-conversation
jobId: qa-sarah-job
quoteId: qa-sarah-quote
scheduleId: qa-sarah-work-schedule
receiptId: qa-sarah-receipt
historyJobId: qa-sarah-history-job
historyConversationId: qa-sarah-history-conversation
historyQuoteId: qa-sarah-history-quote
historyScheduleId: qa-sarah-history-schedule
historyReceiptId: qa-sarah-history-receipt
```

## William Record Map

```txt
customerId: qa-william-customer
conversationId: qa-william-conversation
jobId: qa-william-job
quoteId: qa-william-quote
scheduleId: qa-william-work-schedule
receiptId: qa-william-receipt
historyJobId: qa-william-history-job
historyConversationId: qa-william-history-conversation
historyQuoteId: qa-william-history-quote
historyScheduleId: qa-william-history-schedule
historyReceiptId: qa-william-history-receipt
```

No Sarah IDs are reused by William. Active workflow IDs are not reused by closed
history records.

## Workflow Payload Coverage

Each customer payload includes:

- customer identity
- conversation identity
- active workflow/job
- schedule visit
- evaluation notes
- measurements
- proposal/quote
- payment/deposit
- work appointment
- active work status
- completion notes
- receipt/invoice identity
- closure notes
- timeline/history

## Production Safety

The script refuses to run unless:

- `QA_SEED_ALLOW_STAGING=true`
- `QA_SEED_TARGET=staging`
- `QA_SEED_PASSWORD` is present
- `DATABASE_URL` is present
- `NODE_ENV` is not `production`
- Railway environment variables do not identify production

It does not add an app route, app startup seed, frontend seed trigger, or auth
bypass.

## Frontend Compatibility

Current frontend compatibility through existing backend routes:

- `/auth/login`: supported.
- `/my-contractor-profile`: supported after contractor profile seed.
- `/contractor-quote-requests`: supported for Sarah/William quote rows.
- `/messages/:quoteRequestId`: supported for Sarah/William message rows.

Not yet served by current backend routes:

- workflow-first Work Center customer list from `qa_workflow_records`
- customer workflow page
- schedule/evaluation/proposal/payment/work appointment/completion/receipt/closure
  API reads
- closed history API reads

To complete real TestFlight workflow QA through normal API paths, the backend
needs authenticated read routes that project `qa_workflow_records` into the
same customer/job shapes the frontend Work Center consumes.

## Staging Read Routes

The local backend backup now has staging-only read routes in `index.js`:

```txt
GET /qa/workflows
GET /qa/workflows/:customerId
```

Required environment:

```txt
QA_WORKFLOW_READS_ENABLED=true
QA_SEED_TARGET=staging
NODE_ENV must not be production
RAILWAY_ENVIRONMENT_NAME / RAILWAY_ENVIRONMENT must not be production
```

Both routes require the normal `Authorization: Bearer <token>` header from
`/auth/login`.

Access behavior:

- unauthenticated request: `401`
- route disabled: `404`
- non-professional account: `403`
- professional account with no matching record: `404` on customer route
- QA professional owner: receives only records where
  `qa_workflow_records.owner_user_id` is the authenticated user id

Example `GET /qa/workflows` response shape:

```json
{
  "owner": {
    "id": 1,
    "email": "qa-mobile-pro@meetro.local",
    "role": "handyman",
    "account_type": "professional",
    "business_name": "QA Pro Services",
    "business_category": "handyman"
  },
  "customers": [
    {
      "customerId": "qa-sarah-customer",
      "customerName": "Sarah",
      "activeWorkflow": {
        "ids": {
          "customerId": "qa-sarah-customer",
          "conversationId": "qa-sarah-conversation",
          "jobId": "qa-sarah-job",
          "quoteId": "qa-sarah-quote",
          "scheduleId": "qa-sarah-work-schedule",
          "receiptId": "qa-sarah-receipt"
        },
        "status": "work_scheduled",
        "nextAction": "On The Way"
      },
      "closedHistory": {
        "ids": {
          "customerId": "qa-sarah-customer",
          "conversationId": "qa-sarah-history-conversation",
          "jobId": "qa-sarah-history-job",
          "quoteId": "qa-sarah-history-quote",
          "scheduleId": "qa-sarah-history-schedule",
          "receiptId": "qa-sarah-history-receipt"
        },
        "status": "closed"
      },
      "records": []
    }
  ],
  "records": []
}
```

Example customer-specific calls:

```txt
GET /qa/workflows/qa-sarah-customer
GET /qa/workflows/Sarah
GET /qa/workflows/qa-william-customer
GET /qa/workflows/William
```

The customer route returns one customer only, with `activeWorkflow`,
`closedHistory`, and raw `records`.
