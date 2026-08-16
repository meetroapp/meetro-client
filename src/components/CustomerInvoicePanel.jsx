import { useEffect, useState } from "react";

import CanonicalInvoiceDetail from "./CanonicalInvoiceDetail.jsx";
import { fetchCustomerJobInvoice } from "../utils/invoicePaymentApi.js";
import { getInvoiceCopy } from "../utils/invoicePaymentLanguage.js";

export default function CustomerInvoicePanel({ jobId, language = "en", setPage }) {
  const copy = getInvoiceCopy(language);
  const [state, setState] = useState({ status: "loading", invoice: null });

  useEffect(() => {
    let active = true;
    if (!jobId) {
      queueMicrotask(() => active && setState({ status: "idle", invoice: null }));
      return () => { active = false; };
    }
    queueMicrotask(() => active && setState({ status: "loading", invoice: null }));
    void fetchCustomerJobInvoice({ jobId, setPage })
      .then((invoice) => active && setState({ status: "ready", invoice }))
      .catch((error) => active && setState({
        status: error?.status === 404 ? "empty" : "error",
        invoice: null,
      }));
    return () => { active = false; };
  }, [jobId, setPage]);

  if (state.status === "idle" || state.status === "empty") return null;
  return (
    <section style={styles.section} data-customer-invoice-status={state.status}>
      <div style={styles.heading}>
        <span style={styles.eyebrow}>{copy.invoice}</span>
        <h2 style={styles.title}>{copy.title}</h2>
      </div>
      {state.status === "loading" && <p role="status">{copy.loading}</p>}
      {state.status === "error" && <p role="alert">{copy.unavailable}</p>}
      {state.invoice && <CanonicalInvoiceDetail invoice={state.invoice} language={language} />}
    </section>
  );
}

const styles = {
  section: { display: "grid", gap: 12, minWidth: 0, marginTop: 8 },
  heading: { display: "grid", gap: 3 },
  eyebrow: { color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" },
  title: { margin: 0, fontSize: 20, letterSpacing: 0 },
};
