import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const myProfessionals =
  readFileSync(
    "src/pages/MyProfessionals.jsx",
    "utf8"
  );

const contractorDetails =
  readFileSync(
    "src/pages/ContractorDetails.jsx",
    "utf8"
  );

const api =
  readFileSync(
    "src/utils/homeownerProfessionalsApi.js",
    "utf8"
  );

test("Worked With and Saved use canonical Save and Remove commands", () => {
  assert.match(
    myProfessionals,
    /saveHomeownerProfessional/
  );

  assert.match(
    myProfessionals,
    /removeHomeownerSavedProfessional/
  );

  assert.match(
    api,
    /\/my-professionals\/\$\{profileId\}\/\$\{action\}/
  );

  assert.match(
    api,
    /"Idempotency-Key"/
  );
});

test("Worked With Save does not create or imitate relationship authority", () => {
  assert.match(
    myProfessionals,
    /professional\.saved/
  );

  assert.doesNotMatch(
    myProfessionals,
    /request_selection|professional_response|relationshipId\s*=|createRelationship/i
  );
});

test("both My Professionals sections can open the exact public professional profile", () => {
  assert.match(
    myProfessionals,
    /contractorDetailsReturnPage",\s*"myProfessionals"/
  );

  assert.match(
    myProfessionals,
    /setPage\("contractorDetails"\)/
  );

  assert.match(
    myProfessionals,
    /professional\.contractorProfileId/
  );

  assert.match(
    myProfessionals,
    /professional\.professionalUserId/
  );
});

test("professional profile returns to My Professionals when opened from that workspace", () => {
  assert.match(
    contractorDetails,
    /returnPage === "myProfessionals"/
  );

  assert.match(
    contractorDetails,
    /setPage\("myProfessionals"\)/
  );
});

test("public professional profile exposes canonical homeowner Save and Remove", () => {
  assert.match(
    contractorDetails,
    /listHomeownerProfessionals/
  );

  assert.match(
    contractorDetails,
    /saveHomeownerProfessional/
  );

  assert.match(
    contractorDetails,
    /removeHomeownerSavedProfessional/
  );

  assert.match(
    contractorDetails,
    /data-homeowner-saved-professional-action="canonical"/
  );
});

test("Saved Professional interaction does not use browser storage as authority", () => {
  assert.doesNotMatch(
    myProfessionals,
    /savedProfessionals|favoriteProfessionals|trustedProfessionals/
  );

  assert.doesNotMatch(
    contractorDetails,
    /localStorage\.setItem\(\s*"savedProfessionals"/
  );

  assert.doesNotMatch(
    contractorDetails,
    /localStorage\.setItem\(\s*"favoriteProfessionals"/
  );
});
