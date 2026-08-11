import { useEffect, useState } from "react";
import { loadCanonicalRecommendationsForFinding } from "../utils/findingRecommendationReadController.js";

function recommendationErrorMessage(error) {
  if (error?.status === 401) return "Sign in is required to read Recommendations.";
  if (error?.status === 403) {
    return "Recommendation read authority is unavailable for this account.";
  }
  if (error?.status === 404) {
    return "Canonical Recommendations are unavailable for this Finding.";
  }
  return error?.message || "Canonical Recommendations could not be loaded.";
}

function RecommendationDetail({ recommendation, label }) {
  return (
    <div style={styles.recommendation}>
      <div style={styles.metaRow}>
        <strong style={styles.kind}>{label}</strong>
        <span style={styles.state}>State: {recommendation.status}</span>
      </div>
      <p style={styles.statement}>{recommendation.statement}</p>
      <div style={styles.versionRow}>
        <span>Recommendation version {recommendation.currentVersion}</span>
        <span>Evaluation version {recommendation.evaluationVersion}</span>
      </div>
      {recommendation.constraints.length > 0 && (
        <div style={styles.constraints} aria-label="Customer constraints read-only">
          <strong style={styles.subheading}>Customer constraints</strong>
          {recommendation.constraints.map((constraint) => (
            <div key={constraint.id} style={styles.constraint}>
              <span style={styles.constraintType}>{constraint.type}</span>
              <p style={styles.constraintText}>{constraint.statement}</p>
              <span style={styles.evidenceLabel}>
                Recorded evidence: {constraint.evidenceClassification}
              </span>
              <span style={styles.notApproval}>Not customer approval</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CanonicalRecommendationsPanel({ finding, setPage }) {
  const findingId = finding?.id || "";
  const [state, setState] = useState({
    status: "loading",
    recommendations: [],
    error: "",
  });

  useEffect(() => {
    let active = true;
    if (!findingId) {
      Promise.resolve().then(() => {
        if (!active) return;
        setState({ status: "unavailable", recommendations: [], error: "" });
      });
      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (!active) return;
      setState({ status: "loading", recommendations: [], error: "" });
    });
    void loadCanonicalRecommendationsForFinding({ finding, setPage })
      .then((recommendations) => {
        if (!active) return;
        if (!recommendations) {
          setState({ status: "unavailable", recommendations: [], error: "" });
          return;
        }
        setState({ status: "ready", recommendations, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: "error",
          recommendations: [],
          error: recommendationErrorMessage(error),
        });
      });

    return () => {
      active = false;
    };
  }, [finding, findingId, setPage]);

  const primaries = state.recommendations.filter(
    (recommendation) => recommendation.kind === "PRIMARY"
  );
  const alternativesByPrimary = new Map(
    primaries.map((recommendation) => [recommendation.id, []])
  );
  for (const recommendation of state.recommendations) {
    if (recommendation.kind === "ALTERNATIVE") {
      alternativesByPrimary
        .get(recommendation.primaryRecommendationId)
        ?.push(recommendation);
    }
  }

  return (
    <section
      style={styles.section}
      aria-labelledby={`canonical-recommendations-${findingId}`}
    >
      <h5 id={`canonical-recommendations-${findingId}`} style={styles.title}>
        Recommendations
      </h5>
      {state.status === "loading" && (
        <p role="status" style={styles.message}>
          Loading canonical Recommendations.
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" style={styles.error}>
          {state.error}
        </p>
      )}
      {state.status === "ready" && state.recommendations.length === 0 && (
        <p style={styles.message}>No recommendations recorded</p>
      )}
      {state.status === "ready" && primaries.length > 0 && (
        <div style={styles.list}>
          {primaries.map((primary) => (
            <div key={primary.id} style={styles.primaryGroup}>
              <RecommendationDetail
                recommendation={primary}
                label="Primary recommendation"
              />
              {(alternativesByPrimary.get(primary.id) || []).map(
                (alternative) => (
                  <div key={alternative.id} style={styles.alternative}>
                    <RecommendationDetail
                      recommendation={alternative}
                      label="Alternative recommendation"
                    />
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    display: "grid",
    gap: 10,
    paddingTop: 14,
    borderTop: "1px solid #e2e8f0",
  },
  title: { margin: 0, color: "#334155", fontSize: 15, letterSpacing: 0 },
  message: { margin: 0, color: "#64748b", lineHeight: 1.5 },
  error: {
    margin: 0,
    padding: "8px 10px",
    borderLeft: "3px solid #b91c1c",
    color: "#991b1b",
    background: "#fef2f2",
    lineHeight: 1.5,
  },
  list: { display: "grid", gap: 14 },
  primaryGroup: { display: "grid", gap: 10 },
  recommendation: {
    display: "grid",
    gap: 7,
    minWidth: 0,
    paddingLeft: 12,
    borderLeft: "3px solid #1f5132",
  },
  alternative: { marginLeft: 12 },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  kind: { color: "#1f5132", fontSize: 13 },
  state: { color: "#475569", fontSize: 12, fontWeight: 800 },
  statement: { margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" },
  versionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    color: "#64748b",
    fontSize: 12,
  },
  constraints: {
    display: "grid",
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTop: "1px solid #e2e8f0",
  },
  subheading: { color: "#334155", fontSize: 12 },
  constraint: { display: "grid", gap: 4 },
  constraintType: { color: "#7c2d12", fontSize: 12, fontWeight: 800 },
  constraintText: { margin: 0, lineHeight: 1.45, overflowWrap: "anywhere" },
  evidenceLabel: { color: "#64748b", fontSize: 12, overflowWrap: "anywhere" },
  notApproval: { color: "#7c2d12", fontSize: 12, fontWeight: 800 },
};
