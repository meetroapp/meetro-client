import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HOMEOWNER_REQUEST_MODIFICATION_ENTRY,
  getHomeownerRequestModificationEntry,
  normalizeHomeownerRequestModificationAuthority,
} from "../src/utils/homeownerRequestModificationPolicy.js";

const projectDetailsSource = readFileSync(
  new URL("../src/pages/ProjectDetails.jsx", import.meta.url),
  "utf8"
);

function authority(mode, actions, overrides = {}) {
  return normalizeHomeownerRequestModificationAuthority({
    lifecycle: {
      modificationAuthority: {
        mode,
        requestVersion: 4,
        lifecycleContractVersion: 2,
        concernId: "7a02ee20-7f32-48eb-96dc-a3217bc5dcda",
        jobId: "7e742dc1-e2a2-49c6-a493-11e351c80d54",
        reliance: {
          professionalResponseExists: true,
          requestRelationshipExists: true,
          selectionExists: true,
          jobExists: true,
          activeWorkExists: false,
        },
        actions,
        ...overrides,
      },
    },
  });
}

test("EDITABLE enters only the existing canonical homeowner request detail flow", () => {
  const entry = getHomeownerRequestModificationEntry(
    authority("EDITABLE", {
      editRequest: true,
      appendUpdate: false,
      appendPhoto: false,
      contractChangeGuidance: false,
      readOnly: false,
    })
  );

  assert.deepEqual(entry, {
    kind: HOMEOWNER_REQUEST_MODIFICATION_ENTRY.EDIT_REQUEST,
    actionable: true,
    route: "homeownerRequestDetails",
  });
});

test("APPEND_ONLY enters bounded canonical add-information actions", () => {
  const entry = getHomeownerRequestModificationEntry(
    authority("APPEND_ONLY", {
      editRequest: false,
      appendUpdate: true,
      appendPhoto: true,
      contractChangeGuidance: false,
      readOnly: false,
    })
  );

  assert.deepEqual(entry, {
    kind: HOMEOWNER_REQUEST_MODIFICATION_ENTRY.APPEND_INFORMATION,
    actionable: true,
    route: "homeownerRequestDetails",
  });
  assert.notEqual(entry.kind, HOMEOWNER_REQUEST_MODIFICATION_ENTRY.EDIT_REQUEST);
});

test("CONTRACT_CHANGE_REQUIRED cannot directly edit or simulate a change request", () => {
  const entry = getHomeownerRequestModificationEntry(
    authority(
      "CONTRACT_CHANGE_REQUIRED",
      {
        editRequest: false,
        appendUpdate: true,
        appendPhoto: true,
        contractChangeGuidance: true,
        readOnly: false,
      },
      { reliance: { activeWorkExists: true } }
    )
  );

  assert.deepEqual(entry, {
    kind: HOMEOWNER_REQUEST_MODIFICATION_ENTRY.CONTRACT_CHANGE_UNAVAILABLE,
    actionable: false,
    route: null,
  });
});

test("READ_ONLY and unconfirmed authority expose no active route", () => {
  const readOnly = getHomeownerRequestModificationEntry(
    authority("READ_ONLY", {
      editRequest: false,
      appendUpdate: false,
      appendPhoto: false,
      contractChangeGuidance: false,
      readOnly: true,
    })
  );

  assert.equal(readOnly.kind, HOMEOWNER_REQUEST_MODIFICATION_ENTRY.READ_ONLY);
  assert.equal(readOnly.actionable, false);
  assert.equal(readOnly.route, null);
  assert.equal(
    getHomeownerRequestModificationEntry(null).kind,
    HOMEOWNER_REQUEST_MODIFICATION_ENTRY.UNAVAILABLE
  );
});

test("Project Journey uses exact server-owned request and Job authority", () => {
  assert.match(
    projectDetailsSource,
    /fetchHomeownerRequestModification\(\{ requestId, setPage \}\)/
  );
  assert.match(projectDetailsSource, /lifecycleRequestId !== requestId/);
  assert.match(
    projectDetailsSource,
    /authorityJobId && authorityJobId !== jobId/
  );
  assert.match(
    projectDetailsSource,
    /requestModificationState\.requestId !== requestId/
  );
  assert.match(
    projectDetailsSource,
    /authorityJobId !== requestModificationState\.jobId/
  );
  assert.match(
    projectDetailsSource,
    /data-request-modification-relationship-id=\{[\s\S]*requestModificationState\.requestRelationshipId/
  );
  assert.match(
    projectDetailsSource,
    /localStorage\.setItem\("selectedHomeownerRequestId", String\(requestId\)\)/
  );
  assert.match(projectDetailsSource, /setPage\(requestModificationEntry\.route\)/);
});

test("Project Journey never restores browser-local request modification authority", () => {
  const handler = projectDetailsSource.slice(
    projectDetailsSource.indexOf("function openRequestModification()"),
    projectDetailsSource.indexOf("useEffect(() => {", projectDetailsSource.indexOf("function openRequestModification()"))
  );

  assert.doesNotMatch(projectDetailsSource, /meetroOpenHomeownerRequestEdit/);
  assert.doesNotMatch(projectDetailsSource, /hasApprovedQuote/);
  assert.doesNotMatch(projectDetailsSource, /Create Change Order|Update Agreement/);
  assert.doesNotMatch(handler, /title|customerName|professionalName|array/i);
  assert.match(
    projectDetailsSource,
    /That customer action is not available here yet; the[\s\S]*original request remains unchanged\./
  );
});

test("desktop and compact Project Journey actions retain a 44px target", () => {
  assert.match(
    projectDetailsSource,
    /const requestDetailsActionButton = \{[\s\S]*minHeight: "44px"/
  );
  assert.match(
    projectDetailsSource,
    /data-request-modification-kind=\{[\s\S]*requestModificationEntry\.kind/
  );
});
