# TestFlight QA Account Setup

## Recommendation

Use a backend-accessible test professional account in a staging API environment.

Preferred order:

1. Staging backend with seeded QA account.
2. Production backend test account hidden from normal discovery, only if staging is not ready.
3. Internal-only seeded TestFlight build flag as a last resort.

Do not ship visible QA seed controls in App Store review or public production builds.

## Client Environment

The client reads the API host from `VITE_API_URL` at build time.

Examples:

```sh
VITE_API_URL=https://staging-api.example.com npm run build
```

If `VITE_API_URL` is not set, the app uses the current production API:

```txt
https://athletic-rebirth-production-0a28.up.railway.app
```

For TestFlight staging QA, build the iOS bundle with `VITE_API_URL` pointing at the staging backend, then sync the Capacitor iOS app from `dist`.

## QA Account

Create one professional account:

```txt
Email: qa-mobile-pro@meetro.local
Role: professional / contractor
Business category: handyman
Business name: QA Pro Services
```

Use a real backend-authenticated password stored outside the repo.

## Required Seed Data

Seed two independent active jobs:

Sarah:

- Active workflow
- Conversation
- Photos metadata
- Evaluation notes
- Measurements
- Proposal
- Payment / deposit
- Work appointment
- Completion notes
- Receipt
- Closure notes
- Timeline
- Closed history

William:

- Active workflow
- Conversation
- Photos metadata
- Evaluation notes
- Measurements
- Proposal
- Payment / deposit
- Work appointment
- Completion notes
- Receipt
- Closure notes
- Timeline
- Closed history

Use separate ids for each customer's active workflow and closed history records. Do not reuse active conversation, schedule, quote, or request ids for history fixtures.

## Production Safety

- The local QA seed button is guarded by `import.meta.env.DEV`.
- Production builds must not set any public QA seed flag.
- TestFlight review builds should use normal auth only.
- Staging TestFlight builds should point to staging API through `VITE_API_URL`.
- Do not expose the QA account in normal customer search, lead discovery, or public demo surfaces.

## Real Device QA Checklist

- Login succeeds on iPhone.
- Sarah opens with Sarah header, Sarah conversation, and Sarah-only records.
- William opens with William header, William conversation, and William-only records.
- Switching customers does not leak identity or records.
- Primary workflow action remains visible.
- AI button does not cover workflow actions.
- BottomNav does not cover workflow actions.
- Keyboard does not hide save/send buttons.
- Completion moves the job into that customer's history.
- Closed history is read-only.
