import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  classifyRequestIntent,
  searchRequestServices,
} from "../src/utils/requestIntelligence.js";
import { buildAssistantRequestDraft } from "../src/utils/assistantRequestDraft.js";
import { canProfessionalReceiveRequest } from "../src/utils/professionalRequestMatching.js";
import { t } from "../src/utils/language.js";

const uploadSource = fs.readFileSync("src/pages/Upload.jsx", "utf8");
const discoverSource = fs.readFileSync("src/pages/Discover.jsx", "utf8");
const assistantSource = fs.readFileSync("src/pages/Assistant.jsx", "utf8");

test("shared request intelligence understands common customer wording", () => {
  assert.equal(
    classifyRequestIntent("garage opener").serviceSpecialty,
    "garage_door_opener_installation"
  );
  assert.equal(
    classifyRequestIntent("garage remote").serviceSpecialty,
    "garage_door_opener_installation"
  );
  assert.equal(
    classifyRequestIntent("kitchen faucet leaking").serviceSpecialty,
    "plumbing_repairs"
  );
  assert.equal(
    classifyRequestIntent("car won't start").serviceSpecialty,
    "mechanic"
  );
  assert.equal(
    classifyRequestIntent("TV mounting").serviceSpecialty,
    "handyman"
  );
});

test("Ask Meetro and request creation use the same classification engine", () => {
  const draft = buildAssistantRequestDraft({
    userText: "garage door opener installed",
    recommendations: {},
    createdAt: "2026-06-27T12:00:00.000Z",
  });
  const direct = classifyRequestIntent("garage door opener installed");

  assert.equal(draft.service_specialty, direct.serviceSpecialty);
  assert.equal(draft.category, direct.category);
  assert.match(assistantSource, /classifyAssistantRequestIntent/);
  assert.match(uploadSource, /searchRequestServices/);
});

test("Discover uses the same service intelligence for marketplace search", () => {
  const [service] = searchRequestServices("garage opener", { translate: t });

  assert.equal(service.serviceId, "garage_door_opener_installation");
  assert.match(discoverSource, /searchRequestServices/);
  assert.match(discoverSource, /canProfessionalSeeLocalLead/);
});

test("marketplace matching receives the same capability classification", () => {
  const intent = classifyRequestIntent("I need a garage door opener installed");
  const professional = {
    businessCategory: "Handyman",
    businessServiceCapabilities: [
      {
        id: "capability:garage_door_opener_installation",
        serviceId: "garage_door_opener_installation",
      },
    ],
    serviceDomain: "home_services",
  };

  assert.equal(
    canProfessionalReceiveRequest(professional, {
      category: intent.category,
      serviceDomain: intent.serviceDomain,
      service_specialty: intent.serviceSpecialty,
    }),
    true
  );
});

test("request creation keeps manual override available", () => {
  assert.match(uploadSource, /ServiceSelectorSheet/);
  assert.match(uploadSource, /selectServiceOption/);
  assert.match(uploadSource, /setServiceSelectorOpen\(true\)/);
  assert.match(uploadSource, /selectSuggestedService/);
  assert.match(uploadSource, /jobRequestSearchServices/);
  assert.match(uploadSource, /jobRequestBrowseAllServices/);
  assert.match(uploadSource, /serviceSuggestions\.map/);
  assert.match(uploadSource, /t\("change"\)/);
});

test("request intelligence labels exist in supported languages", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    assert.notEqual(t("requestIntelligencePrompt", language), "requestIntelligencePrompt");
    assert.notEqual(
      t("requestIntelligencePlaceholder", language),
      "requestIntelligencePlaceholder"
    );
    assert.notEqual(
      t("professionalOnboardingSpecialtyMechanic", language),
      "professionalOnboardingSpecialtyMechanic"
    );
    assert.notEqual(
      t("professionalOnboardingSpecialtyMobileServices", language),
      "professionalOnboardingSpecialtyMobileServices"
    );
  }
});
