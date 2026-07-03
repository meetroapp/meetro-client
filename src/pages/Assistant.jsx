import { useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import { t } from "../utils/language";
import {
  buildAssistantRequestDraft,
  classifyAssistantRequestIntent,
  saveAssistantRequestDraft,
} from "../utils/assistantRequestDraft";

function Assistant({ setPage }) {
  const [projectText, setProjectText] = useState("");
  const [mode, setMode] = useState("scope");
  const [prepared, setPrepared] = useState(false);
  const inputRef = useRef(null);

  const hasText = projectText.trim().length > 0;

  const recommendations = getPreparedRequest(projectText, mode);

  function useDraft() {
    if (projectText.trim()) {
      const draft = buildAssistantRequestDraft({
        userText: projectText,
        recommendations,
        mode,
      });

      saveAssistantRequestDraft(localStorage, draft);
    }

    setPage("upload");
  }

  function prepareRequest() {
    if (!hasText) {
      inputRef.current?.focus();
      return;
    }

    setPrepared(true);
  }

  function editDescription() {
    setPrepared(false);
    inputRef.current?.focus();
  }

  return (
    <div style={page}>
      <div style={heroCard}>
        <span style={heroOrbMark} aria-hidden="true">M</span>
        <h1 style={title}>Meetro</h1>
        <div style={subtitleStack}>
          <p style={subtitle}>{t("assistantRequestHeroLine1")}</p>
          <p style={subtitle}>{t("assistantRequestHeroLine2")}</p>
          <p style={subtitle}>{t("assistantRequestHeroLine3")}</p>
          <p style={subtitle}>{t("assistantRequestHeroLine4")}</p>
        </div>
      </div>

      <div style={askCard}>
        <h2 style={askTitle}>{t("assistantRequestDescriptionTitle")}</h2>
        <p style={helperText}>
          {t("assistantRequestExample")}
        </p>

        <textarea
          ref={inputRef}
          style={textarea}
          value={projectText}
          onChange={(event) => {
            setProjectText(event.target.value);
            setPrepared(false);
          }}
          placeholder={t("assistantRequestPlaceholder")}
        />

        <button
          type="button"
          style={{
            ...prepareButton,
            opacity: hasText ? 1 : 0.62,
          }}
          onClick={prepareRequest}
        >
          {t("assistantPrepareRequestAction")}
        </button>
      </div>

      {prepared && hasText && (
      <div style={resultCard}>
        <div style={resultHeader}>
          <span style={resultIcon}>M</span>
          <div>
            <p style={resultLabel}>{t("assistantPreparedRequest")}</p>
            <h2 style={resultTitle}>{recommendations.businessType}</h2>
          </div>
        </div>

        <div style={sectionBlock}>
          <strong style={sectionLabel}>{t("assistantPreparedService")}</strong>
          <p style={sectionText}>{recommendations.businessType}</p>
        </div>

        <div style={sectionBlock}>
          <strong style={sectionLabel}>{t("assistantPreparedProjectSummary")}</strong>
          <p style={sectionText}>{projectText.trim()}</p>
        </div>

        <div style={sectionBlock}>
          <strong style={sectionLabel}>{t("assistantPreparedRecommendedDetails")}</strong>
          {recommendations.scope.map((item) => (
            <p key={item} style={bullet}>• {item}</p>
          ))}
        </div>

        <div style={sectionBlock}>
          <strong style={sectionLabel}>{t("assistantPreparedPhotosToInclude")}</strong>
          {recommendations.photos.map((item) => (
            <p key={item} style={bullet}>• {item}</p>
          ))}
        </div>

        <div style={sectionBlock}>
          <strong style={sectionLabel}>{t("assistantPreparedRecommendation")}</strong>
          <p style={sectionText}>
            {t("assistantPreparedRecommendationText")}
          </p>
        </div>

        <div style={actionRow}>
          <button style={secondaryButton} onClick={editDescription} type="button">
            {t("assistantEditDescription")}
          </button>
          <button style={askButton} onClick={useDraft} type="button">
            {t("assistantUseThisToPostProject")}
          </button>
        </div>
      </div>
      )}

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

function getPreparedRequest(text, mode) {
  const intent = classifyAssistantRequestIntent(text);
  const businessType = getPreparedServiceLabel(intent);
  const icon = "";

  const content = {
    scope: {
      heading: t("assistantRequestScopeHeading"),
      scope: getHelpfulDetailsForIntent(intent),
    },
    estimate: {
      heading: t("assistantRequestEstimateHeading"),
      scope: [
        t("assistantRequestEstimateService"),
        t("assistantRequestEstimatePhotos"),
        t("assistantRequestEstimateTiming"),
        t("assistantRequestEstimateMaterials"),
      ],
    },
    materials: {
      heading: t("assistantRequestMaterialsHeading"),
      scope: [
        t("assistantRequestMaterialsCompatibility"),
        t("assistantRequestMaterialsPhotos"),
        t("assistantRequestMaterialsConfirm"),
        t("assistantRequestMaterialsReceipts"),
      ],
    },
    design: {
      heading: t("assistantRequestDesignHeading"),
      scope: [
        t("assistantRequestDesignComingSoon"),
        t("assistantRequestDesignPreferences"),
        t("assistantRequestDesignBudget"),
        t("assistantRequestDesignProfessionalUse"),
      ],
    },
  };

  return {
    businessType,
    icon,
    intent,
    heading: content[mode].heading,
    scope: content[mode].scope,
    photos: getPhotoSuggestionsForIntent(intent),
  };
}

function getPreparedServiceLabel(intent) {
  if (intent.category === "mechanic") return t("assistantRequestServiceMechanic");
  if (intent.category === "doorsWindows") return t("assistantRequestServiceGarageDoor");
  if (intent.category === "plumbing") return t("plumbing");
  if (intent.category === "electrical") return t("assistantRequestServiceElectricalHandyman");
  if (intent.category === "painting" || intent.category === "drywall") {
    return t("assistantRequestServicePaintingDrywall");
  }
  if (intent.category === "propertyManagement") return t("propertyManagement");
  if (intent.category === "handyman") return t("assistantRequestServiceHandymanGeneral");
  return t("assistantRequestServiceMoreDetailsNeeded");
}

function getHelpfulDetailsForIntent(intent) {
  if (intent.category === "mechanic") {
    return [
      t("assistantRequestVehicleMakeModel"),
      t("assistantRequestVehicleCranks"),
      t("assistantRequestVehicleWarningLights"),
      t("assistantRequestVehicleBattery"),
      t("assistantRequestVehicleLocation"),
      t("assistantRequestVehicleRoadside"),
    ];
  }

  if (intent.category === "doorsWindows") {
    return [
      t("assistantRequestGarageOpenerBrand"),
      t("assistantRequestGarageExistingNew"),
      t("assistantRequestGarageDoorSize"),
      t("assistantRequestGaragePowerOutlet"),
      t("assistantRequestGarageSafetySensors"),
    ];
  }

  if (intent.category === "plumbing") {
    return [
      t("assistantRequestPlumbingLeakLocation"),
      t("assistantRequestPlumbingActiveLeak"),
      t("assistantRequestPlumbingShutoff"),
      t("assistantRequestPlumbingUrgency"),
    ];
  }

  if (!intent.category) {
    return [
      t("assistantRequestClarifyServiceType"),
      t("assistantRequestClarifyLocation"),
      t("assistantRequestClarifyTiming"),
    ];
  }

  return [
    t("assistantRequestScopeLocation"),
    t("assistantRequestScopeMeasurements"),
    t("assistantRequestScopeMaterials"),
  ];
}

function getPhotoSuggestionsForIntent(intent) {
  if (intent.category === "mechanic") {
    return [
      t("assistantRequestVehiclePhotoDashboard"),
      t("assistantRequestVehiclePhotoBattery"),
      t("assistantRequestVehiclePhotoLocation"),
    ];
  }

  if (intent.category === "doorsWindows") {
    return [
      t("assistantRequestGaragePhotoDoor"),
      t("assistantRequestGaragePhotoOpenerArea"),
      t("assistantRequestGaragePhotoOutletSensor"),
    ];
  }

  if (intent.category === "plumbing") {
    return [
      t("assistantRequestPlumbingPhotoLeak"),
      t("assistantRequestPlumbingPhotoUnderSink"),
      t("assistantRequestPlumbingPhotoShutoff"),
    ];
  }

  return [
    t("assistantRequestPhotoWide"),
    t("assistantRequestPhotoClose"),
    t("assistantRequestPhotoAccess"),
  ];
}

const page = {
  minHeight: "100vh",
  padding: "calc(env(safe-area-inset-top, 0px) + 62px) 18px 110px",
  background:
    "radial-gradient(circle at top, rgba(91,61,245,0.18), transparent 34%), #f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "760px",
  minWidth: 0,
  margin: "0 auto",
  overflowX: "hidden",
};

const heroCard = {
  position: "relative",
  padding: "18px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(255,255,255,0.86)",
  color: "#0f172a",
  boxShadow: "0 18px 42px rgba(91,61,245,0.10)",
  marginBottom: "12px",
  overflow: "hidden",
  backdropFilter: "blur(18px)",
};

const heroOrbMark = {
  position: "absolute",
  right: "16px",
  top: "14px",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "rgba(91,61,245,0.10)",
  border: "1px solid rgba(91,61,245,0.14)",
  color: "#5b3df5",
  fontSize: "18px",
  fontWeight: 950,
};

const title = {
  margin: 0,
  fontSize: "30px",
  fontWeight: "950",
  letterSpacing: "-1px",
};

const subtitleStack = {
  display: "grid",
  gap: "4px",
  marginTop: "10px",
};

const subtitle = {
  margin: 0,
  fontSize: "15px",
  lineHeight: 1.35,
  color: "#475569",
  fontWeight: 750,
};

const askCard = {
  padding: "16px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(226,232,240,0.95)",
  boxShadow: "0 14px 32px rgba(15,23,42,0.06)",
  marginBottom: "12px",
};

const askTitle = {
  margin: "0 0 12px",
  fontSize: "21px",
  fontWeight: "950",
  color: "#0f172a",
};

const helperText = {
  margin: "-4px 0 12px",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: "700",
};

const textarea = {
  width: "100%",
  minHeight: "112px",
  border: "1px solid #dbe3ef",
  borderRadius: "20px",
  padding: "14px",
  fontSize: "15px",
  lineHeight: 1.4,
  outline: "none",
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily: "inherit",
};

const prepareButton = {
  marginTop: "12px",
  width: "100%",
  padding: "13px",
  borderRadius: "18px",
  border: "0",
  background: "#5b3df5",
  color: "white",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(91,61,245,0.18)",
};

const resultCard = {
  padding: "16px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(226,232,240,0.95)",
  boxShadow: "0 14px 32px rgba(15,23,42,0.06)",
};

const resultHeader = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  marginBottom: "14px",
};

const resultIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(91,61,245,0.10)",
  display: "grid",
  placeItems: "center",
  color: "#5b3df5",
  fontSize: "18px",
  fontWeight: 950,
};

const resultLabel = {
  margin: 0,
  fontSize: "12px",
  fontWeight: "950",
  color: "#7c3aed",
  textTransform: "uppercase",
};

const resultTitle = {
  margin: "3px 0 0",
  fontSize: "21px",
  fontWeight: "950",
  color: "#0f172a",
};

const sectionBlock = {
  padding: "13px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  marginTop: "10px",
};

const sectionLabel = {
  display: "block",
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: "950",
  marginBottom: "6px",
};

const sectionText = {
  margin: 0,
  color: "#334155",
  fontSize: "14px",
};

const bullet = {
  margin: "5px 0",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.35,
};

const askButton = {
  width: "100%",
  padding: "14px",
  borderRadius: "20px",
  border: "0",
  background: "#5b3df5",
  color: "white",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(91,61,245,0.24)",
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  marginTop: "14px",
};

const secondaryButton = {
  width: "100%",
  padding: "13px",
  borderRadius: "18px",
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#334155",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
};

export default Assistant;
