import { useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";
import { getActiveJobSnapshot } from "../utils/workCenter";

function InvoiceBuilder({ setPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();

  const language = getLanguage();

  const conversationId =
    localStorage.getItem("activeConversationId") || "general";

  const service =
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    localStorage.getItem("activeConversationName") ||
    "Service";

  const [workPerformed, setWorkPerformed] = useState(
    "Service completed as requested."
  );

  const [labor, setLabor] = useState("");

  const [materials, setMaterials] = useState("");

  const [serviceFee, setServiceFee] = useState("");

  const [discount, setDiscount] = useState("0");

  const [notes, setNotes] = useState("Thank you for choosing Meetro.");

  const total = useMemo(() => {
    return (
      Number(labor || 0) +
      Number(materials || 0) +
      Number(serviceFee || 0) -
      Number(discount || 0)
    );
  }, [labor, materials, serviceFee, discount]);

  function saveInvoice() {
    localStorage.setItem("activeInvoiceConversationId", conversationId);
    localStorage.setItem("activeInvoiceService", service);
    localStorage.setItem("activeInvoiceWorkPerformed", workPerformed);
    localStorage.setItem("activeInvoiceLabor", labor);
    localStorage.setItem("activeInvoiceMaterials", materials);
    localStorage.setItem("activeInvoiceFee", serviceFee);
    localStorage.setItem("activeInvoiceDiscount", discount);
    localStorage.setItem("activeInvoiceNotes", notes);
    localStorage.setItem("activeInvoiceTotal", String(total));
    localStorage.setItem("activeInvoiceStatus", "sent");
    localStorage.setItem("activeInvoiceSentAt", new Date().toISOString());

    localStorage.setItem("emergencyLaborCharge", labor);
    localStorage.setItem("emergencyMaterialCharge", materials);
    localStorage.setItem("emergencyServiceFee", serviceFee);

    const storageKey = `meetro_conversation_${conversationId}`;
    const existingMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");

    const invoiceMessage = {
      id: Date.now(),
      sender: "business",
      role: "business",
      type: "workflow_invoice_request",
      text:
        language === "es"
          ? `Factura enviada — Total: $${total}`
          : `Invoice sent — Total: $${total}`,
      title:
        language === "es"
          ? "Solicitud de pago"
          : "Payment Request",
      subtitle:
        language === "es"
          ? "Revisa los cargos y confirma el pago."
          : "Review charges and confirm payment.",
      requestId:
        localStorage.getItem("activeRequestId") ||
        conversationId,
      projectTitle: service,
      invoice: {
        service,
        workPerformed,
        labor,
        materials,
        serviceFee,
        discount,
        total,
        status: "payment_requested",
      },
      paymentStatus: "payment_requested",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      storageKey,
      JSON.stringify([...existingMessages, invoiceMessage])
    );

    localStorage.setItem(`meetro_conversation_read_${conversationId}`, "false");

    const registry = JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );

    const updatedRegistry = registry.map((item) =>
      String(item.id) === String(conversationId)
        ? {
            ...item,
            unread: true,
            project_description:
              language === "es"
                ? `🧾 Factura enviada — Total: $${total}`
                : `🧾 Invoice sent — Total: $${total}`,
            status: language === "es" ? "Factura enviada" : "Invoice sent",
            updatedAt: Date.now(),
          }
        : item
    );

    localStorage.setItem(
      "meetro_conversation_registry",
      JSON.stringify(updatedRegistry)
    );

    const unreadCount = updatedRegistry.filter(
      (item) => item.unread && !item.saved_to_history
    ).length;

    localStorage.setItem("mockUnreadMessages", String(unreadCount));

    window.dispatchEvent(new Event("meetroInvoiceUpdated"));
    window.dispatchEvent(new Event("meetro-messages-updated"));

    setPage("emergencyCompletionActions");
  }

  return (
    <div style={page}>
      <div style={card}>
        <button style={backBtn} onClick={() => setPage("conversationThread")}>
          ← {language === "es" ? "Volver al chat" : "Back to Chat"}
        </button>

        <div style={icon}>🧾</div>

        <h1 style={title}>
          {language === "es" ? "Crear factura" : "Create Invoice"}
        </h1>

        <p style={subtitle}>
          {language === "es"
            ? "Agrega cargos, notas y envía la factura al cliente."
            : "Add charges, notes, and send the invoice to the customer."}
        </p>

        <label style={label}>
          {language === "es" ? "Trabajo realizado" : "Work performed"}
        </label>

        <textarea
          style={textarea}
          value={workPerformed}
          onChange={(e) => setWorkPerformed(e.target.value)}
        />

        <div style={grid}>
          <Field
            label={language === "es" ? "Mano de obra" : "Labor"}
            value={labor}
            setValue={setLabor}
          />

          <Field
            label={language === "es" ? "Materiales" : "Materials"}
            value={materials}
            setValue={setMaterials}
          />

          <Field
            label={language === "es" ? "Tarifa" : "Service fee"}
            value={serviceFee}
            setValue={setServiceFee}
          />

          <Field
            label={language === "es" ? "Descuento" : "Discount"}
            value={discount}
            setValue={setDiscount}
          />
        </div>

        <label style={label}>{language === "es" ? "Notas" : "Notes"}</label>

        <textarea
          style={textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div style={totalBox}>
          <span>{language === "es" ? "Total" : "Total"}</span>
          <strong>${total}</strong>
        </div>

        <button style={sendBtn} onClick={saveInvoice}>
          📩 {language === "es" ? "Enviar factura" : "Send Invoice"}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="messages" />
    </div>
  );
}

function Field({ label, value, setValue }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={input}
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "24px 20px 120px",
  background: "linear-gradient(135deg,#f8fafc,#eef2ff)",
};

const card = {
  maxWidth: "520px",
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: "32px",
  padding: "24px",
  boxShadow: "0 20px 60px rgba(15,23,42,0.10)",
};

const backBtn = {
  border: "none",
  background: "#f5f3ff",
  color: "#5b3df5",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  marginBottom: "18px",
  cursor: "pointer",
};

const icon = {
  width: "74px",
  height: "74px",
  borderRadius: "24px",
  background: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "38px",
  margin: "0 auto 14px",
};

const title = {
  textAlign: "center",
  fontSize: "30px",
  fontWeight: "900",
  margin: "0 0 8px",
};

const subtitle = {
  textAlign: "center",
  color: "#475569",
  lineHeight: 1.5,
  marginBottom: "20px",
};

const label = {
  display: "block",
  fontWeight: "900",
  margin: "14px 0 8px",
};

const labelStyle = {
  display: "block",
  fontWeight: "900",
  marginBottom: "8px",
  fontSize: "13px",
};

const textarea = {
  width: "100%",
  minHeight: "86px",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: "700",
  fontSize: "16px",
  boxSizing: "border-box",
  resize: "vertical",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const input = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  fontSize: "16px",
  boxSizing: "border-box",
};

const totalBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "16px",
  margin: "18px 0",
  fontSize: "18px",
};

const sendBtn = {
  width: "100%",
  padding: "16px",
  border: "none",
  borderRadius: "18px",
  background: "#5b3df5",
  color: "#ffffff",
  fontWeight: "900",
  cursor: "pointer",
};

export default InvoiceBuilder;
