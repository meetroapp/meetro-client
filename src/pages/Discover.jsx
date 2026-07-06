import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import MeetroIcon from "../components/MeetroIcon";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";
import { getHiringLocalJobOpenings } from "../utils/hiringCenterRegistry";
import { getLocalizedHiringJobDisplay } from "../utils/hiringDisplayTranslations";
import { isProfessionalSession, professionalRoles } from "../utils/session";
import {
  getStoredProfessionalMatchProfile,
  inferRequestCategory,
  normalizeServiceCategory,
} from "../utils/professionalRequestMatching";
import { canProfessionalSeeLocalLead } from "../utils/localLeadVisibility";
import { searchRequestServices } from "../utils/requestIntelligence";
import { getBusinessServicesProjection } from "../utils/businessServiceProfile";
import { getBusinessVerificationProjection } from "../utils/businessVerification";
import { getBusinessPortfolioProofProjection } from "../utils/businessPortfolioProof";

function Discover({ setPage, currentPage }) {
  const [discoverMode, setDiscoverMode] = useState("communityHub");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [language, updateLanguage] = useState(getLanguage());

  const userRole = localStorage.getItem("userRole") || "standard";
  const businessCategory = localStorage.getItem("businessCategory") || "";

  const isProfessional =
    isProfessionalSession();

  const professionalMatchProfile = {
    ...getStoredProfessionalMatchProfile(),
    businessCategory,
    category: businessCategory,
  };
  const normalizedProfessionalCategory = normalizeServiceCategory(businessCategory);

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

  const visibleBusinesses =
    !isProfessional && filter !== "all"
      ? businesses.filter((business) =>
          {
            const services = getBusinessServicesProjection(business, {
              translate: (key) => t(key, language),
            });

            return canProfessionalSeeLocalLead(
              {
                ...business,
                businessCategory:
                  business.category ||
                  business.business_category ||
                  services.categories[0] ||
                  "",
                category:
                  business.category ||
                  business.business_category ||
                  services.categories[0] ||
                  "",
                serviceSpecialties: services.serviceIds,
                businessServiceSpecialties: services.serviceIds,
                serviceCategories: services.categories,
                businessServiceCategories: services.categories,
                serviceCapabilities: services.capabilities,
                businessServiceCapabilities: services.capabilities,
              },
              { category: filter }
            );
          }
        )
      : businesses;

  const marketplaceCategories = [
    { value: "all", label: t("discoverCategoryAll", language), route: null },
    { value: "handyman", label: t("handyman", language), route: null },
    { value: "plumbing", label: t("plumbing", language), route: null },
    { value: "electrical", label: t("electrical", language), route: null },
    { value: "painting", label: t("painting", language), route: null },
    { value: "cleaning", label: t("cleaning", language), route: null },
    { value: "landscaping", label: t("landscaping", language), route: null },
    { value: "emergency", label: t("emergency", language), route: "emergency" },
    { value: "jobsHiring", label: t("jobsHiringTitle", language), route: "jobsHiring" },
  ];

  function getBusinessDisplayCategory(business = {}) {
    const services = getBusinessServicesProjection(business, {
      translate: (key) => t(key, language),
    });

    return (
      services.shortSummary ||
      business.category ||
      business.business_category ||
      business.serviceCategory ||
      business.primaryCategory ||
      t("homeLocalService", language)
    );
  }

  function getBusinessServiceArea(business = {}) {
    return (
      business.serviceArea ||
      business.service_area ||
      business.location ||
      business.city ||
      t("homeLocalArea", language)
    );
  }

  function businessMatchesCategory(business = {}, categoryValue = "all") {
    if (categoryValue === "all") return true;

    const normalizedCategory = normalizeServiceCategory(categoryValue);
    const services = getBusinessServicesProjection(business, {
      translate: (key) => t(key, language),
    });
    const fields = [
      ...services.serviceIds,
      ...services.categories,
      ...services.displayLabels,
      ...services.matchingKeywords,
      business.category,
      business.business_category,
      business.serviceCategory,
      business.primaryCategory,
    ];

    return fields.some(
      (field) =>
        normalizeServiceCategory(field) === normalizedCategory ||
        String(field || "").toLowerCase().includes(String(categoryValue).toLowerCase())
    );
  }

  function businessMatchesSearch(business = {}, query = "") {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    const interpretedServices = searchRequestServices(query, {
      translate: (key) => t(key, language),
      limit: 3,
    });
    const matchesInterpretedService = interpretedServices.some((service) =>
      canProfessionalSeeLocalLead(
        {
          ...business,
          businessCategory:
            business.category || business.business_category || "",
          category: business.category || business.business_category || "",
        },
        {
          category: service.requestCategory,
          serviceDomain: service.domain,
          service_specialty: service.serviceId,
          specialty: service.serviceId,
        }
      )
    );

    if (matchesInterpretedService) return true;

    const services = getBusinessServicesProjection(business, {
      translate: (key) => t(key, language),
    });
    const searchableFields = [
      business.name,
      business.business_name,
      business.category,
      business.business_category,
      business.serviceCategory,
      business.primaryCategory,
      business.specialty,
      business.location,
      business.serviceArea,
      business.service_area,
      business.city,
      business.rating,
      business.reviewCount,
      business.availability,
      business.status,
      business.bio,
      business.description,
      services.shortSummary,
      services.publicSummary,
      ...services.matchingKeywords,
      ...(Array.isArray(business.serviceCities) ? business.serviceCities : []),
    ];

    return searchableFields.some((field) =>
      String(field || "").toLowerCase().includes(normalizedQuery)
    );
  }

  const marketplaceBusinesses = visibleBusinesses.filter(
    (business) =>
      businessMatchesCategory(business, filter) &&
      businessMatchesSearch(business, searchQuery)
  );
  const featuredBusinesses = businesses.filter((business) => !isPausedBusiness(business));
  const communityBusinessPreview = (featuredBusinesses.length ? featuredBusinesses : businesses).slice(0, 3);
  const hiringPreviewJobs = getHiringLocalJobOpenings().slice(0, 3);
  const spotlightPreviewBusiness = communityBusinessPreview[0] || businesses[0] || null;
  const spotlightBusinessCount = businesses.filter(
    (business) => !isPausedBusiness(business)
  ).length;
  const hasSpotlightStory = Boolean(spotlightPreviewBusiness);
  const spotlightBusinessName =
    spotlightPreviewBusiness?.name ||
    spotlightPreviewBusiness?.business_name ||
    t("communitySpotlightLocalProfessional", language);
  const communitySpotlightStory = spotlightPreviewBusiness
    ? {
        title: t("communitySpotlightStoryTitle", language),
        text: t("communitySpotlightStoryText", language).replace(
          "{business}",
          spotlightBusinessName
        ),
        meta: `${getBusinessDisplayCategory(spotlightPreviewBusiness)} · ${getBusinessServiceArea(spotlightPreviewBusiness)}`,
      }
    : {
        title: t("communitySpotlightStoryFallbackTitle", language),
        text: t("communitySpotlightStoryFallbackText", language),
        meta: t("communitySpotlightStoryFallbackMeta", language),
      };
  const communitySpotlightBusinessLabel =
    spotlightBusinessCount === 1
      ? t("communitySpotlightBusinessSingular", language)
      : t("communitySpotlightBusinessPlural", language);
  const communitySpotlightCountMeta = t(
    "communitySpotlightCountMeta",
    language
  )
    .replace("{count}", String(spotlightBusinessCount))
    .replace("{businessLabel}", communitySpotlightBusinessLabel);

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
    { value: "propertyManagement", label: t("propertyManagement") },
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
    ? posts.filter((post) =>
        canProfessionalSeeLocalLead(professionalMatchProfile, post)
      )
    : posts;

  const visiblePosts =
    !isProfessional && filter !== "all"
      ? professionalFilteredPosts.filter(
          (post) =>
            inferRequestCategory(post) === normalizeServiceCategory(filter)
        )
      : professionalFilteredPosts;

  function selectBusiness(business) {
    const businessName = business.name || business.business_name || "";
    const services = getBusinessServicesProjection(business, {
      translate: (key) => t(key, language),
    });
    const proof = getBusinessPortfolioProofProjection(business, {
      translate: (key) => t(key, language),
    });

    const selectedBusiness = {
      id: business.id || businessName,
      business_name: businessName,
      name: businessName,
      category: services.shortSummary || business.category || "",
      serviceSpecialties: services.serviceIds,
      businessServiceSpecialties: services.serviceIds,
      serviceCategories: services.categories,
      businessServiceCategories: services.categories,
      serviceCapabilities: services.capabilities,
      businessServiceCapabilities: services.capabilities,
      location: business.location || "",
      bio: business.bio || "",
      imageUrl: business.image_url || business.imageUrl || business.logo || "",
      logo: business.image_url || business.logo || business.imageUrl || "",
      rating: proof.averageRating || business.rating || "",
      reviewCount: proof.reviewCount || business.reviewCount || 0,
      status: getBusinessStatus(business),
      businessStatus: getBusinessStatus(business),
    };

    localStorage.setItem("selectedContractor", JSON.stringify(selectedBusiness));

    return selectedBusiness;
  }

  function viewBusinessProfile(business) {
    selectBusiness(business);
    localStorage.setItem("contractorDetailsReturnPage", "discover");
    setPage("contractorDetails");
  }

  function requestServiceFromBusiness(event, business) {
    event.stopPropagation();

    if (isPausedBusiness(business)) {
      alert(t("discoverPausedBusinessMessage", language));
      return;
    }

    const selectedBusiness = selectBusiness(business);

    localStorage.setItem("selectedProfessionalId", String(selectedBusiness.id || ""));
    localStorage.setItem(
      "selectedProfessionalName",
      selectedBusiness.business_name || selectedBusiness.name || ""
    );
    localStorage.setItem(
      "selectedProfessionalCategory",
      selectedBusiness.category || ""
    );
    localStorage.setItem(
      "selectedRequestProfessionalContext",
      JSON.stringify({
        professionalId: selectedBusiness.id || "",
        professionalName:
          selectedBusiness.business_name || selectedBusiness.name || "",
        businessName: selectedBusiness.business_name || selectedBusiness.name || "",
        category: selectedBusiness.category || "",
        serviceArea: selectedBusiness.location || "",
        source: "discover",
      })
    );

    setPage("upload");
  }

  function messageBusiness(event, business) {
    event.stopPropagation();

    if (isPausedBusiness(business)) {
      alert(t("discoverPausedBusinessMessage", language));
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
      saved_to_history: false,
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

  const openCommunitySection = (section) => {
    setSearchQuery("");
    setFilter("all");
    setDiscoverMode(section);
  };

  const renderBusinessCard = (business) => {
    const businessStatus = getBusinessStatus(business);
    const paused = businessStatus === "paused";
    const category = getBusinessDisplayCategory(business);
    const serviceArea = getBusinessServiceArea(business);
    const verification = getBusinessVerificationProjection(business, {
      translate: (key) => t(key, language),
    });
    const portfolioProof = getBusinessPortfolioProofProjection(business, {
      translate: (key) => t(key, language),
    });
    const imageSource =
      business.image_url ||
      business.imageUrl ||
      business.coverImage ||
      business.cover_image ||
      business.logo ||
      "";

    return (
      <div
        key={business.id || business.name || business.business_name}
        style={{
          ...businessDirectoryCard,
          ...(paused ? pausedBusinessCard : {}),
        }}
        onClick={() => viewBusinessProfile(business)}
      >
        <div style={businessLogoWrap}>
          {imageSource ? (
            <img
              src={imageSource}
              alt={business.name || business.business_name}
              style={businessLogo}
            />
          ) : (
            <div style={businessLogoFallback}>
              {String(business.name || business.business_name || "M")
                .slice(0, 1)
                .toUpperCase()}
            </div>
          )}
        </div>

        <div style={businessCardBody}>
          <div style={businessCardTop}>
            <h2 style={businessCardTitle}>
              {business.name ||
                business.business_name ||
                t("businessNameNotSet")}
            </h2>

            <span style={ratingPill}>
              ★ {portfolioProof.averageRating || t("discoverRatingPending", language)}
            </span>
          </div>

          <p style={businessCategoryLine}>
            {category}
          </p>

          <div style={businessTrustRow}>
            <span style={verification.verified ? trustMini : pausedMini}>
              ✓ {verification.compactBadgeText}
            </span>

            {paused ? (
              <span style={pausedMini}>
                {t("discoverNotAcceptingRequests", language)}
              </span>
            ) : (
              <>
                <span style={trustMini}>{t("discoverAvailable", language)}</span>
                <span style={trustMini}>{t("discoverPortfolio", language)}</span>
              </>
            )}
          </div>

          <p style={businessCardLocation}>
            {serviceArea}
          </p>

          <div style={businessActionRow}>
            <button
              style={businessSecondaryButton}
              onClick={(event) => {
                event.stopPropagation();
                viewBusinessProfile(business);
              }}
            >
              {t("homeViewProfile", language)}
            </button>

            <button
              style={{
                ...businessPrimaryButton,
                ...(paused ? disabledMessageButton : {}),
              }}
              onClick={(event) => requestServiceFromBusiness(event, business)}
            >
              {paused
                ? t("discoverPaused", language)
                : t("requestService", language)}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHiringPreviewCard = (job) => {
    const jobDisplay = getLocalizedHiringJobDisplay(job, language);

    return (
      <article key={job.id} style={communityHiringCard}>
        <div style={communityHiringTop}>
          <span style={communityHiringIcon}>
            <MeetroIcon name="jobsHiring" size={20} decorative />
          </span>
          <span style={communityHiringBadge}>{job.employmentType}</span>
        </div>
        <p style={communityHiringCategory}>{jobDisplay.category || job.category}</p>
        <h3 style={communityHiringTitle}>{jobDisplay.title || job.title}</h3>
        <p style={communityHiringBusiness}>{job.businessName}</p>
        <p style={communityHiringDescription}>{jobDisplay.description || job.description}</p>
        <div style={communityHiringMeta}>
          <span>{job.payRange}</span>
          <span>{job.location}</span>
        </div>
      </article>
    );
  };

  const renderCommunityHub = () => (
    <>
      <section className="meetro-visual-hero" style={communityHero}>
        <p style={headerEyebrow}>{t("communityTitle", language)}</p>
        <h1 style={compactTitle}>{t("communityTitle", language)}</h1>
        <p style={compactSubtitle}>
          {t("communitySubtitle", language)}
        </p>
      </section>

      <p style={communityGuideQuestion}>{t("communityGuideQuestion", language)}</p>

      <section
        style={communityPreviewStack}
        aria-label={t("communityPreviewAria", language)}
      >
        <section className="meetro-visual-surface" style={communityPreviewSection}>
          <div style={communityPreviewHeader}>
            <div>
              <h2 style={communityPreviewTitle}>
                {t("communityBusinessesTitle", language)}
              </h2>
              <p style={communityPreviewCopy}>
                {t("communityBusinessesCopy", language)}
              </p>
            </div>
          </div>

          <div style={communityBusinessPreviewGrid}>
            {communityBusinessPreview.length > 0 ? (
              communityBusinessPreview.map((business) => renderBusinessCard(business))
            ) : (
              <div className="meetro-visual-empty-state" style={communityWarmEmptyCard}>
                <h3 style={emptyTitle}>
                  {t("communityBusinessesEmptyTitle", language)}
                </h3>
                <p style={emptyText}>
                  {t("communityBusinessesEmptyText", language)}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            className="meetro-visual-primary-button"
            style={communitySectionAction}
            onClick={() => openCommunitySection("businessDirectory")}
          >
            {t("communityViewAllBusinesses", language)} →
          </button>
        </section>

        <section className="meetro-visual-surface" style={communityPreviewSection}>
          <div style={communityPreviewHeader}>
            <div>
              <h2 style={communityPreviewTitle}>
                {t("communityHiringTitle", language)}
              </h2>
              <p style={communityPreviewCopy}>
                {t("communityHiringCopy", language)}
              </p>
            </div>
          </div>

          <div style={communityHiringGrid}>
            {hiringPreviewJobs.length > 0 ? (
              hiringPreviewJobs.map((job) => renderHiringPreviewCard(job))
            ) : (
              <div className="meetro-visual-empty-state" style={communityHiringEmptyCard}>
                <h3 style={emptyTitle}>
                  {t("communityHiringEmptyTitle", language)}
                </h3>
                <p style={emptyText}>
                  {t("communityHiringEmptyText", language)}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            className="meetro-visual-primary-button"
            style={communitySectionAction}
            onClick={() => setPage("jobsHiring")}
          >
            {t("communityViewAllHiring", language)} →
          </button>
        </section>

        <section className="meetro-visual-surface" style={communityPreviewSection}>
          <div style={communityPreviewHeader}>
            <div>
              <h2 style={communityPreviewTitle}>
                {t("communitySpotlightTitle", language)}
              </h2>
              <p style={communityPreviewCopy}>
                {t("communitySpotlightCopy", language)}
              </p>
            </div>
          </div>

          <article style={communitySpotlightCard}>
            <p style={communitySpotlightEyebrow}>
              {t("communitySpotlightEyebrow", language)}
            </p>
            <h3 style={communitySpotlightTitle}>{communitySpotlightStory.title}</h3>
            <p style={communitySpotlightText}>{communitySpotlightStory.text}</p>
            <p style={communitySpotlightCue}>
              {t("communitySpotlightCue", language)}
            </p>
            <p style={communitySpotlightMeta}>{communitySpotlightStory.meta}</p>
          </article>

          <button
            type="button"
            className="meetro-visual-primary-button"
            style={communitySectionAction}
            onClick={() => openCommunitySection("spotlight")}
          >
            {t("communityExploreSpotlight", language)} →
          </button>
        </section>
      </section>
    </>
  );

  const renderSpotlightSection = () => (
    <>
      <button
        type="button"
        style={communityBackButton}
        onClick={() => openCommunitySection("communityHub")}
      >
        ← {t("communityTitle", language)}
      </button>

      <section className="meetro-visual-hero" style={spotlightPanel}>
        <p style={headerEyebrow}>{t("communitySpotlightTitle", language)}</p>
        <h1 style={compactTitle}>{t("communitySpotlightPageTitle", language)}</h1>
        <p style={compactSubtitle}>
          {t("communitySpotlightPageSubtitle", language)}
        </p>
        <p style={spotlightMeta}>{communitySpotlightCountMeta}</p>
      </section>

      <section
        style={spotlightStoryStack}
        aria-label={t("communitySpotlightStoryAria", language)}
      >
        <article style={communitySpotlightCard}>
          <p style={communitySpotlightEyebrow}>
            {hasSpotlightStory
              ? t("communitySpotlightFeaturedEyebrow", language)
              : t("communitySpotlightWarmupEyebrow", language)}
          </p>
          <h2 style={communitySpotlightTitle}>{communitySpotlightStory.title}</h2>
          <p style={communitySpotlightText}>{communitySpotlightStory.text}</p>
          <p style={communitySpotlightCue}>
            {hasSpotlightStory
              ? t("communitySpotlightCue", language)
              : t("communitySpotlightWarmupCue", language)}
          </p>
          <p style={communitySpotlightMeta}>{communitySpotlightStory.meta}</p>
        </article>

        <div style={spotlightPrincipleCard}>
          <MeetroIcon name="history" size={22} decorative />
          <div>
            <h2 style={spotlightPrincipleTitle}>
              {t("communitySpotlightPrincipleTitle", language)}
            </h2>
            <p style={spotlightPrincipleText}>
              {t("communitySpotlightPrincipleText", language)}
            </p>
          </div>
        </div>
      </section>
    </>
  );

  const renderBusinessesSection = () => (
    <>
      <button
        type="button"
        style={communityBackButton}
        onClick={() => openCommunitySection("communityHub")}
      >
        ← Community
      </button>

      <header style={compactHeader}>
        <p style={headerEyebrow}>{t("discoverMarketplaceEyebrow", language)}</p>
        <h1 style={compactTitle}>Businesses</h1>
        <p style={compactSubtitle}>{t("discoverMarketplaceSubtitle", language)}</p>
      </header>

      <section style={searchPanel} aria-label={t("discoverSearchLabel", language)}>
        <div style={searchBox}>
          <span style={searchIcon} aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("discoverSearchPlaceholder", language)}
            style={searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              style={clearSearchButton}
              onClick={() => setSearchQuery("")}
              aria-label={t("discoverClearSearch", language)}
            >
              ×
            </button>
          )}
        </div>
      </section>

      <div style={discoverCategoryNav} aria-label={t("discoverCategories", language)}>
        {marketplaceCategories.map((category) => (
          <button
            key={category.value}
            type="button"
            style={{
              ...discoverCategoryButton,
              ...(filter === category.value ? activeDiscoverCategoryButton : {}),
            }}
            onClick={() => {
              if (category.route) {
                setPage(category.route);
                return;
              }
              setFilter(category.value);
            }}
          >
            {category.label}
          </button>
        ))}
      </div>

      <section style={sectionHeader}>
        <h2 style={sectionTitle}>{t("discoverLocalServices", language)}</h2>
        <p style={sectionSubtitle}>
          {t("discoverResultsCount", language).replace(
            "{count}",
            marketplaceBusinesses.length
          )}
        </p>
      </section>

      <div className="meetro-responsive-grid meetro-grid-2" style={feedList}>
        {marketplaceBusinesses.length === 0 ? (
          <div style={emptyCard}>
            <h2 style={emptyTitle}>{t("discoverNoProsTitle", language)}</h2>
            <p style={emptyText}>{t("discoverNoProsText", language)}</p>
          </div>
        ) : (
          marketplaceBusinesses.map((business) => renderBusinessCard(business))
        )}
      </div>
    </>
  );

  return (
    <div className="app-page meetro-wide-page meetro-visual-page" style={pageWrapper}>
      {discoverMode === "businessDirectory" && renderBusinessesSection()}
      {discoverMode === "spotlight" && renderSpotlightSection()}
      {discoverMode === "communityHub" && renderCommunityHub()}

      <BottomNav setPage={setPage} currentPage="discover" />
    </div>
  );
}

const businessDirectoryCard = {
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "22px",
  padding: "14px",
  marginBottom: "10px",
  display: "grid",
  gridTemplateColumns: "62px 1fr",
  gap: "12px",
  alignItems: "start",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft)",
};

const communityHero = {
  background: "var(--meetro-gradient-community-hero)",
  border: "1px solid rgba(255,253,248,0.14)",
  borderRadius: "28px",
  padding: "24px",
  marginBottom: "18px",
  boxShadow: "var(--meetro-shadow-lifted)",
};

const communityHubGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: "14px",
};

const communityGuideQuestion = {
  margin: "0 0 12px",
  color: "var(--meetro-color-coffee)",
  fontSize: "14px",
  fontWeight: "900",
};

const communityPreviewStack = {
  display: "grid",
  gap: "18px",
  paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
};

const communityPreviewSection = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "26px",
  background: "var(--meetro-surface-paper)",
  padding: "16px",
  boxShadow: "var(--meetro-shadow-soft)",
};

const communityPreviewHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "14px",
};

const communityPreviewTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "22px",
  lineHeight: 1.08,
  fontWeight: "950",
  letterSpacing: 0,
};

const communityPreviewCopy = {
  margin: "6px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: "700",
};

const communityBusinessPreviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: "12px",
};

const communityWarmEmptyCard = {
  minHeight: "142px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "20px",
  background: "linear-gradient(135deg, var(--meetro-surface-warm), var(--meetro-surface-sage))",
  padding: "18px",
  display: "grid",
  alignContent: "center",
  gap: "8px",
  boxShadow: "var(--meetro-shadow-soft)",
};

const communitySectionAction = {
  width: "100%",
  minHeight: "46px",
  marginTop: "14px",
  border: "1px solid rgba(255,253,248,0.18)",
  borderRadius: "999px",
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
};

const communityHiringGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "12px",
};

const communityHiringCard = {
  display: "grid",
  gap: "9px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const communityHiringTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const communityHiringIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
};

const communityHiringBadge = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "11px",
  fontWeight: "900",
};

const communityHiringCategory = {
  margin: 0,
  color: "var(--meetro-color-wood)",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  letterSpacing: 0,
};

const communityHiringTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "18px",
  lineHeight: 1.12,
  fontWeight: "950",
  letterSpacing: 0,
};

const communityHiringBusiness = {
  margin: 0,
  color: "var(--meetro-color-coffee)",
  fontSize: "13px",
  fontWeight: "850",
};

const communityHiringDescription = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "650",
};

const communityHiringMeta = {
  display: "grid",
  gap: "6px",
  color: "var(--meetro-color-coffee)",
  fontSize: "12px",
  fontWeight: "800",
};

const communityHiringEmptyCard = {
  minHeight: "120px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "18px",
  background: "var(--meetro-surface-warm)",
  padding: "16px",
  display: "grid",
  alignContent: "center",
  gap: "8px",
  textAlign: "center",
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "800",
};

const communitySpotlightCard = {
  borderRadius: "22px",
  border: "1px solid rgba(183,121,31,0.24)",
  background:
    "linear-gradient(135deg, var(--meetro-surface-warm), var(--meetro-surface-paper))",
  padding: "18px",
  boxShadow: "0 12px 30px rgba(180,83,9,0.08)",
};

const communitySpotlightEyebrow = {
  margin: 0,
  color: "#b7791f",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  letterSpacing: 0,
};

const communitySpotlightTitle = {
  margin: "8px 0 0",
  color: "var(--meetro-color-ink)",
  fontSize: "22px",
  lineHeight: 1.12,
  fontWeight: "950",
  letterSpacing: 0,
};

const communitySpotlightText = {
  margin: "10px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const communitySpotlightCue = {
  margin: "14px 0 0",
  color: "var(--meetro-color-coffee)",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: "900",
};

const communitySpotlightMeta = {
  margin: "12px 0 0",
  width: "fit-content",
  maxWidth: "100%",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper)",
  border: "1px solid rgba(183,121,31,0.24)",
  color: "var(--meetro-color-coffee)",
  padding: "8px 10px",
  fontSize: "12px",
  lineHeight: 1.25,
  fontWeight: "900",
};

const communitySectionCard = {
  width: "100%",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "24px",
  background: "var(--meetro-surface-paper)",
  padding: "18px",
  display: "grid",
  gridTemplateColumns: "48px 1fr auto",
  alignItems: "center",
  gap: "14px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft)",
};

const communitySectionIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  display: "grid",
  placeItems: "center",
  fontWeight: "950",
  fontSize: "18px",
};

const communitySectionText = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
  color: "var(--meetro-color-ink)",
};

const communitySectionArrow = {
  color: "var(--meetro-color-forest)",
  fontSize: "20px",
  fontWeight: "950",
};

const communityBackButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "14px",
  boxShadow: "var(--meetro-shadow-soft)",
};

const spotlightPanel = {
  ...communityHero,
  background: "linear-gradient(135deg, var(--meetro-color-forest-deep), var(--meetro-color-forest))",
};

const spotlightMeta = {
  margin: "16px 0 0",
  width: "fit-content",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-coffee)",
  borderRadius: "999px",
  padding: "9px 12px",
  fontWeight: "900",
};

const spotlightStoryStack = {
  display: "grid",
  gap: "14px",
  paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
};

const spotlightPrincipleCard = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "22px",
  background: "var(--meetro-surface-paper)",
  padding: "16px",
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  gap: "12px",
  alignItems: "start",
  color: "var(--meetro-color-ink)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const spotlightPrincipleTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "16px",
  lineHeight: 1.2,
  fontWeight: "950",
  letterSpacing: 0,
};

const spotlightPrincipleText = {
  margin: "6px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const pausedBusinessCard = {
  opacity: 0.92,
  border: "1px solid #f59e0b",
};

const businessLogoWrap = {
  width: "60px",
  height: "60px",
  borderRadius: "16px",
  overflow: "hidden",
  marginTop: "2px",
  background: "var(--meetro-surface-sage)",
};

const businessCardTitle = {
  margin: "0",
  fontSize: "16px",
  lineHeight: 1.15,
  fontWeight: "900",
  color: "var(--meetro-color-ink)",
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
  color: "var(--meetro-color-forest)",
  fontSize: "24px",
  fontWeight: "900",
};

const businessCardBody = {
  minWidth: 0,
};

const businessCardTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "8px",
  marginBottom: "4px",
};

const ratingPill = {
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-coffee)",
  padding: "4px 8px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const businessCategoryLine = {
  margin: "2px 0 6px",
  color: "var(--meetro-color-forest)",
  fontSize: "12px",
  fontWeight: "900",
};

const businessCardLocation = {
  margin: "6px 0 8px",
  color: "var(--meetro-color-muted)",
  fontWeight: "700",
  fontSize: "12px",
  lineHeight: 1.25,
};

const businessTrustRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "5px",
  marginBottom: "4px",
};

const trustMini = {
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  padding: "4px 7px",
  borderRadius: "999px",
  fontSize: "11px",
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
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledMessageButton = {
  background: "#f59e0b",
  cursor: "not-allowed",
};

const businessSecondaryButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  padding: "12px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  fontWeight: "900",
  cursor: "pointer",
};

const pageWrapper = {
  minHeight: "100vh",
  background: "var(--meetro-gradient-community-page)",
  padding: "calc(env(safe-area-inset-top) + 64px) 18px 120px",
  maxWidth: "1100px",
  margin: "0 auto",
};

const compactHeader = {
  textAlign: "left",
  marginBottom: "16px",
  maxWidth: "680px",
};

const headerEyebrow = {
  margin: "0 0 6px",
  color: "var(--meetro-color-wood)",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const compactTitle = {
  margin: "0 0 6px",
  color: "var(--meetro-color-ink)",
  fontSize: "34px",
  lineHeight: 1,
  fontWeight: "950",
};

const compactSubtitle = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "16px",
  lineHeight: 1.35,
  fontWeight: "750",
};

const searchPanel = {
  margin: "14px 0 12px",
};

const searchBox = {
  display: "grid",
  gridTemplateColumns: "24px 1fr auto",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  maxWidth: "680px",
  minHeight: "50px",
  padding: "0 12px",
  borderRadius: "18px",
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-soft)",
  boxSizing: "border-box",
};

const searchIcon = {
  color: "var(--meetro-color-forest)",
  fontSize: "18px",
  fontWeight: "900",
};

const searchInput = {
  width: "100%",
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--meetro-color-ink)",
  fontSize: "15px",
  fontWeight: "750",
};

const clearSearchButton = {
  width: "30px",
  height: "30px",
  border: "none",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-ink)",
  fontSize: "20px",
  fontWeight: "900",
  lineHeight: 1,
  cursor: "pointer",
};

const heroCard = {
  background: "var(--meetro-gradient-community-hero)",
  borderRadius: "24px",
  padding: "18px 16px",
  color: "white",
  textAlign: "center",
  boxShadow: "var(--meetro-shadow-lifted)",
};

const heroEyebrow = {
  fontSize: "14px",
  fontWeight: "800",
  letterSpacing: "0.5px",
  marginBottom: "14px",
};

const heroTitle = {
  fontSize: "26px",
  lineHeight: "1.1",
  margin: "0 0 8px",
  color: "white",
  fontWeight: "900",
};

const heroText = {
  fontSize: "15px",
  lineHeight: "1.35",
  margin: "0 auto 12px",
  maxWidth: "520px",
  color: "rgba(255,255,255,0.92)",
};

const postButton = {
  border: "1px solid rgba(255,253,248,0.72)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  borderRadius: "16px",
  padding: "11px 18px",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const discoverCategoryNav = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  padding: "2px 0 8px",
  margin: "18px 0 6px",
};

const discoverCategoryButton = {
  flex: "0 0 auto",
  minHeight: "40px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  borderRadius: "999px",
  padding: "0 14px",
  fontSize: "13px",
  fontWeight: "900",
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
};

const activeDiscoverCategoryButton = {
  background: "var(--meetro-color-forest)",
  borderColor: "var(--meetro-color-forest)",
  color: "#fffdf8",
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
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  fontSize: "28px",
  fontWeight: "900",
  boxShadow: "var(--meetro-shadow-soft)",
  cursor: "pointer",
};

const categoryButton = {
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  borderRadius: "999px",
  padding: "13px 20px",
  fontSize: "14px",
  fontWeight: "800",
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft)",
};

const activeCategoryButton = {
  background: "var(--meetro-color-forest)",
  color: "#fffdf8",
};

const sectionHeader = {
  textAlign: "center",
  margin: "24px 0 18px",
};

const sectionTitle = {
  fontSize: "30px",
  fontWeight: "900",
  margin: "0 0 6px",
  color: "var(--meetro-color-ink)",
};

const sectionSubtitle = {
  fontSize: "18px",
  color: "var(--meetro-color-muted)",
  margin: 0,
};

const feedList = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: "20px",
};

const postCard = {
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "24px",
  overflow: "hidden",
  boxShadow: "var(--meetro-shadow-soft)",
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
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "capitalize",
};

const datePill = {
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-coffee)",
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
  color: "var(--meetro-color-ink)",
};

const postDescription = {
  fontSize: "17px",
  color: "var(--meetro-color-muted)",
  margin: "0 0 14px",
  textAlign: "center",
};

const locationText = {
  fontSize: "16px",
  fontWeight: "800",
  color: "var(--meetro-color-ink)",
  textAlign: "center",
  margin: "8px 0",
};

const statusText = {
  fontSize: "16px",
  fontWeight: "900",
  color: "var(--meetro-color-ink)",
  textAlign: "center",
  margin: "8px 0 18px",
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const secondaryButton = {
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  borderRadius: "14px",
  padding: "14px",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const primaryButton = {
  border: "none",
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  borderRadius: "14px",
  padding: "14px",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const emptyCard = {
  background: "var(--meetro-surface-warm)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "24px",
  padding: "34px 20px",
  textAlign: "center",
  boxShadow: "var(--meetro-shadow-soft)",
};

const emptyTitle = {
  fontSize: "24px",
  fontWeight: "900",
  margin: "0 0 10px",
};

const emptyText = {
  fontSize: "16px",
  color: "var(--meetro-color-muted)",
  margin: 0,
};

const directoryHeader = {
  marginTop: "26px",
  marginBottom: "18px",
};

const directoryTitle = {
  fontSize: "28px",
  fontWeight: "900",
  color: "var(--meetro-color-ink)",
  marginBottom: "6px",
};

const directorySubtitle = {
  color: "#6b7280",
  fontSize: "15px",
  fontWeight: "600",
};

export default Discover;
