import { useEffect, useMemo, useState } from "react";

import CanonicalInvoiceDetail from "../components/CanonicalInvoiceDetail.jsx";
import WorkCenterBackButton from "../components/WorkCenterBackButton.jsx";
import useLanguage from "../hooks/useLanguage.js";
import { fetchCustomerInvoice } from "../utils/invoicePaymentApi.js";
import { getInvoiceCopy } from "../utils/invoicePaymentLanguage.js";
import {
  buildCustomerInvoiceConversationReturnRoute,
  parseCustomerInvoiceReviewRoute,
} from "../utils/customerInvoiceReviewRoute.js";

export default function CustomerInvoiceReviewRoute({ setPage }) {
  const language = useLanguage();
  const copy = getInvoiceCopy(language);
  const route = useMemo(() => parseCustomerInvoiceReviewRoute(
    typeof window === "undefined" ? "" : window.location.hash
  ), []);
  const [state, setState] = useState({ status: "loading", invoice: null });

  useEffect(() => {
    let active = true;
    if (!route.valid) {
      queueMicrotask(() => active && setState({ status: "error", invoice: null }));
      return () => { active = false; };
    }
    void fetchCustomerInvoice({ invoiceId: route.invoiceId, setPage })
      .then((invoice) => {
        if (!active) return;
        setState(invoice.jobId === route.jobId
          ? { status: "ready", invoice }
          : { status: "error", invoice: null });
      })
      .catch(() => active && setState({ status: "error", invoice: null }));
    return () => { active = false; };
  }, [route, setPage]);

  const back = () => route.conversationId &&
    setPage?.(buildCustomerInvoiceConversationReturnRoute(route.conversationId));
  return (
    <main style={styles.page} className="meetro-readable-page" data-customer-invoice-route-status={state.status}>
      <WorkCenterBackButton label={copy.backConversation} onClick={back} />
      {state.status === "loading" && <p role="status">{copy.loading}</p>}
      {state.status === "error" && <p role="alert">{copy.unavailable}</p>}
      {state.invoice && <CanonicalInvoiceDetail invoice={state.invoice} language={language} />}
    </main>
  );
}

const styles = {
  page: { display: "grid", gap: 16, width: "min(100%, 920px)", minWidth: 0, margin: "0 auto", padding: "clamp(16px, 3vw, 28px)", paddingBottom: "calc(var(--meetro-bottom-nav-clearance, 0px) + 32px)" },
};
