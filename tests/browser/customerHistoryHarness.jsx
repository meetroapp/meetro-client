import React from "react";
import { createRoot } from "react-dom/client";
import CustomerRelationshipsCenter from "../../src/pages/CustomerRelationshipsCenter.jsx";
import {
  applyAppLayoutDiagnostics,
  getDesktopContentMetrics,
  startAppLayoutCoordinator,
} from "../../src/utils/appLayout.js";
import "../../src/index.css";

const CONTACT_A = "11111111-1111-4111-8111-111111111111";
const CONTACT_B = "22222222-2222-4222-8222-222222222222";
const RELATIONSHIP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RELATIONSHIP_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ACTIVE_JOB = "33333333-3333-4333-8333-333333333333";
const COMPLETED_JOB = "44444444-4444-4444-8444-444444444444";

const relationships = [
  { id: RELATIONSHIP_A, contractorProfileId: 10, businessContactId: CONTACT_A, version: 1, createdAt: "2026-08-20T10:00:00.000Z", updatedAt: "2026-08-20T10:00:00.000Z", contact: { id: CONTACT_A, displayName: "Alex Morgan With A Long Customer Name", status: "ACTIVE", partyType: "PERSON" } },
  { id: RELATIONSHIP_B, contractorProfileId: 10, businessContactId: CONTACT_B, version: 1, createdAt: "2026-08-22T10:00:00.000Z", updatedAt: "2026-08-22T10:00:00.000Z", contact: { id: CONTACT_B, displayName: "Jordan Lee", status: "ACTIVE", partyType: "PERSON" } },
];

const jobs = Array.from({ length: 14 }, (_, index) => ({
  jobId: index === 0 ? ACTIVE_JOB : index === 1 ? COMPLETED_JOB : `${String(index + 5).padStart(8, "0")}-0000-4000-8000-000000000000`,
  title: index === 0 ? "Kitchen faucet installation with a naturally wrapping customer-relative Job title" : `Customer Job ${index + 1}`,
  status: index % 3 === 0 ? "ACTIVE" : "COMPLETED",
  completionState: index % 3 === 0 ? "ACTIVE" : "COMPLETED",
  createdAt: `2026-08-${String(Math.min(index + 1, 28)).padStart(2, "0")}T10:00:00.000Z`,
  ...(index % 3 === 0 ? {} : { completedAt: `2026-09-${String(Math.min(index + 1, 28)).padStart(2, "0")}T10:00:00.000Z` }),
}));

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

localStorage.setItem("token", "fixture-token");
window.fetch = async (input) => {
  const url = new URL(String(input), window.location.href);
  const path = url.pathname + url.search;
  window.__customerHistoryReads = (window.__customerHistoryReads || 0) + 1;
  if (path === "/my-contractor-profile") return json({ profile: { id: 10 } });
  if (path.startsWith("/business-customer-relationships?")) return json({ success: true, relationships });
  const activityMatch = path.match(/^\/business-customer-relationships\/([^/]+)\/activity$/);
  if (activityMatch) {
    const id = activityMatch[1];
    const contactId = id === RELATIONSHIP_A ? CONTACT_A : CONTACT_B;
    const work = id === RELATIONSHIP_A ? jobs : [];
    return json({ success: true, activity: {
      contractVersion: 1,
      relationship: { id, contractorProfileId: 10, businessContactId: contactId, contactStatus: "ACTIVE" },
      work,
      quotes: work.slice(0, 4).map((job, index) => ({ quoteId: `1${index}111111-1111-4111-8111-111111111111`, jobId: job.jobId, documentNumber: `Q-000${index + 1}`, status: "ISSUED", currency: "USD", totalMinor: 125000 + index })),
      invoices: work.slice(0, 3).map((job, index) => ({ invoiceId: `2${index}222222-2222-4222-8222-222222222222`, jobId: job.jobId, invoiceNumber: `INV-000${index + 1}`, status: index ? "PAID" : "PARTIALLY_PAID", currency: "USD", totalMinor: 125000, paidMinor: index ? 125000 : 75000, balanceMinor: index ? 0 : 50000 })),
      documents: [], media: [], deposits: [], payments: [], visits: [], workPerformed: [],
    } });
  }
  const relationshipMatch = path.match(/^\/business-customer-relationships\/([^/]+)$/);
  if (relationshipMatch) return json({ success: true, relationship: relationships.find((item) => item.id === relationshipMatch[1]) });
  const contactMatch = path.match(/^\/business-contacts\/([^/]+)$/);
  if (contactMatch) {
    const source = relationships.find((item) => item.businessContactId === contactMatch[1]);
    return json({ success: true, contact: { ...source.contact, version: 1 } });
  }
  return json({ success: false, code: "FIXTURE_ROUTE_MISSING" }, 404);
};

function Harness() {
  const [, rerender] = React.useState(0);
  React.useEffect(() => {
    const onViewport = () => rerender((value) => value + 1);
    window.addEventListener("resize", onViewport);
    window.visualViewport?.addEventListener("resize", onViewport);
    return () => {
      window.removeEventListener("resize", onViewport);
      window.visualViewport?.removeEventListener("resize", onViewport);
    };
  }, []);
  return <CustomerRelationshipsCenter setPage={(route) => document.documentElement.dataset.route = route} />;
}

const rootElement = document.getElementById("root");
applyAppLayoutDiagnostics(rootElement, getDesktopContentMetrics());
const stopLayoutCoordinator = startAppLayoutCoordinator({ root: rootElement });
window.addEventListener("pagehide", stopLayoutCoordinator, { once: true });
createRoot(rootElement).render(<Harness />);
