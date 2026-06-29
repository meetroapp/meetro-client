import assert from "node:assert/strict";
import test from "node:test";

import {
  findSharedRequestForLead,
  getEligibleSharedProfessionalLeads,
  isDemoOrSeedLead,
  isProfessionalLeadQaModeEnabled,
  purgeProfessionalLeadCaches,
  shouldUseBackendPostForProfessionalLead,
} from "../src/utils/businessLeadSourceTruth.js";
import { buildProfessionalSpecialtyProfile } from "../src/utils/professionalOnboardingSpecialties.js";
import { enrichRequestWithMatchingFields } from "../src/utils/requestMatchingFields.js";

function createStorage(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    removeItem(key) {
      store.delete(key);
    },
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

function professional(fields = {}) {
  const category = fields.category || "handyman";
  const specialties = fields.specialties || [category];

  return {
    ...buildProfessionalSpecialtyProfile({ selectedSpecialties: specialties }),
    businessCategory: category,
    businessServiceSpecialties: specialties,
    serviceZipCodes: fields.zip || "33904",
  };
}

function request(fields = {}) {
  return enrichRequestWithMatchingFields({
    requestId: fields.requestId,
    title: fields.title,
    category: fields.category || "handyman",
    status: fields.status || "open",
    zip: fields.zip || "33904",
    localDemoSafe: fields.localDemoSafe,
  });
}

test("Business Leads uses shared request truth for backend posts in normal mode", () => {
  const sharedRequests = [
    {
      requestId: "request-real",
      title: "Garage opener install",
      status: "open",
    },
  ];

  assert.equal(
    shouldUseBackendPostForProfessionalLead(
      { id: "request-real", title: "Garage opener install" },
      sharedRequests,
      { qaMode: false }
    ),
    true
  );

  assert.equal(
    shouldUseBackendPostForProfessionalLead(
      { id: "old-seed-1", title: "Old demo faucet lead" },
      sharedRequests,
      { qaMode: false }
    ),
    false
  );
});

test("homeowner-hidden and moved-on requests do not appear as new backend leads", () => {
  const sharedRequests = [
    {
      requestId: "request-scheduled",
      title: "Scheduled repair",
      status: "scheduled",
    },
    {
      requestId: "request-closed",
      title: "Closed repair",
      status: "closed",
    },
    {
      requestId: "request-archived",
      title: "Archived repair",
      status: "open",
      archived: true,
    },
  ];

  for (const request of sharedRequests) {
    assert.equal(
      shouldUseBackendPostForProfessionalLead(
        { id: request.requestId, title: request.title },
        sharedRequests,
        { qaMode: false }
      ),
      false
    );
  }
});

test("accepted or connected requests are excluded from new professional leads", () => {
  const connectedRequests = [
    request({
      requestId: "request-assigned-professional",
      title: "Assigned repair",
      status: "open",
      category: "painting",
      zip: "33904",
    }),
    request({
      requestId: "request-selected-business",
      title: "Selected business repair",
      status: "open",
      category: "painting",
      zip: "33904",
    }),
    request({
      requestId: "request-provider",
      title: "Provider repair",
      status: "open",
      category: "painting",
      zip: "33904",
    }),
  ].map((item, index) => ({
    ...item,
    ...(index === 0 ? { assignedProfessionalId: "business-1" } : {}),
    ...(index === 1 ? { selectedBusinessId: "business-1" } : {}),
    ...(index === 2 ? { providerId: "business-1" } : {}),
  }));

  assert.deepEqual(
    getEligibleSharedProfessionalLeads(
      connectedRequests,
      professional({ category: "painting", specialties: ["painting"], zip: "33904" })
    ),
    []
  );
});

test("new eligible request still appears in professional leads", () => {
  const requests = [
    request({
      requestId: "request-new-opportunity",
      title: "Interior painting",
      status: "open",
      category: "painting",
      zip: "33904",
    }),
  ];

  assert.deepEqual(
    getEligibleSharedProfessionalLeads(
      requests,
      professional({ category: "painting", specialties: ["painting"], zip: "33904" })
    ).map((item) => item.requestId),
    ["request-new-opportunity"]
  );
});

test("demo and seed backend leads appear only in explicit DEV QA mode", () => {
  const demoLead = { id: "demo-old-lead", title: "Demo kitchen lead" };

  assert.equal(isDemoOrSeedLead(demoLead), true);
  assert.equal(
    shouldUseBackendPostForProfessionalLead(demoLead, [], { qaMode: false }),
    false
  );
  assert.equal(
    shouldUseBackendPostForProfessionalLead(demoLead, [], { qaMode: true }),
    true
  );
});

test("QA lead mode is disabled in production even if the local flag exists", () => {
  const storage = createStorage({ meetroQaLeadMode: "true" });

  assert.equal(
    isProfessionalLeadQaModeEnabled({ dev: false, storage }),
    false
  );
  assert.equal(
    isProfessionalLeadQaModeEnabled({ dev: true, storage }),
    true
  );
});

test("old local professional lead caches are purged without touching homeowner requests", () => {
  const storage = createStorage({
    businessLeads: JSON.stringify([{ id: "stale-lead" }]),
    meetroPostsCache: JSON.stringify([{ id: "stale-post" }]),
    homeownerRequests: JSON.stringify([{ requestId: "real-request" }]),
  });
  const sessionStorage = createStorage({
    contractorLeads: JSON.stringify([{ id: "session-stale" }]),
  });

  const purged = purgeProfessionalLeadCaches({ storage, sessionStorage });

  assert.deepEqual(purged.localStorage.sort(), ["businessLeads", "meetroPostsCache"]);
  assert.deepEqual(purged.sessionStorage, ["contractorLeads"]);
  assert.equal(storage.getItem("businessLeads"), null);
  assert.equal(storage.getItem("meetroPostsCache"), null);
  assert.equal(storage.getItem("homeownerRequests"), JSON.stringify([{ requestId: "real-request" }]));
});

test("lead cache purge tolerates unavailable browser storage", () => {
  const throwingStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    removeItem() {
      throw new Error("storage unavailable");
    },
  };

  assert.deepEqual(
    purgeProfessionalLeadCaches({
      storage: throwingStorage,
      sessionStorage: throwingStorage,
    }),
    { localStorage: [], sessionStorage: [] }
  );
  assert.equal(
    isProfessionalLeadQaModeEnabled({ dev: true, storage: throwingStorage }),
    false
  );
});

test("lead source helpers fail closed for malformed request collections", () => {
  assert.equal(findSharedRequestForLead({ id: "request-1" }, null), undefined);
  assert.deepEqual(
    getEligibleSharedProfessionalLeads(null, professional({ category: "painting", specialties: ["painting"] })),
    []
  );
  assert.equal(
    shouldUseBackendPostForProfessionalLead(
      { id: "request-1", title: "Interior painting" },
      null,
      { qaMode: false }
    ),
    false
  );
});

test("Business Dashboard and Business Leads share the same eligible request projection", () => {
  const requests = [
    request({
      requestId: "request-open",
      title: "Interior painting",
      status: "open",
      category: "painting",
      zip: "33904",
    }),
    request({
      requestId: "request-active",
      title: "Already scheduled",
      status: "scheduled",
      category: "painting",
      zip: "33904",
    }),
    request({
      requestId: "request-far",
      title: "Far away repair",
      status: "open",
      category: "painting",
      zip: "33101",
    }),
  ];

  const eligible = getEligibleSharedProfessionalLeads(
    requests,
    professional({ category: "painting", specialties: ["painting"], zip: "33904" })
  );

  assert.deepEqual(
    eligible.map((item) => item.requestId),
    ["request-open"]
  );
});

test("shared request matching avoids title fallback when both sides have ids", () => {
  const sharedRequests = [
    {
      requestId: "request-current",
      title: "Same title",
      status: "open",
    },
  ];

  assert.equal(
    findSharedRequestForLead({ id: "stale-backend", title: "Same title" }, sharedRequests),
    undefined
  );
  assert.equal(
    findSharedRequestForLead({ title: "Same title" }, sharedRequests),
    undefined
  );
});
