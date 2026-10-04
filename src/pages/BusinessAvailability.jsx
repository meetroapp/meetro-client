import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { authFetch } from "../utils/authFetch";
import { getLanguage } from "../utils/language";
import {
  readBusinessAvailability,
  setBusinessAvailability,
} from "../utils/businessAvailability";
import {
  buildBusinessProfilePayloadFromCanonical,
  getConfirmedBusinessProfile,
} from "../utils/businessProfilePersistence";

const COPY = {
  en: {
    title: "Availability",
    description:
      "Control when your business appears as Available Now and whether homeowners may choose you directly for matching Emergency requests.",
    category: "Business Operations",
    availableTitle: "Available Now",
    availableHelp:
      "Shows your business as currently available when you match an Emergency request.",
    directTitle:
      "Allow Direct Emergency Selection",
    directHelp:
      "When this and Available Now are both on, a homeowner may choose your business before you send a response. This does not mean you are on the way.",
    serviceArea: "Service area",
    serviceAreaHelp:
      "Emergency matching uses the service area saved to your Business Profile.",
    serviceAreaPlaceholder:
      "Example: Cape Coral, Fort Myers, Lee County",
    save: "Save Availability",
    saving: "Saving…",
    saved:
      "Availability saved to your Business Profile.",
    loading:
      "Loading Business Profile availability…",
    failed:
      "Business Profile availability could not be loaded.",
    saveFailed:
      "Availability could not be saved.",
    retry: "Try Again",
    on: "ON",
    off: "OFF",
  },

  es: {
    title: "Disponibilidad",
    description:
      "Controla cuándo tu negocio aparece como Disponible Ahora y si los propietarios pueden elegirlo directamente para solicitudes de Emergencia compatibles.",
    category: "Operaciones",
    availableTitle: "Disponible Ahora",
    availableHelp:
      "Muestra tu negocio como disponible cuando coincide con una solicitud de Emergencia.",
    directTitle:
      "Permitir selección directa de Emergencia",
    directHelp:
      "Cuando esta opción y Disponible Ahora están activadas, un propietario puede elegir tu negocio antes de que envíes una respuesta. Esto no significa que estés en camino.",
    serviceArea: "Área de servicio",
    serviceAreaHelp:
      "La coincidencia de Emergencia usa el área de servicio guardada en tu Perfil de Negocio.",
    serviceAreaPlaceholder:
      "Ejemplo: Cape Coral, Fort Myers, Lee County",
    save: "Guardar disponibilidad",
    saving: "Guardando…",
    saved:
      "Disponibilidad guardada en tu Perfil de Negocio.",
    loading:
      "Cargando disponibilidad del Perfil de Negocio…",
    failed:
      "No se pudo cargar la disponibilidad del Perfil de Negocio.",
    saveFailed:
      "No se pudo guardar la disponibilidad.",
    retry: "Intentar de nuevo",
    on: "ACTIVO",
    off: "INACTIVO",
  },
};

function BusinessAvailability({
  setPage,
}) {
  const language = getLanguage();
  const copy =
    COPY[language] ||
    COPY.en;

  const [profile, setProfile] =
    useState(null);

  const [phase, setPhase] =
    useState("loading");

  const [availableNow, setAvailableNow] =
    useState(false);

  const [dispatchReady, setDispatchReady] =
    useState(false);

  const [serviceArea, setServiceArea] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [notice, setNotice] =
    useState("");

  const [error, setError] =
    useState("");

  function projectConfirmedProfile(
    confirmedProfile
  ) {
    setProfile(confirmedProfile);

    const canonicalAvailableNow =
      confirmedProfile.available_now ===
        true;

    setAvailableNow(
      canonicalAvailableNow
    );

    setDispatchReady(
      confirmedProfile.dispatch_ready ===
        true
    );

    setServiceArea(
      confirmedProfile.service_area ||
        confirmedProfile.location ||
        ""
    );

    // Compatibility mirrors only.
    // Emergency authority remains the Business Profile.
    if (
      readBusinessAvailability() !==
      canonicalAvailableNow
    ) {
      setBusinessAvailability(
        canonicalAvailableNow
      );
    }

    try {
      localStorage.setItem(
        "meetroDispatchReady",
        String(
          confirmedProfile.dispatch_ready ===
            true
        )
      );

      localStorage.setItem(
        "meetroServiceAreaNotes",
        confirmedProfile.service_area ||
          confirmedProfile.location ||
          ""
      );

      window.dispatchEvent(
        new Event(
          "meetroDispatchReadyChanged"
        )
      );
    } catch {
      // Legacy presentation mirrors are best-effort.
    }
  }

  async function loadAvailability() {
    setPhase("loading");
    setError("");
    setNotice("");

    try {
      const result = await authFetch(
        "/my-contractor-profile",
        {
          cache: "no-store",
        },
        setPage
      );

      const canonicalProfile =
        result?.data?.profile;

      if (!canonicalProfile?.id) {
        setPhase("error");
        setError(copy.failed);
        return;
      }

      projectConfirmedProfile(
        canonicalProfile
      );

      setPhase("ready");
    } catch {
      setPhase("error");
      setError(copy.failed);
    }
  }

  useEffect(() => {
    void loadAvailability();

    // Router callback is stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAvailability() {
    if (
      !profile?.id ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await authFetch(
        `/contractor-profiles/${profile.id}`,
        {
          method: "PUT",
          body: JSON.stringify(
            buildBusinessProfilePayloadFromCanonical(
              profile,
              {
                service_area:
                  String(
                    serviceArea || ""
                  ).trim(),
                available_now:
                  availableNow,
                dispatch_ready:
                  dispatchReady,
              }
            )
          ),
        },
        setPage
      );

      const confirmedProfile =
        getConfirmedBusinessProfile(
          result
        );

      if (!confirmedProfile) {
        setError(
          result?.data?.error ||
            result?.data?.message ||
            copy.saveFailed
        );
        return;
      }

      projectConfirmedProfile(
        confirmedProfile
      );

      setPhase("ready");
      setNotice(copy.saved);
    } catch {
      setError(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="app-page meetro-readable-page meetro-visual-page"
      style={page}
    >
      <BusinessToolsPageHeader
        title={copy.title}
        description={copy.description}
        categoryLabel={copy.category}
        onBack={() =>
          setPage(
            "businessCommandCenter"
          )
        }
      />

      <section
        className="meetro-visual-surface"
        style={card}
      >
        {phase === "loading" && (
          <p style={statusText}>
            {copy.loading}
          </p>
        )}

        {phase === "error" && (
          <div
            style={errorCard}
            role="alert"
          >
            <strong>
              {error || copy.failed}
            </strong>

            <button
              type="button"
              style={secondaryButton}
              onClick={loadAvailability}
            >
              {copy.retry}
            </button>
          </div>
        )}

        {phase === "ready" && (
          <>
            <div style={statusGrid}>
              <button
                type="button"
                style={{
                  ...statusButton,
                  ...(availableNow
                    ? activeStatusButton
                    : {}),
                }}
                onClick={() =>
                  setAvailableNow(
                    (current) =>
                      !current
                  )
                }
                disabled={saving}
              >
                <strong>
                  {copy.availableTitle}
                </strong>

                <span>
                  {availableNow
                    ? copy.on
                    : copy.off}
                </span>

                <small style={helpText}>
                  {copy.availableHelp}
                </small>
              </button>

              <button
                type="button"
                style={{
                  ...statusButton,
                  ...(dispatchReady
                    ? activeStatusButton
                    : {}),
                }}
                onClick={() =>
                  setDispatchReady(
                    (current) =>
                      !current
                  )
                }
                disabled={saving}
              >
                <strong>
                  {copy.directTitle}
                </strong>

                <span>
                  {dispatchReady
                    ? copy.on
                    : copy.off}
                </span>

                <small style={helpText}>
                  {copy.directHelp}
                </small>
              </button>
            </div>

            <div>
              <label style={fieldLabel}>
                {copy.serviceArea}
              </label>

              <p style={fieldHelp}>
                {copy.serviceAreaHelp}
              </p>

              <textarea
                style={textarea}
                value={serviceArea}
                onChange={(event) =>
                  setServiceArea(
                    event.target.value
                  )
                }
                placeholder={
                  copy.serviceAreaPlaceholder
                }
                disabled={saving}
              />
            </div>

            <button
              type="button"
              className="meetro-visual-primary-button"
              style={saveButton}
              onClick={saveAvailability}
              disabled={saving}
            >
              {saving
                ? copy.saving
                : copy.save}
            </button>

            {notice && (
              <p
                style={noticeText}
                role="status"
              >
                {notice}
              </p>
            )}

            {error && (
              <p
                style={errorText}
                role="alert"
              >
                {error}
              </p>
            )}
          </>
        )}
      </section>

      <BottomNav
        setPage={setPage}
        currentPage="businessDashboard"
      />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 20px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  background:
    "var(--meetro-surface-warm, #fbf6ed)",
  boxSizing: "border-box",
};

const card = {
  maxWidth: "900px",
  margin: "0 auto",
  padding:
    "clamp(18px, 4vw, 28px)",
  borderRadius: "24px",
  background:
    "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border:
    "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow:
    "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
  display: "grid",
  gap: "18px",
};

const statusGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "14px",
};

const statusButton = {
  minHeight: "132px",
  border:
    "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "18px",
  background:
    "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color:
    "var(--meetro-color-ink, #172317)",
  display: "grid",
  alignContent: "start",
  gap: "8px",
  padding: "16px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 900,
};

const activeStatusButton = {
  background:
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  borderColor:
    "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
};

const helpText = {
  fontWeight: 650,
  lineHeight: 1.4,
  opacity: 0.9,
};

const fieldLabel = {
  display: "block",
  color:
    "var(--meetro-color-forest-deep, #14351f)",
  fontWeight: 950,
};

const fieldHelp = {
  margin: "5px 0 10px",
  color:
    "var(--meetro-color-muted, #65705f)",
  lineHeight: 1.45,
};

const textarea = {
  width: "100%",
  minHeight: "110px",
  boxSizing: "border-box",
  border:
    "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "16px",
  padding: "14px",
  font: "inherit",
  resize: "vertical",
};

const saveButton = {
  border: "none",
  borderRadius: "16px",
  padding: "14px",
  background:
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "#ffffff",
  fontWeight: 1000,
  cursor: "pointer",
};

const secondaryButton = {
  border:
    "1px solid rgba(15,23,42,0.14)",
  borderRadius: "12px",
  padding: "10px 13px",
  background: "#ffffff",
  fontWeight: 850,
  cursor: "pointer",
};

const statusText = {
  margin: 0,
  color: "#55635b",
};

const errorCard = {
  display: "grid",
  gap: "12px",
  padding: "15px",
  borderRadius: "16px",
  background: "#fff7ed",
  color: "#9a3412",
};

const noticeText = {
  margin: 0,
  color: "#047857",
  fontWeight: 900,
};

const errorText = {
  margin: 0,
  color: "#b42318",
  fontWeight: 850,
};

export default BusinessAvailability;
