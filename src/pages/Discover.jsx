import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import API_URL from "../api";
import { getLanguage, t } from "../utils/language";
import { normalizeServiceCategory } from "../utils/professionalRequestMatching";
import { canProfessionalSeeLocalLead } from "../utils/localLeadVisibility";
import { searchRequestServices } from "../utils/requestIntelligence";
import { getBusinessServicesProjection } from "../utils/businessServiceProfile";
import {
  DISCOVER_DIRECTORY_STATUS,
  createInitialDiscoverDirectoryState,
  createLoadingDiscoverDirectoryState,
  fetchDiscoverDirectory,
} from "../utils/discoverDirectoryState";
import {
  getCommunityDiscoveryInterestsFromTaxonomy,
  resolveCommunityDiscoveryInterestForSearch,
  searchCommunityTaxonomyAliases,
} from "../utils/communityTaxonomy";

const COMMUNITY_PREVIEW_LIMIT = 3;
const collapsedCommunitySections = Object.freeze({
  professionals: false,
  hiring: false,
  spotlight: false,
});

function Discover({ setPage }) {
  const [discoverMode, setDiscoverMode] = useState("communityHub");
  const [directoryState, setDirectoryState] = useState(
    createInitialDiscoverDirectoryState
  );
  const [directoryReload, setDirectoryReload] = useState(0);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState(() => {
    const pendingQuery = localStorage.getItem("meetroCommunityDiscoveryQuery") || "";
    if (pendingQuery) localStorage.removeItem("meetroCommunityDiscoveryQuery");
    return pendingQuery;
  });
  const [language, updateLanguage] = useState(getLanguage());
  const [selectedDiscoveryInterests, setSelectedDiscoveryInterests] = useState(
    () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("meetroCommunityDiscoveryInterests") || "[]"
        );
        const taxonomyMatch = resolveCommunityDiscoveryInterestForSearch(searchQuery);
        return taxonomyMatch?.ecosystemId
          ? [taxonomyMatch.ecosystemId]
          : Array.isArray(stored)
          ? stored
          : [];
      } catch {
        return [];
      }
    }
  );
  const [showDiscoveryInterestPrompt, setShowDiscoveryInterestPrompt] = useState(
    () => localStorage.getItem("meetroCommunityDiscoveryInterestsSeen") !== "true"
  );
  const [expandedCommunitySections, setExpandedCommunitySections] = useState(
    collapsedCommunitySections
  );

  const businesses =
    directoryState.status === DISCOVER_DIRECTORY_STATUS.RESULTS
      ? directoryState.records
      : [];

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

  const discoveryInterests = getCommunityDiscoveryInterestsFromTaxonomy({
    translate: (key, fallback) => {
      const translated = t(key, language);
      return translated || fallback;
    },
  });

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
      ""
    );
  }

  function getBusinessServiceArea(business = {}) {
    return (
      business.serviceArea ||
      business.service_area ||
      business.location ||
      business.city ||
      ""
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
      business.bio,
      business.description,
      services.shortSummary,
      services.publicSummary,
      ...services.serviceIds,
      ...services.categories,
      ...services.displayLabels,
      ...services.capabilities,
      ...services.matchingKeywords,
      ...(Array.isArray(business.serviceCities) ? business.serviceCities : []),
    ];

    const directMatch = searchableFields.some((field) =>
      String(field || "").toLowerCase().includes(normalizedQuery)
    );
    if (directMatch) return true;

    const taxonomyMatches = searchCommunityTaxonomyAliases(query);
    const taxonomyBusinessTerms = taxonomyMatches.flatMap((ecosystem) =>
      [
        ecosystem.id,
        ecosystem.label,
        ...ecosystem.aliases,
        ...ecosystem.children.flatMap((item) => [
          item.id,
          item.label,
          item.capabilityGroupId,
          item.legacySignupValue,
          ...item.aliases,
        ]),
      ]
    );

    return taxonomyBusinessTerms.some((term) =>
      searchableFields.some((field) =>
        String(field || "").toLowerCase().includes(String(term || "").toLowerCase())
      )
    );
  }

  function spotlightMatchesSearch(query = "") {
    return Boolean(
      query.trim() &&
        t("communitySpotlightTitle", language)
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    );
  }

  function getDiscoveryInterest(interestId) {
    return discoveryInterests.find((interest) => interest.id === interestId);
  }

  function getDiscoveryContext() {
    const selectedInterests = selectedDiscoveryInterests
      .map((interestId) => getDiscoveryInterest(interestId))
      .filter(Boolean);

    if (selectedInterests.length === 0) {
      return {
        title: t("communityDiscoveryContextAllTitle", language),
        copy: t("communityDiscoveryContextAllCopy", language),
      };
    }

    const selectedLabels = selectedInterests.map((interest) => interest.label);
    const selectedLabelText = selectedLabels.join(", ");
    const copyKey =
      selectedInterests.length === 1
        ? "communityDiscoveryContextSingleCopy"
        : "communityDiscoveryContextMultiCopy";

    return {
      title: t("communityDiscoveryContextExploring", language, {
        interest: selectedLabelText,
      }),
      copy: t(copyKey, language, {
        interest: selectedLabelText,
        interests: selectedLabelText,
      }),
    };
  }

  function entryMatchesDiscoveryInterest(entry, interestId, matcher) {
    const interest = getDiscoveryInterest(interestId);
    if (!interest) return false;

    return interest.keywords.some((keyword) => matcher(entry, keyword));
  }

  function queryMatchesDiscoveryInterest(query, interestId) {
    const interest = getDiscoveryInterest(interestId);
    const normalizedQuery = query.trim().toLowerCase();
    if (!interest || !normalizedQuery) return false;

    return [interest.label, ...interest.keywords].some((field) =>
      String(field || "").toLowerCase().includes(normalizedQuery)
    );
  }

  function orderByDiscoveryInterests(items, matcher) {
    if (selectedDiscoveryInterests.length === 0) return items;

    const prioritized = [];
    const remaining = [];

    items.forEach((item) => {
      if (
        selectedDiscoveryInterests.some((interestId) =>
          entryMatchesDiscoveryInterest(item, interestId, matcher)
        )
      ) {
        prioritized.push(item);
      } else {
        remaining.push(item);
      }
    });

    return [...prioritized, ...remaining];
  }

  function getCommunitySectionOrder(sectionId) {
    const baseOrder = {
      businesses: 30,
      hiring: 40,
      spotlight: 50,
    };
    const searchTerm = searchQuery.trim();
    let score = baseOrder[sectionId] || 60;

    selectedDiscoveryInterests.forEach((interestId) => {
      const interest = getDiscoveryInterest(interestId);
      if (interest?.section === sectionId) score -= 20;
    });

    if (searchTerm) {
      const sectionHasSearchMatch =
        (sectionId === "businesses" && communitySearchBusinesses.length > 0) ||
        (sectionId === "spotlight" && spotlightMatchesSearch(searchTerm));

      if (sectionHasSearchMatch) score -= 12;

      selectedDiscoveryInterests.forEach((interestId) => {
        const interest = getDiscoveryInterest(interestId);
        if (
          interest?.section === sectionId &&
          queryMatchesDiscoveryInterest(searchTerm, interestId)
        ) {
          score -= 10;
        }
      });
    }

    return score;
  }

  function saveDiscoveryInterests(nextInterests, markSeen = true) {
    setSelectedDiscoveryInterests(nextInterests);
    setExpandedCommunitySections(collapsedCommunitySections);
    localStorage.setItem(
      "meetroCommunityDiscoveryInterests",
      JSON.stringify(nextInterests)
    );

    if (markSeen) {
      localStorage.setItem("meetroCommunityDiscoveryInterestsSeen", "true");
      setShowDiscoveryInterestPrompt(false);
    }
  }

  function toggleDiscoveryInterest(interestId) {
    const nextInterests = selectedDiscoveryInterests.includes(interestId)
      ? selectedDiscoveryInterests.filter((id) => id !== interestId)
      : [...selectedDiscoveryInterests, interestId];

    saveDiscoveryInterests(nextInterests);
  }

  function skipDiscoveryInterests() {
    localStorage.setItem("meetroCommunityDiscoveryInterestsSeen", "true");
    setShowDiscoveryInterestPrompt(false);
  }

  function updateSearchQuery(nextQuery) {
    setSearchQuery(nextQuery);
    setExpandedCommunitySections(collapsedCommunitySections);

    const taxonomyMatch = resolveCommunityDiscoveryInterestForSearch(nextQuery);
    if (
      taxonomyMatch?.ecosystemId &&
      discoveryInterests.some((interest) => interest.id === taxonomyMatch.ecosystemId) &&
      !(
        selectedDiscoveryInterests.length === 1 &&
        selectedDiscoveryInterests[0] === taxonomyMatch.ecosystemId
      )
    ) {
      saveDiscoveryInterests([taxonomyMatch.ecosystemId]);
    }
  }

  function toggleCommunitySectionExpansion(sectionId) {
    setExpandedCommunitySections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  const marketplaceBusinesses = businesses.filter(
    (business) =>
      businessMatchesCategory(business, filter) &&
      businessMatchesSearch(business, searchQuery)
  );
  const featuredBusinesses = businesses;
  const communitySearchBusinesses = searchQuery.trim()
    ? businesses.filter((business) => businessMatchesSearch(business, searchQuery))
    : featuredBusinesses.length
    ? featuredBusinesses
    : businesses;
  const communityBusinessResults = orderByDiscoveryInterests(
    communitySearchBusinesses,
    businessMatchesSearch
  );
  const communityBusinessPreview = communityBusinessResults.slice(
    0,
    expandedCommunitySections.professionals
      ? communityBusinessResults.length
      : COMMUNITY_PREVIEW_LIMIT
  );
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
    const handleCommunityDiscovery = (event) => {
      const detail = event.detail || {};
      const availableInterests = getCommunityDiscoveryInterestsFromTaxonomy({
        translate: (_key, fallback) => fallback,
      });

      if (detail.query) {
        const nextQuery = String(detail.query);
        setSearchQuery(nextQuery);
        setExpandedCommunitySections(collapsedCommunitySections);

        if (!Array.isArray(detail.interests)) {
          const taxonomyMatch = resolveCommunityDiscoveryInterestForSearch(nextQuery);
          if (
            taxonomyMatch?.ecosystemId &&
            availableInterests.some(
              (interest) => interest.id === taxonomyMatch.ecosystemId
            )
          ) {
            const nextInterests = [taxonomyMatch.ecosystemId];
            setSelectedDiscoveryInterests(nextInterests);
            localStorage.setItem(
              "meetroCommunityDiscoveryInterests",
              JSON.stringify(nextInterests)
            );
          }
        }
      }

      if (Array.isArray(detail.interests)) {
        const validInterestIds = detail.interests.filter((interestId) =>
          availableInterests.some((interest) => interest.id === interestId)
        );
        setSelectedDiscoveryInterests(validInterestIds);
        setExpandedCommunitySections(collapsedCommunitySections);
        localStorage.setItem(
          "meetroCommunityDiscoveryInterests",
          JSON.stringify(validInterestIds)
        );
        localStorage.setItem("meetroCommunityDiscoveryInterestsSeen", "true");
        setShowDiscoveryInterestPrompt(false);
      }
    };

    window.addEventListener("meetro:community-discovery", handleCommunityDiscovery);

    return () => {
      window.removeEventListener(
        "meetro:community-discovery",
        handleCommunityDiscovery
      );
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    queueMicrotask(() => {
      if (active) setDirectoryState(createLoadingDiscoverDirectoryState());
    });

    fetchDiscoverDirectory({ apiUrl: API_URL, signal: controller.signal }).then(
      (nextState) => {
        if (active && nextState) setDirectoryState(nextState);
      }
    );

    return () => {
      active = false;
      controller.abort();
    };
  }, [directoryReload]);

  function retryDiscoverDirectory() {
    setDirectoryState(createLoadingDiscoverDirectoryState());
    setDirectoryReload((value) => value + 1);
  }

  function selectBusiness(business) {
    const businessName = business.name || business.business_name || "";
    const services = getBusinessServicesProjection(business, {
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

  const openCommunitySection = (section) => {
    setSearchQuery("");
    setFilter("all");
    setDiscoverMode(section);
  };

  const renderDirectoryState = ({ filtered = false } = {}) => {
    const status = directoryState.status;
    if (status === DISCOVER_DIRECTORY_STATUS.RESULTS && !filtered) return null;

    let titleKey = "communityDirectoryLoadingTitle";
    let textKey = "communityDirectoryLoadingText";
    let retryable = false;
    let loginRequired = false;

    if (status === DISCOVER_DIRECTORY_STATUS.RESULTS && filtered) {
      titleKey = "communityDirectoryFilteredEmptyTitle";
      textKey = "communityDirectoryFilteredEmptyText";
    } else if (status === DISCOVER_DIRECTORY_STATUS.EMPTY) {
      titleKey = "communityDirectoryEmptyTitle";
      textKey = "communityDirectoryEmptyText";
    } else if (status === DISCOVER_DIRECTORY_STATUS.UNAUTHORIZED) {
      titleKey = "communityDirectoryUnauthorizedTitle";
      textKey = "communityDirectoryUnauthorizedText";
      loginRequired = true;
    } else if (status === DISCOVER_DIRECTORY_STATUS.FAILED) {
      titleKey = "communityDirectoryFailedTitle";
      textKey = "communityDirectoryFailedText";
      retryable = true;
    } else if (status === DISCOVER_DIRECTORY_STATUS.UNAVAILABLE) {
      titleKey = "communityDirectoryUnavailableTitle";
      textKey = "communityDirectoryUnavailableText";
      retryable = true;
    }

    return (
      <div
        className="meetro-visual-empty-state"
        style={communityWarmEmptyCard}
        role={status === DISCOVER_DIRECTORY_STATUS.FAILED ? "alert" : "status"}
        aria-live="polite"
        data-discover-directory-status={status}
      >
        <h3 style={emptyTitle}>{t(titleKey, language)}</h3>
        <p style={emptyText}>{t(textKey, language)}</p>
        {retryable && (
          <button type="button" style={communitySectionAction} onClick={retryDiscoverDirectory}>
            {t("communityDirectoryRetry", language)}
          </button>
        )}
        {loginRequired && (
          <button type="button" style={communitySectionAction} onClick={() => setPage("login")}>
            {t("communityDirectorySignIn", language)}
          </button>
        )}
      </div>
    );
  };

  const renderBusinessCard = (business) => {
    const category = getBusinessDisplayCategory(business);
    const serviceArea = getBusinessServiceArea(business);
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
            <h2 style={businessCardTitle}>{business.business_name}</h2>
          </div>

          {category && <p style={businessCategoryLine}>{category}</p>}

          {business.available_now === true && (
            <div style={businessTrustRow}>
              <span style={trustMini}>{t("discoverAvailable", language)}</span>
            </div>
          )}

          {serviceArea && <p style={businessCardLocation}>{serviceArea}</p>}

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
              style={businessPrimaryButton}
              onClick={(event) => requestServiceFromBusiness(event, business)}
            >
              {t("requestService", language)}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiscoveryBar = () => {
    const discoveryContext = getDiscoveryContext();

    return (
      <>
        <section
          style={communityDiscoveryBar}
          aria-label={t("communityDiscoveryBarAria", language)}
        >
          <div style={searchBox}>
            <span style={searchIcon} aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => updateSearchQuery(event.target.value)}
              placeholder={t("communityDiscoverySearchPlaceholder", language)}
              style={searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                style={clearSearchButton}
                onClick={() => updateSearchQuery("")}
                aria-label={t("discoverClearSearch", language)}
              >
                ×
              </button>
            )}
          </div>

          <div
            style={communityInterestScroller}
            aria-label={t("communityDiscoveryInterestsAria", language)}
          >
            {discoveryInterests.map((interest) => {
              const selected = selectedDiscoveryInterests.includes(interest.id);

              return (
                <button
                  key={interest.id}
                  type="button"
                  aria-pressed={selected}
                  style={{
                    ...communityInterestChip,
                    ...(selected ? communityInterestChipActive : {}),
                  }}
                  onClick={() => toggleDiscoveryInterest(interest.id)}
                >
                  {interest.label}
                </button>
              );
            })}
          </div>

          <div style={communityDiscoveryContext} aria-live="polite">
            <p style={communityDiscoveryContextTitle}>{discoveryContext.title}</p>
            <p style={communityDiscoveryContextCopy}>{discoveryContext.copy}</p>
          </div>
        </section>

        {showDiscoveryInterestPrompt && (
        <div style={communityInterestPrompt}>
          <div>
            <h2 style={communityInterestPromptTitle}>
              {t("communityInterestPromptTitle", language)}
            </h2>
            <p style={communityInterestPromptCopy}>
              {t("communityInterestPromptCopy", language)}
            </p>
          </div>
          <button
            type="button"
            style={communityInterestSkipButton}
            onClick={skipDiscoveryInterests}
          >
            {t("communityInterestSkip", language)}
          </button>
        </div>
      )}
      </>
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
      {renderDiscoveryBar()}

      <section
        style={communityPreviewStack}
        aria-label={t("communityPreviewAria", language)}
      >
        <section
          className="meetro-visual-surface"
          style={{
            ...communityPreviewSection,
            order: getCommunitySectionOrder("businesses"),
          }}
        >
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
            {directoryState.status === DISCOVER_DIRECTORY_STATUS.RESULTS &&
            communityBusinessPreview.length > 0 ? (
              communityBusinessPreview.map((business) => renderBusinessCard(business))
            ) : (
              renderDirectoryState({
                filtered:
                  directoryState.status === DISCOVER_DIRECTORY_STATUS.RESULTS,
              })
            )}
          </div>

          {communityBusinessResults.length > COMMUNITY_PREVIEW_LIMIT && (
            <button
              type="button"
              className="meetro-visual-primary-button"
              style={communitySectionAction}
              onClick={() => toggleCommunitySectionExpansion("professionals")}
            >
              {expandedCommunitySections.professionals
                ? t("communityShowFewerProfessionals", language)
                : t("communityExploreMoreProfessionals", language)}
            </button>
          )}
        </section>

        <section
          className="meetro-visual-surface"
          style={{
            ...communityPreviewSection,
            order: getCommunitySectionOrder("hiring"),
          }}
        >
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
            <div className="meetro-visual-empty-state" style={communityHiringEmptyCard}>
              <h3 style={emptyTitle}>
                {t("hiringOperationsUnavailable", language)}
              </h3>
              <p style={emptyText}>
                {t("hiringOpportunitiesTruthDescription", language)}
              </p>
            </div>
          </div>
        </section>

        <section
          className="meetro-visual-surface"
          style={{
            ...communityPreviewSection,
            order: getCommunitySectionOrder("spotlight"),
          }}
        >
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

          <div style={communitySpotlightStack}>
            <div className="meetro-visual-empty-state" style={communityWarmEmptyCard}>
              <h3 style={emptyTitle}>
                {t("communitySpotlightUnavailableTitle", language)}
              </h3>
              <p style={emptyText}>
                {t("communitySpotlightUnavailableText", language)}
              </p>
            </div>
          </div>
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
      </section>

      <section
        style={spotlightStoryStack}
        aria-label={t("communitySpotlightStoryAria", language)}
      >
        <div className="meetro-visual-empty-state" style={communityWarmEmptyCard}>
          <h2 style={emptyTitle}>
            {t("communitySpotlightUnavailableTitle", language)}
          </h2>
          <p style={emptyText}>
            {t("communitySpotlightUnavailableText", language)}
          </p>
        </div>

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
        ← {t("communityTitle", language)}
      </button>

      <header style={compactHeader}>
        <p style={headerEyebrow}>{t("discoverMarketplaceEyebrow", language)}</p>
        <h1 style={compactTitle}>{t("communityBusinessesTitle", language)}</h1>
        <p style={compactSubtitle}>{t("discoverMarketplaceSubtitle", language)}</p>
      </header>

      <section style={searchPanel} aria-label={t("discoverSearchLabel", language)}>
        <div style={searchBox}>
          <span style={searchIcon} aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => updateSearchQuery(event.target.value)}
            placeholder={t("discoverSearchPlaceholder", language)}
            style={searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              style={clearSearchButton}
              onClick={() => updateSearchQuery("")}
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
          {t("discoverResultsCount", language, {
            count: marketplaceBusinesses.length,
          })}
        </p>
      </section>

      <div className="meetro-responsive-grid meetro-grid-2" style={feedList}>
        {directoryState.status === DISCOVER_DIRECTORY_STATUS.RESULTS &&
        marketplaceBusinesses.length > 0 ? (
          marketplaceBusinesses.map((business) => renderBusinessCard(business))
        ) : (
          renderDirectoryState({
            filtered: directoryState.status === DISCOVER_DIRECTORY_STATUS.RESULTS,
          })
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

const communityGuideQuestion = {
  margin: "0 0 12px",
  color: "var(--meetro-color-coffee)",
  fontSize: "14px",
  fontWeight: "900",
};

const communityDiscoveryBar = {
  display: "grid",
  gap: "10px",
  position: "sticky",
  top: "calc(env(safe-area-inset-top, 0px) + 10px)",
  zIndex: 20,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  marginBottom: "20px",
  padding: "12px",
  border: "1px solid rgba(74,52,40,0.10)",
  borderRadius: "22px",
  background: "rgba(255,253,248,0.96)",
  boxShadow: "0 10px 24px rgba(49,35,20,0.08)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const communityInterestScroller = {
  display: "flex",
  flexWrap: "nowrap",
  gap: "9px",
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  padding: "2px 1px 6px",
  scrollbarWidth: "thin",
};

const communityInterestChip = {
  flex: "0 0 auto",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-coffee)",
  minHeight: "42px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(49,35,20,0.05)",
  whiteSpace: "nowrap",
};

const communityInterestChipActive = {
  border: "1px solid var(--meetro-color-forest)",
  background: "var(--meetro-color-forest)",
  color: "var(--meetro-surface-paper)",
  boxShadow: "0 8px 18px rgba(11,58,44,0.16)",
};

const communityDiscoveryContext = {
  borderTop: "1px solid rgba(74,52,40,0.08)",
  paddingTop: "9px",
  display: "grid",
  gap: "2px",
  transition: "opacity 160ms ease",
};

const communityDiscoveryContextTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep)",
  fontSize: "13px",
  lineHeight: 1.3,
  fontWeight: "950",
};

const communityDiscoveryContextCopy = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "12px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const communityInterestPrompt = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "20px",
  background: "var(--meetro-surface-warm)",
  padding: "14px",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "12px",
  alignItems: "center",
  boxShadow: "var(--meetro-shadow-soft)",
};

const communityInterestPromptTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "16px",
  lineHeight: 1.2,
  fontWeight: "950",
  letterSpacing: 0,
};

const communityInterestPromptCopy = {
  margin: "5px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: "750",
};

const communityInterestSkipButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const communityPreviewStack = {
  display: "grid",
  gap: "20px",
  paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
  transition: "opacity 160ms ease, transform 160ms ease",
};

const communityPreviewSection = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "26px",
  background: "var(--meetro-surface-paper)",
  padding: "18px",
  display: "grid",
  gap: "14px",
  boxShadow: "var(--meetro-shadow-soft)",
  transition: "opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease",
};

const communityPreviewHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: 0,
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
  marginTop: "2px",
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

const communitySpotlightStack = {
  display: "grid",
  gap: "14px",
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
  minHeight: "100dvh",
  background: "var(--meetro-gradient-community-page)",
  padding: "calc(env(safe-area-inset-top, 0px) + 64px) 18px calc(120px + env(safe-area-inset-bottom, 0px))",
  width: "100%",
  maxWidth: "1100px",
  minWidth: 0,
  margin: "0 auto",
  boxSizing: "border-box",
  overflowX: "hidden",
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

export default Discover;
