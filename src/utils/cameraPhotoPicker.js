import {
  getMediaDeferredNotice,
  isFriendsAndFamilyMediaDeferred,
} from "./mediaDeferral.js";

const CAMERA_PERMISSION_MESSAGE = "Camera access is needed to add job photos.";

function isCancelError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("cancel") || message.includes("user cancelled");
}

function dataUrlToFile(dataUrl, fileName) {
  const [meta = "", base64 = ""] = String(dataUrl).split(",");
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mimeType });
}

export function createPhotoInputEvent(files = []) {
  return {
    target: {
      files,
      value: "",
    },
  };
}

function openTransientFilePicker({ multiple = true, accept = "image/*", onFiles } = {}) {
  if (typeof document === "undefined") return false;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  input.style.display = "none";
  input.addEventListener(
    "change",
    () => {
      onFiles?.(Array.from(input.files || []));
      input.remove();
    },
    { once: true }
  );
  document.body.appendChild(input);
  input.click();
  return true;
}

export async function pickNativeJobPhoto({
  fileNamePrefix = "job-photo",
  quality = 72,
} = {}) {
  const [{ Capacitor }, cameraModule] = await Promise.all([
    import("@capacitor/core"),
    import("@capacitor/camera"),
  ]);

  if (!Capacitor.isNativePlatform?.()) {
    return { unsupported: true };
  }

  const { Camera, CameraResultType, CameraSource } = cameraModule;
  const photo = await Camera.getPhoto({
    allowEditing: false,
    quality,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
    promptLabelHeader: "Add job photo",
    promptLabelPhoto: "Choose from Library",
    promptLabelPicture: "Take Photo",
  });

  if (!photo?.base64String) {
    return { cancelled: true };
  }

  const format = photo.format || "jpeg";
  const dataUrl = `data:image/${format};base64,${photo.base64String}`;
  const fileName = `${fileNamePrefix}-${Date.now()}.${format === "png" ? "png" : "jpg"}`;

  return {
    photos: [
      {
        dataUrl,
        file: dataUrlToFile(dataUrl, fileName),
        name: fileName,
        type: format === "png" ? "image/png" : "image/jpeg",
      },
    ],
  };
}

export async function openJobPhotoPicker({
  inputRef,
  onPhotos,
  onError,
  fileNamePrefix,
  quality,
  language,
  governedUploadEnabled = false,
} = {}) {
  if (!governedUploadEnabled && isFriendsAndFamilyMediaDeferred()) {
    onError?.(getMediaDeferredNotice(language));
    return { deferred: true };
  }

  try {
    const result = await pickNativeJobPhoto({ fileNamePrefix, quality });

    if (result?.photos?.length) {
      await onPhotos?.(result.photos);
      return result;
    }

    if (result?.cancelled) return result;
  } catch (error) {
    if (isCancelError(error)) return { cancelled: true };

    onError?.(CAMERA_PERMISSION_MESSAGE, error);

    if (inputRef?.current?.click) {
      inputRef.current.click();
    } else {
      openTransientFilePicker({
        onFiles: (files) => onPhotos?.(files.map((file) => ({ file }))),
      });
    }

    return { error };
  }

  if (inputRef?.current?.click) {
    inputRef.current.click();
  } else {
    openTransientFilePicker({
      onFiles: (files) => onPhotos?.(files.map((file) => ({ file }))),
    });
  }

  return { fallback: true };
}

export { CAMERA_PERMISSION_MESSAGE };
