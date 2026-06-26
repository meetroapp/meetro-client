import { useEffect, useMemo, useState } from "react";
import { getLanguage, t } from "../utils/language";
import {
  PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS,
  buildProfessionalSpecialtyProfile,
  inferProfessionalSpecialtiesFromLegacyCategories,
} from "../utils/professionalOnboardingSpecialties";

const ONBOARDING_KEY = "meetroProfessionalOnboarding";
const ONBOARDING_COMPLETED_KEY = "meetroProfessionalOnboardingCompleted";
const PROFILE_DRAFT_KEY = "meetroProfessionalProfileDraft";

const radiusOptions = [
  { value: "10 miles", labelKey: "professionalOnboardingRadius10" },
  { value: "15 miles", labelKey: "professionalOnboardingRadius15" },
  { value: "25 miles", labelKey: "professionalOnboardingRadius25" },
  { value: "50 miles", labelKey: "professionalOnboardingRadius50" },
  { value: "Custom", labelKey: "professionalOnboardingRadiusCustom" },
];
const availabilityOptions = [
  { value: "Weekdays", labelKey: "professionalOnboardingAvailabilityWeekdays" },
  { value: "Weekends", labelKey: "professionalOnboardingAvailabilityWeekends" },
  { value: "Evenings", labelKey: "professionalOnboardingAvailabilityEvenings" },
  { value: "Emergency Calls", labelKey: "professionalOnboardingAvailabilityEmergency" },
  { value: "Same-Day Jobs", labelKey: "professionalOnboardingAvailabilitySameDay" },
];

function readJson(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}

function createInitialDraft() {
  const saved = readJson(PROFILE_DRAFT_KEY, {});
  const savedServiceCategories = Array.isArray(saved.serviceCategories)
    ? saved.serviceCategories
    : [];
  const savedServiceSpecialties = Array.isArray(saved.serviceSpecialties)
    ? saved.serviceSpecialties
    : inferProfessionalSpecialtiesFromLegacyCategories(savedServiceCategories);

  return {
    businessName: saved.businessName || localStorage.getItem("businessName") || "",
    contactName:
      saved.contactName ||
      localStorage.getItem("businessContactName") ||
      localStorage.getItem("userName") ||
      "",
    phone:
      saved.phone ||
      localStorage.getItem("businessPhone") ||
      localStorage.getItem("emergencyBusinessPhone") ||
      "",
    email:
      saved.email ||
      localStorage.getItem("businessEmail") ||
      localStorage.getItem("userEmail") ||
      "",
    serviceCategories: savedServiceCategories,
    serviceSpecialties: savedServiceSpecialties,
    otherService: saved.otherService || "",
    primaryCity: saved.primaryCity || localStorage.getItem("businessPrimaryCity") || "",
    zipCodes: saved.zipCodes || localStorage.getItem("businessZipCodes") || "",
    serviceRadius: saved.serviceRadius || "15 miles",
    customRadius: saved.customRadius || "",
    availability: Array.isArray(saved.availability) ? saved.availability : [],
  };
}

function ProfessionalOnboarding({ setPage }) {
  const language = getLanguage();
  const returnPage = localStorage.getItem("meetroProfessionalOnboardingReturnPage") || "";
  const savedProgress = readJson(ONBOARDING_KEY, {});
  const [step, setStep] = useState(Number(savedProgress.step || 1));
  const [draft, setDraft] = useState(createInitialDraft);

  const stepTitles = useMemo(
    () => [
      t("professionalOnboardingStepWelcome"),
      t("professionalOnboardingStepBusinessInfo"),
      t("professionalOnboardingStepServices"),
      t("professionalOnboardingStepServiceArea"),
      t("professionalOnboardingStepAvailability"),
      t("professionalOnboardingStepComplete"),
    ],
    [language]
  );

  useEffect(() => {
    localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(draft));
    localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({
        step,
        skipped: localStorage.getItem("meetroProfessionalOnboardingSkipped") === "true",
        completed: localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true",
        updatedAt: new Date().toISOString(),
      })
    );
  }, [draft, step]);

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleArrayValue = (field, value) => {
    setDraft((current) => {
      const nextValues = current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value];

      return { ...current, [field]: nextValues };
    });
  };

  const goDashboard = () => {
    localStorage.setItem("activeAccountMode", "business");
    localStorage.removeItem("meetroProfessionalOnboardingReturnPage");
    setPage("businessDashboard");
  };

  const skipOnboarding = () => {
    localStorage.setItem("meetroProfessionalOnboardingSkipped", "true");
    localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({
        step,
        skipped: true,
        completed: false,
        updatedAt: new Date().toISOString(),
      })
    );
    goDashboard();
  };

  const completeOnboarding = () => {
    const specialtyProfile = buildProfessionalSpecialtyProfile(draft);

    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    localStorage.removeItem("meetroProfessionalOnboardingSkipped");
    localStorage.setItem("businessName", draft.businessName);
    localStorage.setItem("businessContactName", draft.contactName);
    localStorage.setItem("businessPhone", draft.phone);
    localStorage.setItem("businessEmail", draft.email);
    localStorage.setItem("businessPrimaryCity", draft.primaryCity);
    localStorage.setItem("businessZipCodes", draft.zipCodes);
    localStorage.setItem("businessServiceRadius", draft.serviceRadius);
    localStorage.setItem("businessAvailability", JSON.stringify(draft.availability));
    localStorage.setItem(
      "businessServiceCategories",
      JSON.stringify(specialtyProfile.serviceCategories)
    );
    localStorage.setItem(
      "businessServiceSpecialties",
      JSON.stringify(specialtyProfile.serviceSpecialties)
    );
    localStorage.setItem(
      "businessServiceDomains",
      JSON.stringify(specialtyProfile.serviceDomains)
    );
    localStorage.setItem("businessServiceDomain", specialtyProfile.serviceDomain);
    localStorage.setItem(
      "businessCategory",
      specialtyProfile.serviceCategories[0] || draft.otherService || ""
    );
    localStorage.setItem(
      PROFILE_DRAFT_KEY,
      JSON.stringify({
        ...draft,
        serviceCategories: specialtyProfile.serviceCategories,
        serviceSpecialties: specialtyProfile.serviceSpecialties,
        serviceDomains: specialtyProfile.serviceDomains,
        serviceDomain: specialtyProfile.serviceDomain,
      })
    );
    localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({
        step: 6,
        skipped: false,
        completed: true,
        updatedAt: new Date().toISOString(),
      })
    );
    goDashboard();
  };

  const completionChecks = [
    {
      label: t("professionalOnboardingCheckBusinessInfo"),
      done: Boolean(draft.businessName || draft.contactName || draft.phone || draft.email),
    },
    {
      label: t("professionalOnboardingCheckServices"),
      done: draft.serviceSpecialties.length > 0 || Boolean(draft.otherService),
    },
    {
      label: t("professionalOnboardingCheckServiceArea"),
      done: Boolean(draft.primaryCity || draft.zipCodes || draft.serviceRadius),
    },
    {
      label: t("professionalOnboardingCheckAvailability"),
      done: draft.availability.length > 0,
    },
  ];

  return (
    <main className="professional-onboarding-page" style={page}>
      <section style={shell}>
        <div style={topRow}>
          {step > 1 ? (
            <button type="button" style={backButton} onClick={() => setStep((value) => Math.max(1, value - 1))}>
              {t("back")}
            </button>
          ) : returnPage === "businessCommandCenter" ? (
            <button
              type="button"
              style={backButton}
              onClick={() => {
                localStorage.removeItem("meetroProfessionalOnboardingReturnPage");
                setPage("businessCommandCenter");
              }}
            >
              {t("businessTools")}
            </button>
          ) : (
            <span />
          )}
          <span style={progressPill}>
            {t("professionalOnboardingProgressStep")} {step} {t("professionalOnboardingProgressOf")} 6
          </span>
        </div>

        <div style={progressTrack}>
          <span style={{ ...progressFill, width: `${(step / 6) * 100}%` }} />
        </div>

        {step === 1 && (
          <div style={card}>
            <p style={eyebrow}>{t("professionalSetup")}</p>
            <h1 style={title}>{t("professionalOnboardingWelcomeTitle")}</h1>
            <p style={copy}>
              {t("professionalOnboardingWelcomeSubtitle")}
            </p>
            <button type="button" style={primaryButton} onClick={() => setStep(2)}>
              {t("professionalOnboardingGetStarted")}
            </button>
            <button type="button" style={secondaryButton} onClick={skipOnboarding}>
              {t("professionalOnboardingSkip")}
            </button>
          </div>
        )}

        {step === 2 && (
          <StepCard title={stepTitles[1]}>
            <Field label={t("businessName")} value={draft.businessName} onChange={(value) => updateDraft("businessName", value)} />
            <Field label={t("professionalOnboardingContactName")} value={draft.contactName} onChange={(value) => updateDraft("contactName", value)} />
            <Field label={t("professionalOnboardingPhone")} value={draft.phone} onChange={(value) => updateDraft("phone", value)} inputMode="tel" />
            <Field label={t("emailAddress")} value={draft.email} onChange={(value) => updateDraft("email", value)} type="email" />
            <StepActions onNext={() => setStep(3)} />
          </StepCard>
        )}

        {step === 3 && (
          <StepCard title={stepTitles[2]}>
            <p style={helperText}>
              {t("professionalOnboardingSpecialtyHelp")}
            </p>
            <div style={specialtyGroupList}>
              {PROFESSIONAL_ONBOARDING_SPECIALTY_GROUPS.map((group) => (
                <section key={group.domain} style={specialtyGroup}>
                  <h2 style={specialtyGroupTitle}>{t(group.labelKey)}</h2>
                  <div style={chipGrid}>
                    {group.options.map((option) => {
                      const isSelected = draft.serviceSpecialties.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={isSelected ? "meetro-selected-card-soft" : ""}
                          style={isSelected ? selectedChip : chip}
                          onClick={() =>
                            toggleArrayValue("serviceSpecialties", option.value)
                          }
                        >
                          {isSelected ? "✓ " : ""}
                          {t(option.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <Field
              label={t("professionalOnboardingOtherService")}
              value={draft.otherService}
              onChange={(value) => updateDraft("otherService", value)}
            />
            <StepActions onNext={() => setStep(4)} />
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title={stepTitles[3]}>
            <Field label={t("professionalOnboardingPrimaryCity")} value={draft.primaryCity} onChange={(value) => updateDraft("primaryCity", value)} />
            <Field label={t("professionalOnboardingZipCodes")} value={draft.zipCodes} onChange={(value) => updateDraft("zipCodes", value)} placeholder="33101, 33130" />
            <label style={label}>
              {t("professionalOnboardingServiceRadius")}
              <select style={input} value={draft.serviceRadius} onChange={(event) => updateDraft("serviceRadius", event.target.value)}>
                {radiusOptions.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
              </select>
            </label>
            {draft.serviceRadius === "Custom" && (
              <Field label={t("professionalOnboardingCustomRadius")} value={draft.customRadius} onChange={(value) => updateDraft("customRadius", value)} placeholder={t("professionalOnboardingCustomRadiusPlaceholder")} />
            )}
            <StepActions onNext={() => setStep(5)} />
          </StepCard>
        )}

        {step === 5 && (
          <StepCard title={stepTitles[4]}>
            <div style={toggleList}>
              {availabilityOptions.map((option) => (
                <label key={option.value} style={toggleRow}>
                  <span>{t(option.labelKey)}</span>
                  <input
                    type="checkbox"
                    checked={draft.availability.includes(option.value)}
                    onChange={() => toggleArrayValue("availability", option.value)}
                  />
                </label>
              ))}
            </div>
            <p style={helperText}>
              {t("professionalOnboardingAvailabilityNote")}
            </p>
            <StepActions onNext={() => setStep(6)} />
          </StepCard>
        )}

        {step === 6 && (
          <StepCard title={stepTitles[5]}>
            <ul style={checklist}>
              {completionChecks.map((item) => (
                <li key={item.label} style={item.done ? checklistDone : checklistItem}>
                  <span>{item.done ? "✓" : "•"}</span>
                  {item.label}
                </li>
              ))}
            </ul>
            <button type="button" style={primaryButton} onClick={completeOnboarding}>
              {t("professionalOnboardingGoDashboard")}
            </button>
            <button type="button" style={secondaryButton} onClick={() => setStep(2)}>
              {t("professionalOnboardingReviewSetup")}
            </button>
          </StepCard>
        )}
      </section>
    </main>
  );
}

function StepCard({ title, children }) {
  return (
    <div style={card}>
      <p style={eyebrow}>{t("professionalOnboardingEyebrow")}</p>
      <h1 style={titleStyle}>{title}</h1>
      {children}
    </div>
  );
}

function Field({ label: fieldLabel, value, onChange, type = "text", inputMode, placeholder = "" }) {
  return (
    <label style={label}>
      {fieldLabel}
      <input
        style={input}
        value={value}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function StepActions({ onNext }) {
  return (
    <button type="button" style={primaryButton} onClick={onNext}>
      {t("professionalOnboardingContinue")}
    </button>
  );
}

const page = {
  boxSizing: "border-box",
  minHeight: "100dvh",
  background: "linear-gradient(180deg, #f8fafc, #eef2ff)",
  padding:
    "max(22px, calc(env(safe-area-inset-top, 0px) + 18px)) max(16px, env(safe-area-inset-right, 0px)) calc(96px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
  overflowX: "hidden",
};

const shell = {
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "560px",
  margin: "0 auto",
  display: "grid",
  gap: "14px",
};

const topRow = {
  minHeight: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const progressPill = {
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #dbeafe",
  padding: "9px 12px",
  color: "#4338ca",
  fontWeight: 900,
  fontSize: "13px",
};

const progressTrack = {
  height: "8px",
  borderRadius: "999px",
  background: "#dbeafe",
  overflow: "hidden",
};

const progressFill = {
  display: "block",
  height: "100%",
  borderRadius: "999px",
  background: "#5b3df5",
  transition: "width 160ms ease",
};

const card = {
  boxSizing: "border-box",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
  display: "grid",
  gap: "12px",
};

const eyebrow = {
  margin: 0,
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const title = {
  margin: "0 0 4px",
  color: "#0f172a",
  fontSize: "clamp(28px, 9vw, 42px)",
  lineHeight: 1.04,
};

const titleStyle = {
  ...title,
  fontSize: "clamp(24px, 7vw, 34px)",
};

const copy = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.5,
  fontWeight: 700,
};

const label = {
  display: "grid",
  gap: "6px",
  color: "#111827",
  fontWeight: 900,
};

const input = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: "48px",
  border: "1px solid #dbeafe",
  borderRadius: "15px",
  padding: "12px 13px",
  color: "#0f172a",
  background: "#ffffff",
  fontSize: "16px",
};

const primaryButton = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: "50px",
  border: "none",
  borderRadius: "16px",
  background: "#5b3df5",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  background: "#ffffff",
  color: "#5b3df5",
  border: "1px solid rgba(91, 61, 245, 0.22)",
};

const backButton = {
  border: "1px solid #dbeafe",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "999px",
  padding: "10px 13px",
  fontWeight: 900,
  cursor: "pointer",
};

const chipGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
  gap: "9px",
};

const specialtyGroupList = {
  display: "grid",
  gap: "14px",
};

const specialtyGroup = {
  display: "grid",
  gap: "9px",
};

const specialtyGroupTitle = {
  margin: 0,
  color: "#334155",
  fontSize: "14px",
  fontWeight: 950,
};

const chip = {
  boxSizing: "border-box",
  minHeight: "44px",
  border: "1px solid #dbeafe",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
};

const selectedChip = {
  ...chip,
  background: "#eef2ff",
  borderColor: "#a5b4fc",
  color: "#4338ca",
};

const toggleList = {
  display: "grid",
  gap: "9px",
};

const toggleRow = {
  boxSizing: "border-box",
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "15px",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
  fontWeight: 900,
};

const helperText = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  fontWeight: 750,
  lineHeight: 1.4,
};

const checklist = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: "10px",
};

const checklistItem = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  color: "#64748b",
  fontWeight: 850,
};

const checklistDone = {
  ...checklistItem,
  color: "#166534",
};

export default ProfessionalOnboarding;
