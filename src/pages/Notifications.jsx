import {
  useEffect,
  useRef,
  useState,
} from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
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
import { refreshAlertCounts } from "../utils/alertCountCoordinator";
import {
  ALERT_CENTER_VIEWS,
  canAttemptCanonicalAlertDismiss,
  canMarkCanonicalAlertRead,
  getAlertCenterView,
  getAlertErrorKey,
  getAlertPresentation,
} from "../utils/alertPresentation";
import { t } from "../utils/language";

function AlertCard({
  alert,
  index,
  language,
  mutationErrorKey,
  pendingOperation,
  onDismiss,
  onMarkRead,
}) {
  const presentation = getAlertPresentation(alert, language);
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

      <div className="alert-center-card__facts">
        {presentation.unreadCountText && (
          <span>{presentation.unreadCountText}</span>
        )}
        {presentation.timestamp && <time dateTime={alert.availableAt}>{presentation.timestamp}</time>}
        <span>{t(presentation.destinationKey, language)}</span>
      </div>

      {alert.priority === "critical" && alert.state.lifecycle === "active" && (
        <p className="alert-center-card__explanation">
          {t("alertCenterCriticalDismissUnavailable", language)}
        </p>
      )}

      {mutationErrorKey && (
        <p className="alert-center-inline-error" role="alert">
          {t(mutationErrorKey, language)}
        </p>
      )}

      {(canMarkRead || canDismiss) && (
        <div className="alert-center-card__actions">
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

function Notifications({ setPage }) {
  const language = useLanguage();
  const setPageRef = useRef(setPage);
  setPageRef.current = setPage;
  const [requestState, setRequestState] = useState(
    createAlertCenterInitialState
  );
  const [pendingMutations, setPendingMutations] = useState({});
  const [mutationErrors, setMutationErrors] = useState({});
  const [readAllPending, setReadAllPending] = useState(false);
  const [readAllErrorKey, setReadAllErrorKey] = useState("");

  const mountedRef = useRef(true);
  const mutationTokensRef = useRef(new Map());
  const readAllTokenRef = useRef(null);
  const controllerRef = useRef(null);
  if (!controllerRef.current) {
    controllerRef.current = createAlertCenterController({
      fetchPage: (query) => fetchAlerts(query, { setPage: setPageRef.current }),
      onStateChange: setRequestState,
    });
  }
  const controller = controllerRef.current;

  useEffect(() => {
    const mutationTokens = mutationTokensRef.current;
    mountedRef.current = true;
    void controller.mount();
    return () => {
      mountedRef.current = false;
      mutationTokens.clear();
      readAllTokenRef.current = null;
      controller.deactivate();
    };
  }, [controller]);

  const handleViewChange = (viewId) => {
    if (viewId === controller.getState().viewId) return;
    mutationTokensRef.current.clear();
    readAllTokenRef.current = null;
    setPendingMutations({});
    setMutationErrors({});
    setReadAllPending(false);
    setReadAllErrorKey("");
    void controller.selectView(viewId);
  };

  const handleLoadMore = () => {
    void controller.loadMore();
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
          onClick={() => void controller.refresh()}
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
            {!hasConfirmedAlerts ? (
              <div className="alert-center-state-card alert-center-state-card--empty" role="status">
                <span className="alert-center-state-icon" aria-hidden="true">
                  <MeetroIcon name="notifications" size={28} decorative />
                </span>
                <h2>{t(view.emptyKey, language)}</h2>
              </div>
            ) : (
              <div className="alert-center-list">
                {snapshot.alerts.map((alert, index) => (
                  <AlertCard
                    alert={alert}
                    index={index}
                    key={`${alert.id}:${index}`}
                    language={language}
                    mutationErrorKey={mutationErrors[alert.id]}
                    pendingOperation={pendingMutations[alert.id]}
                    onDismiss={(item) => runAlertMutation(item, "dismiss")}
                    onMarkRead={(item) => runAlertMutation(item, "read")}
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

      <BottomNav setPage={setPage} currentPage="notifications" />
    </div>
  );
}

export default Notifications;
