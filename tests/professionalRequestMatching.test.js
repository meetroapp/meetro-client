import test from "node:test";
import assert from "node:assert/strict";

import {
  canProfessionalReceiveRequest,
  getRequestMatchSummary,
  inferServiceDomain,
  normalizeServiceCategory,
} from "../src/utils/professionalRequestMatching.js";

const handyman = {
  businessCategory: "handyman",
  serviceCategories: ["Handyman"],
};

test("normalizes known service categories and infers domains safely", () => {
  assert.equal(normalizeServiceCategory("homeHealthCare"), "home_health");
  assert.equal(normalizeServiceCategory("home_healthcare"), "home_health");
  assert.equal(normalizeServiceCategory("seniorCare"), "senior_care");
  assert.equal(normalizeServiceCategory("doorInstallation"), "door_installation");
  assert.equal(normalizeServiceCategory("doorReplacement"), "door_replacement");
  assert.equal(normalizeServiceCategory("generalMaintenance"), "general_maintenance");
  assert.equal(normalizeServiceCategory("medicalTransport"), "medical_transport");
  assert.equal(normalizeServiceCategory("vendorDispatch"), "vendor_dispatch");

  assert.equal(inferServiceDomain("homeHealthCare"), "healthcare");
  assert.equal(inferServiceDomain("doorInstallation"), "home_services");
  assert.equal(inferServiceDomain("doorReplacement"), "home_services");
  assert.equal(inferServiceDomain("tenantTicket"), "property_management");
  assert.equal(inferServiceDomain("medicalTransport"), "healthcare");
  assert.equal(inferServiceDomain("not_a_known_domain"), "");
});

test("allows eligible home-service requests", () => {
  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      category: "doorRepair",
    }),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      { businessCategory: "painting", serviceCategories: ["Painting"] },
      { category: "interior painting" }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      category: "drywallRepair",
    }),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        businessCategory: "propertyMaintenance",
        serviceCategories: ["Property Maintenance"],
      },
      { category: "rentalMaintenance" }
    ),
    true
  );
});

test("supports safer specialty-level home-service and property matching", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      { businessCategory: "doorReplacement", serviceCategories: ["doorReplacement"] },
      { category: "doorReplacement" }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      category: "doorReplacement",
    }),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      title: "Kitchen remodel request",
      description: "Cabinet replacement",
      category: "handyman",
      serviceSpecialty: "cabinetry",
    }),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      { businessCategory: "painting", serviceCategories: ["Painting"] },
      { category: "painting" }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      { businessCategory: "painting", serviceCategories: ["Painting"] },
      { category: "electrical" }
    ),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      category: "nursing",
    }),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      category: "tenantTicket",
    }),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        businessCategory: "propertyMaintenance",
        serviceCategories: ["Property Maintenance"],
      },
      { category: "tenantTicket" }
    ),
    true
  );
});

test("allows eligible plumbing emergencies with emergency availability", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        businessCategory: "plumbing",
        serviceCategories: ["Plumbing"],
        emergencyAvailable: true,
      },
      {
        category: "plumbing",
        type: "emergency",
        urgency: "critical",
      }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        businessCategory: "handyman",
        serviceCategories: ["Handyman"],
        emergencyAvailable: true,
      },
      {
        category: "plumbing",
        type: "emergency",
      }
    ),
    true
  );
});

test("blocks wrong-domain and wrong-category routing", () => {
  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      category: "homeHealthCare",
    }),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      category: "nursing",
    }),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(
      { businessCategory: "painting", serviceCategories: ["Painting"] },
      { category: "medicalCare" }
    ),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(
      { businessCategory: "electrical", serviceCategories: ["Electrical"] },
      { category: "cleaning" }
    ),
    false
  );
});

test("does not default unknown-domain requests to handyman", () => {
  const summary = getRequestMatchSummary(handyman, {
    category: "mystery_future_service",
  });

  assert.equal(summary.requestDomain, "");
  assert.equal(summary.matched, false);
});

test("blocks healthcare emergencies from handyman routing", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        businessCategory: "handyman",
        serviceCategories: ["Handyman"],
        emergencyAvailable: true,
      },
      {
        category: "homeHealthCare",
        type: "emergency",
      }
    ),
    false
  );
});

test("requires emergency availability when the professional profile declares it", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        businessCategory: "plumbing",
        serviceCategories: ["Plumbing"],
        emergencyAvailable: false,
      },
      {
        category: "plumbing",
        type: "emergency",
      }
    ),
    false
  );
});
