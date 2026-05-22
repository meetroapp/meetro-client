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

    discoverHeroTitle: "Local Project Feed",
    discoverHeroSubtitle:
      "Browse homeowner project requests and discover local opportunities.",
    localProjectFeed: "Local Project Feed",
    findLocalServices: "Find Local Services",
    professionalDiscoverText:
      "Browse homeowner project requests that match your business category.",
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
    contractor: "Contractor",
    generalContractor: "General Contractor",
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
    projectGallery: "Project Gallery",

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
  "Upload before & after project photos to showcase your contractor work.",

noContractorProfileFound:
  "No contractor profile found",

createContractorProfileFirst:
  "Create your contractor profile first.",

createContractorProfile:
  "Create Contractor Profile",

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
  "Unlock premium visibility, unlimited leads, emergency priority, AI business tools, and advanced contractor features.",
conversation: "Conversation",
loadingConversation: "Loading conversation...",
localContractor: "Local Contractor",
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

loadingContractorProfile: "Loading contractor profile...",
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
contractorProfileCreated: "Contractor profile created!",
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
myProfile: "My Profile",
manage: "Manage",
leads: "Leads",
gallery: "Gallery",
photos: "Photos",
projectPostedSuccess: "Project posted! Contractors can now view your request.",
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

findContractors: "Find Contractors",
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
  "Project replies and contractor conversations",
loadingProject: "Loading project...",
postNotFound: "Post not found",
projectCouldNotBeLoaded:
  "This project could not be loaded.",
noDescriptionAdded:
  "No description added.",
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
      "Explora solicitudes de propietarios que coincidan con tu categoría de negocio.",
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
    contractor: "Contratista",
    generalContractor: "Contratista General",
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
    projectGallery: "Galería de Proyectos",

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
  "Sube fotos de proyectos antes y después para mostrar tu trabajo.",

noContractorProfileFound:
  "No se encontró perfil de contratista",

createContractorProfileFirst:
  "Primero crea tu perfil de contratista.",

createContractorProfile:
  "Crear Perfil de Contratista",

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
  "Desbloquea visibilidad premium, clientes ilimitados, prioridad de emergencia, herramientas de IA para negocios y funciones avanzadas para contratistas.",
conversation: "Conversación",
loadingConversation: "Cargando conversación...",
localContractor: "Contratista Local",
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

loadingContractorProfile: "Cargando perfil del contratista...",
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
contractorProfileCreated: "¡Perfil de contratista creado!",
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
myProfile: "Mi Perfil",
manage: "Administrar",
leads: "Clientes",
gallery: "Galería",
photos: "Fotos",
projectPostedSuccess: "Project posted! Contractors can now view your request.",
uploadTipTitle: "Add clear project details",
uploadTipText:
  "Photos, location, and a short description help local professionals give faster and better quotes.",
projectTitlePlaceholder: "Example: Bathroom tile repair",
projectDescriptionPlaceholder:
  "Describe what needs to be done, timing, and any important details.",
photoHelpsPros: "Photos help professionals understand the job faster.",

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

findContractors: "Buscar Contratistas",
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

projectReplies:
  "Respuestas del proyecto y conversaciones con contratistas",

loadingProject: "Cargando proyecto...",
postNotFound: "Proyecto no encontrado",
projectCouldNotBeLoaded:
  "Este proyecto no pudo cargarse.",
noDescriptionAdded:
  "No se agregó descripción.",
 },
};

export function t(key) {
  const language = getLanguage();

  return translations[language]?.[key] || translations.en[key] || key;
}
