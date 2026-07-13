import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACCOUNT_SECURITY_FAILURE,
  changeAccountPassword,
  evaluatePasswordRequirements,
  getAccountSecurityCapabilities,
} from "../utils/accountSecurity";
import { t } from "../utils/language";
import PasswordResetWorkspace from "./PasswordResetWorkspace.jsx";

const EMPTY_FORM = Object.freeze({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const FAILURE_LABELS = Object.freeze({
  [ACCOUNT_SECURITY_FAILURE.CURRENT_PASSWORD_REQUIRED]: "accountSecurityCurrentRequired",
  [ACCOUNT_SECURITY_FAILURE.NEW_PASSWORD_REQUIRED]: "accountSecurityNewRequired",
  [ACCOUNT_SECURITY_FAILURE.CONFIRM_PASSWORD_REQUIRED]: "accountSecurityConfirmRequired",
  [ACCOUNT_SECURITY_FAILURE.PASSWORDS_DO_NOT_MATCH]: "accountSecurityPasswordsMismatch",
  [ACCOUNT_SECURITY_FAILURE.PASSWORD_POLICY_FAILED]: "accountSecurityPolicyFailed",
  [ACCOUNT_SECURITY_FAILURE.PASSWORD_REUSE_NOT_ALLOWED]: "accountSecurityPasswordReuse",
  [ACCOUNT_SECURITY_FAILURE.CURRENT_PASSWORD_INCORRECT]: "accountSecurityCurrentIncorrect",
  [ACCOUNT_SECURITY_FAILURE.SESSION_INVALID]: "accountSecuritySessionExpiredMessage",
  [ACCOUNT_SECURITY_FAILURE.TOO_MANY_ATTEMPTS]: "accountSecurityTooManyAttemptsMessage",
  [ACCOUNT_SECURITY_FAILURE.SERVICE_UNAVAILABLE]: "accountSecurityServiceUnavailable",
  [ACCOUNT_SECURITY_FAILURE.INVALID_RESPONSE]: "accountSecurityUpdateFailed",
  [ACCOUNT_SECURITY_FAILURE.PASSWORD_CHANGE_FAILED]: "accountSecurityUpdateFailed",
});

function PasswordField({
  id,
  label,
  value,
  visible,
  autoComplete,
  onChange,
  onToggle,
  showLabel,
  hideLabel,
  errorId,
}) {
  const controlLabel = visible ? hideLabel : showLabel;

  return (
    <label className="account-security-field" htmlFor={id}>
      <span>{label}</span>
      <span className="account-security-password-control">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={errorId}
        />
        <button type="button" onClick={onToggle} aria-label={controlLabel}>
          {visible ? t("accountSecurityHide") : t("accountSecurityShow")}
        </button>
      </span>
    </label>
  );
}

export default function AccountSecurityWorkspace({
  accountMode,
  onClose,
  onSignOut,
  onSessionExpired,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [visibleFields, setVisibleFields] = useState({ current: false, next: false, confirm: false });
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const [updated, setUpdated] = useState(false);
  const titleRef = useRef(null);
  const previousModeRef = useRef(accountMode);
  const capabilities = getAccountSecurityCapabilities();
  const requirements = evaluatePasswordRequirements(form.newPassword);

  const clearSensitiveState = useCallback(() => {
    setForm(EMPTY_FORM);
    setVisibleFields({ current: false, next: false, confirm: false });
    setPending(false);
  }, []);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (previousModeRef.current !== accountMode) {
      clearSensitiveState();
      setFailure("");
      setUpdated(false);
      previousModeRef.current = accountMode;
    }
  }, [accountMode, clearSensitiveState]);

  const closeWorkspace = useCallback(() => {
    if (pending) return;
    clearSensitiveState();
    setFailure("");
    setUpdated(false);
    onClose();
  }, [clearSensitiveState, onClose, pending]);

  async function submitPasswordChange(event) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setFailure("");
    setUpdated(false);

    const result = await changeAccountPassword(form);

    if (result.ok) {
      clearSensitiveState();
      setUpdated(true);
      return;
    }

    if (result.sessionExpired) {
      clearSensitiveState();
      onSessionExpired();
      return;
    }

    setFailure(result.failure || ACCOUNT_SECURITY_FAILURE.PASSWORD_CHANGE_FAILED);
    setPending(false);
  }

  const failureMessage = failure ? t(FAILURE_LABELS[failure] || "accountSecurityUpdateFailed") : "";

  return (
    <div className="account-security-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeWorkspace();
    }}>
      <section
        className="account-security-workspace meetro-visual-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-security-title"
        aria-busy={pending}
      >
        <header className="account-security-header">
          <div>
            <p>{t("accountSecurityEyebrow")}</p>
            <h2 id="account-security-title" ref={titleRef} tabIndex={-1}>
              {t("accountSecurityTitle")}
            </h2>
          </div>
          <button type="button" onClick={closeWorkspace} aria-label={t("accountSecurityClose")} disabled={pending}>
            ×
          </button>
        </header>

        <div className="account-security-content">
          <section className="account-security-section" aria-labelledby="account-security-password-title">
            <div className="account-security-section-heading">
              <h3 id="account-security-password-title">{t("accountSecurityPassword")}</h3>
              <strong>{t("accountSecurityChangePassword")}</strong>
              <p>{t("accountSecurityChangePasswordHelp")}</p>
            </div>

            <form onSubmit={submitPasswordChange} noValidate>
              <PasswordField
                id="account-current-password"
                label={t("accountSecurityCurrentPassword")}
                value={form.currentPassword}
                visible={visibleFields.current}
                autoComplete="current-password"
                onChange={(value) => setForm((current) => ({ ...current, currentPassword: value }))}
                onToggle={() => setVisibleFields((current) => ({ ...current, current: !current.current }))}
                showLabel={t("accountSecurityShowCurrent")}
                hideLabel={t("accountSecurityHideCurrent")}
                errorId="account-security-status"
              />

              <PasswordField
                id="account-new-password"
                label={t("accountSecurityNewPassword")}
                value={form.newPassword}
                visible={visibleFields.next}
                autoComplete="new-password"
                onChange={(value) => setForm((current) => ({ ...current, newPassword: value }))}
                onToggle={() => setVisibleFields((current) => ({ ...current, next: !current.next }))}
                showLabel={t("accountSecurityShowNew")}
                hideLabel={t("accountSecurityHideNew")}
                errorId="account-security-status account-security-requirements"
              />

              <PasswordField
                id="account-confirm-password"
                label={t("accountSecurityConfirmPassword")}
                value={form.confirmPassword}
                visible={visibleFields.confirm}
                autoComplete="new-password"
                onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
                onToggle={() => setVisibleFields((current) => ({ ...current, confirm: !current.confirm }))}
                showLabel={t("accountSecurityShowConfirm")}
                hideLabel={t("accountSecurityHideConfirm")}
                errorId="account-security-status"
              />

              <ul id="account-security-requirements" className="account-security-requirements">
                {[
                  ["minimumLength", "accountSecurityMinimumLength"],
                  ["uppercase", "accountSecurityUppercase"],
                  ["lowercase", "accountSecurityLowercase"],
                  ["number", "accountSecurityNumber"],
                ].map(([key, labelKey]) => (
                  <li key={key} data-met={requirements[key] ? "true" : "false"}>
                    <span aria-hidden="true">{requirements[key] ? "✓" : "○"}</span>
                    {t(labelKey)}
                    <span className="sr-only">
                      {requirements[key] ? t("accountSecurityRequirementMet") : t("accountSecurityRequirementNotMet")}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                id="account-security-status"
                className={`account-security-status ${failure ? "is-error" : updated ? "is-success" : ""}`}
                role={failure ? "alert" : "status"}
                aria-live="polite"
              >
                {failureMessage}
                {updated && (
                  <>
                    <strong>{t("accountSecurityPasswordUpdated")}</strong>
                    <span>{t("accountSecurityPasswordUpdatedMessage")}</span>
                  </>
                )}
              </div>

              <div className="account-security-actions">
                <button type="button" className="account-security-secondary" onClick={closeWorkspace} disabled={pending}>
                  {t("accountSecurityCancel")}
                </button>
                <button type="submit" className="meetro-visual-primary-button" disabled={pending}>
                  {pending ? t("accountSecuritySaving") : t("accountSecuritySavePassword")}
                </button>
              </div>
            </form>
          </section>

          <section className="account-security-section account-security-recovery">
            <h3>{t("accountSecurityRecovery")}</h3>
            <p>{t("accountSecurityRecoveryHelp")}</p>
            {capabilities.emailRecovery && <PasswordResetWorkspace requestOnly />}
          </section>

          <section className="account-security-section account-security-readonly">
            <h3>{t("accountSecurityTwoFactor")}</h3>
            <p>{t("accountSecurityTwoFactorReadOnly")}</p>
          </section>

          <section className="account-security-section account-security-readonly">
            <h3>{t("accountSecuritySession")}</h3>
            <p>{t("accountSecuritySessionHelp")}</p>
            {capabilities.signOut && (
              <button type="button" className="account-security-sign-out" onClick={onSignOut}>
                {t("accountSecuritySignOut")}
              </button>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
