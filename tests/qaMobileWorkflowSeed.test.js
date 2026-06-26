import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTEXT_IDS,
  SERVICE_TYPE_IDS,
} from "../src/utils/evaluationTemplateRegistry.js";
import {
  QA_MOBILE_REFERENCE_STORY,
  createCustomerWorkflow,
} from "../src/utils/qaMobileWorkflowSeed.js";

test("QA mobile Sarah/William seed matches the Meetro reference story", () => {
  const workflow = createCustomerWorkflow({
    customerName: QA_MOBILE_REFERENCE_STORY.homeownerName,
    address: QA_MOBILE_REFERENCE_STORY.address,
    service: QA_MOBILE_REFERENCE_STORY.service,
    materialName: "Bifold door hardware and wall anchors",
    date: "2026-06-22",
    time: "09:00",
    total: QA_MOBILE_REFERENCE_STORY.totalEstimate,
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    context: CONTEXT_IDS.HOMEOWNER,
    professionalName: QA_MOBILE_REFERENCE_STORY.professionalName,
    businessName: QA_MOBILE_REFERENCE_STORY.businessName,
    materialsEstimate: QA_MOBILE_REFERENCE_STORY.materialsEstimate,
    laborEstimate: QA_MOBILE_REFERENCE_STORY.laborEstimate,
    customerRequest: QA_MOBILE_REFERENCE_STORY.serviceSummary,
    workItemsConfig: [
      {
        id: "qa-sarah-bifold-doors",
        title: "Replace 2 bifold doors",
        notes: "Replace two bifold doors.",
        measurements: [{ label: "Door opening width", value: "48", unit: "inches" }],
        materials: [{ name: "2 bifold door sets", quantity: "1", unitPrice: "220" }],
      },
      {
        id: "qa-sarah-artwork",
        title: "Hang artwork",
        notes: "Hang homeowner artwork.",
        measurements: [{ label: "Artwork center height", value: "57", unit: "inches" }],
        materials: [{ name: "Picture hanging hardware", quantity: "1", unitPrice: "10" }],
      },
      {
        id: "qa-sarah-chalkboard",
        title: "Hang chalkboard safely",
        notes: "Mount chalkboard securely.",
        measurements: [{ label: "Chalkboard width", value: "36", unit: "inches" }],
        materials: [{ name: "Heavy-duty anchors and screws", quantity: "1", unitPrice: "15" }],
      },
    ],
  });

  assert.equal(workflow.schedule.customerName, "Sarah Dommerich");
  assert.equal(workflow.schedule.businessName, "William Handyman Services");
  assert.equal(workflow.schedule.address, "1225 Wales Dr, Fort Myers");
  assert.equal(workflow.schedule.title, QA_MOBILE_REFERENCE_STORY.service);
  assert.deepEqual(
    workflow.schedule.workItems.map((item) => item.title),
    ["Replace 2 bifold doors", "Hang artwork", "Hang chalkboard safely"]
  );

  assert.equal(workflow.quote.materialsAmount, 310);
  assert.equal(workflow.quote.laborAmount, 250);
  assert.equal(workflow.quote.totalAmount, 560);
  assert.match(workflow.quote.recommendedSolution, /hang artwork/i);
  assert.match(workflow.history.title, /bifold doors/i);
  assert.match(workflow.history.completionNotes, /chalkboard mounted safely/i);
});
