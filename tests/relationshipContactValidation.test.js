import test from "node:test";
import assert from "node:assert/strict";

import { createRelationshipContact } from "../src/utils/relationshipContactContract.js";
import { validateRelationshipContact } from "../src/utils/relationshipContactValidation.js";
import {
  businessProfessionalFixture,
  externalContactFixture,
  legacyInboxFixture,
  manualCustomerFixture,
  projectParticipantFixture,
  propertyManagerFixture,
  registeredCustomerFixture,
  repeatCustomerFixture,
  teamMemberFixture,
  tenantFixture,
  vendorFixture,
} from "./fixtures/relationshipCommunicationFixtures.js";

test("validates a registered customer contact", () => {
  const result = validateRelationshipContact(registeredCustomerFixture());

  assert.equal(result.valid, true);
  assert.equal(result.riskLevel, "LOW");
  assert.deepEqual(result.blockers, []);
});

test("allows a Manual Customer external-only capability", () => {
  const result = validateRelationshipContact(manualCustomerFixture());

  assert.equal(result.valid, true);
  assert.deepEqual(result.projection.communicationCapabilities, [
    "externalEmail",
  ]);
});

test("blocks Manual Customer authenticated chat without link and membership", () => {
  const result = validateRelationshipContact(
    manualCustomerFixture({
      communicationCapabilities: ["authenticatedChat"],
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "manual-customer-chat-unavailable"
    )
  );
});

test("supports a repeat customer with multiple separate projects", () => {
  const result = validateRelationshipContact(repeatCustomerFixture());

  assert.equal(result.valid, true);
  assert.deepEqual(
    result.projection.sharedProjectRefs.map((project) => project.projectId),
    ["project-completed-1", "project-active-2"]
  );
});

test("legacy inbox row remains unresolved with none capability", () => {
  const result = validateRelationshipContact(legacyInboxFixture());

  assert.equal(result.valid, true);
  assert.equal(result.riskLevel, "MEDIUM");
  assert.equal(result.projection.identityRef.identityType, "unknownLegacyIdentity");
  assert.deepEqual(result.projection.communicationCapabilities, ["none"]);
  assert.ok(
    result.warnings.some(
      (warning) => warning.code === "legacy-inbox-row-not-contact"
    )
  );
});

test("missing authoritative identity blocks actionable capabilities", () => {
  const fixture = registeredCustomerFixture();
  fixture.provenance.identity = {
    trust: "FALLBACK",
    authority: "legacy-inbox",
  };

  const result = validateRelationshipContact(fixture);

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "actionable-capability-untrusted"
    )
  );
});

test("project-independent relationship requires explicit authority", () => {
  const fixture = businessProfessionalFixture();
  fixture.provenance.relationship = {
    trust: "INFERRED",
    authority: "display-value",
  };

  const result = validateRelationshipContact(fixture);

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(
      (blocker) =>
        blocker.code === "project-independent-relationship-untrusted"
    )
  );
});

test("all representative contact types have valid sanitized fixtures", () => {
  const fixtures = [
    registeredCustomerFixture(),
    manualCustomerFixture(),
    businessProfessionalFixture(),
    tenantFixture(),
    propertyManagerFixture(),
    projectParticipantFixture(),
    repeatCustomerFixture(),
    externalContactFixture(),
    teamMemberFixture(),
    vendorFixture(),
  ];

  fixtures.forEach((fixture) => {
    assert.equal(
      validateRelationshipContact(fixture).valid,
      true,
      fixture.contactType
    );
  });
});

test("contact construction and validation are deterministic and non-mutating", () => {
  const fixture = repeatCustomerFixture({
    provenance: {
      ...repeatCustomerFixture().provenance,
      nested: { value: 1 },
    },
  });
  const original = structuredClone(fixture);
  const first = validateRelationshipContact(fixture);
  const second = validateRelationshipContact(fixture);
  const projection = createRelationshipContact(fixture);

  projection.provenance.nested.value = 2;
  projection.sharedProjectRefs[0].projectId = "changed";

  assert.deepEqual(first, second);
  assert.deepEqual(fixture, original);
});

test("contact validation does not access browser storage or window", () => {
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
      validateRelationshipContact(registeredCustomerFixture())
    );
  } finally {
    if (storage) Object.defineProperty(globalThis, "localStorage", storage);
    else delete globalThis.localStorage;
    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else delete globalThis.window;
  }
});

