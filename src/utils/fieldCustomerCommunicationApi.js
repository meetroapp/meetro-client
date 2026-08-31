import { authFetch } from "./authFetch.js";

const READ_FIELDS = new Set(["businessId", "assignmentId"]);
const ALERT_DESTINATION_FIELDS = new Set(["businessId"]);
const SEND_FIELDS = new Set([
  "businessId",
  "assignmentId",
  "message",
  "idempotencyKey",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function communicationError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function exactInput(input, allowedFields) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw communicationError(
      "Exact assigned Job communication identity is required.",
      "FIELD_CUSTOMER_COMMUNICATION_INPUT_INVALID",
      400
    );
  }
  if (Object.keys(input).some((field) => !allowedFields.has(field))) {
    throw communicationError(
      "Customer Conversation authority is resolved by Meetro.",
      "FIELD_CUSTOMER_COMMUNICATION_FIELDS_UNSUPPORTED",
      400
    );
  }
  const businessId = Number(input.businessId);
  const assignmentId = String(input.assignmentId || "").trim();
  if (!Number.isSafeInteger(businessId) || businessId <= 0 || !assignmentId) {
    throw communicationError(
      "Exact assigned Job communication identity is required.",
      "FIELD_CUSTOMER_COMMUNICATION_INPUT_INVALID",
      400
    );
  }
  return { businessId, assignmentId };
}

async function customerCommunicationRequest(
  path,
  options,
  setPage,
  authFetchImpl
) {
  const { response, data } = await authFetchImpl(path, options, setPage);
  if (!response?.ok || data?.success !== true) {
    throw communicationError(
      data?.message || "Customer communication is unavailable.",
      data?.code || "FIELD_CUSTOMER_COMMUNICATION_REQUEST_FAILED",
      response?.status || 0
    );
  }
  return data;
}

function exactJobId(jobId) {
  const value = String(jobId || "").trim();
  if (!value) {
    throw communicationError(
      "Exact assigned Job identity is required.",
      "FIELD_CUSTOMER_JOB_INVALID",
      400
    );
  }
  return value;
}

function exactAlertId(alertId) {
  const value = String(alertId || "").trim();
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number <= 0) {
    throw communicationError(
      "Exact Alert identity is required.",
      "FIELD_CUSTOMER_ALERT_INVALID",
      400
    );
  }
  return value;
}

function exactAlertBusiness(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((field) => !ALERT_DESTINATION_FIELDS.has(field))
  ) {
    throw communicationError(
      "Exact business identity is required.",
      "FIELD_CUSTOMER_ALERT_DESTINATION_INPUT_INVALID",
      400
    );
  }
  const businessId = Number(input.businessId);
  if (!Number.isSafeInteger(businessId) || businessId <= 0) {
    throw communicationError(
      "Exact business identity is required.",
      "FIELD_CUSTOMER_ALERT_DESTINATION_INPUT_INVALID",
      400
    );
  }
  return businessId;
}

export function buildFieldCustomerAlertRoute(destination) {
  if (!destination || typeof destination !== "object" || Array.isArray(destination)) {
    return null;
  }
  const fields = Object.keys(destination);
  const businessId = Number(destination.businessId);
  const jobId = String(destination.jobId || "").trim().toLowerCase();
  if (
    fields.length !== 3 ||
    !fields.includes("businessId") ||
    !fields.includes("jobId") ||
    !fields.includes("audience") ||
    !Number.isSafeInteger(businessId) ||
    businessId <= 0 ||
    !UUID_PATTERN.test(jobId) ||
    destination.audience !== "customer"
  ) return null;
  const query = new URLSearchParams({
    businessId: String(businessId),
    jobId,
    audience: "customer",
  });
  return `employeeMessages?${query}`;
}

export async function resolveFieldCustomerAlertDestination(
  alertId,
  input,
  authFetchImpl = authFetch
) {
  const exactAlert = exactAlertId(alertId);
  const businessId = exactAlertBusiness(input);
  const query = new URLSearchParams({ businessId: String(businessId) });
  const data = await customerCommunicationRequest(
    `/employee/alerts/${encodeURIComponent(exactAlert)}/customer-conversation-destination?${query}`,
    { method: "GET", cache: "no-store" },
    undefined,
    authFetchImpl
  );
  if (
    data.code !== "FIELD_CUSTOMER_ALERT_DESTINATION_RESOLVED" ||
    data.destination?.businessId !== businessId ||
    !buildFieldCustomerAlertRoute(data.destination)
  ) {
    throw communicationError(
      "Customer communication is unavailable.",
      "FIELD_CUSTOMER_ALERT_DESTINATION_MALFORMED",
      502
    );
  }
  return data;
}

export async function fetchFieldCustomerConversation(
  jobId,
  input,
  setPage,
  authFetchImpl = authFetch
) {
  const exactJob = exactJobId(jobId);
  const authority = exactInput(input, READ_FIELDS);
  const query = new URLSearchParams({
    businessId: String(authority.businessId),
    assignmentId: authority.assignmentId,
  });
  return customerCommunicationRequest(
    `/employee/jobs/${encodeURIComponent(exactJob)}/customer-conversation?${query}`,
    { method: "GET", cache: "no-store" },
    setPage,
    authFetchImpl
  );
}

export async function acknowledgeFieldCustomerAttention(
  jobId,
  input,
  setPage,
  authFetchImpl = authFetch
) {
  const exactJob = exactJobId(jobId);
  const authority = exactInput(input, READ_FIELDS);
  return customerCommunicationRequest(
    `/employee/jobs/${encodeURIComponent(exactJob)}/customer-conversation/read`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authority),
    },
    setPage,
    authFetchImpl
  );
}

export async function sendFieldCustomerMessage(
  jobId,
  input,
  setPage,
  authFetchImpl = authFetch
) {
  const exactJob = exactJobId(jobId);
  const authority = exactInput(input, SEND_FIELDS);
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const idempotencyKey =
    typeof input.idempotencyKey === "string"
      ? input.idempotencyKey.trim()
      : "";
  if (!message || message.length > 5000 || !idempotencyKey || idempotencyKey.length > 200) {
    throw communicationError(
      "A bounded customer message and idempotency key are required.",
      "FIELD_CUSTOMER_MESSAGE_INPUT_INVALID",
      400
    );
  }
  return customerCommunicationRequest(
    `/employee/jobs/${encodeURIComponent(exactJob)}/customer-conversation/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: authority.businessId,
        assignmentId: authority.assignmentId,
        message,
        idempotencyKey,
      }),
    },
    setPage,
    authFetchImpl
  );
}
