import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

import { formatLocaleCurrency } from "./localeFormat.js";
import { t } from "./language.js";

function confirmedDelivery(delivery) {
  return delivery?.source === "PROFESSIONAL_QUOTE_DELIVERY" &&
    delivery.snapshot?.quoteId === delivery.quoteId &&
    delivery.snapshot?.jobId === delivery.jobId
    ? delivery
    : null;
}

function lineageKey(label) {
  if (label === "Revised") return "customerQuoteLineageRevised";
  if (label === "Additional") return "customerQuoteLineageAdditional";
  return "customerQuoteLineageOriginal";
}

export function buildQuoteSharePresentation(
  delivery,
  { language = "en" } = {}
) {
  const confirmed = confirmedDelivery(delivery);
  if (!confirmed) return null;
  const { snapshot } = confirmed;
  const total = formatLocaleCurrency(
    snapshot.totalMinor / 100,
    snapshot.currency,
    {},
    language
  );
  const scope = snapshot.scopeItems.map((item) =>
    item.quantity === 1
      ? item.description
      : `${item.description} (${item.quantity})`
  );
  const lines = [
    t("quoteDeliveryShareFrom", language, {
      business: snapshot.business.displayName,
    }),
    t("quoteDeliveryShareTotal", language, { total }),
    t("quoteDeliveryShareLineage", language, {
      lineage: t(lineageKey(snapshot.lineageLabel), language),
    }),
  ];
  if (scope.length > 0) {
    lines.push(t("quoteDeliveryShareScope", language));
    lines.push(...scope.map((item) => `- ${item}`));
  }
  return Object.freeze({
    title: t("quoteDeliveryShareTitle", language, {
      business: snapshot.business.displayName,
    }),
    text: lines.join("\n"),
  });
}

function cancelled(error) {
  return error?.name === "AbortError" ||
    String(error?.message || "").toLowerCase().includes("cancel");
}

export async function shareQuoteExternally({
  delivery,
  language = "en",
  platform = Capacitor.getPlatform(),
  nativeShare = (payload) => Share.share(payload),
  webShare = globalThis.navigator?.share?.bind(globalThis.navigator),
  copy = globalThis.navigator?.clipboard?.writeText?.bind(
    globalThis.navigator?.clipboard
  ),
} = {}) {
  const presentation = buildQuoteSharePresentation(delivery, { language });
  if (!presentation) return { ok: false, method: "unavailable" };
  try {
    if (platform === "ios" && typeof nativeShare === "function") {
      await nativeShare({
        title: presentation.title,
        text: presentation.text,
        dialogTitle: presentation.title,
      });
      return { ok: true, method: "native" };
    }
    if (typeof webShare === "function") {
      await webShare(presentation);
      return { ok: true, method: "web" };
    }
    if (typeof copy === "function") {
      await copy(presentation.text);
      return { ok: true, method: "copy" };
    }
  } catch (error) {
    if (cancelled(error)) return { ok: false, method: "cancelled" };
    throw error;
  }
  return { ok: false, method: "unavailable" };
}

export async function copyQuoteDetails({
  delivery,
  language = "en",
  copy = globalThis.navigator?.clipboard?.writeText?.bind(
    globalThis.navigator?.clipboard
  ),
} = {}) {
  const presentation = buildQuoteSharePresentation(delivery, { language });
  if (!presentation || typeof copy !== "function") return false;
  await copy(presentation.text);
  return true;
}

export function buildQuoteEmailUrl(delivery, { language = "en" } = {}) {
  const presentation = buildQuoteSharePresentation(delivery, { language });
  return presentation
    ? `mailto:?subject=${encodeURIComponent(presentation.title)}&body=${encodeURIComponent(presentation.text)}`
    : null;
}
