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

test("Worked With is already durable and does not expose Save Professional", () => {
  assert.doesNotMatch(
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

test("Worked With exposes Request New Work without bookmark authority", () => {
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

  assert.doesNotMatch(
    workedWithBlock,
    /saveProfessional|actions\.save|actions\.saved/
  );

  assert.doesNotMatch(
    workedWithBlock,
    /request_selection|professional_response|createRelationship/i
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

test("public professional profile does not offer a new Save after Worked With", () => {
  assert.match(
    contractorDetails,
    /listHomeownerProfessionals/
  );

  assert.match(
    contractorDetails,
    /directory\.workedWith\.some/
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
    /savedProfessionalState\.workedWith\s*&&\s*!savedProfessionalState\.saved/
  );

  assert.match(
    contractorDetails,
    /!savedProfessionalState\.workedWith\s*\|\|\s*savedProfessionalState\.saved/
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

test("My Professionals exposes exactly one Find Professionals action", () => {
  assert.equal(
    (
      myProfessionals.match(
        /\{copy\.find\}/g
      ) || []
    ).length,
    1
  );

  assert.equal(
    (
      myProfessionals.match(
        /onClick=\{openProfessionalDiscovery\}/g
      ) || []
    ).length,
    1
  );

  assert.doesNotMatch(
    myProfessionals,
    /emptyFindButton/
  );
});
