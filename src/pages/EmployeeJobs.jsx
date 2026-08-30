import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
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
import { fetchBusinessTeam, fetchMyTeamAuthority } from "../utils/teamApi";

function routeValue(name) {
  try {
    const query = String(window.location.hash || "").split("?")[1] || "";
    return new URLSearchParams(query).get(name) || "";
  } catch {
    return "";
  }
}

function roleLabel(role) {
  if (role === "FIELD_EMPLOYEE") return "Field Employee";
  if (role === "BOOKKEEPER_FINANCE") return "Bookkeeper / Finance";
  if (role === "MANAGER") return "Manager";
  return role === "OWNER" ? "Owner" : role || "Team member";
}

function assignmentCommandKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `job-assignment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatSchedule(value) {
  if (!value) return "Time pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time pending"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function locationText(location) {
  const address = location?.address;
  if (address) {
    return [address.line1, address.city, address.region, address.postalCode]
      .filter(Boolean)
      .join(", ");
  }
  return location?.serviceArea || "Service location is available when confirmed.";
}

function EmployeeJobs({ setPage }) {
  const [authority, setAuthority] = useState(null);
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
        memberships.find((item) => item.permissions?.includes("ASSIGNED_WORK"));
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
      setError(loadError.message || "The employee workspace is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [setPage]);

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

      {error && <div role="alert" style={errorStyle}>{error}</div>}
      {notice && <div role="status" style={noticeStyle}>{notice}</div>}

      {loading ? (
        <div role="status" style={cardStyle}>Loading server-owned Job authority…</div>
      ) : !selectedMembership ? (
        <section style={cardStyle}>
          <h2 style={headingStyle}>No field workspace authority</h2>
          <p style={copyStyle}>
            This account does not have an active Owner, Manager, or Field Employee membership.
          </p>
        </section>
      ) : selectedMembership.role === "BOOKKEEPER_FINANCE" ? (
        <section style={cardStyle}>
          <h2 style={headingStyle}>Field work is not part of this role</h2>
          <p style={copyStyle}>Bookkeeper / Finance authority does not grant Job assignment or field access.</p>
        </section>
      ) : managementMode ? (
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
      ) : (
        <FieldWorkspace
          jobs={workspace?.jobs || []}
          schedule={schedule}
          selectedJob={selectedJob}
          onSelect={setSelectedJobId}
          businessId={selectedMembership.businessId}
          setPage={setPage}
        />
      )}

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

function FieldWorkspace({ jobs, schedule, selectedJob, onSelect, businessId, setPage }) {
  if (!jobs.length) {
    return <section style={cardStyle}><h2 style={headingStyle}>No assigned Jobs</h2><p style={copyStyle}>When an Owner or Manager assigns work to you, it will appear here.</p></section>;
  }
  return (
    <>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Assigned work</p>
        <div style={jobTabGrid}>
          {jobs.map((job) => (
            <button
              type="button"
              key={job.id}
              style={job.id === selectedJob?.id ? selectedJobButton : jobButton}
              onClick={() => onSelect(job.id)}
            >
              <strong>{job.title}</strong>
              <span>{job.customer?.displayName}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedJob && (
        <section style={cardStyle}>
          <p style={eyebrowStyle}>Assigned Job</p>
          <h2 style={headingStyle}>{selectedJob.title}</h2>
          <div style={factsGrid}>
            <Fact label="Customer" value={selectedJob.customer?.displayName} />
            <Fact label="Service location" value={locationText(selectedJob.location)} />
          </div>
          <DetailSection title="Instructions">
            <p style={detailCopyStyle}>{selectedJob.instructions || "No additional Job instructions were recorded."}</p>
          </DetailSection>
          <DetailSection title="Approved work scope">
            {selectedJob.approvedScope?.length ? (
              <ol style={scopeListStyle}>
                {selectedJob.approvedScope.map((item) => (
                  <li key={item.id}><strong>{item.description}</strong><span>Quantity {item.quantity}</span></li>
                ))}
              </ol>
            ) : <p style={detailCopyStyle}>No customer-approved scope is currently attached.</p>}
          </DetailSection>
          <DetailSection title="Job photos">
            {selectedJob.photos?.length ? (
              <div style={photoGridStyle}>
                {selectedJob.photos.map((photo) => (
                  <img key={photo.publicId || photo.url} src={photo.url} alt="Job evidence" style={photoStyle} />
                ))}
              </div>
            ) : <p style={detailCopyStyle}>No Job photos are currently attached.</p>}
          </DetailSection>
          <DetailSection title="Documents">
            {selectedJob.documents?.length ? selectedJob.documents.map((document) => (
              <div key={document.id} style={documentRowStyle}>
                <strong>Approved Quote</strong>
                <span>Version {document.version} · {document.status}</span>
              </div>
            )) : <p style={detailCopyStyle}>No approved Job document is currently available.</p>}
          </DetailSection>
          {selectedJob.assignments?.[0] && (
            <FieldOperationsPanel
              businessId={businessId}
              job={selectedJob}
              assignment={selectedJob.assignments[0]}
              managed={false}
              setPage={setPage}
            />
          )}
        </section>
      )}

      <section style={cardStyle}>
        <p style={eyebrowStyle}>Employee Schedule</p>
        <h2 style={headingStyle}>Assigned visits</h2>
        {schedule.length ? schedule.map((item) => (
          <article key={item.visitId} style={scheduleRowStyle}>
            <div><strong>{item.jobTitle}</strong><p style={rowMetaStyle}>{item.purpose.replaceAll("_", " ")} · {item.state}</p></div>
            <div style={scheduleTimeStyle}><strong>{formatSchedule(item.startsAt)}</strong><span>{item.location?.remote ? "Remote" : locationText(item.location)}</span></div>
          </article>
        )) : <p style={copyStyle}>No active Visit is scheduled for your assigned Jobs.</p>}
      </section>
    </>
  );
}

function readableStatus(value) {
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

function FieldOperationsPanel({ businessId, job, assignment, managed, setPage }) {
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
    } catch (loadError) {
      setError(loadError.message || "Field updates are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [assignment.id, businessId, job.id, managed, setPage]);

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
      setNote("");
    } catch (statusError) {
      setError(statusError.message || "Field status could not be updated.");
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
      setError(messageError.message || "The internal Job message could not be sent.");
    } finally {
      setWorking("");
    }
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

export default EmployeeJobs;
