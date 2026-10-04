import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  normalizeAuthenticatedHomeownerPost,
  normalizeAuthenticatedHomeownerPosts,
} from "../src/utils/backendHomeownerRequests.js";

const homeSource = readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);

test("authenticated backend posts normalize as active homeowner requests", () => {
  const source = {
    id: 5,
    title: "Staging request",
    description: "Request details",
    category: "handyman",
    location: "Local Area",
    created_at: "2026-07-20T02:27:43.936Z",
    image_url: "https://res.cloudinary.com/example/image/upload/photo-1.jpg",
    request_photos: [
      { secure_url: "https://res.cloudinary.com/example/image/upload/photo-2.jpg", display_order: 0 },
      { secure_url: "https://res.cloudinary.com/example/image/upload/photo-1.jpg", display_order: 1 },
    ],
    lifecycle_contract_version: 2,
  };

  const normalized = normalizeAuthenticatedHomeownerPost(source);
  assert.equal(normalized.requestId, 5);
  assert.equal(normalized.status, "open");
  assert.equal(normalized.lifecycleContractVersion, 2);
  assert.deepEqual(normalized.request_photos.map((photo) => photo.display_order), [0, 1]);
  assert.deepEqual(normalized.photos, source.request_photos.map((photo) => photo.secure_url));
  assert.notEqual(normalized.request_photos, source.request_photos);
  assert.deepEqual(source.request_photos.map((photo) => photo.display_order), [0, 1]);
});

test("authenticated backend post normalization rejects malformed records", () => {
  assert.deepEqual(normalizeAuthenticatedHomeownerPosts(null), []);
  assert.deepEqual(normalizeAuthenticatedHomeownerPosts([null, {}, { id: 7 }]), []);
});

test("Home and My Requests share authenticated backend post truth", () => {
  assert.match(homeSource, /authFetch\("\/posts", \{ cache: "no-store" \}, setPage\)/);
  assert.match(homeSource, /resolveHomeownerRequestCollection/);
  assert.match(homeSource, /legacyWorkflowStorageEnabled[\s\S]*backendHomeownerRequests/);
  assert.match(myRequestsSource, /resolveHomeownerRequestCollection\(result\)/);
  assert.doesNotMatch(myRequestsSource, /isRequestOwnedByAuthenticatedUser\(post/);
  assert.match(
    myRequestsSource,
    /const selectedRequest = isDetailView[\s\S]*resolveHomeownerRequestById\(requests, selectedRequestId\)/
  );
  assert.match(
    myRequestsSource,
    /const showsDedicatedDetail =[\s\S]*isDetailView && requestId === selectedRequestId/
  );
});
