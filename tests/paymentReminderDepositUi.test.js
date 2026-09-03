import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    new URL(
      "../src/components/ProfessionalDepositCard.jsx",
      import.meta.url
    ),
    "utf8"
  );

test(
  "Deposit Reminder is bounded to canonical due Deposit truth",
  () => {
    assert.match(
      source,
      /const canSendReminder = Boolean\(/
    );

    assert.match(
      source,
      /\["DUE", "PARTIALLY_SATISFIED"\]\.includes\(deposit\.state\)/
    );

    assert.match(
      source,
      /deposit\.remainingMinor > 0/
    );

    assert.match(
      source,
      /deposit\.latestVersion > 0/
    );
  }
);

test(
  "Deposit Reminder uses the canonical current Deposit version",
  () => {
    assert.match(
      source,
      /expectedVersion:\s*deposit\.latestVersion/
    );

    assert.match(
      source,
      /sendDepositPaymentReminder\(\{/
    );

    assert.match(
      source,
      /createPaymentReminderKey\("DEPOSIT"\)/
    );
  }
);

test(
  "Deposit Reminder has dedicated retry-safe idempotency",
  () => {
    assert.match(
      source,
      /reminderAttemptRef/
    );

    assert.match(
      source,
      /reminderAttemptRef\.current\.signature === signature/
    );

    assert.match(
      source,
      /messageText,\s*\};/
    );
  }
);

test(
  "Deposit Reminder fails closed and refreshes stale canonical truth",
  () => {
    assert.match(
      source,
      /STALE_PAYMENT_REMINDER_SOURCE/
    );

    assert.match(
      source,
      /fetchProfessionalPreWorkDeposit\(\{/
    );

    assert.match(
      source,
      /Review the current remaining balance/
    );
  }
);

test(
  "Deposit Reminder UI explicitly preserves Payment and scheduling authority",
  () => {
    assert.match(
      source,
      /Reminder only — this does not record a payment or unlock Approved Work scheduling\./
    );

    assert.match(
      source,
      /No payment was recorded and Approved Work scheduling was not changed\./
    );

    assert.match(
      source,
      /data-payment-reminder-form="deposit"/
    );

    assert.match(
      source,
      /data-action="send-deposit-payment-reminder"/
    );
  }
);

test(
  "Deposit Reminder custom message is optional and bounded",
  () => {
    assert.match(
      source,
      /const messageText =\s*reminderDraft\.trim\(\) \|\| null;/
    );

    assert.match(
      source,
      /maxLength=\{5000\}/
    );

    assert.match(
      source,
      /Leave blank to use Meetro's current remaining-deposit wording\./
    );
  }
);
