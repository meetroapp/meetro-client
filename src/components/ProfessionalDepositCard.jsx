import { useEffect, useMemo, useRef, useState } from "react";
import {
  confirmProfessionalPreWorkDepositReceived,
  createPreWorkDepositPaymentKey,
  fetchProfessionalPreWorkDeposit,
  formatDepositMoney,
  majorAmountToMinor,
  normalizeExternalPaymentMethod,
} from "../utils/preWorkDepositApi.js";

const COMMON_METHODS = Object.freeze([
  ["CASH", "Cash"],
  ["CHECK", "Check"],
  ["VENMO", "Venmo"],
  ["ZELLE", "Zelle"],
  ["BANK_TRANSFER", "Bank Transfer"],
  ["EXTERNAL_CARD", "External Card"],
  ["OTHER", "Other"],
]);

const STATE_COPY = Object.freeze({
  DUE: "Deposit due",
  PARTIALLY_SATISFIED: "Deposit partially received",
  SATISFIED: "Deposit received",
  TERMS_UNVERIFIED: "Deposit terms need review",
  SUPERSEDED: "Deposit no longer active",
  VOIDED: "Deposit no longer active",
});

function localDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initialForm(deposit) {
  return {
    amount: Number.isSafeInteger(deposit?.remainingMinor)
      ? (deposit.remainingMinor / 100).toFixed(2)
      : "",
    method: "",
    customMethod: "",
    receivedAt: localDateTime(),
    reference: "",
  };
}

function paymentMethodLabel(payment) {
  if (payment.displayMethod) return payment.displayMethod;
  return payment.normalizedMethod
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function paymentDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "Date unavailable";
  }
}

function statusCopy(read) {
  if (read?.reconciliationRequired) return "Deposit record needs confirmation";
  return STATE_COPY[read?.deposit?.state] || "Deposit status unavailable";
}

export default function ProfessionalDepositCard({
  jobId,
  quoteId,
  visitAuthority = null,
  setPage,
  onCanonicalChange,
}) {
  const [readState, setReadState] = useState({ status: "loading", read: null, error: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm(null));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastPayment, setLastPayment] = useState(null);
  const attemptRef = useRef({ signature: "", key: "" });

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setReadState({ status: "loading", read: null, error: "" });
      try {
        const read = await fetchProfessionalPreWorkDeposit({ jobId, quoteId, setPage });
        if (active) setReadState({ status: "ready", read, error: "" });
      } catch (error) {
        if (!active) return;
        if (error?.code === "PRE_WORK_DEPOSIT_APPROVED_AGREEMENT_REQUIRED") {
          setReadState({ status: "not-applicable", read: null, error: "" });
          return;
        }
        setReadState({
          status: "error",
          read: null,
          error: error?.message || "Deposit details could not be loaded.",
        });
      }
    });
    return () => {
      active = false;
    };
  }, [jobId, quoteId, setPage]);

  const deposit = readState.read?.deposit || null;
  const canConfirmPayment = Boolean(
    deposit &&
      ["DUE", "PARTIALLY_SATISFIED"].includes(deposit.state) &&
      deposit.schedulingLocked === true
  );
  const schedulingCopy = useMemo(() => {
    if (!visitAuthority) return "Approved Work scheduling status unavailable";
    if (visitAuthority.state === "LOCKED") return "Approved Work scheduling: Locked";
    if (visitAuthority.actions?.canPropose === true) {
      return "Approved Work scheduling: Active";
    }
    if (visitAuthority.actions?.canActivate === true) {
      return "Approved Work scheduling: Ready to activate";
    }
    return "Approved Work scheduling follows the current server status";
  }, [visitAuthority]);

  function changeField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
    attemptRef.current = { signature: "", key: "" };
  }

  function openForm() {
    setForm(initialForm(deposit));
    setFormError("");
    setNotice("");
    setLastPayment(null);
    attemptRef.current = { signature: "", key: "" };
    setFormOpen(true);
  }

  function closeForm() {
    if (submitting) return;
    setFormOpen(false);
    setFormError("");
    attemptRef.current = { signature: "", key: "" };
  }

  async function submitPayment(event) {
    event.preventDefault();
    const amountMinor = majorAmountToMinor(form.amount);
    const paymentMethod = normalizeExternalPaymentMethod({
      method: form.method,
      customMethod: form.customMethod,
    });
    const receivedAt = new Date(form.receivedAt);
    if (!amountMinor || !paymentMethod || Number.isNaN(receivedAt.getTime())) {
      setFormError("Enter an amount, payment method, and valid date received.");
      return;
    }
    const command = {
      jobId,
      amountMinor,
      currency: deposit.currency,
      ...paymentMethod,
      externalReference: form.reference.trim() || null,
      receivedAt: receivedAt.toISOString(),
      expectedVersion: deposit.latestVersion,
    };
    const signature = JSON.stringify(command);
    const idempotencyKey = attemptRef.current.signature === signature
      ? attemptRef.current.key
      : createPreWorkDepositPaymentKey();
    attemptRef.current = { signature, key: idempotencyKey };
    setSubmitting(true);
    setFormError("");
    try {
      const result = await confirmProfessionalPreWorkDepositReceived({
        ...command,
        idempotencyKey,
        setPage,
      });
      setReadState({
        status: "ready",
        read: {
          code: "PRE_WORK_DEPOSIT_FOUND",
          reconciliationRequired: false,
          deposit: result.deposit,
        },
        error: "",
      });
      setLastPayment(result.payment);
      setNotice(
        result.deposit.state === "SATISFIED"
          ? "Deposit payment recorded. Scheduling status is refreshing."
          : "Payment recorded. The remaining deposit is still due before scheduling."
      );
      setFormOpen(false);
      attemptRef.current = { signature: "", key: "" };
      if (typeof onCanonicalChange === "function") onCanonicalChange(result);
    } catch (error) {
      setFormError(error?.message || "Payment receipt could not be confirmed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (readState.status === "not-applicable") return null;

  if (readState.status === "loading") {
    return <p role="status" style={styles.loading}>Loading deposit status.</p>;
  }

  if (readState.status === "error") {
    return (
      <section style={styles.card} aria-label="Deposit">
        <strong>Deposit</strong>
        <p role="alert" style={styles.error}>{readState.error}</p>
        <p style={styles.guidance}>Scheduling remains governed by the server and is not unlocked here.</p>
      </section>
    );
  }

  if (!deposit || deposit.state === "NOT_REQUIRED") return null;

  return (
    <section style={styles.card} aria-labelledby={`deposit-title-${quoteId}`}>
      <div style={styles.headingRow}>
        <div>
          <span style={styles.eyebrow}>Approved quote payment</span>
          <h4 id={`deposit-title-${quoteId}`} style={styles.title}>Deposit</h4>
        </div>
        <span style={deposit.state === "SATISFIED" ? styles.successBadge : styles.badge}>
          {statusCopy(readState.read)}
        </span>
      </div>

      {[deposit.requiredMinor, deposit.appliedMinor, deposit.remainingMinor].every(Number.isSafeInteger) ? (
        <dl style={styles.amountGrid}>
          <div style={styles.amountItem}>
            <dt style={styles.term}>Required</dt>
            <dd style={styles.amount}>{formatDepositMoney(deposit.requiredMinor, deposit.currency)}</dd>
          </div>
          <div style={styles.amountItem}>
            <dt style={styles.term}>Received</dt>
            <dd style={styles.amount}>{formatDepositMoney(deposit.appliedMinor, deposit.currency)}</dd>
          </div>
          <div style={styles.amountItem}>
            <dt style={styles.term}>Remaining</dt>
            <dd style={styles.amount}>{formatDepositMoney(deposit.remainingMinor, deposit.currency)}</dd>
          </div>
        </dl>
      ) : (
        <p style={styles.guidance}>
          The accepted deposit terms need confirmation before payment can be recorded.
        </p>
      )}

      <p style={deposit.schedulingLocked ? styles.locked : styles.available}>
        {schedulingCopy}
      </p>
      {deposit.schedulingLocked && Number.isSafeInteger(deposit.remainingMinor) && (
        <p style={styles.guidance}>
          {formatDepositMoney(deposit.remainingMinor, deposit.currency)} remains before Approved Work scheduling can begin.
        </p>
      )}

      {notice && <p role="status" style={styles.notice}>{notice}</p>}
      {lastPayment?.unappliedMinor > 0 && (
        <p role="status" style={styles.overpayment}>
          Payment received: {formatDepositMoney(lastPayment.grossAmountMinor, lastPayment.currency)} · Applied to deposit: {formatDepositMoney(lastPayment.allocatedMinor, lastPayment.currency)} · Unapplied: {formatDepositMoney(lastPayment.unappliedMinor, lastPayment.currency)}
        </p>
      )}

      {canConfirmPayment && (
        <button type="button" style={styles.primaryButton} onClick={openForm}>
          Confirm Deposit Received
        </button>
      )}

      {deposit.paymentHistory.length > 0 && (
        <div style={styles.history}>
          <strong>Payment history</strong>
          <ul style={styles.historyList}>
            {[...deposit.paymentHistory].reverse().map((payment) => (
              <li key={payment.receiptId} style={styles.historyItem}>
                <div style={styles.historyHeading}>
                  <strong>{paymentDate(payment.receivedAt)}</strong>
                  <span>{paymentMethodLabel(payment)}</span>
                </div>
                <span>{formatDepositMoney(payment.grossAmountMinor, payment.currency)} received</span>
                <span>{formatDepositMoney(payment.netAppliedMinor, payment.currency)} currently applied</span>
                {payment.reversedMinor > 0 && (
                  <span>{formatDepositMoney(payment.reversedMinor, payment.currency)} reversed</span>
                )}
                {payment.unappliedMinor > 0 && (
                  <span>{formatDepositMoney(payment.unappliedMinor, payment.currency)} unapplied</span>
                )}
                {payment.externalReference && <span>Reference: {payment.externalReference}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {formOpen && (
        <div style={styles.overlay}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={`deposit-form-title-${quoteId}`}
            style={styles.dialog}
            onSubmit={submitPayment}
          >
            <div>
              <span style={styles.eyebrow}>Verified external payment</span>
              <h4 id={`deposit-form-title-${quoteId}`} style={styles.dialogTitle}>
                Confirm Deposit Received
              </h4>
              <p style={styles.guidance}>
                Record only money your business has verified was actually received outside Meetro.
              </p>
            </div>

            <label style={styles.field}>
              <span>Amount received</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => changeField("amount", event.target.value)}
                placeholder="0.00"
                required
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span>Payment method</span>
              <select
                value={form.method}
                onChange={(event) => changeField("method", event.target.value)}
                required
                style={styles.input}
              >
                <option value="">Select method</option>
                {COMMON_METHODS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {form.method === "OTHER" && (
              <label style={styles.field}>
                <span>Other payment method</span>
                <input
                  type="text"
                  value={form.customMethod}
                  onChange={(event) => changeField("customMethod", event.target.value)}
                  maxLength={160}
                  required
                  style={styles.input}
                />
              </label>
            )}

            <label style={styles.field}>
              <span>Date received</span>
              <input
                type="datetime-local"
                value={form.receivedAt}
                max={localDateTime()}
                onChange={(event) => changeField("receivedAt", event.target.value)}
                required
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span>Reference <small style={styles.optional}>Optional</small></span>
              <input
                type="text"
                value={form.reference}
                onChange={(event) => changeField("reference", event.target.value)}
                maxLength={300}
                style={styles.input}
              />
            </label>

            {formError && <p role="alert" style={styles.error}>{formError}</p>}

            <div style={styles.actions}>
              <button type="button" style={styles.secondaryButton} disabled={submitting} onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" style={styles.primaryButton} disabled={submitting}>
                {submitting ? "Confirming…" : "Confirm Payment Received"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

const styles = {
  loading: { margin: 0, color: "#64748b" },
  card: {
    display: "grid",
    gap: 14,
    minWidth: 0,
    padding: 16,
    border: "1px solid #d6e1d9",
    borderRadius: 14,
    background: "#fbfdfb",
  },
  headingRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  eyebrow: { display: "block", color: "#52705e", fontSize: 11, fontWeight: 800, textTransform: "uppercase" },
  title: { margin: "3px 0 0", color: "#163a25", fontSize: 18 },
  badge: { padding: "5px 9px", borderRadius: 999, background: "#fff7ed", color: "#9a3412", fontSize: 12, fontWeight: 800 },
  successBadge: { padding: "5px 9px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 800 },
  amountGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, margin: 0 },
  amountItem: { display: "grid", gap: 3, padding: 10, borderRadius: 10, background: "#ffffff", border: "1px solid #e2e8f0" },
  term: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  amount: { margin: 0, color: "#0f172a", fontSize: 17, fontWeight: 800 },
  locked: { margin: 0, padding: 10, borderRadius: 10, background: "#fff7ed", color: "#9a3412", fontWeight: 800 },
  available: { margin: 0, padding: 10, borderRadius: 10, background: "#f0fdf4", color: "#166534", fontWeight: 800 },
  guidance: { margin: 0, color: "#475569", lineHeight: 1.5 },
  notice: { margin: 0, padding: 10, borderRadius: 10, background: "#f0fdf4", color: "#166534", lineHeight: 1.45 },
  overpayment: { margin: 0, padding: 10, borderRadius: 10, background: "#eff6ff", color: "#1e3a8a", lineHeight: 1.45 },
  history: { display: "grid", gap: 9 },
  historyList: { display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" },
  historyItem: { display: "grid", gap: 3, padding: 10, borderRadius: 10, background: "#ffffff", border: "1px solid #e2e8f0", color: "#475569", fontSize: 13 },
  historyHeading: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, color: "#0f172a" },
  primaryButton: { minHeight: 44, width: "fit-content", padding: "10px 14px", border: "1px solid #166534", borderRadius: 10, background: "#166534", color: "#ffffff", fontWeight: 800, cursor: "pointer" },
  secondaryButton: { minHeight: 44, padding: "10px 14px", border: "1px solid #94a3b8", borderRadius: 10, background: "#ffffff", color: "#334155", fontWeight: 800, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 18, background: "rgba(15, 23, 42, 0.48)" },
  dialog: { display: "grid", gap: 14, width: "min(100%, 500px)", maxHeight: "calc(100vh - 36px)", overflowY: "auto", padding: 20, borderRadius: 16, background: "#ffffff", boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)" },
  dialogTitle: { margin: "4px 0 6px", color: "#0f172a", fontSize: 22 },
  field: { display: "grid", gap: 6, color: "#1e293b", fontWeight: 700 },
  input: { minHeight: 44, width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #94a3b8", borderRadius: 9, background: "#ffffff", color: "#0f172a", font: "inherit" },
  optional: { color: "#64748b", fontWeight: 500 },
  actions: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 9 },
  error: { margin: 0, padding: 10, borderLeft: "3px solid #b91c1c", background: "#fef2f2", color: "#991b1b", lineHeight: 1.45, overflowWrap: "anywhere" },
};
