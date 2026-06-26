import test from "node:test";
import assert from "node:assert/strict";

import {
  canProfessionalReceiveRequest,
  getRequestMatchSummary,
  inferServiceDomain,
  normalizeServiceCategory,
} from "../utils/professionalRequestMatching.js";

const handyman = {
  serviceDomain: "home_services",
  businessCategory: "handyman",
  serviceCategories: ["handyman"],
};

test("normalizes service categories and domains consistently for backend matching", () => {
  assert.equal(normalizeServiceCategory("homeHealthCare"), "home_health");
  assert.equal(normalizeServiceCategory("home_healthcare"), "home_health");
  assert.equal(normalizeServiceCategory("seniorCare"), "senior_care");
  assert.equal(normalizeServiceCategory("doorInstallation"), "door_installation");
  assert.equal(normalizeServiceCategory("doorReplacement"), "door_replacement");
  assert.equal(normalizeServiceCategory("generalMaintenance"), "general_maintenance");
  assert.equal(normalizeServiceCategory("medicalTransport"), "medical_transport");
  assert.equal(normalizeServiceCategory("vendorDispatch"), "vendor_dispatch");
  assert.equal(normalizeServiceCategory("painting"), "painting");
  assert.equal(normalizeServiceCategory("drywall"), "drywall");

  assert.equal(inferServiceDomain("homeHealthCare"), "healthcare");
  assert.equal(inferServiceDomain("doorInstallation"), "home_services");
  assert.equal(inferServiceDomain("doorReplacement"), "home_services");
  assert.equal(inferServiceDomain("tenantTicket"), "property_management");
  assert.equal(inferServiceDomain("medicalTransport"), "healthcare");
  assert.equal(inferServiceDomain("privateTransportation"), "transportation");
});

test("allows eligible home-service professionals to receive matching requests", () => {
  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      serviceDomain: "home_services",
      category: "doorRepair",
    }),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "painting",
        serviceCategories: ["painting"],
      },
      {
        serviceDomain: "home_services",
        category: "interior painting",
      }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      serviceDomain: "home_services",
      category: "drywallRepair",
    }),
    true
  );
});

test("supports safer specialty-level home-service and property matching", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "doorReplacement",
        serviceCategories: ["doorReplacement"],
      },
      { serviceDomain: "home_services", category: "doorReplacement" }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      serviceDomain: "home_services",
      category: "doorReplacement",
    }),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "painting",
        serviceCategories: ["painting"],
      },
      { serviceDomain: "home_services", category: "painting" }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "painting",
        serviceCategories: ["painting"],
      },
      { serviceDomain: "home_services", category: "electrical" }
    ),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      serviceDomain: "healthcare",
      category: "nursing",
    }),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      serviceDomain: "property_management",
      category: "tenantTicket",
    }),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "property_management",
        businessCategory: "propertyMaintenance",
        serviceCategories: ["propertyMaintenance"],
      },
      { serviceDomain: "property_management", category: "tenantTicket" }
    ),
    true
  );
});

test("allows property management and transportation requests only inside their domains", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "property_management",
        businessCategory: "propertyMaintenance",
        serviceCategories: ["propertyMaintenance"],
      },
      {
        serviceDomain: "property_management",
        category: "rentalMaintenance",
      }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "transportation",
        businessCategory: "transportation",
        serviceCategories: ["privateTransportation"],
      },
      {
        serviceDomain: "transportation",
        category: "privateTransportation",
      }
    ),
    true
  );
});

test("blocks healthcare requests from handyman and other home-service professionals", () => {
  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      serviceDomain: "healthcare",
      category: "homeHealthCare",
    }),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(handyman, {
      serviceDomain: "healthcare",
      category: "nursing",
    }),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "painting",
        serviceCategories: ["painting"],
      },
      {
        serviceDomain: "healthcare",
        category: "medicalCare",
      }
    ),
    false
  );
});

test("blocks home-service requests from healthcare professionals", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "healthcare",
        businessCategory: "homeHealthCare",
        serviceCategories: ["homeHealthCare"],
      },
      {
        serviceDomain: "home_services",
        category: "doorRepair",
      }
    ),
    false
  );
});

test("does not route emergency healthcare requests to handyman or home services", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "handyman",
        serviceCategories: ["handyman"],
        emergencyAvailable: true,
      },
      {
        serviceDomain: "healthcare",
        category: "homeHealthCare",
        type: "emergency",
        urgency: "critical",
      }
    ),
    false
  );
});

test("allows eligible emergency plumbing only when emergency availability passes", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "plumbing",
        serviceCategories: ["plumbing"],
        emergencyAvailable: true,
      },
      {
        serviceDomain: "home_services",
        category: "plumbing",
        type: "emergency",
      }
    ),
    true
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "plumbing",
        serviceCategories: ["plumbing"],
        emergencyAvailable: false,
      },
      {
        serviceDomain: "home_services",
        category: "plumbing",
        type: "emergency",
      }
    ),
    false
  );
});

test("unknown request and professional domains fail closed", () => {
  const unknownRequest = getRequestMatchSummary(handyman, {
    serviceDomain: "future_industry",
    category: "future_service",
  });

  assert.equal(unknownRequest.matched, false);
  assert.equal(unknownRequest.checks.domainMatched, false);

  const unknownProfessional = getRequestMatchSummary(
    {
      serviceDomain: "future_industry",
      businessCategory: "future_service",
      serviceCategories: ["future_service"],
    },
    {
      serviceDomain: "home_services",
      category: "doorRepair",
    }
  );

  assert.equal(unknownProfessional.matched, false);
  assert.equal(unknownProfessional.checks.domainMatched, false);
});

test("specialty, service area, and availability checks remain part of the backend contract", () => {
  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "painting",
        serviceCategories: ["painting"],
        serviceSpecialties: ["exterior"],
      },
      {
        serviceDomain: "home_services",
        category: "painting",
        serviceSpecialty: "interior",
      }
    ),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "painting",
        serviceCategories: ["painting"],
        zipCodes: "33101 33102",
      },
      {
        serviceDomain: "home_services",
        category: "painting",
        zipCode: "90210",
      }
    ),
    false
  );

  assert.equal(
    canProfessionalReceiveRequest(
      {
        serviceDomain: "home_services",
        businessCategory: "painting",
        serviceCategories: ["painting"],
        availability: ["weekdays"],
      },
      {
        serviceDomain: "home_services",
        category: "painting",
        timing: "weekend",
      }
    ),
    false
  );
});

test("backend matching utility is pure and does not mutate inputs", () => {
  const professional = {
    serviceDomain: "home_services",
    businessCategory: "handyman",
    serviceCategories: ["handyman"],
  };
  const request = {
    serviceDomain: "home_services",
    category: "doorRepair",
  };
  const professionalSnapshot = structuredClone(professional);
  const requestSnapshot = structuredClone(request);

  assert.equal(canProfessionalReceiveRequest(professional, request), true);
  assert.deepEqual(professional, professionalSnapshot);
  assert.deepEqual(request, requestSnapshot);
});
