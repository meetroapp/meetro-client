import assert from "node:assert/strict";
import test from "node:test";

import {
  INTELLIGENCE_OPERATION,
  IntelligenceApiError,
  recordWorkflowReview,
  requestWorkflowIntelligence,
  validateEstimateDraft,
  validateInvoiceAssistance,
  validateQuickQuotePhotoAssistance,
} from "../src/utils/contextualIntelligence.js";

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  invoice: "22222222-2222-4222-8222-222222222222",
  proposal: "33333333-3333-4333-8333-333333333333",
  key: "44444444-4444-4444-8444-444444444444",
});

function boundary(authorityClassification = "ADVISORY_NON_CANONICAL") {
  return {
    schemaVersion: 1,
    proposalId: ids.proposal,
    authorityClassification,
    jobId: ids.job,
    humanToCanonicalBoundary: { directMutationAllowed: false },
  };
}

test(
  "Quick Quote photo validator preserves advisory evidence and explicit human review",
  () => {
    const photoId =
      "meetro/quote-draft-photo/contractor-65/example";

    const value = {
      ...boundary(),
      summary: "Visible wall damage requires professional review.",
      observed: [
        {
          id: "obs_1",
          text: "A visible crack is present in the wall finish.",
          classification: "OBSERVED",
          sourceReferences: [
            {
              type: "QUOTE_DRAFT_PHOTO",
              id: photoId,
              version: 1,
            },
          ],
        },
      ],
      needsVerification: [
        {
          id: "verify_1",
          text: "Verify whether cracking extends into the block.",
          classification: "NEEDS_VERIFICATION",
          sourceReferences: [],
        },
      ],
      repairSuggestions: [
        {
          id: "repair_1",
          text: "Consider removing loose finish before repair.",
          classification: "AI_SUGGESTED",
          sourceReferences: [],
        },
      ],
      materialSuggestions: [
        {
          id: "material_1",
          text: "Masonry repair materials",
          classification: "AI_SUGGESTED",
          sourceReferences: [],
        },
      ],
      photoAnalysis: {
        supported: true,
        analyzedReferenceIds: [photoId],
        limitations: [
          "Concealed conditions are not visible.",
        ],
        imageMeasurementsAreEstimates: true,
      },
      warnings: [],
      reviewContract: {
        actions: ["ACCEPTED", "EDITED", "REJECTED"],
        explicitHumanDecisionRequired: true,
      },
      humanToCanonicalBoundary: {
        directMutationAllowed: false,
        workingDraftApplicationRequiresReview: true,
        prohibitedCanonicalCommands: [
          "quote.create",
          "quote.issue",
        ],
      },
      learningContext: {
        context: "quick_quote_photo_assistance",
        learnedPatternIsCanonicalRule: false,
      },
    };

    assert.equal(
      validateQuickQuotePhotoAssistance(value),
      value
    );

    assert.equal(
      validateQuickQuotePhotoAssistance({
        ...value,
        observed: [
          {
            ...value.observed[0],
            sourceReferences: [],
          },
        ],
      }),
      null
    );

    assert.equal(
      validateQuickQuotePhotoAssistance({
        ...value,
        materialSuggestions: [
          {
            ...value.materialSuggestions[0],
            price: 49.99,
          },
        ],
      }),
      null
    );

    assert.equal(
      validateQuickQuotePhotoAssistance({
        ...value,
        humanToCanonicalBoundary: {
          ...value.humanToCanonicalBoundary,
          directMutationAllowed: true,
        },
      }),
      null
    );
  }
);

test(
  "Quick Quote photo assistance uses the governed companion operation contract",
  async () => {
    const photoId =
      "meetro/quote-draft-photo/contractor-65/example";
    const calls = [];

    const proposal = {
      ...boundary(),
      summary: "Photo reviewed.",
      observed: [],
      needsVerification: [],
      repairSuggestions: [],
      materialSuggestions: [],
      photoAnalysis: {
        supported: true,
        analyzedReferenceIds: [photoId],
        limitations: [],
        imageMeasurementsAreEstimates: true,
      },
      warnings: [],
      reviewContract: {
        actions: ["ACCEPTED", "EDITED", "REJECTED"],
        explicitHumanDecisionRequired: true,
      },
      humanToCanonicalBoundary: {
        directMutationAllowed: false,
        workingDraftApplicationRequiresReview: true,
        prohibitedCanonicalCommands: [],
      },
      learningContext: {
        context: "quick_quote_photo_assistance",
        learnedPatternIsCanonicalRule: false,
      },
    };

    const result = await requestWorkflowIntelligence({
      operation: INTELLIGENCE_OPERATION.QUICK_QUOTE_PHOTO,
      input: {
        prompt: "",
        photos: [
          {
            public_id: photoId,
            secure_url:
              "https://res.cloudinary.com/example/image/upload/v1/example.jpg",
            resource_type: "image",
            format: "jpg",
            bytes: 1000,
            width: 1200,
            height: 900,
            version: 1,
            uploaded_at: "2026-08-18T20:00:00.000Z",
          },
        ],
      },
      idempotencyKey: ids.key,
      authFetchImpl: async (url, options) => {
        calls.push({ url, options });

        return {
          response: { ok: true, status: 200 },
          data: {
            success: true,
            code: "INTELLIGENCE_OPERATION_COMPLETED",
            operation: "quick_quote.photo_assist",
            operationId: ids.proposal,
            correlationId: ids.proposal,
            result: proposal,
          },
        };
      },
    });

    assert.equal(
      result.operation,
      INTELLIGENCE_OPERATION.QUICK_QUOTE_PHOTO
    );

    const body = JSON.parse(calls[0].options.body);

    assert.equal(calls[0].url, "/api/companion/ask");
    assert.equal(
      body.operation,
      "quick_quote.photo_assist"
    );
    assert.equal(
      body.capability,
      "quick_quote.photo_assist"
    );
    assert.equal(body.input.prompt, "");
    assert.equal(body.input.photos.length, 1);
  }
);

test("Estimate Draft validator keeps internal costs private and rejects customer leakage", () => {
  const value = {
    ...boundary("INTERNAL_ESTIMATE_DRAFT_NON_CANONICAL"),
    materials: [], labor: [], internalCost: { totalMinor: 90000, customerVisible: false },
    customerQuoteDraft: { id: "customer_quote_draft", customerWording: "Repair the wall." },
  };
  assert.equal(validateEstimateDraft(value, { jobId: ids.job }), value);
  assert.throws(() => validateEstimateDraft({
    ...value,
    customerQuoteDraft: { ...value.customerQuoteDraft, retailerReference: "Home Depot" },
  }, { jobId: ids.job }), (error) => error instanceof IntelligenceApiError && error.code === "UNSAFE_INTELLIGENCE_RESPONSE");
});

test("Estimate Draft validator accepts only server-owned flat category cost provenance", () => {
  const value = {
    ...boundary("INTERNAL_ESTIMATE_DRAFT_NON_CANONICAL"),
    materials: [],
    labor: [],
    professionalCategoryCosts: {
      materials: {
        classification: "MATERIAL",
        amountMinor: 4000,
        provenance: "PROFESSIONAL_INPUT",
        basis: "FLAT_TOTAL",
        customerVisibleByDefault: false,
      },
      labor: {
        classification: "LABOR",
        amountMinor: 26000,
        provenance: "PROFESSIONAL_INPUT",
        basis: "FLAT_TOTAL",
        customerVisibleByDefault: false,
      },
    },
    internalCost: {
      materialsMinor: 4000,
      laborMinor: 26000,
      baseTotalMinor: 30000,
      totalMinor: 30000,
      customerVisible: false,
    },
    customerQuoteDraft: {
      id: "customer_quote_draft",
      customerWording: "Repair the wall.",
    },
  };

  assert.equal(validateEstimateDraft(value, { jobId: ids.job }), value);
  assert.equal(validateEstimateDraft({
    ...value,
    professionalCategoryCosts: {
      ...value.professionalCategoryCosts,
      labor: {
        ...value.professionalCategoryCosts.labor,
        provenance: "AI_SUGGESTED",
      },
    },
  }, { jobId: ids.job }), null);
});

test("Invoice assistance copies financial truth but rejects secrets and mismatched identity", () => {
  const value = {
    ...boundary(), invoiceId: ids.invoice,
    canonicalFinancialTruth: { totalMinor: 10000, paidMinor: 0, balanceMinor: 10000, status: "DRAFT", currency: "USD" },
    lineDescriptions: [], customerNotes: { id: "customer_notes", text: "Thanks" },
  };
  assert.equal(validateInvoiceAssistance(value, { jobId: ids.job, invoiceId: ids.invoice }), value);
  assert.equal(validateInvoiceAssistance(value, { jobId: ids.job, invoiceId: ids.proposal }), null);
  assert.throws(() => validateInvoiceAssistance({ ...value, token: "unsafe" }), /Unsafe assistant metadata/);
});

test("provider-unavailable response is explicit and performs no local fallback", async () => {
  await assert.rejects(() => requestWorkflowIntelligence({
    operation: INTELLIGENCE_OPERATION.INVOICE,
    input: { jobId: ids.job },
    idempotencyKey: ids.key,
    authFetchImpl: async () => ({
      response: { ok: false, status: 503 },
      data: { success: false, code: "INTELLIGENCE_PROVIDER_UNAVAILABLE" },
    }),
  }), (error) => error.code === "INTELLIGENCE_PROVIDER_UNAVAILABLE" && /not connected/.test(error.message));
});

test("workflow review requires exact proposal identity and preserves non-canonical result", async () => {
  const calls = [];
  const review = await recordWorkflowReview({
    proposalId: ids.proposal,
    elementId: "customer_notes",
    action: "ACCEPTED",
    idempotencyKey: ids.key,
    authFetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          code: "INTELLIGENCE_REVIEW_RECORDED",
          canonicalMutationPerformed: false,
          review: { proposalId: ids.proposal, elementId: "customer_notes", action: "ACCEPTED" },
        },
      };
    },
  });
  assert.equal(review.action, "ACCEPTED");
  assert.equal(calls[0].url, `/api/intelligence/proposals/${ids.proposal}/review`);
  assert.equal(JSON.parse(calls[0].options.body).elementId, "customer_notes");
});

test("workflow review transports exact camelCase Job Request patch paths", async () => {
  const elementId = "details.additionalNotes";
  const calls = [];
  const review = await recordWorkflowReview({
    proposalId: ids.proposal,
    elementId,
    action: "ACCEPTED",
    idempotencyKey: ids.key,
    authFetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          code: "INTELLIGENCE_REVIEW_RECORDED",
          canonicalMutationPerformed: false,
          review: { proposalId: ids.proposal, elementId, action: "ACCEPTED" },
        },
      };
    },
  });

  assert.equal(review.elementId, elementId);
  assert.equal(JSON.parse(calls[0].options.body).elementId, elementId);
});
