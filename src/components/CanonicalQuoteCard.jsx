import { useEffect, useState } from "react";
import { loadCanonicalQuoteDetail } from "../utils/quoteReadController.js";

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
  if (error?.status === 401) return "Sign in is required to read Quote detail.";
  if (error?.status === 403) {
    return "Quote read authority is unavailable for this account.";
  }
  if (error?.status === 404) return "Canonical Quote detail is unavailable.";
  return error?.message || "Canonical Quote detail could not be loaded.";
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

function lineageLabel(quote) {
  if (!quote.parentQuoteId) return "Original Quote";
  return quote.lineageType === "SUPPLEMENTAL_QUOTE"
    ? "Supplemental Quote"
    : "Revised Quote";
}

function SourceReference({ source }) {
  const reference = [
    source.findingId,
    source.recommendationId,
    source.workstreamId,
    source.activityId,
    source.obligationId,
  ].find(Boolean);
  return (
    <div style={styles.source}>
      <span>
        Source: {readableEnum(source.type)}
        {source.version ? ` · version ${source.version}` : ""}
      </span>
      {reference && <span style={styles.reference}>{reference}</span>}
    </div>
  );
}

function ScopeItem({ item, currency }) {
  const inclusionLabel = item.includedInTotal
    ? "Included in server total"
    : item.scopeSemantic === "SEPARATE_PROPOSAL"
      ? "Separate proposal · not included in this total"
      : "Excluded from server total";
  return (
    <article style={styles.scopeItem}>
      <div style={styles.scopeHeader}>
        <strong style={styles.scopeTitle}>{item.description}</strong>
        <span style={item.includedInTotal ? styles.included : styles.excluded}>
          {inclusionLabel}
        </span>
      </div>
      <div style={styles.scopeMeta}>
        <span>{readableEnum(item.classification)}</span>
        <span>{readableEnum(item.scopeSemantic)}</span>
        <span>Material: {readableEnum(item.materialResponsibility)}</span>
      </div>
      <div style={styles.amountRow}>
        <span>Quantity {item.quantity}</span>
        <span>Unit {formatMinorAmount(item.unitAmountMinor, currency)}</span>
        <strong>Server line total {formatMinorAmount(item.lineTotalMinor, currency)}</strong>
      </div>
      <SourceReference source={item.source} />
    </article>
  );
}

export default function CanonicalQuoteCard({ jobId, quote, depth = 0, setPage }) {
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
  const decision = detail.decisionState || "No decision recorded";
  const leftInset = Math.min(depth, 2) * 12;

  return (
    <article
      style={{ ...styles.quote, marginLeft: leftInset }}
      aria-labelledby={`canonical-quote-${quote.id}`}
    >
      <div style={styles.header}>
        <div style={styles.headingGroup}>
          <span style={styles.lineage}>{lineageLabel(detail)}</span>
          <h4 id={`canonical-quote-${quote.id}`} style={styles.title}>
            {formatMinorAmount(detail.totalMinor, detail.currency)}
          </h4>
        </div>
        <span style={styles.status}>Quote status: {detail.status}</span>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryField}>
          <span style={styles.label}>Server total</span>
          <strong>{formatMinorAmount(detail.totalMinor, detail.currency)}</strong>
        </div>
        <div style={styles.summaryField}>
          <span style={styles.label}>Customer decision</span>
          <strong>{decision}</strong>
        </div>
        <div style={styles.summaryField}>
          <span style={styles.label}>Canonical version</span>
          <strong>{detail.currentVersion}</strong>
        </div>
      </div>

      <div style={styles.boundary}>
        <span>Quote status and customer decision remain separate.</span>
        <strong>No payment, deposit, or scheduling authority.</strong>
      </div>

      {detail.issuedAt && (
        <span style={styles.timestamp}>
          Issued {new Date(detail.issuedAt).toLocaleString()}
        </span>
      )}
      {detail.decidedAt && (
        <span style={styles.timestamp}>
          Decision recorded {new Date(detail.decidedAt).toLocaleString()} against Quote version {detail.decisionVersion}
        </span>
      )}
      {detail.parentQuoteId && (
        <div style={styles.parentReference}>
          <span>Parent Quote: {detail.parentQuoteId}</span>
          <span>
            Lineage: {readableEnum(detail.lineageType)} · {readableEnum(detail.lineageReasonCategory)}
          </span>
        </div>
      )}

      {state.status === "loading" && (
        <p role="status" style={styles.message}>Loading canonical Quote detail.</p>
      )}
      {state.status === "error" && (
        <p role="alert" style={styles.error}>{state.error}</p>
      )}
      {state.status === "ready" && detail.scopeItems.length === 0 && (
        <p style={styles.message}>No scope items recorded</p>
      )}
      {state.status === "ready" && detail.scopeItems.length > 0 && (
        <section style={styles.scope} aria-label={`${lineageLabel(detail)} scope`}>
          <h5 style={styles.scopeHeading}>Scope</h5>
          <div style={styles.scopeList}>
            {detail.scopeItems.map((item) => (
              <ScopeItem key={item.scopeItemId} item={item} currency={detail.currency} />
            ))}
          </div>
        </section>
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
  boundary: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    padding: "9px 0",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
    color: "#7c2d12",
    fontSize: 12,
  },
  timestamp: { color: "#64748b", fontSize: 12 },
  parentReference: {
    display: "grid",
    gap: 4,
    color: "#475569",
    fontSize: 12,
    overflowWrap: "anywhere",
  },
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
  scopeMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    color: "#475569",
    fontSize: 12,
    textTransform: "capitalize",
  },
  amountRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    color: "#334155",
    fontSize: 12,
  },
  source: {
    display: "grid",
    gap: 3,
    color: "#64748b",
    fontSize: 12,
    textTransform: "capitalize",
  },
  reference: { overflowWrap: "anywhere", textTransform: "none" },
};
