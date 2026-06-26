import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDateTimeDisplay,
  formatMessageTime,
  formatScheduleTime,
  formatTime,
} from "../src/utils/displayTime.js";

test("formatTime converts 24-hour time to US 12-hour display", () => {
  assert.equal(formatTime("19:09"), "7:09 PM");
  assert.equal(formatTime("13:30"), "1:30 PM");
  assert.equal(formatTime("08:15"), "8:15 AM");
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(formatTime("00:00"), "12:00 AM");
});

test("schedule and message formatters use the same presentation", () => {
  assert.equal(formatScheduleTime("18:45"), "6:45 PM");
  assert.equal(formatMessageTime("18:45"), "6:45 PM");
});

test("formatTime preserves existing 12-hour display without changing storage shape", () => {
  assert.equal(formatTime("7:09 PM"), "7:09 PM");
  assert.equal(formatTime("9 AM"), "9:00 AM");
});

test("formatDateTimeDisplay combines readable date and 12-hour time", () => {
  assert.equal(formatDateTimeDisplay("2026-06-24", "19:09"), "Jun 24, 2026 • 7:09 PM");
});
