import { useState } from "react";
import BottomNav from "../components/BottomNav";

function CompletionSheet({ setPage }) {
  const savedJob = JSON.parse(
    localStorage.getItem("activeCompletionJob") || "{}"
  );

  const [materialCost, setMaterialCost] = useState("0");
  const [laborHours, setLaborHours] = useState("0");
  const [notes, setNotes] = useState("");
  const [paymentReceived, setPaymentReceived] = useState("yes");
  const [paymentType, setPaymentType] = useState("cash");

  const completionService =
    localStorage.getItem("completionService") ||
    savedJob.service ||
    "Scheduled Work";

  const completionLocation =
    localStorage.getItem("completionLocation") ||
    savedJob.location ||
    "Customer location";

  const completionScheduleId =
    localStorage.getItem("completionScheduleId") || "";

  const [jobAmount, setJobAmount] = useState(String(savedJob.amount || 0));

  const amount = Number(jobAmount || 0);
  const materials = Math.max(Number(materialCost || 0), 0);
  const estimatedProfit = Math.max(amount - materials, 0);

  function saveCompletion() {
    const completedRecord = {
      id: `completed-${Date.now()}`,
      title: completionService,
      service: completionService,
      customer: "Customer",
      location: completionLocation,
      revenue: amount,
      amount,
      materialCost: materials,
      laborHours,
      notes,
      paymentReceived,
      paymentType,
      estimatedProfit,
      completedAt: new Date().toISOString(),
      source: completionScheduleId ? "schedule" : "completion",
      scheduleId: completionScheduleId,
    };

    const previousCompletedProjects = JSON.parse(
      localStorage.getItem("completedProjects") || "[]"
    );

    localStorage.setItem(
      "completedProjects",
      JSON.stringify([completedRecord, ...previousCompletedProjects])
    );

    localStorage.setItem("completedJobType", completionScheduleId ? "Scheduled" : "Emergency");
    localStorage.setItem("completedJobService", completionService);
    localStorage.setItem("completedJobCustomer", "Customer");
    localStorage.setItem("completedJobLocation", completionLocation);
    localStorage.setItem("completedJobDate", new Date().toLocaleDateString());
    localStorage.setItem("completedJobTime", new Date().toLocaleTimeString());
    localStorage.setItem("completedJobAmount", `+$${amount}`);

    localStorage.setItem("completedJobMaterialCost", String(materials));
    localStorage.setItem("completedJobLaborHours", laborHours);
    localStorage.setItem("completedJobNotes", notes);
    localStorage.setItem("completedJobPaymentReceived", paymentReceived);
    localStorage.setItem("completedJobPaymentType", paymentType);
    localStorage.setItem("completedJobEstimatedProfit", String(estimatedProfit));

    const previousCompleted =
      Number(localStorage.getItem("completedJobsCount") || 0);

    const previousRevenue =
      Number(localStorage.getItem("totalJobRevenue") || 0);

    localStorage.setItem(
      "completedJobsCount",
      String(previousCompleted + 1)
    );

    localStorage.setItem(
      "totalJobRevenue",
      String(previousRevenue + amount)
    );

    if (completionScheduleId) {
      const schedule = JSON.parse(
        localStorage.getItem("meetro_business_schedule") || "[]"
      );

      const updatedSchedule = schedule.map((item) =>
        item.id === completionScheduleId
          ? {
              ...item,
              status: "Completed",
              amount,
              completedAt: new Date().toISOString(),
            }
          : item
      );

      localStorage.setItem(
        "meetro_business_schedule",
        JSON.stringify(updatedSchedule)
      );
    }

    localStorage.setItem("activeWorkStatus", "completed");
    localStorage.setItem("emergencyDispatchStatus","closed");

    localStorage.removeItem("activeJobStatus");
    localStorage.removeItem("activeCompletionJob");
    localStorage.removeItem("activeJobService");
    localStorage.removeItem("activeJobEta");
    localStorage.removeItem("selectedEmergencyService");
    localStorage.removeItem("completionService");
    localStorage.removeItem("completionLocation");
    localStorage.removeItem("completionSource");
    localStorage.removeItem("completionScheduleId");
    localStorage.removeItem("activeWorkService");
    localStorage.removeItem("activeWorkLocation");
    localStorage.removeItem("activeWorkScheduleId");

    localStorage.setItem("activeJobsCount","0");

    setPage("completedJobDetails");
  }

  return (
    <div style={page}>
      <button style={backButton} onClick={() => setPage("contractorDashboard")}>
        ← Back to Work Center
      </button>

      <div style={card}>
        <span style={eyebrow}>Completion Sheet</span>

        <h1 style={title}>{completionService}</h1>
        <p style={subtitle}>{completionLocation}</p>

        <div style={summaryRow}>
          <div style={summaryBox}>
            <span>Job Amount</span>
            <input
              value={jobAmount}
              onChange={(e) => setJobAmount(e.target.value.replace("-", ""))}
              style={miniAmountInput}
              type="number"
            />
          </div>

          <div style={summaryBox}>
            <span>Estimated Profit</span>
            <strong>${estimatedProfit}</strong>
          </div>
        </div>

        <div style={formGrid}>
          <label style={field}>
            <span>Material Cost</span>
            <input
              value={materialCost}
              onChange={(e) => setMaterialCost(e.target.value.replace("-", ""))}
              style={input}
              type="number"
            />
          </label>

          <label style={field}>
            <span>Labor Hours</span>
            <input
              value={laborHours}
              onChange={(e) => setLaborHours(e.target.value)}
              style={input}
              type="number"
            />
          </label>

          <label style={field}>
            <span>Payment Received</span>
            <select
              value={paymentReceived}
              onChange={(e) => setPaymentReceived(e.target.value)}
              style={input}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="partial">Partial</option>
            </select>
          </label>

          <label style={field}>
            <span>Payment Type</span>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              style={input}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="zelle">Zelle</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <label style={field}>
          <span>Completion Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={textarea}
            placeholder="Add work performed, materials used, or customer notes..."
          />
        </label>

        <div style={photoGrid}>
          <div style={photoBox}>Before Photo</div>
          <div style={photoBox}>After Photo</div>
        </div>

        <button style={saveButton} onClick={saveCompletion}>
          Save Completion Record
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
  padding: "24px 24px 220px",
  boxSizing: "border-box",
};

const backButton = {
  border: "none",
  background: "white",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "18px",
};

const card = {
  maxWidth: "860px",
  margin: "0 auto",
  background: "white",
  borderRadius: "30px",
  padding: "24px",
  boxShadow: "0 18px 44px rgba(15,23,42,.08)",
};

const eyebrow = {
  display: "inline-flex",
  background: "#eef2ff",
  color: "#5b3df5",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "900",
};

const title = {
  fontSize: "34px",
  margin: "14px 0 6px",
};

const subtitle = {
  color: "#64748b",
  fontWeight: "800",
};

const summaryRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  margin: "20px 0",
};

const summaryBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const field = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "14px",
  fontWeight: "900",
};

const miniAmountInput = {
  width: "100%",
  border: "none",
  background: "transparent",
  fontSize: "24px",
  fontWeight: "900",
  color: "#111827",
  outline: "none",
};

const input = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  fontSize: "16px",
};

const textarea = {
  ...input,
  minHeight: "110px",
};

const photoGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  margin: "16px 0",
};

const photoBox = {
  height: "120px",
  borderRadius: "18px",
  background: "#e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  color: "#64748b",
};

const saveButton = {
  width: "100%",
  border: "none",
  borderRadius: "18px",
  padding: "16px",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

export default CompletionSheet;
