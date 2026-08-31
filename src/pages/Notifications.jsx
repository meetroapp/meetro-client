import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import ProfessionalQuoteDecisionAttentionCard from "../components/ProfessionalQuoteDecisionAttentionCard.jsx";
import useLanguage from "../hooks/useLanguage";
import {
  dismissAlert,
  fetchAlerts,
  markAlertRead,
  markAllAlertsRead,
} from "../utils/alertApi";
import {
  createAlertCenterController,
  createAlertCenterInitialState,
  isCurrentAlertMutationCompletion,
} from "../utils/alertCenterController";
import {
  refreshAlertCounts,
  subscribeAlertCounts,
} from "../utils/alertCountCoordinator";
import { fetchCanonicalLiveJobProjection } from "../utils/canonicalLiveJobProjection.js";
import {
  buildFieldCustomerAlertRoute,
  resolveFieldCustomerAlertDestination,
} from "../utils/fieldCustomerCommunicationApi.js";
import {
  buildFieldTeamAlertRoute,
  resolveFieldTeamAlertDestination,
} from "../utils/fieldOperationsApi.js";
import {
  ALERT_CENTER_VIEWS,
  canAttemptCanonicalAlertDismiss,
  canMarkCanonicalAlertRead,
  getAlertDestinationActionTarget,
  getAlertCenterView,
  getAlertErrorKey,
  getAlertPresentation,
} from "../utils/alertPresentation";
import { isProfessionalSession } from "../utils/session";
import { fetchProfessionalQuotes } from "../utils/professionalQuotesProjection.js";
import {
  projectProfessionalQuoteDecisionAttentionList,
} from "../utils/professionalQuoteDecisionAttention.js";
import { t } from "../utils/language";

function AlertCard({
  alert,
  index,
  language,
  mutationErrorKey,
  destinationErrorKey,
  destinationPending,
  pendingOperation,
  onDismiss,
  onMarkRead,
  onOpenDestination,
}) {
  const presentation = getAlertPresentation(alert, language);
  const destinationTarget = getAlertDestinationActionTarget(
    alert.destination,
    { professional: isProfessionalSession() }
  );
  const canMarkRead = canMarkCanonicalAlertRead(alert);
  const canDismiss = canAttemptCanonicalAlertDismiss(alert);
  const isPending = Boolean(pendingOperation);

  return (
    <article
      className={`alert-center-card alert-center-card--${alert.priority}`}
      data-alert-lifecycle={alert.state.lifecycle}
      aria-labelledby={`alert-center-card-title-${index}`}
    >
      <div className="alert-center-card__topline">
        <span className="alert-center-category">{presentation.category}</span>
        <span className={`alert-center-priority alert-center-priority--${alert.priority}`}>
          {presentation.priority}
        </span>
        <span className="alert-center-lifecycle">{presentation.lifecycle}</span>
        <span className={alert.state.isRead ? "alert-center-read" : "alert-center-unread"}>
          {presentation.readState}
        </span>
      </div>

      <h2 id={`alert-center-card-title-${index}`}>{presentation.title}</h2>
      <p className="alert-center-card__message">{presentation.message}</p>

      {presentation.preview && (
        <p className="alert-center-card__preview">{presentation.preview}</p>
      )}

      {presentation.decisionFacts && (
        <div className="alert-center-card__facts" data-alert-quote-decision="true">
          <strong>{presentation.decisionFacts.customerLabel}</strong>
          <span>{presentation.decisionFacts.projectTitle}</span>
          <span>{presentation.decisionFacts.quoteNumber} · {presentation.decisionFacts.total}</span>
          {presentation.decisionFacts.deposit && (
            <span>{t("quoteDecisionDepositDue", language, {
              amount: presentation.decisionFacts.deposit,
            })}</span>
          )}
        </div>
      )}

      <div className="alert-center-card__facts">
        {presentation.unreadCountText && (
          <span>{presentation.unreadCountText}</span>
        )}
        {presentation.timestamp && <time dateTime={alert.availableAt}>{presentation.timestamp}</time>}
        {!destinationTarget.ok && (
          <span>{t(presentation.destinationKey, language)}</span>
        )}
      </div>

      {alert.priority === "critical" && alert.state.lifecycle === "active" && (
        <p className="alert-center-card__explanation">
          {t("alertCenterCriticalDismissUnavailable", language)}
        </p>
      )}

      {(mutationErrorKey || destinationErrorKey) && (
        <p className="alert-center-inline-error" role="alert">
          {t(mutationErrorKey || destinationErrorKey, language)}
        </p>
      )}

      {(destinationTarget.ok || canMarkRead || canDismiss) && (
        <div className="alert-center-card__actions">
          {destinationTarget.ok && (
            <button
              type="button"
              className="alert-center-button alert-center-button--primary"
              disabled={destinationPending}
              onClick={() => onOpenDestination(alert, destinationTarget.route)}
            >
              {t(destinationTarget.labelKey, language)}
            </button>
          )}
          {canMarkRead && (
            <button
              type="button"
              className="alert-center-button alert-center-button--secondary"
              disabled={isPending}
              aria-label={t("alertCenterMarkRead", language)}
              onClick={() => onMarkRead(alert)}
            >
              {pendingOperation === "read"
                ? t("alertCenterMarkingRead", language)
                : t("alertCenterMarkRead", language)}
            </button>
          )}
          {canDismiss && (
            <button
              type="button"
              className="alert-center-button alert-center-button--quiet"
              disabled={isPending}
              aria-label={t("alertCenterDismiss", language)}
              onClick={() => onDismiss(alert)}
            >
              {pendingOperation === "dismiss"
                ? t("alertCenterDismissing", language)
                : t("alertCenterDismiss", language)}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function Notifications({
  setPage,
  employeeMode = false,
  employeeBusinessId = null,
}) {
  const language = useLanguage();
  const setPageRef = useRef(setPage);
  setPageRef.current = setPage;
  const [requestState, setRequestState] = useState(
    createAlertCenterInitialState
  );
  const [pendingMutations, setPendingMutations] = useState({});
  const [mutationErrors, setMutationErrors] = useState({});
  const [destinationErrors, setDestinationErrors] = useState({});
  const [pendingDestinations, setPendingDestinations] = useState({});
  const [readAllPending, setReadAllPending] = useState(false);
  const [readAllErrorKey, setReadAllErrorKey] = useState("");
  const [decisionAttentionState, setDecisionAttentionState] = useState({
    status: "idle",
    quotes: [],
    liveJobs: [],
  });

  const mountedRef = useRef(true);
  const decisionAttentionGenerationRef = useRef(0);
  const mutationTokensRef = useRef(new Map());
  const destinationTokensRef = useRef(new Map());
  const readAllTokenRef = useRef(null);
  const observedCountResponseRef = useRef(null);
  const controllerRef = useRef(null);
  if (!controllerRef.current) {
    controllerRef.current = createAlertCenterController({
      fetchPage: (query) => fetchAlerts(query, { setPage: setPageRef.current }),
      onStateChange: setRequestState,
    });
  }
  const controller = controllerRef.current;

  const refreshDecisionAttention = useCallback(async () => {
    const generation = decisionAttentionGenerationRef.current + 1;
    decisionAttentionGenerationRef.current = generation;
    setDecisionAttentionState((current) => ({ ...current, status: "loading" }));
    try {
      const response = await fetchProfessionalQuotes({
        classification: "approved",
        limit: 50,
        setPage: setPageRef.current,
      });
      const results = await Promise.all(response.quotes.map((quote) =>
        fetchCanonicalLiveJobProjection({
          jobId: quote.jobId,
          setPage: setPageRef.current,
        })
      ));
      if (decisionAttentionGenerationRef.current !== generation) return;
      const liveJobs = [];
      for (const result of results) {
        if (result.projection) liveJobs.push(result.projection);
      }
      setDecisionAttentionState({
        status: "ready",
        quotes: response.quotes,
        liveJobs,
      });
    } catch {
      if (decisionAttentionGenerationRef.current !== generation) return;
      setDecisionAttentionState({ status: "unavailable", quotes: [], liveJobs: [] });
    }
  }, []);

  useEffect(() => {
    const mutationTokens = mutationTokensRef.current;
    mountedRef.current = true;
    void controller.mount();
    return () => {
      mountedRef.current = false;
      mutationTokens.clear();
      destinationTokensRef.current.clear();
      readAllTokenRef.current = null;
      controller.deactivate();
    };
  }, [controller]);

  useEffect(() => {
    if (!employeeMode) return undefined;
    return subscribeAlertCounts((countSnapshot) => {
      if (countSnapshot.phase !== "ready" || !countSnapshot.response) return;
      if (!observedCountResponseRef.current) {
        observedCountResponseRef.current = countSnapshot.response;
        return;
      }
      if (observedCountResponseRef.current === countSnapshot.response) return;
      observedCountResponseRef.current = countSnapshot.response;
      if (mountedRef.current) void controller.refresh();
    });
  }, [controller, employeeMode]);

  useEffect(() => {
    if (employeeMode) return undefined;
    void refreshDecisionAttention();
    return () => {
      decisionAttentionGenerationRef.current += 1;
    };
  }, [employeeMode, refreshDecisionAttention]);

  const handleViewChange = (viewId) => {
    if (viewId === controller.getState().viewId) return;
    mutationTokensRef.current.clear();
    readAllTokenRef.current = null;
    setPendingMutations({});
    setMutationErrors({});
    destinationTokensRef.current.clear();
    setDestinationErrors({});
    setPendingDestinations({});
    setReadAllPending(false);
    setReadAllErrorKey("");
    void controller.selectView(viewId);
  };

  const handleLoadMore = () => {
    void controller.loadMore();
  };

  const handleOpenDestination = async (alert, canonicalRoute) => {
    const fieldCustomerAlert =
      employeeMode && alert.destination?.type === "conversation";
    const fieldTeamAlert =
      employeeMode &&
      alert.destination?.type === "job" &&
      alert.titleKey === "alerts.work.fieldMessage.title";
    if (!fieldCustomerAlert && !fieldTeamAlert) {
      setPageRef.current(canonicalRoute);
      return;
    }
    if (destinationTokensRef.current.has(alert.id)) return;
    const token = Symbol("field-alert-destination");
    destinationTokensRef.current.set(alert.id, token);
    setPendingDestinations((current) => ({ ...current, [alert.id]: true }));
    setDestinationErrors((current) => {
      const next = { ...current };
      delete next[alert.id];
      return next;
    });
    try {
      const response = fieldTeamAlert
        ? await resolveFieldTeamAlertDestination(alert.id, {
            businessId: employeeBusinessId,
          })
        : await resolveFieldCustomerAlertDestination(alert.id, {
            businessId: employeeBusinessId,
          });
      const route = fieldTeamAlert
        ? buildFieldTeamAlertRoute(response.destination)
        : buildFieldCustomerAlertRoute(response.destination);
      if (!route) throw new Error("Field Alert destination is unavailable.");
      if (
        mountedRef.current &&
        destinationTokensRef.current.get(alert.id) === token
      ) {
        await refreshAlertCounts();
        setPageRef.current(route);
      }
    } catch {
      if (
        mountedRef.current &&
        destinationTokensRef.current.get(alert.id) === token
      ) {
        setDestinationErrors((current) => ({
          ...current,
          [alert.id]: "alertCenterDestinationUnavailable",
        }));
      }
    } finally {
      if (destinationTokensRef.current.get(alert.id) === token) {
        destinationTokensRef.current.delete(alert.id);
        if (mountedRef.current) {
          setPendingDestinations((current) => {
            const next = { ...current };
            delete next[alert.id];
            return next;
          });
        }
      }
    }
  };

  const runAlertMutation = async (alert, operation) => {
    if (mutationTokensRef.current.has(alert.id)) return;
    const token = Symbol(`alert-${operation}`);
    const viewId = controller.getState().viewId;
    mutationTokensRef.current.set(alert.id, token);
    setPendingMutations((current) => ({ ...current, [alert.id]: operation }));
    setMutationErrors((current) => {
      const next = { ...current };
      delete next[alert.id];
      return next;
    });
    const completionIsCurrent = () => isCurrentAlertMutationCompletion({
      currentToken: mutationTokensRef.current.get(alert.id),
      currentViewId: controller.getState().viewId,
      isMounted: mountedRef.current,
      originToken: token,
      originViewId: viewId,
    });

    try {
      const response = operation === "read"
        ? await markAlertRead(alert.id, { setPage })
        : await dismissAlert(alert.id, { setPage });
      if (response.alert.id !== alert.id) {
        throw new Error("Alert mutation identity mismatch.");
      }
      void refreshAlertCounts();
      if (completionIsCurrent()) {
        await controller.refresh();
      }
    } catch (error) {
      if (completionIsCurrent()) {
        const errorOperation = operation === "dismiss" ? "dismiss" : "mutation";
        setMutationErrors((current) => ({
          ...current,
          [alert.id]: getAlertErrorKey(error, errorOperation),
        }));
      }
    } finally {
      if (mutationTokensRef.current.get(alert.id) === token) {
        mutationTokensRef.current.delete(alert.id);
        if (mountedRef.current) {
          setPendingMutations((current) => {
            const next = { ...current };
            delete next[alert.id];
            return next;
          });
        }
      }
    }
  };

  const handleReadAll = async () => {
    if (readAllTokenRef.current || controller.getState().viewId !== "attention") return;
    const token = Symbol("alert-read-all");
    const viewId = controller.getState().viewId;
    readAllTokenRef.current = token;
    setReadAllPending(true);
    setReadAllErrorKey("");
    const completionIsCurrent = () => isCurrentAlertMutationCompletion({
      currentToken: readAllTokenRef.current,
      currentViewId: controller.getState().viewId,
      isMounted: mountedRef.current,
      originToken: token,
      originViewId: viewId,
    });

    try {
      await markAllAlertsRead({ setPage });
      void refreshAlertCounts();
      if (completionIsCurrent()) {
        await controller.refresh();
      }
    } catch (error) {
      if (completionIsCurrent()) {
        setReadAllErrorKey(getAlertErrorKey(error, "mutation"));
      }
    } finally {
      if (readAllTokenRef.current === token) {
        readAllTokenRef.current = null;
        if (mountedRef.current) setReadAllPending(false);
      }
    }
  };

  const {
    initialErrorKey,
    loadMoreErrorKey,
    loadingMore,
    phase,
    refreshErrorKey,
    snapshot,
    viewId: selectedView,
  } = requestState;
  const view = getAlertCenterView(selectedView);
  const hasConfirmedAlerts = Boolean(snapshot?.alerts?.[0]);
  const isRefreshing = phase === "refreshing";
  const durableDecisionQuoteIds = [];
  for (const alert of snapshot?.alerts || []) {
    if (alert.destination?.quoteId) {
      durableDecisionQuoteIds.push(alert.destination.quoteId);
    }
  }
  const decisionAttentionItems = !employeeMode && selectedView === "attention"
    ? projectProfessionalQuoteDecisionAttentionList({
        quotes: decisionAttentionState.quotes,
        liveJobs: decisionAttentionState.liveJobs,
        durableAlertQuoteIds: durableDecisionQuoteIds,
      })
    : [];
  const hasVisibleAttention = hasConfirmedAlerts || decisionAttentionItems.length > 0;

  return (
    <div className="app-page meetro-wide-page alert-center-page">
      <header className="alert-center-header">
        <div>
          <p>{t("alertCenterEyebrow", language)}</p>
          <h1 id="alert-center-title">{t("alertCenterTitle", language)}</h1>
          <span>{t("alertCenterSubtitle", language)}</span>
        </div>
        <button
          type="button"
          className="alert-center-button alert-center-button--secondary"
          disabled={phase === "loading" || isRefreshing}
          onClick={() => {
            void controller.refresh();
            if (!employeeMode) void refreshDecisionAttention();
          }}
        >
          {isRefreshing
            ? t("alertCenterRefreshing", language)
            : t("alertCenterRefresh", language)}
        </button>
      </header>

      <main
        className="alert-center-workspace"
        aria-labelledby="alert-center-title"
        aria-busy={phase === "loading" || isRefreshing}
      >
        <div
          className="alert-center-filters"
          role="tablist"
          aria-label={t("alertCenterViewsLabel", language)}
        >
          {ALERT_CENTER_VIEWS.map((candidate) => (
            <button
              type="button"
              role="tab"
              id={`alert-center-tab-${candidate.id}`}
              aria-controls="alert-center-panel"
              aria-selected={candidate.id === selectedView}
              className={candidate.id === selectedView ? "is-selected" : ""}
              key={candidate.id}
              onClick={() => handleViewChange(candidate.id)}
            >
              {t(candidate.labelKey, language)}
            </button>
          ))}
        </div>

        {selectedView === "attention" && snapshot && (
          <section className="alert-center-read-all" aria-label={t("alertCenterMarkAllRead", language)}>
            <div>
              <strong>{t("alertCenterMarkAllRead", language)}</strong>
              <p>{t("alertCenterMarkAllScope", language)}</p>
            </div>
            <button
              type="button"
              className="alert-center-button alert-center-button--primary"
              disabled={readAllPending || !hasConfirmedAlerts}
              onClick={handleReadAll}
            >
              {readAllPending
                ? t("alertCenterMarkingAllRead", language)
                : t("alertCenterMarkAllRead", language)}
            </button>
            {readAllErrorKey && (
              <p className="alert-center-inline-error" role="alert">
                {t(readAllErrorKey, language)}
              </p>
            )}
          </section>
        )}

        {isRefreshing && snapshot && (
          <p className="alert-center-refresh-status" role="status" aria-live="polite">
            {t("alertCenterRefreshing", language)}
          </p>
        )}

        {refreshErrorKey && snapshot && (
          <div className="alert-center-nonfatal-error" role="status" aria-live="polite">
            <span>{t(refreshErrorKey, language)}</span>
            <button
              type="button"
              className="alert-center-button alert-center-button--quiet"
              onClick={() => void controller.refresh()}
            >
              {t("alertCenterRetry", language)}
            </button>
          </div>
        )}

        {phase === "loading" && !snapshot && (
          <section className="alert-center-state-card" role="status">
            <span className="alert-center-state-icon" aria-hidden="true">
              <MeetroIcon name="notifications" size={28} decorative />
            </span>
            <h2>{t("alertCenterLoading", language)}</h2>
          </section>
        )}

        {phase === "error" && !snapshot && (
          <section className="alert-center-state-card" role="alert">
            <span className="alert-center-state-icon" aria-hidden="true">
              <MeetroIcon name="warning" size={28} decorative />
            </span>
            <h2>{t("alertCenterInitialErrorTitle", language)}</h2>
            <p>{t(initialErrorKey || "alertCenterInitialErrorText", language)}</p>
            <button
              type="button"
              className="alert-center-button alert-center-button--primary"
              onClick={() => void controller.retry()}
            >
              {t("alertCenterRetry", language)}
            </button>
          </section>
        )}

        {snapshot && (
          <section
            id="alert-center-panel"
            role="tabpanel"
            aria-labelledby={`alert-center-tab-${selectedView}`}
            className="alert-center-panel"
          >
            {!hasVisibleAttention ? (
              <div className="alert-center-state-card alert-center-state-card--empty" role="status">
                <span className="alert-center-state-icon" aria-hidden="true">
                  <MeetroIcon name="notifications" size={28} decorative />
                </span>
                <h2>{t(view.emptyKey, language)}</h2>
              </div>
            ) : (
              <div className="alert-center-list">
                {decisionAttentionItems.map((attention) => (
                  <ProfessionalQuoteDecisionAttentionCard
                    attention={attention}
                    key={`canonical-decision:${attention.quoteId}`}
                    language={language}
                    onOpenWorkCenter={(route) => setPage(route)}
                  />
                ))}
                {snapshot.alerts.map((alert, index) => (
                  <AlertCard
                    alert={alert}
                    index={index}
                    key={`${alert.id}:${index}`}
                    language={language}
                    destinationErrorKey={destinationErrors[alert.id]}
                    destinationPending={Boolean(pendingDestinations[alert.id])}
                    mutationErrorKey={mutationErrors[alert.id]}
                    pendingOperation={pendingMutations[alert.id]}
                    onDismiss={(item) => runAlertMutation(item, "dismiss")}
                    onMarkRead={(item) => runAlertMutation(item, "read")}
                    onOpenDestination={handleOpenDestination}
                  />
                ))}
              </div>
            )}

            {snapshot.pagination.hasMore && (
              <div className="alert-center-pagination">
                {loadMoreErrorKey && (
                  <p className="alert-center-inline-error" role="alert">
                    {t(loadMoreErrorKey, language)}
                  </p>
                )}
                <button
                  type="button"
                  className="alert-center-button alert-center-button--secondary"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                >
                  {loadingMore
                    ? t("alertCenterLoadingMore", language)
                    : t("alertCenterLoadMore", language)}
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {!employeeMode && <BottomNav setPage={setPage} currentPage="notifications" />}
    </div>
  );
}

export default Notifications;
