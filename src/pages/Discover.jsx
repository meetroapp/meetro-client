import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";
import { isProfessionalSession, professionalRoles } from "../utils/session";

function Discover({ setPage, currentPage }) {
  const discoverMode =
    localStorage.getItem("activeDiscoverMode") || "businessDirectory";

  const isBusinessDirectory = discoverMode === "businessDirectory";

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [language, updateLanguage] = useState(getLanguage());

  const userRole = localStorage.getItem("userRole") || "standard";
  const businessCategory = localStorage.getItem("businessCategory") || "";

  const isProfessional =
    isProfessionalSession();

  const normalizedBusinessCategory = businessCategory
    .toLowerCase()
    .replace(/\s+/g, "");

  const categoryScrollRef = useRef(null);

  function scrollCategories(direction) {
    if (!categoryScrollRef.current) return;

    categoryScrollRef.current.scrollBy({
      left: direction === "left" ? -260 : 260,
      behavior: "smooth",
    });
  }

  function getLocalContractorProfile() {
    let savedProfile = null;

    try {
      savedProfile = JSON.parse(
        localStorage.getItem("contractorProfile") || "null"
      );
    } catch {}

    const businessName = localStorage.getItem("businessName");
    const businessCategory = localStorage.getItem("businessCategory");

    if (!savedProfile && businessName) {
      savedProfile = {
        id: businessName,
        business_name: businessName,
        name: businessName,
        category: businessCategory || "",
        business_category: businessCategory || "",
        location: localStorage.getItem("businessLocation") || "",
        bio: localStorage.getItem("businessBio") || "",
        image_url: localStorage.getItem("businessImageUrl") || "",
        logo: localStorage.getItem("businessImageUrl") || "",
        rating: localStorage.getItem("businessRating") || "5.0",
        status: "active",
      };

      localStorage.setItem("contractorProfile", JSON.stringify(savedProfile));
    }

    return savedProfile;
  }

  function getSavedBusinesses() {
    let storedBusinesses = [];

    try {
      storedBusinesses = JSON.parse(
        localStorage.getItem("meetroBusinesses") || "[]"
      );
    } catch {}

    const contractorProfile = getLocalContractorProfile();

    const mergedBusinesses = [...storedBusinesses];

    if (
      contractorProfile &&
      (contractorProfile.business_name || contractorProfile.name)
    ) {
      const contractorBusinessName =
        contractorProfile.business_name || contractorProfile.name;

      const alreadyExists = mergedBusinesses.some(
        (business) =>
          String(business.id || business.name || business.business_name) ===
            String(contractorProfile.id || contractorBusinessName) ||
          String(business.name || business.business_name).toLowerCase() ===
            String(contractorBusinessName).toLowerCase()
      );

      if (!alreadyExists) {
        mergedBusinesses.unshift({
          ...contractorProfile,
          id: contractorProfile.id || contractorBusinessName,
          name: contractorBusinessName,
          business_name: contractorBusinessName,
          category:
            contractorProfile.category ||
            contractorProfile.business_category ||
            "",
          location: contractorProfile.location || "",
          bio: contractorProfile.bio || "",
          imageUrl:
            contractorProfile.imageUrl ||
            contractorProfile.image_url ||
            contractorProfile.logo ||
            "",
          logo:
            contractorProfile.logo ||
            contractorProfile.image_url ||
            contractorProfile.imageUrl ||
            "",
          rating: contractorProfile.rating || "5.0",
          status:
            contractorProfile.status ||
            contractorProfile.businessStatus ||
            "active",
        });
      }
    }

    return mergedBusinesses;
  }

  const businesses = getSavedBusinesses().filter((business) => {
    const status = business?.status || business?.businessStatus || "active";

    return (
      business &&
      (business.name || business.business_name) &&
      status !== "closed"
    );
  });

  function getBusinessStatus(business) {
    return business?.status || business?.businessStatus || "active";
  }

  function isPausedBusiness(business) {
    return getBusinessStatus(business) === "paused";
  }

  const categories = [
    { value: "all", label: t("allProjects") },
    { value: "applianceRepair", label: t("applianceRepair") },
    { value: "automotiveServices", label: t("automotiveServices") },
    { value: "carDetailing", label: t("carDetailing") },
    { value: "carpentry", label: t("carpentry") },
    { value: "cleaning", label: t("cleaning") },
    { value: "concrete", label: t("concrete") },
    { value: "contractor", label: t("generalContractor") },
    { value: "demolition", label: t("demolition") },
    { value: "doorsWindows", label: t("doorsWindows") },
    { value: "drywall", label: t("drywall") },
    { value: "electrical", label: t("electrical") },
    { value: "fencing", label: t("fencing") },
    { value: "flooring", label: t("flooring") },
    { value: "handyman", label: t("handyman") },
    { value: "homeHealthCare", label: t("homeHealthCare") },
    { value: "hvac", label: t("hvac") },
    { value: "junkRemoval", label: t("junkRemoval") },
    { value: "landscaping", label: t("landscaping") },
    { value: "lawnCare", label: t("lawnCare") },
    { value: "mechanic", label: t("mechanic") },
    { value: "mobileServices", label: t("mobileServices") },
    { value: "moving", label: t("movingCompany") },
    { value: "painting", label: t("painting") },
    { value: "paverSealing", label: t("paverSealing") },
    { value: "pestControl", label: t("pestControl") },
    { value: "plumbing", label: t("plumbing") },
    { value: "poolService", label: t("poolService") },
    { value: "pressureWashing", label: t("pressureWashing") },
    { value: "privateTransportation", label: t("privateTransportation") },
    { value: "realEstate", label: t("realEstate") },
    { value: "roofing", label: t("roofing") },
    { value: "tile", label: t("tile") },
    { value: "treeService", label: t("treeService") },
    { value: "other", label: t("otherService") },
  ];

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    async function loadPosts() {
      try {
        const result = await authFetch(
          "/posts",
          {},
          setPage
        );

        if (result.response?.ok) {
          const data = result.data || {};
          const incomingPosts = Array.isArray(data)
            ? data
            : data.posts || [];

          setPosts(incomingPosts);
        } else {
          setPosts([]);
        }
      } catch (error) {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [language]);

  const professionalFilteredPosts = isProfessional
    ? posts.filter((post) => {
        const postCategory = String(post.category || "")
          .toLowerCase()
          .replace(/\s+/g, "");

        if (!normalizedBusinessCategory) return true;

        return postCategory === normalizedBusinessCategory;
      })
    : posts;

  const visiblePosts =
    !isProfessional && filter !== "all"
      ? professionalFilteredPosts.filter((post) => post.category === filter)
      : professionalFilteredPosts;

  function selectBusiness(business) {
    const selectedBusiness = {
      id: business.id || business.name,
      business_name: business.name,
      name: business.name,
      category: business.category || "",
      location: business.location || "",
      bio: business.bio || "",
      imageUrl: business.imageUrl || business.logo || "",
      logo: business.logo || business.imageUrl || "",
      rating: business.rating || "5.0",
      status: getBusinessStatus(business),
      businessStatus: getBusinessStatus(business),
    };

    localStorage.setItem("selectedContractor", JSON.stringify(selectedBusiness));

    return selectedBusiness;
  }

  function viewBusinessProfile(business) {
    selectBusiness(business);
    setPage("contractorDetails");
  }

  function messageBusiness(event, business) {
    event.stopPropagation();

    if (isPausedBusiness(business)) {
      alert(
        language === "es"
          ? "Este negocio está pausado y no acepta nuevas solicitudes en este momento."
          : "This business is paused and is not accepting new requests right now."
      );
      return;
    }

    const selectedBusiness = selectBusiness(business);

    localStorage.removeItem("selectedQuoteRequest");
    localStorage.removeItem("selectedMessageReceiverId");
    localStorage.removeItem("conversationBusinessName");

    localStorage.setItem(
      "selectedMessageReceiverId",
      String(selectedBusiness.id)
    );
    localStorage.setItem(
      "conversationBusinessName",
      selectedBusiness.business_name
    );

    const currentUserKey =
      localStorage.getItem("userId") ||
      localStorage.getItem("userEmail") ||
      "guest";

    const safeUserKey = String(currentUserKey)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const conversationId = `business_${selectedBusiness.id}_${safeUserKey}`;

    localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem(
      "activeConversationName",
      selectedBusiness.business_name || "Business"
    );
    localStorage.setItem("meetroConversationType", "business");

    const registry = JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );

    const registryItem = {
      id: conversationId,
      project_title: selectedBusiness.business_name || "Business",
      project_description:
        selectedBusiness.category ||
        "Saved business conversation for future work.",
      homeowner_email: selectedBusiness.business_name || "Business",
      location: selectedBusiness.location || "Saved Business",
      status: "Saved Business",
      unread: false,
      conversation_type: "business",
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "meetro_conversation_registry",
      JSON.stringify([
        registryItem,
        ...registry.filter((item) => String(item.id) !== conversationId),
      ])
    );

    window.dispatchEvent(new Event("meetro-messages-updated"));

    setPage("conversationThread");
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <p style={heroEyebrow}>{t("discover")}</p>

        <h1 style={heroTitle}>
          {isBusinessDirectory ? t("findContractors") : t("localProjectFeed")}
        </h1>

        <p style={heroText}>
          {isBusinessDirectory
            ? t("findContractorsText")
            : t("discoverSubtitle")}
        </p>

        {isBusinessDirectory && (
          <button style={postButton} onClick={() => setPage("upload")}>
            + {t("postAProject")}
          </button>
        )}
      </div>

      {!isBusinessDirectory && (
        <div style={categoryRowWrapper}>
          <button style={scrollButton} onClick={() => scrollCategories("left")}>
            ‹
          </button>

          <div ref={categoryScrollRef} style={categoryRow}>
            {categories.map((category) => {
              const active =
                isProfessional && normalizedBusinessCategory
                  ? category.value.toLowerCase() === normalizedBusinessCategory
                  : filter === category.value;

              if (isProfessional && normalizedBusinessCategory) {
                const categoryValue = category.value.toLowerCase();

                if (
                  category.value !== "all" &&
                  categoryValue !== normalizedBusinessCategory
                ) {
                  return null;
                }
              }

              return (
                <button
                  key={category.value}
                  onClick={() => {
                    if (!isProfessional) setFilter(category.value);
                  }}
                  style={{
                    ...categoryButton,
                    ...(active ? activeCategoryButton : {}),
                  }}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          <button style={scrollButton} onClick={() => scrollCategories("right")}>
            ›
          </button>
        </div>
      )}

      {isBusinessDirectory ? (
        <>
          <div style={directoryHeader}>
            <h2 style={directoryTitle}>
              {language === "es" ? "Negocios Cercanos" : "Nearby Businesses"}
            </h2>

            <p style={directorySubtitle}>
              {language === "es"
                ? "Explora negocios locales y profesionales cerca de ti."
                : "Browse local businesses and professionals near you."}
            </p>
          </div>

          <div style={feedList}>
            {businesses.length === 0 ? (
              <div style={emptyCard}>
                <h2 style={emptyTitle}>
                  {language === "es"
                    ? "No hay negocios disponibles"
                    : "No available businesses"}
                </h2>

                <p style={emptyText}>
                  {language === "es"
                    ? "Los negocios activos aparecerán aquí cuando estén disponibles."
                    : "Active businesses will appear here when available."}
                </p>
              </div>
            ) : (
              businesses.map((business) => {
                const businessStatus = getBusinessStatus(business);
                const paused = businessStatus === "paused";

                return (
                  <div
                    key={business.id || business.name}
                    style={{
                      ...businessDirectoryCard,
                      ...(paused ? pausedBusinessCard : {}),
                    }}
                    onClick={() => viewBusinessProfile(business)}
                  >
                    <div style={businessLogoWrap}>
                      {business.logo || business.imageUrl ? (
                        <img
                          src={business.logo || business.imageUrl}
                          alt={business.name}
                          style={businessLogo}
                        />
                      ) : (
                        <div style={businessLogoFallback}>🏢</div>
                      )}
                    </div>

                    <div style={businessCardBody}>
                      <div style={businessCardTop}>
                        <h2 style={businessCardTitle}>
                          {business.name || t("businessNameNotSet")}
                        </h2>

                        <span style={ratingPill}>
                          ⭐ {business.rating || "5.0"}
                        </span>
                      </div>

                      <p style={businessCardLocation}>
                        📍 {business.location || t("locationNotSet")}
                      </p>

                      <div style={businessTrustRow}>
                        <span style={trustMini}>✓ {t("verified")}</span>

                        {paused ? (
                          <span style={pausedMini}>
                            🟡{" "}
                            {language === "es"
                              ? "No acepta solicitudes"
                              : "Not accepting requests"}
                          </span>
                        ) : (
                          <>
                            <span style={trustMini}>⚡ {t("fastResponse")}</span>
                            <span style={trustMini}>🚐 {t("dispatchReady")}</span>
                          </>
                        )}
                      </div>

                      <div style={businessActionRow}>
                        <button
                          style={businessSecondaryButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            viewBusinessProfile(business);
                          }}
                        >
                          {language === "es" ? "Ver Perfil" : "View Profile"}
                        </button>

                        <button
                          style={{
                            ...businessPrimaryButton,
                            ...(paused ? disabledMessageButton : {}),
                          }}
                          onClick={(event) => messageBusiness(event, business)}
                        >
                          {paused
                            ? language === "es"
                              ? "Pausado"
                              : "Paused"
                            : t("message")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>
              {isProfessional ? t("matchingOpenRequests") : t("openRequests")}
            </h2>

            <p style={sectionSubtitle}>
              {visiblePosts.length}{" "}
              {visiblePosts.length === 1
                ? t("projectAvailable")
                : t("projectsAvailable")}
            </p>
          </div>

          <div style={feedList}>
            {visiblePosts.length === 0 ? (
              <div style={emptyCard}>
                <h2 style={emptyTitle}>{t("noMatchingRequestsYet")}</h2>
                <p style={emptyText}>{t("newLeadsWillAppearHere")}</p>
              </div>
            ) : (
              visiblePosts.map((post) => (
                <div key={post.id} style={postCard}>
                  <img
                    src={post.image}
                    alt={post.title}
                    style={postImage}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />

                  <div style={postBody}>
                    <div style={postTopRow}>
                      <span style={categoryPill}>
                        {categories.find((cat) => cat.value === post.category)
                          ?.label || post.category}
                      </span>

                      <span style={datePill}>{post.date || t("today")}</span>
                    </div>

                    <h2 style={postTitle}>{post.title}</h2>
                    <p style={postDescription}>{post.description}</p>

                    <p style={locationText}>
                      📍 {post.location || t("localArea")}
                    </p>

                    <p style={statusText}>
                      🟢 {post.status || t("openRequest")}
                    </p>

                    <div style={actionRow}>
                      <button
                        style={secondaryButton}
                        onClick={() => setPage("projectDetails")}
                      >
                        {t("viewDetails")}
                      </button>

                      <button
                        style={primaryButton}
                        onClick={() => setPage("messagesInbox")}
                      >
                        {t("messageQuote")}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <BottomNav setPage={setPage} currentPage="discover" />
    </div>
  );
}

const businessDirectoryCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  marginBottom: "18px",
  display: "grid",
  gridTemplateColumns: "90px 1fr",
  gap: "18px",
  alignItems: "start",
  cursor: "pointer",
  boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
};

const pausedBusinessCard = {
  opacity: 0.92,
  border: "1px solid #f59e0b",
};

const businessLogoWrap = {
  width: "86px",
  height: "86px",
  borderRadius: "22px",
  overflow: "hidden",
  marginTop: "18px",
  background: "#f5f3ff",
};

const businessCardTitle = {
  margin: "10px 0",
  fontSize: "18px",
  lineHeight: 1.2,
  fontWeight: "900",
  color: "#111827",
};

const businessLogo = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const businessLogoFallback = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#5b35f5",
  fontSize: "34px",
  fontWeight: "900",
};

const businessCardBody = {
  minWidth: 0,
};

const businessCardTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "8px",
  flexWrap: "wrap",
};

const ratingPill = {
  background: "#fff7df",
  color: "#8a6500",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "13px",
};

const businessCardLocation = {
  margin: "0 0 12px",
  color: "#6b7280",
  fontWeight: "700",
};

const businessTrustRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "14px",
};

const trustMini = {
  background: "#f5f3ff",
  color: "#5b35f5",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const pausedMini = {
  background: "#fffbeb",
  color: "#92400e",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const businessActionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const businessPrimaryButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#5b35f5",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledMessageButton = {
  background: "#f59e0b",
  cursor: "not-allowed",
};

const businessSecondaryButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#eee7ff",
  color: "#5b35f5",
  fontWeight: "900",
  cursor: "pointer",
};

const pageWrapper = {
  minHeight: "100vh",
  background: "#f4f3f8",
  padding: "24px 18px 120px",
  maxWidth: "1100px",
  margin: "0 auto",
};

const heroCard = {
  background: "linear-gradient(135deg, #5b35f5, #8257ff)",
  borderRadius: "28px",
  padding: "34px 24px",
  color: "white",
  textAlign: "center",
  boxShadow: "0 18px 40px rgba(91, 53, 245, 0.25)",
};

const heroEyebrow = {
  fontSize: "14px",
  fontWeight: "800",
  letterSpacing: "0.5px",
  marginBottom: "14px",
};

const heroTitle = {
  fontSize: "36px",
  lineHeight: "1.1",
  margin: "0 0 14px",
  color: "#0b0b0f",
  fontWeight: "900",
};

const heroText = {
  fontSize: "17px",
  lineHeight: "1.5",
  margin: "0 auto 24px",
  maxWidth: "760px",
  color: "white",
};

const postButton = {
  border: "none",
  background: "white",
  color: "#5b35f5",
  borderRadius: "18px",
  padding: "14px 22px",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const categoryRowWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  margin: "22px 0",
};

const categoryRow = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  scrollBehavior: "smooth",
  flex: 1,
  padding: "2px 0",
};

const scrollButton = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  border: "none",
  background: "white",
  color: "#5b35f5",
  fontSize: "28px",
  fontWeight: "900",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const categoryButton = {
  border: "none",
  background: "white",
  color: "#333",
  borderRadius: "999px",
  padding: "13px 20px",
  fontSize: "14px",
  fontWeight: "800",
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
};

const activeCategoryButton = {
  background: "#5b35f5",
  color: "white",
};

const sectionHeader = {
  textAlign: "center",
  margin: "24px 0 18px",
};

const sectionTitle = {
  fontSize: "30px",
  fontWeight: "900",
  margin: "0 0 6px",
  color: "#111",
};

const sectionSubtitle = {
  fontSize: "18px",
  color: "#666",
  margin: 0,
};

const feedList = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const postCard = {
  background: "white",
  borderRadius: "24px",
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
};

const postImage = {
  width: "100%",
  height: "280px",
  objectFit: "cover",
  display: "block",
};

const postBody = {
  padding: "18px",
};

const postTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const categoryPill = {
  background: "#f0eaff",
  color: "#5b35f5",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "capitalize",
};

const datePill = {
  background: "#f3f3f3",
  color: "#555",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "800",
};

const postTitle = {
  fontSize: "24px",
  fontWeight: "900",
  margin: "10px 0 6px",
  textAlign: "center",
  color: "#111",
};

const postDescription = {
  fontSize: "17px",
  color: "#666",
  margin: "0 0 14px",
  textAlign: "center",
};

const locationText = {
  fontSize: "16px",
  fontWeight: "800",
  color: "#333",
  textAlign: "center",
  margin: "8px 0",
};

const statusText = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#333",
  textAlign: "center",
  margin: "8px 0 18px",
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const secondaryButton = {
  border: "none",
  background: "#f0eaff",
  color: "#5b35f5",
  borderRadius: "14px",
  padding: "14px",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const primaryButton = {
  border: "none",
  background: "#5b35f5",
  color: "white",
  borderRadius: "14px",
  padding: "14px",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const emptyCard = {
  background: "white",
  borderRadius: "24px",
  padding: "34px 20px",
  textAlign: "center",
  boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
};

const emptyTitle = {
  fontSize: "24px",
  fontWeight: "900",
  margin: "0 0 10px",
};

const emptyText = {
  fontSize: "16px",
  color: "#666",
  margin: 0,
};

const directoryHeader = {
  marginTop: "26px",
  marginBottom: "18px",
};

const directoryTitle = {
  fontSize: "28px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "6px",
};

const directorySubtitle = {
  color: "#6b7280",
  fontSize: "15px",
  fontWeight: "600",
};

export default Discover;
