import useAskMeetroContext from "../hooks/useAskMeetroContext.js";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import "../styles/customerHistory.css";
import { getLanguage } from "../utils/language";
import { getCustomerRelationshipsCopy } from "../utils/customerRelationshipsLanguage.js";
import {
  clearCustomerRelationshipNavigationContext,
  loadCustomerRelationshipActivity,
  loadCustomerRelationshipDetail,
  loadCustomerRelationshipDirectory,
  loadCustomerRelationshipForContact,
  startCustomerRelationshipJob,
  readCustomerRelationshipNavigationContext,
  writeCustomerRelationshipContactReturn,
  writeCustomerRelationshipNavigationContext,
} from "../utils/customerRelationshipsWorkspace.js";
import { buildProfessionalWorkCenterRoute } from "../utils/professionalWorkCenterRoute.js";
import { createBusinessCustomerJobCommandKey } from "../utils/businessCustomerRelationshipsApi.js";
import ProfessionalJobHistoryWorkspace from "../components/ProfessionalJobHistoryWorkspace.jsx";
import { fetchProfessionalJobHistory, fetchNativeCustomers, fetchNativeCustomerHistory } from "../utils/jobCompletionApi.js";
import { loadBusinessContactProfileId } from "../utils/businessContactsApi.js";
import ProfessionalCustomerHistoryExport from "../components/ProfessionalCustomerHistoryExport.jsx";
import ProfessionalCustomerHistoryTabs from "../components/ProfessionalCustomerHistoryTabs.jsx";
import { mergeNativeCustomerHistoryPage } from "../utils/professionalCustomerHistory.js";
import NativeCustomerHistoryWorkspace from "../components/NativeCustomerHistoryWorkspace.jsx";
import { getAuthenticatedIdentitySnapshot, subscribeAuthenticatedIdentity } from "../utils/session.js";

const DATE_LOCALES = Object.freeze({
  en: "en-US",
  es: "es-US",
  fr: "fr-FR",
  "pt-BR": "pt-BR",
});

function text(value) {
  return String(value ?? "").trim();
}

function contactName(contact = {}, fallback = "") {
  return text(contact.displayName) || text(contact.companyName) || fallback;
}

function formatEstablishedDate(value, language) {
  const source = text(value);
  const date = source
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(source) ? `${source}T12:00:00` : source)
    : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(DATE_LOCALES[language] || DATE_LOCALES.en, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMoney(value, currency, language) {
  if (!Number.isSafeInteger(value) || value < 0) return "";
  try {
    return new Intl.NumberFormat(DATE_LOCALES[language] || DATE_LOCALES.en, {
      style: "currency",
      currency: text(currency) || "USD",
    }).format(value / 100);
  } catch {
    return "";
  }
}

function CustomerRelationshipsCenter({ setPage }) {
  const language = getLanguage();
  const copy = getCustomerRelationshipsCopy(language);
  const [navigationContext] = useState(() =>
    readCustomerRelationshipNavigationContext(
      typeof window === "undefined" ? null : window.localStorage
    )
  );
  const [workspaceState, setWorkspaceState] = useState({
    status: "loading",
    relationships: [],
    detail: null,
    error: "",
  });
  const [activityFocus, setActivityFocus] = useState(
    navigationContext?.focus || "overview"
  );
  const [activityState, setActivityState] = useState({
    status: "idle",
    activity: null,
    error: "",
  });
  const [newJobState, setNewJobState] = useState({
    open: false,
    title: "",
    description: "",
    location: "",
    status: "idle",
    error: "",
    idempotencyKey: "",
  });
  const [canonicalHistorySource, setCanonicalHistorySource] = useState({
    status: "loading",
    history: null,
    error: "",
    pageError: "",
    loadingMore: false,
    identityKey: "",
    consumedCursors: [],
  });
  const [canonicalHistoryRefreshKey, setCanonicalHistoryRefreshKey] = useState(0);
  const [nativeDirectoryRefreshKey, setNativeDirectoryRefreshKey] = useState(0);
  const [nativeHistoryRefreshKey, setNativeHistoryRefreshKey] = useState(0);
  const [nativeDirectory, setNativeDirectory] = useState({ status: "loading", profileId: null, customers: [], pagination: null, pageError: "", loadingMore: false, identityKey: "" });
  const [selectedNativeCustomer, setSelectedNativeCustomer] = useState(null);
  const [nativeHistory, setNativeHistory] = useState({ status: "idle", history: null, pageError: "", loadingMore: false, identityKey: "" });
  const authenticatedIdentity = useSyncExternalStore(subscribeAuthenticatedIdentity, getAuthenticatedIdentitySnapshot);
  const historyIdentityKey = JSON.stringify([authenticatedIdentity.status, authenticatedIdentity.userId, authenticatedIdentity.sessionGeneration]);
  const historyGenerationRef = useRef(0);
  const historyLoadMoreRef = useRef(null);
  const nativeDirectoryGenerationRef = useRef(0);
  const nativeDirectoryMoreRef = useRef(null);
  const nativeHistoryGenerationRef = useRef(0);
  const nativeHistoryMoreRef = useRef(null);
  const setPageRef = useRef(setPage);
  const activityRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  setPageRef.current = setPage;
  const navigate = useCallback((destination) => {
    setPageRef.current?.(destination);
  }, []);
  useAskMeetroContext(workspaceState.status === "ready" && workspaceState.detail
    ? { businessContactId: workspaceState.detail.contact?.id, relationshipId: workspaceState.detail.relationship?.id, label: workspaceState.detail.contact?.displayName || "" }
    : {});

  useEffect(() => {
    let active = true;
    const generation = ++historyGenerationRef.current;
    historyLoadMoreRef.current = null;
    queueMicrotask(() => {
      if (active && generation === historyGenerationRef.current) {
        setCanonicalHistorySource({
          status: "loading",
          history: null,
          error: "",
          pageError: "",
          loadingMore: false,
          identityKey: historyIdentityKey,
          consumedCursors: [],
        });
      }
    });

    void fetchProfessionalJobHistory({ limit: 20, setPage: navigate })
      .then((history) => {
        if (!active || generation !== historyGenerationRef.current) return;
        setCanonicalHistorySource({
          status: "ready",
          history,
          error: "",
          pageError: "",
          loadingMore: false,
          identityKey: historyIdentityKey,
          consumedCursors: [],
        });
      })
      .catch((error) => {
        if (!active || generation !== historyGenerationRef.current) return;
        setCanonicalHistorySource({
          status: "error",
          history: null,
          error: String(error?.code || "JOB_HISTORY_FAILED"),
          pageError: "",
          loadingMore: false,
          identityKey: historyIdentityKey,
          consumedCursors: [],
        });
      });

    return () => {
      active = false;
      historyGenerationRef.current += 1;
      historyLoadMoreRef.current = null;
    };
  }, [canonicalHistoryRefreshKey, navigate, historyIdentityKey]);

  useEffect(() => {
    let active = true;
    const generation = ++nativeDirectoryGenerationRef.current;
    nativeDirectoryMoreRef.current = null;
    queueMicrotask(() => {
      if (active && generation === nativeDirectoryGenerationRef.current) {
        setNativeDirectory({ status: "loading", profileId: null, customers: [], pagination: null, pageError: "", loadingMore: false, identityKey: historyIdentityKey });
        setSelectedNativeCustomer(null);
      }
    });
    void loadBusinessContactProfileId({ setPage: navigate })
      .then(profileId => fetchNativeCustomers({ contractorProfileId: profileId, setPage: navigate })
        .then(directory => ({ profileId, directory })))
      .then(({ profileId, directory }) => {
        if (!active || generation !== nativeDirectoryGenerationRef.current) return;
        setNativeDirectory({ status: "ready", profileId, customers: directory.customers, pagination: directory.pagination, pageError: "", loadingMore: false, identityKey: historyIdentityKey });
      })
      .catch(() => {
        if (!active || generation !== nativeDirectoryGenerationRef.current) return;
        setNativeDirectory({ status: "error", profileId: null, customers: [], pagination: null, pageError: "", loadingMore: false, identityKey: historyIdentityKey });
      });
    return () => { active = false; nativeDirectoryGenerationRef.current += 1; nativeDirectoryMoreRef.current = null; };
  }, [historyIdentityKey, nativeDirectoryRefreshKey, navigate]);

  const selectedNativeId = selectedNativeCustomer?.subject.homeownerUserId || null;
  const selectedNativeProfileId = selectedNativeCustomer?.subject.contractorProfileId || null;
  const nativeSubjectKey = JSON.stringify([historyIdentityKey, selectedNativeProfileId, selectedNativeId]);
  useEffect(() => {
    let active = true;
    const generation = ++nativeHistoryGenerationRef.current;
    nativeHistoryMoreRef.current = null;
    if (!selectedNativeId || !selectedNativeProfileId) return () => { active = false; nativeHistoryGenerationRef.current += 1; };
    queueMicrotask(() => {
      if (active && generation === nativeHistoryGenerationRef.current) {
        setNativeHistory({ status: "loading", history: null, pageError: "", loadingMore: false, identityKey: nativeSubjectKey });
      }
    });
    void fetchNativeCustomerHistory({ contractorProfileId: selectedNativeProfileId, homeownerUserId: selectedNativeId, setPage: navigate })
      .then(history => {
        if (!active || generation !== nativeHistoryGenerationRef.current) return;
        setNativeHistory({ status: "ready", history, pageError: "", loadingMore: false, identityKey: nativeSubjectKey });
      })
      .catch(() => {
        if (!active || generation !== nativeHistoryGenerationRef.current) return;
        setNativeHistory({ status: "error", history: null, pageError: "", loadingMore: false, identityKey: nativeSubjectKey });
      });
    return () => { active = false; nativeHistoryGenerationRef.current += 1; nativeHistoryMoreRef.current = null; };
  }, [selectedNativeId, selectedNativeProfileId, nativeSubjectKey, nativeHistoryRefreshKey, navigate]);

  const loadActivity = useCallback(async (relationshipId) => {
    if (!relationshipId) return;
    const requestId = activityRequestRef.current + 1;
    activityRequestRef.current = requestId;
    setActivityState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const activity = await loadCustomerRelationshipActivity({
        relationshipId,
        setPage: navigate,
      });
      if (activityRequestRef.current !== requestId) return;
      setActivityState({ status: "ready", activity, error: "" });
    } catch (error) {
      if (activityRequestRef.current !== requestId) return;
      setActivityState((current) => ({
        ...current,
        status: "error",
        error: error?.message || copy.activityErrorText,
      }));
    }
  }, [copy.activityErrorText, navigate]);

  const loadInitialWorkspace = useCallback(async () => {
    setWorkspaceState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const [relationships, detail] = await Promise.all([
        loadCustomerRelationshipDirectory({ setPage: navigate }),
        navigationContext?.businessContactId
          ? loadCustomerRelationshipForContact({
              businessContactId: navigationContext.businessContactId,
              setPage: navigate,
            })
          : Promise.resolve(null),
      ]);
      setWorkspaceState({
        status: "ready",
        relationships,
        detail,
        error: "",
      });
    } catch (error) {
      setWorkspaceState({
        status: "error",
        relationships: [],
        detail: null,
        error: error?.message || copy.loadErrorText,
      });
    }
  }, [copy.loadErrorText, navigate, navigationContext]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      clearCustomerRelationshipNavigationContext(window.localStorage);
    }
    void loadInitialWorkspace();
  }, [loadInitialWorkspace]);

  const loadedRelationshipId = workspaceState.detail?.relationship?.id || "";
  useEffect(() => {
    if (loadedRelationshipId) {
      void loadActivity(loadedRelationshipId);
    } else {
      activityRequestRef.current += 1;
      setActivityState({ status: "idle", activity: null, error: "" });
    }
  }, [loadActivity, loadedRelationshipId]);

  async function openRelationship(relationshipId) {
    setSelectedNativeCustomer(null);
    setNativeHistory({ status: "idle", history: null, pageError: "", loadingMore: false, identityKey: "" });
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setActivityFocus("overview");
    setWorkspaceState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const detail = await loadCustomerRelationshipDetail({
        relationshipId,
        setPage: navigate,
      });
      if (detailRequestRef.current !== requestId) return;
      setWorkspaceState((current) => ({
        ...current,
        status: "ready",
        detail,
        error: "",
      }));
    } catch (error) {
      if (detailRequestRef.current !== requestId) return;
      setWorkspaceState((current) => ({
        ...current,
        status: "error",
        error: error?.message || copy.loadErrorText,
      }));
    }
  }

  function returnFromPage() {
    navigate(navigationContext?.returnPage || "businessCommandCenter");
  }

  function openContact(contact) {
    if (typeof window !== "undefined") {
      writeCustomerRelationshipContactReturn(window.localStorage, contact);
    }
    navigate("messagesInbox");
  }

  function showDirectory() {
    detailRequestRef.current += 1;
    setSelectedNativeCustomer(null);
    setNativeHistory({ status: "idle", history: null, pageError: "", loadingMore: false, identityKey: "" });
    setActivityFocus("overview");
    setNewJobState({
      open: false,
      title: "",
      description: "",
      location: "",
      status: "idle",
      error: "",
      idempotencyKey: "",
    });
    setWorkspaceState((current) => ({ ...current, detail: null }));
  }

  function openNewJob() {
    if (!relationship || contact?.status !== "ACTIVE") return;
    let idempotencyKey = "";
    try {
      idempotencyKey = createBusinessCustomerJobCommandKey();
    } catch {
      idempotencyKey = "";
    }
    setNewJobState({
      open: true,
      title: "",
      description: "",
      location: "",
      status: "idle",
      error: "",
      idempotencyKey,
    });
  }

  function cancelNewJob() {
    if (newJobState.status === "creating") return;
    setNewJobState({
      open: false,
      title: "",
      description: "",
      location: "",
      status: "idle",
      error: "",
      idempotencyKey: "",
    });
  }

  async function createNewJob(event) {
    event?.preventDefault?.();
    if (
      !relationship ||
      contact?.status !== "ACTIVE" ||
      newJobState.status === "creating"
    ) {
      return;
    }

    const projectTitle = text(newJobState.title);
    if (!projectTitle) {
      setNewJobState((current) => ({
        ...current,
        error: copy.newJobErrorText,
      }));
      return;
    }

    let idempotencyKey = newJobState.idempotencyKey;
    if (!idempotencyKey) {
      try {
        idempotencyKey = createBusinessCustomerJobCommandKey();
      } catch {
        setNewJobState((current) => ({
          ...current,
          error: copy.newJobErrorText,
        }));
        return;
      }
    }

    setNewJobState((current) => ({
      ...current,
      status: "creating",
      error: "",
      idempotencyKey,
    }));

    try {
      const job = await startCustomerRelationshipJob({
        relationshipId: relationship.id,
        projectTitle,
        projectDescription: text(newJobState.description),
        serviceLocation: text(newJobState.location)
          ? {
              mode: "TEXT",
              text: text(newJobState.location),
            }
          : null,
        idempotencyKey,
        setPage: navigate,
      });

      const route = buildProfessionalWorkCenterRoute({
        jobId: job.id,
        stage: "evaluation",
        returnPage: "customerRelationshipsCenter",
      });

      if (!route || !contact?.id) {
        throw new Error(copy.newJobErrorText);
      }

      if (typeof window !== "undefined") {
        writeCustomerRelationshipNavigationContext(window.localStorage, {
          businessContactId: contact.id,
          focus: "work",
          returnPage: navigationContext?.returnPage || "businessCommandCenter",
        });
      }

      navigate(route);
    } catch (error) {
      setNewJobState((current) => ({
        ...current,
        status: "error",
        error: error?.message || copy.newJobErrorText,
        idempotencyKey,
      }));
    }
  }

  function openJob(job) {
    const route = buildProfessionalWorkCenterRoute({
      jobId: job?.jobId,
      stage: "work",
      returnPage: "customerRelationshipsCenter",
    });
    if (!route || !contact?.id) return;
    if (typeof window !== "undefined") {
      writeCustomerRelationshipNavigationContext(window.localStorage, {
        businessContactId: contact.id,
        focus: "work",
        returnPage: navigationContext?.returnPage || "businessCommandCenter",
      });
    }
    navigate(route);
  }

  function loadMoreCanonicalHistory() {
    const cursor = canonicalHistorySource.history?.pagination.nextCursor;
    const generation = historyGenerationRef.current;
    if (!cursor || canonicalHistorySource.status !== "ready" || canonicalHistorySource.identityKey !== historyIdentityKey ||
      canonicalHistorySource.loadingMore || historyLoadMoreRef.current || canonicalHistorySource.consumedCursors?.includes(cursor)) return;

    const request = { generation, cursor, identityKey: historyIdentityKey };
    historyLoadMoreRef.current = request;

    setCanonicalHistorySource((current) => ({
      ...current,
      loadingMore: true,
      pageError: "",
    }));

    void fetchProfessionalJobHistory({
      limit: 20,
      cursor,
      setPage: navigate,
    })
      .then((nextPage) => {
        if (historyGenerationRef.current !== generation || historyLoadMoreRef.current !== request) return;
        setCanonicalHistorySource((current) => {
          if (current.identityKey !== request.identityKey || current.status !== "ready" ||
            current.history?.pagination.nextCursor !== cursor || current.consumedCursors?.includes(cursor)) return current;
          return {
            ...current,
            status: "ready",
            error: "",
            pageError: "",
            loadingMore: false,
            consumedCursors: [...(current.consumedCursors || []), cursor],
            history: {
              ...nextPage,
              jobs: [...(current.history?.jobs || []), ...nextPage.jobs],
            },
          };
        });
      })
      .catch((error) => {
        if (historyGenerationRef.current !== generation || historyLoadMoreRef.current !== request) return;
        setCanonicalHistorySource((current) => ({
          ...current,
          loadingMore: false,
          pageError: current.identityKey === request.identityKey && current.history?.pagination.nextCursor === cursor
            ? String(error?.code || "JOB_HISTORY_FAILED")
            : current.pageError,
        }));
      })
      .finally(() => {
        if (historyLoadMoreRef.current === request) historyLoadMoreRef.current = null;
      });
  }

  function loadMoreNativeDirectory() {
    const cursor = nativeDirectory.pagination?.nextCursor;
    const generation = nativeDirectoryGenerationRef.current;
    if (!cursor || nativeDirectory.status !== "ready" || nativeDirectory.identityKey !== historyIdentityKey ||
        nativeDirectory.loadingMore || nativeDirectoryMoreRef.current) return;
    const request = { generation, cursor, profileId: nativeDirectory.profileId, identityKey: historyIdentityKey };
    nativeDirectoryMoreRef.current = request;
    setNativeDirectory(current => ({ ...current, loadingMore: true, pageError: "" }));
    void fetchNativeCustomers({ contractorProfileId: request.profileId, cursor, setPage: navigate })
      .then(page => {
        if (nativeDirectoryGenerationRef.current !== generation || nativeDirectoryMoreRef.current !== request) return;
        setNativeDirectory(current => {
          if (current.profileId !== request.profileId || current.identityKey !== request.identityKey ||
              current.pagination?.nextCursor !== cursor) return current;
          const seen = new Set(current.customers.map(row => row.subject.homeownerUserId));
          return { ...current, loadingMore: false, pageError: "", pagination: page.pagination,
            customers: [...current.customers, ...page.customers.filter(row => !seen.has(row.subject.homeownerUserId))] };
        });
      })
      .catch(() => {
        if (nativeDirectoryGenerationRef.current !== generation || nativeDirectoryMoreRef.current !== request) return;
        setNativeDirectory(current => ({ ...current, loadingMore: false,
          pageError: current.profileId === request.profileId && current.pagination?.nextCursor === cursor ? "NATIVE_CUSTOMERS_UNAVAILABLE" : current.pageError }));
      })
      .finally(() => { if (nativeDirectoryMoreRef.current === request) nativeDirectoryMoreRef.current = null; });
  }

  function loadMoreNativeHistory() {
    const cursor = nativeHistory.history?.pagination.nextCursor;
    const generation = nativeHistoryGenerationRef.current;
    if (!cursor || nativeHistory.status !== "ready" || nativeHistory.identityKey !== nativeSubjectKey ||
        nativeHistory.loadingMore || nativeHistoryMoreRef.current || !selectedNativeCustomer) return;
    const request = { generation, cursor, identityKey: nativeSubjectKey,
      profileId: selectedNativeCustomer.subject.contractorProfileId,
      homeownerId: selectedNativeCustomer.subject.homeownerUserId };
    nativeHistoryMoreRef.current = request;
    setNativeHistory(current => ({ ...current, loadingMore: true, pageError: "" }));
    void fetchNativeCustomerHistory({ contractorProfileId: request.profileId,
      homeownerUserId: request.homeownerId, cursor, setPage: navigate })
      .then(page => {
        if (nativeHistoryGenerationRef.current !== generation || nativeHistoryMoreRef.current !== request) return;
        setNativeHistory(current => {
          if (current.identityKey !== request.identityKey || current.history?.pagination.nextCursor !== cursor) return current;
          return { ...current, loadingMore: false, pageError: "", history: mergeNativeCustomerHistoryPage(current.history, page) };
        });
      })
      .catch(() => {
        if (nativeHistoryGenerationRef.current !== generation || nativeHistoryMoreRef.current !== request) return;
        setNativeHistory(current => ({ ...current, loadingMore: false,
          pageError: current.identityKey === request.identityKey && current.history?.pagination.nextCursor === cursor
            ? "NATIVE_CUSTOMER_HISTORY_UNAVAILABLE" : current.pageError }));
      })
      .finally(() => { if (nativeHistoryMoreRef.current === request) nativeHistoryMoreRef.current = null; });
  }

  function openNativeCustomer(item) {
    if (item?.subject?.kind !== "MEETRO_ACCOUNT" ||
        item.subject.contractorProfileId !== nativeDirectory.profileId ||
        !Number.isSafeInteger(item.subject.homeownerUserId)) return;
    detailRequestRef.current += 1;
    activityRequestRef.current += 1;
    setNativeHistory({ status: "loading", history: null, pageError: "", loadingMore: false, identityKey: "" });
    setSelectedNativeCustomer(item);
  }

  const detail = workspaceState.detail;
  const relationship = detail?.relationship || null;
  const contact = detail?.contact || null;
  const visibleNativeCustomer = nativeDirectory.identityKey === historyIdentityKey &&
    nativeDirectory.status === "ready" &&
    nativeDirectory.profileId === selectedNativeCustomer?.subject.contractorProfileId
    ? selectedNativeCustomer : null;
  const privateWorkspaceVisible = workspaceState.status === "ready" &&
    !selectedNativeCustomer;

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      {!selectedNativeCustomer && (
        <BusinessToolsPageHeader
          title={copy.title}
          description={copy.description}
          categoryLabel={copy.category}
          onBack={returnFromPage}
        />
      )}

      <main
        className={`customer-relationships-workspace${selectedNativeCustomer ? " customer-history-workspace" : ""}`}
        style={workspace}
        aria-labelledby="customer-relationships-title"
      >
        <h2 id="customer-relationships-title" style={visuallyHidden}>
          {copy.title}
        </h2>

        {workspaceState.status === "loading" && (
          <section style={stateCard} role="status" aria-live="polite">
            <span style={loadingDot} aria-hidden="true" />
            <p style={stateText}>{copy.loading}</p>
          </section>
        )}

        {workspaceState.status === "error" && (
          <section style={stateCard} role="alert">
            <h3 style={stateTitle}>{copy.loadErrorTitle}</h3>
            <p style={stateText}>{workspaceState.error || copy.loadErrorText}</p>
            <button type="button" style={primaryButton} onClick={loadInitialWorkspace}>
              {copy.retry}
            </button>
          </section>
        )}

        {privateWorkspaceVisible && detail && !relationship && (
          <section style={detailCard} aria-labelledby="no-customer-relationship-title">
            <div style={detailHeader}>
              <div style={contactAvatar} aria-hidden="true">
                {contactName(contact, "C").slice(0, 1).toUpperCase()}
              </div>
              <div style={minWidthZero}>
                <p style={eyebrow}>{copy.contactName}</p>
                <h3 id="no-customer-relationship-title" style={detailTitle}>
                  {contactName(contact, copy.contactName)}
                </h3>
                {text(contact?.companyName) && (
                  <p style={mutedText}>{contact.companyName}</p>
                )}
              </div>
            </div>
            <div style={noticeCard}>
              <strong>{copy.noRelationshipTitle}</strong>
              <p style={noticeText}>{copy.noRelationshipText}</p>
              <p style={noticeText}>{copy.noRelationshipHelp}</p>
            </div>
            <p style={externalNote}>{copy.externalContact}</p>
            <div style={actionRow}>
              <button type="button" style={primaryButton} onClick={() => openContact(contact)}>
                {copy.viewContact}
              </button>
              <button type="button" style={secondaryButton} onClick={showDirectory}>
                {copy.backToRelationships}
              </button>
            </div>
          </section>
        )}

        {privateWorkspaceVisible && detail && relationship && contact && (
          <section style={detailCard} aria-labelledby="customer-relationship-detail-title">
            <div style={detailHeader}>
              <div style={contactAvatar} aria-hidden="true">
                {contactName(contact, "C").slice(0, 1).toUpperCase()}
              </div>
              <div style={minWidthZero}>
                <h3 id="customer-relationship-detail-title" style={detailTitle}>
                  {contactName(contact, copy.contactName)}
                </h3>
                {text(contact.companyName) && (
                  <p style={mutedText}>{contact.companyName}</p>
                )}
                <p style={relationshipSummary}>
                  {copy.customerSince} {formatEstablishedDate(relationship.createdAt, language) || copy.relationshipEstablished}
                </p>
              </div>
              <span style={contact.status === "ARCHIVED" ? archivedBadge : activeBadge}>
                {contact.status === "ARCHIVED" ? copy.archived : copy.active}
              </span>
            </div>

            <div style={actionRow}>
              {contact.status === "ACTIVE" && (
                <button type="button" style={primaryButton} onClick={openNewJob}>
                  {copy.startNewJob}
                </button>
              )}
              <button type="button" style={secondaryButton} onClick={() => openContact(contact)}>
                {copy.viewContact}
              </button>
              <button type="button" style={secondaryButton} onClick={showDirectory}>
                {copy.backToRelationships}
              </button>
            </div>

            {contact.status === "ARCHIVED" && (
              <div style={noticeCard} role="status">
                <p style={noticeText}>{copy.archivedNewJobUnavailable}</p>
              </div>
            )}

            {newJobState.open && contact.status === "ACTIVE" && (
              <form style={newJobEditor} onSubmit={createNewJob}>
                <div style={newJobEditorHeader}>
                  <div style={minWidthZero}>
                    <h4 style={newJobEditorTitle}>{copy.newJobHeading}</h4>
                    <p style={newJobEditorIntro}>{copy.newJobIntro}</p>
                  </div>
                </div>

                <label style={fieldLabel}>
                  <span>{copy.newJobTitle}</span>
                  <input
                    type="text"
                    value={newJobState.title}
                    maxLength={500}
                    autoComplete="off"
                    required
                    disabled={newJobState.status === "creating"}
                    placeholder={copy.newJobTitlePlaceholder}
                    onChange={(event) =>
                      setNewJobState((current) => ({
                        ...current,
                        title: event.target.value,
                        error: "",
                      }))
                    }
                    style={textInput}
                  />
                </label>

                <label style={fieldLabel}>
                  <span>{copy.newJobDescription}</span>
                  <textarea
                    value={newJobState.description}
                    maxLength={12000}
                    rows={5}
                    disabled={newJobState.status === "creating"}
                    placeholder={copy.newJobDescriptionPlaceholder}
                    onChange={(event) =>
                      setNewJobState((current) => ({
                        ...current,
                        description: event.target.value,
                        error: "",
                      }))
                    }
                    style={textArea}
                  />
                </label>

                <label style={fieldLabel}>
                  <span>{copy.newJobLocation}</span>
                  <input
                    type="text"
                    value={newJobState.location}
                    maxLength={600}
                    autoComplete="street-address"
                    disabled={newJobState.status === "creating"}
                    placeholder={copy.newJobLocationPlaceholder}
                    onChange={(event) =>
                      setNewJobState((current) => ({
                        ...current,
                        location: event.target.value,
                        error: "",
                      }))
                    }
                    style={textInput}
                  />
                  <span style={fieldHelp}>{copy.newJobLocationHelp}</span>
                </label>

                {newJobState.error && (
                  <div role="alert" style={newJobError}>
                    <strong>{copy.newJobErrorTitle}</strong>
                    <p style={noticeText}>{newJobState.error}</p>
                  </div>
                )}

                <div style={actionRow}>
                  <button
                    type="submit"
                    style={primaryButton}
                    disabled={newJobState.status === "creating" || !text(newJobState.title)}
                  >
                    {newJobState.status === "creating" ? copy.creatingJob : copy.createJob}
                  </button>
                  <button
                    type="button"
                    style={secondaryButton}
                    disabled={newJobState.status === "creating"}
                    onClick={cancelNewJob}
                  >
                    {copy.cancelNewJob}
                  </button>
                </div>
              </form>
            )}

            {activityState.status === "ready" && activityState.activity && <ProfessionalCustomerHistoryExport
              key={relationship.id}
              authority={{kind:"PRIVATE_CONTACT",relationshipId:relationship.id,contractorProfileId:relationship.contractorProfileId,businessContactId:relationship.businessContactId}}
              displayName={contactName(contact,copy.contactName)} language={language} copy={copy} setPage={navigate} />}

            <div style={activityHeader}>
              <h4 style={activityTitle}>{copy.relationshipActivity}</h4>
              <ProfessionalCustomerHistoryTabs copy={copy} focus={activityFocus} onChange={setActivityFocus} />
            </div>

            {activityState.status === "loading" && (
              <div style={activityStateCard} role="status" aria-live="polite">
                {copy.loadingActivity}
              </div>
            )}
            {activityState.status === "error" && (
              <div style={activityStateCard} role="alert">
                <strong>{copy.activityErrorTitle}</strong>
                <p style={noticeText}>{activityState.error || copy.activityErrorText}</p>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => void loadActivity(relationship.id)}
                >
                  {copy.retry}
                </button>
              </div>
            )}
            {activityState.status === "ready" && activityState.activity && (
              <RelationshipActivity
                activity={activityState.activity}
                focus={activityFocus}
                copy={copy}
                language={language}
                onOpenJob={openJob}
              />
            )}
            <p style={externalNote}>{copy.externalContact}</p>
          </section>
        )}

        {visibleNativeCustomer && (
          <section
            className="customer-history-customer-shell"
            aria-label={copy.nativeHistory}
            data-native-customer={visibleNativeCustomer.subject.homeownerUserId}
          >
            <button
              type="button"
              className="customer-history-back-button"
              onClick={showDirectory}
            >
              {copy.backToRelationships}
            </button>
            <NativeCustomerHistoryWorkspace
              key={`${visibleNativeCustomer.subject.contractorProfileId}:${visibleNativeCustomer.subject.homeownerUserId}`}
              subject={visibleNativeCustomer.subject}
              displayName={visibleNativeCustomer.displayName}
              sourceState={nativeHistory.identityKey === nativeSubjectKey ? nativeHistory : { status: "loading", history: null, pageError: "", loadingMore: false }}
              language={language}
              copy={copy}
              setPage={navigate}
              onRetry={() => setNativeHistoryRefreshKey(value => value + 1)}
              onLoadMore={loadMoreNativeHistory}
            />
          </section>
        )}

        {workspaceState.status === "ready" && !detail && !selectedNativeCustomer && (
          <section aria-labelledby="customer-relationship-list-title">
            {workspaceState.relationships.length === 0 ? (
              <div style={stateCard} role="status">
                <h3 style={stateTitle}>{copy.privateContacts}</h3>
                <p style={stateText}>{copy.noPrivateContacts}</p>
              </div>
            ) : (
              <>
                <div style={sectionHeading}>
                  <h3 id="customer-relationship-list-title" style={sectionTitle}>
                    {copy.privateContacts}
                  </h3>
                  <span style={countBadge}>{workspaceState.relationships.length}</span>
                </div>
                <div style={relationshipList}>
                  {workspaceState.relationships.map((item) => {
                    const itemContact = item.contact || {};
                    const archived = itemContact.status === "ARCHIVED";
                    const establishedDate = formatEstablishedDate(item.createdAt, language);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        style={relationshipRow}
                        onClick={() => void openRelationship(item.id)}
                        aria-label={`${copy.openRelationship}: ${contactName(itemContact, copy.contactName)}`}
                      >
                        <span style={contactAvatar} aria-hidden="true">
                          {contactName(itemContact, "C").slice(0, 1).toUpperCase()}
                        </span>
                        <span style={relationshipRowBody}>
                          <strong style={relationshipName}>
                            {contactName(itemContact, copy.contactName)}
                          </strong>
                          {text(itemContact.companyName) && (
                            <span style={relationshipMeta}>{itemContact.companyName}</span>
                          )}
                          <span style={relationshipMeta}>
                            {itemContact.partyType === "ORGANIZATION" ? copy.organization : copy.person}
                            {establishedDate ? ` · ${copy.established} ${establishedDate}` : ""}
                          </span>
                        </span>
                        <span style={archived ? archivedBadge : activeBadge}>
                          {archived ? copy.archived : copy.active}
                        </span>
                        <span style={rowChevron} aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {!selectedNativeCustomer && !(privateWorkspaceVisible && detail) && (
          <section style={{ marginTop: "22px", minWidth: 0 }} aria-labelledby="native-customers-title">
            <div style={sectionHeading}>
              <h3 id="native-customers-title" style={sectionTitle}>{copy.meetroCustomers}</h3>
              {nativeDirectory.status === "ready" && <span style={countBadge}>{nativeDirectory.customers.length}</span>}
            </div>
            {nativeDirectory.status === "loading" && <p role="status">{copy.loading}</p>}
            {nativeDirectory.status === "error" && <div style={stateCard} role="alert">
              <p>{copy.nativeHistoryUnavailable}</p>
              <button type="button" style={secondaryButton} onClick={() => setNativeDirectoryRefreshKey(value => value + 1)}>{copy.retry}</button>
            </div>}
            {nativeDirectory.status === "ready" && nativeDirectory.customers.length === 0 && <p role="status">{copy.noNativeCustomers}</p>}
            {nativeDirectory.status === "ready" && <div style={relationshipList}>
              {nativeDirectory.customers.map(item => <button key={`${item.subject.contractorProfileId}:${item.subject.homeownerUserId}`}
                type="button" style={relationshipRow} onClick={() => openNativeCustomer(item)}
                aria-label={`${copy.openNativeCustomer}: ${item.displayName}`}>
                <span style={contactAvatar} aria-hidden="true">{item.displayName.slice(0, 1).toUpperCase()}</span>
                <span style={relationshipRowBody}>
                  <strong style={relationshipName}>{item.displayName}</strong>
                  <span style={relationshipMeta}>{copy.completedJobs}: {item.completedJobCount}</span>
                  {item.lastCompletedAt && <span style={relationshipMeta}>{copy.completed} {formatEstablishedDate(item.lastCompletedAt, language)}</span>}
                </span>
                <span style={activeBadge}>{copy.nativeSourceLabel}</span>
                <span style={rowChevron} aria-hidden="true">›</span>
              </button>)}
            </div>}
            {nativeDirectory.status === "ready" && nativeDirectory.pageError && <div role="alert" style={stateCard}>
              <p>{copy.nativeHistoryUnavailable}</p>
              <button type="button" style={secondaryButton} disabled={nativeDirectory.loadingMore} onClick={loadMoreNativeDirectory}>{copy.retry}</button>
            </div>}
            {nativeDirectory.status === "ready" && nativeDirectory.pagination?.nextCursor && !nativeDirectory.pageError &&
              <button type="button" style={secondaryButton} disabled={nativeDirectory.loadingMore} onClick={loadMoreNativeDirectory}>
                {nativeDirectory.loadingMore ? copy.loading : copy.loadMoreNative}
              </button>}
          </section>
        )}

        {workspaceState.status === "ready" && !detail && !selectedNativeCustomer && (
          <section
            style={{ marginTop: "22px" }}
            aria-label={copy.completedWorkDirectory}
            data-customer-history-authority="canonical-professional-job-history"
          >
            <ProfessionalJobHistoryWorkspace
              sourceState={canonicalHistorySource.identityKey === historyIdentityKey
                ? canonicalHistorySource
                : { status: "loading", history: null, error: "", pageError: "", loadingMore: false }}
              language={language}
              setPage={navigate}
              onRetry={() =>
                setCanonicalHistoryRefreshKey((value) => value + 1)
              }
              onLoadMore={loadMoreCanonicalHistory}
            />
          </section>
        )}

        {privateWorkspaceVisible && detail && (
          <p style={readOnlyNote}>{copy.readOnly}</p>
        )}
      </main>

      <BottomNav setPage={setPage} currentPage="customerRelationshipsCenter" />
    </div>
  );
}

function jobIsCompleted(item = {}) {
  return Boolean(
    item.completedAt ||
    ["COMPLETED", "CLOSED", "JOB_COMPLETED"].includes(text(item.status).toUpperCase())
  );
}

function RelationshipActivity({ activity, focus, copy, language, onOpenJob }) {
  const jobs = Array.isArray(activity.work) ? activity.work : [];
  const activeJobs = jobs.filter((item) => !jobIsCompleted(item));
  const completedJobs = jobs.filter(jobIsCompleted);
  const jobRow = (item) => {
    const invoice = activity.invoices.find((candidate) => candidate.jobId === item.jobId);
    return (
      <ActivityRow
        key={item.jobId}
        title={text(item.title) || text(item.service) || copy.job}
        status={text(item.status) || (jobIsCompleted(item) ? copy.completed : copy.active)}
        secondaryStatus={jobIsCompleted(item) ? "" : text(item.nextAction?.label || item.nextStep)}
        secondaryStatusLabel={copy.nextStep}
        money={invoice ? [
          [copy.total, formatMoney(invoice.totalMinor, invoice.currency, language)],
          [copy.paid, formatMoney(invoice.paidMinor, invoice.currency, language)],
          [copy.balance, formatMoney(invoice.balanceMinor, invoice.currency, language)],
        ] : null}
        dateLabel={item.completedAt ? copy.completed : copy.created}
        dateValue={item.completedAt || item.createdAt || item.linkedAt}
        language={language}
        actionLabel={copy.openJob}
        onOpen={() => onOpenJob?.(item)}
      />
    );
  };
  if (focus === "overview") {
    return (
      <div style={activitySections}>
        <section aria-labelledby="customer-history-summary-title">
          <h5 id="customer-history-summary-title" style={activitySectionTitle}>
            {copy.historySummary}
          </h5>
          <div style={summaryGrid}>
            {[
              [copy.activeJobs, activeJobs.length],
              [copy.completedJobs, completedJobs.length],
              [copy.quotes, activity.quotes.length],
              [copy.invoices, activity.invoices.length],
              [copy.documentsPhotos, activity.documents.length + activity.media.length],
            ].map(([label, value]) => (
              <div key={label} style={summaryCard}>
                <strong style={summaryValue}>{value}</strong>
                <span style={summaryLabel}>{label}</span>
              </div>
            ))}
          </div>
        </section>
        {activity.deposits?.length ? (
          <section aria-labelledby="relationship-deposits-title">
            <h5 id="relationship-deposits-title" style={activitySectionTitle}>{copy.deposits}</h5>
            <div style={activityList}>{activity.deposits.map((item) => (
              <ActivityRow key={item.id} title={copy.deposit} status={item.state}
                money={[[copy.required, formatMoney(item.requiredMinor, item.currency, language)], [copy.applied, formatMoney(item.appliedMinor, item.currency, language)]]}
                dateLabel={copy.latest} dateValue={item.updatedAt} language={language} />
            ))}</div>
          </section>
        ) : null}
        {activity.payments?.length ? (
          <section aria-labelledby="relationship-payments-title">
            <h5 id="relationship-payments-title" style={activitySectionTitle}>{copy.paymentHistory}</h5>
            <div style={activityList}>{activity.payments.map((item) => (
              <ActivityRow key={item.id}
                title={item.kind === "DEPOSIT_RECEIPT" ? copy.depositReceived : copy.invoicePaymentReceived}
                money={[copy.received, formatMoney(item.amountMinor, item.currency, language)]}
                dateLabel={copy.latest} dateValue={item.receivedDate || item.receivedAt} language={language} />
            ))}</div>
          </section>
        ) : null}
        {activity.visits?.length ? (
          <section aria-labelledby="relationship-visits-title">
            <h5 id="relationship-visits-title" style={activitySectionTitle}>{copy.visits}</h5>
            <div style={activityList}>{activity.visits.map((item) => (
              <ActivityRow key={item.visitId} title={text(item.purpose) || copy.visits} status={text(item.state)}
                dateLabel={copy.scheduled} dateValue={item.scheduledStartAt || item.createdAt} language={language} />
            ))}</div>
          </section>
        ) : null}
        {activity.workPerformed?.length ? (
          <section aria-labelledby="relationship-work-performed-title">
            <h5 id="relationship-work-performed-title" style={activitySectionTitle}>{copy.workPerformed}</h5>
            <div style={activityList}>{activity.workPerformed.map((item) => (
              <ActivityRow key={item.activityId}
                title={text(item.statement) || text(item.workstreamTitle) || copy.workPerformed}
                status={text(item.status)} dateLabel={item.performedAt ? copy.completed : copy.created}
                dateValue={item.performedAt || item.createdAt} language={language} />
            ))}</div>
          </section>
        ) : null}
      </div>
    );
  }
  if (focus === "work") {
    return (
      <div style={activitySections}>
        {[
          ["active", copy.activeJobs, activeJobs],
          ["completed", copy.completedJobs, completedJobs],
        ].map(([id, title, items]) => (
          <section key={id} aria-labelledby={`relationship-${id}-jobs-title`}>
            <h5 id={`relationship-${id}-jobs-title`} style={activitySectionTitle}>{title}</h5>
            {items.length ? <div style={activityList}>{items.map(jobRow)}</div> : <p style={activityEmpty}>{copy.noWork}</p>}
          </section>
        ))}
      </div>
    );
  }
  const sections = [
    {
      id: "quotes",
      title: copy.quotes,
      items: activity.quotes,
      empty: copy.noQuotes,
      render: (item) => (
        <ActivityRow
          key={item.quoteId}
          title={`${text(item.documentNumber) || copy.quote} · ${item.lineageType === "REVISED_QUOTE" ? copy.revisedQuote : item.lineageType === "SUPPLEMENTAL_QUOTE" ? copy.additionalQuote : copy.originalQuote}`}
          status={text(item.status)}
          secondaryStatus={text(item.customerDecision)}
          secondaryStatusLabel={copy.decision}
          money={[copy.total, formatMoney(item.totalMinor, item.currency, language)]}
          dateLabel={item.issuedAt ? copy.issued : copy.latest}
          dateValue={item.issuedAt || item.lastActivityAt || item.updatedAt || item.createdAt}
          language={language}
        />
      ),
    },
    {
      id: "invoices",
      title: copy.invoices,
      items: activity.invoices,
      empty: copy.noInvoices,
      render: (item) => (
        <ActivityRow
          key={item.invoiceId}
          title={text(item.invoiceNumber) || copy.invoice}
          status={text(item.status)}
          money={[
            [copy.total, formatMoney(item.totalMinor, item.currency, language)],
            [copy.paid, formatMoney(item.paidMinor, item.currency, language)],
            [copy.balance, formatMoney(item.balanceMinor, item.currency, language)],
          ]}
          dateLabel={item.issuedAt ? copy.issued : copy.latest}
          dateValue={item.issuedAt || item.invoiceDate || item.lastActivityAt || item.updatedAt || item.createdAt}
          language={language}
        />
      ),
    },
  ];
  const visible = sections.filter((section) => section.id === focus);
  return (
    <div style={activitySections}>
      {visible.map((section) => (
        <section key={section.id} aria-labelledby={`relationship-${section.id}-title`}>
          <h5 id={`relationship-${section.id}-title`} style={activitySectionTitle}>
            {section.title}
          </h5>
          {section.items.length === 0 ? (
            <p style={activityEmpty}>{section.empty}</p>
          ) : (
            <div style={activityList}>{section.items.map(section.render)}</div>
          )}
        </section>
      ))}
      {focus === "documents" && (
        <RelationshipDocumentsMedia
          documents={activity.documents}
          media={activity.media}
          copy={copy}
          language={language}
        />
      )}
    </div>
  );
}

function RelationshipDocumentsMedia({ documents, media, copy, language }) {
  if (documents.length === 0 && media.length === 0) {
    return (
      <section aria-labelledby="relationship-documents-title">
        <h5 id="relationship-documents-title" style={activitySectionTitle}>
          {copy.documentsPhotos}
        </h5>
        <p style={activityEmpty}>{copy.noDocumentsPhotos}</p>
      </section>
    );
  }

  const groups = new Map();
  for (const item of [...documents, ...media]) {
    const parentId = text(item.parentId);
    const current = groups.get(parentId) || {
      parentId,
      jobTitle: text(item.jobTitle),
      documents: [],
      media: [],
    };
    if (!current.jobTitle) current.jobTitle = text(item.jobTitle);
    if (item.documentId) current.documents.push(item);
    if (item.mediaId) current.media.push(item);
    groups.set(parentId, current);
  }

  return (
    <section aria-labelledby="relationship-documents-title">
      <h5 id="relationship-documents-title" style={activitySectionTitle}>
        {copy.documentsPhotos}
      </h5>
      <div style={documentGroups}>
        {[...groups.values()].map((group) => (
          <article key={group.parentId} style={documentGroup}>
            <div style={documentGroupHeader}>
              <span style={eyebrow}>{copy.linkedWork}</span>
              <strong style={activityRowTitle}>
                {group.jobTitle || `${copy.job} · ${group.parentId}`}
              </strong>
            </div>

            {group.documents.length > 0 && (
              <div style={documentCollection}>
                <h6 style={collectionTitle}>{copy.documentsLabel}</h6>
                <div style={activityList}>
                  {group.documents.map((item) => (
                    <article key={item.documentId} style={documentCard}>
                      <div style={activityRowTop}>
                        <strong style={activityRowTitle}>
                          {text(item.documentNumber) || (
                            item.documentType === "QUOTE" ? copy.quote : copy.invoice
                          )}
                        </strong>
                        {text(item.status) && (
                          <span style={activityStatus}>{item.status}</span>
                        )}
                      </div>
                      <p style={activityMeta}>
                        {copy.provenance}: {item.provenance === "CANONICAL_QUOTE"
                          ? copy.canonicalQuote
                          : copy.canonicalInvoice}
                      </p>
                      {(item.lastActivityAt || item.issuedAt || item.createdAt) && (
                        <p style={activityMeta}>
                          {copy.latest}: {formatEstablishedDate(
                            item.lastActivityAt || item.issuedAt || item.createdAt,
                            language
                          )}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {group.media.length > 0 && (
              <div style={documentCollection}>
                <h6 style={collectionTitle}>{copy.photosLabel}</h6>
                <div style={mediaGrid}>
                  {group.media.map((item) => (
                    <a
                      key={item.mediaId}
                      href={item.secureUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={mediaCard}
                      aria-label={`${copy.openPhoto}: ${group.jobTitle || copy.linkedWork}`}
                    >
                      <img
                        src={item.secureUrl}
                        alt={copy.requestPhoto}
                        style={mediaImage}
                        loading="lazy"
                        decoding="async"
                      />
                      <span style={mediaBody}>
                        <strong style={activityRowTitle}>{copy.requestPhoto}</strong>
                        <span style={activityMeta}>
                          {copy.provenance}: {item.category === "REQUEST_PHOTO"
                            ? copy.requestPhoto
                            : text(item.provenance)}
                        </span>
                        {item.createdAt && (
                          <span style={activityMeta}>
                            {copy.created}: {formatEstablishedDate(item.createdAt, language)}
                          </span>
                        )}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityRow({ title, status, secondaryStatus, secondaryStatusLabel, money, dateLabel, dateValue, language, actionLabel, onOpen }) {
  const amounts = Array.isArray(money?.[0]) ? money : money ? [money] : [];
  return (
    <article style={activityRow}>
      <div style={activityRowTop}>
        <strong style={activityRowTitle}>{title}</strong>
        {status && <span style={activityStatus}>{status}</span>}
      </div>
      {secondaryStatus && (
        <p style={activityMeta}>{secondaryStatusLabel}: {secondaryStatus}</p>
      )}
      {amounts.some(([, value]) => value) && (
        <div style={activityAmounts}>
          {amounts.filter(([, value]) => value).map(([label, value]) => (
            <span key={label} style={activityAmount}>
              <small>{label}</small>
              <strong>{value}</strong>
            </span>
          ))}
        </div>
      )}
      {dateValue && (
        <p style={activityMeta}>{dateLabel}: {formatEstablishedDate(dateValue, language)}</p>
      )}
      {onOpen && (
        <button type="button" style={activityOpenButton} onClick={onOpen}>
          {actionLabel}
          <span aria-hidden="true">›</span>
        </button>
      )}
    </article>
  );
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  height: "100dvh",
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 50px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 96px) max(18px, env(safe-area-inset-left, 0px))",
  overflowY: "auto",
  overflowX: "hidden",
  overscrollBehaviorY: "contain",
  touchAction: "pan-y",
  WebkitOverflowScrolling: "touch",
  boxSizing: "border-box",
  background: "var(--meetro-color-background, #FAFAFC)",
  fontFamily: "var(--meetro-font-family, Poppins, system-ui, sans-serif)",
};

const workspace = { width: "100%", maxWidth: "980px", minWidth: 0, margin: "24px auto 0" };
const stateCard = { width: "100%", minWidth: 0, padding: "clamp(24px, 5vw, 38px)", borderRadius: "18px", border: "1px solid #d9e2d6", background: "#fffdf8", boxShadow: "0 14px 34px rgba(31, 77, 52, 0.08)", boxSizing: "border-box", textAlign: "center" };
const stateTitle = { margin: 0, color: "var(--meetro-color-forest-deep, #14351f)", fontSize: "clamp(21px, 4vw, 28px)", lineHeight: 1.25 };
const stateText = { maxWidth: "620px", margin: "12px auto 0", color: "#5f6f62", fontSize: "15px", lineHeight: 1.55 };
const loadingDot = { display: "inline-block", width: "14px", height: "14px", borderRadius: "50%", background: "var(--meetro-color-forest, #1f4d34)", boxShadow: "0 0 0 7px rgba(31, 77, 52, 0.12)" };
const detailCard = { width: "100%", minWidth: 0, padding: "clamp(20px, 4vw, 34px)", borderRadius: "20px", border: "1px solid #d9e2d6", background: "#fffdf8", boxShadow: "0 14px 34px rgba(31, 77, 52, 0.08)", boxSizing: "border-box" };
const detailHeader = { display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flexWrap: "wrap" };
const contactAvatar = { display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 48px", width: "48px", height: "48px", borderRadius: "16px", background: "#e8f1e8", color: "#155c38", fontSize: "19px", fontWeight: 900 };
const minWidthZero = { minWidth: 0, flex: "1 1 220px" };
const eyebrow = { margin: 0, color: "#287048", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" };
const detailTitle = { margin: "4px 0 0", color: "#14251a", fontSize: "clamp(22px, 4vw, 30px)", lineHeight: 1.2, overflowWrap: "anywhere" };
const mutedText = { margin: "5px 0 0", color: "#627166", fontSize: "14px", overflowWrap: "anywhere" };
const activeBadge = { display: "inline-flex", alignItems: "center", minHeight: "30px", padding: "4px 10px", borderRadius: "999px", background: "#e5f4e8", color: "#176039", fontSize: "12px", fontWeight: 900 };
const archivedBadge = { ...activeBadge, background: "#f1eee8", color: "#6b6256" };
const sectionTitle = { margin: "24px 0 12px", color: "#173b27", fontSize: "18px", lineHeight: 1.3 };
const relationshipSummary = { margin: "7px 0 0", color: "#52655a", fontSize: "14px", lineHeight: 1.4 };
const externalNote = { margin: "18px 0 0", color: "#5f6f62", fontSize: "14px", lineHeight: 1.5 };
const noticeCard = { marginTop: "22px", padding: "18px", borderRadius: "14px", border: "1px solid #dfe6d9", background: "#f5f8f2", color: "#24402f" };
const noticeText = { margin: "8px 0 0", color: "#5d6c61", fontSize: "14px", lineHeight: 1.5 };
const actionRow = { display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "22px" };
const primaryButton = { minHeight: "46px", maxWidth: "100%", padding: "11px 16px", borderRadius: "13px", border: "1px solid var(--meetro-color-forest, #1f4d34)", background: "var(--meetro-color-forest, #1f4d34)", color: "#fff", fontSize: "14px", fontWeight: 900, cursor: "pointer", overflowWrap: "anywhere" };
const secondaryButton = { ...primaryButton, background: "#fff", color: "var(--meetro-color-forest, #1f4d34)" };
const newJobEditor = { width: "100%", minWidth: 0, marginTop: "20px", padding: "18px", border: "1px solid #d5e1d3", borderRadius: "16px", background: "#f9fbf7", boxSizing: "border-box" };
const newJobEditorHeader = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", minWidth: 0 };
const newJobEditorTitle = { margin: 0, color: "#173b27", fontSize: "18px", lineHeight: 1.3 };
const newJobEditorIntro = { margin: "7px 0 0", color: "#5d6c61", fontSize: "14px", lineHeight: 1.5 };
const fieldLabel = { display: "grid", gap: "7px", marginTop: "16px", minWidth: 0, color: "#294936", fontSize: "13px", fontWeight: 800 };
const textInput = { width: "100%", minWidth: 0, minHeight: "46px", padding: "11px 12px", border: "1px solid #cfdacf", borderRadius: "11px", background: "#fff", color: "#172b1e", font: "inherit", fontSize: "16px", boxSizing: "border-box" };
const textArea = { ...textInput, minHeight: "118px", resize: "vertical", lineHeight: 1.45 };
const fieldHelp = { color: "#6b776f", fontSize: "12px", fontWeight: 500, lineHeight: 1.4 };
const newJobError = { marginTop: "16px", padding: "14px", border: "1px solid #e4c8c3", borderRadius: "12px", background: "#fff7f5", color: "#743b32" };
const activityHeader = { marginTop: "28px", paddingTop: "22px", borderTop: "1px solid #dfe6d9" };
const activityTitle = { margin: 0, color: "#173b27", fontSize: "20px", lineHeight: 1.3 };
const activityNavigation = { display: "flex", gap: "8px", width: "100%", marginTop: "14px", paddingBottom: "2px", overflowX: "auto", WebkitOverflowScrolling: "touch" };
const activityTab = { flex: "0 0 auto", minHeight: "44px", padding: "9px 14px", border: "1px solid #cfdacf", borderRadius: "999px", background: "#fff", color: "#31543f", fontSize: "14px", fontWeight: 800, cursor: "pointer" };
const activityTabActive = { ...activityTab, border: "1px solid #1f4d34", background: "#1f4d34", color: "#fff" };
const activityStateCard = { marginTop: "18px", padding: "18px", border: "1px solid #dfe6d9", borderRadius: "14px", background: "#f7f9f5", color: "#405449", lineHeight: 1.5 };
const activitySections = { display: "grid", gap: "24px", marginTop: "20px" };
const activitySectionTitle = { margin: "0 0 10px", color: "#1d492f", fontSize: "16px" };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 138px), 1fr))", gap: "10px", minWidth: 0 };
const summaryCard = { display: "flex", minWidth: 0, minHeight: "86px", padding: "14px", flexDirection: "column", justifyContent: "center", gap: "4px", border: "1px solid #dfe6dc", borderRadius: "14px", background: "#fff", boxSizing: "border-box" };
const summaryValue = { color: "#173b27", fontSize: "24px", lineHeight: 1 };
const summaryLabel = { color: "#5d6c61", fontSize: "13px", lineHeight: 1.35 };
const activityList = { display: "grid", gap: "9px" };
const activityEmpty = { margin: 0, padding: "16px", border: "1px solid #e1e7df", borderRadius: "13px", background: "#fafbf8", color: "#66736a", fontSize: "14px" };
const activityRow = { minWidth: 0, padding: "15px", border: "1px solid #dfe6dc", borderRadius: "14px", background: "#fff", boxSizing: "border-box" };
const activityRowTop = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" };
const activityRowTitle = { minWidth: 0, color: "#1d3023", fontSize: "15px", overflowWrap: "anywhere" };
const activityStatus = { maxWidth: "100%", padding: "4px 9px", borderRadius: "999px", background: "#edf4ec", color: "#245b39", fontSize: "11px", fontWeight: 900, overflowWrap: "anywhere" };
const activityMeta = { margin: "9px 0 0", color: "#69766d", fontSize: "13px", lineHeight: 1.4, overflowWrap: "anywhere" };
const activityAmounts = { display: "flex", flexWrap: "wrap", gap: "10px 22px", marginTop: "11px" };
const activityAmount = { display: "inline-flex", flexDirection: "column", gap: "2px", minWidth: 0, color: "#25382b" };
const activityOpenButton = { display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%", minHeight: "44px", marginTop: "13px", padding: "9px 12px", border: "1px solid #cfdacf", borderRadius: "11px", background: "#f8faf7", color: "#1f4d34", fontSize: "14px", fontWeight: 900, cursor: "pointer", boxSizing: "border-box" };
const documentGroups = { display: "grid", gap: "12px" };
const documentGroup = { minWidth: 0, padding: "15px", border: "1px solid #d9e2d6", borderRadius: "16px", background: "#fafbf8", boxSizing: "border-box" };
const documentGroupHeader = { display: "flex", minWidth: 0, flexDirection: "column", gap: "5px", paddingBottom: "12px", borderBottom: "1px solid #e1e7df" };
const documentCollection = { minWidth: 0, marginTop: "14px" };
const collectionTitle = { margin: "0 0 9px", color: "#31543f", fontSize: "13px", lineHeight: 1.3 };
const documentCard = { minWidth: 0, padding: "13px", border: "1px solid #e1e7df", borderRadius: "12px", background: "#fff", boxSizing: "border-box" };
const mediaGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: "10px", minWidth: 0 };
const mediaCard = { display: "flex", minWidth: 0, minHeight: "88px", overflow: "hidden", border: "1px solid #dfe6dc", borderRadius: "13px", background: "#fff", color: "inherit", textDecoration: "none", boxSizing: "border-box" };
const mediaImage = { display: "block", flex: "0 0 104px", width: "104px", maxWidth: "42%", aspectRatio: "4 / 3", objectFit: "cover", background: "#edf2ec" };
const mediaBody = { display: "flex", minWidth: 0, flex: "1 1 auto", flexDirection: "column", justifyContent: "center", padding: "11px", overflowWrap: "anywhere" };
const sectionHeading = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" };
const countBadge = { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "30px", minHeight: "30px", padding: "3px 8px", borderRadius: "999px", background: "#e7efe5", color: "#1f5d39", fontSize: "13px", fontWeight: 900, boxSizing: "border-box" };
const relationshipList = { display: "grid", gap: "10px" };
const relationshipRow = { display: "flex", alignItems: "center", gap: "13px", width: "100%", minWidth: 0, minHeight: "72px", padding: "14px", borderRadius: "16px", border: "1px solid #d9e2d6", background: "#fffdf8", color: "inherit", textAlign: "left", cursor: "pointer", boxSizing: "border-box", boxShadow: "0 8px 22px rgba(31, 77, 52, 0.05)" };
const relationshipRowBody = { display: "flex", flex: "1 1 260px", minWidth: 0, flexDirection: "column", gap: "4px" };
const relationshipName = { color: "#172b1e", fontSize: "16px", overflowWrap: "anywhere" };
const relationshipMeta = { color: "#66736a", fontSize: "13px", lineHeight: 1.35, overflowWrap: "anywhere" };
const rowChevron = { color: "#33724d", fontSize: "26px", lineHeight: 1 };
const readOnlyNote = { maxWidth: "700px", margin: "18px auto 0", color: "#6b776f", fontSize: "13px", lineHeight: 1.5, textAlign: "center" };
const visuallyHidden = { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 };

export default CustomerRelationshipsCenter;
