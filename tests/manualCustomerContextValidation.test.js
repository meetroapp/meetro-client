import test from "node:test";
import assert from "node:assert/strict";

import {
  createManualCustomerContext,
  createManualProjectContext,
} from "../src/utils/manualCustomerContextContract.js";
import {
  validateManualCustomerContext,
  validateManualCustomerProjectContext,
  validateManualProjectContext,
} from "../src/utils/manualCustomerContextValidation.js";

function validCustomer(overrides = {}) {
  return {
    manualCustomerId: "manual-customer-1",
    customerType: "manual",
    displayName: "Customer One",
    owningBusinessId: "business-1",
    createdByUserId: "professional-1",
    source: "customer-onboarding",
    createdAt: "2026-06-14T12:00:00.000Z",
    contactMethods: [
      {
        type: "email",
        value: "customer@example.com",
        actionable: true,
      },
    ],
    consent: {
      status: "granted",
      recordedAt: "2026-06-14T12:00:00.000Z",
      source: "professional-recorded",
    },
    accountLinkStatus: "unlinked",
    linkedUserId: "",
    metadata: {
      provenance: {
        manualCustomerId: { authority: "customer-onboarding" },
        owningBusinessId: { authority: "business-membership" },
        createdByUserId: { authority: "authentication-context" },
        source: { authority: "customer-onboarding" },
        createdAt: { authority: "customer-persistence" },
      },
    },
    ...overrides,
  };
}

function validProject(overrides = {}) {
  return {
    projectId: "project-1",
    manualCustomerId: "manual-customer-1",
    professionalUserId: "professional-1",
    participantRole: "customer",
    workflowType: "standard",
    projectSource: "manual-customer-onboarding",
    createdAt: "2026-06-14T12:01:00.000Z",
    status: "information",
    metadata: {
      provenance: {
        projectId: { authority: "project-aggregate" },
        manualCustomerId: { authority: "project-membership" },
        professionalUserId: { authority: "authentication-context" },
        createdAt: { authority: "project-persistence" },
      },
    },
    ...overrides,
  };
}

test("validates a complete Manual Customer context", () => {
  const result = validateManualCustomerContext(validCustomer());

  assert.equal(result.valid, true);
  assert.equal(result.riskLevel, "LOW");
  assert.deepEqual(result.missingFields, []);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.provenance.quality, "HIGH");
});

test("validates a complete Manual Project context", () => {
  const result = validateManualProjectContext(validProject());

  assert.equal(result.valid, true);
  assert.equal(result.riskLevel, "LOW");
  assert.deepEqual(result.blockers, []);
  assert.equal(result.provenance.quality, "HIGH");
});

test("missing manualCustomerId blocks validation", () => {
  const customer = validCustomer({ manualCustomerId: "" });
  const result = validateManualCustomerContext(customer);

  assert.equal(result.valid, false);
  assert.ok(result.missingFields.includes("customer.manualCustomerId"));
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "missing-manualCustomerId"
    )
  );
});

test("projectId cannot equal manualCustomerId", () => {
  const result = validateManualProjectContext(
    validProject({
      projectId: "same-id",
      manualCustomerId: "same-id",
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "customer-project-identity-conflict"
    )
  );
});

test("phone and email values never become customer identity", () => {
  const customer = validCustomer({
    manualCustomerId: "",
    contactMethods: [
      { type: "phone", value: "(212) 555-0198", actionable: true },
      { type: "email", value: "identity@example.com", actionable: true },
    ],
  });
  const shaped = createManualCustomerContext(customer);
  const result = validateManualCustomerContext(customer);

  assert.equal(shaped.manualCustomerId, "");
  assert.equal(result.valid, false);
  assert.ok(result.missingFields.includes("customer.manualCustomerId"));
});

test("missing consent blocks actionable contact", () => {
  const result = validateManualCustomerContext(
    validCustomer({ consent: {} })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "missing-consent-status"
    )
  );
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "missing-consent-recordedAt"
    )
  );
});

test("duplicate names create no automatic merge", () => {
  const result = validateManualCustomerContext({
    customer: validCustomer(),
    candidateCustomers: [
      validCustomer({
        manualCustomerId: "manual-customer-2",
        contactMethods: [
          {
            type: "email",
            value: "different@example.com",
            actionable: false,
          },
        ],
      }),
    ],
  });

  assert.equal(result.valid, true);
  assert.equal(result.duplicateSignals.length, 1);
  assert.deepEqual(result.duplicateSignals[0].matches, [
    "display-name-match",
  ]);
  assert.equal(result.duplicateSignals[0].autoMerge, false);
  assert.equal(result.duplicateSignals[0].reviewRequired, false);
});

test("shared phone or email creates a review candidate only", () => {
  const result = validateManualCustomerContext({
    customer: validCustomer(),
    candidateCustomers: [
      validCustomer({
        manualCustomerId: "manual-customer-2",
        displayName: "Another Customer",
        contactMethods: [
          {
            type: "email",
            value: "CUSTOMER@example.com",
            actionable: false,
          },
        ],
      }),
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.duplicateSignals[0], {
    candidateManualCustomerId: "manual-customer-2",
    matches: ["email-match"],
    autoMerge: false,
    reviewRequired: true,
  });
});

test("linked account requires explicit linkedUserId and linked status", () => {
  const missingUser = validateManualCustomerContext(
    validCustomer({ accountLinkStatus: "linked", linkedUserId: "" })
  );
  const wrongStatus = validateManualCustomerContext(
    validCustomer({
      accountLinkStatus: "invited",
      linkedUserId: "user-1",
    })
  );

  assert.ok(
    missingUser.blockers.some(
      (blocker) => blocker.code === "linked-user-id-required"
    )
  );
  assert.ok(
    wrongStatus.blockers.some(
      (blocker) => blocker.code === "linked-user-status-conflict"
    )
  );
});

test("project participation requires both projectId and manualCustomerId", () => {
  const result = validateManualCustomerProjectContext({
    customer: validCustomer(),
    project: validProject({ projectId: "", manualCustomerId: "" }),
  });

  assert.equal(result.valid, false);
  assert.ok(result.missingFields.includes("project.projectId"));
  assert.ok(result.missingFields.includes("project.manualCustomerId"));
});

test("conflicting project membership blocks combined validation", () => {
  const result = validateManualCustomerProjectContext({
    customer: validCustomer(),
    project: validProject({ manualCustomerId: "manual-customer-2" }),
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "project-customer-membership-conflict"
    )
  );
});

test("constructors and validators are deterministic and do not mutate input", () => {
  const input = {
    customer: validCustomer({
      metadata: {
        provenance: {
          manualCustomerId: { authority: "customer-onboarding" },
          owningBusinessId: { authority: "business-membership" },
          createdByUserId: { authority: "authentication-context" },
          source: { authority: "customer-onboarding" },
          createdAt: { authority: "customer-persistence" },
        },
        nested: { value: 1 },
      },
    }),
    project: validProject(),
    candidateCustomers: [
      validCustomer({ manualCustomerId: "manual-customer-2" }),
    ],
  };
  const original = structuredClone(input);
  const first = validateManualCustomerProjectContext(input);
  const second = validateManualCustomerProjectContext(input);
  const customerContext = createManualCustomerContext(input.customer);
  const projectContext = createManualProjectContext(input.project);

  customerContext.metadata.nested.value = 2;
  projectContext.metadata.provenance.projectId.authority = "changed";

  assert.deepEqual(first, second);
  assert.deepEqual(input, original);
});

test("validation does not access localStorage or window", () => {
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
      validateManualCustomerProjectContext({
        customer: validCustomer(),
        project: validProject(),
      })
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

