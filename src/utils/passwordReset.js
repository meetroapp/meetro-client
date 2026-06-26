export function normalizePasswordResetEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

export function isValidPasswordResetEmail(email = "") {
  const normalizedEmail = normalizePasswordResetEmail(email);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
}

export function buildPasswordResetRequest(email = "") {
  const normalizedEmail = normalizePasswordResetEmail(email);

  if (!normalizedEmail) {
    return {
      ok: false,
      email: "",
      errorCode: "email_required",
    };
  }

  if (!isValidPasswordResetEmail(normalizedEmail)) {
    return {
      ok: false,
      email: normalizedEmail,
      errorCode: "email_invalid",
    };
  }

  return {
    ok: true,
    email: normalizedEmail,
    simulated: true,
  };
}
