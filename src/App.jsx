import { lazy, Suspense, useEffect, useState } from "react";
import { isProfessionalSession } from "./utils/session";

const Home = lazy(() => import("./pages/Home"));
import MyRequests from "./pages/MyRequests";
import Assistant from "./pages/Assistant";
const Discover = lazy(() => import("./pages/Discover"));
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import ContractorProfile from "./pages/ContractorProfile";
import Chat from "./pages/Chat";
import Conversation from "./pages/Conversation";
import ProjectDetails from "./pages/ProjectDetails";
import Login from "./pages/Login";
import Contractors from "./pages/Contractors";
import ContractorDetails from "./pages/ContractorDetails";
import QuoteRequests from "./pages/QuoteRequests";
const ConversationThread = lazy(() => import("./pages/ConversationThread"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
import ProjectGallery from "./pages/ProjectGallery";
const MessagesInbox = lazy(() => import("./pages/MessagesInbox"));
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
import BusinessLeads from "./pages/BusinessLeads";
import QuoteBuilder from "./pages/QuoteBuilder";
import ChangeOrderRequest from "./pages/ChangeOrderRequest";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import BusinessCommandCenter from "./pages/BusinessCommandCenter";
import JobUpdate from "./pages/JobUpdate";

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

function App() {
  const token = localStorage.getItem("token");

 const professionalOnlyPages = [
  "quoteRequests",
  "businessDashboard",
  "businessLeads",
  "businessCommandCenter",
  "quoteBuilder",
];  

  const getInitialPage = () => {
    const currentHash =
      window.location.hash.replace("#", "") || "";

    const hasToken =
      localStorage.getItem("token");

    if (!hasToken) {
      return "login";
    }

    const onboardingComplete =
      localStorage.getItem("onboardingComplete");

    if (!onboardingComplete) {
      return "welcomeIntro";
    }

    if (
      currentHash &&
      professionalOnlyPages.includes(currentHash)
    ) {
      return currentHash;
    }

    if (currentHash) {
      return currentHash;
    }

    return isProfessionalSession()
      ? "businessDashboard"
      : "home";
  };

  const [page, setPageState] = useState(getInitialPage());


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
      const hashPage =
        window.location.hash.replace("#", "") || "";

      const hasToken =
        localStorage.getItem("token");

      if (!hasToken) {
        setPageState("login");
        return;
      }

      if (hashPage) {
        setPageState(hashPage);
      }
    };

    const handleAuthExpired = () => {
      setPageState("login");
    };

    const handleVisibilityResume = () => {
      const hasToken =
        localStorage.getItem("token");

      if (!hasToken) {
        setPageState("login");
        return;
      }

      const currentHash =
        window.location.hash.replace("#", "") || "";

      if (currentHash) {
        setPageState(currentHash);
      }
    };

    const handleNativePageChange = (event) => {
      const nextPage = event?.detail?.page;

      if (nextPage) {
        setPageState(nextPage);
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
    const hasToken = localStorage.getItem("token");

    if (
      professionalOnlyPages.includes(newPage) &&
      !hasToken
    ) {
      window.location.hash = "login";
      setPageState("login");
      return;
    }

    const latestIsProfessional =
      isProfessionalSession();

    if (
      professionalOnlyPages.includes(newPage) &&
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

    window.location.hash = newPage;
    setPageState(newPage);
  };

if (page === "login") {
  return <Login setPage={setPage} />;
}

if (page === "welcome") {
  return <Welcome setPage={setPage} />;
}

if (page === "welcomeIntro") {
  return <WelcomeIntro setPage={setPage} />;
}

if (page === "home") {
  return withSuspense(<Home setPage={setPage} />);
}

if (page === "myRequests") {
  return <MyRequests setPage={setPage} />;
}

if (page === "assistant") {
  return <Assistant setPage={setPage} />;
}

if (page === "discover") {
  return withSuspense(<Discover setPage={setPage} />);
}

if (page === "upload") {
  return <Upload setPage={setPage} />;
}

if (page === "profile") {
  return <Profile setPage={setPage} />;
}

if (page === "contractorProfile") {
  return <ContractorProfile setPage={setPage} />;
}

if (page === "chat") {
  return <Chat setPage={setPage} />;
}

if (page === "conversation") {
  return <Conversation setPage={setPage} />;
}

if (page === "projectDetails") {
  return <ProjectDetails setPage={setPage} />;
}

if (page === "contractors") {
  return <Contractors setPage={setPage} />;
}

if (page === "contractorDetails") {
  return <ContractorDetails setPage={setPage} />;
}

if (page === "quoteRequests") {
  return <QuoteRequests setPage={setPage} />;
}

if (page === "conversationThread") {
  return withSuspense(<ConversationThread setPage={setPage} />);
}

 
if (page === "businessDashboard") {
  return withSuspense(<BusinessDashboard setPage={setPage} />);
}

if (page === "businessAnalytics") {
  return <BusinessAnalytics setPage={setPage} currentPage={page} />;
}

if (page === "businessLeads") {
  return <BusinessLeads setPage={setPage} />;
}

if (page === "quoteBuilder") {
  return <QuoteBuilder setPage={setPage} />;
}

if (page === "changeOrderRequest") {
  return <ChangeOrderRequest setPage={setPage} />;
}

if (page === "businessCommandCenter") {
  return <BusinessCommandCenter setPage={setPage} />;
}

if (page === "jobUpdate") {
  return <JobUpdate setPage={setPage} />;
}

if (page === "projectGallery") {
  return <ProjectGallery setPage={setPage} />;
}

if (page === "messagesInbox") {
  return withSuspense(<MessagesInbox setPage={setPage} />);
}

if (page === "favorites") {
  return <Favorites setPage={setPage} />;
}

if (page === "emergency") {
  return <Emergency setPage={setPage} />;
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
      selectedService={localStorage.getItem("selectedEmergencyService")}
    />
  );
}

if (page === "emergencyStatus") {
  return <EmergencyStatus setPage={setPage} />;
}

if (page === "emergencyDispatch") {
  return <EmergencyDispatch setPage={setPage} />;
}

if (page === "emergencyCompletionActions") {
  return <EmergencyCompletionActions setPage={setPage} />;
}

if (page === "invoiceBuilder") {
  return <InvoiceBuilder setPage={setPage} />;
}

if (page === "emergencyOperationsCenter") {
  return <EmergencyOperationsCenter setPage={setPage} />;
}

if (page === "completionSheet") {
  return <CompletionSheet setPage={setPage} />;
}

if (page === "emergencyChat") {
  return <EmergencyChat setPage={setPage} />;
}

if (page === "emergencyComplete") {
  return <EmergencyComplete setPage={setPage} />;
}

if (page === "contractorDashboard" || page === "workCenter") {
  return <ContractorDashboard setPage={setPage} />;
}

if (page === "completedJobDetails") {
  return <CompletedJobDetails setPage={setPage} />;
}

if (page === "contractorJobAccepted") {
  return <ContractorJobAccepted setPage={setPage} />;
}

return withSuspense(<Home setPage={setPage} />);
}
  export default App;
