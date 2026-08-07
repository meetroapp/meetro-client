import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  new URL("../src/components/HomeownerProfessionalResponseReview.jsx", import.meta.url),
  "utf8"
);
const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);

test("expanded homeowner requests mount the canonical Professional Response review surface", () => {
  assert.match(
    myRequestsSource,
    /<HomeownerProfessionalResponseReview[\s\S]*requestId=\{requestId\}[\s\S]*setPage=\{setPage\}/
  );
  assert.match(componentSource, /getHomeownerProfessionalResponses\(requestId/);
});

test("selection requires an explicit confirmation before the canonical command", () => {
  assert.match(componentSource, /Select this professional\?/);
  assert.match(componentSource, /Confirm Selection/);
  assert.match(componentSource, /Keep Reviewing/);
  assert.match(componentSource, /confirmSelection\(response\.id\)/);
  assert.match(componentSource, /selectHomeownerProfessionalResponse\(command/);
});

test("conversation entry appears only from confirmed canonical conversation identity", () => {
  assert.match(
    componentSource,
    /response\.conversationAvailable && response\.conversationId/
  );
  assert.match(componentSource, /confirmed\?\.conversation\?\.id/);
  assert.match(
    componentSource,
    /buildCanonicalConversationRoute\([\s\S]*conversationId,[\s\S]*"myRequests",[\s\S]*shell: "communicationCenter"/
  );
  assert.match(componentSource, /Continue Conversation/);
});

test("homeowner UI creates no browser selection, conversation, or lifecycle authority", () => {
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(componentSource, /Date\.now|Math\.random/);
  assert.doesNotMatch(componentSource, /status\s*:\s*["'](?:selected|active)["']/);
  assert.doesNotMatch(componentSource, /conversationId\s*:\s*(?:crypto|globalThis\.crypto)/);
});

test("selection UI is mobile-contained and exposes no protected post-selection location", () => {
  assert.match(componentSource, /minWidth: 0/);
  assert.match(componentSource, /overflow: "hidden"/);
  assert.match(componentSource, /overflowWrap: "anywhere"/);
  assert.doesNotMatch(
    componentSource,
    /service_location|unit_number|access_notes|gate_code|professional_email|professional_phone/
  );
});
