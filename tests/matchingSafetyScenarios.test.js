import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProfessionalSpecialtyProfile,
} from "../src/utils/professionalOnboardingSpecialties.js";
import {
  buildRequestMatchingFields,
  enrichRequestWithMatchingFields,
} from "../src/utils/requestMatchingFields.js";
import {
  canProfessionalReceiveRequest,
} from "../src/utils/professionalRequestMatching.js";

function professionalProfile({
  businessCategory,
  serviceDomain,
  specialties = [],
  emergencyAvailable = "",
} = {}) {
  return {
    ...buildProfessionalSpecialtyProfile({
      selectedSpecialties: specialties,
    }),
    businessCategory,
    businessServiceDomain: serviceDomain,
    businessServiceDomains: serviceDomain ? [serviceDomain] : [],
    businessServiceSpecialties: specialties,
    emergencyAvailable,
  };
}

function savedRequest(fields = {}) {
  return enrichRequestWithMatchingFields({
    id: fields.id || `request-${Date.now()}`,
    title: fields.title,
    description: fields.description || "",
    category: fields.category,
    type: fields.type,
    urgency: fields.urgency,
    isEmergency: fields.isEmergency,
  });
}

function homeLeadCount(professional, requests = []) {
  return requests.filter((request) =>
    canProfessionalReceiveRequest(professional, request)
  ).length;
}

function businessLeadsVisibleTo(professional, leads = []) {
  return leads.filter((lead) => canProfessionalReceiveRequest(professional, lead));
}

function workCenterEmergencyVisibleTo(professional, emergencyRecord = {}) {
  return canProfessionalReceiveRequest(professional, {
    ...emergencyRecord,
    type: "emergency",
    isEmergency: true,
  });
}

const handyman = professionalProfile({
  businessCategory: "handyman",
  serviceDomain: "home_services",
  specialties: ["handyman"],
  emergencyAvailable: true,
});

const doorSpecialist = professionalProfile({
  businessCategory: "doorReplacement",
  serviceDomain: "home_services",
  specialties: ["door_replacement"],
});

const painter = professionalProfile({
  businessCategory: "painting",
  serviceDomain: "home_services",
  specialties: ["painting"],
  emergencyAvailable: true,
});

const propertyMaintenance = professionalProfile({
  businessCategory: "propertyMaintenance",
  serviceDomain: "property_management",
  specialties: ["tenant_ticket"],
});

test("home healthcare request is hidden from handyman lead surfaces", () => {
  const healthcareRequest = savedRequest({
    title: "Home health nurse visit",
  });

  assert.equal(healthcareRequest.serviceDomain, "healthcare");
  assert.equal(homeLeadCount(handyman, [healthcareRequest]), 0);
  assert.deepEqual(businessLeadsVisibleTo(handyman, [healthcareRequest]), []);
  assert.equal(workCenterEmergencyVisibleTo(handyman, healthcareRequest), false);
});

test("door replacement request is visible only to eligible home-service pros", () => {
  const doorReplacement = savedRequest({
    title: "Front door replacement",
  });

  assert.equal(doorReplacement.serviceDomain, "home_services");
  assert.equal(canProfessionalReceiveRequest(handyman, doorReplacement), true);
  assert.equal(canProfessionalReceiveRequest(doorSpecialist, doorReplacement), true);
  assert.equal(canProfessionalReceiveRequest(painter, doorReplacement), false);
});

test("tenant maintenance ticket is property-scoped and not a handyman fallback", () => {
  const tenantTicket = savedRequest({
    title: "Tenant maintenance ticket for Unit 204",
  });
  const propertyEligibleHandyman = professionalProfile({
    businessCategory: "handyman",
    serviceDomain: "property_management",
    specialties: ["tenant_ticket"],
  });

  assert.equal(tenantTicket.serviceDomain, "property_management");
  assert.equal(canProfessionalReceiveRequest(propertyMaintenance, tenantTicket), true);
  assert.equal(canProfessionalReceiveRequest(handyman, tenantTicket), false);
  assert.equal(canProfessionalReceiveRequest(propertyEligibleHandyman, tenantTicket), true);
});

test("unknown request has no handyman, painter, or emergency fallback", () => {
  const unknownRequest = savedRequest({
    title: "Mystery future service",
    category: "mystery_future_service",
    type: "emergency",
    isEmergency: true,
  });

  assert.equal(unknownRequest.serviceDomain, "");
  assert.equal(unknownRequest.serviceSpecialty, "");
  assert.equal(canProfessionalReceiveRequest(handyman, unknownRequest), false);
  assert.equal(canProfessionalReceiveRequest(painter, unknownRequest), false);
  assert.equal(workCenterEmergencyVisibleTo(handyman, unknownRequest), false);
});

test("healthcare emergency is hidden from home-service professionals", () => {
  const healthcareEmergency = savedRequest({
    title: "Home health emergency nursing support",
    type: "emergency",
    urgency: "critical",
    isEmergency: true,
  });
  const plumber = professionalProfile({
    businessCategory: "plumbing",
    serviceDomain: "home_services",
    specialties: ["plumbing"],
    emergencyAvailable: true,
  });

  assert.equal(healthcareEmergency.serviceDomain, "healthcare");
  assert.equal(workCenterEmergencyVisibleTo(handyman, healthcareEmergency), false);
  assert.equal(workCenterEmergencyVisibleTo(painter, healthcareEmergency), false);
  assert.equal(workCenterEmergencyVisibleTo(plumber, healthcareEmergency), false);
});

