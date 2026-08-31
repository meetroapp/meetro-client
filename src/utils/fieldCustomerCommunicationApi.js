import { authFetch } from "./authFetch.js";

const READ_FIELDS = new Set(["businessId", "assignmentId"]);
const SEND_FIELDS = new Set([
  "businessId",
  "assignmentId",
  "message",
  "idempotencyKey",
]);

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
