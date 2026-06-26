import test from "node:test";
import assert from "node:assert/strict";

import { parseUserScheduleTime } from "../src/utils/assistantScheduleTime.js";

test("parses explicit PM schedule time", () => {
  assert.deepEqual(parseUserScheduleTime("Schedule a visit tomorrow at 3 PM"), {
    hour: 15,
    minute: 0,
    value: "15:00",
    display: "3:00 PM",
    spoken: "3:00 PM",
  });
});

test("parses compact pm schedule time", () => {
  assert.equal(parseUserScheduleTime("Create appointment 3pm")?.value, "15:00");
  assert.equal(parseUserScheduleTime("Create appointment 3pm")?.spoken, "3:00 PM");
});

test("parses dotted p.m. schedule time", () => {
  assert.equal(parseUserScheduleTime("Book a consultation at 3 p.m.")?.value, "15:00");
  assert.equal(parseUserScheduleTime("Book a consultation at 3 p.m.")?.spoken, "3:00 PM");
});

test("parses afternoon context as PM", () => {
  assert.equal(parseUserScheduleTime("Schedule walkthrough tomorrow afternoon at 3")?.value, "15:00");
  assert.equal(parseUserScheduleTime("Schedule walkthrough tomorrow afternoon at 3")?.spoken, "3:00 PM");
});

test("parses explicit AM schedule time", () => {
  assert.equal(parseUserScheduleTime("Schedule a visit at 3 AM")?.value, "03:00");
  assert.equal(parseUserScheduleTime("Schedule a visit at 3 AM")?.spoken, "3:00 AM");
});

test("parses noon and midnight", () => {
  assert.equal(parseUserScheduleTime("Schedule estimate at noon")?.value, "12:00");
  assert.equal(parseUserScheduleTime("Schedule estimate at noon")?.spoken, "12 PM");
  assert.equal(parseUserScheduleTime("Schedule estimate at midnight")?.value, "00:00");
  assert.equal(parseUserScheduleTime("Schedule estimate at midnight")?.spoken, "12 AM");
});
