import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EMERGENCY_SERVICE_OPTIONS,
  isUnsupportedLegacyEmergencySpecialty,
  normalizeCanonicalEmergencySpecialty,
  normalizeEmergencySpecialtyForDisplay,
} from "../src/utils/emergencySpecialties.js";

const emergencySource = readFileSync(
  new URL("../src/pages/Emergency.jsx", import.meta.url),
  "utf8"
);
const requestSource = readFileSync(
  new URL("../src/pages/EmergencyRequest.jsx", import.meta.url),
  "utf8"
);

const CANONICAL_VALUES = [
  "emergency_plumbing",
  "emergency_electrical_service",
  "roof_leak_repair",
  "emergency_lockout",
  "handyman",
];

test("Emergency exposes exactly the five approved canonical specialties", () => {
  assert.equal(EMERGENCY_SERVICE_OPTIONS.length, 5);
  assert.deepEqual(
    EMERGENCY_SERVICE_OPTIONS.map((option) => option.value),
    CANONICAL_VALUES
  );
  assert.equal(
    EMERGENCY_SERVICE_OPTIONS.every(
      (option) => option.domain === "home_services"
    ),
    true
  );
});

test("all five landing cards carry their own canonical values", () => {
  assert.match(
    emergencySource,
    /buildEmergencyDraftRoute\(service\.value\)/
  );

  for (const specialty of CANONICAL_VALUES) {
    assert.equal(
      normalizeCanonicalEmergencySpecialty(specialty),
      specialty
    );
  }
});

test("navigation hints never accept legacy display aliases", () => {
  for (const unsupported of [
    "locksmith",
    "storm_preparation",
    "roofing",
    "electrical",
    "plumbing_repairs",
  ]) {
    assert.equal(
      normalizeCanonicalEmergencySpecialty(unsupported),
      ""
    );
  }
});

test("landing page and request selector consume one curated inventory", () => {
  assert.match(
    emergencySource,
    /EMERGENCY_SERVICE_OPTIONS\.map/
  );
  assert.match(
    requestSource,
    /EMERGENCY_SERVICE_OPTIONS\.map/
  );
  assert.doesNotMatch(emergencySource, /services:\s*\[/);
  assert.doesNotMatch(requestSource, /const SERVICE_OPTIONS/);
});

test("unsupported and broad legacy identifiers are not selectable", () => {
  const activeValues = new Set(
    EMERGENCY_SERVICE_OPTIONS.map((option) => option.value)
  );

  for (const unsupported of [
    "locksmith",
    "storm_preparation",
    "roofing",
    "electrical",
    "plumbing_repairs",
  ]) {
    assert.equal(activeValues.has(unsupported), false);
  }
});

test("Emergency Lockout submits the canonical lockout specialty", () => {
  const lockout = EMERGENCY_SERVICE_OPTIONS.find(
    (option) => option.label.en === "Emergency Lockout"
  );

  assert.equal(lockout?.value, "emergency_lockout");
  assert.match(
    requestSource,
    /serviceSpecialty:\s*selectedService\?\.value/
  );
});

test("preselection stays editable and payload follows the current selection", () => {
  assert.match(
    requestSource,
    /value=\{form\.service\}[\s\S]*?onChange=\{\(event\) =>[\s\S]*?updateForm\("service", event\.target\.value\)/
  );
  assert.match(
    requestSource,
    /serviceSpecialty:\s*selectedService\?\.value/
  );
  assert.doesNotMatch(
    requestSource,
    /id="emergency-service"[\s\S]{0,200}disabled=\{true\}/
  );
});

test("legacy draft aliases normalize only to approved display values", () => {
  assert.deepEqual(
    {
      plumbing_repairs:
        normalizeEmergencySpecialtyForDisplay("plumbing_repairs"),
      electrical:
        normalizeEmergencySpecialtyForDisplay("electrical"),
      roofing:
        normalizeEmergencySpecialtyForDisplay("roofing"),
      locksmith:
        normalizeEmergencySpecialtyForDisplay("locksmith"),
    },
    {
      plumbing_repairs: "emergency_plumbing",
      electrical: "emergency_electrical_service",
      roofing: "roof_leak_repair",
      locksmith: "emergency_lockout",
    }
  );
});

test("canonical drafts resume without translation", () => {
  for (const specialty of CANONICAL_VALUES) {
    assert.equal(
      normalizeEmergencySpecialtyForDisplay(specialty),
      specialty
    );
  }
});

test("legacy Storm Preparation drafts fail safe without remapping", () => {
  assert.equal(
    normalizeEmergencySpecialtyForDisplay("storm_preparation"),
    ""
  );
  assert.equal(
    isUnsupportedLegacyEmergencySpecialty("storm_preparation"),
    true
  );
  assert.match(
    requestSource,
    /Storm Preparation is no longer available/
  );
});

test("specialty contract stays presentation-only and backend-authoritative", () => {
  const specialtySource = readFileSync(
    new URL("../src/utils/emergencySpecialties.js", import.meta.url),
    "utf8"
  );

  for (const forbidden of [
    "localStorage",
    "sessionStorage",
    "authFetch",
    "fetch(",
    "serviceSpecialty:",
    "category:",
  ]) {
    assert.equal(
      specialtySource.includes(forbidden),
      false,
      `Unexpected authority in Emergency specialty metadata: ${forbidden}`
    );
  }
});
