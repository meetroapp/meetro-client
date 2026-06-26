export const TOUR_TYPES = {
  homeowner: "homeowner",
  professional: "professional",
};

export const guideSteps = {
  homeowner: [
    {
      route: "home",
      titleKey: "guideHomeDashboardTitle",
      descriptionKey: "guideHomeDashboardDescription",
      targetSelector: "[data-guide-target='home-dashboard']",
    },
    {
      route: "upload",
      titleKey: "guideCreateRequestTitle",
      descriptionKey: "guideCreateRequestDescription",
      targetSelector: "[data-guide-target='create-request']",
    },
    {
      route: "messagesInbox",
      titleKey: "guideMessagesTitle",
      descriptionKey: "guideMessagesDescription",
      targetSelector: "[data-guide-target='messages-search']",
    },
    {
      route: "myRequests",
      titleKey: "guideScheduleTitle",
      descriptionKey: "guideScheduleDescription",
      targetSelector: "[data-guide-target='schedule']",
    },
    {
      route: "projectDetails",
      titleKey: "guideProjectJourneyTitle",
      descriptionKey: "guideProjectJourneyDescription",
      targetSelector: "[data-guide-target='project-journey']",
    },
    {
      route: "quoteRequests",
      titleKey: "guideQuoteProposalTitle",
      descriptionKey: "guideQuoteProposalDescription",
      targetSelector: "[data-guide-target='quote-proposal']",
    },
    {
      route: "projectDetails",
      titleKey: "guideHomeownerActiveWorkTitle",
      descriptionKey: "guideHomeownerActiveWorkDescription",
      targetSelector: "[data-guide-target='active-work']",
    },
    {
      route: "completedJobDetails",
      titleKey: "guideCompletionHistoryTitle",
      descriptionKey: "guideCompletionHistoryDescription",
      targetSelector: "[data-guide-target='completion-history']",
    },
    {
      route: "assistant",
      titleKey: "guideAiAssistantTitle",
      descriptionKey: "guideAiAssistantDescription",
      targetSelector: "[data-guide-target='ai-assistant']",
    },
  ],
  professional: [
    {
      route: "businessDashboard",
      titleKey: "guideBusinessDashboardTitle",
      descriptionKey: "guideBusinessDashboardDescription",
      targetSelector: "[data-guide-target='business-dashboard']",
    },
    {
      route: "contractorDashboard",
      titleKey: "guideWorkCenterTitle",
      descriptionKey: "guideWorkCenterDescription",
      targetSelector: "[data-guide-target='work-center']",
    },
    {
      route: "businessLeads",
      titleKey: "guideOpportunitiesTitle",
      descriptionKey: "guideOpportunitiesDescription",
      targetSelector: "[data-guide-target='opportunities']",
    },
    {
      route: "contractorDashboard",
      storage: { meetroWorkCenterTab: "schedule" },
      titleKey: "guideProfessionalScheduleTitle",
      descriptionKey: "guideProfessionalScheduleDescription",
      targetSelector: "[data-guide-target='professional-schedule']",
    },
    {
      route: "contractorDashboard",
      storage: { meetroWorkCenterTab: "currentJobs" },
      titleKey: "guideEvaluationNotesTitle",
      descriptionKey: "guideEvaluationNotesDescription",
      targetSelector: "[data-guide-target='evaluation-notes']",
    },
    {
      route: "quoteBuilder",
      titleKey: "guideQuoteBuilderTitle",
      descriptionKey: "guideQuoteBuilderDescription",
      targetSelector: "[data-guide-target='quote-builder']",
    },
    {
      route: "contractorDashboard",
      storage: { meetroWorkCenterTab: "activeWork" },
      titleKey: "guideProfessionalActiveWorkTitle",
      descriptionKey: "guideProfessionalActiveWorkDescription",
      targetSelector: "[data-guide-target='professional-active-work']",
    },
    {
      route: "invoiceBuilder",
      titleKey: "guideInvoiceReceiptTitle",
      descriptionKey: "guideInvoiceReceiptDescription",
      targetSelector: "[data-guide-target='invoice-receipt']",
    },
    {
      route: "businessCommandCenter",
      titleKey: "guideBusinessToolsTitle",
      descriptionKey: "guideBusinessToolsDescription",
      targetSelector: "[data-guide-target='business-tools']",
    },
    {
      route: "assistant",
      titleKey: "guideAiAssistantTitle",
      descriptionKey: "guideAiAssistantDescription",
      targetSelector: "[data-guide-target='ai-assistant']",
    },
  ],
};

export function getGuideSteps(tourType = TOUR_TYPES.homeowner) {
  return guideSteps[tourType] || guideSteps.homeowner;
}
