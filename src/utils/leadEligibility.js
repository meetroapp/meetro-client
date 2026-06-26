import {
  canProfessionalReceiveRequest,
  getRequestMatchSummary,
} from "./professionalRequestMatching.js";
import {
  canProfessionalServeArea,
  getServiceAreaMatchSummary,
} from "./serviceAreaMatching.js";

export function getLeadEligibilitySummary(professional = {}, request = {}, options = {}) {
  const requestMatch = getRequestMatchSummary(professional, request);
  const serviceMatched = canProfessionalReceiveRequest(professional, request);

  if (!serviceMatched) {
    return {
      eligible: false,
      serviceMatched: false,
      serviceAreaMatched: false,
      requestMatch,
      serviceArea: null,
    };
  }

  const serviceArea = getServiceAreaMatchSummary(professional, request, options);
  const serviceAreaMatched = canProfessionalServeArea(
    professional,
    request,
    options
  );

  return {
    eligible: serviceAreaMatched,
    serviceMatched: true,
    serviceAreaMatched,
    requestMatch,
    serviceArea,
  };
}

export function canProfessionalReceiveLead(professional = {}, request = {}, options = {}) {
  return getLeadEligibilitySummary(professional, request, options).eligible;
}
