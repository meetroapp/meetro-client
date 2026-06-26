import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroDetailsButton from "../components/MeetroDetailsButton";
import MeetroIcon from "../components/MeetroIcon";
import SpotlightSlideshow from "../components/SpotlightSlideshow";
import API_URL from "../api";
import {
  getBusinessPortfolioProjectImages,
  persistBusinessPortfolioProjects,
  readAllBusinessPortfolioItems,
} from "../utils/businessPortfolioStorage";
import { getLanguage, setLanguage, t } from "../utils/language";
import { getStoredHomeownerRequests } from "../utils/workflowTimeline";
import { openActiveEmergencyConversation } from "../utils/emergencyLifecycle";
import { isProfessionalSession, setActiveAccountMode } from "../utils/session";
import {
  getHomeownerWorkflowPresentation,
  getHomeownerLifecycleStage,
} from "../utils/homeownerLifecycle";
import { getHomeownerProjectJourney } from "../utils/homeownerProjectJourney";
import { isConversationUnreadForRole } from "../utils/conversationUnread";
import { getHomeownerServiceHistory } from "../utils/homeownerServiceHistory";
import {
  getStoredProfessionalMatchProfile,
  canProfessionalReceiveRequest,
  getRequestMatchSummary,
} from "../utils/professionalRequestMatching";
import {
  canProfessionalSeeLocalLead,
  getLocalLeadVisibilitySummary,
} from "../utils/localLeadVisibility";
import {
  canProfessionalServeArea,
  getServiceAreaMatchSummary,
} from "../utils/serviceAreaMatching";
import {
  canProfessionalReceiveLead,
  getLeadEligibilitySummary,
} from "../utils/leadEligibility";
import {
  attachSpotlightPortfolioMedia,
  buildSpotlightProfessionalProfile,
  getEligibleSpotlightBusinesses,
  getSpotlightAvatarUrl,
  getSpotlightFeaturedProject,
  getSpotlightMediaSourceSummary,
  getSpotlightMediaUrls,
  getSpotlightMediaForBusiness,
  getSpotlightRequestContexts,
  isNoContextSpotlightSafeBusiness,
} from "../utils/localSpotlightVisibility";

const homeLayoutMediaStyles = `
  @media (orientation: landscape) and (max-height: 520px) {
    .home-my-projects-tabs,
    .home-my-projects-portrait {
      display: none !important;
    }

    .home-my-projects-landscape {
      display: grid !important;
    }
  }

  @media (orientation: portrait), (min-height: 521px) {
    .home-my-projects-landscape {
      display: none !important;
    }
  }
`;

function Home({ setPage }) {
  const [language, updateLanguage] = useState(getLanguage());
  const [activeMode, setActiveMode] = useState("personal");
  const [homeView, setHomeView] = useState("landing");
  const [myProjectsTab, setMyProjectsTab] = useState("active");
  const [detailsRequest, setDetailsRequest] = useState(null);
  const [historyDetailsRequest, setHistoryDetailsRequest] = useState(null);
  const [spotlightPortfolioRefresh, setSpotlightPortfolioRefresh] = useState(0);

  const businessName = localStorage.getItem("businessName") || "";
  const businessCategory = localStorage.getItem("businessCategory") || "";
  const professionalMatchProfile = {
    ...getStoredProfessionalMatchProfile(),
    businessCategory,
    category: businessCategory,
  };
  const hasBusinessAccess =
    isProfessionalSession() ||
    Boolean(businessName) ||
    Boolean(businessCategory);

  const isBusinessMode = activeMode === "business" && hasBusinessAccess;

  const allHomeownerRequests = JSON.parse(
    localStorage.getItem("homeownerRequests") || "[]"
  ).filter((request) => request);

  const activeHomeownerRequests = allHomeownerRequests.filter(
    (request) =>
      request.status !== "cancelled" &&
      request.status !== "closed"
  );

  const closurePendingRequests = allHomeownerRequests.filter(
    (request) => request.status === "completed"
  );

  const historyRequests = getHomeownerServiceHistory();
  const conversationRegistry = JSON.parse(
    localStorage.getItem("meetro_conversation_registry") || "[]"
  );

  const unreadWorkflowMessages = conversationRegistry.filter((conversation) => {
    const conversationId =
      conversation?.conversationId || conversation?.id || "";

    return conversationId && isConversationUnreadForRole(conversationId, "homeowner", conversation.unread);
  });

  useEffect(() => {
    const handleLanguageChange = () => updateLanguage(getLanguage());

    const handleModeChange = () => {
      setActiveMode("personal");
    };
    const resetHomeLanding = () => {
      setHomeView("landing");
    };

    setActiveAccountMode("personal");
    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);
    window.addEventListener("accountModeChanged", handleModeChange);
    window.addEventListener("meetroHomeResetToLanding", resetHomeLanding);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
      window.removeEventListener("accountModeChanged", handleModeChange);
      window.removeEventListener("meetroHomeResetToLanding", resetHomeLanding);
    };
  }, []);

  const liveHomeownerRequests = getStoredHomeownerRequests();

  const matchingBusinessLeads = liveHomeownerRequests.filter((request) => {
    const status = String(request.status || "open").toLowerCase();

    if (
      status.includes("accepted") ||
      status.includes("completed") ||
      status.includes("cancelled")
    ) {
      return false;
    }

    return canProfessionalSeeLocalLead(professionalMatchProfile, request);
  });

  const realBusinessLeadCount = String(matchingBusinessLeads.length);

  function toggleLanguage() {
    const nextLanguage = language === "en" ? "es" : "en";
    setLanguage(nextLanguage);
    updateLanguage(nextLanguage);
  }

  function openWorkConversationForRequest(request = {}) {
    const requestId = request.requestId || request.id || "";
    const conversationId =
      request.conversationId ||
      request.activeConversationId ||
      request.projectConversationId ||
      requestId ||
      `request-${Date.now()}`;
    const professionalName =
      request.selectedProfessional ||
      request.businessName ||
      request.professionalName ||
      "Professional";

    localStorage.setItem("selectedHomeownerRequestId", String(requestId || conversationId));
    localStorage.setItem("selectedHomeownerRequest", JSON.stringify(request));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(request));
    localStorage.setItem("activeConversationId", String(conversationId));
    localStorage.setItem("activeConversationName", professionalName);
    localStorage.setItem("meetroConversationType", "standard");
    localStorage.setItem(
      "selectedConversation",
      JSON.stringify({
        id: conversationId,
        type: "work",
        category: "work",
        businessName: professionalName,
        projectTitle: request.title || request.category || "Service Request",
        requestId,
      })
    );
    localStorage.setItem("conversationReturnPage", "home");
    localStorage.setItem("returnPage", "home");
    setPage("conversationThread");
  }

  function switchMode(mode) {
    if (mode === "business" && !hasBusinessAccess) {
      setPage("contractorProfile");
      return;
    }

    setActiveAccountMode(mode);

    if (mode === "business") {
      setPage("businessDashboard");
      return;
    }

    setActiveMode("personal");
  }

  function openRequestDetails(request) {
    setDetailsRequest(request);
  }

  function openHistoryDetails(request) {
    setHistoryDetailsRequest(request);
  }

  function openHomeownerProject(request = {}) {
    setActiveAccountMode("personal");
    openWorkConversationForRequest(request);
  }

  const spotlightBusinesses = getLocalSpotlightBusinesses();
  const spotlightContexts = getSpotlightRequestContexts([], []);
  const matchedSpotlightBusinesses = getEligibleSpotlightBusinesses(
    spotlightBusinesses,
    spotlightContexts
  );
  const spotlightDebugSummary = buildLocalServicesSpotlightDebugSummary(
    spotlightBusinesses,
    spotlightContexts,
    matchedSpotlightBusinesses
  );
  const showSpotlightDebug = shouldShowLocalServicesSpotlightDebug();

  useEffect(() => {
    if (!showSpotlightDebug) return;
    console.info("[Meetro Spotlight Debug]", spotlightDebugSummary);
  }, [showSpotlightDebug, spotlightDebugSummary.debugKey]);

  useEffect(() => {
    hydrateSpotlightPortfolioProjects(matchedSpotlightBusinesses, () =>
      setSpotlightPortfolioRefresh((currentValue) => currentValue + 1)
    );
  }, [
    matchedSpotlightBusinesses
      .map((business) => getSpotlightContractorId(business))
      .filter(Boolean)
      .join("|"),
    spotlightPortfolioRefresh,
  ]);

  if (isBusinessMode) {
    return (
      <div className="app-page meetro-responsive-page" style={pageWrapper}>
        <style>{homeLayoutMediaStyles}</style>

<TopBar language={language} toggleLanguage={toggleLanguage} />

        <div style={businessHero}>
          <p style={eyebrow}>{t("businessDashboard")}</p>

          <h1 style={businessTitle}>{t("businessGreeting")}</h1>

          <p style={businessText}>{t("businessDashboardText")}</p>

          <div className="meetro-responsive-grid meetro-grid-4" style={statsGrid}>
            <StatCard title={t("newLeads")} value={realBusinessLeadCount} note={t("live")} />
            <StatCard title={t("messages")} value="5" note={t("unread")} />
            <StatCard title={t("profileViews")} value="32" note={t("thisWeek")} />
            <StatCard title={t("profileScore")} value="92%" note={t("great")} />
          </div>
        </div>

        <div style={modeCard}>
          <h2 style={sectionTitle}>{businessName || t("yourBusiness")}</h2>
          <p style={mutedText}>{businessCategory || t("professionalUser")}</p>

          <button style={primaryButton} onClick={() => setPage("businessDashboard")}>
            {t("open")} {t("businessDashboard")}
          </button>

          <button style={secondaryButton} onClick={() => switchMode("personal")}>
            {t("personalMode")}
          </button>
        </div>

        <h2 style={sectionTitle}>{t("businessTools")}</h2>

        <div className="meetro-responsive-grid meetro-grid-4" style={toolGrid}>
          <ToolCard
            icon="opportunities"
            title={t("leads")}
            text={t("openRequests")}
            onClick={() => setPage("businessLeads")}
          />

          <ToolCard
            icon="messages"
            title={t("messages")}
            text={t("customers")}
            onClick={() => setPage("messagesInbox")}
          />

          <ToolCard
            icon="▧"
            title={t("gallery")}
            text={t("portfolio")}
            onClick={() => {
              localStorage.setItem("projectDetailsReturnPage", "businessDashboard");
              localStorage.setItem("projectGalleryReturnPage", "projectDetails");
              setPage("projectDetails");
            }}
          />

          <ToolCard
            icon="businessProfile"
            title={t("businessProfile")}
            text={t("manage")}
            onClick={() => setPage("contractorProfile")}
          />
        </div>

        <BottomNav setPage={setPage} currentPage="businessDashboard" />
      </div>
    );
  }

  if (homeView === "activeRequests") {
    return (
      <div className="app-page meetro-responsive-page" style={pageWrapper}>
        <style>{homeLayoutMediaStyles}</style>
        <TopBar language={language} toggleLanguage={toggleLanguage} />

        <button style={backHomeButton} onClick={() => setHomeView("landing")}>
          ← {t("backToHome", language)}
        </button>

        <section style={homeWorkflowSection}>
          <div style={sectionHeader}>
            <div>
              <p style={sectionEyebrow}>{t("homeWorkflowLabel")}</p>
              <h2 style={sectionTitle}>{t("homeActiveRequestsTitle")}</h2>
            </div>
          </div>

          {activeHomeownerRequests.length > 0 ? (
            <div style={activeProjectsCarousel}>
              {activeHomeownerRequests.map((request) => (
                <ProjectCard
                  key={request.requestId || request.id || request.createdAt}
                  request={request}
                  language={language}
                  onClick={() => openHomeownerProject(request)}
                />
              ))}
            </div>
          ) : (
            <div style={emptyCard}>
              <h3 style={emptyTitle}>{t("homeNoActiveRequestsTitle")}</h3>
              <p style={mutedText}>{t("homeNoActiveRequestsText")}</p>

              <button style={primaryButton} onClick={() => setPage("upload")}>
                {t("requestService")}
              </button>
            </div>
          )}
        </section>

        <BottomNav setPage={setPage} currentPage="home" />
      </div>
    );
  }

  if (homeView === "serviceHistory") {
    return (
      <div className="app-page meetro-responsive-page" style={pageWrapper}>
        <style>{homeLayoutMediaStyles}</style>
        <TopBar language={language} toggleLanguage={toggleLanguage} />

        <button style={backHomeButton} onClick={() => setHomeView("landing")}>
          ← {t("backToHome", language)}
        </button>

        <section style={homeWorkflowSection}>
          <div style={sectionHeader}>
            <div>
              <p style={sectionEyebrow}>{t("homeHistoryEyebrow")}</p>
              <h2 style={sectionTitle}>{t("homeServiceHistoryTitle")}</h2>
              <p style={sectionGuideText}>
                {t("homeServiceHistoryGuide", language)}
              </p>
            </div>
          </div>

          {historyRequests.length > 0 ? (
            <div style={projectHistoryList}>
              {historyRequests
                .slice()
                .map((request) => (
                  <HistoryRequestCard
                    key={request.requestId || request.id}
                    request={request}
                    language={language}
                    setPage={setPage}
                    onDetails={openHistoryDetails}
                  />
                ))}
            </div>
          ) : (
            <div style={emptyCard}>
              <h3 style={emptyTitle}>{t("homeNoHistoryTitle")}</h3>
              <p style={mutedText}>{t("homeNoHistoryText")}</p>
            </div>
          )}
        </section>

        {historyDetailsRequest && (
          <ServiceHistoryDetailsSheet
            request={historyDetailsRequest}
            language={language}
            onOpenRecord={() => openCompletedRecord(historyDetailsRequest, setPage)}
            onMessageProfessional={() => openWorkConversationForRequest(historyDetailsRequest)}
            onClose={() => setHistoryDetailsRequest(null)}
          />
        )}

        <BottomNav setPage={setPage} currentPage="home" />
      </div>
    );
  }

  return (
    <div className="app-page meetro-responsive-page" style={pageWrapper}>
      <style>{homeLayoutMediaStyles}</style>
      <TopBar language={language} toggleLanguage={toggleLanguage} />

      <section style={homeWorkflowSection}>
        <div style={sectionHeader}>
          <div>
            <p style={sectionEyebrow}>{t("homeWorkflowLabel")}</p>
            <h2 style={sectionTitle}>{t("homeMyProjects", language)}</h2>
            <p style={sectionGuideText}>{t("homeMyProjectsSubtitle", language)}</p>
          </div>
        </div>

        <div className="home-my-projects-tabs" style={segmentedControl}>
          <button
            type="button"
            style={{
              ...segmentedButton,
              ...(myProjectsTab === "active" ? segmentedButtonActive : {}),
            }}
            onClick={() => setMyProjectsTab("active")}
          >
            {t("homeMyProjectsActive", language)}
          </button>
          <button
            type="button"
            style={{
              ...segmentedButton,
              ...(myProjectsTab === "history" ? segmentedButtonActive : {}),
            }}
            onClick={() => setMyProjectsTab("history")}
          >
            {t("homeMyProjectsHistory", language)}
          </button>
        </div>

        <div className="home-my-projects-portrait">
          {myProjectsTab === "active" ? (
            activeHomeownerRequests.length > 0 ? (
              <div style={activeProjectsCarousel}>
                {activeHomeownerRequests.slice(0, 3).map((request) => (
                  <ProjectCard
                    key={request.requestId || request.id || request.createdAt}
                    request={request}
                    language={language}
                    onClick={() => openHomeownerProject(request)}
                  />
                ))}
              </div>
            ) : (
              <div style={compactEmptyCard}>
                <strong>{t("homeNoActiveRequestsTitle")}</strong>
                <span>{t("homeNoActiveRequestsText")}</span>
              </div>
            )
          ) : historyRequests.length > 0 ? (
            <div style={projectHistoryList}>
              {historyRequests.slice(0, 3).map((request) => (
                <HistoryRequestCard
                  key={request.requestId || request.id}
                  request={request}
                  language={language}
                  setPage={setPage}
                  onDetails={openHistoryDetails}
                />
              ))}
            </div>
          ) : (
            <div style={compactEmptyCard}>
              <strong>{t("homeNoHistoryTitle")}</strong>
              <span>{t("homeNoHistoryText")}</span>
            </div>
          )}
        </div>

        <div className="home-my-projects-landscape" style={landscapeProjectsGrid}>
          <div style={landscapeProjectsPanel}>
            <h3 style={landscapeProjectsTitle}>{t("homeMyProjectsActive", language)}</h3>
            {activeHomeownerRequests.length > 0 ? (
              <div style={landscapeProjectsList}>
                {activeHomeownerRequests.slice(0, 2).map((request) => (
                  <ProjectCard
                    key={request.requestId || request.id || request.createdAt}
                    request={request}
                    language={language}
                    onClick={() => openHomeownerProject(request)}
                  />
                ))}
              </div>
            ) : (
              <div style={compactEmptyCard}>
                <strong>{t("homeNoActiveRequestsTitle")}</strong>
                <span>{t("homeNoActiveRequestsText")}</span>
              </div>
            )}
          </div>

          <div style={landscapeProjectsPanel}>
            <h3 style={landscapeProjectsTitle}>{t("homeMyProjectsHistory", language)}</h3>
            {historyRequests.length > 0 ? (
              <div style={landscapeProjectsList}>
                {historyRequests.slice(0, 2).map((request) => (
                  <HistoryRequestCard
                    key={request.requestId || request.id}
                    request={request}
                    language={language}
                    setPage={setPage}
                    onDetails={openHistoryDetails}
                  />
                ))}
              </div>
            ) : (
              <div style={compactEmptyCard}>
                <strong>{t("homeNoHistoryTitle")}</strong>
                <span>{t("homeNoHistoryText")}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={spotlightSection}>
        <div style={sectionHeader}>
          <div>
            <p style={sectionEyebrow}>
              {t("homeLocalServicesEyebrow", language)}
            </p>
            <h2 style={sectionTitle}>
              {t("homeLocalServicesSpotlight", language)}
            </h2>
            <p style={spotlightSubtitle}>
              {t("homeLocalServicesSubtitle", language)}
            </p>
          </div>
        </div>

        {matchedSpotlightBusinesses.length > 0 ? (
          <div style={spotlightRow} aria-label={t("homeLocalServicesSpotlight", language)}>
            {matchedSpotlightBusinesses.map((business) => (
              <SpotlightCard
                key={business.id || business.name || business.business_name}
                business={business}
                language={language}
                onViewProfile={() => {
                  localStorage.setItem(
                    "selectedContractor",
                    JSON.stringify(business)
                  );
                  localStorage.setItem("contractorDetailsReturnPage", "home");
                  setPage("contractorDetails");
                }}
              />
            ))}
          </div>
        ) : (
          <div style={spotlightEmptyCard}>
            {t("homeLocalServicesEmpty", language)}
          </div>
        )}
      </section>

      <section style={quickHelpSection}>
        <div style={sectionHeader}>
          <div>
            <p style={sectionEyebrow}>{t("homeownerWorkflowHome")}</p>
            <h2 style={sectionTitle}>{t("homeHelpToday")}</h2>
            <p style={sectionGuideText}>{t("homeHelpTodaySubtitle")}</p>
          </div>
        </div>

        <div style={helpActionGrid}>
          <button style={helpActionCard} onClick={() => setPage("upload")}>
            <span style={helpActionIcon}>
              <MeetroIcon name="request" size={24} decorative />
            </span>
            <strong>{t("requestService")}</strong>
          </button>

          <button style={helpActionCard} onClick={() => setPage("emergency")}>
            <span style={{ ...helpActionIcon, ...helpEmergencyIcon }}>
              <MeetroIcon name="emergency" size={24} decorative />
            </span>
            <strong>{t("emergencyHelp")}</strong>
          </button>

          <button style={helpActionCard} onClick={() => setPage("assistant")}>
            <span style={helpActionIcon}>
              <MeetroIcon name="aiHelp" size={24} decorative />
            </span>
            <strong>{t("aiHelp")}</strong>
          </button>
        </div>
      </section>

      {(() => {
        const emergencyStatus =
          localStorage.getItem("emergencyDispatchStatus") || "";

        const emergencyNeedsReview =
          localStorage.getItem("emergencyNeedsReview") === "true";

        const selectedEmergencyService =
          localStorage.getItem("selectedEmergencyService") || "";

        const shouldShowEmergencyCard =
          emergencyStatus &&
          !["cancelled", "closed"].includes(emergencyStatus) &&
          (emergencyStatus !== "completed" || emergencyNeedsReview);

        if (!shouldShowEmergencyCard) return null;

        const translatedEmergencyService =
          language === "es"
            ? selectedEmergencyService
                ?.replace("Emergency Plumbing", "Plomería de Emergencia")
                ?.replace("Emergency Electrical", "Electricista de Emergencia")
                ?.replace("Roof Leak Repair", "Reparación de Techo")
                ?.replace("Locksmith", "Cerrajero")
                ?.replace("Storm Prep Help", "Preparación para Tormentas")
                ?.replace("Other Emergency", "Otra Emergencia")
            : selectedEmergencyService;

        const translatedEmergencyStatus =
          language === "es"
            ? emergencyStatus
                ?.replace("pending", "pendiente")
                ?.replace("accepted", "aceptado")
                ?.replace("enroute", "en camino")
                ?.replace("arrived", "llegó")
                ?.replace("started", "iniciado")
                ?.replace("completed", "completado")
            : emergencyStatus;

        const isCompletedReview =
          emergencyStatus === "completed" && emergencyNeedsReview;

        return (
          <div style={activeEmergencyCard}>
            <div style={activeEmergencyTop}>
              <div style={activeEmergencyIcon}>
                <MeetroIcon
                  name={isCompletedReview ? "reviews" : "emergency"}
                  size={22}
                  decorative
                />
              </div>

              <div>
                <strong style={activeEmergencyTitle}>
                  {isCompletedReview
                    ? language === "es"
                      ? "Servicio completado"
                      : "Service completed"
                    : language === "es"
                    ? "Emergencia activa"
                    : "Active emergency"}
                </strong>

                <p style={activeEmergencyText}>
                  {translatedEmergencyService || t("emergencyHelp")} •{" "}
                  {translatedEmergencyStatus}
                </p>
              </div>
            </div>

            <button
              style={activeEmergencyButton}
              onClick={() => {
                if (isCompletedReview) {
                  setPage("emergencyComplete");
                  return;
                }

                if (!openActiveEmergencyConversation(setPage, "home")) {
                  setPage("emergencyStatus");
                }
              }}
            >
              {isCompletedReview
                ? language === "es"
                  ? "Calificar profesional"
                  : "Rate professional"
                : language === "es"
                ? "Ver progreso"
                : "View progress"}
            </button>
          </div>
        );
      })()}

      <section style={messagesCompactSection}>
        <button style={messageFocusCard} onClick={() => setPage("messagesInbox")}>
          <div style={messageFocusIcon}>
            <MeetroIcon name="messages" size={24} decorative />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={messageFocusTitle}>
              {unreadWorkflowMessages.length > 0
                ? `${unreadWorkflowMessages.length} ${t("homeMessagesCount", language)}`
                : t("homeMessagesAllCaughtUp")}
            </strong>
            <p style={messageFocusText}>
              {unreadWorkflowMessages.length > 0
                ? t("homeMessagesNeedAttentionText")
                : t("homeMessagesAllCaughtUpText")}
            </p>
          </div>
          <span style={messageOpenText}>
            {t("homeOpenMessages")}
          </span>
        </button>
      </section>

      {detailsRequest && (
        <ActiveRequestDetailsSheet
          request={detailsRequest}
          language={language}
          onOpenRequest={() => {
            localStorage.setItem(
              "selectedHomeownerRequestId",
              detailsRequest.requestId || detailsRequest.id
            );
            setPage("myRequests");
          }}
          onMessageProfessional={() => openWorkConversationForRequest(detailsRequest)}
          onClose={() => setDetailsRequest(null)}
        />
      )}

      {historyDetailsRequest && (
        <ServiceHistoryDetailsSheet
          request={historyDetailsRequest}
          language={language}
          onOpenRecord={() => openCompletedRecord(historyDetailsRequest, setPage)}
          onMessageProfessional={() => openWorkConversationForRequest(historyDetailsRequest)}
          onClose={() => setHistoryDetailsRequest(null)}
        />
      )}

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

function TopBar({ language, toggleLanguage }) {
  return (
    <div style={topBar}>
      <div style={brandWrap}>
        <span style={brandMain}>Meetro</span>
        <span style={brandBadge}>Community</span>
      </div>

      <button style={languageButton} onClick={toggleLanguage}>
        <MeetroIcon name="language" size={16} decorative /> {t("language")}{" "}
        <strong>{language === "en" ? t("english") : t("spanish")}</strong>
      </button>
    </div>
  );
}

function StatCard({ title, value, note }) {
  return (
    <div style={statCard}>
      <p style={statTitle}>{title}</p>
      <h2 style={statValue}>{value}</h2>
      <p style={statNote}>{note}</p>
    </div>
  );
}

function QuickCard({ icon, title, text, onClick }) {
  return (
    <button style={quickCard} onClick={onClick}>
      <div style={quickIcon}>
        <MeetroIcon name={icon} size={26} decorative />
      </div>
      <h3 style={quickTitle}>{title}</h3>
      <p style={quickText}>{text}</p>
    </button>
  );
}

function getLocalSpotlightBusinesses() {
  let savedBusinesses = [];

  try {
    savedBusinesses = JSON.parse(localStorage.getItem("meetroBusinesses") || "[]");
  } catch {
    savedBusinesses = [];
  }

  let contractorProfile = null;

  try {
    contractorProfile = JSON.parse(localStorage.getItem("contractorProfile") || "null");
  } catch {
    contractorProfile = null;
  }

  const localBusinessName = localStorage.getItem("businessName") || "";
  const localBusinessCategory = localStorage.getItem("businessCategory") || "";
  const localBusinessServiceDomain =
    localStorage.getItem("businessServiceDomain") ||
    localStorage.getItem("businessDomain") ||
    "";
  const localBusinessServiceCategories = readLocalJsonArray(
    "businessServiceCategories"
  );
  const localBusinessServiceSpecialties = readLocalJsonArray(
    "businessServiceSpecialties"
  );
  const localBusinessZipCodes = localStorage.getItem("businessZipCodes") || "";
  const localBusinessPrimaryCity =
    localStorage.getItem("businessPrimaryCity") || "";
  const localBusinessServiceRadius =
    localStorage.getItem("businessServiceRadius") || "";
  const localBusinessDemoSafe =
    localStorage.getItem("businessLocalDemoSafe") === "true" ||
    localStorage.getItem("localDemoSafe") === "true";

  if (!contractorProfile && localBusinessName) {
    contractorProfile = {
      id: localBusinessName,
      name: localBusinessName,
      business_name: localBusinessName,
      category: localBusinessCategory,
      business_category: localBusinessCategory,
      imageUrl: localStorage.getItem("businessImageUrl") || "",
      image_url: localStorage.getItem("businessImageUrl") || "",
      location: localStorage.getItem("businessLocation") || "",
      city: localBusinessPrimaryCity,
      primaryCity: localBusinessPrimaryCity,
      serviceZipCodes: localBusinessZipCodes,
      businessZipCodes: localBusinessZipCodes,
      serviceRadiusMiles: localBusinessServiceRadius,
      serviceDomain: localBusinessServiceDomain,
      businessServiceDomain: localBusinessServiceDomain,
      serviceCategories: localBusinessServiceCategories,
      businessServiceCategories: localBusinessServiceCategories,
      serviceSpecialties: localBusinessServiceSpecialties,
      businessServiceSpecialties: localBusinessServiceSpecialties,
      localDemoSafe: localBusinessDemoSafe || undefined,
      rating: localStorage.getItem("businessRating") || "",
      status: "active",
      localProfileOwner: true,
      __spotlightSource: "localStorage",
    };
  }

  const portfolioItems = getLocalSpotlightPortfolioItems();
  const businesses = savedBusinesses.map((business) => ({
    ...business,
    __spotlightSource: business.__spotlightSource || "meetroBusinesses",
  }));

  if (contractorProfile) {
    businesses.unshift({
      ...contractorProfile,
      id:
        contractorProfile.id ||
        contractorProfile.name ||
        contractorProfile.business_name,
      name:
        contractorProfile.name ||
        contractorProfile.business_name ||
        localBusinessName,
      business_name:
        contractorProfile.business_name ||
        contractorProfile.name ||
        localBusinessName,
      category:
        contractorProfile.category ||
        contractorProfile.business_category ||
        localBusinessCategory,
      business_category:
        contractorProfile.business_category ||
        contractorProfile.category ||
        localBusinessCategory,
      serviceDomain:
        contractorProfile.serviceDomain ||
        contractorProfile.service_domain ||
        localBusinessServiceDomain,
      businessServiceDomain:
        contractorProfile.businessServiceDomain ||
        contractorProfile.business_service_domain ||
        localBusinessServiceDomain,
      serviceCategories:
        contractorProfile.serviceCategories ||
        contractorProfile.service_categories ||
        localBusinessServiceCategories,
      businessServiceCategories:
        contractorProfile.businessServiceCategories ||
        contractorProfile.business_service_categories ||
        localBusinessServiceCategories,
      serviceSpecialties:
        contractorProfile.serviceSpecialties ||
        contractorProfile.service_specialties ||
        localBusinessServiceSpecialties,
      businessServiceSpecialties:
        contractorProfile.businessServiceSpecialties ||
        contractorProfile.business_service_specialties ||
        localBusinessServiceSpecialties,
      city:
        contractorProfile.city ||
        contractorProfile.primaryCity ||
        localBusinessPrimaryCity,
      primaryCity:
        contractorProfile.primaryCity ||
        contractorProfile.city ||
        localBusinessPrimaryCity,
      serviceZipCodes:
        contractorProfile.serviceZipCodes ||
        contractorProfile.service_zip_codes ||
        contractorProfile.businessZipCodes ||
        localBusinessZipCodes,
      businessZipCodes:
        contractorProfile.businessZipCodes ||
        contractorProfile.business_zip_codes ||
        contractorProfile.serviceZipCodes ||
        localBusinessZipCodes,
      serviceRadiusMiles:
        contractorProfile.serviceRadiusMiles ||
        contractorProfile.service_radius_miles ||
        localBusinessServiceRadius,
      localDemoSafe:
        contractorProfile.localDemoSafe ||
        contractorProfile.demoSafe ||
        localBusinessDemoSafe ||
        undefined,
      localProfileOwner: true,
      __spotlightSource: contractorProfile.__spotlightSource || "contractorProfile",
    });
  }

  const uniqueBusinesses = mergeLocalSpotlightBusinessRecords(businesses);

  return attachSpotlightPortfolioMedia(uniqueBusinesses, portfolioItems);
}

function getSpotlightContractorId(business = {}) {
  return String(
    business.contractorId ||
      business.contractor_id ||
      business.businessId ||
      business.business_id ||
      business.id ||
      ""
  ).trim();
}

function hasSpotlightProjectPhotos(business = {}) {
  const projectBuckets = [
    ...(Array.isArray(business.businessPortfolio) ? business.businessPortfolio : []),
    ...(Array.isArray(business.business_portfolio) ? business.business_portfolio : []),
    ...(Array.isArray(business.projects) ? business.projects : []),
    ...(Array.isArray(business.projectGallery) ? business.projectGallery : []),
    ...(Array.isArray(business.project_gallery) ? business.project_gallery : []),
  ];

  return projectBuckets.some(
    (project) => getBusinessPortfolioProjectImages(project).length > 0
  );
}

function getSpotlightPortfolioFetchCache() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem("meetroSpotlightPortfolioFetchCache") || "{}"
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function setSpotlightPortfolioFetchCache(cache = {}) {
  try {
    localStorage.setItem(
      "meetroSpotlightPortfolioFetchCache",
      JSON.stringify(cache)
    );
  } catch {}
}

async function hydrateSpotlightPortfolioProjects(
  businesses = [],
  onPortfolioHydrated = () => {}
) {
  if (!Array.isArray(businesses) || businesses.length === 0) return;

  const cache = getSpotlightPortfolioFetchCache();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const businessesToFetch = businesses.filter((business) => {
    const contractorId = getSpotlightContractorId(business);
    if (!contractorId || hasSpotlightProjectPhotos(business)) return false;

    const cachedAt = Number(cache[contractorId] || 0);
    return !cachedAt || now - cachedAt > oneDayMs;
  });

  if (businessesToFetch.length === 0) return;

  await Promise.all(
    businessesToFetch.map(async (business) => {
      const contractorId = getSpotlightContractorId(business);
      cache[contractorId] = now;
      setSpotlightPortfolioFetchCache(cache);

      try {
        const response = await fetch(
          `${API_URL}/contractor-projects/${encodeURIComponent(contractorId)}`
        );
        if (!response.ok) return;

        const data = await response.json();
        const projects = Array.isArray(data?.projects) ? data.projects : [];
        if (projects.length === 0) return;

        const normalizedProjects = persistBusinessPortfolioProjects(
          {
            ...business,
            id: contractorId,
            contractor_id: contractorId,
            business_name:
              business.business_name || business.name || business.businessName || "",
            name: business.name || business.business_name || "",
          },
          projects,
          {
            fallbackBusinessName:
              business.name || business.business_name || business.businessName || "",
          }
        );

        if (normalizedProjects.length > 0) {
          onPortfolioHydrated();
        }
      } catch (error) {
        if (localStorage.getItem("meetroSpotlightDebug") === "true") {
          console.warn("[Meetro Spotlight Portfolio Fetch]", error);
        }
      }
    })
  );
}

function getLocalSpotlightBusinessKey(business = {}) {
  return String(
    business?.id ||
      business?.businessId ||
      business?.business_id ||
      business?.contractorId ||
      business?.contractor_id ||
      business?.name ||
      business?.business_name ||
      ""
  )
    .trim()
    .toLowerCase();
}

function mergeArrayField(primaryValue, nextValue) {
  return [
    ...(Array.isArray(primaryValue) ? primaryValue : []),
    ...(Array.isArray(nextValue) ? nextValue : []),
  ];
}

function mergeLocalSpotlightBusinessRecords(businesses = []) {
  const byKey = new Map();

  businesses.forEach((business) => {
    const key = getLocalSpotlightBusinessKey(business);
    if (!business || !key || business.status === "closed") return;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, business);
      return;
    }

    byKey.set(key, {
      ...business,
      ...existing,
      businessPortfolio: mergeArrayField(
        existing.businessPortfolio,
        business.businessPortfolio
      ),
      business_portfolio: mergeArrayField(
        existing.business_portfolio,
        business.business_portfolio
      ),
      projects: mergeArrayField(existing.projects, business.projects),
      projectGallery: mergeArrayField(
        existing.projectGallery,
        business.projectGallery
      ),
      project_gallery: mergeArrayField(
        existing.project_gallery,
        business.project_gallery
      ),
      portfolio: mergeArrayField(existing.portfolio, business.portfolio),
      gallery: mergeArrayField(existing.gallery, business.gallery),
      photos: mergeArrayField(existing.photos, business.photos),
      portfolioImages: mergeArrayField(
        existing.portfolioImages,
        business.portfolioImages
      ),
      portfolio_images: mergeArrayField(
        existing.portfolio_images,
        business.portfolio_images
      ),
      __spotlightFeaturedProject:
        existing.__spotlightFeaturedProject ||
        business.__spotlightFeaturedProject,
      __spotlightSource: [
        existing.__spotlightSource,
        business.__spotlightSource,
      ]
        .filter(Boolean)
        .join(" + "),
    });
  });

  return Array.from(byKey.values());
}

function buildLocalServicesSpotlightDebugSummary(
  businesses = [],
  requestContexts = [],
  matchedBusinesses = []
) {
  const matchedIds = new Set(
    matchedBusinesses.map((business) =>
      String(business.id || business.name || business.business_name || "").toLowerCase()
    )
  );
  const candidateBusinessNames = businesses.map(
    (business) =>
      business.name ||
      business.business_name ||
      business.businessName ||
      "Unknown business"
  );
  const bgoneRecord =
    businesses.find((business) =>
      String(
        business.name ||
          business.business_name ||
          business.businessName ||
          business.id ||
          ""
      )
        .toLowerCase()
        .includes("bgone")
    ) || null;
  const firstRequestContext = requestContexts[0] || null;
  const bgoneProfile = bgoneRecord
    ? buildSpotlightProfessionalProfile(bgoneRecord)
    : null;
  const bgoneMediaCount = bgoneRecord
    ? getSpotlightMediaUrls(bgoneRecord).length
    : 0;
  const bgoneMediaSourceSummary = bgoneRecord
    ? getSpotlightMediaSourceSummary(bgoneRecord)
    : null;
  const bgoneRequestMatch =
    bgoneProfile && firstRequestContext
      ? getRequestMatchSummary(bgoneProfile, firstRequestContext)
      : null;
  const bgoneHasMedia = bgoneMediaCount > 0;
  const bgonePassesDomainCheck = bgoneProfile?.serviceDomain === "home_services";
  const bgonePassesSpecialtyCheck = firstRequestContext
    ? Boolean(bgoneRequestMatch?.checks?.specialtyMatched)
    : true;
  const bgonePassesAreaCheck =
    bgoneProfile && firstRequestContext
      ? canProfessionalServeArea(bgoneProfile, firstRequestContext)
      : true;
  const bgonePassesLeadEligibility =
    bgoneProfile && firstRequestContext
      ? canProfessionalReceiveLead(bgoneProfile, firstRequestContext)
      : true;
  const bgonePassesNoContextSpotlightRule = bgoneRecord
    ? isNoContextSpotlightSafeBusiness(bgoneRecord)
    : false;
  const bgoneKey = bgoneRecord
    ? String(
        bgoneRecord.id ||
          bgoneRecord.name ||
          bgoneRecord.business_name ||
          ""
      ).toLowerCase()
    : "";

  return {
    totalCandidateProfessionals: businesses.length,
    candidateBusinessNames,
    requestContextCount: requestContexts.length,
    requestContextSample: firstRequestContext
      ? {
          title: firstRequestContext.title,
          category: firstRequestContext.category,
          serviceDomain: firstRequestContext.serviceDomain,
          serviceSpecialty: firstRequestContext.serviceSpecialty,
          city: firstRequestContext.city,
          zipCode: firstRequestContext.zipCode,
          localDemoSafe: firstRequestContext.localDemoSafe,
        }
      : null,
    bgoneFound: Boolean(bgoneRecord),
    bgoneSource: bgoneRecord?.__spotlightSource || null,
    bgonePortfolioSource: bgoneRecord?.__spotlightPortfolioSources || [],
    bgonePortfolioItemCount: bgoneRecord?.__spotlightPortfolioItemCount || 0,
    bgoneMediaCount,
    bgoneMediaSourceSummary,
    bgoneServiceDomain: bgoneProfile?.serviceDomain || null,
    bgoneServiceSpecialties: bgoneProfile?.serviceSpecialties || [],
    bgoneServiceCategories: bgoneProfile?.serviceCategories || [],
    bgoneLocation: bgoneRecord
      ? {
          city: bgoneProfile?.city || "",
          zip:
            bgoneProfile?.zip ||
            bgoneProfile?.serviceZipCodes ||
            bgoneRecord.zip ||
            bgoneRecord.zipCode ||
            "",
          location: bgoneRecord.location || "",
          serviceCities: bgoneProfile?.serviceCities || "",
          serviceZipCodes: bgoneProfile?.serviceZipCodes || "",
          serviceRadiusMiles:
            bgoneRecord.serviceRadiusMiles ||
            bgoneRecord.service_radius_miles ||
            "",
        }
      : null,
    bgoneSafetyFlags: bgoneRecord
      ? {
          demoSafe: Boolean(bgoneRecord.demoSafe),
          localDemoSafe: Boolean(bgoneRecord.localDemoSafe),
          isDemo: Boolean(bgoneRecord.isDemo),
          localProfileOwner: Boolean(bgoneRecord.localProfileOwner),
        }
      : null,
    bgoneEligibility: bgoneRecord
      ? {
          candidateFound: true,
          hasMedia: bgoneHasMedia,
          passesSpotlightMediaCheck: bgoneHasMedia,
          passesDomainCheck: bgonePassesDomainCheck,
          passesSpecialtyCheck: bgonePassesSpecialtyCheck,
          passesAreaCheck: bgonePassesAreaCheck,
          passesLeadEligibility: bgonePassesLeadEligibility,
          passesNoContextSpotlightRule: bgonePassesNoContextSpotlightRule,
          noRequestContext: !firstRequestContext,
          noContextSpotlightSafe: bgonePassesNoContextSpotlightRule,
          requestMatch:
            bgoneProfile && firstRequestContext
              ? bgoneRequestMatch
              : null,
          canProfessionalReceiveRequest:
            bgoneProfile && firstRequestContext
              ? canProfessionalReceiveRequest(bgoneProfile, firstRequestContext)
              : null,
          serviceArea:
            bgoneProfile && firstRequestContext
              ? getServiceAreaMatchSummary(bgoneProfile, firstRequestContext)
              : null,
          canProfessionalServeArea:
            bgoneProfile && firstRequestContext
              ? canProfessionalServeArea(bgoneProfile, firstRequestContext)
              : null,
          leadEligibility:
            bgoneProfile && firstRequestContext
              ? getLeadEligibilitySummary(bgoneProfile, firstRequestContext)
              : null,
          canProfessionalReceiveLead:
            bgoneProfile && firstRequestContext
              ? canProfessionalReceiveLead(bgoneProfile, firstRequestContext)
              : null,
          localVisibilitySummary:
            bgoneProfile && firstRequestContext
              ? getLocalLeadVisibilitySummary(bgoneProfile, firstRequestContext)
              : null,
          includedInSpotlight: matchedIds.has(bgoneKey),
          finalIncludedInCards: matchedIds.has(bgoneKey),
        }
      : null,
    finalSpotlightCardCount: matchedBusinesses.length,
    finalSpotlightBusinessNames: matchedBusinesses.map(
      (business) =>
        business.name ||
        business.business_name ||
        business.businessName ||
        "Unknown business"
    ),
    debugKey: JSON.stringify({
      candidates: candidateBusinessNames,
      contexts: requestContexts.length,
      cards: matchedBusinesses.map(
        (business) => business.id || business.name || business.business_name
      ),
      bgoneMediaCount,
      bgoneSource: bgoneRecord?.__spotlightSource || null,
      bgonePortfolioItemCount: bgoneRecord?.__spotlightPortfolioItemCount || 0,
    }),
  };
}

function shouldShowLocalServicesSpotlightDebug() {
  if (typeof window === "undefined") return false;

  return localStorage.getItem("meetroSpotlightDebug") === "true";
}

function getLocalSpotlightPortfolioItems() {
  return readAllBusinessPortfolioItems();
}

function readLocalJsonArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function SpotlightCard({ business, language, onViewProfile }) {
  const name =
    business.name ||
    business.business_name ||
    t("homeLocalBusiness", language);
  const category =
    business.category ||
    business.business_category ||
    t("homeLocalService", language);
  const description =
    business.bio ||
    business.description ||
    business.businessDescription ||
    business.business_description ||
    t("homeSpotlightFallbackDescription", language);
  const featuredProject = getSpotlightFeaturedProject(business);
  const featuredProjectTitle =
    featuredProject?.title ||
    featuredProject?.name ||
    featuredProject?.projectTitle ||
    featuredProject?.project_title ||
    "";
  const featuredProjectDescription =
    featuredProject?.description ||
    featuredProject?.summary ||
    featuredProject?.caption ||
    "";
  const cardDescription = featuredProjectDescription || description;
  const servingSince =
    business.servingSince ||
    business.serving_since ||
    business.establishedYear ||
    business.established_year ||
    business.foundedYear ||
    business.founded_year ||
    business.yearFounded ||
    business.year_founded ||
    "";
  const servingArea =
    business.servingArea ||
    business.serving_area ||
    business.serviceArea ||
    business.service_area ||
    business.county ||
    business.market ||
    "";
  const servingLine = servingSince
    ? t("homeServingLocalAreaSince", language)
        .replace("{area}", servingArea || t("homeLocalArea", language))
        .replace("{year}", servingSince)
    : "";
  const logoUrl = getSpotlightAvatarUrl(business);
  const mediaUrls = getSpotlightMediaForBusiness(business);
  const photoCountLabel =
    mediaUrls.length === 1
      ? t("homeOnePhoto", language)
      : t("homePhotoCount", language).replace("{count}", mediaUrls.length);

  return (
    <article style={spotlightCard}>
      <SpotlightSlideshow
        images={mediaUrls}
        alt={name}
        photoCountLabel={photoCountLabel}
        placeholderLabel={t("homePortfolioPreview", language)}
        previousLabel={t("homePreviousPhoto", language)}
        nextLabel={t("homeNextPhoto", language)}
      />

      <div style={spotlightContent}>
        <div style={spotlightBusinessRow}>
          <div style={spotlightLogoWrap}>
            {logoUrl ? (
              <img src={logoUrl} alt="" style={spotlightLogoImage} />
            ) : (
              <span style={spotlightLogoFallback}>
                {String(name || "M").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div style={spotlightBusinessText}>
            <strong style={spotlightName}>{name}</strong>
            <span style={spotlightCategory}>{category}</span>
            {servingLine && (
              <span style={spotlightServingLine}>{servingLine}</span>
            )}
          </div>
        </div>

        {featuredProjectTitle && (
          <strong style={spotlightProjectTitle}>{featuredProjectTitle}</strong>
        )}

        <p style={spotlightDescription}>{cardDescription}</p>

        <button type="button" style={spotlightButton} onClick={onViewProfile}>
          {t("homeViewProfile", language)}
        </button>
      </div>
    </article>
  );
}

function ToolCard({ icon, title, text, onClick }) {
  return (
    <button style={toolCard} onClick={onClick}>
      <div style={toolIcon}>
        <MeetroIcon name={icon} size={28} decorative />
      </div>
      <h3 style={toolTitle}>{title}</h3>
      <p style={toolText}>{text}</p>
    </button>
  );
}

function ProjectCard({ request, language, onClick }) {
  const journey = getHomeownerProjectJourney(request, language);
  const professionalName = journey.professionalName;

  return (
    <div style={projectCard}>
      <div style={projectTopRow}>
        <div style={projectTopMain}>
          <h3 style={projectTitle}>
            {request.title ||
              request.category ||
              t("homeServiceRequest", language)}
          </h3>
          <span style={projectBadge}>{journey.currentTitle}</span>
        </div>
      </div>

      <div style={projectStageCompact}>
        <span style={projectLifecycleLabel}>{t("homeProgress", language)}</span>
        <div style={projectVisualProgress} aria-label={t("homeProgress", language)}>
        {journey.stages.map((item) => (
          <span
            key={item.key}
            style={{
              ...projectProgressDot,
              ...(item.complete ? projectProgressDotDone : {}),
              ...(item.current ? projectProgressDotCurrent : {}),
            }}
          >
            {item.complete ? "✓" : item.current ? "●" : ""}
          </span>
        ))}
        </div>
      </div>

      {professionalName && (
        <p style={projectProfessionalName}>{professionalName}</p>
      )}

      <button
        type="button"
        style={projectOpenButton}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
      >
        <MeetroIcon name="openExternal" size={16} decorative />
        {t("openProject", language)}
      </button>
    </div>
  );
}

function ActiveRequestDetailsSheet({
  request,
  language,
  onClose,
  onOpenRequest,
  onMessageProfessional,
}) {
  const lifecycle = getHomeownerWorkflowPresentation(request, language);
  const createdDate = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString(
        language === "es" ? "es-US" : "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      )
    : t("homeDatePending", language);
  const quotesCount = Array.isArray(request.quotesReceived)
    ? request.quotesReceived.length
    : request.quotesReceived || 0;
  const viewsCount = Array.isArray(request.viewedByBusinesses)
    ? request.viewedByBusinesses.length
    : request.viewedByBusinesses || 0;
  const messagesCount = request.messagesCount || 0;
  const hasMessaging =
    messagesCount > 0 ||
    Boolean(
      request.conversationId ||
        request.activeConversationId ||
        request.threadId ||
        request.selectedProfessional ||
        request.acceptedQuote
    );
  const serviceType =
    request.serviceType ||
    request.category ||
    t("homeService", language);

  return (
    <div style={detailsSheetOverlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("homeRequestDetailsAria", language)}
        style={detailsSheet}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={detailsSheetHandle}></div>
        <div style={detailsSheetHeader}>
          <div>
            <p style={sectionEyebrow}>
              {t("homeRequestDetails", language)}
            </p>
            <h3 style={detailsSheetTitle}>
              {request.title ||
                request.category ||
                t("homeActiveRequest", language)}
            </h3>
          </div>

          <button type="button" style={detailsSheetClose} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={detailsSheetGrid}>
          <DetailRow
            icon="completion"
            label={t("homeStatus", language)}
            value={lifecycle.statusLabel}
          />
          <DetailRow
            icon="openExternal"
            label={t("homeNextAction", language)}
            value={lifecycle.nextAction}
          />
          <DetailRow
            icon="schedule"
            label={t("homeCreated", language)}
            value={createdDate}
          />
          <DetailRow
            icon="noteText"
            label={t("homeDescription", language)}
            value={
              request.description ||
              t("homeNoExtraDetails", language)
            }
          />
          <DetailRow
            icon="readOnly"
            label={t("homeActivity", language)}
            value={`${viewsCount} ${t("homeViews", language)} · ${messagesCount} ${t(
              "homeMessagesCount",
              language
            )} · ${quotesCount} ${t("homeQuotesCount", language)}`}
          />
          <DetailRow
            icon="serviceTypes"
            label={t("homeServiceType", language)}
            value={serviceType}
          />
        </div>

        <button type="button" style={detailsPrimaryAction} onClick={onOpenRequest}>
          {t("homeOpenRequest", language)}
          <MeetroIcon name="openExternal" size={16} decorative />
        </button>

        {hasMessaging && (
          <button
            type="button"
            style={detailsSecondaryAction}
            onClick={onMessageProfessional}
          >
            {t("homeMessageProfessional", language)}
            <MeetroIcon name="messages" size={16} decorative />
          </button>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={detailsSheetRow}>
      <span aria-hidden="true" style={detailsSheetRowIcon}>
        <MeetroIcon name={icon} size={18} decorative />
      </span>
      <span style={detailsSheetRowLabel}>{label}</span>
      <strong style={detailsSheetRowValue}>{value}</strong>
    </div>
  );
}

function openCompletedRecord(request, setPage) {
  setActiveAccountMode("personal");
  localStorage.setItem(
    "selectedHomeownerRequestId",
    request.requestId || request.id || request.historyId || ""
  );
  localStorage.setItem("lastCompletedProject", JSON.stringify(request));
  localStorage.setItem("completedJobViewMode", "homeownerHistory");
  localStorage.setItem("completedJobHistoryMode", "true");
  setPage("completedJobDetails");
}

function displayText(value, fallback = "") {
  if (value == null || value === "") return fallback;
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || fallback;
  if (typeof value === "object") {
    return value.name || value.title || value.description || value.summary || fallback;
  }

  return String(value);
}

function ServiceHistoryDetailsSheet({
  request = {},
  language,
  onClose,
  onOpenRecord,
  onMessageProfessional,
}) {
  const completedDateSource =
    request.completedAt || request.closedAt || request.closeDate || "";
  const completedDateValue = completedDateSource ? new Date(completedDateSource) : null;
  const completedDate =
    completedDateValue && !Number.isNaN(completedDateValue.getTime())
      ? completedDateValue.toLocaleDateString(
        language === "es" ? "es-US" : "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      )
    : language === "es"
    ? "Fecha pendiente"
    : "Date pending";
  const photosCount = [
    ...(Array.isArray(request.photos) ? request.photos : []),
    ...(Array.isArray(request.completionPhotos) ? request.completionPhotos : []),
  ].length;
  const paymentStatus = String(request.paymentStatus || "").replace(/_/g, " ");
  const rawFinalAmount = request.finalAmount || request.revenue || request.amount || "";
  const finalAmount = rawFinalAmount
    ? String(rawFinalAmount).startsWith("$")
      ? String(rawFinalAmount)
      : `$${rawFinalAmount}`
    : "";
  const review = request.review || null;
  const receiptUrl = getHistoryReceiptUrl(request);
  const professional =
    request.professionalName ||
    request.businessName ||
    request.selectedProfessional ||
    request.acceptedQuote?.businessName ||
    request.quote?.businessName ||
    "";
  const hasMessaging = Boolean(
    request.conversationId ||
      request.threadId ||
      request.activeConversationId ||
      request.selectedProfessional ||
      request.acceptedQuote
  );
  const statusText = [
    t("homeCompleted", language),
    paymentStatus,
  ]
    .filter(Boolean)
    .join(" / ");
  const serviceTitle = displayText(
    request.title || request.category || request.service,
    t("homeUnknownService", language)
  );

  return (
    <div style={detailsSheetOverlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("homeServiceHistoryDetails", language)}
        style={detailsSheet}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={detailsSheetHandle}></div>
        <div style={detailsSheetHeader}>
          <div>
            <p style={sectionEyebrow}>
              {t("homeServiceDetails", language)}
            </p>
            <h3 style={detailsSheetTitle}>{serviceTitle}</h3>
          </div>

          <button type="button" style={detailsSheetClose} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={detailsSheetGrid}>
          <DetailRow
            icon="completion"
            label={t("homeStatus", language)}
            value={statusText}
          />
          <DetailRow
            icon="schedule"
            label={t("homeDate", language)}
            value={completedDate}
          />
          <DetailRow
            icon="payment"
            label={t("homeAmount", language)}
            value={finalAmount || t("homeAmountUnavailable", language)}
          />
          <DetailRow
            icon="businessProfile"
            label={t("homeProfessional", language)}
            value={displayText(
              professional,
              t("homeProfessionalUnavailable", language)
            )}
          />
          <DetailRow
            icon="portfolio"
            label={t("homePhotos", language)}
            value={`${photosCount} ${t("homePhotosCount", language)}`}
          />
          <DetailRow
            icon="reviews"
            label={t("homeReview", language)}
            value={
              review
                ? `${review.rating}/5 · ${review.comment || ""}`
                : t("homeReviewPending", language)
            }
          />
        </div>

        <button type="button" style={detailsPrimaryAction} onClick={onOpenRecord}>
          {t("viewDetails", language)}
          <MeetroIcon name="openExternal" size={16} decorative />
        </button>

        {receiptUrl && (
          <button
            type="button"
            style={detailsSecondaryAction}
            onClick={() => window.open(receiptUrl, "_blank", "noopener,noreferrer")}
          >
            {t("viewReceipt", language)}
            <MeetroIcon name="quickInvoice" size={16} decorative />
          </button>
        )}

        {hasMessaging && (
          <button
            type="button"
            style={detailsSecondaryAction}
            onClick={onMessageProfessional}
          >
            {t("homeMessageProfessional", language)}
            <span aria-hidden="true">◌</span>
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryRequestCard({ request, language, setPage, onDetails }) {
  const lifecycle = getHomeownerLifecycleStage(request, language);
  const isClosed = request.status === "closed" || lifecycle.key === "history";
  const completedDate = request.completedAt
    ? new Date(request.completedAt).toLocaleDateString(
        language === "es" ? "es-US" : "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      )
    : language === "es"
    ? "Fecha pendiente"
    : "Date pending";
  const amountValue =
    request.finalAmount ||
    request.revenue ||
    request.acceptedQuote?.amount ||
    request.quoteAmount ||
    0;
  const displayAmount = amountValue
    ? String(amountValue).startsWith("$")
      ? String(amountValue)
      : `$${amountValue}`
    : "";
  const paymentStatus = String(request.paymentStatus || "").replace(/_/g, " ");
  const receiptUrl = getHistoryReceiptUrl(request);
  const review = request.review || null;
  const professional =
    request.professionalName ||
    request.businessName ||
    request.selectedProfessional ||
    request.acceptedQuote?.businessName ||
    request.quote?.businessName ||
    t("homeProfessionalUnavailable", language);
  const reviewLabel = review
    ? `${t("viewReview", language)} · ${review.rating}/5`
    : t("leaveReview", language);

  return (
    <div style={historyCard}>
      <div style={historyTop}>
        <div>
          <div style={historyBadge}>
            <MeetroIcon name={isClosed ? "jobHistory" : "completion"} size={16} decorative />{" "}
            {isClosed ? t("homeCompleted", language) : lifecycle.stageLabel}
          </div>

          <h3 style={historyTitle}>
            {request.title ||
              request.category ||
              t("homeCompletedService", language)}
          </h3>

          <p style={historyContractor}>
            {professional}
          </p>

          <p style={historyContractor}>
            {completedDate} · {paymentStatus || t("homeCompleted", language)}
          </p>

        </div>

        <strong style={historyAmount}>
          {displayAmount}
        </strong>

      </div>

      <div style={historyMetaGrid}>
        <span style={historyMetaItem}>
          {t("homeStatus", language)}
          <strong style={historyMetaValue}>
            {isClosed ? t("homeCompleted", language) : lifecycle.stageLabel}
          </strong>
        </span>
        <span style={historyMetaItem}>
          {t("homeReview", language)}
          <strong style={historyMetaValue}>
            {review ? `${review.rating}/5` : t("homeReviewPending", language)}
          </strong>
        </span>
      </div>

      <div style={historyBottom}>
        <button
          style={historyButton}
          onClick={(e) => {
            e.stopPropagation();
            openCompletedRecord(request, setPage);
          }}
        >
          {t("viewDetails", language)}
        </button>

        <div style={historySecondaryActions}>
          {receiptUrl && (
            <button
              type="button"
              style={historySecondaryButton}
              onClick={(event) => {
                event.stopPropagation();
                window.open(receiptUrl, "_blank", "noopener,noreferrer");
              }}
            >
              {t("viewReceipt", language)}
            </button>
          )}

          <button
            type="button"
            style={historySecondaryButton}
            onClick={(event) => {
              event.stopPropagation();
              onDetails?.(request);
            }}
          >
            {reviewLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function getHistoryReceiptUrl(request = {}) {
  return (
    request.receiptUrl ||
    request.invoiceUrl ||
    request.receipt?.url ||
    request.invoice?.url ||
    request.acceptedQuote?.receiptUrl ||
    request.quote?.receiptUrl ||
    ""
  );
}

function ProCard({ name, category, location, rating, reviewCount, onClick }) {
  return (
    <button style={proCard} onClick={onClick}>
      <div style={proAvatar}>
        <MeetroIcon name="businessProfile" size={24} decorative />
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={proName}>{name}</h3>
        <p style={proMeta}>{category}</p>
        <p style={proMeta}>
          <MeetroIcon name="location" size={14} decorative /> {location}
        </p>
      </div>

      <span style={ratingBadge}>
        {rating ? (
          <>
            <MeetroIcon name="reviews" size={14} decorative /> {rating}
          </>
        ) : (
          "No reviews"
        )}
        {reviewCount ? ` (${reviewCount})` : ""}
      </span>
    </button>
  );
}

const pageWrapper = {
  background: "linear-gradient(to bottom, #f7f7fb 0%, #f2f3f8 100%)",
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "#111",
  width: "100%",
  maxWidth: "920px",
  minWidth: 0,
  overflowX: "hidden",
  margin: "0 auto",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  gap: "12px",
};

const brandWrap = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const brandMain = {
  fontSize: "22px",
  fontWeight: "900",
  color: "#5b3df5",
  letterSpacing: "-1px",
};

const brandBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "1px",
  textTransform: "uppercase",
};

const languageButton = {
  border: "none",
  background: "white",
  color: "#111",
  padding: "11px 14px",
  borderRadius: "18px",
  fontWeight: "700",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const heroCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "28px",
  padding: "26px 22px",
  marginBottom: "20px",
  boxShadow: "0 20px 46px rgba(91,61,245,0.22)",
};

const businessHero = {
  background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
  color: "white",
  borderRadius: "32px",
  padding: "22px 18px",
  marginBottom: "22px",
  boxShadow: "0 18px 40px rgba(15,23,42,0.24)",
};

const eyebrow = {
  margin: 0,
  opacity: 0.9,
  fontWeight: "900",
};

const heroTitle = {
  margin: "8px 0",
  fontSize: "clamp(28px, 7vw, 38px)",
  lineHeight: 1.12,
  letterSpacing: 0,
};

const businessTitle = {
  margin: "12px 0",
  fontSize: "28px",
  lineHeight: 1.15,
  textAlign: "center",
};

const heroText = {
  margin: "0 0 16px",
  fontSize: "18px",
  lineHeight: 1.38,
  opacity: 0.95,
};

const businessText = {
  margin: "0 auto 22px",
  fontSize: "17px",
  lineHeight: 1.6,
  opacity: 0.95,
  textAlign: "center",
  maxWidth: "620px",
};

const mainButton = {
  border: "none",
  background: "white",
  color: "#5b3df5",
  padding: "15px 20px",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

 const activeEmergencyCard = {
  background: "linear-gradient(135deg, #fee2e2, #fff7ed)",
  border: "1px solid #fecaca",
  borderRadius: "22px",
  padding: "14px",
  marginBottom: "10px",
  boxShadow: "0 10px 24px rgba(239,68,68,0.1)",
};

const activeEmergencyTop = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  marginBottom: "10px",
};

const activeEmergencyIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  background: "#ef4444",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
};

const activeEmergencyTitle = {
  display: "block",
  fontSize: "17px",
  fontWeight: "900",
  color: "#991b1b",
};

const activeEmergencyText = {
  margin: "4px 0 0",
  color: "#7f1d1d",
  fontWeight: "700",
  fontSize: "16px",
};

const activeEmergencyButton = {
  width: "100%",
  padding: "13px",
  borderRadius: "16px",
  border: "none",
  background: "#ef4444",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const quickGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "18px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const quickCard = {
  border: "none",
  background: "white",
  borderRadius: "20px",
  padding: "14px",
  textAlign: "left",
  boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
  cursor: "pointer",
};

const quickIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
  marginBottom: "9px",
};

const quickTitle = {
  margin: "0 0 4px",
  fontSize: "16px",
  color: "#111",
};

const quickText = {
  margin: 0,
  color: "#666",
  fontSize: "14px",
  lineHeight: 1.4,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
  minWidth: 0,
  marginBottom: "14px",
};

const homeWorkflowSection = {
  marginBottom: "24px",
  padding: "18px",
  borderRadius: "26px",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
};

const segmentedControl = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  padding: "4px",
  borderRadius: "18px",
  background: "#f1f5f9",
  marginBottom: "14px",
};

const segmentedButton = {
  border: "none",
  borderRadius: "14px",
  padding: "11px 12px",
  background: "transparent",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
};

const segmentedButtonActive = {
  background: "#5b3df5",
  color: "#ffffff",
  boxShadow: "0 8px 18px rgba(91,61,245,0.18)",
};

const compactEmptyCard = {
  display: "grid",
  gap: "5px",
  padding: "14px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "800",
};

const quickHelpSection = {
  marginBottom: "20px",
  padding: "16px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
};

const helpActionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px",
};

const helpActionCard = {
  minHeight: "92px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  borderRadius: "18px",
  padding: "13px 8px",
  display: "grid",
  placeItems: "center",
  gap: "8px",
  color: "#111827",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
  textAlign: "center",
};

const helpActionIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  background: "#f3f0ff",
  color: "#5b3df5",
  display: "grid",
  placeItems: "center",
};

const helpEmergencyIcon = {
  background: "#fef2f2",
  color: "#dc2626",
};

const messagesCompactSection = {
  marginBottom: "20px",
};

const sectionGuideText = {
  margin: "5px 0 0",
  color: "#667085",
  fontSize: "14px",
  lineHeight: 1.42,
  fontWeight: "700",
};

const spotlightSection = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  marginBottom: "26px",
  overflow: "visible",
};

const spotlightRow = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "14px",
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  overscrollBehaviorX: "contain",
  scrollbarWidth: "none",
  scrollSnapType: "x mandatory",
  padding: "2px 2px 10px",
  boxSizing: "border-box",
};

const spotlightEmptyCard = {
  width: "100%",
  boxSizing: "border-box",
  padding: "16px",
  borderRadius: "20px",
  border: "1px solid rgba(226,232,240,0.95)",
  background: "#ffffff",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "800",
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
};

const spotlightDebugLine = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "850",
};

const spotlightSubtitle = {
  margin: "2px 0 20px",
  color: "#53617a",
  fontSize: "16px",
  lineHeight: 1.35,
  fontWeight: "650",
};

const spotlightCard = {
  width: "82vw",
  maxWidth: "360px",
  flex: "0 0 auto",
  boxSizing: "border-box",
  scrollSnapAlign: "start",
  borderRadius: "22px",
  border: "1px solid rgba(226,232,240,0.95)",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15,23,42,0.10)",
  overflow: "hidden",
  color: "#111827",
};

const spotlightContent = {
  display: "grid",
  gap: "10px",
  padding: "11px 14px 15px",
  minWidth: 0,
};

const spotlightBusinessRow = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
  minWidth: 0,
};

const spotlightLogoWrap = {
  width: "46px",
  height: "46px",
  borderRadius: "50%",
  overflow: "hidden",
  background: "#0f172a",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  boxShadow: "0 10px 24px rgba(15,23,42,0.18)",
};

const spotlightLogoImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const spotlightLogoFallback = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "950",
};

const spotlightBusinessText = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
};

const spotlightName = {
  color: "#111827",
  fontSize: "19px",
  fontWeight: "950",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const spotlightCategory = {
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "850",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  overflowWrap: "anywhere",
};

const spotlightServingLine = {
  color: "#53617a",
  fontSize: "12px",
  fontWeight: "850",
  overflowWrap: "anywhere",
};

const spotlightProjectTitle = {
  display: "block",
  margin: "0 0 -4px",
  color: "#111827",
  fontSize: "15px",
  fontWeight: "950",
  lineHeight: 1.25,
  overflowWrap: "anywhere",
};

const spotlightDescription = {
  margin: 0,
  color: "#53617a",
  fontSize: "14px",
  lineHeight: 1.38,
  fontWeight: "650",
  overflowWrap: "anywhere",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const spotlightButton = {
  width: "100%",
  minHeight: "46px",
  border: "0",
  borderRadius: "13px",
  background: "#5b3df5",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(91,61,245,0.22)",
};

const sectionEyebrow = {
  margin: "0 0 5px",
  color: "#5b3df5",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const sectionTitle = {
  margin: "0 0 12px",
  fontSize: "24px",
  color: "#111",
};

const textButton = {
  border: "none",
  background: "transparent",
  color: "#5b3df5",
  fontWeight: "900",
  cursor: "pointer",
  minHeight: "40px",
  padding: "4px 0",
  flexShrink: 0,
};

const backHomeButton = {
  border: "none",
  background: "#ffffff",
  color: "#5b3df5",
  padding: "12px 14px",
  borderRadius: "16px",
  fontWeight: "900",
  marginBottom: "16px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const emptyCard = {
  background: "white",
  borderRadius: "26px",
  padding: "24px",
  marginBottom: "24px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const emptyTitle = {
  margin: "0 0 8px",
  color: "#111",
};

const mutedText = {
  margin: "0 0 16px",
  color: "#666",
  lineHeight: 1.5,
};

const primaryButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  padding: "14px 18px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const secondaryButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
  padding: "14px 18px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "10px",
};

const heroActionRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 0.75fr)",
  gap: "10px",
  marginTop: "16px",
  minWidth: 0,
  maxWidth: "100%",
};

const heroAiButton = {
  padding: "14px 12px",
  borderRadius: "18px",
  border: "1px solid rgba(91,61,245,0.22)",
  background: "rgba(255,255,255,0.94)",
  color: "#5b3df5",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(91,61,245,0.12)",
};

const heroDivider = {
  height: "1px",
  margin: "18px 0 14px",
  background: "rgba(255,255,255,0.24)",
};

const heroEmergencyButton = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.26)",
  borderRadius: "22px",
  padding: "14px",
  display: "flex",
  gap: "12px",
  alignItems: "center",
  textAlign: "left",
  background: "rgba(255,255,255,0.14)",
  color: "white",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
};

const heroEmergencyIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, #dc2626, #fb7185)",
  fontSize: "24px",
  flexShrink: 0,
  boxShadow: "0 12px 22px rgba(220,38,38,0.32)",
};

const heroEmergencyTextWrap = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const heroEmergencyTitle = {
  fontSize: "17px",
  fontWeight: "950",
};

const heroEmergencyText = {
  fontSize: "13px",
  lineHeight: 1.35,
  color: "rgba(255,255,255,0.88)",
};

const emergencyHeroCard = {
  width: "100%",
  border: "0",
  textAlign: "left",
  padding: "18px",
  borderRadius: "26px",
  margin: "18px 0 18px",
  color: "white",
  background:
    "linear-gradient(135deg, #dc2626 0%, #ef4444 48%, #fb7185 100%)",
  boxShadow: "0 22px 46px rgba(220,38,38,0.28)",
  cursor: "pointer",
};

const emergencyHeroTop = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
};

const emergencyHeroIcon = {
  width: "52px",
  height: "52px",
  borderRadius: "18px",
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.18)",
  fontSize: "27px",
  flexShrink: 0,
};

const emergencyHeroTitle = {
  display: "block",
  fontSize: "20px",
  fontWeight: "950",
  letterSpacing: "-0.4px",
};

const emergencyHeroText = {
  margin: "5px 0 0",
  fontSize: "14px",
  lineHeight: 1.4,
  color: "rgba(255,255,255,0.92)",
};

const emergencyHeroCta = {
  display: "block",
  marginTop: "16px",
  padding: "13px 14px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.95)",
  color: "#b91c1c",
  fontSize: "15px",
  fontWeight: "950",
  textAlign: "center",
};

const projectList = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  gap: "18px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const activeProjectsCarousel = {
  display: "flex",
  gap: "14px",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "2px 2px 10px",
};

const projectCard = {
  width: "min(82vw, 100%)",
  maxWidth: "360px",
  minWidth: 0,
  flex: "0 0 auto",
  scrollSnapAlign: "start",
  textAlign: "left",
  border: "1px solid #dfe6f1",
  background: "#ffffff",
  borderRadius: "20px",
  padding: "18px",
  boxShadow: "0 12px 30px rgba(15,23,42,.06)",
  boxSizing: "border-box",
  overflow: "hidden",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const projectTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "10px",
  minWidth: 0,
  maxWidth: "100%",
};

const projectTopMain = {
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
};

const projectTopActions = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexShrink: 0,
};

const projectTitle = {
  margin: "0 0 10px",
  color: "#050812",
  fontSize: "20px",
  fontWeight: "950",
  lineHeight: 1.12,
  letterSpacing: "-0.02em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const projectProfessionalName = {
  margin: "10px 0 0",
  color: "#263653",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.35,
};

const projectStatus = {
  margin: 0,
  color: "#5b3df5",
  fontSize: "13px",
  fontWeight: "950",
};


const projectStageCompact = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 16,
  background: "rgba(99, 102, 241, 0.08)",
  border: "1px solid rgba(99, 102, 241, 0.12)",
};

const projectVisualProgress = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginTop: "7px",
};

const projectProgressDot = {
  width: "18px",
  height: "18px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "#f8fafc",
  border: "1px solid #dbe3ef",
  color: "#94a3b8",
  fontSize: "8px",
  fontWeight: "950",
};

const projectProgressDotDone = {
  background: "#ecfdf5",
  borderColor: "#86efac",
  color: "#047857",
};

const projectProgressDotCurrent = {
  background: "#5b3df5",
  borderColor: "#5b3df5",
  color: "#ffffff",
};

const projectLifecycleCompact = {
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 18,
  background: "#f7f4ff",
  border: "1px solid #ddd6fe",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const projectActionSummary = {
  marginTop: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const projectAmount = {
  color: "#050812",
  fontSize: "22px",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const projectMiniMetaRow = {
  marginTop: 12,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const projectStageLabel = {
  display: "block",
  marginBottom: "3px",
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "950",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const projectBadge = {
  background: "#ecfdf5",
  color: "#047857",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  lineHeight: 1.2,
};

const projectBadgeDot = {
  width: "7px",
  height: "7px",
  borderRadius: "999px",
  background: "#10b981",
};

const projectCategoryTag = {
  display: "inline-flex",
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
  marginBottom: "8px",
  textTransform: "capitalize",
};

const projectDescription = {
  margin: "8px 0 0",
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: 1.35,
  minHeight: "28px",
};

const projectLifecycleBox = {
  marginTop: "10px",
  padding: "10px 11px",
  borderRadius: "15px",
  background: "#f8fafc",
  border: "1px solid #e0e7ff",
};

const projectLifecycleLabel = {
  display: "block",
  color: "#5b3df5",
  fontSize: "10px",
  fontWeight: "950",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: "3px",
};

const projectLifecycleNext = {
  display: "block",
  color: "#17233f",
  fontSize: "14px",
  lineHeight: 1.35,
};

const projectTimelineHint = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
  marginTop: "13px",
};

const projectTimelineStep = {
  display: "inline-flex",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "6px 8px",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "900",
};

const projectTimelineStepDone = {
  borderColor: "#bbf7d0",
  background: "#f0fdf4",
  color: "#047857",
};

const projectTimelineStepCurrent = {
  borderColor: "#8b7cff",
  background: "#f7f4ff",
  color: "#4f28e8",
};

const projectOpenButton = {
  marginTop: "14px",
  border: "none",
  borderRadius: "16px",
  padding: "13px 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "9px",
  background: "linear-gradient(135deg,#5b3df5,#4f28e8)",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  width: "100%",
};

const projectStats = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "8px",
  marginTop: "12px",
  marginBottom: "8px",
};

const projectStatChip = {
  borderRadius: "14px",
  padding: "8px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  minHeight: "50px",
  boxShadow: "0 3px 10px rgba(91,61,245,0.03)",
};

const projectStatViews = {
  background: "linear-gradient(135deg, #faf7ff, #ffffff)",
  border: "1.5px solid #ddd6fe",
  color: "#5b3df5",
};

const projectStatMessages = {
  background: "linear-gradient(135deg, #f0f9ff, #ffffff)",
  border: "1.5px solid #bfdbfe",
  color: "#1d4ed8",
};

const projectStatQuotes = {
  background: "linear-gradient(135deg, #f0fdf4, #ffffff)",
  border: "1.5px solid #bbf7d0",
  color: "#047857",
};

const projectStatQuoteAlert = {
  background: "linear-gradient(135deg,#f5f3ff,#ffffff)",
  border: "2px solid #8b5cf6",
  color: "#5b3df5",
  boxShadow: "0 0 0 4px rgba(91,61,245,0.10), 0 0 30px rgba(91,61,245,0.35)",
};

const projectQuoteAlertText = {
  display: "block",
  marginTop: "4px",
  color: "#5b3df5",
  fontSize: "11px",
  fontWeight: "900",
};

const projectStatIcon = {
  width: "22px",
  height: "22px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(91,61,245,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  flexShrink: 0,
};

const projectStatNumber = {
  display: "block",
  fontSize: "12px",
  lineHeight: 1,
  fontWeight: "950",
};

const projectStatLabel = {
  display: "block",
  marginTop: "1px",
  fontSize: "9px",
  fontWeight: "800",
};

const projectProgressBar = {
  height: "5px",
  background: "#eef2ff",
  borderRadius: "999px",
  overflow: "hidden",
  marginBottom: "7px",
};

const projectProgressFill = {
  width: "22%",
  height: "100%",
  background: "linear-gradient(90deg, #5b3df5, #8b5cf6)",
  borderRadius: "999px",
};

const projectFooter = {
  borderTop: "1px solid #f3f4f6",
  paddingTop: "8px",
  color: "#4f46e5",
  fontWeight: "900",
  fontSize: "11px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "6px",
  flexWrap: "nowrap",
};

const projectFooterItem = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  whiteSpace: "nowrap",
};

const projectFooterIcon = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "#f8f7ff",
  border: "1px solid #ede9fe",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  flexShrink: 0,
};

const detailsSheetOverlay = {
  position: "fixed",
  inset: 0,
  width: "100%",
  maxWidth: "100%",
  zIndex: 12000,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding:
    "16px max(12px, env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))",
  background: "rgba(15,23,42,0.38)",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const detailsSheet = {
  width: "100%",
  maxWidth: "min(520px, 100%)",
  minWidth: 0,
  maxHeight: "min(82dvh, 680px)",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  background: "#ffffff",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "26px 26px 22px 22px",
  padding: "10px 16px 18px",
  boxSizing: "border-box",
  boxShadow: "0 -18px 54px rgba(15,23,42,0.22)",
  overflowWrap: "anywhere",
};

const detailsSheetHandle = {
  width: "44px",
  height: "5px",
  borderRadius: "999px",
  background: "#cbd5e1",
  margin: "0 auto 14px",
};

const detailsSheetHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "14px",
};

const detailsSheetTitle = {
  margin: "2px 0 0",
  color: "#111827",
  fontSize: "21px",
  lineHeight: 1.15,
};

const detailsSheetClose = {
  width: "38px",
  height: "38px",
  border: "1px solid rgba(148,163,184,0.42)",
  borderRadius: "50%",
  background: "#ffffff",
  color: "#334155",
  fontSize: "24px",
  fontWeight: 800,
  cursor: "pointer",
  flexShrink: 0,
};

const detailsSheetGrid = {
  display: "grid",
  gap: "8px",
  marginBottom: "12px",
  minWidth: 0,
  maxWidth: "100%",
};

const detailsSheetRow = {
  display: "grid",
  gridTemplateColumns: "36px minmax(0, 0.74fr) minmax(0, 1.18fr)",
  alignItems: "center",
  gap: "10px",
  minHeight: "58px",
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid rgba(226,232,240,0.86)",
  background: "linear-gradient(135deg,#ffffff,#f8fafc)",
  color: "#475569",
  boxSizing: "border-box",
  minWidth: 0,
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const detailsSheetRowIcon = {
  width: "28px",
  height: "28px",
  borderRadius: "12px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f3f0ff",
  color: "#5b3df5",
  fontSize: "15px",
  fontWeight: "950",
};

const detailsSheetRowLabel = {
  color: "#334155",
  fontSize: "14px",
  fontWeight: "750",
};

const detailsSheetRowValue = {
  color: "#1f2937",
  fontSize: "14px",
  fontWeight: "900",
  lineHeight: 1.35,
  textAlign: "right",
  overflowWrap: "anywhere",
  minWidth: 0,
};

const detailsPrimaryAction = {
  width: "100%",
  minHeight: "54px",
  border: "none",
  borderRadius: "16px",
  marginTop: "16px",
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(91,61,245,0.24)",
};

const detailsSecondaryAction = {
  width: "100%",
  minHeight: "52px",
  border: "1px solid rgba(91,61,245,0.32)",
  borderRadius: "16px",
  marginTop: "12px",
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  background: "#ffffff",
  color: "#5b3df5",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
};

const projectFooterDate = {
  display: "block",
  marginTop: "2px",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "800",
};

const projectHistoryList = {
  display: "grid",
  gap: "14px",
  marginBottom: "26px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};


const landscapeProjectsGrid = {
  display: "none",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: "14px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const landscapeProjectsPanel = {
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
};

const landscapeProjectsTitle = {
  margin: "0 0 10px",
  fontSize: "14px",
  fontWeight: "950",
  color: "#0f172a",
};

const landscapeProjectsList = {
  display: "grid",
  gap: "12px",
  minWidth: 0,
  maxWidth: "100%",
};

const messageFocusCard = {
  width: "100%",
  border: "1px solid rgba(59,130,246,0.16)",
  borderRadius: "24px",
  background: "linear-gradient(135deg,#ffffff,#f8fbff)",
  padding: "18px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  boxShadow: "0 14px 30px rgba(15,23,42,0.07)",
  cursor: "pointer",
};

const messageFocusIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "22px",
  flexShrink: 0,
};

const messageFocusTitle = {
  display: "block",
  color: "#111827",
  fontSize: "16px",
  fontWeight: "950",
};

const messageFocusText = {
  margin: "4px 0 0",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: "650",
};

const messageOpenText = {
  color: "#5b3df5",
  fontSize: "13px",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const messageFocusBadge = {
  minWidth: "34px",
  height: "34px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "#5b3df5",
  color: "white",
  fontSize: "14px",
  fontWeight: "950",
};

const historyCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
  display: "grid",
  gap: "14px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
  overflowWrap: "anywhere",
};

const historyTop = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, auto) auto",
  alignItems: "flex-start",
  gap: "10px",
  minWidth: 0,
  maxWidth: "100%",
};

const historyBadge = {
  display: "inline-flex",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "999px",
  padding: "6px 12px",
  fontWeight: "900",
  fontSize: "12px",
  marginBottom: "10px",
};

const historyTitle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: "900",
  color: "#111827",
  minWidth: 0,
  overflowWrap: "anywhere",
};

const historyContractor = {
  margin: "6px 0 0",
  color: "#64748b",
  fontWeight: "700",
};

const historyAmount = {
  color: "#15803d",
  fontSize: "22px",
  fontWeight: "900",
  maxWidth: "90px",
  minWidth: 0,
  overflowWrap: "anywhere",
  textAlign: "right",
};

const historyMetaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: "10px",
  padding: "12px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
};

const historyMetaItem = {
  display: "grid",
  gap: "4px",
};

const historyMetaValue = {
  color: "#111827",
  fontSize: "13px",
  fontWeight: "900",
};

const historyBottom = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  color: "#64748b",
  fontWeight: "800",
  minWidth: 0,
  maxWidth: "100%",
};

const historyButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "14px",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
};

const historySecondaryActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
};

const historySecondaryButton = {
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#4f46e5",
  borderRadius: "14px",
  padding: "10px 12px",
  fontWeight: "900",
  cursor: "pointer",
};

const proList = {
  display: "grid",
  gap: "14px",
  marginBottom: "24px",
};

const proCard = {
  border: "none",
  background: "white",
  borderRadius: "24px",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const proAvatar = {
  width: "46px",
  height: "46px",
  borderRadius: "18px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const proName = {
  margin: "0 0 4px",
  fontSize: "17px",
  color: "#111",
};

const proMeta = {
  margin: 0,
  color: "#666",
  fontSize: "16px",
};

const ratingBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "8px 10px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
};

const modeCard = {
  background: "white",
  borderRadius: "26px",
  padding: "22px",
  marginBottom: "24px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "14px",
  marginTop: "14px",
};

const statCard = {
  background: "rgba(255,255,255,0.12)",
  borderRadius: "22px",
  padding: "14px",
  textAlign: "center",
};

const statTitle = {
  margin: 0,
  color: "white",
  opacity: 0.92,
};

const statValue = {
  margin: "14px 0 6px",
  fontSize: "34px",
  color: "white",
};

const statNote = {
  margin: 0,
  color: "white",
  opacity: 0.78,
};

const ecosystemSection = {
  marginTop: "14px",
  marginBottom: "18px",
};

const sectionHeaderRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  minWidth: 0,
  marginBottom: "14px",
};

const ecosystemGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const compactHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const compactSectionTitle = {
  margin: "0",
  fontSize: "18px",
  fontWeight: "950",
  color: "#17132a",
};

const compactViewButton = {
  border: "none",
  borderRadius: "999px",
  padding: "9px 14px",
  background: "#efe7ff",
  color: "#6d28d9",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const compactSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "8px",
};

const compactSummaryCard = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: "14px",
  padding: "8px 6px",
  textAlign: "center",
  border: "1px solid rgba(124, 58, 237, 0.09)",
  boxShadow: "0 6px 16px rgba(91, 33, 182, 0.05)",
};

const compactSummaryIcon = {
  width: "26px",
  height: "26px",
  margin: "0 auto 5px",
  borderRadius: "10px",
  background: "#f1e8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
};

const compactSummaryValue = {
  display: "block",
  fontSize: "17px",
  fontWeight: "950",
  color: "#17132a",
  lineHeight: "1",
};

const compactSummaryLabel = {
  margin: "5px 0 0",
  fontSize: "11px",
  fontWeight: "800",
  color: "#6b6478",
};

const summaryCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  border: "1px solid rgba(124, 58, 237, 0.12)",
  boxShadow: "0 14px 34px rgba(91, 33, 182, 0.08)",
};

const summaryRow = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const summaryIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  background: "#f1e8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  flexShrink: 0,
};

const summaryTitle = {
  display: "block",
  fontSize: "15px",
  fontWeight: "900",
  color: "#17132a",
};

const summaryText = {
  margin: "4px 0 0",
  fontSize: "13px",
  lineHeight: "1.45",
  color: "#6b6478",
};

const summaryDivider = {
  height: "1px",
  background: "rgba(124, 58, 237, 0.1)",
  margin: "14px 0",
};

const summaryButton = {
  width: "100%",
  marginTop: "16px",
  border: "none",
  borderRadius: "16px",
  padding: "14px",
  background: "#6d4aff",
  color: "white",
  fontWeight: "900",
  fontSize: "14px",
  cursor: "pointer",
};

const ecosystemCard = {
  border: "1px solid rgba(124, 58, 237, 0.14)",
  background: "linear-gradient(180deg, #ffffff 0%, #faf7ff 100%)",
  borderRadius: "22px",
  padding: "16px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(91, 33, 182, 0.09)",
};

const ecosystemCardTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "12px",
};

const ecosystemIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  background: "#f1e8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const ecosystemBadge = {
  fontSize: "11px",
  fontWeight: "800",
  color: "#6d28d9",
  background: "#efe7ff",
  padding: "6px 9px",
  borderRadius: "999px",
};

const ecosystemTitle = {
  display: "block",
  fontSize: "15px",
  fontWeight: "900",
  color: "#17132a",
  marginBottom: "6px",
};

const ecosystemText = {
  margin: 0,
  fontSize: "12.5px",
  lineHeight: "1.45",
  color: "#6b6478",
};

const toolGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
  gap: "14px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const toolCard = {
  border: "none",
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
  cursor: "pointer",
};

const toolIcon = {
  fontSize: "22px",
  marginBottom: "8px",
};

const toolTitle = {
  margin: "0 0 4px",
  color: "#111",
};

const toolText = {
  margin: 0,
  color: "#666",
};

export default Home;
