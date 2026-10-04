import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorkingQuoteSafetyAcknowledgement,
  createWorkingQuoteCommandKeys,
  fetchWorkingQuoteReviewIdentity,
  importWorkingQuoteAsCanonicalDraft,
  issueCanonicalWorkingQuote,
  issueAndSendWorkingQuote,
  normalizeWorkingDocumentCanonicalQuote,
  normalizeWorkingQuoteReviewIdentity,
  workingQuoteDeliveryPresentation,
  workingQuoteSendReadiness,
} from "../src/utils/workingQuoteCanonicalIssue.js";

const IDS = Object.freeze({
  document: "11111111-1111-4111-8111-111111111111",
  job: "22222222-2222-4222-8222-222222222222",
  quote: "33333333-3333-4333-8333-333333333333",
  participant: "44444444-4444-4444-8444-444444444444",
});

const document = Object.freeze({
  id: IDS.document,
  documentType: "QUOTE",
  status: "WORKING_DRAFT",
  version: 3,
  jobId: IDS.job,
  documentNumber: "Q-0000009",
});

const keys = Object.freeze({
  bridge: "working-quote-bridge-55555555-5555-4555-8555-555555555555",
  issue: "working-quote-issue-66666666-6666-4666-8666-666666666666",
  delivery: "working-quote-delivery-77777777-7777-4777-8777-777777777777",
});

const quoteSafety = Object.freeze({
  ready: true,
  blockingErrors: Object.freeze([]),
  warnings: Object.freeze([]),
});

function canonicalQuote({
  status = "DRAFT",
  currentVersion = 1,
  documentVersion = document.version,
  decisionState = null,
} = {}) {
  const issuedAt = status === "ISSUED" ? "2026-08-25T21:00:00.000Z" : null;
  return {
    id: IDS.quote,
    jobId: IDS.job,
    requestId: 18,
    relationshipId: 340,
    issuerParticipantId: IDS.participant,
    status,
    issuedAt,
    currency: "USD",
    currentVersion,
    totalMinor: 92000,
    decisionState,
    decisionVersion: decisionState ? currentVersion : null,
    decidedAt: decisionState ? "2026-08-26T14:00:00.000Z" : null,
    documentNumber: "Q-0000009",
    sourceBusinessDocument: {
      documentId: IDS.document,
      documentVersion,
    },
    versions: [{
      version: currentVersion,
      status,
      totalMinor: 92000,
      integrityHash: (status === "ISSUED" ? "b" : "a").repeat(64),
    }],
  };
}

function externalCanonicalQuote(options = {}) {
  return {
    ...canonicalQuote(options),
    requestId: null,
    relationshipId: null,
  };
}

function externalReviewIdentity(overrides = {}) {
  return reviewIdentity({
    requestId: null,
    relationshipId: null,
    ...overrides,
  });
}

function delivery() {
  return Object.freeze({
    source: "PROFESSIONAL_QUOTE_DELIVERY",
    quoteId: IDS.quote,
    jobId: IDS.job,
    expectedIssuedVersion: 2,
    snapshot: {
      quoteId: IDS.quote,
      jobId: IDS.job,
      totalMinor: 92000,
      currency: "USD",
    },
    canSendInMeetro: true,
    conversationId: 341,
    existingDelivery: null,
  });
}

function deliveryEvidence() {
  return Object.freeze({
    messageId: 71,
    conversationId: 341,
    quoteId: IDS.quote,
    jobId: IDS.job,
    sentAt: "2026-08-25T21:01:00.000Z",
    replayed: false,
  });
}

function reviewIdentity(overrides = {}) {
  return {
    documentId: IDS.document,
    documentVersion: 3,
    jobId: IDS.job,
    requestId: 18,
    relationshipId: 340,
    customerName: "Meetro Stage B 20260705172957",
    projectTitle: "Slice 004 Recommendation staging certification",
    quoteSafety,
    ...overrides,
  };
}

test("presentation distinguishes working, issued-not-delivered, and delivered truth", () => {
  const working = workingQuoteDeliveryPresentation();
  assert.equal(working.state, "WORKING_DRAFT");
  assert.equal(working.actionLabel, "Send Quote to Customer");

  const issuedQuote = canonicalQuote({ status: "ISSUED", currentVersion: 2 });
  const pending = workingQuoteDeliveryPresentation({ issuedQuote });
  assert.equal(pending.state, "ISSUED_NOT_DELIVERED");
  assert.equal(pending.delivered, false);
  assert.equal(pending.badgeLabel, "ISSUED · DELIVERY PENDING");
  assert.equal(pending.statusText, "Quote issued · Not delivered to customer.");
  assert.equal(pending.actionLabel, "Send in Meetro");
  assert.equal(pending.actionDisabled, false);

  const externalPending = workingQuoteDeliveryPresentation({
    canonicalQuote: externalCanonicalQuote({
      status: "ISSUED",
      currentVersion: 2,
    }),
    issuedQuote: externalCanonicalQuote({
      status: "ISSUED",
      currentVersion: 2,
    }),
  });
  assert.equal(
    externalPending.state,
    "EXTERNAL_ISSUED_DELIVERY_REQUIRED"
  );
  assert.equal(
    externalPending.badgeLabel,
    "ISSUED · DELIVERY REQUIRED"
  );
  assert.equal(
    externalPending.statusText,
    "Quote issued · Choose Email or Share with device to deliver it."
  );
  assert.equal(externalPending.actionLabel, "Deliver Quote");
  assert.equal(externalPending.delivered, false);

  const delivered = workingQuoteDeliveryPresentation({
    issuedQuote,
    deliveryEvidence: deliveryEvidence(),
  });
  assert.equal(delivered.state, "DELIVERED");
  assert.equal(delivered.delivered, true);
  assert.equal(delivered.badgeLabel, "SENT");
  assert.equal(delivered.actionLabel, "Send Again");
  assert.equal(delivered.actionDisabled, false);

  const approved = workingQuoteDeliveryPresentation({
    issuedQuote: canonicalQuote({ status: "ISSUED", currentVersion: 2, decisionState: "APPROVED" }),
    deliveryEvidence: deliveryEvidence(),
  });
  assert.equal(approved.state, "APPROVED");
  assert.equal(approved.actionLabel, "Send Copy Again");
  assert.equal(approved.actionDisabled, false);

  const declined = workingQuoteDeliveryPresentation({
    issuedQuote: canonicalQuote({ status: "ISSUED", currentVersion: 2, decisionState: "DECLINED" }),
    deliveryEvidence: deliveryEvidence(),
  });
  assert.equal(declined.state, "DECLINED");
  assert.equal(declined.actionLabel, "Send Copy Again");
  assert.equal(declined.actionDisabled, false);

  const mismatched = workingQuoteDeliveryPresentation({
    issuedQuote,
    deliveryEvidence: { ...deliveryEvidence(), quoteId: crypto.randomUUID() },
  });
  assert.equal(mismatched.state, "ISSUED_NOT_DELIVERED");
});

test("business-document Quote identity accepts exact external null request and relationship without fabricating marketplace authority", () => {
  const normalizedQuote = normalizeWorkingDocumentCanonicalQuote(
    externalCanonicalQuote(),
    {
      documentId: IDS.document,
      documentVersion: document.version,
      jobId: IDS.job,
    }
  );

  assert.ok(normalizedQuote);
  assert.equal(normalizedQuote.requestId, null);
  assert.equal(normalizedQuote.relationshipId, null);

  const normalizedReview = normalizeWorkingQuoteReviewIdentity(
    externalReviewIdentity(),
    {
      documentId: IDS.document,
      documentVersion: document.version,
      jobId: IDS.job,
    }
  );

  assert.ok(normalizedReview);
  assert.equal(normalizedReview.requestId, null);
  assert.equal(normalizedReview.relationshipId, null);
});

test("working Quote identity rejects partial-null marketplace and external hybrids", () => {
  assert.equal(
    normalizeWorkingDocumentCanonicalQuote(
      {
        ...externalCanonicalQuote(),
        requestId: 18,
      },
      {
        documentId: IDS.document,
        documentVersion: document.version,
        jobId: IDS.job,
      }
    ),
    null
  );

  assert.equal(
    normalizeWorkingDocumentCanonicalQuote(
      {
        ...canonicalQuote(),
        relationshipId: null,
      },
      {
        documentId: IDS.document,
        documentVersion: document.version,
        jobId: IDS.job,
      }
    ),
    null
  );

  assert.equal(
    normalizeWorkingQuoteReviewIdentity(
      externalReviewIdentity({ requestId: 18 }),
      {
        documentId: IDS.document,
        documentVersion: document.version,
        jobId: IDS.job,
      }
    ),
    null
  );

  assert.equal(
    normalizeWorkingQuoteReviewIdentity(
      reviewIdentity({ relationshipId: null }),
      {
        documentId: IDS.document,
        documentVersion: document.version,
        jobId: IDS.job,
      }
    ),
    null
  );
});

test("external approval remains distinct from customer decision and presents external evidence truth", () => {
  const approved = normalizeWorkingDocumentCanonicalQuote(
    {
      ...externalCanonicalQuote({
        status: "ISSUED",
        currentVersion: 2,
      }),
      approval: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        source: "EXTERNAL_EVIDENCE",
        issuedQuoteVersion: 2,
        approvedAt: "2026-09-02T20:00:00.000Z",
        externalEvidence: {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          method: "EMAIL",
          recordedByParticipantId:
            "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          reference: "Approval email",
          note: null,
        },
      },
    },
    {
      documentId: IDS.document,
      documentVersion: document.version,
      jobId: IDS.job,
    }
  );

  assert.ok(approved);
  assert.equal(approved.decisionState, null);
  assert.equal(
    approved.approval.source,
    "EXTERNAL_EVIDENCE"
  );

  const presentation =
    workingQuoteDeliveryPresentation({
      canonicalQuote: approved,
      issuedQuote: approved,
    });

  assert.equal(
    presentation.state,
    "EXTERNAL_APPROVED"
  );
  assert.equal(
    presentation.badgeLabel,
    "APPROVED · EXTERNAL EVIDENCE"
  );
  assert.equal(
    presentation.statusText,
    "Customer approval recorded from external evidence."
  );
});

test("saved Job-linked Quote readiness is one exact authoritative projection", () => {
  const savedQuote = {
    ...document,
    version: 1,
    documentNumber: "Q-0000001",
    content: {
      customerName: "Antony Guzman",
      projectTitle: "Inspect damaged cabinet door and trim",
      labor: "500",
      materials: "180",
      customerPricingMode: "TOTAL_ONLY",
      materialsPresentation: "INCLUDED_IN_TOTAL",
      depositPercent: "75",
    },
  };
  const readiness = workingQuoteSendReadiness({
    document: savedQuote,
    identity: reviewIdentity({
      documentVersion: 1,
      customerName: "Antony Guzman",
      projectTitle: "Inspect damaged cabinet door and trim",
    }),
    jobId: IDS.job,
    total: 680,
  });

  assert.deepEqual(readiness, {
    ready: true,
    customerName: "Antony Guzman",
    projectTitle: "Inspect damaged cabinet door and trim",
    jobId: IDS.job,
    documentId: IDS.document,
    documentNumber: "Q-0000001",
    documentVersion: 1,
    total: 680,
    currency: "USD",
    missing: [],
    message: "",
  });
  assert.equal(Object.hasOwn(readiness, "businessContactId"), false);
  assert.doesNotMatch(JSON.stringify(readiness), /labor|materials|deposit/i);
});

test("send readiness fails closed for every missing saved authority prerequisite", () => {
  const identity = reviewIdentity();
  const cases = [
    {
      name: "saved document",
      input: { document: null, identity, jobId: IDS.job, total: 680 },
      missing: "savedDocument",
    },
    {
      name: "latest saved content",
      input: { document, identity, jobId: IDS.job, total: 680, exactSavedContent: false },
      missing: "exactSavedContent",
    },
    {
      name: "server Quote number",
      input: { document: { ...document, documentNumber: null }, identity, jobId: IDS.job, total: 680 },
      missing: "documentNumber",
    },
    {
      name: "exact saved version",
      input: { document: { ...document, version: null }, identity, jobId: IDS.job, total: 680 },
      missing: "documentVersion",
    },
    {
      name: "customer",
      input: { document, identity: reviewIdentity({ customerName: "" }), jobId: IDS.job, total: 680 },
      missing: "customer",
    },
    {
      name: "project",
      input: { document, identity: reviewIdentity({ projectTitle: "" }), jobId: IDS.job, total: 680 },
      missing: "project",
    },
    {
      name: "total",
      input: { document, identity, jobId: IDS.job, total: Number.NaN },
      missing: "total",
    },
    {
      name: "Job authority",
      input: { document, identity, jobId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", total: 680 },
      missing: "authority",
    },
  ];

  for (const scenario of cases) {
    const readiness = workingQuoteSendReadiness(scenario.input);
    assert.equal(readiness.ready, false, scenario.name);
    assert.ok(readiness.missing.includes(scenario.missing), scenario.name);
    assert.ok(readiness.message, scenario.name);
  }
});

test("standalone saved Quote cannot enter the Job-governed send path without canonical Job authority", () => {
  const readiness = workingQuoteSendReadiness({
    document: { ...document, jobId: null },
    identity: null,
    jobId: null,
    total: 680,
  });
  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.includes("savedDocument"));
  assert.ok(readiness.missing.includes("authority"));
});

test("exact-version review identity is loaded from the owned Working Quote projection", async () => {
  const calls = [];
  const { quoteSafety: reviewSafety, ...review } = reviewIdentity();
  const identity = await fetchWorkingQuoteReviewIdentity({
    document,
    jobId: IDS.job,
    authFetchImpl: async (...args) => {
      calls.push(args);
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "BUSINESS_DOCUMENT_QUOTE_REVIEW_LOADED",
          review,
          quoteSafety: reviewSafety,
        },
      };
    },
  });

  assert.deepEqual(calls, [[
    `/business-document-drafts/${IDS.document}/quote-review?version=3`,
    { method: "GET", cache: "no-store" },
    undefined,
  ]]);
  assert.equal(identity.customerName, "Meetro Stage B 20260705172957");
  assert.equal(identity.projectTitle, "Slice 004 Recommendation staging certification");
});

test("warning acknowledgement is bound to the exact saved document version", async () => {
  const warnedReview = reviewIdentity({
    quoteSafety: {
      ready: true,
      blockingErrors: [],
      warnings: [{
        code: "QUOTE_DURATION_MISSING",
        field: "estimatedDuration",
        message: "Add an estimated duration.",
      }],
    },
  });
  const acknowledgement = createWorkingQuoteSafetyAcknowledgement(warnedReview);
  assert.deepEqual(acknowledgement, {
    documentId: IDS.document,
    documentVersion: 3,
    warningCodes: ["QUOTE_DURATION_MISSING"],
  });

  const calls = [];
  await issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    quoteSafetyAcknowledgement: acknowledgement,
    authFetchImpl: commandTransport(calls),
    fetchDeliveryImpl: async () => delivery(),
    sendDeliveryImpl: async () => deliveryEvidence(),
  });
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    expectedVersion: 1,
    quoteSafetyAcknowledgement: acknowledgement,
  });

  await assert.rejects(() => issueCanonicalWorkingQuote({
    quote: canonicalQuote({ documentVersion: 4 }),
    document: { ...document, version: 4 },
    jobId: IDS.job,
    idempotencyKey: keys.issue,
    quoteSafetyAcknowledgement: acknowledgement,
    authFetchImpl: commandTransport([]),
  }), (error) => error.code === "QUOTE_SAFETY_ACKNOWLEDGEMENT_INVALID");
});

test("review identity fails closed on document, version, Job, or shape drift", async () => {
  for (const unsafe of [
    reviewIdentity({ documentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    reviewIdentity({ documentVersion: 2 }),
    reviewIdentity({ jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
    { ...reviewIdentity(), exactAddress: "1 Private Street" },
  ]) {
    assert.equal(normalizeWorkingQuoteReviewIdentity(unsafe, {
      documentId: IDS.document,
      documentVersion: 3,
      jobId: IDS.job,
    }), null);
  }

  await assert.rejects(() => fetchWorkingQuoteReviewIdentity({
    document,
    jobId: IDS.job,
    authFetchImpl: async () => ({
      response: { ok: true, status: 200 },
      data: { success: true, review: reviewIdentity({ documentVersion: 2 }) },
    }),
  }), (error) => {
    assert.equal(error.phase, "IDENTITY");
    assert.equal(error.code, "UNSAFE_WORKING_QUOTE_REVIEW_IDENTITY");
    return true;
  });
});

function commandTransport(calls, { bridgeStatus = 201, issueStatus = 200, bridgeQuote = canonicalQuote() } = {}) {
  return async (endpoint, options) => {
    calls.push({ endpoint, options });
    if (endpoint.endsWith("/canonical-quote")) {
      return bridgeStatus >= 400
        ? { response: { ok: false, status: bridgeStatus }, data: { code: "BRIDGE_BLOCKED", message: "Bridge blocked" } }
        : { response: { ok: true, status: bridgeStatus }, data: { success: true, quote: bridgeQuote } };
    }
    if (endpoint.endsWith("/issue")) {
      return issueStatus >= 400
        ? { response: { ok: false, status: issueStatus }, data: { code: "EVALUATION_REQUIRED", message: "A saved Evaluation is required." } }
        : { response: { ok: true, status: issueStatus }, data: { success: true, quote: canonicalQuote({ status: "ISSUED", currentVersion: 2 }) } };
    }
    throw new Error(`Unexpected endpoint ${endpoint}`);
  };
}

test("one governed action bridges the exact saved version, issues once, then delivers the exact issued version", async () => {
  const calls = [];
  const fetchCalls = [];
  const sendCalls = [];
  const result = await issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    authFetchImpl: commandTransport(calls),
    fetchDeliveryImpl: async (input) => {
      fetchCalls.push(input);
      return delivery();
    },
    sendDeliveryImpl: async (input) => {
      sendCalls.push(input);
      return deliveryEvidence();
    },
  });

  assert.deepEqual(calls.map(({ endpoint }) => endpoint), [
    `/business-document-drafts/${IDS.document}/canonical-quote`,
    `/quotes/${IDS.quote}/issue`,
  ]);
  assert.equal(calls[0].options.headers["Idempotency-Key"], keys.bridge);
  assert.deepEqual(JSON.parse(calls[0].options.body), { expectedDocumentVersion: 3 });
  assert.equal(calls[1].options.headers["Idempotency-Key"], keys.issue);
  assert.deepEqual(JSON.parse(calls[1].options.body), { expectedVersion: 1 });
  assert.equal(result.canonicalQuote.sourceBusinessDocument.documentVersion, 3);
  assert.equal(result.issuedQuote.currentVersion, 2);
  assert.equal(result.issuedQuote.integrityHash, "b".repeat(64));
  assert.deepEqual(fetchCalls[0], { quoteId: IDS.quote, jobId: IDS.job, setPage: undefined });
  assert.equal(sendCalls[0].delivery.expectedIssuedVersion, 2);
  assert.equal(sendCalls[0].idempotencyKey, keys.delivery);
  assert.equal(sendCalls[0].deliveryIntent, "INITIAL");
  assert.equal(result.deliveryEvidence.conversationId, 341);
  assert.equal(calls.some(({ endpoint }) => /approve|decline|payment|schedule|invoice|complete/.test(endpoint)), false);
});

test("external Quote is canonically issued but never requests or fabricates Meetro conversation delivery", async () => {
  const calls = [];

  const result = await issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });

      if (endpoint.endsWith("/canonical-quote")) {
        return {
          response: { ok: true, status: 201 },
          data: {
            success: true,
            quote: externalCanonicalQuote(),
          },
        };
      }

      if (endpoint.endsWith("/issue")) {
        return {
          response: { ok: true, status: 200 },
          data: {
            success: true,
            quote: externalCanonicalQuote({
              status: "ISSUED",
              currentVersion: 2,
            }),
          },
        };
      }

      throw new Error(`Unexpected endpoint ${endpoint}`);
    },
    fetchDeliveryImpl: async () => {
      assert.fail("external Quote must not request Meetro delivery authority");
    },
    sendDeliveryImpl: async () => {
      assert.fail("external Quote must not send into a Meetro conversation");
    },
  });

  assert.deepEqual(
    calls.map(({ endpoint }) => endpoint),
    [
      `/business-document-drafts/${IDS.document}/canonical-quote`,
      `/quotes/${IDS.quote}/issue`,
    ]
  );

  assert.equal(result.issuedQuote.status, "ISSUED");
  assert.equal(result.issuedQuote.requestId, null);
  assert.equal(result.issuedQuote.relationshipId, null);
  assert.equal(result.delivery, null);
  assert.equal(result.deliveryEvidence, null);
  assert.equal(result.externalDeliveryRequired, true);

  assert.equal(
    calls.some(({ endpoint }) =>
      /send-in-meetro|conversation|approve|payment|schedule/.test(endpoint)
    ),
    false
  );
});

test("bridge failure stops before issue and delivery", async () => {
  const calls = [];
  let deliveryCalls = 0;
  await assert.rejects(() => issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    authFetchImpl: commandTransport(calls, { bridgeStatus: 409 }),
    fetchDeliveryImpl: async () => { deliveryCalls += 1; },
  }), (error) => {
    assert.equal(error.phase, "BRIDGE");
    assert.equal(error.code, "BRIDGE_BLOCKED");
    return true;
  });
  assert.equal(calls.length, 1);
  assert.equal(deliveryCalls, 0);
});

test("issue failure preserves the canonical Draft and never reports or attempts delivery", async () => {
  const calls = [];
  let deliveryCalls = 0;
  await assert.rejects(() => issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    authFetchImpl: commandTransport(calls, { issueStatus: 409 }),
    fetchDeliveryImpl: async () => { deliveryCalls += 1; },
  }), (error) => {
    assert.equal(error.phase, "ISSUE");
    assert.equal(error.code, "EVALUATION_REQUIRED");
    assert.equal(error.checkpoint.canonicalQuote.status, "DRAFT");
    assert.equal(error.checkpoint.issuedQuote, undefined);
    return true;
  });
  assert.equal(calls.length, 2);
  assert.equal(deliveryCalls, 0);
});

test("delivery retry after issuance reuses the same key and never bridges or issues again", async () => {
  const calls = [];
  const sentKeys = [];
  let attempts = 0;
  let checkpoint;
  await assert.rejects(() => issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    authFetchImpl: commandTransport(calls),
    fetchDeliveryImpl: async () => delivery(),
    sendDeliveryImpl: async ({ idempotencyKey }) => {
      sentKeys.push(idempotencyKey);
      attempts += 1;
      throw Object.assign(new Error("Delivery unavailable"), { code: "DELIVERY_UNAVAILABLE" });
    },
  }), (error) => {
    assert.equal(error.phase, "DELIVERY");
    assert.equal(error.checkpoint.issuedQuote.status, "ISSUED");
    checkpoint = error.checkpoint;
    return true;
  });

  const retried = await issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    checkpoint,
    authFetchImpl: commandTransport(calls),
    fetchDeliveryImpl: async () => { throw new Error("delivery read should be checkpointed"); },
    sendDeliveryImpl: async ({ idempotencyKey }) => {
      sentKeys.push(idempotencyKey);
      attempts += 1;
      return deliveryEvidence();
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(attempts, 2);
  assert.deepEqual(sentKeys, [keys.delivery, keys.delivery]);
  assert.equal(retried.issuedQuote.currentVersion, 2);
});

test("hard-refresh recovery recognizes an existing delivery and cannot duplicate the message", async () => {
  const calls = [];
  let sendCalls = 0;
  const existingDelivery = { ...deliveryEvidence(), replayed: true };
  const result = await issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    authFetchImpl: commandTransport(calls, {
      bridgeQuote: canonicalQuote({ status: "ISSUED", currentVersion: 2 }),
    }),
    fetchDeliveryImpl: async () => ({
      ...delivery(),
      existingDelivery,
    }),
    sendDeliveryImpl: async () => {
      sendCalls += 1;
      throw new Error("already-delivered recovery must not send again");
    },
  });
  assert.deepEqual(calls.map(({ endpoint }) => endpoint), [
    `/business-document-drafts/${IDS.document}/canonical-quote`,
  ]);
  assert.equal(result.issuedQuote.status, "ISSUED");
  assert.equal(result.deliveryEvidence.messageId, existingDelivery.messageId);
  assert.equal(result.deliveryEvidence.replayed, true);
  assert.equal(sendCalls, 0);
});

test("intentional COPY skips bridge and issue, requires prior exact delivery, and preserves a terminal decision", async () => {
  const existingDelivery = { ...deliveryEvidence(), replayed: true };
  const issuedQuote = canonicalQuote({
    status: "ISSUED",
    currentVersion: 2,
    decisionState: "APPROVED",
  });
  const checkpointDelivery = {
    ...delivery(),
    snapshot: {
      ...delivery().snapshot,
      businessStatus: "APPROVED",
    },
    existingDelivery,
  };
  const calls = [];
  const result = await issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    checkpoint: {
      canonicalQuote: issuedQuote,
      issuedQuote,
      delivery: checkpointDelivery,
    },
    deliveryIntent: "COPY",
    authFetchImpl: async () => assert.fail("COPY must not bridge or issue"),
    fetchDeliveryImpl: async () => assert.fail("COPY uses the exact checkpointed delivery authority"),
    sendDeliveryImpl: async (input) => {
      calls.push(input);
      return { ...deliveryEvidence(), messageId: 72 };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].deliveryIntent, "COPY");
  assert.equal(calls[0].idempotencyKey, keys.delivery);
  assert.equal(calls[0].delivery.expectedIssuedVersion, 2);
  assert.equal(result.issuedQuote.decisionState, "APPROVED");
  assert.equal(result.issuedQuote.currentVersion, 2);
  assert.equal(result.deliveryEvidence.messageId, 72);

  await assert.rejects(() => issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: keys,
    checkpoint: { canonicalQuote: issuedQuote, issuedQuote },
    deliveryIntent: "COPY",
  }), { code: "QUOTE_COPY_REQUIRES_PRIOR_DELIVERY" });
});

test("bridge fails closed when an existing mapping does not match the reviewed Working Quote version", async () => {
  await assert.rejects(() => importWorkingQuoteAsCanonicalDraft({
    document,
    jobId: IDS.job,
    idempotencyKey: keys.bridge,
    authFetchImpl: async () => ({
      response: { ok: true, status: 200 },
      data: { success: true, quote: canonicalQuote({ documentVersion: 2 }) },
    }),
  }), { code: "UNSAFE_WORKING_QUOTE_BRIDGE_RESPONSE", phase: "BRIDGE" });
});

test("command identities are stable, distinct, and securely generated", () => {
  let counter = 0;
  const generated = createWorkingQuoteCommandKeys({
    randomUUID() {
      counter += 1;
      return `${counter}`.repeat(8).slice(0, 8) + "-1111-4111-8111-111111111111";
    },
  });
  assert.equal(counter, 3);
  assert.equal(new Set(Object.values(generated)).size, 3);
  assert.match(generated.bridge, /^working-quote-bridge-/);
  assert.match(generated.issue, /^working-quote-issue-/);
  assert.match(generated.delivery, /^working-quote-delivery-/);
});
