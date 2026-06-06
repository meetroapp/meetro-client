import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";
import { setActiveAccountMode } from "../utils/session";

function ContractorProfile({ setPage, currentPage }) {
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
  
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [availableNow, setAvailableNow] = useState(
    localStorage.getItem("meetroAvailableNow") === "true"
  );
  const [dispatchReady, setDispatchReady] = useState(
  localStorage.getItem("meetroDispatchReady") === "true"
);

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
      bio:
        profileData.bio || "",
      image_url:
        profileData.image_url || "",
      logo:
        profileData.image_url || "",
      rating:
        profileData.rating || "5.0",
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
        setProfile(data.profile);
        fillForm(data.profile);
        unlockBusinessAccess(data.profile);
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
    setLocation(existingProfile.location || "");
    setBio(existingProfile.bio || "");
    setImageUrl(existingProfile.image_url || "");
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
    bio: profileData.bio || bio,
    imageUrl: profileData.image_url || imageUrl,
    rating:
      localStorage.getItem(
        "professionalRatingAverage"
      ) || "5.0",
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
  async function handleCreateProfile() {
    try {
      if (!businessName.trim() || !category.trim() || !location.trim()) {
        alert(t("completeAllFields"));
        return;
      }

      const result = await authFetch(
        "/contractor-profiles",
        {
          method: "POST",
          body: JSON.stringify({
            business_name: businessName.trim(),
            category,
            phone,
            location,
            bio,
            image_url: imageUrl,
          }),
        },
        setPage
      );

      if (!result) return;

      const data = result.data;

      if (data.profile) {
        alert(t("contractorProfileCreated"));
        setProfile(data.profile);
        fillForm(data.profile);
        unlockBusinessAccess(data.profile);
      
        saveBusinessToDirectory(data.profile);
        
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

      if (!businessName.trim() || !category.trim() || !location.trim()) {
        alert(t("completeAllFields"));
        return;
      }

      const result = await authFetch(
        `/contractor-profiles/${profile.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            business_name: businessName.trim(),
            category,
            phone,
            location,
            bio,
            image_url: imageUrl,
          }),
        },
        setPage
      );

      if (!result) return;

      const data = result.data;

      if (data.profile) {
        alert(t("profileUpdated"));
        setProfile(data.profile);
        fillForm(data.profile);
        unlockBusinessAccess(data.profile);
        
        saveBusinessToDirectory(data.profile);         

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

  return (
    <div style={pageWrapper}>
           
      <button
  onClick={() => {
    setPage("businessDashboard");
  }}
  style={backButton}
>
  ← {t("backToDashboard")}
</button>
      
      <div style={heroCard}>
        <div style={heroGlow}></div>

        <div style={heroTop}>
          <div>
            <p style={eyebrow}>{t("businessProfile")}</p>
            <h1 style={pageTitle}>
              {profile?.business_name || businessName || t("yourBusiness")}
            </h1>
            <p style={pageSubtitle}>
              Manage your public business profile, logo, contact details, and customer trust signals.
            </p>
          </div>

          <div style={verifiedBadge}>
            {profile ? `⭐ ${t("verifiedBusiness")}` : "🔒 Setup Required"}
          </div>
        </div>

          <div style={heroStats}>
  <div style={heroStat}>
    <strong>
      {localStorage.getItem("professionalRatingAverage") || "4.9"}
    </strong>
    <span>
      ⭐ {localStorage.getItem("professionalReviewCount") || "0"} {t("reviews")}
    </span>
  </div>

          <div style={heroStat}>
            <strong>{profile ? "92%" : "0%"}</strong>
            <span>{t("profileScore")}</span>
          </div>

          <div style={heroStat}>
            <strong>{availableNow ? "ON" : "OFF"}</strong>
            <span>{t("availableNow")}</span>
          </div>
        </div>
      </div>

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
          <div style={logoGlassCard}>
            <div style={logoHeaderRow}>
              <div>
                <p style={miniLabel}>Business Logo</p>
                <h2 style={logoCardTitle}>Brand Preview</h2>
              </div>
              <button onClick={() => setEditing(true)} style={smallEditButton}>
                Change
              </button>
            </div>

            <div style={logoPreviewWrap}>
              <div style={circleLogoFrame}>
                {profile.image_url ? (
                  <img
                    src={profile.image_url}
                    alt={profile.business_name}
                    style={circleLogoImage}
                  />
                ) : (
                  <div style={circleLogoPlaceholder}>🏢</div>
                )}
              </div>

              <div style={logoBusinessInfo}>
                <h2 style={businessTitle}>
                  {profile.business_name || t("businessNameNotSet")}
                </h2>
                <p style={categoryStyle}>{formatCategory(profile.category)}</p>
                <p style={locationMini}>📍 {profile.location || t("locationNotSet")}</p>
              </div>
            </div>
          </div>

          <div style={glassCard}>
            <div style={actionRow}>
              {profile.phone && (
                <a href={`tel:${profile.phone}`} style={callButton}>
                  📞 {t("call")}
                </a>
              )}

              <button onClick={() => setPage("messagesInbox")} style={messageButton}>
                💬 {t("messages")}
              </button>
            </div>

            <div style={statusRow}>
              <button
                type="button"
                onClick={() => {
  const nextValue = !availableNow;
  setAvailableNow(nextValue);
  localStorage.setItem("meetroAvailableNow", String(nextValue));
  window.dispatchEvent(new Event("meetroAvailabilityChanged"));
}}
                style={{
                  ...statusButton,
                  background: availableNow
                    ? "linear-gradient(135deg, #5b3df5, #7b61ff)"
                    : "rgba(255,255,255,0.7)",
                  color: availableNow ? "white" : "#333",
                }}
              >
                {availableNow ? "🟢 " : ""}
                {t("availableNow")}
              </button>

              <button
                type="button"
                onClick={() => {
  const nextValue = !dispatchReady;
  setDispatchReady(nextValue);
  localStorage.setItem("meetroDispatchReady", String(nextValue));
  window.dispatchEvent(new Event("meetroDispatchReadyChanged"));
}}
                style={{
                  ...statusButton,
                  background: dispatchReady
                    ? "linear-gradient(135deg, #5b3df5, #7b61ff)"
                    : "rgba(255,255,255,0.7)",
                  color: dispatchReady ? "white" : "#333",
                }}
              >
                🚗 {t("dispatchReady")}
              </button>
            </div>

            <div style={infoGrid}>
              <InfoCard label={`📍 ${t("location")}`} value={profile.location || t("locationNotSet")} />
              <InfoCard label={`📞 ${t("phone")}`} value={profile.phone || t("phoneNotSet")} />
            </div>

            <div style={bioCard}>
              <h3 style={bioTitle}>{t("aboutBusiness")}</h3>
              <p style={bioStyle}>{profile.bio || t("noBusinessDescription")}</p>
            </div>

            <div style={trustGrid}>
              <div style={trustCard}>
                <strong>✅</strong>
                <span>{t("verifiedProfessional")}</span>
              </div>

              <div style={trustCard}>
                <strong>⚡</strong>
                <span>{t("fastResponse")}</span>
              </div>

              <div style={trustCard}>
                <strong>🖼️</strong>
                <span>{t("portfolioReady")}</span>
              </div>
            </div>

            <button onClick={() => setEditing(true)} style={primaryButton}>
              {t("editProfile")}
            </button>
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
            <div style={circleLogoPlaceholder}>🏢</div>
          )}
        </div>

        <div style={uploadInfo}>
          <h3 style={uploadTitle}>Business Logo</h3>
          <p style={uploadSubtext}>
            Upload a clean square logo or profile image. Meetro will keep it circular and prevent stretching.
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
            {imageUrl ? "Change Logo" : "Upload Logo"}
          </button>

          {imageUrl && (
            <button type="button" onClick={() => setImageUrl("")} style={removeButton}>
              Remove Image
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

<select
  value={country}
  onChange={(e) => {
    setCountry(e.target.value);
    localStorage.setItem("businessCountry", e.target.value);
    setLocation("");
  }}
  style={inputStyle}
>
  <option value="">
    {language === "es" ? "Seleccionar país" : "Select Country"}
  </option>
  <option value="US">United States</option>
  <option value="CA">Canada</option>
  <option value="MX">Mexico</option>
  <option value="OTHER">
    {language === "es" ? "Otro" : "Other"}
  </option>
</select>

{country && (
  <textarea
    placeholder={
      country === "US"
        ? "Street address, city, state, ZIP"
        : country === "CA"
        ? "Street address, city, province, postal code"
        : country === "MX"
        ? "Street address, city, state, postal code"
        : "Full business address"
    }
    value={location}
    onChange={(e) => setLocation(e.target.value)}
    style={{
      ...inputStyle,
      minHeight: "90px",
      resize: "vertical",
      fontFamily: "inherit",
    }}
  />
)}

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
          {availableNow ? "🟢 " : ""}
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
          🚗 {t("dispatchReady")}
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

function InfoCard({ label, value }) {
  return (
    <div style={infoCard}>
      <span style={infoLabel}>{label}</span>
      <span style={infoValue}>{value}</span>
    </div>
  );
}

const pageWrapper = {
  background:
    "radial-gradient(circle at top left, #eef0ff 0%, transparent 28%), radial-gradient(circle at top right, #ede9ff 0%, transparent 22%), linear-gradient(to bottom, #f8f8fc 0%, #eef0f7 100%)",
  minHeight: "100vh",
  padding: "calc(env(safe-area-inset-top) + 64px) 18px 120px",
  boxSizing: "border-box",
  color: "#111",
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
  margin: "10px 0",
  fontSize: "31px",
  lineHeight: 1.08,
};

const pageSubtitle = {
  margin: 0,
  lineHeight: 1.5,
  opacity: 0.9,
  fontSize: "15px",
};

const verifiedBadge = {
  background: "rgba(255,255,255,0.16)",
  padding: "10px 13px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  height: "fit-content",
  whiteSpace: "nowrap",
  border: "1px solid rgba(255,255,255,0.18)",
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
  fontSize: "25px",
  lineHeight: 1.12,
  color: "#111",
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
  textDecoration: "none",
  background: "#ecfdf3",
  color: "#027a48",
  padding: "15px",
  borderRadius: "18px",
  fontWeight: "900",
  textAlign: "center",
};

const messageButton = {
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
  display: "block",
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
