import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  normalizeCanonicalMessage,
} from "../src/utils/canonicalConversationMessaging.js";

const JOB_ID =
  "22222222-2222-4222-8222-222222222222";

const INVOICE_ID =
  "11111111-1111-4111-8111-111111111111";

const DEPOSIT_ID =
  "44444444-4444-4444-8444-444444444444";

const REMINDER_ID =
  "33333333-3333-4333-8333-333333333333";

function invoicePayload() {
  return {
    schemaVersion: 1,
    reminderId:
      REMINDER_ID,
    sourceType:
      "INVOICE",
    invoiceId:
      INVOICE_ID,
    paymentRequirementId:
      null,
    jobId:
      JOB_ID,
    sourceVersion:
      4,
    classification:
      "DUE_TODAY",
    classifiedOn:
      "2026-09-03",
    timeZone:
      "America/New_York",
    currency:
      "USD",
    amountMinor:
      17000,
    due: {
      mode:
        "SPECIFIC_DATE",
      date:
        "2026-09-03",
      effectiveDate:
        "2026-09-03",
    },
  };
}

function depositPayload() {
  return {
    schemaVersion: 1,
    reminderId:
      REMINDER_ID,
    sourceType:
      "DEPOSIT",
    invoiceId:
      null,
    paymentRequirementId:
      DEPOSIT_ID,
    jobId:
      JOB_ID,
    sourceVersion:
      3,
    classification:
      "DEPOSIT_REMAINING",
    classifiedOn:
      "2026-09-03",
    timeZone:
      "America/New_York",
    currency:
      "USD",
    amountMinor:
      31000,
    due:
      null,
  };
}

function reminderMessage(
  payload,
  {
    text =
      "Payment reminder",
    reference = null,
    workflowType =
      "PAYMENT_REMINDER",
    workflowStatus =
      "SENT",
    contentType =
      "payment_reminder",
  } = {}
) {
  return {
    id: 701,
    sender: {
      id: 65,
      isViewer: false,
    },
    recipient: {
      id: 64,
    },
    content: {
      text,
      imageUrl: null,
      type:
        contentType,
    },
    workflow: {
      type:
        workflowType,
      status:
        workflowStatus,
      payload,
    },
    reference:
      reference || {
        type:
          "payment_reminder",
        sourceType:
          payload.sourceType,
        invoiceId:
          payload.invoiceId,
        paymentRequirementId:
          payload
            .paymentRequirementId,
        jobId:
          payload.jobId,
      },
    createdAt:
      "2026-09-03T11:00:00.000Z",
  };
}

test(
  "Invoice Payment Reminder preserves exact canonical snapshot",
  () => {
    const normalized =
      normalizeCanonicalMessage(
        reminderMessage(
          invoicePayload()
        ),
        "homeowner"
      );

    assert.equal(
      normalized.type,
      "payment_reminder"
    );

    assert.equal(
      normalized.workflowType,
      "PAYMENT_REMINDER"
    );

    assert.equal(
      normalized.paymentReminder
        .sourceType,
      "INVOICE"
    );

    assert.equal(
      normalized.paymentReminder
        .invoiceId,
      INVOICE_ID
    );

    assert.equal(
      normalized.paymentReminder
        .amountMinor,
      17000
    );

    assert.equal(
      normalized.paymentReminder
        .classification,
      "DUE_TODAY"
    );

    assert.deepEqual(
      normalized.paymentReminder
        .due,
      {
        mode:
          "SPECIFIC_DATE",
        date:
          "2026-09-03",
        effectiveDate:
          "2026-09-03",
      }
    );
  }
);

test(
  "Deposit Payment Reminder preserves remaining Deposit truth without Invoice identity",
  () => {
    const normalized =
      normalizeCanonicalMessage(
        reminderMessage(
          depositPayload()
        ),
        "homeowner"
      );

    assert.equal(
      normalized.paymentReminder
        .sourceType,
      "DEPOSIT"
    );

    assert.equal(
      normalized.paymentReminder
        .invoiceId,
      null
    );

    assert.equal(
      normalized.paymentReminder
        .paymentRequirementId,
      DEPOSIT_ID
    );

    assert.equal(
      normalized.paymentReminder
        .amountMinor,
      31000
    );

    assert.equal(
      normalized.paymentReminder
        .due,
      null
    );
  }
);

test(
  "Payment Reminder fails closed when message, workflow, or reference authority disagrees",
  () => {
    const payload =
      invoicePayload();

    assert.equal(
      normalizeCanonicalMessage(
        reminderMessage(
          payload,
          {
            workflowType:
              "PAYMENT_RECEIVED",
          }
        ),
        "homeowner"
      ),
      null
    );

    assert.equal(
      normalizeCanonicalMessage(
        reminderMessage(
          payload,
          {
            reference: {
              type:
                "payment_reminder",
              sourceType:
                "DEPOSIT",
              invoiceId:
                INVOICE_ID,
              paymentRequirementId:
                null,
              jobId:
                JOB_ID,
            },
          }
        ),
        "homeowner"
      ),
      null
    );

    assert.equal(
      normalizeCanonicalMessage(
        reminderMessage(
          payload,
          {
            reference: {
              type:
                "payment_reminder",
              sourceType:
                "INVOICE",
              invoiceId:
                INVOICE_ID,
              paymentRequirementId:
                null,
              jobId:
                JOB_ID,
              publicUrl:
                "https://example.test",
            },
          }
        ),
        "homeowner"
      ),
      null
    );
  }
);

test(
  "Payment Reminder fails closed for invalid amount, timezone, due truth, or unknown payload fields",
  () => {
    const invalid = [
      {
        ...invoicePayload(),
        amountMinor: 0,
      },
      {
        ...invoicePayload(),
        timeZone:
          "Not/AZone",
      },
      {
        ...invoicePayload(),
        due: {
          mode:
            "SPECIFIC_DATE",
          date:
            "2026-09-04",
          effectiveDate:
            "2026-09-03",
        },
      },
      {
        ...invoicePayload(),
        unexpected:
          "not allowed",
      },
    ];

    for (
      const payload of invalid
    ) {
      assert.equal(
        normalizeCanonicalMessage(
          reminderMessage(
            payload
          ),
          "homeowner"
        ),
        null
      );
    }
  }
);

test(
  "Payment Reminder preserves the governed customer-facing message text",
  () => {
    const normalized =
      normalizeCanonicalMessage(
        reminderMessage(
          invoicePayload(),
          {
            text:
              "Friendly reminder: your Invoice balance is due today.",
          }
        ),
        "homeowner"
      );

    assert.equal(
      normalized.text,
      "Friendly reminder: your Invoice balance is due today."
    );
  }
);

test(
  "Conversation renders Payment Reminder through a dedicated non-payment card",
  () => {
    const thread =
      readFileSync(
        new URL(
          "../src/pages/ConversationThread.jsx",
          import.meta.url
        ),
        "utf8"
      );

    const card =
      readFileSync(
        new URL(
          "../src/components/ConversationPaymentReminderCard.jsx",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      thread,
      /msg\.type === "payment_reminder" && msg\.paymentReminder/
    );

    assert.match(
      thread,
      /ConversationPaymentReminderCard/
    );

    assert.match(
      thread,
      /data-conversation-timeline-item="payment-reminder"/
    );

    assert.match(
      card,
      /Reminder only/
    );

    assert.match(
      card,
      /does not record a payment/
    );

    assert.match(
      card,
      /does not record a payment or change the amount due/
    );

    assert.doesNotMatch(
      card,
      /Confirm Payment Received/
    );
  }
);
