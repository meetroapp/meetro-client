import { Component } from "react";

function getStorageValue(key, fallback = "") {
  try {
    if (typeof window === "undefined") return fallback;
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function isProfessionalMode() {
  const activeMode = getStorageValue("activeAccountMode", "personal");
  const accountType = getStorageValue("accountType", "");
  const isProfessional = getStorageValue("isProfessional", "") === "true";

  return (
    activeMode === "business" ||
    accountType === "professional" ||
    accountType === "business" ||
    isProfessional
  );
}

function getSafeReturnPage(currentPage = "") {
  if (!isProfessionalMode()) return "home";
  return currentPage === "businessDashboard"
    ? "professionalOnboarding"
    : "businessDashboard";
}

function returnHome(setPage, currentPage = "") {
  try {
    const destination = getSafeReturnPage(currentPage);

    if (typeof setPage === "function") {
      setPage(destination);
      return;
    }
    if (typeof window !== "undefined") {
      window.location.hash = destination;
      window.location.reload();
    }
  } catch {
    if (typeof window !== "undefined") window.location.href = "/";
  }
}

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error("Meetro route error", error);
    }
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main style={fallbackPage}>
        <section style={fallbackCard} role="alert" aria-live="assertive">
          <h1 style={fallbackTitle}>Something went wrong.</h1>
          <p style={fallbackText}>
            Meetro kept the app open. Return home and continue from there.
          </p>
          <div style={fallbackActions}>
            <button
              type="button"
              style={primaryButton}
              onClick={() => returnHome(this.props.setPage, this.props.currentPage)}
            >
              Return Home
            </button>
            <button
              type="button"
              style={secondaryButton}
              onClick={() => this.setState({ hasError: false })}
            >
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }
}

const fallbackPage = {
  minHeight: "100dvh",
  boxSizing: "border-box",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) 18px calc(env(safe-area-inset-bottom, 0px) + 24px)",
  display: "grid",
  placeItems: "center",
  background: "#f8fafc",
  color: "#0f172a",
  overflowX: "hidden",
};

const fallbackCard = {
  width: "min(100%, 420px)",
  boxSizing: "border-box",
  borderRadius: "20px",
  border: "1px solid rgba(148,163,184,0.28)",
  background: "#ffffff",
  boxShadow: "0 18px 44px rgba(15,23,42,0.12)",
  padding: "22px",
  display: "grid",
  gap: "12px",
};

const fallbackTitle = {
  margin: 0,
  fontSize: "24px",
  lineHeight: 1.1,
  fontWeight: 950,
};

const fallbackText = {
  margin: 0,
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const fallbackActions = {
  display: "grid",
  gap: "10px",
};

const primaryButton = {
  minHeight: "48px",
  border: "none",
  borderRadius: "14px",
  background: "#5b3df5",
  color: "#ffffff",
  fontWeight: 950,
};

const secondaryButton = {
  ...primaryButton,
  background: "#ffffff",
  color: "#5b3df5",
  border: "1px solid rgba(91,61,245,0.24)",
};

export default RouteErrorBoundary;
