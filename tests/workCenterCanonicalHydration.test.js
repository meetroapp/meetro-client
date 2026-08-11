import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { STAGING_API_URL } from "../src/api.js";
import {
  CANONICAL_WORK_CENTER_AUTHORITY,
  fetchCanonicalWorkCenterEntries,
  isCanonicalWorkCenterEntry,
  isCanonicalWorkCenterHydrationEnabled,
  mergeCanonicalWorkCenterEntries,
  normalizeCanonicalWorkCenterEntry,
} from "../src/utils/workCenterCanonicalHydration.js";
import { getWorkCenterLifecycleProjectionTarget } from "../src/utils/workCenterLifecycleProjection.js";

const canonicalSummary = {
  conversationId: 340,
  sourceType: "request",
  project_title: "U1-02A QA lifecycle fixture - sink cabinet water damage",
  customerName: "Liam Molina",
};

const canonicalDetail = {
  conversationId: 340,
  type: "request",
  permissions: { canRead: true },
  participants: {
    homeowner: { displayName: "Liam Molina" },
  },
  relationship: {
    id: 72,
    requestId: 41,
    title: "U1-02A QA lifecycle fixture - sink cabinet water damage",
    lifecycleContractVersion: 2,
    jobId: "11111111-1111-4111-8111-111111111111",
  },
};

test("canonical professional work hydration preserves stable identity and provenance", () => {
  const entry = normalizeCanonicalWorkCenterEntry({
    summary: canonicalSummary,
    detail: canonicalDetail,
  });

  assert.equal(entry.postId, 41);
  assert.equal(entry.requestId, 41);
  assert.equal(entry.lifecycleContractVersion, 2);
  assert.equal(entry.jobId, "11111111-1111-4111-8111-111111111111");
  assert.equal(entry.relationshipId, 72);
  assert.equal(entry.conversationId, 340);
  assert.equal(entry.source, CANONICAL_WORK_CENTER_AUTHORITY);
  assert.equal(entry.readOnly, true);
  assert.deepEqual(entry.commandAuthority, []);
  assert.equal(isCanonicalWorkCenterEntry(entry), true);
});

test("canonical identity dedupes a matching legacy projection without inheriting local status", () => {
  const canonicalEntry = normalizeCanonicalWorkCenterEntry({
    summary: canonicalSummary,
    detail: canonicalDetail,
  });
  const legacyJob = {
    id: "legacy-41",
    requestId: 41,
    customer: "Browser customer override",
    title: "Browser title override",
    status: "completed",
    schedule: {
      requestId: 41,
      status: "completed",
      paymentStatus: "paid",
    },
    quote: { requestId: 41, status: "approved" },
    sourceRecords: [{ type: "schedule", record: { requestId: 41 } }],
  };

  const result = mergeCanonicalWorkCenterEntries([legacyJob], [canonicalEntry]);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "canonical-request-41");
  assert.equal(result[0].customer, "Liam Molina");
  assert.equal(result[0].title, canonicalSummary.project_title);
  assert.equal(result[0].status, undefined);
  assert.equal(result[0].schedule, undefined);
  assert.equal(result[0].quote, undefined);
  assert.equal(result[0].compatibilityProjection.schedule.status, "completed");
  assert.equal(result[0].compatibilityProjection.quote.status, "approved");
  assert.equal(result[0].readOnly, true);
});

test("an unverified canonical candidate can be selected for the existing lifecycle adapter", () => {
  const candidate = normalizeCanonicalWorkCenterEntry({
    summary: canonicalSummary,
    detail: {
      ...canonicalDetail,
      relationship: {
        id: 72,
        requestId: 41,
        title: canonicalSummary.project_title,
      },
    },
  });

  assert.equal(candidate.lifecycleContractVersion, null);
  assert.deepEqual(getWorkCenterLifecycleProjectionTarget(candidate), {
    available: true,
    reason: "",
    postId: 41,
  });
});

test("an explicitly non-v2 discovery record fails closed", () => {
  const entry = normalizeCanonicalWorkCenterEntry({
    summary: canonicalSummary,
    detail: {
      ...canonicalDetail,
      relationship: {
        ...canonicalDetail.relationship,
        lifecycleContractVersion: 1,
      },
    },
  });

  assert.equal(entry, null);
});

test("legacy-only Work Center records remain unchanged", () => {
  const legacyJob = {
    id: "legacy-only",
    requestId: 99,
    schedule: { requestId: 99, status: "scheduled" },
  };
  const result = mergeCanonicalWorkCenterEntries([legacyJob], []);

  assert.equal(result.length, 1);
  assert.equal(result[0], legacyJob);
});

test("staging discovery resolves request identity through authorized conversation detail", async () => {
  const calls = [];
  const authFetchImpl = async (endpoint, options) => {
    calls.push({ endpoint, options });
    if (endpoint === "/conversations?perspective=professional") {
      return {
        response: { ok: true, status: 200 },
        data: {
          conversations: [
            {
              conversation_id: 340,
              source: { type: "request" },
              request_title: canonicalSummary.project_title,
              display: { name: "Liam Molina" },
              status: { value: "active", archived: false },
              permissions: { canSendMessages: true },
            },
          ],
        },
      };
    }

    assert.equal(endpoint, "/conversations/340");
    return {
      response: { ok: true, status: 200 },
      data: {
        success: true,
        conversation: { id: 340, type: "request", status: "active" },
        participants: {
          homeowner: { displayName: "Liam Molina" },
        },
        relationship: {
          id: 72,
          requestId: 41,
          title: canonicalSummary.project_title,
        },
        permissions: {
          canRead: true,
          canSendMessages: true,
          canManageWorkflow: false,
        },
      },
    };
  };

  const result = await fetchCanonicalWorkCenterEntries({
    apiUrl: STAGING_API_URL,
    authFetchImpl,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].postId, 41);
  assert.equal(result.entries[0].lifecycleContractVersion, null);
  assert.deepEqual(
    calls.map((call) => call.endpoint),
    ["/conversations?perspective=professional", "/conversations/340"]
  );
  assert.equal(calls.every((call) => call.options.cache === "no-store"), true);
});

test("production containment fails closed without issuing discovery calls", async () => {
  let callCount = 0;
  const result = await fetchCanonicalWorkCenterEntries({
    apiUrl: "https://api.getmeetro.com",
    authFetchImpl: async () => {
      callCount += 1;
      throw new Error("production discovery should remain disabled");
    },
  });

  assert.equal(isCanonicalWorkCenterHydrationEnabled(STAGING_API_URL), true);
  assert.equal(isCanonicalWorkCenterHydrationEnabled("https://api.getmeetro.com"), false);
  assert.equal(result.status, "disabled");
  assert.deepEqual(result.entries, []);
  assert.equal(callCount, 0);
});

test("dashboard selection exposes canonical evidence without legacy command controls", () => {
  const source = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /mergeCanonicalWorkCenterEntries/);
  assert.match(source, /setIsWorkCenterSectionOpen\(false\);\s*setSelectedWorkCenterJob\(job\)/);
  assert.match(source, /setSelectedWorkCenterJob\(job\)/);
  assert.match(source, /!isCanonicalReadOnlyJob && \(/);
  assert.match(source, /showLifecycleAuthorityUnavailable/);
});
