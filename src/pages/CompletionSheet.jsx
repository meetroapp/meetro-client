import { useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import {
  getBusinessSchedule,
  saveBusinessSchedule,
  clearActiveJobSnapshot,
  getActiveJobSnapshot,
  getActiveWorkSnapshot,
  clearActiveWorkSnapshot,
} from "../utils/workCenter";
import { getLanguage, t } from "../utils/language";
import { buildCompletionRecord } from "../utils/completionClosureValidation";
import { getWorkCenterContextReturnLabel } from "../utils/workCenterReturnLabels";
import {
  CAMERA_PERMISSION_MESSAGE,
  createPhotoInputEvent,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker";
import { formatMessageTime } from "../utils/displayTime";
import { normalizePricingModel } from "../utils/pricingCalculations";
import { updateProjectLifecycleState } from "../utils/projectLifecycleSync";

function CompletionSheet({ setPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();
  const activeWorkSnapshot = getActiveWorkSnapshot();
  const completionSource = localStorage.getItem("completionSource") || "";
  const isEmergencyCompletion = completionSource === "emergency";
  const isWorkCenterCompletion = completionSource === "work_center_job";

  const activeEmergencyRecord = (() => {
    try {
      return JSON.parse(localStorage.getItem("activeEmergencyRecord") || "{}");
    } catch {
      return {};
    }
  })();

  const language = getLanguage();
  const isSpanish = language === "es";

  const savedJob = JSON.parse(localStorage.getItem("activeCompletionJob") || "{}");

  const completionService =
    localStorage.getItem("completionService") ||
    activeWorkSnapshot?.service ||
    localStorage.getItem("activeWorkService") ||
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    savedJob.service ||
    (isSpanish ? "Trabajo de servicio" : "Service Job");

  const completionLocation =
    localStorage.getItem("completionLocation") ||
    activeWorkSnapshot?.location ||
    localStorage.getItem("activeWorkLocation") ||
    activeJobSnapshot?.location ||
    localStorage.getItem("activeJobLocation") ||
    savedJob.location ||
    (isSpanish ? "Ubicación del cliente" : "Customer location");

  const completionCustomer =
    activeEmergencyRecord.customerName ||
    (completionSource === "work_center_job"
      ? localStorage.getItem("completionCustomer")
      : "") ||
    activeJobSnapshot?.customer ||
    localStorage.getItem("activeJobCustomer") ||
    localStorage.getItem("invoiceCustomerName") ||
    localStorage.getItem("activeConversationName") ||
    savedJob.customer ||
    savedJob.customerName ||
    (isSpanish ? "Cliente" : "Customer");

  const completionScheduleId = localStorage.getItem("completionScheduleId") || "";
  const conversationId =
    activeWorkSnapshot?.conversationId ||
    localStorage.getItem("activeWorkConversationId") ||
    localStorage.getItem("invoiceConversationId") ||
    localStorage.getItem("activeConversationId") ||
    "";
  const completionPhotoDraftKey = `meetroCompletionPhotoDraft:${
    completionScheduleId ||
    conversationId ||
    activeEmergencyRecord.id ||
    savedJob.id ||
    "standalone"
  }`;

  const [laborPricingType, setLaborPricingType] = useState(
    savedJob.laborPricingType || "flat_fee"
  );
  const [laborFee, setLaborFee] = useState(
    String(savedJob.laborFee ?? savedJob.laborTotal ?? savedJob.amount ?? "")
  );
  const [materials, setMaterials] = useState("0");
  const [laborHours, setLaborHours] = useState("0");
  const [laborRate, setLaborRate] = useState(String(savedJob.laborRate || ""));
  const [paymentReceived, setPaymentReceived] = useState("yes");
  const [paymentType, setPaymentType] = useState("cash");
  const [workSummary, setWorkSummary] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [completionPhotos, setCompletionPhotos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(completionPhotoDraftKey) || "[]");
    } catch {
      return [];
    }
  });
  const [completionPhotoError, setCompletionPhotoError] = useState("");
  const completionPhotoInputRef = useRef(null);

  const pricingModel = normalizePricingModel({
    laborPricingType,
    laborFee,
    laborHours,
    laborRate,
    materials,
    total: savedJob.amount,
  });
  const total = pricingModel.customerTotal;
  const materialCost = pricingModel.materialsTotal;

  function runAiAssist() {
    const summary = workSummary.trim();

    if (!summary) {
      setAiDraft(
        isSpanish
          ? "Describe el trabajo realizado para que Meetro pueda ayudarte a preparar un resumen profesional."
          : "Describe the work performed so Meetro can help prepare a professional summary."
      );
      return;
    }

    setAiDraft(
      isSpanish
        ? `Resumen sugerido: Se completó el trabajo solicitado: ${summary}. El área fue revisada y el servicio quedó listo para el cliente.`
        : `Suggested summary: Completed the requested work: ${summary}. The area was checked and the service was left ready for the customer.`
    );
  }

  function handleCompletionPhotos(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setCompletionPhotoError("");

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 700;
          const scale = Math.min(
            maxSize / image.width,
            maxSize / image.height,
            1
          );

          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);

          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.45);

          const photo = {
            id: `completion-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            type: "image/jpeg",
            dataUrl: compressedDataUrl,
            uploadedAt: new Date().toISOString(),
          };

          setCompletionPhotos((prev) => {
            const nextPhotos = [photo, ...prev].slice(0, 6);
            localStorage.setItem(completionPhotoDraftKey, JSON.stringify(nextPhotos));
            return nextPhotos;
          });
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  async function openCompletionPhotoPicker() {
    setCompletionPhotoError("");

    await openJobPhotoPicker({
      inputRef: completionPhotoInputRef,
      fileNamePrefix: "completion-photo",
      onPhotos: (photos) =>
        handleCompletionPhotos(createPhotoInputEvent(photos.map((photo) => photo.file))),
      onError: (message) =>
        setCompletionPhotoError(message || CAMERA_PERMISSION_MESSAGE),
    });
  }

  function saveCompletion() {
    const completedAt = new Date().toISOString();

    const finalNotes = workSummary || aiDraft || "";

    const baseCompletionRecord = {
      id: `completed-${Date.now()}`,
      emergencyRequestId: activeEmergencyRecord.id || "",
      title: completionService,
      service: completionService,
      customer: completionCustomer,
      customerName: completionCustomer,
      businessName: activeEmergencyRecord.businessName || "",
      location: completionLocation,
      revenue: total,
      amount: total,
      laborPricingType: pricingModel.laborPricingType,
      laborFee,
      laborRate,
      laborTotal: pricingModel.laborTotal,
      materialCost,
      materialsTotal: pricingModel.materialsTotal,
      laborHours,
      notes: finalNotes,
      paymentReceived,
      paymentType,
      photos: completionPhotos,
      completionPhotos,
      completedAt,
      source: isEmergencyCompletion
        ? "emergency"
        : completionScheduleId
        ? "schedule"
        : "completion",
      scheduleId: completionScheduleId,
      conversationId,
    };
    const completedRecord = buildCompletionRecord({
      job: {
        id: completionScheduleId || activeEmergencyRecord.id || savedJob.id || "",
        customer: completionCustomer,
        conversationId,
        schedule: {
          id: completionScheduleId,
          scheduleId: completionScheduleId,
          customerName: completionCustomer,
          conversationId,
        },
      },
      completion: {
        ...baseCompletionRecord,
        completionNotes: finalNotes,
        completionSummary: finalNotes,
      },
      completedAt,
    });
    const previousCompletedProjects = JSON.parse(
      localStorage.getItem("completedProjects") || "[]"
    );

    try {
      if (!isWorkCenterCompletion) {
        localStorage.setItem(
          "completedProjects",
          JSON.stringify([completedRecord, ...previousCompletedProjects])
        );
      }

      localStorage.setItem(
        "lastCompletedProject",
        JSON.stringify(completedRecord)
      );

      localStorage.setItem(
        "completedJobPhotos",
        JSON.stringify(completionPhotos)
      );
      localStorage.removeItem(completionPhotoDraftKey);
    } catch (error) {
      alert(
        isSpanish
          ? "Las fotos son demasiado grandes para guardar localmente. Intenta con una foto por ahora."
          : "The photos are too large to save locally. Try one photo for now."
      );
      return;
    }

    localStorage.setItem("completedJobType", completionScheduleId ? "Scheduled" : "Service");
    localStorage.setItem("completedJobService", completionService);
    localStorage.setItem("completedJobCustomer", completionCustomer);
    localStorage.setItem("completedJobLocation", completionLocation);
    localStorage.setItem("completedJobDate", new Date().toLocaleDateString());
    localStorage.setItem("completedJobTime", formatMessageTime(new Date()));
    localStorage.setItem("completedJobAmount", `+$${total}`);
    localStorage.setItem("completedJobLaborPricingType", pricingModel.laborPricingType);
    localStorage.setItem("completedJobLaborFee", laborFee);
    localStorage.setItem("completedJobLaborRate", laborRate);
    localStorage.setItem("completedJobLaborTotal", String(pricingModel.laborTotal));
    localStorage.setItem("completedJobMaterialCost", String(materialCost));
    localStorage.setItem("completedJobLaborHours", laborHours);
    localStorage.setItem("completedJobNotes", finalNotes);
    localStorage.setItem("completedJobPaymentReceived", paymentReceived);
    localStorage.setItem("completedJobPaymentType", paymentType);

    const previousCompleted = Number(localStorage.getItem("completedJobsCount") || 0);
    const previousRevenue = Number(localStorage.getItem("totalJobRevenue") || 0);

    if (!isWorkCenterCompletion) {
      localStorage.setItem("completedJobsCount", String(previousCompleted + 1));
      localStorage.setItem("totalJobRevenue", String(previousRevenue + total));
    }

    if (completionScheduleId) {
      const schedule = getBusinessSchedule();

      const updatedSchedule = schedule.map((item) =>
        item.id === completionScheduleId
          ? {
              ...item,
              status: "completed",
              workStatus: "completed",
              jobStage: "completed",
              workflowStatus: "completed",
              amount: total,
              laborPricingType: pricingModel.laborPricingType,
              laborFee,
              laborRate,
              laborTotal: pricingModel.laborTotal,
              materialCost,
              materialsTotal: pricingModel.materialsTotal,
              completedAt,
              completionNotes: finalNotes,
              completionSummary: finalNotes,
              completionPhotos,
              completionId: completedRecord.completionId,
              completionRecord: completedRecord,
            }
          : item
      );

      saveBusinessSchedule(updatedSchedule);
    }

    updateProjectLifecycleState(
      {
        ...completedRecord,
        requestId:
          completedRecord.requestId ||
          localStorage.getItem("activeRequestId") ||
          activeWorkSnapshot?.requestId ||
          savedJob.requestId ||
          "",
        scheduleId: completionScheduleId,
        conversationId,
      },
      "awaiting_customer_confirmation",
      {
        title: completionService,
        service: completionService,
        customerName: completionCustomer,
        customer: completionCustomer,
        location: completionLocation,
        amount: total,
        revenue: total,
        total,
        completionStatus: "awaiting_customer_confirmation",
        statusLabel: isSpanish
          ? "Esperando confirmación del cliente"
          : "Awaiting customer confirmation",
        lastMessage: isSpanish
          ? `Trabajo marcado como completado — Total: $${total}.`
          : `Job marked completed — Total: $${total}.`,
        completionRecord: completedRecord,
        completedAt,
        updatedAt: completedAt,
      }
    );

    if (conversationId) {
      const storageKey = `meetro_conversation_${conversationId}`;
      const existingMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");

      const invoiceMessage = {
        id: Date.now(),
        sender: "business",
        role: "business",
        type: "workflow_completion_closeout",
        text: isSpanish
          ? `Trabajo marcado como completado — Total: $${total}.`
          : `Job marked completed — Total: $${total}.`,
        title: isSpanish
          ? "Cierre del proyecto"
          : "Project Closeout",
        subtitle: isSpanish
          ? "Revisa el resumen final y confirma el cierre."
          : "Review the final summary and confirm closeout.",
        requestId:
          localStorage.getItem("activeRequestId") ||
          conversationId,
        projectTitle: completionService,
        completion: completedRecord,
        completionStatus: "awaiting_customer_confirmation",
        warrantyOffered: true,
        reviewRequested: true,
        time: formatMessageTime(new Date()),
        createdAt: completedAt,
      };

      localStorage.setItem(storageKey, JSON.stringify([...existingMessages, invoiceMessage]));
      localStorage.setItem(`meetro_conversation_saved_${conversationId}`, "true");
      localStorage.setItem(`meetro_conversation_read_${conversationId}`, "false");

      const registry = JSON.parse(
        localStorage.getItem("meetro_conversation_registry") || "[]"
      );
      const existingConversation = registry.find(
        (item) => String(item.id) === String(conversationId)
      );
      const completionConversation = {
        ...(existingConversation || {}),
        id: conversationId,
        project_title: completionService,
        project_description: t("completionRecordGenerated"),
        location: completionLocation,
        status: t("savedHistory"),
        unread: true,
        conversation_type:
          existingConversation?.conversation_type ||
          (isEmergencyCompletion ? "emergency" : "standard"),
        saved_to_history: true,
        archivedAt: completedAt,
        savedAt: completedAt,
      };

      localStorage.setItem(
        "meetro_conversation_registry",
        JSON.stringify([
          completionConversation,
          ...registry.filter(
            (item) => String(item.id) !== String(conversationId)
          ),
        ])
      );
      window.dispatchEvent(new Event("meetro-messages-updated"));
    }

    localStorage.setItem("activeWorkStatus", "completed");
    clearActiveWorkSnapshot();

    if (isEmergencyCompletion) {
      const archivedEmergencyRecord = {
        ...activeEmergencyRecord,
        status: "completed",
        completedAt,
        savedToHistory: true,
        archivedAt: completedAt,
        completionRecordId: completedRecord.id,
        total,
        laborPricingType: pricingModel.laborPricingType,
        laborFee,
        laborRate,
        laborTotal: pricingModel.laborTotal,
        materialCost,
        materialsTotal: pricingModel.materialsTotal,
        laborHours,
        paymentReceived,
        paymentType,
        notes: finalNotes,
        completionPhotos,
        updatedAt: completedAt,
      };

      if (archivedEmergencyRecord.id) {
        localStorage.setItem(
          `meetro_emergency_record_${archivedEmergencyRecord.id}`,
          JSON.stringify(archivedEmergencyRecord)
        );
      }

      if (conversationId) {
        localStorage.setItem(
          `meetro_conversation_saved_${conversationId}`,
          "true"
        );

        const registry = JSON.parse(
          localStorage.getItem("meetro_conversation_registry") || "[]"
        );
        const existingConversation = registry.find(
          (item) => String(item.id) === String(conversationId)
        );

        const archivedConversation = {
          ...(existingConversation || {}),
          id: conversationId,
          project_title: completionService,
          project_description: ` ${t("emergencyCompleted")}`,
          homeowner_email:
            activeEmergencyRecord.customerName ||
            (isSpanish ? "Cliente de emergencia" : "Emergency Customer"),
          location: completionLocation,
          status: t("savedHistory"),
          unread: true,
          conversation_type: "emergency",
          saved_to_history: true,
          archivedAt: completedAt,
          savedAt: completedAt,
        };

        localStorage.setItem(
          "meetro_conversation_registry",
          JSON.stringify([
            archivedConversation,
            ...registry.filter(
              (item) => String(item.id) !== String(conversationId)
            ),
          ])
        );
      }

      localStorage.setItem("emergencySavedToHistory", "true");
      localStorage.setItem("emergencyArchivedAt", completedAt);
      localStorage.setItem("emergencyDispatchStatus", "completed");
      localStorage.setItem("emergencyNeedsReview", "true");
      localStorage.removeItem("activeEmergencyRecord");
      localStorage.removeItem("activeEmergencyRequestId");
      localStorage.removeItem("emergencyRequestId");
      localStorage.removeItem("emergencyConversationId");
      localStorage.removeItem("businessAcceptedEmergency");

      if (
        localStorage.getItem("activeConversationId") === String(conversationId)
      ) {
        localStorage.removeItem("activeConversationId");
        localStorage.removeItem("activeConversationName");
        localStorage.removeItem("meetroConversationType");
      }

      clearActiveJobSnapshot();
    }

    [
      "activeJobStatus",
      "activeCompletionJob",
      "activeJobService",
      "activeJobEta",
      "selectedEmergencyService",
      "completionService",
      "completionLocation",
      "completionSource",
      "completionScheduleId",
      "activeWorkService",
      "activeWorkLocation",
      "activeWorkScheduleId",
    ].forEach((key) => localStorage.removeItem(key));

    localStorage.setItem("activeJobsCount", "0");
    localStorage.setItem("meetroWorkCenterTab", "completed");

    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
    window.dispatchEvent(new Event("meetro-messages-updated"));

    const isBusinessMode =
      localStorage.getItem("activeAccountMode") === "business";

    if (isBusinessMode) {
      localStorage.setItem("completedJobViewMode", "business");
      localStorage.setItem("meetroWorkCenterTab", "completed");
      localStorage.setItem("activeWorkCenterTab", "completed");
      setPage("contractorDashboard");
    } else if (isEmergencyCompletion) {
      setPage("emergencyComplete");
    } else {
      localStorage.setItem("completedJobViewMode", "homeowner");
      setPage("completedJobDetails");
    }
  }

  return (
    <div style={page}>
      <button
        style={backButton}
        onClick={() => {
          localStorage.setItem("meetroWorkCenterTab", "completed");
          localStorage.setItem("activeWorkCenterTab", "completed");
          setPage("contractorDashboard");
        }}
      >
        ←{" "}
        {isWorkCenterCompletion
          ? getWorkCenterContextReturnLabel({
              language,
              customerName:
                completionCustomer ||
                localStorage.getItem("workCenterReturnCustomer") ||
                "",
            })
          : t("backToWorkCenter")}
      </button>

      <div style={card}>
        <div style={header}>
          <span style={eyebrow}>
            {t("universalCloseout")}
          </span>

          <h1 style={title}>{completionService}</h1>
          <p style={subtitle}>{completionLocation}</p>
        </div>

        <section style={section}>
          <h2>{t("workSummary")}</h2>

          <textarea
            value={workSummary}
            onChange={(e) => setWorkSummary(e.target.value)}
            style={textarea}
            placeholder={t("workSummaryPlaceholder")}
          />

          <button style={aiButton} onClick={runAiAssist}>
             {t("aiAssistSummary")}
          </button>

          {aiDraft && (
            <div style={aiBox}>
              <strong>
                {t("aiSuggestedSummary")}
              </strong>

              <p>{aiDraft}</p>

              <div style={aiActionRow}>
                <button
                  style={aiSmallButton}
                  onClick={() => setWorkSummary(aiDraft)}
                >
                  {t("useSuggestion")}
                </button>

                <button
                  style={aiSmallButton}
                  onClick={() =>
                    setWorkSummary(
                      workSummary
                        ? `${workSummary}\n\n${aiDraft}`
                        : aiDraft
                    )
                  }
                >
                  {t("addToMyNotes")}
                </button>

                <button
                  style={aiGhostButton}
                  onClick={() => setAiDraft("")}
                >
                  {t("keepOriginal")}
                </button>
              </div>
            </div>
          )}
        </section>

        <section style={section}>
          <h2>{t("charges")}</h2>

          <div style={formGrid}>
            <label style={field}>
              <span>{isSpanish ? "Tipo de mano de obra" : "Labor Type"}</span>
              <select
                value={laborPricingType}
                onChange={(e) => setLaborPricingType(e.target.value)}
                style={input}
              >
                <option value="flat_fee">{isSpanish ? "Tarifa fija" : "Flat Fee"}</option>
                <option value="hourly">{isSpanish ? "Por hora" : "Hourly"}</option>
              </select>
            </label>

            {laborPricingType === "hourly" ? (
              <>
                <label style={field}>
                  <span>{t("laborHours")}</span>
                  <input
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    style={input}
                    type="number"
                  />
                </label>

                <label style={field}>
                  <span>{isSpanish ? "Tarifa por hora" : "Labor Rate"}</span>
                  <input
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value.replace("-", ""))}
                    style={input}
                    type="number"
                    placeholder="0"
                  />
                </label>
              </>
            ) : (
              <label style={field}>
                <span>{isSpanish ? "Tarifa de mano de obra" : "Labor Fee"}</span>
                <input
                  value={laborFee}
                  onChange={(e) => setLaborFee(e.target.value.replace("-", ""))}
                  style={input}
                  type="number"
                  placeholder="0"
                />
              </label>
            )}

            <label style={field}>
              <span>{isSpanish ? "Total del cliente" : "Customer Total"}</span>
              <input
                value={total.toFixed(2)}
                style={input}
                type="text"
                readOnly
              />
            </label>

            <label style={field}>
              <span>{t("materials")}</span>
              <input
                value={materials}
                onChange={(e) => setMaterials(e.target.value.replace("-", ""))}
                style={input}
                type="number"
              />
            </label>

            <label style={field}>
              <span>{t("paymentReceived")}</span>
              <select
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.value)}
                style={input}
              >
                <option value="yes">{t("yes")}</option>
                <option value="no">{t("no")}</option>
                <option value="partial">{t("partial")}</option>
              </select>
            </label>

            <label style={field}>
              <span>{t("paymentMethod")}</span>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                style={input}
              >
                <option value="cash">{t("cash")}</option>
                <option value="card">{t("cardPayment")}</option>
                <option value="zelle">Zelle</option>
                <option value="other">{t("other")}</option>
              </select>
            </label>
          </div>
        </section>

        <section style={section}>
          <h2>{t("photosAndFiles")}</h2>

          <input
            ref={completionPhotoInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleCompletionPhotos}
          />

          <div style={photoNotice}>
            <strong>
              {t("addCompletionPhotos")}
            </strong>

            <p>
              {t("completionPhotosHelp")}
            </p>

            <button
              type="button"
              style={photoUploadButton}
              onClick={openCompletionPhotoPicker}
            >
               {t("addPhotos")}
            </button>
            {completionPhotoError && (
              <p style={photoErrorText}>{completionPhotoError}</p>
            )}
          </div>

          {completionPhotos.length > 0 && (
            <div style={photoPreviewGrid}>
              {completionPhotos.map((photo) => (
                <div key={photo.id} style={photoPreviewCard}>
                  <img src={photo.dataUrl} alt="" style={photoPreviewImage} />

                  <button
                    type="button"
                    style={removePhotoButton}
                    onClick={() => {
                      setCompletionPhotos((prev) => {
                        const nextPhotos = prev.filter((item) => item.id !== photo.id);
                        localStorage.setItem(completionPhotoDraftKey, JSON.stringify(nextPhotos));
                        return nextPhotos;
                      });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={actionGrid}>
          <button style={saveButton} onClick={saveCompletion}>
             {t("saveCompletionRecord")}
          </button>

          {conversationId && (
            <button
              style={secondaryButton}
              onClick={() => {
                localStorage.setItem("activeConversationId", conversationId);
                setPage("conversationThread");
              }}
            >
               {t("backToChat")}
            </button>
          )}
        </div>
      </div>

      <BottomNav setPage={setPage} currentPage="contractorDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
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

const header = {
  marginBottom: "18px",
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
  color: "#475569",
  fontWeight: "800",
};

const section = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  marginBottom: "16px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const field = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "14px",
  fontWeight: "900",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  fontSize: "16px",
  background: "white",
};

const textarea = {
  ...input,
  width: "100%",
  minHeight: "120px",
  fontSize: "16px",
  boxSizing: "border-box",
};

const aiButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "16px",
  padding: "12px 14px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "10px",
};

const aiActionRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
};

const aiSmallButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "12px",
  padding: "9px 11px",
  fontWeight: "900",
  cursor: "pointer",
};

const aiGhostButton = {
  ...aiSmallButton,
  background: "#eef2ff",
  color: "#5b3df5",
};

const aiBox = {
  background: "white",
  border: "1px solid #ddd6fe",
  color: "#312e81",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "800",
  lineHeight: 1.5,
  marginTop: "12px",
};

const photoNotice = {
  background: "white",
  border: "1px dashed #cbd5e1",
  color: "#475569",
  borderRadius: "18px",
  padding: "22px",
  textAlign: "center",
  fontWeight: "800",
};

const photoUploadButton = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "14px",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
  marginTop: "12px",
};

const photoErrorText = {
  margin: "10px 0 0",
  color: "#991b1b",
  fontSize: "13px",
  fontWeight: "850",
};

const photoPreviewGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "12px",
};

const photoPreviewCard = {
  position: "relative",
  borderRadius: "16px",
  overflow: "hidden",
  background: "#e2e8f0",
  border: "1px solid #e5e7eb",
};

const photoPreviewImage = {
  width: "100%",
  height: "120px",
  objectFit: "cover",
  display: "block",
};

const removePhotoButton = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "28px",
  height: "28px",
  border: "none",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.82)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const actionGrid = {
  display: "grid",
  gap: "10px",
};

const saveButton = {
  width: "100%",
  border: "none",
  borderRadius: "18px",
  padding: "16px",
  background: "#111827",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

const secondaryButton = {
  ...saveButton,
  background: "#eef2ff",
  color: "#5b3df5",
};

export default CompletionSheet;
