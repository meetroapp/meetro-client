import { Capacitor } from '@capacitor/core';
import { shareBusinessDocumentPdfArtifact } from './businessDocumentDeviceShare.js';

// History owns its preparation states; other business-document workflows stay unchanged.
export function historyPdfProblem(artifact) {
  if (!(artifact?.blob instanceof Blob) || !artifact.blob.size) return 'blob-invalid';
  if (artifact.blob.type !== 'application/pdf' || artifact.contentType !== 'application/pdf') return 'blob-invalid';
  if (!artifact.fileName || !artifact.fileName.endsWith('.pdf')) return 'file-invalid';
  return null;
}

export async function shareHistoryPdfArtifact({ artifact, message, isNative = Capacitor.isNativePlatform(),
  platform = Capacitor.getPlatform(), navigatorObject = globalThis.navigator, FileImpl = globalThis.File,
  nativeShare = shareBusinessDocumentPdfArtifact } = {}) {
  const problem = historyPdfProblem(artifact);
  if (problem) return { ok: false, method: 'invalid-pdf', reason: problem };
  if (isNative && ['ios', 'android'].includes(platform)) {
    const result = await nativeShare({ artifact, message, isNative, platform });
    return { ...result, reason: result.method === 'cancelled' ? 'share-dismissed' : result.ok ? undefined : 'native-share-rejected' };
  }
  let file;
  try {
    file = new FileImpl([artifact.blob], artifact.fileName, { type: 'application/pdf' });
    if (!file.size || file.type !== 'application/pdf' || file.name !== artifact.fileName) throw new TypeError('Invalid PDF File');
  } catch {
    return { ok: false, method: 'fallback', reason: 'file-creation-failed' };
  }
  if (typeof navigatorObject?.share !== 'function') return { ok: false, method: 'fallback', reason: 'share-unavailable' };
  if (typeof navigatorObject.canShare !== 'function') return { ok: false, method: 'fallback', reason: 'can-share-unavailable' };
  try {
    if (!navigatorObject.canShare({ files: [file] })) return { ok: false, method: 'fallback', reason: 'files-unsupported' };
  } catch {
    return { ok: false, method: 'fallback', reason: 'capability-check-rejected' };
  }
  // Full paginated Professional reads can outlast the click's activation. Retain the
  // exact prepared PDF and let the next Share click invoke the OS directly.
  if (navigatorObject.userActivation?.isActive === false) return { ok: false, method: 'prepared', reason: 'activation-expired' };
  try {
    // Web History sharing is file-first. Passing both title and text causes some
    // desktop share targets to render duplicate report descriptions and is not
    // required to hand off the canonical PDF.
    await navigatorObject.share({ files: [file] });
    return { ok: true, method: 'web-pdf' };
  } catch (error) {
    // Web Share uses AbortError for both dismissal and absence of share targets.
    if (error?.name === 'AbortError') return { ok: false, method: 'cancelled', reason: 'share-dismissed' };
    return { ok: false, method: 'fallback', reason: 'share-rejected', errorName: error?.name || 'Error' };
  }
}

export function historyReportNotice(result, action, copy) {
  if (result?.method === 'generation-failed') return copy.generationFailed;
  if (result?.method === 'invalid-pdf') return result.reason === 'blob-invalid' ? copy.blobFailed : copy.fileFailed;
  if (result?.method === 'cancelled') return copy.shareDismissed;
  if (result?.method === 'prepared') return copy.sharePrepared;
  if (result?.method === 'download') return copy.downloadNotice;
  if (result?.method === 'save-required') return copy.saveRequired;
  if (!result?.ok) return copy.failedNotice;
  if (action === 'print') return result.printFromShareSheet ? copy.printShareNotice : copy.printNotice;
  return copy.shareNotice;
}
