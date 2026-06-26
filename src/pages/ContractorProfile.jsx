import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import MeetroIcon from "../components/MeetroIcon";
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

function ContractorProfile({ setPage, currentPage }) {
  const sharedReturnPage = localStorage.getItem("meetroSharedPageReturn") || "";
  const isBusinessToolsReturn = sharedReturnPage === "businessCommandCenter";
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [language, updateLanguage] = useState(getLanguage());

  const [businessName, setBusinessName] = useState(
    localStorage.getItem("businessName") || ""
  );
  const [category, setCategory] = useState(
    localStorage.getItem("businessCategory") || ""
  );
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState(
  
  localStorage.getItem("businessCountry") || ""
  );
  const [streetAddress, setStreetAddress] = useState(
    localStorage.getItem("businessStreetAddress") || ""
  );
  const [addressLine2, setAddressLine2] = useState(
    localStorage.getItem("businessAddressLine2") || ""
  );
  const [businessCity, setBusinessCity] = useState(
    localStorage.getItem("businessCity") ||
      localStorage.getItem("businessPrimaryCity") ||
      ""
  );
  const [businessState, setBusinessState] = useState(
    localStorage.getItem("businessState") || ""
  );
  const [businessPostalCode, setBusinessPostalCode] = useState(
    localStorage.getItem("businessPostalCode") ||
      localStorage.getItem("businessZipCodes") ||
      ""
  );
  const [serviceArea, setServiceArea] = useState(
    localStorage.getItem("businessServiceArea") ||
      localStorage.getItem("meetroServiceAreaNotes") ||
      ""
  );
  const [showBusinessAddressPublic, setShowBusinessAddressPublic] = useState(
    localStorage.getItem("showBusinessAddressPublic") === "true"
  );
  
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [availableNow, setAvailableNow] = useState(
    localStorage.getItem("meetroAvailableNow") === "true"
  );
  const [dispatchReady, setDispatchReady] = useState(
  localStorage.getItem("meetroDispatchReady") === "true"
);
  const profileReviews = getProfessionalReviews({
    professionalId: profile?.id || localStorage.getItem("selectedProfessionalId") || "",
    professionalName: profile?.business_name || businessName,
  });
  const profileReviewStats = getProfessionalReviewStats(profileReviews);

  const categories = [
    ["", t("selectBusinessCategory")],
    ["professional", t("professionalUser")],
    ["contractor", t("generalContractor")],
    ["handyman", t("handyman")],
    ["applianceRepair", t("applianceRepair")],
    ["automotiveServices", t("automotiveServices")],
    ["carDetailing", t("carDetailing")],
    ["carpentry", t("carpentry")],
    ["cleaning", t("cleaning")],
    ["concrete", t("concrete")],
    ["demolition", t("demolition")],
    ["doorsWindows", t("doorsWindows")],
    ["drywall", t("drywall")],
    ["electrical", t("electrical")],
    ["fencing", t("fencing")],
    ["flooring", t("flooring")],
    ["homeHealthCare", t("homeHealthCare")],
    ["hvac", t("hvac")],
    ["junkRemoval", t("junkRemoval")],
    ["landscaping", t("landscaping")],
    ["lawnCare", t("lawnCare")],
    ["mechanic", t("mechanic")],
    ["mobileServices", t("mobileServices")],
    ["moving", t("movingCompany")],
    ["painting", t("painting")],
    ["paverSealing", t("paverSealing")],
    ["pestControl", t("pestControl")],
    ["plumbing", t("plumbing")],
    ["poolService", t("poolService")],
    ["pressureWashing", t("pressureWashing")],
    ["privateTransportation", t("privateTransportation")],
    ["realEstate", t("realEstate")],
    ["propertyManagement", t("propertyManagement")],
    ["roofing", t("roofing")],
    ["tile", t("tile")],
    ["treeService", t("treeService")],
    ["other", t("otherService")],
  ];

  useEffect(() => {
    const handleLanguageChange = () => updateLanguage(getLanguage());
    window.addEventListener("languageChanged", handleLanguageChange);
    return () => window.removeEventListener("languageChanged", handleLanguageChange);
  }, []);

  useEffect(() => {
    const syncAvailability = () => {
      setAvailableNow(localStorage.getItem("meetroAvailableNow") === "true");
    };

    window.addEventListener("meetroAvailabilityChanged", syncAvailability);
    window.addEventListener("storage", syncAvailability);

    return () => {
      window.removeEventListener("meetroAvailabilityChanged", syncAvailability);
      window.removeEventListener("storage", syncAvailability);
    };
  }, []);

  useEffect(() => {
    fetchMyProfile();
  }, [language]);

  function unlockBusinessAccess(profileData) {
  if (!profileData) return;

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
      const result = await authFetch("/my-contractor-profile", {}, setPage);

      if (!result) {
        lockBusinessAccess();
        return;
      }

      const data = result.data;

      if (data.profile) {
        const mergedProfile = mergeStoredAddressFields(data.profile);
        setProfile(mergedProfile);
        fillForm(mergedProfile);
        unlockBusinessAccess(mergedProfile);
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
    setPhone(existingProfile.phone || "");
    setStreetAddress(existingProfile.streetAddress || existingProfile.street_address || "");
    setAddressLine2(existingProfile.addressLine2 || existingProfile.address_line_2 || "");
    setBusinessCity(
      existingProfile.city ||
        existingProfile.businessCity ||
        existingProfile.primaryCity ||
        ""
    );
    setBusinessState(
      existingProfile.state ||
        existingProfile.stateProvince ||
        existingProfile.state_province ||
        ""
    );
    setBusinessPostalCode(
      existingProfile.postalCode ||
        existingProfile.postal_code ||
        existingProfile.zip ||
        ""
    );
    setCountry(existingProfile.country || localStorage.getItem("businessCountry") || "");
    setServiceArea(
      existingProfile.serviceArea ||
        existingProfile.service_area ||
        existingProfile.location ||
        ""
    );
    setShowBusinessAddressPublic(
      existingProfile.showBusinessAddressPublic === true ||
        existingProfile.show_business_address_public === true
    );
    setLocation(existingProfile.location || existingProfile.serviceArea || "");
    setBio(existingProfile.bio || "");
    setImageUrl(existingProfile.image_url || "");
  }

  function getStoredAddressFields() {
    const showPublic = localStorage.getItem("showBusinessAddressPublic") === "true";
    const storedStreetAddress = localStorage.getItem("businessStreetAddress") || "";
    const storedAddressLine2 = localStorage.getItem("businessAddressLine2") || "";
    const storedCity =
      localStorage.getItem("businessCity") ||
      localStorage.getItem("businessPrimaryCity") ||
      "";
    const storedState = localStorage.getItem("businessState") || "";
    const storedPostalCode =
      localStorage.getItem("businessPostalCode") ||
      localStorage.getItem("businessZipCodes") ||
      "";
    const storedCountry = localStorage.getItem("businessCountry") || "";
    const storedServiceArea =
      localStorage.getItem("businessServiceArea") ||
      localStorage.getItem("meetroServiceAreaNotes") ||
      "";
    const fullAddress = [
      storedStreetAddress,
      storedAddressLine2,
      storedCity,
      storedState,
      storedPostalCode,
      storedCountry,
    ]
      .filter(Boolean)
      .join(", ");
    const publicLocation = showPublic
      ? fullAddress || storedServiceArea
      : storedServiceArea;

    return {
      streetAddress: storedStreetAddress,
      street_address: storedStreetAddress,
      addressLine2: storedAddressLine2,
      address_line_2: storedAddressLine2,
      city: storedCity,
      businessCity: storedCity,
      state: storedState,
      stateProvince: storedState,
      state_province: storedState,
      postalCode: storedPostalCode,
      postal_code: storedPostalCode,
      zip: storedPostalCode,
      country: storedCountry,
      serviceArea: storedServiceArea,
      service_area: storedServiceArea,
      showBusinessAddressPublic: showPublic,
      show_business_address_public: showPublic,
      fullAddress,
      full_address: fullAddress,
      publicAddress: publicLocation,
      public_address: publicLocation,
      location: publicLocation,
    };
  }

  function mergeStoredAddressFields(profileData = {}) {
    const storedAddressFields = getStoredAddressFields();
    const hasStoredAddress = Boolean(
      storedAddressFields.city ||
        storedAddressFields.state ||
        storedAddressFields.postalCode ||
        storedAddressFields.country ||
        storedAddressFields.serviceArea
    );

    if (!hasStoredAddress) return profileData;

    return {
      ...storedAddressFields,
      ...profileData,
      location:
        profileData.location ||
        storedAddressFields.publicAddress ||
        storedAddressFields.serviceArea ||
        "",
      serviceArea:
        profileData.serviceArea ||
        profileData.service_area ||
        storedAddressFields.serviceArea ||
        "",
      showBusinessAddressPublic:
        profileData.showBusinessAddressPublic === true ||
        profileData.show_business_address_public === true ||
        storedAddressFields.showBusinessAddressPublic,
    };
  }

  function buildFullAddress() {
    return [
      streetAddress.trim(),
      addressLine2.trim(),
      businessCity.trim(),
      businessState.trim(),
      businessPostalCode.trim(),
      country.trim(),
    ]
      .filter(Boolean)
      .join(", ");
  }

  function buildAddressProfileFields() {
    const fullAddress = buildFullAddress();
    const publicLocation = showBusinessAddressPublic
      ? fullAddress || serviceArea.trim()
      : serviceArea.trim();

    return {
      streetAddress: streetAddress.trim(),
      street_address: streetAddress.trim(),
      addressLine2: addressLine2.trim(),
      address_line_2: addressLine2.trim(),
      city: businessCity.trim(),
      businessCity: businessCity.trim(),
      state: businessState.trim(),
      stateProvince: businessState.trim(),
      state_province: businessState.trim(),
      postalCode: businessPostalCode.trim(),
      postal_code: businessPostalCode.trim(),
      zip: businessPostalCode.trim(),
      country: country.trim(),
      serviceArea: serviceArea.trim(),
      service_area: serviceArea.trim(),
      showBusinessAddressPublic,
      show_business_address_public: showBusinessAddressPublic,
      fullAddress,
      full_address: fullAddress,
      publicAddress: publicLocation,
      public_address: publicLocation,
      location: publicLocation,
    };
  }

  function persistBusinessAddressFields(fields) {
    localStorage.setItem("businessStreetAddress", fields.streetAddress || "");
    localStorage.setItem("businessAddressLine2", fields.addressLine2 || "");
    localStorage.setItem("businessCity", fields.city || "");
    localStorage.setItem("businessPrimaryCity", fields.city || "");
    localStorage.setItem("businessState", fields.stateProvince || fields.state || "");
    localStorage.setItem("businessPostalCode", fields.postalCode || "");
    localStorage.setItem("businessZipCodes", fields.postalCode || "");
    localStorage.setItem("businessCountry", fields.country || "");
    localStorage.setItem("businessServiceArea", fields.serviceArea || "");
    localStorage.setItem("meetroServiceAreaNotes", fields.serviceArea || "");
    localStorage.setItem(
      "showBusinessAddressPublic",
      String(Boolean(fields.showBusinessAddressPublic))
    );
    localStorage.setItem("businessLocation", fields.location || "");
  }

  function hasRequiredAddressFields() {
    return (
      businessCity.trim() &&
      businessState.trim() &&
      businessPostalCode.trim() &&
      country.trim() &&
      serviceArea.trim()
    );
  }

  function formatCategory(value) {
    const found = categories.find((item) => item[0] === value);
    return found ? found[1] : value || t("categoryNotSet");
  }

  async function handleImageUpload(event) {
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

   function saveBusinessToDirectory(profileData) {
  const existingBusinesses = JSON.parse(
    localStorage.getItem("meetroBusinesses") || "[]"
  );

  const businessRecord = {
    id: profileData.id || Date.now(),
    name: profileData.business_name || businessName,
    category: profileData.category || category,
    phone: profileData.phone || phone,
    location: profileData.location || location,
    streetAddress: profileData.streetAddress || profileData.street_address || "",
    addressLine2: profileData.addressLine2 || profileData.address_line_2 || "",
    city: profileData.city || profileData.businessCity || "",
    state: profileData.state || profileData.stateProvince || profileData.state_province || "",
    postalCode: profileData.postalCode || profileData.postal_code || profileData.zip || "",
    country: profileData.country || "",
    serviceArea: profileData.serviceArea || profileData.service_area || profileData.location || "",
    showBusinessAddressPublic: Boolean(
      profileData.showBusinessAddressPublic ||
        profileData.show_business_address_public
    ),
    publicAddress: profileData.publicAddress || profileData.public_address || profileData.location || "",
    bio: profileData.bio || bio,
    imageUrl: profileData.image_url || imageUrl,
    serviceDomain:
      profileData.serviceDomain ||
      profileData.service_domain ||
      localStorage.getItem("businessServiceDomain") ||
      localStorage.getItem("businessDomain") ||
      "",
    businessServiceDomain:
      profileData.businessServiceDomain ||
      profileData.business_service_domain ||
      localStorage.getItem("businessServiceDomain") ||
      "",
    serviceCategories:
      profileData.serviceCategories ||
      profileData.service_categories ||
      safeJsonArray("businessServiceCategories"),
    businessServiceCategories:
      profileData.businessServiceCategories ||
      profileData.business_service_categories ||
      safeJsonArray("businessServiceCategories"),
    serviceSpecialties:
      profileData.serviceSpecialties ||
      profileData.service_specialties ||
      safeJsonArray("businessServiceSpecialties"),
    businessServiceSpecialties:
      profileData.businessServiceSpecialties ||
      profileData.business_service_specialties ||
      safeJsonArray("businessServiceSpecialties"),
    primaryCity:
      profileData.primaryCity ||
      profileData.primary_city ||
      localStorage.getItem("businessPrimaryCity") ||
      "",
    city:
      profileData.city ||
      profileData.primaryCity ||
      localStorage.getItem("businessPrimaryCity") ||
      "",
    serviceZipCodes:
      profileData.serviceZipCodes ||
      profileData.service_zip_codes ||
      localStorage.getItem("businessZipCodes") ||
      "",
    businessZipCodes:
      profileData.businessZipCodes ||
      profileData.business_zip_codes ||
      localStorage.getItem("businessZipCodes") ||
      "",
    serviceRadiusMiles:
      profileData.serviceRadiusMiles ||
      profileData.service_radius_miles ||
      localStorage.getItem("businessServiceRadius") ||
      "",
    localDemoSafe:
      profileData.localDemoSafe ||
      profileData.demoSafe ||
      localStorage.getItem("businessLocalDemoSafe") === "true" ||
      undefined,
    portfolio: profileData.portfolio || [],
    gallery: profileData.gallery || [],
    photos: profileData.photos || [],
    portfolioImages: profileData.portfolioImages || [],
    businessPortfolio: profileData.businessPortfolio || [],
    media: profileData.media || [],
    images: profileData.images || [],
    rating: profileReviewStats.totalReviews ? profileReviewStats.averageRating : "",
  };

  const filteredBusinesses =
    existingBusinesses.filter(
      (item) => item.id !== businessRecord.id
    );

  localStorage.setItem(
    "meetroBusinesses",
    JSON.stringify([
      businessRecord,
      ...filteredBusinesses,
    ])
  );
}

function safeJsonArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
  async function handleCreateProfile() {
    try {
      if (!businessName.trim() || !category.trim() || !hasRequiredAddressFields()) {
        alert(t("completeAllFields"));
        return;
      }
      const addressFields = buildAddressProfileFields();

      const result = await authFetch(
        "/contractor-profiles",
        {
          method: "POST",
          body: JSON.stringify({
            business_name: businessName.trim(),
            category,
            phone,
            location: addressFields.location,
            bio,
            image_url: imageUrl,
            ...addressFields,
          }),
        },
        setPage
      );

      if (!result) return;

      const data = result.data;

      if (data.profile) {
        const savedProfile = { ...data.profile, ...addressFields, phone };
        alert(t("contractorProfileCreated"));
        setProfile(savedProfile);
        fillForm(savedProfile);
        persistBusinessAddressFields(addressFields);
        unlockBusinessAccess(savedProfile);
      
        saveBusinessToDirectory(savedProfile);
        
        setPage("profile");
      } else {
        alert(data.error || t("failedCreateProfile"));
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

      if (!businessName.trim() || !category.trim() || !hasRequiredAddressFields()) {
        alert(t("completeAllFields"));
        return;
      }
      const addressFields = buildAddressProfileFields();

      const result = await authFetch(
        `/contractor-profiles/${profile.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            business_name: businessName.trim(),
            category,
            phone,
            location: addressFields.location,
            bio,
            image_url: imageUrl,
            ...addressFields,
          }),
        },
        setPage
      );

      if (!result) return;

      const data = result.data;

      if (data.profile) {
        const savedProfile = { ...profile, ...data.profile, ...addressFields, phone };
        alert(t("profileUpdated"));
        setProfile(savedProfile);
        fillForm(savedProfile);
        persistBusinessAddressFields(addressFields);
        unlockBusinessAccess(savedProfile);
        
        saveBusinessToDirectory(savedProfile);         

        setEditing(false);
      } else {
        alert(data.error || t("failedUpdateProfile"));
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
  const profileDisplayAddress =
    profile?.showBusinessAddressPublic && profile?.fullAddress
      ? profile.fullAddress
      : profile?.serviceArea || profile?.location || "";
  const profileCompletionPercent = profile ? 92 : 0;
  const healthItems = [
    {
      icon: "profile",
      label: t("profileComplete"),
      value: `${profileCompletionPercent}%`,
    },
    {
      icon: "availableNow",
      label: t("availableNow"),
      value: availableNow ? t("active") : t("inactive"),
    },
    {
      icon: "portfolio",
      label: t("portfolioReady"),
      value: imageUrl || profile?.image_url ? t("ready") : t("preview"),
    },
    {
      icon: "emergency",
      label: t("emergencyReady"),
      value: dispatchReady ? t("ready") : t("notSet"),
    },
    {
      icon: "messages",
      label: t("fastResponse"),
      value: t("ready"),
    },
  ];

  const publicProfileRecord = () => ({
    id: profile?.id || localStorage.getItem("selectedProfessionalId") || "",
    name: profile?.business_name || businessName,
    business_name: profile?.business_name || businessName,
    category: profile?.category || category,
    displayCategory: formatCategory(profile?.category || category),
    location: profileDisplayAddress || serviceArea || location,
    serviceArea: profile?.serviceArea || serviceArea,
    phone: profile?.phone || phone,
    bio: profile?.bio || bio,
    image_url: profile?.image_url || imageUrl,
    imageUrl: profile?.image_url || imageUrl,
    logo: profile?.image_url || imageUrl,
    rating: profileReviewStats.totalReviews ? profileReviewStats.averageRating : "",
    status: availableNow ? "active" : "preview",
  });

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

  return (
    <div className="app-page meetro-readable-page" style={pageWrapper}>
           
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
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          uploading={uploading}
          availableNow={availableNow}
          setAvailableNow={setAvailableNow}
          dispatchReady={dispatchReady}
          setDispatchReady={setDispatchReady}
          handleImageUpload={handleImageUpload}
          submitLabel={
  businessName || category || phone || location || bio || imageUrl
    ? t("saveChanges")
    : t("createProfile")
}
          onSubmit={handleCreateProfile}
        />
      )}

      {profile && !editing && (
        <>
          <div style={heroCard}>
            <div style={heroGlow}></div>

            <div style={identityHeroLayout}>
              <div style={heroLogoFrame}>
                {profile.image_url ? (
                  <img
                    src={profile.image_url}
                    alt={profile.business_name}
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
                  name={profile.business_name || t("businessNameNotSet")}
                  variant="hero"
                />
                <p style={identityHeroMeta}>
                  {formatCategory(profile.category)}
                </p>
                <p style={identityHeroMeta}>
                  <MeetroIcon name="location" size={14} decorative />{" "}
                  {profileDisplayAddress || t("locationNotSet")}
                </p>
              </div>

              <div style={verifiedBadge}>
                <MeetroIcon name="verified" size={14} decorative />{" "}
                {t("verifiedBusiness")}
              </div>
            </div>
          </div>

          <div style={glassCard}>
            <h2 style={compactCardTitle}>{t("businessHealth")}</h2>
            <div style={businessHealthGrid}>
              {healthItems.map((item) => (
                <div key={item.label} style={businessHealthItem}>
                  <span style={businessHealthIcon}>
                    <MeetroIcon name={item.icon} size={16} decorative />
                  </span>
                  <span style={businessHealthLabel}>{item.label}</span>
                  <strong style={businessHealthValue}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={glassCard}>
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

          <div style={glassCard}>
            <h2 style={compactCardTitle}>{t("businessInformation")}</h2>
            <div style={bioCard}>
              <h3 style={bioTitle}>{t("aboutBusiness")}</h3>
              <p style={bioStyle}>{profile.bio || t("noBusinessDescription")}</p>
            </div>

            <div style={infoGrid}>
              <InfoCard
                icon="serviceTypes"
                label={t("category")}
                value={formatCategory(profile.category)}
              />
              <InfoCard
                icon="location"
                label={
                  profile.showBusinessAddressPublic
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
                value={availableNow ? t("availableNow") : t("notSet")}
              />
              <InfoCard
                icon="verified"
                label={t("licenseInformation")}
                value={t("notProvided")}
              />
            </div>
          </div>

          <div style={glassCard}>
            <div style={bioCard}>
              <h3 style={bioTitle}>{t("reviews")}</h3>
              {profileReviews.length === 0 ? (
                <div style={emptyReviewsCard}>
                  <strong>{t("noReviewsYet")}</strong>
                  <p style={bioStyle}>
                    {t("reviewsAfterCompletedJobs")}
                  </p>
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
          </div>

          <div style={glassCard}>
            <div style={customerPreviewLauncher}>
              <div>
                <h2 style={compactCardTitle}>{t("customerPreview")}</h2>
                <p style={bioStyle}>{t("customerPreviewHelp")}</p>
              </div>
              <button onClick={viewPublicProfile} style={smallEditButton}>
                {t("viewPublicProfile")} →
              </button>
            </div>
          </div>
        </>
      )}

      {profile && editing && (
        <ProfileForm
          title={t("editBusinessProfile")}
          businessName={businessName}
          setBusinessName={setBusinessName}
          category={category}
          setCategory={setCategory}
          categories={categories}
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
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          uploading={uploading}
          availableNow={availableNow}
          setAvailableNow={setAvailableNow}
          dispatchReady={dispatchReady}
          setDispatchReady={setDispatchReady}
          handleImageUpload={handleImageUpload}
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
  imageUrl,
  setImageUrl,
  uploading,
  availableNow,
  setAvailableNow,
  dispatchReady,
  setDispatchReady,
  handleImageUpload,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const inputId = onCancel ? "contractorImageEditInput" : "contractorImageInput";

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
            {t("businessLogoHelp")}
          </p>

          <input
            id={inputId}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />

          <button
            type="button"
            onClick={() => document.getElementById(inputId).click()}
            style={uploadButton}
          >
            {imageUrl ? t("changeLogo") : t("uploadLogo")}
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
  {categories.map(([value, label]) => (
    <option key={value || "empty"} value={value}>
      {label}
    </option>
  ))}
</select>

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
            onChange={(e) => {
              setCountry(e.target.value);
              localStorage.setItem("businessCountry", e.target.value);
            }}
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
                ? "linear-gradient(135deg, #5b3df5, #7b61ff)"
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
          onClick={() => {
            const nextValue = !availableNow;
            setAvailableNow(nextValue);
            localStorage.setItem("meetroAvailableNow", String(nextValue));
            window.dispatchEvent(new Event("meetroAvailabilityChanged"));
          }}
          style={{
            ...toggleButton,
            background: availableNow ? "linear-gradient(135deg, #5b3df5, #7b61ff)" : "rgba(255,255,255,0.75)",
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
            background: dispatchReady ? "linear-gradient(135deg, #5b3df5, #7b61ff)" : "rgba(255,255,255,0.75)",
            color: dispatchReady ? "white" : "#333",
          }}
        >
          <MeetroIcon name="dispatch" size={14} decorative /> {t("dispatchReady")}
        </button>
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
    variant === "preview"
      ? previewAmpersandBusinessTitle
      : heroAmpersandBusinessTitle;

  if (ampersandIndex === -1) {
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
  color: "#5b3df5",
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
    "linear-gradient(135deg, #111b46 0%, #243b8f 42%, #5b3df5 100%)",
  borderRadius: "38px",
  padding: "26px",
  color: "white",
  marginBottom: "22px",
  boxShadow:
    "0 24px 60px rgba(35,54,139,0.38)",
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
  margin: "10px auto",
  maxWidth: "min(100%, 560px)",
  fontSize: "clamp(34px, 9vw, 42px)",
  lineHeight: 1.08,
  textAlign: "center",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
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
  whiteSpace: "nowrap",
  border: "1px solid rgba(255,255,255,0.18)",
};

const identityHeroLayout = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "88px minmax(0, 1fr)",
  alignItems: "center",
  gap: "16px",
};

const heroLogoFrame = {
  width: "88px",
  height: "88px",
  minWidth: "88px",
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
};

const identityHeroMeta = {
  margin: "7px 0 0",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
  color: "rgba(255,255,255,0.88)",
  fontSize: "14px",
  fontWeight: "850",
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

const businessHealthGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "10px",
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
  color: "#5b3df5",
  background: "#f3f0ff",
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
  background: "#f3f0ff",
  color: "#5b3df5",
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
};

const customerPreviewLauncher = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
};

const smallEditButton = {
  border: "none",
  background: "#f1edff",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
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
    "0 16px 38px rgba(91,61,245,0.22)",
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

const heroAmpersandBusinessTitle = {
  display: "grid",
  gap: "2px",
  justifyItems: "center",
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
  color: "#5b3df5",
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
  boxShadow: "0 10px 30px rgba(91,61,245,0.06)",
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
  background: "linear-gradient(135deg, #5b3df5, #7b61ff)",
  color: "white",
  padding: "11px 15px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(91,61,245,0.24)",
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
  color: "#5b3df5",
  fontWeight: "900",
  marginBottom: 0,
};

const inputStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid rgba(91,61,245,0.08)",
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
  border: "1px solid rgba(91,61,245,0.08)",
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
  background: "#eee7ff",
  color: "#5b3df5",
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
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(226,232,240,0.9)",
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
  background: "#f8f7ff",
  borderRadius: "18px",
  padding: "14px 8px",
  display: "grid",
  gap: "6px",
  textAlign: "center",
  color: "#5b3df5",
  fontWeight: "900",
  fontSize: "12px",
};

const primaryButton = {
  width: "100%",
  padding: "18px",
  border: "none",
  borderRadius: "22px",
  background:
    "linear-gradient(135deg, #5b3df5 0%, #7b61ff 100%)",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow:
    "0 16px 34px rgba(91,61,245,0.28)",
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
  background: "rgba(91,61,245,0.22)",
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
  background: "#f3f0ff",
  color: "#5b3df5",
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
  marginTop: "12px",
};
export default ContractorProfile;
