import { useEffect, useState } from "react";

import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import Discover from "./pages/Discover";
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
import ConversationThread from "./pages/ConversationThread";
import BusinessDashboard from "./pages/BusinessDashboard";
import ProjectGallery from "./pages/ProjectGallery";
import MessagesInbox from "./pages/MessagesInbox";
import Welcome from "./pages/Welcome";
import WelcomeIntro from "./pages/WelcomeIntro";
import Favorites from "./pages/Favorites";
import Emergency from "./pages/Emergency";
import EmergencyRequest from "./pages/EmergencyRequest";
import EmergencyStatus from "./pages/EmergencyStatus";
import EmergencyDispatch from "./pages/EmergencyDispatch";
import EmergencyChat from "./pages/EmergencyChat";
import EmergencyComplete from "./pages/EmergencyComplete";
import ContractorDashboard from "./pages/ContractorDashboard";
import ContractorJobAccepted from "./pages/ContractorJobAccepted";
import BusinessLeads from "./pages/BusinessLeads";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import BusinessCommandCenter from "./pages/BusinessCommandCenter";

function App() {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole") || "standard";

const professionalRoles = [
  "professional",
  "contractor",
  "handyman",

  "applianceRepair",
  "automotiveServices",
  "carDetailing",
  "carpentry",
  "cleaning",
  "concrete",

  "demolition",
  "doorsWindows",
  "drywall",
  "electrical",
  "fencing",
  "flooring",

  "homeHealthCare",

  "hvac",

  "junkRemoval",

  "landscaping",
  "lawnCare",

  "mechanic",
  "mobileServices",
  "moving",

  "painting",
  "paverSealing",
  "pestControl",
  "plumbing",

  "poolService",
  "pressureWashing",

  "privateTransportation",

  "realEstate",

  "roofing",

  "tile",
  "treeService",

  "other",
];

const accountType =
  localStorage.getItem("accountType") || "homeowner";

const isProfessional =
  accountType === "professional" ||
  professionalRoles.includes(userRole);

 const professionalOnlyPages = [
  "quoteRequests",
  "businessDashboard",
  "businessLeads",
  "businessCommandCenter",
];  

  const getInitialPage = () => {
    const currentHash =
      window.location.hash.replace("#", "") || "";

    if (!token) {
      return "login";
    }

    const onboardingComplete =
  localStorage.getItem("onboardingComplete");

if (!onboardingComplete) {
  return "welcomeIntro";
}

return currentHash || "home";
  };

  const [page, setPageState] = useState(getInitialPage());

  const protectedPages = [];

  const setPage = (newPage) => {
    const hasToken = localStorage.getItem("token");

    if (
      protectedPages.includes(newPage) &&
      !hasToken
    ) {
      window.location.hash = "login";
      setPageState("login");
      return;
    }
   const latestAccountType =
      localStorage.getItem("accountType") || "homeowner";

   const latestUserRole =
     localStorage.getItem("userRole") || "standard";

   const latestIsProfessional =
     latestAccountType === "professional" ||
     professionalRoles.includes(latestUserRole);

   if (
    professionalOnlyPages.includes(newPage) &&
  !latestIsProfessional
) {
  window.dispatchEvent(
  new CustomEvent("meetroPremiumNotice", {
    detail: {
      title: "Professional access required",
      message: "Only professional accounts can access this section.",
      type: "locked",
    },
  })
);

  window.location.hash = "profile";

  setPageState("profile");

  return;
}

window.location.hash = newPage;

setPageState(newPage);

window.scrollTo({
  top: 0,
  behavior: "smooth",
});    

  };

  useEffect(() => {
    const handleHashChange = () => {
      const newHash =
        window.location.hash.replace("#", "") || "home";

      const hasToken = localStorage.getItem("token");

      if (
        protectedPages.includes(newHash) &&
        !hasToken
      ) {
        setPageState("login");
        return;
      }

      setPageState(newHash);
    };

    window.addEventListener(
      "hashchange",
      handleHashChange
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        handleHashChange
      );
    };
  }, []);

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
  return <Home setPage={setPage} />;
}

if (page === "assistant") {
  return <Assistant setPage={setPage} />;
}

if (page === "discover") {
  return <Discover setPage={setPage} />;
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
  return <ConversationThread setPage={setPage} />;
}

 
if (page === "businessDashboard") {
  return <BusinessDashboard setPage={setPage} />;
}

if (page === "businessAnalytics") {
  return <BusinessAnalytics setPage={setPage} currentPage={page} />;
}

if (page === "businessLeads") {
  return <BusinessLeads setPage={setPage} />;
}

if (page === "businessCommandCenter") {
  return <BusinessCommandCenter setPage={setPage} />;
}

if (page === "projectGallery") {
  return <ProjectGallery setPage={setPage} />;
}

if (page === "messagesInbox") {
  return <MessagesInbox setPage={setPage} />;
}

if (page === "favorites") {
  return <Favorites setPage={setPage} />;
}

if (page === "emergency") {
  return <Emergency setPage={setPage} />;
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

if (page === "emergencyChat") {
  return <EmergencyChat setPage={setPage} />;
}

if (page === "emergencyComplete") {
  return <EmergencyComplete setPage={setPage} />;
}

if (page === "contractorDashboard") {
  return <ContractorDashboard setPage={setPage} />;
}

if (page === "contractorJobAccepted") {
  return <ContractorJobAccepted setPage={setPage} />;
}

return <Home setPage={setPage} />;
}
  export default App;
