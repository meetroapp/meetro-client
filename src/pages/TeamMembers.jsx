import { useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import MeetroIcon from "../components/MeetroIcon";
import { getHiringOpenPositions } from "../utils/hiringCenterRegistry";
import { getLanguage, t } from "../utils/language";
import { upsertNotification } from "../utils/meetroNotifications";
import {
  TEAM_MEMBER_STATUSES,
  TEAM_MEMBER_TYPES,
  archiveTeamMember,
  createTeamMember,
  deactivateTeamMember,
  getActiveTeamBusinessId,
  listTeamMembers,
  reactivateTeamMember,
  updateTeamMember,
} from "../utils/teamMembers";
import { getRuntimeHiringQaOptions } from "../utils/hiringFixtureGate";

function emptyDraft() {
  return {
    displayName: "",
    email: "",
    phone: "",
    positionId: "",
    positionTitle: "",
    role: "",
    memberType: "employee",
    status: "active",
    hireDate: "",
    notes: "",
  };
}

function TeamMembers({ setPage }) {
  const language = getLanguage();
  const businessId = getActiveTeamBusinessId();
  const accountMode = localStorage.getItem("activeAccountMode") || "business";
  const qaOptions = getRuntimeHiringQaOptions(localStorage);
  const [members, setMembers] = useState(() => listTeamMembers({ businessId, ...qaOptions }));
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMemberId, setSelectedMemberId] = useState(() => {
    const memberId = localStorage.getItem("selectedTeamMemberId") || "";
    localStorage.removeItem("selectedTeamMemberId");
    return memberId;
  });
  const [editor, setEditor] = useState(null);
  const [editorErrors, setEditorErrors] = useState({});
  const positions = getHiringOpenPositions({ businessId, ...qaOptions });
  const selectedMember = members.find((member) => member.id === selectedMemberId) || null;
  const visibleMembers = members.filter(
    (member) => statusFilter === "all" || member.status === statusFilter
  );

  function refreshMembers(nextSelectedId = selectedMemberId) {
    setMembers(listTeamMembers({ businessId, ...qaOptions }));
    setSelectedMemberId(nextSelectedId);
  }

  function openAddMember() {
    setEditorErrors({});
    setEditor({ mode: "create", draft: emptyDraft() });
  }

  function openEditMember(member) {
    setEditorErrors({});
    setEditor({ mode: "edit", memberId: member.id, draft: { ...member } });
  }

  function saveMember(draft) {
    const options = {
      businessId,
      accountMode,
      onNotification: upsertNotification,
    };
    const result = editor?.mode === "edit"
      ? updateTeamMember(editor.memberId, draft, options)
      : createTeamMember(draft, options);

    if (!result.ok) {
      setEditorErrors(result.errors || {});
      return;
    }

    setEditor(null);
    setEditorErrors({});
    refreshMembers(result.member.id);
  }

  function applyLifecycle(action, member) {
    const options = {
      businessId,
      accountMode,
      onNotification: upsertNotification,
    };
    const result = action(member.id, options);
    if (result.ok) refreshMembers(member.id);
  }

  if (selectedMember) {
    return (
      <TeamMemberShell
        setPage={setPage}
        title={selectedMember.displayName}
        subtitle={selectedMember.positionTitle}
        onBack={() => setSelectedMemberId("")}
        backLabel={t("teamMembersBack", language)}
      >
        <article className="team-member-detail meetro-visual-surface">
          <div className="team-member-identity">
            <MemberAvatar member={selectedMember} />
            <div>
              <span className={`team-member-status status-${selectedMember.status}`}>
                {t(`teamMemberStatus${capitalize(selectedMember.status)}`, language)}
              </span>
              <h2>{selectedMember.displayName}</h2>
              <p>{selectedMember.role || selectedMember.positionTitle}</p>
            </div>
          </div>

          <div className="team-member-detail-grid">
            <DetailSection title={t("teamMemberIdentity", language)}>
              <Detail label={t("teamMemberName", language)} value={selectedMember.displayName} />
              <Detail label={t("teamMemberType", language)} value={t(`teamMemberType${capitalize(selectedMember.memberType)}`, language)} />
            </DetailSection>
            <DetailSection title={t("teamMemberRole", language)}>
              <Detail label={t("teamMemberRole", language)} value={selectedMember.role} />
            </DetailSection>
            <DetailSection title={t("teamMemberPosition", language)}>
              <Detail label={t("teamMemberPosition", language)} value={selectedMember.positionTitle} />
            </DetailSection>
            <DetailSection title={t("teamMemberContact", language)}>
              <Detail label={t("teamMemberEmail", language)} value={selectedMember.email} />
              <Detail label={t("teamMemberPhone", language)} value={selectedMember.phone} />
            </DetailSection>
            <DetailSection title={t("teamMemberEmployment", language)}>
              <Detail label={t("teamMemberHireDate", language)} value={formatDate(selectedMember.hireDate, language)} />
              <Detail label={t("teamMemberStatus", language)} value={t(`teamMemberStatus${capitalize(selectedMember.status)}`, language)} />
            </DetailSection>
            <DetailSection title={t("teamMemberNotes", language)}>
              <p>{selectedMember.notes || t("teamMemberNoNotes", language)}</p>
            </DetailSection>
          </div>

          <div className="team-member-actions">
            <button type="button" className="meetro-visual-primary-button" onClick={() => openEditMember(selectedMember)}>
              {t("teamMemberEdit", language)}
            </button>
            {selectedMember.status === "active" && (
              <button type="button" onClick={() => applyLifecycle(deactivateTeamMember, selectedMember)}>
                {t("teamMemberDeactivate", language)}
              </button>
            )}
            {["inactive", "archived"].includes(selectedMember.status) && (
              <button type="button" onClick={() => applyLifecycle(reactivateTeamMember, selectedMember)}>
                {t("teamMemberReactivate", language)}
              </button>
            )}
            {selectedMember.status !== "archived" && (
              <button type="button" className="team-member-archive" onClick={() => applyLifecycle(archiveTeamMember, selectedMember)}>
                {t("teamMemberArchive", language)}
              </button>
            )}
          </div>
        </article>

        {editor && (
          <TeamMemberEditor
            key={`${editor.mode}-${editor.memberId || "new"}`}
            editor={editor}
            errors={editorErrors}
            positions={positions}
            language={language}
            onSave={saveMember}
            onClose={() => setEditor(null)}
          />
        )}
      </TeamMemberShell>
    );
  }

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page team-members-page">
      <BusinessToolsPageHeader
        title={t("teamMembers", language)}
        description={t("teamMembersSubtitle", language)}
        categoryLabel={t("teamMembersEyebrow", language)}
        backLabel={t("backToBusinessTools", language)}
        onBack={() => setPage("businessCommandCenter")}
      />

      <section className="team-members-toolbar meetro-visual-surface">
        <div>
          <strong>{members.filter((member) => member.status === "active").length}</strong>
          <span>{t("teamMembersActiveCount", language)}</span>
        </div>
        <button type="button" className="meetro-visual-primary-button" onClick={openAddMember}>
          <MeetroIcon name="add" size={18} decorative />
          {t("teamMemberAdd", language)}
        </button>
      </section>

      <div className="team-members-filters" role="group" aria-label={t("teamMemberFilterByStatus", language)}>
        {["all", ...TEAM_MEMBER_STATUSES].map((status) => (
          <button
            type="button"
            key={status}
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          >
            {status === "all"
              ? t("teamMemberAll", language)
              : t(`teamMemberStatus${capitalize(status)}`, language)}
          </button>
        ))}
      </div>

      {visibleMembers.length === 0 ? (
        <div className="team-members-empty meetro-visual-empty-state">
          <MeetroIcon name="hiringCenter" size={30} decorative />
          <strong>{t("teamMembersEmpty", language)}</strong>
          <span>{t("teamMembersEmptyHelp", language)}</span>
          <button type="button" className="meetro-visual-primary-button" onClick={openAddMember}>
            {t("teamMemberAdd", language)}
          </button>
        </div>
      ) : (
        <div className="team-members-list">
          {visibleMembers.map((member) => (
            <article key={member.id} className="team-member-card meetro-visual-surface">
              <MemberAvatar member={member} />
              <div className="team-member-card-copy">
                <span className={`team-member-status status-${member.status}`}>
                  {t(`teamMemberStatus${capitalize(member.status)}`, language)}
                </span>
                <h2>{member.displayName}</h2>
                <p>{member.role || member.positionTitle}</p>
                <dl>
                  <Detail label={t("teamMemberPosition", language)} value={member.positionTitle} />
                  <Detail label={t("teamMemberHireDate", language)} value={formatDate(member.hireDate, language)} />
                </dl>
              </div>
              <div className="team-member-card-actions">
                <button type="button" onClick={() => setSelectedMemberId(member.id)}>
                  {t("teamMemberView", language)}
                </button>
                <button type="button" onClick={() => openEditMember(member)}>
                  {t("teamMemberEdit", language)}
                </button>
                {member.status === "active" && (
                  <button type="button" onClick={() => applyLifecycle(deactivateTeamMember, member)}>
                    {t("teamMemberDeactivate", language)}
                  </button>
                )}
                {["inactive", "archived"].includes(member.status) && (
                  <button type="button" onClick={() => applyLifecycle(reactivateTeamMember, member)}>
                    {t("teamMemberReactivate", language)}
                  </button>
                )}
                {member.status !== "archived" && (
                  <button type="button" className="team-member-archive" onClick={() => applyLifecycle(archiveTeamMember, member)}>
                    {t("teamMemberArchive", language)}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {editor && (
        <TeamMemberEditor
          key={`${editor.mode}-${editor.memberId || "new"}`}
          editor={editor}
          errors={editorErrors}
          positions={positions}
          language={language}
          onSave={saveMember}
          onClose={() => setEditor(null)}
        />
      )}
      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function TeamMemberShell({ setPage, title, subtitle, backLabel, onBack, children }) {
  return (
    <div className="app-page meetro-responsive-page meetro-visual-page team-members-page">
      <BusinessToolsPageHeader
        title={title}
        description={subtitle}
        categoryLabel={t("teamMembers")}
        backLabel={backLabel}
        onBack={onBack}
      />
      {children}
      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function MemberAvatar({ member }) {
  if (member.avatar) {
    return <img className="team-member-avatar" src={member.avatar} alt="" />;
  }
  return (
    <span className="team-member-avatar team-member-avatar-fallback" aria-hidden="true">
      {member.displayName.slice(0, 1).toUpperCase() || "M"}
    </span>
  );
}

function DetailSection({ title, children }) {
  return (
    <section>
      <h3>{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function TeamMemberEditor({ editor, errors, positions, language, onSave, onClose }) {
  const [draft, setDraft] = useState(() => editor?.draft || emptyDraft());

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="team-member-editor-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <form
        className="team-member-editor meetro-visual-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-member-editor-title"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <header>
          <div>
            <p>{t("teamMembers", language)}</p>
            <h2 id="team-member-editor-title">
              {t(editor.mode === "edit" ? "teamMemberEdit" : "teamMemberAdd", language)}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close", language)}>×</button>
        </header>

        <div className="team-member-editor-content">
          {Object.keys(errors || {}).length > 0 && (
            <div className="team-member-editor-error" role="alert">
              {t("teamMemberRequiredFields", language)}
            </div>
          )}

          <div className="team-member-form-grid">
            <Field label={t("teamMemberName", language)} required>
              <input value={draft.displayName} onChange={(event) => update("displayName", event.target.value)} autoComplete="name" />
            </Field>
            <Field label={t("teamMemberEmail", language)}>
              <input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" />
            </Field>
            <Field label={t("teamMemberPhone", language)}>
              <input type="tel" value={draft.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" />
            </Field>
            <Field label={t("teamMemberPosition", language)} required>
              <select
                value={draft.positionId}
                onChange={(event) => {
                  const position = positions.find((item) => item.id === event.target.value);
                  setDraft((current) => ({
                    ...current,
                    positionId: event.target.value,
                    positionTitle: position?.title || current.positionTitle,
                  }));
                }}
              >
                <option value="">{t("teamMemberChoosePosition", language)}</option>
                {positions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}
              </select>
              <input value={draft.positionTitle} onChange={(event) => update("positionTitle", event.target.value)} placeholder={t("teamMemberPosition", language)} />
            </Field>
            <Field label={t("teamMemberRole", language)}>
              <input value={draft.role} onChange={(event) => update("role", event.target.value)} />
            </Field>
            <Field label={t("teamMemberType", language)}>
              <select value={draft.memberType} onChange={(event) => update("memberType", event.target.value)}>
                {TEAM_MEMBER_TYPES.map((type) => <option key={type} value={type}>{t(`teamMemberType${capitalize(type)}`, language)}</option>)}
              </select>
            </Field>
            <Field label={t("teamMemberHireDate", language)}>
              <input type="date" value={draft.hireDate} onChange={(event) => update("hireDate", event.target.value)} />
            </Field>
            <Field label={t("teamMemberStatus", language)}>
              <select value={draft.status} onChange={(event) => update("status", event.target.value)}>
                {TEAM_MEMBER_STATUSES.map((status) => <option key={status} value={status}>{t(`teamMemberStatus${capitalize(status)}`, language)}</option>)}
              </select>
            </Field>
          </div>

          <Field label={t("teamMemberNotes", language)}>
            <textarea rows={4} value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>

          <div className="team-member-editor-actions">
            <button type="button" onClick={onClose}>{t("cancel", language)}</button>
            <button type="submit" className="meetro-visual-primary-button">{t("saveChanges", language)}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required = false, children }) {
  return (
    <label className="team-member-field">
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function capitalize(value) {
  const text = String(value || "");
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}

function formatDate(value, language) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const locale = language === "es" ? "es-US" : language === "fr" ? "fr-FR" : language === "pt-BR" ? "pt-BR" : "en-US";
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export default TeamMembers;
