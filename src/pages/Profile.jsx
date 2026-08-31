import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import PersonalAddressManager from "../components/PersonalAddressManager";
import AccountSecurityWorkspace from "../components/AccountSecurityWorkspace";
import BusinessPlanStatusCard from "../components/BusinessPlanStatusCard";
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  getLanguageLabel,
  normalizeLanguage,
  setLanguage,
  t,
} from "../utils/language";
import { authFetch, clearMeetroSession, handleAuthExpired } from "../utils/authFetch";
import {
  hasBusinessProfileOwnership,
  isProfessionalSession,
  setActiveAccountMode,
} from "../utils/session";
import {
  getScopedProfilePhoto,
  getScopedProfilePhotoKey,
} from "../utils/profilePhotoScoping";
import {
  getMediaDeferredCopy,
} from "../utils/mediaDeferral";
import {
  areRelationshipInsightsEnabled,
  setRelationshipInsightsEnabled,
} from "../utils/relationshipInsightSettings";
import {
  clearInsightTestDismissals,
  dispatchInsightTest,
  getInsightTesterButtonGroups,
  shouldRenderInsightTester,
} from "../utils/relationshipInsightTester";
import {
  formatPersonalAddress,
  readPersonalAddresses,
  resolveDefaultPersonalAddress,
} from "../utils/personalAddresses";
import {
  reconcileAuthenticatedUser,
  updatePersonalProfile,
} from "../utils/personalProfile";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";
import { fetchMyTeamAuthority } from "../utils/teamApi";
import {
  resolvePrimaryTeamExperience,
} from "../utils/teamRoleExperience";
import {
  requestTeamExperienceMode,
} from "../utils/teamExperienceMode";
import {
  createTemporaryProfilePhotoPreview,
  isPersonalProfilePhotoUploadEnabled,
  uploadPersonalProfilePhoto,
  validatePersonalProfileImageFile,
} from "../utils/personalProfilePhoto";
import {
  isBusinessLogoUploadEnabled,
  uploadBusinessProfileLogo,
  validateBusinessLogoFile,
} from "../utils/businessProfileLogo";

function hasTeamMembersReadAuthority(membership = {}) {
  if (!membership || String(membership.status || "").toUpperCase() !== "ACTIVE") {
    return false;
  }

  return (
    membership.role === "OWNER" ||
    (Array.isArray(membership.permissions) && membership.permissions.includes("TEAM_VIEW"))
  );
}

function findTeamMembersAuthorityMembership(authority = {}) {
  const memberships = Array.isArray(authority?.memberships)
    ? authority.memberships
    : [];
  return memberships.find(hasTeamMembersReadAuthority) || null;
}

function Profile({ setPage, currentPage, embedded = false }) {
  const sharedReturnPage = localStorage.getItem("meetroSharedPageReturn") || "";
  const isBusinessToolsReturn = sharedReturnPage === "businessCommandCenter";
  const [user, setUser] = useState(null);
  const [language, updateLanguage] = useState(getLanguage());
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [addressManagerOpen, setAddressManagerOpen] = useState(false);
  const [accountSecurityOpen, setAccountSecurityOpen] = useState(false);
  const [personalAddresses, setPersonalAddresses] = useState(() => readPersonalAddresses());
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [myProfessionalsOpen, setMyProfessionalsOpen] = useState(false);
  const [personalInfoForm, setPersonalInfoForm] = useState({
    name: localStorage.getItem("userName") || "",
    email: localStorage.getItem("userEmail") || "",
  });
  const [personalInfoSaving, setPersonalInfoSaving] = useState(false);
  const [personalInfoError, setPersonalInfoError] = useState("");
  const [activeSection, setActiveSection] = useState(
    localStorage.getItem("meetroProfileOpenSection") || ""
  );
  const [activeMode, setActiveMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );
  const [businessProfile, setBusinessProfile] = useState(null);
  const [assistantVoicePreference, setAssistantVoicePreference] = useState(
    localStorage.getItem("meetroAssistantVoicePreference") || "auto"
  );
  const [teamMembersMembership, setTeamMembersMembership] = useState(null);
  const [teamWorkMembership, setTeamWorkMembership] = useState(null);
  const [relationshipInsightsEnabled, setRelationshipInsightsEnabledState] = useState(() =>
    areRelationshipInsightsEnabled({ role: localStorage.getItem("activeAccountMode") || "personal" })
  );
  const [profileNotice, setProfileNotice] = useState("");
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const previewPhotoRef = useRef(null);
  const [testFeedbackOpen, setTestFeedbackOpen] = useState(false);
  const [testFeedbackSaved, setTestFeedbackSaved] = useState(false);
  const [testFeedback, setTestFeedback] = useState({
    trying: "",
    confused: "",
    broken: "",
    easier: "",
    screenshotNote: "",
  });
  const insightTesterVisible = shouldRenderInsightTester();

  const [profilePhoto, setProfilePhoto] = useState(
    getScopedProfilePhoto(localStorage.getItem("activeAccountMode") || "personal")
  );
  const personalProfilePhotoEnabled = isPersonalProfilePhotoUploadEnabled();
  const businessLogoUploadEnabled = isBusinessLogoUploadEnabled();
  const profilePhotoUploadEnabled = activeMode === "business"
    ? businessLogoUploadEnabled
    : personalProfilePhotoEnabled;
  const mediaUploadDeferred = !profilePhotoUploadEnabled;
  const mediaDeferredCopy = getMediaDeferredCopy(language);
  const hasBusinessAccess =
    hasBusinessProfileOwnership(user || {}) ||
    hasBusinessProfileOwnership(businessProfile || {}) ||
    isProfessionalSession();

  const isBusinessMode = activeMode === "business" && hasBusinessAccess;
  const businessModeStatusLabel = isBusinessMode
    ? t("active")
    : hasBusinessAccess
    ? t("available")
    : t("inactive");

  useEffect(() => {
    if (activeMode === "business") {
      setProfilePhoto(getScopedProfilePhoto(activeMode, businessProfile));
      return;
    }
    setProfilePhoto(user?.profile_photo_url || "");
  }, [activeMode, businessProfile, user]);

  useEffect(() => () => {
    previewPhotoRef.current?.revoke();
    previewPhotoRef.current = null;
  }, []);

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

  useEffect(() => {
    if (isBusinessMode) {
      setTeamWorkMembership(null);
      return undefined;
    }

    let cancelled = false;

    fetchMyTeamAuthority(setPage)
      .then((authority) => {
        if (cancelled) return;

        const experience =
          resolvePrimaryTeamExperience(authority);

        if (
          ["FIELD_EMPLOYEE", "BOOKKEEPER_FINANCE"].includes(
            experience.kind
          )
        ) {
          setTeamWorkMembership(experience.membership);
          return;
        }

        setTeamWorkMembership(null);
      })
      .catch(() => {
        if (!cancelled) {
          setTeamWorkMembership(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isBusinessMode, setPage]);

  useEffect(() => {
    if (!isBusinessMode) {
      setTeamMembersMembership(null);
      return;
    }

    let cancelled = false;
    const refreshTeamMembersAuthority = () => {
      fetchMyTeamAuthority(setPage)
        .then((authority) => {
          if (cancelled) return;
          setTeamMembersMembership(findTeamMembersAuthorityMembership(authority));
        })
        .catch(() => {
          if (!cancelled) {
            setTeamMembersMembership(null);
          }
        });
    };

    refreshTeamMembersAuthority();
    window.addEventListener("meetroTeamAuthorityChanged", refreshTeamMembersAuthority);

    return () => {
      cancelled = true;
      window.removeEventListener("meetroTeamAuthorityChanged", refreshTeamMembersAuthority);
    };
  }, [isBusinessMode, setPage]);

  const businessName = localStorage.getItem("businessName") || "";
  const businessCategory = localStorage.getItem("businessCategory") || "";
  const userName = localStorage.getItem("userName") || "";
  const userEmail = localStorage.getItem("userEmail") || "";

  const canShowTeamMembers = Boolean(teamMembersMembership);

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

        const nextUser = result.data?.user || null;

        const reconciled = reconcileAuthenticatedUser(nextUser);
        setUser(reconciled.ok ? reconciled.user : null);

        if (reconciled.ok) {
          setPersonalAddresses(readPersonalAddresses({ user: nextUser }));

          const savedPhoto =
            nextUser.profile_photo_url ||
            nextUser.profilePhotoUrl ||
            nextUser.profilePhoto ||
            nextUser.avatar ||
            "";

          if (activeMode !== "business") {
            setProfilePhoto(savedPhoto);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    fetchUser();
  }, [activeMode, language, setPage]);

  async function handleProfilePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (mediaUploadDeferred) {
      setProfileNotice(mediaDeferredCopy.detail);
      return;
    }

    const businessUpload = activeMode === "business";
    const validation = businessUpload
      ? validateBusinessLogoFile(file)
      : validatePersonalProfileImageFile(file);
    if (!validation.ok) {
      setProfileNotice(
        validation.code === "PROFILE_IMAGE_TOO_LARGE" ||
          validation.code === "BUSINESS_LOGO_TOO_LARGE"
          ? t("profileImageTooLarge")
          : t("invalidProfileImageFormat")
      );
      return;
    }

    const previousPhoto = businessUpload
      ? businessProfile?.image_url || profilePhoto || ""
      : user?.profile_photo_url || profilePhoto || "";
    previewPhotoRef.current?.revoke();
    const preview = createTemporaryProfilePhotoPreview(file);
    previewPhotoRef.current = preview;
    if (preview.url) setProfilePhoto(preview.url);
    setProfilePhotoUploading(true);
    setProfileNotice(t("uploadingProfilePhoto"));

    const result = businessUpload
      ? await uploadBusinessProfileLogo({ file, setPage })
      : await uploadPersonalProfilePhoto({ file, setPage });
    preview.revoke();
    if (previewPhotoRef.current === preview) previewPhotoRef.current = null;
    setProfilePhotoUploading(false);

    if (!result.ok) {
      setProfilePhoto(previousPhoto);
      setProfileNotice(
        result.code === "PROFILE_IMAGE_SAVE_FAILED" ||
          result.code === "BUSINESS_LOGO_SAVE_FAILED"
          ? t("profileImageSaveFailed")
          : t("profileImageUploadFailed")
      );
      return;
    }

    if (businessUpload) {
      setBusinessProfile(result.profile);
      setProfilePhoto(result.profile.image_url);
      setProfileNotice(t("profilePhotoUpdated"));
      return;
    }

    const reconciled = reconcileAuthenticatedUser(result.user);
    const canonicalUser = reconciled.ok ? reconciled.user : result.user;
    setUser(canonicalUser);
    setProfilePhoto(canonicalUser.profile_photo_url);
    setProfileNotice(t("profilePhotoUpdated"));
    window.dispatchEvent(new Event("meetro-profile-photo-updated"));
  }

  function handleLogout() {
    clearMeetroSession();

    window.location.hash = "login";

    window.location.reload();
  }

  function renderAccountSecurityWorkspace() {
    if (!accountSecurityOpen) return null;

    return (
      <AccountSecurityWorkspace
        accountMode={activeMode}
        onClose={() => setAccountSecurityOpen(false)}
        onSignOut={handleLogout}
        onSessionExpired={() => handleAuthExpired(setPage)}
      />
    );
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

  function toggleRelationshipInsights() {
    const nextEnabled = !relationshipInsightsEnabled;
    setRelationshipInsightsEnabled(nextEnabled, { role: activeMode });
    setRelationshipInsightsEnabledState(nextEnabled);
  }

  function triggerRelationshipInsightTest(type) {
    if (!relationshipInsightsEnabled) {
      setProfileNotice(t("devInsightsDisabledNote"));
      return;
    }
    const dispatched = dispatchInsightTest(type);
    setProfileNotice(
      dispatched ? t("devInsightTriggered") : t("devInsightUnavailable")
    );
  }

  function clearRelationshipInsightDismissalsForDev() {
    clearInsightTestDismissals();
    setProfileNotice(t("devInsightDismissalsCleared"));
  }

  function switchMode(mode) {
    if (mode === "business" && !hasBusinessAccess) {
      setPage("contractorProfile");
      return;
    }

    setActiveAccountMode(mode);
    setActiveMode(mode);
    setRelationshipInsightsEnabledState(
      areRelationshipInsightsEnabled({ role: mode })
    );

    const nextPage = mode === "business" ? "businessDashboard" : "home";

    window.location.hash = nextPage;
    window.dispatchEvent(new Event("accountModeChanged"));

    setPage(nextPage);
  }

  function openPersonalInfoSheet() {
    setPersonalInfoForm({
      name:
        user?.username ||
        user?.name ||
        "",
      email: user?.email || localStorage.getItem("userEmail") || "",
    });
    setPersonalInfoError("");
    setPersonalInfoOpen(true);
  }

  async function savePersonalInfo() {
    setPersonalInfoError("");
    setPersonalInfoSaving(true);
    const result = await updatePersonalProfile({
      username: personalInfoForm.name,
      setPage,
    });
    setPersonalInfoSaving(false);

    if (!result.ok) {
      setPersonalInfoError(
        result.code === "PROFILE_NAME_REQUIRED"
          ? t("personalInformationNameRequired")
          : t("personalInformationSaveFailed")
      );
      return;
    }

    setUser(result.user);
    setPersonalInfoForm({
      name: result.user.username,
      email: result.user.email || "",
    });
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
            readOnly
            aria-readonly="true"
          />
          <span style={assistantSettingHelp}>{t("personalInformationEmailReadOnly")}</span>
        </label>

        <p style={privatePhoneHelpText} role="status">
          <MeetroIcon name="privacy" size={14} decorative />
          {t("personalInformationPhoneUnavailable")}
        </p>
        {personalInfoError && <p style={profileNoticeText} role="alert">{personalInfoError}</p>}
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

  function openMeetroTips() {
    setPage("meetroJourney");
  }

  function readLocalQueue(key) {
    if (!canReadLegacyWorkflowStorage()) return [];
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
    isBusinessMode
      ? businessProfile?.business_name ||
        user?.business_name ||
        user?.businessName ||
        businessName ||
        t("yourBusiness")
      : user?.username || user?.name || userName || user?.email || userEmail || t("meetroAccount");

  const displayEmail = user?.email || userEmail || t("emailNotAvailable");
  const homeownerCity =
    localStorage.getItem("userCity") ||
    localStorage.getItem("homeownerCity") ||
    localStorage.getItem("city") ||
    "";
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
  const defaultPersonalAddress = resolveDefaultPersonalAddress();
  const primaryAddress = defaultPersonalAddress
    ? formatPersonalAddress(defaultPersonalAddress)
    : "";
  const savedAddresses = personalAddresses;
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
  const profileShellClassName = embedded
    ? "profile-embedded-content"
    : "app-page meetro-readable-page meetro-visual-page";
  const profileShellStyle = embedded ? embeddedPageWrapper : pageWrapper;

  if (!isBusinessMode) {
    if (myProfessionalsOpen) {
      return (
        <div className={profileShellClassName} style={profileShellStyle}>
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
              <div className="meetro-visual-empty-state" style={identityEmptyState}>
                <strong>{t("trustedProfessionalsEmpty")}</strong>
                <button
                  type="button"
                  className="meetro-visual-primary-button"
                  style={inlineSectionAction}
                  onClick={() => setPage("discover")}
                >
                  {t("findProfessionals")}
                </button>
              </div>
            )}
          </SettingsGroup>

          {!embedded && <BottomNav setPage={setPage} currentPage="profile" />}
        </div>
      );
    }

    return (
      <div className={profileShellClassName} style={profileShellStyle}>
        <div style={settingsHeader}>
          <div>
            <p style={settingsEyebrow}>{t("homeownerProfileEyebrow")}</p>
            <h1 style={settingsTitle}>{t("homeownerProfile")}</h1>
            <p style={settingsSubtitle}>{t("homeownerProfileSubtitle")}</p>
          </div>
        </div>

        <section className="meetro-visual-hero" style={homeownerHeroCard}>
          <label
            style={{
              ...homeownerAvatarWrap,
              ...(mediaUploadDeferred ? deferredAvatarWrap : {}),
            }}
            title={mediaUploadDeferred ? mediaDeferredCopy.detail : undefined}
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt={t("profile")} style={homeownerAvatarImage} />
            ) : (
              <div style={homeownerAvatarFallback}>
                <MeetroIcon name="profile" size={36} decorative />
              </div>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              disabled={mediaUploadDeferred || profilePhotoUploading}
              aria-label={t(profilePhoto ? "changeProfilePhoto" : "chooseProfilePhoto")}
              onChange={handleProfilePhotoUpload}
            />
          </label>

          <div style={homeownerHeroContent}>
            <h2 style={homeownerHeroName}>{displayName}</h2>
            <p style={homeownerHeroMeta}>
              {homeownerCity ? `${homeownerCity} · ` : ""}
              {t("memberSince")} {memberSinceLabel}
            </p>
          </div>
        </section>

        {teamWorkMembership &&
          ["FIELD_EMPLOYEE", "BOOKKEEPER_FINANCE"].includes(
            teamWorkMembership.role
          ) && (
            <section style={teamWorkAccessCard}>
              <div style={teamWorkAccessCopy}>
                <p style={settingsEyebrow}>Work Access</p>
                <h2 style={teamWorkAccessTitle}>
                  {teamWorkMembership.businessName ||
                    "Your Team"}
                </h2>
                <p style={settingsSubtitle}>
                  {teamWorkMembership.role === "FIELD_EMPLOYEE"
                    ? "Field Employee"
                    : "Bookkeeper / Finance"}
                  {" · "}
                  Active
                </p>
              </div>

              <div style={teamWorkAccessActions}>
                <button
                  type="button"
                  style={{
                    ...teamExperienceButton,
                    ...teamExperienceButtonActive,
                  }}
                  aria-pressed="true"
                  disabled
                >
                  Personal
                </button>

                <button
                  type="button"
                  style={teamExperienceButton}
                  aria-pressed="false"
                  onClick={() =>
                    requestTeamExperienceMode({
                      userId: teamWorkMembership.userId,
                      mode: "work",
                    })
                  }
                >
                  Work —{" "}
                  {teamWorkMembership.businessName ||
                    "Team"}
                </button>
              </div>
            </section>
          )}

        <section style={quickActionRow} aria-label={t("quickActions")}>
          <ProfileActionButton
            icon="profile"
            label={t("editProfile")}
            onClick={openPersonalInfoSheet}
          />
          <ProfileActionButton
            icon="location"
            label={t("manageAddresses")}
            onClick={() => setAddressManagerOpen(true)}
          />
          <ProfileActionButton
            icon="payment"
            label={t("paymentMethods")}
            badge={t("comingSoon")}
            disabled
          />
        </section>

        {profileNotice && <p style={profileNoticeText}>{profileNotice}</p>}

        <SettingsSection
          title={t("myHome")}
          icon="home"
          open={activeSection === "home"}
          onClick={() => toggleSection("home")}
          summary={primaryAddress || t("savedAddresses")}
        >
          <SettingRow
            icon="history"
            label="Meetro Moments"
            value={t("open")}
            onClick={() => setPage("meetroMoments")}
          />

          <SettingRow
            icon="location"
            label={t("savedAddresses")}
            value={
              savedAddresses.length
                ? `${savedAddresses.length}`
                : primaryAddress
                ? t("ready")
                : t("notSet")
            }
            onClick={() => setAddressManagerOpen(true)}
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
        </SettingsSection>

        <SettingsSection
          title={t("myProfessionals")}
          icon="customerRelationships"
          open={activeSection === "professionals"}
          onClick={() => toggleSection("professionals")}
          summary={
            trustedProfessionals.length
              ? `${trustedProfessionals.length} ${t("trusted")}`
              : t("trustedProfessionalsEmpty")
          }
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
            <div className="meetro-visual-empty-state" style={identityEmptyState}>
              <strong>{t("trustedProfessionalsEmpty")}</strong>
              <button
                type="button"
                className="meetro-visual-primary-button"
                style={inlineSectionAction}
                onClick={() => setPage("discover")}
              >
                {t("findProfessionals")}
              </button>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          title={t("preferences")}
          icon="settings"
          open={activeSection === "preferences"}
          onClick={() => toggleSection("preferences")}
          summary={getLanguageLabel(language)}
        >
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

          <ToggleSettingRow
            icon="customerRelationships"
            label={t("relationshipInsights")}
            description={t("relationshipInsightsDescription")}
            enabled={relationshipInsightsEnabled}
            onToggle={toggleRelationshipInsights}
          />

          {insightTesterVisible && (
            <InsightTesterPanel
              disabled={!relationshipInsightsEnabled}
              onTrigger={triggerRelationshipInsightTest}
              onClear={clearRelationshipInsightDismissalsForDev}
            />
          )}

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
        </SettingsSection>

        <SettingsSection
          title={t("reviewsWritten")}
          icon="reviews"
          open={activeSection === "reviews"}
          onClick={() => toggleSection("reviews")}
          summary={`${writtenReviews.length}`}
        >
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
            <div className="meetro-visual-empty-state" style={identityEmptyState}>
              <strong>{t("noReviewsWrittenYet")}</strong>
              <span>{t("reviewCompletedProjectsPrompt")}</span>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          title={t("account")}
          icon="profile"
          open={activeSection === "account"}
          onClick={() => toggleSection("account")}
          summary={businessModeStatusLabel}
        >
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
                <span>{t("accountModeBusiness", language)}</span>
              </span>
              <strong style={settingValue}>
                {businessModeStatusLabel}
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
              <button
                type="button"
                style={businessActivationButton}
                onClick={() => setPage("contractorProfile")}
              >
                Set Up Business Account
              </button>
            )}
          </div>

          <SettingRow
            icon="privacy"
            label={t("passwordSecurity")}
            value={t("manage")}
            onClick={() => setAccountSecurityOpen(true)}
          />
        </SettingsSection>

        <SettingsSection
          title={t("support")}
          icon="help"
          open={activeSection === "support"}
          onClick={() => toggleSection("support")}
          summary={t("learnMeetro")}
        >
          <SettingRow
            icon="aiHelp"
            label={t("learnMeetro")}
            value={t("open")}
            onClick={openMeetroTips}
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
        </SettingsSection>

        <SettingsSection
          title={t("legal")}
          icon="legal"
          open={activeSection === "legal"}
          onClick={() => toggleSection("legal")}
          summary={`${t("privacyPolicy")} · ${t("termsOfUse")}`}
        >
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
        </SettingsSection>

        <button onClick={handleLogout} className="meetro-visual-primary-button" style={logoutButton}>
          {t("logout")}
        </button>

        {renderAccountSecurityWorkspace()}

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

                  <button type="button" style={primaryButton} onClick={savePersonalInfo} disabled={personalInfoSaving}>
                    {personalInfoSaving ? t("personalInformationSaving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {addressManagerOpen && (
          <PersonalAddressManager
            addresses={personalAddresses}
            onChange={setPersonalAddresses}
            onClose={() => setAddressManagerOpen(false)}
          />
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

        {!embedded && <BottomNav setPage={setPage} currentPage="profile" />}
      </div>
    );
  }

  return (
    <div className={profileShellClassName} style={profileShellStyle}>
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
          <p style={settingsEyebrow}>{t("businessProfile")}</p>
          <h1 style={settingsTitle}>{t("profile")}</h1>
          <p style={settingsSubtitle}>
            {hasBusinessAccess
              ? `${t("accountModeBusiness", language)} · ${businessModeStatusLabel}`
              : t("settingsPageSubtitle")}
          </p>
        </div>

        <label
          style={{
            ...compactAvatarWrap,
            ...(mediaUploadDeferred ? deferredAvatarWrap : {}),
          }}
          title={mediaUploadDeferred ? mediaDeferredCopy.detail : undefined}
        >
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
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            disabled={mediaUploadDeferred || profilePhotoUploading}
            aria-label={t(profilePhoto ? "changeProfilePhoto" : "chooseProfilePhoto")}
            onChange={handleProfilePhotoUpload}
          />
        </label>
      </div>

      <section className="meetro-visual-hero" style={businessIdentityHero}>
        <div style={businessIdentityHeroTop}>
          <div>
            <p style={businessIdentityEyebrow}>{t("businessProfile")}</p>
            <h2 style={businessIdentityTitle}>{displayName}</h2>
            <p style={businessIdentitySubtitle}>
              {businessCategory || t("businessProfile")}
            </p>
            <p style={businessIdentityMeta}>
              {displayEmail} · {t("memberSince")} {memberSinceLabel}
            </p>
          </div>
          <span style={businessIdentityStatusBadge}>{businessModeStatusLabel}</span>
        </div>

        <div style={businessIdentityMetricGrid}>
          <div style={businessIdentityMetricCard}>
            <strong style={businessIdentityMetricValue}>{completedRecords.length}</strong>
            <span style={businessIdentityMetricLabel}>Meetro Moments</span>
          </div>
          <div style={businessIdentityMetricCard}>
            <strong style={businessIdentityMetricValue}>{writtenReviews.length}</strong>
            <span style={businessIdentityMetricLabel}>{t("reviewsWritten")}</span>
          </div>
          <div style={businessIdentityMetricCard}>
            <strong style={businessIdentityMetricValue}>
              {hasBusinessAccess ? t("available") : t("setupRequired")}
            </strong>
            <span style={businessIdentityMetricLabel}>{t("businessAvailability")}</span>
          </div>
        </div>
      </section>

      <section style={quickActionRow} aria-label={t("quickActions")}>
        <ProfileActionButton
          icon="businessProfile"
          label={t("businessProfile")}
          onClick={() => setPage("contractorProfile")}
        />
        <ProfileActionButton
          icon="history"
          label="Meetro Moments"
          onClick={() => setPage("meetroMoments")}
        />
        <ProfileActionButton
          icon="aiHelp"
          label={t("aiBusinessHelp")}
          onClick={() => window.dispatchEvent(new Event("meetro:assistant:open"))}
        />
      </section>

      <div className="meetro-visual-surface" style={accountSummaryCard}>
        <div>
          <h2 style={summaryName}>{displayName}</h2>
          <p style={summaryEmail}>{displayEmail}</p>
        </div>
        <span style={summaryBadge}>
          {isBusinessMode
            ? t("accountModeBusiness", language)
            : t("accountModePersonal", language)}
        </span>
      </div>

      <SettingsSection
        title={t("business")}
        icon="businessTools"
        open={activeSection === "business"}
        onClick={() => toggleSection("business")}
        summary={hasBusinessAccess ? t("open") : t("setupRequired")}
      >
        <SettingRow
          icon="availability"
          label={t("businessAvailability")}
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
          onClick={() => setPage("contractorProfile")}
        />

        <SettingRow
          icon="businessTools"
          label={t("connectedServices")}
          value={t("future")}
          disabled
        />
      </SettingsSection>

      <SettingsSection
        title={t("account")}
        icon="profile"
        open={activeSection === "account"}
        onClick={() => toggleSection("account")}
        summary={businessModeStatusLabel}
      >
        <SettingRow
          icon="profile"
          label={t("personalInformation")}
          value={t("manage")}
          onClick={openPersonalInfoSheet}
        />

        <SettingRow
          icon="history"
          label="Meetro Moments"
          value={t("open")}
          onClick={() => setPage("meetroMoments")}
        />

        {canShowTeamMembers && (
          <SettingRow
            icon="businessTools"
            label={t("teamMembers")}
            value={t("open")}
            onClick={() => setPage("teamMembers")}
          />
        )}

        <div style={settingInlineBlock}>
          <div style={settingInlineHeader}>
            <span style={settingLeft}>
              <span style={rowIcon}>
                <ProfileIcon name="businessTools" size={18} />
              </span>
              <span>{t("accountModeBusiness", language)}</span>
            </span>
            <strong style={settingValue}>
              {businessModeStatusLabel}
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
          value={t("manage")}
          onClick={() => setAccountSecurityOpen(true)}
        />
      </SettingsSection>

      <SettingsSection
        title={t("preferences")}
        icon="settings"
        open={activeSection === "preferences"}
        onClick={() => toggleSection("preferences")}
        summary={getLanguageLabel(language)}
      >
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

        <ToggleSettingRow
          icon="customerRelationships"
          label={t("relationshipInsights")}
          description={t("relationshipInsightsDescription")}
          enabled={relationshipInsightsEnabled}
          onToggle={toggleRelationshipInsights}
        />

        {insightTesterVisible && (
          <InsightTesterPanel
            disabled={!relationshipInsightsEnabled}
            onTrigger={triggerRelationshipInsightTest}
            onClear={clearRelationshipInsightDismissalsForDev}
          />
        )}

        <SettingRow
          icon="preview"
          label={t("appearance")}
          value={t("future")}
          disabled
        />
      </SettingsSection>

      <SettingsSection
        title={t("support")}
        icon="help"
        open={activeSection === "support"}
        onClick={() => toggleSection("support")}
        summary={t("aiBusinessHelp")}
      >
        <SettingRow
          icon="aiHelp"
          label={t("learnMeetro")}
          value={t("open")}
          onClick={openMeetroTips}
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
          onClick={() => window.dispatchEvent(new Event("meetro:assistant:open"))}
        />
      </SettingsSection>

      <SettingsSection
        title={t("legal")}
        icon="legal"
        open={activeSection === "legal"}
        onClick={() => toggleSection("legal")}
        summary={`${t("privacyPolicy")} · ${t("termsOfUse")}`}
      >
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
      </SettingsSection>

      <BusinessPlanStatusCard
        setPage={setPage}
        className="profile-business-plan-status"
      />

      <button onClick={handleLogout} className="meetro-visual-primary-button" style={logoutButton}>
        {t("logout")}
      </button>

      {renderAccountSecurityWorkspace()}

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

                <button type="button" style={primaryButton} onClick={savePersonalInfo} disabled={personalInfoSaving}>
                  {personalInfoSaving ? t("personalInformationSaving") : t("saveChanges")}
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

      {!embedded && <BottomNav setPage={setPage} currentPage="profile" />}
    </div>
  );
}

function SettingsSection({ title, icon, open, onClick, summary, children }) {
  const sectionId = `profile-section-${String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;

  return (
    <div className="meetro-visual-surface" style={sectionCard}>
      <button
        type="button"
        onClick={onClick}
        style={sectionHeader}
        aria-expanded={open}
        aria-controls={sectionId}
      >
        <span style={sectionHeaderLeft}>
          <span style={sectionIcon}>
            <ProfileIcon name={icon} size={22} />
          </span>
          <span style={sectionHeaderText}>
            <strong>{title}</strong>
            {!open && summary && <span style={sectionSummary}>{summary}</span>}
          </span>
        </span>

        <span style={chevron} aria-hidden="true">{open ? "⌃" : "⌄"}</span>
      </button>

      <div
        id={sectionId}
        style={{
          ...collapsibleSectionBody,
          ...(open ? collapsibleSectionBodyOpen : {}),
        }}
        hidden={!open}
      >
        <div style={sectionBody}>{children}</div>
      </div>
    </div>
  );
}

function SettingsGroup({ title, icon, children, onClick }) {
  const HeaderComponent = onClick ? "button" : "div";

  return (
    <section className="meetro-visual-surface" style={sectionCard}>
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

function ToggleSettingRow({ icon, label, description, enabled, onToggle }) {
  return (
    <button
      type="button"
      style={toggleSettingRow}
      onClick={onToggle}
      aria-pressed={enabled}
    >
      <span style={toggleSettingLeft}>
        <span style={rowIcon}>
          <ProfileIcon name={icon} size={18} />
        </span>
        <span style={toggleSettingCopy}>
          <strong>{label}</strong>
          <span style={toggleSettingDescription}>{description}</span>
        </span>
      </span>

      <span style={toggleSwitchTrack(enabled)}>
        <span style={toggleSwitchKnob(enabled)} />
      </span>
    </button>
  );
}

function InsightTesterPanel({ disabled, onTrigger, onClear }) {
  const buttonGroups = getInsightTesterButtonGroups();
  return (
    <div style={relationshipInsightTesterCard} data-dev-only="insight-tester">
      <div style={relationshipInsightTesterHeader}>
        <strong>{t("devInsightTester")}</strong>
        <span>{disabled ? t("devInsightsOff") : t("devInsightsReady")}</span>
      </div>

      {disabled && <p style={relationshipInsightTesterNote}>{t("devInsightsDisabledNote")}</p>}

      {buttonGroups.map((group) => (
        <div key={group.key} style={relationshipInsightTesterGroup}>
          <span style={relationshipInsightTesterGroupTitle}>
            {group.key === "commitment" ? t("commitmentInsightTitle") : t("relationshipInsightTitle")}
          </span>
          <div style={relationshipInsightTesterGrid}>
            {group.buttons.map(([type, label]) => (
              <button
                key={type}
                type="button"
                style={{
                  ...relationshipInsightTesterButton,
                  ...(disabled ? relationshipInsightTesterButtonDisabled : {}),
                }}
                onClick={() => onTrigger(type)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={relationshipInsightTesterGroup}>
        <span style={relationshipInsightTesterGroupTitle}>{t("utility")}</span>
        <div style={relationshipInsightTesterGrid}>
          <button
            type="button"
            style={{
              ...relationshipInsightTesterButton,
              ...relationshipInsightTesterClearButton,
            }}
            onClick={onClear}
          >
            {t("devInsightClearDismissals")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileActionButton({ icon, label, onClick, badge, disabled = false }) {
  const isInteractive = Boolean(onClick) && !disabled;
  const Component = isInteractive ? "button" : "div";

  return (
    <Component
      {...(isInteractive ? { type: "button", onClick } : {})}
      className="meetro-visual-surface"
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

const teamWorkAccessCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
  padding: 18,
  margin: "0 0 18px",
  background: "#f7faf7",
  border: "1px solid #dbe7de",
  borderRadius: 16,
};

const teamWorkAccessCopy = {
  minWidth: 0,
  flex: "1 1 240px",
};

const teamWorkAccessTitle = {
  margin: "4px 0",
  color: "#173f28",
  fontSize: 21,
};

const teamWorkAccessActions = {
  display: "flex",
  gap: 9,
  flexWrap: "wrap",
};

const teamExperienceButton = {
  minHeight: 42,
  padding: "9px 13px",
  border: "1px solid #bfd2c4",
  borderRadius: 10,
  background: "#fff",
  color: "#173f28",
  fontWeight: 800,
  cursor: "pointer",
};

const teamExperienceButtonActive = {
  background: "#173f28",
  color: "#fff",
  borderColor: "#173f28",
};

const pageWrapper = {
  background: "var(--meetro-gradient-community-page)",
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "#111",
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto",
};

const embeddedPageWrapper = {
  ...pageWrapper,
  minHeight: "auto",
  width: "100%",
  maxWidth: "none",
  margin: 0,
  padding: "0",
};

const backButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  padding: "12px 14px",
  marginBottom: "14px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft)",
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
  color: "var(--meetro-color-wood)",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const settingsTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "34px",
  lineHeight: 1,
  fontWeight: "950",
};

const settingsSubtitle = {
  margin: "8px 0 0",
  color: "var(--meetro-color-muted)",
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

const deferredAvatarWrap = {
  cursor: "not-allowed",
  opacity: 0.82,
};

const compactAvatarImage = {
  width: "62px",
  height: "62px",
  borderRadius: "999px",
  objectFit: "cover",
  border: "3px solid rgba(255, 253, 248, 0.95)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const compactAvatarFallback = {
  width: "62px",
  height: "62px",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "3px solid rgba(255, 253, 248, 0.95)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const accountSummaryCard = {
  background: "var(--meetro-surface-paper)",
  borderRadius: "22px",
  padding: "16px",
  marginBottom: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const summaryName = {
  margin: "0 0 4px",
  color: "var(--meetro-color-ink)",
  fontSize: "18px",
  fontWeight: "950",
  lineHeight: 1.2,
};

const summaryEmail = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const summaryBadge = {
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  padding: "8px 10px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const homeownerHeroCard = {
  background: "var(--meetro-gradient-community-hero)",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "14px",
  display: "flex",
  gap: "16px",
  alignItems: "center",
  color: "#fffdf8",
  boxShadow: "var(--meetro-shadow-lifted)",
  border: "1px solid rgba(255,255,255,0.14)",
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
  border: "3px solid rgba(255, 253, 248, 0.94)",
  boxShadow: "0 14px 30px rgba(20,53,31,0.28)",
};

const homeownerAvatarFallback = {
  width: "76px",
  height: "76px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.16)",
  color: "#fffdf8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "3px solid rgba(255, 253, 248, 0.94)",
  boxShadow: "0 14px 30px rgba(20,53,31,0.28)",
};

const homeownerHeroContent = {
  minWidth: 0,
  flex: 1,
};

const homeownerHeroName = {
  margin: "0 0 6px",
  color: "#fffdf8",
  fontSize: "22px",
  lineHeight: 1.12,
  fontWeight: "950",
  overflowWrap: "break-word",
};

const homeownerHeroMeta = {
  margin: 0,
  color: "rgba(255, 253, 248, 0.82)",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: "750",
};

const quickActionRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const profileActionButton = {
  minHeight: "86px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  borderRadius: "18px",
  padding: "12px 10px",
  display: "grid",
  placeItems: "center",
  gap: "6px",
  textAlign: "center",
  fontSize: "12px",
  fontWeight: "900",
  boxShadow: "var(--meetro-shadow-soft)",
  cursor: "pointer",
};

const profileActionButtonDisabled = {
  cursor: "default",
  opacity: 0.78,
};

const profileActionIcon = {
  color: "var(--meetro-color-forest)",
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
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-muted)",
  fontSize: "10px",
  fontWeight: "950",
};

const identityEmptyState = {
  display: "grid",
  gap: "10px",
  borderRadius: "16px",
  background: "var(--meetro-surface-sage)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-muted)",
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
  background: "var(--meetro-gradient-community-action)",
  color: "#ffffff",
  padding: "9px 12px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
};

const inlineSecondaryAction = {
  ...inlineSectionAction,
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
};

const compactBackButton = {
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  borderRadius: "18px",
  padding: "12px 14px",
  color: "var(--meetro-color-ink)",
  fontWeight: "950",
  cursor: "pointer",
  justifySelf: "start",
  marginBottom: "14px",
  boxShadow: "var(--meetro-shadow-soft)",
};

const professionalCard = {
  display: "grid",
  gap: "12px",
  borderRadius: "18px",
  background: "var(--meetro-surface-warm)",
  border: "1px solid var(--meetro-color-line)",
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
  color: "var(--meetro-color-ink)",
  minWidth: 0,
  overflowWrap: "break-word",
};

const relationshipBadge = {
  borderRadius: "999px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
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
  background: "linear-gradient(135deg, var(--meetro-color-forest, #1f4d34) 0%, var(--meetro-color-forest, #1f4d34) 100%)",
  color: "white",
  borderRadius: "30px",
  padding: "34px 22px",
  marginBottom: "20px",
  textAlign: "center",
  boxShadow: "0 18px 40px rgba(31,77,52,0.28)",
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
  background: "var(--meetro-color-charcoal, #172317)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "700",
  border: "3px solid white",
  boxShadow: "0 8px 18px rgba(23,35,23,0.32)",
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
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
};

const disabledModeButton = {
  opacity: 0.85,
  cursor: "not-allowed",
};

const helperText = {
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  lineHeight: 1.5,
  margin: "12px 0 0",
  textAlign: "center",
};

const sectionCard = {
  background: "var(--meetro-surface-paper)",
  borderRadius: "24px",
  marginBottom: "14px",
  overflow: "hidden",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const sectionHeader = {
  width: "100%",
  border: "none",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  fontSize: "18px",
};

const staticSectionHeader = {
  width: "100%",
  color: "var(--meetro-color-ink)",
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
  minWidth: 0,
};

const sectionHeaderText = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
  textAlign: "left",
};

const sectionSummary = {
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  fontWeight: 750,
  lineHeight: 1.35,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const sectionIcon = {
  fontSize: "26px",
};

const chevron = {
  fontSize: "26px",
  fontWeight: "900",
  color: "var(--meetro-color-forest)",
};

const sectionBody = {
  padding: "0 16px 16px",
};

const collapsibleSectionBody = {
  maxHeight: 0,
  opacity: 0,
  overflow: "hidden",
  transition: "max-height 220ms ease, opacity 180ms ease",
};

const collapsibleSectionBodyOpen = {
  maxHeight: "1600px",
  opacity: 1,
};

const settingRow = {
  width: "100%",
  border: "none",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-ink)",
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

const toggleSettingRow = {
  ...settingRow,
  alignItems: "center",
};

const toggleSettingLeft = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
  flex: "1 1 auto",
};

const toggleSettingCopy = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: 0,
  color: "#111827",
};

const toggleSettingDescription = {
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: "700",
  overflowWrap: "normal",
  wordBreak: "normal",
};

const toggleSwitchTrack = (enabled) => ({
  width: "46px",
  height: "28px",
  borderRadius: "999px",
  padding: "3px",
  flex: "0 0 auto",
  boxSizing: "border-box",
  background: enabled ? "var(--meetro-color-forest)" : "#cbd5e1",
  display: "flex",
  justifyContent: enabled ? "flex-end" : "flex-start",
  alignItems: "center",
  transition: "background 160ms ease",
});

const toggleSwitchKnob = () => ({
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "#ffffff",
  boxShadow: "0 2px 6px rgba(15,23,42,0.18)",
});

const relationshipInsightTesterCard = {
  background: "var(--meetro-surface-sage)",
  border: "1px dashed rgba(31, 77, 52, 0.28)",
  borderRadius: "16px",
  padding: "12px",
  marginBottom: "10px",
  display: "grid",
  gap: "10px",
};

const relationshipInsightTesterHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  color: "var(--meetro-color-ink)",
  fontSize: "13px",
  fontWeight: "900",
};

const relationshipInsightTesterGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const relationshipInsightTesterGroup = {
  display: "grid",
  gap: "7px",
};

const relationshipInsightTesterGroupTitle = {
  color: "var(--meetro-color-muted)",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const relationshipInsightTesterNote = {
  margin: 0,
  color: "var(--meetro-color-forest)",
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: "850",
};

const relationshipInsightTesterButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  padding: "8px 10px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const relationshipInsightTesterButtonDisabled = {
  opacity: 0.64,
};

const relationshipInsightTesterClearButton = {
  background: "var(--meetro-surface-sage)",
};

const settingInlineBlock = {
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-ink)",
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
  color: "var(--meetro-color-forest)",
  background: "var(--meetro-surface-sage)",
  border: "1px solid var(--meetro-color-line)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
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
  color: "var(--meetro-color-forest)",
  whiteSpace: "nowrap",
};

const primaryButton = {
  border: "none",
  background: "var(--meetro-gradient-community-action)",
  color: "white",
  padding: "14px 18px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const businessActivationButton = {
  border: "1px solid var(--meetro-color-forest, #1f4d34)",
  background: "transparent",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px 13px",
  borderRadius: "13px",
  fontWeight: "850",
  cursor: "pointer",
  marginTop: "10px",
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
  color: "var(--meetro-color-forest, #1f4d34)",
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
  border: "2px solid var(--meetro-color-forest, #1f4d34)",
  background: "#f4f1ff",
  boxShadow: "0 10px 24px rgba(31, 77, 52, 0.16)",
};

const languageSelectedIcon = {
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "inline-flex",
  alignItems: "center",
};

const logoutButton = {
  width: "100%",
  padding: "15px 24px",
  background: "var(--meetro-gradient-community-action)",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "4px",
};

const businessIdentityHero = {
  background: "var(--meetro-gradient-community-hero)",
  borderRadius: "26px",
  padding: "20px",
  marginBottom: "14px",
  color: "#fffdf8",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "var(--meetro-shadow-lifted)",
  display: "grid",
  gap: "16px",
};

const businessIdentityHeroTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
};

const businessIdentityEyebrow = {
  margin: "0 0 6px",
  color: "rgba(251, 246, 237, 0.72)",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const businessIdentityTitle = {
  margin: 0,
  color: "#fffdf8",
  fontSize: "28px",
  lineHeight: 1.08,
  fontWeight: "950",
};

const businessIdentitySubtitle = {
  margin: "8px 0 0",
  color: "rgba(255, 253, 248, 0.86)",
  fontSize: "15px",
  lineHeight: 1.35,
  fontWeight: "800",
};

const businessIdentityMeta = {
  margin: "8px 0 0",
  color: "rgba(255, 253, 248, 0.72)",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const businessIdentityStatusBadge = {
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.14)",
  color: "#fffdf8",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const businessIdentityMetricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "10px",
};

const businessIdentityMetricCard = {
  borderRadius: "18px",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "14px",
  display: "grid",
  gap: "6px",
};

const businessIdentityMetricValue = {
  color: "#fffdf8",
  fontSize: "18px",
  fontWeight: "950",
  lineHeight: 1.1,
};

const businessIdentityMetricLabel = {
  color: "rgba(255, 253, 248, 0.74)",
  fontSize: "12px",
  fontWeight: "800",
  lineHeight: 1.4,
};

export default Profile;
