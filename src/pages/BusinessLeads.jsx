import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import LoadingScreen from "../components/LoadingScreen";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { getStoredHomeownerRequests } from "../utils/workflowTimeline";
import { getLanguage, t } from "../utils/language";
import { isProfessionalSession } from "../utils/session";

function BusinessLeads({ setPage, currentPage }) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [language, updateLanguage] = useState(getLanguage());
  const [activeFilter, setActiveFilter] = useState("newest");

  const businessName = localStorage.getItem("businessName") || "Business";
  const businessCategory = localStorage.getItem("businessCategory") || "";

  const isProfessional =
    isProfessionalSession();

  const isSpanish = language === "es";

  const text = {
    availableClients: isSpanish ? "Clientes Disponibles" : "Available Clients",
    businessLeads: isSpanish ? "Clientes del Negocio" : "Business Leads",
    nearbyOpportunities: isSpanish
      ? `Nuevas oportunidades cerca de ti para ${businessName}.`
      : `New nearby opportunities for ${businessName}.`,
    live: isSpanish ? "En Vivo" : "Live",
    new: isSpanish ? "Nuevos" : "New",
    match: "Match",
    radius: isSpanish ? "Radio" : "Radius",
    category: isSpanish ? "Categoría" : "Category",
    allCategories: isSpanish ? "Todas las categorías" : "All categories",
    filters: isSpanish ? "Filtros" : "Filters",
    openRequests: isSpanish ? "Solicitudes Abiertas" : "Open Requests",
    noLeads: isSpanish ? "No hay clientes todavía" : "No leads yet",
    noLeadsText: isSpanish
      ? "Nuevas solicitudes aparecerán aquí cuando coincidan con tu negocio."
      : "New requests will appear here when they match your business.",
    verifiedClient: isSpanish ? "Cliente verificado" : "Verified client",
    unverified: isSpanish ? "Sin verificar" : "Unverified",
    fastResponse: isSpanish
      ? "Respuesta rápida recomendada"
      : "Fast response recommended",
    viewDetails: isSpanish ? "Revisar trabajo" : "Review Job",
    sendQuote: isSpanish ? "Contactar / Programar" : "Contact / Schedule",
    potential: isSpanish ? "Guía de Precio" : "Price Guide",
    posted: isSpanish ? "Publicado" : "Posted",
    professionalRequired: isSpanish
      ? "Acceso profesional requerido"
      : "Professional Access Required",
    professionalRequiredText: isSpanish
      ? "Solo cuentas profesionales pueden ver clientes del negocio."
      : "Only professional accounts can view business leads.",
    goToProfile: isSpanish ? "Ir al Perfil" : "Go to Profile",
    newest: isSpanish ? "Recientes" : "Newest",
    nearby: isSpanish ? "Cercanos" : "Nearby",
    highestBudget: isSpanish ? "Mayor Presupuesto" : "Highest Budget",
    urgent: isSpanish ? "Urgente" : "Urgent",
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

  function getUrgencyStyle(urgency) {
    const value = String(urgency || "").toLowerCase();

    if (value.includes("emergency") || value.includes("urgente")) {
      return {
        background: "#fee2e2",
        color: "#dc2626",
      };
    }

    if (value.includes("popular")) {
      return {
        background: "#ffedd5",
        color: "#ea580c",
      };
    }

    if (value.includes("open") || value.includes("abierto")) {
      return {
        background: "#dbeafe",
        color: "#2563eb",
      };
    }

    return {
      background: "#dcfce7",
      color: "#16a34a",
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

      const normalizedBusinessCategory = businessCategory
        .toLowerCase()
        .replace(/\s+/g, "");

      const categoryGroups = {
        handyman: [
          "handyman",
          "plumbing",
          "electrical",
          "drywall",
          "doorswindows",
          "carpentry",
          "painting",
          "flooring",
          "tile",
          "appliancerepair",
          "contractor",
          "generalcontractor",
        ],
        contractor: [
          "contractor",
          "generalcontractor",
          "drywall",
          "flooring",
          "painting",
          "tile",
          "carpentry",
          "doorswindows",
          "demolition",
          "concrete",
        ],
        cleaning: ["cleaning", "pressurewashing", "junkremoval"],
      };

      function matchesBusinessCategory(item) {
        if (!normalizedBusinessCategory) return true;

        const itemCategory = String(item.category || "")
          .toLowerCase()
          .replace(/\s+/g, "");

        if (categoryGroups[normalizedBusinessCategory]) {
          return categoryGroups[normalizedBusinessCategory].includes(
            itemCategory
          );
        }

        return itemCategory === normalizedBusinessCategory;
      }

      const homeownerRequests =
        getStoredHomeownerRequests();

      function isClosedLead(item) {
        const itemId = String(item.id || item.requestId || "");

        return getStoredHomeownerRequests().some((request) => {
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
        const exactIdMatch = getStoredHomeownerRequests().find((request) => {
          return (
            String(request.id || request.requestId || "") ===
            String(post.id || "")
          );
        });

        const titleFallbackMatch = getStoredHomeownerRequests().find((request) => {
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

        return {
          id: post.id,
          title: post.title,
          description: post.description,
          category: post.category,
          location: post.location || "Local Area",
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
        };
      });

      const matchedLeads = convertedPosts
        .filter(matchesBusinessCategory)
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
    const raw = String(lead.value || lead.budget || lead.priceGuide || "");
    const numbers = raw.match(/\d+/g);

    if (!numbers) return 0;

    return Math.max(...numbers.map((number) => Number(number)));
  };

  const getDistanceValue = (lead) => {
    const raw = String(lead.distance || "");
    const match = raw.match(/\d+(\.\d+)?/);

    return match ? Number(match[0]) : 999;
  };

  const getUrgencyValue = (lead) => {
    const value = String(lead.urgency || "").toLowerCase();

    if (
      value.includes("emergency") ||
      value.includes("urgent") ||
      value.includes("urgente")
    ) {
      return 3;
    }

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

    if (!Number.isNaN(time)) return time;

    return Number(String(raw).replace(/\D/g, "")) || 0;
  };

  const visibleLeads = [...leads].sort((a, b) => {
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
      <div style={pageWrapper}>
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
          <div style={lockedIcon}>🔒</div>
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
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div style={heroTopRow}>
          <div>
            <p style={eyebrow}>{text.availableClients}</p>
            <h1 style={heroTitle}>{text.businessLeads}</h1>
            <p style={heroText}>{text.nearbyOpportunities}</p>
          </div>

          <div style={liveBadge}>🟢 {text.live}</div>
        </div>

        <div style={statsGrid}>
          <div style={statCard}>
            <strong>{leads.length}</strong>
            <span>{text.new}</span>
          </div>

          <div style={statCard}>
            <strong>92%</strong>
            <span>{text.match}</span>
          </div>

          <div style={statCard}>
            <strong>5 mi</strong>
            <span>{text.radius}</span>
          </div>
        </div>
      </div>

      <div style={filterCard}>
        <div>
          <strong style={filterTitle}>{text.category}</strong>
          <p style={filterText}>
            {businessCategory ? categoryLabel(businessCategory) : text.allCategories}
          </p>
        </div>

        <button style={filterButton}>⚙️ {text.filters}</button>
      </div>

      <div style={filterChips}>
        {[
          ["newest", text.newest],
          ["nearby", text.nearby],
          ["highestBudget", text.highestBudget],
          ["urgent", text.urgent],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveFilter(value)}
            style={{
              ...chipButton,
              ...(activeFilter === value ? activeChipButton : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={sectionRow}>
        <h2 style={sectionTitle}>{text.openRequests}</h2>
        <span style={countBadge}>{visibleLeads.length}</span>
      </div>

      {visibleLeads.length === 0 ? (
        <div style={emptyCard}>
          <div style={emptyIcon}>📭</div>
          <h2 style={emptyTitle}>{text.noLeads}</h2>
          <p style={emptyText}>{text.noLeadsText}</p>
        </div>
      ) : (
        <div style={leadList}>
          {visibleLeads.map((lead) => (
            <div key={lead.id} style={leadCard}>
              <div style={leadHeader}>
                <div style={serviceIcon}>
                  {lead.verified ? "✅" : "🏠"}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={leadTopLine}>
                    <span style={categoryPill}>{categoryLabel(lead.category)}</span>
                    <span
                      style={{
                        ...urgencyPill,
                        ...getUrgencyStyle(lead.urgency),
                      }}
                    >
                      {lead.urgency}
                    </span>
                  </div>

                  <h3 style={leadTitle}>{lead.title}</h3>
                  <p style={leadDescription}>{lead.description}</p>
                </div>
              </div>

              <div style={infoGrid}>
                <div style={infoBox}>
                  <span>📍</span>
                  <strong>{lead.location}</strong>
                  <small>{lead.distance}</small>
                </div>

                <div style={infoBox}>
                  <span>💰</span>
                  <strong>{lead.value}</strong>
                  <small>{text.potential}</small>
                </div>

                <div style={infoBox}>
                  <span>⏱️</span>
                  <strong>{lead.posted}</strong>
                  <small>{text.posted}</small>
                </div>
              </div>

              <div style={trustRow}>
                <span>
                  {lead.verified
                    ? `✅ ${text.verifiedClient}`
                    : `⚠️ ${text.unverified}`}
                </span>
                <span>⚡ {text.fastResponse}</span>
              </div>

              <div style={actionRow}>
                <button
                  style={secondaryButton}
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

                <button
                  style={primaryActionButton}
                  onClick={() => {
                    // preserved selectedActiveProject
                    localStorage.removeItem("lastCompletedProject");
                    localStorage.removeItem("selectedHomeownerRequestId");
                    localStorage.removeItem("selectedWorkCenterRequest");
                    localStorage.removeItem("activeWorkCenterQuoteRequestId");

                    localStorage.setItem("selectedPostId", lead.id);

                    localStorage.setItem(
                      "selectedQuoteRequest",
                      JSON.stringify(lead)
                    );

                    localStorage.setItem(
                      "projectDetailsReturnPage",
                      "businessLeads"
                    );

                    localStorage.setItem(
                      "leadWorkflowStage",
                      "customer_contact"
                    );

                    localStorage.setItem(
                      "leadWorkflowIntent",
                      "contact_customer_before_schedule"
                    );

                    setPage("projectDetails");
                  }}
                >
                  {text.sendQuote}
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
  padding: "calc(env(safe-area-inset-top) + 64px) 18px 130px",
  boxSizing: "border-box",
  color: "#111827",
  overflowX: "hidden",
};

const heroCard = {
  background: "linear-gradient(135deg, #111b46 0%, #263b92 45%, #5b3df5 100%)",
  borderRadius: "30px",
  padding: "22px",
  color: "white",
  marginBottom: "18px",
  boxShadow: "0 24px 60px rgba(35,54,139,0.32)",
};

const heroTopRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
};

const eyebrow = {
  margin: 0,
  opacity: 0.82,
  fontWeight: "900",
  fontSize: "13px",
  letterSpacing: "0.4px",
};

const heroTitle = {
  margin: "9px 0",
  fontSize: "32px",
  lineHeight: 1.05,
};

const heroText = {
  margin: 0,
  lineHeight: 1.5,
  opacity: 0.92,
  fontSize: "16px",
};

const liveBadge = {
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginTop: "22px",
};

const statCard = {
  background: "rgba(255,255,255,0.13)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "20px",
  padding: "14px 10px",
  display: "grid",
  gap: "5px",
  textAlign: "center",
};

const filterCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "12px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const filterTitle = {
  fontSize: "16px",
};

const filterText = {
  margin: "4px 0 0",
  color: "#6b7280",
  fontWeight: "700",
};

const filterButton = {
  border: "none",
  background: "#f1edff",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "12px 14px",
  fontWeight: "900",
  cursor: "pointer",
};

const filterChips = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  marginBottom: "18px",
};

const chipButton = {
  border: "none",
  background: "white",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "11px 14px",
  fontWeight: "900",
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
};

const activeChipButton = {
  background: "#5b3df5",
  color: "white",
};

const sectionRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "18px 0 14px",
};

const sectionTitle = {
  margin: 0,
  fontSize: "28px",
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
  gap: "16px",
};

const leadCard = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.9)",
  borderRadius: "28px",
  padding: "18px",
  boxShadow: "0 16px 42px rgba(0,0,0,0.08)",
};

const leadHeader = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
};

const serviceIcon = {
  width: "62px",
  height: "62px",
  minWidth: "62px",
  borderRadius: "18px",
  background: "#f1edff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "27px",
};

const leadTopLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  marginBottom: "8px",
};

const categoryPill = {
  background: "#eee7ff",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const urgencyPill = {
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const leadTitle = {
  margin: "0 0 7px",
  fontSize: "21px",
  lineHeight: 1.15,
};

const leadDescription = {
  margin: 0,
  color: "#6b7280",
  lineHeight: 1.45,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginTop: "16px",
};

const infoBox = {
  background: "#f8f7ff",
  borderRadius: "18px",
  padding: "12px 8px",
  display: "grid",
  gap: "4px",
  textAlign: "center",
};

const trustRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "14px",
  color: "#4b5563",
  fontSize: "13px",
  fontWeight: "800",
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "16px",
};

const secondaryButton = {
  border: "none",
  background: "#f1edff",
  color: "#5b3df5",
  borderRadius: "18px",
  padding: "15px",
  fontWeight: "900",
  cursor: "pointer",
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
