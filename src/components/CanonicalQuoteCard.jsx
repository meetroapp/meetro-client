import { useEffect, useState } from "react";
import useLanguage from "../hooks/useLanguage.js";
import { loadCanonicalQuoteDetail } from "../utils/quoteReadController.js";
import { getWorkCenterWorkspaceCopy } from "../utils/workCenterWorkspaceLanguage.js";
import QuoteDeliveryActions from "./QuoteDeliveryActions.jsx";

function canonicalRecord(jobId) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId,
  };
}

function quoteErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to view quote details.";
  if (error?.status === 403) {
    return "Quote details are unavailable for this account.";
  }
  if (error?.status === 404) return "Quote details are unavailable.";
  return error?.message || "Quote details could not be loaded.";
}

function formatMinorAmount(amountMinor, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function readableEnum(value) {
  return value.replaceAll("_", " ").toLowerCase();
}

function lineageLabel(quote, copy) {
  if (!quote.parentQuoteId) return copy.originalQuote;
  return quote.lineageType === "SUPPLEMENTAL_QUOTE"
    ? copy.additionalQuote
    : copy.revisedQuote;
}

function ScopeItem({ item, currency, copy }) {
  const inclusionLabel = item.includedInTotal
    ? copy.includedInTotal
    : item.scopeSemantic === "SEPARATE_PROPOSAL"
      ? copy.separateProposal
      : copy.excludedFromTotal;
  return (
    <article style={styles.scopeItem}>
      <div style={styles.scopeHeader}>
        <strong style={styles.scopeTitle}>{item.description}</strong>
        <span style={item.includedInTotal ? styles.included : styles.excluded}>
          {inclusionLabel}
        </span>
      </div>
      <div style={styles.amountRow}>
        <span>{copy.quantity} {item.quantity}</span>
        <span>{copy.unit} {formatMinorAmount(item.unitAmountMinor, currency)}</span>
        <strong>{copy.lineTotal} {formatMinorAmount(item.lineTotalMinor, currency)}</strong>
      </div>
    </article>
  );
}

export default function CanonicalQuoteCard({
  jobId,
  quote,
  depth = 0,
  setPage,
  focused = false,
}) {
  const language = useLanguage();
  const copy = getWorkCenterWorkspaceCopy(language);
  const [state, setState] = useState({
    status: "loading",
    detail: null,
    error: "",
  });

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setState({ status: "loading", detail: null, error: "" });
    });
    void loadCanonicalQuoteDetail({
      record: canonicalRecord(jobId),
      quote,
      setPage,
    })
      .then((detail) => {
        if (!active) return;
        setState({
          status: detail ? "ready" : "unavailable",
          detail,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({ status: "error", detail: null, error: quoteErrorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [jobId, quote, setPage]);

  const detail = state.detail || quote;
  const decision = detail.decisionState || copy.noDecision;
  const leftInset = Math.min(depth, 2) * 12;

  return (
    <article
      style={{
        ...styles.quote,
        marginLeft: leftInset,
        ...(focused ? styles.focusedQuote : {}),
      }}
      aria-labelledby={`canonical-quote-${quote.id}`}
      aria-current={focused ? "true" : undefined}
      data-quote-id={quote.id}
    >
      <div style={styles.header}>
        <div style={styles.headingGroup}>
          <span style={styles.lineage}>{lineageLabel(detail, copy)}</span>
          <h4 id={`canonical-quote-${quote.id}`} style={styles.title}>
            {formatMinorAmount(detail.totalMinor, detail.currency)}
          </h4>
        </div>
        <span style={styles.status}>{readableEnum(detail.status)}</span>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryField}>
          <span style={styles.label}>{copy.quoteTotal}</span>
          <strong>{formatMinorAmount(detail.totalMinor, detail.currency)}</strong>
        </div>
        <div style={styles.summaryField}>
          <span style={styles.label}>{copy.customerDecision}</span>
          <strong>{decision}</strong>
        </div>
      </div>

      {state.status === "loading" && (
        <p role="status" style={styles.message}>Loading quote details.</p>
      )}
      {state.status === "error" && (
        <p role="alert" style={styles.error}>{state.error}</p>
      )}
      {state.status === "ready" && (
        <details style={styles.details}>
          <summary style={styles.detailsSummary}>{copy.quoteDetails}</summary>
          <div style={styles.detailsBody}>
            {detail.issuedAt && (
              <span style={styles.timestamp}>
                {copy.issued} {new Date(detail.issuedAt).toLocaleString()}
              </span>
            )}
            {detail.scopeItems.length === 0 ? (
              <p style={styles.message}>{copy.noScope}</p>
            ) : (
              <section style={styles.scope} aria-label={`${lineageLabel(detail, copy)} ${copy.scope}`}>
                <h5 style={styles.scopeHeading}>{copy.scope}</h5>
                <div style={styles.scopeList}>
                  {detail.scopeItems.map((item) => (
                    <ScopeItem key={item.scopeItemId} item={item} currency={detail.currency} copy={copy} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </details>
      )}
      {state.status === "ready" && (
        <QuoteDeliveryActions
          quoteId={detail.id}
          jobId={jobId}
          quoteStatus={detail.status}
          quoteContext={{ customer: quote.customer, job: quote.job }}
          language={language}
          setPage={setPage}
        />
      )}
    </article>
  );
}

const styles = {
  quote: {
    display: "grid",
    gap: 12,
    minWidth: 0,
    padding: "18px 0 18px 14px",
    borderLeft: "3px solid #1f5132",
    borderBottom: "1px solid #cbd5e1",
  },
  focusedQuote: {
    borderRadius: 12,
    background: "#f0f7ed",
    boxShadow: "0 0 0 2px #1f5132",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headingGroup: { display: "grid", gap: 4, minWidth: 0 },
  lineage: { color: "#475569", fontSize: 12, fontWeight: 800 },
  title: { margin: 0, fontSize: 20, letterSpacing: 0 },
  status: { color: "#1f5132", fontSize: 12, fontWeight: 800 },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
    gap: 12,
  },
  summaryField: { display: "grid", gap: 4, minWidth: 0 },
  label: { color: "#64748b", fontSize: 12, fontWeight: 800 },
  timestamp: { color: "#64748b", fontSize: 12 },
  details: { borderTop: "1px solid #e2e8f0", paddingTop: 10 },
  detailsSummary: { minHeight: 44, display: "flex", alignItems: "center", color: "#1f5132", fontWeight: 800, cursor: "pointer" },
  detailsBody: { display: "grid", gap: 12, paddingTop: 10 },
  message: { margin: 0, color: "#64748b", lineHeight: 1.5 },
  error: {
    margin: 0,
    padding: "8px 10px",
    borderLeft: "3px solid #b91c1c",
    color: "#991b1b",
    background: "#fef2f2",
    lineHeight: 1.5,
  },
  scope: {
    display: "grid",
    gap: 10,
    paddingTop: 4,
  },
  scopeHeading: { margin: 0, fontSize: 15, letterSpacing: 0 },
  scopeList: { display: "grid", gap: 12 },
  scopeItem: {
    display: "grid",
    gap: 7,
    minWidth: 0,
    paddingBottom: 12,
    borderBottom: "1px solid #e2e8f0",
  },
  scopeHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  scopeTitle: { overflowWrap: "anywhere" },
  included: { color: "#166534", fontSize: 12, fontWeight: 800 },
  excluded: { color: "#7c2d12", fontSize: 12, fontWeight: 800 },
  amountRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    color: "#334155",
    fontSize: 12,
  },
};
