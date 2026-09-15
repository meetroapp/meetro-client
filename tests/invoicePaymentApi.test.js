import assert from "node:assert/strict";
import test from "node:test";

import {
  createCanonicalInvoice,
  fetchProfessionalInvoiceWorkspace,
  fetchProfessionalJobInvoice,
  issueCanonicalInvoice,
  normalizeInvoiceDeliverySnapshot,
  recordCanonicalPayment,
  validateInvoice,
  validateInvoiceWorkspace,
} from "../src/utils/invoicePaymentApi.js";

const INVOICE_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const LINE_ID = "33333333-3333-4333-8333-333333333333";
const QUOTE_ID = "44444444-4444-4444-8444-444444444444";
const PAYMENT_ID = "55555555-5555-4555-8555-555555555555";
const SCOPE_ID = "66666666-6666-4666-8666-666666666666";

function invoice(audience = "professional", overrides = {}) {
  const value = {
    contractVersion: 1,
    invoiceId: INVOICE_ID,
    invoiceNumber: "INV-111111111111",
    jobId: JOB_ID,
    requestId: 14,
    relationshipId: 9,
    conversationId: 340,
    business: { displayName: "BGone Services" },
    customer: { displayName: "Liam Molina" },
    job: { title: "Kitchen repair", service: "Plumbing" },
    status: "SENT",
    currency: "USD",
    invoiceDate: "2026-08-15",
    due: { mode: "DUE_ON_RECEIPT", date: null },
    lineItems: [{
      sequence: 1,
      type: "approvedWork",
      description: "Replace disposal",
      quantity: 1,
      unitAmountMinor: 92000,
      lineTotalMinor: 92000,
      ...(audience === "professional" ? {
        lineItemId: LINE_ID,
        sourceQuoteId: QUOTE_ID,
        sourceQuoteVersion: 3,
        sourceScopeItemId: SCOPE_ID,
        lineageLabel: "ORIGINAL",
      } : {}),
    }],
    subtotalMinor: 92000,
    totalMinor: 92000,
    paidMinor: 0,
    balanceMinor: 92000,
    customerNotes: "Thank you.",
    terms: "Due on receipt.",
    issuedAt: "2026-08-15T16:00:00.000Z",
    payments: [],
    actions: audience === "professional"
      ? { canIssue: false, canRecordPayment: true, canShareExternal: true }
      : { canReview: true, canPayOnline: false },
    ...(audience === "professional" ? { currentVersion: 2, customerParty: null } : {}),
    ...overrides,
  };
  return value;
}

function revenue(overrides = {}) {
  return {
    state: "READY",
    period: "THIS_MONTH",
    timeZone: "America/New_York",
    localStartDate: "2026-08-01",
    localEndDateExclusive: "2026-09-01",
    currency: "USD",
    cashReceivedMinor: 46000,
    invoicedMinor: 92000,
    outstandingMinor: 92000,
    paidInvoices: 0,
    ...overrides,
  };
}

test("strict Invoice validators separate professional command state from customer truth", () => {
  assert.ok(validateInvoice(invoice("professional"), { audience: "professional", invoiceId: INVOICE_ID }));
  const durableParty = validateInvoice(invoice("professional", {
    customerParty: {
      contractorProfileId: 10,
      businessContactId: "77777777-7777-4777-8777-777777777777",
      customerRelationshipId: "88888888-8888-4888-8888-888888888888",
    },
  }), { audience: "professional", invoiceId: INVOICE_ID });
  assert.deepEqual(durableParty.customerParty, {
    contractorProfileId: 10,
    businessContactId: "77777777-7777-4777-8777-777777777777",
    customerRelationshipId: "88888888-8888-4888-8888-888888888888",
  });
  assert.equal(validateInvoice(invoice("professional", {
    customerParty: { businessContactId: "not-authority" },
  }), { audience: "professional" }), null);
  const customer = validateInvoice(invoice("customer"), { audience: "customer", jobId: JOB_ID });
  assert.ok(customer);
  assert.equal("currentVersion" in customer, false);
  assert.equal("lineItemId" in customer.lineItems[0], false);
  assert.equal(validateInvoice({ ...invoice("customer"), internalCostMinor: 40000 }, { audience: "customer" }), null);
  assert.equal(validateInvoice(invoice("customer", { actions: { canReview: true, canPayOnline: true } }), { audience: "customer" }), null);
  assert.equal(validateInvoice(invoice("customer", { status: "DRAFT", issuedAt: null }), { audience: "customer" }), null);
});

test("Invoice validator derives no status and rejects arithmetic drift", () => {
  assert.equal(validateInvoice(invoice("professional", { balanceMinor: 91000 }), { audience: "professional" }), null);
  assert.equal(validateInvoice(invoice("professional", { status: "PAID", paidMinor: 92000, balanceMinor: 0 }), { audience: "professional" }).status, "PAID");
  assert.equal(validateInvoice(invoice("professional", { status: "PROCESSING" }), { audience: "professional" }), null);
});

test("workspace validator accepts only server-owned financial summary and exact records", () => {
  const workspace = {
    contractVersion: 1,
    revenue: revenue(),
    summary: { readyToInvoice: 1, drafts: 0, waitingForPayment: 1, paid: 0, totalOutstandingMinor: 92000, currency: "USD" },
    readyJobs: [{
      jobId: JOB_ID, requestId: 14, relationshipId: 9, customerName: "Liam Molina",
      serviceTitle: "Kitchen repair", completedAt: "2026-08-15T12:00:00.000Z",
      completionVersion: 1, approvedAmount: { currency: "USD", totalMinor: 92000 },
      paymentsReceivedMinor: 46000, amountStillDueMinor: 46000,
      paymentTerms: "50% deposit. Balance due on completion.",
      approvedWork: [{ description: "Replace disposal", quantity: 1, unitAmountMinor: 92000, lineTotalMinor: 92000 }],
    }],
    invoices: [{
      invoiceId: INVOICE_ID, invoiceNumber: "INV-111111111111", jobId: JOB_ID,
      requestId: 14, relationshipId: 9, customerName: "Liam Molina",
      serviceTitle: "Kitchen repair", currentVersion: 2, status: "SENT", currency: "USD",
      totalMinor: 92000, paidMinor: 0, balanceMinor: 92000, invoiceDate: "2026-08-15",
      due: { mode: "DUE_ON_RECEIPT", date: null }, issuedAt: "2026-08-15T16:00:00.000Z",
    }],
    limit: 50,
  };
  assert.ok(validateInvoiceWorkspace(workspace));
  assert.equal(validateInvoiceWorkspace({ ...workspace, revenueEstimate: 100000 }), null);

  const refundPeriod = validateInvoiceWorkspace({
    ...workspace,
    revenue: revenue({
      cashReceivedMinor: -10000,
    }),
  });

  assert.equal(
    refundPeriod.revenue.cashReceivedMinor,
    -10000
  );

  assert.equal(
    validateInvoiceWorkspace({
      ...workspace,
      revenue: revenue({
        invoicedMinor: -1,
      }),
    }),
    null
  );

  const timeZoneRequired =
    validateInvoiceWorkspace({
      ...workspace,
      revenue: revenue({
        state: "TIME_ZONE_REQUIRED",
        timeZone: null,
        localStartDate: null,
        localEndDateExclusive: null,
        currency: null,
        cashReceivedMinor: null,
        invoicedMinor: null,
        outstandingMinor: null,
        paidInvoices: null,
      }),
    });

  assert.equal(
    timeZoneRequired.revenue.state,
    "TIME_ZONE_REQUIRED"
  );

  assert.equal(
    validateInvoiceWorkspace({
      ...workspace,
      revenue: {
        ...revenue(),
        unsafeExtraField: true,
      },
    }),
    null
  );
});

test("Professional workspace request sends exact Revenue period and rejects period drift", async () => {
  const emptyWorkspace = (period) => ({
    contractVersion: 1,

    revenue: revenue({
      period,
      localStartDate:
        period === "THIS_YEAR"
          ? "2026-01-01"
          : "2026-06-18",
      localEndDateExclusive:
        period === "THIS_YEAR"
          ? "2027-01-01"
          : "2026-09-16",
      currency: null,
      cashReceivedMinor: 0,
      invoicedMinor: 0,
      outstandingMinor: 0,
      paidInvoices: 0,
    }),

    summary: {
      readyToInvoice: 0,
      drafts: 0,
      waitingForPayment: 0,
      paid: 0,
      totalOutstandingMinor: null,
      currency: null,
    },

    readyJobs: [],
    invoices: [],
    limit: 50,
  });

  let endpoint = "";

  const result =
    await fetchProfessionalInvoiceWorkspace({
      limit: 50,
      period: "LAST_90_DAYS",

      authFetchImpl: async (
        value,
        options
      ) => {
        endpoint = value;

        assert.deepEqual(
          options,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        return {
          response: {
            ok: true,
            status: 200,
          },

          data: {
            success: true,
            workspace:
              emptyWorkspace(
                "LAST_90_DAYS"
              ),
          },
        };
      },
    });

  assert.equal(
    endpoint,
    "/professional/invoices/workspace?limit=50&period=LAST_90_DAYS"
  );

  assert.equal(
    result.revenue.period,
    "LAST_90_DAYS"
  );

  await assert.rejects(
    () =>
      fetchProfessionalInvoiceWorkspace({
        period: "ALL_TIME",

        authFetchImpl: async () => {
          throw new Error(
            "Invalid period must fail before fetch."
          );
        },
      }),
    (error) =>
      error?.code ===
        "INVALID_REVENUE_PERIOD"
  );

  await assert.rejects(
    () =>
      fetchProfessionalInvoiceWorkspace({
        period: "THIS_YEAR",

        authFetchImpl: async () => ({
          response: {
            ok: true,
            status: 200,
          },

          data: {
            success: true,
            workspace:
              emptyWorkspace(
                "LAST_90_DAYS"
              ),
          },
        }),
      }),
    (error) =>
      error?.code ===
        "UNSAFE_INVOICE_WORKSPACE_RESPONSE"
  );
});

test("Invoice delivery snapshot is exact-identity and customer-safe", () => {
  const snapshot = {
    schemaVersion: 1, invoiceId: INVOICE_ID, invoiceNumber: "INV-111111111111",
    jobId: JOB_ID, status: "SENT", totalMinor: 92000, paidMinor: 0, balanceMinor: 92000,
    currency: "USD", due: { mode: "DUE_ON_RECEIPT", date: null },
    business: { displayName: "BGone Services" },
    job: { title: "Kitchen repair", service: "Plumbing" },
    terms: "Due on receipt.",
    issuedAt: "2026-08-15T16:00:00.000Z",
  };
  assert.ok(normalizeInvoiceDeliverySnapshot(snapshot, { invoiceId: INVOICE_ID, jobId: JOB_ID }));
  assert.equal(normalizeInvoiceDeliverySnapshot({ ...snapshot, integrityHash: "sentinel" }, { invoiceId: INVOICE_ID, jobId: JOB_ID }), null);
  assert.equal(normalizeInvoiceDeliverySnapshot(snapshot, { invoiceId: QUOTE_ID, jobId: JOB_ID }), null);
});

test("Invoice commands send only exact governed fields and never accept client status", async () => {
  const calls = [];
  const authFetchImpl = async (endpoint, options) => {
    calls.push({ endpoint, options, body: JSON.parse(options.body) });
    const isCreate = endpoint.includes("/jobs/");
    const isIssue = endpoint.endsWith("/issue");
    const isPayment = endpoint.endsWith("/payments");
    const resultInvoice = isPayment
      ? invoice("professional", {
          status: "PARTIALLY_PAID", currentVersion: 3,
          paidMinor: 46000, balanceMinor: 46000,
          payments: [{
            amountMinor: 46000, currency: "USD", receivedDate: "2026-08-15",
            method: "CHECK", customerReference: null,
            recordedAt: "2026-08-15T17:00:00.000Z", paymentId: PAYMENT_ID,
          }],
        })
      : isCreate
        ? invoice("professional", { status: "DRAFT", currentVersion: 1, issuedAt: null, actions: { canIssue: true, canRecordPayment: false, canShareExternal: false } })
        : invoice("professional");
    return {
      response: { ok: true, status: isCreate ? 201 : 200 },
      data: {
        success: true, invoice: resultInvoice,
        ...(isIssue ? { delivery: { invoiceId: INVOICE_ID } } : {}),
        ...(isPayment ? { payment: { paymentId: PAYMENT_ID } } : {}),
      },
    };
  };
  await createCanonicalInvoice({ jobId: JOB_ID, expectedCompletionVersion: 1, due: { mode: "DUE_ON_RECEIPT", date: null }, idempotencyKey: "create-1", authFetchImpl });
  await issueCanonicalInvoice({ invoiceId: INVOICE_ID, expectedVersion: 1, messageText: "Here is your final Invoice.", idempotencyKey: "issue-1", authFetchImpl });
  await recordCanonicalPayment({ invoiceId: INVOICE_ID, expectedVersion: 2, amountMinor: 46000, method: "CHECK", receivedDate: "2026-08-15", idempotencyKey: "payment-1", authFetchImpl });
  assert.deepEqual(calls[0].body, { expectedCompletionVersion: 1, due: { mode: "DUE_ON_RECEIPT", date: null }, customerNotes: null, terms: null, extraWork: [] });
  assert.deepEqual(calls[1].body, { expectedVersion: 1, messageText: "Here is your final Invoice." });
  assert.deepEqual(calls[2].body, { expectedVersion: 2, amountMinor: 46000, method: "CHECK", receivedDate: "2026-08-15", customerReference: null });
  assert.equal(calls.some(({ body }) => "status" in body || "paid" in body || "balanceMinor" in body), false);
});

test("reviewed Extra work is sent separately and preserves exact carried-payment arithmetic", async () => {
  let submitted;
  const result = await createCanonicalInvoice({
    jobId: JOB_ID,
    expectedCompletionVersion: 1,
    due: { mode: "DUE_ON_RECEIPT", date: null },
    extraWork: [{
      description: "Additional reviewed cabinet alignment",
      quantity: 1,
      unitAmountMinor: 7500,
      sourceQuoteId: QUOTE_ID,
    }],
    idempotencyKey: "create-reviewed-extra",
    authFetchImpl: async (_endpoint, options) => {
      submitted = JSON.parse(options.body);
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          invoice: invoice("professional", {
            status: "DRAFT",
            currentVersion: 1,
            issuedAt: null,
            lineItems: [
              {
                sequence: 1, type: "approvedWork", description: "Approved repair",
                quantity: 1, unitAmountMinor: 68000, lineTotalMinor: 68000,
                lineItemId: LINE_ID, sourceQuoteId: QUOTE_ID,
                sourceQuoteVersion: 3, sourceScopeItemId: SCOPE_ID,
                lineageLabel: "REVISED",
              },
              {
                sequence: 2, type: "extraWork",
                description: "Additional reviewed cabinet alignment",
                quantity: 1, unitAmountMinor: 7500, lineTotalMinor: 7500,
                lineItemId: PAYMENT_ID,
              },
            ],
            subtotalMinor: 75500,
            totalMinor: 75500,
            paidMinor: 51000,
            balanceMinor: 24500,
            actions: { canIssue: true, canRecordPayment: false, canShareExternal: false },
          }),
        },
      };
    },
  });
  assert.deepEqual(submitted.extraWork, [{
    description: "Additional reviewed cabinet alignment",
    quantity: 1,
    unitAmountMinor: 7500,
  }]);
  assert.equal(result.totalMinor, 75500);
  assert.equal(result.paidMinor, 51000);
  assert.equal(result.balanceMinor, 24500);
  assert.deepEqual(result.lineItems.map((item) => item.type), ["approvedWork", "extraWork"]);
  assert.equal("sourceQuoteId" in result.lineItems[1], false);
});

test("professional Job History Invoice read is exact-Job scoped", async () => {
  let endpoint;
  const result = await fetchProfessionalJobInvoice({
    jobId: JOB_ID,
    authFetchImpl: async (value, options) => {
      endpoint = value;
      assert.deepEqual(options, { method: "GET", cache: "no-store" });
      return {
        response: { ok: true, status: 200 },
        data: { success: true, invoice: invoice("professional") },
      };
    },
  });
  assert.equal(endpoint, `/professional/jobs/${JOB_ID}/invoice`);
  assert.equal(result.jobId, JOB_ID);
});

test('external Invoice requires exact business customer authority and keeps marketplace strict',()=>{
 const customerParty={contractorProfileId:10,businessContactId:'77777777-7777-4777-8777-777777777777',customerRelationshipId:'88888888-8888-4888-8888-888888888888'};
 const external=invoice('professional',{requestId:null,relationshipId:null,conversationId:null,customerParty,authority:{kind:'BUSINESS_CUSTOMER',...customerParty}});
 assert.ok(validateInvoice(external,{audience:'professional'}));
 assert.equal(validateInvoice({...external,authority:undefined},{audience:'professional'}),null);
 assert.equal(validateInvoice({...external,customerParty:{...customerParty,contractorProfileId:11}},{audience:'professional'}),null);
 assert.equal(validateInvoice({...external,requestId:14},{audience:'professional'}),null);
 assert.ok(validateInvoice(invoice(),{audience:'professional'}));
});

test('external Invoice issuance uses the canonical version and never supplies marketplace authority',async()=>{
 const {issueCanonicalInvoiceExternally}=await import('../src/utils/invoicePaymentApi.js');
 const party={contractorProfileId:10,businessContactId:'77777777-7777-4777-8777-777777777777',customerRelationshipId:'88888888-8888-4888-8888-888888888888'};
 const external=invoice('professional',{requestId:null,relationshipId:null,conversationId:null,customerParty:party,authority:{kind:'BUSINESS_CUSTOMER',...party}});
 let call;
 const result=await issueCanonicalInvoiceExternally({invoiceId:INVOICE_ID,expectedVersion:1,idempotencyKey:'external-issue',authFetchImpl:async(path,options)=>{
   call={path,body:JSON.parse(options.body)};return {response:{ok:true,status:201},data:{success:true,invoice:external}};
 }});
 assert.equal(call.path,`/professional/invoices/${INVOICE_ID}/issue-external`);
 assert.deepEqual(call.body,{expectedVersion:1});assert.equal(result.invoice.invoiceId,INVOICE_ID);
});

test('external email and reminder transport reject a mismatched receipt and do not carry payment commands',async()=>{
 const {emailCanonicalInvoice}=await import('../src/utils/invoicePaymentApi.js');
 for(const purpose of ['INVOICE','REMINDER']) {
  let call;
  const delivery={id:PAYMENT_ID,invoiceId:INVOICE_ID,jobId:JOB_ID,invoiceVersion:2,purpose,recipientEmail:'external@example.test',state:'DELIVERY_REQUESTED'};
  const result=await emailCanonicalInvoice({invoiceId:INVOICE_ID,expectedVersion:2,purpose,idempotencyKey:'email-key',authFetchImpl:async(path,options)=>{call={path,body:JSON.parse(options.body)};return {response:{ok:true,status:202},data:{success:true,delivery}};}});
  assert.equal(call.path,`/professional/invoices/${INVOICE_ID}/external-email`);
  assert.deepEqual(call.body,{expectedVersion:2,purpose,messageText:null});assert.equal(result.delivery.state,'DELIVERY_REQUESTED');
  await assert.rejects(emailCanonicalInvoice({invoiceId:INVOICE_ID,expectedVersion:2,purpose,idempotencyKey:'email-key',authFetchImpl:async()=>({response:{ok:true,status:202},data:{success:true,delivery:{...delivery,invoiceId:QUOTE_ID}}})}),{code:'UNSAFE_INVOICE_EMAIL_RESPONSE'});
 }
});
