import { lazy, Suspense, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  getAccountModeForPage,
  getDashboardPageForAccountMode,
  getExplicitBusinessProfileOwnership,
  isProfessionalSession,
  restoreAuthenticatedSessionFromStorage,
  syncAccountModeForPage,
} from "./utils/session";
import { readBusinessServiceProfile } from "./utils/businessServiceProfile";
import { recoverStoredRequestRelationships } from "./utils/requestRelationshipRecovery";
import { getLanguage, t } from "./utils/language";
import useLanguage from "./hooks/useLanguage";
import {
  getMeetroMomentRouteId,
  getMeetroMomentRoutePage,
} from "./utils/meetroMomentRoutes";
import {
  STARTUP_READINESS,
  applyAppUpdateNow,
  coordinateAppStartup,
  detectAvailableAppUpdate,
  dismissAppUpdateNotice,
  getCurrentAppBuildId,
} from "./utils/appStartup";
import MeetroAssistant from "./components/MeetroAssistant";
import GuideOverlay from "./components/GuideOverlay";
import GlobalInsightLayer from "./components/GlobalInsightLayer";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";
import {
  startAppLayoutCoordinator,
} from "./utils/appLayout";

const Home = lazy(() => import("./pages/Home"));
import MyRequests from "./pages/MyRequests";
import Assistant from "./pages/Assistant";
const Discover = lazy(() => import("./pages/Discover"));
const Upload = lazy(() => import("./pages/Upload"));
const Profile = lazy(() => import("./pages/Profile"));
const MeetroMoments = lazy(() => import("./pages/MeetroMoments"));
const MeetroMomentDetails = lazy(() => import("./pages/MeetroMomentDetails"));
import ContractorProfile from "./pages/ContractorProfile";
import Chat from "./pages/Chat";
import Conversation from "./pages/Conversation";
import ProjectDetails from "./pages/ProjectDetails";
import Login from "./pages/Login";
import ContractorDetails from "./pages/ContractorDetails";
import QuoteRequests from "./pages/QuoteRequests";
const ConversationThread = lazy(() => import("./pages/ConversationThread"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const BusinessLeads = lazy(() => import("./pages/BusinessLeads"));
import ProjectGallery from "./pages/ProjectGallery";
const MessagesInbox = lazy(() => import("./pages/MessagesInbox"));
const Notifications = lazy(() => import("./pages/Notifications"));
import Welcome from "./pages/Welcome";
import WelcomeIntro from "./pages/WelcomeIntro";
import Favorites from "./pages/Favorites";
import Emergency from "./pages/Emergency";
import EmergencyBusinessSelection from "./pages/EmergencyBusinessSelection";
import EmergencyBusinessSettings from "./pages/EmergencyBusinessSettings";
import EmergencyRequest from "./pages/EmergencyRequest";
import EmergencyStatus from "./pages/EmergencyStatus";
import EmergencyDispatch from "./pages/EmergencyDispatch";
import EmergencyCompletionActions from "./pages/EmergencyCompletionActions";
import InvoiceBuilder from "./pages/InvoiceBuilder";
import EmergencyOperationsCenter from "./pages/EmergencyOperationsCenter";
import CompletionSheet from "./pages/CompletionSheet";
import EmergencyChat from "./pages/EmergencyChat";
import EmergencyComplete from "./pages/EmergencyComplete";
import ContractorDashboard from "./pages/ContractorDashboard";
import CompletedJobDetails from "./pages/CompletedJobDetails";
import ContractorJobAccepted from "./pages/ContractorJobAccepted";
import QuoteBuilder from "./pages/QuoteBuilder";
import ChangeOrderRequest from "./pages/ChangeOrderRequest";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import BusinessCommandCenter from "./pages/BusinessCommandCenter";
const ProfessionalOnboarding = lazy(() => import("./pages/ProfessionalOnboarding"));
import BusinessAvailability from "./pages/BusinessAvailability";
import CustomerRelationshipsCenter from "./pages/CustomerRelationshipsCenter";
import HiringCenter from "./pages/HiringCenter";
import TeamMembers from "./pages/TeamMembers";
import AssetCenter from "./pages/AssetCenter";
import ServiceTypesEvaluations from "./pages/ServiceTypesEvaluations";
import MaterialsLibrary from "./pages/MaterialsLibrary";
import PricingLibrary from "./pages/PricingLibrary";
import ContractTemplates from "./pages/ContractTemplates";
import ReportsCenter from "./pages/ReportsCenter";
import PermitCenter from "./pages/PermitCenter";
import ComplianceCenter from "./pages/ComplianceCenter";
import BusinessIntelligencePage from "./pages/BusinessIntelligence";
import JobsHiring from "./pages/JobsHiring";
import JobUpdate from "./pages/JobUpdate";
import Legal from "./pages/Legal";
import MeetroJourney from "./pages/MeetroJourney";
import MeetroStory from "./pages/MeetroStory";
import PasswordResetWorkspace from "./components/PasswordResetWorkspace";

const PageLoader = () => {
  const language = useLanguage();
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }} role="status">
      {t("appLoadingMeetro", language)}
    </div>
  );
};

const SessionRestoringScreen = () => {
  const language = useLanguage();
  return <LoadingScreen text={t("appRestoringSession", language)} />;
};

function AppUpdateNotice({ onUpdateNow, onLater, status = "idle", error = "" }) {
  const language = useLanguage();
  const updating = status === "updating";
  return (
    <div style={updateNoticeWrap} role="status" aria-live="polite">
      <div style={updateNoticeCard}>
        <div>
          <h2 style={updateNoticeTitle}>{t("appUpdateAvailable", language)}</h2>
          <p style={updateNoticeCopy}>{t("appUpdateAvailableBody", language)}</p>
          {error && <p style={updateNoticeError}>{error}</p>}
        </div>
        <div style={updateNoticeActions}>
          <button
            type="button"
            className="meetro-visual-primary-button"
            style={updateNoticePrimary}
            onClick={onUpdateNow}
            disabled={updating}
            aria-busy={updating}
          >
            {updating
              ? t("appUpdating", language)
              : t("appUpdateNow", language)}
          </button>
          <button
            type="button"
            style={updateNoticeSecondary}
            onClick={onLater}
            disabled={updating}
          >
            {t("appUpdateLater", language)}
          </button>
        </div>
      </div>
    </div>
  );
}

function withSuspense(component) {
  return (
    <Suspense fallback={<PageLoader />}>
      {component}
    </Suspense>
  );
}

function safeGetStorageItem(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable in restricted WebView contexts.
  }
}

function safeReadJsonStorage(key, fallback) {
  try {
    return JSON.parse(safeGetStorageItem(key, "null")) || fallback;
  } catch {
    return fallback;
  }
}

function withRouteBoundary(component, currentPage, setPage) {
  return (
    <RouteErrorBoundary resetKey={currentPage} currentPage={currentPage} setPage={setPage}>
      {component}
    </RouteErrorBoundary>
  );
}

function withStartupChrome(component, updateNotice) {
  return (
    <>
      {component}
      {updateNotice}
    </>
  );
}

const assistantEnabledPages = new Set([
  "home",
  "discover",
  "jobsHiring",
  "upload",
  "myRequests",
  "projectDetails",
  "conversationThread",
  "messagesInbox",
  "notifications",
  "meetroMoments",
  "meetroMomentDetails",
  "businessDashboard",
  "contractorDashboard",
  "contractorProfile",
  "workCenter",
  "schedule",
  "businessLeads",
  "quoteRequests",
  "quoteBuilder",
  "projectGallery",
  "completedJobDetails",
  "emergency",
  "emergencyStatus",
  "emergencyOperationsCenter",
  "completionSheet",
  "profile",
]);

const publicLegalDocumentRoutes = {
  legal: "terms",
  terms: "terms",
  privacy: "privacy",
  guidelines: "guidelines",
  emergencyDisclaimer: "emergency",
  aiDisclaimer: "ai",
};

const publicUnauthenticatedRoutes = new Set(["meetroStory", "resetPassword"]);
const SESSION_HYDRATION = Object.freeze({
  restoring: "restoring",
  authenticated: "authenticated",
  unauthenticated: "unauthenticated",
  invalid: "invalid",
  public: "public",
});

function withAssistantLayer(component, currentPage, setPage) {
  return withRouteBoundary(
    <>
      {component}
      {assistantEnabledPages.has(currentPage) && (
        <MeetroAssistant currentPage={currentPage} setPage={setPage} />
      )}
      <GlobalInsightLayer currentPage={currentPage} setPage={setPage} />
      <GuideOverlay currentPage={currentPage} setPage={setPage} />
    </>,
    currentPage,
    setPage
  );
}

function withGuideLayer(component, currentPage, setPage) {
  return withRouteBoundary(
    <>
      {component}
      <GlobalInsightLayer currentPage={currentPage} setPage={setPage} />
      <GuideOverlay currentPage={currentPage} setPage={setPage} />
    </>,
    currentPage,
    setPage
  );
}

function App() {
  const language = useLanguage();

  useEffect(() => {
    const root = document.getElementById("root");
    return startAppLayoutCoordinator({ root, capacitor: Capacitor });
  }, []);

  useEffect(() => {
    recoverStoredRequestRelationships();
  }, []);

 const professionalOnlyPages = [
  "assetCenter",
  "businessAnalytics",
  "businessAvailability",
  "businessCommandCenter",
  "businessDashboard",
  "businessIntelligence",
  "businessLeads",
  "changeOrderRequest",
  "completionSheet",
  "complianceCenter",
  "contractTemplates",
  "contractorDashboard",
  "contractorJobAccepted",
  "customerRelationshipsCenter",
  "emergencyCompletionActions",
  "emergencyDispatch",
  "emergencyOperationsCenter",
  "invoiceBuilder",
  "hiringCenter",
  "teamMembers",
  "jobUpdate",
  "materialsLibrary",
  "permitCenter",
  "pricingLibrary",
  "professionalOnboarding",
  "projectGallery",
  "quoteBuilder",
  "quoteRequests",
  "reportsCenter",
  "serviceTypesEvaluations",
  "workCenter",
];

  const isProfessionalOnlyPage = (targetPage = "") =>
    professionalOnlyPages.includes(targetPage);

  const isPublicLegalPage = (targetPage = "") =>
    Boolean(publicLegalDocumentRoutes[targetPage]);

  const isPublicUnauthenticatedPage = (targetPage = "") =>
    publicUnauthenticatedRoutes.has(targetPage);

  const persistRouteContext = (route = "") => {
    const momentId = getMeetroMomentRouteId(route);
    if (momentId) {
      safeSetStorageItem("selectedMeetroMomentId", momentId);
    }
  };

  const getRoutePage = (route = "") => {
    const momentPage = getMeetroMomentRoutePage(route);
    if (momentPage) return momentPage;
    const cleanRoute = String(route || "").split("?")[0];
    return cleanRoute;
  };

  const getTipsPageForRoute = (targetPage = "") =>
    ["tips", "learn-meetro", "meetroJourney"].includes(targetPage)
      ? "meetroJourney"
      : targetPage;

  const getHashRoute = () => {
    const hashRoute = window.location.hash.replace("#", "") || "";
    if (hashRoute) return hashRoute;

    const pathRoute = window.location.pathname || "";
    if (pathRoute === "/reset-password") return "resetPassword";
    return getMeetroMomentRouteId(pathRoute) ? pathRoute : "";
  };

  const isPublicProfileRoute = (route = "") => {
    const pageName = getRoutePage(route);
    const query = String(route || "").includes("?")
      ? String(route).slice(String(route).indexOf("?") + 1)
      : "";

    return (
      pageName === "contractorDetails" &&
      Boolean(new URLSearchParams(query).get("profileId"))
    );
  };

  const getLegalPageForRoute = (targetPage = "") => {
    const selectedDocument = publicLegalDocumentRoutes[targetPage];

    if (selectedDocument) {
      safeSetStorageItem("meetroSelectedLegalDocument", selectedDocument);
      return "legal";
    }

    return targetPage;
  };

  const getGuardedPage = (targetPage = "") => {
    if (isPublicLegalPage(targetPage)) {
      return getLegalPageForRoute(targetPage);
    }

    if (isPublicUnauthenticatedPage(targetPage)) {
      return targetPage;
    }

    const hasToken = safeGetStorageItem("token");
    const restoredSession = restoreAuthenticatedSessionFromStorage(targetPage);
    const resolvedMode = restoredSession.finalMode || "personal";
    const targetMode = getAccountModeForPage(targetPage, resolvedMode);

    if (isProfessionalOnlyPage(targetPage) && !hasToken) {
      return "login";
    }

    if (
      isProfessionalOnlyPage(targetPage) &&
      !restoredSession.isProfessional &&
      !isProfessionalSession()
    ) {
      return "home";
    }

    if (targetMode !== resolvedMode) {
      return getDashboardPageForAccountMode(resolvedMode);
    }

    return shouldRouteToProfessionalOnboarding(targetPage)
      ? "professionalOnboarding"
      : targetPage;
  };

  const hasRequiredProfessionalSetupData = () => {
    const authenticatedUser = safeReadJsonStorage("user", {});
    const explicitOwnership =
      getExplicitBusinessProfileOwnership(authenticatedUser);
    if (explicitOwnership !== undefined) return explicitOwnership;

    let contractorProfile;
    try {
      contractorProfile = safeReadJsonStorage("contractorProfile", {});
    } catch {
      contractorProfile = {};
    }

    const serviceProfile = readBusinessServiceProfile(undefined, contractorProfile);
    const parsedAvailability = safeReadJsonStorage("businessAvailability", []);
    const availability = Array.isArray(parsedAvailability) ? parsedAvailability : [];
    const businessName =
      safeGetStorageItem("businessName") ||
      contractorProfile.businessName ||
      contractorProfile.name ||
      "";
    const serviceArea =
      safeGetStorageItem("businessPrimaryCity") ||
      safeGetStorageItem("businessZipCodes") ||
      safeGetStorageItem("businessServiceArea") ||
      contractorProfile.serviceArea ||
      contractorProfile.location ||
      "";

    return Boolean(
      String(businessName).trim() &&
        String(serviceArea).trim() &&
        serviceProfile.serviceSpecialties.length > 0 &&
        availability.length > 0
    );
  };

	  const shouldRouteToProfessionalOnboarding = (targetPage) => {
	    if (targetPage !== "businessDashboard") return false;
	    if (!isProfessionalSession()) return false;
	    if (hasRequiredProfessionalSetupData()) {
	      safeSetStorageItem("meetroProfessionalOnboardingCompleted", "true");
	      return false;
	    }
	    return true;
	  };
	
	  const getInitialPage = () => {
    const currentRoute = getHashRoute();
    persistRouteContext(currentRoute);
    const currentHash = getRoutePage(currentRoute);

    const hasToken =
      safeGetStorageItem("token");

    if (currentHash && isPublicLegalPage(currentHash)) {
      return getLegalPageForRoute(currentHash);
    }

    if (currentHash && isPublicUnauthenticatedPage(currentHash)) {
      return currentHash;
    }

    if (currentRoute && isPublicProfileRoute(currentRoute)) {
      return "contractorDetails";
    }

    const routedHash = getTipsPageForRoute(currentHash);

    if (!hasToken) {
      return "login";
    }

    const restoredSession =
      restoreAuthenticatedSessionFromStorage(routedHash);

    const onboardingComplete =
      safeGetStorageItem("onboardingComplete");

    if (!onboardingComplete) {
      return "welcomeIntro";
    }

	    if (
	      routedHash &&
	      isProfessionalOnlyPage(routedHash)
	    ) {
	      return getGuardedPage(routedHash);
    }

    if (routedHash && routedHash !== "tour") {
      return getGuardedPage(routedHash);
    }

	    if (restoredSession.finalMode === "business") {
	      return shouldRouteToProfessionalOnboarding("businessDashboard")
	        ? "professionalOnboarding"
	        : "businessDashboard";
	    }
	
	    return "home";
	  };

  const getInitialSessionHydration = () => {
    const currentRoute = getHashRoute();
    const currentHash = getRoutePage(currentRoute);

    if (
      (currentHash && (isPublicLegalPage(currentHash) || isPublicUnauthenticatedPage(currentHash))) ||
      (currentRoute && isPublicProfileRoute(currentRoute))
    ) {
      return { status: SESSION_HYDRATION.public };
    }

    return safeGetStorageItem("token")
      ? { status: SESSION_HYDRATION.restoring }
      : { status: SESSION_HYDRATION.unauthenticated };
  };

  const initialSessionHydration = getInitialSessionHydration();
  const [sessionHydration, setSessionHydration] = useState(initialSessionHydration);
  const [startupReadiness, setStartupReadiness] = useState(() =>
    initialSessionHydration.status === SESSION_HYDRATION.restoring
      ? { status: STARTUP_READINESS.restoring, steps: [] }
      : { status: STARTUP_READINESS.ready, steps: [] }
  );
  const [updateNoticeState, setUpdateNoticeState] = useState({
    available: false,
    currentBuildId: getCurrentAppBuildId(),
  });
  const [updateActionState, setUpdateActionState] = useState({
    status: "idle",
    error: "",
  });
  const [page, setPageState] = useState(() =>
    initialSessionHydration.status === SESSION_HYDRATION.restoring
      ? "sessionRestoring"
      : getInitialPage()
  );
  const isStartupReady =
    startupReadiness.status === STARTUP_READINESS.ready &&
    sessionHydration.status !== SESSION_HYDRATION.restoring;

  useEffect(() => {
    if (sessionHydration.status !== SESSION_HYDRATION.restoring) return undefined;

    const timer = window.setTimeout(() => {
      const currentRoute = getHashRoute();
      persistRouteContext(currentRoute);
      const currentHash = getRoutePage(currentRoute);
      const routedHash = getTipsPageForRoute(currentHash);
      const hasToken = safeGetStorageItem("token");

      if (!hasToken) {
        setSessionHydration({ status: SESSION_HYDRATION.unauthenticated });
        setStartupReadiness({ status: STARTUP_READINESS.ready, steps: [] });
        setPageState("login");
        return;
      }

      const startupResult = coordinateAppStartup({
        targetPage: routedHash,
        hasToken: Boolean(hasToken),
        restoreSession: restoreAuthenticatedSessionFromStorage,
        syncAccountMode: syncAccountModeForPage,
        needsBusinessProfile: isProfessionalOnlyPage(routedHash),
        readBusinessProfile: () => readBusinessServiceProfile(),
        readLanguage: getLanguage,
        companionEnabled: assistantEnabledPages.has(routedHash),
        dev: import.meta.env.DEV,
      });

      if (startupResult.status === STARTUP_READINESS.invalid) {
        setSessionHydration({ status: SESSION_HYDRATION.invalid });
        setStartupReadiness(startupResult);
        setPageState("login");
        return;
      }

      setSessionHydration({ status: SESSION_HYDRATION.authenticated });
      setStartupReadiness(startupResult);
      setPageState(getInitialPage());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [sessionHydration.status]);

  useEffect(() => {
    if (sessionHydration.status === SESSION_HYDRATION.restoring) return;
    syncAccountModeForPage(page);
  }, [page, sessionHydration.status]);

  useEffect(() => {
    if (!isStartupReady) return;
    setUpdateNoticeState(detectAvailableAppUpdate());
  }, [isStartupReady]);

  useEffect(() => {
    const handleAccountModeChange = () => {
      const activeMode =
        safeGetStorageItem("activeAccountMode", "personal");

      if (
        activeMode === "personal" &&
        isProfessionalOnlyPage(page)
      ) {
        window.location.hash = "home";
        setPageState("home");
      }
    };

    window.addEventListener("accountModeChanged", handleAccountModeChange);

    return () => {
      window.removeEventListener("accountModeChanged", handleAccountModeChange);
    };
  }, [page]);

  useEffect(() => {
    const scrollPageToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      document
        .querySelectorAll(".app-page, .meetro-responsive-page, .meetro-readable-page")
        .forEach((element) => {
          element.scrollTop = 0;
        });
    };

    requestAnimationFrame(scrollPageToTop);
    const timer = window.setTimeout(scrollPageToTop, 0);

    return () => window.clearTimeout(timer);
  }, [page]);

  useEffect(() => {
    const handleAuthExpired = () => {
      window.location.hash = "login";

      setPageState("login");
    };

    window.addEventListener(
      "meetroAuthExpired",
      handleAuthExpired
    );

    return () => {
      window.removeEventListener(
        "meetroAuthExpired",
        handleAuthExpired
      );
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      if (sessionHydration.status === SESSION_HYDRATION.restoring) return;
      const hashRoute = getHashRoute();
      persistRouteContext(hashRoute);
      const hashPage = getRoutePage(hashRoute);

      const hasToken =
        safeGetStorageItem("token");

      if (hashPage && isPublicLegalPage(hashPage)) {
        const legalPage = getLegalPageForRoute(hashPage);
        setPageState(legalPage);
        return;
      }

      if (hashPage && isPublicUnauthenticatedPage(hashPage)) {
        setPageState(hashPage);
        return;
      }

      if (hashRoute && isPublicProfileRoute(hashRoute)) {
        setPageState("contractorDetails");
        return;
      }

      if (!hasToken) {
        setPageState("login");
        return;
      }

      restoreAuthenticatedSessionFromStorage(hashPage);

	      if (hashPage) {
	        const guardedPage = getGuardedPage(hashPage);
	        if (hashRoute === hashPage) {
	          window.location.hash = guardedPage;
	        }
	        setPageState(guardedPage);
	      }
    };

    const handleAuthExpired = () => {
      setPageState("login");
    };

    const handleVisibilityResume = () => {
      if (sessionHydration.status === SESSION_HYDRATION.restoring) return;
      const hasToken =
        safeGetStorageItem("token");
      const currentRoute = getHashRoute();
      persistRouteContext(currentRoute);
      const currentHash = getRoutePage(currentRoute);

      if (currentHash && isPublicLegalPage(currentHash)) {
        const legalPage = getLegalPageForRoute(currentHash);
        setPageState(legalPage);
        return;
      }

      if (currentHash && isPublicUnauthenticatedPage(currentHash)) {
        setPageState(currentHash);
        return;
      }

      if (currentRoute && isPublicProfileRoute(currentRoute)) {
        setPageState("contractorDetails");
        return;
      }

      if (!hasToken) {
        setPageState("login");
        return;
      }

      restoreAuthenticatedSessionFromStorage(currentHash);

	      if (currentHash) {
	        const guardedPage = getGuardedPage(currentHash);
	        if (currentRoute === currentHash) {
	          window.location.hash = guardedPage;
	        }
	        setPageState(guardedPage);
	      }
    };

    const handleNativePageChange = (event) => {
      if (sessionHydration.status === SESSION_HYDRATION.restoring) return;
      const nextPage = event?.detail?.page;

      if (nextPage) {
        const guardedPage = getGuardedPage(nextPage);
        window.location.hash = guardedPage;
        setPageState(guardedPage);
      }
    };

    window.addEventListener(
      "hashchange",
      handleHashChange
    );

    window.addEventListener(
      "meetroNativePageChange",
      handleNativePageChange
    );

    window.addEventListener(
      "meetroAuthExpired",
      handleAuthExpired
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityResume
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        handleHashChange
      );

      window.removeEventListener(
        "meetroNativePageChange",
        handleNativePageChange
      );

      window.removeEventListener(
        "meetroAuthExpired",
        handleAuthExpired
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityResume
      );
    };
  }, [sessionHydration.status]);


  

  const handleUpdateNow = async () => {
    if (updateActionState.status === "updating") return;

    setUpdateActionState({ status: "updating", error: "" });
    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await applyAppUpdateNow({
        currentBuildId: updateNoticeState.currentBuildId,
        capacitor: Capacitor,
      });
    } catch {
      setUpdateActionState({
        status: "idle",
        error: t("appUpdateFailed", language),
      });
    }
  };

  const handleUpdateLater = () => {
    dismissAppUpdateNotice({
      currentBuildId: updateNoticeState.currentBuildId,
    });
    setUpdateNoticeState((current) => ({ ...current, available: false }));
    setUpdateActionState({ status: "idle", error: "" });
  };

  const updateNotice = updateNoticeState.available ? (
    <AppUpdateNotice
      onUpdateNow={handleUpdateNow}
      onLater={handleUpdateLater}
      status={updateActionState.status}
      error={updateActionState.error}
    />
  ) : null;

	  const setPage = (newPage) => {
    if (
      sessionHydration.status === SESSION_HYDRATION.restoring ||
      startupReadiness.status === STARTUP_READINESS.restoring
    ) {
      return;
    }

    const routePage = getRoutePage(newPage);
    const routeMomentId = getMeetroMomentRouteId(newPage);

    if (routeMomentId) {
      persistRouteContext(newPage);

      if (!safeGetStorageItem("token")) {
        window.location.hash = "login";
        setPageState("login");
        return;
      }

      window.location.hash = newPage;
      syncAccountModeForPage(routePage);
      setPageState(routePage);
      return;
    }

    if (isPublicLegalPage(newPage)) {
      const legalPage = getLegalPageForRoute(newPage);
      window.location.hash = newPage === "legal" ? "legal" : newPage;
      setPageState(legalPage);
      return;
    }

    if (isPublicUnauthenticatedPage(newPage)) {
      window.location.hash = newPage;
      setPageState(newPage);
      return;
    }

    const hasToken = safeGetStorageItem("token");

    if (
      isProfessionalOnlyPage(newPage) &&
      !hasToken
    ) {
      window.location.hash = "login";
      setPageState("login");
      return;
    }

    const latestIsProfessional =
      isProfessionalSession();

    if (
      isProfessionalOnlyPage(newPage) &&
      !latestIsProfessional
    ) {
      window.dispatchEvent(
        new CustomEvent("meetroPremiumNotice", {
          detail: {
            title: "Professional access required",
            message:
              "Only professional accounts can access this section.",
            type: "locked",
          },
        })
      );

      return;
    }

	    const finalPage = shouldRouteToProfessionalOnboarding(newPage)
	      ? "professionalOnboarding"
	      : newPage;
	
	    syncAccountModeForPage(finalPage);
	    window.location.hash = finalPage;
	    setPageState(finalPage);
	  };

if (sessionHydration.status === SESSION_HYDRATION.restoring || page === "sessionRestoring") {
  return withRouteBoundary(<SessionRestoringScreen />, "sessionRestoring", setPage);
}

if (page === "login") {
  return withStartupChrome(withRouteBoundary(<Login setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "resetPassword") {
  return withStartupChrome(withRouteBoundary(
    <PasswordResetWorkspace
      allowCompletion
      standalone
      onBackToSignIn={() => setPage("login")}
    />,
    page,
    setPage
  ), updateNotice);
}

if (page === "legal") {
  return withStartupChrome(<Legal setPage={setPage} />, updateNotice);
}

if (page === "welcome") {
  return withStartupChrome(<Welcome setPage={setPage} />, updateNotice);
}

if (page === "welcomeIntro") {
  return withStartupChrome(<WelcomeIntro setPage={setPage} />, updateNotice);
}

if (page === "home") {
  return withStartupChrome(withAssistantLayer(withSuspense(<Home setPage={setPage} />), page, setPage), updateNotice);
}

if (page === "myRequests") {
  return withStartupChrome(withAssistantLayer(<MyRequests setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "assistant") {
  return withStartupChrome(withGuideLayer(<Assistant setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "discover") {
  return withStartupChrome(withAssistantLayer(withSuspense(<Discover setPage={setPage} />), page, setPage), updateNotice);
}

if (page === "upload") {
  return withStartupChrome(withAssistantLayer(withSuspense(<Upload setPage={setPage} />), page, setPage), updateNotice);
}


if (page === "profile") {
  return withStartupChrome(withAssistantLayer(withSuspense(<Profile setPage={setPage} />), page, setPage), updateNotice);
}

if (page === "meetroMoments") {
  return withStartupChrome(withAssistantLayer(withSuspense(<MeetroMoments setPage={setPage} />), page, setPage), updateNotice);
}

if (page === "meetroMomentDetails") {
  return withStartupChrome(withAssistantLayer(withSuspense(<MeetroMomentDetails setPage={setPage} />), page, setPage), updateNotice);
}

if (page === "meetroJourney" || page === "tips" || page === "learn-meetro") {
  return withStartupChrome(<MeetroJourney setPage={setPage} />, updateNotice);
}

if (page === "meetroStory") {
  return withStartupChrome(<MeetroStory setPage={setPage} />, updateNotice);
}

if (page === "contractorProfile") {
  return withStartupChrome(withRouteBoundary(<ContractorProfile setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "chat") {
  return withStartupChrome(<Chat setPage={setPage} />, updateNotice);
}

if (page === "conversation") {
  return withStartupChrome(withRouteBoundary(<Conversation setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "projectDetails") {
  return withStartupChrome(withAssistantLayer(<ProjectDetails setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "contractors") {
  safeSetStorageItem("activeDiscoverMode", "businessDirectory");
  return withStartupChrome(withSuspense(<Discover setPage={setPage} />), updateNotice);
}

if (page === "contractorDetails") {
  return withStartupChrome(<ContractorDetails setPage={setPage} />, updateNotice);
}

if (page === "quoteRequests") {
  return withStartupChrome(withAssistantLayer(<QuoteRequests setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "conversationThread") {
  return withStartupChrome(withAssistantLayer(
    withSuspense(<ConversationThread setPage={setPage} />),
    page,
    setPage
  ), updateNotice);
}

 
if (page === "businessDashboard") {
  return withStartupChrome(withAssistantLayer(
    withSuspense(<BusinessDashboard setPage={setPage} />),
    page,
    setPage
  ), updateNotice);
}

if (page === "professionalOnboarding") {
  return withStartupChrome(withRouteBoundary(
    withSuspense(<ProfessionalOnboarding setPage={setPage} />),
    page,
    setPage
  ), updateNotice);
}

if (page === "businessAnalytics") {
  return withStartupChrome(<BusinessAnalytics setPage={setPage} currentPage={page} />, updateNotice);
}

if (page === "businessLeads") {
  return withStartupChrome(withAssistantLayer(
    withSuspense(<BusinessLeads setPage={setPage} />),
    page,
    setPage
  ), updateNotice);
}

if (page === "quoteBuilder") {
  return withStartupChrome(withAssistantLayer(<QuoteBuilder setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "changeOrderRequest") {
  return withStartupChrome(<ChangeOrderRequest setPage={setPage} />, updateNotice);
}

if (page === "businessCommandCenter") {
  return withStartupChrome(withGuideLayer(<BusinessCommandCenter setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "businessAvailability") {
  return withStartupChrome(<BusinessAvailability setPage={setPage} />, updateNotice);
}

if (page === "customerRelationshipsCenter") {
  return withStartupChrome(<CustomerRelationshipsCenter setPage={setPage} />, updateNotice);
}

if (page === "hiringCenter") {
  return withStartupChrome(<HiringCenter setPage={setPage} />, updateNotice);
}

if (page === "teamMembers") {
  return withStartupChrome(<TeamMembers setPage={setPage} />, updateNotice);
}

if (page === "assetCenter") {
  return withStartupChrome(<AssetCenter setPage={setPage} />, updateNotice);
}

if (page === "serviceTypesEvaluations") {
  return withStartupChrome(<ServiceTypesEvaluations setPage={setPage} />, updateNotice);
}

if (page === "materialsLibrary") {
  return withStartupChrome(<MaterialsLibrary setPage={setPage} />, updateNotice);
}

if (page === "pricingLibrary") {
  return withStartupChrome(<PricingLibrary setPage={setPage} />, updateNotice);
}

if (page === "contractTemplates") {
  return withStartupChrome(<ContractTemplates setPage={setPage} />, updateNotice);
}

if (page === "reportsCenter") {
  return withStartupChrome(<ReportsCenter setPage={setPage} />, updateNotice);
}

if (page === "permitCenter") {
  return withStartupChrome(<PermitCenter setPage={setPage} />, updateNotice);
}

if (page === "complianceCenter") {
  return withStartupChrome(<ComplianceCenter setPage={setPage} />, updateNotice);
}

if (page === "businessIntelligence") {
  return withStartupChrome(<BusinessIntelligencePage setPage={setPage} />, updateNotice);
}

if (page === "jobsHiring") {
  return withStartupChrome(withAssistantLayer(<JobsHiring setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "jobUpdate") {
  return withStartupChrome(<JobUpdate setPage={setPage} />, updateNotice);
}

if (page === "projectGallery") {
  return withStartupChrome(withAssistantLayer(<ProjectGallery setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "messagesInbox") {
  return withStartupChrome(withAssistantLayer(
    withSuspense(<MessagesInbox setPage={setPage} />),
    page,
    setPage
  ), updateNotice);
}

if (page === "notifications") {
  return withStartupChrome(withAssistantLayer(
    withSuspense(<Notifications setPage={setPage} />),
    page,
    setPage
  ), updateNotice);
}

if (page === "favorites") {
  return withStartupChrome(<Favorites setPage={setPage} />, updateNotice);
}

if (page === "emergency") {
  return withStartupChrome(withAssistantLayer(<Emergency setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "emergencyBusinessSelection") {
  return withStartupChrome(<EmergencyBusinessSelection setPage={setPage} />, updateNotice);
}

if (page === "emergencyBusinessSettings") {
  return withStartupChrome(<EmergencyBusinessSettings setPage={setPage} />, updateNotice);
}

if (page === "emergencyRequest") {
  return withStartupChrome((
    <EmergencyRequest
      setPage={setPage}
      selectedService={safeGetStorageItem("selectedEmergencyService")}
    />
  ), updateNotice);
}

if (page === "emergencyStatus") {
  return withStartupChrome(withAssistantLayer(<EmergencyStatus setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "emergencyDispatch") {
  return withStartupChrome(<EmergencyDispatch setPage={setPage} />, updateNotice);
}

if (page === "emergencyCompletionActions") {
  return withStartupChrome(<EmergencyCompletionActions setPage={setPage} />, updateNotice);
}

if (page === "invoiceBuilder") {
  return withStartupChrome(withGuideLayer(<InvoiceBuilder setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "emergencyOperationsCenter") {
  return withStartupChrome(withAssistantLayer(
    <EmergencyOperationsCenter setPage={setPage} />,
    page,
    setPage
  ), updateNotice);
}

if (page === "completionSheet") {
  return withStartupChrome(withAssistantLayer(<CompletionSheet setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "emergencyChat") {
  return withStartupChrome(<EmergencyChat setPage={setPage} />, updateNotice);
}

if (page === "emergencyComplete") {
  return withStartupChrome(<EmergencyComplete setPage={setPage} />, updateNotice);
}

if (page === "contractorDashboard" || page === "workCenter") {
  return withStartupChrome(withAssistantLayer(<ContractorDashboard setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "completedJobDetails") {
  return withStartupChrome(withAssistantLayer(<CompletedJobDetails setPage={setPage} />, page, setPage), updateNotice);
}

if (page === "contractorJobAccepted") {
  return withStartupChrome(<ContractorJobAccepted setPage={setPage} />, updateNotice);
}

return withStartupChrome(withSuspense(<Home setPage={setPage} />), updateNotice);
}

const updateNoticeWrap = {
  position: "fixed",
  left: "max(16px, env(safe-area-inset-left))",
  right: "max(16px, env(safe-area-inset-right))",
  bottom: "calc(18px + env(safe-area-inset-bottom))",
  zIndex: 7000,
  pointerEvents: "none",
  display: "flex",
  justifyContent: "center",
};

const updateNoticeCard = {
  width: "min(100%, 560px)",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.16))",
  borderRadius: "22px",
  background: "var(--meetro-surface-paper, #fffdf8)",
  color: "var(--meetro-color-ink, #10231a)",
  boxShadow: "var(--meetro-shadow-lifted, 0 18px 44px rgba(49,35,20,0.16))",
  padding: "16px",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "14px",
  alignItems: "center",
  pointerEvents: "auto",
};

const updateNoticeTitle = {
  margin: 0,
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "17px",
  lineHeight: 1.2,
  fontWeight: "950",
  letterSpacing: 0,
};

const updateNoticeCopy = {
  margin: "5px 0 0",
  color: "var(--meetro-color-muted, #64748b)",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: "750",
};

const updateNoticeError = {
  margin: "7px 0 0",
  color: "var(--meetro-color-error, #9f2d24)",
  fontSize: "12px",
  lineHeight: 1.4,
  fontWeight: "800",
};

const updateNoticeActions = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const updateNoticePrimary = {
  border: "1px solid rgba(255,253,248,0.18)",
  borderRadius: "999px",
  background: "var(--meetro-gradient-community-action, #1f4d34)",
  color: "#fffdf8",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
  whiteSpace: "nowrap",
  minHeight: "44px",
};

const updateNoticeSecondary = {
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.16))",
  borderRadius: "999px",
  background: "var(--meetro-surface-warm, #f7f1e8)",
  color: "var(--meetro-color-coffee, #4a3428)",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
  whiteSpace: "nowrap",
  minHeight: "44px",
};

  export default App;
