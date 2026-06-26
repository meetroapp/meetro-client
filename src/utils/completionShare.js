import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { jsPDF } from "jspdf";
import { t } from "./language";

function createCompletionRecordPdf(record = {}) {
  const doc = new jsPDF();
  const service = record.service || record.title || t("completedProject");
  const amount = Number(record.amount || record.revenue || 0);
  const completedAt = record.completedAt
    ? new Date(record.completedAt).toLocaleString()
    : "";

  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text(t("completedProjectRecord"), 14, 22);

  doc.setFontSize(14);
  doc.text(service, 14, 36);

  doc.setFont(undefined, "normal");
  doc.setFontSize(11);
  doc.text(`${t("location")}: ${record.location || ""}`, 14, 50);
  doc.text(`${t("date")}: ${completedAt}`, 14, 59);
  doc.text(`${t("totalCharged")}: $${amount.toFixed(2)}`, 14, 68);
  doc.text(
    `${t("paymentSummary")}: ${record.paymentReceived || ""}`,
    14,
    77
  );

  if (record.notes) {
    doc.setFont(undefined, "bold");
    doc.text(t("jobNotes"), 14, 94);
    doc.setFont(undefined, "normal");
    doc.text(doc.splitTextToSize(String(record.notes), 180), 14, 103);
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Meetro Community", 105, 286, { align: "center" });

  return { doc, service };
}

function isShareCancellation(error) {
  return (
    error?.name === "AbortError" ||
    String(error?.message || "").toLowerCase().includes("cancel")
  );
}

export async function shareCompletionRecord(record = {}, options = {}) {
  const { doc, service } = createCompletionRecordPdf(record);
  const fileName = `completed-record-${service}.pdf`.replace(
    /[^a-z0-9-_.]/gi,
    "_"
  );
  const title = `${t("completedProjectRecord")} - ${service}`;

  try {
    const base64Data = doc.output("datauristring").split(",")[1];
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title,
      text: t("completedProjectSaved"),
      url: savedFile.uri,
      dialogTitle: t("shareRecord"),
    });
    return;
  } catch (nativeError) {
    if (isShareCancellation(nativeError)) return;
  }

  try {
    const pdfFile = new File([doc.output("blob")], fileName, {
      type: "application/pdf",
    });

    if (navigator.canShare?.({ files: [pdfFile] })) {
      await navigator.share({
        title,
        text: t("completedProjectSaved"),
        files: [pdfFile],
      });
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title,
        text: t("completedProjectSaved"),
      });
      return;
    }
  } catch (browserError) {
    if (isShareCancellation(browserError)) return;
  }

  if (options.fallbackToPrint) {
    window.print();
  } else {
    doc.save(fileName);
  }
}
