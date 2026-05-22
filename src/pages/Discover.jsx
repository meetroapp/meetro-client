import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import API_URL from "../api";
import { getLanguage, t } from "../utils/language";

function Discover({ setPage, currentPage }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [language, updateLanguage] = useState(getLanguage());

  const userRole = localStorage.getItem("userRole") || "standard";
  const accountType = localStorage.getItem("accountType") || "homeowner";
  const businessCategory = localStorage.getItem("businessCategory") || "";

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

  const isProfessional =
    accountType === "professional" || professionalRoles.includes(userRole);

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

  const demoPosts = [
    {
      id: 1,
      title: t("demoPlumbingTitle"),
      description: t("demoPlumbingDescription"),
      category: "plumbing",
      location: "Cape Coral",
      date: "May 11",
      status: t("openRequest"),
      image:
        "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: 2,
      title: t("demoPaintingTitle"),
      description: t("demoPaintingDescription"),
      category: "painting",
      location: "Fort Myers",
      date: "May 11",
      status: t("openRequest"),
      image:
        "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: 3,
      title: t("demoDrywallTitle"),
      description: t("demoDrywallDescription"),
      category: "drywall",
      location: "Cape Coral",
      date: "May 12",
      status: t("openRequest"),
      image:
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: 4,
      title: t("demoFlooringTitle"),
      description: t("demoFlooringDescription"),
      category: "flooring",
      location: "Lehigh Acres",
      date: "May 12",
      status: t("openRequest"),
      image:
        "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=1200&q=80",
    },
  ];

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
    async function loadPosts() {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_URL}/posts`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });

        if (response.ok) {
          const data = await response.json();
          const incomingPosts = Array.isArray(data) ? data : data.posts || [];
          setPosts(incomingPosts.length > 0 ? incomingPosts : demoPosts);
        } else {
          setPosts(demoPosts);
        }
      } catch (error) {
        setPosts(demoPosts);
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <p style={heroEyebrow}>{t("discover")}</p>

        <h1 style={heroTitle}>
          {isProfessional ? t("localProjectFeed") : t("findLocalServices")}
        </h1>

        <p style={heroText}>
          {isProfessional
            ? t("professionalDiscoverText")
            : t("homeownerDiscoverText")}
        </p>

        {!isProfessional && (
          <button onClick={() => setPage("upload")} style={postButton}>
            {t("postProject")}
          </button>
        )}
      </div>

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

                <p style={locationText}>📍 {post.location || t("localArea")}</p>
                <p style={statusText}>🟢 {post.status || t("openRequest")}</p>

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

      <BottomNav setPage={setPage} currentPage="discover" />
    </div>
  );
}

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

export default Discover;
