import { getWorkflowStatusLabel } from "../../utils/workflowStatus";
import {
  updateMatchingHomeownerRequests,
  prependProjectTimeline,
} from "../../utils/workflowTimeline";

function WorkflowMaterialsApprovalCard({
  msg,
  language,
  currentViewerRole,
  setMessages,
  setMessageText,
  styles,
}) {
  const {
    materialsApprovalActions,
    approveMaterialsButton,
    customerProvideMaterialsButton,
    requestMaterialsChangeButton,
    materialsApprovedNotice,
    materialsChangeNotice,
    materialsCustomerProvidingNotice,
  } = styles;

  return (
    <>
      {currentViewerRole !== "business" &&
        msg.status === "pending_materials_approval" && (
          <div style={materialsApprovalActions}>
            <button
              style={approveMaterialsButton}
              onClick={(event) => {
                event.stopPropagation();

                updateMatchingHomeownerRequests(
                  msg,
                  (request) =>
                    prependProjectTimeline(
                      {
                        ...request,
                        status: "materials_approved",
                        materialsApprovalPending: false,
                        materialsApproved: true,
                        materialsApprovedAt:
                          new Date().toISOString(),
                      },
                      {
                        type: "materialsApproved",
                        label:
                          language === "es"
                            ? "Materiales aprobados"
                            : "Materials approved",
                      }
                    )
                );

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          status: "materials_approved",
                          text:
                            language === "es"
                              ? "Materiales aprobados por el cliente."
                              : "Materials approved by customer.",
                        }
                      : item
                  )
                );
              }}
            >
              {language === "es"
                ? "Aprobar materiales"
                : "Approve Materials"}
            </button>

            <button
              style={customerProvideMaterialsButton}
              onClick={(event) => {
                event.stopPropagation();

                updateMatchingHomeownerRequests(
                  msg,
                  (request) =>
                    prependProjectTimeline(
                      {
                        ...request,
                        status: "customer_providing_materials",
                        materialsApprovalPending: false,
                        customerWillProvideMaterials: true,
                        customerWillProvideMaterialsAt:
                          new Date().toISOString(),
                      },
                      {
                        type: "customerWillProvideMaterials",
                        label:
                          language === "es"
                            ? "El cliente proveerá los materiales"
                            : "Customer will provide materials",
                      }
                    )
                );

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          status: "customer_providing_materials",
                          provider:
                            language === "es"
                              ? "El cliente proveerá los materiales"
                              : "Customer will provide materials",
                          text:
                            language === "es"
                              ? "El cliente indicó que proveerá los materiales."
                              : "Customer indicated they will provide the materials.",
                        }
                      : item
                  )
                );

                setMessageText(
                  language === "es"
                    ? "Yo puedo proveer los materiales para este trabajo."
                    : "I can provide the materials for this job."
                );
              }}
            >
              {language === "es"
                ? "Yo los proveo"
                : "Customer Will Provide"}
            </button>

            <button
              style={requestMaterialsChangeButton}
              onClick={(event) => {
                event.stopPropagation();

                updateMatchingHomeownerRequests(
                  msg,
                  (request) =>
                    prependProjectTimeline(
                      {
                        ...request,
                        status: "materials_change_requested",
                        materialsApprovalPending: false,
                        materialsChangeRequested: true,
                        materialsChangeRequestedAt:
                          new Date().toISOString(),
                      },
                      {
                        type: "materialsChangeRequested",
                        label:
                          language === "es"
                            ? "Cambios solicitados en materiales"
                            : "Materials changes requested",
                      }
                    )
                );

                setMessages((prev) =>
                  prev.map((item) =>
                    item.id === msg.id
                      ? {
                          ...item,
                          status: "materials_change_requested",
                          text:
                            language === "es"
                              ? "El cliente solicitó cambios en los materiales."
                              : "Customer requested changes to the materials.",
                        }
                      : item
                  )
                );

                setMessageText(
                  language === "es"
                    ? "Tengo una pregunta sobre los materiales."
                    : "I have a question about the materials."
                );
              }}
            >
              {language === "es"
                ? "Cambios"
                : "Request Change"}
            </button>
          </div>
        )}

      {msg.status === "materials_approved" && (
        <div style={materialsApprovedNotice}>
          ✅{" "}
          {getWorkflowStatusLabel("materials_approved", language)}
        </div>
      )}

      {msg.status === "materials_change_requested" && (
        <div style={materialsChangeNotice}>
          💬{" "}
          {getWorkflowStatusLabel("materials_change_requested", language)}
        </div>
      )}

      {msg.status === "customer_providing_materials" && (
        <div style={materialsCustomerProvidingNotice}>
          📦{" "}
          {getWorkflowStatusLabel("customer_providing_materials", language)}
        </div>
      )}
    </>
  );
}

export default WorkflowMaterialsApprovalCard;
