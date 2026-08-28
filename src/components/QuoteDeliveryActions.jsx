import { useEffect, useRef, useState } from "react";

import {
  createQuoteDeliveryIdempotencyKey,
  fetchProfessionalQuoteDelivery,
  sendProfessionalQuoteInMeetro,
} from "../utils/quoteDeliveryApi.js";
import {
  buildQuoteEmailUrl,
  copyQuoteDetails,
  downloadQuotePdf,
  shareQuoteExternally,
} from "../utils/quoteDeliveryShare.js";
import { getCanonicalWorkCenterConversationActionTarget } from "../utils/conversationActionRouting.js";
import { getBusinessIdentityProjection } from "../utils/businessIdentity.js";
import { t } from "../utils/language.js";

export default function QuoteDeliveryActions({
  quoteId,
  jobId,
  quoteStatus,
  quoteContext,
  language,
  setPage,
}) {
  const [state, setState] = useState({ status: "idle", delivery: null });
  const [sendState, setSendState] = useState({
    status: "idle",
    evidence: null,
    error: "",
    intent: null,
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [copyConfirmation, setCopyConfirmation] = useState(null);
  const pendingKeyRef = useRef("");
  const sendPendingRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (quoteStatus !== "ISSUED") {
      Promise.resolve().then(() => {
        if (active) setState({ status: "idle", delivery: null });
      });
      return () => {
        active = false;
      };
    }
    Promise.resolve().then(() => {
      if (active) setState({ status: "loading", delivery: null });
    });
    void fetchProfessionalQuoteDelivery({ quoteId, jobId, setPage })
      .then((delivery) => {
        if (active) setState({ status: "ready", delivery });
      })
      .catch(() => {
        if (active) setState({ status: "unavailable", delivery: null });
      });
    return () => {
      active = false;
    };
  }, [jobId, quoteId, quoteStatus, setPage]);

  if (quoteStatus !== "ISSUED") return null;
  if (state.status === "loading") {
    return <p role="status" style={styles.notice}>{t("quoteDeliveryLoading", language)}</p>;
  }
  if (state.status !== "ready" || !state.delivery) {
    return <p role="alert" style={styles.error}>{t("quoteDeliveryUnavailable", language)}</p>;
  }

  const delivery = state.delivery;
  const branding = getBusinessIdentityProjection({}, {
    fallbackName: delivery.snapshot.business.displayName,
  });
  const pending = sendState.status === "sending";
  const sent = sendState.status === "sent";
  const existingDelivery = sendState.evidence || delivery.existingDelivery;
  const businessStatus = delivery.snapshot.businessStatus;
  const copyIntent = Boolean(existingDelivery);
  const actionLabel = copyIntent
    ? businessStatus === "WAITING_ON_CUSTOMER"
      ? t("quoteDeliverySendAgain", language)
      : t("quoteDeliverySendCopyAgain", language)
    : t("quoteDeliverySendInMeetro", language);
  const confirmation = businessStatus === "APPROVED"
    ? {
        title: t("quoteDeliveryAlreadyAcceptedTitle", language),
        message: t("quoteDeliveryAlreadyAcceptedMessage", language),
        actionLabel: t("quoteDeliverySendCopyAgain", language),
      }
    : businessStatus === "DECLINED"
      ? {
          title: t("quoteDeliveryAlreadyDeclinedTitle", language),
          message: t("quoteDeliveryAlreadyDeclinedMessage", language),
          actionLabel: t("quoteDeliverySendCopyAgain", language),
        }
      : {
          title: t("quoteDeliveryAlreadyDeliveredTitle", language),
          message: t("quoteDeliveryAlreadyDeliveredMessage", language),
          actionLabel: t("quoteDeliverySendAgain", language),
        };

  async function handleSend(deliveryIntent = "INITIAL") {
    if (sendPendingRef.current || pending || !delivery.canSendInMeetro) return;
    sendPendingRef.current = true;
    try {
      if (!pendingKeyRef.current) {
        pendingKeyRef.current = createQuoteDeliveryIdempotencyKey();
      }
      setSendState({ status: "sending", evidence: null, error: "", intent: deliveryIntent });
      const evidence = await sendProfessionalQuoteInMeetro({
        delivery: deliveryIntent === "COPY" && existingDelivery
          ? { ...delivery, existingDelivery }
          : delivery,
        idempotencyKey: pendingKeyRef.current,
        deliveryIntent,
        setPage,
      });
      pendingKeyRef.current = "";
      setCopyConfirmation(null);
      setSendState({ status: "sent", evidence, error: "", intent: deliveryIntent });
    } catch {
      setSendState({
        status: "error",
        evidence: null,
        error: t("quoteDeliverySendFailed", language),
        intent: deliveryIntent,
      });
    } finally {
      sendPendingRef.current = false;
    }
  }

  function beginSend() {
    if (copyIntent) {
      setCopyConfirmation(confirmation);
      return;
    }
    void handleSend("INITIAL");
  }

  function openConversation() {
    const conversationId =
      sendState.evidence?.conversationId || delivery.conversationId;
    const target = getCanonicalWorkCenterConversationActionTarget({
      conversationId,
    });
    if (target.ok) setPage?.(target.route);
  }

  async function handleSystemShare() {
    setShareNotice("");
    try {
      const result = await shareQuoteExternally({ delivery, language, quoteContext, branding });
      if (result.method === "download") {
        setShareNotice(t("quoteDeliveryPdfReady", language));
      } else if (!result.ok && result.method !== "cancelled") {
        setShareNotice(t("quoteDeliveryShareUnavailable", language));
      }
    } catch {
      setShareNotice(t("quoteDeliveryShareUnavailable", language));
    }
  }

  async function handleCopy() {
    try {
      const copied = await copyQuoteDetails({ delivery, language });
      setShareNotice(
        copied
          ? t("quoteDeliveryCopied", language)
          : t("quoteDeliveryShareUnavailable", language)
      );
    } catch {
      setShareNotice(t("quoteDeliveryShareUnavailable", language));
    }
  }

  async function handleEmail() {
    const downloaded = await downloadQuotePdf({ delivery, language, quoteContext, branding });
    const url = buildQuoteEmailUrl(delivery, { language });
    if (downloaded && url) window.location.href = url;
    if (!downloaded) setShareNotice(t("quoteDeliveryShareUnavailable", language));
  }

  return (
    <section
      style={styles.section}
      aria-label={t("quoteDeliveryTitle", language)}
      data-quote-delivery-state={sendState.status}
    >
      <strong style={styles.title}>{t("quoteDeliveryTitle", language)}</strong>
      <div style={styles.actions}>
        <button
          type="button"
          style={styles.primary}
          onClick={beginSend}
          disabled={pending || !delivery.canSendInMeetro}
          aria-busy={pending}
        >
          {pending
            ? t("quoteDeliverySending", language)
            : actionLabel}
        </button>
        <button
          type="button"
          style={styles.secondary}
          onClick={() => setShareOpen((open) => !open)}
          aria-expanded={shareOpen}
        >
          {t("quoteDeliveryShareQuote", language)}
        </button>
      </div>

      {!delivery.canSendInMeetro && (
        <p style={styles.notice}>{t("quoteDeliveryConversationUnavailable", language)}</p>
      )}
      {sendState.error && <p role="alert" style={styles.error}>{sendState.error}</p>}
      {sent && (
        <div role="status" style={styles.success}>
          <span>{t(sendState.intent === "COPY" ? "quoteDeliveryCopySent" : "quoteDeliverySent", language)}</span>
          <button type="button" style={styles.linkButton} onClick={openConversation}>
            {t("quoteDeliveryViewConversation", language)}
          </button>
        </div>
      )}

      {copyConfirmation && (
        <div role="dialog" aria-modal="true" aria-labelledby="quote-copy-confirmation-title" style={styles.confirmation}>
          <strong id="quote-copy-confirmation-title" style={styles.title}>{copyConfirmation.title}</strong>
          <p style={styles.notice}>{copyConfirmation.message}</p>
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.secondary}
              disabled={pending}
              onClick={() => setCopyConfirmation(null)}
            >
              {t("quoteDeliveryCancel", language)}
            </button>
            <button
              type="button"
              style={styles.primary}
              disabled={pending}
              aria-busy={pending}
              onClick={() => void handleSend("COPY")}
            >
              {pending ? t("quoteDeliverySending", language) : copyConfirmation.actionLabel}
            </button>
          </div>
        </div>
      )}

      {shareOpen && (
        <div style={styles.shareMenu} role="group" aria-label={t("quoteDeliveryShareQuote", language)}>
          <button type="button" style={styles.menuButton} onClick={handleSystemShare}>
            {t("quoteDeliverySystemShare", language)}
          </button>
          <button type="button" style={styles.menuButton} onClick={() => void handleEmail()}>
            {t("quoteDeliveryEmail", language)}
          </button>
          <button type="button" style={styles.menuButton} onClick={handleCopy}>
            {t("quoteDeliveryCopyDetails", language)}
          </button>
        </div>
      )}
      {shareNotice && <p role="status" style={styles.notice}>{shareNotice}</p>}
    </section>
  );
}

const styles = {
  section: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    paddingTop: 12,
    borderTop: "1px solid #dce5d8",
  },
  title: { color: "#172317", fontSize: 14 },
  actions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
    gap: 10,
  },
  primary: {
    minHeight: 44,
    padding: "0 16px",
    border: 0,
    borderRadius: 8,
    background: "#1f5132",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondary: {
    minHeight: 44,
    padding: "0 16px",
    border: "1px solid #1f5132",
    borderRadius: 8,
    background: "#fff",
    color: "#1f5132",
    fontWeight: 800,
    cursor: "pointer",
  },
  confirmation: {
    display: "grid",
    gap: 12,
    padding: 14,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#f8faf8",
  },
  shareMenu: { display: "grid", gap: 8, minWidth: 0 },
  menuButton: {
    minHeight: 44,
    width: "100%",
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#fff",
    color: "#172317",
    fontWeight: 700,
    textAlign: "left",
    cursor: "pointer",
  },
  success: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    color: "#166534",
    fontWeight: 700,
  },
  linkButton: {
    minHeight: 44,
    padding: "0 12px",
    border: 0,
    borderRadius: 8,
    background: "#edf5ea",
    color: "#1f5132",
    fontWeight: 800,
    cursor: "pointer",
  },
  notice: { margin: 0, color: "#526052", lineHeight: 1.45 },
  error: { margin: 0, color: "#991b1b", lineHeight: 1.45 },
};
