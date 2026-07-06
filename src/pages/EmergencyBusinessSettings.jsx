import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";

function EmergencyBusinessSettings({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());

  const [enabled, setEnabled] = useState(
    localStorage.getItem("meetroDispatchReady") === "true"
  );
  const [dispatchFee, setDispatchFee] = useState(
    localStorage.getItem("businessEmergencyDispatchFee") || "35"
  );
  const [cancelFee, setCancelFee] = useState(
    localStorage.getItem("businessEmergencyCancelFee") || "25"
  );
  const [eta, setEta] = useState(
    localStorage.getItem("businessEmergencyEta") || "12"
  );
  const [businessPhone, setBusinessPhone] = useState(
    localStorage.getItem("businessPhone") ||
      localStorage.getItem("contractorPhone") ||
      ""
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    localStorage.getItem("businessEmergencyPhone") ||
      localStorage.getItem("businessPhone") ||
      ""
  );
  const [radius, setRadius] = useState(
    localStorage.getItem("businessEmergencyRadius") || "10"
  );
  const [terms, setTerms] = useState(
    localStorage.getItem("businessEmergencyTerms") ||
      "Emergency service may begin after the business accepts the request. Cancellation after dispatch will charge the listed cancellation fee."
  );

  useEffect(() => {
    const sync = () => setLanguage(getLanguage());

    window.addEventListener("languageChanged", sync);
    window.addEventListener("meetro-language-change", sync);
    window.addEventListener("meetroLanguageChanged", sync);

    return () => {
      window.removeEventListener("languageChanged", sync);
      window.removeEventListener("meetro-language-change", sync);
      window.removeEventListener("meetroLanguageChanged", sync);
    };
  }, []);

  const t = {
    en: {
      title: "Emergency Settings",
      subtitle: "Control your dispatch fees, availability, and emergency service rules.",
      available: "Emergency Dispatch Available",
      dispatchFee: "Dispatch Fee",
      cancelFee: "Cancellation Fee After Dispatch",
      eta: "Estimated Response Time",
      businessPhone: "Main Business Phone",
      emergencyPhone: "Emergency Dispatch Phone",
      radius: "Service Radius",
      terms: "Emergency Service Terms",
      save: "Save Emergency Settings",
      back: "Back to Dashboard",
      saved: "Emergency settings saved.",
      minutes: "minutes",
      miles: "miles",
    },
    es: {
      title: "Configuración de Emergencias",
      subtitle: "Controla tus tarifas, disponibilidad y reglas de servicio de emergencia.",
      available: "Despacho de Emergencia Disponible",
      dispatchFee: "Tarifa de Despacho",
      cancelFee: "Tarifa de Cancelación Después del Despacho",
      eta: "Tiempo Estimado de Respuesta",
      businessPhone: "Teléfono Principal del Negocio",
      emergencyPhone: "Teléfono de Despacho de Emergencia",
      radius: "Radio de Servicio",
      terms: "Reglas del Servicio de Emergencia",
      save: "Guardar Configuración",
      back: "Regresar al Dashboard",
      saved: "Configuración de emergencia guardada.",
      minutes: "minutos",
      miles: "millas",
    },
  }[language] || {};

  function saveSettings() {
    localStorage.setItem("meetroDispatchReady", enabled ? "true" : "false");
    localStorage.setItem("businessEmergencyDispatchFee", dispatchFee);
    localStorage.setItem("businessEmergencyCancelFee", cancelFee);
    localStorage.setItem("businessEmergencyEta", eta);
    localStorage.setItem("businessPhone", businessPhone);
    localStorage.setItem("contractorPhone", businessPhone);
    localStorage.setItem("businessEmergencyPhone", emergencyPhone || businessPhone);
    localStorage.setItem("businessEmergencyRadius", radius);
    localStorage.setItem("businessEmergencyTerms", terms);

    window.dispatchEvent(new Event("meetroAvailabilityChanged"));

    alert(t.saved);
  }

  return (
    <div className="app-page meetro-form-page" style={page}>
      <div style={container}>
        <button style={backButton} onClick={() => setPage("businessDashboard")}>
          ←
        </button>

        <div style={heroCard}>
          <div style={heroIcon}>SOS</div>
          <h1 style={title}>{t.title}</h1>
          <p style={subtitle}>{t.subtitle}</p>
        </div>

        <div style={settingsCard}>
          <label style={toggleRow}>
            <div>
              <strong>{t.available}</strong>
              <p style={smallText}>
                {enabled ? "Active for emergency requests" : "Hidden from emergency requests"}
              </p>
            </div>

            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={checkbox}
            />
          </label>

          <InputRow label={t.dispatchFee} prefix="$" value={dispatchFee} onChange={setDispatchFee} />
          <InputRow label={t.cancelFee} prefix="$" value={cancelFee} onChange={setCancelFee} />
          <InputRow label={t.eta} suffix={t.minutes} value={eta} onChange={setEta} />
          <InputRow label={t.businessPhone} value={businessPhone} onChange={setBusinessPhone} />
          <InputRow label={t.emergencyPhone} value={emergencyPhone} onChange={setEmergencyPhone} />
          <InputRow label={t.radius} suffix={t.miles} value={radius} onChange={setRadius} />

          <label style={fieldWrap}>
            <span style={fieldLabel}>{t.terms}</span>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              style={textarea}
            />
          </label>

          <button style={saveButton} onClick={saveSettings}>
            {t.save}
          </button>
        </div>

        <button style={darkButton} onClick={() => setPage("businessDashboard")}>
          {t.back}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function InputRow({ label, value, onChange, prefix, suffix }) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <div style={inputShell}>
        {prefix && <span style={inputAddon}>{prefix}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={input}
        />
        {suffix && <span style={inputAddon}>{suffix}</span>}
      </div>
    </label>
  );
}

const page = {
  minHeight: "100dvh",
  background: "linear-gradient(180deg, #fff1f2 0%, #ffffff 55%, var(--meetro-surface-sage, #eef4ea) 100%)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const container = {
  maxWidth: "460px",
  margin: "0 auto",
};

const backButton = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  border: "none",
  background: "white",
  fontSize: "24px",
  fontWeight: "900",
  marginBottom: "18px",
  boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const heroCard = {
  background: "white",
  borderRadius: "30px",
  padding: "28px",
  textAlign: "center",
  boxShadow: "0 18px 44px rgba(239,68,68,0.12)",
  marginBottom: "18px",
};

const heroIcon = {
  width: "78px",
  height: "78px",
  borderRadius: "28px",
  background: "#ef4444",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "36px",
  margin: "0 auto 18px",
};

const title = {
  fontSize: "32px",
  fontWeight: "900",
  margin: "0 0 8px",
  color: "#111827",
};

const subtitle = {
  color: "#667085",
  lineHeight: 1.5,
  margin: 0,
};

const settingsCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
  marginBottom: "16px",
};

const toggleRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "16px",
  marginBottom: "16px",
};

const smallText = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "13px",
  fontWeight: "700",
};

const checkbox = {
  width: "26px",
  height: "26px",
};

const fieldWrap = {
  display: "block",
  marginBottom: "16px",
};

const fieldLabel = {
  display: "block",
  fontSize: "13px",
  fontWeight: "900",
  color: "#374151",
  marginBottom: "8px",
};

const inputShell = {
  display: "flex",
  alignItems: "center",
  background: "#f8fafc",
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
};

const inputAddon = {
  padding: "0 14px",
  fontWeight: "900",
  color: "#667085",
};

const input = {
  flex: 1,
  border: "none",
  background: "transparent",
  padding: "15px 12px",
  fontSize: "16px",
  fontWeight: "900",
  outline: "none",
};

const textarea = {
  width: "100%",
  minHeight: "120px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "14px",
  fontSize: "16px",
  fontWeight: "700",
  lineHeight: 1.5,
  outline: "none",
  boxSizing: "border-box",
};

const saveButton = {
  width: "100%",
  padding: "17px",
  borderRadius: "18px",
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const darkButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

export default EmergencyBusinessSettings;
