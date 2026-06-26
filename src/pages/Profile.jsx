import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  getLanguageLabel,
  normalizeLanguage,
  setLanguage,
  t,
} from "../utils/language";
import { authFetch, clearMeetroSession } from "../utils/authFetch";
import { isProfessionalSession, setActiveAccountMode } from "../utils/session";
import {
  getScopedProfilePhoto,
  getScopedProfilePhotoKey,
} from "../utils/profilePhotoScoping";

function Profile({ setPage, currentPage }) {
  const sharedReturnPage = localStorage.getItem("meetroSharedPageReturn") || "";
  const isBusinessToolsReturn = sharedReturnPage === "businessCommandCenter";
  const [user, setUser] = useState(null);
  const [language, updateLanguage] = useState(getLanguage());
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [myProfessionalsOpen, setMyProfessionalsOpen] = useState(false);
  const [personalInfoForm, setPersonalInfoForm] = useState({
    name: localStorage.getItem("userName") || "",
    email: localStorage.getItem("userEmail") || "",
    phone:
      localStorage.getItem("meetroHomeownerPrivatePhone") ||
      localStorage.getItem("homeownerPrivatePhone") ||
      "",
  });
  const [activeSection, setActiveSection] = useState(
    localStorage.getItem("meetroProfileOpenSection") || "account"
  );
  const [activeMode, setActiveMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );
  const [businessProfile, setBusinessProfile] = useState(null);
  const [assistantVoicePreference, setAssistantVoicePreference] = useState(
    localStorage.getItem("meetroAssistantVoicePreference") || "auto"
  );
  const [profileNotice, setProfileNotice] = useState("");
  const [testFeedbackOpen, setTestFeedbackOpen] = useState(false);
  const [testFeedbackSaved, setTestFeedbackSaved] = useState(false);
  const [testFeedback, setTestFeedback] = useState({
    trying: "",
    confused: "",
    broken: "",
    easier: "",
    screenshotNote: "",
  });

  const [profilePhoto, setProfilePhoto] = useState(
    getScopedProfilePhoto(localStorage.getItem("activeAccountMode") || "personal")
  );

  useEffect(() => {
    setProfilePhoto(getScopedProfilePhoto(activeMode, businessProfile));
  }, [activeMode, businessProfile]);

  useEffect(() => {
    if (activeMode !== "business") return;

    authFetch("/my-contractor-profile", {}, setPage)
      .then((result) => {
        const profile = result?.profile || result?.data?.profile || null;

        if (!profile) return;

        setBusinessProfile(profile);

        if (profile.image_url) {
          localStorage.setItem(getScopedProfilePhotoKey("business", profile), profile.image_url);
          setProfilePhoto(profile.image_url);
        } else {
          setProfilePhoto(getScopedProfilePhoto("business", profile));
        }
      })
      .catch((error) => {
        console.error("Failed to load business profile", error);
      });
  }, [activeMode, setPage]);

  const businessName = localStorage.getItem("businessName") || "";
  const businessCategory = localStorage.getItem("businessCategory") || "";
  const userName = localStorage.getItem("userName") || "";
  const userEmail = localStorage.getItem("userEmail") || "";

  const contractorProfileComplete =
    localStorage.getItem("contractorProfileComplete") === "true";

  const hasBusinessAccess =
    isProfessionalSession() ||
    contractorProfileComplete ||
    Boolean(localStorage.getItem("businessName")) ||
    Boolean(localStorage.getItem("businessCategory"));

  const isBusinessMode = activeMode === "business" && hasBusinessAccess;

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
    localStorage.removeItem("meetroProfileOpenSection");
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const result = await authFetch(
          "/auth/me",
          {},
          setPage
        );

        if (!result.response?.ok) {
          setUser(null);
          return;
        }

        setUser(result.data?.user || null);
      } catch (error) {
        console.error(error);
      }
    }

    fetchUser();
  }, [language]);

  function handleProfilePhotoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const imageResult = reader.result;

      setProfilePhoto(imageResult);

      const photoKey =
        getScopedProfilePhotoKey(activeMode, businessProfile);

      localStorage.setItem(photoKey, imageResult);

      if (activeMode !== "business") {
        localStorage.setItem(getScopedProfilePhotoKey("personal"), imageResult);
      }

      if (activeMode === "business") {
        if (!businessProfile?.id) {
          console.warn("No business profile found for logo update");
        } else {
          authFetch(
            `/contractor-profiles/${businessProfile.id}`,
            {
              method: "PUT",
              body: JSON.stringify({
                business_name:
                  businessProfile.business_name || businessName || "",
                category:
                  businessProfile.category || businessCategory || "",
                phone: businessProfile.phone || "",
                location: businessProfile.location || "",
                bio: businessProfile.bio || "",
                image_url: imageResult,
              }),
            },
            setPage
          )
            .then((result) => {
              const savedProfile =
                result?.profile || result?.data?.profile || null;
              const savedUrl =
                savedProfile?.image_url || imageResult;

              setBusinessProfile(savedProfile || businessProfile);
              localStorage.setItem(
                getScopedProfilePhotoKey("business", savedProfile || businessProfile),
                savedUrl
              );
              localStorage.setItem("businessImageUrl", savedUrl);
              setProfilePhoto(savedUrl);
            })
            .catch((error) => {
              console.error("Failed to save business logo", error);
            });
        }
      }

      if (activeMode !== "business") {
        authFetch(
          "/auth/profile-photo",
          {
            method: "PUT",
            body: JSON.stringify({
              profile_photo_url: imageResult,
            }),
          },
          setPage
        )
          .then((result) => {
            const savedUrl =
              result?.user?.profile_photo_url || imageResult;

            localStorage.setItem(getScopedProfilePhotoKey("personal"), savedUrl);
            setProfilePhoto(savedUrl);
          })
          .catch((error) => {
            console.error("Failed to save profile photo", error);
          });
      }

      window.dispatchEvent(
        new Event("meetro-profile-photo-updated")
      );
    };

    reader.readAsDataURL(file);
  }

  function handleLogout() {
    clearMeetroSession();

    window.location.hash = "login";

    window.location.reload();
  }

  function handleLanguageSelect(languageCode) {
    const nextLanguage = normalizeLanguage(languageCode);
    setLanguage(nextLanguage);
    updateLanguage(nextLanguage);
    setLanguagePickerOpen(false);
  }

  function updateAssistantVoicePreference(value) {
    localStorage.setItem("meetroAssistantVoicePreference", value);
    setAssistantVoicePreference(value);
  }

  function switchMode(mode) {
    if (mode === "business" && !hasBusinessAccess) {
      setPage("contractorProfile");
      return;
    }

    setActiveAccountMode(mode);
    localStorage.setItem("meetroPreferredAccountMode", mode);
    setActiveMode(mode);

    const nextPage = mode === "business" ? "businessDashboard" : "home";

    window.location.hash = nextPage;
    window.dispatchEvent(new Event("accountModeChanged"));

    setPage(nextPage);
  }

  function openPersonalInfoSheet() {
    setPersonalInfoForm({
      name:
        localStorage.getItem("userName") ||
        user?.name ||
        localStorage.getItem("businessName") ||
        "",
      email: user?.email || localStorage.getItem("userEmail") || "",
      phone:
        localStorage.getItem("meetroHomeownerPrivatePhone") ||
        localStorage.getItem("homeownerPrivatePhone") ||
        user?.phone ||
        "",
    });
    setPersonalInfoOpen(true);
  }

  function savePersonalInfo() {
    const nextName = personalInfoForm.name.trim();
    const nextEmail = personalInfoForm.email.trim();
    const nextPhone = personalInfoForm.phone.trim();
    const previousPhoneOwnerKeys = [
      localStorage.getItem("meetroHomeownerPrivatePhoneOwnerName"),
      localStorage.getItem("meetroHomeownerPrivatePhoneOwnerEmail"),
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    previousPhoneOwnerKeys.forEach((key) => {
      localStorage.removeItem(`meetroHomeownerPrivatePhone:${key}`);
    });

    if (nextName) {
      localStorage.setItem("userName", nextName);
    }

    if (nextEmail) {
      localStorage.setItem("userEmail", nextEmail);
    }

    if (nextPhone) {
      localStorage.setItem("meetroHomeownerPrivatePhone", nextPhone);
      localStorage.setItem("homeownerPrivatePhone", nextPhone);
      if (nextName) {
        localStorage.setItem(
          `meetroHomeownerPrivatePhone:${nextName.trim().toLowerCase()}`,
          nextPhone
        );
      }
      if (nextEmail) {
        localStorage.setItem(
          `meetroHomeownerPrivatePhone:${nextEmail.trim().toLowerCase()}`,
          nextPhone
        );
      }
      localStorage.setItem("meetroHomeownerPrivatePhoneOwnerName", nextName);
      localStorage.setItem("meetroHomeownerPrivatePhoneOwnerEmail", nextEmail);
    } else {
      localStorage.removeItem("meetroHomeownerPrivatePhone");
      localStorage.removeItem("homeownerPrivatePhone");
      if (nextName) {
        localStorage.removeItem(
          `meetroHomeownerPrivatePhone:${nextName.trim().toLowerCase()}`
        );
      }
      if (nextEmail) {
        localStorage.removeItem(
          `meetroHomeownerPrivatePhone:${nextEmail.trim().toLowerCase()}`
        );
      }
      localStorage.removeItem("meetroHomeownerPrivatePhoneOwnerName");
      localStorage.removeItem("meetroHomeownerPrivatePhoneOwnerEmail");
    }

    setUser((currentUser) => ({
      ...(currentUser || {}),
      ...(nextName ? { name: nextName } : {}),
      ...(nextEmail ? { email: nextEmail } : {}),
      phone: nextPhone,
    }));
    setProfileNotice(t("personalInformationSaved"));
    setPersonalInfoOpen(false);
  }

  function renderPersonalInfoFields() {
    return (
      <>
        <label style={feedbackLabel}>
          {t("name")}
          <input
            style={personalInfoInput}
            value={personalInfoForm.name}
            onChange={(event) =>
              setPersonalInfoForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </label>

        <label style={feedbackLabel}>
          {t("email")}
          <input
            type="email"
            style={personalInfoInput}
            value={personalInfoForm.email}
            onChange={(event) =>
              setPersonalInfoForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
        </label>

        <label style={feedbackLabel}>
          {t("homeownerMobileNumber")}
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            style={personalInfoInput}
            value={personalInfoForm.phone}
            onChange={(event) =>
              setPersonalInfoForm((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
          />
        </label>

        <p style={privatePhoneHelpText}>
          <MeetroIcon name="privacy" size={14} decorative />
          {t("homeownerMobilePrivacyNotice")}
        </p>
        <p style={assistantSettingHelp}>{t("personalInformationHelp")}</p>
      </>
    );
  }

  function openProfessionalPage(pageName) {
    if (!hasBusinessAccess) {
      setActiveSection("professional");
      return;
    }

    setPage(pageName);
  }

  function openWorkCenterSection(section) {
    if (!hasBusinessAccess) {
      setActiveSection("professional");
      return;
    }

    localStorage.setItem("meetroWorkCenterTab", section);
    localStorage.setItem("activeWorkCenterTab", section);
    setPage("contractorDashboard");
  }

  function openLegalDocument(documentId) {
    localStorage.setItem("meetroSelectedLegalDocument", documentId);
    localStorage.setItem("meetroLegalReturnPage", "profile");
    setPage("legal");
  }

  function startMeetroTour() {
    window.dispatchEvent(
      new CustomEvent("meetroStartTour", {
        detail: {
          tourType: isBusinessMode ? "professional" : "homeowner",
          manual: true,
        },
      })
    );
  }

  function readLocalQueue(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function updateTestFeedback(field, value) {
    setTestFeedbackSaved(false);
    setTestFeedback((current) => ({ ...current, [field]: value }));
  }

  function saveTestFeedback() {
    const feedbackItem = {
      id: `profile-feedback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      screen: "profile",
      screenName: "Profile",
      roleMode: activeMode,
      role: activeMode,
      mode: activeMode,
      route: window.location.hash || "profile",
      category: "Friends and family TestFlight",
      feedbackCategory: "Friends and family TestFlight",
      whatTrying: testFeedback.trying.trim(),
      whatConfused: testFeedback.confused.trim(),
      whatDidNotWork: testFeedback.broken.trim(),
      whatWouldMakeEasier: testFeedback.easier.trim(),
      screenshotNote: testFeedback.screenshotNote.trim(),
      note: [
        testFeedback.trying && `Trying: ${testFeedback.trying.trim()}`,
        testFeedback.confused && `Confusing: ${testFeedback.confused.trim()}`,
        testFeedback.broken && `Did not work: ${testFeedback.broken.trim()}`,
        testFeedback.easier && `Easier if: ${testFeedback.easier.trim()}`,
        testFeedback.screenshotNote && `Screenshot note: ${testFeedback.screenshotNote.trim()}`,
      ]
        .filter(Boolean)
        .join("\n"),
      type: "testflight_feedback",
    };

    try {
      ["meetro_ai_test_feedback", "meetro_testflight_review_queue"].forEach((key) => {
        const savedFeedback = readLocalQueue(key);
        localStorage.setItem(key, JSON.stringify([feedbackItem, ...savedFeedback]));
      });
      setTestFeedbackSaved(true);
      setTestFeedback({
        trying: "",
        confused: "",
        broken: "",
        easier: "",
        screenshotNote: "",
      });
      setTestFeedbackOpen(false);
    } catch {
      setTestFeedbackSaved(true);
    }
  }

  function toggleSection(section) {
    setActiveSection(activeSection === section ? "" : section);
  }

  const displayName =
    isBusinessMode && businessName
      ? businessName
      : userName || user?.name || user?.email || userEmail || t("meetroAccount");

  const displayEmail = user?.email || userEmail || t("emailNotAvailable");
  const homeownerCity =
    localStorage.getItem("userCity") ||
    localStorage.getItem("homeownerCity") ||
    localStorage.getItem("city") ||
    "";
  const homeownerServiceArea =
    localStorage.getItem("homeownerServiceArea") ||
    localStorage.getItem("serviceArea") ||
    homeownerCity ||
    t("notSet");
  const memberSinceValue =
    user?.created_at ||
    user?.createdAt ||
    localStorage.getItem("memberSince") ||
    localStorage.getItem("userCreatedAt") ||
    "";
  const memberSinceLabel = memberSinceValue
    ? new Date(memberSinceValue).toLocaleDateString(
        language === "es"
          ? "es-US"
          : language === "fr"
          ? "fr-FR"
          : language === "pt-BR"
          ? "pt-BR"
          : "en-US",
        { month: "short", year: "numeric" }
      )
    : t("notSet");
  const primaryAddress =
    localStorage.getItem("primaryPropertyAddress") ||
    localStorage.getItem("primaryServiceAddress") ||
    localStorage.getItem("fullServiceAddress") ||
    localStorage.getItem("userAddress") ||
    "";
  const savedAddresses = [
    ...readLocalQueue("meetroSavedAddresses"),
    ...readLocalQueue("savedAddresses"),
  ];
  const completedRecords = [
    ...readLocalQueue("completedProjects"),
    ...readLocalQueue("homeownerRequests").filter((request) =>
      ["completed", "closed"].includes(String(request?.status || "").toLowerCase())
    ),
  ];
  const trustedProfessionals = [
    ...new Map(
      completedRecords
        .map((record) => {
          const name =
            record.professionalName ||
            record.businessName ||
            record.selectedProfessional ||
            record.acceptedQuote?.businessName ||
            "";
          if (!name) return null;
          return [
            name,
            {
              name,
              category: record.category || record.service || record.serviceType || "",
              lastProject: record.title || record.service || record.description || "",
              rating: record.review?.rating || record.rating || "",
              requestId: record.requestId || record.id || record.projectId || "",
              conversationId:
                record.conversationId ||
                record.activeConversationId ||
                record.projectConversationId ||
                record.requestId ||
                record.id ||
                "",
            },
          ];
        })
        .filter(Boolean)
    ).values(),
  ];
  const writtenReviews = completedRecords
    .map((record) => record.review)
    .filter(Boolean);
  const profileCopyByLanguage = {
    en: {
      testerTitle: "Friends & Family TestFlight",
      testerText:
        "Help us test the full Meetro experience. Try creating a request, messaging, scheduling, reviewing a quote, and sending feedback when something feels confusing.",
      checklist: [
        "Create a service request",
        "Add photos",
        "Send a message",
        "Review a schedule",
        "Review a quote",
        "Try the assistant",
        "Send feedback",
      ],
      sendFeedback: "Send Feedback",
      hideFeedback: "Hide Feedback",
      feedbackSaved: "Thanks. Feedback saved on this device for TestFlight review.",
      trying: "What were you trying to do?",
      confused: "What confused you?",
      broken: "What did not work?",
      easier: "What would make this easier?",
      screenshotNote: "Optional screenshot note",
      saveFeedback: "Save Feedback",
    },
    es: {
      testerTitle: "Prueba de TestFlight con amigos y familia",
      testerText:
        "Ayúdanos a probar la experiencia completa de Meetro. Intenta crear una solicitud, enviar mensajes, revisar una agenda, revisar una cotización y enviar comentarios cuando algo sea confuso.",
      checklist: [
        "Crear una solicitud de servicio",
        "Agregar fotos",
        "Enviar un mensaje",
        "Revisar una agenda",
        "Revisar una cotización",
        "Probar el asistente",
        "Enviar comentarios",
      ],
      sendFeedback: "Enviar comentarios",
      hideFeedback: "Ocultar comentarios",
      feedbackSaved: "Gracias. Comentario guardado en este dispositivo para revisión de TestFlight.",
      trying: "¿Qué intentabas hacer?",
      confused: "¿Qué te confundió?",
      broken: "¿Qué no funcionó?",
      easier: "¿Qué lo haría más fácil?",
      screenshotNote: "Nota opcional de captura de pantalla",
      saveFeedback: "Guardar comentario",
    },
  };
  const profileCopy = profileCopyByLanguage[language] || profileCopyByLanguage.en;

  if (!isBusinessMode) {
    if (myProfessionalsOpen) {
      return (
        <div className="app-page meetro-readable-page" style={pageWrapper}>
          <button
            type="button"
            style={compactBackButton}
            onClick={() => setMyProfessionalsOpen(false)}
          >
            ← {t("backToProfile")}
          </button>

          <div style={settingsHeader}>
            <div>
              <p style={settingsEyebrow}>{t("relationshipResource")}</p>
              <h1 style={settingsTitle}>{t("myProfessionals")}</h1>
              <p style={settingsSubtitle}>{t("myProfessionalsSubtitle")}</p>
            </div>
          </div>

          <SettingsGroup title={t("myProfessionals")} icon="customerRelationships">
            {trustedProfessionals.length > 0 ? (
              trustedProfessionals.map((professional) => (
                <div key={professional.name} style={professionalCard}>
                  <div style={professionalCardTop}>
                    <span style={rowIcon}>
                      <ProfileIcon name="businessProfile" size={18} />
                    </span>
                    <div style={professionalCardIdentity}>
                      <strong>{professional.name}</strong>
                      <span>
                        {professional.lastProject ||
                          professional.category ||
                          t("recentlyUsed")}
                      </span>
                    </div>
                    <span style={relationshipBadge}>
                      {professional.rating
                        ? `${professional.rating}/5`
                        : t("trusted")}
                    </span>
                  </div>
                  <div style={professionalActions}>
                    <button
                      type="button"
                      style={inlineSecondaryAction}
                      onClick={() => {
                        if (professional.conversationId) {
                          localStorage.setItem(
                            "activeConversationId",
                            String(professional.conversationId)
                          );
                          localStorage.setItem("activeConversationName", professional.name);
                          localStorage.setItem("conversationReturnPage", "profile");
                          setPage("conversationThread");
                        } else {
                          setPage("messagesInbox");
                        }
                      }}
                    >
                      {t("message")}
                    </button>
                    <button
                      type="button"
                      style={inlineSectionAction}
                      onClick={() => {
                        const directRequestId = `direct-${Date.now()}`;
                        localStorage.setItem("requestProfessionalContext", professional.name);
                        localStorage.setItem("directRequestMode", "true");
                        localStorage.setItem("directRequestSource", "hire_again");
                        localStorage.setItem("directRequestProfessionalName", professional.name);
                        localStorage.setItem("directRequestProfessionalCategory", professional.category || "");
                        localStorage.setItem("directRequestProfessionalConversationId", professional.conversationId || "");
                        localStorage.setItem("directRequestId", directRequestId);
                        setPage("upload");
                      }}
                    >
                      {t("hireAgain")}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={identityEmptyState}>
                <strong>{t("trustedProfessionalsEmpty")}</strong>
                <button
                  type="button"
                  style={inlineSectionAction}
                  onClick={() => setPage("discover")}
                >
                  {t("findProfessionals")}
                </button>
              </div>
            )}
          </SettingsGroup>

          <BottomNav setPage={setPage} currentPage="profile" />
        </div>
      );
    }

    return (
      <div className="app-page meetro-readable-page" style={pageWrapper}>
        <div style={settingsHeader}>
          <div>
            <p style={settingsEyebrow}>{t("homeownerProfileEyebrow")}</p>
            <h1 style={settingsTitle}>{t("homeownerProfile")}</h1>
            <p style={settingsSubtitle}>{t("homeownerProfileSubtitle")}</p>
          </div>
        </div>

        <section style={homeownerHeroCard}>
          <label style={homeownerAvatarWrap}>
            {profilePhoto ? (
              <img src={profilePhoto} alt={t("profile")} style={homeownerAvatarImage} />
            ) : (
              <div style={homeownerAvatarFallback}>
                <MeetroIcon name="profile" size={36} decorative />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleProfilePhotoUpload}
            />
          </label>

          <div style={homeownerHeroContent}>
            <h2 style={homeownerHeroName}>{displayName}</h2>
            <p style={homeownerHeroMeta}>
              {homeownerServiceArea} · {t("memberSince")} {memberSinceLabel}
            </p>
            <div style={homeownerHeroBadges}>
              <span style={homeownerVerificationBadge}>
                <MeetroIcon name="verified" size={15} decorative />
                {user?.email_verified || localStorage.getItem("emailVerified") === "true"
                  ? t("verified")
                  : t("notVerified")}
              </span>
              <span style={homeownerVerificationBadge}>
                <MeetroIcon name="location" size={15} decorative />
                {homeownerCity || t("serviceArea")}
              </span>
            </div>
          </div>
        </section>

        <section style={quickActionRow} aria-label={t("quickActions")}>
          <ProfileActionButton
            icon="profile"
            label={t("editProfile")}
            onClick={openPersonalInfoSheet}
          />
          <ProfileActionButton
            icon="location"
            label={t("manageAddresses")}
            badge={t("comingSoon")}
            disabled
          />
          <ProfileActionButton
            icon="payment"
            label={t("paymentMethods")}
            badge={t("comingSoon")}
            disabled
          />
        </section>

        {profileNotice && <p style={profileNoticeText}>{profileNotice}</p>}

        <SettingsGroup title={t("myHome")} icon="home">
          <SettingRow
            icon="location"
            label={t("savedAddresses")}
            value={
              savedAddresses.length
                ? `${savedAddresses.length}`
                : primaryAddress
                ? t("ready")
                : t("comingSoon")
            }
            disabled={!savedAddresses.length && !primaryAddress}
          />

          <SettingRow
            icon="home"
            label={t("primaryProperty")}
            value={primaryAddress || t("notSet")}
            disabled
          />

          <SettingRow
            icon="assetCenter"
            label={t("additionalProperties")}
            value={t("future")}
            disabled
          />

          <SettingRow
            icon="requestDetails"
            label={t("propertyNotes")}
            value={t("future")}
            disabled
          />
        </SettingsGroup>

        <SettingsGroup
          title={t("myProfessionals")}
          icon="customerRelationships"
          onClick={() => setMyProfessionalsOpen(true)}
        >
          {trustedProfessionals.length > 0 ? (
            trustedProfessionals.slice(0, 3).map((professional) => (
              <SettingRow
                key={professional.name}
                icon="businessProfile"
                label={professional.name}
                value={professional.category || t("recentlyUsed")}
                onClick={() => setMyProfessionalsOpen(true)}
              />
            ))
          ) : (
            <div style={identityEmptyState}>
              <strong>{t("trustedProfessionalsEmpty")}</strong>
              <button
                type="button"
                style={inlineSectionAction}
                onClick={() => setPage("discover")}
              >
                {t("findProfessionals")}
              </button>
            </div>
          )}
        </SettingsGroup>

        <SettingsGroup title={t("preferences")} icon="settings">
          <SettingRow
            icon="language"
            label={t("language")}
            value={getLanguageLabel(language)}
            onClick={() => setLanguagePickerOpen(true)}
          />

          <SettingRow
            icon="notifications"
            label={t("notifications")}
            value={t("open")}
            onClick={() => setPage("notifications")}
          />

          <SettingRow
            icon="emergency"
            label={t("emergencyContacts")}
            value={t("comingSoon")}
            disabled
          />

          <SettingRow
            icon="messages"
            label={t("communicationPreferences")}
            value={t("future")}
            disabled
          />
        </SettingsGroup>

        <SettingsGroup title={t("reviewsWritten")} icon="reviews">
          {writtenReviews.length > 0 ? (
            writtenReviews.slice(0, 2).map((review, index) => (
              <SettingRow
                key={review.id || index}
                icon="reviews"
                label={`${review.rating || 5}/5`}
                value={t("viewReview")}
                disabled
              />
            ))
          ) : (
            <div style={identityEmptyState}>
              <strong>{t("noReviewsWrittenYet")}</strong>
              <span>{t("reviewCompletedProjectsPrompt")}</span>
            </div>
          )}
        </SettingsGroup>

        <SettingsGroup title={t("account")} icon="profile">
          <SettingRow
            icon="profile"
            label={t("personalInformation")}
            value={t("manage")}
            onClick={openPersonalInfoSheet}
          />

          <div style={settingInlineBlock}>
            <div style={settingInlineHeader}>
              <span style={settingLeft}>
                <span style={rowIcon}>
                  <ProfileIcon name="businessTools" size={18} />
                </span>
                <span>{t("businessMode")}</span>
              </span>
              <strong style={settingValue}>
                {t("inactive")}
              </strong>
            </div>

            <div style={modeToggle}>
              <button
                onClick={() => switchMode("personal")}
                style={{ ...modeButton, ...activeModeButton }}
              >
                <MeetroIcon name="home" size={18} decorative /> {t("personal")}
              </button>

              <button
                onClick={() => switchMode("business")}
                style={{
                  ...modeButton,
                  ...(!hasBusinessAccess ? disabledModeButton : {}),
                }}
              >
                <MeetroIcon name="businessTools" size={18} decorative /> {t("business")}
              </button>
            </div>

            {!hasBusinessAccess && (
              <p style={helperText}>{t("createBusinessProfileFirst")}</p>
            )}
          </div>

          <SettingRow
            icon="privacy"
            label={t("passwordSecurity")}
            value={t("comingSoon")}
            disabled
          />
        </SettingsGroup>

        <SettingsGroup title={t("support")} icon="help">
          <SettingRow
            icon="aiHelp"
            label={t("startMeetroTour")}
            value={t("open")}
            onClick={startMeetroTour}
          />

          <SettingRow
            icon="requestDetails"
            label={t("help")}
            value={t("open")}
            onClick={() => setPage("meetroJourney")}
          />

          <SettingRow
            icon="messages"
            label={t("contactSupport")}
            value={t("comingSoon")}
            disabled
          />
        </SettingsGroup>

        <SettingsGroup title={t("legal")} icon="legal">
          <SettingRow
            icon="privacy"
            label={t("privacyPolicy")}
            value={t("open")}
            onClick={() => openLegalDocument("privacy")}
          />

          <SettingRow
            icon="legal"
            label={t("termsOfUse")}
            value={t("open")}
            onClick={() => openLegalDocument("terms")}
          />

          <SettingRow
            icon="verified"
            label={t("communityGuidelines")}
            value={t("open")}
            onClick={() => openLegalDocument("guidelines")}
          />
        </SettingsGroup>

        <button onClick={handleLogout} style={logoutButton}>
          {t("logout")}
        </button>

        {personalInfoOpen && (
          <div
            style={languageSheetOverlay}
            role="presentation"
            onClick={() => setPersonalInfoOpen(false)}
          >
            <div
              style={languageSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="personal-info-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div style={languageSheetHandle} />

              <div style={languageSheetHeader}>
                <div>
                  <p style={languageSheetEyebrow}>{t("account")}</p>
                  <h2 id="personal-info-title" style={languageSheetTitle}>
                    {t("personalInformation")}
                  </h2>
                </div>

                <button
                  type="button"
                  style={languageSheetCloseButton}
                  onClick={() => setPersonalInfoOpen(false)}
                  aria-label={t("close")}
                >
                  ×
                </button>
              </div>

              <div style={personalInfoFormStyle}>
                {renderPersonalInfoFields()}

                <div style={personalInfoButtonRow}>
                  <button
                    type="button"
                    style={secondarySheetButton}
                    onClick={() => setPersonalInfoOpen(false)}
                  >
                    {t("backToSettings")}
                  </button>

                  <button type="button" style={primaryButton} onClick={savePersonalInfo}>
                    {t("saveChanges")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {languagePickerOpen && (
          <div
            style={languageSheetOverlay}
            role="presentation"
            onClick={() => setLanguagePickerOpen(false)}
          >
            <div
              style={languageSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="language-picker-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div style={languageSheetHandle} />

              <div style={languageSheetHeader}>
                <div>
                  <p style={languageSheetEyebrow}>{t("language")}</p>
                  <h2 id="language-picker-title" style={languageSheetTitle}>
                    {getLanguageLabel(language)}
                  </h2>
                </div>

                <button
                  type="button"
                  style={languageSheetCloseButton}
                  onClick={() => setLanguagePickerOpen(false)}
                  aria-label={t("close")}
                >
                  ×
                </button>
              </div>

              <div style={languageOptionList}>
                {SUPPORTED_LANGUAGES.map((item) => {
                  const isSelected = normalizeLanguage(language) === item.code;

                  return (
                    <button
                      key={item.code}
                      type="button"
                      style={{
                        ...languageOptionButton,
                        ...(isSelected ? languageOptionButtonSelected : {}),
                      }}
                      onClick={() => handleLanguageSelect(item.code)}
                      aria-pressed={isSelected}
                    >
                      <span>{getLanguageLabel(item.code)}</span>

                      {isSelected && (
                        <span style={languageSelectedIcon}>
                          <MeetroIcon name="selected" size={20} decorative />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <BottomNav setPage={setPage} currentPage="profile" />
      </div>
    );
  }

  return (
    <div className="app-page meetro-readable-page" style={pageWrapper}>
      {isBusinessToolsReturn && (
        <button
          type="button"
          style={backButton}
          onClick={() => {
            localStorage.removeItem("meetroSharedPageReturn");
            setPage("businessCommandCenter");
          }}
        >
          ← {t("backToBusinessTools")}
        </button>
      )}
      <div style={settingsHeader}>
        <div>
          <p style={settingsEyebrow}>{t("settings")}</p>
          <h1 style={settingsTitle}>{t("settings")}</h1>
          <p style={settingsSubtitle}>{t("settingsPageSubtitle")}</p>
        </div>

        <label style={compactAvatarWrap}>
          {profilePhoto ? (
            <img src={profilePhoto} alt={t("profile")} style={compactAvatarImage} />
          ) : (
            <div style={compactAvatarFallback}>
              <MeetroIcon
                name={isBusinessMode ? "businessProfile" : "profile"}
                size={28}
                decorative
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleProfilePhotoUpload}
          />
        </label>
      </div>

      <div style={accountSummaryCard}>
        <div>
          <h2 style={summaryName}>{displayName}</h2>
          <p style={summaryEmail}>{displayEmail}</p>
        </div>
        <span style={summaryBadge}>
          {isBusinessMode ? t("businessMode") : t("personalMode")}
        </span>
      </div>

      <SettingsGroup title={t("account")} icon="profile">
        <SettingRow
          icon="profile"
          label={t("personalInformation")}
          value={t("manage")}
          onClick={openPersonalInfoSheet}
        />

        <div style={settingInlineBlock}>
          <div style={settingInlineHeader}>
            <span style={settingLeft}>
              <span style={rowIcon}>
                <ProfileIcon name="businessTools" size={18} />
              </span>
              <span>{t("businessMode")}</span>
            </span>
            <strong style={settingValue}>
              {isBusinessMode ? t("active") : t("inactive")}
            </strong>
          </div>

          <div style={modeToggle}>
            <button
              onClick={() => switchMode("personal")}
              style={{
                ...modeButton,
                ...(activeMode === "personal" ? activeModeButton : {}),
              }}
            >
              <MeetroIcon name="home" size={18} decorative /> {t("personal")}
            </button>

            <button
              onClick={() => switchMode("business")}
              style={{
                ...modeButton,
                ...(activeMode === "business" ? activeModeButton : {}),
                ...(!hasBusinessAccess ? disabledModeButton : {}),
              }}
            >
              <MeetroIcon name="businessTools" size={18} decorative /> {t("business")}
            </button>
          </div>

          {!hasBusinessAccess && (
            <p style={helperText}>{t("createBusinessProfileFirst")}</p>
          )}
        </div>

        <SettingRow
          icon="privacy"
          label={t("passwordSecurity")}
          value={t("comingSoon")}
          disabled
        />
      </SettingsGroup>

      <SettingsGroup title={t("preferences")} icon="settings">
        <SettingRow
          icon="language"
          label={t("language")}
          value={getLanguageLabel(language)}
          onClick={() => setLanguagePickerOpen(true)}
        />

        <SettingRow
          icon="notifications"
          label={t("notifications")}
          value={t("open")}
          onClick={() => setPage("notifications")}
        />

        <SettingRow
          icon="preview"
          label={t("appearance")}
          value={t("future")}
          disabled
        />
      </SettingsGroup>

      <SettingsGroup title={t("business")} icon="businessTools">
        <SettingRow
          icon="availability"
          label={t("availabilityShortcut")}
          value={hasBusinessAccess ? t("open") : t("setupRequired")}
          onClick={() =>
            hasBusinessAccess
              ? openProfessionalPage("businessAvailability")
              : setPage("contractorProfile")
          }
        />

        <SettingRow
          icon="emergency"
          label={t("emergencyReadiness")}
          value={
            localStorage.getItem("meetroDispatchReady") === "true"
              ? t("ready")
              : t("setupRequired")
          }
          onClick={() => setPage("emergencyBusinessSettings")}
        />

        <SettingRow
          icon="businessTools"
          label={t("connectedServices")}
          value={t("future")}
          disabled
        />
      </SettingsGroup>

      <SettingsGroup title={t("support")} icon="help">
        <SettingRow
          icon="aiHelp"
          label={t("startMeetroTour")}
          value={t("open")}
          onClick={startMeetroTour}
        />

        <SettingRow
          icon="requestDetails"
          label={t("help")}
          value={t("open")}
          onClick={() => setPage("meetroJourney")}
        />

        <SettingRow
          icon="messages"
          label={t("contactSupport")}
          value={t("comingSoon")}
          disabled
        />

        <SettingRow
          icon="aiHelp"
          label={t("aiBusinessHelp")}
          value={t("open")}
          onClick={() => setPage("assistant")}
        />
      </SettingsGroup>

      <SettingsGroup title={t("legal")} icon="legal">
        <SettingRow
          icon="privacy"
          label={t("privacyPolicy")}
          value={t("open")}
          onClick={() => openLegalDocument("privacy")}
        />

        <SettingRow
          icon="legal"
          label={t("termsOfUse")}
          value={t("open")}
          onClick={() => openLegalDocument("terms")}
        />

        <SettingRow
          icon="verified"
          label={t("communityGuidelines")}
          value={t("open")}
          onClick={() => openLegalDocument("guidelines")}
        />

        <SettingRow
          icon="legal"
          label={t("licenses")}
          value={t("comingSoon")}
          disabled
        />
      </SettingsGroup>

      <div style={compactProCard}>
        <div>
          <span style={compactProBadge}>{t("meetroPro")}</span>
          <h2 style={compactProTitle}>{t("growWithMeetro")}</h2>
          <p style={compactProText}>{t("meetroProSettingsText")}</p>
        </div>

        <button
          type="button"
          style={compactProButton}
          onClick={() => setProfileNotice(t("meetroProSettingsText"))}
        >
          {t("upgradeToMeetroPro")}
        </button>

        {profileNotice && <p style={profileNoticeText}>{profileNotice}</p>}
      </div>

      <button onClick={handleLogout} style={logoutButton}>
        {t("logout")}
      </button>

      {personalInfoOpen && (
        <div
          style={languageSheetOverlay}
          role="presentation"
          onClick={() => setPersonalInfoOpen(false)}
        >
          <div
            style={languageSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="personal-info-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={languageSheetHandle} />

            <div style={languageSheetHeader}>
              <div>
                <p style={languageSheetEyebrow}>{t("account")}</p>
                <h2 id="personal-info-title" style={languageSheetTitle}>
                  {t("personalInformation")}
                </h2>
              </div>

              <button
                type="button"
                style={languageSheetCloseButton}
                onClick={() => setPersonalInfoOpen(false)}
                aria-label={t("close")}
              >
                ×
              </button>
            </div>

            <div style={personalInfoFormStyle}>
              {renderPersonalInfoFields()}

              <div style={personalInfoButtonRow}>
                <button
                  type="button"
                  style={secondarySheetButton}
                  onClick={() => setPersonalInfoOpen(false)}
                >
                  {t("backToSettings")}
                </button>

                <button type="button" style={primaryButton} onClick={savePersonalInfo}>
                  {t("saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {languagePickerOpen && (
        <div
          style={languageSheetOverlay}
          role="presentation"
          onClick={() => setLanguagePickerOpen(false)}
        >
          <div
            style={languageSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={languageSheetHandle} />

            <div style={languageSheetHeader}>
              <div>
                <p style={languageSheetEyebrow}>{t("language")}</p>
                <h2 id="language-picker-title" style={languageSheetTitle}>
                  {getLanguageLabel(language)}
                </h2>
              </div>

              <button
                type="button"
                style={languageSheetCloseButton}
                onClick={() => setLanguagePickerOpen(false)}
                aria-label={t("close")}
              >
                ×
              </button>
            </div>

            <div style={languageOptionList}>
              {SUPPORTED_LANGUAGES.map((item) => {
                const isSelected = normalizeLanguage(language) === item.code;

                return (
                  <button
                    key={item.code}
                    type="button"
                    style={{
                      ...languageOptionButton,
                      ...(isSelected ? languageOptionButtonSelected : {}),
                    }}
                    onClick={() => handleLanguageSelect(item.code)}
                    aria-pressed={isSelected}
                  >
                    <span>{getLanguageLabel(item.code)}</span>

                    {isSelected && (
                      <span style={languageSelectedIcon}>
                        <MeetroIcon name="selected" size={20} decorative />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="profile" />
    </div>
  );
}

function SettingsSection({ title, icon, open, onClick, children }) {
  return (
    <div style={sectionCard}>
      <button onClick={onClick} style={sectionHeader}>
        <span style={sectionHeaderLeft}>
          <span style={sectionIcon}>
            <ProfileIcon name={icon} size={22} />
          </span>
          <strong>{title}</strong>
        </span>

        <span style={chevron}>{open ? "⌃" : "⌄"}</span>
      </button>

      {open && <div style={sectionBody}>{children}</div>}
    </div>
  );
}

function SettingsGroup({ title, icon, children, onClick }) {
  const HeaderComponent = onClick ? "button" : "div";

  return (
    <section style={sectionCard}>
      <HeaderComponent
        {...(onClick ? { type: "button", onClick } : {})}
        style={{
          ...staticSectionHeader,
          ...(onClick ? settingsGroupButtonHeader : {}),
        }}
      >
        <span style={sectionHeaderLeft}>
          <span style={sectionIcon}>
            <ProfileIcon name={icon} size={22} />
          </span>
          <strong>{title}</strong>
        </span>
        {onClick && <span style={chevron}>›</span>}
      </HeaderComponent>

      <div style={sectionBody}>{children}</div>
    </section>
  );
}

function SettingRow({ icon, label, value, onClick, disabled = false }) {
  const isInteractive = Boolean(onClick) && !disabled;
  const Component = isInteractive ? "button" : "div";

  return (
    <Component
      {...(isInteractive ? { type: "button", onClick } : {})}
      style={{
        ...settingRow,
        ...(!isInteractive ? inactiveSettingRow : {}),
      }}
      aria-disabled={!isInteractive}
    >
      <span style={settingLeft}>
        <span style={rowIcon}>
          <ProfileIcon name={icon} size={18} />
        </span>
        <span>{label}</span>
      </span>

      <strong style={settingValue}>{value}</strong>
    </Component>
  );
}

function ProfileActionButton({ icon, label, onClick, badge, disabled = false }) {
  const isInteractive = Boolean(onClick) && !disabled;
  const Component = isInteractive ? "button" : "div";

  return (
    <Component
      {...(isInteractive ? { type: "button", onClick } : {})}
      style={{
        ...profileActionButton,
        ...(disabled ? profileActionButtonDisabled : {}),
      }}
      aria-disabled={!isInteractive}
    >
      <span style={profileActionIcon}>
        <ProfileIcon name={icon} size={20} />
      </span>
      <span style={profileActionLabel}>{label}</span>
      {badge && <span style={profileActionBadge}>{badge}</span>}
    </Component>
  );
}

function ProfileIcon({ name, size = 20 }) {
  return <MeetroIcon name={name} size={size} decorative />;
}

function FeedbackField({ label, value, onChange }) {
  return (
    <label style={feedbackLabel}>
      {label}
      <textarea
        style={feedbackTextarea}
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

const pageWrapper = {
  background: "#f5f5f7",
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "#111",
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto",
};

const backButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px 14px",
  marginBottom: "14px",
  background: "#ffffff",
  color: "#111827",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
};

const settingsHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "14px",
};

const settingsEyebrow = {
  margin: "0 0 4px",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const settingsTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
  lineHeight: 1,
  fontWeight: "950",
};

const settingsSubtitle = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const compactAvatarWrap = {
  position: "relative",
  width: "62px",
  height: "62px",
  flex: "0 0 auto",
  cursor: "pointer",
};

const compactAvatarImage = {
  width: "62px",
  height: "62px",
  borderRadius: "999px",
  objectFit: "cover",
  border: "3px solid #ffffff",
  boxShadow: "0 10px 22px rgba(15,23,42,0.12)",
};

const compactAvatarFallback = {
  width: "62px",
  height: "62px",
  borderRadius: "999px",
  background: "#ede9fe",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "3px solid #ffffff",
  boxShadow: "0 10px 22px rgba(15,23,42,0.12)",
};

const accountSummaryCard = {
  background: "white",
  borderRadius: "22px",
  padding: "16px",
  marginBottom: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};

const summaryName = {
  margin: "0 0 4px",
  color: "#111827",
  fontSize: "18px",
  fontWeight: "950",
  lineHeight: 1.2,
};

const summaryEmail = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const summaryBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "8px 10px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const homeownerHeroCard = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "14px",
  display: "flex",
  gap: "16px",
  alignItems: "center",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  border: "1px solid rgba(226,232,240,0.9)",
};

const homeownerAvatarWrap = {
  position: "relative",
  width: "76px",
  height: "76px",
  flex: "0 0 auto",
  cursor: "pointer",
};

const homeownerAvatarImage = {
  width: "76px",
  height: "76px",
  borderRadius: "999px",
  objectFit: "cover",
  border: "3px solid #ffffff",
  boxShadow: "0 10px 22px rgba(15,23,42,0.12)",
};

const homeownerAvatarFallback = {
  width: "76px",
  height: "76px",
  borderRadius: "999px",
  background: "#ede9fe",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "3px solid #ffffff",
  boxShadow: "0 10px 22px rgba(15,23,42,0.12)",
};

const homeownerHeroContent = {
  minWidth: 0,
  flex: 1,
};

const homeownerHeroName = {
  margin: "0 0 6px",
  color: "#111827",
  fontSize: "22px",
  lineHeight: 1.12,
  fontWeight: "950",
  overflowWrap: "break-word",
};

const homeownerHeroMeta = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: "750",
};

const homeownerHeroBadges = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "10px",
};

const homeownerVerificationBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  borderRadius: "999px",
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "7px 9px",
  fontSize: "12px",
  fontWeight: "900",
};

const quickActionRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const profileActionButton = {
  minHeight: "86px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#111827",
  borderRadius: "18px",
  padding: "12px 10px",
  display: "grid",
  placeItems: "center",
  gap: "6px",
  textAlign: "center",
  fontSize: "12px",
  fontWeight: "900",
  boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  cursor: "pointer",
};

const profileActionButtonDisabled = {
  cursor: "default",
  opacity: 0.78,
};

const profileActionIcon = {
  color: "#5b3df5",
  display: "inline-flex",
};

const profileActionLabel = {
  lineHeight: 1.2,
  maxWidth: "100%",
  overflowWrap: "break-word",
  wordBreak: "normal",
  hyphens: "none",
  textWrap: "balance",
};

const profileActionBadge = {
  borderRadius: "999px",
  padding: "4px 7px",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "950",
};

const identityEmptyState = {
  display: "grid",
  gap: "10px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#64748b",
  padding: "14px",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "800",
};

const settingsGroupButtonHeader = {
  width: "100%",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
};

const inlineSectionAction = {
  justifySelf: "start",
  border: "none",
  borderRadius: "999px",
  background: "#5b3df5",
  color: "#ffffff",
  padding: "9px 12px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
};

const inlineSecondaryAction = {
  ...inlineSectionAction,
  background: "#eef2ff",
  color: "#5b3df5",
};

const compactBackButton = {
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  borderRadius: "18px",
  padding: "12px 14px",
  color: "#111827",
  fontWeight: "950",
  cursor: "pointer",
  justifySelf: "start",
  marginBottom: "14px",
  boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
};

const professionalCard = {
  display: "grid",
  gap: "12px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  padding: "14px",
  boxSizing: "border-box",
  maxWidth: "100%",
};

const professionalCardTop = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  gap: "10px",
  alignItems: "center",
  minWidth: 0,
};

const professionalCardIdentity = {
  display: "grid",
  gap: "4px",
  color: "#111827",
  minWidth: 0,
  overflowWrap: "break-word",
};

const relationshipBadge = {
  borderRadius: "999px",
  background: "#eef2ff",
  color: "#5b3df5",
  padding: "6px 9px",
  fontSize: "11px",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const professionalActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
  gap: "8px",
};

const heroCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "30px",
  padding: "34px 22px",
  marginBottom: "20px",
  textAlign: "center",
  boxShadow: "0 18px 40px rgba(91,61,245,0.28)",
};


const avatarUploadWrap = {
  position: "relative",
  width: "120px",
  height: "120px",
  borderRadius: "999px",
  cursor: "pointer",
};

const profileAvatarImage = {
  width: "120px",
  height: "120px",
  borderRadius: "999px",
  objectFit: "cover",
  border: "4px solid rgba(255,255,255,0.22)",
  boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
};

const uploadPhotoBadge = {
  position: "absolute",
  right: "0px",
  bottom: "0px",
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  background: "#7c3aed",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "700",
  border: "3px solid white",
  boxShadow: "0 8px 18px rgba(124,58,237,0.32)",
};

const avatarCircle = {
  width: "118px",
  height: "118px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.18)",
  margin: "0 auto 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "52px",
};

const pageTitle = {
  fontSize: "42px",
  margin: "0 0 10px",
  color: "white",
};

const userNameStyle = {
  fontSize: "22px",
  margin: "0 0 8px",
  color: "white",
};

const accountText = {
  margin: "0 auto 10px",
  lineHeight: 1.5,
  opacity: 0.92,
  maxWidth: "320px",
};

const profilePurposeText = {
  margin: "0 auto 16px",
  lineHeight: 1.45,
  opacity: 0.9,
  maxWidth: "360px",
  fontSize: "14px",
};

const accountBadge = {
  display: "inline-block",
  background: "rgba(255,255,255,0.18)",
  padding: "9px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const modeCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "16px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const sectionTitle = {
  margin: "0 0 14px",
  fontSize: "22px",
  color: "#111",
};

const modeToggle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const modeButton = {
  border: "none",
  background: "#f4f3f8",
  color: "#333",
  padding: "14px 10px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const activeModeButton = {
  background: "#5b3df5",
  color: "white",
};

const disabledModeButton = {
  opacity: 0.85,
  cursor: "not-allowed",
};

const helperText = {
  color: "#666",
  fontSize: "14px",
  lineHeight: 1.5,
  margin: "12px 0 0",
  textAlign: "center",
};

const sectionCard = {
  background: "white",
  borderRadius: "24px",
  marginBottom: "14px",
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
};

const sectionHeader = {
  width: "100%",
  border: "none",
  background: "white",
  color: "#111",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  fontSize: "18px",
};

const staticSectionHeader = {
  width: "100%",
  color: "#111",
  padding: "16px 18px 8px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "18px",
  boxSizing: "border-box",
};

const sectionHeaderLeft = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const sectionIcon = {
  fontSize: "26px",
};

const chevron = {
  fontSize: "26px",
  fontWeight: "900",
  color: "#111",
};

const sectionBody = {
  padding: "0 16px 16px",
};

const settingRow = {
  width: "100%",
  border: "none",
  background: "#f8f7ff",
  color: "#111",
  padding: "15px 16px",
  borderRadius: "16px",
  marginBottom: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  fontSize: "15px",
  cursor: "pointer",
  textAlign: "left",
};

const settingInlineBlock = {
  background: "#f8f7ff",
  color: "#111",
  padding: "15px 16px",
  borderRadius: "16px",
  marginBottom: "10px",
};

const settingInlineHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
};

const inactiveSettingRow = {
  cursor: "default",
  opacity: 0.76,
  background: "#f5f7fb",
};

const legalPurposeText = {
  margin: "0 2px 14px",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: "700",
};

const profileNoticeText = {
  margin: "12px 0 0",
  color: "#4c1d95",
  background: "#f3f0ff",
  border: "1px solid #ddd6fe",
  borderRadius: "14px",
  padding: "10px",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "800",
};

const assistantSettingCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "14px",
  marginBottom: "12px",
};

const assistantSettingLabel = {
  display: "grid",
  gap: "8px",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "900",
};

const assistantVoiceSelect = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  padding: "12px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "800",
  boxSizing: "border-box",
};

const assistantSettingHelp = {
  margin: "10px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const privatePhoneHelpText = {
  ...assistantSettingHelp,
  display: "flex",
  alignItems: "flex-start",
  gap: "6px",
};

const testFlightCard = {
  background: "#f8fafc",
  border: "1px solid #dbeafe",
  borderRadius: "20px",
  padding: "16px",
  marginBottom: "12px",
  boxSizing: "border-box",
};

const testFlightBadge = {
  display: "inline-block",
  background: "#eef2ff",
  color: "#4338ca",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const testFlightTitle = {
  margin: "12px 0 8px",
  color: "#0f172a",
  fontSize: "20px",
};

const testFlightText = {
  margin: "0 0 12px",
  color: "#475569",
  lineHeight: 1.5,
  fontSize: "14px",
  fontWeight: "700",
};

const testerChecklist = {
  listStyle: "none",
  padding: 0,
  margin: "0 0 14px",
  display: "grid",
  gap: "8px",
};

const testerChecklistItem = {
  display: "flex",
  gap: "9px",
  alignItems: "center",
  color: "#334155",
  fontSize: "14px",
  fontWeight: "850",
};

const feedbackSavedText = {
  margin: "0 0 12px",
  background: "#ecfdf5",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: "14px",
  padding: "10px",
  fontSize: "13px",
  fontWeight: "850",
  lineHeight: 1.4,
};

const feedbackForm = {
  display: "grid",
  gap: "10px",
  marginTop: "12px",
};

const feedbackLabel = {
  display: "grid",
  gap: "6px",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "900",
};

const feedbackTextarea = {
  width: "100%",
  minHeight: "82px",
  resize: "vertical",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  padding: "12px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "16px",
  lineHeight: 1.4,
  boxSizing: "border-box",
};

const personalInfoFormStyle = {
  display: "grid",
  gap: "12px",
  paddingBottom: "24px",
};

const personalInfoInput = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  padding: "12px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "16px",
  lineHeight: 1.4,
  boxSizing: "border-box",
};

const personalInfoButtonRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "4px",
};

const secondarySheetButton = {
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  padding: "14px 18px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const settingLeft = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const rowIcon = {
  fontSize: "20px",
};

const settingValue = {
  color: "#5b3df5",
  whiteSpace: "nowrap",
};

const lockedProBox = {
  background: "#f8f7ff",
  borderRadius: "20px",
  padding: "22px",
  textAlign: "center",
};

const lockedIcon = {
  fontSize: "46px",
  marginBottom: "12px",
};

const lockedTitle = {
  margin: "0 0 10px",
  fontSize: "22px",
  color: "#111",
};

const lockedText = {
  margin: "0 0 18px",
  color: "#666",
  lineHeight: 1.6,
};

const primaryButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  padding: "14px 18px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const proCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "28px",
  padding: "24px",
  marginBottom: "16px",
  boxShadow: "0 18px 40px rgba(91,61,245,0.24)",
};

const compactProCard = {
  background: "white",
  border: "1px solid #ddd6fe",
  borderRadius: "22px",
  padding: "16px",
  marginBottom: "14px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};

const compactProBadge = {
  display: "inline-block",
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const compactProTitle = {
  margin: "10px 0 6px",
  color: "#111827",
  fontSize: "18px",
  fontWeight: "950",
};

const compactProText = {
  margin: 0,
  color: "#64748b",
  lineHeight: 1.45,
  fontSize: "14px",
  fontWeight: "700",
};

const compactProButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  padding: "12px 14px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "12px",
};

const proBadge = {
  background: "rgba(255,255,255,0.18)",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
};

const proTitle = {
  margin: "18px 0 8px",
  fontSize: "26px",
};

const proText = {
  lineHeight: 1.6,
  opacity: 0.92,
};

const proButton = {
  border: "none",
  background: "white",
  color: "#5b3df5",
  padding: "15px 18px",
  borderRadius: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "14px",
};

const statusCard = {
  background: "white",
  borderRadius: "24px",
  padding: "20px",
  marginBottom: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const statusText = {
  margin: "0 0 8px",
  color: "#111",
  fontWeight: "bold",
};

const mutedText = {
  margin: 0,
  color: "#666",
  lineHeight: 1.5,
};

const languageSheetOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  background: "rgba(15, 23, 42, 0.36)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding:
    "calc(env(safe-area-inset-top) + 16px) 14px calc(env(safe-area-inset-bottom) + 96px)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const languageSheet = {
  width: "100%",
  maxWidth: "520px",
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: "28px",
  padding: "10px 16px 0",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.25)",
  boxSizing: "border-box",
  maxHeight: "calc(100dvh - 120px)",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

const languageSheetHandle = {
  width: "52px",
  height: "5px",
  borderRadius: "999px",
  background: "#cbd5e1",
  margin: "0 auto 14px",
};

const languageSheetHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "14px",
};

const languageSheetEyebrow = {
  margin: "0 0 4px",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const languageSheetTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "24px",
  lineHeight: 1.15,
};

const languageSheetCloseButton = {
  width: "42px",
  height: "42px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: "700",
  cursor: "pointer",
};

const languageOptionList = {
  display: "grid",
  gap: "10px",
  overflowY: "auto",
  paddingBottom: "24px",
  WebkitOverflowScrolling: "touch",
};

const languageOptionButton = {
  minHeight: "56px",
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  background: "#ffffff",
  color: "#0f172a",
  padding: "14px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  boxSizing: "border-box",
};

const languageOptionButtonSelected = {
  border: "2px solid #5b3df5",
  background: "#f4f1ff",
  boxShadow: "0 10px 24px rgba(91, 61, 245, 0.16)",
};

const languageSelectedIcon = {
  color: "#5b3df5",
  display: "inline-flex",
  alignItems: "center",
};

const logoutButton = {
  width: "100%",
  padding: "15px 24px",
  background: "#5b3df5",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "4px",
};

export default Profile;
