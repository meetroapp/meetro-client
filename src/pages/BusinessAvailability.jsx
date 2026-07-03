import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage, t } from "../utils/language";
import {
  readBusinessAvailability,
  setBusinessAvailability,
} from "../utils/businessAvailability";

function BusinessAvailability({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const [availableNow, setAvailableNow] = useState(readBusinessAvailability());
  const [dispatchReady, setDispatchReady] = useState(
    localStorage.getItem("meetroDispatchReady") === "true"
  );
  const [serviceArea, setServiceArea] = useState(
    localStorage.getItem("meetroServiceAreaNotes") || ""
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const syncAvailability = () => {
      setAvailableNow(readBusinessAvailability());
      setDispatchReady(localStorage.getItem("meetroDispatchReady") === "true");
    };

    window.addEventListener("meetroAvailabilityChanged", syncAvailability);
    window.addEventListener("meetroDispatchReadyChanged", syncAvailability);
    window.addEventListener("storage", syncAvailability);

    return () => {
      window.removeEventListener("meetroAvailabilityChanged", syncAvailability);
      window.removeEventListener("meetroDispatchReadyChanged", syncAvailability);
      window.removeEventListener("storage", syncAvailability);
    };
  }, []);

  function toggleAvailableNow() {
    const nextValue = setBusinessAvailability(!availableNow);
    setAvailableNow(nextValue);
  }

  function toggleDispatchReady() {
    const nextValue = !dispatchReady;
    setDispatchReady(nextValue);
    localStorage.setItem("meetroDispatchReady", String(nextValue));
    window.dispatchEvent(new Event("meetroDispatchReadyChanged"));
  }

  function saveAvailability() {
    localStorage.setItem("meetroServiceAreaNotes", serviceArea);
    setNotice(
      isSpanish
        ? "Disponibilidad guardada."
        : "Availability saved."
    );
  }

  return (
    <div className="app-page meetro-readable-page" style={page}>
      <BusinessToolsPageHeader
        title={isSpanish ? "Disponibilidad" : "Availability"}
        description={
          isSpanish
            ? "Administra si estás disponible, listo para despacho y qué zonas atiendes."
            : "Manage whether you are available, dispatch-ready, and what service areas you cover."
        }
        categoryLabel={isSpanish ? "Operaciones" : "Business Operations"}
        onBack={() => setPage("businessCommandCenter")}
      />

      <section style={card}>
        <div style={statusGrid}>
          <button
            type="button"
            style={{
              ...statusButton,
              ...(availableNow ? activeStatusButton : {}),
            }}
            onClick={toggleAvailableNow}
          >
            <strong>{t("availableNow")}</strong>
            <span>{availableNow ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            style={{
              ...statusButton,
              ...(dispatchReady ? activeStatusButton : {}),
            }}
            onClick={toggleDispatchReady}
          >
            <strong>{t("dispatchReady")}</strong>
            <span>{dispatchReady ? "ON" : "OFF"}</span>
          </button>
        </div>

        <label style={fieldLabel}>
          {isSpanish ? "Zonas de servicio / notas" : "Service areas / notes"}
        </label>
        <textarea
          style={textarea}
          value={serviceArea}
          onChange={(event) => setServiceArea(event.target.value)}
          placeholder={
            isSpanish
              ? "Ej. Miami-Dade, Broward, emergencias hasta 20 millas."
              : "Ex. Miami-Dade, Broward, emergency calls up to 20 miles."
          }
        />

        <button type="button" style={saveButton} onClick={saveAvailability}>
          {isSpanish ? "Guardar disponibilidad" : "Save Availability"}
        </button>

        {notice && <p style={noticeText}>{notice}</p>}
      </section>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 20px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  background: "#f8fafc",
  boxSizing: "border-box",
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

const heroCard = {
  maxWidth: "900px",
  margin: "0 auto 14px",
  padding: "22px",
  borderRadius: "24px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 16px 34px rgba(15,23,42,0.06)",
};

const eyebrow = {
  margin: "0 0 8px",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: 1000,
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  color: "#0f172a",
  fontSize: "30px",
  fontWeight: 1000,
};

const subtitle = {
  margin: "8px 0 0",
  color: "#64748b",
  lineHeight: 1.45,
  fontWeight: 750,
};

const card = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "18px",
  borderRadius: "24px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 16px 34px rgba(15,23,42,0.06)",
  display: "grid",
  gap: "14px",
};

const statusGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "12px",
};

const statusButton = {
  minHeight: "92px",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  background: "#f8fafc",
  color: "#334155",
  display: "grid",
  gap: "8px",
  padding: "16px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 900,
};

const activeStatusButton = {
  background: "linear-gradient(135deg, #5b3df5, #7b61ff)",
  borderColor: "#5b3df5",
  color: "#ffffff",
};

const fieldLabel = {
  color: "#334155",
  fontWeight: 950,
};

const textarea = {
  width: "100%",
  minHeight: "120px",
  boxSizing: "border-box",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "14px",
  font: "inherit",
  resize: "vertical",
};

const saveButton = {
  border: "none",
  borderRadius: "16px",
  padding: "14px",
  background: "#5b3df5",
  color: "#ffffff",
  fontWeight: 1000,
  cursor: "pointer",
};

const noticeText = {
  margin: 0,
  color: "#047857",
  fontWeight: 900,
};

export default BusinessAvailability;
