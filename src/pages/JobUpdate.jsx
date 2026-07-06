import { useState } from "react";
import BottomNav from "../components/BottomNav";
import FloatingBackButton from "../components/FloatingBackButton";
import { getActiveJobSnapshot } from "../utils/workCenter";

function JobUpdate({ setPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();

  const returnPage = localStorage.getItem("returnPage") || "contractorDashboard";

  const jobName =
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    "Active Job";

  const customer =
    activeJobSnapshot?.customer ||
    localStorage.getItem("activeJobCustomer") ||
    "Customer";

  const [status, setStatus] = useState("Work update");
  const [note, setNote] = useState("");

  function saveUpdate() {
    const updates = JSON.parse(localStorage.getItem("jobUpdates") || "[]");

    updates.unshift({
      id: Date.now(),
      jobName,
      customer,
      status,
      note,
      createdAt: new Date().toISOString(),
    });

    localStorage.setItem("jobUpdates", JSON.stringify(updates));
    localStorage.setItem("lastJobUpdate", note || status);

    window.dispatchEvent(new Event("meetroJobUpdated"));

    setPage(returnPage);
  }

  return (
    <div style={page}>
      <FloatingBackButton onClick={() => setPage(returnPage)} />

      <div style={card}>
        <div style={icon}></div>

        <h1 style={title}>Send Job Update</h1>
        <p style={subtitle}>
          Send a clear progress update to the customer.
        </p>

        <div style={jobBox}>
          <strong>{jobName}</strong>
          <span>{customer}</span>
        </div>

        <label style={label}>Quick Update</label>

        <div style={quickChipGrid}>
          <button
            style={status === "Running late" ? quickChipActive : quickChip}
            onClick={() => {
              setStatus("Running late");
              setNote("I’m running a little behind schedule and will update you again shortly.");
            }}
          >
             Running late
          </button>

          <button
            style={status === "On the way" ? quickChipActive : quickChip}
            onClick={() => {
              setStatus("On the way");
              setNote("I’m on the way to your location now.");
            }}
          >
             On the way
          </button>

          <button
            style={status === "Arrived" ? quickChipActive : quickChip}
            onClick={() => {
              setStatus("Arrived");
              setNote("I have arrived at the job location.");
            }}
          >
             Arrived
          </button>

          <button
            style={status === "Work started" ? quickChipActive : quickChip}
            onClick={() => {
              setStatus("Work started");
              setNote("Work has started. I’ll keep you updated as progress continues.");
            }}
          >
             Work started
          </button>

          <button
            style={status === "Need approval" ? quickChipActive : quickChip}
            onClick={() => {
              setStatus("Need approval");
              setNote("I need your approval before continuing with the next step.");
            }}
          >
             Need approval
          </button>

          <button
            style={status === "Work completed" ? quickChipActive : quickChip}
            onClick={() => {
              setStatus("Work completed");
              setNote("The work has been completed. Please review when you have a chance.");
            }}
          >
             Completed
          </button>
        </div>

        <label style={label}>Message</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: I started the repair and will send photos shortly..."
          style={textarea}
        />

        <p style={notifyText}>
          The customer will receive this progress update.
        </p>

        <button style={primaryButton} onClick={saveUpdate}>
          Send Update
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, var(--meetro-surface-sage, #eef4ea) 100%)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 28px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const card = {
  maxWidth: "520px",
  margin: "70px auto 0",
  background: "white",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
};

const icon = {
  width: "70px",
  height: "70px",
  borderRadius: "24px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  margin: "0 auto 14px",
};

const title = {
  textAlign: "center",
  fontSize: "30px",
  fontWeight: "900",
  margin: "0 0 8px",
  color: "#111827",
};

const subtitle = {
  textAlign: "center",
  color: "#667085",
  fontWeight: "700",
  marginBottom: "18px",
};

const jobBox = {
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: "18px",
};

const label = {
  display: "block",
  fontWeight: "900",
  marginBottom: "8px",
};

const input = {
  width: "100%",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  marginBottom: "16px",
  fontWeight: "800",
  fontSize: "16px",
  boxSizing: "border-box",
};


const quickChipGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "16px",
};

const quickChip = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: "14px",
  padding: "11px",
  fontWeight: "900",
  cursor: "pointer",
};


const quickChipActive = {
  border: "1px solid var(--meetro-color-forest, #1f4d34)",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "14px",
  padding: "11px",
  fontWeight: "900",
  cursor: "pointer",
};


const notifyText = {
  textAlign: "center",
  color: "#667085",
  fontSize: "13px",
  fontWeight: "800",
  margin: "0 0 14px",
};


const textarea = {
  width: "100%",
  minHeight: "140px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  marginBottom: "18px",
  fontWeight: "700",
  fontSize: "16px",
  boxSizing: "border-box",
};

const primaryButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

export default JobUpdate;
