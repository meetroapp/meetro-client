import { useEffect, useState } from "react";

import { fetchProfessionalInvoiceWorkspace } from "../utils/invoicePaymentApi.js";
import { formatLocaleCurrency } from "../utils/localeFormat.js";
import { resolveCompletedJobInvoiceHandoff } from "../utils/completedJobInvoiceHandoff.js";

export default function CompletedJobInvoiceHandoff({ jobId, language = "en", setPage }) {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    if (!jobId) {
      return undefined;
    }
    let active = true;
    void fetchProfessionalInvoiceWorkspace({ limit: 50, setPage })
      .then((workspace) => {
        if (!active) return;
        setState(resolveCompletedJobInvoiceHandoff(workspace, jobId));
      })
      .catch(() => active && setState({ status: "unavailable" }));
    return () => { active = false; };
  }, [jobId, setPage]);

  if (!jobId) return <p role="alert">Invoice preparation is temporarily unavailable.</p>;
  if (state.status === "loading") return <p role="status">Loading Invoice details…</p>;
  if (state.status === "unavailable") return <p role="alert">Invoice preparation is temporarily unavailable.</p>;

  const source = state.status === "existing" ? state.invoice : state.job;
  const currency = state.status === "existing"
    ? source.currency
    : source.approvedAmount?.currency || "USD";
  const money = (minor) => formatLocaleCurrency((Number(minor) || 0) / 100, currency, {}, language);
  const totalMinor = state.status === "existing"
    ? source.totalMinor
    : source.approvedAmount?.totalMinor;
  const paidMinor = state.status === "existing"
    ? source.paidMinor
    : source.paymentsReceivedMinor;
  const balanceMinor = state.status === "existing"
    ? source.balanceMinor
    : source.amountStillDueMinor;
  return (
    <section aria-label={state.heading} data-completed-job-invoice-handoff={source.jobId}>
      <h3>{state.heading}</h3>
      <p>{state.statusLabel}</p>
      {state.status === "existing" ? <p>Invoice {source.invoiceNumber}</p> : null}
      <dl>
        <div><dt>{state.status === "existing" ? "Invoice total" : "Approved work"}</dt><dd>{money(totalMinor)}</dd></div>
        <div><dt>Payments received</dt><dd>{money(paidMinor)}</dd></div>
        <div><dt>Amount still due</dt><dd>{money(balanceMinor)}</dd></div>
      </dl>
      <button type="button" onClick={() => {
        localStorage.setItem("invoiceBuilderReturnPage", "workCenter");
        localStorage.setItem(
          "invoiceBuilderSource",
          state.status === "existing" ? "existing_canonical_invoice" : "completed_job"
        );
        setPage(state.route);
      }}>{state.actionLabel}</button>
    </section>
  );
}
