import { useState } from "react";

function EmergencyComplete({ setPage, language = "en" }) {
  const selectedService =
    localStorage.getItem("selectedEmergencyService") || "Emergency Help";

  const [rating, setRating] = useState(5);
  const [saved, setSaved] = useState(false);

  const text = {
    en: {
      title: "Service Completed",
      subtitle: "Your emergency service request has been marked complete.",
      contractor: "Bgone Construction Cleanup",
      service: "Completed Service",
      ratingTitle: "Rate Your Experience",
      reviewPlaceholder: "Write a quick review...",
      save: "Save Contractor",
      saved: "Saved to Favorites",
      invoice: "Invoice / Payment",
      invoiceNote: "Payment and invoice details will be connected later.",
      home: "Back Home",
      emergency: "Emergency Services",
    },
    es: {
      title: "Servicio Completado",
      subtitle: "Tu solicitud de emergencia fue marcada como completada.",
      contractor: "Bgone Construction Cleanup",
      service: "Servicio Completado",
      ratingTitle: "Califica tu Experiencia",
      reviewPlaceholder: "Escribe una reseña rápida...",
      save: "Guardar Contratista",
      saved: "Guardado en Favoritos",
      invoice: "Factura / Pago",
      invoiceNote: "Los detalles de pago y factura se conectarán luego.",
      home: "Regresar al Inicio",
      emergency: "Servicios de Emergencia",
    },
  };

  const t = text[language] || text.en;

  return (
    <div style={page}>
      <div style={card}>
        <div style={successCircle}>✓</div>

        <h1 style={title}>{t.title}</h1>
        <p style={subtitle}>{t.subtitle}</p>

        <div style={summaryCard}>
          <div style={contractorTop}>
            <div style={avatar}>BC</div>

            <div>
              <strong style={contractorName}>{t.contractor}</strong>
              <p style={serviceText}>{selectedService}</p>
            </div>
          </div>

          <div style={divider}></div>

          <span style={label}>{t.service}</span>
          <strong style={completedService}>{selectedService}</strong>
        </div>

        <div style={reviewCard}>
          <h3 style={sectionTitle}>{t.ratingTitle}</h3>

          <div style={stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                style={star <= rating ? activeStar : starButton}
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            style={textarea}
            placeholder={t.reviewPlaceholder}
          />

          <button
            style={saved ? savedButton : saveButton}
            onClick={() => setSaved(true)}
          >
            {saved ? t.saved : t.save}
          </button>
        </div>

        <div style={invoiceCard}>
          <strong>{t.invoice}</strong>
          <span>{t.invoiceNote}</span>
        </div>

        <button style={primaryButton} onClick={() => setPage("home")}>
          {t.home}
        </button>

        <button style={darkButton} onClick={() => setPage("emergency")}>
          {t.emergency}
        </button>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "linear-gradient(160deg, #eef2ff 0%, #ffffff 50%, #f5f3ff 100%)",
  padding: "24px",
  boxSizing: "border-box",
};

const card = {
  maxWidth: "430px",
  margin: "0 auto",
  textAlign: "center",
};

const successCircle = {
  width: "88px",
  height: "88px",
  borderRadius: "30px",
  margin: "16px auto 22px",
  background: "#10b981",
  color: "white",
  fontSize: "46px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 18px 40px rgba(16,185,129,0.28)",
};

const title = {
  fontSize: "32px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "8px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
  lineHeight: "1.5",
  marginBottom: "22px",
};

const summaryCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  textAlign: "left",
  boxShadow: "0 16px 40px rgba(0,0,0,0.07)",
  marginBottom: "18px",
};

const contractorTop = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
};

const avatar = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background: "#5b3df5",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "18px",
};

const contractorName = {
  fontSize: "17px",
  color: "#111827",
};

const serviceText = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "14px",
};

const divider = {
  height: "1px",
  background: "#e5e7eb",
  margin: "18px 0",
};

const label = {
  display: "block",
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "800",
  marginBottom: "6px",
};

const completedService = {
  color: "#5b3df5",
  fontSize: "17px",
};

const reviewCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 16px 40px rgba(0,0,0,0.07)",
  marginBottom: "18px",
};

const sectionTitle = {
  margin: "0 0 14px",
  fontSize: "20px",
  fontWeight: "900",
  color: "#111827",
};

const stars = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  marginBottom: "16px",
};

const starButton = {
  border: "none",
  background: "#e5e7eb",
  color: "#9ca3af",
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
};

const activeStar = {
  border: "none",
  background: "#fef3c7",
  color: "#f59e0b",
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
};

const textarea = {
  width: "100%",
  minHeight: "92px",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "15px",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
  resize: "vertical",
  fontFamily: "inherit",
  marginBottom: "14px",
};

const saveButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const savedButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#10b981",
  color: "white",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const invoiceCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  display: "grid",
  gap: "6px",
  color: "#374151",
  boxShadow: "0 12px 32px rgba(0,0,0,0.05)",
  marginBottom: "18px",
  textAlign: "left",
};

const primaryButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "12px",
};

const darkButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
};

export default EmergencyComplete;
