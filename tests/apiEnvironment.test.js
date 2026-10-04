import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_API_URL,
  STAGING_API_URL,
  resolveApiUrl,
} from "../src/api.js";

test("explicit API URL wins and is normalized", () => {
  assert.equal(
    resolveApiUrl({
      MODE: "staging",
      PROD: true,
      VITE_API_URL: "https://example.test/api///",
    }),
    "https://example.test/api"
  );
});

test("staging mode resolves to staging even during a Vite production build", () => {
  assert.equal(
    resolveApiUrl({
      MODE: "staging",
      PROD: true,
    }),
    STAGING_API_URL
  );
});

test("development without explicit API URL resolves away from production", () => {
  assert.equal(
    resolveApiUrl({
      MODE: "development",
      DEV: true,
    }),
    STAGING_API_URL
  );
});

test("production mode preserves the production API default", () => {
  assert.equal(
    resolveApiUrl({
      MODE: "production",
      PROD: true,
    }),
    PRODUCTION_API_URL
  );
});

test("missing environment metadata fails away from production", () => {
  assert.equal(resolveApiUrl({}), STAGING_API_URL);
});
