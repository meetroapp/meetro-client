import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL(
    "../src/pages/ConversationThread.jsx",
    import.meta.url
  ),
  "utf8"
);

test(
  "brand-new canonical Emergency conversation shows first-contact guidance",
  () => {
    assert.match(
      source,
      /data-emergency-first-contact="canonical"/
    );

    assert.match(
      source,
      /threadMessages\.length === 0/
    );

    assert.match(
      source,
      /isCanonicalEmergencyThread \? \(/
    );

    assert.match(
      source,
      /canonicalMessagesPhase === "ready"/
    );
  }
);

test(
  "welcome card is presentation only and does not fabricate chat history",
  () => {
    const marker =
      'data-emergency-first-contact="canonical"';

    const index = source.indexOf(marker);

    assert.ok(
      index >= 0,
      "missing Emergency first-contact card"
    );

    const nearby = source.slice(
      Math.max(0, index - 1400),
      Math.min(source.length, index + 2200)
    );

    assert.doesNotMatch(
      nearby,
      /setMessages\(|sendCanonical|authFetch|appendMessage|createMessage/
    );

    assert.doesNotMatch(
      nearby,
      /type:\s*["']message["']/
    );
  }
);

test(
  "first real message automatically removes the welcome card",
  () => {
    assert.match(
      source,
      /threadMessages\.length === 0[\s\S]*data-emergency-first-contact="canonical"/
    );

    assert.doesNotMatch(
      source,
      /emergencyFirstContactSeen|firstContactSeen|welcomeSeen/
    );

    assert.doesNotMatch(
      source,
      /localStorage\.(getItem|setItem)\([^)]*first.?contact/i
    );
  }
);

test(
  "homeowner receives a practical first-message instruction",
  () => {
    assert.match(
      source,
      /Send a quick message with anything the professional should know/
    );

    assert.match(
      source,
      /access instructions or a change in the situation/
    );
  }
);

test(
  "professional receives truthful introduction guidance without invented ETA",
  () => {
    assert.match(
      source,
      /Introduce yourself and confirm the next step/
    );

    assert.match(
      source,
      /Share an ETA only when you actually know it/
    );
  }
);

test(
  "welcome guidance supports the existing four conversation languages",
  () => {
    assert.match(source, /\ben:/);
    assert.match(source, /\bes:/);
    assert.match(source, /\bfr:/);
    assert.match(source, /"pt-BR":/);
  }
);
