import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { t } from "../src/utils/language.js";

const assistantSource = fs.readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);
const stylesSource = fs.readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);
const companionContextSource = fs.readFileSync(
  new URL("../src/utils/companionContext.js", import.meta.url),
  "utf8"
);
const projectDetailsSource = fs.readFileSync(
  new URL("../src/pages/ProjectDetails.jsx", import.meta.url),
  "utf8"
);
const docsPath = path.join(
  "docs",
  "KnowledgeBase",
  "COMPANION_PRESENCE_SYSTEM.md"
);

test("Companion resting state is a labeled Ask Meetro presence pill", () => {
  assert.match(assistantSource, /className="meetro-assistant-launcher"/);
  assert.match(assistantSource, /assistantButtonText/);
  assert.match(assistantSource, /assistantPresenceDot/);
  assert.match(assistantSource, /assistantCompanionAskMeetro/);
  assert.match(assistantSource, /minWidth: 126/);
  assert.doesNotMatch(assistantSource, /width: 52,\s*height: 52/);
});

test("Companion workspace guidance is separate from full conversation", () => {
  assert.match(assistantSource, /assistantCompanionPanelTitle/);
  assert.match(assistantSource, /companionWorkspaceGreeting/);
  assert.match(assistantSource, /isGuidanceMode/);
  assert.match(assistantSource, /companionGuidancePanel/);
  assert.match(assistantSource, /assistantCompanionObservation/);
  assert.match(assistantSource, /assistantCompanionRecommendation/);
  assert.match(assistantSource, /onClick=\{enterCompanionConversation\}/);
  assert.match(assistantSource, /function submitTypedQuestion\(event\)/);
  assert.match(
    assistantSource,
    /\{isConversationMode && \([\s\S]*onClick=\{startVoiceInput\}[\s\S]*assistantCompanionInputPlaceholder/
  );
});

test("Desktop companion panel floats without dimming the workspace", () => {
  assert.match(stylesSource, /@media \(min-width: 1180px\) and \(hover: hover\) and \(pointer: fine\)/);
  assert.match(stylesSource, /\.meetro-assistant-overlay \{[\s\S]*background: transparent !important/);
  assert.match(stylesSource, /backdrop-filter: none !important/);
  assert.match(stylesSource, /--meetro-layout-companion-width: 388px/);
  assert.match(stylesSource, /\.meetro-assistant-presence \{[\s\S]*width: min\(var\(--meetro-layout-companion-width\)/);
  assert.match(stylesSource, /meetro-assistant-presence-pill/);
});

test("Companion panel anchors to the launcher position on desktop and mobile", () => {
  assert.match(assistantSource, /const companionAnchorStyle = getCompanionAnchorStyle\(\{/);
  assert.match(assistantSource, /style=\{companionAnchorStyle\}/);
  assert.match(assistantSource, /function getCompanionAnchorStyle/);
  assert.doesNotMatch(assistantSource, /if \(!isDesktopCompanionSurface\(\)\) return \{\};/);
  assert.match(assistantSource, /launcherPosition \|\| fallbackLauncherPosition/);
  assert.match(assistantSource, /estimatedCompanionHeight/);
  assert.match(assistantSource, /calculateExpandedPanelPlacement\(\{/);
  assert.match(assistantSource, /maxHeight: companionAnchorStyle\.maxHeight/);
  assert.match(assistantSource, /transform: "none"/);
  assert.match(stylesSource, /align-items: flex-start !important/);
  assert.match(stylesSource, /justify-content: flex-start !important/);
  assert.match(stylesSource, /margin: 0 !important/);
});

test("Companion presence language is localized", () => {
  ["en", "es", "fr", "pt-BR"].forEach((language) => {
    assert.notEqual(t("assistantCompanionPanelTitle", language), "assistantCompanionPanelTitle");
    assert.notEqual(
      t("assistantCompanionWorkspaceGuidance", language),
      "assistantCompanionWorkspaceGuidance"
    );
    assert.notEqual(
      t("assistantCompanionObservation", language),
      "assistantCompanionObservation"
    );
    assert.notEqual(
      t("assistantCompanionRecommendation", language),
      "assistantCompanionRecommendation"
    );
    assert.notEqual(
      t("assistantCompanionRecommendationDefault", language),
      "assistantCompanionRecommendationDefault"
    );
    assert.notEqual(
      t("assistantCompanionSuggestedActions", language),
      "assistantCompanionSuggestedActions"
    );
    assert.notEqual(
      t("assistantCompanionInputPlaceholder", language),
      "assistantCompanionInputPlaceholder"
    );
    assert.notEqual(t("assistantCompanionSend", language), "assistantCompanionSend");
    assert.notEqual(t("assistantResponding", language), "assistantResponding");
  });
});

test("Companion receives request detail context from Project Details", () => {
  assert.match(projectDetailsSource, /buildRequestCompanionContext/);
  assert.match(projectDetailsSource, /writeRequestCompanionContext\(context\)/);
  assert.match(projectDetailsSource, /clearRequestCompanionContext\(\)/);
  assert.match(projectDetailsSource, /pageContext: "request_detail"/);
  assert.match(projectDetailsSource, /request: projectForPresentation/);
  assert.match(projectDetailsSource, /rolePerspective:[\s\S]*"professional"[\s\S]*"homeowner"/);
  assert.match(assistantSource, /readRequestCompanionContext/);
  assert.match(assistantSource, /pageContext: "request_detail"/);
  assert.match(assistantSource, /professional_request_detail_context/);
  assert.match(assistantSource, /homeowner_request_detail_context/);
  assert.match(assistantSource, /selectedProjectId: requestDetailContext\?\.projectId/);
  assert.match(companionContextSource, /readRequestCompanionContext/);
});

test("Companion Presence knowledge base records the law", () => {
  assert.ok(fs.existsSync(docsPath), "Companion Presence System document should exist");
  const doc = fs.readFileSync(docsPath, "utf8");

  assert.match(doc, /Law of Companion Presence/);
  assert.match(doc, /Always present/);
  assert.match(doc, /Never intrusive/);
  assert.match(doc, /Context-aware/);
  assert.match(doc, /Launcher-Anchored Panel/);
  assert.match(doc, /The launcher is the anchor/);
  assert.match(doc, /Law of Complement/);
  assert.match(doc, /Keep Workspace Guidance separate from Full Conversation/);
});

test("Companion context intelligence is documented as read-only workspace support", () => {
  const doc = fs.readFileSync(docsPath, "utf8");

  assert.match(doc, /Companion Context Model/);
  assert.match(doc, /Read-Only Context Rule/);
  assert.match(doc, /Surface-Aware Guidance/);
  assert.match(doc, /Home Base Awareness/);
  assert.match(doc, /Communication Center guidance/);
  assert.match(doc, /Work Center guidance/);
  assert.match(doc, /Business guidance/);
  assert.match(doc, /Presence -> Workspace Guidance -> Conversation/);
  assert.match(doc, /It may not write workflow state/);
});

test("Companion visual adoption uses Meetro Community surface tokens instead of AI-demo styling", () => {
  assert.match(assistantSource, /var\(--meetro-surface-paper/);
  assert.match(assistantSource, /var\(--meetro-surface-warm/);
  assert.match(assistantSource, /var\(--meetro-surface-sage/);
  assert.match(assistantSource, /var\(--meetro-color-forest/);
  assert.match(assistantSource, /var\(--meetro-color-forest-deep/);
  assert.match(assistantSource, /var\(--meetro-color-coffee/);
  assert.match(assistantSource, /var\(--meetro-shadow-soft/);
  assert.match(assistantSource, /var\(--meetro-shadow-lifted/);
  assert.match(assistantSource, /var\(--meetro-gradient-community-action/);
  assert.doesNotMatch(assistantSource, /linear-gradient\(135deg,#7c3aed,#ec4899\)/);
  assert.doesNotMatch(assistantSource, /linear-gradient\(135deg,#2563eb,#7c3aed\)/);
  assert.doesNotMatch(assistantSource, /linear-gradient\(135deg,#059669,#7c3aed\)/);
});

test("Companion Presence knowledge base captures the Wonder Pass identity", () => {
  const doc = fs.readFileSync(docsPath, "utf8");

  assert.match(doc, /Wonder Pass Visual Identity/);
  assert.match(doc, /lantern beside the workspace/);
  assert.match(doc, /notebook opened to the current page/);
  assert.match(doc, /trusted guide/);
  assert.match(doc, /warm paper surfaces/);
  assert.match(doc, /forest and deep forest/);
  assert.match(doc, /Avoid:/);
  assert.match(doc, /chatbot-demo styling/);
  assert.match(doc, /Presence And Identity/);
  assert.match(doc, /How can I help without making you start over\?/);
});

test("Companion context source preserves read-only surface ownership boundaries", () => {
  assert.match(companionContextSource, /activeHomeBase/);
  assert.match(companionContextSource, /activeParentSurface/);
  assert.match(companionContextSource, /activeSurfaceType/);
  assert.match(companionContextSource, /isReadOnly: true/);
  assert.match(companionContextSource, /ownsWorkflow: false/);
  assert.match(companionContextSource, /ownershipBoundary/);
  assert.doesNotMatch(companionContextSource, /\.setItem\(/);
  assert.doesNotMatch(companionContextSource, /\.removeItem\(/);
});
