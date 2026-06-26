import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDashboardScheduleItem,
  getDashboardScheduleDateLabel,
  getDashboardScheduleStatusLabel,
  getDashboardScheduleTitleLabel,
} from "../src/utils/businessDashboardScheduleLabels.js";

test("dashboard schedule status labels localize known statuses", () => {
  assert.equal(getDashboardScheduleStatusLabel("scheduled", "es"), "Programado");
  assert.equal(getDashboardScheduleStatusLabel("work_scheduled", "es"), "Trabajo programado");
  assert.equal(getDashboardScheduleStatusLabel("visit_scheduled", "es"), "Visita programada");
  assert.equal(getDashboardScheduleStatusLabel("pending", "es"), "Pendiente");
  assert.equal(getDashboardScheduleStatusLabel("confirmed", "es"), "Confirmado");
});

test("dashboard schedule date labels localize today and tomorrow", () => {
  assert.equal(getDashboardScheduleDateLabel("today", "es"), "Hoy");
  assert.equal(getDashboardScheduleDateLabel("tomorrow", "es"), "Mañana");
  assert.equal(getDashboardScheduleDateLabel("today", "en"), "Today");
});

test("dashboard schedule title labels translate system generated text only", () => {
  assert.equal(
    getDashboardScheduleTitleLabel("Visit with Bgone Home Renovation & Handyman Services", "es"),
    "Visita con Bgone Home Renovation & Handyman Services"
  );
  assert.equal(
    getDashboardScheduleTitleLabel("Scheduled Estimate Visit", "es"),
    "Visita de estimado programada"
  );
  assert.equal(
    getDashboardScheduleTitleLabel("Door installation", "es"),
    "Instalación de puerta"
  );
  assert.equal(
    getDashboardScheduleTitleLabel("Replace upstairs faucet", "es"),
    "Replace upstairs faucet"
  );
});

test("dashboard schedule item formatter preserves names and addresses", () => {
  const item = formatDashboardScheduleItem(
    {
      title: "Visit with Bgone Home Renovation & Handyman Services",
      location: "123 Main St",
      status: "work_scheduled",
      time: "10:00 AM",
      relativeDate: "today",
    },
    "es"
  );

  assert.equal(item.title, "Visita con Bgone Home Renovation & Handyman Services");
  assert.equal(item.meta, "123 Main St");
  assert.equal(item.status, "Trabajo programado");
  assert.equal(item.dateLabel, "Hoy");
});
