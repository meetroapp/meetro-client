import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeShell from "../components/EmployeeShell";
import MeetroIcon from "../components/MeetroIcon";
import useLanguage from "../hooks/useLanguage";
import { TimeEvidencePanel } from "./EmployeeJobs";
import { fetchEmployeeJobs, fetchEmployeeSchedule } from "../utils/jobAssignmentApi";
import {
  fetchFieldOperations,
  sendFieldMessage,
} from "../utils/fieldOperationsApi";
import {
  fetchFieldCustomerConversation,
  sendFieldCustomerMessage,
} from "../utils/fieldCustomerCommunicationApi";
import { fetchOwnTime } from "../utils/timeEvidenceApi";
import {
  requestTeamExperienceMode,
} from "../utils/teamExperienceMode";
import {
  setLanguage,
  SUPPORTED_LANGUAGES,
  t,
} from "../utils/language";

const VIEW_META = Object.freeze({
  home: { page: "employeeHome", titleKey: "fieldNavHome", descriptionKey: "fieldHomeDescription" },
  schedule: { page: "employeeSchedule", titleKey: "fieldNavSchedule", descriptionKey: "fieldScheduleDescription" },
  time: { page: "employeeTime", titleKey: "fieldNavTime", descriptionKey: "fieldTimeDescription" },
  messages: { page: "employeeMessages", titleKey: "fieldNavMessages", descriptionKey: "fieldMessagesDescription" },
  profile: { page: "employeeProfile", titleKey: "fieldNavProfile", descriptionKey: "fieldProfileDescription" },
});

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

function routeValue(name) {
  try {
    const query = String(window.location.hash || "").split("?")[1] || "";
    return new URLSearchParams(query).get(name) || "";
  } catch {
    return "";
  }
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

export default function EmployeePortal({ membership, setPage, view = "home" }) {
  const language = useLanguage();
  const meta = VIEW_META[view] || VIEW_META.home;
  const businessId = membership?.businessId;
  const [workspace, setWorkspace] = useState({ jobs: [], schedule: [], operations: [], time: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError("");
    try {
      const [jobsResult, scheduleResult, timeResult] = await Promise.all([
        fetchEmployeeJobs(businessId, setPage),
        fetchEmployeeSchedule(businessId, setPage),
        fetchOwnTime(businessId, setPage),
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
            setPage
          );
          return { job, assignment, operations: result.operations };
        } catch {
          return { job, assignment, operations: null };
        }
      }));
      setWorkspace({ jobs, schedule: scheduleResult.schedule || [], operations, time: timeResult });
    } catch (loadError) {
      setError(loadError.message || t("fieldWorkspaceUnavailable", language));
    } finally {
      setLoading(false);
    }
  }, [businessId, language, setPage]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const current = workspace.operations.find((item) => item.operations?.currentStatus !== "FIELD_WORK_COMPLETED") || workspace.operations[0] || null;
  const recentMessage = useMemo(() => workspace.operations
    .flatMap((item) => (item.operations?.messages || []).map((message) => ({ ...message, job: item.job })))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null, [workspace.operations]);

  return (
    <EmployeeShell membership={membership} currentPage={meta.page} setPage={setPage} title={t(meta.titleKey, language)} description={t(meta.descriptionKey, language)}>
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
        />
      )}
    </EmployeeShell>
  );
}

function PortalView({ view, membership, workspace, current, recentMessage, setPage, language }) {
  if (view === "schedule") return <ScheduleView schedule={workspace.schedule} language={language} />;
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

function ScheduleView({ schedule, language }) {
  return <section style={cardStyle}><p style={eyebrowStyle}>{t("fieldAssignedVisits", language)}</p><h2 style={headingStyle}>{t("fieldMySchedule", language)}</h2>{schedule.length ? schedule.map((item) => <article key={item.visitId} style={rowStyle}><div><strong>{item.jobTitle}</strong><p style={copyStyle}>{readable(item.purpose, language)} · {readable(item.state, language)}</p></div><div><strong>{when(item.startsAt, language)}</strong><p style={copyStyle}>{item.location?.remote ? t("fieldRemote", language) : locationText(item.location, language)}</p></div></article>) : <p style={copyStyle}>{t("fieldNoActiveVisitScheduled", language)}</p>}</section>;
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

function MessagesView({ operations, setPage, membership, language }) {
  const eligibleJobs = useMemo(
    () => operations.filter(hasActiveMessageAssignment),
    [operations]
  );
  const requestedJobId = routeValue("jobId");
  const routedJob = eligibleJobs.find((item) => item.job.id === requestedJobId);
  const requestedAudience = routeValue("audience");
  const routedAudience = ["team", "customer"].includes(requestedAudience)
    ? requestedAudience
    : "team";
  const [selectedJobId, setSelectedJobId] = useState(
    () => routedJob?.job.id || eligibleJobs[0]?.job.id || ""
  );
  const [audience, setAudience] = useState(
    () => (routedJob ? routedAudience : "team")
  );
  const [drafts, setDrafts] = useState({});
  const [customerCommandKeys, setCustomerCommandKeys] = useState({});
  const [teamOperations, setTeamOperations] = useState({});
  const [customerThreads, setCustomerThreads] = useState({});
  const [working, setWorking] = useState("");

  const selected = eligibleJobs.find((item) => item.job.id === selectedJobId) || null;
  const selectedOperations = selected
    ? teamOperations[selectedJobId] || selected.operations
    : null;
  const customerThread = customerThreads[selectedJobId] || {};
  const draftKey = selectedJobId ? `${selectedJobId}:${audience}` : "";
  const draft = drafts[draftKey] || "";

  useEffect(() => {
    if (eligibleJobs.some((item) => item.job.id === selectedJobId)) return;
    setSelectedJobId(eligibleJobs[0]?.job.id || "");
    setAudience("team");
  }, [eligibleJobs, selectedJobId]);

  useEffect(() => {
    if (audience !== "customer" || !selected) return undefined;
    let active = true;
    const assignmentId = selected.assignment.id;
    setCustomerThreads((current) => ({
      ...current,
      [selectedJobId]: {
        ...current[selectedJobId],
        loading: true,
        error: "",
      },
    }));
    fetchFieldCustomerConversation(
      selected.job.id,
      { businessId: membership.businessId, assignmentId },
      setPage
    ).then((result) => {
      if (!active) return;
      setCustomerThreads((current) => ({
        ...current,
        [selectedJobId]: {
          loading: false,
          error: "",
          conversation: result.conversation || null,
        },
      }));
    }).catch(() => {
      if (!active) return;
      setCustomerThreads((current) => ({
        ...current,
        [selectedJobId]: {
          loading: false,
          error: t("fieldCustomerConversationUnavailable", language),
          conversation: null,
        },
      }));
    });
    return () => {
      active = false;
    };
  }, [audience, language, membership.businessId, selected, selectedJobId, setPage]);

  function updateRoute(jobId, nextAudience) {
    setPage(
      `employeeMessages?businessId=${membership.businessId}&jobId=${encodeURIComponent(jobId)}&audience=${nextAudience}`
    );
  }

  function selectJob(jobId) {
    if (!eligibleJobs.some((item) => item.job.id === jobId)) return;
    setSelectedJobId(jobId);
    updateRoute(jobId, audience);
  }

  function selectAudience(nextAudience) {
    if (!selected || !["team", "customer"].includes(nextAudience)) return;
    setAudience(nextAudience);
    updateRoute(selected.job.id, nextAudience);
  }

  function updateDraft(value) {
    if (!draftKey) return;
    setDrafts((current) => ({ ...current, [draftKey]: value }));
    if (audience === "customer") {
      setCustomerCommandKeys((current) => ({
        ...current,
        [selectedJobId]: "",
      }));
    }
  }

  async function submitTeamMessage(event) {
    event.preventDefault();
    if (!selected || !selectedOperations || !draft.trim()) return;
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

  async function submitCustomerMessage(event) {
    event.preventDefault();
    if (!selected || !customerThread.conversation || !draft.trim()) return;
    setWorking("customer");
    const idempotencyKey =
      customerCommandKeys[selectedJobId] ||
      messageCommandKey("field-customer-message");
    setCustomerCommandKeys((current) => ({
      ...current,
      [selectedJobId]: idempotencyKey,
    }));
    try {
      const result = await sendFieldCustomerMessage(
        selected.job.id,
        {
          businessId: membership.businessId,
          assignmentId: selected.assignment.id,
          message: draft.trim(),
          idempotencyKey,
        },
        setPage
      );
      const conversation = result.conversation || (
        await fetchFieldCustomerConversation(
          selected.job.id,
          {
            businessId: membership.businessId,
            assignmentId: selected.assignment.id,
          },
          setPage
        )
      ).conversation;
      setCustomerThreads((current) => ({
        ...current,
        [selected.job.id]: {
          loading: false,
          error: "",
          conversation: conversation || null,
        },
      }));
      updateDraft("");
      setCustomerCommandKeys((current) => ({
        ...current,
        [selected.job.id]: "",
      }));
    } catch {
      setCustomerThreads((current) => ({
        ...current,
        [selected.job.id]: {
          ...current[selected.job.id],
          loading: false,
          error: t("fieldCustomerMessageFailed", language),
        },
      }));
    } finally {
      setWorking("");
    }
  }

  const teamMessages = selectedOperations?.messages || [];
  const customerMessages = customerThread.conversation?.messages || [];
  const composerDisabled =
    !selected ||
    !draft.trim() ||
    Boolean(working) ||
    (audience === "team"
      ? !selectedOperations
      : !customerThread.conversation || customerThread.loading);

  return (
    <section className="field-messages-workspace">
      <header className="field-messages-header">
        <div>
          <p className="field-messages-eyebrow">{t("fieldMessagesHub", language)}</p>
          <h2>{t("fieldMessagesTitle", language)}</h2>
          <p>{t("fieldMessagesHubCopy", language)}</p>
        </div>
        <div
          className="field-messages-audience"
          role="group"
          aria-label={t("fieldMessageAudience", language)}
        >
          {[
            ["team", "fieldAudienceTeam"],
            ["customer", "fieldAudienceCustomer"],
          ].map(([value, key]) => (
            <button
              type="button"
              key={value}
              className={audience === value ? "is-active" : ""}
              aria-pressed={audience === value}
              disabled={!selected}
              onClick={() => selectAudience(value)}
            >
              {t(key, language)}
            </button>
          ))}
        </div>
      </header>

      {eligibleJobs.length ? (
        <div className="field-messages-layout">
          <aside className="field-messages-jobs" aria-label={t("fieldAssignedJob", language)}>
            <p className="field-messages-eyebrow">{t("fieldAssignedJob", language)}</p>
            <h3>{t("fieldSelectJob", language)}</h3>
            <div className="field-messages-job-list">
              {eligibleJobs.map((item) => (
                <button
                  type="button"
                  key={item.job.id}
                  className={item.job.id === selectedJobId ? "is-selected" : ""}
                  aria-pressed={item.job.id === selectedJobId}
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

          <div className="field-messages-thread-card">
            <div className="field-messages-thread-heading">
              <div>
                <p className="field-messages-eyebrow">
                  {audience === "team"
                    ? t("fieldTeamMessages", language)
                    : t("fieldCustomerMessages", language)}
                </p>
                <h3>{selected?.job.title}</h3>
                <span>
                  {selected?.job.customer?.displayName || t("fieldCustomerUnavailable", language)}
                </span>
              </div>
              <button
                type="button"
                className="field-messages-open-job"
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
              <div className="field-messages-thread" aria-label={t("fieldInternalMessagesAria", language)}>
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
              <div className="field-messages-thread" aria-label={t("fieldCustomerMessages", language)}>
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
                      <strong>{customerAuthor(message, language)}</strong>
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

            <form
              className="field-messages-composer"
              onSubmit={audience === "team" ? submitTeamMessage : submitCustomerMessage}
            >
              <label>
                <span>
                  {audience === "team"
                    ? t("fieldWriteMessagePlaceholder", language)
                    : t("fieldWriteCustomerMessage", language)}
                </span>
                <textarea
                  value={draft}
                  onChange={(event) => updateDraft(event.target.value)}
                  maxLength={5000}
                  rows={3}
                  placeholder={audience === "team"
                    ? t("fieldWriteMessagePlaceholder", language)
                    : t("fieldWriteCustomerMessage", language)}
                  disabled={!selected || (audience === "team" ? !selectedOperations : !customerThread.conversation)}
                />
              </label>
              <button type="submit" disabled={composerDisabled}>
                <MeetroIcon name="messages" size={18} decorative />
                {working === audience
                  ? t("fieldSending", language)
                  : audience === "team"
                    ? t("fieldSendMessage", language)
                    : t("fieldSendToCustomer", language)}
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
