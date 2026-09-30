import { Capacitor } from "@capacitor/core";
import { jsPDF } from "jspdf";

import {
  downloadBusinessDocumentPdfArtifact,
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
    print: "Print",
    share: "Share",
    email: "Email",
    preparing: "Preparing…",
    reportActions: "Job History report actions",
    evaluationVisit: "Evaluation visit",
    workVisit: "Work visit",
    noWorkDetails: "No additional recorded work-detail entries are available for this Job.",
    noFinalizedInvoice: "No finalized invoice is available for this Job yet.",
    noPhotos: "No customer-visible request photos are available for this Job.",
    recordsUnavailable: "These records could not be loaded. Reopen Job History to try again.",
    approvedWork: "Approved work",
    extraWork: "Extra work",
    quantity: "Qty",
    pdfUnavailable: "Job History PDF is unavailable on this device.",
    printShareNotice: "Job History PDF is ready. Choose Print from the share sheet.",
    printNotice: "Print-ready Job History PDF opened.",
    emailManualNotice: "Email draft opened. Browsers cannot attach the PDF automatically. Use Share to save the Job History PDF, then attach it before sending.",
    emailNativeNotice: "Job History PDF is ready. Choose Mail or your email app from the share sheet.",
    downloadNotice: "System sharing is unavailable, so the Job History PDF was downloaded instead.",
    shareNotice: "Job History PDF is ready to share.",
    readyNotice: "Job History PDF is ready.",
    failedNotice: "Job History PDF could not be prepared. Nothing was changed or sent.",
    cancelledNotice: "Sharing was cancelled.",
    emailSubject: "Meetro Job History",
    emailIntro: "Meetro Job History Report for the completed project:",
    manualAttachment: "Browsers cannot attach the PDF automatically. Use Share in Job History to save the PDF, then attach it manually before sending.",
    nativePrint: "Choose Print or Save to Files for this Job History Report.",
    photoUnavailable: "Photo could not be embedded. Open the original photo:",
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
    print: "Imprimir",
    share: "Compartir",
    email: "Correo",
    preparing: "Preparando…",
    reportActions: "Acciones del informe del historial",
    evaluationVisit: "Visita de evaluación",
    workVisit: "Visita de trabajo",
    noWorkDetails: "No hay más detalles de trabajo registrados para este trabajo.",
    noFinalizedInvoice: "Aún no hay una factura finalizada disponible para este trabajo.",
    noPhotos: "No hay fotos de la solicitud visibles para el cliente para este trabajo.",
    recordsUnavailable: "No se pudieron cargar estos registros. Vuelve a abrir el historial para intentar de nuevo.",
    approvedWork: "Trabajo aprobado",
    extraWork: "Trabajo adicional",
    quantity: "Cant.",
    pdfUnavailable: "El PDF del historial no está disponible en este dispositivo.",
    printShareNotice: "El PDF está listo. Elige Imprimir en la hoja para compartir.",
    printNotice: "Se abrió el PDF del historial listo para imprimir.",
    emailManualNotice: "Se abrió el borrador de correo. El navegador no puede adjuntar el PDF automáticamente. Usa Compartir para guardarlo y adjúntalo antes de enviar.",
    emailNativeNotice: "El PDF está listo. Elige Mail o tu aplicación de correo en la hoja para compartir.",
    downloadNotice: "No se puede compartir con el sistema. Se descargó el PDF del historial.",
    shareNotice: "El PDF del historial está listo para compartir.",
    readyNotice: "El PDF del historial está listo.",
    failedNotice: "No se pudo preparar el PDF. No se modificó ni envió nada.",
    cancelledNotice: "Se canceló compartir.",
    emailSubject: "Historial del trabajo de Meetro",
    emailIntro: "Informe del historial de Meetro para el proyecto completado:",
    manualAttachment: "El navegador no puede adjuntar el PDF automáticamente. Usa Compartir en el historial para guardar el PDF y adjúntalo manualmente antes de enviar.",
    nativePrint: "Elige Imprimir o Guardar en Archivos para este informe.",
    photoUnavailable: "No se pudo incluir la foto. Abre la foto original:",
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
    print: "Imprimer",
    share: "Partager",
    email: "E-mail",
    preparing: "Préparation…",
    reportActions: "Actions du rapport d’historique",
    evaluationVisit: "Visite d’évaluation",
    workVisit: "Visite de travail",
    noWorkDetails: "Aucun détail supplémentaire du travail n’est enregistré pour ce travail.",
    noFinalizedInvoice: "Aucune facture finalisée n’est encore disponible pour ce travail.",
    noPhotos: "Aucune photo de la demande visible par le client n’est disponible pour ce travail.",
    recordsUnavailable: "Ces dossiers n’ont pas pu être chargés. Rouvrez l’historique pour réessayer.",
    approvedWork: "Travail approuvé",
    extraWork: "Travail supplémentaire",
    quantity: "Qté",
    pdfUnavailable: "Le PDF de l’historique n’est pas disponible sur cet appareil.",
    printShareNotice: "Le PDF est prêt. Choisissez Imprimer dans la feuille de partage.",
    printNotice: "Le PDF de l’historique prêt à imprimer a été ouvert.",
    emailManualNotice: "Le brouillon d’e-mail a été ouvert. Le navigateur ne peut pas joindre le PDF automatiquement. Utilisez Partager pour l’enregistrer, puis joignez-le avant l’envoi.",
    emailNativeNotice: "Le PDF est prêt. Choisissez Mail ou votre application de messagerie dans la feuille de partage.",
    downloadNotice: "Le partage système est indisponible. Le PDF de l’historique a été téléchargé.",
    shareNotice: "Le PDF de l’historique est prêt à être partagé.",
    readyNotice: "Le PDF de l’historique est prêt.",
    failedNotice: "Le PDF n’a pas pu être préparé. Rien n’a été modifié ni envoyé.",
    cancelledNotice: "Le partage a été annulé.",
    emailSubject: "Historique du travail Meetro",
    emailIntro: "Rapport d’historique Meetro pour le projet terminé :",
    manualAttachment: "Le navigateur ne peut pas joindre le PDF automatiquement. Utilisez Partager dans l’historique pour enregistrer le PDF, puis joignez-le manuellement avant l’envoi.",
    nativePrint: "Choisissez Imprimer ou Enregistrer dans Fichiers pour ce rapport.",
    photoUnavailable: "La photo n’a pas pu être intégrée. Ouvrez la photo originale :",
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
    print: "Imprimir",
    share: "Compartilhar",
    email: "E-mail",
    preparing: "Preparando…",
    reportActions: "Ações do relatório do histórico",
    evaluationVisit: "Visita de avaliação",
    workVisit: "Visita de trabalho",
    noWorkDetails: "Não há outros detalhes de trabalho registrados para este trabalho.",
    noFinalizedInvoice: "Ainda não há uma fatura finalizada disponível para este trabalho.",
    noPhotos: "Não há fotos da solicitação visíveis ao cliente para este trabalho.",
    recordsUnavailable: "Não foi possível carregar estes registros. Abra o histórico novamente para tentar outra vez.",
    approvedWork: "Trabalho aprovado",
    extraWork: "Trabalho adicional",
    quantity: "Qtd.",
    pdfUnavailable: "O PDF do histórico não está disponível neste dispositivo.",
    printShareNotice: "O PDF está pronto. Escolha Imprimir na folha de compartilhamento.",
    printNotice: "O PDF do histórico pronto para impressão foi aberto.",
    emailManualNotice: "O rascunho de e-mail foi aberto. O navegador não pode anexar o PDF automaticamente. Use Compartilhar para salvá-lo e anexe-o antes de enviar.",
    emailNativeNotice: "O PDF está pronto. Escolha Mail ou seu aplicativo de e-mail na folha de compartilhamento.",
    downloadNotice: "O compartilhamento do sistema não está disponível. O PDF do histórico foi baixado.",
    shareNotice: "O PDF do histórico está pronto para compartilhar.",
    readyNotice: "O PDF do histórico está pronto.",
    failedNotice: "Não foi possível preparar o PDF. Nada foi alterado ou enviado.",
    cancelledNotice: "O compartilhamento foi cancelado.",
    emailSubject: "Histórico do trabalho Meetro",
    emailIntro: "Relatório do histórico Meetro para o projeto concluído:",
    manualAttachment: "O navegador não pode anexar o PDF automaticamente. Use Compartilhar no histórico para salvar o PDF e anexe-o manualmente antes de enviar.",
    nativePrint: "Escolha Imprimir ou Salvar em Arquivos para este relatório.",
    photoUnavailable: "Não foi possível incluir a foto. Abra a foto original:",
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

export function getCustomerJobHistoryReportCopy(language) {
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
    history.status !== "COMPLETED" ||
    !text(history.jobId, 100) ||
    !text(history.serviceTitle, 500) ||
    !timestamp(history.completedAt)
  ) {
    throw new TypeError(
      "Verified customer Job History is required."
    );
  }

  for (const record of [...quotes, invoice, workPlan,
    assessment === history.historyRecords?.emergencyAssessment ? null : assessment].filter(Boolean)) {
    if (record.jobId !== history.jobId) {
      throw new TypeError("History records must belong to the exact Job.");
    }
  }
  quotes = quotes.filter((quote, index, records) =>
    records.findIndex((candidate) => candidate.quoteId === quote.quoteId) === index
  );
  invoice = invoice && ["SENT", "PARTIALLY_PAID", "PAID"].includes(invoice.status)
    ? invoice : null;

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
        .filter((photo) => photo.category === "REQUEST_PHOTO")
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
          (photo) => isCustomerHistoryPhotoUrl(photo.secureUrl)
        )
    ),
  });
}

function isCustomerHistoryPhotoUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      !url.username && !url.password && url.pathname.startsWith("/") && url.pathname.length > 1;
  } catch { return false; }
}

async function imageDataUrl(
  imageUrl,
  fetchImpl
) {
  if (
    !isCustomerHistoryPhotoUrl(imageUrl) ||
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
    getCustomerJobHistoryReportCopy(model.language);

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

    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(value || ""), maxWidth);
    for (const line of lines) {
      ensureSpace(size * 1.3);
      // A new page header may change the font; restore the content styling.
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(line, x, y, { align });
      y += size * 1.3;
    }

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
    const rowPage = doc.getNumberOfPages();

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

    if (doc.getNumberOfPages() === rowPage) y = Math.max(y, rowY + 18);
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
          visit.purpose === "EVALUATION" ? copy.evaluationVisit : copy.workVisit,
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
    addText(copy.noWorkDetails);
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
          `${copy.quantity} ${line.quantity} · ${copy.total}: ${money(
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

  if (!model.invoice) {
    section(copy.invoices);
    addText(copy.noFinalizedInvoice);
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

      if (!pair.some((photo) => photo.dataUrl)) {
        for (const photo of pair) bullet(copy.photoUnavailable, photo.secureUrl);
        continue;
      }

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
              y = startY;
              addText(`${copy.photoUnavailable} ${photo.secureUrl}`, x, { size: 9, maxWidth: photoWidth });
            }
          } else {
            y = startY;
            addText(`${copy.photoUnavailable} ${photo.secureUrl}`, x, { size: 9, maxWidth: photoWidth });
          }
        }
      );

      y =
        startY +
        photoHeight +
        16;
    }
  }

  ensureSpace(doc.splitTextToSize(copy.readOnly, contentWidth).length * 9 * 1.3 + 8);
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
        `${getCustomerJobHistoryReportCopy(model.language).report}: ${model.job.serviceTitle}`,
    });

  if (shared?.method === "cancelled") return shared;

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

  locationObject.href =
    `mailto:${encodeURIComponent(recipient)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(message)}`;

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
  const copy = getCustomerJobHistoryReportCopy(model.language);
  const subject = `${copy.emailSubject} — ${model.job.serviceTitle}`;

  const message =
    [
      copy.emailIntro,
      "",
      model.job.serviceTitle,
      `${getCustomerJobHistoryReportCopy(model.language).completed}: ${date(
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
    const artifact = await createArtifact(model);
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
      message: `${message}\n\n${copy.manualAttachment}`,
    });

  return Object.freeze({
    ok:
      draftOpened === true,

    method:
      draftOpened
        ? "email-draft"
        : "unavailable",

    fileName: `Meetro-Job-History-${safeFileSegment(model.job.serviceTitle)}-${String(model.job.completedAt).slice(0, 10)}.pdf`,

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
          getCustomerJobHistoryReportCopy(model.language).nativePrint,
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
    copyFor: getCustomerJobHistoryReportCopy,
    date,
    money,
    safeFileSegment,
  });
