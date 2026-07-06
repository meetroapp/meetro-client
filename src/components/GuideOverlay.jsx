import { useEffect, useMemo, useState } from "react";
import { getLanguage, t } from "../utils/language";
import { getGuideSteps, TOUR_TYPES } from "../utils/guideSteps";

function getAccountTourIdentity() {
  const accountId =
    localStorage.getItem("userId") ||
    localStorage.getItem("userEmail") ||
    "local";
  const mode = localStorage.getItem("activeAccountMode") || "personal";
  const role = mode === "business" ? TOUR_TYPES.professional : TOUR_TYPES.homeowner;

  return {
    accountId: String(accountId || "local").trim().toLowerCase() || "local",
    role,
  };
}

function getTourStorageKey(tourType) {
  const { accountId, role } = getAccountTourIdentity();
  const scopedRole = tourType || role;

  return `meetroTourCompleted:${accountId}:${scopedRole}`;
}

function getPromptStorageKey() {
  const { accountId, role } = getAccountTourIdentity();

  return `meetroTourPromptDismissed:${accountId}:${role}`;
}

function applyStepStorage(step = {}) {
  Object.entries(step.storage || {}).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

function getDefaultTourType() {
  return getAccountTourIdentity().role;
}

function getStoredTourStepIndex() {
  const storedIndex = Number.parseInt(
    localStorage.getItem("meetroActiveTourStep") || "0",
    10
  );

  return Number.isFinite(storedIndex) && storedIndex >= 0 ? storedIndex : 0;
}

function GuideOverlay({ currentPage = "", setPage }) {
  const [language, setLanguageState] = useState(getLanguage());
  const [tourType, setTourType] = useState("");
  const [stepIndex, setStepIndex] = useState(getStoredTourStepIndex);
  const [targetRect, setTargetRect] = useState(null);

  const steps = useMemo(() => getGuideSteps(tourType || getDefaultTourType()), [tourType]);
  const activeStep = tourType ? steps[stepIndex] : null;
  const isLastStep = activeStep && stepIndex === steps.length - 1;

  useEffect(() => {
    const handleLanguageChange = () => setLanguageState(getLanguage());
    window.addEventListener("languageChanged", handleLanguageChange);
    return () => window.removeEventListener("languageChanged", handleLanguageChange);
  }, []);

  useEffect(() => {
    const handleStartTour = (event) => {
      const nextTourType = event?.detail?.tourType || getDefaultTourType();
      const nextSteps = getGuideSteps(nextTourType);

      setTourType(nextTourType);
      setStepIndex(0);
      localStorage.setItem("meetroActiveTourType", nextTourType);
      localStorage.setItem("meetroActiveTourStep", "0");
      applyStepStorage(nextSteps[0]);
      setPage(nextSteps[0]?.route || "home");
    };

    window.addEventListener("meetroStartTour", handleStartTour);
    return () => window.removeEventListener("meetroStartTour", handleStartTour);
  }, [setPage]);

  useEffect(() => {
    if (!activeStep?.route) return;
    if (currentPage === activeStep.route) return;

    applyStepStorage(activeStep);
    setPage(activeStep.route);
  }, [activeStep, currentPage, setPage]);

  useEffect(() => {
    if (!activeStep) {
      setTargetRect(null);
      return undefined;
    }

    let frameId = 0;

    const updateTarget = () => {
      const selector = activeStep.targetSelector;
      const target = selector ? document.querySelector(selector) : null;

      if (!target) {
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        setTargetRect(null);
        return;
      }

      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    frameId = window.requestAnimationFrame(updateTarget);
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [activeStep, currentPage]);

  function goToStep(nextIndex) {
    const nextStep = steps[nextIndex];

    if (!nextStep) return;

    setStepIndex(nextIndex);
    localStorage.setItem("meetroActiveTourType", tourType || getDefaultTourType());
    localStorage.setItem("meetroActiveTourStep", String(nextIndex));
    applyStepStorage(nextStep);
    setPage(nextStep.route);
  }

  function getSafeTourExitPage() {
    const mode = localStorage.getItem("activeAccountMode") || "personal";
    const resolvedTourType = tourType || getDefaultTourType();

    return mode === "business" || resolvedTourType === TOUR_TYPES.professional
      ? "businessDashboard"
      : "home";
  }

  function completeTour() {
    const safePage = getSafeTourExitPage();

    if (tourType) {
      localStorage.setItem(getTourStorageKey(tourType), "true");
    }

    setTourType("");
    setStepIndex(0);
    setTargetRect(null);
    localStorage.removeItem("meetroActiveTourType");
    localStorage.removeItem("meetroActiveTourStep");
    setPage(safePage);
  }

  function skipTour() {
    if (tourType) {
      localStorage.setItem(getTourStorageKey(tourType), "true");
    } else {
      localStorage.setItem(getPromptStorageKey(), "true");
    }

    setTourType("");
    setStepIndex(0);
    setTargetRect(null);
    localStorage.removeItem("meetroActiveTourType");
    localStorage.removeItem("meetroActiveTourStep");
  }

  if (!activeStep) return null;

  const cardStyle = targetRect
    ? {
        ...guideCard,
        ...getAnchoredCardPosition(targetRect),
      }
    : guideCenteredCard;

  return (
    <div style={guideLayer} aria-live="polite">
      <div style={guideDimmer} />

      {targetRect && (
        <div
          style={{
            ...spotlightRing,
            top: Math.max(8, targetRect.top - 8),
            left: Math.max(8, targetRect.left - 8),
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      <section style={cardStyle} role="dialog" aria-modal="false">
        <>
            <div style={guideTopRow}>
              <p style={guideEyebrow}>{t("meetroTour", language)}</p>
              <span style={guideProgress}>
                {stepIndex + 1} / {steps.length}
              </span>
            </div>
            <h2 style={guideTitle}>{t(activeStep.titleKey, language)}</h2>
            <p style={guideDescription}>{t(activeStep.descriptionKey, language)}</p>
            <div style={guideActions}>
              <button type="button" style={tertiaryButton} onClick={skipTour}>
                {t("skip", language)}
              </button>
              <button
                type="button"
                style={secondaryButton}
                onClick={() => goToStep(Math.max(0, stepIndex - 1))}
                disabled={stepIndex === 0}
              >
                {t("back", language)}
              </button>
              <button
                type="button"
                style={primaryButton}
                onClick={() => (isLastStep ? completeTour() : goToStep(stepIndex + 1))}
              >
                {isLastStep ? t("done", language) : t("next", language)}
              </button>
            </div>
        </>
      </section>
    </div>
  );
}

function getAnchoredCardPosition(rect) {
  const cardWidth = Math.min(340, window.innerWidth - 32);
  const safeTop = 16 + Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat") || 0);
  const belowTop = rect.top + rect.height + 18;
  const aboveTop = rect.top - 238;
  const top =
    belowTop + 220 < window.innerHeight
      ? belowTop
      : Math.max(safeTop, aboveTop);
  const left = Math.min(
    Math.max(16, rect.left + rect.width / 2 - cardWidth / 2),
    window.innerWidth - cardWidth - 16
  );

  return {
    width: cardWidth,
    top,
    left,
  };
}

const guideLayer = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  pointerEvents: "none",
  overflow: "hidden",
};

const guideDimmer = {
  position: "absolute",
  inset: 0,
  background: "rgba(15, 23, 42, 0.36)",
};

const spotlightRing = {
  position: "absolute",
  border: "2px solid rgba(31, 77, 52, 0.95)",
  borderRadius: "18px",
  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.28), 0 14px 36px rgba(31, 77, 52, 0.22)",
  pointerEvents: "none",
};

const guideCard = {
  position: "absolute",
  pointerEvents: "auto",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "20px",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
  padding: "18px",
  boxSizing: "border-box",
  maxHeight: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px)",
  overflowY: "auto",
};

const guideCenteredCard = {
  ...guideCard,
  width: "min(340px, calc(100vw - 32px))",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
};

const guideTopRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const guideEyebrow = {
  margin: "0 0 8px",
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const guideProgress = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "900",
};

const guideTitle = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "20px",
  lineHeight: 1.15,
  fontWeight: "950",
};

const guideDescription = {
  margin: "0",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const guideActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const buttonBase = {
  minHeight: "42px",
  borderRadius: "14px",
  border: "1px solid transparent",
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const primaryButton = {
  ...buttonBase,
  background: "var(--meetro-color-charcoal, #172317)",
  color: "#ffffff",
  boxShadow: "0 10px 22px rgba(109, 40, 217, 0.25)",
};

const secondaryButton = {
  ...buttonBase,
  background: "#f8fafc",
  color: "#312e81",
  border: "1px solid #ddd6fe",
};

const tertiaryButton = {
  ...buttonBase,
  background: "transparent",
  color: "#64748b",
};

export default GuideOverlay;
