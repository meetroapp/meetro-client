const primaryNavigationOwners = Object.freeze({
  projectDetails: Object.freeze({
    personal: "myRequests",
    business: "contractorDashboard",
  }),
  connectedServices: Object.freeze({
    business: "profile",
  }),
});

export function getPrimaryNavigationOwner(
  currentPage = "",
  accountMode = "personal"
) {
  const page = String(currentPage || "");
  const mode = accountMode === "business" ? "business" : "personal";

  return primaryNavigationOwners[page]?.[mode] || page;
}
