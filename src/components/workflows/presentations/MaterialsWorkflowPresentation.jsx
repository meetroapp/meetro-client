import WorkflowRenderer from "../WorkflowRenderer";
import MeetroIcon from "../../MeetroIcon";

function MaterialsWorkflowPresentation({
  msg,
  language,
  workflowRenderProps,
  styles,
}) {
  const {
    materialsApprovalBody,
    materialsApprovalHeader,
    materialsApprovalEyebrow,
    materialsApprovalTitle,
    materialsApprovalStatus,
    materialsApprovalText,
    materialsProviderBox,
    materialsApprovalList,
    materialsApprovalRow,
    materialsApprovalActions,
    approveMaterialsButton,
    customerProvideMaterialsButton,
    requestMaterialsChangeButton,
    materialsApprovedNotice,
    materialsChangeNotice,
    materialsCustomerProvidingNotice,
  } = styles;

  const statusLabel =
    msg.status === "materials_approved"
      ? language === "es"
        ? "Aprobado"
        : "Approved"
      : msg.status === "materials_change_requested"
      ? language === "es"
        ? "Cambios"
        : "Changes"
      : language === "es"
      ? "Pendiente"
      : "Pending";

  return (
    <div style={materialsApprovalBody}>
      <div style={materialsApprovalHeader}>
        <div>
          <p style={materialsApprovalEyebrow}>
            {language === "es" ? "Aprobación de materiales" : "Materials Approval"}
          </p>

          <h3 style={materialsApprovalTitle}>
            {msg.projectTitle || (language === "es" ? "Proyecto" : "Project")}
          </h3>
        </div>

        <div style={materialsApprovalStatus}>{statusLabel}</div>
      </div>

      <p style={materialsApprovalText}>
        {msg.text ||
          (language === "es"
            ? "El profesional solicitó aprobación de materiales."
            : "The professional requested materials approval.")}
      </p>

      <div style={materialsProviderBox}>
        <MeetroIcon name="materials" size={16} decorative />{" "}
        {msg.provider ||
          (language === "es"
            ? "El profesional comprará los materiales"
            : "Business will purchase materials")}
      </div>

      {Array.isArray(msg.materials) && (
        <div style={materialsApprovalList}>
          {msg.materials.map((item) => (
            <div key={item.id || item.title} style={materialsApprovalRow}>
              <span>{item.title}</span>
              <strong>{item.qty || "1"}</strong>
            </div>
          ))}
        </div>
      )}

      <WorkflowRenderer
        {...workflowRenderProps}
        styles={{
          materialsApprovalActions,
          approveMaterialsButton,
          customerProvideMaterialsButton,
          requestMaterialsChangeButton,
          materialsApprovedNotice,
          materialsChangeNotice,
          materialsCustomerProvidingNotice,
        }}
      />
    </div>
  );
}

export default MaterialsWorkflowPresentation;
