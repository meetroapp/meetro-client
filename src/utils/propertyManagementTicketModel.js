export const TENANT_TICKET_STATUSES = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  MANAGER_REVIEW: "manager_review",
  NEEDS_INFORMATION: "needs_information",
  APPROVED_FOR_SERVICE: "approved_for_service",
  ASSIGNED_TO_VENDOR: "assigned_to_vendor",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETION_REVIEW: "completion_review",
  CLOSURE_REVIEW: "closure_review",
  CLOSED: "closed",
  CANCELLED: "cancelled",
});

export const TENANT_TICKET_FIELDS = Object.freeze([
  "propertyId",
  "propertyName",
  "unitId",
  "unitLabel",
  "tenantId",
  "tenantDisplayName",
  "maintenanceIssue",
  "urgency",
  "accessPermission",
  "preferredAccessWindow",
  "photos",
  "videos",
  "safetyNotes",
  "managerReviewStatus",
  "assignedServiceProfessionalId",
  "completionRef",
  "closureRef",
  "propertyHistoryRef",
]);

export const PROPERTY_MANAGEMENT_TICKET_FLOW = Object.freeze([
  "Submit Maintenance Ticket",
  "Property Manager Review",
  "Schedule / Assign Service Professional",
  "Service Work",
  "Completion",
  "Closure",
  "Property History",
]);

export const PROPERTY_MANAGEMENT_ROLE_RULES = Object.freeze({
  tenant: Object.freeze({
    primaryAction: "submit_maintenance_ticket",
    canUseDiscover: false,
    canFindPros: false,
    canRequestQuotes: false,
    canShopBusinessProfiles: false,
    receivesStatusUpdates: true,
    defaultCommunicationAccess: "status_updates",
  }),
  propertyManager: Object.freeze({
    ownsTicketReview: true,
    ownsCoordination: true,
    canAssignServiceProfessional: true,
    canCoordinateSchedule: true,
    controlsTenantCommunicationScope: true,
  }),
  serviceProfessional: Object.freeze({
    receivesWorkThrough: "work_center",
    ownsServiceExecution: true,
    doesNotOwnPropertyTicket: true,
  }),
});

export const PROPERTY_MANAGEMENT_TICKET_BOUNDARY = Object.freeze({
  homeownerRequestHelp: "marketplace_service_discovery",
  tenantMaintenanceTicket: "property_operations",
  tenantTicketDefaultAccess: "status_first",
  chatPolicy: "available_when_scoped_by_property_manager",
  workCenterPolicy: "service_professional_execution_destination",
});

