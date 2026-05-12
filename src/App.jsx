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
import Login from "./pages/login";
import Contractors from "./pages/Contractors";
import ContractorDetails from "./pages/ContractorDetails";
import QuoteRequests from "./pages/QuoteRequests";
import ConversationThread from "./pages/ConversationThread";

function App() {
  const token = localStorage.getItem("token");

  const getInitialPage = () => {
    const currentHash =
      window.location.hash.replace("#", "") || "";

    if (!token) {
      return "login";
    }

    return currentHash || "home";
  };

  const [page, setPageState] = useState(getInitialPage());

  const protectedPages = [
    "home",
    "assistant",
    "upload",
    "discover",
    "profile",
    "contractorProfile",
    "chat",
    "conversation",
    "projectDetails",
    "contractors",
    "contractorDetails",
    "quoteRequests",
    "conversationThread",
  ];

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

    window.location.hash = newPage;
    setPageState(newPage);

    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const currentPage =
        window.location.hash.replace("#", "") || "";

      const hasToken = localStorage.getItem("token");

      if (
        protectedPages.includes(currentPage) &&
        !hasToken
      ) {
        setPageState("login");
        window.location.hash = "login";
        return;
      }

      setPageState(currentPage || "home");

      window.scrollTo(0, 0);
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

  return (
    <>
      {page === "login" && (
        <Login setPage={setPage} currentPage={page} />
      )}

      {page === "home" && (
        <Home setPage={setPage} currentPage={page} />
      )}

      {page === "assistant" && (
        <Assistant setPage={setPage} currentPage={page} />
      )}

      {page === "upload" && (
        <Upload setPage={setPage} currentPage={page} />
      )}

      {page === "discover" && (
        <Discover setPage={setPage} currentPage={page} />
      )}

      {page === "profile" && (
        <Profile setPage={setPage} currentPage={page} />
      )}

      {page === "contractorProfile" && (
        <ContractorProfile
          setPage={setPage}
          currentPage={page}
        />
      )}

      {page === "chat" && (
        <Chat setPage={setPage} currentPage={page} />
      )}

      {page === "conversation" && (
        <Conversation
          setPage={setPage}
          currentPage={page}
        />
      )}
      
      {page === "contractors" && (
  <Contractors
    setPage={setPage}
    currentPage={page}
  />
)}

{page === "contractorDetails" && (
  <ContractorDetails
    setPage={setPage}
    currentPage={page}
  />
)}

{page === "quoteRequests" && (
  <QuoteRequests
    setPage={setPage}
    currentPage={page}
  />
)}

{page === "conversationThread" && (
  <ConversationThread
    setPage={setPage}
    currentPage={page}
  />
)}
      {page === "projectDetails" && (
        <ProjectDetails
          setPage={setPage}
          currentPage={page}
        />
      )}
    </>
  );
}

export default App;
