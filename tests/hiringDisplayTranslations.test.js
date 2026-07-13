import assert from "node:assert/strict";
import test from "node:test";
import { getHiringLocalJobOpenings } from "../src/utils/hiringCenterRegistry.js";
import {
  getLocalizedHiringJobDisplay,
  getLocalizedHiringText,
} from "../src/utils/hiringDisplayTranslations.js";

test("seeded Jobs & Hiring content can display localized text without changing originals", () => {
  const fieldHelper = getHiringLocalJobOpenings({
    businessId: "local-business",
    environment: "development",
    qaMode: true,
  }).find(
    (job) => job.id === "field-handyman-helper"
  );

  const spanish = getLocalizedHiringJobDisplay(fieldHelper, "es");
  const french = getLocalizedHiringJobDisplay(fieldHelper, "fr");
  const portuguese = getLocalizedHiringJobDisplay(fieldHelper, "pt-BR");

  assert.equal(fieldHelper.title, "Field Handyman Helper");
  assert.equal(fieldHelper.businessName, "Bgone Home Renovation & Handyman Services");
  assert.equal(fieldHelper.payRange, "$20-$28/hr");
  assert.equal(fieldHelper.location, "Lee County, FL");
  assert.equal(spanish.title, "Ayudante de mantenimiento residencial");
  assert.equal(french.title, "Assistant homme à tout faire");
  assert.equal(portuguese.title, "Ajudante de manutenção residencial");
  assert.equal(spanish.category, "Mantenimiento");
  assert.ok(spanish.description.includes("reparaciones"));
  assert.ok(spanish.requirements.includes("Transporte confiable"));
});

test("user-created hiring content without display translations remains unchanged", () => {
  const userCreatedPosition = {
    title: "Custom Weekend Helper",
    category: "Custom Services",
    description: "Typed by the business owner.",
    requirements: ["Bring your own tools"],
  };

  const display = getLocalizedHiringJobDisplay(userCreatedPosition, "es");

  assert.equal(display.title, userCreatedPosition.title);
  assert.equal(display.category, userCreatedPosition.category);
  assert.equal(display.description, userCreatedPosition.description);
  assert.deepEqual(display.requirements, userCreatedPosition.requirements);
});

test("missing localized display text falls back to original English content", () => {
  const record = {
    title: "Original Title",
    titleTranslations: {
      es: "Título",
    },
  };

  assert.equal(getLocalizedHiringText(record, "title", "fr"), "Original Title");
});
