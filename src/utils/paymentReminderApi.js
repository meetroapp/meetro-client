import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IDEMPOTENCY_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

const INVOICE_CLASSIFICATIONS =
  new Set([
    "UPCOMING_DUE",
    "DUE_TODAY",
    "OVERDUE",
  ]);

const DEPOSIT_CLASSIFICATIONS =
  new Set([
    "DEPOSIT_DUE",
    "DEPOSIT_REMAINING",
  ]);

function plain(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function exact(value, keys) {
  return (
    plain(value) &&
    Object.keys(value).length ===
      keys.length &&
    Object.keys(value).every(
      (key) => keys.includes(key)
    )
  );
}

function uuid(value, { nullable = false } = {}) {
  if (
    nullable &&
    value == null
  ) {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value
          .trim()
          .toLowerCase()
      : "";

  return UUID_PATTERN.test(normalized)
    ? normalized
    : null;
}

function integer(
  value,
  { positive = false } = {}
) {
  const parsed =
    Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < (positive ? 1 : 0)
  ) {
    return null;
  }

  return parsed;
}

function text(
  value,
  maximum,
  { nullable = false } = {}
) {
  if (
    nullable &&
    value == null
  ) {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  return (
    normalized &&
    normalized.length <= maximum
  )
    ? normalized
    : null;
}

function date(value, { nullable = false } = {}) {
  if (
    nullable &&
    value == null
  ) {
    return null;
  }

  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  )
    ? value
    : null;
}

function timestamp(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed.toISOString();
}

function currency(value) {
  return (
    typeof value === "string" &&
    /^[A-Z]{3}$/.test(value)
  )
    ? value
    : null;
}

function timeZone(value) {
  const submitted =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !submitted.includes("/") ||
    submitted.length < 3 ||
    submitted.length > 100
  ) {
    return null;
  }

  try {
    return (
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            submitted,
        }
      )
        .resolvedOptions()
        .timeZone ||
      submitted
    );
  } catch {
    return null;
  }
}

function normalizeDue(value) {
  if (
    !exact(
      value,
      [
        "mode",
        "date",
        "effectiveDate",
      ]
    )
  ) {
    return null;
  }

  if (
    value.mode ===
      "DUE_ON_RECEIPT" &&
    value.date == null
  ) {
    const effectiveDate =
      date(
        value.effectiveDate
      );

    return effectiveDate
      ? Object.freeze({
          mode:
            "DUE_ON_RECEIPT",
          date:
            null,
          effectiveDate,
        })
      : null;
  }

  if (
    value.mode ===
      "SPECIFIC_DATE"
  ) {
    const dueDate =
      date(value.date);

    const effectiveDate =
      date(
        value.effectiveDate
      );

    return (
      dueDate &&
      effectiveDate
    )
      ? Object.freeze({
          mode:
            "SPECIFIC_DATE",
          date:
            dueDate,
          effectiveDate,
        })
      : null;
  }

  return null;
}

export class PaymentReminderApiError
  extends Error {
  constructor({
    status = 500,
    code =
      "PAYMENT_REMINDER_FAILED",
    message =
      "The Payment Reminder could not be sent.",
  } = {}) {
    super(message);

    this.name =
      "PaymentReminderApiError";

    this.status =
      status;

    this.code =
      code;
  }
}

export function normalizePaymentReminder(
  value,
  {
    expectedSourceType = "",
    expectedInvoiceId = "",
    expectedJobId = "",
  } = {}
) {
  const keys = [
    "contractVersion",
    "reminderId",
    "sourceType",
    "invoiceId",
    "paymentRequirementId",
    "jobId",
    "relationshipId",
    "conversationId",
    "messageId",
    "sourceVersion",
    "classification",
    "classifiedOn",
    "timeZone",
    "currency",
    "amountMinor",
    "due",
    "messageText",
    "sentAt",
  ];

  if (
    !exact(value, keys)
  ) {
    return null;
  }

  const sourceType =
    ["INVOICE", "DEPOSIT"]
      .includes(
        value.sourceType
      )
      ? value.sourceType
      : "";

  const classification =
    sourceType === "INVOICE"
      ? (
          INVOICE_CLASSIFICATIONS
            .has(
              value.classification
            )
          ? value.classification
          : ""
        )
      : (
          DEPOSIT_CLASSIFICATIONS
            .has(
              value.classification
            )
          ? value.classification
          : ""
        );

  const normalized = {
    contractVersion:
      integer(
        value.contractVersion,
        { positive: true }
      ),

    reminderId:
      uuid(value.reminderId),

    sourceType,

    invoiceId:
      uuid(
        value.invoiceId,
        { nullable: true }
      ),

    paymentRequirementId:
      uuid(
        value.paymentRequirementId,
        { nullable: true }
      ),

    jobId:
      uuid(value.jobId),

    relationshipId:
      integer(
        value.relationshipId,
        { positive: true }
      ),

    conversationId:
      integer(
        value.conversationId,
        { positive: true }
      ),

    messageId:
      integer(
        value.messageId,
        { positive: true }
      ),

    sourceVersion:
      integer(
        value.sourceVersion,
        { positive: true }
      ),

    classification,

    classifiedOn:
      date(
        value.classifiedOn
      ),

    timeZone:
      timeZone(
        value.timeZone
      ),

    currency:
      currency(
        value.currency
      ),

    amountMinor:
      integer(
        value.amountMinor,
        { positive: true }
      ),

    due:
      sourceType ===
        "INVOICE"
        ? normalizeDue(
            value.due
          )
        : (
            value.due === null
              ? null
              : false
          ),

    messageText:
      text(
        value.messageText,
        5000
      ),

    sentAt:
      timestamp(
        value.sentAt
      ),
  };

  const invoiceShape =
    sourceType === "INVOICE"
      ? (
          normalized.invoiceId &&
          normalized
            .paymentRequirementId ===
            null &&
          normalized.due
        )
      : (
          normalized.invoiceId ===
            null &&
          normalized
            .paymentRequirementId &&
          normalized.due === null
        );

  const expectedInvoice =
    expectedInvoiceId
      ? uuid(
          expectedInvoiceId
        )
      : "";

  const expectedJob =
    expectedJobId
      ? uuid(
          expectedJobId
        )
      : "";

  if (
    normalized.contractVersion !== 1 ||
    !normalized.reminderId ||
    !normalized.sourceType ||
    !normalized.jobId ||
    !normalized.relationshipId ||
    !normalized.conversationId ||
    !normalized.messageId ||
    !normalized.sourceVersion ||
    !normalized.classification ||
    !normalized.classifiedOn ||
    !normalized.timeZone ||
    value.timeZone !==
      normalized.timeZone ||
    !normalized.currency ||
    !normalized.amountMinor ||
    !invoiceShape ||
    !normalized.messageText ||
    !normalized.sentAt ||
    (
      expectedSourceType &&
      normalized.sourceType !==
        expectedSourceType
    ) ||
    (
      expectedInvoice &&
      normalized.invoiceId !==
        expectedInvoice
    ) ||
    (
      expectedJob &&
      normalized.jobId !==
        expectedJob
    )
  ) {
    return null;
  }

  return Object.freeze(
    normalized
  );
}

function validIdempotencyKey(
  value
) {
  return (
    typeof value ===
      "string" &&
    IDEMPOTENCY_PATTERN
      .test(
        value.trim()
      )
  );
}

async function request(
  endpoint,
  options,
  setPage,
  authFetchImpl
) {
  const result =
    await authFetchImpl(
      endpoint,
      options,
      setPage
    );

  if (
    !result?.response?.ok ||
    result?.data?.success !==
      true
  ) {
    throw new PaymentReminderApiError({
      status:
        result?.response?.status ||
        500,

      code:
        result?.data?.code,

      message:
        result?.data?.message,
    });
  }

  return result.data;
}

function commandOptions(
  {
    expectedVersion,
    messageText,
  },
  idempotencyKey
) {
  const body = {
    expectedVersion,
  };

  if (
    messageText != null
  ) {
    body.messageText =
      messageText;
  }

  return {
    method:
      "POST",

    cache:
      "no-store",

    headers: {
      "Content-Type":
        "application/json",

      "Idempotency-Key":
        idempotencyKey,
    },

    body:
      JSON.stringify(body),
  };
}

export function createPaymentReminderKey(
  sourceType,
  cryptoProvider =
    globalThis.crypto
) {
  const normalizedSource =
    sourceType === "INVOICE"
      ? "invoice"
      : sourceType ===
          "DEPOSIT"
        ? "deposit"
        : "";

  const suffix =
    cryptoProvider
      ?.randomUUID?.();

  if (
    !normalizedSource ||
    !suffix
  ) {
    throw new PaymentReminderApiError({
      status: 500,
      code:
        "PAYMENT_REMINDER_IDEMPOTENCY_UNAVAILABLE",
      message:
        "Payment Reminders are unavailable on this device.",
    });
  }

  return (
    `payment-reminder:${normalizedSource}:${suffix}`
  );
}

export async function sendInvoicePaymentReminder({
  invoiceId,
  expectedVersion,
  messageText = null,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const id =
    uuid(invoiceId);

  const version =
    integer(
      expectedVersion,
      { positive: true }
    );

  const message =
    text(
      messageText,
      5000,
      { nullable: true }
    );

  if (
    !id ||
    !version ||
    !validIdempotencyKey(
      idempotencyKey
    ) ||
    (
      messageText != null &&
      !message
    )
  ) {
    throw new PaymentReminderApiError({
      status: 400,
      code:
        "INVALID_INVOICE_PAYMENT_REMINDER",
      message:
        "The Invoice Payment Reminder is invalid.",
    });
  }

  const data =
    await request(
      `/professional/invoices/${encodeURIComponent(id)}/reminders`,
      commandOptions(
        {
          expectedVersion:
            version,
          messageText:
            message,
        },
        idempotencyKey.trim()
      ),
      setPage,
      authFetchImpl
    );

  const reminder =
    normalizePaymentReminder(
      data.reminder,
      {
        expectedSourceType:
          "INVOICE",
        expectedInvoiceId:
          id,
      }
    );

  if (
    data.code !==
      "PAYMENT_REMINDER_SENT" ||
    !reminder
  ) {
    throw new PaymentReminderApiError({
      status: 502,
      code:
        "UNSAFE_PAYMENT_REMINDER_RESPONSE",
    });
  }

  return Object.freeze({
    reminder,
    replayed:
      data.replayed === true,
  });
}

export async function sendDepositPaymentReminder({
  jobId,
  expectedVersion,
  messageText = null,
  idempotencyKey,
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const id =
    uuid(jobId);

  const version =
    integer(
      expectedVersion,
      { positive: true }
    );

  const message =
    text(
      messageText,
      5000,
      { nullable: true }
    );

  if (
    !id ||
    !version ||
    !validIdempotencyKey(
      idempotencyKey
    ) ||
    (
      messageText != null &&
      !message
    )
  ) {
    throw new PaymentReminderApiError({
      status: 400,
      code:
        "INVALID_DEPOSIT_PAYMENT_REMINDER",
      message:
        "The Deposit Payment Reminder is invalid.",
    });
  }

  const data =
    await request(
      `/jobs/${encodeURIComponent(id)}/pre-work-deposit/reminders`,
      commandOptions(
        {
          expectedVersion:
            version,
          messageText:
            message,
        },
        idempotencyKey.trim()
      ),
      setPage,
      authFetchImpl
    );

  const reminder =
    normalizePaymentReminder(
      data.reminder,
      {
        expectedSourceType:
          "DEPOSIT",
        expectedJobId:
          id,
      }
    );

  if (
    data.code !==
      "PAYMENT_REMINDER_SENT" ||
    !reminder
  ) {
    throw new PaymentReminderApiError({
      status: 502,
      code:
        "UNSAFE_PAYMENT_REMINDER_RESPONSE",
    });
  }

  return Object.freeze({
    reminder,
    replayed:
      data.replayed === true,
  });
}
