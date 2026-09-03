import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  getInvoiceCopy,
} from "../src/utils/invoicePaymentLanguage.js";

const source = fs.readFileSync(
  new URL(
    "../src/components/ProfessionalInvoiceWorkspace.jsx",
    import.meta.url
  ),
  "utf8"
);

test(
  "Invoice Reminder UI is bounded to unpaid issued Invoice truth",
  () => {
    assert.match(
      source,
      /\["SENT", "PARTIALLY_PAID"\]\.includes\(selected\.status\)/
    );

    assert.match(
      source,
      /selected\.balanceMinor > 0/
    );

    assert.match(
      source,
      /selected\.conversationId/
    );

    assert.match(
      source,
      /expectedVersion: selected\.currentVersion/
    );
  }
);

test(
  "Invoice Reminder uses dedicated reminder authority and idempotency",
  () => {
    assert.match(
      source,
      /createPaymentReminderKey\("INVOICE"\)/
    );

    assert.match(
      source,
      /sendInvoicePaymentReminder\(\{/
    );

    assert.match(
      source,
      /STALE_PAYMENT_REMINDER_SOURCE/
    );

    assert.match(
      source,
      /data-payment-reminder-form="invoice"/
    );
  }
);

test(
  "Invoice Reminder custom message is optional",
  () => {
    assert.match(
      source,
      /const messageText = reminderDraft\.trim\(\) \|\| null;/
    );

    assert.match(
      source,
      /maxLength=\{5000\}/
    );
  }
);

test(
  "Invoice Reminder copy exists in every supported Invoice language",
  () => {
    for (
      const language of [
        "en",
        "es",
        "fr",
        "pt-BR",
      ]
    ) {
      const copy =
        getInvoiceCopy(language);

      for (
        const key of [
          "sendReminder",
          "reminderTitle",
          "reminderDescription",
          "reminderMessage",
          "reminderPlaceholder",
          "reminderOnly",
          "confirmReminder",
          "sendingReminder",
          "reminderSent",
        ]
      ) {
        assert.equal(
          typeof copy[key],
          "string",
          `${language}.${key}`
        );

        assert.ok(
          copy[key].trim().length > 0,
          `${language}.${key}`
        );
      }
    }
  }
);

test(
  "Invoice Reminder explicitly preserves Payment truth",
  () => {
    const english =
      getInvoiceCopy("en");

    assert.match(
      english.reminderOnly,
      /does not mark the Invoice paid/i
    );

    assert.match(
      english.reminderOnly,
      /change its balance/i
    );

    assert.match(
      english.reminderSent,
      /balance was not changed/i
    );
  }
);
