import {
  formatLocaleCurrency,
} from "../utils/localeFormat.js";

const COPY = Object.freeze({
  en: Object.freeze({
    title: "Payment Reminder",
    invoice: "Invoice",
    deposit: "Deposit",
    amount: "Reminder amount",
    status: "Status",
    dueDate: "Due date",
    classifiedOn: "Reminder date",
    upcoming: "Upcoming due",
    dueToday: "Due today",
    overdue: "Overdue",
    depositDue: "Deposit due",
    depositRemaining: "Deposit balance remaining",
    safeguard:
      "Reminder only — this message does not record a payment or change the amount due.",
  }),

  es: Object.freeze({
    title: "Recordatorio de pago",
    invoice: "Factura",
    deposit: "Depósito",
    amount: "Monto del recordatorio",
    status: "Estado",
    dueDate: "Fecha de vencimiento",
    classifiedOn: "Fecha del recordatorio",
    upcoming: "Próximo a vencer",
    dueToday: "Vence hoy",
    overdue: "Vencido",
    depositDue: "Depósito pendiente",
    depositRemaining: "Saldo del depósito pendiente",
    safeguard:
      "Solo es un recordatorio — este mensaje no registra un pago ni cambia el monto adeudado.",
  }),

  fr: Object.freeze({
    title: "Rappel de paiement",
    invoice: "Facture",
    deposit: "Dépôt",
    amount: "Montant du rappel",
    status: "Statut",
    dueDate: "Date d'échéance",
    classifiedOn: "Date du rappel",
    upcoming: "Échéance à venir",
    dueToday: "Échéance aujourd'hui",
    overdue: "En retard",
    depositDue: "Dépôt dû",
    depositRemaining: "Solde du dépôt restant",
    safeguard:
      "Rappel uniquement — ce message n'enregistre aucun paiement et ne modifie pas le montant dû.",
  }),

  "pt-BR": Object.freeze({
    title: "Lembrete de pagamento",
    invoice: "Fatura",
    deposit: "Depósito",
    amount: "Valor do lembrete",
    status: "Status",
    dueDate: "Data de vencimento",
    classifiedOn: "Data do lembrete",
    upcoming: "Vencimento próximo",
    dueToday: "Vence hoje",
    overdue: "Em atraso",
    depositDue: "Depósito pendente",
    depositRemaining: "Saldo restante do depósito",
    safeguard:
      "Apenas um lembrete — esta mensagem não registra um pagamento nem altera o valor devido.",
  }),
});

function copyFor(language) {
  const value =
    String(language || "en");

  if (value.startsWith("es")) {
    return COPY.es;
  }

  if (value.startsWith("fr")) {
    return COPY.fr;
  }

  if (value.startsWith("pt")) {
    return COPY["pt-BR"];
  }

  return COPY.en;
}

function money(
  minor,
  currency,
  language
) {
  return formatLocaleCurrency(
    minor / 100,
    currency,
    {},
    language
  );
}

function dateLabel(
  value,
  language
) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      language || "en",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }
    ).format(
      new Date(
        `${value}T00:00:00.000Z`
      )
    );
  } catch {
    return value;
  }
}

function classificationLabel(
  classification,
  copy
) {
  return (
    {
      UPCOMING_DUE:
        copy.upcoming,
      DUE_TODAY:
        copy.dueToday,
      OVERDUE:
        copy.overdue,
      DEPOSIT_DUE:
        copy.depositDue,
      DEPOSIT_REMAINING:
        copy.depositRemaining,
    }[classification] ||
    classification
  );
}

export default function ConversationPaymentReminderCard({
  reminder,
  messageText = "",
  language = "en",
}) {
  if (!reminder) return null;

  const copy =
    copyFor(language);

  const invoice =
    reminder.sourceType ===
    "INVOICE";

  return (
    <article
      className="canonical-conversation-payment-reminder-card"
      data-payment-reminder-source={
        reminder.sourceType
      }
      style={styles.card}
    >
      <header style={styles.header}>
        <div style={styles.headerCopy}>
          <span style={styles.eyebrow}>
            {copy.title}
          </span>

          <strong style={styles.source}>
            {invoice
              ? copy.invoice
              : copy.deposit}
          </strong>
        </div>

        <strong style={styles.amount}>
          {money(
            reminder.amountMinor,
            reminder.currency,
            language
          )}
        </strong>
      </header>

      <dl style={styles.summary}>
        <div style={styles.row}>
          <dt style={styles.term}>
            {copy.amount}
          </dt>

          <dd style={styles.value}>
            {money(
              reminder.amountMinor,
              reminder.currency,
              language
            )}
          </dd>
        </div>

        <div style={styles.row}>
          <dt style={styles.term}>
            {copy.status}
          </dt>

          <dd style={styles.value}>
            {classificationLabel(
              reminder.classification,
              copy
            )}
          </dd>
        </div>

        {invoice &&
          reminder.due?.effectiveDate && (
            <div style={styles.row}>
              <dt style={styles.term}>
                {copy.dueDate}
              </dt>

              <dd style={styles.value}>
                {dateLabel(
                  reminder.due
                    .effectiveDate,
                  language
                )}
              </dd>
            </div>
          )}

        <div style={styles.row}>
          <dt style={styles.term}>
            {copy.classifiedOn}
          </dt>

          <dd style={styles.value}>
            {dateLabel(
              reminder.classifiedOn,
              language
            )}
          </dd>
        </div>
      </dl>

      {messageText ? (
        <p style={styles.message}>
          {messageText}
        </p>
      ) : null}

      <p style={styles.safeguard}>
        {copy.safeguard}
      </p>
    </article>
  );
}

const styles = {
  card: {
    display: "grid",
    gap: 12,
    width: "min(100%, 390px)",
    minWidth: 0,
    padding: 16,
    border:
      "1px solid #bbd7c2",
    borderLeft:
      "4px solid #176b3a",
    borderRadius: 10,
    background: "#fff",
    color: "#172317",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  headerCopy: {
    display: "grid",
    gap: 3,
  },

  eyebrow: {
    color: "#176b3a",
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },

  source: {
    fontSize: 14,
    color: "#526052",
  },

  amount: {
    fontSize: 17,
    whiteSpace: "nowrap",
  },

  summary: {
    display: "grid",
    gap: 7,
    margin: 0,
  },

  row: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
  },

  term: {
    color: "#526052",
    fontWeight: 700,
  },

  value: {
    margin: 0,
    textAlign: "right",
    fontWeight: 800,
  },

  message: {
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },

  safeguard: {
    margin: 0,
    padding: 10,
    borderRadius: 8,
    background: "#f4f8f5",
    color: "#31503a",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.45,
  },
};
