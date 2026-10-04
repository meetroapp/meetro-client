const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

export function buildInvoiceBuilderRoute({ jobId, invoiceId = "" } = {}) {
  const exactJobId = uuid(jobId);
  const exactInvoiceId = uuid(invoiceId);
  if (!exactJobId || (invoiceId && !exactInvoiceId)) return "";
  const parameters = new URLSearchParams({ jobId: exactJobId });
  if (exactInvoiceId) parameters.set("invoiceId", exactInvoiceId);
  return `invoiceBuilder?${parameters.toString()}`;
}

export function parseInvoiceBuilderRoute(hash = "") {
  const [page = "", query = ""] = String(hash).replace(/^#/, "").split("?", 2);
  const parameters = new URLSearchParams(query);
  const hasJobId = parameters.has("jobId");
  const hasInvoiceId = parameters.has("invoiceId");
  const jobId = uuid(parameters.get("jobId"));
  const invoiceId = uuid(parameters.get("invoiceId"));
  const invalidJobId = hasJobId && !jobId;
  const invalidInvoiceId = hasInvoiceId && !invoiceId;
  return Object.freeze({
    page,
    jobId,
    invoiceId,
    valid:
      page === "invoiceBuilder" &&
      !invalidJobId &&
      !invalidInvoiceId &&
      (!hasInvoiceId || Boolean(jobId)),
    invalidJobId,
    invalidInvoiceId,
    intent: invoiceId ? "EXACT_CANONICAL_INVOICE" : jobId ? "JOB_PREPARATION" : "STANDALONE",
  });
}

function invoicePresentation(invoice) {
  if (invoice.status === "PAID") {
    return { heading: "Invoice paid", statusLabel: "Paid", actionLabel: "View Invoice" };
  }
  if (invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID") {
    return {
      heading: "Invoice sent",
      statusLabel: invoice.status === "PARTIALLY_PAID" ? "Partially paid" : "Sent",
      actionLabel: "Review Invoice",
    };
  }
  return { heading: "Invoice draft ready", statusLabel: "Draft", actionLabel: "Review Invoice" };
}

export function resolveCompletedJobInvoiceHandoff(workspace, jobId) {
  const exactJobId = uuid(jobId);
  if (!exactJobId || !workspace) return Object.freeze({ status: "unavailable" });

  const invoices = Array.isArray(workspace.invoices)
    ? workspace.invoices.filter((invoice) => invoice?.jobId === exactJobId)
    : [];
  if (invoices.length > 1) return Object.freeze({ status: "unavailable" });
  if (invoices.length === 1) {
    const invoice = invoices[0];
    const route = buildInvoiceBuilderRoute({ jobId: exactJobId, invoiceId: invoice.invoiceId });
    if (!route) return Object.freeze({ status: "unavailable" });
    return Object.freeze({
      status: "existing",
      invoice,
      route,
      ...invoicePresentation(invoice),
    });
  }

  const readyJobs = Array.isArray(workspace.readyJobs)
    ? workspace.readyJobs.filter((job) => job?.jobId === exactJobId)
    : [];
  if (readyJobs.length !== 1) return Object.freeze({ status: "unavailable" });
  const job = readyJobs[0];
  return Object.freeze({
    status: "ready",
    job,
    route: buildInvoiceBuilderRoute({ jobId: exactJobId }),
    heading: "Ready to invoice",
    statusLabel: "Ready",
    actionLabel: "Prepare Invoice",
  });
}
