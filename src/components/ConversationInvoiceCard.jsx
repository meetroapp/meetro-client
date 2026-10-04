import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatLocaleCurrency } from "../utils/localeFormat.js";
import { getInvoiceCopy } from "../utils/invoicePaymentLanguage.js";
import {
  fetchCustomerInvoice,
  fetchProfessionalInvoice,
} from "../utils/invoicePaymentApi.js";
import { getAuthenticatedIdentitySnapshot, subscribeAuthenticatedIdentity } from "../utils/session.js";

export default function ConversationInvoiceCard({
  invoice,
  language,
  canReview,
  onReview,
  audience = "customer",
  setPage,
  businessContextId = "",
  conversationContextId = "",
}) {
  const copy = getInvoiceCopy(language);
  const session = useSyncExternalStore(subscribeAuthenticatedIdentity, getAuthenticatedIdentitySnapshot);
  const setPageRef = useRef(setPage);
  useEffect(() => { setPageRef.current = setPage; }, [setPage]);
  const navigate = useCallback((page) => setPageRef.current?.(page), []);
  const requestGeneration = useRef(0);
  const refreshPending = useRef(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const supportedAudience = audience === "customer" || audience === "professional";
  const identityKey = JSON.stringify([
    invoice?.invoiceId || "", invoice?.jobId || "", audience,
    session.status, session.userId, session.sessionGeneration,
    String(businessContextId || ""), String(conversationContextId || ""),
  ]);
  const requestKey = JSON.stringify([identityKey, refreshVersion]);
  const [currentState, setCurrentState] = useState({
    status: "loading",
    invoice: null,
    requestKey: "",
  });

  useEffect(() => {
    let active = true;
    const generation = ++requestGeneration.current;

    if (!invoice?.invoiceId || !invoice?.jobId || !supportedAudience || session.status !== "authenticated" || !session.userId) {
      queueMicrotask(() => {
        if (active && generation === requestGeneration.current) {
          setCurrentState({
            status: "error",
            invoice: null,
            requestKey,
          });
        }
      });
      return () => {
        active = false;
        requestGeneration.current += 1;
      };
    }

    queueMicrotask(() => {
      if (active && generation === requestGeneration.current) {
        setCurrentState({
          status: "loading",
          invoice: null,
          requestKey,
        });
      }
    });

    const readCurrentInvoice =
      audience === "professional"
        ? fetchProfessionalInvoice
        : fetchCustomerInvoice;

    void readCurrentInvoice({
      invoiceId: invoice.invoiceId,
      setPage: navigate,
    })
      .then((currentInvoice) => {
        if (!active || generation !== requestGeneration.current) return;

        if (
          currentInvoice.invoiceId !== invoice.invoiceId ||
          currentInvoice.jobId !== invoice.jobId
        ) {
          refreshPending.current = false;
          setCurrentState({
            status: "error",
            invoice: null,
            requestKey,
          });
          return;
        }

        refreshPending.current = false;
        setCurrentState({
          status: "ready",
          invoice: currentInvoice,
          requestKey,
        });
      })
      .catch(() => {
        if (!active || generation !== requestGeneration.current) return;
        refreshPending.current = false;
        setCurrentState({
          status: "error",
          invoice: null,
          requestKey,
        });
      });

    return () => {
      active = false;
      requestGeneration.current += 1;
    };
  }, [
    audience,
    invoice?.invoiceId,
    invoice?.jobId,
    navigate,
    requestKey,
    session.status,
    session.userId,
    supportedAudience,
  ]);

  if (!invoice) return null;

  const currentInvoice =
    currentState.status === "ready" &&
    currentState.requestKey === requestKey &&
    currentState.invoice?.invoiceId === invoice.invoiceId &&
    currentState.invoice?.jobId === invoice.jobId &&
    session.status === "authenticated"
      ? currentState.invoice
      : null;
  const visibleStatus = currentState.requestKey === requestKey ? currentState.status : "loading";

  const currency =
    currentInvoice?.currency ||
    invoice.currency;

  const money = (minor) =>
    formatLocaleCurrency(
      minor / 100,
      currency,
      {},
      language
    );

  const unresolvedValue =
    visibleStatus === "loading" ? copy.currentChecking : copy.currentUnavailable;

  function refreshCurrentInvoice() {
    if (refreshPending.current || !supportedAudience || session.status !== "authenticated") return;
    refreshPending.current = true;
    setRefreshVersion((value) => value + 1);
  }

  return (
    <article
      className="canonical-conversation-invoice-card"
      style={styles.card}
      data-invoice-id={invoice.invoiceId}
      data-job-id={invoice.jobId}
      data-invoice-status={
        currentInvoice?.status ||
        "unavailable"
      }
      data-financial-authority={
        currentInvoice
          ? "canonical-current"
          : visibleStatus
      }
    >
      <div style={styles.heading}>
        <span style={styles.eyebrow}>
          {copy.invoiceReceived}
        </span>

        <span style={styles.number}>
          {invoice.invoiceNumber}
        </span>
      </div>

      <strong style={styles.business}>
        {invoice.business.displayName}
      </strong>

      <dl style={styles.summary}>
        <div>
          <dt>{copy.currentInvoiceTotal}</dt>
          <dd>{currentInvoice ? money(currentInvoice.totalMinor) : unresolvedValue}</dd>
        </div>

        <div>
          <dt>{copy.currentPaymentsReceived}</dt>
          <dd>
            {currentInvoice
              ? money(currentInvoice.paidMinor)
              : unresolvedValue}
          </dd>
        </div>

        <div style={styles.balance}>
          <dt>{copy.currentBalanceDue}</dt>
          <dd>
            {currentInvoice
              ? money(currentInvoice.balanceMinor)
              : unresolvedValue}
          </dd>
        </div>
      </dl>

      {!currentInvoice && (
        <span
          role={
            visibleStatus === "error"
              ? "alert"
              : "status"
          }
          style={styles.freshness}
        >
          {visibleStatus === "loading" ? copy.currentBalanceLoading : copy.currentBalanceUnavailable}
        </span>
      )}

      {supportedAudience && session.status === "authenticated" && (
        <button type="button" style={styles.review} disabled={visibleStatus === "loading"} onClick={refreshCurrentInvoice}>
          {visibleStatus === "error" ? copy.currentRetry : copy.currentRefresh}
        </button>
      )}

      {(currentInvoice?.terms || invoice.terms) ? (
        <span style={styles.status}>
          {currentInvoice?.terms || invoice.terms}
        </span>
      ) : null}

      {canReview && (
        <button
          type="button"
          style={styles.review}
          onClick={onReview}
        >
          {copy.reviewInvoice}
        </button>
      )}
    </article>
  );
}

const styles = {
  card: { display: "grid", gap: 8, width: "min(100%, 360px)", minWidth: 0, padding: 14, border: "1px solid #cbd5e1", borderLeft: "4px solid #0f766e", borderRadius: 8, background: "#fff", color: "#172317" },
  heading: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  eyebrow: { color: "#0f766e", fontSize: 12, fontWeight: 900 },
  number: { color: "#526052", fontSize: 12, fontWeight: 800, overflowWrap: "anywhere" },
  business: { overflowWrap: "anywhere" },
  summary: { display: "grid", gap: 6, margin: 0 },
  balance: { fontSize: 20, fontWeight: 900, borderTop: "1px solid #d9e4dc", paddingTop: 8 },
  freshness: {
    color: "#667267",
    fontSize: 12,
    lineHeight: 1.4,
  },
  status: { color: "#526052", fontWeight: 700 },
  review: { minHeight: 44, width: "100%", padding: "0 16px", border: 0, borderRadius: 8, background: "#0f766e", color: "#fff", fontWeight: 800, cursor: "pointer" },
};
