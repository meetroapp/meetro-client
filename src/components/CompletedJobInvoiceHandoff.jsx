import { useEffect, useState } from "react";

import { fetchProfessionalInvoiceWorkspace } from "../utils/invoicePaymentApi.js";
import { formatLocaleCurrency } from "../utils/localeFormat.js";

export default function CompletedJobInvoiceHandoff({ jobId, language = "en", setPage }) {
  const [state, setState] = useState({ status: "loading", job: null });

  useEffect(() => {
    if (!jobId) {
      return undefined;
    }
    let active = true;
    void fetchProfessionalInvoiceWorkspace({ limit: 50, setPage })
      .then((workspace) => {
        if (!active) return;
        const job = workspace.readyJobs.find((item) => item.jobId === jobId) || null;
        setState({ status: job ? "ready" : "unavailable", job });
      })
      .catch(() => active && setState({ status: "unavailable", job: null }));
    return () => { active = false; };
  }, [jobId, setPage]);

  if (!jobId) return <p role="alert">Invoice preparation is temporarily unavailable.</p>;
  if (state.status === "loading") return <p role="status">Loading Invoice details…</p>;
  if (!state.job) return <p role="alert">Invoice preparation is temporarily unavailable.</p>;

  const { job } = state;
  const currency = job.approvedAmount?.currency || "USD";
  const money = (minor) => formatLocaleCurrency((Number(minor) || 0) / 100, currency, {}, language);
  return (
    <section aria-label="Ready to invoice" data-completed-job-invoice-handoff={job.jobId}>
      <h3>Ready to invoice</h3>
      <dl>
        <div><dt>Approved work</dt><dd>{money(job.approvedAmount?.totalMinor)}</dd></div>
        <div><dt>Payments received</dt><dd>{money(job.paymentsReceivedMinor)}</dd></div>
        <div><dt>Amount still due</dt><dd>{money(job.amountStillDueMinor)}</dd></div>
      </dl>
      <button type="button" onClick={() => {
        localStorage.setItem("invoiceBuilderReturnPage", "workCenter");
        localStorage.setItem("invoiceBuilderSource", "completed_job");
        setPage(`invoiceBuilder?jobId=${encodeURIComponent(job.jobId)}`);
      }}>Create Invoice</button>
    </section>
  );
}
