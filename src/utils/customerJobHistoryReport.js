import { Capacitor } from "@capacitor/core";
import { jsPDF } from "jspdf";

import {
  downloadBusinessDocumentPdfArtifact,
  openBusinessDocumentEmailDraft,
  previewBusinessDocumentPdfArtifact,
  shareBusinessDocumentPdfArtifact,
} from "./businessDocumentDeviceShare.js";

const PAGE = Object.freeze({
  width: 612,
  height: 792,
  margin: 46,
  footerY: 766,
});

const COLORS = Object.freeze({
  ink: [6, 61, 38],
  text: [31, 41, 55],
  muted: [107, 114, 128],
  line: [209, 213, 219],
  fill: [247, 246, 242],
  accent: [11, 93, 59],
});

const COPY = Object.freeze({
  en: Object.freeze({
    report: "JOB HISTORY REPORT",
    customer: "Customer",
    professional: "Professional",
    project: "Project",
    completed: "Completed",
    status: "Status",
    approvedAmount: "Approved amount",
    originalRequest: "Original request",
    assessment: "Project assessment",
    evaluation: "Evaluation",
    findings: "Findings",
    recommendations: "Recommendations",
    deposits: "Deposits / Payments",
    required: "Required",
    applied: "Applied",
    balance: "Balance",
    received: "Received",
    visits: "Visits / Schedule",
    work: "Work performed",
    customerUpdates: "Customer updates",
    quotes: "Quotes",
    invoices: "Invoice",
    documents: "Documents",
    photos: "Request photos",
    paymentHistory: "Payment history",
    total: "Total",
    paid: "Paid",
    invoiceBalance: "Balance",
    lineItems: "Invoice line items",
    readOnly: "This is a read-only Job History report generated from the customer-visible Meetro record.",
    preparedWith: "Prepared with Meetro",
  }),
  es: Object.freeze({
    report: "INFORME DEL HISTORIAL DEL TRABAJO",
    customer: "Cliente",
    professional: "Profesional",
    project: "Proyecto",
    completed: "Completado",
    status: "Estado",
    approvedAmount: "Monto aprobado",
    originalRequest: "Solicitud original",
    assessment: "Evaluación del proyecto",
    evaluation: "Evaluación",
    findings: "Hallazgos",
    recommendations: "Recomendaciones",
    deposits: "Depósitos / Pagos",
    required: "Requerido",
    applied: "Aplicado",
    balance: "Saldo",
    received: "Recibido",
    visits: "Visitas / Agenda",
    work: "Trabajo realizado",
    customerUpdates: "Actualizaciones al cliente",
    quotes: "Cotizaciones",
    invoices: "Factura",
    documents: "Documentos",
    photos: "Fotos de la solicitud",
    paymentHistory: "Historial de pagos",
    total: "Total",
    paid: "Pagado",
    invoiceBalance: "Saldo",
    lineItems: "Partidas de la factura",
    readOnly: "Este es un informe de solo lectura generado desde el registro de Meetro visible para el cliente.",
    preparedWith: "Preparado con Meetro",
  }),
  fr: Object.freeze({
    report: "RAPPORT D’HISTORIQUE DU TRAVAIL",
    customer: "Client",
    professional: "Professionnel",
    project: "Projet",
    completed: "Terminé",
    status: "Statut",
    approvedAmount: "Montant approuvé",
    originalRequest: "Demande initiale",
    assessment: "Évaluation du projet",
    evaluation: "Évaluation",
    findings: "Constatations",
    recommendations: "Recommandations",
    deposits: "Acomptes / Paiements",
    required: "Requis",
    applied: "Appliqué",
    balance: "Solde",
    received: "Reçu",
    visits: "Visites / Calendrier",
    work: "Travail effectué",
    customerUpdates: "Mises à jour client",
    quotes: "Devis",
    invoices: "Facture",
    documents: "Documents",
    photos: "Photos de la demande",
    paymentHistory: "Historique des paiements",
    total: "Total",
    paid: "Payé",
    invoiceBalance: "Solde",
    lineItems: "Lignes de facture",
    readOnly: "Ceci est un rapport en lecture seule généré à partir du dossier Meetro visible par le client.",
    preparedWith: "Préparé avec Meetro",
  }),
  "pt-BR": Object.freeze({
    report: "RELATÓRIO DO HISTÓRICO DO TRABALHO",
    customer: "Cliente",
    professional: "Profissional",
    project: "Projeto",
    completed: "Concluído",
    status: "Status",
    approvedAmount: "Valor aprovado",
    originalRequest: "Solicitação original",
    assessment: "Avaliação do projeto",
    evaluation: "Avaliação",
    findings: "Constatações",
    recommendations: "Recomendações",
    deposits: "Depósitos / Pagamentos",
    required: "Obrigatório",
    applied: "Aplicado",
    balance: "Saldo",
    received: "Recebido",
    visits: "Visitas / Agenda",
    work: "Trabalho realizado",
    customerUpdates: "Atualizações ao cliente",
    quotes: "Orçamentos",
    invoices: "Fatura",
    documents: "Documentos",
    photos: "Fotos da solicitação",
    paymentHistory: "Histórico de pagamentos",
    total: "Total",
    paid: "Pago",
    invoiceBalance: "Saldo",
    lineItems: "Itens da fatura",
    readOnly: "Este é um relatório somente leitura gerado a partir do registro Meetro visível ao cliente.",
    preparedWith: "Preparado com Meetro",
  }),
});

function copyFor(language) {
  return COPY[language] || COPY.en;
}

function text(value, maximum = 5000) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized && normalized.length <= maximum
    ? normalized
    : "";
}

function timestamp(value, { nullable = true } = {}) {
  if (value == null) return nullable ? null : "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString();
}

function minor(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? parsed
    : null;
}

function currency(value) {
  const normalized = text(value, 3);
  return /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : "";
}

function localeFor(language) {
  return {
    en: "en-US",
    es: "es",
    fr: "fr",
    "pt-BR": "pt-BR",
  }[language] || "en-US";
}

function money(value, code, language) {
  const amount = minor(value);
  const normalizedCurrency = currency(code);

  if (
    amount == null ||
    !normalizedCurrency
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    localeFor(language),
    {
      style: "currency",
      currency: normalizedCurrency,
    }
  ).format(amount / 100);
}

function date(value, language) {
  const normalized = timestamp(value);

  if (!normalized) return "—";

  return new Intl.DateTimeFormat(
    localeFor(language),
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(new Date(normalized));
}

function safeFileSegment(value) {
  return (
    text(value, 100)
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) ||
    "Job-History"
  );
}

function mapAssessment(value) {
  if (!value) return null;

  return Object.freeze({
    evaluation: value.evaluation
      ? Object.freeze({
          status:
            text(
              value.evaluation.status,
              80
            ),
          completedAt:
            timestamp(
              value.evaluation.completedAt
            ),
        })
      : null,

    findings: Object.freeze(
      (value.findings || []).map(
        (finding) =>
          Object.freeze({
            statement:
              text(
                finding.statement
              ),
            state:
              text(
                finding.state,
                80
              ),
          })
      )
    ),

    recommendations: Object.freeze(
      (value.recommendations || []).map(
        (recommendation) =>
          Object.freeze({
            statement:
              text(
                recommendation.statement
              ),
            state:
              text(
                recommendation.state,
                80
              ),
          })
      )
    ),
  });
}

export function buildCustomerJobHistoryReportModel({
  history,
  quotes = [],
  invoice = null,
  workPlan = null,
  assessment = null,
  language = "en",
} = {}) {
  if (
    !history ||
    !text(history.jobId, 100) ||
    !text(history.serviceTitle, 500) ||
    !timestamp(history.completedAt)
  ) {
    throw new TypeError(
      "Verified customer Job History is required."
    );
  }

  const historyRecords =
    history.historyRecords || {
      deposits: [],
      media: [],
      visits: [],
      emergencyAssessment: null,
    };

  const reportAssessment =
    assessment ||
    historyRecords.emergencyAssessment;

  return Object.freeze({
    schemaVersion: 1,
    language,

    job: Object.freeze({
      serviceTitle:
        text(history.serviceTitle, 500),

      professionalName:
        text(
          history.professionalName,
          500
        ),

      customerName:
        text(
          history.customerName,
          500
        ),

      status:
        text(history.status, 80),

      completedAt:
        timestamp(history.completedAt),

      sourceLabel:
        text(
          history.sourceLabel ||
            history.sourceType ||
            "",
          100
        ),

      approvedQuote:
        history.approvedQuote
          ? Object.freeze({
              totalMinor:
                minor(
                  history
                    .approvedQuote
                    .totalMinor
                ),

              currency:
                currency(
                  history
                    .approvedQuote
                    .currency
                ),
            })
          : null,

      completionSummary:
        Object.freeze({
          workstreamCount:
            Number(
              history
                .completionSummary
                ?.workstreamCount || 0
            ),

          workItemCount:
            Number(
              history
                .completionSummary
                ?.workItemCount || 0
            ),

          customerUpdateCount:
            Number(
              history
                .completionSummary
                ?.customerUpdateCount || 0
            ),
        }),

      originalRequest:
        history.originalRequest
          ? Object.freeze({
              concern:
                text(
                  history
                    .originalRequest
                    .concern
                ),

              reportedAt:
                timestamp(
                  history
                    .originalRequest
                    .reportedAt
                ),
            })
          : null,
    }),

    assessment:
      mapAssessment(
        reportAssessment
      ),

    deposits: Object.freeze(
      (historyRecords.deposits || [])
        .map((deposit) =>
          Object.freeze({
            state:
              text(
                deposit.state,
                80
              ),

            currency:
              currency(
                deposit.currency
              ),

            requiredMinor:
              minor(
                deposit.requiredMinor
              ),

            appliedMinor:
              minor(
                deposit.appliedMinor
              ),

            remainingMinor:
              minor(
                deposit.remainingMinor
              ),

            payments:
              Object.freeze(
                (deposit.payments || [])
                  .map((payment) =>
                    Object.freeze({
                      grossAmountMinor:
                        minor(
                          payment
                            .grossAmountMinor
                        ),

                      currency:
                        currency(
                          payment.currency
                        ),

                      method:
                        text(
                          payment.method,
                          120
                        ),

                      receivedAt:
                        timestamp(
                          payment.receivedAt
                        ),
                    })
                  )
              ),
          })
        )
    ),

    visits: Object.freeze(
      (historyRecords.visits || [])
        .map((visit) =>
          Object.freeze({
            purpose:
              text(
                visit.purpose,
                80
              ),

            state:
              text(
                visit.state,
                80
              ),

            scheduledStartAt:
              timestamp(
                visit.scheduledStartAt
              ),

            scheduledEndAt:
              timestamp(
                visit.scheduledEndAt
              ),

            completedAt:
              timestamp(
                visit.completedAt
              ),
          })
        )
    ),

    work: Object.freeze(
      (workPlan?.workstreams || [])
        .map((workstream) =>
          Object.freeze({
            title:
              text(
                workstream.title,
                500
              ),

            status:
              text(
                workstream.status,
                80
              ),

            activities:
              Object.freeze(
                (workstream.activities || [])
                  .map((activity) =>
                    Object.freeze({
                      statement:
                        text(
                          activity.statement
                        ),

                      status:
                        text(
                          activity.status,
                          80
                        ),

                      performedAt:
                        timestamp(
                          activity.performedAt
                        ),
                    })
                  )
              ),

            updates:
              Object.freeze(
                (workstream.updates || [])
                  .map((update) =>
                    Object.freeze({
                      statement:
                        text(
                          update.statement
                        ),
                    })
                  )
              ),
          })
        )
    ),

    quotes: Object.freeze(
      (quotes || []).map(
        (quote) =>
          Object.freeze({
            quoteNumber:
              text(
                quote.quoteNumber ||
                  "Quote",
                80
              ),

            lineageLabel:
              text(
                quote.lineageLabel,
                80
              ),

            businessStatus:
              text(
                quote.businessStatus,
                80
              ),

            customerDecision:
              text(
                quote.customerDecision ||
                  "",
                80
              ),

            totalMinor:
              minor(
                quote.totalMinor
              ),

            currency:
              currency(
                quote.currency
              ),

            issuedAt:
              timestamp(
                quote.issuedAt
              ),
          })
      )
    ),

    invoice: invoice
      ? Object.freeze({
          invoiceNumber:
            text(
              invoice.invoiceNumber,
              80
            ),

          status:
            text(
              invoice.status,
              80
            ),

          currency:
            currency(
              invoice.currency
            ),

          totalMinor:
            minor(
              invoice.totalMinor
            ),

          paidMinor:
            minor(
              invoice.paidMinor
            ),

          balanceMinor:
            minor(
              invoice.balanceMinor
            ),

          issuedAt:
            timestamp(
              invoice.issuedAt
            ),

          invoiceDate:
            timestamp(
              invoice.invoiceDate
            ),

          lineItems:
            Object.freeze(
              (invoice.lineItems || [])
                .map((line) =>
                  Object.freeze({
                    description:
                      text(
                        line.description,
                        1000
                      ),

                    type:
                      text(
                        line.type,
                        80
                      ),

                    quantity:
                      Number(
                        line.quantity || 0
                      ),

                    lineTotalMinor:
                      minor(
                        line.lineTotalMinor
                      ),
                  })
                )
            ),

          payments:
            Object.freeze(
              (invoice.payments || [])
                .map((payment) =>
                  Object.freeze({
                    amountMinor:
                      minor(
                        payment.amountMinor
                      ),

                    currency:
                      currency(
                        payment.currency
                      ),

                    method:
                      text(
                        payment.method,
                        120
                      ),

                    receivedDate:
                      timestamp(
                        payment.receivedDate
                      ),
                  })
                )
            ),
        })
      : null,

    media: Object.freeze(
      (historyRecords.media || [])
        .map((photo) =>
          Object.freeze({
            secureUrl:
              text(
                photo.secureUrl,
                2000
              ),

            format:
              text(
                photo.format || "",
                40
              ),

            uploadedAt:
              timestamp(
                photo.uploadedAt
              ),
          })
        )
        .filter(
          (photo) =>
            photo.secureUrl.startsWith(
              "https://res.cloudinary.com/"
            )
        )
    ),
  });
}

async function imageDataUrl(
  imageUrl,
  fetchImpl
) {
  if (
    !imageUrl?.startsWith(
      "https://res.cloudinary.com/"
    ) ||
    typeof fetchImpl !== "function"
  ) {
    return null;
  }

  try {
    const response =
      await fetchImpl(
        imageUrl,
        {
          method: "GET",
          credentials: "omit",
          cache: "force-cache",
        }
      );

    if (!response.ok) return null;

    const blob =
      await response.blob();

    if (
      !new Set([
        "image/png",
        "image/jpeg",
        "image/webp",
      ]).has(blob.type) ||
      blob.size > 12_000_000
    ) {
      return null;
    }

    const bytes =
      new Uint8Array(
        await blob.arrayBuffer()
      );

    let binary = "";

    for (
      let offset = 0;
      offset < bytes.length;
      offset += 8192
    ) {
      binary +=
        String.fromCharCode(
          ...bytes.subarray(
            offset,
            offset + 8192
          )
        );
    }

    const base64 =
      globalThis.btoa?.(binary);

    return base64
      ? `data:${blob.type};base64,${base64}`
      : null;
  } catch {
    return null;
  }
}

async function prepareMedia(
  media,
  fetchImpl
) {
  return Promise.all(
    media.map(async (photo) =>
      Object.freeze({
        ...photo,
        dataUrl:
          await imageDataUrl(
            photo.secureUrl,
            fetchImpl
          ),
      })
    )
  );
}

export async function createCustomerJobHistoryPdfArtifact(
  model,
  {
    jsPDFImpl = jsPDF,
    fetchImpl = globalThis.fetch,
  } = {}
) {
  if (
    model?.schemaVersion !== 1 ||
    !model?.job?.serviceTitle ||
    !model?.job?.completedAt
  ) {
    throw new TypeError(
      "Verified Job History report model is required."
    );
  }

  const copy =
    copyFor(model.language);

  const media =
    await prepareMedia(
      model.media,
      fetchImpl
    );

  const doc =
    new jsPDFImpl({
      unit: "pt",
      format: "letter",
      orientation: "portrait",
      compress: true,
    });

  const contentWidth =
    PAGE.width -
    PAGE.margin * 2;

  let y = PAGE.margin;

  function addText(
    value,
    x = PAGE.margin,
    options = {}
  ) {
    const {
      size = 10,
      style = "normal",
      color = COLORS.text,
      maxWidth = contentWidth,
      align = "left",
    } = options;

    doc.setFont(
      "helvetica",
      style
    );

    doc.setFontSize(size);
    doc.setTextColor(...color);

    const lines =
      doc.splitTextToSize(
        String(value || ""),
        maxWidth
      );

    doc.text(
      lines,
      x,
      y,
      { align }
    );

    y +=
      Math.max(
        lines.length,
        1
      ) *
      size *
      1.3;

    return lines.length;
  }

  function pageHeader() {
    addText(
      copy.report,
      PAGE.margin,
      {
        size: 9,
        style: "bold",
        color: COLORS.muted,
      }
    );

    doc.setDrawColor(
      ...COLORS.line
    );

    doc.line(
      PAGE.margin,
      y,
      PAGE.width - PAGE.margin,
      y
    );

    y += 14;
  }

  function ensureSpace(height) {
    if (
      y + height <=
      PAGE.footerY - 20
    ) {
      return;
    }

    doc.addPage(
      "letter",
      "portrait"
    );

    y = PAGE.margin;
    pageHeader();
  }

  function section(title) {
    ensureSpace(46);

    y += 5;

    addText(
      title,
      PAGE.margin,
      {
        size: 13,
        style: "bold",
        color: COLORS.ink,
      }
    );

    doc.setDrawColor(
      ...COLORS.line
    );

    doc.line(
      PAGE.margin,
      y - 7,
      PAGE.width - PAGE.margin,
      y - 7
    );

    y += 4;
  }

  function row(
    label,
    value
  ) {
    if (
      value == null ||
      value === ""
    ) {
      return;
    }

    const printable =
      String(value);

    const lines =
      doc.splitTextToSize(
        printable,
        contentWidth - 120
      );

    ensureSpace(
      Math.max(
        24,
        lines.length * 13 + 8
      )
    );

    const rowY = y;

    addText(
      label,
      PAGE.margin,
      {
        size: 9,
        style: "bold",
        color: COLORS.muted,
        maxWidth: 105,
      }
    );

    y = rowY;

    addText(
      printable,
      PAGE.margin + 120,
      {
        size: 10,
        maxWidth:
          contentWidth - 120,
      }
    );

    y = Math.max(
      y,
      rowY + 18
    );
  }

  function bullet(
    value,
    meta = ""
  ) {
    if (!value) return;

    ensureSpace(34);

    const startY = y;

    addText(
      "•",
      PAGE.margin + 4,
      {
        size: 11,
        style: "bold",
        maxWidth: 10,
      }
    );

    y = startY;

    addText(
      value,
      PAGE.margin + 18,
      {
        size: 10,
        maxWidth:
          contentWidth - 18,
      }
    );

    if (meta) {
      addText(
        meta,
        PAGE.margin + 18,
        {
          size: 8.5,
          color: COLORS.muted,
          maxWidth:
            contentWidth - 18,
        }
      );
    }

    y += 3;
  }

  addText(
    "MEETRO",
    PAGE.margin,
    {
      size: 12,
      style: "bold",
      color: COLORS.accent,
    }
  );

  addText(
    copy.report,
    PAGE.margin,
    {
      size: 22,
      style: "bold",
      color: COLORS.ink,
    }
  );

  addText(
    model.job.serviceTitle,
    PAGE.margin,
    {
      size: 17,
      style: "bold",
      color: COLORS.text,
    }
  );

  y += 4;

  row(
    copy.customer,
    model.job.customerName
  );

  row(
    copy.professional,
    model.job.professionalName
  );

  row(
    copy.completed,
    date(
      model.job.completedAt,
      model.language
    )
  );

  row(
    copy.status,
    model.job.status
  );

  if (
    model.job.approvedQuote
      ?.currency
  ) {
    row(
      copy.approvedAmount,
      money(
        model.job.approvedQuote
          .totalMinor,
        model.job.approvedQuote
          .currency,
        model.language
      )
    );
  }

  if (
    model.job.originalRequest
      ?.concern
  ) {
    section(
      copy.originalRequest
    );

    addText(
      model.job.originalRequest
        .concern,
      PAGE.margin,
      {
        size: 10.5,
      }
    );

    if (
      model.job.originalRequest
        .reportedAt
    ) {
      addText(
        date(
          model.job.originalRequest
            .reportedAt,
          model.language
        ),
        PAGE.margin,
        {
          size: 8.5,
          color: COLORS.muted,
        }
      );
    }
  }

  if (model.assessment) {
    section(copy.assessment);

    if (
      model.assessment.evaluation
    ) {
      row(
        copy.evaluation,
        [
          model.assessment
            .evaluation.status,
          model.assessment
            .evaluation.completedAt
            ? date(
                model.assessment
                  .evaluation
                  .completedAt,
                model.language
              )
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
      );
    }

    if (
      model.assessment.findings
        .length
    ) {
      addText(
        copy.findings,
        PAGE.margin,
        {
          size: 10,
          style: "bold",
        }
      );

      for (
        const finding
        of model.assessment
          .findings
      ) {
        bullet(
          finding.statement,
          finding.state
        );
      }
    }

    if (
      model.assessment
        .recommendations.length
    ) {
      addText(
        copy.recommendations,
        PAGE.margin,
        {
          size: 10,
          style: "bold",
        }
      );

      for (
        const recommendation
        of model.assessment
          .recommendations
      ) {
        bullet(
          recommendation.statement,
          recommendation.state
        );
      }
    }
  }

  if (model.deposits.length) {
    section(copy.deposits);

    for (
      const deposit
      of model.deposits
    ) {
      bullet(
        [
          deposit.state,
          `${copy.required}: ${money(
            deposit.requiredMinor,
            deposit.currency,
            model.language
          )}`,
          `${copy.applied}: ${money(
            deposit.appliedMinor,
            deposit.currency,
            model.language
          )}`,
          `${copy.balance}: ${money(
            deposit.remainingMinor,
            deposit.currency,
            model.language
          )}`,
        ].join(" · ")
      );

      for (
        const payment
        of deposit.payments
      ) {
        bullet(
          `${copy.received}: ${money(
            payment.grossAmountMinor,
            payment.currency,
            model.language
          )}`,
          [
            payment.method,
            payment.receivedAt
              ? date(
                  payment.receivedAt,
                  model.language
                )
              : "",
          ]
            .filter(Boolean)
            .join(" · ")
        );
      }
    }
  }

  if (model.visits.length) {
    section(copy.visits);

    for (
      const visit
      of model.visits
    ) {
      bullet(
        [
          visit.purpose
            .replaceAll("_", " "),
          visit.state,
        ]
          .filter(Boolean)
          .join(" · "),
        visit.scheduledStartAt
          ? date(
              visit.scheduledStartAt,
              model.language
            )
          : ""
      );
    }
  }

  section(copy.work);

  if (model.work.length) {
    for (
      const workstream
      of model.work
    ) {
      bullet(
        workstream.title,
        workstream.status
      );

      for (
        const activity
        of workstream.activities
      ) {
        bullet(
          activity.statement,
          [
            activity.status,
            activity.performedAt
              ? date(
                  activity.performedAt,
                  model.language
                )
              : "",
          ]
            .filter(Boolean)
            .join(" · ")
        );
      }

      for (
        const update
        of workstream.updates
      ) {
        bullet(
          update.statement,
          copy.customerUpdates
        );
      }
    }
  } else {
    row(
      copy.work,
      String(
        model.job
          .completionSummary
          .workstreamCount
      )
    );

    row(
      copy.completed,
      String(
        model.job
          .completionSummary
          .workItemCount
      )
    );

    row(
      copy.customerUpdates,
      String(
        model.job
          .completionSummary
          .customerUpdateCount
      )
    );
  }

  if (model.quotes.length) {
    section(copy.quotes);

    for (
      const quote
      of model.quotes
    ) {
      bullet(
        `${quote.quoteNumber} · ${money(
          quote.totalMinor,
          quote.currency,
          model.language
        )}`,
        [
          quote.lineageLabel,
          quote.customerDecision ||
            quote.businessStatus,
          quote.issuedAt
            ? date(
                quote.issuedAt,
                model.language
              )
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
      );
    }
  }

  if (model.invoice) {
    section(copy.invoices);

    bullet(
      `${model.invoice.invoiceNumber} · ${money(
        model.invoice.totalMinor,
        model.invoice.currency,
        model.language
      )}`,
      [
        model.invoice.status,
        model.invoice.issuedAt
          ? date(
              model.invoice.issuedAt,
              model.language
            )
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
    );

    row(
      copy.total,
      money(
        model.invoice.totalMinor,
        model.invoice.currency,
        model.language
      )
    );

    row(
      copy.paid,
      money(
        model.invoice.paidMinor,
        model.invoice.currency,
        model.language
      )
    );

    row(
      copy.invoiceBalance,
      money(
        model.invoice.balanceMinor,
        model.invoice.currency,
        model.language
      )
    );

    if (
      model.invoice.lineItems
        .length
    ) {
      addText(
        copy.lineItems,
        PAGE.margin,
        {
          size: 10,
          style: "bold",
        }
      );

      for (
        const line
        of model.invoice.lineItems
      ) {
        bullet(
          line.description,
          `${line.quantity} × ${money(
            line.lineTotalMinor,
            model.invoice.currency,
            model.language
          )}`
        );
      }
    }

    if (
      model.invoice.payments
        .length
    ) {
      addText(
        copy.paymentHistory,
        PAGE.margin,
        {
          size: 10,
          style: "bold",
        }
      );

      for (
        const payment
        of model.invoice.payments
      ) {
        bullet(
          money(
            payment.amountMinor,
            payment.currency,
            model.language
          ),
          [
            payment.method,
            payment.receivedDate
              ? date(
                  payment.receivedDate,
                  model.language
                )
              : "",
          ]
            .filter(Boolean)
            .join(" · ")
        );
      }
    }
  }

  section(copy.documents);

  for (
    const quote
    of model.quotes
  ) {
    bullet(
      quote.quoteNumber,
      quote.lineageLabel
    );
  }

  if (model.invoice) {
    bullet(
      model.invoice
        .invoiceNumber,
      model.invoice.status
    );
  }

  if (media.length) {
    section(copy.photos);

    addText(
      `${copy.photos}: ${media.length}`,
      PAGE.margin,
      {
        size: 9,
        color: COLORS.muted,
      }
    );

    const photoWidth =
      (contentWidth - 12) / 2;

    const photoHeight = 130;

    for (
      let index = 0;
      index < media.length;
      index += 2
    ) {
      const pair =
        media.slice(
          index,
          index + 2
        );

      ensureSpace(
        photoHeight + 38
      );

      const startY = y;

      pair.forEach(
        (photo, column) => {
          const x =
            PAGE.margin +
            column *
              (photoWidth + 12);

          if (photo.dataUrl) {
            const match =
              photo.dataUrl.match(
                /^data:image\/(png|jpeg|webp);/i
              );

            const format =
              match?.[1]
                ?.toUpperCase()
                ?.replace(
                  "JPG",
                  "JPEG"
                );

            try {
              doc.addImage(
                photo.dataUrl,
                format || undefined,
                x,
                startY,
                photoWidth,
                photoHeight,
                undefined,
                "FAST"
              );
            } catch {
              doc.setDrawColor(
                ...COLORS.line
              );

              doc.rect(
                x,
                startY,
                photoWidth,
                photoHeight
              );
            }
          } else {
            doc.setDrawColor(
              ...COLORS.line
            );

            doc.rect(
              x,
              startY,
              photoWidth,
              photoHeight
            );
          }
        }
      );

      y =
        startY +
        photoHeight +
        16;
    }
  }

  addText(
    copy.readOnly,
    PAGE.margin,
    {
      size: 9,
      color: COLORS.muted,
    }
  );

  const pages =
    doc.getNumberOfPages();

  for (
    let pageNumber = 1;
    pageNumber <= pages;
    pageNumber += 1
  ) {
    doc.setPage(pageNumber);

    doc.setDrawColor(
      ...COLORS.line
    );

    doc.line(
      PAGE.margin,
      PAGE.footerY - 10,
      PAGE.width - PAGE.margin,
      PAGE.footerY - 10
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7.5);
    doc.setTextColor(
      ...COLORS.muted
    );

    doc.text(
      copy.preparedWith,
      PAGE.margin,
      PAGE.footerY
    );

    doc.text(
      `${pageNumber} / ${pages}`,
      PAGE.width - PAGE.margin,
      PAGE.footerY,
      {
        align: "right",
      }
    );
  }

  doc.setProperties({
    title:
      `${copy.report} — ${model.job.serviceTitle}`,
    subject:
      copy.readOnly,
    author: "Meetro",
    creator: "Meetro",
  });

  const blob =
    doc.output("blob");

  const dateSegment =
    String(
      model.job.completedAt
    ).slice(0, 10);

  const fileName =
    `Meetro-Job-History-${safeFileSegment(
      model.job.serviceTitle
    )}-${dateSegment}.pdf`;

  return Object.freeze({
    doc,
    blob,
    fileName,
    contentType:
      "application/pdf",
    title:
      `${copy.report} — ${model.job.serviceTitle}`,
  });
}

export async function downloadCustomerJobHistoryReport(
  model,
  {
    createArtifact =
      createCustomerJobHistoryPdfArtifact,

    downloadArtifact =
      downloadBusinessDocumentPdfArtifact,
  } = {}
) {
  const artifact =
    await createArtifact(model);

  return Object.freeze({
    ok:
      downloadArtifact(
        artifact
      ) === true,

    method: "download",
    fileName:
      artifact.fileName,
  });
}

export async function shareCustomerJobHistoryReport(
  model,
  {
    createArtifact =
      createCustomerJobHistoryPdfArtifact,

    shareArtifact =
      shareBusinessDocumentPdfArtifact,

    downloadArtifact =
      downloadBusinessDocumentPdfArtifact,
  } = {}
) {
  const artifact =
    await createArtifact(model);

  const shared =
    await shareArtifact({
      artifact,
      message:
        `Meetro Job History Report: ${model.job.serviceTitle}`,
    });

  if (shared?.ok) {
    return Object.freeze({
      ...shared,
      fileName:
        artifact.fileName,
    });
  }

  const downloaded =
    downloadArtifact(
      artifact
    );

  return Object.freeze({
    ok:
      downloaded === true,
    method:
      downloaded
        ? "download"
        : "unavailable",
    fileName:
      artifact.fileName,
  });
}


function openCustomerJobHistoryEmailDraft({
  recipient = "",
  subject = "",
  message = "",
  locationObject = globalThis.location,
} = {}) {
  if (!locationObject) {
    return false;
  }

  const body = [
    message,
    "",
    "Please attach the Meetro Job History PDF before sending.",
  ].join("\n");

  locationObject.href =
    `mailto:${encodeURIComponent(recipient)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  return true;
}

export async function emailCustomerJobHistoryReport(
  model,
  {
    createArtifact =
      createCustomerJobHistoryPdfArtifact,

    shareArtifact =
      shareBusinessDocumentPdfArtifact,

    openEmailDraft =
      openCustomerJobHistoryEmailDraft,

    isNative =
      Capacitor.isNativePlatform(),

    platform =
      Capacitor.getPlatform(),
  } = {}
) {
  const artifact =
    await createArtifact(model);

  const subject =
    `Meetro Job History — ${model.job.serviceTitle}`;

  const message =
    [
      "Attached is the Meetro Job History Report.",
      "",
      model.job.serviceTitle,
      `${copyFor(model.language).completed}: ${date(
        model.job.completedAt,
        model.language
      )}`,
    ].join("\n");

  if (
    isNative &&
    ["ios", "android"].includes(
      platform
    )
  ) {
    const shared =
      await shareArtifact({
        artifact,
        message,
      });

    return Object.freeze({
      ok:
        shared?.ok === true,

      method:
        shared?.method ||
        "unavailable",

      fileName:
        artifact.fileName,

      chooseEmailApp:
        shared?.ok === true,
    });
  }

  const draftOpened =
    openEmailDraft({
      recipient: "",
      subject,
      message,
    });

  return Object.freeze({
    ok:
      draftOpened === true,

    method:
      draftOpened
        ? "email-draft"
        : "unavailable",

    fileName:
      artifact.fileName,

    manualAttachment:
      draftOpened === true,

    attachmentDownloaded:
      false,
  });
}

export async function printCustomerJobHistoryReport(
  model,
  {
    createArtifact =
      createCustomerJobHistoryPdfArtifact,

    previewArtifact =
      previewBusinessDocumentPdfArtifact,

    shareArtifact =
      shareBusinessDocumentPdfArtifact,

    isNative =
      Capacitor.isNativePlatform(),

    platform =
      Capacitor.getPlatform(),
  } = {}
) {
  const artifact =
    await createArtifact(model);

  if (
    isNative &&
    ["ios", "android"].includes(
      platform
    )
  ) {
    const shared =
      await shareArtifact({
        artifact,
        message:
          "Choose Print or Save to Files for this Job History Report.",
      });

    return Object.freeze({
      ...shared,
      fileName:
        artifact.fileName,
      printFromShareSheet:
        shared?.ok === true,
    });
  }

  if (
    typeof artifact.doc
      ?.autoPrint === "function"
  ) {
    try {
      artifact.doc.autoPrint();

      const printable =
        Object.freeze({
          ...artifact,
          blob:
            artifact.doc.output(
              "blob"
            ),
        });

      const opened =
        await previewArtifact(
          printable,
          {
            isNative: false,
          }
        );

      return Object.freeze({
        ok:
          opened === true,
        method:
          opened
            ? "print-ready-pdf"
            : "unavailable",
        fileName:
          artifact.fileName,
      });
    } catch {
      // Fall through to a normal PDF preview.
    }
  }

  const opened =
    await previewArtifact(
      artifact,
      {
        isNative: false,
      }
    );

  return Object.freeze({
    ok:
      opened === true,
    method:
      opened
        ? "pdf-preview"
        : "unavailable",
    fileName:
      artifact.fileName,
  });
}

export const customerJobHistoryReportInternals =
  Object.freeze({
    copyFor,
    date,
    money,
    safeFileSegment,
  });
