// Isolated UI fixtures only; production continues to use authenticated APIs.
export const JOB = "33333333-3333-4333-8333-333333333333";
export const DRAFT = "44444444-4444-4444-8444-444444444444";
export const blankQuote = () => ({ customerName: "", projectTitle: "", projectDescription: "", recommendedSolution: "", quoteDate: "2026-09-08", quoteNumber: "", currency: "USD", lineItems: [], laborItems: [], materialItems: [], agreement: {}, total: 0 });
export const customers = ["Bob Hamel", "Antony Guzman", "Sarah Mitchell", "David Chen", "Maria Rodriguez", "James Wilson", "Lisa Park", "Michael Brown"].map((displayName, index) => ({
  id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`, displayName,
  status: "ACTIVE", partyType: "PERSON", roles: [{ role: "CUSTOMER", active: true }],
  email: `customer${index + 1}@example.test`, phone: "", address: "", companyName: "",
}));
export const relationships = customers.map((contact, index) => ({ id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`, businessContactId: contact.id, contractorProfileId: 10, version: 1 }));
export function savedDocument(overrides = {}) {
  return { id: DRAFT, documentType: "QUOTE", status: "WORKING_DRAFT", reference: "Window repair", documentNumber: "Q-0000049", version: 1, jobId: null, content: { ...blankQuote(), projectTitle: "Window repair", customerName: "Bob Hamel", recommendedSolution: "Repair the windows", total: 280 }, customerDisplayName: "Bob Hamel", customerParty: { businessContactId: customers[0].id, customerRelationshipId: relationships[0].id }, workspace: { activeDocument: "QUOTE", instructions: [], manualOverrides: {}, privateReminders: [] }, photos: [], createdAt: "2026-09-08T15:00:00Z", updatedAt: "2026-09-08T15:53:44Z", ...overrides };
}
export function createQuoteMobileFixture() {
  const calls = [], documents = new Map([[DRAFT, savedDocument()]]);
  const ok = (data) => ({ response: { ok: true, status: 200 }, data: { success: true, ...data } });
  const fetch = async (path, options = {}) => {
    const method = options.method || "GET";
    calls.push({ path, ...options, method });
    if (path === "/my-contractor-profile") return ok({ profile: { id: 10, business_name: "Fixture business" } });
    if (path.startsWith("/business-contacts?")) return ok({ contacts: customers });
    if (path.startsWith("/business-contacts/")) return ok({ contact: customers.find(({ id }) => path.includes(id)) });
    if (path.startsWith("/business-customer-relationships?")) return ok({ relationships });
    if (path.startsWith("/business-customer-relationships/by-contact/")) return ok({ relationship: relationships.find(({ businessContactId }) => path.includes(businessContactId)) });
    if (path === "/professional/quote-customer-options") return ok({ code: "PROFESSIONAL_QUOTE_CUSTOMER_OPTIONS_LOADED", contractVersion: 1, customers: [{ customerId: 7, displayName: "Jordan Lee", jobs: [{ jobId: JOB, requestId: 91, relationshipId: 81, title: "Kitchen repair", city: "Cape Coral", serviceArea: null, customerName: "Jordan Lee", newQuoteEligible: true, existingQuote: null }] }] });
    if (path.startsWith("/business-document-drafts?")) {
      const params = new URLSearchParams(path.split("?")[1]);
      const needle = (params.get("search") || "").toLowerCase();
      return ok({ documents: [...documents.values()].filter((document) => document.documentType === params.get("type") && JSON.stringify(document).toLowerCase().includes(needle)) });
    }
    if (path === "/business-document-drafts" && method === "POST") {
      const payload = JSON.parse(options.body);
      const document = savedDocument({ ...payload, documentNumber: "Q-0000050", customerDisplayName: payload.content.customerName || null });
      documents.set(document.id, document); return ok({ document });
    }
    if (path.startsWith("/business-document-drafts/")) {
      const id = path.split("/")[2];
      if (method === "DELETE") { documents.delete(id); return ok({ deletedDraftId: id }); }
      if (method === "PATCH") {
        const payload = JSON.parse(options.body), document = savedDocument({ ...documents.get(id), ...payload, version: documents.get(id).version + 1 });
        documents.set(id, document); return ok({ document });
      }
      if (path.endsWith("/deliveries")) return ok({ deliveries: [] });
      return ok({ document: documents.get(id) });
    }
    if (method !== "GET") throw new Error(`Unexpected fixture mutation: ${method} ${path}`);
    return { response: { ok: false, status: 503 }, data: { success: false, message: "Unavailable in isolated UI fixture" } };
  };
  return { fetch, calls, documents };
}
