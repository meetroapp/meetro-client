import test from "node:test";
import assert from "node:assert/strict";

import {
  getMaterialsForService,
  getMaterialsLibrary,
  getMaterialsLibraryReport,
  MATERIALS_LIBRARY_REGISTRY,
} from "../src/utils/materialsLibraryRegistry.js";

test("exports read-only material groups for MVP service types", () => {
  const report = getMaterialsLibraryReport();

  assert.equal(report.readOnly, true);
  assert.ok(report.serviceTypes.includes("door_replacement"));
  assert.ok(report.serviceTypes.includes("drywall_repair"));
  assert.ok(report.serviceTypes.includes("cabinet_replacement"));
  assert.ok(report.serviceTypes.includes("tile_repair"));
  assert.ok(report.materialCount > report.serviceTypeCount);
});

test("lists common Door Replacement materials", () => {
  const doorReplacement = getMaterialsForService("door_replacement");

  assert.equal(doorReplacement.serviceLabel, "Door Replacement");
  assert.deepEqual(doorReplacement.materials, [
    "Door slab / prehung door",
    "Hinges",
    "Door knob / lockset",
    "Trim / casing",
    "Shims",
    "Screws",
    "Caulk",
    "Paint / touch-up",
  ]);
});

test("lists common Drywall Repair materials", () => {
  const drywallRepair = getMaterialsForService("drywall_repair");

  assert.deepEqual(drywallRepair.materials, [
    "Drywall sheet / patch",
    "Joint compound",
    "Tape",
    "Sandpaper",
    "Texture",
    "Primer",
    "Paint",
  ]);
});

test("lists common Cabinet Replacement and Tile Repair materials", () => {
  assert.deepEqual(getMaterialsForService("cabinet_replacement").materials, [
    "Cabinet box",
    "Fasteners",
    "Shims",
    "Trim",
    "Caulk",
    "Pulls / knobs",
  ]);

  assert.deepEqual(getMaterialsForService("tile_repair").materials, [
    "Tile",
    "Thinset",
    "Grout",
    "Spacers",
    "Backer board if needed",
    "Sealer",
  ]);
});

test("normalizes service lookups and fails safely for unknown services", () => {
  assert.equal(
    getMaterialsForService("Door Replacement").serviceType,
    "door_replacement"
  );
  assert.equal(getMaterialsForService("unknown_service"), null);
  assert.deepEqual(getMaterialsLibrary({ serviceType: "unknown_service" }), []);
});

test("registry definitions and read helpers are protected from caller mutation", () => {
  assert.throws(
    () => {
      MATERIALS_LIBRARY_REGISTRY.door_replacement.materials.push("mutated");
    },
    {
      name: "TypeError",
    }
  );

  const materials = getMaterialsForService("door_replacement");
  materials.materials.push("caller mutation");

  assert.ok(
    !getMaterialsForService("door_replacement").materials.includes(
      "caller mutation"
    )
  );
});
