export const FIELD_CUSTOMER_UNDO_SECONDS = 10;

export function isFieldCustomerNavigationLocked(pendingCustomerSend) {
  return pendingCustomerSend?.phase === "countdown";
}

export function captureFieldCustomerSend({
  jobId,
  businessId,
  assignmentId,
  message,
  idempotencyKey,
}) {
  const text = typeof message === "string" ? message : "";
  if (!jobId || !businessId || !assignmentId || !text.trim() || !idempotencyKey) {
    return null;
  }
  return Object.freeze({
    jobId,
    businessId,
    assignmentId,
    message: text,
    idempotencyKey,
  });
}

export function startFieldCustomerSendCountdown({
  pending,
  onTick,
  onExpire,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
}) {
  if (!pending || typeof onExpire !== "function") {
    throw new TypeError("A captured customer send and expiry callback are required.");
  }

  let active = true;
  let remainingSeconds = FIELD_CUSTOMER_UNDO_SECONDS;
  let intervalId = null;

  const finish = () => {
    if (!active) return;
    active = false;
    clearIntervalImpl(intervalId);
    onExpire(pending);
  };

  intervalId = setIntervalImpl(() => {
    if (!active) return;
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      finish();
      return;
    }
    onTick?.(remainingSeconds);
  }, 1000);

  onTick?.(remainingSeconds);

  return Object.freeze({
    cancel() {
      if (!active) return false;
      active = false;
      clearIntervalImpl(intervalId);
      return true;
    },
    isActive() {
      return active;
    },
  });
}
