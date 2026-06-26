import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import LoadingScreen from "../components/LoadingScreen";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { getStoredHomeownerRequests } from "../utils/workflowTimeline";
import { getLanguage, t } from "../utils/language";
import { isProfessionalSession } from "../utils/session";
import {
  getStoredProfessionalMatchProfile,
} from "../utils/professionalRequestMatching";
import {
  canProfessionalSeeLocalLead,
  getLocalLeadVisibilitySummary,
} from "../utils/localLeadVisibility";

function BusinessLeads({ setPage, currentPage }) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [language, updateLanguage] = useState(getLanguage());
  const [activeFilter, setActiveFilter] = useState("all");

  const businessName = localStorage.getItem("businessName") || "Business";
  const businessCategory = localStorage.getItem("businessCategory") || "";
  const professionalMatchProfile = {
    ...getStoredProfessionalMatchProfile(),
    businessCategory,
    category: businessCategory,
  };

  const isProfessional =
    isProfessionalSession();

  const isSpanish = language === "es";

  const text = {
    businessLeads: t("businessLeads"),
    nearbyOpportunities: t("businessLeadsSubtitle").replace(
      "{businessName}",
      businessName
    ),
    openRequests: t("openRequests"),
    noLeads: t("noBusinessLeads"),
    noLeadsText: t("noBusinessLeadsText"),
    viewDetails: t("reviewJob"),
    posted: t("posted"),
    professionalRequired: isSpanish
      ? "Acceso profesional requerido"
      : "Professional Access Required",
    professionalRequiredText: isSpanish
      ? "Solo cuentas profesionales pueden ver clientes del negocio."
      : "Only professional accounts can view business leads.",
    goToProfile: isSpanish ? "Ir al Perfil" : "Go to Profile",
  };

  function categoryLabel(category) {
    const categoryMap = {
      plumbing: t("plumbing"),
      electrical: t("electrical"),
      drywall: t("drywall"),
      cleaning: t("cleaning"),
      painting: t("painting"),
      flooring: t("flooring"),
      roofing: t("roofing"),
      handyman: t("handyman"),
      contractor: t("generalContractor"),
      landscaping: t("landscaping"),
      poolService: t("poolService"),
      pressureWashing: t("pressureWashing"),
      paverSealing: t("paverSealing"),
    };

    return categoryMap[category] || category || t("otherService");
  }

  function normalizeLeadCandidate(source = {}) {
    const photos = Array.isArray(source.photos)
      ? source.photos
      : source.image_url
      ? [source.image_url]
      : [];
    const createdAt =
      source.createdAt ||
      source.created_at ||
      source.postedAt ||
      source.posted_at ||
      source.date ||
      "";

    return {
      ...source,
      id: source.id || source.requestId || source.postId || `lead-${Date.now()}`,
      requestId: source.requestId || source.id || "",
      title: source.title || source.projectTitle || source.service || source.category || t("dashboardNewRequest"),
      description:
        source.description ||
        source.details ||
        source.notes ||
        source.projectDescription ||
        "",
      category:
        source.category ||
        source.requestCategory ||
        source.request_category ||
        source.serviceCategory ||
        "",
      location:
        source.fullAddress ||
        source.location ||
        source.address ||
        [source.city, source.state, source.zip || source.zipCode].filter(Boolean).join(", ") ||
        "Local Area",
      city: source.city || source.primaryCity || source.primary_city || "",
      state: source.state || source.province || "",
      zip: source.zip || source.zipCode || source.zip_code || source.postalCode || source.postal_code || "",
      latitude: source.latitude ?? source.lat,
      longitude: source.longitude ?? source.lng,
      localDemoSafe:
        source.localDemoSafe === true ||
        source.demoSafe === true ||
        source.isDemo === true ||
        source.source === "local_homeowner_request",
      fullAddress: source.fullAddress || source.location || source.address || "",
      unitNumber: source.unitNumber || source.unit_number || "",
      accessNotes: source.accessNotes || source.access_notes || "",
      distance: source.distance || "Nearby",
      posted: source.posted || source.date || (createdAt ? "Today" : "Today"),
      createdAt,
      value: source.value || source.budget || source.priceGuide || "$150 - $500",
      urgency: source.urgency || (isSpanish ? "Nuevo" : "New"),
      verified: source.verified ?? true,
      image_url: photos[0] || source.image_url,
      photos,
    };
  }

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

         useEffect(() => {
  async function loadLeads() {
    try {
      const result = await authFetch(
        "/posts",
        {},
        setPage
      );

      let incomingPosts = [];

      if (result.response?.ok) {
        const data = result.data || {};
        incomingPosts = Array.isArray(data)
          ? data
          : data.posts || [];
      }

      const homeownerRequests =
        getStoredHomeownerRequests();

      function isDirectRelationshipRequest(request = {}) {
        return (
          request.requestChannel === "direct" ||
          request.visibility === "direct" ||
          request.directRequest === true ||
          request.isDirectRequest === true ||
          request.source === "hire_again_direct_request"
        );
      }

      const publicHomeownerRequests = homeownerRequests.filter(
        (request) => !isDirectRelationshipRequest(request)
      );

      function isClosedLead(item) {
        const itemId = String(item.id || item.requestId || "");

        return publicHomeownerRequests.some((request) => {
          const requestId = String(request.id || request.requestId || "");

          const sameId = itemId && requestId && itemId === requestId;

          const sameTitle =
            String(request.title || "").trim().toLowerCase() ===
            String(item.title || "").trim().toLowerCase();

          const closedStatuses = [
            "accepted",
            "selected",
            "scheduled",
            "active",
            "completed",
            "cancelled",
            "closed",
          ];

          const hasAcceptedQuote =
            request.acceptedQuote ||
            request.selectedProfessional ||
            request.quotesReceived?.some(
              (quote) => quote.status === "accepted"
            );

          return (
            (sameId || sameTitle) &&
            (closedStatuses.includes(request.status) || hasAcceptedQuote)
          );
        });
      }

      const convertedPosts = incomingPosts.map((post) => {
        const exactIdMatch = publicHomeownerRequests.find((request) => {
          return (
            String(request.id || request.requestId || "") ===
            String(post.id || "")
          );
        });

        const titleFallbackMatch = publicHomeownerRequests.find((request) => {
          const requestId = String(request.id || request.requestId || "");
          const postId = String(post.id || "");

          if (requestId && postId) return false;

          return (
            String(request.title || "").trim().toLowerCase() ===
            String(post.title || "").trim().toLowerCase()
          );
        });

        const matchingHomeownerRequest = exactIdMatch || titleFallbackMatch;

        const photos = Array.isArray(matchingHomeownerRequest?.photos)
          ? matchingHomeownerRequest.photos
          : Array.isArray(post.photos)
          ? post.photos
          : [];

        return normalizeLeadCandidate({
          id: post.id,
          requestId: matchingHomeownerRequest?.requestId || matchingHomeownerRequest?.id || post.id,
          title: post.title,
          description: post.description,
          category: post.category,
          location:
            matchingHomeownerRequest?.fullAddress ||
            matchingHomeownerRequest?.location ||
            post.fullAddress ||
            post.location ||
            "Local Area",
          city:
            matchingHomeownerRequest?.city ||
            matchingHomeownerRequest?.primaryCity ||
            post.city ||
            post.primaryCity ||
            "",
          zip:
            matchingHomeownerRequest?.zip ||
            matchingHomeownerRequest?.zipCode ||
            matchingHomeownerRequest?.postalCode ||
            post.zip ||
            post.zipCode ||
            post.postalCode ||
            "",
          latitude:
            matchingHomeownerRequest?.latitude ??
            matchingHomeownerRequest?.lat ??
            post.latitude ??
            post.lat,
          longitude:
            matchingHomeownerRequest?.longitude ??
            matchingHomeownerRequest?.lng ??
            post.longitude ??
            post.lng,
          localDemoSafe:
            matchingHomeownerRequest?.localDemoSafe ||
            matchingHomeownerRequest?.demoSafe ||
            matchingHomeownerRequest?.isDemo ||
            post.localDemoSafe ||
            post.demoSafe ||
            post.isDemo,
          fullAddress:
            matchingHomeownerRequest?.fullAddress ||
            matchingHomeownerRequest?.location ||
            post.fullAddress ||
            post.location ||
            "",
          unitNumber:
            matchingHomeownerRequest?.unitNumber ||
            matchingHomeownerRequest?.unit_number ||
            post.unitNumber ||
            post.unit_number ||
            "",
          accessNotes:
            matchingHomeownerRequest?.accessNotes ||
            matchingHomeownerRequest?.access_notes ||
            post.accessNotes ||
            post.access_notes ||
            "",
          distance: "Nearby",
          posted: post.date || "Today",
          value: "$150 - $500",
          urgency: isSpanish ? "Nuevo" : "New",
          verified: true,
          user_id: post.user_id,
          image_url: photos[0] || post.image_url,
          photos,
          username: post.username,
          email: post.email,
        });
      });

      const localLeadCandidates = publicHomeownerRequests.map((request) =>
        normalizeLeadCandidate({
          ...request,
          id: request.id || request.requestId,
          requestId: request.requestId || request.id,
          source: request.source || "local_homeowner_request",
          localDemoSafe: request.localDemoSafe ?? true,
        })
      );

      const candidateMap = new Map();
      [...localLeadCandidates, ...convertedPosts].forEach((lead) => {
        const key = String(lead.requestId || lead.id || lead.title || "");
        if (!key) return;
        if (!candidateMap.has(key)) candidateMap.set(key, lead);
      });
      const leadCandidates = Array.from(candidateMap.values());

      const debugRows = leadCandidates.map((lead) => {
        const summary = getLocalLeadVisibilitySummary(
          professionalMatchProfile,
          lead
        );

        return {
          requestId: lead.requestId || lead.id,
          title: lead.title,
          serviceDomain: lead.serviceDomain || lead.service_domain,
          category: lead.category,
          specialty: lead.serviceSpecialty || lead.service_specialty,
          details: lead.description,
          city: lead.city,
          state: lead.state,
          zip: lead.zip,
          professionalCategory: professionalMatchProfile.businessCategory,
          professionalServiceArea:
            professionalMatchProfile.serviceArea ||
            professionalMatchProfile.serviceCities ||
            professionalMatchProfile.serviceZipCodes ||
            "",
          matchResult: summary.visible,
          rejectionReason: summary.visible
            ? ""
            : !summary.serviceMatched
            ? "service_match_failed"
            : summary.serviceArea?.reason || "lead_eligibility_failed",
          checks: summary.requestMatch?.checks,
          area: summary.serviceArea,
        };
      });

      if (
        import.meta.env.DEV ||
        localStorage.getItem("meetroLeadDebug") === "true"
      ) {
        console.table(debugRows);
      }

      const matchedLeads = leadCandidates
        .filter((lead) =>
          canProfessionalSeeLocalLead(professionalMatchProfile, lead)
        )
        .filter((lead) => !isClosedLead(lead));

      setLeads(matchedLeads);
    } catch (error) {
      console.error(error);

      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  loadLeads();
}, [language, businessCategory]);

  const getBudgetValue = (lead) => {
    const numbers = String(
      lead.value || lead.budget || lead.priceGuide || ""
    ).match(/\d+/g);

    return numbers
      ? Math.max(...numbers.map((number) => Number(number)))
      : 0;
  };

  const getDistanceValue = (lead) => {
    const match = String(lead.distance || "").match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : 999;
  };

  const getUrgencyValue = (lead) => {
    const value = String(lead.urgency || "").toLowerCase();

    if (value.includes("emergency") || value.includes("urgent")) return 3;
    if (value.includes("popular")) return 2;
    if (value.includes("open") || value.includes("abierto")) return 1;
    return 0;
  };

  const getNewestValue = (lead) => {
    const raw =
      lead.createdAt ||
      lead.created_at ||
      lead.postedAt ||
      lead.posted_at ||
      lead.updatedAt ||
      lead.updated_at ||
      lead.id ||
      "";
    const time = Date.parse(raw);

    return !Number.isNaN(time)
      ? time
      : Number(String(raw).replace(/\D/g, "")) || 0;
  };

  const visibleLeads = [...leads].sort((a, b) => {
    if (activeFilter === "all") {
      return 0;
    }

    if (activeFilter === "highestBudget") {
      return getBudgetValue(b) - getBudgetValue(a);
    }

    if (activeFilter === "nearby") {
      return getDistanceValue(a) - getDistanceValue(b);
    }

    if (activeFilter === "urgent") {
      return getUrgencyValue(b) - getUrgencyValue(a);
    }

    return getNewestValue(b) - getNewestValue(a);
  });

  if (loading) {
    return <LoadingScreen text={isSpanish ? "Cargando clientes..." : "Loading business leads..."} />;
  }

  if (!isProfessional) {
    return (
      <div className="app-page meetro-responsive-page" style={pageWrapper}>
      <div style={{ padding: "20px 20px 0" }}>
  <button
    onClick={() => setPage("businessDashboard")}
    style={{
      border: "none",
      background: "#eee7ff",
      color: "#5b3df5",
      padding: "10px 14px",
      borderRadius: "14px",
      fontWeight: "bold",
      cursor: "pointer",
    }}
  >
    ← {t("back")}
  </button>
</div>
          <div style={lockedCard}>
          <div style={lockedIcon}>LOCK</div>
          <h1 style={lockedTitle}>{text.professionalRequired}</h1>
          <p style={lockedText}>{text.professionalRequiredText}</p>
          <button style={primaryButton} onClick={() => setPage("profile")}>
            {text.goToProfile}
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
        <h1 style={heroTitle}>{text.businessLeads}</h1>
        <p style={heroText}>{text.nearbyOpportunities}</p>
      </div>

      <div style={sectionRow}>
        <h2 style={sectionTitle}>{text.openRequests}</h2>
        <div style={sectionControls}>
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            style={sortSelect}
            aria-label={t("sortLeads")}
          >
            <option value="all">{language === "es" ? "Todos" : "All"}</option>
            <option value="newest">{t("sortNewest")}</option>
            <option value="nearby">{t("sortNearby")}</option>
            <option value="highestBudget">{t("sortHighestBudget")}</option>
            <option value="urgent">{t("sortUrgent")}</option>
          </select>
          <span style={countBadge}>{visibleLeads.length}</span>
        </div>
      </div>

      {visibleLeads.length === 0 ? (
        <div style={emptyCard}>
          <div style={emptyIcon}>LEAD</div>
          <h2 style={emptyTitle}>{text.noLeads}</h2>
          <p style={emptyText}>{text.noLeadsText}</p>
        </div>
      ) : (
        <div className="meetro-responsive-grid meetro-grid-2" style={leadList}>
          {visibleLeads.map((lead) => (
            <div key={lead.id} style={leadCard}>
              <div style={leadTopLine}>
                <span style={categoryPill}>{categoryLabel(lead.category)}</span>
                <span style={postedText}>{text.posted}: {lead.posted}</span>
              </div>

              <h3 style={leadTitle}>{lead.title}</h3>
              <p style={leadDescription}>{lead.description}</p>
              <div style={leadLocation}>{lead.location}</div>

              {(lead.unitNumber || lead.accessNotes) && (
                <div style={leadExtraInfo}>
                  {lead.unitNumber && (
                    <span>{t("unitNumber")}: {lead.unitNumber}</span>
                  )}
                  {lead.accessNotes && (
                    <span>{t("accessNotes")}: {lead.accessNotes}</span>
                  )}
                </div>
              )}

              <div style={actionRow}>
                <button
                  style={primaryActionButton}
                  onClick={() => {
                    // preserved selectedActiveProject
                    localStorage.removeItem("lastCompletedProject");
                    localStorage.removeItem("selectedHomeownerRequestId");
                    localStorage.removeItem("selectedWorkCenterRequest");
                    localStorage.removeItem("activeWorkCenterQuoteRequestId");
                    localStorage.setItem("leadWorkflowStage", "project_review");
                    localStorage.setItem("leadWorkflowIntent", "review_contact_schedule");

                    localStorage.setItem("selectedPostId", lead.id);

                    localStorage.setItem(
                      "selectedQuoteRequest",
                      JSON.stringify(lead)
                    );

                    localStorage.setItem(
                      "projectDetailsReturnPage",
                      "businessLeads"
                    );

                    setPage("projectDetails");
                  }}
                >
                  {text.viewDetails}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="businessLeads" />
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, #eef0ff 0%, transparent 32%), linear-gradient(to bottom, #f7f7fb, #eef0f7)",
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
  background: "linear-gradient(135deg, #111b46 0%, #263b92 45%, #5b3df5 100%)",
  borderRadius: "30px",
  padding: "22px",
  color: "white",
  marginBottom: "18px",
  boxShadow: "0 24px 60px rgba(35,54,139,0.32)",
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
  wordBreak: "normal",
};

const heroText = {
  margin: 0,
  lineHeight: 1.5,
  opacity: 0.92,
  fontSize: "16px",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const sectionRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  margin: "18px 0 14px",
  gap: "12px",
  flexWrap: "wrap",
  maxWidth: "100%",
  minWidth: 0,
};

const sectionTitle = {
  margin: 0,
  fontSize: "28px",
  minWidth: 0,
  overflowWrap: "break-word",
};

const sectionControls = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flex: "0 1 auto",
  maxWidth: "100%",
  minWidth: 0,
};

const sortSelect = {
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "12px",
  padding: "8px 10px",
  fontSize: "12px",
  fontWeight: "700",
  minWidth: 0,
  maxWidth: "min(220px, 64vw)",
  boxSizing: "border-box",
};

const countBadge = {
  background: "#ede9ff",
  color: "#5b3df5",
  padding: "8px 13px",
  borderRadius: "999px",
  fontWeight: "900",
};

const leadList = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: "16px",
};

const leadCard = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.9)",
  borderRadius: "28px",
  padding: "18px",
  boxShadow: "0 16px 42px rgba(0,0,0,0.08)",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const leadTopLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  marginBottom: "8px",
  flexWrap: "wrap",
  minWidth: 0,
};

const categoryPill = {
  background: "#eee7ff",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const postedText = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "700",
  textAlign: "right",
};

const leadTitle = {
  margin: "0 0 7px",
  fontSize: "21px",
  lineHeight: 1.15,
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const leadDescription = {
  margin: 0,
  color: "#6b7280",
  lineHeight: 1.45,
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const leadLocation = {
  marginTop: "12px",
  color: "#334155",
  fontSize: "14px",
  fontWeight: "800",
};

const leadExtraInfo = {
  display: "grid",
  gap: "6px",
  marginTop: "10px",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "rgba(239,246,255,0.9)",
  border: "1px solid rgba(147,197,253,0.45)",
  color: "#1e3a8a",
  fontSize: "12px",
  fontWeight: 800,
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "1fr",
  marginTop: "16px",
};

const primaryActionButton = {
  border: "none",
  background: "linear-gradient(135deg, #5b3df5, #7b61ff)",
  color: "white",
  borderRadius: "18px",
  padding: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const lockedCard = {
  background: "white",
  borderRadius: "28px",
  padding: "34px 22px",
  textAlign: "center",
  marginTop: "60px",
  boxShadow: "0 16px 42px rgba(0,0,0,0.08)",
};

const lockedIcon = {
  fontSize: "54px",
};

const lockedTitle = {
  margin: "18px 0 8px",
};

const lockedText = {
  color: "#6b7280",
  lineHeight: 1.5,
};

const primaryButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "18px",
  padding: "15px 18px",
  fontWeight: "900",
  cursor: "pointer",
};

const emptyCard = {
  background: "white",
  borderRadius: "28px",
  padding: "34px 22px",
  textAlign: "center",
  boxShadow: "0 16px 42px rgba(0,0,0,0.08)",
};

const emptyIcon = {
  fontSize: "54px",
};

const emptyTitle = {
  margin: "18px 0 8px",
};

const emptyText = {
  color: "#6b7280",
  lineHeight: 1.5,
};

export default BusinessLeads;
