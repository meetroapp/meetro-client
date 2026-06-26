import test from "node:test";
import assert from "node:assert/strict";

import { resolveWorkflowIdentity } from "../src/utils/workflowIdentityResolver.js";
import {
  validateWorkflowIdentityProvenance,
  WORKFLOW_IDENTITY_MIGRATION_RISK,
  WORKFLOW_IDENTITY_TRUST,
} from "../src/utils/workflowIdentityProvenance.js";

function authoritativeInput(overrides = {}) {
  const event = {
    recordedAt: "2026-06-13T12:00:00.000Z",
    identityProvenance: {
      recordedAt: {
        authority: "event-persistence",
        value: "2026-06-13T12:00:00.000Z",
      },
    },
    ...(overrides.event || {}),
  };
  const project = {
    projectId: "project-1",
    identityProvenance: {
      projectId: {
        authority: "project-aggregate",
        value: "project-1",
      },
    },
    ...(overrides.project || {}),
  };
  const conversation = {
    conversationId: "conversation-1",
    identityProvenance: {
      conversationId: {
        authority: "conversation-authority",
        value: "conversation-1",
      },
    },
    ...(overrides.conversation || {}),
  };
  const actorContext = {
    actor: "business-1",
    actorRole: "business",
    identityProvenance: {
      actor: {
        authority: "authentication-context",
        value: "business-1",
      },
      actorRole: {
        authority: "authorization-context",
        value: "business",
      },
    },
    ...(overrides.actorContext || {}),
  };

  return {
    event,
    project,
    conversation,
    actorContext,
    resolvedIdentity: resolveWorkflowIdentity({
      event,
      project,
      conversation,
      actorContext,
    }),
  };
}

test("authoritative identity returns LOW risk", () => {
  const result = validateWorkflowIdentityProvenance(authoritativeInput());

  assert.equal(result.trusted, true);
  assert.equal(result.migrationRisk, WORKFLOW_IDENTITY_MIGRATION_RISK.LOW);
  assert.deepEqual(result.fieldTrust, {
    projectId: WORKFLOW_IDENTITY_TRUST.AUTHORITATIVE,
    conversationId: WORKFLOW_IDENTITY_TRUST.AUTHORITATIVE,
    actor: WORKFLOW_IDENTITY_TRUST.AUTHORITATIVE,
    actorRole: WORKFLOW_IDENTITY_TRUST.AUTHORITATIVE,
    recordedAt: WORKFLOW_IDENTITY_TRUST.AUTHORITATIVE,
  });
  assert.deepEqual(result.blockers, []);
});

test("inferred projectId blocks migration", () => {
  const input = authoritativeInput();
  input.project.identityProvenance.projectId = {
    authority: "request-id",
    value: "project-1",
  };

  const result = validateWorkflowIdentityProvenance(input);

  assert.equal(result.trusted, false);
  assert.equal(result.fieldTrust.projectId, WORKFLOW_IDENTITY_TRUST.INFERRED);
  assert.equal(result.migrationRisk, WORKFLOW_IDENTITY_MIGRATION_RISK.MEDIUM);
});

test("fallback actor blocks migration", () => {
  const input = authoritativeInput();
  input.actorContext.identityProvenance.actor = {
    authority: "local-storage",
    value: "business-1",
  };

  const result = validateWorkflowIdentityProvenance(input);

  assert.equal(result.trusted, false);
  assert.equal(result.fieldTrust.actor, WORKFLOW_IDENTITY_TRUST.FALLBACK);
  assert.equal(result.migrationRisk, WORKFLOW_IDENTITY_MIGRATION_RISK.HIGH);
});

test("missing conversationId blocks migration", () => {
  const input = authoritativeInput();
  input.conversation = {};
  input.resolvedIdentity = resolveWorkflowIdentity({
    event: input.event,
    project: input.project,
    conversation: input.conversation,
    actorContext: input.actorContext,
  });

  const result = validateWorkflowIdentityProvenance(input);

  assert.equal(result.fieldTrust.conversationId, WORKFLOW_IDENTITY_TRUST.MISSING);
  assert.equal(result.trusted, false);
  assert.equal(result.migrationRisk, WORKFLOW_IDENTITY_MIGRATION_RISK.HIGH);
});

test("conflicting recordedAt blocks migration", () => {
  const input = authoritativeInput();
  input.event.identityProvenance.recordedAt.value =
    "2026-06-13T12:01:00.000Z";

  const result = validateWorkflowIdentityProvenance(input);

  assert.equal(result.fieldTrust.recordedAt, WORKFLOW_IDENTITY_TRUST.CONFLICTING);
  assert.equal(result.trusted, false);
  assert.equal(result.migrationRisk, WORKFLOW_IDENTITY_MIGRATION_RISK.HIGH);
});

test("complete but untrusted identity still blocks migration", () => {
  const event = {
    projectId: "project-1",
    conversationId: "conversation-1",
    actor: "business-1",
    actorRole: "business",
    recordedAt: "2026-06-13T12:00:00.000Z",
  };
  const resolvedIdentity = resolveWorkflowIdentity({ event });

  assert.equal(resolvedIdentity.completenessScore, 100);

  const result = validateWorkflowIdentityProvenance({
    resolvedIdentity,
    event,
  });

  assert.equal(result.trusted, false);
  assert.deepEqual(result.fieldTrust, {
    projectId: WORKFLOW_IDENTITY_TRUST.INFERRED,
    conversationId: WORKFLOW_IDENTITY_TRUST.INFERRED,
    actor: WORKFLOW_IDENTITY_TRUST.INFERRED,
    actorRole: WORKFLOW_IDENTITY_TRUST.INFERRED,
    recordedAt: WORKFLOW_IDENTITY_TRUST.INFERRED,
  });
  assert.equal(result.migrationRisk, WORKFLOW_IDENTITY_MIGRATION_RISK.MEDIUM);
  assert.equal(result.blockers.length, 5);
});

test("resolver conflicts remain provenance conflicts", () => {
  const input = authoritativeInput({
    event: {
      projectId: "project-event",
      recordedAt: "2026-06-13T12:00:00.000Z",
      identityProvenance: {
        projectId: {
          authority: "canonical-event",
          value: "project-event",
        },
        recordedAt: {
          authority: "event-persistence",
          value: "2026-06-13T12:00:00.000Z",
        },
      },
    },
  });

  const result = validateWorkflowIdentityProvenance(input);

  assert.equal(result.fieldTrust.projectId, WORKFLOW_IDENTITY_TRUST.CONFLICTING);
  assert.equal(result.migrationRisk, WORKFLOW_IDENTITY_MIGRATION_RISK.HIGH);
});

test("does not mutate input and produces deterministic output", () => {
  const input = authoritativeInput();
  const original = structuredClone(input);

  const first = validateWorkflowIdentityProvenance(input);
  const second = validateWorkflowIdentityProvenance(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, original);
});

test("does not access localStorage or window", () => {
  const input = authoritativeInput();
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage"
  );
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("localStorage access is not allowed");
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    get() {
      throw new Error("window access is not allowed");
    },
  });

  try {
    assert.doesNotThrow(() =>
      validateWorkflowIdentityProvenance(input)
    );
  } finally {
    if (localStorageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", localStorageDescriptor);
    } else {
      delete globalThis.localStorage;
    }

    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      delete globalThis.window;
    }
  }
});

