import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createRequestSelectionIdempotencyKey,
  getHomeownerProfessionalResponses,
  normalizeHomeownerProfessionalResponses,
  normalizeRequestSelectionResult,
  prepareRequestSelectionCommand,
  selectHomeownerProfessionalResponse,
} from "../src/utils/requestSelectionApi.js";

function responseRow(overrides = {}) {
  return {
    id: "901",
    request_id: 41,
    status: "submitted",
    current_version: 1,
    introduction_text: "I can help with this repair.",
    submitted_at: "2026-08-06T12:00:00.000Z",
    selected_at: null,
    relationship_status: "pending",
    selection_eligible: true,
    selected: false,
    conversation_available: false,
    conversation_id: null,
    business_profile: {
      business_name: "Trusted Repairs",
      category: "handyman",
      image_url: "https://example.test/business.jpg",
    },
    ...overrides,
  };
}

function listPayload(responses = [responseRow()]) {
  return {
    success: true,
    code: "PROFESSIONAL_RESPONSES_FOUND",
    request: { id: 41, title: "Drywall Repair", status: "open" },
    responses,
  };
}

function selectionPayload(overrides = {}) {
  return {
    success: true,
    code: "REQUEST_SELECTION_CREATED",
    selection: {
      id: "701",
      request_id: 41,
      response_id: "901",
      selected_response_version: 2,
      selected_at: "2026-08-06T13:00:00.000Z",
    },
    response: {
      id: "901",
      request_id: 41,
      status: "selected",
      current_version: 2,
      introduction_text: "I can help with this repair.",
      submitted_at: "2026-08-06T12:00:00.000Z",
      selected_at: "2026-08-06T13:00:00.000Z",
      business_profile: {
        business_name: "Trusted Repairs",
        category: "handyman",
        image_url: "https://example.test/business.jpg",
      },
    },
    relationship: {
      id: 501,
      request_id: 41,
      status: "active",
      authority_source: "professional_response",
      current_version: 2,
      activated_at: "2026-08-06T13:00:00.000Z",
    },
    conversation: {
      id: 801,
      relationship_id: 501,
      status: "active",
    },
    privacy_stage: 3,
    resultClassification: "created",
    replayed: false,
    ...overrides,
  };
}

test("selection command retains the exact retry key but changes it for another response", () => {
  let sequence = 0;
  const keyFactory = () => `request-selection:key-${++sequence}`;
  const first = prepareRequestSelectionCommand({}, 41, 901, { keyFactory });
  const retry = prepareRequestSelectionCommand(first, 41, 901, { keyFactory });
  const changed = prepareRequestSelectionCommand(first, 41, 902, { keyFactory });

  assert.equal(retry, first);
  assert.notEqual(changed.idempotencyKey, first.idempotencyKey);
  assert.equal(sequence, 2);
  assert.equal(
    createRequestSelectionIdempotencyKey({
      randomUUID: () => "11111111-2222-4333-8444-555555555555",
    }),
    "request-selection:11111111-2222-4333-8444-555555555555"
  );
  assert.equal(createRequestSelectionIdempotencyKey({}), null);
});

test("professional response identifiers remain opaque beyond JavaScript's safe integer range", () => {
  const opaqueResponseId = "9007199254740993";
  const command = prepareRequestSelectionCommand({}, 41, opaqueResponseId, {
    keyFactory: () => "request-selection:opaque-response",
  });
  const selected = selectionPayload({
    selection: {
      ...selectionPayload().selection,
      id: "9007199254740995",
      response_id: opaqueResponseId,
    },
    response: {
      ...selectionPayload().response,
      id: opaqueResponseId,
    },
  });

  assert.equal(command.responseId, opaqueResponseId);
  assert.equal(
    normalizeRequestSelectionResult(selected).selection.responseId,
    opaqueResponseId
  );
});

test("selection transport preserves an opaque PostgreSQL BIGINT response identifier", async () => {
  const responseId = "9007199254740993";
  const calls = [];
  const result = await selectHomeownerProfessionalResponse(
    {
      requestId: 41,
      responseId,
      idempotencyKey: "request-selection:opaque-transport",
    },
    {
      authFetchImpl: async (...args) => {
        calls.push(args);
        return {
          response: { ok: true, status: 201 },
          data: selectionPayload({
            selection: {
              ...selectionPayload().selection,
              response_id: responseId,
            },
            response: {
              ...selectionPayload().response,
              id: responseId,
            },
          }),
        };
      },
    }
  );

  assert.equal(result.ok, true);
  assert.equal(
    calls[0][0],
    `/posts/41/professional-responses/${responseId}/select`
  );
  assert.equal(result.selection.responseId, responseId);
});

test("homeowner response normalization preserves separate response, relationship, and conversation truth", () => {
  const submitted = responseRow();
  const selected = responseRow({
    id: "902",
    status: "selected",
    current_version: 2,
    selected_at: "2026-08-06T13:00:00.000Z",
    relationship_status: "active",
    selection_eligible: false,
    selected: true,
    conversation_available: true,
    conversation_id: "801",
  });
  const result = normalizeHomeownerProfessionalResponses(
    listPayload([submitted, selected])
  );

  assert.equal(result.responses[0].status, "submitted");
  assert.equal(result.responses[0].relationshipStatus, "pending");
  assert.equal(result.responses[0].conversationId, null);
  assert.equal(result.responses[1].status, "selected");
  assert.equal(result.responses[1].relationshipStatus, "active");
  assert.equal(result.responses[1].conversationId, 801);
});

test("malformed response authority fails closed", () => {
  const malformed = [
    null,
    {},
    listPayload([responseRow({ request_id: 42 })]),
    listPayload([responseRow({ status: "selected" })]),
    listPayload([responseRow({ conversation_available: true })]),
    listPayload([responseRow(), responseRow()]),
    listPayload([
      responseRow({ status: "selected", relationship_status: "active",
        selection_eligible: false, selected: true,
        conversation_available: true, conversation_id: 801 }),
      responseRow({ id: 902, status: "selected", relationship_status: "active",
        selection_eligible: false, selected: true,
        conversation_available: true, conversation_id: 802 }),
    ]),
  ];
  for (const payload of malformed) {
    assert.equal(normalizeHomeownerProfessionalResponses(payload), null);
  }
});

test("selection result requires exact response, relationship, version, and conversation identity", () => {
  const result = normalizeRequestSelectionResult(selectionPayload());
  assert.equal(result.selection.id, 701);
  assert.equal(result.selection.responseId, 901);
  assert.equal(result.response.status, "selected");
  assert.equal(result.relationship.status, "active");
  assert.equal(result.conversation.id, 801);
  assert.equal(result.conversation.relationshipId, 501);
  assert.equal(result.privacyStage, 3);

  for (const payload of [
    selectionPayload({ privacy_stage: 2 }),
    selectionPayload({
      response: { ...selectionPayload().response, status: "submitted" },
    }),
    selectionPayload({
      relationship: { ...selectionPayload().relationship, id: 502 },
    }),
    selectionPayload({
      conversation: { ...selectionPayload().conversation, relationship_id: 502 },
    }),
    selectionPayload({
      selection: { ...selectionPayload().selection, response_id: 902 },
    }),
  ]) {
    assert.equal(normalizeRequestSelectionResult(payload), null);
  }
});

test("response listing uses only the owner-scoped canonical request endpoint", async () => {
  const calls = [];
  const result = await getHomeownerProfessionalResponses(41, {
    authFetchImpl: async (...args) => {
      calls.push(args);
      return { response: { ok: true, status: 200 }, data: listPayload() };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0][0], "/posts/41/professional-responses");
  assert.deepEqual(calls[0][1], {});
});

test("selection sends only the exact response reference in the route and an empty body", async () => {
  const calls = [];
  let navigationCount = 0;
  const result = await selectHomeownerProfessionalResponse(
    {
      requestId: 41,
      responseId: 901,
      idempotencyKey: "request-selection:command-1",
    },
    {
      setPage: () => { navigationCount += 1; },
      authFetchImpl: async (...args) => {
        calls.push(args);
        return {
          response: { ok: true, status: 201 },
          data: selectionPayload(),
        };
      },
    }
  );

  assert.equal(result.ok, true);
  assert.equal(
    calls[0][0],
    "/posts/41/professional-responses/901/select"
  );
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(calls[0][1].headers, {
    "Idempotency-Key": "request-selection:command-1",
  });
  assert.deepEqual(JSON.parse(calls[0][1].body), {});
  assert.equal(navigationCount, 0);
});

test("transport errors expose deterministic safe copy", async () => {
  const command = {
    requestId: 41,
    responseId: 901,
    idempotencyKey: "request-selection:command-1",
  };
  const conflict = await selectHomeownerProfessionalResponse(command, {
    authFetchImpl: async () => ({
      response: { ok: false, status: 409 },
      data: {
        code: "REQUEST_SELECTION_ALREADY_EXISTS",
        message: "A professional has already been selected for this request.",
      },
    }),
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.code, "REQUEST_SELECTION_ALREADY_EXISTS");

  const network = await selectHomeownerProfessionalResponse(command, {
    authFetchImpl: async () => { throw new Error("private network detail"); },
  });
  assert.equal(network.ok, false);
  assert.equal(network.code, "REQUEST_SELECTION_FAILED");
  assert.doesNotMatch(network.message, /private network detail/);
});

test("selection transport contains no browser persistence or canonical identity generation", () => {
  const source = readFileSync(
    new URL("../src/utils/requestSelectionApi.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(
    source,
    /(?:selection|conversation|relationship)Id\s*=\s*(?:Date\.now|Math\.random|randomUUID)/
  );
  assert.match(source, /JSON\.stringify\(\{\}\)/);
});
