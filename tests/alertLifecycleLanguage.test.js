import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  alertLifecycleLanguage,
} from "../src/utils/alertLifecycleLanguage.js";

const languages = [
  "en",
  "es",
  "fr",
  "pt-BR",
];

const requiredKeys = [
  "alerts.commercial.quoteDelivered.title",
  "alerts.commercial.quoteDelivered.message",

  "alerts.payment.depositRequired.title",
  "alerts.payment.depositRequired.message",

  "alerts.payment.depositRequestSent.title",
  "alerts.payment.depositRequestSent.message",

  "alerts.payment.depositPaymentRecorded.title",
  "alerts.payment.depositPaymentRecorded.message",

  "alerts.payment.depositSatisfied.title",
  "alerts.payment.depositSatisfied.message",

  "alerts.schedule.visitStarted.title",
  "alerts.schedule.visitStarted.message",

  "alerts.schedule.visitCompleted.title",
  "alerts.schedule.visitCompleted.message",

  "alerts.completion.workCompleted.title",
  "alerts.completion.workCompleted.message",

  "alerts.invoice.delivered.title",
  "alerts.invoice.delivered.message",

  "alerts.invoice.paymentRecorded.title",
  "alerts.invoice.paymentRecorded.message",

  "alerts.invoice.paid.title",
  "alerts.invoice.paid.message",
];

test("every current commercial lifecycle Alert has copy in all four supported languages", () => {
  for (const language of languages) {
    for (const key of requiredKeys) {
      const value =
        alertLifecycleLanguage[language]?.[key];

      assert.equal(
        typeof value,
        "string",
        `${language}:${key}`
      );

      assert.ok(
        value.trim().length > 0,
        `${language}:${key}`
      );
    }
  }
});

test("canonical language registry merges lifecycle Alert copy for every locale", () => {
  const source = readFileSync(
    new URL(
      "../src/utils/language.js",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    source,
    /import \{ alertLifecycleLanguage \}/
  );

  assert.match(
    source,
    /\.\.\.alertLifecycleLanguage\.en/
  );

  assert.match(
    source,
    /\.\.\.alertLifecycleLanguage\.es/
  );

  assert.match(
    source,
    /\.\.\.alertLifecycleLanguage\.fr/
  );

  assert.match(
    source,
    /\.\.\.alertLifecycleLanguage\["pt-BR"\]/
  );
});

test("Work Center badge represents attention rather than read state", () => {
  const source = readFileSync(
    new URL(
      "../src/components/WorkCenterWorkspaceSystem.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    source,
    /"item needs"/
  );

  assert.match(
    source,
    /"items need"/
  );

  assert.match(
    source,
    /attention/
  );

  assert.doesNotMatch(
    source,
    /unread Work Center/
  );
});
