export function buildBusinessResponsibility(workflows = []) {
  const result = { waitingOnCustomer: 0, waitingOnProfessional: 0, waitingOnSystem: 0, waitingOnThirdParty: 0 };
  const fields = { customer: "waitingOnCustomer", professional: "waitingOnProfessional", system: "waitingOnSystem", third_party: "waitingOnThirdParty" };
  for (const workflow of workflows) if (fields[workflow.waitingOn]) result[fields[workflow.waitingOn]] += 1;
  return result;
}
