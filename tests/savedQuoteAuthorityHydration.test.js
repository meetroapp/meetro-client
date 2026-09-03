import assert from "node:assert/strict";
import test from "node:test";

import {
  hydrateSavedQuoteAuthority,
} from "../src/utils/savedQuoteAuthorityHydration.js";
import {
  issueAndSendWorkingQuote,
  workingQuoteDeliveryPresentation,
} from "../src/utils/workingQuoteCanonicalIssue.js";

const IDS = Object.freeze({
  document: "ccda1240-b24e-4f10-b06f-3908c6641773",
  job: "072c8736-5d97-4253-ba3e-dd1bce281a20",
  quote: "f08a4f3b-8a21-4da8-a6b0-4258f5a8df9b",
  participant: "44444444-4444-4444-8444-444444444444",
});

const document = Object.freeze({
  id: IDS.document,
  documentType: "QUOTE",
  status: "WORKING_DRAFT",
  version: 1,
  jobId: IDS.job,
  documentNumber: "Q-0000001",
  content: Object.freeze({
    customerName: "Antony Guzman",
    projectTitle: "Inspect damaged cabinet door and trim",
    customerPricingMode: "TOTAL_ONLY",
    materialsPresentation: "INCLUDED_IN_TOTAL",
    totalOverride: "680",
    depositMode: "PERCENT",
    depositPercent: "75",
  }),
});

function canonicalQuote({
  status = "ISSUED",
  documentVersion = 1,
  decisionState = null,
  sourceContinuity = null,
  customerParty = null,
} = {}) {
  const currentVersion = status === "ISSUED" ? 2 : 1;
  const issuedAt = status === "ISSUED" ? "2026-08-27T21:37:29.762Z" : null;
  const decidedAt = decisionState ? "2026-08-27T22:00:00.000Z" : null;
  return {
    id: IDS.quote,
    jobId: IDS.job,
    requestId: 23,
    relationshipId: 345,
    issuerParticipantId: IDS.participant,
    parentQuoteId: null,
    lineageType: null,
    lineageReasonCategory: null,
    status,
    issuedAt,
    currency: "USD",
    currentVersion,
    materialsSubtotalMinor: 0,
    laborServiceSubtotalMinor: 68000,
    totalMinor: 68000,
    scopeItemCount: 1,
    conditions: [],
    exclusions: [],
    scopeItems: [],
    versions: [{
      version: currentVersion,
      status,
      currency: "USD",
      materialsSubtotalMinor: 0,
      laborServiceSubtotalMinor: 68000,
      totalMinor: 68000,
      scopeItemCount: 1,
      conditions: [],
      exclusions: [],
      customerTermsSnapshot: null,
      issuedAt,
      integrityHash: "a".repeat(64),
      integrityVersion: 2,
      createdAt: "2026-08-27T21:30:00.000Z",
    }],
    createdAt: "2026-08-27T21:30:00.000Z",
    updatedAt: "2026-08-27T21:37:29.762Z",
    decisionState,
    decisionVersion: decisionState ? currentVersion : null,
    decidedAt,
    documentNumber: "Q-0000001",
    sourceBusinessDocument: {
      documentId: IDS.document,
      documentVersion,
      ...(sourceContinuity || {}),
    },
    customerTermsSnapshot: null,
    customerParty,
  };
}

function delivery(quote, { existingDelivery = null } = {}) {
  return Object.freeze({
    source: "PROFESSIONAL_QUOTE_DELIVERY",
    quoteId: IDS.quote,
    jobId: IDS.job,
    expectedIssuedVersion: quote.currentVersion,
    snapshot: Object.freeze({
      quoteId: IDS.quote,
      jobId: IDS.job,
      businessStatus: quote.decisionState || "WAITING_ON_CUSTOMER",
      totalMinor: 68000,
      currency: "USD",
      issuedAt: quote.issuedAt,
      decidedAt: quote.decidedAt,
    }),
    canSendInMeetro: true,
    conversationId: 342,
    existingDelivery,
  });
}

function quoteListTransport(quotes, calls) {
  return async (endpoint, options) => {
    calls.push({ endpoint, options });
    return {
      response: { ok: true, status: 200 },
      data: { success: true, code: "JOB_DRAFT_QUOTES_FOUND", quotes },
    };
  };
}

test("clean reopen resolves the exact source mapping and issued-without-delivery truth", async () => {
  const calls = [];
  const quote = canonicalQuote();
  const authority = await hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: quoteListTransport([quote], calls),
    fetchDeliveryImpl: async (input) => {
      calls.push({ endpoint: `/professional/quotes/${input.quoteId}/delivery`, options: { method: "GET", cache: "no-store" } });
      return delivery(quote);
    },
  });

  assert.equal(authority.sourceDocument.documentId, IDS.document);
  assert.equal(authority.sourceDocument.documentVersion, 1);
  assert.equal(authority.sourceDocument.documentNumber, "Q-0000001");
  assert.equal(authority.canonicalQuote.id, IDS.quote);
  assert.equal(authority.canonicalQuote.requestId, 23);
  assert.equal(authority.canonicalQuote.relationshipId, 345);
  assert.equal(authority.canonicalQuote.status, "ISSUED");
  assert.equal(authority.canonicalQuote.currentVersion, 2);
  assert.equal(authority.canonicalQuote.totalMinor, 68000);
  assert.equal(authority.canonicalQuote.decisionState, null);
  assert.equal(authority.delivery.existingDelivery, null);
  assert.deepEqual(calls.map(({ options }) => options.method), ["GET", "GET"]);
  assert.equal(JSON.stringify(authority).includes("integrityHash"), false);
  assert.equal(JSON.stringify(authority).includes("issuerParticipantId"), false);
  assert.equal(document.content.customerName, "Antony Guzman");
  assert.equal(document.content.projectTitle, "Inspect damaged cabinet door and trim");
  assert.equal(document.content.totalOverride, "680");
  assert.equal(document.content.customerPricingMode, "TOTAL_ONLY");
  assert.equal(document.content.materialsPresentation, "INCLUDED_IN_TOTAL");
  assert.equal(document.content.depositPercent, "75");

  const presentation = workingQuoteDeliveryPresentation({
    canonicalQuote: authority.canonicalQuote,
    deliveryEvidence: authority.delivery.existingDelivery,
  });
  assert.equal(presentation.state, "ISSUED_NOT_DELIVERED");
  assert.equal(presentation.badgeLabel, "ISSUED · DELIVERY PENDING");
  assert.equal(presentation.statusText, "Quote issued · Not delivered to customer.");
  assert.equal(presentation.actionLabel, "Send in Meetro");
  assert.equal(presentation.actionDisabled, false);
});

test("no mapping remains a working draft and canonical Draft is represented separately", async () => {
  const calls = [];
  const unmapped = await hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: quoteListTransport([], calls),
    fetchDeliveryImpl: async () => assert.fail("Draft hydration must not load delivery"),
  });
  assert.equal(unmapped.canonicalQuote, null);
  assert.equal(unmapped.delivery, null);
  assert.equal(workingQuoteDeliveryPresentation({
    canonicalQuote: unmapped.canonicalQuote,
  }).state, "WORKING_DRAFT");

  const draft = canonicalQuote({ status: "DRAFT" });
  const mapped = await hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: quoteListTransport([draft], calls),
    fetchDeliveryImpl: async () => assert.fail("Canonical Draft must not load delivery"),
  });
  const presentation = workingQuoteDeliveryPresentation({
    canonicalQuote: mapped.canonicalQuote,
  });
  assert.equal(presentation.state, "CANONICAL_DRAFT");
  assert.equal(presentation.badgeLabel, "CANONICAL DRAFT");
  assert.equal(presentation.actionLabel, "Send Quote to Customer");
});

test("exact delivery and exact decisions hydrate without inventing state", async () => {
  const sentEvidence = Object.freeze({
    messageId: 71,
    conversationId: 342,
    quoteId: IDS.quote,
    jobId: IDS.job,
    sentAt: "2026-08-27T21:40:00.000Z",
    replayed: true,
  });
  const issued = canonicalQuote();
  const sent = await hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: quoteListTransport([issued], []),
    fetchDeliveryImpl: async () => delivery(issued, { existingDelivery: sentEvidence }),
  });
  assert.equal(workingQuoteDeliveryPresentation({
    canonicalQuote: sent.canonicalQuote,
    deliveryEvidence: sent.delivery.existingDelivery,
  }).state, "DELIVERED");

  for (const decisionState of ["APPROVED", "DECLINED"]) {
    const decided = canonicalQuote({ decisionState });
    const authority = await hydrateSavedQuoteAuthority({
      document,
      authFetchImpl: quoteListTransport([decided], []),
      fetchDeliveryImpl: async () => delivery(decided, { existingDelivery: sentEvidence }),
    });
    const presentation = workingQuoteDeliveryPresentation({
      canonicalQuote: authority.canonicalQuote,
      deliveryEvidence: authority.delivery.existingDelivery,
    });
    assert.equal(presentation.state, decisionState);
    assert.equal(presentation.actionLabel, "Send Copy Again");
    assert.equal(presentation.actionDisabled, false);
  }
});

test("external Quote hard refresh preserves null marketplace identity and external approval without loading Meetro delivery", async () => {
  const externalApproved = {
    ...canonicalQuote(),
    requestId: null,
    relationshipId: null,
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
  };

  const authority = await hydrateSavedQuoteAuthority({
    document,
    authFetchImpl:
      quoteListTransport([externalApproved], []),
    fetchDeliveryImpl: async () =>
      assert.fail(
        "External Quote hydration must not request Meetro delivery authority"
      ),
  });

  assert.equal(
    authority.canonicalQuote.requestId,
    null
  );
  assert.equal(
    authority.canonicalQuote.relationshipId,
    null
  );
  assert.equal(
    authority.canonicalQuote.decisionState,
    null
  );
  assert.equal(
    authority.canonicalQuote.approval.source,
    "EXTERNAL_EVIDENCE"
  );
  assert.equal(authority.delivery, null);

  const presentation =
    workingQuoteDeliveryPresentation({
      canonicalQuote: authority.canonicalQuote,
    });

  assert.equal(
    presentation.state,
    "EXTERNAL_APPROVED"
  );
  assert.equal(
    presentation.badgeLabel,
    "APPROVED · EXTERNAL EVIDENCE"
  );
});

test("ownership/read failures and exact source drift fail closed without write requests", async () => {
  const methods = [];
  await assert.rejects(() => hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: async (_endpoint, options) => {
      methods.push(options.method);
      return {
        response: { ok: false, status: 403 },
        data: { success: false, code: "QUOTE_AUTHORITY_REQUIRED" },
      };
    },
  }), { code: "QUOTE_AUTHORITY_REQUIRED" });

  await assert.rejects(() => hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: quoteListTransport([
      canonicalQuote({ documentVersion: 2 }),
    ], []),
  }), { code: "SAVED_QUOTE_CANONICAL_MAPPING_MISMATCH" });
  assert.deepEqual(methods, ["GET"]);

  const unavailable = workingQuoteDeliveryPresentation({ hydrationState: "ERROR" });
  assert.equal(unavailable.state, "AUTHORITY_UNAVAILABLE");
  assert.equal(unavailable.statusText, "Unable to verify current Quote delivery status.");
  assert.equal(unavailable.actionDisabled, true);
  assert.notEqual(unavailable.state, "WORKING_DRAFT");
});

test("delivery mismatch fails closed and never synthesizes evidence", async () => {
  const quote = canonicalQuote();
  await assert.rejects(() => hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: quoteListTransport([quote], []),
    fetchDeliveryImpl: async () => ({
      ...delivery(quote),
      expectedIssuedVersion: 3,
    }),
  }), { code: "SAVED_QUOTE_DELIVERY_AUTHORITY_MISMATCH" });
});

test("hard refresh and Saved Files reopen derive the same state from authenticated reads", async () => {
  const quote = canonicalQuote();
  const methods = [];
  const load = () => hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: async (_endpoint, options) => {
      methods.push(options.method);
      return {
        response: { ok: true, status: 200 },
        data: { success: true, code: "JOB_DRAFT_QUOTES_FOUND", quotes: [quote] },
      };
    },
    fetchDeliveryImpl: async () => {
      methods.push("GET");
      return delivery(quote);
    },
  });
  const initial = await load();
  const reopened = await load();
  assert.deepEqual(reopened, initial);
  assert.deepEqual(methods, ["GET", "GET", "GET", "GET"]);
});

test("newer saved version hydrates only with server-attested source and exact customer authority", async () => {
  const exactParty = Object.freeze({
    businessContactId: "11111111-1111-4111-8111-111111111111",
    customerRelationshipId: "22222222-2222-4222-8222-222222222222",
  });
  const newerDocument = Object.freeze({
    ...document,
    version: 2,
    customerParty: exactParty,
  });
  const quote = canonicalQuote({
    sourceContinuity: {
      currentDocumentVersion: 2,
      currentSnapshotMatchesSource: true,
    },
    customerParty: exactParty,
  });
  const calls = [];
  const authority = await hydrateSavedQuoteAuthority({
    document: newerDocument,
    authFetchImpl: quoteListTransport([quote], calls),
    fetchDeliveryImpl: async () => delivery(quote),
  });
  assert.equal(authority.sourceDocument.documentVersion, 2);
  assert.equal(authority.canonicalQuote.sourceBusinessDocument.documentVersion, 1);
  assert.equal(authority.canonicalQuote.sourceBusinessDocument.currentDocumentVersion, 2);
  assert.deepEqual(authority.canonicalQuote.customerParty, exactParty);
  assert.equal(
    workingQuoteDeliveryPresentation({
      canonicalQuote: authority.canonicalQuote,
      deliveryEvidence: authority.delivery.existingDelivery,
    }).actionDisabled,
    false
  );
  assert.deepEqual(calls.map(({ options }) => options.method), ["GET"]);
});

test("source drift and customer authority drift remain fail-closed", async () => {
  const exactParty = {
    businessContactId: "11111111-1111-4111-8111-111111111111",
    customerRelationshipId: "22222222-2222-4222-8222-222222222222",
  };
  const newerDocument = { ...document, version: 2, customerParty: exactParty };
  await assert.rejects(() => hydrateSavedQuoteAuthority({
    document: newerDocument,
    authFetchImpl: quoteListTransport([canonicalQuote({
      sourceContinuity: {
        currentDocumentVersion: 2,
        currentSnapshotMatchesSource: false,
      },
      customerParty: exactParty,
    })], []),
  }), { code: "SAVED_QUOTE_CANONICAL_MAPPING_MISMATCH" });

  await assert.rejects(() => hydrateSavedQuoteAuthority({
    document: newerDocument,
    authFetchImpl: quoteListTransport([canonicalQuote({
      sourceContinuity: {
        currentDocumentVersion: 2,
        currentSnapshotMatchesSource: true,
      },
      customerParty: {
        ...exactParty,
        customerRelationshipId: "33333333-3333-4333-8333-333333333333",
      },
    })], []),
  }), { code: "SAVED_QUOTE_CUSTOMER_AUTHORITY_MISMATCH" });
});

test("hydrated issued checkpoint retries delivery without bridge or issue", async () => {
  const quote = canonicalQuote();
  const authority = await hydrateSavedQuoteAuthority({
    document,
    authFetchImpl: quoteListTransport([quote], []),
    fetchDeliveryImpl: async () => delivery(quote),
  });
  const commandCalls = [];
  const result = await issueAndSendWorkingQuote({
    document,
    jobId: IDS.job,
    commandKeys: {
      bridge: "working-quote-bridge-55555555-5555-4555-8555-555555555555",
      issue: "working-quote-issue-66666666-6666-4666-8666-666666666666",
      delivery: "working-quote-delivery-77777777-7777-4777-8777-777777777777",
    },
    checkpoint: {
      canonicalQuote: authority.canonicalQuote,
      issuedQuote: authority.canonicalQuote,
      delivery: authority.delivery,
    },
    authFetchImpl: async (...args) => {
      commandCalls.push(args);
      throw new Error("bridge and issue must not run from hydrated issuance");
    },
    fetchDeliveryImpl: async () => {
      throw new Error("the exact hydrated delivery read must be reused");
    },
    sendDeliveryImpl: async ({ delivery: target }) => ({
      messageId: 72,
      conversationId: target.conversationId,
      quoteId: target.quoteId,
      jobId: target.jobId,
      sentAt: "2026-08-27T22:30:00.000Z",
      replayed: false,
    }),
  });
  assert.equal(commandCalls.length, 0);
  assert.equal(result.deliveryEvidence.messageId, 72);
});
