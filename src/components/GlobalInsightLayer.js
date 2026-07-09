import React, { useEffect, useMemo, useRef, useState } from "react";
import { getLanguage, t } from "../utils/language.js";
import {
  areRelationshipInsightsEnabled,
  RELATIONSHIP_INSIGHTS_CHANGED_EVENT,
} from "../utils/relationshipInsightSettings.js";
import {
  buildGlobalInsightContextFromStorage,
  getGlobalInsights,
  prioritizeInsights,
} from "../utils/insightEngine.js";
import {
  dismissRelationshipInsight,
  filterDismissedRelationshipInsights,
} from "../utils/relationshipInsights.js";
import {
  buildInsightTestInsight,
  INSIGHT_CLEAR_DISMISSALS_EVENT,
  INSIGHT_TEST_EVENT,
  isInsightTesterEnabled,
  RELATIONSHIP_INSIGHT_CLEAR_DISMISSALS_EVENT,
  RELATIONSHIP_INSIGHT_TEST_EVENT,
} from "../utils/relationshipInsightTester.js";
import { WORKFLOW_INSIGHT_EVENT } from "../utils/workflowInsightEvents.js";

function getSafeStorage(storage) {
  return storage || (typeof localStorage !== "undefined" ? localStorage : null);
}

function getInsightMessage(insight, language) {
  if (isClosureCommitmentInsight(insight)) {
    return "Work is complete. Review the project to close it.";
  }
  if (insight.messageKey === "relationshipInsightCustomerPreferenceMessage") {
    return insight.message || t("relationshipInsightCustomerPreferenceFallback", language);
  }
  if (insight.messageKey === "relationshipInsightRepeatCustomerMessage" && insight.message) {
    return insight.message;
  }
  return insight.messageKey ? t(insight.messageKey, language) : insight.message || "";
}

export function getReviewProjectUnavailableMessage(language = "en") {
  const normalized = String(language || "en").toLowerCase();
  if (normalized.startsWith("es")) {
    return "La revisión del proyecto aún no está disponible. Abre la hoja de finalización o vuelve al Centro de Trabajo.";
  }
  if (normalized.startsWith("fr")) {
    return "La révision du projet n’est pas encore disponible. Ouvrez la feuille de fin de travaux ou revenez au centre de travail.";
  }
  if (normalized.startsWith("pt")) {
    return "A revisão do projeto ainda não está disponível. Abra a folha de conclusão ou volte ao Centro de Trabalho.";
  }
  return "Project review is not available yet. Open the completion sheet or return to Work Center.";
}

function getProjectIdentity(record = {}) {
  return (
    record.id ||
    record.projectId ||
    record.requestId ||
    record.jobId ||
    record.historyId ||
    record.conversationId ||
    ""
  );
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildSafeReviewProjectRecord(record = {}) {
  if (!record || typeof record !== "object") return null;
  const identity = getProjectIdentity(record);
  if (!identity) return null;

  const completionPhotos = toArray(
    record.photos ||
      record.completionPhotos ||
      record.finalPhotos ||
      record.completionRecord?.photos
  );

  return {
    ...record,
    id: record.id || identity,
    projectId: record.projectId || record.requestId || identity,
    requestId: record.requestId || record.projectId || identity,
    status: record.status || record.workflowStatus || "completed",
    workflowStatus: record.workflowStatus || record.status || "completed",
    title: record.title || record.projectTitle || record.service || "Completed work",
    service: record.service || record.title || record.projectTitle || "Completed work",
    photos: completionPhotos,
    completionPhotos,
    finalPhotos: toArray(record.finalPhotos),
    projectTimeline: toArray(record.projectTimeline),
    completionRecord:
      record.completionRecord && typeof record.completionRecord === "object"
        ? { ...record.completionRecord, photos: toArray(record.completionRecord.photos) }
        : { photos: completionPhotos },
  };
}

export function prepareReviewProjectNavigation(insight = {}, storage) {
  if (!insight || insight.actionType !== "reviewProject") {
    return { ok: false, reason: "unsupported-action" };
  }

  const reviewRecord = buildSafeReviewProjectRecord(insight.record);
  if (!reviewRecord) {
    return { ok: false, reason: "missing-review-target" };
  }

  if (!storage || typeof storage.setItem !== "function") {
    return { ok: false, reason: "storage-unavailable" };
  }

  try {
    storage.setItem("lastCompletedProject", JSON.stringify(reviewRecord));
  } catch {
    return { ok: false, reason: "storage-write-failed" };
  }

  return { ok: true, page: "completedJobDetails" };
}

function getReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldDismissInsightSwipe(startX, endX, threshold = 60) {
  if (!Number.isFinite(startX) || !Number.isFinite(endX)) return false;
  return Math.abs(endX - startX) > threshold;
}

export function getNextSessionDismissed(currentDismissed = new Set(), insightId = "") {
  const nextDismissed = new Set(currentDismissed);
  if (insightId) nextDismissed.add(insightId);
  return nextDismissed;
}

export function getGlobalInsightLayerStyles({
  currentPage = "",
  keyboardActive = false,
  reducedMotion = false,
  insight = null,
} = {}) {
  const isConversation = /conversation|messages/i.test(String(currentPage || ""));
  const isClosureInsight = isClosureCommitmentInsight(insight);
  const topOffset = keyboardActive && isConversation ? "48px" : "72px";
  return {
    overlay: {
      ...overlayWrap,
      top: `calc(env(safe-area-inset-top, 0px) + ${topOffset})`,
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
      overflowX: "hidden",
      justifyContent: isConversation || isClosureInsight ? "flex-end" : "center",
      alignItems: isClosureInsight ? "flex-start" : overlayWrap.alignItems,
    },
    card: {
      ...(isClosureInsight ? closureInsightCard : insightCard),
      transition: reducedMotion
        ? "none"
        : "opacity 180ms ease, transform 180ms ease, box-shadow 180ms ease",
      transform: reducedMotion ? "none" : "translateY(0)",
    },
  };
}

export function isClosureCommitmentInsight(insight = {}) {
  return (
    insight?.type === "commitment" &&
    insight?.actionType === "reviewProject" &&
    (String(insight?.id || "").startsWith("commitment:next-step:closure:") ||
      insight?.messageKey === "commitmentInsightWorkClosureNext")
  );
}

export function shouldRenderInsightOnPage(insight = {}, currentPage = "") {
  if (!isClosureCommitmentInsight(insight)) return true;
  return !/businessdashboard|business-home|businesshome|contractordashboard|workcenter/i.test(
    String(currentPage || "")
  );
}

function RelationshipInsightGlyph() {
  return React.createElement(
    "svg",
    {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": "true",
    },
    React.createElement("circle", {
      cx: 12,
      cy: 12,
      r: 9,
      fill: "currentColor",
      opacity: 0.14,
    }),
    React.createElement("path", {
      d: "M8 12h8M12 8v8",
      stroke: "currentColor",
      strokeWidth: 2.2,
      strokeLinecap: "round",
    })
  );
}

export default function GlobalInsightLayer({
  currentPage = "",
  setPage = () => {},
  storage,
  insights,
  devTestMode = false,
}) {
  const safeStorage = getSafeStorage(storage);
  const [language, setLanguage] = useState(getLanguage());
  const [enabled, setEnabled] = useState(() =>
    areRelationshipInsightsEnabled({ storage: safeStorage })
  );
  const [sessionDismissed, setSessionDismissed] = useState(() => new Set());
  const [touchStartX, setTouchStartX] = useState(null);
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [testInsight, setTestInsight] = useState(null);
  const [insightRefreshToken, setInsightRefreshToken] = useState(0);
  const [actionFallback, setActionFallback] = useState(null);
  const activeInsightIdRef = useRef("");
  const testEventsEnabled = devTestMode || isInsightTesterEnabled();

  useEffect(() => {
    const refresh = () => {
      const nextEnabled = areRelationshipInsightsEnabled({ storage: safeStorage });
      if (!nextEnabled && activeInsightIdRef.current) {
        setSessionDismissed((current) =>
          getNextSessionDismissed(current, activeInsightIdRef.current)
        );
      }
      setLanguage(getLanguage());
      setEnabled(nextEnabled);
      setInsightRefreshToken((token) => token + 1);
    };

    window.addEventListener(RELATIONSHIP_INSIGHTS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("languageChanged", refresh);
    window.addEventListener("meetroLanguageChanged", refresh);
    window.addEventListener("accountModeChanged", refresh);
    window.addEventListener(WORKFLOW_INSIGHT_EVENT, refresh);
    window.addEventListener("meetroJobRecordUpdated", refresh);
    window.addEventListener("meetro-messages-updated", refresh);
    window.addEventListener("meetroEmergencyConversationUpdated", refresh);
    window.addEventListener("meetroDispatchStatusChanged", refresh);

    return () => {
      window.removeEventListener(RELATIONSHIP_INSIGHTS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("languageChanged", refresh);
      window.removeEventListener("meetroLanguageChanged", refresh);
      window.removeEventListener("accountModeChanged", refresh);
      window.removeEventListener(WORKFLOW_INSIGHT_EVENT, refresh);
      window.removeEventListener("meetroJobRecordUpdated", refresh);
      window.removeEventListener("meetro-messages-updated", refresh);
      window.removeEventListener("meetroEmergencyConversationUpdated", refresh);
      window.removeEventListener("meetroDispatchStatusChanged", refresh);
    };
  }, [safeStorage]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateKeyboardState = (event) => {
      const target = event.target;
      const tagName = String(target?.tagName || "").toLowerCase();
      const editable = Boolean(target?.isContentEditable);
      setKeyboardActive(tagName === "input" || tagName === "textarea" || editable);
    };

    const clearKeyboardState = () => setKeyboardActive(false);
    window.addEventListener("focusin", updateKeyboardState);
    window.addEventListener("focusout", clearKeyboardState);

    return () => {
      window.removeEventListener("focusin", updateKeyboardState);
      window.removeEventListener("focusout", clearKeyboardState);
    };
  }, []);

  useEffect(() => {
    if (!testEventsEnabled || typeof window === "undefined") return undefined;

    const triggerTestInsight = (event) => {
      const nextInsight = buildInsightTestInsight(event.detail?.type);
      setTestInsight(nextInsight);
      setSessionDismissed((current) => {
        const nextDismissed = new Set(current);
        nextDismissed.delete(nextInsight.id);
        return nextDismissed;
      });
    };
    const clearDismissals = () => setSessionDismissed(new Set());

    window.addEventListener(INSIGHT_TEST_EVENT, triggerTestInsight);
    window.addEventListener(RELATIONSHIP_INSIGHT_TEST_EVENT, triggerTestInsight);
    window.addEventListener(INSIGHT_CLEAR_DISMISSALS_EVENT, clearDismissals);
    window.addEventListener(RELATIONSHIP_INSIGHT_CLEAR_DISMISSALS_EVENT, clearDismissals);

    return () => {
      window.removeEventListener(INSIGHT_TEST_EVENT, triggerTestInsight);
      window.removeEventListener(RELATIONSHIP_INSIGHT_TEST_EVENT, triggerTestInsight);
      window.removeEventListener(INSIGHT_CLEAR_DISMISSALS_EVENT, clearDismissals);
      window.removeEventListener(RELATIONSHIP_INSIGHT_CLEAR_DISMISSALS_EVENT, clearDismissals);
    };
  }, [testEventsEnabled]);

  const eligibleInsights = useMemo(() => {
    if (!enabled || !safeStorage) return [];
    const sourceInsights = testInsight
      ? [testInsight]
      : Array.isArray(insights)
      ? insights
      : getGlobalInsights(
          buildGlobalInsightContextFromStorage({
            storage: safeStorage,
            currentPage,
          })
        );
    return prioritizeInsights(
      filterDismissedRelationshipInsights(sourceInsights, safeStorage)
        .filter((insight) => !sessionDismissed.has(insight.id))
        .filter((insight) => shouldRenderInsightOnPage(insight, currentPage)),
      { currentPage, allowSettingsInsights: Boolean(testInsight) }
    );
  }, [
    currentPage,
    enabled,
    insightRefreshToken,
    insights,
    safeStorage,
    sessionDismissed,
    testInsight,
  ]);

  const activeInsight = eligibleInsights[0];

  useEffect(() => {
    activeInsightIdRef.current = activeInsight?.id || "";
  }, [activeInsight?.id]);

  useEffect(() => {
    if (!activeInsight || getReducedMotion()) return undefined;
    const timer = window.setTimeout(() => {
      setSessionDismissed((current) => getNextSessionDismissed(current, activeInsight.id));
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [activeInsight]);

  if (!enabled || !activeInsight) return null;

  function dismissCurrent(persist = true) {
    if (persist && safeStorage) dismissRelationshipInsight(activeInsight.id, safeStorage);
    setSessionDismissed((current) => getNextSessionDismissed(current, activeInsight.id));
  }

  function handleAction() {
    if (activeInsight.actionType === "history") {
      if (activeInsight.record && safeStorage?.setItem) {
        safeStorage.setItem("lastCompletedProject", JSON.stringify(activeInsight.record));
      }
      setPage("completedJobDetails");
      dismissCurrent(false);
      return;
    }

    if (activeInsight.actionType === "conversation" && activeInsight.relatedId) {
      safeStorage?.setItem?.("activeConversationId", String(activeInsight.relatedId));
      setPage("conversationThread");
      dismissCurrent(false);
      return;
    }

    if (activeInsight.actionType === "schedule") {
      if (activeInsight.record && safeStorage?.setItem) {
        safeStorage.setItem("selectedScheduleItem", JSON.stringify(activeInsight.record));
      }
      setPage("schedule");
      dismissCurrent(false);
      return;
    }

    if (activeInsight.actionType === "reviewProject") {
      const navigation = prepareReviewProjectNavigation(activeInsight, safeStorage);
      if (!navigation.ok) {
        setActionFallback({
          insightId: activeInsight.id,
          message: getReviewProjectUnavailableMessage(language),
        });
        return;
      }
      try {
        setPage(navigation.page);
        dismissCurrent(false);
      } catch {
        setActionFallback({
          insightId: activeInsight.id,
          message: getReviewProjectUnavailableMessage(language),
        });
      }
      return;
    }

    dismissCurrent();
  }

  function handleTouchEnd(event) {
    if (touchStartX === null) return;
    if (shouldDismissInsightSwipe(touchStartX, event.changedTouches?.[0]?.clientX)) {
      dismissCurrent();
    }
    setTouchStartX(null);
  }

  const reducedMotion = getReducedMotion();
  const layerStyles = getGlobalInsightLayerStyles({
    currentPage,
    keyboardActive,
    reducedMotion,
    insight: activeInsight,
  });
  const visibleActionFallback =
    actionFallback?.insightId === activeInsight.id ? actionFallback.message : "";

  return React.createElement(
    "div",
    {
      style: layerStyles.overlay,
      "aria-live": "polite",
      "data-keyboard-active": keyboardActive ? "true" : "false",
      "data-insight-presentation": isClosureCommitmentInsight(activeInsight)
        ? "compact-closure"
        : "compact",
    },
    React.createElement(
      "section",
      {
        style: layerStyles.card,
        role: "status",
        "aria-label": t(activeInsight.titleKey || "relationshipInsightTitle", language),
        onTouchStart: (event) => setTouchStartX(event.touches?.[0]?.clientX ?? null),
        onTouchEnd: handleTouchEnd,
      },
      React.createElement(
        "div",
        { style: insightIcon },
        React.createElement(RelationshipInsightGlyph)
      ),
      React.createElement(
        "div",
        { style: insightBody },
        React.createElement(
          "div",
          { style: insightHeader },
          React.createElement(
            "span",
            { style: insightEyebrow },
            isClosureCommitmentInsight(activeInsight)
              ? "Closure ready"
              : t(activeInsight.titleKey || "relationshipInsightTitle", language)
          ),
          React.createElement(
            "button",
            {
              type: "button",
              style: hideButton,
              onClick: () => dismissCurrent(),
              "aria-label": t("hide", language),
            },
            "×"
          )
        ),
        React.createElement(
          "p",
          { style: insightMessage },
          getInsightMessage(activeInsight, language)
        ),
        visibleActionFallback
          ? React.createElement(
              "p",
              { style: inlineFallback, role: "alert" },
              visibleActionFallback
            )
          : null,
        React.createElement(
          "div",
          { style: insightActions },
          React.createElement(
            "button",
            { type: "button", style: primaryAction, onClick: handleAction },
            t(activeInsight.actionLabelKey || "hide", language)
          ),
          React.createElement(
            "button",
            { type: "button", style: secondaryAction, onClick: () => dismissCurrent() },
            t("hide", language)
          )
        )
      )
    )
  );
}

const overlayWrap = {
  position: "fixed",
  left: "max(20px, env(safe-area-inset-left, 0px))",
  right: "max(20px, env(safe-area-inset-right, 0px))",
  top: "calc(env(safe-area-inset-top, 0px) + 76px)",
  zIndex: 80,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  pointerEvents: "none",
};

const insightCard = {
  width: "min(360px, 100%)",
  boxSizing: "border-box",
  pointerEvents: "auto",
  display: "flex",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.48)",
  boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
  color: "#111827",
};

const closureInsightCard = {
  ...insightCard,
  width: "min(280px, calc(100vw - 40px))",
  gap: "7px",
  padding: "7px 9px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
};

const insightIcon = {
  width: "30px",
  height: "30px",
  borderRadius: "11px",
  background: "#f3f0ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
};

const insightBody = {
  flex: "1 1 auto",
  minWidth: 0,
};

const insightHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const insightEyebrow = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const hideButton = {
  border: "none",
  background: "rgba(15,23,42,0.08)",
  color: "#111827",
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  fontSize: "20px",
  lineHeight: "20px",
  cursor: "pointer",
};

const insightMessage = {
  margin: "4px 0 10px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.34,
  fontWeight: 750,
  overflowWrap: "normal",
  wordBreak: "normal",
};

const inlineFallback = {
  margin: "-2px 0 10px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  background: "rgba(236, 244, 234, 0.82)",
  border: "1px solid rgba(31,77,52,0.16)",
  borderRadius: "12px",
  padding: "8px 10px",
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: 800,
};

const insightActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const primaryAction = {
  border: "none",
  borderRadius: "999px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryAction = {
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.72)",
  color: "#475569",
  padding: "9px 12px",
  fontWeight: 850,
  cursor: "pointer",
};
