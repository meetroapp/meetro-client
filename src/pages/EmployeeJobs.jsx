import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import EmployeeShell from "../components/EmployeeShell";
import MeetroIcon from "../components/MeetroIcon";
import useLanguage from "../hooks/useLanguage";
import { t } from "../utils/language";
import {
  fetchEmployeeJobs,
  fetchEmployeeSchedule,
  fetchManagedJobAssignments,
  updateJobAssignments,
} from "../utils/jobAssignmentApi";
import {
  fetchFieldOperations,
  sendFieldMessage,
  updateFieldStatus,
} from "../utils/fieldOperationsApi";
import {
  clockInTime,
  clockOutTime,
  fetchOwnTime,
  fetchTeamTime,
} from "../utils/timeEvidenceApi";
import { fetchBusinessTeam, fetchMyTeamAuthority } from "../utils/teamApi";

function routeValue(name) {
  try {
    const query = String(window.location.hash || "").split("?")[1] || "";
    return new URLSearchParams(query).get(name) || "";
  } catch {
    return "";
  }
}

function roleLabel(role, language) {
  if (role === "FIELD_EMPLOYEE") return t("fieldEmployeeRole", language);
  if (role === "BOOKKEEPER_FINANCE") return "Bookkeeper / Finance";
  if (role === "MANAGER") return "Manager";
  return role === "OWNER" ? "Owner" : role || "Team member";
}

function assignmentCommandKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `job-assignment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatSchedule(value, language) {
  if (!value) return t("fieldTimePending", language);
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? t("fieldTimePending", language)
    : new Intl.DateTimeFormat(language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function locationText(location, language) {
  const address = location?.address;
  if (address) {
    return [address.line1, address.city, address.region, address.postalCode]
      .filter(Boolean)
      .join(", ");
  }
  return location?.serviceArea || t("fieldServiceLocationPending", language);
}

function EmployeeJobs({ setPage, roleMembership = null }) {
  const language = useLanguage();
  const [authority, setAuthority] = useState(() => roleMembership ? { memberships: [roleMembership] } : null);
  const [workspace, setWorkspace] = useState(null);
  const [team, setTeam] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [selectedJobId, setSelectedJobId] = useState(() => routeValue("jobId"));
  const [loading, setLoading] = useState(true);
  const [workingJobId, setWorkingJobId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedMembership = useMemo(() => {
    const memberships = (authority?.memberships || []).filter(
      (item) => item.status === "ACTIVE"
    );
    const requestedBusinessId = Number(routeValue("businessId"));
    if (Number.isSafeInteger(requestedBusinessId) && requestedBusinessId > 0) {
      return memberships.find((item) => item.businessId === requestedBusinessId) || null;
    }
    return (
      memberships.find((item) => ["OWNER", "MANAGER"].includes(item.role)) ||
      memberships.find((item) => item.permissions?.includes("ASSIGNED_WORK")) ||
      memberships.find((item) => item.permissions?.includes("TIME_SELF_VIEW")) ||
      null
    );
  }, [authority]);

  const managementMode = ["OWNER", "MANAGER"].includes(selectedMembership?.role);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const mine = await fetchMyTeamAuthority(setPage);
      setAuthority(mine);
      const memberships = (mine.memberships || []).filter(
        (item) => item.status === "ACTIVE"
      );
      const requestedBusinessId = Number(routeValue("businessId"));
      const selected =
        (Number.isSafeInteger(requestedBusinessId) && requestedBusinessId > 0
          ? memberships.find((item) => item.businessId === requestedBusinessId)
          : null) ||
        memberships.find((item) => ["OWNER", "MANAGER"].includes(item.role)) ||
        memberships.find((item) => item.permissions?.includes("ASSIGNED_WORK")) ||
        memberships.find((item) => item.permissions?.includes("TIME_SELF_VIEW"));
      if (!selected) {
        setWorkspace(null);
        setTeam(null);
        setSchedule([]);
        return;
      }
      if (["OWNER", "MANAGER"].includes(selected.role)) {
        const [jobsResult, teamResult] = await Promise.all([
          fetchManagedJobAssignments(selected.businessId, setPage),
          fetchBusinessTeam(selected.businessId, setPage),
        ]);
        setWorkspace(jobsResult);
        setTeam(teamResult);
        setSchedule([]);
        setDrafts(
          Object.fromEntries(
            (jobsResult.jobs || []).map((job) => [
              job.id,
              (job.assignments || [])
                .filter(
                  (assignment) =>
                    assignment.state === "ACTIVE" &&
                    assignment.memberStatus === "ACTIVE" &&
                    ["MANAGER", "FIELD_EMPLOYEE"].includes(
                      assignment.memberRole
                    )
                )
                .map((assignment) => assignment.membershipId),
            ])
          )
        );
      } else if (selected.role === "BOOKKEEPER_FINANCE") {
        setWorkspace(null);
        setTeam(null);
        setSchedule([]);
      } else {
        const [jobsResult, scheduleResult] = await Promise.all([
          fetchEmployeeJobs(selected.businessId, setPage),
          fetchEmployeeSchedule(selected.businessId, setPage),
        ]);
        setWorkspace(jobsResult);
        setTeam(null);
        setSchedule(scheduleResult.schedule || []);
        setSelectedJobId((current) =>
          (jobsResult.jobs || []).some((job) => job.id === current)
            ? current
            : jobsResult.jobs?.[0]?.id || ""
        );
      }
    } catch (loadError) {
      setError(loadError.message || t("fieldJobsUnavailable", language));
    } finally {
      setLoading(false);
    }
  }, [language, setPage]);

  useEffect(() => {
    const timer = window.setTimeout(loadWorkspace, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  function toggleMember(jobId, membershipId) {
    setDrafts((current) => {
      const selected = new Set(current[jobId] || []);
      if (selected.has(membershipId)) selected.delete(membershipId);
      else selected.add(membershipId);
      return { ...current, [jobId]: [...selected] };
    });
  }

  async function saveAssignments(jobId) {
    if (!selectedMembership) return;
    setWorkingJobId(jobId);
    setError("");
    setNotice("");
    try {
      const result = await updateJobAssignments(
        jobId,
        {
          businessId: selectedMembership.businessId,
          membershipIds: drafts[jobId] || [],
          idempotencyKey: assignmentCommandKey(),
        },
        setPage
      );
      setNotice(
        result.events?.length
          ? "Assignment changes were recorded and the affected Team members were alerted."
          : "The exact assignment set was already current."
      );
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError.message || "Assignments could not be updated.");
    } finally {
      setWorkingJobId("");
    }
  }

  const assignableMembers = (team?.members || []).filter(
    (member) =>
      member.status === "ACTIVE" &&
      ["MANAGER", "FIELD_EMPLOYEE"].includes(member.role)
  );
  const selectedJob = (workspace?.jobs || []).find(
    (job) => job.id === selectedJobId
  );
  const selfAssignedJob = managementMode
    ? (workspace?.jobs || []).find((job) =>
        (job.assignments || []).some((assignment) =>
          assignment.state === "ACTIVE" && assignment.membershipId === selectedMembership?.id
        )
      )
    : selectedJob;
  const selfAssignment = (selfAssignedJob?.assignments || []).find((assignment) =>
    assignment.state === "ACTIVE" && assignment.membershipId === selectedMembership?.id
  ) || selfAssignedJob?.assignments?.[0] || null;

  const workspaceContent = (
    <>
      {error && <div role="alert" style={errorStyle}>{error}</div>}
      {notice && <div role="status" style={noticeStyle}>{notice}</div>}

      {loading ? (
        <div role="status" style={cardStyle}>
          {selectedMembership?.role === "FIELD_EMPLOYEE"
            ? t("fieldJobsLoading", language)
            : "Loading server-owned Job authority…"}
        </div>
      ) : !selectedMembership ? (
        <section style={cardStyle}>
          <h2 style={headingStyle}>No field workspace authority</h2>
          <p style={copyStyle}>
            This account does not have an active Owner, Manager, or Field Employee membership.
          </p>
        </section>
      ) : selectedMembership.role === "BOOKKEEPER_FINANCE" ? (
        <>
          <section style={cardStyle}>
            <h2 style={headingStyle}>Time records</h2>
            <p style={copyStyle}>Bookkeeper / Finance has read-only Team time visibility and no Job dispatch or field-status authority.</p>
          </section>
          <TeamTimePanel businessId={selectedMembership.businessId} setPage={setPage} />
        </>
      ) : managementMode ? (
        <>
          <ManagerWorkspace
            jobs={workspace?.jobs || []}
            members={assignableMembers}
            drafts={drafts}
            workingJobId={workingJobId}
            onToggle={toggleMember}
            onSave={saveAssignments}
            businessId={selectedMembership.businessId}
            setPage={setPage}
          />
          <TeamTimePanel businessId={selectedMembership.businessId} setPage={setPage} />
        </>
      ) : (
        <>
          <FieldWorkspace
            jobs={workspace?.jobs || []}
            schedule={schedule}
            selectedJob={selectedJob}
            onSelect={setSelectedJobId}
            businessId={selectedMembership.businessId}
            setPage={setPage}
          />
          <TimeEvidencePanel
            businessId={selectedMembership.businessId}
            job={selfAssignedJob}
            assignment={selfAssignment}
            setPage={setPage}
          />
        </>
      )}
    </>
  );

  if (selectedMembership?.role === "FIELD_EMPLOYEE") {
    return (
      <EmployeeShell
        membership={selectedMembership}
        currentPage="employeeJobs"
        setPage={setPage}
        title={t("fieldNavMyJobs", language)}
        description={t("fieldMyJobsDescription", language)}
      >
        {workspaceContent}
      </EmployeeShell>
    );
  }

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page" style={pageStyle}>
      <BusinessToolsPageHeader
        title={managementMode ? "Job Assignments" : "My Jobs"}
        description={
          managementMode
            ? "Assign exact Team members to exact Jobs with durable history."
            : "Only work assigned to your active Team membership appears here."
        }
        categoryLabel="Team Operations"
        onBack={() => setPage("teamMembers")}
      />

      {workspaceContent}

      <BottomNav setPage={setPage} currentPage="employeeJobs" />
    </div>
  );
}

function ManagerWorkspace({ jobs, members, drafts, workingJobId, onToggle, onSave, businessId, setPage }) {
  if (!jobs.length) {
    return <section style={cardStyle}><h2 style={headingStyle}>No eligible Jobs</h2><p style={copyStyle}>No active Job owned by this exact business is available for assignment.</p></section>;
  }
  return (
    <div style={listStyle}>
      {jobs.map((job) => (
        <section key={job.id} style={cardStyle}>
          <div style={rowStyle}>
            <div>
              <p style={eyebrowStyle}>Job</p>
              <h2 style={headingStyle}>{job.title}</h2>
              <p style={copyStyle}>{job.customer?.displayName} · {locationText(job.location)}</p>
            </div>
            <span style={pillStyle}>{(drafts[job.id] || []).length} assigned</span>
          </div>
          {members.length ? (
            <fieldset style={fieldsetStyle}>
              <legend style={legendStyle}>Assigned Team members</legend>
              {members.map((member) => (
                <label key={member.id} style={checkRowStyle}>
                  <input
                    type="checkbox"
                    checked={(drafts[job.id] || []).includes(member.id)}
                    onChange={() => onToggle(job.id, member.id)}
                  />
                  <span><strong>{member.displayName || member.email}</strong><small style={smallStyle}>{roleLabel(member.role)}</small></span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p style={copyStyle}>Invite an active Manager or Field Employee before assigning this Job.</p>
          )}
          <div style={actionRowStyle}>
            <button
              type="button"
              style={primaryButton}
              disabled={workingJobId === job.id}
              onClick={() => onSave(job.id)}
            >
              {workingJobId === job.id ? "Recording…" : "Save exact assignments"}
            </button>
          </div>
          {(job.assignments || []).some((item) => item.state === "UNASSIGNED") && (
            <details style={historyStyle}>
              <summary>Assignment history</summary>
              {(job.assignments || []).map((item) => (
                <p key={item.id} style={historyRowStyle}>
                  {item.memberName || item.memberEmail} · {item.state.toLowerCase()} · v{item.version}
                </p>
              ))}
            </details>
          )}
          {(job.assignments || [])
            .filter((item) => item.state === "ACTIVE" && item.memberStatus === "ACTIVE" && item.memberRole === "FIELD_EMPLOYEE")
            .map((assignment) => (
              <FieldOperationsPanel
                key={assignment.id}
                businessId={businessId}
                job={job}
                assignment={assignment}
                managed
                setPage={setPage}
              />
            ))}
        </section>
      ))}
    </div>
  );
}

function FieldWorkspace({
  jobs,
  schedule,
  selectedJob,
  onSelect,
  businessId,
  setPage,
}) {
  const language = useLanguage();
  const [currentStatus, setCurrentStatus] = useState(null);

  useEffect(() => {
    setCurrentStatus(null);
  }, [selectedJob?.id]);

  if (!jobs.length) {
    return (
      <section className="employee-jobs-empty">
        <span
          className="employee-jobs-empty-icon"
          aria-hidden="true"
        >
          <MeetroIcon
            name="businessTools"
            size={36}
            decorative
          />
        </span>

        <h2>{t("fieldNoAssignedJobs", language)}</h2>

        <p>
          {t("fieldNoAssignedJobsCopy", language)}
        </p>
      </section>
    );
  }

  const assignments = selectedJob?.assignments || [];
  const activeAssignment =
    assignments.find((item) => item.state === "ACTIVE") ||
    assignments[0] ||
    null;

  return (
    <div className="employee-jobs-workspace">
      <section
        className="employee-jobs-summary-grid"
        aria-label={t("fieldAssignedJobs", language)}
      >
        <article className="employee-jobs-summary-card">
          <span
            className="employee-jobs-summary-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="businessTools"
              size={27}
              decorative
            />
          </span>

          <div>
            <p>{t("fieldAssignedJobs", language)}</p>
            <strong>{jobs.length}</strong>
          </div>
        </article>

        <article className="employee-jobs-summary-card">
          <span
            className="employee-jobs-summary-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="schedule"
              size={27}
              decorative
            />
          </span>

          <div>
            <p>{t("fieldScheduledVisitsLabel", language)}</p>
            <strong>{schedule.length}</strong>
          </div>
        </article>

        <article className="employee-jobs-summary-card">
          <span
            className="employee-jobs-summary-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="profile"
              size={27}
              decorative
            />
          </span>

          <div>
            <p>{t("fieldCurrentStatus", language)}</p>
            <strong>
              {selectedJob
                ? currentStatus
                  ? readableStatus(currentStatus, language)
                  : t("fieldLoading", language)
                : t("fieldNoJobSelected", language)}
            </strong>
          </div>
        </article>
      </section>

      {jobs.length > 1 && (
        <section className="employee-jobs-selector">
          <div>
            <p className="employee-jobs-eyebrow">
              {t("fieldAssignedWork", language)}
            </p>
            <h2>{t("fieldSelectJob", language)}</h2>
          </div>

          <div className="employee-jobs-selector-grid">
            {jobs.map((job) => (
              <button
                type="button"
                key={job.id}
                className={
                  job.id === selectedJob?.id
                    ? "employee-jobs-selector-button is-selected"
                    : "employee-jobs-selector-button"
                }
                onClick={() => onSelect(job.id)}
              >
                <strong>{job.title}</strong>
                <span>
                  {job.customer?.displayName ||
                    t("fieldCustomerUnavailable", language)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedJob && (
        <div className="employee-jobs-primary-grid">
          <section className="employee-jobs-assignment-card">
            <div className="employee-jobs-assignment-header">
              <div>
                <p className="employee-jobs-eyebrow">
                  {t("fieldCurrentAssignment", language)}
                </p>

                <div className="employee-jobs-customer-row">
                  <span
                    className="employee-jobs-round-icon"
                    aria-hidden="true"
                  >
                    <MeetroIcon
                      name="profile"
                      size={24}
                      decorative
                    />
                  </span>

                  <div>
                    <h2>
                      {selectedJob.customer?.displayName ||
                        t("fieldCustomerUnavailable", language)}
                    </h2>

                    <p>
                      <MeetroIcon
                        name="location"
                        size={14}
                        decorative
                      />
                      {locationText(selectedJob.location, language)}
                    </p>
                  </div>
                </div>
              </div>

              <span className="employee-jobs-status-pill">
                {currentStatus
                  ? readableStatus(currentStatus, language)
                  : t("fieldLoadingStatus", language)}
              </span>
            </div>

            <div className="employee-jobs-detail-block">
              <span
                className="employee-jobs-round-icon"
                aria-hidden="true"
              >
                <MeetroIcon
                  name="activeWork"
                  size={25}
                  decorative
                />
              </span>

              <div>
                <p className="employee-jobs-detail-label">
                  {t("fieldJob", language)}
                </p>
                <h3>{selectedJob.title}</h3>
              </div>
            </div>

            <div className="employee-jobs-detail-block">
              <span
                className="employee-jobs-round-icon"
                aria-hidden="true"
              >
                <MeetroIcon
                  name="messages"
                  size={24}
                  decorative
                />
              </span>

              <div>
                <p className="employee-jobs-detail-label">
                  {t("fieldInstructions", language)}
                </p>

                <p className="employee-jobs-detail-copy">
                  {selectedJob.instructions ||
                    t("fieldNoInstructions", language)}
                </p>
              </div>
            </div>

            <div className="employee-jobs-scope">
              <p className="employee-jobs-detail-label">
                {t("fieldApprovedWork", language)}
              </p>

              {selectedJob.approvedScope?.length ? (
                <ul>
                  {selectedJob.approvedScope.map((item) => (
                    <li key={item.id}>
                      <span
                        className="employee-jobs-scope-check"
                        aria-hidden="true"
                      >
                        <MeetroIcon
                          name="completion"
                          size={16}
                          decorative
                        />
                      </span>

                      <span>
                        <strong>{item.description}</strong>
                        {item.quantity != null && (
                          <small>
                            {t("fieldQuantity", language, { quantity: item.quantity })}
                          </small>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="employee-jobs-detail-copy">
                  {t("fieldNoApprovedWork", language)}
                </p>
              )}
            </div>

            <details className="employee-jobs-evidence">
              <summary>
                {t("fieldPhotosDocuments", language)}
              </summary>

              <div className="employee-jobs-evidence-section">
                <p className="employee-jobs-detail-label">
                  {t("fieldJobPhotos", language)}
                </p>

                {selectedJob.photos?.length ? (
                  <div className="employee-jobs-photo-grid">
                    {selectedJob.photos.map((photo) => (
                      <img
                        key={photo.publicId || photo.url}
                        src={photo.url}
                        alt={t("fieldJobEvidenceAlt", language)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="employee-jobs-detail-copy">
                    {t("fieldNoJobPhotos", language)}
                  </p>
                )}
              </div>

              <div className="employee-jobs-evidence-section">
                <p className="employee-jobs-detail-label">
                  {t("fieldDocuments", language)}
                </p>

                {selectedJob.documents?.length ? (
                  selectedJob.documents.map((document) => (
                    <div
                      key={document.id}
                      className="employee-jobs-document-row"
                    >
                      <strong>{t("fieldApprovedQuote", language)}</strong>
                      <span>
                        {t("fieldDocumentVersion", language, {
                          version: document.version,
                          status: readableStatus(document.status, language),
                        })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="employee-jobs-detail-copy">
                    {t("fieldNoApprovedDocument", language)}
                  </p>
                )}
              </div>
            </details>

            {activeAssignment && (
              <FieldOperationsPanel
                businessId={businessId}
                job={selectedJob}
                assignment={activeAssignment}
                managed={false}
                setPage={setPage}
                onStatusChange={setCurrentStatus}
              />
            )}
          </section>

          <aside className="employee-jobs-history-card">
            <p className="employee-jobs-eyebrow">
              {t("fieldAssignmentHistory", language)}
            </p>

            <h2>{t("fieldAssignmentDetails", language)}</h2>

            {assignments.length ? (
              <div className="employee-jobs-history-list">
                {assignments.map((item, index) => (
                  <article
                    key={item.id}
                    className="employee-jobs-history-item"
                  >
                    <span
                      className={
                        item.state === "ACTIVE"
                          ? "employee-jobs-history-dot is-active"
                          : "employee-jobs-history-dot"
                      }
                      aria-hidden="true"
                    >
                      {item.state === "ACTIVE" && (
                        <MeetroIcon
                          name="completion"
                          size={15}
                          decorative
                        />
                      )}
                    </span>

                    <div>
                      <strong>
                        {item.state === "ACTIVE"
                          ? t("fieldCurrentAssignment", language)
                          : readableStatus(item.state, language)}
                      </strong>

                      <span>
                        {item.memberName ||
                          item.memberEmail ||
                          t("fieldTeamMember", language)}
                      </span>

                      <small>
                        {item.state === "ACTIVE"
                          ? t("fieldAssignedAt", language, {
                              time: formatSchedule(item.assignedAt, language),
                            })
                          : t("fieldUpdatedAt", language, {
                              time: formatSchedule(
                                item.changedAt || item.assignedAt,
                                language
                              ),
                            })}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="employee-jobs-detail-copy">
                {t("fieldNoAssignmentHistory", language)}
              </p>
            )}

            <div className="employee-jobs-history-note">
              <MeetroIcon
                name="jobHistory"
                size={20}
                decorative
              />

              <span>
                {t("fieldProgressSeparate", language)}
              </span>
            </div>
          </aside>
        </div>
      )}

      <section className="employee-jobs-schedule-card">
        <div className="employee-jobs-section-heading">
          <span
            className="employee-jobs-round-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="schedule"
              size={24}
              decorative
            />
          </span>

          <div>
            <p className="employee-jobs-eyebrow">
              {t("fieldSchedule", language)}
            </p>
            <h2>{t("fieldUpcomingVisits", language)}</h2>
          </div>
        </div>

        {schedule.length ? (
          <div className="employee-jobs-schedule-list">
            {schedule.map((item) => (
              <article
                key={item.visitId}
                className="employee-jobs-schedule-row"
              >
                <div>
                  <strong>{item.jobTitle}</strong>

                  <p>
                    {readableStatus(item.purpose, language)} ·{" "}
                    {readableStatus(item.state, language)}
                  </p>
                </div>

                <div className="employee-jobs-schedule-time">
                  <strong>
                    {formatSchedule(item.startsAt, language)}
                  </strong>

                  <span>
                    {item.location?.remote
                      ? t("fieldRemote", language)
                      : locationText(item.location, language)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="employee-jobs-detail-copy">
            {t("fieldNoVisitsScheduled", language)}
          </p>
        )}
      </section>
    </div>
  );
}

const FIELD_STATUS_KEYS = Object.freeze({
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
});

function readableStatus(value, language) {
  const key = FIELD_STATUS_KEYS[String(value || "ASSIGNED").toUpperCase()];
  if (key) return t(key, language);
  return String(value || "ASSIGNED")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function operationKey(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function FieldOperationsPanel({
  businessId,
  job,
  assignment,
  managed,
  setPage,
  onStatusChange = null,
}) {
  const language = useLanguage();
  const [operations, setOperations] = useState(null);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchFieldOperations(
        job.id,
        { businessId, assignmentId: assignment.id, managed },
        setPage
      );
      setOperations(result.operations);
      onStatusChange?.(
        result.operations?.currentStatus || "ASSIGNED"
      );
    } catch (loadError) {
      setError(loadError.message || t("fieldUpdatesUnavailable", language));
    } finally {
      setLoading(false);
    }
  }, [
    assignment.id,
    businessId,
    job.id,
    managed,
    language,
    onStatusChange,
    setPage,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function advanceStatus() {
    if (!operations?.nextStatus || managed) return;
    setWorking("status");
    setError("");
    try {
      const result = await updateFieldStatus(job.id, {
        businessId,
        assignmentId: assignment.id,
        toStatus: operations.nextStatus,
        note: note.trim() || null,
        idempotencyKey: operationKey("field-status"),
      }, setPage);
      setOperations(result.operations);
      onStatusChange?.(
        result.operations?.currentStatus || "ASSIGNED"
      );
      setNote("");
    } catch (statusError) {
      setError(statusError.message || t("fieldStatusUpdateFailed", language));
    } finally {
      setWorking("");
    }
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    setWorking("message");
    setError("");
    try {
      await sendFieldMessage(job.id, {
        businessId,
        assignmentId: assignment.id,
        message: message.trim(),
        idempotencyKey: operationKey("field-message"),
      }, { managed, setPage });
      setMessage("");
      await load();
    } catch (messageError) {
      setError(messageError.message || t("fieldMessageSendFailed", language));
    } finally {
      setWorking("");
    }
  }

  if (!managed) {
    const currentStatus =
      operations?.currentStatus || "ASSIGNED";
    const nextStatus = operations?.nextStatus || null;

    return (
      <section
        className="employee-field-ops"
        aria-label={t("fieldOperationsAria", language)}
      >
        <div className="employee-field-ops-header">
          <div>
            <p className="employee-jobs-eyebrow">
              {t("fieldJobProgress", language)}
            </p>

            <h3>{t("fieldUpdateProgressTitle", language)}</h3>

            <p>
              {t("fieldKeepTeamInformed", language)}
            </p>
          </div>

          <span className="employee-field-ops-status">
            <span aria-hidden="true" />
            {readableStatus(currentStatus, language)}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="employee-field-ops-error"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            role="status"
            className="employee-field-ops-loading"
          >
            {t("fieldLoadingUpdates", language)}
          </div>
        ) : (
          <>
            <div className="employee-field-progress-card">
              <span
                className="employee-field-progress-icon"
                aria-hidden="true"
              >
                <MeetroIcon
                  name="activeWork"
                  size={27}
                  decorative
                />
              </span>

              <div className="employee-field-progress-copy">
                <span>{t("fieldCurrentStatus", language)}</span>
                <strong>
                  {readableStatus(currentStatus, language)}
                </strong>

                {nextStatus && (
                  <small>
                    {t("fieldNextStatus", language, {
                      status: readableStatus(nextStatus, language),
                    })}
                  </small>
                )}
              </div>
            </div>

            {nextStatus ? (
              <div className="employee-field-next-action">
                <div className="employee-field-action-heading">
                  <div>
                    <p className="employee-jobs-detail-label">
                      {t("fieldNextStep", language)}
                    </p>

                    <h4>
                      {t("fieldMarkStatus", language, {
                        status: readableStatus(nextStatus, language),
                      })}
                    </h4>
                  </div>

                  <MeetroIcon
                    name="completion"
                    size={24}
                    decorative
                  />
                </div>

                <label className="employee-field-note">
                  <span>{t("fieldOptionalNote", language)}</span>

                  <input
                    value={note}
                    onChange={(event) =>
                      setNote(event.target.value)
                    }
                    maxLength={1000}
                    placeholder={t("fieldOptionalNotePlaceholder", language)}
                  />
                </label>

                <button
                  type="button"
                  className="employee-field-primary-action"
                  disabled={working === "status"}
                  onClick={advanceStatus}
                >
                  <MeetroIcon
                    name="completion"
                    size={19}
                    decorative
                  />

                  {working === "status"
                    ? t("fieldRecording", language)
                    : t("fieldMarkStatus", language, {
                        status: readableStatus(nextStatus, language),
                      })}
                </button>
              </div>
            ) : (
              <div
                role="status"
                className="employee-field-complete"
              >
                <MeetroIcon
                  name="completion"
                  size={22}
                  decorative
                />

                <span>
                  {t("fieldWorkMarkedComplete", language)}
                </span>
              </div>
            )}

            <section className="employee-field-comms">
              <div className="employee-field-comms-heading">
                <span
                  className="employee-field-comms-icon"
                  aria-hidden="true"
                >
                  <MeetroIcon
                    name="messages"
                    size={25}
                    decorative
                  />
                </span>

                <div>
                  <p className="employee-jobs-detail-label">
                    {t("fieldTeamMessages", language)}
                  </p>
                  <h4>{t("fieldMessageYourTeam", language)}</h4>
                  <span>
                    {t("fieldCustomersDoNotReceive", language)}
                  </span>
                </div>
              </div>

              {assignment.state === "ACTIVE" &&
                (!assignment.memberStatus || assignment.memberStatus === "ACTIVE") &&
                (!assignment.memberRole || assignment.memberRole === "FIELD_EMPLOYEE") && (
                  <div className="employee-field-message-hub-actions">
                    <button
                      type="button"
                      onClick={() => setPage(
                        `employeeMessages?businessId=${businessId}&jobId=${encodeURIComponent(job.id)}&audience=team`
                      )}
                    >
                      {t("fieldOpenTeamMessages", language)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(
                        `employeeMessages?businessId=${businessId}&jobId=${encodeURIComponent(job.id)}&audience=customer`
                      )}
                    >
                      {t("fieldOpenCustomerMessages", language)}
                    </button>
                  </div>
                )}

              <div
                className="employee-field-message-list"
                aria-label={t("fieldInternalMessagesAria", language)}
              >
                {(operations?.messages || []).length ? (
                  operations.messages.map((item) => (
                    <article
                      key={item.id}
                      className="employee-field-message"
                    >
                      <div className="employee-field-message-header">
                        <strong>{item.senderName}</strong>

                        <span>
                          {roleLabel(item.senderRole, language)} ·{" "}
                          {formatSchedule(item.createdAt, language)}
                        </span>
                      </div>

                      <p>{item.message}</p>
                    </article>
                  ))
                ) : (
                  <div className="employee-field-no-messages">
                    <MeetroIcon
                      name="messages"
                      size={22}
                      decorative
                    />
                    <span>{t("fieldNoTeamMessages", language)}</span>
                  </div>
                )}
              </div>

              <form
                onSubmit={submitMessage}
                className="employee-field-message-form"
              >
                <label>
                  <span>{t("fieldWriteMessage", language)}</span>

                  <textarea
                    value={message}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                    maxLength={5000}
                    rows={3}
                    placeholder={t("fieldWriteMessagePlaceholder", language)}
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    !message.trim() ||
                    working === "message"
                  }
                >
                  <MeetroIcon
                    name="messages"
                    size={18}
                    decorative
                  />

                  {working === "message"
                    ? t("fieldSending", language)
                    : t("fieldSendMessage", language)}
                </button>
              </form>
            </section>
          </>
        )}
      </section>
    );
  }

  return (
    <div style={operationsStyle}>
      <div style={rowStyle}>
        <div>
          <p style={eyebrowStyle}>Field operations · {assignment.memberName || "Field Employee"}</p>
          <h3 style={detailTitleStyle}>Status and internal Job communication</h3>
        </div>
        <span style={pillStyle}>{readableStatus(operations?.currentStatus)}</span>
      </div>
      {error && <div role="alert" style={inlineErrorStyle}>{error}</div>}
      {loading ? <p style={detailCopyStyle}>Loading field evidence…</p> : (
        <>
          {!managed && operations?.nextStatus && (
            <div style={statusActionStyle}>
              <label style={fieldLabelStyle}>
                Optional update note
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  style={textInputStyle}
                  placeholder="Add a short operational note"
                />
              </label>
              <button type="button" style={primaryButton} disabled={working === "status"} onClick={advanceStatus}>
                {working === "status" ? "Recording…" : `Mark ${readableStatus(operations.nextStatus)}`}
              </button>
            </div>
          )}
          {!managed && !operations?.nextStatus && (
            <p role="status" style={completeStyle}>Field work has been reported complete. Business and customer completion remain separate.</p>
          )}
          <div style={messageListStyle} aria-label="Internal Job messages">
            {(operations?.messages || []).length ? operations.messages.map((item) => (
              <article key={item.id} style={messageStyle}>
                <strong>{item.senderName}</strong>
                <span style={messageMetaStyle}>{roleLabel(item.senderRole)} · {formatSchedule(item.createdAt)}</span>
                <p style={messageTextStyle}>{item.message}</p>
              </article>
            )) : <p style={detailCopyStyle}>No internal Job messages yet.</p>}
          </div>
          <form onSubmit={submitMessage} style={messageFormStyle}>
            <label style={fieldLabelStyle}>
              Message {managed ? assignment.memberName || "Field Employee" : "the business Team"}
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={5000}
                rows={3}
                style={textareaStyle}
                placeholder="Internal Job communication only — customers do not receive this message"
              />
            </label>
            <button type="submit" style={primaryButton} disabled={!message.trim() || working === "message"}>
              {working === "message" ? "Sending…" : "Send internal message"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

const TIME_CATEGORY_LABEL_KEYS = Object.freeze({
  JOB_WORK: "fieldTimeJobWork",
  DRIVING: "fieldTimeDriving",
  OFFICE: "fieldTimeOffice",
  SUPPLIES: "fieldTimeSupplies",
  BREAK: "fieldTimeBreak",
  GENERAL: "fieldTimeGeneral",
});

const TIME_CATEGORY_META = Object.freeze({
  JOB_WORK: {
    icon: "activeWork",
    descriptionKey: "fieldTimeJobWorkDescription",
  },
  DRIVING: {
    icon: "onTheWay",
    descriptionKey: "fieldTimeDrivingDescription",
  },
  OFFICE: {
    icon: "businessDashboard",
    descriptionKey: "fieldTimeOfficeDescription",
  },
  SUPPLIES: {
    icon: "materials",
    descriptionKey: "fieldTimeSuppliesDescription",
  },
  BREAK: {
    icon: "jobHistory",
    descriptionKey: "fieldTimeBreakDescription",
  },
  GENERAL: {
    icon: "settings",
    descriptionKey: "fieldTimeGeneralDescription",
  },
});

function timeCategoryLabel(value, language) {
  const key = TIME_CATEGORY_LABEL_KEYS[value];
  return key ? t(key, language) : value;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${remainder}s`;
}

function sessionDuration(session, now = Date.now()) {
  if (session?.durationSeconds != null) return Number(session.durationSeconds);
  const started = new Date(session?.clockedInAt).getTime();
  return Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
}

function formatTimerClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  return [hours, minutes, remainder]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function boundaryLocation(requested) {
  if (!requested) return Promise.resolve({ status: "NOT_REQUESTED" });
  if (!navigator.geolocation) return Promise.resolve({ status: "UNAVAILABLE" });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        status: "CAPTURED",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      (error) => resolve({ status: error?.code === 1 ? "DENIED" : "UNAVAILABLE" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export function TimeEvidencePanel({
  businessId,
  job,
  assignment,
  setPage,
  variant = "compact",
}) {
  const language = useLanguage();
  const [time, setTime] = useState(null);
  const [category, setCategory] = useState(() => job && assignment ? "JOB_WORK" : "GENERAL");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    try {
      setError("");
      setTime(await fetchOwnTime(businessId, setPage));
    } catch (loadError) {
      setError(loadError.message || t("fieldTimeUnavailable", language));
    }
  }, [businessId, language, setPage]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!time?.activeSession) return undefined;
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [time?.activeSession]);

  async function clockIn() {
    setWorking(true);
    setError("");
    try {
      const location = await boundaryLocation(includeLocation);
      await clockInTime({
        businessId,
        category,
        jobId: category === "JOB_WORK" ? job.id : null,
        assignmentId: category === "JOB_WORK" ? assignment.id : null,
        location,
        idempotencyKey: operationKey("clock-in"),
      }, setPage);
      await load();
    } catch (clockError) {
      setError(clockError.message || t("fieldClockInFailed", language));
    } finally {
      setWorking(false);
    }
  }

  async function clockOut() {
    if (!time?.activeSession) return;
    setWorking(true);
    setError("");
    try {
      const location = await boundaryLocation(includeLocation);
      await clockOutTime({
        businessId,
        sessionId: time.activeSession.id,
        location,
        idempotencyKey: operationKey("clock-out"),
      }, setPage);
      await load();
    } catch (clockError) {
      setError(clockError.message || t("fieldClockOutFailed", language));
    } finally {
      setWorking(false);
    }
  }

  const active = time?.activeSession;
  const jobWorkAvailable = Boolean(job?.id && assignment?.id);
  const visibleCategory = active?.category || category;
  const visibleDuration = active
    ? formatTimerClock(sessionDuration(active, now))
    : "00:00:00";

  if (variant === "full") {
    return (
      <div className="employee-time-page">
        <section
          className="employee-time-hero"
          aria-label={t("fieldCurrentTimerAria", language)}
        >
          <p className="employee-time-label">
            {t("fieldCurrentTimer", language)}
          </p>

          <span
            className="employee-time-clock-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="jobHistory"
              size={37}
              decorative
            />
          </span>

          <h2>
            {active
              ? timeCategoryLabel(active.category, language)
              : t("fieldNotClockedIn", language)}
          </h2>

          <div
            className="employee-time-clock"
            aria-live="polite"
          >
            {visibleDuration}
          </div>

          <p className="employee-time-hero-copy">
            {active
              ? active.jobTitle ||
                t("fieldStartedAt", language, {
                  time: formatSchedule(active.clockedInAt, language),
                })
              : t("fieldChooseThenClockIn", language)}
          </p>

          <button
            type="button"
            className={
              active
                ? "employee-time-clock-button employee-time-clock-button--out"
                : "employee-time-clock-button"
            }
            disabled={
              working ||
              (!active &&
                category === "JOB_WORK" &&
                !jobWorkAvailable)
            }
            onClick={active ? clockOut : clockIn}
          >
            <MeetroIcon
              name="jobHistory"
              size={22}
              decorative
            />
            {working
              ? t("fieldRecording", language)
              : active
              ? t("fieldClockOut", language)
              : t("fieldClockIn", language)}
          </button>
        </section>

        <section className="employee-time-categories">
          <p className="employee-time-label">
            {t("fieldTimeCategory", language)}
          </p>

          <h2>{t("fieldChooseWorkActivity", language)}</h2>

          <p className="employee-time-section-copy">
            {t("fieldChooseWorkActivityCopy", language)}
          </p>

          <div
            className="employee-time-category-grid"
            role="radiogroup"
            aria-label={t("fieldTimeCategory", language)}
          >
            {Object.entries(TIME_CATEGORY_LABEL_KEYS).map(
              ([value, labelKey]) => {
                const selected =
                  visibleCategory === value;

                const unavailable =
                  value === "JOB_WORK" &&
                  !jobWorkAvailable;

                const meta =
                  TIME_CATEGORY_META[value];

                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={
                      Boolean(active) ||
                      unavailable
                    }
                    className={[
                      "employee-time-category",
                      selected
                        ? "is-selected"
                        : "",
                      unavailable
                        ? "is-unavailable"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setCategory(value)
                    }
                  >
                    {selected && (
                      <span
                        className="employee-time-category-check"
                        aria-hidden="true"
                      >
                        <MeetroIcon
                          name="completion"
                          size={18}
                          decorative
                        />
                      </span>
                    )}

                    <span
                      className="employee-time-category-icon"
                      aria-hidden="true"
                    >
                      <MeetroIcon
                        name={meta.icon}
                        size={31}
                        decorative
                      />
                    </span>

                    <strong>{t(labelKey, language)}</strong>

                    <small>
                      {unavailable
                        ? t("fieldAssignedJobNeeded", language)
                        : t(meta.descriptionKey, language)}
                    </small>
                  </button>
                );
              }
            )}
          </div>

          {!active &&
            category === "JOB_WORK" &&
            !jobWorkAvailable && (
              <p className="employee-time-job-warning">
                {t("fieldSelectAssignedJobWarning", language)}
              </p>
            )}
        </section>

        <section className="employee-time-location">
          <div className="employee-time-location-main">
            <span
              className="employee-time-location-icon"
              aria-hidden="true"
            >
              <MeetroIcon
                name="location"
                size={29}
                decorative
              />
            </span>

            <div>
              <p className="employee-time-label">
                {t("fieldLocationOptional", language)}
              </p>

              <h2>{t("fieldAddLocation", language)}</h2>

              <p className="employee-time-section-copy">
                {t("fieldAddLocationCopy", language)}
              </p>
            </div>
          </div>

          <label className="employee-time-location-toggle">
            <input
              type="checkbox"
              checked={includeLocation}
              onChange={(event) =>
                setIncludeLocation(
                  event.target.checked
                )
              }
            />

            <span
              className="employee-time-switch"
              aria-hidden="true"
            >
              <span />
            </span>

            <small>
              {includeLocation
                ? t("fieldLocationOn", language)
                : t("fieldLocationOff", language)}
            </small>
          </label>
        </section>

        {error && (
          <div
            role="alert"
            className="employee-time-error"
          >
            {error}
          </div>
        )}

        <details className="employee-time-history">
          <summary>
            <span
              className="employee-time-history-icon"
              aria-hidden="true"
            >
              <MeetroIcon
                name="jobHistory"
                size={27}
                decorative
              />
            </span>

            <span className="employee-time-history-copy">
              <strong>{t("fieldTimeHistory", language)}</strong>
              <small>
                {t("fieldTimeHistoryCopy", language)}
              </small>
            </span>

            <span
              className="employee-time-history-arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </summary>

          <div className="employee-time-history-list">
            {(time?.sessions || []).length ? (
              time.sessions.map((session) => (
                <TimeRow
                  key={session.id}
                  session={session}
                  now={now}
                />
              ))
            ) : (
              <p style={detailCopyStyle}>
                {t("fieldNoTimeRecorded", language)}
              </p>
            )}
          </div>
        </details>

        <div className="employee-time-authority">
          <span
            className="employee-time-authority-icon"
            aria-hidden="true"
          >
            <MeetroIcon
              name="complianceCenter"
              size={26}
              decorative
            />
          </span>

          <div>
            <strong>
              {t("fieldOfficialTimeCopy", language)}
            </strong>
            <span>
              {t("fieldClockOutDoesNotComplete", language)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className="employee-compact-time"
      aria-label={t("fieldClockInOutAria", language)}
    >
      <div className="employee-compact-time-header">
        <div>
          <p className="employee-jobs-eyebrow">
            {t("fieldTimeTracking", language)}
          </p>

          <h3>{t("fieldCurrentTimer", language)}</h3>

          <span className="employee-compact-time-authority">
            {t("fieldTrackTimeForJob", language)}
          </span>
        </div>

        <button
          type="button"
          className="employee-compact-time-open"
          onClick={() => setPage("employeeTime")}
        >
          {t("fieldOpenTime", language)}
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="employee-field-ops-error"
        >
          {error}
        </div>
      )}

      <div className="employee-compact-time-main">
        <span
          className={
            active
              ? "employee-compact-clock-icon is-active"
              : "employee-compact-clock-icon"
          }
          aria-hidden="true"
        >
          <MeetroIcon
            name="jobHistory"
            size={31}
            decorative
          />
        </span>

        <div className="employee-compact-time-state">
          <span>
            {active
              ? timeCategoryLabel(active.category, language)
              : t("fieldNotClockedIn", language)}
          </span>

          <strong aria-live="polite">
            {visibleDuration}
          </strong>

          <small>
            {active
              ? active.jobTitle ||
                t("fieldStartedAt", language, {
                  time: formatSchedule(active.clockedInAt, language),
                })
              : category === "JOB_WORK" &&
                jobWorkAvailable
              ? job?.title || t("fieldAssignedJob", language)
              : t("fieldCategoryTime", language, {
                  category: timeCategoryLabel(category, language),
                })}
          </small>
        </div>

        <button
          type="button"
          className={
            active
              ? "employee-compact-clock-action is-clocked-in"
              : "employee-compact-clock-action"
          }
          disabled={
            working ||
            (!active &&
              category === "JOB_WORK" &&
              !jobWorkAvailable)
          }
          onClick={active ? clockOut : clockIn}
        >
          <MeetroIcon
            name="jobHistory"
            size={19}
            decorative
          />

          {working
            ? t("fieldRecording", language)
            : active
            ? t("fieldClockOut", language)
            : t("fieldClockIn", language)}
        </button>
      </div>

      <div className="employee-compact-time-footer">
        <div className="employee-compact-time-category">
          <span>{t("fieldTimeCategory", language)}</span>

          <strong>
            {timeCategoryLabel(visibleCategory, language)}
          </strong>

          {!active && (
            <button
              type="button"
              onClick={() => setPage("employeeTime")}
            >
              {t("fieldChangeCategory", language)}
            </button>
          )}
        </div>

        <label className="employee-compact-location">
          <input
            type="checkbox"
            checked={includeLocation}
            onChange={(event) =>
              setIncludeLocation(event.target.checked)
            }
          />

          <span
            className="employee-compact-switch"
            aria-hidden="true"
          >
            <span />
          </span>

          <span>
            {t("fieldAddLocationCompact", language)}
          </span>
        </label>
      </div>

      {!active &&
        category === "JOB_WORK" &&
        !jobWorkAvailable && (
          <p className="employee-time-job-warning">
            {t("fieldSelectAssignedJobWarning", language)}
          </p>
        )}

      <div className="employee-compact-time-note">
        <MeetroIcon
          name="complianceCenter"
          size={18}
          decorative
        />

        <span>
          {t("fieldCompactTimeAuthority", language)}
        </span>
      </div>
    </section>
  );

}

function TimeRow({ session, now }) {
  const language = useLanguage();
  return (
    <article style={timeRowStyle}>
      <div>
        <strong>{session.employeeName || t("fieldTeamMember", language)} · {timeCategoryLabel(session.category, language)}</strong>
        <p style={rowMetaStyle}>{session.jobTitle || t("fieldNoJobRequired", language)}</p>
      </div>
      <div style={scheduleTimeStyle}>
        <strong>{formatDuration(sessionDuration(session, now))}</strong>
        <span>{formatSchedule(session.clockedInAt, language)} → {session.clockedOutAt ? formatSchedule(session.clockedOutAt, language) : t("fieldSessionActive", language)}</span>
      </div>
    </article>
  );
}

function TeamTimePanel({ businessId, setPage }) {
  const [time, setTime] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchTeamTime(businessId, setPage)
      .then((result) => { if (!cancelled) setTime(result); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message || "Team time is unavailable."); });
    return () => { cancelled = true; };
  }, [businessId, setPage]);

  useEffect(() => {
    if (!(time?.sessions || []).some((session) => !session.clockedOutAt)) return undefined;
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [time?.sessions]);

  return (
    <section style={cardStyle} aria-label="Team time evidence">
      <p style={eyebrowStyle}>Operations</p>
      <h2 style={headingStyle}>Team time evidence</h2>
      <p style={copyStyle}>Read-only operational records. Payroll, wages, taxes, and customer billing are not calculated here.</p>
      {error && <div role="alert" style={inlineErrorStyle}>{error}</div>}
      {!time ? <p style={detailCopyStyle}>Loading governed Team time…</p> : time.sessions.length ? (
        <div style={timeListStyle}>{time.sessions.map((session) => <TimeRow key={session.id} session={session} now={now} />)}</div>
      ) : <p style={detailCopyStyle}>No Team time has been recorded yet.</p>}
    </section>
  );
}

function Fact({ label, value }) {
  return <div style={factStyle}><span style={eyebrowStyle}>{label}</span><strong>{value || "Not available"}</strong></div>;
}

function DetailSection({ title, children }) {
  return <div style={detailSectionStyle}><h3 style={detailTitleStyle}>{title}</h3>{children}</div>;
}

const pageStyle = { paddingBottom: 96 };
const cardStyle = { background: "#fff", border: "1px solid #dce8df", borderRadius: 18, padding: 22, margin: "16px 0", boxShadow: "0 10px 30px rgba(20,63,39,.06)" };
const listStyle = { display: "grid", gap: 16 };
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const eyebrowStyle = { color: "#607568", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 6px" };
const headingStyle = { color: "#143f27", margin: "0 0 8px", fontSize: 22 };
const copyStyle = { color: "#52675a", margin: "0 0 16px", lineHeight: 1.5 };
const pillStyle = { padding: "8px 11px", borderRadius: 999, background: "#e7f4e9", color: "#1d6035", fontWeight: 800, fontSize: 13 };
const fieldsetStyle = { border: 0, padding: 0, margin: "12px 0", display: "grid", gap: 8 };
const legendStyle = { fontWeight: 800, color: "#294c37", marginBottom: 8 };
const checkRowStyle = { display: "flex", alignItems: "center", gap: 10, padding: 12, border: "1px solid #e1eae3", borderRadius: 12, color: "#234b32" };
const smallStyle = { display: "block", color: "#64776b", marginTop: 3 };
const actionRowStyle = { display: "flex", justifyContent: "flex-end", marginTop: 12 };
const primaryButton = { minHeight: 44, border: 0, borderRadius: 11, padding: "10px 16px", background: "#125d34", color: "#fff", fontWeight: 800, cursor: "pointer" };
const historyStyle = { marginTop: 16, color: "#52675a" };
const historyRowStyle = { margin: "8px 0", fontSize: 13 };
const jobTabGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 };
const jobButton = { display: "grid", gap: 5, textAlign: "left", padding: 14, border: "1px solid #d7e5db", borderRadius: 12, background: "#fbfdfb", color: "#234b32", cursor: "pointer" };
const selectedJobButton = { ...jobButton, background: "#e7f4e9", borderColor: "#86b793" };
const factsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, margin: "16px 0" };
const factStyle = { padding: 14, borderRadius: 12, background: "#f4f8f5", display: "grid", gap: 4, color: "#234b32" };
const detailSectionStyle = { borderTop: "1px solid #e1eae3", paddingTop: 18, marginTop: 18 };
const detailTitleStyle = { color: "#234b32", margin: "0 0 10px", fontSize: 17 };
const detailCopyStyle = { color: "#52675a", margin: 0, lineHeight: 1.55 };
const scopeListStyle = { margin: 0, paddingLeft: 22, display: "grid", gap: 10, color: "#294c37" };
const photoGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 };
const photoStyle = { width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 12, border: "1px solid #dbe7de" };
const documentRowStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: 13, background: "#f4f8f5", borderRadius: 12, color: "#294c37" };
const scheduleRowStyle = { display: "flex", justifyContent: "space-between", gap: 14, padding: "14px 0", borderTop: "1px solid #e1eae3", flexWrap: "wrap", color: "#294c37" };
const rowMetaStyle = { margin: "4px 0 0", color: "#64776b", fontSize: 13, textTransform: "capitalize" };
const scheduleTimeStyle = { display: "grid", gap: 4, textAlign: "right", color: "#52675a", fontSize: 13 };
const noticeStyle = { ...cardStyle, background: "#edf8ef", color: "#1a5d31", borderColor: "#b9d9c0" };
const errorStyle = { ...cardStyle, background: "#fff4f2", color: "#8b2e2e", borderColor: "#e7beb8" };
const operationsStyle = { borderTop: "1px solid #d7e5db", marginTop: 20, paddingTop: 20 };
const statusActionStyle = { display: "flex", alignItems: "flex-end", gap: 12, margin: "14px 0", flexWrap: "wrap" };
const fieldLabelStyle = { display: "grid", gap: 7, color: "#294c37", fontWeight: 700, flex: "1 1 260px" };
const textInputStyle = { minHeight: 42, border: "1px solid #cbdacf", borderRadius: 10, padding: "9px 11px", color: "#183c27", background: "#fff" };
const textareaStyle = { ...textInputStyle, minHeight: 82, resize: "vertical", fontFamily: "inherit" };
const completeStyle = { padding: 12, borderRadius: 10, background: "#edf8ef", color: "#1a5d31", lineHeight: 1.5 };
const messageListStyle = { display: "grid", gap: 8, maxHeight: 320, overflowY: "auto", margin: "16px 0" };
const messageStyle = { padding: 12, border: "1px solid #e1eae3", borderRadius: 11, background: "#fbfdfb", color: "#294c37" };
const messageMetaStyle = { display: "block", color: "#64776b", fontSize: 12, marginTop: 3 };
const messageTextStyle = { margin: "8px 0 0", whiteSpace: "pre-wrap", lineHeight: 1.45 };
const messageFormStyle = { display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" };
const inlineErrorStyle = { padding: 10, borderRadius: 9, background: "#fff4f2", color: "#8b2e2e", margin: "10px 0" };
const timePanelStyle = { ...cardStyle };
const timerActionStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", margin: "16px 0" };
const activeTimerStyle = { ...pillStyle, fontVariantNumeric: "tabular-nums", fontSize: 16 };
const locationOptionStyle = { display: "flex", alignItems: "center", gap: 9, color: "#52675a", fontSize: 13, margin: "10px 0" };
const timeRowStyle = { display: "flex", justifyContent: "space-between", gap: 14, padding: "12px 0", borderTop: "1px solid #e1eae3", flexWrap: "wrap", color: "#294c37" };
const timeListStyle = { display: "grid" };

export default EmployeeJobs;
