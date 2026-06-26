import test from "node:test";
import assert from "node:assert/strict";

import { createConversationAccess } from "../src/utils/conversationAccessContract.js";
import { validateConversationAccess } from "../src/utils/conversationAccessValidation.js";
import {
  propertyManagerConversationAccess,
  registeredConversationAccess,
  tenantConversationAccess,
  visibilityRules,
} from "./fixtures/relationshipCommunicationFixtures.js";

test("validates registered customer Conversation access", () => {
  const result = validateConversationAccess(registeredConversationAccess());

  assert.equal(result.valid, true);
  assert.equal(result.riskLevel, "LOW");
  assert.deepEqual(result.blockers, []);
});

test("enforces tenant audience scope separation", () => {
  const valid = validateConversationAccess(tenantConversationAccess());
  const invalid = validateConversationAccess(
    tenantConversationAccess({
      visibilityRules: visibilityRules({
        messageVisibility: "propertyManagerVisible",
      }),
    })
  );

  assert.equal(valid.valid, true);
  assert.ok(
    invalid.blockers.some(
      (blocker) => blocker.code === "tenant-audience-visibility-conflict"
    )
  );
});

test("enforces property manager audience scope separation", () => {
  const valid = validateConversationAccess(propertyManagerConversationAccess());
  const invalid = validateConversationAccess(
    propertyManagerConversationAccess({
      visibilityRules: visibilityRules({
        messageVisibility: "tenantVisible",
      }),
    })
  );

  assert.equal(valid.valid, true);
  assert.ok(
    invalid.blockers.some(
      (blocker) =>
        blocker.code === "property-manager-audience-visibility-conflict"
    )
  );
});

test("supports post-completion relationship with a closed Conversation", () => {
  const result = validateConversationAccess(
    registeredConversationAccess({
      accessStatus: "closed",
      allowedActions: [
        "readMessages",
        "viewCompletedProjectSummary",
      ],
    })
  );

  assert.equal(result.valid, true);
  assert.equal(result.projection.accessStatus, "closed");
  assert.equal(result.projection.allowedActions.includes("sendMessage"), false);
});

test("blocked access prevents communication actions", () => {
  const invalid = validateConversationAccess(
    registeredConversationAccess({
      accessStatus: "blocked",
      allowedActions: ["sendMessage"],
    })
  );
  const valid = validateConversationAccess(
    registeredConversationAccess({
      accessStatus: "blocked",
      allowedActions: ["none"],
    })
  );

  assert.ok(
    invalid.blockers.some(
      (blocker) => blocker.code === "access-status-action-conflict"
    )
  );
  assert.equal(valid.valid, true);
});

test("revoked access prevents communication actions", () => {
  const invalid = validateConversationAccess(
    registeredConversationAccess({
      accessStatus: "revoked",
      allowedActions: ["readMessages"],
    })
  );
  const valid = validateConversationAccess(
    registeredConversationAccess({
      accessStatus: "revoked",
      allowedActions: ["none"],
    })
  );

  assert.ok(
    invalid.blockers.some(
      (blocker) => blocker.code === "access-status-action-conflict"
    )
  );
  assert.equal(valid.valid, true);
});

test("project-independent Conversation requires relationship authority", () => {
  const fixture = registeredConversationAccess({
    conversationId: "conversation-direct-1",
    relationshipId: "relationship-direct-1",
    projectId: "",
    audienceScope: "oneToOne",
    allowedActions: ["readMessages", "sendMessage"],
    visibilityRules: visibilityRules({
      workflowEventVisibility: "none",
      documentVisibility: "none",
      historyVisibility: "none",
    }),
  });
  const valid = validateConversationAccess(fixture);
  fixture.provenance.relationship = {
    trust: "INFERRED",
    authority: "legacy-inbox",
  };
  const invalid = validateConversationAccess(fixture);

  assert.equal(valid.valid, true);
  assert.ok(
    invalid.blockers.some(
      (blocker) => blocker.code === "project-independent-access-untrusted"
    )
  );
});

test("missing participant identity blocks access", () => {
  const fixture = registeredConversationAccess();
  fixture.participantRefs[0].identityRef.id = "";

  const result = validateConversationAccess(fixture);

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "invalid-participant-identity"
    )
  );
});

test("access construction and validation are deterministic and non-mutating", () => {
  const fixture = registeredConversationAccess({
    provenance: {
      ...registeredConversationAccess().provenance,
      nested: { value: 1 },
    },
  });
  const original = structuredClone(fixture);
  const first = validateConversationAccess(fixture);
  const second = validateConversationAccess(fixture);
  const projection = createConversationAccess(fixture);

  projection.provenance.nested.value = 2;
  projection.participantRefs[0].identityRef.id = "changed";

  assert.deepEqual(first, second);
  assert.deepEqual(fixture, original);
});

test("access validation does not access browser storage or window", () => {
  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("storage access is prohibited");
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    get() {
      throw new Error("window access is prohibited");
    },
  });

  try {
    assert.doesNotThrow(() =>
      validateConversationAccess(registeredConversationAccess())
    );
  } finally {
    if (storage) Object.defineProperty(globalThis, "localStorage", storage);
    else delete globalThis.localStorage;
    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else delete globalThis.window;
  }
});

