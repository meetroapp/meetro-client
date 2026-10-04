import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createBusinessCustomerJob,
  createBusinessCustomerJobCommandKey,
} from "../src/utils/businessCustomerRelationshipsApi.js";
import {
  startCustomerRelationshipJob,
} from "../src/utils/customerRelationshipsWorkspace.js";
import {
  CUSTOMER_RELATIONSHIPS_LANGUAGES,
  getCustomerRelationshipsCopy,
} from "../src/utils/customerRelationshipsLanguage.js";

const RELATIONSHIP_ID = "22222222-2222-4222-8222-222222222222";
const CONTACT_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const SOURCE_ID = "44444444-4444-4444-8444-444444444444";
const COMMAND_ID = "55555555-5555-4555-8555-555555555555";

const pageSource = readFileSync(
  new URL("../src/pages/CustomerRelationshipsCenter.jsx", import.meta.url),
  "utf8"
);

test("external Customer History Job command key is UUID-backed", () => {
  const key = createBusinessCustomerJobCommandKey({
    randomUUID() {
      return COMMAND_ID;
    },
  });
  assert.equal(key, COMMAND_ID);
});

test("external Customer History creates one governed business_customer Job", async () => {
  const calls = [];
  const job = await createBusinessCustomerJob({
    relationshipId: RELATIONSHIP_ID,
    projectTitle: " Kitchen faucet replacement ",
    projectDescription: " Inspect and replace fixture. ",
    serviceLocation: {
      mode: "TEXT",
      text: "123 Example St, Cape Coral, FL",
    },
    idempotencyKey: COMMAND_ID,
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          code: "BUSINESS_CUSTOMER_JOB_CREATED",
          job: {
            id: JOB_ID,
            sourceType: "business_customer",
            sourceId: SOURCE_ID,
            contractorProfileId: 10,
            customer: {
              businessContactId: CONTACT_ID,
              customerRelationshipId: RELATIONSHIP_ID,
              displayName: "External Customer",
            },
            project: {
              title: "Kitchen faucet replacement",
              description: "Inspect and replace fixture.",
              serviceLocation: {
                mode: "TEXT",
                text: "123 Example St, Cape Coral, FL",
              },
            },
          },
        },
      };
    },
  });

  assert.equal(job.id, JOB_ID);
  assert.equal(job.sourceType, "business_customer");
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].endpoint,
    `/business-customer-relationships/${RELATIONSHIP_ID}/jobs`
  );
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Idempotency-Key"], COMMAND_ID);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    projectTitle: "Kitchen faucet replacement",
    projectDescription: "Inspect and replace fixture.",
    serviceLocation: {
      mode: "TEXT",
      text: "123 Example St, Cape Coral, FL",
    },
  });
  assert.equal(
    Object.hasOwn(JSON.parse(calls[0].options.body), "contractorProfileId"),
    false
  );
  assert.equal(
    Object.hasOwn(JSON.parse(calls[0].options.body), "requestId"),
    false
  );
  assert.equal(
    Object.hasOwn(JSON.parse(calls[0].options.body), "relationshipId"),
    false
  );
});

test("blank service location stays absent and is never copied from Contact data", async () => {
  let payload = null;
  await startCustomerRelationshipJob({
    relationshipId: RELATIONSHIP_ID,
    projectTitle: "Fresh Job",
    projectDescription: "",
    serviceLocation: null,
    idempotencyKey: COMMAND_ID,
    fetcher: async (_endpoint, options) => {
      payload = JSON.parse(options.body);
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          job: {
            id: JOB_ID,
            sourceType: "business_customer",
            sourceId: SOURCE_ID,
            contractorProfileId: 10,
            customer: {
              businessContactId: CONTACT_ID,
              customerRelationshipId: RELATIONSHIP_ID,
              displayName: "External Customer",
            },
            project: {
              title: "Fresh Job",
              description: "",
              serviceLocation: null,
            },
          },
        },
      };
    },
  });
  assert.deepEqual(payload, { projectTitle: "Fresh Job" });
});

test("invalid new Job input fails before transport", async () => {
  let called = false;
  await assert.rejects(
    createBusinessCustomerJob({
      relationshipId: RELATIONSHIP_ID,
      projectTitle: " ",
      idempotencyKey: COMMAND_ID,
      fetcher: async () => {
        called = true;
        throw new Error("should not run");
      },
    }),
    (error) =>
      error.code === "BUSINESS_CUSTOMER_JOB_INVALID" &&
      error.status === 400
  );
  assert.equal(called, false);
});

test("Customer History exposes Start New Job only for active customers", () => {
  assert.match(pageSource, /contact\.status === "ACTIVE"/);
  assert.match(pageSource, /copy\.startNewJob/);
  assert.match(pageSource, /copy\.archivedNewJobUnavailable/);
  assert.match(pageSource, /startCustomerRelationshipJob/);
  assert.match(pageSource, /createBusinessCustomerJobCommandKey/);
});

test("successful external Job routes to canonical Evaluation and preserves Customer History return", () => {
  assert.match(
    pageSource,
    /buildProfessionalWorkCenterRoute\(\{[\s\S]*jobId: job\.id,[\s\S]*stage: "evaluation",[\s\S]*returnPage: "customerRelationshipsCenter"/
  );
  assert.match(
    pageSource,
    /writeCustomerRelationshipNavigationContext\(window\.localStorage,[\s\S]*businessContactId: contact\.id,[\s\S]*focus: "work"/
  );
});

test("new Job UI keeps prior commercial state out of the creation payload", () => {
  const functionSource =
    pageSource.slice(
      pageSource.indexOf("async function createNewJob"),
      pageSource.indexOf("function openJob", pageSource.indexOf("async function createNewJob"))
    );
  assert.doesNotMatch(
    functionSource,
    /quote|invoice|deposit|payment|schedule|approval|requestId|selection|conversationId/i
  );
  assert.match(functionSource, /projectTitle/);
  assert.match(functionSource, /projectDescription/);
  assert.match(functionSource, /serviceLocation/);
});

test("Start New Job copy is complete in all governed languages", () => {
  const keys = [
    "startNewJob",
    "newJobHeading",
    "newJobIntro",
    "newJobTitle",
    "newJobTitlePlaceholder",
    "newJobDescription",
    "newJobDescriptionPlaceholder",
    "newJobLocation",
    "newJobLocationPlaceholder",
    "newJobLocationHelp",
    "createJob",
    "cancelNewJob",
    "creatingJob",
    "newJobErrorTitle",
    "newJobErrorText",
    "archivedNewJobUnavailable",
  ];
  assert.deepEqual(
    CUSTOMER_RELATIONSHIPS_LANGUAGES,
    ["en", "es", "fr", "pt-BR"]
  );
  for (const language of CUSTOMER_RELATIONSHIPS_LANGUAGES) {
    const localized = getCustomerRelationshipsCopy(language);
    for (const key of keys) {
      assert.equal(typeof localized[key], "string");
      assert.notEqual(localized[key].trim(), "");
    }
  }
});
