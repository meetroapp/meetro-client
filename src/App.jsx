import { lazy, Suspense, useEffect, useState } from "react";
import {
  isProfessionalSession,
  restoreAuthenticatedSessionFromStorage,
  syncAccountModeForPage,
} from "./utils/session";
import { readBusinessServiceProfile } from "./utils/businessServiceProfile";
import { recoverStoredRequestRelationships } from "./utils/requestRelationshipRecovery";
import {
  getMeetroMomentRouteId,
  getMeetroMomentRoutePage,
} from "./utils/meetroMomentRoutes";
import MeetroAssistant from "./components/MeetroAssistant";
import GuideOverlay from "./components/GuideOverlay";
import GlobalInsightLayer from "./components/GlobalInsightLayer";
import RouteErrorBoundary from "./components/RouteErrorBoundary";

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

const PageLoader = () => (
  <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
    Loading Meetro...
  </div>
);

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

const publicMarketingRoutes = new Set(["meetroStory"]);

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

  const isPublicMarketingPage = (targetPage = "") =>
    publicMarketingRoutes.has(targetPage);

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

    if (isPublicMarketingPage(targetPage)) {
      return targetPage;
    }

    const hasToken = safeGetStorageItem("token");
    const restoredSession = restoreAuthenticatedSessionFromStorage(targetPage);

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

    return shouldRouteToProfessionalOnboarding(targetPage)
      ? "professionalOnboarding"
      : targetPage;
  };

  const hasRequiredProfessionalSetupData = () => {
    let contractorProfile = {};
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

    if (currentHash && isPublicMarketingPage(currentHash)) {
      return currentHash;
    }

    if (currentRoute && isPublicProfileRoute(currentRoute)) {
      return "contractorDetails";
    }

    const routedHash = getTipsPageForRoute(currentHash);

    if (!hasToken) {
      return "login";
    }

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
      return routedHash;
    }

	    if (isProfessionalSession()) {
	      return shouldRouteToProfessionalOnboarding("businessDashboard")
	        ? "professionalOnboarding"
	        : "businessDashboard";
	    }
	
	    return "home";
	  };

  const [page, setPageState] = useState(getInitialPage());

  useEffect(() => {
    syncAccountModeForPage(page);
  }, [page]);

  useEffect(() => {
    const handleAccountModeChange = () => {
      const activeMode =
        safeGetStorageItem("activeAccountMode", "personal");

      if (
        activeMode === "personal" &&
        isProfessionalOnlyPage(page)
      ) {
        const restoredSession = restoreAuthenticatedSessionFromStorage(page);
        if (restoredSession.isProfessional) {
          syncAccountModeForPage(page);
          return;
        }

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

      if (hashPage && isPublicMarketingPage(hashPage)) {
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

      if (currentHash && isPublicMarketingPage(currentHash)) {
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
  }, []);


  

  const setPage = (newPage) => {
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

    if (isPublicMarketingPage(newPage)) {
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

if (page === "login") {
  return withRouteBoundary(<Login setPage={setPage} />, page, setPage);
}

if (page === "legal") {
  return <Legal setPage={setPage} />;
}

if (page === "welcome") {
  return <Welcome setPage={setPage} />;
}

if (page === "welcomeIntro") {
  return <WelcomeIntro setPage={setPage} />;
}

if (page === "home") {
  return withAssistantLayer(withSuspense(<Home setPage={setPage} />), page, setPage);
}

if (page === "myRequests") {
  return withAssistantLayer(<MyRequests setPage={setPage} />, page, setPage);
}

if (page === "assistant") {
  return withGuideLayer(<Assistant setPage={setPage} />, page, setPage);
}

if (page === "discover") {
  return withAssistantLayer(withSuspense(<Discover setPage={setPage} />), page, setPage);
}

if (page === "upload") {
  return withAssistantLayer(withSuspense(<Upload setPage={setPage} />), page, setPage);
}


if (page === "profile") {
  return withAssistantLayer(withSuspense(<Profile setPage={setPage} />), page, setPage);
}

if (page === "meetroMoments") {
  return withAssistantLayer(withSuspense(<MeetroMoments setPage={setPage} />), page, setPage);
}

if (page === "meetroMomentDetails") {
  return withAssistantLayer(withSuspense(<MeetroMomentDetails setPage={setPage} />), page, setPage);
}

if (page === "meetroJourney" || page === "tips" || page === "learn-meetro") {
  return <MeetroJourney setPage={setPage} />;
}

if (page === "meetroStory") {
  return <MeetroStory setPage={setPage} />;
}

if (page === "contractorProfile") {
  return withRouteBoundary(<ContractorProfile setPage={setPage} />, page, setPage);
}

if (page === "chat") {
  return <Chat setPage={setPage} />;
}

if (page === "conversation") {
  return withRouteBoundary(<Conversation setPage={setPage} />, page, setPage);
}

if (page === "projectDetails") {
  return withAssistantLayer(<ProjectDetails setPage={setPage} />, page, setPage);
}

if (page === "contractors") {
  safeSetStorageItem("activeDiscoverMode", "businessDirectory");
  return withSuspense(<Discover setPage={setPage} />);
}

if (page === "contractorDetails") {
  return <ContractorDetails setPage={setPage} />;
}

if (page === "quoteRequests") {
  return withAssistantLayer(<QuoteRequests setPage={setPage} />, page, setPage);
}

if (page === "conversationThread") {
  return withAssistantLayer(
    withSuspense(<ConversationThread setPage={setPage} />),
    page,
    setPage
  );
}

 
if (page === "businessDashboard") {
  return withAssistantLayer(
    withSuspense(<BusinessDashboard setPage={setPage} />),
    page,
    setPage
  );
}

if (page === "professionalOnboarding") {
  return withRouteBoundary(
    withSuspense(<ProfessionalOnboarding setPage={setPage} />),
    page,
    setPage
  );
}

if (page === "businessAnalytics") {
  return <BusinessAnalytics setPage={setPage} currentPage={page} />;
}

if (page === "businessLeads") {
  return withAssistantLayer(
    withSuspense(<BusinessLeads setPage={setPage} />),
    page,
    setPage
  );
}

if (page === "quoteBuilder") {
  return withAssistantLayer(<QuoteBuilder setPage={setPage} />, page, setPage);
}

if (page === "changeOrderRequest") {
  return <ChangeOrderRequest setPage={setPage} />;
}

if (page === "businessCommandCenter") {
  return withGuideLayer(<BusinessCommandCenter setPage={setPage} />, page, setPage);
}

if (page === "businessAvailability") {
  return <BusinessAvailability setPage={setPage} />;
}

if (page === "customerRelationshipsCenter") {
  return <CustomerRelationshipsCenter setPage={setPage} />;
}

if (page === "hiringCenter") {
  return <HiringCenter setPage={setPage} />;
}

if (page === "assetCenter") {
  return <AssetCenter setPage={setPage} />;
}

if (page === "serviceTypesEvaluations") {
  return <ServiceTypesEvaluations setPage={setPage} />;
}

if (page === "materialsLibrary") {
  return <MaterialsLibrary setPage={setPage} />;
}

if (page === "pricingLibrary") {
  return <PricingLibrary setPage={setPage} />;
}

if (page === "contractTemplates") {
  return <ContractTemplates setPage={setPage} />;
}

if (page === "reportsCenter") {
  return <ReportsCenter setPage={setPage} />;
}

if (page === "permitCenter") {
  return <PermitCenter setPage={setPage} />;
}

if (page === "complianceCenter") {
  return <ComplianceCenter setPage={setPage} />;
}

if (page === "businessIntelligence") {
  return <BusinessIntelligencePage setPage={setPage} />;
}

if (page === "jobsHiring") {
  return withAssistantLayer(<JobsHiring setPage={setPage} />, page, setPage);
}

if (page === "jobUpdate") {
  return <JobUpdate setPage={setPage} />;
}

if (page === "projectGallery") {
  return withAssistantLayer(<ProjectGallery setPage={setPage} />, page, setPage);
}

if (page === "messagesInbox") {
  return withAssistantLayer(
    withSuspense(<MessagesInbox setPage={setPage} />),
    page,
    setPage
  );
}

if (page === "notifications") {
  return withAssistantLayer(
    withSuspense(<Notifications setPage={setPage} />),
    page,
    setPage
  );
}

if (page === "favorites") {
  return <Favorites setPage={setPage} />;
}

if (page === "emergency") {
  return withAssistantLayer(<Emergency setPage={setPage} />, page, setPage);
}

if (page === "emergencyBusinessSelection") {
  return <EmergencyBusinessSelection setPage={setPage} />;
}

if (page === "emergencyBusinessSettings") {
  return <EmergencyBusinessSettings setPage={setPage} />;
}

if (page === "emergencyRequest") {
  return (
    <EmergencyRequest
      setPage={setPage}
      selectedService={safeGetStorageItem("selectedEmergencyService")}
    />
  );
}

if (page === "emergencyStatus") {
  return withAssistantLayer(<EmergencyStatus setPage={setPage} />, page, setPage);
}

if (page === "emergencyDispatch") {
  return <EmergencyDispatch setPage={setPage} />;
}

if (page === "emergencyCompletionActions") {
  return <EmergencyCompletionActions setPage={setPage} />;
}

if (page === "invoiceBuilder") {
  return withGuideLayer(<InvoiceBuilder setPage={setPage} />, page, setPage);
}

if (page === "emergencyOperationsCenter") {
  return withAssistantLayer(
    <EmergencyOperationsCenter setPage={setPage} />,
    page,
    setPage
  );
}

if (page === "completionSheet") {
  return withAssistantLayer(<CompletionSheet setPage={setPage} />, page, setPage);
}

if (page === "emergencyChat") {
  return <EmergencyChat setPage={setPage} />;
}

if (page === "emergencyComplete") {
  return <EmergencyComplete setPage={setPage} />;
}

if (page === "contractorDashboard" || page === "workCenter") {
  return withAssistantLayer(<ContractorDashboard setPage={setPage} />, page, setPage);
}

if (page === "completedJobDetails") {
  return withAssistantLayer(<CompletedJobDetails setPage={setPage} />, page, setPage);
}

if (page === "contractorJobAccepted") {
  return <ContractorJobAccepted setPage={setPage} />;
}

return withSuspense(<Home setPage={setPage} />);
}
  export default App;
