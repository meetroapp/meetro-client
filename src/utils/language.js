export function getLanguage() {
  return localStorage.getItem("meetroLanguage") || "en";
}

export function setLanguage(language) {
  localStorage.setItem("meetroLanguage", language);
  window.dispatchEvent(new Event("languageChanged"));
}

export const translations = {
  en: {
    home: "Home",
    discover: "Discover",
    chat: "Chat",
    upload: "Upload",
    profile: "Profile",

    language: "Language",
    english: "English",
    spanish: "Spanish",

    login: "Login",
    createAccount: "Create Account",
    welcomeBack: "Welcome Back",
    chooseAccountType: "Choose Account Type",
    standardUser: "Standard User",
    professionalUser: "Professional User",

    yourName: "Your name",
    businessName: "Business name",
    emailAddress: "Email address",
    password: "Password",

    continueGuest: "Continue as Guest",
    pleaseWait: "Please wait...",
    serverError: "Server error.",

    homeGreeting: "Hi",
    homeQuestion: "What project can we help you with today?",
    homeJobStatus: "Job Status",
    homeTodaySummary: "Today",
    homeViewAll: "View all",
    homeJobs: "Jobs",
    homeSchedule: "Today",
    homeUrgent: "Urgent",
    homeChat: "Chat",

    discoverHeroTitle: "Local Project Feed",
    discoverHeroSubtitle:
      "Browse homeowner project requests and discover local opportunities.",
    localProjectFeed: "Local Project Feed",
    findLocalServices: "Find Local Services",
    professionalDiscoverText:
  "Explore local opportunities matching your business category.",
    homeownerDiscoverText:
      "Find trusted local professionals and request help for your next project.",

    postProject: "+ Post a Project",
    openRequests: "Open Requests",
    matchingOpenRequests: "Matching Open Requests",
    projectAvailable: "project available",
    projectsAvailable: "projects available",
    noMatchingRequestsYet: "No matching requests yet",
    newLeadsWillAppearHere:
      "New leads matching your business category will appear here.",

    viewDetails: "View Details",
    messageQuote: "Message / Quote",
    today: "Today",
    localArea: "Local area",
    openRequest: "Open Request",

    allProjects: "All Projects",
    handyman: "Handyman",
    painting: "Painting",
    plumbing: "Plumbing",
    electrical: "Electrical",
    flooring: "Flooring",
    roofing: "Roofing",
    hvac: "HVAC / AC",
    landscaping: "Landscaping",
    lawnCare: "Lawn Care",
    treeService: "Tree Service",
    poolService: "Pool Service",
    cleaning: "Cleaning",
    pressureWashing: "Pressure Washing",
    paverSealing: "Paver Sealing",
    junkRemoval: "Junk Removal",
    demolition: "Demolition",
    drywall: "Drywall",
    carpentry: "Carpentry",
    doorsWindows: "Doors & Windows",
    fencing: "Fencing",
    concrete: "Concrete",
    tile: "Tile",
    applianceRepair: "Appliance Repair",
    pestControl: "Pest Control",
    moving: "Moving",
    movingCompany: "Moving Company",
    realEstate: "Real Estate",
    homeHealthCare: "Home Health Care",
    automotiveServices: "Automotive Services",
    carDetailing: "Car Detailing",
    mobileServices: "Mobile Services",
    mechanic: "Mechanic",
    privateTransportation: "Private Transportation",
    otherService: "Other Service",

    dashboard: "Dashboard",
    businessDashboard: "Business Dashboard",
    businessTools: "Business Tools",
    messages: "Messages",
    customers: "Customers",
    portfolio: "Portfolio",
    account: "Account",

    available: "Available",
    availableNow: "Available Now",
    availableToday: "Available Today",

    quoteRequests: "Quote Requests",
    projectGallery: "Business Portfolio",

    manageEmergencyJobs: "Manage emergency jobs",
    reviewIncomingRequests: "Review incoming quote requests",
    customerMessages: "Customer messages and updates",
    showCompletedWork: "Show your completed work",

    demoPlumbingTitle: "Plumbing repair",
    demoPlumbingDescription: "Toilet repair needed",
    demoPaintingTitle: "Interior painting",
    demoPaintingDescription: "Bedroom and hallway repaint",
    demoDrywallTitle: "Drywall patch",
    demoDrywallDescription: "Small drywall repair after leak",
    demoFlooringTitle: "Flooring estimate",
    demoFlooringDescription: "Need vinyl plank installation quote",

    myMessages: "My Messages",
    chatSubtitle:
      "Stay connected with local professionals and project conversations.",
    bathroomRemodel: "Bathroom Remodel",
    outletRepair: "Outlet Repair",
    paverSealingProject: "Paver Sealing",
    estimateTomorrow: "I can stop by tomorrow to give you an estimate.",
    thanksPhotos: "Thanks for the photos. I can take a look today.",
    quoteReady: "Your quote is ready for review.",
    twoMinutesAgo: "2m ago",
    oneHourAgo: "1h ago",
    threeHoursAgo: "3h ago",
    noMessagesYet: "No messages yet",
    noMessagesText: "Your project conversations will appear here.",

    loadingMessages: "Loading messages...",
    backToDashboard: "Back to Dashboard",
    messagesInboxSubtitle: "Homeowner conversations and quote chats",
    noMessagesInboxText:
      "Conversations will appear here after homeowners request quotes.",
    projectConversation: "Project Conversation",
    tapOpenConversation: "Tap to open conversation",
    recent: "recent",
    location: "Location",
    new: "new",
    projectGallerySubtitle:
  "Showcase before & after photos, finished work, and your professional reputation.",

noContractorProfileFound:
  "No business profile found",

createContractorProfileFirst:
  "Create Business Profile first",

createContractorProfile:
"Create Business Profile",

addProject: "Add Project",

imageUploaded: "Image uploaded",

uploadProjectPhoto:
  "Upload project photo",

publishProject:
  "Publish Project",

yourProjects:
  "Your Projects",

noProjectsUploadedYet:
  "No projects uploaded yet.",

loadingProjectGallery:
  "Loading project gallery...",

completeAllFields:
  "Please complete all fields.",

projectAdded:
  "Project added!",

failedAddProject:
  "Failed to add project",
yourBusiness: "Your Business",

emergencyPlumbing: "Emergency Plumbing",
completedJobNote: "This emergency job has been completed.",
cancelledJobNote: "This emergency request was cancelled.",
acceptedShort: "Accept",
enRouteShort: "Route",
arrivedShort: "Arrived",
startedShort: "Start",
completeShort: "Done",


service: "Service",
activeNow: "Active Now",

statusPending: "Pending — looking for a professional",
statusAccepted: "Professional accepted your request",
statusEnroute: "Professional on the way",
statusArrived: "Professional arrived",
statusStarted: "Job started",
statusCompleted: "Service completed",
statusCancelled: "Request cancelled",

routeAssigned: "Professional assigned",
routeEnroute: "Professional is on the way",
routeArrived: "Professional at your location",
routeInProgress: "Work in progress",
routeCompleted: "Service completed",
emergencyPlumbing: "Emergency Plumbing",
noNewRequests: "No new requests right now.",
completed: "Completed",
handymanLabel: "Handyman",

loadingBusinessDashboard: "Loading business dashboard...",
businessGreeting: "Good morning",
businessDashboardText:
  "Manage leads, messages, profile visibility, and your business growth from one place.",

profileCompletion: "Profile Completion",
editBusinessProfile: "Edit Business Profile",
createBusinessProfile: "Create Business Profile",

leadKitchenSink: "Kitchen Sink Installation",
leadCeilingFan: "Ceiling Fan Installation",
leadRoofInspection: "Roof Inspection & Repair",

leadCapeCoral3: "Cape Coral, FL • 3 mi away",
leadCapeCoral2: "Cape Coral, FL • 2 mi away",
leadCapeCoral5: "Cape Coral, FL • 5 mi away",

posted1hAgo: "Posted 1h ago",
posted2hAgo: "Posted 2h ago",
posted3hAgo: "Posted 3h ago",

requests: "Requests",

foundingPro: "FOUNDING PRO",
unlockUnlimitedLeads: "Unlock unlimited homeowner leads",
meetroProText:
  "Start at $12.99/month for the first 6 months, then $34.99/month. Includes priority placement, unlimited lead access, and verified business visibility.",
upgradeToMeetroPro: "Upgrade to Meetro Pro",
newLeads: "New Leads",
last24h: "Last 24h",
profileViews: "Profile Views",
thisWeek: "This Week",
profileScore: "Profile Score",
great: "Great!",
unread: "Unread",
analytics: "Analytics",
insights: "Insights",
meetroAccount: "Meetro Account",
emailNotAvailable: "Email not available",
accountSettings: "Account Settings",
open: "Open",
businessProfile: "Business Profile",
accountStatus: "Account Status",
authenticatedAccount: "Authenticated Meetro account",
professionalAccountText:
  "Your professional account is connected to business tools, leads, messages, and project galleries.",
standardAccountText:
  "Your standard account is connected to homeowner tools, local services, messages, and projects.",
logout: "Logout",
settings: "Settings",
accountMode: "Account Mode",
personalMode: "Personal Mode",
businessMode: "Business Mode",
personal: "Personal",
business: "Business",

professionalAccess: "Professional Access",
aiAssistantSettings: "AI Assistant Settings",
smartReplies: "Smart Replies",
autoQuotes: "Auto Quotes",
leadSuggestions: "Lead Suggestions",

emergencyServices: "Emergency Services",
emergencyRadius: "Emergency Radius",
priorityLeads: "Priority Leads",

helpAndSupport: "Help & Support",
contactSupport: "Contact Support",
reportIssue: "Report Issue",
termsPolicies: "Terms & Policies",

notifications: "Notifications",
comingSoon: "Coming Soon",

meetroPro: "Meetro Pro",
growWithMeetro: "Grow with Meetro",
meetroProSettingsText:
  "Unlock premium visibility, unlimited leads, emergency priority, AI business tools, and advanced business features.",
startConversation: "Start the conversation by sending a message or photo.",
typeMessage: "Type a message...",
send: "Send",
sending: "Sending...",
sendingMessage: "Sending message...",
messageFailed: "Message failed. Please try again.",
remove: "Remove",
preview: "Preview",
messageUpload: "Message upload",
activeNow: "Active now",

quickReplyEstimateShort: "Estimate",
quickReplyEstimate:
  "Hi, I can help with this project. I can stop by and give you an estimate.",

quickReplyPhotosShort: "Photos",
quickReplyPhotos:
  "Can you send a few more photos so I can better understand the project?",

quickReplyAvailableShort: "Available",
quickReplyAvailable:
  "I am available today if you would like to schedule a time.",
verifiedProfessional: "Verified Professional",
view: "View",
attachQuoteCard: "Attach Quote Card",
attachQuoteCardText:
  "Send the project details as a quote card inside this conversation.",
addToMessage: "Add to Message",
quoteCard: "Quote Card",

aiSuggestedReplies: "AI Suggested Replies",

typing: "Typing",
seen: "Seen",
sent: "Sent",

voiceNote: "Voice note",
voiceNoteReady: "Voice note ready",
voiceNotSupported:
  "Voice notes are not supported on this device or browser.",

loadingContractorProfile: "Loading business profile...",
businessProfileSubtitle:
  "Build trust with homeowners using a strong professional profile.",
verifiedBusiness: "Verified Business",
selectBusinessCategory: "Select business category",
createYourBusinessProfile: "Create Your Business Profile",
phoneNumber: "Phone number",
businessBio: "Business bio",
dispatchReady: "Dispatch Ready",
profileImageUploaded: "Profile image uploaded",
uploadBusinessImage: "Upload business image",
createProfile: "Create Profile",
contractorProfileCreated: "Business profile created!",
failedCreateProfile: "Failed to create profile",
profileUpdated: "Profile updated!",
failedUpdateProfile: "Failed to update profile",
businessNameNotSet: "Business name not set",
categoryNotSet: "Category not set",
locationNotSet: "Location not set",
phone: "Phone",
phoneNotSet: "Phone not set",
aboutBusiness: "About Business",
noBusinessDescription: "No business description added yet.",
call: "Call",
fastResponse: "Fast Response",
portfolioReady: "Portfolio Ready",
editProfile: "Edit Profile",
saveChanges: "Save Changes",
cancel: "Cancel",
createBusinessProfileFirst: "Create a business profile first to unlock Business Mode.",
services: "Services",
project: "Project",
newLeadsNearYou: "New Leads Near You",
viewAllLeads: "View all leads",
dashboardNoNewLeads: "No new leads right now",
dashboardNoNewLeadsText:
  "When matching homeowner requests are available, they will appear here.",
dashboardNewRequest: "New request",
dashboardRecentlyPosted: "Recently posted",
myProfile: "My Profile",
manage: "Manage",
leads: "Leads",
gallery: "Gallery",
photos: "Photos",

uploadTipTitle: "Add clear project details",
uploadTipText:
  "Photos, location, and a short description help local professionals give faster and better quotes.",
projectTitlePlaceholder: "Example: Bathroom tile repair",
projectDescriptionPlaceholder:
  "Describe what needs to be done, timing, and any important details.",
photoHelpsPros: "Photos help professionals understand the job faster.",
backToHome: "Back to Home",

requestHelp: "Need Help With a Project?",

newProject: "Post Your Project",

newProjectSubtitle:
  "Describe your project, add photos, and connect with trusted local professionals nearby.",

projectTitle: "Project Title",

projectDescription: "Project Description",

categoryExample: "Service Category",

locationExample: "City or Area",

addProjectPhoto: "Add Project Photos",

createPost: "Post Project",

creating: "Posting Project...",

uploadTipTitle: "Share Clear Project Details",

uploadTipText:
  "Adding photos, location, and a detailed description helps professionals provide faster and more accurate quotes.",

projectTitlePlaceholder:
  "Example: Bathroom tile repair",

projectDescriptionPlaceholder:
  "Describe what needs to be done, your timeline, measurements, materials, or any important details.",

photoHelpsPros:
  "Photos help professionals understand the project faster.",

projectRequestCreated: "Project request created",
projectRequestCreated: "Solicitud de proyecto creada",
projectPostedSuccess:
  "Your project has been posted successfully.",

security: "Security",
twoFactorAuthentication: "Two-Factor Authentication",
faceIdTouchId: "Face ID / Touch ID",
trustedDevices: "Trusted Devices",
backupCodes: "Backup Codes",
recommended: "Recommended",
enabled: "Enabled",
disabled: "Disabled",
comingSoon: "Coming Soon",
securityVerification: "Security Verification",

enterVerificationCode:
  "Enter the 6-digit verification code sent to your account.",

verifyCode: "Verify Code",

verifyingCode: "Verifying...",

codeSentTo: "Code sent to",

resendCode: "Resend Code",

resendCodeIn: "Resend code in",

meetroSecurityText:
  "Your login is protected with Meetro Security.",

faceIdComingSoon:
  "Face ID and Touch ID support coming soon.",

back: "Back",
verified: "Verified",
verificationSuccess: "Verification successful",


findContractorsText:
  "Browse trusted local professionals near you.",

uploadProject: "Upload Project",
uploadProjectText:
  "Post photos and details about your project.",

aiHelp: "AI Help",
assistantSubtitle:
  "Get instant help, ideas, and project guidance.",

myActiveProjects: "My Active Projects",

viewAll: "View All",

noActiveProjectYet: "No Active Projects Yet",

postFirstProjectText:
  "Post your first project to start receiving quotes from local professionals.",

recommendedNearYou: "Recommended Near You",

switchToBusinessMode: "Switch to Business Mode",

there: "there",

postAProject: "Post A Project",

projectReplies:
  "Project replies and business conversations",

myProjects: "My Projects",
projectTracking: "Project Tracking",
myProjectsSubtitle:
  "Track views, quotes, messages, photos, and progress for each project.",
noProjectsYet: "No projects yet",
editProject: "Edit Project",
cancelProject: "Cancel Project",
saveChanges: "Save Changes",
cancelEdit: "Cancel Edit",
projectCancelled: "Project Cancelled",
selected: "Selected",
posted: "Posted",
views: "Views",
quotes: "Quotes",
messages: "Messages",
workflowStarted: "Workflow started",
projectPhotos: "Project Photos",
projectPhoto: "photo",
expandedProjectPhoto: "Expanded project photo",
tapAnyPhotoToView: "Tap any photo to view",
addPhotos: "+ Add photos",
uploading: "Uploading...",
noPhotosYet: "No photos yet",
addPhotosHelp:
  "Add photos to help professionals understand the project.",
confirmCancelProject:
  "Are you sure you want to cancel this project?",

loadingProject: "Loading project...",
postNotFound: "Post not found",
projectCouldNotBeLoaded:
  "This project could not be loaded.",
noDescriptionAdded:
  "No description added.",
businessCommandCenter: "Business Command Center",
commandCenterSubtitle:
  "AI business tools that save quotes, permits, reminders, designs, inspections, and customer notes inside Project Folders.",
correctWorkflow: "Correct workflow",
correctWorkflowText:
  "Business Dashboard → Command Center → Select/Create Project Folder → Save project data inside that folder.",
quotes: "Quotes",
projectEstimates: "Project Estimates",
projects: "Projects",
activeJobs: "Active Jobs",
permits: "Permits",
projectTracking: "Project Tracking",
designFiles: "Design Files",
layoutsPlans: "Layouts & Plans",
followUps: "Follow-Ups",
projectReminders: "Project Reminders",
clients: "Clients",
projectHistory: "Project History",
projectFolderModule: "Project Folder Module",
connected: "Connected",
openProjectFolderTool: "Open Project Folder Tool",
ccMeetroPro: "MEETRO PRO",
ccSevenDayTrial: "7-day free trial",
ccTrialText:
  "Turn every job into a smart Project Folder with AI quotes, permit tracking, reminders, design notes, inspections, customer history, and invoices.",
ccStartTrial: "Start Trial",

quotesDesc: "Generate estimates and save them inside the correct Project Folder.",
quotesBadge: "Project Quote",
projectsDesc: "View active Project Folders, pending jobs, deposits, and balances.",
projectsBadge: "Projects",
permitsDesc: "Track permit notes, inspections, and approval status by project.",
permitsBadge: "Permit Tracker",
designDesc: "Attach design ideas, layout notes, sketches, and material lists to projects.",
designBadge: "Design Files",
remindersDesc:
  "Create project follow-ups for customers, permits, payments, and incomplete work.",
remindersBadge: "Follow-Ups",
clientsDesc:
  "See customer history connected to Project Folders, quotes, invoices, and messages.",
clientsBadge: "History",

quoteWorkspaceTitle: "Quote saved to Project Folder",
quoteWorkspaceText:
  "Future flow: select or create a Project Folder, answer guided AI questions, generate quote/invoice draft, then save it under that project.",
jobsWorkspaceTitle: "Active Project Folders",
jobsWorkspaceText:
  "Future flow: view all active projects by stage — pending quote, approved, deposit paid, in progress, balance due, completed.",
permitsWorkspaceTitle: "Project Permit Tracker",
permitsWorkspaceText:
  "Future flow: attach permit notes, inspection reminders, local requirement checks, and permit status to each project.",
plansWorkspaceTitle: "Project Design Files",
plansWorkspaceText:
  "Future flow: upload photos, attach sketches, save floor plan notes, and generate material lists inside the Project Folder.",
remindersWorkspaceTitle: "Project Follow-Ups",
remindersWorkspaceText:
  "Future flow: create reminders tied to a customer and project, such as deposit due, permit pending, inspection date, or unfinished job.",
customersWorkspaceTitle: "Customer + Project History",
customersWorkspaceText:
  "Future flow: customer profile connects to all Project Folders, quotes, invoices, messages, payments, and reminders.",

stepSelectProject: "Select Project",
stepAnswerQuestions: "Answer AI Questions",
stepGenerateQuote: "Generate Quote",
stepSaveToFolder: "Save to Folder",
stepPendingQuote: "Pending Quote",
stepApproved: "Approved",
stepInProgress: "In Progress",
stepBalanceDue: "Balance Due",
stepProjectType: "Project Type",
stepPermitNotes: "Permit Notes",
stepInspectionReminder: "Inspection Reminder",
stepStatus: "Status",
stepUploadPhotos: "Upload Photos",
stepDesignNotes: "Design Notes",
stepMaterialList: "Material List",
stepSave: "Save",
stepCustomer: "Customer",
stepProject: "Project",
stepDueDate: "Due Date",
stepReminder: "Reminder",
stepProjects: "Projects",
stepQuotes: "Quotes",
stepInvoices: "Invoices",

ccComingSoonTitle: "coming soon",
ccComingSoonMessage:
  "This tool will connect directly into Project Folders so every quote, permit, reminder, design, inspection, or invoice stays organized by job.",
emergencyHelp: "Emergency Help",
emergencyHelpText: "Urgent home service help when you need fast support.",
requestEmergencyHelp: "Request Emergency Help",
selectedService: "Selected Service",
whatHappened: "What happened?",
accessInfo: "Access Information",
urgencyLevel: "Urgency Level",

professionalAssigned: "Professional assigned",
professionalOnTheWay: "Professional on the way",
professionalArrived: "Professional arrived",

requestAccepted: "Request accepted",
arrivingSoon: "Arriving soon",
jobStarted: "Job started",
workProgress: "Work Progress",

startJob: "Start Job",
trackWork: "Track Work",
completeService: "Complete Service",

workActive: "Work active",
status: "Status",
message: "Message",
callButton: "Call",

requestQuote: "Request Quote",
cancelQuoteRequest: "Cancel Quote Request",
leaveReview: "Leave Review",
writeReview: "Write a review...",
submitReview: "Submit Review",
projectGallery: "Business Portfolio",
noProjectPhotos: "No project photos yet",
reviews: "Reviews",
noReviewsYet: "No reviews yet",
contractorDetailsLoading: "Loading business...",
fastResponse: "Fast Response",
verified: "Verified",  
// Universal business wording overrides
contractor: "Professional",
generalContractor: "General Service",
localContractor: "Local Professional",
findContractors: "Find Businesses",
findContractorsText:
  "Browse trusted local businesses and professionals near you.",
messageContractor: "Message Business",
backToContractors: "Back to Businesses",
contractorNotFound: "Business Not Found",
contractorNotFoundText:
  "We could not find this business profile.",
contractorConversation: "Business Conversation",
contractorDetailsLoading: "Loading business...",
workCenter: "Work Center",
workTabSchedule: "Schedule",
workTabPending: "Pending",
workTabActive: "Active",
workTabCompleted: "Completed",
workTabQuotes: "Quotes",
workTabMaterials: "Materials",
workTabRevenue: "Revenue",


materials: "Materials",
materialsCenter: "Materials Center",
workflowRequested: "Requested",
workflowReview: "Review",
workflowScheduled: "Scheduled",
workflowQuoteNeeded: "Quote needed",
workflowQuoteSent: "Quote sent",
workflowQuoteApproved: "Quote approved",
workflowActive: "Active",
workflowOnTheWay: "On the way",
workflowArrived: "Arrived",
workflowWorking: "Working",
workflowPausedMaterials: "Paused: Materials",
workflowWaitingCustomer: "Waiting customer",
workflowCompleted: "Completed",
workflowCancelled: "Cancelled",
workflowNoteOnTheWay: "🚗 On the way to customer",
workflowNoteArrived: "📍 Arrived at location",
workflowNoteWorking: "🛠️ Work in progress",
workflowNotePausedMaterials: "⏸ Job paused — waiting on materials",
workflowNoteActive: "💬 Customer waiting for update",
workflowNoteReview: "🧭 Review job details before moving forward",
resumeWork: "Resume Work",
pauseForMaterials: "Pause for Materials",
speakOrTypeMaterials: "Speak or Type Materials",
materialsAssistantDescription: "Speak or type the needed materials. Meetro will add them directly to the list.",
materialsPlaceholder: "Example: base cabinet, screws, silicone, shutoff valve...",
generateMaterialsList: "Generate Materials List",
manualAdd: "Manual Add",
manualAddSubtitle: "Add a material manually",
material: "Material",
quantity: "Quantity",
providedBy: "Provided by",
needsApproval: "Needs Approval",
saveMaterial: "Save Material",
updateMaterial: "Update Material",
cancelEdit: "Cancel Edit",
pauseJob: "Pause Job",
materialsList: "Materials List",
searchMaterials: "Search materials...",
sendToCustomer: "Send to Customer",
noMaterialsSaved: "No materials saved yet.",
jobMaterial: "Job material",
needed: "Needed",
requested: "Requested",
received: "Received",
markReceived: "Mark Received",
deleteMaterial: "Delete material?",
deleteMaterialConfirm: "This will remove this material from the list.",
waitingOnMaterials: "Waiting on materials",
allMaterialsReadyResume: "All Materials Ready — Resume Job",
materialsReceived: "materials received",
pending: "pending",
schedule: "Schedule",
workSchedule: "Work Schedule",
addVisit: "Add Visit",
closeForm: "Close Form",
visitTitle: "Visit title",
date: "Date",
time: "Time",
customerLocation: "Customer location",
scheduleNotes: "Notes",
saveVisit: "Save Visit",
updateVisit: "Update Visit",
noScheduledVisits: "No scheduled visits yet.",
scheduledVisitsFromChat: "Visits saved from chat will appear here.",
manualScheduleEntry: "Manual calendar entry",
manualScheduleNotice: "Manually added customers will not have chat, automatic records, AI tracking, or full project workflow until converted into a Meetro project.",
manualCustomerWarning: "Manual customer: no chat, automatic records, AI tracking, or full workflow until converted into a Meetro project.",
manualCustomerHowToConnect: "How to connect",
manualCustomerConnectSteps: "To connect this customer:\n\n1. Tap Convert to Project.\n2. Create or send a project invitation.\n3. Once the customer accepts or connects, Meetro will unlock chat, records, AI, materials, and full workflow.",
manualVisit: "Manual Visit",
scheduled: "Scheduled",
scheduledVisit: "Scheduled Visit",
scheduledWork: "Scheduled Work",
openChat: "Open Chat",
edit: "Edit",
startJob: "Start Job",
createCompletion: "Create Completion",
delete: "Delete",
deleteVisit: "Delete visit?",
deleteVisitConfirm: "This will remove the visit from your schedule.",
cancel: "Cancel",
today: "Today",
timeTbd: "Time TBD",
locationPending: "Location pending",

workGuidanceSchedule:
"Manage visits, appointments, and job timelines connected to customer conversations.",
workGuidancePending:
"Review incoming requests before turning them into active jobs or customer conversations.",
workGuidanceActive:
"Monitor active jobs, dispatches, progress stages, and updates sent through chat.",
workGuidanceCompleted:
"Review completed work and job records generated from conversations, materials, and customer approvals.",
workGuidanceQuotes:
"Manage estimates, pricing approvals, and proposals connected to customer conversations.",
workGuidanceMaterials:
"Track requested, pending, approved, and received materials tied to jobs and chats.",
workGuidanceRevenue:
"Review revenue, material costs, estimated profit, and operational performance.",

workCenterSubtitle:
  "Manage incoming requests, active jobs and work history.",

liveDispatch: "Live Dispatch",
workSummary: "Work Summary",

completedJobs: "Completed Jobs",
weeklyRevenue: "This Week",
activeJobsCount: "Active Jobs",

accepted: "Accepted",
enRoute: "En Route",
arrived: "Arrived",
started: "Started",
complete: "Complete",

noActiveService: "No active service",
noStatus: "No Status",
activeNow: "Active Now",

completedProject: "Completed Project",
viewCompletedRecord: "View Completed Record",
projectCompleted: "Project Completed",
projectCompletedSubtitle: "Your project has been completed successfully.",
selectedQuote: "Selected Quote",
howWasExperience: "How was your experience?",
projectSummary: "Project Summary",
reviewSubmitted: "Review submitted",
reviewPending: "Review pending",
viewMyRequests: "View My Requests",
done: "Done",
completedProjectSaved: "This completed project has been saved to your history.",
projectFinalizedReviewText: "This project is finalized. You can view the record or leave a review.",
reviewSubmittedHistoryText: "Review submitted. This project is saved in your history.",
backHome: "Back Home",
backToWorkCenter: "Back to Work Center",
completedProjectRecord: "Completed Project Record",
completedJobReport: "Completed Job Report",
jobNotes: "Job Notes",
paymentSummary: "Payment Summary",
totalCharged: "Total Charged",
materialCost: "Material Cost",
estimatedProfit: "Estimated Profit",
customerReview: "Customer Review",
yourReviewSubmitted: "Your review was submitted.",
messageProfessional: "Message Professional",
printRecord: "Print Record",
homeowner: "Homeowner",
date: "Date",
time: "Time",
before: "Before",
after: "After",
afterApprovalWorkStarts: "After approval work starts",
},

  es: {
    home: "Inicio",
    discover: "Descubrir",
    chat: "Chat",
    upload: "Subir",
    profile: "Perfil",

    language: "Idioma",
    english: "Inglés",
    spanish: "Español",

    login: "Iniciar Sesión",
    createAccount: "Crear Cuenta",
    welcomeBack: "Bienvenido",
    chooseAccountType: "Elige Tipo de Cuenta",
    standardUser: "Usuario Estándar",
    professionalUser: "Usuario Profesional",

    yourName: "Tu nombre",
    businessName: "Nombre del negocio",
    emailAddress: "Correo electrónico",
    password: "Contraseña",

    continueGuest: "Continuar como Invitado",
    pleaseWait: "Por favor espera...",
    serverError: "Error del servidor.",

    homeGreeting: "Hola",
    homeQuestion: "¿En qué proyecto podemos ayudarte hoy?",

    discoverHeroTitle: "Proyectos Locales",
    discoverHeroSubtitle:
      "Explora solicitudes de proyectos y oportunidades locales.",
    localProjectFeed: "Proyectos Locales",
    findLocalServices: "Buscar Servicios Locales",
    professionalDiscoverText:
    "Explora oportunidades locales que coincidan con tu categoría de negocio.",
    homeownerDiscoverText:
      "Encuentra profesionales locales confiables y solicita ayuda para tu próximo proyecto.",

    postProject: "+ Publicar Proyecto",
    openRequests: "Solicitudes Abiertas",
    matchingOpenRequests: "Solicitudes Compatibles",
    projectAvailable: "proyecto disponible",
    projectsAvailable: "proyectos disponibles",
    noMatchingRequestsYet: "No hay solicitudes compatibles todavía",
    newLeadsWillAppearHere:
      "Nuevos clientes compatibles aparecerán aquí.",

    viewDetails: "Ver Detalles",
    messageQuote: "Mensaje / Cotización",
    today: "Hoy",
    localArea: "Área local",
    openRequest: "Solicitud Abierta",

    allProjects: "Todos los Proyectos",
    handyman: "Handyman",
    contractor: "Profesional",
    generalContractor: "Servicio General",
    painting: "Pintura",
    plumbing: "Plomería",
    electrical: "Electricidad",
    flooring: "Pisos",
    roofing: "Techos",
    hvac: "Aire Acondicionado",
    landscaping: "Jardinería",
    lawnCare: "Cuidado de Césped",
    treeService: "Servicio de Árboles",
    poolService: "Piscinas",
    cleaning: "Limpieza",
    pressureWashing: "Lavado a Presión",
    paverSealing: "Sellado de Adoquines",
    junkRemoval: "Remoción de Basura",
    demolition: "Demolición",
    drywall: "Drywall",
    carpentry: "Carpintería",
    doorsWindows: "Puertas y Ventanas",
    fencing: "Cercas",
    concrete: "Concreto",
    tile: "Azulejos",
    applianceRepair: "Reparación de Electrodomésticos",
    pestControl: "Control de Plagas",
    moving: "Mudanza",
    movingCompany: "Compañía de Mudanza",
    realEstate: "Bienes Raíces",
    homeHealthCare: "Cuidado de Salud en Casa",
    automotiveServices: "Servicios Automotrices",
    carDetailing: "Detallado de Autos",
    mobileServices: "Servicios Móviles",
    mechanic: "Mecánico",
    privateTransportation: "Transporte Privado",
    otherService: "Otro Servicio",

    dashboard: "Inicio",
    businessDashboard: "Panel de Negocio",
    businessTools: "Herramientas del Negocio",
    messages: "Mensajes",
    customers: "Clientes",
    portfolio: "Portafolio",
    account: "Cuenta",

    available: "Disponible",
    availableNow: "Disponible Ahora",
    availableToday: "Disponible Hoy",

    quoteRequests: "Solicitudes de Cotización",
    projectGallery: "Portafolio del Negocio",

    manageEmergencyJobs: "Administrar trabajos de emergencia",
    reviewIncomingRequests: "Revisar solicitudes entrantes",
    customerMessages: "Mensajes y actualizaciones de clientes",
    showCompletedWork: "Muestra tu trabajo completado",

    demoPlumbingTitle: "Reparación de plomería",
    demoPlumbingDescription: "Se necesita reparación de inodoro",
    demoPaintingTitle: "Pintura interior",
    demoPaintingDescription: "Pintura de dormitorio y pasillo",
    demoDrywallTitle: "Parche de drywall",
    demoDrywallDescription: "Pequeña reparación de drywall después de fuga",
    demoFlooringTitle: "Estimado de pisos",
    demoFlooringDescription:
      "Necesito cotización para instalación de vinyl plank",

    myMessages: "Mis Mensajes",
    chatSubtitle:
      "Mantente conectado con profesionales locales y conversaciones de proyectos.",
    bathroomRemodel: "Remodelación de Baño",
    outletRepair: "Reparación de Tomacorriente",
    paverSealingProject: "Sellado de Adoquines",
    estimateTomorrow: "Puedo pasar mañana para darte un estimado.",
    thanksPhotos: "Gracias por las fotos. Puedo revisarlo hoy.",
    quoteReady: "Tu cotización está lista para revisar.",
    twoMinutesAgo: "Hace 2 min",
    oneHourAgo: "Hace 1 h",
    threeHoursAgo: "Hace 3 h",
    noMessagesYet: "Aún no hay mensajes",
    noMessagesText: "Las conversaciones de tus proyectos aparecerán aquí.",

    loadingMessages: "Cargando mensajes...",
    backToDashboard: "Volver al Panel",
    messagesInboxSubtitle:
      "Conversaciones con propietarios y chats de cotización",
    noMessagesInboxText:
      "Las conversaciones aparecerán aquí después de que los propietarios soliciten cotizaciones.",
    projectConversation: "Conversación del Proyecto",
    tapOpenConversation: "Toca para abrir la conversación",
    recent: "reciente",
    location: "Ubicación",
    new: "nuevo",
    projectGallerySubtitle:
  "Muestra fotos de antes y después, trabajos terminados y tu reputación profesional.",
noContractorProfileFound:
"No se encontró perfil de negocio",

createContractorProfileFirst:
  "Primero crea tu perfil de negocio.",

createContractorProfile:
  "Crear Perfil de Negocio",

addProject:
  "Agregar Proyecto",

imageUploaded:
  "Imagen subida",

uploadProjectPhoto:
  "Subir foto del proyecto",

publishProject:
  "Publicar Proyecto",

yourProjects:
  "Tus Proyectos",

noProjectsUploadedYet:
  "Aún no hay proyectos subidos.",

loadingProjectGallery:
  "Cargando galería de proyectos...",

completeAllFields:
  "Por favor completa todos los campos.",

projectAdded:
  "¡Proyecto agregado!",

failedAddProject:
  "No se pudo agregar el proyecto",

yourBusiness: "Tu Negocio",

emergencyPlumbing: "Plomería de Emergencia",
completedJobNote: "Este trabajo de emergencia fue completado.",
cancelledJobNote: "Esta solicitud de emergencia fue cancelada.",
acceptedShort: "Aceptar",
enRouteShort: "Ruta",
arrivedShort: "Llegó",
startedShort: "Inicio",
completeShort: "Final",


service: "Servicio",
activeNow: "Activo Ahora",

statusPending: "Pendiente — buscando profesional",
statusAccepted: "Profesional aceptó tu solicitud",
statusEnroute: "Profesional en camino",
statusArrived: "Profesional llegó",
statusStarted: "Trabajo iniciado",
statusCompleted: "Servicio completado",
statusCancelled: "Solicitud cancelada",

routeAssigned: "Profesional asignado",
routeEnroute: "Profesional en camino",
routeArrived: "Profesional en tu ubicación",
routeInProgress: "Trabajo en progreso",
routeCompleted: "Servicio completado",
emergencyPlumbing: "Plomería de Emergencia",
noNewRequests: "No hay solicitudes nuevas.",
completed: "Completado",
handymanLabel: "Mantenimiento",

loadingBusinessDashboard: "Cargando panel de negocio...",
businessGreeting: "Buenos días",
businessDashboardText:
  "Administra clientes, mensajes, visibilidad del perfil y el crecimiento de tu negocio desde un solo lugar.",

profileCompletion: "Perfil Completado",
editBusinessProfile: "Editar Perfil del Negocio",
createBusinessProfile: "Crear Perfil del Negocio",

leadKitchenSink: "Instalación de Fregadero de Cocina",
leadCeilingFan: "Instalación de Abanico de Techo",
leadRoofInspection: "Inspección y Reparación de Techo",

leadCapeCoral3: "Cape Coral, FL • a 3 mi",
leadCapeCoral2: "Cape Coral, FL • a 2 mi",
leadCapeCoral5: "Cape Coral, FL • a 5 mi",

posted1hAgo: "Publicado hace 1 h",
posted2hAgo: "Publicado hace 2 h",
posted3hAgo: "Publicado hace 3 h",

requests: "Solicitudes",

foundingPro: "PRO FUNDADOR",
unlockUnlimitedLeads: "Desbloquea clientes ilimitados",
meetroProText:
  "Comienza en $12.99/mes durante los primeros 6 meses, luego $34.99/mes. Incluye ubicación prioritaria, acceso ilimitado a clientes y visibilidad de negocio verificado.",
upgradeToMeetroPro: "Mejorar a Meetro Pro",
newLeads: "Nuevos Clientes",
last24h: "Últimas 24h",
profileViews: "Visitas del Perfil",
thisWeek: "Esta Semana",
profileScore: "Puntuación del Perfil",
great: "Excelente",
unread: "Sin leer",
analytics: "Analíticas",
insights: "Estadísticas",
meetroAccount: "Cuenta Meetro",
emailNotAvailable: "Correo no disponible",
accountSettings: "Configuración de Cuenta",
open: "Abrir",
businessProfile: "Perfil del Negocio",
accountStatus: "Estado de la Cuenta",
authenticatedAccount: "Cuenta de Meetro autenticada",
professionalAccountText:
  "Tu cuenta profesional está conectada a herramientas de negocio, clientes, mensajes y galerías de proyectos.",
standardAccountText:
  "Tu cuenta estándar está conectada a herramientas para propietarios, servicios locales, mensajes y proyectos.",
logout: "Cerrar Sesión",
settings: "Configuración",
accountMode: "Modo de Cuenta",
personalMode: "Modo Personal",
businessMode: "Modo Negocio",
personal: "Personal",
business: "Negocio",

professionalAccess: "Acceso Profesional",
aiAssistantSettings: "Configuración del Asistente IA",
smartReplies: "Respuestas Inteligentes",
autoQuotes: "Cotizaciones Automáticas",
leadSuggestions: "Sugerencias de Clientes",

emergencyServices: "Servicios de Emergencia",
emergencyRadius: "Radio de Emergencia",
priorityLeads: "Clientes Prioritarios",

helpAndSupport: "Ayuda y Soporte",
contactSupport: "Contactar Soporte",
reportIssue: "Reportar Problema",
termsPolicies: "Términos y Políticas",

notifications: "Notificaciones",
comingSoon: "Próximamente",

meetroPro: "Meetro Pro",
growWithMeetro: "Crece con Meetro",
meetroProSettingsText:
  "Desbloquea visibilidad premium, clientes ilimitados, prioridad de emergencia, herramientas de IA para negocios y funciones avanzadas para negocios.",
conversation: "Conversación",
loadingConversation: "Cargando conversación...",
localContractor: "Negocio Local",
startConversation: "Comienza la conversación enviando un mensaje o foto.",
typeMessage: "Escribe un mensaje...",
send: "Enviar",
sending: "Enviando...",
sendingMessage: "Enviando mensaje...",
messageFailed: "El mensaje falló. Inténtalo de nuevo.",
remove: "Eliminar",
preview: "Vista previa",
messageUpload: "Imagen del mensaje",
activeNow: "Activo ahora",

quickReplyEstimateShort: "Estimado",
quickReplyEstimate:
  "Hola, puedo ayudarte con este proyecto. Puedo pasar y darte un estimado.",

quickReplyPhotosShort: "Fotos",
quickReplyPhotos:
  "¿Puedes enviar algunas fotos más para entender mejor el proyecto?",

quickReplyAvailableShort: "Disponible",
quickReplyAvailable:
  "Estoy disponible hoy si deseas coordinar una hora.", 

verifiedProfessional: "Profesional Verificado",
view: "Ver",
attachQuoteCard: "Adjuntar Tarjeta de Cotización",
attachQuoteCardText:
  "Envía los detalles del proyecto como una tarjeta de cotización dentro de esta conversación.",
addToMessage: "Agregar al Mensaje",
quoteCard: "Tarjeta de Cotización",

aiSuggestedReplies: "Respuestas Sugeridas por IA",

typing: "Escribiendo",
seen: "Visto",
sent: "Enviado",

voiceNote: "Nota de voz",
voiceNoteReady: "Nota de voz lista",
voiceNotSupported:
  "Las notas de voz no son compatibles con este dispositivo o navegador.",

loadingContractorProfile: "Cargando perfil del negocio...",
businessProfileSubtitle:
  "Genera confianza con propietarios usando un perfil profesional sólido.",
verifiedBusiness: "Negocio Verificado",
selectBusinessCategory: "Selecciona categoría del negocio",
createYourBusinessProfile: "Crea Tu Perfil de Negocio",
phoneNumber: "Número de teléfono",
businessBio: "Biografía del negocio",
dispatchReady: "Listo para Despacho",
profileImageUploaded: "Imagen del perfil subida",
uploadBusinessImage: "Subir imagen del negocio",
createProfile: "Crear Perfil",
contractorProfileCreated:
"¡Perfil de negocio creado!",
failedCreateProfile: "No se pudo crear el perfil",
profileUpdated: "¡Perfil actualizado!",
failedUpdateProfile: "No se pudo actualizar el perfil",
businessNameNotSet: "Nombre del negocio no establecido",
categoryNotSet: "Categoría no establecida",
locationNotSet: "Ubicación no establecida",
phone: "Teléfono",
phoneNotSet: "Teléfono no establecido",
aboutBusiness: "Acerca del Negocio",
noBusinessDescription: "Aún no se ha agregado descripción del negocio.",
call: "Llamar",
fastResponse: "Respuesta Rápida",
portfolioReady: "Portafolio Listo",
editProfile: "Editar Perfil",
saveChanges: "Guardar Cambios",
cancel: "Cancelar",
createBusinessProfileFirst: "Crea primero un perfil de negocio para activar el Modo Negocio.",
services: "Servicios",
project: "Proyecto",
newLeadsNearYou: "Nuevos Clientes Cerca de Ti",
viewAllLeads: "Ver todos",
dashboardNoNewLeads: "No hay nuevas oportunidades ahora",
dashboardNoNewLeadsText:
  "Cuando haya solicitudes compatibles con tu categoría, aparecerán aquí.",
dashboardNewRequest: "Nueva solicitud",
dashboardRecentlyPosted: "Publicado recientemente",
myProfile: "Mi Perfil",
manage: "Administrar",
leads: "Clientes",
gallery: "Galería",
photos: "Fotos",
projectPostedSuccess:
"¡Proyecto publicado! Los negocios ahora pueden ver tu solicitud.",

uploadTipTitle:
  "Comparte detalles claros del proyecto",

uploadTipText:
  "Agregar fotos, ubicación y una descripción ayuda a los profesionales a ofrecer cotizaciones más rápidas y precisas.",

projectTitlePlaceholder:
  "Ejemplo: Reparación de Cerámicas del baño",

projectDescriptionPlaceholder:
  "Describe lo que necesitas, tiempos estimados o cualquier detalle importante.",

photoHelpsPros:
  "Las fotos ayudan a los profesionales a entender el proyecto más rápido.",

backToHome: "Volver al Inicio",

requestHelp: "¿Necesitas Ayuda con un Proyecto?",

newProject: "Publica Tu Proyecto",

newProjectSubtitle:
  "Describe tu proyecto, agrega fotos y conecta con profesionales locales de confianza.",

projectTitle: "Título del Proyecto",

projectDescription: "Descripción del Proyecto",

categoryExample: "Categoría del Servicio",

locationExample: "Ciudad o Área",

addProjectPhoto: "Agregar Fotos del Proyecto",

createPost: "Publicar Proyecto",

creating: "Publicando Proyecto...",

uploadTipTitle: "Comparte Detalles Claros del Proyecto",

uploadTipText:
  "Agregar fotos, ubicación y una descripción detallada ayuda a los profesionales a ofrecer cotizaciones más rápidas y precisas.",

projectTitlePlaceholder:
  "Ejemplo: Reparación de azulejos del baño",

projectDescriptionPlaceholder:
  "Describe lo que necesitas, tiempos estimados, medidas, materiales o cualquier detalle importante.",

photoHelpsPros:
  "Las fotos ayudan a los profesionales a entender el proyecto más rápido.",

projectPostedSuccess:
  "Tu proyecto fue publicado exitosamente.",

security: "Seguridad",
twoFactorAuthentication: "Autenticación de Dos Factores",
faceIdTouchId: "Face ID / Touch ID",
trustedDevices: "Dispositivos Confiables",
backupCodes: "Códigos de Respaldo",
recommended: "Recomendado",
enabled: "Activado",
disabled: "Desactivado",
comingSoon: "Próximamente",

securityVerification: "Verificación de Seguridad",

enterVerificationCode:
  "Ingresa el código de verificación de 6 dígitos enviado a tu cuenta.",

verifyCode: "Verificar Código",

verifyingCode: "Verificando...",

codeSentTo: "Código enviado a",

resendCode: "Reenviar Código",

resendCodeIn: "Reenviar código en",

meetroSecurityText:
  "Tu inicio de sesión está protegido con Seguridad Meetro.",

faceIdComingSoon:
  "Face ID y Touch ID estarán disponibles pronto.",

back: "Volver",
verified: "Verificado",
verificationSuccess: "Verificación exitosa",

findContractors: "Buscar Negocios",
findContractorsText:
  "Explora profesionales locales confiables cerca de ti.",

uploadProject: "Subir Proyecto",
uploadProjectText:
  "Publica fotos y detalles de tu proyecto.",

aiHelp: "Ayuda IA",
assistantSubtitle:
  "Obtén ayuda instantánea, ideas y guía para proyectos.",

myActiveProjects: "Mis Proyectos Activos",

viewAll: "Ver Todo",

noActiveProjectYet: "Aún No Hay Proyectos Activos",

postFirstProjectText:
  "Publica tu primer proyecto para comenzar a recibir cotizaciones.",

recommendedNearYou: "Recomendados Cerca de Ti",

switchToBusinessMode: "Cambiar a Modo Negocio",

there: "amigo",

postAProject: "Publicar Proyecto",

myProjects: "Mis Proyectos",
projectTracking: "Seguimiento de Proyectos",
myProjectsSubtitle:
  "Rastrea vistas, cotizaciones, mensajes, fotos y progreso de cada proyecto.",
noProjectsYet: "No hay proyectos todavía",
editProject: "Editar Proyecto",
cancelProject: "Cancelar Proyecto",
saveChanges: "Guardar Cambios",
cancelEdit: "Cancelar Edición",
projectCancelled: "Proyecto Cancelado",
selected: "Seleccionado",
posted: "Publicado",
views: "Vistas",
quotes: "Cotizaciones",
messages: "Mensajes",
workflowStarted: "Flujo iniciado",
projectPhotos: "Fotos del Proyecto",
projectPhoto: "foto",
expandedProjectPhoto: "Foto ampliada del proyecto",
tapAnyPhotoToView: "Toca cualquier foto para verla",
addPhotos: "+ Agregar fotos",
uploading: "Subiendo...",
noPhotosYet: "No hay fotos",
addPhotosHelp:
  "Agrega fotos para ayudar a los profesionales a entender el proyecto.",
confirmCancelProject:
  "¿Seguro que quieres cancelar este proyecto?",

projectReplies:
  "Respuestas del proyecto y conversaciones con negocios",

loadingProject: "Cargando proyecto...",
postNotFound: "Proyecto no encontrado",
projectCouldNotBeLoaded:
  "Este proyecto no pudo cargarse.",
noDescriptionAdded:
  "No se agregó descripción.",
businessCommandCenter: "Centro de Control del Negocio",
commandCenterSubtitle:
  "Herramientas de IA para guardar cotizaciones, permisos, recordatorios, diseños, inspecciones y notas del cliente dentro de Carpetas de Proyecto.",
correctWorkflow: "Flujo correcto",
correctWorkflowText:
  "Panel del Negocio → Centro de Control → Seleccionar/Crear Carpeta de Proyecto → Guardar la información dentro de esa carpeta.",
quotes: "Cotizaciones",
projectEstimates: "Estimados del Proyecto",
projects: "Proyectos",
activeJobs: "Trabajos Activos",
permits: "Permisos",
projectTracking: "Seguimiento del Proyecto",
designFiles: "Archivos de Diseño",
layoutsPlans: "Planos y Diseños",
followUps: "Seguimientos",
projectReminders: "Recordatorios del Proyecto",
clients: "Clientes",
projectHistory: "Historial del Proyecto",
projectFolderModule: "Módulo de Carpeta de Proyecto",
connected: "Conectado",
openProjectFolderTool: "Abrir Herramienta de Proyecto",
ccMeetroPro: "MEETRO PRO",
ccSevenDayTrial: "Prueba gratis de 7 días",
ccTrialText:
  "Convierte cada trabajo en una Carpeta de Proyecto inteligente con cotizaciones IA, permisos, recordatorios, notas de diseño, inspecciones, historial del cliente e facturas.",
ccStartTrial: "Comenzar Prueba",

quotesDesc: "Genera estimados y guárdalos dentro de la Carpeta de Proyecto correcta.",
quotesBadge: "Cotización",
projectsDesc: "Ve Carpetas de Proyecto activas, trabajos pendientes, depósitos y balances.",
projectsBadge: "Proyectos",
permitsDesc: "Rastrea notas de permisos, inspecciones y estado de aprobación por proyecto.",
permitsBadge: "Permisos",
designDesc: "Adjunta ideas de diseño, notas de plano, bocetos y listas de materiales a proyectos.",
designBadge: "Diseño",
remindersDesc:
  "Crea seguimientos del proyecto para clientes, permisos, pagos y trabajos incompletos.",
remindersBadge: "Seguimientos",
clientsDesc:
  "Ve el historial del cliente conectado a Carpetas de Proyecto, cotizaciones, facturas y mensajes.",
clientsBadge: "Historial",

quoteWorkspaceTitle: "Cotización guardada en Carpeta de Proyecto",
quoteWorkspaceText:
  "Flujo futuro: seleccionar o crear una Carpeta de Proyecto, responder preguntas guiadas por IA, generar cotización/factura y guardarla dentro del proyecto.",
jobsWorkspaceTitle: "Carpetas de Proyecto Activas",
jobsWorkspaceText:
  "Flujo futuro: ver todos los proyectos activos por etapa — cotización pendiente, aprobado, depósito pagado, en progreso, balance pendiente y completado.",
permitsWorkspaceTitle: "Seguimiento de Permisos del Proyecto",
permitsWorkspaceText:
  "Flujo futuro: adjuntar notas de permiso, recordatorios de inspección, requisitos locales y estado del permiso a cada proyecto.",
plansWorkspaceTitle: "Archivos de Diseño del Proyecto",
plansWorkspaceText:
  "Flujo futuro: subir fotos, adjuntar bocetos, guardar notas de plano y generar listas de materiales dentro de la Carpeta de Proyecto.",
remindersWorkspaceTitle: "Seguimientos del Proyecto",
remindersWorkspaceText:
  "Flujo futuro: crear recordatorios conectados a un cliente y proyecto, como depósito pendiente, permiso pendiente, inspección o trabajo incompleto.",
customersWorkspaceTitle: "Historial de Cliente + Proyecto",
customersWorkspaceText:
  "Flujo futuro: el perfil del cliente se conecta con Carpetas de Proyecto, cotizaciones, facturas, mensajes, pagos y recordatorios.",

stepSelectProject: "Seleccionar Proyecto",
stepAnswerQuestions: "Responder Preguntas IA",
stepGenerateQuote: "Generar Cotización",
stepSaveToFolder: "Guardar en Carpeta",
stepPendingQuote: "Cotización Pendiente",
stepApproved: "Aprobado",
stepInProgress: "En Progreso",
stepBalanceDue: "Balance Pendiente",
stepProjectType: "Tipo de Proyecto",
stepPermitNotes: "Notas de Permiso",
stepInspectionReminder: "Recordatorio de Inspección",
stepStatus: "Estado",
stepUploadPhotos: "Subir Fotos",
stepDesignNotes: "Notas de Diseño",
stepMaterialList: "Lista de Materiales",
stepSave: "Guardar",
stepCustomer: "Cliente",
stepProject: "Proyecto",
stepDueDate: "Fecha Límite",
stepReminder: "Recordatorio",
stepProjects: "Proyectos",
stepQuotes: "Cotizaciones",
stepInvoices: "Facturas",

ccComingSoonTitle: "próximamente",
ccComingSoonMessage:
  "Esta herramienta se conectará directamente con Carpetas de Proyecto para que cada cotización, permiso, recordatorio, diseño, inspección o factura quede organizada por trabajo.",
emergencyHelp: "Ayuda de Emergencia",
emergencyHelpText: "Ayuda urgente para el hogar cuando necesitas apoyo rápido.",
requestEmergencyHelp: "Solicitar Ayuda de Emergencia",
selectedService: "Servicio Seleccionado",
whatHappened: "¿Qué pasó?",
accessInfo: "Información de Acceso",
urgencyLevel: "Nivel de Urgencia",

professionalAssigned: "Profesional asignado",
professionalOnTheWay: "Profesional en camino",
professionalArrived: "Profesional llegó",

requestAccepted: "Solicitud aceptada",
arrivingSoon: "Llegando pronto",
jobStarted: "Trabajo comenzado",
workProgress: "Progreso del Trabajo",

startJob: "Comenzar Trabajo",
trackWork: "Seguir Trabajo",
completeService: "Completar Servicio",

workActive: "Trabajo activo",
status: "Estado",
message: "Mensaje",
callButton: "Llamar",

requestQuote: "Solicitar cotización",
cancelQuoteRequest: "Cancelar solicitud",
messageContractor:
"Enviar mensaje al negocio",

leaveReview: "Dejar reseña",
writeReview: "Escribir reseña...",
submitReview: "Enviar reseña",
projectGallery: "Portafolio del negocio",
noProjectPhotos: "Sin fotos de proyectos",
reviews: "Reseñas",
noReviewsYet: "Aún no hay reseñas",
contractorDetailsLoading:
"Cargando negocio...",
fastResponse: "Respuesta rápida",
verified: "Verificado",
// Texto universal de negocio
contractor: "Profesional",
generalContractor: "Servicio General",
localContractor: "Negocio Local",
findContractors: "Buscar Negocios",
findContractorsText:
  "Explora negocios y profesionales locales confiables cerca de ti.",
messageContractor: "Enviar mensaje al negocio",
backToContractors: "Volver a negocios",
contractorNotFound: "Negocio no encontrado",
contractorNotFoundText:
  "No pudimos encontrar este perfil de negocio.",
contractorConversation: "Conversación del negocio",
contractorDetailsLoading:
  "Cargando negocio...",
projectReplies:
  "Respuestas del proyecto y conversaciones con negocios",

workCenter: "Centro de Trabajo",
workTabSchedule: "Agenda",
workTabPending: "Pendientes",
workTabActive: "Activos",
workTabCompleted: "Completados",
workTabQuotes: "Cotizaciones",
workTabMaterials: "Materiales",
workTabRevenue: "Ingresos",


materials: "Materiales",
materialsCenter: "Centro de materiales",
workflowRequested: "Solicitado",
workflowReview: "En revisión",
workflowScheduled: "Programado",
workflowQuoteNeeded: "Requiere cotización",
workflowQuoteSent: "Cotización enviada",
workflowQuoteApproved: "Cotización aprobada",
workflowActive: "Activo",
workflowOnTheWay: "En camino",
workflowArrived: "Llegó",
workflowWorking: "Trabajando",
workflowPausedMaterials: "Pausado por materiales",
workflowWaitingCustomer: "Esperando cliente",
workflowCompleted: "Completado",
workflowCancelled: "Cancelado",
workflowNoteOnTheWay: "🚗 En camino al cliente",
workflowNoteArrived: "📍 Llegaste a la ubicación",
workflowNoteWorking: "🛠️ Trabajo en progreso",
workflowNotePausedMaterials: "⏸ Trabajo pausado — esperando materiales",
workflowNoteActive: "💬 Cliente esperando actualización",
workflowNoteReview: "🧭 Revisa los detalles antes de continuar",
resumeWork: "Reanudar trabajo",
pauseForMaterials: "Pausar por materiales",
speakOrTypeMaterials: "Dicta o escribe materiales",
materialsAssistantDescription: "Dicta o escribe los materiales necesarios. Meetro los agregará directo a la lista.",
materialsPlaceholder: "Ejemplo: gabinete base, tornillos, silicona, llave de paso...",
generateMaterialsList: "Generar lista de materiales",
manualAdd: "Agregar manualmente",
manualAddSubtitle: "Agregar material uno por uno",
material: "Material",
quantity: "Cantidad",
providedBy: "Quién provee",
needsApproval: "Necesita aprobación",
saveMaterial: "Guardar material",
updateMaterial: "Actualizar material",
cancelEdit: "Cancelar edición",
pauseJob: "Pausar trabajo",
materialsList: "Lista de materiales",
searchMaterials: "Buscar materiales...",
sendToCustomer: "Enviar al cliente",
noMaterialsSaved: "Aún no has guardado materiales.",
jobMaterial: "Material del trabajo",
needed: "Necesario",
requested: "Solicitado",
received: "Recibido",
markReceived: "Marcar recibido",
deleteMaterial: "¿Eliminar material?",
deleteMaterialConfirm: "Esto eliminará este material de la lista.",
waitingOnMaterials: "Esperando materiales",
allMaterialsReadyResume: "Materiales listos — reanudar",
materialsReceived: "materiales recibidos",
pending: "pendientes",
schedule: "Agenda",
workSchedule: "Agenda de trabajo",
addVisit: "Agregar visita",
closeForm: "Cerrar formulario",
visitTitle: "Título de la visita",
date: "Fecha",
time: "Hora",
customerLocation: "Ubicación del cliente",
scheduleNotes: "Notas",
saveVisit: "Guardar visita",
updateVisit: "Actualizar visita",
noScheduledVisits: "No hay visitas programadas todavía.",
scheduledVisitsFromChat: "Las visitas guardadas desde el chat aparecerán aquí.",
manualScheduleEntry: "Entrada manual de calendario",
manualScheduleNotice: "Los clientes agregados manualmente no tendrán chat, registros automáticos, seguimiento AI ni flujo completo de proyecto hasta convertirse en un proyecto Meetro.",
manualCustomerWarning: "Cliente manual: no tiene chat, registros automáticos, AI ni flujo completo hasta convertirlo en proyecto Meetro.",
manualCustomerHowToConnect: "¿Cómo conectarlo?",
manualCustomerConnectSteps: "Para conectar este cliente:\n\n1. Toca Convertir a proyecto.\n2. Crea o envía una invitación de proyecto.\n3. Cuando el cliente acepte o se conecte, Meetro activará chat, registros, AI, materiales y flujo completo.",
manualVisit: "Visita manual",
scheduled: "Programado",
scheduledVisit: "Visita programada",
scheduledWork: "Trabajo programado",
openChat: "Abrir chat",
edit: "Editar",
startJob: "Iniciar trabajo",
createCompletion: "Crear cierre",
delete: "Eliminar",
deleteVisit: "¿Eliminar visita?",
deleteVisitConfirm: "Esto eliminará la visita de tu agenda.",
cancel: "Cancelar",
today: "Hoy",
timeTbd: "Hora pendiente",
locationPending: "Ubicación pendiente",

workGuidanceSchedule:
"Agenda visitas, citas y trabajos conectados a conversaciones con clientes.",
workGuidancePending:
"Revisa solicitudes entrantes antes de convertirlas en trabajos activos o conversaciones.",
workGuidanceActive:
"Monitorea trabajos activos, despachos, etapas de progreso y actualizaciones enviadas por chat.",
workGuidanceCompleted:
"Consulta trabajos completados y registros generados desde conversaciones, materiales y aprobación del cliente.",
workGuidanceQuotes:
"Administra cotizaciones, aprobaciones de precios y propuestas conectadas a conversaciones.",
workGuidanceMaterials:
"Rastrea materiales solicitados, pendientes, aprobados y recibidos vinculados a trabajos y chats.",
workGuidanceRevenue:
"Revisa ingresos, costos de materiales, ganancias estimadas y rendimiento operativo.",

workCenterSubtitle:
  "Administra solicitudes, trabajos activos e historial.",

liveDispatch: "Despacho en Vivo",
workSummary: "Resumen de Trabajo",

completedJobs: "Trabajos Completados",
weeklyRevenue: "Esta Semana",
activeJobsCount: "Trabajos Activos",

accepted: "Aceptado",
enRoute: "En Camino",
arrived: "Llegó",
started: "Iniciado",
complete: "Completo",

noActiveService: "Sin servicio activo",
noStatus: "Sin estado",
activeNow: "Activo Ahora",

completedProject: "Proyecto Completado",
viewCompletedRecord: "Ver Registro Completado",
projectCompleted: "Proyecto Completado",
projectCompletedSubtitle: "Tu proyecto fue completado exitosamente.",
selectedQuote: "Cotización Seleccionada",
howWasExperience: "¿Cómo fue tu experiencia?",
projectSummary: "Resumen del Proyecto",
reviewSubmitted: "Reseña enviada",
reviewPending: "Reseña pendiente",
viewMyRequests: "Ver Mis Solicitudes",
done: "Listo",
completedProjectSaved: "Este proyecto completado fue guardado en tu historial.",
projectFinalizedReviewText: "Este proyecto está finalizado. Puedes ver el registro o dejar una reseña.",
reviewSubmittedHistoryText: "Reseña enviada. Este proyecto está guardado en tu historial.",
backHome: "Volver al Inicio",
backToWorkCenter: "Volver al Centro de Trabajo",
completedProjectRecord: "Registro del Proyecto Completado",
completedJobReport: "Reporte de Trabajo Completado",
jobNotes: "Notas del Trabajo",
paymentSummary: "Resumen de Pago",
totalCharged: "Total Cobrado",
materialCost: "Costo de Materiales",
estimatedProfit: "Ganancia Estimada",
customerReview: "Reseña del Cliente",
yourReviewSubmitted: "Tu reseña fue enviada.",
messageProfessional: "Enviar Mensaje al Profesional",
printRecord: "Imprimir Registro",
homeowner: "Propietario",
date: "Fecha",
time: "Hora",
before: "Antes",
after: "Después",
afterApprovalWorkStarts: "El trabajo comienza después de la aprobación.",
 },
};

export function t(key) {
  const language = getLanguage();

  return translations[language]?.[key] || translations.en[key] || key;
}
