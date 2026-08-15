import { useCallback, useEffect, useMemo, useState } from "react";

import CustomerQuoteReviewPanel from "../components/CustomerQuoteReviewPanel.jsx";
import WorkCenterBackButton from "../components/WorkCenterBackButton.jsx";
import useLanguage from "../hooks/useLanguage.js";
import { fetchCustomerJobQuotes } from "../utils/customerJobQuotesApi.js";
import { decideCustomerQuote } from "../utils/customerQuoteDecisionApi.js";
import { fetchCustomerQuoteDetail } from "../utils/customerQuoteDetailApi.js";
import {
  buildCustomerQuoteConversationReturnRoute,
  parseCustomerQuoteReviewRoute,
} from "../utils/customerQuoteReviewRoute.js";
import { t } from "../utils/language.js";

export default function CustomerQuoteReviewRoute({ setPage }) {
  const language = useLanguage();
  const route = useMemo(
    () => parseCustomerQuoteReviewRoute(
      typeof window === "undefined" ? "" : window.location.hash
    ),
    []
  );
  const [discovery, setDiscovery] = useState({ status: "loading", quotes: null });
  const [detail, setDetail] = useState({ status: "loading", quoteId: route.quoteId, detail: null });

  const loadTruth = useCallback(async () => {
    if (!route.valid) return null;
    const [quotes, quoteDetail] = await Promise.all([
      fetchCustomerJobQuotes({ jobId: route.jobId, setPage }),
      fetchCustomerQuoteDetail({
        quoteId: route.quoteId,
        jobId: route.jobId,
        setPage,
      }),
    ]);
    const exactQuotes = quotes.quotes.filter(
      (quote) => quote.quoteId === route.quoteId && quote.jobId === route.jobId
    );
    if (exactQuotes.length !== 1) throw new Error("Exact Quote is unavailable.");
    setDiscovery({
      status: "confirmed",
      quotes: Object.freeze({ ...quotes, quotes: Object.freeze(exactQuotes) }),
    });
    setDetail({
      status: "confirmed",
      quoteId: route.quoteId,
      detail: quoteDetail,
    });
    return quoteDetail;
  }, [route, setPage]);

  useEffect(() => {
    let active = true;
    if (!route.valid) {
      Promise.resolve().then(() => {
        if (active) {
          setDiscovery({ status: "unavailable", quotes: null });
          setDetail({ status: "unavailable", quoteId: null, detail: null });
        }
      });
      return () => {
        active = false;
      };
    }
    queueMicrotask(() => {
      if (!active) return;
      void loadTruth().catch(() => {
        if (!active) return;
        setDiscovery({ status: "unavailable", quotes: null });
        setDetail({ status: "unavailable", quoteId: route.quoteId, detail: null });
      });
    });
    return () => {
      active = false;
    };
  }, [loadTruth, route]);

  function returnToConversation() {
    if (!route.conversationId) return;
    setPage?.(buildCustomerQuoteConversationReturnRoute(route.conversationId));
  }

  async function handleDecision({
    quoteId,
    action,
    expectedIssuedVersion,
    idempotencyKey,
  }) {
    const result = await decideCustomerQuote({
      quoteId,
      action,
      expectedIssuedVersion,
      idempotencyKey,
      setPage,
    });
    await loadTruth();
    return result;
  }

  return (
    <main style={styles.page} className="meetro-readable-page">
      <WorkCenterBackButton
        label={t("quoteDeliveryBackToConversation", language)}
        onClick={returnToConversation}
      />
      <CustomerQuoteReviewPanel
        language={language}
        discovery={discovery}
        detail={detail}
        selectedQuoteId={route.valid ? route.quoteId : ""}
        onSelectQuote={() => {}}
        onCloseReview={returnToConversation}
        closeReviewLabel={t("quoteDeliveryBackToConversation", language)}
        onDecision={handleDecision}
        onReload={loadTruth}
      />
    </main>
  );
}

const styles = {
  page: {
    display: "grid",
    gap: 16,
    width: "min(100%, 920px)",
    minWidth: 0,
    margin: "0 auto",
    padding: "clamp(16px, 3vw, 28px)",
    paddingBottom: "calc(var(--meetro-bottom-nav-clearance, 0px) + 32px)",
  },
};
