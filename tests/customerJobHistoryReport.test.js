import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCustomerJobHistoryReportModel,
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
      jobId: JOB_ID,
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
      jobId: JOB_ID,
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
  "PDF renders the read-only statement once rather than as a duplicate heading",
  () => {
    const source =
      readFileSync(
        new URL(
          "../src/utils/customerJobHistoryReport.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /section\s*\(\s*copy\.readOnly\s*\)/
    );

    assert.equal(
      (
        source.match(
          /addText\s*\(\s*copy\.readOnly/g
        ) || []
      ).length,
      1
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
  "History UI exposes Print and Share only as read-only export actions",
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

    assert.doesNotMatch(source, /runHistoryReportAction\("email"\)/);

    assert.match(
      source,
      /reportCopy\.print/
    );

    assert.match(
      source,
      /reportCopy\.share/
    );

    assert.doesNotMatch(source, /reportCopy\.email/);

    assert.doesNotMatch(
      source,
      /recordCanonicalPayment|createCanonicalInvoice|completeCanonicalJob/
    );
  }
);

test("unfinished Invoice is excluded and exact-Job optional projections cannot cross History identity", () => {
  const input = fixture();
  input.invoice.status = "DRAFT";
  assert.equal(buildCustomerJobHistoryReportModel(input).invoice, null);
  for (const key of ["quotes", "invoice", "workPlan", "assessment"]) {
    const other = fixture();
    if (key === "quotes") other.quotes[0].jobId = "other-job";
    else other[key] = { jobId: "other-job" };
    assert.throws(() => buildCustomerJobHistoryReportModel(other), /exact Job/);
  }
});

test("export allowlist excludes authority, margins, processor references, recovery data and hidden media", () => {
  const input = fixture();
  const secrets = {
    authorityGrants: "SECRET_AUTHORITY", participantAuthority: "SECRET_PARTICIPANT",
    integrityHash: "SECRET_HASH", margin: "SECRET_MARGIN", internalCost: "SECRET_COST",
    processorReference: "SECRET_PROCESSOR", privatePaymentReference: "SECRET_PAYMENT",
    localRecoveryData: "SECRET_RECOVERY", privateProfessionalNotes: "SECRET_PRO_NOTES",
    privateRecommendations: "SECRET_RECOMMENDATIONS", privateTeamMessages: "SECRET_TEAM",
  };
  Object.assign(input.history, secrets);
  Object.assign(input.invoice, secrets);
  Object.assign(input.quotes[0], secrets);
  Object.assign(input.history.historyRecords.deposits[0].payments[0], secrets);
  input.history.historyRecords.media.push({ category: "PRIVATE_PHOTO", secureUrl: "https://res.cloudinary.com/demo/image/upload/SECRET_HIDDEN.jpg" });
  input.history.historyRecords.media.push({ category: "REQUEST_PHOTO", secureUrl: "https://other.test/SECRET_UNSAFE.jpg" });
  const model = buildCustomerJobHistoryReportModel(input);
  assert.equal(model.media.length, 1);
  assert.doesNotMatch(JSON.stringify(model), /SECRET_|authorityGrants|participantAuthority|margin|processorReference|privatePaymentReference|localRecoveryData|privateProfessionalNotes/);
  assert.equal(model.invoice.lineItems[0].description, "Emergency plumbing repair");
  assert.equal(model.invoice.payments[0].amountMinor, 17500);
});

test("web Share downloads the same PDF when file sharing is unavailable and respects cancellation", async () => {
  const model = buildCustomerJobHistoryReportModel(fixture());
  const artifact = { blob: new Blob(["%PDF-fixture"], { type: "application/pdf" }), fileName: "history.pdf", contentType: "application/pdf" };
  let downloaded = null;
  const result = await shareCustomerJobHistoryReport(model, {
    createArtifact: async () => artifact,
    shareArtifact: async () => ({ ok: false, method: "fallback" }),
    downloadArtifact: value => { downloaded = value; return true; },
  });
  assert.equal(result.method, "download"); assert.equal(downloaded, artifact);
  downloaded = null;
  const cancelled = await shareCustomerJobHistoryReport(model, {
    createArtifact: async () => artifact,
    shareArtifact: async () => ({ ok: false, method: "cancelled" }),
    downloadArtifact: value => { downloaded = value; return true; },
  });
  assert.equal(cancelled.method, "cancelled"); assert.equal(downloaded, null);
});

test("generated PDF renders complete available sections and a single read-only statement", async () => {
  const { createCustomerJobHistoryPdfArtifact, getCustomerJobHistoryReportCopy } = await import("../src/utils/customerJobHistoryReport.js");
  const input = fixture();
  input.history.originalRequest = { concern: "Real original request", reportedAt: "2026-09-28T12:00:00Z" };
  input.history.historyRecords.visits = [{ purpose: "EVALUATION", state: "COMPLETED", scheduledStartAt: "2026-09-28T12:00:00Z" }];
  input.workPlan = { jobId: JOB_ID, workstreams: [{ title: "Real workstream", status: "COMPLETED", activities: [{ statement: "Real recorded repair", status: "COMPLETED", performedAt: "2026-09-29T17:00:00Z" }], updates: [{ statement: "Real customer update" }] }] };
  const printed = [];
  class PdfSpy {
    setFont() {} setFontSize() {} setTextColor() {} setDrawColor() {} line() {} rect() {}
    addPage() {} setPage() {} setProperties() {} addImage() {} autoPrint() {}
    splitTextToSize(value) { return [value]; }
    text(value) { printed.push(...(Array.isArray(value) ? value : [value])); }
    getNumberOfPages() { return 1; }
    output() { return new Blob(["%PDF-fixture"], { type: "application/pdf" }); }
  }
  await createCustomerJobHistoryPdfArtifact(buildCustomerJobHistoryReportModel(input), { jsPDFImpl: PdfSpy, fetchImpl: async () => ({ ok: false }) });
  const rendered = printed.join("\n");
  for (const content of ["Emergency Plumbing", "Liam Molina", "Handyman LLC", "$350.00", "Real original request", "Main waterline leak", "Replace damaged section", "Real recorded repair", "Real customer update", "Q-0000025", "INV-0000025", "Payment history", "Evaluation visit"]) assert.ok(rendered.includes(content), content);
  const readOnly = getCustomerJobHistoryReportCopy("en").readOnly;
  assert.equal(printed.filter(line => line === readOnly).length, 1);
  assert.match(rendered, /Photo could not be embedded/);
});

test("long customer-visible text paginates within the content boundary without losing its tail", async () => {
  const { createCustomerJobHistoryPdfArtifact } = await import("../src/utils/customerJobHistoryReport.js");
  const input = fixture();
  input.history.historyRecords.media = [];
  input.history.originalRequest = { concern: "Long request text. ".repeat(250) + "END_OF_REQUEST", reportedAt: "2026-09-28T12:00:00Z" };
  const printed = [];
  class PaginatedPdf {
    page = 1;
    setFont() {} setFontSize() {} setTextColor() {} setDrawColor() {} line() {} rect() {} setProperties() {}
    addPage() { this.page += 1; } setPage(page) { this.page = page; }
    splitTextToSize(value) { return String(value).match(/.{1,70}/g) || [""]; }
    text(value, x, y) { printed.push({ value, x, y, page: this.page }); }
    getNumberOfPages() { return this.page; }
    output() { return new Blob(["%PDF-fixture"], { type: "application/pdf" }); }
  }
  const artifact = await createCustomerJobHistoryPdfArtifact(buildCustomerJobHistoryReportModel(input), { jsPDFImpl: PaginatedPdf });
  assert.ok(artifact.doc.page > 1);
  assert.ok(printed.map(item => item.value).join("").includes("END_OF_REQUEST"));
  assert.ok(printed.filter(item => item.y !== 766).every(item => item.y <= 746), "Content stays above the footer");
});

test("web Print previews a print-ready PDF through the existing device adapter", async () => {
  const model = buildCustomerJobHistoryReportModel(fixture());
  let preview = null, autoPrint = false;
  const artifact = { fileName: "history.pdf", contentType: "application/pdf", blob: new Blob(["%PDF-fixture"], { type: "application/pdf" }), doc: {
    autoPrint: () => { autoPrint = true; }, output: () => new Blob(["%PDF-print"], { type: "application/pdf" }),
  } };
  const result = await printCustomerJobHistoryReport(model, {
    isNative: false, platform: "web", createArtifact: async () => artifact,
    previewArtifact: async value => { preview = value; return true; },
  });
  assert.equal(autoPrint, true); assert.equal(result.method, "print-ready-pdf");
  assert.equal(preview.fileName, artifact.fileName); assert.equal(await preview.blob.text(), "%PDF-print");
});
