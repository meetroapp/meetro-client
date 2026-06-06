import BottomNav from "../components/BottomNav";
import { t } from "../utils/language";

function CompletedJobDetails({ setPage }) {
  const completedProject = JSON.parse(
    localStorage.getItem("lastCompletedProject") || "null"
  );

  const completedDate = completedProject?.completedAt
    ? new Date(completedProject.completedAt)
    : null;

  const service =
    completedProject?.title ||
    completedProject?.service ||
    localStorage.getItem("completedJobService") ||
    "Completed Job";

  const type =
    completedProject?.category ||
    completedProject?.source ||
    localStorage.getItem("completedJobType") ||
    "Project";

  const customer =
    completedProject?.homeownerName ||
    completedProject?.username ||
    localStorage.getItem("completedJobCustomer") ||
    t("homeowner");

  const location =
    completedProject?.location ||
    localStorage.getItem("completedJobLocation") ||
    "Cape Coral, FL";

  const date =
    completedDate?.toLocaleDateString() ||
    localStorage.getItem("completedJobDate") ||
    "Today";

  const time =
    completedDate?.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }) ||
    localStorage.getItem("completedJobTime") ||
    "";

  const rawAmount =
    completedProject?.revenue ||
    completedProject?.acceptedQuote?.amount ||
    localStorage.getItem("completedJobAmount") ||
    "0";

  const cleanAmount = Number(String(rawAmount).replace(/[^0-9.]/g, "")) || 0;
  const amount = `+$${cleanAmount}`;

  const rawMaterialCost =
    completedProject?.acceptedQuote?.materials ||
    localStorage.getItem("completedJobMaterialCost") ||
    "0";

  const materialCost = String(
    Math.max(Number(rawMaterialCost), 0)
  );

  const estimatedProfit =
    String(Math.max(cleanAmount - Number(materialCost || 0), 0));

  const rawCompletionNotes =
    completedProject?.acceptedQuote?.notes ||
    completedProject?.description ||
    localStorage.getItem("completedJobNotes") ||
    "Customer reported issue resolved and work completed successfully.";

  const completionNotes =
    String(rawCompletionNotes).toLowerCase().includes("after approval work starts")
      ? t("afterApprovalWorkStarts")
      : rawCompletionNotes;

  const businessName =
    completedProject?.selectedProfessional ||
    completedProject?.acceptedQuote?.businessName ||
    localStorage.getItem("businessName") ||
    "Business";

  const accountType = localStorage.getItem("accountType") || "homeowner";
  const activeMode = localStorage.getItem("activeAccountMode") || "personal";

  const completedJobViewMode =
    localStorage.getItem("completedJobViewMode") || "";

  const isHomeownerView =
    completedJobViewMode === "homeowner" ||
    (
      activeMode !== "business" &&
      accountType !== "professional"
    );

  return (
    <div style={page}>
      <style>
        {`
          @media print {

            html,body{
              margin:0 !important;
              padding:0 !important;
              height:auto !important;
            }

            button{
              display:none !important;
            }

            .bottom-nav,
            nav{
              display:none !important;
            }

            body{
              zoom:.82;
              overflow:hidden !important;
              background:white !important;
            }

            *{
              page-break-inside:avoid;
            }

            nav,
            [data-bottom-nav],
            .bottom-nav {
              display: none !important;
            }

            body {
              background: white !important;
            }
          }
        `}
      </style>
      <button
        style={backButton}
        onClick={() =>
          setPage(isHomeownerView ? "home" : "contractorDashboard")
        }
      >
        ← {isHomeownerView ? t("backHome") : t("backToWorkCenter")}
      </button>

      <div style={printHeader}>
        <strong>{isHomeownerView ? t("projectHistory") : businessName}</strong>
        <span>
          {isHomeownerView ? t("completedProjectRecord") : t("completedJobReport")}
        </span>
      </div>

      <div style={card}>
        <div style={topRow}>
          <div>
            <span style={typePill}>{type}</span>
            <h1 style={title}>{service}</h1>
            <p style={subtitle}>{customer}</p>
          </div>

          <div style={amountBox}>{amount}</div>
        </div>

        <div style={infoGrid}>
          <div style={infoBox}>
            <span>{t("location")}</span>
            <strong>{location}</strong>
          </div>

          <div style={infoBox}>
            <span>{t("date")}</span>
            <strong>{date}</strong>
          </div>

          <div style={infoBox}>
            <span>{t("time")}</span>
            <strong>{time}</strong>
          </div>

          <div style={infoBox}>
            <span>{t("status")}</span>
            <strong>✅ {t("completed")}</strong>
          </div>
        </div>

        <div style={detailsGrid}>

          <div style={section}>
            <h2>{t("jobNotes")}</h2>
            <p>{completionNotes}</p>
          </div>

          <div style={section}>
            <h2>{isHomeownerView ? t("projectSummary") : t("paymentSummary")}</h2>

            <div style={miniRow}>
              <span>{t("totalCharged")}</span>
              <strong>{amount}</strong>
            </div>

            <div style={miniRow}>
              <span>{t("materialCost")}</span>
              <strong>${materialCost}</strong>
            </div>

            <div style={miniRow}>
              <span>
                {isHomeownerView
                  ? t("estimatedProfit")
                  : "Payment Status"}
              </span>

              <strong>
                {isHomeownerView
                  ? `$${estimatedProfit}`
                  : completedProject?.paymentReceived === "yes"
                  ? "Paid"
                  : completedProject?.paymentReceived === "partial"
                  ? "Partial"
                  : "Pending"}
              </strong>
            </div>

          </div>

          <div style={section}>
            <h2>{t("photos")}</h2>

            <div style={photoNotice}>
              Photo attachments will appear here once before/after uploads are connected to the job record.
            </div>

          </div>

          <div style={section}>
            <h2>{isHomeownerView ? t("customerReview") : "Customer Feedback"}</h2>
            <p>
              {completedProject?.reviewSubmitted
                ? `⭐ ${t("yourReviewSubmitted")}`
                : isHomeownerView
                ? `⭐ ${t("reviewPending")}`
                : "Customer review pending"}
            </p>
          </div>

        </div>

        <div style={actionGrid}>
          {isHomeownerView ? (
            <>
              <button
                style={primaryButton}
                onClick={() => setPage("myRequests")}
              >
                {t("viewMyRequests")}
              </button>

              <button
                style={secondaryButton}
                onClick={() => setPage("messagesInbox")}
              >
                {t("messageProfessional")}
              </button>

              <button
                style={printButton}
                onClick={() => window.print()}
              >
                {t("printRecord")}
              </button>

              <button
                style={pdfButton}
                onClick={() => setPage("home")}
              >
                {t("backHome")}
              </button>
            </>
          ) : (
            <>
              <button
                style={primaryButton}
                onClick={() => {
                  localStorage.setItem("meetroWorkCenterTab", "completed");
                  setPage("contractorDashboard");
                }}
              >
                Back to Completed Work
              </button>

              <button
                style={secondaryButton}
                onClick={() => setPage("messagesInbox")}
              >
                Open Messages
              </button>

              <button
                style={printButton}
                onClick={() => window.print()}
              >
                {t("printRecord")}
              </button>

              {/* PDF export hidden until invoice PDF generation is production-ready. */}
            </>
          )}
        </div>
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
  position: "sticky",
  top: "14px",
  zIndex: 50,
  border: "none",
  background: "white",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "18px",
  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
};

const printHeader = {
  maxWidth: "850px",
  margin: "0 auto 14px",
  background: "white",
  borderRadius: "18px",
  padding: "14px 18px",
  boxShadow: "0 8px 20px rgba(15,23,42,.05)",
  display: "flex",
  justifyContent: "space-between",
  fontWeight: "900",
  color: "#111827",
};

const card = {
  maxWidth: "850px",
  margin: "0 auto",
  background: "white",
  borderRadius: "30px",
  padding: "24px",
  boxShadow: "0 18px 44px rgba(15,23,42,.08)",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "22px",
};

const typePill = {
  display: "inline-flex",
  background: "#eef2ff",
  color: "#5b3df5",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "900",
};

const title = {
  fontSize: "26px",
  margin: "10px 0 4px",
  lineHeight: 1.1,
  color: "#111827",
  fontWeight: "900",
};

const subtitle = {
  color: "#475569",
  fontWeight: "800",
};

const amountBox = {
  color: "#15803d",
  fontSize: "30px",
  fontWeight: "900",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: "12px",
};

const infoBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "#475569",
};


const detailsGrid={
display:"grid",
gridTemplateColumns:"repeat(2,1fr)",
gap:"14px",
marginTop:"22px",
};

const miniRow={
display:"flex",
justifyContent:"space-between",
padding:"10px 0",
borderBottom:"1px solid #e5e7eb",
fontWeight:"800",
};

const photoNotice = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#475569",
  borderRadius: "18px",
  padding: "22px",
  textAlign: "center",
  fontWeight: "800",
};

const photoGrid={
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"12px",
};

const photoBox={
height:"110px",
borderRadius:"16px",
background:"#e5e7eb",
display:"flex",
alignItems:"center",
justifyContent:"center",
fontWeight:"900",
};

const actionGrid={
display:"grid",
gridTemplateColumns:"repeat(4,1fr)",
gap:"12px",
marginTop:"20px",
};

const pdfButton={
border:"none",
borderRadius:"16px",
padding:"14px",
background:"#15803d",
color:"white",
fontWeight:"900",
cursor:"pointer",
};

const printButton={
border:"none",
borderRadius:"16px",
padding:"14px",
background:"#111827",
color:"white",
fontWeight:"900",
cursor:"pointer",
};

const primaryButton={
border:"none",
borderRadius:"16px",
padding:"14px",
background:"#5b3df5",
color:"white",
fontWeight:"900",
cursor:"pointer",
};

const secondaryButton={
border:"1px solid #e5e7eb",
borderRadius:"16px",
padding:"14px",
background:"white",
fontWeight:"900",
cursor:"pointer",
};

const section = {

  marginTop: "22px",
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "18px",
};

export default CompletedJobDetails;
