import assert from "node:assert/strict";
import test from "node:test";

import {
  createPaymentReminderKey,
  normalizePaymentReminder,
  PaymentReminderApiError,
  sendDepositPaymentReminder,
  sendInvoicePaymentReminder,
} from "../src/utils/paymentReminderApi.js";

const INVOICE_ID =
  "11111111-1111-4111-8111-111111111111";

const JOB_ID =
  "22222222-2222-4222-8222-222222222222";

const REMINDER_ID =
  "33333333-3333-4333-8333-333333333333";

const DEPOSIT_ID =
  "44444444-4444-4444-8444-444444444444";

function invoiceReminder() {
  return {
    contractVersion: 1,
    reminderId: REMINDER_ID,
    sourceType: "INVOICE",
    invoiceId: INVOICE_ID,
    paymentRequirementId: null,
    jobId: JOB_ID,
    relationshipId: 7,
    conversationId: 8,
    messageId: 9,
    sourceVersion: 2,
    classification: "DUE_TODAY",
    classifiedOn: "2026-09-02",
    timeZone: "America/New_York",
    currency: "USD",
    amountMinor: 17000,
    due: {
      mode: "SPECIFIC_DATE",
      date: "2026-09-02",
      effectiveDate: "2026-09-02",
    },
    messageText:
      "Payment reminder: USD 170.00 is due today.",
    sentAt:
      "2026-09-03T03:00:00.000Z",
  };
}

function depositReminder() {
  return {
    contractVersion: 1,
    reminderId: REMINDER_ID,
    sourceType: "DEPOSIT",
    invoiceId: null,
    paymentRequirementId: DEPOSIT_ID,
    jobId: JOB_ID,
    relationshipId: 7,
    conversationId: 8,
    messageId: 10,
    sourceVersion: 3,
    classification:
      "DEPOSIT_REMAINING",
    classifiedOn:
      "2026-09-02",
    timeZone:
      "America/New_York",
    currency:
      "USD",
    amountMinor:
      31000,
    due:
      null,
    messageText:
      "Payment reminder: USD 310.00 of the required deposit remains due.",
    sentAt:
      "2026-09-03T03:01:00.000Z",
  };
}

test(
  "normalizes exact Invoice Reminder evidence",
  () => {
    const reminder =
      normalizePaymentReminder(
        invoiceReminder(),
        {
          expectedSourceType:
            "INVOICE",
          expectedInvoiceId:
            INVOICE_ID,
        }
      );

    assert.equal(
      reminder?.classification,
      "DUE_TODAY"
    );

    assert.equal(
      reminder?.amountMinor,
      17000
    );

    assert.equal(
      reminder?.timeZone,
      "America/New_York"
    );
  }
);

test(
  "normalizes exact Deposit Reminder evidence",
  () => {
    const reminder =
      normalizePaymentReminder(
        depositReminder(),
        {
          expectedSourceType:
            "DEPOSIT",
          expectedJobId:
            JOB_ID,
        }
      );

    assert.equal(
      reminder?.classification,
      "DEPOSIT_REMAINING"
    );

    assert.equal(
      reminder?.amountMinor,
      31000
    );
  }
);

test(
  "Invoice Reminder calls the dedicated reminder route",
  async () => {
    let captured = null;

    const result =
      await sendInvoicePaymentReminder({
        invoiceId:
          INVOICE_ID,
        expectedVersion:
          2,
        messageText:
          "Friendly reminder",
        idempotencyKey:
          "payment-reminder:invoice:test-1",

        authFetchImpl:
          async (
            endpoint,
            options
          ) => {
            captured = {
              endpoint,
              options,
            };

            return {
              response: {
                ok: true,
                status: 201,
              },
              data: {
                success: true,
                code:
                  "PAYMENT_REMINDER_SENT",
                reminder:
                  invoiceReminder(),
              },
            };
          },
      });

    assert.equal(
      captured.endpoint,
      `/professional/invoices/${INVOICE_ID}/reminders`
    );

    assert.equal(
      captured.options.method,
      "POST"
    );

    assert.equal(
      captured.options.headers[
        "Idempotency-Key"
      ],
      "payment-reminder:invoice:test-1"
    );

    assert.deepEqual(
      JSON.parse(
        captured.options.body
      ),
      {
        expectedVersion: 2,
        messageText:
          "Friendly reminder",
      }
    );

    assert.equal(
      result.reminder.sourceType,
      "INVOICE"
    );

    assert.equal(
      result.replayed,
      false
    );
  }
);

test(
  "Deposit Reminder calls the dedicated reminder route and preserves replay",
  async () => {
    let captured = null;

    const result =
      await sendDepositPaymentReminder({
        jobId:
          JOB_ID,
        expectedVersion:
          3,
        idempotencyKey:
          "payment-reminder:deposit:test-1",

        authFetchImpl:
          async (
            endpoint,
            options
          ) => {
            captured = {
              endpoint,
              options,
            };

            return {
              response: {
                ok: true,
                status: 200,
              },
              data: {
                success: true,
                code:
                  "PAYMENT_REMINDER_SENT",
                reminder:
                  depositReminder(),
                replayed:
                  true,
              },
            };
          },
      });

    assert.equal(
      captured.endpoint,
      `/jobs/${JOB_ID}/pre-work-deposit/reminders`
    );

    assert.deepEqual(
      JSON.parse(
        captured.options.body
      ),
      {
        expectedVersion: 3,
      }
    );

    assert.equal(
      result.replayed,
      true
    );
  }
);

test(
  "unsafe Reminder evidence fails closed",
  async () => {
    await assert.rejects(
      sendInvoicePaymentReminder({
        invoiceId:
          INVOICE_ID,
        expectedVersion:
          2,
        idempotencyKey:
          "payment-reminder:invoice:test-2",

        authFetchImpl:
          async () => ({
            response: {
              ok: true,
              status: 201,
            },
            data: {
              success: true,
              code:
                "PAYMENT_REMINDER_SENT",
              reminder: {
                ...invoiceReminder(),
                amountMinor:
                  0,
              },
            },
          }),
      }),
      (error) =>
        error instanceof
          PaymentReminderApiError &&
        error.code ===
          "UNSAFE_PAYMENT_REMINDER_RESPONSE"
    );
  }
);

test(
  "dedicated Reminder idempotency keys are source-scoped",
  () => {
    const cryptoProvider = {
      randomUUID() {
        return REMINDER_ID;
      },
    };

    assert.equal(
      createPaymentReminderKey(
        "INVOICE",
        cryptoProvider
      ),
      `payment-reminder:invoice:${REMINDER_ID}`
    );

    assert.equal(
      createPaymentReminderKey(
        "DEPOSIT",
        cryptoProvider
      ),
      `payment-reminder:deposit:${REMINDER_ID}`
    );
  }
);
