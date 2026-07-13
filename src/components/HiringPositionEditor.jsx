import { useEffect, useRef } from "react";
import { HIRING_EMPLOYMENT_TYPES } from "../utils/hiringCenterRegistry";
import { t } from "../utils/language";

function errorId(field) {
  return `hiring-position-${field}-error`;
}

export default function HiringPositionEditor({
  mode = "create",
  draft,
  errors = {},
  language = "en",
  onChange,
  onSaveDraft,
  onPublish,
  onSaveChanges,
  onClose,
}) {
  const titleRef = useRef(null);
  const label = (key) => t(key, language);

  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const field = (name, title, control) => (
    <label className="hiring-position-field">
      <span>{title}</span>
      {control}
      {errors[name] && (
        <small id={errorId(name)} role="alert">
          {errors[name] === "invalid_pay_range"
            ? label("hiringPositionInvalidPayRange")
            : label("required")}
        </small>
      )}
    </label>
  );

  return (
    <div className="hiring-position-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="hiring-position-editor meetro-visual-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hiring-position-editor-title"
      >
        <header className="hiring-position-editor-header">
          <div>
            <p>{label("hiringCenter")}</p>
            <h2 id="hiring-position-editor-title" tabIndex="-1" ref={titleRef}>
              {label(mode === "edit" ? "hiringPositionEdit" : "hiringPositionCreate")}
            </h2>
          </div>
          <button type="button" className="hiring-position-icon-button" onClick={onClose} aria-label={label("close")}>
            ×
          </button>
        </header>

        <div className="hiring-position-editor-body">
          {field("title", label("hiringPositionTitle"), (
            <input value={draft.title} onChange={(event) => onChange("title", event.target.value)} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? errorId("title") : undefined} />
          ))}
          {field("description", label("description"), (
            <textarea rows="4" value={draft.description} onChange={(event) => onChange("description", event.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? errorId("description") : undefined} />
          ))}

          <div className="hiring-position-form-grid">
            {field("serviceArea", label("hiringPositionServiceArea"), (
              <input value={draft.serviceArea} onChange={(event) => onChange("serviceArea", event.target.value)} aria-invalid={Boolean(errors.serviceArea)} />
            ))}
            {field("employmentType", label("hiringPositionEmploymentType"), (
              <select value={draft.employmentType} onChange={(event) => onChange("employmentType", event.target.value)}>
                {HIRING_EMPLOYMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            ))}
            {field("payMin", label("hiringPositionMinimumPay"), (
              <input type="number" min="0" inputMode="decimal" value={draft.payMin} onChange={(event) => onChange("payMin", event.target.value)} aria-invalid={Boolean(errors.payMin)} />
            ))}
            {field("payMax", label("hiringPositionMaximumPay"), (
              <input type="number" min="0" inputMode="decimal" value={draft.payMax} onChange={(event) => onChange("payMax", event.target.value)} aria-invalid={Boolean(errors.payMax)} />
            ))}
            {field("payUnit", label("hiringPositionPayUnit"), (
              <select value={draft.payUnit} onChange={(event) => onChange("payUnit", event.target.value)}>
                <option value="hour">{label("hiringPositionPayUnitHour")}</option>
                <option value="day">{label("hiringPositionPayUnitDay")}</option>
                <option value="week">{label("hiringPositionPayUnitWeek")}</option>
                <option value="project">{label("hiringPositionPayUnitProject")}</option>
                <option value="year">{label("hiringPositionPayUnitYear")}</option>
              </select>
            ))}
            {field("experience", label("hiringPositionExperience"), (
              <input value={draft.experience} onChange={(event) => onChange("experience", event.target.value)} />
            ))}
          </div>

          {field("skillsNeeded", label("hiringPositionSkillsNeeded"), (
            <textarea rows="3" value={draft.skillsNeeded} onChange={(event) => onChange("skillsNeeded", event.target.value)} placeholder={label("hiringPositionListHelp")} />
          ))}
          {field("requirements", label("hiringPositionRequirements"), (
            <textarea rows="3" value={draft.requirements} onChange={(event) => onChange("requirements", event.target.value)} placeholder={label("hiringPositionListHelp")} />
          ))}
          <div className="hiring-position-form-grid">
            {field("schedule", label("hiringPositionSchedule"), (
              <input value={draft.schedule} onChange={(event) => onChange("schedule", event.target.value)} />
            ))}
            {field("contactPreference", label("hiringPositionContactPreference"), (
              <input value={draft.contactPreference} onChange={(event) => onChange("contactPreference", event.target.value)} />
            ))}
          </div>

          <div className="hiring-position-checks">
            <label><input type="checkbox" checked={Boolean(draft.vehicleRequired)} onChange={(event) => onChange("vehicleRequired", event.target.checked)} /> <span>{label("hiringPositionVehicleRequired")}</span></label>
            <label><input type="checkbox" checked={Boolean(draft.backgroundCheckRequired)} onChange={(event) => onChange("backgroundCheckRequired", event.target.checked)} /> <span>{label("hiringPositionBackgroundCheckRequired")}</span></label>
          </div>

          <aside className="hiring-position-requirements-summary">
            <strong>{label("hiringSettingsApplicationRequirements")}</strong>
            <span>{label("hiringSettingsPositionDefaultsHelp")}</span>
          </aside>
        </div>

        <footer className="hiring-position-editor-actions">
          <button type="button" onClick={onClose}>{label("cancel")}</button>
          {mode === "create" ? (
            <>
              <button type="button" onClick={onSaveDraft}>{label("hiringPositionSaveDraft")}</button>
              <button type="button" className="meetro-visual-primary-button" onClick={onPublish}>{label("hiringPositionPublish")}</button>
            </>
          ) : (
            <button type="button" className="meetro-visual-primary-button" onClick={onSaveChanges}>{label("saveChanges")}</button>
          )}
        </footer>
      </section>
    </div>
  );
}
