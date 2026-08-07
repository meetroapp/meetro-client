# Compatibility Reference Only

This directory is not a deployable or canonical Meetro Intelligence runtime.
The canonical Gateway, authenticated route, operation registry, orchestrator,
context boundary, provider boundary, and durable idempotency integration live in
the backend repository at `meetro-server/server/intelligence`.

Frontend route registration and controller execution are permanently disabled.
The remaining modules and regression tests are retained temporarily as reference
coverage while future operations migrate to the backend-owned HTTP contract.
They must not be mounted, imported as server authority, or used to invoke a
provider in production.

Removal milestone: after all useful deterministic coverage or pure logic has
been ported to governed backend operations.
