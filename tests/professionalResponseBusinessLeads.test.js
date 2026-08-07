import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  normalizeRequestConversations,
} from "../src/utils/requestCommunication.js";

const leadsSource = readFileSync(
  new URL("../src/pages/BusinessLeads.jsx", import.meta.url),
  "utf8"
);

function opportunity(overrides = {}) {
  return {
    id: 41,
    request_id: 41,
    title: "Repair drywall",
    description: "Patch wall damage",
    status: "open",
    has_responded: false,
    professional_response_id: null,
    response_status: null,
    relationship_status: null,
    submitted_at: null,
    response_submission_available: true,
    ...overrides,
  };
}

test("ordinary opportunities normalize backend-derived response authority only", () => {
  const [available, responded, malformed] = normalizeRequestConversations(
    {
      opportunities: [
        opportunity(),
        opportunity({
          id: 42,
          request_id: 42,
          professional_response_id: "901",
          has_responded: true,
          response_status: "submitted",
          relationship_status: "pending",
          submitted_at: "2026-08-06T12:00:00.000Z",
          response_submission_available: false,
        }),
        opportunity({
          id: 43,
          request_id: 43,
          professional_response_id: "902",
          has_responded: true,
          response_status: "selected",
          relationship_status: "active",
          response_submission_available: false,
        }),
      ],
    },
    "business"
  );

  assert.equal(available.responseSubmissionAvailable, true);
  assert.equal(available.hasResponded, false);
  assert.equal(responded.hasResponded, true);
  assert.equal(responded.professionalResponseId, 901);
  assert.equal(responded.responseStatus, "submitted");
  assert.equal(responded.relationshipStatus, "pending");
  assert.equal(malformed.hasResponded, false);
  assert.equal(malformed.responseSubmissionAvailable, false);
});

test("Business Leads waits for canonical submission and refreshes the authoritative collection", () => {
  assert.match(leadsSource, /await submitProfessionalResponse\(/);
  assert.match(leadsSource, /responseState\.phase === "confirmed"/);
  assert.match(leadsSource, /await requestProfessionalOpportunities\(\{/);
  assert.match(leadsSource, /trigger: "response-mutation"/);
  assert.match(leadsSource, /force: true/);
  assert.match(leadsSource, /professionalResponseSubmitted/);
  assert.match(leadsSource, /professionalResponsePendingReview/);
});

test("Business Leads exposes no pre-selection conversation or browser authority", () => {
  const responseHandler = leadsSource.slice(
    leadsSource.indexOf("async function respondToProfessionalOpportunity"),
    leadsSource.indexOf("useEffect", leadsSource.indexOf("async function respondToProfessionalOpportunity"))
  );

  assert.doesNotMatch(responseHandler, /localStorage|sessionStorage/);
  assert.doesNotMatch(
    responseHandler,
    /conversationId|participantId|\/messages|setPage\(.*conversation/i
  );
  assert.doesNotMatch(responseHandler, /Date\.now|Math\.random|randomUUID/);
  assert.match(
    leadsSource,
    /professionalResponsePreselectionBoundary/
  );
});

test("response form remains bounded and reports deterministic errors", () => {
  assert.match(leadsSource, /maxLength=\{2000\}/);
  assert.match(leadsSource, /disabled=\{responseState\.phase === "submitting"\}/);
  assert.match(leadsSource, /role="alert"/);
  assert.match(leadsSource, /maxWidth: "100%"/);
  assert.match(leadsSource, /boxSizing: "border-box"/);
});
