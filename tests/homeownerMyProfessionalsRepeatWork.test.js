import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const myProfessionals =
  readFileSync(
    "src/pages/MyProfessionals.jsx",
    "utf8"
  );

const upload =
  readFileSync(
    "src/pages/Upload.jsx",
    "utf8"
  );

const routeUtility =
  readFileSync(
    "src/utils/existingCustomerRequestRoute.js",
    "utf8"
  );

test("Worked With exposes Request New Work using exact Meetro relationship provenance", () => {
  const workedWithStart =
    myProfessionals.indexOf(
      "state.workedWith.map"
    );

  const savedStart =
    myProfessionals.indexOf(
      "state.saved.length",
      workedWithStart
    );

  const workedWithBlock =
    myProfessionals.slice(
      workedWithStart,
      savedStart
    );

  assert.ok(workedWithStart >= 0);
  assert.ok(savedStart > workedWithStart);

  assert.match(
    workedWithBlock,
    /requestNewWork/
  );

  assert.match(
    myProfessionals,
    /professional\.meetroRelationshipId/
  );

  assert.match(
    myProfessionals,
    /buildExistingCustomerRequestRoute/
  );
});

test("Saved section alone does not grant Request New Work authority", () => {
  const savedStart =
    myProfessionals.indexOf(
      "state.saved.map"
    );

  const savedBlock =
    myProfessionals.slice(
      savedStart,
      myProfessionals.indexOf(
        "emptySaved",
        savedStart
      )
    );

  assert.ok(savedStart >= 0);

  assert.doesNotMatch(
    savedBlock,
    /requestNewWork/
  );
});

test("Request New Work clears prior request draft scope before opening", () => {
  assert.match(
    myProfessionals,
    /clearAssistantRequestDraft\(\s*sessionStorage\s*\)/
  );

  assert.match(
    myProfessionals,
    /clearAssistantRequestDraft\(\s*localStorage\s*\)/
  );

  assert.doesNotMatch(
    myProfessionals,
    /previousQuote|previousApproval|previousDeposit|previousSchedule|previousJob/i
  );
});

test("Upload keeps persisted draft snapshot neutral and applies relationship authority only at send", () => {
  assert.match(
    upload,
    /submittedPayloadSnapshot = \{[\s\S]*body: buildJobRequestDraftCanonicalPayload/
  );

  assert.match(
    upload,
    /applyExistingCustomerRequestAuthority\(\s*submittedPayloadSnapshot\.body,\s*existingCustomerRequestRoute\s*\)/
  );

  assert.match(
    upload,
    /body: JSON\.stringify\(requestBody\)/
  );
});

test("repeat-work request cannot send client-selected target business identity", () => {
  assert.doesNotMatch(
    routeUtility,
    /body\.target_contractor_profile_id\s*=/
  );

  assert.doesNotMatch(
    routeUtility,
    /body\.target_professional_user_id\s*=/
  );

  assert.match(
    routeUtility,
    /body\.source_meetro_relationship_id\s*=/
  );
});

test("repeat-work Upload visibly states prior lifecycle state does not carry forward", () => {
  assert.match(
    upload,
    /Previous scope, Quotes, approvals, payments, scheduling, and work state do not carry forward/
  );

  assert.match(
    upload,
    /data-existing-customer-request/
  );
});

test("cancel and post-submit exit return repeat-work homeowner to My Professionals", () => {
  assert.match(
    upload,
    /existingCustomerRequestRoute\.active[\s\S]*\?\s*"myProfessionals"[\s\S]*:\s*"home"/
  );

  assert.match(
    upload,
    /existingCustomerRequestCopy\.returnLabel/
  );
});

test("repeat-work copy describes the already-selected professional instead of marketplace discovery", () => {
  assert.match(
    upload,
    /serviceGuidance: \(name\) =>/
  );

  assert.match(
    upload,
    /Choose the service that best describes this new work for/
  );

  assert.match(
    upload,
    /categoryTitle:\s*"What type of work is this\?"/
  );

  assert.match(
    upload,
    /existingCustomerRequestCopy\.serviceGuidance/
  );

  assert.equal(
    (
      upload.match(
        /existingCustomerRequestCopy\.categoryTitle/g
      ) || []
    ).length,
    2
  );

  assert.equal(
    (
      upload.match(
        /existingCustomerRequestCopy\.categoryHelp/g
      ) || []
    ).length,
    2
  );
});
