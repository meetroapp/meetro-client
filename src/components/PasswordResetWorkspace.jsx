import { useEffect, useMemo, useRef, useState } from "react";
import {
  PASSWORD_RESET_FAILURE,
  capturePasswordResetToken,
  completePasswordReset,
  evaluateResetPasswordRequirements,
  requestPasswordReset,
} from "../utils/passwordReset.js";
import { getLanguage, t } from "../utils/language.js";

const FAILURE_LABELS = Object.freeze({
  [PASSWORD_RESET_FAILURE.EMAIL_REQUIRED]: "resetEmailRequired",
  [PASSWORD_RESET_FAILURE.EMAIL_INVALID]: "resetEmailInvalid",
  [PASSWORD_RESET_FAILURE.TOKEN_INVALID]: "resetLinkInvalid",
  [PASSWORD_RESET_FAILURE.NEW_PASSWORD_REQUIRED]: "resetNewPasswordRequired",
  [PASSWORD_RESET_FAILURE.CONFIRM_PASSWORD_REQUIRED]: "resetConfirmPasswordRequired",
  [PASSWORD_RESET_FAILURE.PASSWORDS_DO_NOT_MATCH]: "resetPasswordsMismatch",
  [PASSWORD_RESET_FAILURE.PASSWORD_POLICY_FAILED]: "resetPasswordPolicyFailed",
  [PASSWORD_RESET_FAILURE.PASSWORD_REUSE_NOT_ALLOWED]: "resetPasswordReuse",
  [PASSWORD_RESET_FAILURE.RESET_LINK_INVALID]: "resetLinkInvalid",
  [PASSWORD_RESET_FAILURE.TOO_MANY_ATTEMPTS]: "resetTooManyAttempts",
  [PASSWORD_RESET_FAILURE.SERVICE_UNAVAILABLE]: "resetServiceUnavailable",
  [PASSWORD_RESET_FAILURE.REQUEST_FAILED]: "resetRequestFailed",
  [PASSWORD_RESET_FAILURE.RESET_FAILED]: "resetCompletionFailed",
});

export default function PasswordResetWorkspace({
  initialEmail = "",
  onBackToSignIn,
  allowCompletion = false,
  requestOnly = false,
  standalone = false,
}) {
  const language = getLanguage();
  const [token, setToken] = useState(() => allowCompletion ? capturePasswordResetToken() : "");
  const [view, setView] = useState(() => allowCompletion && token ? "complete" : "request");
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState({ next: false, confirm: false });
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const headingRef = useRef(null);
  const requirements = useMemo(() => evaluateResetPasswordRequirements(newPassword), [newPassword]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [view]);

  async function submitRequest(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFailure("");
    const result = await requestPasswordReset({ email });
    setPending(false);
    if (result.ok) setView("requested");
    else setFailure(result.failure);
  }

  async function submitCompletion(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFailure("");
    const result = await completePasswordReset({ token, newPassword, confirmPassword });
    setPending(false);
    if (result.ok) {
      setNewPassword("");
      setConfirmPassword("");
      setToken("");
      setView("complete-success");
    } else if (result.failure === PASSWORD_RESET_FAILURE.RESET_LINK_INVALID) {
      setNewPassword("");
      setConfirmPassword("");
      setToken("");
      setView("invalid");
    } else {
      setFailure(result.failure);
    }
  }

  const failureMessage = failure ? t(FAILURE_LABELS[failure] || "resetRequestFailed", language) : "";
  const content = (
    <section className={`password-reset-workspace ${standalone ? "is-standalone" : ""}`} aria-busy={pending}>
      {view === "request" && (
        <form onSubmit={submitRequest} noValidate>
          <h2 ref={headingRef} tabIndex={-1}>{t("resetPasswordTitle", language)}</h2>
          <p>{t("resetPasswordDescription", language)}</p>
          <label htmlFor="password-reset-email">
            <span>{t("resetEmailLabel", language)}</span>
            <input
              id="password-reset-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setFailure(""); }}
              placeholder={t("resetEmailPlaceholder", language)}
            />
          </label>
          <ResetStatus failureMessage={failureMessage} />
          <button className="meetro-visual-primary-button" type="submit" disabled={pending}>
            {pending ? t("resetSending", language) : t("sendResetLink", language)}
          </button>
          {!requestOnly && onBackToSignIn && (
            <button className="password-reset-secondary" type="button" onClick={onBackToSignIn}>
              {t("backToLogin", language)}
            </button>
          )}
        </form>
      )}

      {view === "requested" && (
        <div className="password-reset-result" role="status">
          <h2 ref={headingRef} tabIndex={-1}>{t("resetCheckEmailTitle", language)}</h2>
          <p>{t("resetPasswordConfirmation", language)}</p>
          <button type="button" className="password-reset-secondary" onClick={() => setView("request")}>
            {t("resetRequestAnother", language)}
          </button>
          {!requestOnly && onBackToSignIn && (
            <button className="meetro-visual-primary-button" type="button" onClick={onBackToSignIn}>
              {t("backToLogin", language)}
            </button>
          )}
        </div>
      )}

      {view === "complete" && (
        <form onSubmit={submitCompletion} noValidate>
          <h2 ref={headingRef} tabIndex={-1}>{t("resetCreatePasswordTitle", language)}</h2>
          <p>{t("resetCreatePasswordDescription", language)}</p>
          <ResetPasswordField
            id="reset-new-password"
            label={t("resetNewPassword", language)}
            value={newPassword}
            visible={visible.next}
            onChange={(value) => { setNewPassword(value); setFailure(""); }}
            onToggle={() => setVisible((current) => ({ ...current, next: !current.next }))}
          />
          <ResetPasswordField
            id="reset-confirm-password"
            label={t("resetConfirmPassword", language)}
            value={confirmPassword}
            visible={visible.confirm}
            onChange={(value) => { setConfirmPassword(value); setFailure(""); }}
            onToggle={() => setVisible((current) => ({ ...current, confirm: !current.confirm }))}
          />
          <ul className="password-reset-requirements">
            {[
              ["minimumLength", "resetMinimumLength"],
              ["uppercase", "resetUppercase"],
              ["lowercase", "resetLowercase"],
              ["number", "resetNumber"],
            ].map(([key, label]) => (
              <li key={key} data-met={requirements[key] ? "true" : "false"}>
                <span aria-hidden="true">{requirements[key] ? "✓" : "○"}</span>{t(label, language)}
              </li>
            ))}
          </ul>
          <ResetStatus failureMessage={failureMessage} />
          <button className="meetro-visual-primary-button" type="submit" disabled={pending}>
            {pending ? t("resetSaving", language) : t("resetPasswordAction", language)}
          </button>
          {onBackToSignIn && (
            <button className="password-reset-secondary" type="button" onClick={onBackToSignIn}>
              {t("backToLogin", language)}
            </button>
          )}
        </form>
      )}

      {view === "invalid" && (
        <div className="password-reset-result" role="alert">
          <h2 ref={headingRef} tabIndex={-1}>{t("resetLinkInvalidTitle", language)}</h2>
          <p>{t("resetLinkInvalid", language)}</p>
          <button type="button" className="meetro-visual-primary-button" onClick={() => setView("request")}>
            {t("resetRequestNewLink", language)}
          </button>
          {onBackToSignIn && (
            <button className="password-reset-secondary" type="button" onClick={onBackToSignIn}>
              {t("backToLogin", language)}
            </button>
          )}
        </div>
      )}

      {view === "complete-success" && (
        <div className="password-reset-result" role="status">
          <h2 ref={headingRef} tabIndex={-1}>{t("resetCompleteTitle", language)}</h2>
          <p>{t("resetCompleteDescription", language)}</p>
          <button type="button" className="meetro-visual-primary-button" onClick={onBackToSignIn}>
            {t("backToLogin", language)}
          </button>
        </div>
      )}
    </section>
  );

  return standalone ? <main className="password-reset-page">{content}</main> : content;
}

function ResetStatus({ failureMessage }) {
  return (
    <div className={`password-reset-status ${failureMessage ? "is-error" : ""}`} role={failureMessage ? "alert" : "status"} aria-live="polite">
      {failureMessage}
    </div>
  );
}

function ResetPasswordField({ id, label, value, visible, onChange, onToggle }) {
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <span className="password-reset-password-control">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" onClick={onToggle} aria-label={visible ? t("resetHidePassword") : t("resetShowPassword")}>
          {visible ? t("resetHidePassword") : t("resetShowPassword")}
        </button>
      </span>
    </label>
  );
}
