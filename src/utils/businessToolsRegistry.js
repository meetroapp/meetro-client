export const BUSINESS_TOOL_STATUS = Object.freeze({
  READY: "ready",
  READ_ONLY: "read_only",
  PREVIEW: "preview",
  COMING_SOON: "coming_soon",
});

export const BUSINESS_TOOLS_AUDIT = Object.freeze([
  { id: "businessProfile", title: "Business Profile", status: BUSINESS_TOOL_STATUS.READY, route: "contractorProfile" },
  { id: "availability", title: "Availability", status: BUSINESS_TOOL_STATUS.READY, route: "businessAvailability" },
  { id: "professionalSetup", title: "Professional Setup", status: BUSINESS_TOOL_STATUS.READY, route: "professionalOnboarding" },
  { id: "customers", title: "Customer Relationships", status: BUSINESS_TOOL_STATUS.READ_ONLY, route: "customerRelationshipsCenter" },
  { id: "portfolio", title: "Portfolio", status: BUSINESS_TOOL_STATUS.READY, route: "projectGallery" },
  { id: "hiringCenter", title: "Hiring Center", status: BUSINESS_TOOL_STATUS.READ_ONLY, route: "hiringCenter" },
  { id: "teamMembers", title: "Team Members", status: BUSINESS_TOOL_STATUS.READ_ONLY, route: "teamMembers" },
  { id: "assetCenter", title: "Asset Center", status: BUSINESS_TOOL_STATUS.READ_ONLY, route: "assetCenter" },
  { id: "serviceEvaluations", title: "Service Types & Evaluations", status: BUSINESS_TOOL_STATUS.READ_ONLY, route: "serviceTypesEvaluations" },
  { id: "findingsLibrary", title: "Findings Library", status: BUSINESS_TOOL_STATUS.COMING_SOON, route: null },
  { id: "knowledgeBase", title: "Knowledge Base", status: BUSINESS_TOOL_STATUS.COMING_SOON, route: null },
  { id: "materialsLibrary", title: "Materials Library", status: BUSINESS_TOOL_STATUS.READ_ONLY, route: "materialsLibrary" },
  { id: "pricingLibrary", title: "Price Book / Pricing Library", status: BUSINESS_TOOL_STATUS.READ_ONLY, route: "pricingLibrary" },
  { id: "quickQuote", title: "Quick Quote Builder", status: BUSINESS_TOOL_STATUS.READY, route: "quoteBuilder" },
  { id: "quickInvoice", title: "Quick Invoice Builder", status: BUSINESS_TOOL_STATUS.READY, route: "invoiceBuilder" },
  { id: "contractTemplates", title: "Contract Templates", status: BUSINESS_TOOL_STATUS.READ_ONLY, route: "contractTemplates" },
  { id: "reportsCenter", title: "Reports Center", status: BUSINESS_TOOL_STATUS.PREVIEW, route: "reportsCenter" },
  { id: "permitCenter", title: "Permit Center", status: BUSINESS_TOOL_STATUS.PREVIEW, route: "permitCenter" },
  { id: "complianceCenter", title: "Compliance Center", status: BUSINESS_TOOL_STATUS.PREVIEW, route: "complianceCenter" },
  { id: "businessIntelligence", title: "Business Intelligence", status: BUSINESS_TOOL_STATUS.PREVIEW, route: "businessIntelligence" },
  { id: "aiHelp", title: "AI Business Help", status: BUSINESS_TOOL_STATUS.READY, route: "profile" },
  { id: "reviews", title: "Reviews", status: BUSINESS_TOOL_STATUS.COMING_SOON, route: null },
  { id: "settings", title: "Settings", status: BUSINESS_TOOL_STATUS.READY, route: "profile" },
  { id: "legal", title: "Legal", status: BUSINESS_TOOL_STATUS.READY, route: "legal" },
  { id: "subscription", title: "Plan & Subscription", status: BUSINESS_TOOL_STATUS.READY, route: "professionalSubscription" },
]);

export function getBusinessToolAuditRows() {
  return BUSINESS_TOOLS_AUDIT.map((tool) => ({ ...tool }));
}

export function getBusinessToolById(toolId) {
  return getBusinessToolAuditRows().find((tool) => tool.id === toolId) || null;
}

export function getBusinessToolStatusLabel(status, language = "en") {
  const isSpanish = language === "es";
  const labels = {
    [BUSINESS_TOOL_STATUS.READY]: isSpanish ? "Listo" : "Ready",
    [BUSINESS_TOOL_STATUS.READ_ONLY]: isSpanish ? "Solo lectura" : "Read-only",
    [BUSINESS_TOOL_STATUS.PREVIEW]: isSpanish ? "Vista previa" : "Preview",
    [BUSINESS_TOOL_STATUS.COMING_SOON]: isSpanish ? "Próximamente" : "Coming Soon",
  };

  return labels[status] || labels[BUSINESS_TOOL_STATUS.COMING_SOON];
}

export function getBusinessToolStatusTone(status) {
  if (status === BUSINESS_TOOL_STATUS.READY) return "ready";
  if (status === BUSINESS_TOOL_STATUS.READ_ONLY) return "readonly";
  if (status === BUSINESS_TOOL_STATUS.PREVIEW) return "preview";
  return "soon";
}
