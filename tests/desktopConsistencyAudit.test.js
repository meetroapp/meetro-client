import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const auditSource = fs.readFileSync(
  new URL("../docs/KnowledgeBase/DESKTOP_CONSISTENCY_AUDIT_PHASE_3.md", import.meta.url),
  "utf8"
);
const registrySource = fs.readFileSync(
  new URL("../docs/KnowledgeBase/MEETRO_SURFACE_REGISTRY.md", import.meta.url),
  "utf8"
);

test("desktop consistency audit documents Phase 3 scope and correction boundaries", () => {
  assert.match(auditSource, /# Desktop Consistency Audit Phase 3/);
  assert.match(auditSource, /Implemented Corrections/);
  assert.match(auditSource, /Future Architectural Ideas/);
  assert.match(auditSource, /No runtime UI, routing, storage, backend, projection, or workflow logic was changed\./);
  assert.match(auditSource, /Does this preserve one Meetro desktop home\?/);
});

test("desktop consistency audit covers newly named desktop-enabled surfaces", () => {
  assert.match(auditSource, /Request Creation/);
  assert.match(auditSource, /Project Details/);
  assert.match(auditSource, /Emergency/);
  assert.match(auditSource, /Communication Center/);
  assert.match(auditSource, /Professional Business Dashboard/);
  assert.match(auditSource, /Desktop Hosted Profile Card/);
});

test("surface registry names request, project, and emergency ownership explicitly", () => {
  assert.match(registrySource, /### Request Creation/);
  assert.match(registrySource, /Route \/ Component: `src\/pages\/Upload\.jsx`/);
  assert.match(registrySource, /### Project Details/);
  assert.match(registrySource, /Route \/ Component: `src\/pages\/ProjectDetails\.jsx`/);
  assert.match(registrySource, /### Emergency/);
  assert.match(registrySource, /Route \/ Component: `src\/pages\/Emergency\.jsx`/);
  assert.match(registrySource, /Emergency rows in Messages are conversation rows with emergency styling only\./);
});
