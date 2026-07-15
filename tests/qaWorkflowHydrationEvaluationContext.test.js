import test from "node:test";
import assert from "node:assert/strict";

import {
  FINDING_IDS,
  SERVICE_RECOMMENDATION_IDS,
} from "../src/utils/findingsEngineRegistry.js";
import { hydrateQaWorkflowRecords } from "../src/utils/qaWorkflowHydration.js";

function createStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function readJson(key, fallback = null) {
  return JSON.parse(globalThis.localStorage.getItem(key) || JSON.stringify(fallback));
}

test("hydrates Sarah and William evaluation service/context without cross-customer leakage", () => {
  globalThis.localStorage = createStorage();

  const result = hydrateQaWorkflowRecords({
    customers: [
      {
        customerName: "Sarah",
        activeWorkflow: {
          service: "Sarah door repair",
          status: "evaluation_completed",
          ids: {
            conversationId: "qa-sarah-conversation",
            scheduleId: "qa-sarah-schedule",
            quoteId: "qa-sarah-quote",
            jobId: "qa-sarah-job",
          },
          evaluation: {
            notes: "Sarah evaluation notes only.",
            serviceType: "door_repair",
            context: "homeowner",
	            evaluationTemplate: "door_repair_homeowner",
	            templateRequirements: ["Door issue", "Photos"],
	            findings: [],
	            serviceRecommendations: [],
	            workItems: [{ id: "sarah-item", title: "Sarah item" }],
          },
        },
      },
      {
        customerName: "William",
        activeWorkflow: {
          service: "William door replacement",
          status: "evaluation_completed",
          ids: {
            conversationId: "qa-william-conversation",
            scheduleId: "qa-william-schedule",
            quoteId: "qa-william-quote",
            jobId: "qa-william-job",
          },
          evaluation: {
            notes: "William evaluation notes only.",
            serviceType: "door_replacement",
            context: "property_management",
	            evaluationTemplate: "door_replacement_property_management",
	            templateRequirements: ["Door width", "Unit number"],
	            findings: [],
	            serviceRecommendations: [],
	            workItems: [{ id: "william-item", title: "William item" }],
          },
        },
      },
    ],
  }, { env: { DEV: true } });

  assert.equal(result.hydrated, true);

  const schedules = readJson("meetro_business_schedule", []);
  const quotes = readJson("workCenterQuoteHistory", []);
  const sarahSchedule = schedules.find(
    (schedule) => schedule.customerName === "Sarah"
  );
  const williamSchedule = schedules.find(
    (schedule) => schedule.customerName === "William"
  );
  const sarahQuote = quotes.find((quote) => quote.customerName === "Sarah");
  const williamQuote = quotes.find((quote) => quote.customerName === "William");
  const sarahJobRecord = readJson("meetro_job_record_qa-sarah-conversation");
  const williamJobRecord = readJson("meetro_job_record_qa-william-conversation");

  assert.equal(sarahSchedule.serviceType, "door_repair");
  assert.equal(sarahSchedule.context, "homeowner");
  assert.equal(sarahSchedule.evaluationTemplate, "door_repair_homeowner");
  assert.deepEqual(sarahSchedule.templateRequirements, [
    "Door issue",
    "Photos",
  ]);
  assert.equal(williamSchedule.serviceType, "door_replacement");
  assert.equal(williamSchedule.context, "property_management");
  assert.equal(
    williamSchedule.evaluationTemplate,
    "door_replacement_property_management"
  );
  assert.deepEqual(williamSchedule.templateRequirements, [
    "Door width",
    "Unit number",
  ]);

  assert.equal(sarahQuote.serviceType, "door_repair");
  assert.equal(williamQuote.context, "property_management");
  assert.deepEqual(sarahQuote.templateRequirements, ["Door issue", "Photos"]);
  assert.deepEqual(williamQuote.templateRequirements, [
    "Door width",
    "Unit number",
  ]);
	  assert.equal(sarahJobRecord.serviceType, "door_repair");
	  assert.equal(williamJobRecord.serviceType, "door_replacement");
	  assert.notEqual(sarahJobRecord.context, williamJobRecord.context);
	  assert.deepEqual(sarahSchedule.evaluation.findings, []);
	  assert.deepEqual(sarahSchedule.evaluation.serviceRecommendations, []);
	  assert.deepEqual(williamSchedule.evaluation.findings, []);
	  assert.deepEqual(williamSchedule.evaluation.serviceRecommendations, []);
  assert.deepEqual(sarahJobRecord.templateRequirements, [
    "Door issue",
    "Photos",
  ]);
  assert.deepEqual(williamJobRecord.templateRequirements, [
    "Door width",
    "Unit number",
  ]);

	  delete globalThis.localStorage;
	});

test("hydrates kitchen remodel Findings into deduped service recommendations", () => {
  globalThis.localStorage = createStorage();

  const result = hydrateQaWorkflowRecords({
    customers: [
      {
        customerName: "Sarah",
        activeWorkflow: {
          service: "Kitchen Remodel",
          status: "evaluation_completed",
          ids: {
            customerId: "customer-sarah",
            conversationId: "qa-sarah-kitchen-conversation",
            scheduleId: "qa-sarah-kitchen-schedule",
            quoteId: "qa-sarah-kitchen-quote",
            jobId: "qa-sarah-kitchen-job",
          },
          evaluation: {
            id: "evaluation-sarah-kitchen",
            notes: "Kitchen remodel evaluation.",
            serviceType: "general_handyman",
            context: "homeowner",
            evaluationTemplate: "general_handyman_homeowner",
            evaluationTemplateMatched: true,
            templateRequirements: ["Customer concern", "Photos"],
            findings: [
              { findingId: FINDING_IDS.WATER_DAMAGED_SINK_CABINET },
              { findingId: FINDING_IDS.MOLD_PRESENT },
              { findingId: FINDING_IDS.OUTLET_NOT_FUNCTIONING },
              { findingId: FINDING_IDS.BACKSPLASH_REPLACEMENT_NEEDED },
            ],
            workItems: [{ id: "kitchen-item", title: "Kitchen remodel" }],
          },
        },
      },
      {
        customerName: "William",
        activeWorkflow: {
          service: "Door Replacement",
          status: "evaluation_completed",
          ids: {
            customerId: "customer-william",
            conversationId: "qa-william-door-conversation",
            scheduleId: "qa-william-door-schedule",
            quoteId: "qa-william-door-quote",
            jobId: "qa-william-door-job",
          },
          evaluation: {
            id: "evaluation-william-door",
            notes: "William door evaluation.",
            serviceType: "door_replacement",
            context: "property_management",
            evaluationTemplate: "door_replacement_property_management",
            evaluationTemplateMatched: true,
            templateRequirements: ["Door width", "Unit number"],
            findings: [],
            serviceRecommendations: [],
            workItems: [{ id: "william-door-item", title: "William door" }],
          },
        },
      },
    ],
  }, { env: { DEV: true } });

  assert.equal(result.hydrated, true);

  const schedules = readJson("meetro_business_schedule", []);
  const quotes = readJson("workCenterQuoteHistory", []);
  const sarahSchedule = schedules.find(
    (schedule) => schedule.customerName === "Sarah"
  );
  const williamSchedule = schedules.find(
    (schedule) => schedule.customerName === "William"
  );
  const sarahQuote = quotes.find((quote) => quote.customerName === "Sarah");
  const sarahJobRecord = readJson("meetro_job_record_qa-sarah-kitchen-conversation");
  const williamJobRecord = readJson("meetro_job_record_qa-william-door-conversation");

  assert.deepEqual(
    sarahSchedule.evaluation.findings.map((finding) => finding.findingType),
    [
      FINDING_IDS.WATER_DAMAGED_SINK_CABINET,
      FINDING_IDS.MOLD_PRESENT,
      FINDING_IDS.OUTLET_NOT_FUNCTIONING,
      FINDING_IDS.BACKSPLASH_REPLACEMENT_NEEDED,
    ]
  );
  assert.deepEqual(
    sarahSchedule.evaluation.serviceRecommendations.map((service) => service.id),
    [
      SERVICE_RECOMMENDATION_IDS.CABINET_REPLACEMENT,
      SERVICE_RECOMMENDATION_IDS.MOLD_REMEDIATION,
      SERVICE_RECOMMENDATION_IDS.ELECTRICAL_REPAIR,
      SERVICE_RECOMMENDATION_IDS.TILE_INSTALLATION,
    ]
  );
  assert.deepEqual(
    sarahQuote.serviceRecommendations.map((service) => service.title),
    [
      "Cabinet Replacement",
      "Mold Remediation",
      "Electrical Repair",
      "Tile Installation",
    ]
  );
  assert.equal(
    sarahJobRecord.findings.every(
      (finding) => finding.customerId === "customer-sarah"
    ),
    true
  );
  assert.deepEqual(williamSchedule.evaluation.findings, []);
  assert.deepEqual(williamJobRecord.findings, []);

  delete globalThis.localStorage;
});

test("hydrates closed kitchen remodel history with visible Findings and recommendations", () => {
  globalThis.localStorage = createStorage();

  const result = hydrateQaWorkflowRecords({
    customers: [
      {
        customerName: "Sarah",
        activeWorkflow: {
          service: "Sarah active job",
          status: "work_scheduled",
          evaluation: {
            notes: "Sarah active evaluation.",
            serviceType: "door_repair",
            context: "homeowner",
            findings: [],
          },
        },
        closedHistory: {
          service: "Kitchen Remodel",
          status: "closed",
          ids: {
            customerId: "customer-sarah",
            conversationId: "qa-sarah-kitchen-history-conversation",
            scheduleId: "qa-sarah-kitchen-history-schedule",
            quoteId: "qa-sarah-kitchen-history-quote",
            jobId: "qa-sarah-kitchen-history-job",
          },
          evaluation: {
            id: "evaluation-sarah-kitchen-history",
            notes: "Kitchen remodel history evaluation.",
            serviceType: "general_handyman",
            context: "homeowner",
            evaluationTemplate: "general_handyman_homeowner",
            evaluationTemplateMatched: true,
            templateRequirements: ["Customer concern", "Photos"],
            findings: [
              { findingId: FINDING_IDS.WATER_DAMAGED_SINK_CABINET },
              { findingId: FINDING_IDS.MOLD_PRESENT },
              { findingId: FINDING_IDS.OUTLET_NOT_FUNCTIONING },
              { findingId: FINDING_IDS.BACKSPLASH_REPLACEMENT_NEEDED },
            ],
          },
          completion: { notes: "Kitchen completion notes." },
          closure: { status: "closed", closedAt: "2026-06-19T14:00:00.000Z" },
        },
      },
      {
        customerName: "William",
        activeWorkflow: {
          service: "William active job",
          status: "work_scheduled",
          evaluation: {
            notes: "William active evaluation.",
            serviceType: "door_repair",
            context: "homeowner",
            findings: [],
          },
        },
        closedHistory: {
          service: "William closed job",
          status: "closed",
          ids: {
            customerId: "customer-william",
            conversationId: "qa-william-history-conversation",
            scheduleId: "qa-william-history-schedule",
            quoteId: "qa-william-history-quote",
            jobId: "qa-william-history-job",
          },
          evaluation: {
            notes: "William history evaluation.",
            serviceType: "drywall_repair",
            context: "property_management",
            findings: [{ findingId: FINDING_IDS.COSMETIC_WALL_DAMAGE }],
          },
          completion: { notes: "William completion notes." },
          closure: { status: "closed", closedAt: "2026-06-19T14:00:00.000Z" },
        },
      },
    ],
  }, { env: { DEV: true } });

  assert.equal(result.hydrated, true);

  const histories = readJson("completedProjects", []);
  const sarahHistory = histories.find(
    (history) => history.customerName === "Sarah"
  );
  const williamHistory = histories.find(
    (history) => history.customerName === "William"
  );

  assert.deepEqual(
    sarahHistory.evaluation.findings.map((finding) => finding.title),
    [
      "Water Damaged Sink Cabinet",
      "Mold Present",
      "Outlet Not Functioning",
      "Backsplash Replacement Needed",
    ]
  );
  assert.deepEqual(
    sarahHistory.evaluation.serviceRecommendations.map((service) => service.title),
    [
      "Cabinet Replacement",
      "Mold Remediation",
      "Electrical Repair",
      "Tile Installation",
    ]
  );
  assert.equal(
    sarahHistory.evaluation.findings.every(
      (finding) => finding.customerId === "customer-sarah"
    ),
    true
  );
  assert.equal(
    williamHistory.evaluation.findings.some(
      (finding) => finding.customerId === "customer-sarah"
    ),
    false
  );

  delete globalThis.localStorage;
});

test("hydrates closed Sarah and William history as scoped read-only records", () => {
  globalThis.localStorage = createStorage();

  const result = hydrateQaWorkflowRecords({
    customers: [
      {
        customerName: "Sarah",
        activeWorkflow: {
          service: "Sarah current job",
          status: "work_scheduled",
          ids: {
            customerId: "customer-sarah",
            conversationId: "qa-sarah-active-conversation",
            scheduleId: "qa-sarah-active-schedule",
            quoteId: "qa-sarah-active-quote",
            jobId: "qa-sarah-active-job",
          },
          evaluation: {
            notes: "Sarah active evaluation.",
            serviceType: "door_repair",
            context: "homeowner",
            evaluationTemplateMatched: true,
            templateRequirements: [],
            findings: [],
            serviceRecommendations: [],
          },
        },
        closedHistory: {
          service: "Sarah closed job",
          status: "closed",
          ids: {
            customerId: "customer-sarah",
            conversationId: "qa-sarah-history-conversation",
            scheduleId: "qa-sarah-history-schedule",
            quoteId: "qa-sarah-history-quote",
            jobId: "qa-sarah-history-job",
          },
          evaluation: {
            notes: "Sarah history evaluation.",
            serviceType: "door_replacement",
            context: "property_management",
            evaluationTemplateMatched: true,
            templateRequirements: [],
            findings: [{ findingId: FINDING_IDS.WATER_DAMAGED_SINK_CABINET }],
          },
          completion: { notes: "Sarah completion notes." },
          closure: { status: "closed", closedAt: "2026-06-19T14:00:00.000Z" },
        },
      },
      {
        customerName: "William",
        activeWorkflow: {
          service: "William current job",
          status: "work_scheduled",
          ids: {
            customerId: "customer-william",
            conversationId: "qa-william-active-conversation",
            scheduleId: "qa-william-active-schedule",
            quoteId: "qa-william-active-quote",
            jobId: "qa-william-active-job",
          },
          evaluation: {
            notes: "William active evaluation.",
            serviceType: "door_repair",
            context: "homeowner",
            evaluationTemplateMatched: true,
            templateRequirements: [],
            findings: [],
            serviceRecommendations: [],
          },
        },
        closedHistory: {
          service: "William closed job",
          status: "closed",
          ids: {
            customerId: "customer-william",
            conversationId: "qa-william-history-conversation",
            scheduleId: "qa-william-history-schedule",
            quoteId: "qa-william-history-quote",
            jobId: "qa-william-history-job",
          },
          evaluation: {
            notes: "William history evaluation.",
            serviceType: "drywall_repair",
            context: "property_management",
            evaluationTemplateMatched: true,
            templateRequirements: [],
            findings: [{ findingId: FINDING_IDS.COSMETIC_WALL_DAMAGE }],
          },
          completion: { notes: "William completion notes." },
          closure: { status: "closed", closedAt: "2026-06-19T14:00:00.000Z" },
        },
      },
    ],
  }, { env: { DEV: true } });

  assert.equal(result.hydrated, true);

  const schedules = readJson("meetro_business_schedule", []);
  const histories = readJson("completedProjects", []);
  const activeSchedules = schedules.filter(
    (schedule) => schedule.workflowStatus !== "closed"
  );
  const sarahHistory = histories.find(
    (history) => history.customerName === "Sarah"
  );
  const williamHistory = histories.find(
    (history) => history.customerName === "William"
  );

  assert.deepEqual(
    activeSchedules.map((schedule) => schedule.customerName).sort(),
    ["Sarah", "William"]
  );
  assert.equal(sarahHistory.readOnly, true);
  assert.equal(williamHistory.readOnly, true);
  assert.equal(sarahHistory.customerId, "customer-sarah");
  assert.equal(williamHistory.customerId, "customer-william");
  assert.deepEqual(
    sarahHistory.evaluation.findings.map((finding) => finding.customerId),
    ["customer-sarah"]
  );
  assert.deepEqual(
    williamHistory.evaluation.findings.map((finding) => finding.customerId),
    ["customer-william"]
  );
  assert.equal(
    histories.some(
      (history) =>
        history.customerName === "Sarah" &&
        history.evaluation.findings.some(
          (finding) => finding.customerId === "customer-william"
        )
    ),
    false
  );

  delete globalThis.localStorage;
});
