// Presentation over the normalized authenticated opportunity collection only.
// hasResponded is certified by normalizeProfessionalOpportunity using the
// response identity, submitted status, pending relationship and disabled submission.
export function matchesOpportunityFilter(record, filter) {
  if (filter === "new") {
    return record?.responseSubmissionAvailable === true && record?.hasResponded === false;
  }
  if (filter === "awaiting-response") {
    return record?.status === "open" && record?.hasResponded === true &&
      record?.responseStatus === "submitted" &&
      record?.relationshipStatus === "pending" &&
      record?.responseSubmissionAvailable === false;
  }
  return true;
}

export function parseOpportunityFilter(route = "") {
  const [page, query = ""] = String(route).replace(/^#/, "").split("?", 2);
  if (page !== "businessLeads") return "all";
  const params = new URLSearchParams(query);
  const filters = params.getAll("opportunityFilter");
  return filters.length === 1 && ["new", "awaiting-response"].includes(filters[0])
    ? filters[0] : "all";
}

export function opportunityFilterRoute(filter) {
  return ["new", "awaiting-response"].includes(filter)
    ? `businessLeads?opportunityFilter=${filter}` : "businessLeads";
}

export function getOpportunityTileCounts(snapshot) {
  if (!(snapshot?.updatedAt > 0) || !Array.isArray(snapshot.records)) return null;
  return {
    new: snapshot.records.filter((record) => matchesOpportunityFilter(record, "new")).length,
    awaiting: snapshot.records.filter((record) => matchesOpportunityFilter(record, "awaiting-response")).length,
  };
}
