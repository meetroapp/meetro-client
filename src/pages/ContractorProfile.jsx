import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import MeetroIcon from "../components/MeetroIcon";
import ServiceSelectorSheet, {
  flattenServiceGroups,
} from "../components/ServiceSelectorSheet";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";
import { setActiveAccountMode } from "../utils/session";
import {
  getProfessionalReviews,
  getProfessionalReviewStats,
} from "../utils/reviewStorage";
import {
  buildBusinessProfileShare,
  persistBusinessProfileShareRecord,
} from "../utils/profileShare";
import {
  PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS,
  getProfessionalSpecialtyLabel,
} from "../utils/professionalOnboardingSpecialties";
import {
  getBusinessProfileCapabilityOptionsFromTaxonomy,
  getBusinessProfileCategoryOptionsFromTaxonomy,
} from "../utils/communityTaxonomy";
import {
  writeBusinessServiceProfile,
} from "../utils/businessServiceProfile";
import { applyBusinessIdentityFields, getBusinessIdentityProjection } from "../utils/businessIdentity";
import { setBusinessAvailability } from "../utils/businessAvailability";
import {
  buildBusinessProfilePayload,
  getConfirmedBusinessProfile,
} from "../utils/businessProfilePersistence";
import { getBusinessPortfolioProofProjection } from "../utils/businessPortfolioProof";
import { readBusinessPortfolioStorage } from "../utils/businessPortfolioStorage";
import { getActiveTeamMemberCount } from "../utils/teamMembers";
import {
  getMediaDeferredCopy,
  guardFriendsAndFamilyMediaUpload,
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";

function ContractorProfile({ setPage, currentPage }) {
  const sharedReturnPage = localStorage.getItem("meetroSharedPageReturn") || "";
  const isBusinessToolsReturn = sharedReturnPage === "businessCommandCenter";
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [language, updateLanguage] = useState(getLanguage());
  const mediaUploadDeferred = isFriendsAndFamilyMediaDeferred();

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [serviceSpecialties, setServiceSpecialties] = useState([]);
  const [expandedProfileSections, setExpandedProfileSections] = useState({});
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessPostalCode, setBusinessPostalCode] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [showBusinessAddressPublic, setShowBusinessAddressPublic] = useState(false);
  
  const [bio, setBio] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [availableNow, setAvailableNow] = useState(false);
  const [dispatchReady, setDispatchReady] = useState(false);
  const profileReviews = getProfessionalReviews({
    professionalId: profile?.id || localStorage.getItem("selectedProfessionalId") || "",
    professionalName: profile?.business_name || businessName,
  });
  const profileReviewStats = getProfessionalReviewStats(profileReviews);

  const categories = [
    { value: "", label: t("selectBusinessCategory") },
    ...getBusinessProfileCategoryOptionsFromTaxonomy({
      translate: (key, fallback) => {
        const translated = t(key);
        return translated === key ? fallback : translated;
      },
    }),
  ];

  useEffect(() => {
    const handleLanguageChange = () => updateLanguage(getLanguage());
    window.addEventListener("languageChanged", handleLanguageChange);
    return () => window.removeEventListener("languageChanged", handleLanguageChange);
  }, []);

  useEffect(() => {
    fetchMyProfile();
  }, [language]);

  function unlockBusinessAccess(profileData) {
  if (!profileData) return;
  const serviceProfile = writeBusinessServiceProfile({
    serviceSpecialties: profileData.service_specialties || [],
  });

  localStorage.setItem("contractorProfileComplete", "true");

  localStorage.setItem(
    "businessName",
    profileData.business_name || ""
  );

  localStorage.setItem(
    "businessCategory",
    profileData.category || ""
  );

  localStorage.setItem(
    "accountType",
    "professional"
  );

  localStorage.setItem(
    "userRole",
    profileData.category || "professional"
  );

  localStorage.setItem(
    "isProfessional",
    "true"
  );

  localStorage.setItem(
    "hasBusinessProfile",
    "true"
  );

  localStorage.setItem(
    "contractorProfile",
    JSON.stringify({
      id: profileData.id,
      business_name:
        profileData.business_name || "",
      name:
        profileData.business_name || "",
      category:
        profileData.category || "",
      business_category:
        profileData.category || "",
      serviceDomain: serviceProfile.serviceDomain,
      businessServiceDomain: serviceProfile.serviceDomain,
      serviceDomains: serviceProfile.serviceDomains,
      businessServiceDomains: serviceProfile.serviceDomains,
      serviceCategories: serviceProfile.serviceCategories,
      businessServiceCategories: serviceProfile.serviceCategories,
      serviceSpecialties: serviceProfile.serviceSpecialties,
      businessServiceSpecialties: serviceProfile.serviceSpecialties,
      serviceCapabilities: serviceProfile.serviceCapabilities,
      businessServiceCapabilities: serviceProfile.serviceCapabilities,
      location:
        profileData.location || "",
      streetAddress: profileData.streetAddress || profileData.street_address || "",
      addressLine2: profileData.addressLine2 || profileData.address_line_2 || "",
      city: profileData.city || profileData.businessCity || profileData.primaryCity || "",
      state: profileData.state || profileData.stateProvince || profileData.state_province || "",
      postalCode: profileData.postalCode || profileData.postal_code || profileData.zip || "",
      country: profileData.country || "",
      serviceArea: profileData.serviceArea || profileData.service_area || profileData.location || "",
      showBusinessAddressPublic: Boolean(
        profileData.showBusinessAddressPublic ||
          profileData.show_business_address_public
      ),
      publicAddress:
        profileData.publicAddress ||
        profileData.public_address ||
        profileData.location ||
        "",
      bio:
        profileData.bio || "",
      businessHours:
        profileData.businessHours || profileData.business_hours || "",
      business_hours:
        profileData.businessHours || profileData.business_hours || "",
      licenseNumber:
        profileData.licenseNumber ||
        profileData.license_number ||
        profileData.businessLicenseNumber ||
        "",
      license_number:
        profileData.licenseNumber ||
        profileData.license_number ||
        profileData.businessLicenseNumber ||
        "",
      licenseState:
        profileData.licenseState ||
        profileData.license_state ||
        profileData.businessLicenseState ||
        "",
      license_state:
        profileData.licenseState ||
        profileData.license_state ||
        profileData.businessLicenseState ||
        "",
      licenseType:
        profileData.licenseType ||
        profileData.license_type ||
        profileData.businessLicenseType ||
        "",
      license_type:
        profileData.licenseType ||
        profileData.license_type ||
        profileData.businessLicenseType ||
        "",
      licenseExpiration:
        profileData.licenseExpiration ||
        profileData.license_expiration ||
        profileData.businessLicenseExpiration ||
        "",
      license_expiration:
        profileData.licenseExpiration ||
        profileData.license_expiration ||
        profileData.businessLicenseExpiration ||
        "",
      image_url:
        profileData.image_url || "",
      logo:
        profileData.image_url || "",
      rating:
        profileReviewStats.totalReviews ? profileReviewStats.averageRating : "",
      status: "active",
    })
  );

  setActiveAccountMode("business");
}

  function lockBusinessAccess() {
    localStorage.removeItem("contractorProfileComplete");
    setActiveAccountMode("personal");
  }

  async function fetchMyProfile() {
    try {
      setLoading(true);
      const result = await authFetch(
        "/my-contractor-profile",
        { cache: "no-store" },
        setPage
      );

      if (!result) {
        lockBusinessAccess();
        return;
      }

      const data = result.data;

      if (data.profile) {
        setProfile(data.profile);
        fillForm(data.profile);
        projectConfirmedBusinessProfile(data.profile);
      } else {
        setProfile(null);
        lockBusinessAccess();
      }
    } catch (error) {
      console.error(error);
      setProfile(null);
      lockBusinessAccess();
    } finally {
      setLoading(false);
    }
  }

  function fillForm(existingProfile) {
    setBusinessName(existingProfile.business_name || "");
    setCategory(existingProfile.category || "");
    setServiceSpecialties(
      Array.isArray(existingProfile.service_specialties)
        ? existingProfile.service_specialties
        : []
    );
    setPhone(existingProfile.phone || "");
    setStreetAddress(existingProfile.street_address || "");
    setAddressLine2(existingProfile.address_line_2 || "");
    setBusinessCity(existingProfile.city || "");
    setBusinessState(existingProfile.state_province || "");
    setBusinessPostalCode(existingProfile.postal_code || "");
    setCountry(existingProfile.country || "");
    setServiceArea(existingProfile.service_area || existingProfile.location || "");
    setShowBusinessAddressPublic(existingProfile.show_business_address_public === true);
    setLocation(existingProfile.location || "");
    setBio(existingProfile.bio || "");
    setBusinessHours(existingProfile.business_hours || "");
    setLicenseNumber(existingProfile.license_number || "");
    setLicenseState(existingProfile.license_state || "");
    setLicenseType(existingProfile.license_type || "");
    setLicenseExpiration(existingProfile.license_expiration || "");
    setImageUrl(existingProfile.image_url || "");
    setAvailableNow(existingProfile.available_now === true);
    setDispatchReady(existingProfile.dispatch_ready === true);
  }


  function formatCategory(value) {
    const found = categories.find((item) => item[0] === value);
    return found ? found[1] : value || t("categoryNotSet");
  }

  function formatLicenseSummary(fields = {}) {
    const parts = [
      fields.licenseType,
      fields.licenseNumber,
      fields.licenseState,
    ].filter(Boolean);
    const summary = parts.join(" • ");
    if (summary && fields.licenseExpiration) {
      return `${summary} • ${t("licenseExpiration")}: ${fields.licenseExpiration}`;
    }
    return summary;
  }

  function toggleServiceSpecialty(value) {
    setServiceSpecialties((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function projectConfirmedBusinessProfile(profileData) {
    writeBusinessServiceProfile({
      serviceSpecialties: profileData.service_specialties || [],
    });
    setBusinessAvailability(profileData.available_now === true);
    localStorage.setItem(
      "meetroDispatchReady",
      String(profileData.dispatch_ready === true)
    );
    unlockBusinessAccess(profileData);
  }

  function getBusinessProfilePayload(overrides = {}) {
    return buildBusinessProfilePayload({
      businessName,
      category,
      phone,
      bio,
      imageUrl,
      streetAddress,
      addressLine2,
      businessCity,
      businessState,
      businessPostalCode,
      country,
      serviceArea,
      showBusinessAddressPublic,
      businessHours,
      licenseNumber,
      licenseState,
      licenseType,
      licenseExpiration,
      serviceSpecialties,
      availableNow,
      dispatchReady,
      ...overrides,
    });
  }

  async function updateBusinessAvailability(nextValue) {
    if (!profile?.id) return;
    const result = await authFetch(
      `/contractor-profiles/${profile.id}`,
      {
        method: "PUT",
        body: JSON.stringify(getBusinessProfilePayload({ availableNow: nextValue })),
      },
      setPage
    );
    const confirmedProfile = getConfirmedBusinessProfile(result);
    if (!confirmedProfile) {
      alert(result?.data?.error || t("failedUpdateProfile"));
      return;
    }
    setProfile(confirmedProfile);
    fillForm(confirmedProfile);
    projectConfirmedBusinessProfile(confirmedProfile);
  }

  function reviewBusinessSetup() {
    localStorage.setItem("meetroProfessionalOnboardingReturnPage", "contractorProfile");
    setPage("professionalOnboarding");
  }

  async function handleImageUpload(event) {
    if (
      !guardFriendsAndFamilyMediaUpload({
        event,
        language,
        onDeferred: (message) => alert(message),
      })
    ) {
      return;
    }

    try {
      const file = event.target.files[0];
      if (!file) return;

      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "meetro_uploads");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/djcw4tk28/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        setImageUrl(data.secure_url);
      } else {
        alert(t("uploadFailed"));
      }
    } catch (error) {
      console.error(error);
      alert(t("uploadError"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleCreateProfile() {
    try {
      if (!businessName.trim() || !category.trim()) {
        alert(t("completeAllFields"));
        return;
      }

      const result = await authFetch(
        "/contractor-profiles",
        {
          method: "POST",
          body: JSON.stringify(getBusinessProfilePayload()),
        },
        setPage
      );

      const savedProfile = getConfirmedBusinessProfile(result);
      if (savedProfile) {
        alert(t("contractorProfileCreated"));
        setProfile(savedProfile);
        fillForm(savedProfile);
        projectConfirmedBusinessProfile(savedProfile);
        setPage("profile");
      } else {
        alert(result?.data?.error || t("failedCreateProfile"));
      }
    } catch (error) {
      console.error(error);
      alert(t("serverError"));
    }
  }

  async function handleUpdateProfile() {
    try {
      if (!profile?.id) {
        alert(t("noContractorProfileFound"));
        return;
      }

      if (!businessName.trim() || !category.trim()) {
        alert(t("completeAllFields"));
        return;
      }
      const result = await authFetch(
        `/contractor-profiles/${profile.id}`,
        {
          method: "PUT",
          body: JSON.stringify(getBusinessProfilePayload()),
        },
        setPage
      );

      const savedProfile = getConfirmedBusinessProfile(result);
      if (savedProfile) {
        alert(t("profileUpdated"));
        setProfile(savedProfile);
        fillForm(savedProfile);
        projectConfirmedBusinessProfile(savedProfile);
        setEditing(false);
      } else {
        alert(result?.data?.error || t("failedUpdateProfile"));
      }
    } catch (error) {
      console.error(error);
      alert(t("serverError"));
    }
  }

  if (loading) {
    return <LoadingScreen text={t("loadingContractorProfile")} />;
  }

  const reviewCount = Number(profileReviewStats.totalReviews || 0);
  const hasReviews = reviewCount > 0;
  const reviewAverage = hasReviews
    ? Number(profileReviewStats.averageRating || 0).toFixed(1)
    : "";
  const confirmedFullAddress = [
    profile?.street_address,
    profile?.address_line_2,
    profile?.city,
    profile?.state_province,
    profile?.postal_code,
    profile?.country,
  ]
    .filter(Boolean)
    .join(", ");
  const profileDisplayAddress = profile?.show_business_address_public
    ? confirmedFullAddress || profile?.service_area || profile?.location || ""
    : profile?.service_area || profile?.location || "";
  const businessIdentity = getBusinessIdentityProjection(profile || {
    businessName,
    category,
    serviceArea,
    phone,
    bio,
    businessHours,
    licenseNumber,
    licenseState,
    licenseType,
    licenseExpiration,
    image_url: imageUrl,
  }, {
    translate: (key) => t(key, language),
  });
  const businessVerification = businessIdentity.verification;
  const internalBusinessId =
    localStorage.getItem("businessId") ||
    localStorage.getItem("contractorId") ||
    profile?.contractor_id ||
    profile?.businessId ||
    "local-business";
  const activeTeamMemberCount = getActiveTeamMemberCount({ businessId: internalBusinessId });
  const businessVerificationLabel = businessVerification.verificationLabel;
  const profileBusinessHours =
    profile?.businessHours || profile?.business_hours || businessHours || "";
  const profileLicenseFields = {
    licenseNumber:
      profile?.licenseNumber ||
      profile?.license_number ||
      profile?.businessLicenseNumber ||
      licenseNumber ||
      "",
    licenseState:
      profile?.licenseState ||
      profile?.license_state ||
      profile?.businessLicenseState ||
      licenseState ||
      "",
    licenseType:
      profile?.licenseType ||
      profile?.license_type ||
      profile?.businessLicenseType ||
      licenseType ||
      "",
    licenseExpiration:
      profile?.licenseExpiration ||
      profile?.license_expiration ||
      profile?.businessLicenseExpiration ||
      licenseExpiration ||
      "",
  };
  const profileLicenseSummary = formatLicenseSummary(profileLicenseFields);
  const profilePortfolioProjects = readBusinessPortfolioStorage().filter((project) =>
    portfolioProjectBelongsToBusiness(project, profile || {}, businessIdentity.businessName)
  );
  const businessPortfolioProof = getBusinessPortfolioProofProjection(
    {
      ...profile,
      businessPortfolio: profilePortfolioProjects,
      projectGallery: profilePortfolioProjects,
    },
    {
      reviews: profileReviews,
      translate: (key) => t(key, language),
    }
  );
  const businessIdentityReady = Boolean(
    businessIdentity.businessName && profile?.category && profileDisplayAddress
  );
  const servicesReady = serviceSpecialties.length > 0;
  const isBusinessProfileSectionOpen = (sectionKey, defaultOpen = false) =>
    Object.prototype.hasOwnProperty.call(expandedProfileSections, sectionKey)
      ? expandedProfileSections[sectionKey]
      : defaultOpen;
  const toggleBusinessProfileSection = (sectionKey) => {
    setExpandedProfileSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };
  const portfolioProofSummary = businessPortfolioProof.projectCount
    ? `${businessPortfolioProof.projectCount} ${t("projects")}`
    : businessPortfolioProof.reviewCount
    ? `${businessPortfolioProof.reviewCount} ${t("reviews")}`
    : t("portfolioProofEmpty");
  const businessReadinessItems = [
    {
      key: "identity",
      icon: "profile",
      label: t("businessInformation"),
      value: businessIdentityReady ? t("ready") : t("notSet"),
    },
    {
      key: "availability",
      icon: "availableNow",
      label: t("availableNow"),
      value: availableNow ? t("currentlyAvailable") : t("currentlyInactive"),
    },
    {
      key: "services",
      icon: "serviceTypes",
      label: t("servicesOffered"),
      value: servicesReady
        ? `${serviceSpecialties.length} ${t("activeCapabilities")}`
        : t("notSet"),
    },
    {
      key: "verification",
      icon: "verified",
      label: t("businessVerification"),
      value: businessVerificationLabel,
    },
    {
      key: "portfolio",
      icon: "portfolio",
      label: t("portfolioProof"),
      value: businessPortfolioProof.hasPublicProof ? t("ready") : t("notSet"),
    },
  ];

  const publicProfileRecord = () =>
    applyBusinessIdentityFields(
      {
        id: profile?.id || localStorage.getItem("selectedProfessionalId") || "",
        ...profile,
        businessName: businessIdentity.businessName,
        business_name: businessIdentity.businessName,
        category: profile?.category || category,
        displayCategory: formatCategory(profile?.category || category),
        location: profileDisplayAddress || serviceArea || location,
        serviceArea: profile?.service_area || serviceArea,
        phone: profile?.phone || phone,
        bio: profile?.bio || bio,
        businessHours: profileBusinessHours,
        business_hours: profileBusinessHours,
        ...profileLicenseFields,
        license_number: profileLicenseFields.licenseNumber,
        license_state: profileLicenseFields.licenseState,
        license_type: profileLicenseFields.licenseType,
        license_expiration: profileLicenseFields.licenseExpiration,
        image_url: profile?.image_url || imageUrl,
        imageUrl: profile?.image_url || imageUrl,
        logo: profile?.image_url || imageUrl,
        rating: profileReviewStats.totalReviews ? profileReviewStats.averageRating : "",
        status: availableNow ? "active" : "preview",
      },
      { businessProfilePhoto: businessIdentity.imageUrl }
    );

  const viewPublicProfile = () => {
    persistBusinessProfileShareRecord(publicProfileRecord());
    localStorage.setItem("contractorDetailsReturnPage", "contractorProfile");
    setPage("contractorDetails");
  };

  const copyProfileLinkToClipboard = async (profileUrl) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(profileUrl);
      return;
    }

    const fallbackInput = document.createElement("input");
    fallbackInput.value = profileUrl;
    fallbackInput.setAttribute("readonly", "");
    fallbackInput.style.position = "fixed";
    fallbackInput.style.opacity = "0";
    document.body.appendChild(fallbackInput);
    fallbackInput.select();
    document.execCommand("copy");
    document.body.removeChild(fallbackInput);
  };

  const sharePublicProfile = async () => {
    const { publicRecord } = persistBusinessProfileShareRecord(publicProfileRecord());
    const sharePayload = buildBusinessProfileShare(publicRecord, {
      fallbackTitle: t("businessProfile"),
      shareIntro: t("publicProfileShareText"),
    });

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }

    try {
      await copyProfileLinkToClipboard(sharePayload.url);
      alert(t("publicProfileLinkCopied"));
    } catch {
      window.prompt(t("copyPublicProfileLink"), sharePayload.url);
    }
  };
  const openBusinessPortfolio = () => {
    setPage("projectGallery");
  };
  const profileImprovementGuidance = [
    !profileDisplayAddress && {
      key: "service-area",
      icon: "location",
      title: t("addServiceArea"),
      body: t("addServiceAreaGuidance"),
      onClick: () => setEditing(true),
    },
    !servicesReady && {
      key: "services",
      icon: "serviceTypes",
      title: t("chooseServicesOffered"),
      body: t("chooseServicesOfferedGuidance"),
      onClick: () => setEditing(true),
    },
    !profileBusinessHours && {
      key: "hours",
      icon: "availability",
      title: t("addBusinessHours"),
      body: t("addBusinessHoursGuidance"),
      onClick: () => setEditing(true),
    },
    !businessPortfolioProof.hasPublicProof && {
      key: "portfolio-proof",
      icon: "portfolio",
      title: t("addPortfolioProof"),
      body: t("addPortfolioProofGuidance"),
      onClick: openBusinessPortfolio,
    },
    !businessVerification.verified && {
      key: "verification",
      icon: "verified",
      title: t("reviewVerification"),
      body: t("reviewVerificationGuidance"),
      onClick: () => setEditing(true),
    },
  ].filter(Boolean);
  const visibleProfileGuidance =
    profileImprovementGuidance.length > 0
      ? profileImprovementGuidance.slice(0, 2)
      : [
          {
            key: "preview",
            icon: "preview",
            title: t("previewCustomerView"),
            body: t("previewCustomerViewGuidance"),
            onClick: viewPublicProfile,
          },
        ];

  return (
    <div className="app-page business-profile-page meetro-readable-page" style={pageWrapper}>
      <style>
        {`
          .business-profile-shell,
          .business-profile-primary-column,
          .business-profile-secondary-column {
            display: contents;
          }

          .business-profile-proof-card {
            margin-bottom: 0 !important;
          }

          @media (min-width: 1100px) {
            #root[data-app-layout="desktop"] .app-page.business-profile-page.meetro-readable-page {
              width: min(calc(100vw - var(--meetro-sidebar-width)), 1180px) !important;
              max-width: min(calc(100vw - var(--meetro-sidebar-width)), 1180px) !important;
              margin-left: var(--meetro-sidebar-width) !important;
              margin-right: auto !important;
              padding-top: clamp(24px, 2.8vw, 40px) !important;
              padding-left: clamp(24px, 3vw, 46px) !important;
              padding-right: clamp(24px, 3vw, 46px) !important;
            }

            .business-profile-shell {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 18px;
              align-items: start;
            }

            .business-profile-hero-span {
              grid-column: 1 / -1;
            }

            .business-profile-primary-column,
            .business-profile-secondary-column {
              display: grid;
              gap: 18px;
              min-width: 0;
              align-content: start;
            }

            .business-profile-card {
              margin-bottom: 0 !important;
            }

            .business-profile-trust-group {
              margin-bottom: 0 !important;
            }

            .business-profile-info-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            @media (min-width: 1100px) {
              .business-profile-shell {
                grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
              }
            }
          }
        `}
      </style>
           
      <button
  onClick={() => {
    if (isBusinessToolsReturn) {
      localStorage.removeItem("meetroSharedPageReturn");
      setPage("businessCommandCenter");
      return;
    }
    setPage("businessDashboard");
  }}
  style={backButton}
>
  ← {isBusinessToolsReturn
    ? language === "es"
      ? "Volver a Herramientas"
      : "Back to Business Tools"
    : t("backToDashboard")}
</button>
      
      {!profile && (
        <div style={heroCard}>
          <div style={heroGlow}></div>

          <div style={heroTop}>
            <div>
              <p style={eyebrow}>{t("businessProfile")}</p>
              <BusinessNameTitle
                name={businessName || t("yourBusiness")}
                variant="hero"
              />
              <p style={pageSubtitle}>
                {t("businessProfilePurpose")}
              </p>
            </div>

            <div style={verifiedBadge}>
              {t("setupRequired")}
            </div>
          </div>
        </div>
      )}

      {!profile && (
        <ProfileForm
          title={
  businessName || category || phone || location || bio || imageUrl
    ? t("editBusinessProfile")
    : t("createYourBusinessProfile")
}
          businessName={businessName}
          setBusinessName={setBusinessName}
          category={category}
          setCategory={setCategory}
          categories={categories}
          serviceSpecialties={serviceSpecialties}
          toggleServiceSpecialty={toggleServiceSpecialty}
          phone={phone}
          setPhone={setPhone}
          location={location}
          setLocation={setLocation}
          streetAddress={streetAddress}
          setStreetAddress={setStreetAddress}
          addressLine2={addressLine2}
          setAddressLine2={setAddressLine2}
          businessCity={businessCity}
          setBusinessCity={setBusinessCity}
          businessState={businessState}
          setBusinessState={setBusinessState}
          businessPostalCode={businessPostalCode}
          setBusinessPostalCode={setBusinessPostalCode}
          serviceArea={serviceArea}
          setServiceArea={setServiceArea}
          showBusinessAddressPublic={showBusinessAddressPublic}
          setShowBusinessAddressPublic={setShowBusinessAddressPublic}
          country={country}
          setCountry={setCountry}
          language={language}
          bio={bio}
          setBio={setBio}
          businessHours={businessHours}
          setBusinessHours={setBusinessHours}
          licenseNumber={licenseNumber}
          setLicenseNumber={setLicenseNumber}
          licenseState={licenseState}
          setLicenseState={setLicenseState}
          licenseType={licenseType}
          setLicenseType={setLicenseType}
          licenseExpiration={licenseExpiration}
          setLicenseExpiration={setLicenseExpiration}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          uploading={uploading}
          availableNow={availableNow}
          onAvailabilityChange={setAvailableNow}
          dispatchReady={dispatchReady}
          setDispatchReady={setDispatchReady}
          handleImageUpload={handleImageUpload}
          mediaUploadDeferred={mediaUploadDeferred}
          submitLabel={
  businessName || category || phone || location || bio || imageUrl
    ? t("saveChanges")
    : t("createProfile")
}
          onSubmit={handleCreateProfile}
        />
      )}

      {profile && !editing && (
        <div className="business-profile-shell">
          <div className="business-profile-hero-span">
            <div style={heroCard}>
              <div style={heroGlow}></div>

              <div style={identityHeroLayout}>
                <div style={heroLogoFrame}>
                  {businessIdentity.imageUrl ? (
                    <img
                      src={businessIdentity.imageUrl}
                      alt={businessIdentity.businessName}
                      style={circleLogoImage}
                    />
                  ) : (
                    <div style={circleLogoPlaceholder}>
                      <MeetroIcon name="businessProfile" size={30} decorative />
                    </div>
                  )}
                </div>

                <div style={identityHeroContent}>
                  <p style={eyebrow}>{t("businessProfile")}</p>
                  <BusinessNameTitle
                    name={businessIdentity.businessName || t("businessNameNotSet")}
                    variant="hero"
                  />
                  <p style={identityHeroMeta}>
                    {formatCategory(profile.category)}
                  </p>
                  <p style={identityHeroMeta}>
                    <MeetroIcon name="location" size={14} decorative />{" "}
                    {profileDisplayAddress || t("locationNotSet")}
                  </p>

                  <div style={heroVerificationRow}>
                    <div style={verifiedBadge}>
                      <MeetroIcon name="verified" size={14} decorative />{" "}
                      {businessVerification.compactBadgeText}
                    </div>
                    <div style={verifiedBadge}>
                      <MeetroIcon name="availableNow" size={14} decorative />{" "}
                      {availableNow ? t("currentlyAvailable") : t("currentlyInactive")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="business-profile-primary-column">
            <BusinessProfileCollapsibleCard
              title={t("businessHealth")}
              icon="availableNow"
              summary={availableNow ? t("readyForCustomers") : t("currentlyInactive")}
              open={isBusinessProfileSectionOpen("businessHealth")}
              onToggle={() => toggleBusinessProfileSection("businessHealth")}
            >
              <p style={bioStyle}>{t("businessReadinessSentence")}</p>
              <div style={readinessSummaryCard}>
                <strong style={verificationStatusText}>
                  {availableNow ? t("readyForCustomers") : t("currentlyInactive")}
                </strong>
                <p style={bioStyle}>
                  {availableNow
                    ? t("readyForCustomersHelp")
                    : t("inactiveReadinessHelp")}
                </p>
              </div>
              <div style={businessHealthGrid}>
                {businessReadinessItems.map((item) => (
                  item.key === "availability" ? (
                    <div
                      key={item.key}
                      style={businessHealthItem}
                    >
                      <span style={businessHealthIcon}>
                        <MeetroIcon name={item.icon} size={16} decorative />
                      </span>
                      <span style={businessHealthLabel}>{item.label}</span>
                      <strong style={businessHealthValue}>{item.value}</strong>
                      <button
                        type="button"
                        onClick={() => updateBusinessAvailability(!availableNow)}
                        style={availabilityInlineAction}
                      >
                        {availableNow ? t("setUnavailable") : t("setAvailable")}
                      </button>
                    </div>
                  ) : (
                    <div key={item.key} style={businessHealthItem}>
                      <span style={businessHealthIcon}>
                        <MeetroIcon name={item.icon} size={16} decorative />
                      </span>
                      <span style={businessHealthLabel}>{item.label}</span>
                      <strong style={businessHealthValue}>{item.value}</strong>
                    </div>
                  )
                ))}
              </div>
            </BusinessProfileCollapsibleCard>

            <div className="business-profile-trust-group" style={customerTrustGroup}>
              <div style={{ ...glassCard, ...customerPreviewCard }}>
                <div style={customerPreviewLauncher}>
                  <div style={customerPreviewCopy}>
                    <span style={customerTrustEyebrow}>{t("customerTrust")}</span>
                    <h2 style={compactCardTitle}>{t("customerPreview")}</h2>
                    <p style={bioStyle}>{t("customerPreviewHelp")}</p>
                    <p style={customerPreviewSummaryText}>{t("customerPreviewSummary")}</p>
                  </div>
                  <button onClick={viewPublicProfile} style={smallEditButton}>
                    {t("viewPublicProfile")} →
                  </button>
                </div>
              </div>

              <BusinessProfileCollapsibleCard
                className="business-profile-proof-card"
                title={t("portfolioProof")}
                icon="portfolio"
                summary={portfolioProofSummary}
                style={portfolioProofCard}
                open={isBusinessProfileSectionOpen("portfolio")}
                onToggle={() => toggleBusinessProfileSection("portfolio")}
              >
                <div style={portfolioProofLayout}>
                  <span style={businessHealthIcon}>
                    <MeetroIcon name="portfolio" size={16} decorative />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={compactCardTitle}>{t("portfolioProof")}</h2>
                    <strong style={portfolioProofMetric}>{portfolioProofSummary}</strong>
                    <p style={bioStyle}>{t("portfolioProofHelp")}</p>
                    <button
                      type="button"
                      onClick={openBusinessPortfolio}
                      style={{ ...secondaryActionButton, marginTop: "10px" }}
                    >
                      {businessPortfolioProof.hasPublicProof
                        ? t("viewPublicPortfolio")
                        : t("addPortfolioProof")}
                    </button>
                  </div>
                </div>
              </BusinessProfileCollapsibleCard>

              <ServicesOfferedSection
                selectedSpecialties={serviceSpecialties}
                readOnly
                collapsible
                open={isBusinessProfileSectionOpen("services", !servicesReady)}
                onToggleSection={() => toggleBusinessProfileSection("services")}
              />

              <BusinessProfileCollapsibleCard
                title={t("reviews")}
                icon="reviews"
                summary={`${profileReviews.length} ${t("reviews")}`}
                open={isBusinessProfileSectionOpen("reviews")}
                onToggle={() => toggleBusinessProfileSection("reviews")}
              >
                <div style={bioCard}>
                  {profileReviews.length === 0 ? (
                    <div style={emptyReviewsCard}>
                      <span style={businessHealthIcon}>
                        <MeetroIcon name="reviews" size={16} decorative />
                      </span>
                      <strong>{t("reviewsAfterCompletedJobs")}</strong>
                    </div>
                  ) : (
                    profileReviews.slice(0, 3).map((item) => (
                      <div key={item.id} style={reviewPreviewCard}>
                        <strong>
                          <MeetroIcon name="reviews" size={16} decorative />{" "}
                          {Number(item.rating || 0).toFixed(1)}
                        </strong>
                        <p style={reviewPreviewText}>
                          {item.comment || t("noReviewText")}
                        </p>
                        <span style={reviewPreviewMeta}>
                          {item.customerDisplayName ||
                            (language === "es" ? "Cliente" : "Customer")}
                          {item.service ? ` • ${item.service}` : ""}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </BusinessProfileCollapsibleCard>
            </div>

            <div className="business-profile-card" style={glassCard}>
              <h2 style={compactCardTitle}>{t("quickActions")}</h2>
              <div style={quickActionsGrid}>
                <button onClick={() => setEditing(true)} style={primaryButton}>
                  {t("editProfile")}
                </button>
                <button onClick={viewPublicProfile} style={secondaryActionButton}>
                  {t("viewPublicProfile")}
                </button>
                <button onClick={sharePublicProfile} style={secondaryActionButton}>
                  {t("shareProfile")}
                </button>
              </div>
            </div>

            <BusinessProfileCollapsibleCard
              title={t("businessInformation")}
              icon="businessProfile"
              summary={profileDisplayAddress || profile.phone || t("locationNotSet")}
              open={isBusinessProfileSectionOpen("businessInformation")}
              onToggle={() => toggleBusinessProfileSection("businessInformation")}
            >
              <div style={bioCard}>
                <h3 style={bioTitle}>{t("aboutBusiness")}</h3>
                <p style={bioStyle}>{profile.bio || t("noBusinessDescription")}</p>
              </div>

              <div className="business-profile-info-grid" style={infoGrid}>
                <InfoCard
                  icon="serviceTypes"
                  label={t("category")}
                  value={formatCategory(profile.category)}
                />
                <InfoCard
                  icon="location"
                  label={
                    profile.show_business_address_public
                      ? t("businessAddress")
                      : t("serviceArea")
                  }
                  value={profileDisplayAddress || t("locationNotSet")}
                />
                <InfoCard
                  icon="phone"
                  label={t("phone")}
                  value={profile.phone || t("phoneNotSet")}
                />
                <InfoCard
                  icon="availability"
                  label={t("businessHours")}
                  value={profileBusinessHours || t("addBusinessHours")}
                />
                <InfoCard
                  icon="verified"
                  label={t("licenseInformation")}
                  value={profileLicenseSummary || t("addLicenseInformation")}
                />
                <InfoCard
                  icon="hiringCenter"
                  label={t("teamMemberInternalCount")}
                  value={String(activeTeamMemberCount)}
                />
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{ ...secondaryActionButton, marginTop: "14px" }}
              >
                {t("editBusinessInformation")}
              </button>
            </BusinessProfileCollapsibleCard>
          </div>

          <div className="business-profile-secondary-column">
            <div
              className="business-profile-card business-profile-guidance-card"
              style={{ ...glassCard, ...publicPresenceGuidanceCard }}
            >
              <h2 style={compactCardTitle}>{t("publicPresenceGuidance")}</h2>
              <p style={bioStyle}>{t("publicPresenceGuidanceHelp")}</p>
              <div style={guidanceList}>
                {visibleProfileGuidance.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    style={guidanceItem}
                  >
                    <span style={businessHealthIcon}>
                      <MeetroIcon name={item.icon} size={16} decorative />
                    </span>
                    <span style={guidanceCopy}>
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <BusinessProfileCollapsibleCard
              title={t("businessVerification")}
              icon="verified"
              summary={businessVerificationLabel}
              open={isBusinessProfileSectionOpen("verification")}
              onToggle={() => toggleBusinessProfileSection("verification")}
            >
              <p style={bioStyle}>{t("businessVerificationHelp")}</p>
              <div style={{ ...verificationStatusCard, marginTop: "12px" }}>
                <span style={businessHealthIcon}>
                  <MeetroIcon name="verified" size={16} decorative />
                </span>
                <div style={{ minWidth: 0 }}>
                  <strong style={verificationStatusText}>
                    {businessVerificationLabel}
                  </strong>
                  <p style={bioStyle}>{businessVerification.publicTrustSummary}</p>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    style={{ ...secondaryActionButton, marginTop: "10px" }}
                  >
                    {t("reviewVerification")}
                  </button>
                </div>
              </div>
            </BusinessProfileCollapsibleCard>

            <BusinessProfileCollapsibleCard
              title={t("businessSetup")}
              icon="settings"
              summary={t("reviewBusinessSetup")}
              open={isBusinessProfileSectionOpen("businessSetup")}
              onToggle={() => toggleBusinessProfileSection("businessSetup")}
            >
              <div style={verificationStatusCard}>
                <span style={businessHealthIcon}>
                  <MeetroIcon name="settings" size={16} decorative />
                </span>
                <div style={{ minWidth: 0 }}>
                  <strong style={verificationStatusText}>
                    {t("reviewBusinessSetup")}
                  </strong>
                  <p style={bioStyle}>{t("reviewBusinessSetupHelp")}</p>
                  <button
                    type="button"
                    onClick={reviewBusinessSetup}
                    style={{ ...secondaryActionButton, marginTop: "10px" }}
                  >
                    {t("reviewBusinessSetup")}
                  </button>
                </div>
              </div>
            </BusinessProfileCollapsibleCard>
          </div>
        </div>
      )}

      {profile && editing && (
        <ProfileForm
          title={t("editBusinessProfile")}
          businessName={businessName}
          setBusinessName={setBusinessName}
          category={category}
          setCategory={setCategory}
          categories={categories}
          serviceSpecialties={serviceSpecialties}
          toggleServiceSpecialty={toggleServiceSpecialty}
          phone={phone}
          setPhone={setPhone}
          location={location}
          setLocation={setLocation}
          streetAddress={streetAddress}
          setStreetAddress={setStreetAddress}
          addressLine2={addressLine2}
          setAddressLine2={setAddressLine2}
          businessCity={businessCity}
          setBusinessCity={setBusinessCity}
          businessState={businessState}
          setBusinessState={setBusinessState}
          businessPostalCode={businessPostalCode}
          setBusinessPostalCode={setBusinessPostalCode}
          serviceArea={serviceArea}
          setServiceArea={setServiceArea}
          showBusinessAddressPublic={showBusinessAddressPublic}
          setShowBusinessAddressPublic={setShowBusinessAddressPublic}
          country={country}
          setCountry={setCountry}
          language={language}
          bio={bio}
          setBio={setBio}
          businessHours={businessHours}
          setBusinessHours={setBusinessHours}
          licenseNumber={licenseNumber}
          setLicenseNumber={setLicenseNumber}
          licenseState={licenseState}
          setLicenseState={setLicenseState}
          licenseType={licenseType}
          setLicenseType={setLicenseType}
          licenseExpiration={licenseExpiration}
          setLicenseExpiration={setLicenseExpiration}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          uploading={uploading}
          availableNow={availableNow}
          onAvailabilityChange={setAvailableNow}
          dispatchReady={dispatchReady}
          setDispatchReady={setDispatchReady}
          handleImageUpload={handleImageUpload}
          mediaUploadDeferred={mediaUploadDeferred}
          submitLabel={t("saveChanges")}
          onSubmit={handleUpdateProfile}
          onCancel={() => setEditing(false)}
        />
      )}

      <BottomNav setPage={setPage} currentPage="contractorProfile" />
    </div>
  );
}

function ProfileForm({
  title,
  businessName,
  setBusinessName,
  category,
  setCategory,
  categories,
  serviceSpecialties,
  toggleServiceSpecialty,
  country,
  setCountry,
  language,
  phone,
  setPhone,
  location,
  setLocation,
  streetAddress,
  setStreetAddress,
  addressLine2,
  setAddressLine2,
  businessCity,
  setBusinessCity,
  businessState,
  setBusinessState,
  businessPostalCode,
  setBusinessPostalCode,
  serviceArea,
  setServiceArea,
  showBusinessAddressPublic,
  setShowBusinessAddressPublic,
  bio, 
  setBio,
  businessHours,
  setBusinessHours,
  licenseNumber,
  setLicenseNumber,
  licenseState,
  setLicenseState,
  licenseType,
  setLicenseType,
  licenseExpiration,
  setLicenseExpiration,
  imageUrl,
  setImageUrl,
  uploading,
  availableNow,
  onAvailabilityChange,
  dispatchReady,
  setDispatchReady,
  handleImageUpload,
  mediaUploadDeferred = false,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const inputId = onCancel ? "contractorImageEditInput" : "contractorImageInput";
  const mediaDeferredCopy = getMediaDeferredCopy(language);

  return (
    <div style={glassCard}>
      <h2 style={sectionTitle}>{title}</h2>

      <div style={logoUploadCard}>
        <div style={circleLogoFrame}>
          {imageUrl ? (
            <img src={imageUrl} alt={t("preview")} style={circleLogoImage} />
          ) : (
            <div style={circleLogoPlaceholder}>
              <MeetroIcon name="businessProfile" size={30} decorative />
            </div>
          )}
        </div>

        <div style={uploadInfo}>
          <h3 style={uploadTitle}>{t("businessLogo")}</h3>
          <p style={uploadSubtext}>
            {mediaUploadDeferred ? mediaDeferredCopy.detail : t("businessLogoHelp")}
          </p>

          <input
            id={inputId}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={mediaUploadDeferred}
            onChange={handleImageUpload}
          />

          <button
            type="button"
            onClick={() => {
              if (!mediaUploadDeferred) {
                document.getElementById(inputId).click();
              }
            }}
            style={{
              ...uploadButton,
              ...(mediaUploadDeferred ? disabledUploadButton : {}),
            }}
            disabled={mediaUploadDeferred}
          >
            {mediaUploadDeferred
              ? mediaDeferredCopy.title
              : imageUrl
              ? t("changeLogo")
              : t("uploadLogo")}
          </button>

          {imageUrl && (
            <button type="button" onClick={() => setImageUrl("")} style={removeButton}>
              {t("removeImage")}
            </button>
          )}

          {uploading && <p style={uploadingText}>{t("uploadingImage")}</p>}
        </div>
      </div>

      <input
        placeholder={t("businessName")}
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        style={inputStyle}
      />

      <select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  style={inputStyle}
>
  {categories.map((option) => (
    <option key={option.value || "empty"} value={option.value}>
      {option.label}
    </option>
  ))}
</select>

      <ServicesOfferedSection
        selectedSpecialties={serviceSpecialties}
        onToggle={toggleServiceSpecialty}
      />

      <input
        placeholder={t("phoneNumber")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={inputStyle}
      />

      <div style={formSection}>
        <h3 style={formSectionTitle}>{t("businessAddress")}</h3>
        <p style={helperText}>{t("businessAddressPrivacyHelp")}</p>

        <input
          placeholder={t("streetAddress")}
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder={t("addressLine2")}
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          style={inputStyle}
        />

        <div style={addressGrid}>
          <input
            placeholder={t("city")}
            value={businessCity}
            onChange={(e) => setBusinessCity(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder={t("stateProvince")}
            value={businessState}
            onChange={(e) => setBusinessState(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={addressGrid}>
          <input
            placeholder={t("zipPostalCode")}
            value={businessPostalCode}
            onChange={(e) => setBusinessPostalCode(e.target.value)}
            style={inputStyle}
          />

          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t("selectCountry")}</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="MX">Mexico</option>
            <option value="OTHER">{t("other")}</option>
          </select>
        </div>

        <input
          placeholder={t("serviceArea")}
          value={serviceArea}
          onChange={(e) => {
            setServiceArea(e.target.value);
            setLocation(e.target.value);
          }}
          style={inputStyle}
        />

        <div style={visibilityToggleCard}>
          <div>
            <strong>{t("showBusinessAddressPublicly")}</strong>
            <p style={visibilityHelpText}>{t("showBusinessAddressPubliclyHelp")}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowBusinessAddressPublic(!showBusinessAddressPublic)}
            style={{
              ...toggleButton,
              marginBottom: 0,
              background: showBusinessAddressPublic
                ? "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))"
                : "rgba(255,255,255,0.85)",
              color: showBusinessAddressPublic ? "white" : "#333",
            }}
          >
            {showBusinessAddressPublic ? t("yes") : t("no")}
          </button>
        </div>
      </div>

      <div style={toggleRow}>
        <button
          type="button"
          onClick={() => onAvailabilityChange?.(!availableNow)}
          style={{
            ...toggleButton,
            background: availableNow ? "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))" : "rgba(255,255,255,0.75)",
            color: availableNow ? "white" : "#333",
          }}
        >
          {availableNow && <MeetroIcon name="availableNow" size={14} decorative />}
          {t("availableNow")}
        </button>

        <button
          type="button"
          onClick={() => setDispatchReady(!dispatchReady)}
          style={{
            ...toggleButton,
            background: dispatchReady ? "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))" : "rgba(255,255,255,0.75)",
            color: dispatchReady ? "white" : "#333",
          }}
        >
          <MeetroIcon name="dispatch" size={14} decorative /> {t("dispatchReady")}
        </button>
      </div>

      <div style={formSection}>
        <h3 style={formSectionTitle}>{t("businessHours")}</h3>
        <p style={helperText}>{t("businessHoursHelp")}</p>
        <input
          placeholder={t("businessHoursPlaceholder")}
          value={businessHours}
          onChange={(e) => setBusinessHours(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={formSection}>
        <h3 style={formSectionTitle}>{t("licenseInformation")}</h3>
        <p style={helperText}>{t("licenseInformationHelp")}</p>
        <input
          placeholder={t("licenseNumber")}
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          style={inputStyle}
        />
        <div style={addressGrid}>
          <input
            placeholder={t("licenseState")}
            value={licenseState}
            onChange={(e) => setLicenseState(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder={t("licenseType")}
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value)}
            style={inputStyle}
          />
        </div>
        <input
          type="date"
          aria-label={t("licenseExpiration")}
          value={licenseExpiration}
          onChange={(e) => setLicenseExpiration(e.target.value)}
          style={inputStyle}
        />
      </div>

      <textarea
        placeholder={t("businessBio")}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        style={textareaStyle}
      />

      <>
  <div style={floatingSaveGlow}></div>

  <button onClick={onSubmit} style={primaryButton}>
        {submitLabel}
      </button>
     </>

      {onCancel && (
        <button onClick={onCancel} style={secondaryButtonFull}>
          {t("cancel")}
        </button>
      )}
    </div>
  );
}

function BusinessProfileCollapsibleCard({
  title,
  icon = "businessProfile",
  summary = "",
  open = false,
  onToggle,
  children,
  style,
  className = "business-profile-card",
}) {
  const sectionId = `business-profile-section-${String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;

  return (
    <section className={className} style={{ ...glassCard, ...style }}>
      <button
        type="button"
        style={businessProfileCollapseHeader}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={sectionId}
      >
        <span style={businessProfileCollapseHeaderLeft}>
          <span style={businessHealthIcon}>
            <MeetroIcon name={icon} size={16} decorative />
          </span>
          <span style={businessProfileCollapseTitleGroup}>
            <strong style={compactCardTitle}>{title}</strong>
            {!open && summary && (
              <span style={businessProfileCollapseSummary}>{summary}</span>
            )}
          </span>
        </span>
        <span style={businessProfileCollapseChevron} aria-hidden="true">
          {open ? "⌃" : "⌄"}
        </span>
      </button>

      <div
        id={sectionId}
        style={{
          ...businessProfileCollapseBody,
          ...(open ? businessProfileCollapseBodyOpen : {}),
        }}
        hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}

function ServicesOfferedSection({
  selectedSpecialties = [],
  onToggle,
  readOnly = false,
  collapsible = false,
  open = true,
  onToggleSection,
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectedLabels = selectedSpecialties
    .map((specialty) => getProfessionalSpecialtyLabel(specialty, t))
    .filter(Boolean);
  const serviceOptions = flattenServiceGroups(
    PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS,
    t
  );
  const primaryCategoryOptions = getBusinessProfileCapabilityOptionsFromTaxonomy({
    translate: (key, fallback) => {
      const translated = t(key);
      return translated === key ? fallback : translated;
    },
  });
  const selectedPrimaryCategory =
    serviceOptions.find((option) =>
      selectedSpecialties.includes(option.value)
    )?.categoryId || "";

  const content = (
    <>
      <p style={helperText}>{t("servicesOfferedSubtitle")}</p>
      <p style={capabilityCountText}>
        {selectedSpecialties.length} {t("professionalCapabilitySelectedCount")}
      </p>

      {readOnly ? (
        selectedLabels.length > 0 ? (
          <div style={serviceChipGrid}>
            {selectedLabels.map((label) => (
              <span key={label} style={serviceReadOnlyChip}>
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p style={servicesEmptyText}>{t("servicesOfferedEmpty")}</p>
        )
      ) : (
        <>
          <button
            type="button"
            style={serviceManageButton}
            onClick={() => setSelectorOpen(true)}
          >
            {t("chooseService")}
          </button>
          {selectedLabels.length > 0 ? (
            <div style={serviceChipGrid}>
              {selectedLabels.map((label) => (
                <span key={label} style={serviceReadOnlyChip}>
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p style={servicesEmptyText}>{t("servicesOfferedEmpty")}</p>
          )}
          <ServiceSelectorSheet
            open={selectorOpen}
            title={t("servicesOffered")}
            subtitle={t("servicesOfferedSubtitle")}
            categories={primaryCategoryOptions}
            selectedCategoryId={selectedPrimaryCategory}
            categorySearchPlaceholder={t("professionalCapabilitySearchCategories")}
            emptyCategoryText={t("professionalCapabilityChooseCategoryEmpty")}
            cantFindLabel={t("professionalCapabilityCantFind")}
            searchPlaceholder={t("searchServices")}
            options={serviceOptions}
            selectedValues={selectedSpecialties}
            multiple
            placement="center"
            doneLabel={t("save")}
            onSelect={() => {}}
            onToggle={(value) => onToggle?.(value)}
            onDone={() => setSelectorOpen(false)}
            onClose={() => setSelectorOpen(false)}
          />
        </>
      )}
    </>
  );

  if (collapsible) {
    return (
      <BusinessProfileCollapsibleCard
        title={t("servicesOffered")}
        icon="serviceTypes"
        summary={
          selectedLabels.length
            ? selectedLabels.slice(0, 3).join(", ")
            : t("servicesOfferedEmpty")
        }
        open={open}
        onToggle={onToggleSection}
      >
        {content}
      </BusinessProfileCollapsibleCard>
    );
  }

  return (
    <div style={readOnly ? servicesOfferedReadOnlyCard : formSection}>
      <h3 style={readOnly ? compactCardTitle : formSectionTitle}>
        {t("servicesOffered")}
      </h3>
      {content}
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div style={infoCard}>
      <span style={infoLabel}>
        {icon && <MeetroIcon name={icon} size={14} decorative />}
        {label}
      </span>
      <span style={infoValue}>{value}</span>
    </div>
  );
}

function BusinessNameTitle({ name, variant = "hero" }) {
  const displayName = String(name || "").trim();
  const ampersandIndex = displayName.indexOf("&");
  const baseStyle = variant === "preview" ? businessTitle : pageTitle;
  const ampersandStyle =
    variant === "preview" ? previewAmpersandBusinessTitle : {};

  if (ampersandIndex === -1 || variant !== "preview") {
    const Tag = variant === "preview" ? "h2" : "h1";
    return <Tag style={baseStyle}>{displayName}</Tag>;
  }

  const beforeAmpersand = displayName.slice(0, ampersandIndex).trim();
  const afterAmpersand = displayName.slice(ampersandIndex + 1).trim();
  const Tag = variant === "preview" ? "h2" : "h1";

  return (
    <Tag style={{ ...baseStyle, ...ampersandStyle }}>
      {beforeAmpersand && (
        <span style={businessTitleLine}>{beforeAmpersand}</span>
      )}
      <span style={businessTitleAmpersand}>&</span>
      {afterAmpersand && (
        <span style={businessTitleLine}>{afterAmpersand}</span>
      )}
    </Tag>
  );
}

function portfolioProjectBelongsToBusiness(project = {}, profile = {}, businessName = "") {
  const normalize = (value) => String(value || "").trim().toLowerCase();
  const profileId = normalize(profile.id || profile.contractor_id || profile.businessId);
  const projectBusinessId = normalize(
    project.businessId || project.business_id || project.contractorId || project.contractor_id
  );
  const profileName = normalize(
    businessName || profile.business_name || profile.businessName || profile.name
  );
  const projectBusinessName = normalize(
    project.businessName ||
      project.business_name ||
      project.contractorName ||
      project.contractor_name
  );

  if (profileId && projectBusinessId) {
    return profileId === projectBusinessId;
  }

  if (profileName && projectBusinessName) {
    return profileName === projectBusinessName;
  }

  return false;
}

const pageWrapper = {
  background:
    "radial-gradient(circle at top left, #eef0ff 0%, transparent 28%), radial-gradient(circle at top right, #ede9ff 0%, transparent 22%), linear-gradient(to bottom, #f8f8fc 0%, #eef0f7 100%)",
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "#111",
  width: "100%",
  maxWidth: "960px",
  margin: "0 auto",
};

const backButton = {
  border: "none",
  background: "rgba(255,255,255,0.72)",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  marginBottom: "16px",
  cursor: "pointer",
  borderRadius: "999px",
  padding: "10px 14px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
};

const heroCard = {
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, var(--meetro-color-forest-deep, #14351f) 0%, var(--meetro-color-forest, #1f4d34) 58%, var(--meetro-color-coffee, #4a3428) 100%)",
  borderRadius: "38px",
  padding: "26px",
  color: "white",
  marginBottom: "22px",
  boxShadow:
    "var(--meetro-shadow-lifted, 0 24px 70px rgba(49,35,20,0.14))",
};

const heroGlow = {
  position: "absolute",
  top: "-70px",
  right: "-60px",
  width: "220px",
  height: "220px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.18)",
  filter: "blur(24px)",
};

const heroTop = {
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "14px",
};

const eyebrow = {
  margin: 0,
  opacity: 0.82,
  fontWeight: "900",
  fontSize: "13px",
  letterSpacing: "0.3px",
};

const pageTitle = {
  margin: "6px 0 4px",
  maxWidth: "min(100%, 460px)",
  fontSize: "clamp(22px, 5.8vw, 32px)",
  lineHeight: 1.08,
  textAlign: "left",
  overflowWrap: "anywhere",
  wordBreak: "normal",
  hyphens: "none",
  letterSpacing: "0",
};

const pageSubtitle = {
  margin: 0,
  lineHeight: 1.5,
  opacity: 0.9,
  fontSize: "15px",
};

const verifiedBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "rgba(255,255,255,0.16)",
  padding: "10px 13px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  height: "fit-content",
  whiteSpace: "normal",
  border: "1px solid rgba(255,255,255,0.18)",
};

const identityHeroLayout = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  minWidth: 0,
  padding: "4px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const heroLogoFrame = {
  width: "clamp(56px, 15vw, 76px)",
  height: "clamp(56px, 15vw, 76px)",
  minWidth: "clamp(56px, 15vw, 76px)",
  borderRadius: "50%",
  background: "linear-gradient(145deg, #ffffff, #f0edff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  boxShadow: "0 14px 30px rgba(15,23,42,0.18)",
  border: "4px solid rgba(255,255,255,0.92)",
};

const identityHeroContent = {
  minWidth: 0,
  display: "grid",
  gap: "3px",
  flex: "1 1 auto",
  paddingTop: "2px",
};

const identityHeroMeta = {
  margin: "2px 0 0",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
  color: "rgba(255,255,255,0.88)",
  fontSize: "13px",
  fontWeight: "850",
  lineHeight: 1.25,
};

const heroVerificationRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "7px",
};

const heroStats = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginTop: "20px",
};

const heroStat = {
  background: "rgba(255,255,255,0.13)",
  borderRadius: "20px",
  padding: "13px 10px",
  display: "grid",
  gap: "5px",
  textAlign: "center",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const logoGlassCard = {
  background: "rgba(255,255,255,0.75)",
  backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.8)",
  borderRadius: "32px",
  padding: "20px",
  marginBottom: "16px",
  boxShadow: "0 14px 42px rgba(0,0,0,0.08)",
};

const glassCard = {
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.82)",
  borderRadius: "30px",
  padding: "18px",
  marginBottom: "18px",
  boxShadow:
    "0 18px 44px rgba(0,0,0,0.08)",
};

const logoHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};

const miniLabel = {
  margin: 0,
  color: "#6b6f80",
  fontSize: "13px",
  fontWeight: "900",
};

const logoCardTitle = {
  margin: "4px 0 0",
  fontSize: "21px",
};

const compactCardTitle = {
  margin: "0 0 12px",
  color: "#111",
  fontSize: "20px",
  lineHeight: 1.2,
};

const businessProfileCollapseHeader = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#111",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
};

const businessProfileCollapseHeaderLeft = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  minWidth: 0,
};

const businessProfileCollapseTitleGroup = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
};

const businessProfileCollapseSummary = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 800,
  lineHeight: 1.35,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const businessProfileCollapseChevron = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "24px",
  fontWeight: 950,
  lineHeight: 1,
};

const businessProfileCollapseBody = {
  maxHeight: 0,
  opacity: 0,
  overflow: "hidden",
  transition: "max-height 220ms ease, opacity 180ms ease",
};

const businessProfileCollapseBodyOpen = {
  maxHeight: "1800px",
  opacity: 1,
  paddingTop: "12px",
};

const businessHealthGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "10px",
};

const readinessSummaryCard = {
  display: "grid",
  gap: "4px",
  padding: "14px",
  margin: "14px 0",
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(31,77,52,0.10), rgba(255,255,255,0.84))",
  border: "1px solid rgba(31,77,52,0.12)",
};

const businessHealthItem = {
  minWidth: 0,
  display: "grid",
  gap: "5px",
  padding: "12px",
  borderRadius: "18px",
  background: "rgba(246,246,250,0.86)",
  border: "1px solid rgba(255,255,255,0.9)",
};

const businessHealthIcon = {
  width: "30px",
  height: "30px",
  borderRadius: "10px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--meetro-color-forest, #1f4d34)",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
};

const businessHealthLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "850",
};

const businessHealthValue = {
  color: "#111",
  fontSize: "14px",
  lineHeight: 1.25,
};

const availabilityInlineAction = {
  justifySelf: "start",
  marginTop: "3px",
  border: "1px solid rgba(31,77,52,0.18)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.82)",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "8px 10px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
  maxWidth: "100%",
};

const quickActionsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const secondaryActionButton = {
  width: "100%",
  padding: "16px",
  border: "none",
  borderRadius: "20px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
};

const customerTrustGroup = {
  display: "grid",
  gap: "14px",
  marginBottom: "18px",
};

const customerPreviewCard = {
  marginBottom: 0,
  border: "1px solid rgba(31,77,52,0.14)",
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.86)), var(--meetro-surface-sage, rgba(238,244,234,0.78)))",
};

const customerPreviewLauncher = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
};

const customerPreviewCopy = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
};

const customerPreviewSummaryText = {
  margin: "2px 0 0",
  color: "#4f5668",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: 750,
};

const customerTrustEyebrow = {
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.2px",
  textTransform: "uppercase",
};

const smallEditButton = {
  border: "none",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
};

const portfolioProofCard = {
  border: "1px solid rgba(31,77,52,0.12)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.88), rgba(248,247,255,0.78))",
};

const portfolioProofLayout = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  minWidth: 0,
};

const portfolioProofMetric = {
  display: "block",
  color: "#111827",
  fontSize: "14px",
  lineHeight: 1.35,
  fontWeight: 950,
  margin: "-4px 0 6px",
};

const publicPresenceGuidanceCard = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.88), rgba(241,237,255,0.74))",
  border: "1px solid rgba(31,77,52,0.13)",
};

const guidanceList = {
  display: "grid",
  gap: "10px",
  marginTop: "14px",
};

const guidanceItem = {
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  border: "1px solid rgba(31,77,52,0.10)",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.78)",
  color: "#111827",
  padding: "13px",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const guidanceCopy = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
  color: "#4f5668",
  fontSize: "13px",
  lineHeight: 1.4,
};

const logoPreviewWrap = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const circleLogoFrame = {
  width: "118px",
  height: "118px",
  minWidth: "118px",
  borderRadius: "50%",
  background:
    "linear-gradient(145deg, #ffffff, #f0edff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  boxShadow:
    "0 16px 38px rgba(31,77,52,0.22)",
  border: "4px solid rgba(255,255,255,0.92)",
};

const circleLogoImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const circleLogoPlaceholder = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f3efff",
  fontSize: "44px",
};

const logoBusinessInfo = {
  minWidth: 0,
};

const businessTitle = {
  margin: 0,
  maxWidth: "100%",
  fontSize: "clamp(22px, 6vw, 28px)",
  lineHeight: 1.08,
  color: "#111",
  textAlign: "center",
  overflowWrap: "normal",
};

const previewAmpersandBusinessTitle = {
  display: "grid",
  gap: "1px",
  justifyItems: "center",
};

const businessTitleLine = {
  display: "block",
};

const businessTitleAmpersand = {
  display: "block",
  fontSize: "0.82em",
  lineHeight: 0.95,
};

const categoryStyle = {
  margin: "7px 0 0",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
};

const locationMini = {
  margin: "8px 0 0",
  color: "#6b6f80",
  fontWeight: "700",
};

const sectionTitle = {
  marginTop: 0,
  marginBottom: "18px",
  color: "#111",
  fontSize: "27px",
};

const logoUploadCard = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background:
    "linear-gradient(135deg, rgba(245,244,255,0.96), rgba(255,255,255,0.9))",
  borderRadius: "24px",
  padding: "14px",
  marginBottom: "16px",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 10px 30px rgba(31,77,52,0.06)",
};

const uploadInfo = {
  flex: 1,
};

const uploadTitle = {
  margin: "0 0 6px",
  fontSize: "19px",
};

const uploadSubtext = {
  margin: "0 0 12px",
  color: "#6b6f80",
  fontSize: "13px",
  lineHeight: 1.45,
};

const uploadButton = {
  border: "none",
  borderRadius: "999px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  padding: "11px 15px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(49,35,20,0.16)",
};

const disabledUploadButton = {
  background: "#e2e8f0",
  color: "#64748b",
  cursor: "not-allowed",
  boxShadow: "none",
};

const removeButton = {
  border: "none",
  borderRadius: "999px",
  background: "#eeeeee",
  color: "#333",
  padding: "11px 15px",
  marginLeft: "8px",
  fontWeight: "900",
  cursor: "pointer",
};

const uploadingText = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  marginBottom: 0,
};

const inputStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid rgba(31,77,52,0.08)",
  marginBottom: "12px",
  fontSize: "16px",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.88)",
  color: "#111",
  outline: "none",
  boxShadow:
    "0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const formSection = {
  background: "rgba(246,246,250,0.78)",
  border: "1px solid rgba(31,77,52,0.08)",
  borderRadius: "24px",
  padding: "14px",
  marginBottom: "14px",
  boxSizing: "border-box",
  maxWidth: "100%",
};

const formSectionTitle = {
  margin: "0 0 6px",
  fontSize: "19px",
  color: "#111",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

const helperText = {
  margin: "0 0 14px",
  color: "#60677a",
  fontSize: "13px",
  lineHeight: 1.45,
};

const servicesOfferedReadOnlyCard = {
  ...glassCard,
};

const serviceGroupGrid = {
  display: "grid",
  gap: "12px",
  minWidth: 0,
};

const capabilityCountText = {
  margin: "-6px 0 12px",
  color: "#4b32d1",
  fontSize: "13px",
  fontWeight: "900",
};

const verificationStatusCard = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  minWidth: 0,
  border: "1px solid rgba(31,77,52,0.12)",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.72)",
  padding: "14px",
};

const verificationStatusText = {
  display: "block",
  color: "#111827",
  fontSize: "15px",
  lineHeight: 1.3,
  fontWeight: 950,
  marginBottom: "4px",
};

const serviceManageButton = {
  width: "100%",
  border: "1px solid rgba(31,77,52,0.16)",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.86)",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "13px 14px",
  fontSize: "15px",
  fontWeight: 950,
  cursor: "pointer",
  marginBottom: "12px",
  textAlign: "center",
};

const serviceGroupCard = {
  display: "grid",
  gap: "10px",
  minWidth: 0,
  padding: "12px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(255,255,255,0.9)",
};

const serviceGroupTitle = {
  color: "#111",
  fontSize: "14px",
  lineHeight: 1.3,
};

const serviceOptionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
  gap: "8px",
  minWidth: 0,
};

const serviceOptionButton = {
  border: "1px solid rgba(31,77,52,0.12)",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.86)",
  color: "#3b4054",
  padding: "10px 12px",
  minWidth: 0,
  cursor: "pointer",
  fontWeight: "850",
  fontSize: "13px",
  lineHeight: 1.25,
  textAlign: "left",
  overflowWrap: "anywhere",
};

const serviceOptionButtonSelected = {
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  borderColor: "rgba(31,77,52,0.42)",
  boxShadow: "0 10px 22px rgba(49,35,20,0.14)",
};

const serviceChipGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  minWidth: 0,
};

const serviceReadOnlyChip = {
  display: "inline-flex",
  alignItems: "center",
  maxWidth: "100%",
  padding: "9px 11px",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "13px",
  fontWeight: "900",
  overflowWrap: "anywhere",
};

const servicesEmptyText = {
  margin: 0,
  color: "#60677a",
  fontSize: "14px",
  lineHeight: 1.45,
};

const addressGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
  minWidth: 0,
};

const visibilityToggleCard = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "12px",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(0,0,0,0.05)",
  borderRadius: "20px",
  padding: "12px",
  color: "#111",
};

const visibilityHelpText = {
  margin: "4px 0 0",
  color: "#60677a",
  fontSize: "12px",
  lineHeight: 1.35,
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "120px",
  resize: "none",
  lineHeight: 1.6,
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "14px",
};

const callButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  textDecoration: "none",
  background: "#ecfdf3",
  color: "#027a48",
  padding: "15px",
  borderRadius: "18px",
  fontWeight: "900",
  textAlign: "center",
};

const messageButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  border: "none",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "15px",
  borderRadius: "18px",
  fontWeight: "900",
  cursor: "pointer",
};

const statusRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "18px",
};

const statusButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  border: "1px solid rgba(0,0,0,0.04)",
  borderRadius: "20px",
  padding: "16px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow:
    "0 10px 24px rgba(0,0,0,0.05)",
  transition: "all 0.2s ease",
  backdropFilter: "blur(12px)",
};

const toggleRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "14px",
};

const toggleButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  border: "1px solid rgba(0,0,0,0.04)",
  borderRadius: "20px",
  padding: "16px",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow:
    "0 10px 24px rgba(0,0,0,0.05)",
  transition: "all 0.2s ease",
  backdropFilter: "blur(12px)",
};

const infoGrid = {
  display: "grid",
  gap: "12px",
  marginTop: "18px",
  marginBottom: "18px",
};

const infoCard = {
  background: "rgba(246,246,250,0.85)",
  borderRadius: "20px",
  padding: "16px",
  border: "1px solid rgba(255,255,255,0.9)",
};

const infoLabel = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#6b6f80",
  marginBottom: "7px",
  fontWeight: "800",
};

const infoValue = {
  fontWeight: "900",
  color: "#111",
};

const bioCard = {
  background: "rgba(246,246,250,0.86)",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "18px",
  border: "1px solid rgba(255,255,255,0.9)",
};

const bioTitle = {
  marginTop: 0,
  marginBottom: "10px",
};

const bioStyle = {
  margin: 0,
  color: "#555b68",
  lineHeight: 1.65,
};

const emptyReviewsCard = {
  display: "grid",
  gap: "6px",
  padding: "14px",
  borderRadius: "16px",
  background: "rgba(248,247,255,0.78)",
  border: "1px solid rgba(31,77,52,0.12)",
  color: "#334155",
};

const reviewPreviewCard = {
  display: "grid",
  gap: "6px",
  padding: "12px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(226,232,240,0.85)",
  marginTop: "10px",
};

const reviewPreviewText = {
  margin: 0,
  color: "#334155",
  lineHeight: 1.45,
  fontWeight: 700,
};

const reviewPreviewMeta = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 850,
};

const trustGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginBottom: "18px",
};

const trustCard = {
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  borderRadius: "18px",
  padding: "14px 8px",
  display: "grid",
  gap: "6px",
  textAlign: "center",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  fontSize: "12px",
};

const primaryButton = {
  width: "100%",
  padding: "18px",
  border: "none",
  borderRadius: "22px",
  background:
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow:
    "0 16px 34px rgba(49,35,20,0.18)",
  transform: "translateY(0px)",
  transition: "all 0.2s ease",
};

const floatingSaveGlow = {
  position: "fixed",
  bottom: "92px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "180px",
  height: "60px",
  background: "rgba(31,77,52,0.22)",
  filter: "blur(40px)",
  borderRadius: "999px",
  pointerEvents: "none",
  zIndex: 1,
};

const secondaryButtonFull = {
  width: "100%",
  padding: "16px",
  border: "none",
  borderRadius: "20px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
  marginTop: "12px",
};
export default ContractorProfile;
