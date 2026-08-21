import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function cancelled(error) {
  return error?.name === "AbortError" || String(error?.message || "").toLowerCase().includes("cancel");
}

function artifactTitle(artifact) {
  return String(artifact?.fileName || "Customer document.pdf").replace(/\.pdf$/i, "").replaceAll("-", " ");
}

async function blobBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return globalThis.btoa(binary);
}

async function nativeShareArtifact(artifact, {
  nativeFilesystem = Filesystem,
  nativeShare = Share,
} = {}) {
  const path = `meetro-customer-documents/${artifact.fileName}`;
  await nativeFilesystem.writeFile({
    path,
    data: await blobBase64(artifact.blob),
    directory: Directory.Cache,
    recursive: true,
  });
  const { uri } = await nativeFilesystem.getUri({ path, directory: Directory.Cache });
  try {
    await nativeShare.share({
      title: artifactTitle(artifact),
      text: "Customer document prepared by Meetro.",
      files: [uri],
      dialogTitle: "Share customer document",
    });
  } finally {
    await nativeFilesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {});
  }
}

export async function shareBusinessDocumentPdfArtifact({
  artifact,
  message = "Customer document prepared by Meetro.",
  isNative = Capacitor.isNativePlatform(),
  platform = Capacitor.getPlatform(),
  nativeShareArtifactImpl = nativeShareArtifact,
  navigatorObject = globalThis.navigator,
} = {}) {
  if (!(artifact?.blob instanceof Blob) || artifact.contentType !== "application/pdf" || !artifact.fileName) {
    return Object.freeze({ ok: false, method: "unavailable" });
  }
  try {
    if (isNative && ["ios", "android"].includes(platform)) {
      await nativeShareArtifactImpl(artifact);
      return Object.freeze({ ok: true, method: "native-pdf", fileName: artifact.fileName });
    }
    const file = typeof File === "function"
      ? new File([artifact.blob], artifact.fileName, { type: "application/pdf" })
      : Object.assign(artifact.blob, { name: artifact.fileName });
    const canShareFile = typeof navigatorObject?.share === "function" &&
      typeof navigatorObject?.canShare === "function" &&
      navigatorObject.canShare({ files: [file] });
    if (canShareFile) {
      await navigatorObject.share({ title: artifactTitle(artifact), text: message, files: [file] });
      return Object.freeze({ ok: true, method: "web-pdf", fileName: artifact.fileName });
    }
  } catch (error) {
    if (cancelled(error)) return Object.freeze({ ok: false, method: "cancelled" });
    return Object.freeze({ ok: false, method: "fallback", error: "The system share sheet could not be opened." });
  }
  return Object.freeze({ ok: false, method: "fallback" });
}

export function previewBusinessDocumentPdfArtifact(artifact, {
  urlObject = globalThis.URL,
  openWindow = globalThis.open,
  scheduleRevoke = globalThis.setTimeout,
} = {}) {
  if (!(artifact?.blob instanceof Blob) || typeof urlObject?.createObjectURL !== "function" || typeof openWindow !== "function") return false;
  const url = urlObject.createObjectURL(artifact.blob);
  try {
    openWindow(url, "_blank", "noopener,noreferrer");
  } catch {
    urlObject.revokeObjectURL?.(url);
    return false;
  }
  scheduleRevoke?.(() => urlObject.revokeObjectURL?.(url), 60_000);
  return true;
}

export function downloadBusinessDocumentPdfArtifact(artifact, {
  documentObject = globalThis.document,
  urlObject = globalThis.URL,
} = {}) {
  if (!(artifact?.blob instanceof Blob) || !documentObject?.createElement || !urlObject?.createObjectURL) return false;
  const url = urlObject.createObjectURL(artifact.blob);
  const link = documentObject.createElement("a");
  link.href = url;
  link.download = artifact.fileName;
  link.rel = "noopener";
  documentObject.body?.appendChild?.(link);
  link.click();
  link.remove?.();
  urlObject.revokeObjectURL?.(url);
  return true;
}

export async function copyBusinessDocumentShareMessage(message, navigatorObject = globalThis.navigator) {
  if (typeof navigatorObject?.clipboard?.writeText !== "function") return false;
  await navigatorObject.clipboard.writeText(String(message || ""));
  return true;
}

export function openBusinessDocumentEmailDraft({ recipient = "", subject = "", message = "", locationObject = globalThis.location } = {}) {
  if (!locationObject) return false;
  const body = [message, "", "Please attach the downloaded PDF before sending."].join("\n");
  locationObject.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return true;
}

export const businessDocumentDeviceShareInternals = Object.freeze({
  artifactTitle,
  blobBase64,
  cancelled,
  nativeShareArtifact,
});
