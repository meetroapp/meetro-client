import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCustomerJobHistoryReportModel,
  emailCustomerJobHistoryReport,
  shareCustomerJobHistoryReport,
  printCustomerJobHistoryReport,
} from "../src/utils/customerJobHistoryReport.js";

const JOB_ID =
  "11111111-1111-4111-8111-111111111111";

function fixture() {
  return {
    history: {
      jobId: JOB_ID,
      sourceType:
        "emergency_request",
      sourceLabel:
        "Emergency",
      serviceTitle:
        "Emergency Plumbing",
      professionalName:
        "Handyman LLC",
      customerName:
        "Liam Molina",
      status:
        "COMPLETED",
      completedAt:
        "2026-09-29T18:00:00.000Z",

      approvedQuote: {
        totalMinor: 35000,
        currency: "USD",
      },

      completionSummary: {
        workstreamCount: 0,
        workItemCount: 0,
        customerUpdateCount: 0,
      },

      originalRequest: null,

      historyRecords: {
        deposits: [{
          quoteId:
            "22222222-2222-4222-8222-222222222222",
          state:
            "SATISFIED",
          currency:
            "USD",
          requiredMinor:
            17500,
          appliedMinor:
            17500,
          remainingMinor:
            0,

          payments: [{
            grossAmountMinor:
              17500,
            appliedMinor:
              17500,
            currency:
              "USD",
            method:
              "Card",
            receivedAt:
              "2026-09-29T15:00:00.000Z",
            privateReference:
              "do-not-export",
          }],
        }],

        visits: [],

        media: [{
          mediaId:
            "private-media-id",
          secureUrl:
            "https://res.cloudinary.com/demo/image/upload/request.jpg",
          format:
            "jpg",
          uploadedAt:
            "2026-09-29T13:00:00.000Z",
          category:
            "REQUEST_PHOTO",
          internalModeration:
            "do-not-export",
        }],

        emergencyAssessment: {
          evaluation: {
            status:
              "COMPLETE",
            completedAt:
              "2026-09-29T14:00:00.000Z",
            startedAt:
              "2026-09-29T13:30:00.000Z",
            updatedAt:
              "2026-09-29T14:00:00.000Z",
            privateNotes:
              "never export",
          },

          findings: [{
            id:
              "33333333-3333-4333-8333-333333333333",
            statement:
              "Main waterline leak",
            state:
              "RESOLVED",
            createdAt:
              "2026-09-29T13:35:00.000Z",
            updatedAt:
              "2026-09-29T14:00:00.000Z",
            privateNotes:
              "never export",
          }],

          recommendations: [{
            id:
              "44444444-4444-4444-8444-444444444444",
            findingId:
              "33333333-3333-4333-8333-333333333333",
            statement:
              "Replace damaged section",
            state:
              "RECOMMENDED",
            createdAt:
              "2026-09-29T13:40:00.000Z",
            updatedAt:
              "2026-09-29T14:00:00.000Z",
            internalCost:
              99999,
          }],
        },
      },

      privateTeamMessages: [
        "never export",
      ],
    },

    quotes: [{
      quoteId:
        "22222222-2222-4222-8222-222222222222",
      quoteNumber:
        "Q-0000025",
      lineageLabel:
        "ORIGINAL",
      businessStatus:
        "APPROVED",
      customerDecision:
        "APPROVED",
      totalMinor:
        35000,
      currency:
        "USD",
      issuedAt:
        "2026-09-29T14:00:00.000Z",
      integrityHash:
        "private-hash",
    }],

    invoice: {
      invoiceId:
        "55555555-5555-4555-8555-555555555555",
      invoiceNumber:
        "INV-0000025",
      status:
        "PAID",
      currency:
        "USD",
      totalMinor:
        35000,
      paidMinor:
        35000,
      balanceMinor:
        0,
      issuedAt:
        "2026-09-29T19:00:00.000Z",
      invoiceDate:
        "2026-09-29",
      lineItems: [{
        sequence: 1,
        type:
          "approvedWork",
        description:
          "Emergency plumbing repair",
        quantity: 1,
        lineTotalMinor:
          35000,
        sourceQuoteId:
          "private-source",
      }],
      payments: [{
        amountMinor:
          17500,
        currency:
          "USD",
        method:
          "Card",
        receivedDate:
          "2026-09-29",
        paymentId:
          "private-payment-id",
      }],
      internalCost:
        20000,
    },

    workPlan: null,
    assessment: null,
    language: "en",
  };
}

test(
  "Job History report model is an explicit customer-safe allowlist",
  () => {
    const model =
      buildCustomerJobHistoryReportModel(
        fixture()
      );

    assert.equal(
      model.job.serviceTitle,
      "Emergency Plumbing"
    );

    assert.equal(
      model.quotes[0].quoteNumber,
      "Q-0000025"
    );

    assert.equal(
      model.invoice.invoiceNumber,
      "INV-0000025"
    );

    assert.equal(
      model.assessment.findings[0].statement,
      "Main waterline leak"
    );

    const serialized =
      JSON.stringify(model);

    assert.doesNotMatch(
      serialized,
      /privateTeamMessages|privateNotes|internalCost|integrityHash|paymentId|mediaId|privateReference|internalModeration|private-hash|never export|do-not-export/i
    );
  }
);

test(
  "Share uses the exact generated PDF artifact without mutating History",
  async () => {
    const model =
      buildCustomerJobHistoryReportModel(
        fixture()
      );

    const calls = [];

    const result =
      await shareCustomerJobHistoryReport(
        model,
        {
          createArtifact:
            async () => ({
              blob:
                new Blob(
                  ["%PDF-test"],
                  {
                    type:
                      "application/pdf",
                  }
                ),
              fileName:
                "history.pdf",
              contentType:
                "application/pdf",
            }),

          shareArtifact:
            async (input) => {
              calls.push(input);
              return {
                ok: true,
                method:
                  "web-pdf",
              };
            },
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.fileName,
      "history.pdf"
    );

    assert.equal(
      calls.length,
      1
    );
  }
);

test(
  "Email falls back to download plus explicit email draft attachment workflow",
  async () => {
    const model =
      buildCustomerJobHistoryReportModel(
        fixture()
      );

    let downloaded = false;
    let draft = null;

    const result =
      await emailCustomerJobHistoryReport(
        model,
        {
          createArtifact:
            async () => ({
              blob:
                new Blob(
                  ["%PDF-test"],
                  {
                    type:
                      "application/pdf",
                  }
                ),
              fileName:
                "history.pdf",
              contentType:
                "application/pdf",
            }),

          shareArtifact:
            async () => ({
              ok: false,
              method:
                "fallback",
            }),

          downloadArtifact:
            () => {
              downloaded = true;
              return true;
            },

          openEmailDraft:
            (input) => {
              draft = input;
              return true;
            },
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.method,
      "email-draft"
    );

    assert.equal(
      result.manualAttachment,
      true
    );

    assert.equal(
      downloaded,
      true
    );

    assert.match(
      draft.subject,
      /Meetro Job History/
    );
  }
);

test(
  "Print uses native share sheet where Print is available",
  async () => {
    const model =
      buildCustomerJobHistoryReportModel(
        fixture()
      );

    let shared = false;

    const result =
      await printCustomerJobHistoryReport(
        model,
        {
          createArtifact:
            async () => ({
              blob:
                new Blob(
                  ["%PDF-test"],
                  {
                    type:
                      "application/pdf",
                  }
                ),
              fileName:
                "history.pdf",
              contentType:
                "application/pdf",
            }),

          isNative: true,
          platform: "ios",

          shareArtifact:
            async () => {
              shared = true;
              return {
                ok: true,
                method:
                  "native-pdf",
              };
            },
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.printFromShareSheet,
      true
    );

    assert.equal(
      shared,
      true
    );
  }
);

test(
  "History UI exposes Print Share and Email only as read-only export actions",
  () => {
    const source =
      readFileSync(
        new URL(
          "../src/components/CustomerCompletionHistory.jsx",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /runHistoryReportAction\("print"\)/
    );

    assert.match(
      source,
      /runHistoryReportAction\("share"\)/
    );

    assert.match(
      source,
      /runHistoryReportAction\("email"\)/
    );

    assert.match(
      source,
      /"Print"/
    );

    assert.match(
      source,
      /"Share"/
    );

    assert.match(
      source,
      /"Email"/
    );

    assert.doesNotMatch(
      source,
      /recordCanonicalPayment|createCanonicalInvoice|completeCanonicalJob/
    );
  }
);
