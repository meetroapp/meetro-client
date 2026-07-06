export const MEDIA_DEFERRED_TITLE = "Photos coming soon";

export const MEDIA_DEFERRED_DETAIL =
  "Photo uploads are paused for Friends & Family while Meetro finishes governed media storage.";

export function isFriendsAndFamilyMediaDeferred(env = import.meta.env) {
  return !Boolean(env?.DEV);
}

export function getMediaDeferredCopy(language = "en") {
  if (language === "es") {
    return {
      title: "Fotos próximamente",
      detail:
        "Las fotos están pausadas para Friends & Family mientras Meetro termina el almacenamiento seguro.",
    };
  }

  return {
    title: MEDIA_DEFERRED_TITLE,
    detail: MEDIA_DEFERRED_DETAIL,
  };
}

export function getMediaDeferredNotice(language = "en") {
  const copy = getMediaDeferredCopy(language);
  return `${copy.title}. ${copy.detail}`;
}

export function guardFriendsAndFamilyMediaUpload({
  event,
  language = "en",
  onDeferred,
  env = import.meta.env,
} = {}) {
  if (!isFriendsAndFamilyMediaDeferred(env)) return true;

  if (event?.target) {
    event.target.value = "";
  }

  onDeferred?.(getMediaDeferredNotice(language));
  return false;
}
