import { normalizeQuotePricingSettings } from "./quotePricingPresentation.js";

function amountText(value) {
  return String(value ?? "")
    .replace(/[$,\s]/g, "")
    .trim();
}

function rawAmount(value) {
  const text = amountText(value);
  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function result(blockingErrors = [], warnings = []) {
  const frozenBlocking = Object.freeze(
    blockingErrors.map((item) => Object.freeze({ ...item }))
  );
  const frozenWarnings = Object.freeze(
    warnings.map((item) => Object.freeze({ ...item }))
  );

  return Object.freeze({
    ready: frozenBlocking.length === 0,
    blockingErrors: frozenBlocking,
    warnings: frozenWarnings,
  });
}

function depositError(code, message) {
  return result([
    {
      code,
      field: "deposit",
      message,
    },
  ]);
}

function missingDepositError() {
  return depositError(
    "DEPOSIT_VALUE_REQUIRED",
    "A deposit is required for this Quote, but no deposit amount or percentage has been entered."
  );
}

function depositIsRequired(source = {}) {
  const legacy = source.depositRequired;

  return (
    legacy === true ||
    ["yes", "true", "required"].includes(
      String(legacy ?? "").trim().toLowerCase()
    ) ||
    ["PERCENT", "FIXED"].includes(
      String(source.depositMode ?? "").trim().toUpperCase()
    )
  );
}

export function validateQuotePreSend(source = {}) {
  const pricing = normalizeQuotePricingSettings(source);
  const explicitlyRequired = depositIsRequired(source);

  if (!explicitlyRequired && pricing.depositMode === "NONE") {
    return result();
  }

  if (pricing.depositMode === "PERCENT") {
    const percentSource = source.depositPercent;
    const percentText = amountText(percentSource);

    if (!percentText) {
      return missingDepositError();
    }

    const percent = rawAmount(percentSource);

    if (percent === null || percent <= 0 || percent > 100) {
      return depositError(
        "DEPOSIT_PERCENT_INVALID",
        "Enter a deposit percentage greater than 0 and no more than 100."
      );
    }

    return result();
  }

  if (pricing.depositMode === "FIXED") {
    const fixedSource =
      source.depositFixedAmount ?? source.depositAmount;
    const fixedText = amountText(fixedSource);

    if (!fixedText) {
      return missingDepositError();
    }

    const fixed = rawAmount(fixedSource);

    if (fixed === null || fixed <= 0) {
      return depositError(
        "DEPOSIT_FIXED_INVALID",
        "Enter a fixed deposit amount greater than $0."
      );
    }

    return result();
  }

  /*
   * Legacy Quotes may express a required fixed deposit with:
   *
   * depositRequired: "Yes"
   * depositAmount: <positive amount>
   *
   * normalizeQuotePricingSettings already recognizes that shape when
   * depositMode is absent. If the legacy requirement contains no usable
   * value, fail closed rather than silently treating it as no deposit.
   */
  if (explicitlyRequired) {
    return missingDepositError();
  }

  return result();
}

function positiveDocumentVersion(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/*
 * Quote Safety governs a customer-facing Quote before its first delivery.
 *
 * An exact Quote version that is already issued or already has confirmed
 * non-failed delivery evidence remains an immutable copy/retry operation.
 *
 * Any current unsaved modification must be validated again because it is no
 * longer the exact previously delivered version.
 */
export function shouldValidateQuotePreSendForDelivery({
  documentType,
  documentVersion,
  currentContentChanged = false,
  issued = false,
  deliveries = [],
} = {}) {
  if (String(documentType || "").trim().toUpperCase() !== "QUOTE") {
    return false;
  }

  if (issued === true) {
    return false;
  }

  if (currentContentChanged === true) {
    return true;
  }

  const version = positiveDocumentVersion(documentVersion);

  if (!version) {
    return true;
  }

  const exactVersionAlreadyDelivered =
    Array.isArray(deliveries) &&
    deliveries.some((delivery) => {
      const deliveredVersion = positiveDocumentVersion(
        delivery?.documentVersion
      );

      return (
        deliveredVersion === version &&
        delivery?.state !== "FAILED"
      );
    });

  return !exactVersionAlreadyDelivered;
}
