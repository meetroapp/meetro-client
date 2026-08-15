const primaryNavigationOwners = Object.freeze({
  projectDetails: Object.freeze({
    personal: "myRequests",
    business: "contractorDashboard",
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
