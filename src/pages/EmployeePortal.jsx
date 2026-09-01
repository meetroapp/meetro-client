import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import EmployeeShell from "../components/EmployeeShell";
import MeetroIcon from "../components/MeetroIcon";
import useLanguage from "../hooks/useLanguage";
import { TimeEvidencePanel } from "./EmployeeJobs";
import { fetchEmployeeJobs, fetchEmployeeSchedule } from "../utils/jobAssignmentApi";
import {
  acknowledgeFieldMessageAttention,
  fetchFieldOperations,
  sendFieldMessage,
} from "../utils/fieldOperationsApi";
import {
  acknowledgeFieldCustomerAttention,
  fetchFieldCustomerConversation,
  sendFieldCustomerMessage,
} from "../utils/fieldCustomerCommunicationApi";
import {
  getAlertCountSnapshot,
  refreshAlertCounts,
  subscribeAlertCounts,
} from "../utils/alertCountCoordinator";
import { getAuthenticatedIdentitySnapshot } from "../utils/session";
import {
  formatAttentionCount,
  getCommunicationAttention,
  getJobCommunicationAttention,
} from "../utils/communicationAttention";
import {
  captureFieldCustomerSend,
  FIELD_CUSTOMER_UNDO_SECONDS,
  isFieldCustomerNavigationLocked,
  startFieldCustomerSendCountdown,
} from "../utils/fieldCustomerPendingSend";
import {
  createFieldMessageComposerState,
  getFieldMessageDraftKey,
  getFieldMessageSendAuthority,
  isExplicitFieldMessageAudienceActivation,
  reduceFieldMessageComposerState,
  resolveFieldMessageRoute,
} from "../utils/fieldMessageComposerState";
import {
  buildFieldScheduleWeek,
  fieldScheduleDateKey,
  fieldScheduleVisitsForDay,
  formatFieldScheduleDate,
  formatFieldScheduleTimeRange,
  formatFieldScheduleWeekRange,
  reconcileFieldEmployeeSchedule,
  resolveFieldScheduleTimeZone,
  shiftFieldScheduleWeek,
} from "../utils/fieldEmployeeSchedule";
import { fetchOwnTime } from "../utils/timeEvidenceApi";
import {
  requestTeamExperienceMode,
} from "../utils/teamExperienceMode";
import {
  setLanguage,
  SUPPORTED_LANGUAGES,
  t,
} from "../utils/language";
import {
  getEmployeeWorkspaceAuthorityKey,
  shouldBlockForEmployeeWorkspaceLoad,
} from "../utils/employeeWorkspaceLifecycle";
import {
  getEmployeeShellHeaderMode,
  getEmployeeMessagesBackRoute,
  shouldShowEmployeeMobileNavigation,
} from "../utils/employeeNavigation";
import { COMPACT_MESSAGE_COMPOSER } from "../utils/messageComposerLayout";

const VIEW_META = Object.freeze({
  home: { page: "employeeHome", titleKey: "fieldNavHome", descriptionKey: "fieldHomeDescription" },
  schedule: { page: "employeeSchedule", titleKey: "fieldNavSchedule", descriptionKey: "fieldScheduleDescription" },
  time: { page: "employeeTime", titleKey: "fieldNavTime", descriptionKey: "fieldTimeDescription" },
  messages: { page: "employeeMessages", titleKey: "fieldNavMessages", descriptionKey: "fieldMessagesDescription" },
  profile: { page: "employeeProfile", titleKey: "fieldNavProfile", descriptionKey: "fieldProfileDescription" },
});

const QUICK_CUSTOMER_UPDATES = Object.freeze([
  Object.freeze({ labelKey: "fieldQuickOnMyWay", textKey: "fieldQuickOnMyWayText" }),
  Object.freeze({ labelKey: "fieldQuick15MinAway", textKey: "fieldQuick15MinAwayText" }),
  Object.freeze({ labelKey: "fieldQuick30MinAway", textKey: "fieldQuick30MinAwayText" }),
  Object.freeze({ labelKey: "fieldQuickRunningLate", textKey: "fieldQuickRunningLateText" }),
  Object.freeze({ labelKey: "fieldQuickArrived", textKey: "fieldQuickArrivedText" }),
  Object.freeze({ labelKey: "fieldQuickNeedAccess", textKey: "fieldQuickNeedAccessText" }),
]);

const STATUS_KEYS = Object.freeze({
  ASSIGNED: "fieldStatusAssigned",
  ON_MY_WAY: "fieldStatusOnMyWay",
  ARRIVED: "fieldStatusArrived",
  WORKING: "fieldStatusWorking",
  FIELD_WORK_COMPLETED: "fieldStatusCompleted",
  ACTIVE: "fieldStatusActive",
  INACTIVE: "fieldStatusInactive",
  UNASSIGNED: "fieldStatusUnassigned",
  EVALUATION: "fieldVisitEvaluation",
  APPROVED_WORK: "fieldVisitApprovedWork",
  FOLLOW_UP: "fieldVisitFollowUp",
  SCHEDULED: "fieldVisitScheduled",
  PROPOSED: "fieldVisitProposed",
  AVAILABLE: "fieldVisitAvailable",
  COMPLETED: "fieldVisitCompleted",
  RESCHEDULED: "fieldVisitRescheduled",
  CANCELLED: "fieldVisitCancelled",
  LOCKED: "fieldVisitLocked",
  JOB_WORK: "fieldTimeJobWork",
  DRIVING: "fieldTimeDriving",
  OFFICE: "fieldTimeOffice",
  SUPPLIES: "fieldTimeSupplies",
  BREAK: "fieldTimeBreak",
  GENERAL: "fieldTimeGeneral",
});

function readable(value, language, fallback = "ASSIGNED") {
  const key = STATUS_KEYS[String(value || fallback).toUpperCase()];
  if (key) return t(key, language);
  const text = String(value || fallback).toLowerCase().replaceAll("_", " ");
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function when(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("fieldTimePending", language);
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function locationText(location, language) {
  const address = location?.address;
  if (address) return [address.line1, address.city, address.region, address.postalCode].filter(Boolean).join(", ");
  return location?.serviceArea || t("fieldServiceLocationPending", language);
}

function subscribeFieldMessageRoute(listener) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

function getFieldMessageRouteSnapshot() {
  return String(window.location.hash || "");
}

function messageCommandKey(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hasActiveMessageAssignment(item) {
  const assignment = item?.assignment;
  return Boolean(
    assignment &&
      assignment.state === "ACTIVE" &&
      (!assignment.memberStatus || assignment.memberStatus === "ACTIVE") &&
      (!assignment.memberRole || assignment.memberRole === "FIELD_EMPLOYEE")
  );
}

function createEmptyEmployeeWorkspace() {
  return {
    jobs: [],
    schedule: [],
    scheduleTimeZone: null,
    operations: [],
    time: null,
  };
}

export default function EmployeePortal({ membership, setPage, view = "home" }) {
  const language = useLanguage();
  const meta = VIEW_META[view] || VIEW_META.home;
  const businessId = membership?.businessId;
  const workspaceAuthorityKey = getEmployeeWorkspaceAuthorityKey(membership);
  const [workspace, setWorkspace] = useState(createEmptyEmployeeWorkspace);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [navigationLocked, setNavigationLocked] = useState(false);
  const employeeWorkspaceSetPageRef = useRef(setPage);
  const employeeWorkspaceLanguageRef = useRef(language);
  const employeeWorkspaceLoadRef = useRef(null);
  const employeeWorkspaceLoadedAuthorityRef = useRef("");
  const employeeWorkspaceRequestRef = useRef(0);
  employeeWorkspaceSetPageRef.current = setPage;
  employeeWorkspaceLanguageRef.current = language;

  const load = useCallback(async () => {
    if (!businessId) return;
    const requestId = employeeWorkspaceRequestRef.current + 1;
    employeeWorkspaceRequestRef.current = requestId;
    const requestAuthorityKey = workspaceAuthorityKey;
    const blockingLoad = shouldBlockForEmployeeWorkspaceLoad(
      employeeWorkspaceLoadedAuthorityRef.current,
      requestAuthorityKey
    );
    if (blockingLoad) {
      setLoading(true);
      setWorkspace(createEmptyEmployeeWorkspace());
    }
    setError("");
    const latestSetPage = employeeWorkspaceSetPageRef.current;
    try {
      const [jobsResult, scheduleResult, timeResult] = await Promise.all([
        fetchEmployeeJobs(businessId, latestSetPage),
        fetchEmployeeSchedule(businessId, latestSetPage),
        fetchOwnTime(businessId, latestSetPage),
      ]);
      const jobs = jobsResult.jobs || [];
      const operations = await Promise.all(jobs.map(async (job) => {
        const assignment = (job.assignments || []).find(
          (item) =>
            item.state === "ACTIVE" &&
            (!item.memberStatus || item.memberStatus === "ACTIVE") &&
            (!item.memberRole || item.memberRole === "FIELD_EMPLOYEE")
        );
        if (!assignment) return { job, assignment: null, operations: null };
        try {
          const result = await fetchFieldOperations(
            job.id,
            { businessId, assignmentId: assignment.id, managed: false },
            latestSetPage
          );
          return { job, assignment, operations: result.operations };
        } catch {
          return { job, assignment, operations: null };
        }
      }));
      if (
        employeeWorkspaceRequestRef.current !== requestId ||
        requestAuthorityKey !== workspaceAuthorityKey
      ) {
        return;
      }
      setWorkspace({
        jobs,
        schedule: scheduleResult.schedule || [],
        scheduleTimeZone: scheduleResult.timeZone || null,
        operations,
        time: timeResult,
      });
      employeeWorkspaceLoadedAuthorityRef.current = requestAuthorityKey;
    } catch (loadError) {
      if (employeeWorkspaceRequestRef.current !== requestId) return;
      setError(
        loadError?.message ||
          t("fieldWorkspaceUnavailable", employeeWorkspaceLanguageRef.current)
      );
    } finally {
      if (employeeWorkspaceRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [businessId, workspaceAuthorityKey]);

  employeeWorkspaceLoadRef.current = load;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void employeeWorkspaceLoadRef.current?.();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      employeeWorkspaceRequestRef.current += 1;
    };
  }, [workspaceAuthorityKey]);

  const current = workspace.operations.find((item) => item.operations?.currentStatus !== "FIELD_WORK_COMPLETED") || workspace.operations[0] || null;
  const recentMessage = useMemo(() => workspace.operations
    .flatMap((item) => (item.operations?.messages || []).map((message) => ({ ...message, job: item.job })))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null, [workspace.operations]);

  return (
    <EmployeeShell
      membership={membership}
      currentPage={meta.page}
      setPage={setPage}
      title={t(meta.titleKey, language)}
      description={t(meta.descriptionKey, language)}
      headerMode={getEmployeeShellHeaderMode(view)}
      showMobileNavigation={shouldShowEmployeeMobileNavigation(view)}
      navigationLocked={navigationLocked}
      navigationLockReason={t("fieldPendingNavigationLocked", language)}
    >
      {error && <div role="alert" style={errorStyle}>{error}</div>}
      {loading ? <section style={cardStyle} role="status">{t("fieldWorkspaceLoading", language)}</section> : (
        <PortalView
          view={view}
          membership={membership}
          workspace={workspace}
          current={current}
          recentMessage={recentMessage}
          setPage={setPage}
          language={language}
          onNavigationLockChange={setNavigationLocked}
        />
      )}
    </EmployeeShell>
  );
}

function PortalView({ view, membership, workspace, current, recentMessage, setPage, language, onNavigationLockChange }) {
  if (view === "schedule") {
    return (
      <ScheduleView
        jobs={workspace.jobs}
        schedule={workspace.schedule}
        scheduleTimeZone={workspace.scheduleTimeZone}
        businessId={membership.businessId}
        setPage={setPage}
        language={language}
      />
    );
  }
  if (view === "time") {
    return (
      <TimeEvidencePanel
        businessId={membership.businessId}
        job={current?.job || null}
        assignment={current?.assignment || null}
        setPage={setPage}
        variant="full"
      />
    );
  }
  if (view === "messages") {
    return (
      <MessagesView
        operations={workspace.operations}
        setPage={setPage}
        membership={membership}
        language={language}
        onNavigationLockChange={onNavigationLockChange}
      />
    );
  }
  if (view === "profile") {
    return <ProfileView membership={membership} language={language} />;
  }
  return <HomeView membership={membership} workspace={workspace} current={current} recentMessage={recentMessage} setPage={setPage} language={language} />;
}

function HomeView({
  membership,
  workspace,
  current,
  recentMessage,
  setPage,
  language,
}) {
  const active = workspace.time?.activeSession;

  const todayKey = new Date().toDateString();

  const today = workspace.schedule.filter(
    (item) =>
      new Date(item.startsAt).toDateString() ===
      todayKey
  );

  return (
    <div className="employee-home">
      <section className="employee-home__hero">
        <div className="employee-home__hero-copy">
          <p className="employee-home__eyebrow">
            {t("fieldCurrentAssignment", language)}
          </p>

          <h2>
            {current?.job?.title ||
              t("fieldNoActiveAssignment", language)}
          </h2>

          <p>
            {current
              ? `${
                  current.job.customer?.displayName ||
                  t("fieldCustomer", language)
                } · ${locationText(
                  current.job.location,
                  language
                )}`
              : t("fieldAssignmentAppears", language, {
                  businessName:
                    membership.businessName ||
                    t("fieldYourBusiness", language),
                })}
          </p>

          {current && (
            <button
              type="button"
              className="employee-home__hero-action"
              onClick={() =>
                setPage(
                  `employeeJobs?businessId=${
                    membership.businessId
                  }&jobId=${encodeURIComponent(
                    current.job.id
                  )}`
                )
              }
            >
              {t("fieldOpenJobDetail", language)}
            </button>
          )}
        </div>
      </section>

      <div className="employee-home__grid">
        <section className="employee-home__card">
          <p className="employee-home__eyebrow">
            {t("fieldTodaysWork", language)}
          </p>

          <div
            className="employee-home__card-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="schedule"
              size={30}
              decorative
            />
          </div>

          <h2>
            {today.length
              ? t(
                  today.length === 1
                    ? "fieldScheduledVisit"
                    : "fieldScheduledVisits",
                  language,
                  { count: today.length }
                )
              : t("fieldNoScheduledVisits", language)}
          </h2>

          {today.length > 0 && (
            <div className="employee-home__mini-list">
              {today.slice(0, 2).map((item) => (
                <p key={item.visitId}>
                  <strong>{item.jobTitle}</strong>
                  <br />
                  {when(item.startsAt, language)}
                </p>
              ))}
            </div>
          )}

          <button
            type="button"
            className="employee-home__link"
            onClick={() =>
              setPage(
                `employeeSchedule?businessId=${
                  membership.businessId
                }`
              )
            }
          >
            {t("fieldViewSchedule", language)}
          </button>
        </section>

        <section className="employee-home__card">
          <p className="employee-home__eyebrow">
            {t("fieldNextAction", language)}
          </p>

          <div
            className="employee-home__card-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="completion"
              size={30}
              decorative
            />
          </div>

          <h2>
            {current?.operations?.nextStatus
              ? t("fieldMarkStatus", language, {
                  status: readable(
                    current.operations.nextStatus,
                    language
                  ),
                })
              : t("fieldNoActionPending", language)}
          </h2>

          <p className="employee-home__card-copy">
            {t("fieldCurrentStatus", language)}:{" "}
            <strong>
              {readable(
                current?.operations?.currentStatus,
                language
              )}
            </strong>
          </p>

          {current && (
            <button
              type="button"
              className="employee-home__link"
              onClick={() =>
                setPage(
                  `employeeJobs?businessId=${
                    membership.businessId
                  }&jobId=${encodeURIComponent(
                    current.job.id
                  )}`
                )
              }
            >
              {t("fieldContinueJobDetail", language)}
            </button>
          )}
        </section>

        <section className="employee-home__card">
          <p className="employee-home__eyebrow">
            {t("fieldCurrentTimer", language)}
          </p>

          <div
            className="employee-home__card-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="jobHistory"
              size={30}
              decorative
            />
          </div>

          <h2>
            {active
              ? `${readable(active.category, language)} ${t("fieldSessionActive", language).toLowerCase()}`
              : t("fieldNotClockedIn", language)}
          </h2>

          <p className="employee-home__card-copy">
            {active
              ? t("fieldStartedAt", language, {
                  time: when(active.clockedInAt, language),
                })
              : t("fieldClockInWhenStarting", language)}
          </p>

          <button
            type="button"
            className="employee-home__link"
            onClick={() =>
              setPage(
                `employeeTime?businessId=${
                  membership.businessId
                }`
              )
            }
          >
            {t("fieldOpenTime", language)}
          </button>
        </section>

        <section className="employee-home__card employee-home__card--recent">
          <p className="employee-home__eyebrow">
            {t("fieldRecentUpdate", language)}
          </p>

          <div
            className="employee-home__card-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="messages"
              size={30}
              decorative
            />
          </div>

          <h2>
            {recentMessage?.job?.title ||
              t("fieldNoTeamUpdates", language)}
          </h2>

          <p className="employee-home__card-copy">
            {recentMessage?.message ||
              t("fieldInternalMessagesAppear", language)}
          </p>

          <button
            type="button"
            className="employee-home__link"
            onClick={() =>
              setPage(
                `employeeMessages?businessId=${
                  membership.businessId
                }${
                  recentMessage?.job?.id
                    ? `&jobId=${encodeURIComponent(recentMessage.job.id)}&audience=team`
                    : ""
                }`
              )
            }
          >
            {t("fieldOpenMessages", language)}
          </button>
        </section>
      </div>
    </div>
  );
}

function ScheduleView({
  jobs,
  schedule,
  scheduleTimeZone,
  businessId,
  setPage,
  language,
}) {
  const projection = useMemo(
    () => reconcileFieldEmployeeSchedule({ jobs, schedule }),
    [jobs, schedule]
  );
  const timeZone = useMemo(
    () => resolveFieldScheduleTimeZone(schedule, scheduleTimeZone),
    [schedule, scheduleTimeZone]
  );
  const todayDateKey = fieldScheduleDateKey(new Date(), timeZone);
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);
  const weekDays = useMemo(
    () => buildFieldScheduleWeek(selectedDateKey, todayDateKey),
    [selectedDateKey, todayDateKey]
  );
  const selectedVisits = useMemo(
    () => fieldScheduleVisitsForDay(projection.visits, selectedDateKey),
    [projection.visits, selectedDateKey]
  );
  const visitCounts = useMemo(() => {
    const counts = new Map();
    for (const visit of projection.visits) {
      counts.set(visit.dateKey, (counts.get(visit.dateKey) || 0) + 1);
    }
    return counts;
  }, [projection.visits]);

  const openJob = (jobId) => {
    setPage(
      `employeeJobs?businessId=${businessId}&jobId=${encodeURIComponent(jobId)}`
    );
  };

  return (
    <div className="employee-schedule">
      <section className="employee-schedule__week-card">
        <div className="employee-schedule__title-row">
          <div>
            <p className="employee-schedule__eyebrow">
              {t("fieldWeekPreview", language)}
            </p>
            <h2>{t("fieldMySchedule", language)}</h2>
          </div>
          <strong>{formatFieldScheduleWeekRange(weekDays, language)}</strong>
        </div>

        <div className="employee-schedule__week-controls">
          <button
            type="button"
            onClick={() =>
              setSelectedDateKey((current) =>
                shiftFieldScheduleWeek(current, -1)
              )
            }
            aria-label={t("fieldPreviousWeek", language)}
          >
            <span aria-hidden="true">‹</span>
            {t("fieldPreviousWeek", language)}
          </button>
          <button
            type="button"
            className="employee-schedule__today"
            onClick={() => setSelectedDateKey(todayDateKey)}
          >
            {t("fieldToday", language)}
          </button>
          <button
            type="button"
            onClick={() =>
              setSelectedDateKey((current) =>
                shiftFieldScheduleWeek(current, 1)
              )
            }
            aria-label={t("fieldNextWeek", language)}
          >
            {t("fieldNextWeek", language)}
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div
          className="employee-schedule__week-strip"
          aria-label={t("fieldWeekPreview", language)}
        >
          {weekDays.map((day) => {
            const count = visitCounts.get(day.dateKey) || 0;
            return (
              <button
                type="button"
                key={day.dateKey}
                className={[
                  "employee-schedule__day",
                  day.isSelected ? "is-selected" : "",
                  day.isToday ? "is-today" : "",
                ].filter(Boolean).join(" ")}
                aria-pressed={day.isSelected}
                onClick={() => setSelectedDateKey(day.dateKey)}
              >
                <span>
                  {formatFieldScheduleDate(day.dateKey, language, {
                    weekday: "short",
                  })}
                </span>
                <strong>
                  {formatFieldScheduleDate(day.dateKey, language, {
                    day: "numeric",
                  })}
                </strong>
                <small className={count ? "has-visits" : ""}>
                  {count ? `• ${count}` : " "}
                </small>
                {day.isToday && <em>{t("fieldToday", language)}</em>}
              </button>
            );
          })}
        </div>

        <p className="employee-schedule__timezone">
          {t("fieldScheduleTimeZone", language, { timeZone })}
        </p>
      </section>

      <section className="employee-schedule__agenda-card">
        <p className="employee-schedule__eyebrow">
          {t("fieldSelectedDayAgenda", language)}
        </p>
        <h2>
          {formatFieldScheduleDate(selectedDateKey, language, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>

        {selectedVisits.length ? (
          <div className="employee-schedule__agenda-list">
            {selectedVisits.map((visit) => (
              <article
                key={visit.visitId}
                className="employee-schedule__visit"
              >
                <div className="employee-schedule__visit-time">
                  <strong>{formatFieldScheduleTimeRange(visit, language)}</strong>
                  <small>{visit.timeZone}</small>
                </div>
                <div className="employee-schedule__visit-copy">
                  <h3>{visit.jobTitle}</h3>
                  <p>
                    {visit.customerDisplayName ||
                      t("fieldCustomerUnavailable", language)}
                  </p>
                  <div className="employee-schedule__visit-badges">
                    <span>{readable(visit.purpose, language)}</span>
                    <span>{readable(visit.state, language)}</span>
                  </div>
                  <p className="employee-schedule__location">
                    {visit.location?.remote
                      ? t("fieldRemote", language)
                      : locationText(visit.location, language)}
                  </p>
                </div>
                <button type="button" onClick={() => openJob(visit.jobId)}>
                  {t("fieldOpenJob", language)}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="employee-schedule__empty" role="status">
            {t("fieldNoVisitsForDay", language)}
          </div>
        )}
      </section>

      <section className="employee-schedule__awaiting-card">
        <p className="employee-schedule__eyebrow">
          {t("fieldAwaitingSchedule", language)}
        </p>
        <h2>{t("fieldAwaitingSchedule", language)}</h2>

        {projection.awaitingSchedule.length ? (
          <div className="employee-schedule__awaiting-list">
            {projection.awaitingSchedule.map((job) => (
              <article key={job.id} className="employee-schedule__awaiting-job">
                <div>
                  <h3>{job.title}</h3>
                  <p>
                    {job.customer?.displayName ||
                      t("fieldCustomerUnavailable", language)}
                  </p>
                  <strong>{t("fieldNotScheduledYet", language)}</strong>
                  <span>{t("fieldAssignedJobNoScheduledVisit", language)}</span>
                  <small>{locationText(job.location, language)}</small>
                </div>
                <button type="button" onClick={() => openJob(job.id)}>
                  {t("fieldOpenJob", language)}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="employee-schedule__empty" role="status">
            {t("fieldNoAssignedWorkScheduled", language)}
          </div>
        )}
      </section>
    </div>
  );
}

function customerAuthor(message, language) {
  const type = message?.author?.type;
  if (type === "FIELD_EMPLOYEE") {
    return `${message.author.displayName || t("fieldEmployeeRole", language)} · ${t("fieldEmployeeRole", language)}`;
  }
  if (type === "CUSTOMER") {
    return message.author?.displayName || t("fieldCustomer", language);
  }
  return message?.author?.displayName || t("fieldBusiness", language);
}

function MessagesView({ operations, setPage, membership, language, onNavigationLockChange }) {
  const eligibleJobs = useMemo(
    () => operations.filter(hasActiveMessageAssignment),
    [operations]
  );
  const eligibleJobIds = useMemo(
    () => eligibleJobs.map((item) => item.job.id),
    [eligibleJobs]
  );
  const routeSnapshot = useSyncExternalStore(
    subscribeFieldMessageRoute,
    getFieldMessageRouteSnapshot,
    () => ""
  );
  const routeSelection = useMemo(
    () => resolveFieldMessageRoute(routeSnapshot, eligibleJobIds),
    [eligibleJobIds, routeSnapshot]
  );
  const [composerState, dispatchComposer] = useReducer(
    reduceFieldMessageComposerState,
    undefined,
    createFieldMessageComposerState
  );
  const { drafts } = composerState;
  const { selectedJobId, audience } = routeSelection;
  const [customerCommandKeys, setCustomerCommandKeys] = useState({});
  const [teamOperations, setTeamOperations] = useState({});
  const [customerThreads, setCustomerThreads] = useState({});
  const [working, setWorking] = useState("");
  const [pendingCustomerSend, setPendingCustomerSend] = useState(null);
  const [customerNotice, setCustomerNotice] = useState("");
  const [alertSnapshot, setAlertSnapshot] = useState(getAlertCountSnapshot);
  const pendingCustomerController = useRef(null);
  const customerRefreshRequest = useRef(0);
  const audiencePointerIntent = useRef("");
  const messageHistoryRef = useRef(null);
  const keepLatestMessageVisible = useRef(true);
  const identity = String(getAuthenticatedIdentitySnapshot()?.userId || "");

  const selected = eligibleJobs.find((item) => item.job.id === selectedJobId) || null;
  const selectedOperations = selected
    ? teamOperations[selectedJobId] || selected.operations
    : null;
  const customerThread = customerThreads[selectedJobId] || {};
  const draftKey = getFieldMessageDraftKey(selectedJobId, audience);
  const draft = drafts[draftKey] || "";
  const sendAuthority = getFieldMessageSendAuthority(audience);
  const teamMessages = selectedOperations?.messages || [];
  const customerMessages = customerThread.conversation?.messages || [];
  const attention = getCommunicationAttention(alertSnapshot, identity);
  const selectedAttention = getJobCommunicationAttention(
    attention,
    membership.businessId,
    selectedJobId
  );

  useEffect(() => subscribeAlertCounts(setAlertSnapshot), []);

  useEffect(() => {
    if (!selectedJobId || routeSelection.hasExplicitDestination || pendingCustomerSend) return;
    updateRoute(selectedJobId, audience);
  }, [
    audience,
    pendingCustomerSend,
    membership.businessId,
    routeSelection.hasExplicitDestination,
    routeSelection.requestedAudience,
    routeSelection.requestedJobId,
    selectedJobId,
  ]);

  useEffect(() => () => {
    pendingCustomerController.current?.cancel();
    pendingCustomerController.current = null;
  }, []);

  useEffect(() => {
    const locked = isFieldCustomerNavigationLocked(pendingCustomerSend);
    onNavigationLockChange?.(locked);
    return () => onNavigationLockChange?.(false);
  }, [onNavigationLockChange, pendingCustomerSend?.phase]);

  useEffect(() => {
    keepLatestMessageVisible.current = true;
  }, [audience, selectedJobId]);

  useEffect(() => {
    const history = messageHistoryRef.current;
    if (!history || !keepLatestMessageVisible.current) return;
    history.scrollTop = history.scrollHeight;
  }, [audience, customerMessages.length, selectedJobId, teamMessages.length]);

  const refreshCustomerThread = useCallback(({ loading = true } = {}) => {
    if (audience !== "customer" || !selected) return Promise.resolve();
    const jobId = selected.job.id;
    const assignmentId = selected.assignment.id;
    const requestId = customerRefreshRequest.current + 1;
    customerRefreshRequest.current = requestId;
    if (loading) {
      setCustomerThreads((current) => ({
        ...current,
        [jobId]: {
          ...current[jobId],
          loading: true,
          error: "",
        },
      }));
    }
    return fetchFieldCustomerConversation(
      jobId,
      { businessId: membership.businessId, assignmentId },
      setPage
    ).then((result) => {
      if (customerRefreshRequest.current !== requestId) return;
      setCustomerThreads((current) => ({
        ...current,
        [jobId]: {
          loading: false,
          error: "",
          conversation: result.conversation || null,
        },
      }));
      void acknowledgeFieldCustomerAttention(
        jobId,
        { businessId: membership.businessId, assignmentId },
        setPage
      ).then(() => refreshAlertCounts()).catch(() => {});
    }).catch(() => {
      if (customerRefreshRequest.current !== requestId) return;
      setCustomerThreads((current) => ({
        ...current,
        [jobId]: {
          loading: false,
          error: t("fieldCustomerConversationUnavailable", language),
          conversation: null,
        },
      }));
    });
  }, [audience, language, membership.businessId, selected, setPage]);

  const refreshTeamThread = useCallback(async () => {
    if (audience !== "team" || !selected) return;
    const jobId = selected.job.id;
    const assignmentId = selected.assignment.id;
    try {
      const refreshed = await fetchFieldOperations(
        jobId,
        {
          businessId: membership.businessId,
          assignmentId,
          managed: false,
        },
        setPage
      );
      setTeamOperations((current) => ({
        ...current,
        [jobId]: refreshed.operations,
      }));
      await acknowledgeFieldMessageAttention(
        jobId,
        { businessId: membership.businessId, assignmentId, managed: false, setPage }
      );
      await refreshAlertCounts();
    } catch {
      // Exact stale or unauthorized destinations fail closed without clearing attention.
    }
  }, [audience, membership.businessId, selected, setPage]);

  useEffect(() => {
    if (audience !== "team" || !selected) return;
    void refreshTeamThread();
  }, [audience, refreshTeamThread, selected, selectedAttention.teamUnread]);

  useEffect(() => {
    if (audience !== "customer" || !selected) return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void refreshCustomerThread();
    });
    return () => {
      active = false;
      customerRefreshRequest.current += 1;
    };
  }, [audience, refreshCustomerThread, selected]);

  useEffect(() => {
    if (audience !== "customer" || !selected) return undefined;
    const refreshVisibleCustomerThread = () => {
      void refreshCustomerThread({ loading: false });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshVisibleCustomerThread();
      }
    };
    window.addEventListener("focus", refreshVisibleCustomerThread);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshVisibleCustomerThread);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [audience, refreshCustomerThread, selected]);

  function updateRoute(jobId, nextAudience) {
    const nextRoute =
      `employeeMessages?businessId=${membership.businessId}&jobId=${encodeURIComponent(jobId)}&audience=${nextAudience}`;
    setPage(nextRoute);
  }

  function selectJob(jobId) {
    if (pendingCustomerSend) return;
    if (!eligibleJobs.some((item) => item.job.id === jobId)) return;
    setCustomerNotice("");
    updateRoute(jobId, audience);
  }

  function selectAudience(nextAudience) {
    if (pendingCustomerSend) return;
    if (!selected || !["team", "customer"].includes(nextAudience)) return;
    setCustomerNotice("");
    updateRoute(selected.job.id, nextAudience);
  }

  function selectAudienceFromControl(event, nextAudience) {
    const explicitActivation = isExplicitFieldMessageAudienceActivation({
      targetAudience: nextAudience,
      pointerAudience: audiencePointerIntent.current,
      clickDetail: event.detail,
    });
    audiencePointerIntent.current = "";
    if (!explicitActivation) return;
    selectAudience(nextAudience);
  }

  function updateDraft(value) {
    if (!draftKey) return;
    dispatchComposer({
      type: "update_draft",
      jobId: selectedJobId,
      audience,
      value,
    });
    if (audience === "customer") {
      setCustomerNotice("");
      setCustomerCommandKeys((current) => ({
        ...current,
        [selectedJobId]: "",
      }));
    }
  }

  function trackMessageHistoryPosition(event) {
    const history = event.currentTarget;
    const distanceFromBottom =
      history.scrollHeight - history.scrollTop - history.clientHeight;
    keepLatestMessageVisible.current = distanceFromBottom <= 72;
  }

  async function submitTeamMessage(event) {
    event.preventDefault();
    if (sendAuthority !== "team" || !selected || !selectedOperations || !draft.trim()) return;
    setWorking("team");
    try {
      await sendFieldMessage(selected.job.id, {
        businessId: membership.businessId,
        assignmentId: selected.assignment.id,
        message: draft.trim(),
        idempotencyKey: messageCommandKey("field-message"),
      }, { managed: false, setPage });
      const refreshed = await fetchFieldOperations(
        selected.job.id,
        {
          businessId: membership.businessId,
          assignmentId: selected.assignment.id,
          managed: false,
        },
        setPage
      );
      setTeamOperations((current) => ({
        ...current,
        [selected.job.id]: refreshed.operations,
      }));
      updateDraft("");
      await refreshAlertCounts();
    } catch {
      setTeamOperations((current) => ({
        ...current,
        [selected.job.id]: {
          ...selectedOperations,
          messageError: t("fieldMessageSendFailed", language),
        },
      }));
    } finally {
      setWorking("");
    }
  }

  async function deliverPendingCustomerMessage(captured) {
    setPendingCustomerSend((current) => current?.command === captured
      ? { ...current, phase: "sending", remainingSeconds: 0 }
      : current);
    try {
      const result = await sendFieldCustomerMessage(
        captured.jobId,
        {
          businessId: captured.businessId,
          assignmentId: captured.assignmentId,
          message: captured.message,
          idempotencyKey: captured.idempotencyKey,
        },
        setPage
      );
      const conversation = result.conversation || (
        await fetchFieldCustomerConversation(
          captured.jobId,
          {
            businessId: captured.businessId,
            assignmentId: captured.assignmentId,
          },
          setPage
        )
      ).conversation;
      setCustomerThreads((current) => ({
        ...current,
        [captured.jobId]: {
          loading: false,
          error: "",
          conversation: conversation || null,
        },
      }));
      setCustomerCommandKeys((current) => ({
        ...current,
        [captured.jobId]: "",
      }));
      await refreshAlertCounts();
    } catch {
      dispatchComposer({
        type: "update_draft",
        jobId: captured.jobId,
        audience: "customer",
        value: captured.message,
      });
      setCustomerCommandKeys((current) => ({
        ...current,
        [captured.jobId]: captured.idempotencyKey,
      }));
      setCustomerNotice(t("fieldMessageRestored", language));
      setCustomerThreads((current) => ({
        ...current,
        [captured.jobId]: {
          ...current[captured.jobId],
          loading: false,
          error: t("fieldCustomerMessageFailed", language),
        },
      }));
    } finally {
      pendingCustomerController.current = null;
      setPendingCustomerSend(null);
    }
  }

  function submitCustomerMessage(event) {
    event.preventDefault();
    if (sendAuthority !== "customer" || pendingCustomerSend || !selected || !customerThread.conversation || !draft.trim()) return;
    const idempotencyKey =
      customerCommandKeys[selectedJobId] ||
      messageCommandKey("field-customer-message");
    const command = captureFieldCustomerSend({
      jobId: selected.job.id,
      businessId: membership.businessId,
      assignmentId: selected.assignment.id,
      message: draft,
      idempotencyKey,
    });
    if (!command) return;

    setCustomerCommandKeys((current) => ({
      ...current,
      [command.jobId]: command.idempotencyKey,
    }));
    dispatchComposer({
      type: "update_draft",
      jobId: command.jobId,
      audience: "customer",
      value: "",
    });
    setCustomerNotice("");
    setCustomerThreads((current) => ({
      ...current,
      [command.jobId]: {
        ...current[command.jobId],
        error: "",
      },
    }));
    setPendingCustomerSend({
      command,
      phase: "countdown",
      remainingSeconds: FIELD_CUSTOMER_UNDO_SECONDS,
    });
    pendingCustomerController.current = startFieldCustomerSendCountdown({
      pending: command,
      onTick: (remainingSeconds) => {
        setPendingCustomerSend((current) => current?.command === command
          ? { ...current, remainingSeconds }
          : current);
      },
      onExpire: deliverPendingCustomerMessage,
    });
  }

  function undoPendingCustomerMessage() {
    const pending = pendingCustomerSend;
    if (!pending || pending.phase !== "countdown") return;
    if (!pendingCustomerController.current?.cancel()) return;
    pendingCustomerController.current = null;
    dispatchComposer({
      type: "update_draft",
      jobId: pending.command.jobId,
      audience: "customer",
      value: pending.command.message,
    });
    setCustomerCommandKeys((current) => ({
      ...current,
      [pending.command.jobId]: pending.command.idempotencyKey,
    }));
    setCustomerNotice(t("fieldMessageRestored", language));
    setPendingCustomerSend(null);
  }

  const composerDisabled =
    !selected ||
    !draft.trim() ||
    Boolean(working) ||
    Boolean(pendingCustomerSend) ||
    (audience === "team"
      ? !selectedOperations
      : !customerThread.conversation || customerThread.loading);

  return (
    <section className="field-messages-workspace">
      <header className="field-messages-header">
        <div className="field-messages-titlebar">
          <button
            type="button"
            className="field-messages-back"
            disabled={Boolean(pendingCustomerSend)}
            aria-label={t("fieldNavHome", language)}
            onClick={() => setPage(
              getEmployeeMessagesBackRoute(membership.businessId)
            )}
          >
            <span aria-hidden="true">←</span>
            <span>{t("fieldNavHome", language)}</span>
          </button>
          <h2>{t("fieldNavMessages", language)}</h2>
        </div>
        <div
          className="field-messages-audience"
          role="group"
          aria-label={t("fieldMessageAudience", language)}
        >
          {[
            ["team", "fieldAudienceTeam", selectedAttention.teamUnread],
            ["customer", "fieldAudienceCustomer", selectedAttention.customerUnread],
          ].map(([value, key, unread]) => (
            <button
              type="button"
              key={value}
              className={audience === value ? "is-active" : ""}
              aria-pressed={audience === value}
              disabled={!selected || Boolean(pendingCustomerSend)}
              onPointerDown={() => {
                audiencePointerIntent.current = value;
              }}
              onTouchStart={() => {
                audiencePointerIntent.current = value;
              }}
              onPointerCancel={() => {
                audiencePointerIntent.current = "";
              }}
              onClick={(event) => selectAudienceFromControl(event, value)}
            >
              {t(key, language)}
              {unread > 0 ? (
                <span className="field-messages-audience-count">
                  {formatAttentionCount(unread)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {eligibleJobs.length ? (
        <div className="field-messages-layout">
          <aside className="field-messages-jobs" aria-label={t("fieldAssignedJob", language)}>
            <p className="field-messages-eyebrow">{t("fieldAssignedJob", language)}</p>
            <div className="field-messages-job-list">
              {eligibleJobs.map((item) => (
                <button
                  type="button"
                  key={item.job.id}
                  className={item.job.id === selectedJobId ? "is-selected" : ""}
                  aria-pressed={item.job.id === selectedJobId}
                  disabled={Boolean(pendingCustomerSend)}
                  onClick={() => selectJob(item.job.id)}
                >
                  <strong>{item.job.title}</strong>
                  <span>
                    {item.job.customer?.displayName || t("fieldCustomerUnavailable", language)}
                  </span>
                  <small>{readable(item.operations?.currentStatus || item.assignment.state, language)}</small>
                </button>
              ))}
            </div>
          </aside>

          <div className="field-messages-thread-card field-messages-chat-workspace">
            <div className="field-messages-thread-heading">
              <p className="field-messages-eyebrow">
                {audience === "team"
                  ? t("fieldTeamMessages", language)
                  : t("fieldCustomerMessages", language)}
              </p>
              <button
                type="button"
                className="field-messages-open-job"
                disabled={Boolean(pendingCustomerSend)}
                onClick={() => setPage(`employeeJobs?businessId=${membership.businessId}&jobId=${encodeURIComponent(selected.job.id)}`)}
              >
                {t("fieldOpenJob", language)}
              </button>
            </div>

            <div className={`field-messages-visibility field-messages-visibility--${audience}`}>
              <MeetroIcon name={audience === "team" ? "businessTools" : "profile"} size={19} decorative />
              <span>
                {audience === "team"
                  ? t("fieldPrivateToTeam", language)
                  : t("fieldVisibleToCustomer", language)}
              </span>
            </div>

            {audience === "team" ? (
              <div
                ref={messageHistoryRef}
                className="field-messages-thread"
                data-scroll-region="message-history"
                aria-label={t("fieldInternalMessagesAria", language)}
                onScroll={trackMessageHistoryPosition}
              >
                {selectedOperations?.messageError && (
                  <div role="alert" className="field-messages-error">{selectedOperations.messageError}</div>
                )}
                {!selectedOperations ? (
                  <div className="field-messages-empty">{t("fieldUpdatesUnavailable", language)}</div>
                ) : teamMessages.length ? teamMessages.map((message) => (
                  <article key={message.id} className="field-messages-message field-messages-message--team">
                    <div>
                      <strong>{message.senderName}</strong>
                      <small>{when(message.createdAt, language)}</small>
                    </div>
                    <p>{message.message}</p>
                  </article>
                )) : (
                  <div className="field-messages-empty">{t("fieldNoTeamMessages", language)}</div>
                )}
              </div>
            ) : (
              <div
                ref={messageHistoryRef}
                className="field-messages-thread"
                data-scroll-region="message-history"
                aria-label={t("fieldCustomerMessages", language)}
                onScroll={trackMessageHistoryPosition}
              >
                {customerThread.error && (
                  <div role="alert" className="field-messages-error">{customerThread.error}</div>
                )}
                {customerThread.loading ? (
                  <div className="field-messages-empty" role="status">{t("fieldCustomerMessagesLoading", language)}</div>
                ) : customerMessages.length ? customerMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`field-messages-message field-messages-message--${String(message.author?.type || "BUSINESS").toLowerCase()}`}
                  >
                    <div>
                      <strong className="field-messages-author">
                        <span>{customerAuthor(message, language)}</span>
                        {message.author?.type === "FIELD_EMPLOYEE" ? (
                          <span className="field-messages-employee-pill">
                            {t("fieldEmployeeTag", language)}
                          </span>
                        ) : null}
                      </strong>
                      <small>{when(message.createdAt, language)}</small>
                    </div>
                    <p>{message.text}</p>
                  </article>
                )) : customerThread.conversation ? (
                  <div className="field-messages-empty">{t("fieldNoCustomerMessages", language)}</div>
                ) : !customerThread.error ? (
                  <div className="field-messages-empty">{t("fieldCustomerConversationUnavailable", language)}</div>
                ) : null}
              </div>
            )}

            {audience === "customer" && pendingCustomerSend ? (
              <div className="field-messages-pending-send" role="status" aria-live="polite">
                <div>
                  <strong>{t("fieldMessageSending", language)}</strong>
                  {pendingCustomerSend.phase === "countdown" ? (
                    <span>{t("fieldSendingInSeconds", language, { seconds: pendingCustomerSend.remainingSeconds })}</span>
                  ) : (
                    <span>{t("fieldSending", language)}</span>
                  )}
                </div>
                {pendingCustomerSend.phase === "countdown" ? (
                  <button type="button" onClick={undoPendingCustomerMessage}>
                    {t("fieldUndo", language)}
                  </button>
                ) : null}
              </div>
            ) : null}

            {audience === "customer" && customerNotice ? (
              <div className="field-messages-notice" role="status">{customerNotice}</div>
            ) : null}

            {audience === "customer" ? (
              <section className="field-messages-quick-updates" aria-label={t("fieldQuickCustomerUpdates", language)}>
                <p className="field-messages-eyebrow">{t("fieldQuickCustomerUpdates", language)}</p>
                <div>
                  {QUICK_CUSTOMER_UPDATES.map((quickUpdate) => (
                    <button
                      type="button"
                      key={quickUpdate.labelKey}
                      disabled={Boolean(pendingCustomerSend) || !customerThread.conversation}
                      onClick={() => updateDraft(t(quickUpdate.textKey, language))}
                    >
                      <MeetroIcon name="messages" size={15} decorative />
                      {t(quickUpdate.labelKey, language)}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <form
              className="field-messages-composer"
              style={{
                "--field-message-send-width": `${COMPACT_MESSAGE_COMPOSER.sendWidthPx}px`,
                "--field-message-send-min-width": `${COMPACT_MESSAGE_COMPOSER.sendMinWidthPx}px`,
                "--field-message-send-max-width": `${COMPACT_MESSAGE_COMPOSER.sendMaxWidthPx}px`,
                "--field-message-composer-gap": `${COMPACT_MESSAGE_COMPOSER.gapPx}px`,
              }}
              onSubmit={sendAuthority === "team" ? submitTeamMessage : submitCustomerMessage}
            >
              <label>
                <span>
                  {audience === "team"
                    ? t("fieldWriteMessagePlaceholder", language)
                    : t("fieldWriteCustomerMessage", language)}
                </span>
                <textarea
                  value={draft}
                  onPointerDown={() => {
                    audiencePointerIntent.current = "";
                  }}
                  onTouchStart={() => {
                    audiencePointerIntent.current = "";
                  }}
                  onChange={(event) => updateDraft(event.target.value)}
                  maxLength={5000}
                  rows={3}
                  placeholder={audience === "team"
                    ? t("fieldWriteMessagePlaceholder", language)
                    : t("fieldWriteCustomerMessage", language)}
                  disabled={!selected || Boolean(pendingCustomerSend) || (audience === "team" ? !selectedOperations : !customerThread.conversation)}
                />
              </label>
              <button
                type="submit"
                disabled={composerDisabled}
                aria-label={audience === "team"
                  ? t("fieldSendMessage", language)
                  : t("fieldSendToCustomer", language)}
              >
                <MeetroIcon name="messages" size={18} decorative />
                {working === audience
                  ? t("fieldSending", language)
                  : t("send", language)}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="field-messages-unavailable">
          <MeetroIcon name="messages" size={28} decorative />
          <h3>{t("fieldNoActiveAssignment", language)}</h3>
          <p>{t("fieldMessagesAssignmentUnavailable", language)}</p>
        </div>
      )}
    </section>
  );
}

function ProfileView({ membership, language }) {
  const businessName =
    membership.businessName || t("fieldYourBusiness", language);

  return (
    <div style={gridStyle}>
      <section
        style={{
          ...cardStyle,
          gridColumn: "1 / -1",
        }}
      >
        <p style={eyebrowStyle}>{t("fieldProfileTeamAccess", language)}</p>
        <h2 style={headingStyle}>{businessName}</h2>

        <dl style={definitionStyle}>
          <div>
            <dt>{t("fieldProfileRole", language)}</dt>
            <dd>{t("fieldEmployeeRole", language)}</dd>
          </div>
          <div>
            <dt>{t("fieldProfileAccess", language)}</dt>
            <dd>{t("fieldProfileAccessManaged", language)}</dd>
          </div>
          <div>
            <dt>{t("fieldProfileStatus", language)}</dt>
            <dd>{readable(membership.status, language, "ACTIVE")}</dd>
          </div>
        </dl>

        <div style={experienceSwitchCard}>
          <p style={eyebrowStyle}>{t("fieldUsingMeetroAs", language)}</p>

          <div style={experienceSwitchActions}>
            <button
              type="button"
              style={{
                ...experienceModeButton,
                ...experienceModeButtonActive,
              }}
              aria-pressed="true"
              disabled
            >
              {t("fieldWorkExperience", language, { businessName })}
            </button>

            <button
              type="button"
              style={experienceModeButton}
              aria-pressed="false"
              onClick={() =>
                requestTeamExperienceMode({
                  userId: membership.userId,
                  mode: "personal",
                })
              }
            >
              {t("fieldPersonalExperience", language)}
            </button>
          </div>

          <p style={copyStyle}>
            {t("fieldExperienceIdentityCopy", language)}
          </p>
        </div>

        <div style={languagePreferenceCard}>
          <div>
            <p style={eyebrowStyle}>{t("fieldLanguageTitle", language)}</p>
            <h3 style={languageHeadingStyle}>{t("fieldLanguageDescription", language)}</h3>
          </div>

          <div style={languageOptionsStyle} role="radiogroup" aria-label={t("fieldLanguageTitle", language)}>
            {SUPPORTED_LANGUAGES.map((option) => {
              const selected = option.code === language;
              return (
                <button
                  type="button"
                  key={option.code}
                  role="radio"
                  aria-checked={selected}
                  aria-label={
                    selected
                      ? t("fieldLanguageSelected", language, { language: option.label })
                      : option.label
                  }
                  style={{
                    ...languageOptionButton,
                    ...(selected ? languageOptionButtonActive : {}),
                  }}
                  onClick={() => setLanguage(option.code)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <p style={copyStyle}>
          {t("fieldBillingManaged", language)}
        </p>
      </section>
    </div>
  );
}

const cardStyle = { background: "#fff", border: "1px solid #dbe7de", borderRadius: 18, padding: 20, boxShadow: "0 10px 30px rgba(20,63,39,.06)", minWidth: 0 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14 };
const eyebrowStyle = { margin: "0 0 7px", color: "#5b7d66", fontSize: 12, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" };
const headingStyle = { margin: "0 0 9px", color: "#173f28", fontSize: 22 };
const copyStyle = { margin: "5px 0 12px", color: "#587060", lineHeight: 1.5 };
const rowStyle = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", padding: "14px 0", borderTop: "1px solid #e4ece6", flexWrap: "wrap" };
const textButton = { border: 0, background: "transparent", padding: 0, color: "#17623a", fontWeight: 800, textDecoration: "underline", cursor: "pointer" };
const lightButton = { minHeight: 43, border: 0, borderRadius: 11, padding: "10px 15px", background: "#fff", color: "#16562f", fontWeight: 800, cursor: "pointer" };
const errorStyle = { ...cardStyle, color: "#8b2e2e", background: "#fff4f2", marginBottom: 14 };
const definitionStyle = { display: "grid", gap: 10, margin: "18px 0", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" };
const experienceSwitchCard = {
  margin: "20px 0",
  padding: 16,
  border: "1px solid #dbe7de",
  borderRadius: 14,
  background: "#f7faf7",
};
const experienceSwitchActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 10,
};
const experienceModeButton = {
  minHeight: 42,
  border: "1px solid #bfd2c4",
  borderRadius: 10,
  padding: "9px 13px",
  background: "#fff",
  color: "#173f28",
  fontWeight: 800,
  cursor: "pointer",
};
const experienceModeButtonActive = {
  background: "#173f28",
  color: "#fff",
  borderColor: "#173f28",
};
const languagePreferenceCard = {
  margin: "20px 0",
  padding: 16,
  border: "1px solid #dbe7de",
  borderRadius: 14,
  background: "#f7faf7",
  display: "grid",
  gap: 14,
};
const languageHeadingStyle = {
  margin: 0,
  color: "#173f28",
  fontSize: 17,
  lineHeight: 1.4,
};
const languageOptionsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 9,
};
const languageOptionButton = {
  minHeight: 42,
  border: "1px solid #bfd2c4",
  borderRadius: 10,
  padding: "9px 13px",
  background: "#fff",
  color: "#173f28",
  fontWeight: 800,
  cursor: "pointer",
};
const languageOptionButtonActive = {
  background: "#173f28",
  color: "#fff",
  borderColor: "#173f28",
};
