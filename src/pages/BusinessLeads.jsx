import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import { getLanguage, t } from "../utils/language";
import { purgeProfessionalLeadCaches } from "../utils/businessLeadSourceTruth";
import {
  CONVERSATION_THREAD_PAGE,
  getBusinessLeadConversationContext,
  stageBusinessLeadConversation,
} from "../utils/businessLeadConversationEntry";
import {
  buildCanonicalConversationRoute,
} from "../utils/canonicalConversationMessaging";
import { buildCanonicalEvaluationRoute } from "../utils/canonicalEvaluation";
import {
  listProfessionalEmergencyOpportunities,
  respondToEmergencyOpportunity,
} from "../utils/emergencyApi";
import { createEmergencyRefreshCoordinator } from "../utils/emergencyRefreshCoordinator";
import {
  fetchCanonicalConversations,
} from "../utils/requestCommunication";
import { isProfessionalSession } from "../utils/session";
import { PROFESSIONAL_OPPORTUNITY_STATUS } from "../utils/professionalOpportunityState";
import {
  resolveProfessionalEmergencyResponsePresentation,
} from "../utils/professionalEmergencyParticipation";
import {
  PROFESSIONAL_OPPORTUNITY_PHASE,
  requestProfessionalOpportunities,
  subscribeProfessionalOpportunities,
} from "../utils/professionalOpportunityCoordinator";

function BusinessLeads({ setPage }) {
  const emergencyRefreshCoordinatorRef = useRef(null);
  const [language, setLanguage] = useState(getLanguage());
  const [status, setStatus] = useState("loading");
  const [opportunities, setOpportunities] = useState([]);
  const [emergencyOpportunities, setEmergencyOpportunities] =
    useState([]);
  const [activeEmergencyConversations, setActiveEmergencyConversations] =
    useState([]);
  const [emergencyStatus, setEmergencyStatus] =
    useState("loading");
  const [emergencyResponseState, setEmergencyResponseState] =
    useState({});
  const [reloadKey, setReloadKey] = useState(0);
  const isProfessional = isProfessionalSession();

  function openOpportunityConversation(opportunity) {
    const context = stageBusinessLeadConversation(opportunity);
    if (!context) return;

    setPage(CONVERSATION_THREAD_PAGE);
  }

  function openCanonicalEmergencyConversation(conversation) {
    const conversationId =
      conversation?.conversationId ||
      conversation?.conversation_id;

    if (!conversationId) return;

    setPage(
      buildCanonicalConversationRoute(
        conversationId,
        "businessLeads"
      )
    );
  }

  function openCanonicalEmergencyEvaluation(conversation) {
    const route = buildCanonicalEvaluationRoute(
      conversation?.emergencyRequestId
    );
    if (route) setPage(route);
  }

  async function respondToEmergency(opportunity) {
    const requestId = opportunity?.id;
    if (!requestId) return;

    setEmergencyResponseState((current) => ({
      ...current,
      [requestId]: {
        phase: "loading",
        created: false,
        message: "",
      },
    }));

    const result = await respondToEmergencyOpportunity(requestId, {
      setPage,
    });

    setEmergencyResponseState((current) => ({
      ...current,
      [requestId]: result.ok
        ? {
            phase: "ready",
            created: result.created,
            participationState: result.relationship?.status || "unknown",
            message: "",
          }
        : {
            phase: "error",
            created: false,
            message:
              result.message ||
              t("emergencyResponseFailed", language),
          },
    }));

    if (result.ok) {
      await emergencyRefreshCoordinatorRef.current?.refresh({
        invalidate: true,
        trigger: "response-mutation",
      });
    }
  }

  useEffect(() => {
    purgeProfessionalLeadCaches();

    const handleLanguageChange = () => setLanguage(getLanguage());
    window.addEventListener("languageChanged", handleLanguageChange);

    return () => window.removeEventListener("languageChanged", handleLanguageChange);
  }, []);

  useEffect(() => {
    if (!isProfessional) return;

    const unsubscribe = subscribeProfessionalOpportunities((snapshot) => {
      if (
        snapshot.phase === PROFESSIONAL_OPPORTUNITY_PHASE.LOADING &&
        snapshot.updatedAt === 0
      ) {
        setStatus(PROFESSIONAL_OPPORTUNITY_STATUS.LOADING);
        return;
      }

      setOpportunities(snapshot.records);
      setStatus(snapshot.status);
    });

    requestProfessionalOpportunities({
      caller: "BusinessLeads",
      trigger: reloadKey > 0 ? "manual-retry" : "mount",
      force: reloadKey > 0,
      setPage,
    });

    return unsubscribe;
  }, [isProfessional, reloadKey, setPage]);

  useEffect(() => {
    if (!isProfessional) return undefined;

    let hasConfirmedOpportunities = false;
    let hasConfirmedConversations = false;
    const refreshCoordinator =
      createEmergencyRefreshCoordinator({
        load: async () => {
          const [opportunityResult, conversationResult] =
            await Promise.all([
              listProfessionalEmergencyOpportunities({
                setPage,
              }),
              fetchCanonicalConversations("business", {
                setPage,
              }),
            ]);

          if (!opportunityResult.ok && !conversationResult.ok) {
            throw new Error(
              "Emergency professional work could not be refreshed."
            );
          }

          return { opportunityResult, conversationResult };
        },
        onSuccess: ({
          opportunityResult,
          conversationResult,
        }) => {
          if (opportunityResult.ok) {
            hasConfirmedOpportunities = true;
            setEmergencyOpportunities(
              opportunityResult.opportunities
            );
            setEmergencyStatus("ready");
          } else if (!hasConfirmedOpportunities) {
            setEmergencyStatus("unavailable");
          }

          if (conversationResult.ok) {
            hasConfirmedConversations = true;
            setActiveEmergencyConversations(
              conversationResult.conversations.filter(
                (conversation) =>
                  conversation.sourceType === "emergency"
              )
            );
          } else if (!hasConfirmedConversations) {
            setActiveEmergencyConversations([]);
          }
        },
        onError: (_error, { hasConfirmedData }) => {
          if (!hasConfirmedData) {
            setEmergencyStatus("unavailable");
          }
        },
      });

    emergencyRefreshCoordinatorRef.current =
      refreshCoordinator;
    void refreshCoordinator.start();

    const handleVisibilityChange = () => {
      void refreshCoordinator.handleVisibilityChange();
    };
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      refreshCoordinator.stop();
      if (
        emergencyRefreshCoordinatorRef.current ===
        refreshCoordinator
      ) {
        emergencyRefreshCoordinatorRef.current = null;
      }
    };
  }, [isProfessional, reloadKey, setPage]);

  if (!isProfessional) {
    return (
      <div className="app-page meetro-responsive-page" style={pageWrapper}>
        <div style={lockedCard}>
          <div style={stateIcon}>LOCK</div>
          <h1 style={stateTitle}>{t("professionalLeadsAccessRequired", language)}</h1>
          <p style={stateText}>{t("professionalLeadsAccessRequiredText", language)}</p>
          <button style={primaryButton} onClick={() => setPage("profile")}>
            {t("professionalLeadsReviewProfile", language)}
          </button>
        </div>

        <SafeBackBar setPage={setPage} fallback="businessDashboard" />
        <BottomNav setPage={setPage} currentPage="businessLeads" />
      </div>
    );
  }

  return (
    <div className="app-page meetro-responsive-page" style={pageWrapper}>
      <div style={heroCard}>
        <h1 style={heroTitle}>{t("businessLeads", language)}</h1>
        <p style={heroText}>
          {status === PROFESSIONAL_OPPORTUNITY_STATUS.READY
            ? "Open requests matched to your services and service area."
            : status === PROFESSIONAL_OPPORTUNITY_STATUS.EMPTY
              ? "Authorized request matching is active."
              : t("professionalLeadsUnavailableSummary", language)}
        </p>
      </div>

      <section
        style={leadSection}
        aria-labelledby="emergency-opportunities-title"
      >
        <h2
          id="emergency-opportunities-title"
          style={sectionHeading}
        >
          {t("professionalEmergencyOpportunities", language)}
        </h2>

        {activeEmergencyConversations.length > 0 && (
          <div style={leadList}>
            <h3 style={sectionSubheading}>
              {t("professionalEmergencyActive", language)}
            </h3>
            {activeEmergencyConversations.map((conversation) => (
              <article
                key={`active-emergency-${conversation.conversationId}`}
                style={emergencyLeadCard}
              >
                <span style={emergencyLeadStatus}>
                  {t("messagesActiveEmergency", language)}
                </span>
                <h3 style={stateTitle}>
                  {conversation.project_title}
                </h3>
                <p style={leadMeta}>
                  {conversation.workflow?.status ||
                    conversation.status}
                </p>
                <button
                  type="button"
                  style={leadActionButton}
                  onClick={() =>
                    openCanonicalEmergencyConversation(conversation)
                  }
                >
                  {t("emergencyOpenConversation", language)}
                </button>
                {[
                  "professional_arrived",
                  "work_in_progress",
                  "completed",
                ].includes(conversation.workflow?.status) && (
                  <button
                    type="button"
                    style={leadActionButton}
                    onClick={() =>
                      openCanonicalEmergencyEvaluation(conversation)
                    }
                  >
                    Open Evaluation
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        {emergencyStatus === "loading" ? (
          <div style={compactStateCard} role="status">
            {t("emergencyOpportunitiesLoading", language)}
          </div>
        ) : emergencyStatus === "unavailable" ? (
          <div style={compactErrorCard} role="alert">
            <p style={stateText}>
              {t("emergencyOpportunitiesUnavailable", language)}
            </p>
            <button
              type="button"
              style={primaryButton}
              onClick={() =>
                setReloadKey((value) => value + 1)
              }
            >
              {t("tryAgain", language)}
            </button>
          </div>
        ) : emergencyOpportunities.length === 0 ? (
          <div style={compactStateCard} role="status">
            {t("emergencyOpportunitiesEmpty", language)}
          </div>
        ) : (
          <div style={leadList}>
            {emergencyOpportunities.map((opportunity) => {
              const responseState =
                emergencyResponseState[opportunity.id] || {};
              const responsePresentation =
                resolveProfessionalEmergencyResponsePresentation({
                  participation: opportunity.participation,
                  localState: responseState,
                });

              return (
                <article
                  key={`emergency-${opportunity.id}`}
                  style={emergencyLeadCard}
                >
                  <span style={emergencyLeadStatus}>
                    {t("emergency", language)}
                  </span>
                  <h3 style={stateTitle}>
                    {opportunity.title}
                  </h3>
                  <p style={stateText}>
                    {opportunity.description}
                  </p>
                  <p style={leadMeta}>
                    {opportunity.serviceSpecialty}
                  </p>

                  <button
                    type="button"
                    style={{
                      ...leadActionButton,
                      ...(responsePresentation.confirmed
                        ? confirmedResponseButton
                        : {}),
                    }}
                    disabled={
                      responsePresentation.actionDisabled
                    }
                    onClick={() =>
                      respondToEmergency(opportunity)
                    }
                  >
                    {t(responsePresentation.labelKey, language)}
                  </button>

                  {responseState.phase === "error" && (
                    <p style={leadError} role="alert">
                      {responseState.message}
                    </p>
                  )}

                  {responsePresentation.pendingParticipation && (
                    <p style={leadReviewNote}>
                      {t("emergencyResponsePending", language)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {status === PROFESSIONAL_OPPORTUNITY_STATUS.LOADING ? (
        <section style={unavailableCard} role="status">Loading request opportunities…</section>
      ) : status === PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE ? (
        <section style={unavailableCard} aria-labelledby="professional-leads-unavailable">
          <div style={stateIcon}>LEAD</div>
          <h2 id="professional-leads-unavailable" style={stateTitle}>Request opportunities unavailable</h2>
          <p style={stateText}>Meetro could not verify eligible requests. Try again.</p>
          <button style={primaryButton} onClick={() => setReloadKey((value) => value + 1)}>Try Again</button>
        </section>
      ) : status === PROFESSIONAL_OPPORTUNITY_STATUS.EMPTY ? (
        <section style={unavailableCard} role="status">
          <div style={stateIcon}>LEAD</div>
          <h2 style={stateTitle}>No matching requests are available right now.</h2>
          <p style={stateText}>Meetro checked open requests against your saved services and service area.</p>
        </section>
      ) : (
        <section style={leadList} aria-label="Eligible request opportunities">
          {opportunities.map((opportunity) => {
            const conversationContext =
              getBusinessLeadConversationContext(opportunity);
            const cardKey = conversationContext
              ? `conversation-${conversationContext.conversationId}`
              : `request-${opportunity.request_id || opportunity.id}`;

            return (
              <article key={cardKey} style={leadCard}>
                <span style={leadStatus}>Open request</span>
                <h2 style={stateTitle}>{opportunity.project_title}</h2>
                <p style={stateText}>{opportunity.project_description}</p>
                <p style={leadMeta}>{opportunity.service_specialty || opportunity.request_category}</p>
                {conversationContext ? (
                  <button
                    type="button"
                    style={leadActionButton}
                    aria-label={`${t("openConversation", language)}: ${opportunity.project_title}`}
                    onClick={() => openOpportunityConversation(opportunity)}
                  >
                    {t("openConversation", language)}
                  </button>
                ) : (
                  <p style={leadReviewNote}>Request review only. Response and messaging are not available yet.</p>
                )}
              </article>
            );
          })}
        </section>
      )}

      <SafeBackBar setPage={setPage} fallback="businessDashboard" />
      <BottomNav setPage={setPage} currentPage="businessLeads" />
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(31,77,52,0.12) 0%, transparent 32%), linear-gradient(to bottom, var(--meetro-surface-warm, #fbf6ed), var(--meetro-surface-sage, #eef4ea))",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "#111827",
  overflowX: "hidden",
  width: "100%",
  maxWidth: "1040px",
  margin: "0 auto",
};

const heroCard = {
  background:
    "linear-gradient(135deg, var(--meetro-color-forest-deep, #14351f) 0%, var(--meetro-color-forest, #1f4d34) 58%, var(--meetro-color-coffee, #4a3428) 100%)",
  borderRadius: "30px",
  padding: "22px",
  color: "white",
  marginBottom: "18px",
  boxShadow: "var(--meetro-shadow-lifted, 0 24px 70px rgba(49,35,20,0.14))",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const heroTitle = {
  margin: "0 0 8px",
  fontSize: "30px",
  lineHeight: 1.05,
  overflowWrap: "break-word",
};

const heroText = {
  margin: 0,
  lineHeight: 1.5,
  opacity: 0.92,
  fontSize: "16px",
  overflowWrap: "break-word",
};

const unavailableCard = {
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "28px",
  padding: "34px 22px",
  textAlign: "center",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
};

const leadSection = {
  display: "grid",
  gap: "12px",
  marginBottom: "22px",
};

const sectionHeading = {
  margin: 0,
  color: "#111827",
  fontSize: "21px",
};

const sectionSubheading = {
  margin: "2px 0 0",
  color: "#475569",
  fontSize: "14px",
  fontWeight: "900",
};

const compactStateCard = {
  ...unavailableCard,
  padding: "18px",
  color: "#475569",
  lineHeight: 1.5,
};

const compactErrorCard = {
  ...compactStateCard,
  border: "1px solid #fecaca",
  background: "#fff7f7",
};

const lockedCard = {
  ...unavailableCard,
  marginTop: "60px",
};

const stateIcon = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "18px",
  fontWeight: 900,
};

const stateTitle = {
  margin: "18px 0 8px",
};

const stateText = {
  color: "#6b7280",
  lineHeight: 1.5,
  maxWidth: "620px",
  margin: "0 auto",
};

const primaryButton = {
  border: "none",
  background:
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  borderRadius: "18px",
  padding: "15px 18px",
  marginTop: "18px",
  minHeight: "44px",
  fontWeight: 900,
  cursor: "pointer",
};

const leadList = {
  display: "grid",
  gap: "14px",
};

const leadCard = {
  ...unavailableCard,
  textAlign: "left",
};

const emergencyLeadCard = {
  ...leadCard,
  border: "1px solid rgba(220,38,38,0.2)",
};

const leadStatus = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const emergencyLeadStatus = {
  ...leadStatus,
  color: "#b91c1c",
};

const leadMeta = {
  color: "#4b5563",
  fontWeight: 800,
  margin: "12px 0 0",
};

const leadReviewNote = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
  margin: "14px 0 0",
};

const leadActionButton = {
  ...primaryButton,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const confirmedResponseButton = {
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid #a7f3d0",
  cursor: "default",
};

const leadError = {
  margin: "12px 0 0",
  color: "#b91c1c",
  fontSize: "13px",
  fontWeight: "800",
};

export default BusinessLeads;
