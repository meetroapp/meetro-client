import test from "node:test";
import assert from "node:assert/strict";
import {
  getHomeownerServiceHistory,
  isClosedServiceStatus,
  recordMatchesHomeowner,
} from "../src/utils/homeownerServiceHistory.js";

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));

  return {
    get length() {
      return data.size;
    },
    key(index) {
      return Array.from(data.keys())[index] || null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("recognizes closure-completed service statuses without treating completion as history", () => {
  assert.equal(isClosedServiceStatus("completed"), false);
  assert.equal(isClosedServiceStatus("complete"), false);
  assert.equal(isClosedServiceStatus("closed"), true);
  assert.equal(isClosedServiceStatus("closure_completed"), true);
  assert.equal(isClosedServiceStatus("history"), true);
  assert.equal(isClosedServiceStatus("active"), false);
});

test("reads closed completedProjects as homeowner service history", () => {
  const storage = createStorage({
    userName: "Sarah Dommerich",
    completedProjects: JSON.stringify([
      {
        id: "job_sarah_1",
        status: "closed",
        title: "Door Replacement",
        customerName: "Sarah Dommerich",
        professionalName: "Bgone Home Renovation",
        closedAt: "2026-06-20T12:00:00.000Z",
        finalTotal: 850,
        paymentStatus: "paid",
      },
    ]),
  });

  const history = getHomeownerServiceHistory(storage);

  assert.equal(history.length, 1);
  assert.equal(history[0].title, "Door Replacement");
  assert.equal(history[0].professionalName, "Bgone Home Renovation");
  assert.equal(history[0].finalAmount, 850);
  assert.equal(history[0].paymentStatus, "paid");
});

test("keeps Sarah and William service history scoped", () => {
  const storage = createStorage({
    userName: "Sarah Dommerich",
    completedProjects: JSON.stringify([
      {
        id: "job_sarah",
        status: "closed",
        title: "Sarah Door Repair",
        customerName: "Sarah Dommerich",
      },
      {
        id: "job_william",
        status: "closed",
        title: "William Cabinet Repair",
        customerName: "William Molina",
      },
    ]),
  });

  const history = getHomeownerServiceHistory(storage);

  assert.equal(history.length, 1);
  assert.equal(history[0].title, "Sarah Door Repair");
  assert.equal(
    recordMatchesHomeowner(
      { customerName: "William Molina" },
      { name: "sarah dommerich" }
    ),
    false
  );
});

test("links submitted review to the matching service history card", () => {
  const storage = createStorage({
    userName: "Sarah Dommerich",
    completedProjects: JSON.stringify([
      {
        id: "job_sarah_1",
        requestId: "request_sarah_1",
        status: "closed",
        title: "Emergency Plumbing",
        customerName: "Sarah Dommerich",
      },
    ]),
    meetroProfessionalReviews: JSON.stringify([
      {
        professionalId: "business_1",
        professionalName: "Bgone Home Renovation",
        customerDisplayName: "Sarah",
        rating: 5,
        comment: "Clear and fast.",
        service: "Emergency Plumbing",
        jobId: "request_sarah_1",
      },
    ]),
  });

  const history = getHomeownerServiceHistory(storage);

  assert.equal(history.length, 1);
  assert.equal(history[0].review.rating, 5);
  assert.equal(history[0].review.comment, "Clear and fast.");
});

test("dedupes completedProjects over duplicate homeownerRequests", () => {
  const storage = createStorage({
    userName: "Sarah Dommerich",
    completedProjects: JSON.stringify([
      {
        id: "request_1",
        requestId: "request_1",
        status: "closed",
        title: "Closed Job",
        customerName: "Sarah Dommerich",
      },
    ]),
    homeownerRequests: JSON.stringify([
      {
        requestId: "request_1",
        status: "closed",
        title: "Duplicate Closed Job",
        homeownerName: "Sarah Dommerich",
      },
    ]),
  });

  const history = getHomeownerServiceHistory(storage);

  assert.equal(history.length, 1);
  assert.equal(history[0].title, "Closed Job");
});
