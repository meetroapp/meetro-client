import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  appendHomeownerRequestPhoto,
  appendHomeownerRequestUpdate,
  createRequestModificationIdempotencyKey,
  editHomeownerRequest,
  fetchHomeownerRequestModification,
} from "../src/utils/homeownerRequestModificationApi.js";
import {
  getHomeownerRequestModificationActions,
  normalizeHomeownerRequestModificationAuthority,
} from "../src/utils/homeownerRequestModificationPolicy.js";
import {
  buildHomeownerRequestEditPayload,
  createHomeownerRequestEditDraft,
} from "../src/utils/homeownerRequestEditPayload.js";
import { replaceCanonicalRequest } from "../src/utils/requestLifecycleState.js";

const CONCERN_ID = "22222222-2222-4222-8222-222222222222";

function lifecyclePayload(mode, actions, overrides = {}) {
  return {
    success: true,
    code: "REQUEST_LIFECYCLE_FOUND",
    lifecycle: {
      requestId: 41,
      contractVersion: 2,
      legacy: false,
      job: null,
      reportedConcerns: [
        {
          id: CONCERN_ID,
          originalText: "Water is pooling under the sink.",
          reportedAt: "2026-08-11T12:00:00.000Z",
          sequence: 1,
          clarifications: [],
        },
      ],
      participants: [],
      modificationAuthority: {
        mode,
        requestVersion: 3,
        lifecycleContractVersion: 2,
        concernId: CONCERN_ID,
        jobId: null,
        reliance: {
          professionalResponseExists: false,
          requestRelationshipExists: false,
          selectionExists: false,
          jobExists: false,
          activeWorkExists: false,
        },
        actions,
        ...overrides,
      },
    },
  };
}

const modeCases = [
  [
    "EDITABLE",
    {
      editRequest: true,
      appendUpdate: false,
      appendPhoto: false,
      contractChangeGuidance: false,
      readOnly: false,
    },
    {
      editRequest: true,
      addUpdate: false,
      addPhotos: false,
      contractChangeGuidance: false,
      readOnly: false,
    },
  ],
  [
    "APPEND_ONLY",
    {
      editRequest: false,
      appendUpdate: true,
      appendPhoto: true,
      contractChangeGuidance: false,
      readOnly: false,
    },
    {
      editRequest: false,
      addUpdate: true,
      addPhotos: true,
      contractChangeGuidance: false,
      readOnly: false,
    },
  ],
  [
    "CONTRACT_CHANGE_REQUIRED",
    {
      editRequest: false,
      appendUpdate: true,
      appendPhoto: true,
      contractChangeGuidance: true,
      readOnly: false,
    },
    {
      editRequest: false,
      addUpdate: true,
      addPhotos: true,
      contractChangeGuidance: true,
      readOnly: false,
    },
  ],
  [
    "READ_ONLY",
    {
      editRequest: false,
      appendUpdate: false,
      appendPhoto: false,
      contractChangeGuidance: false,
      readOnly: true,
    },
    {
      editRequest: false,
      addUpdate: false,
      addPhotos: false,
      contractChangeGuidance: false,
      readOnly: true,
    },
  ],
];

test("server modification modes project exact returned action booleans", () => {
  for (const [mode, serverActions, expected] of modeCases) {
    const authority = normalizeHomeownerRequestModificationAuthority(
      lifecyclePayload(mode, serverActions)
    );
    assert.equal(authority.mode, mode);
    assert.deepEqual(getHomeownerRequestModificationActions(authority), expected);
  }
});

test("authority normalization fails closed and never derives missing commands from mode", () => {
  assert.equal(normalizeHomeownerRequestModificationAuthority({}), null);
  assert.equal(
    normalizeHomeownerRequestModificationAuthority(
      lifecyclePayload("UNKNOWN", {})
    ),
    null
  );

  const authority = normalizeHomeownerRequestModificationAuthority(
    lifecyclePayload(
      "APPEND_ONLY",
      {
        editRequest: false,
        appendUpdate: true,
        appendPhoto: true,
        readOnly: false,
      },
      { concernId: null, requestVersion: null }
    )
  );
  assert.deepEqual(getHomeownerRequestModificationActions(authority), {
    editRequest: false,
    addUpdate: false,
    addPhotos: false,
    contractChangeGuidance: false,
    readOnly: false,
  });
  assert.deepEqual(getHomeownerRequestModificationActions(null), {
    editRequest: false,
    addUpdate: false,
    addPhotos: false,
    contractChangeGuidance: false,
    readOnly: true,
  });

  const returnedBooleansWin = normalizeHomeownerRequestModificationAuthority(
    lifecyclePayload("EDITABLE", {
      editRequest: false,
      appendUpdate: true,
      appendPhoto: false,
      contractChangeGuidance: false,
      readOnly: false,
    })
  );
  assert.deepEqual(getHomeownerRequestModificationActions(returnedBooleansWin), {
    editRequest: false,
    addUpdate: true,
    addPhotos: false,
    contractChangeGuidance: false,
    readOnly: false,
  });
});

test("selected-professional reliance remains append-only and never restores edit", () => {
  const payload = lifecyclePayload("APPEND_ONLY", modeCases[1][1]);
  payload.lifecycle.modificationAuthority.reliance.selectionExists = true;
  payload.lifecycle.modificationAuthority.reliance.jobExists = true;
  payload.lifecycle.modificationAuthority.jobId =
    "44444444-4444-4444-8444-444444444444";
  const authority = normalizeHomeownerRequestModificationAuthority(payload);

  assert.equal(authority.reliance.selectionExists, true);
  assert.equal(authority.reliance.jobExists, true);
  assert.equal(authority.actions.editRequest, false);
  assert.equal(getHomeownerRequestModificationActions(authority).addUpdate, true);
});

test("lifecycle loader reads exact canonical endpoint and returns history plus authority", async () => {
  const calls = [];
  const payload = lifecyclePayload("EDITABLE", modeCases[0][1]);
  const result = await fetchHomeownerRequestModification({
    requestId: 41,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { response: { ok: true, status: 200 }, data: payload };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0].endpoint, "/posts/41/lifecycle");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(result.authority.requestVersion, 3);
  assert.equal(
    result.lifecycle.reportedConcerns[0].originalText,
    "Water is pooling under the sink."
  );
});

test("editable command sends expected_version and surfaces stale conflict without success", async () => {
  const calls = [];
  const result = await editHomeownerRequest({
    requestId: 41,
    expectedVersion: 3,
    updates: { title: "Updated title" },
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options, body: JSON.parse(options.body) });
      return {
        response: { ok: false, status: 409 },
        data: {
          code: "REQUEST_VERSION_CONFLICT",
          message: "The request changed before this edit could be saved.",
        },
      };
    },
  });

  assert.equal(calls[0].endpoint, "/posts/41");
  assert.equal(calls[0].options.method, "PUT");
  assert.deepEqual(calls[0].body, {
    title: "Updated title",
    expected_version: 3,
  });
  assert.equal(result.ok, false);
  assert.equal(result.versionConflict, true);
  assert.equal(Object.hasOwn(result, "post"), false);
});

test("Add Update uses canonical clarification command and idempotency header", async () => {
  const calls = [];
  const result = await appendHomeownerRequestUpdate({
    requestId: 41,
    concernId: CONCERN_ID,
    text: "Leak is worse when the disposal runs.",
    idempotencyKey: "concern-clarification:command-1",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options, body: JSON.parse(options.body) });
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          code: "CONCERN_CLARIFICATION_CREATED",
          clarification: {
            id: "33333333-3333-4333-8333-333333333333",
            semantics: "CLARIFIES",
            text: "Leak is worse when the disposal runs.",
          },
        },
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(
    calls[0].endpoint,
    `/posts/41/reported-concerns/${CONCERN_ID}/clarifications`
  );
  assert.equal(
    calls[0].options.headers["Idempotency-Key"],
    "concern-clarification:command-1"
  );
  assert.deepEqual(calls[0].body, {
    semantics: "CLARIFIES",
    text: "Leak is worse when the disposal runs.",
  });
});

test("Add Photos sends one governed append payload with expected version", async () => {
  const media = {
    secure_url: "https://res.cloudinary.com/demo/image/upload/v1/photo.jpg",
    public_id: "meetro/users/7/request-photos/photo",
    resource_type: "image",
    format: "jpg",
    bytes: 1024,
    width: 640,
    height: 480,
    version: 1,
    uploaded_at: "2026-08-11T12:00:00.000Z",
  };
  const calls = [];
  const result = await appendHomeownerRequestPhoto({
    requestId: 41,
    concernId: CONCERN_ID,
    expectedVersion: 3,
    media,
    idempotencyKey: "request-photo:command-1",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options, body: JSON.parse(options.body) });
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          code: "REQUEST_PHOTO_ATTACHED",
          photo: { ...media, request_version: 4 },
          post: {
            id: 41,
            title: "Sink leak",
            description: "Water is pooling under the sink.",
            lifecycle_contract_version: 2,
            modification_version: 4,
            request_photos: [media],
          },
          requestVersion: 4,
        },
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.requestVersion, 4);
  assert.equal(
    calls[0].endpoint,
    `/posts/41/reported-concerns/${CONCERN_ID}/photos`
  );
  assert.equal(calls[0].options.headers["Idempotency-Key"], "request-photo:command-1");
  assert.deepEqual(calls[0].body, {
    expected_version: 3,
    media: { purpose: "request-photo", media },
  });
});

test("photo attachment failure exposes no durable post or false attached-photo result", async () => {
  const result = await appendHomeownerRequestPhoto({
    requestId: 41,
    concernId: CONCERN_ID,
    expectedVersion: 3,
    media: { public_id: "unattached-photo" },
    idempotencyKey: "request-photo:failed-command",
    authFetchImpl: async () => ({
      response: { ok: false, status: 409 },
      data: {
        success: false,
        code: "REQUEST_VERSION_CONFLICT",
        message: "The request changed before the photo could be attached.",
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.versionConflict, true);
  assert.equal(Object.hasOwn(result, "post"), false);
  assert.equal(Object.hasOwn(result, "photo"), false);
});

test("edit prefill emits only changed permitted fields and preserves canonical photo order", () => {
  const request = {
    title: "Sink leak",
    description: "Water is pooling under the sink.",
    locationNormalizationStatus: "normalized",
    locationIntakeMode: "exact_on_file",
    serviceAddressLine1: "10 Main St",
    serviceCity: "Cape Coral",
    serviceRegion: "FL",
    servicePostalCode: "33904",
    serviceCountryCode: "US",
    unitNumber: "",
    accessNotes: "Call first",
  };
  const draft = createHomeownerRequestEditDraft(request);
  draft.description = "Water appears near the disposal connection.";
  draft.accessNotes = "Use the side door";
  const photos = [{ public_id: "a" }, { public_id: "b" }];
  const payload = buildHomeownerRequestEditPayload({
    request,
    draft,
    requestPhotos: photos,
  });

  assert.equal(Object.hasOwn(payload, "title"), false);
  assert.equal(
    payload.description,
    "Water appears near the disposal connection."
  );
  assert.equal(payload.access_notes, "Use the side door");
  assert.deepEqual(payload.request_photos, photos);
});

test("canonical photo response preserves earlier media and advances projected version", () => {
  const photoA = { public_id: "photo-a", secure_url: "https://example.com/a.jpg" };
  const photoB = { public_id: "photo-b", secure_url: "https://example.com/b.jpg" };
  const records = [{ requestId: 41, title: "Sink leak", request_photos: [photoA] }];
  const updated = replaceCanonicalRequest(records, {
    id: 41,
    title: "Sink leak",
    description: "Water is pooling under the sink.",
    lifecycle_contract_version: 2,
    modification_version: 4,
    request_photos: [photoA, photoB],
  });

  assert.deepEqual(
    updated[0].request_photos.map((photo) => photo.public_id),
    ["photo-a", "photo-b"]
  );
  assert.equal(updated[0].modificationVersion, 4);
});

test("idempotency key generator uses the supplied command UUID", () => {
  const key = createRequestModificationIdempotencyKey(
    "request photo",
    { randomUUID: () => "11111111-1111-4111-8111-111111111111" }
  );
  assert.equal(
    key,
    "request-photo:11111111-1111-4111-8111-111111111111"
  );
});

test("dedicated detail UI exposes lifecycle actions without a fake agreement command", () => {
  const myRequestsSource = readFileSync(
    new URL("../src/pages/MyRequests.jsx", import.meta.url),
    "utf8"
  );
  const panelSource = readFileSync(
    new URL("../src/components/HomeownerRequestModificationPanel.jsx", import.meta.url),
    "utf8"
  );

  assert.match(myRequestsSource, /<HomeownerRequestModificationPanel/);
  assert.match(panelSource, /actions\.editRequest/);
  assert.match(panelSource, /actions\.addUpdate/);
  assert.match(panelSource, /actions\.addPhotos/);
  assert.match(panelSource, /Changes to the agreed work should be discussed/);
  assert.match(panelSource, /sending a message does not change the scope or agreement/);
  assert.match(panelSource, /data-homeowner-modification-state=\{loadState\}/);
  assert.match(panelSource, /conversationAvailable && !actions\.readOnly/);
  assert.doesNotMatch(
    `${myRequestsSource}\n${panelSource}`,
    /Create Change Order|Revise Contract|Update Agreement|Create Supplemental Quote|Request Service Change/
  );
});
