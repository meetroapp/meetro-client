import test from "node:test";
import assert from "node:assert/strict";

import { isRequestOwnedByAuthenticatedUser } from "../src/utils/authenticatedRequestOwnership.js";

test("stable authenticated user ID controls request ownership", () => {
  const activeUser = { id: "account-b", email: "shared@example.com" };

  assert.equal(
    isRequestOwnedByAuthenticatedUser(
      { user_id: "account-b", email: "other@example.com", status: "open" },
      activeUser
    ),
    true
  );
  assert.equal(
    isRequestOwnedByAuthenticatedUser(
      { user_id: "account-a", email: "shared@example.com", status: "open" },
      activeUser
    ),
    false
  );
  assert.equal(
    isRequestOwnedByAuthenticatedUser(
      { status: "open", post_type: "quote_request" },
      activeUser
    ),
    false
  );
});

test("email is used only when no stable authenticated user ID exists", () => {
  assert.equal(
    isRequestOwnedByAuthenticatedUser(
      { user_email: "account-b@example.com" },
      { email: "ACCOUNT-B@example.com" }
    ),
    true
  );
  assert.equal(
    isRequestOwnedByAuthenticatedUser(
      { user_email: "account-a@example.com" },
      { email: "account-b@example.com" }
    ),
    false
  );
});
