import { getMeetroIcon } from "../utils/meetroIconRegistry";

const ICON_ALIASES = {
  businessProfile: "profileBuilding",
  businessTools: "briefcase",
  businessDashboard: "dashboardGrid",
  businessLeads: "leadPerson",
  customerRelationships: "people",
  professionalSetup: "profile",
  serviceTypes: "listCard",
  findingsLibrary: "lightbulb",
  knowledgeBase: "book",
  materialsLibrary: "box",
  assetCenter: "assetHome",
  hiringCenter: "people",
  jobsHiring: "briefcase",
  priceBook: "tag",
  quickQuote: "docPlus",
  quickInvoice: "invoiceDoc",
  contractTemplates: "stackedDocs",
  reportsCenter: "pieChart",
  permitCenter: "columns",
  complianceCenter: "shield",
  businessIntelligence: "trend",
  reviews: "reviewBubble",
  subscription: "creditCard",
  aiHelp: "sparkles",
  assistant: "sparkles",
  opportunities: "target",
  currentJobs: "hammer",
  jobHistory: "historyClock",
  evaluationNotes: "noteText",
  requestDetails: "docText",
  quote: "quoteDoc",
  proposal: "richDoc",
  payment: "creditCard",
  activeWork: "tools",
  completion: "sealCheck",
  closure: "lockDoc",
  history: "archive",
  addProject: "plusStack",
  publishProject: "paperPlane",
  featuredSpotlight: "sparkles",
  beforeAfter: "splitRect",
  photoCount: "photoStack",
  editPortfolio: "pencil",
  imageReady: "checkCircle",
  emergency: "warning",
  dispatch: "location",
  onTheWay: "car",
  arrived: "pin",
  completeEmergency: "checkCircle",
  verified: "sealCheck",
  availableNow: "dot",
  comingSoon: "clockAlert",
  readOnly: "eye",
  preview: "dashedRect",
  selected: "checkCircle",
  phone: "phone",
  location: "pin",
  trust: "shield",
  fastResponse: "bolt",
  plumbing: "tools",
  electrical: "bolt",
  settings: "gear",
  language: "globe",
  notifications: "bell",
  privacy: "lock",
  lock: "lock",
  passcode: "keypad",
  device: "phoneDevice",
  help: "helpCircle",
  warning: "warning",
  openExternal: "externalArrow",
  close: "close",
  share: "shareArrow",
  legal: "docSearch",
  materials: "box",
  portfolio: "photos",
  microphone: "microphone",
  stopRecording: "stopRecording",
};

function SvgIcon({ type, titleId }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    focusable: "false",
    "aria-labelledby": titleId,
  };

  const stroke = {
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const softStroke = {
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (type) {
    case "microphone":
      return (
        <svg {...common}>
          <rect x="8.2" y="3" width="7.6" height="12" rx="3.8" fill="currentColor" />
          <path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0M12 17.7V21M8.8 21h6.4" {...stroke} />
        </svg>
      );
    case "stopRecording":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.2" fill="currentColor" opacity="0.14" />
          <rect x="7.7" y="7.7" width="8.6" height="8.6" rx="1.4" fill="currentColor" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
          <path d="M4.9 11.2 12 5.3l7.1 5.9v7.5a2 2 0 0 1-2 2H6.9a2 2 0 0 1-2-2z" fill="currentColor" />
          <path d="M9.8 20.2v-5.3a2.2 2.2 0 0 1 4.4 0v5.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m4.2 11.6 7.8-6.5 7.8 6.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        </svg>
      );
    case "discover":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
          <circle cx="10.8" cy="10.8" r="5.8" fill="currentColor" />
          <circle cx="10.8" cy="10.8" r="2.3" fill="#fff" opacity="0.9" />
          <path d="m15.1 15.1 4.1 4.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "request":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.5" fill="currentColor" />
          <path d="M12 7.5v9M7.5 12h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M4.8 4.8h9.9a3.4 3.4 0 0 1 3.4 3.4v3.7a3.4 3.4 0 0 1-3.4 3.4H9.2L4.4 19v-3.7A3.4 3.4 0 0 1 1.8 12V8.2a3.4 3.4 0 0 1 3-3.4Z" fill="currentColor" />
          <path d="M15.3 8h3.3a3.3 3.3 0 0 1 3.3 3.3v3.2a3.3 3.3 0 0 1-3.3 3.3h-.4v2.5l-3.5-2.5h-3.1" fill="currentColor" opacity="0.45" />
          <path d="M7 9.3h6.3M7 12h4.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.14" />
          <circle cx="12" cy="9" r="3.7" fill="currentColor" />
          <path d="M5.5 20a7.1 7.1 0 0 1 13 0" fill="currentColor" />
          <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
        </svg>
      );
    case "dashboardGrid":
      return (
        <svg {...common}>
          <rect x="3" y="3.8" width="8.1" height="8.1" rx="2.2" fill="currentColor" />
          <rect x="12.9" y="3.8" width="8.1" height="5.8" rx="2.2" fill="currentColor" opacity="0.72" />
          <rect x="3" y="13.8" width="8.1" height="6.4" rx="2.2" fill="currentColor" opacity="0.72" />
          <rect x="12.9" y="11.4" width="8.1" height="8.8" rx="2.2" fill="currentColor" />
        </svg>
      );
    case "leadPerson":
      return (
        <svg {...common}>
          <rect x="3" y="5.2" width="12.6" height="14.4" rx="3" fill="currentColor" opacity="0.14" />
          <circle cx="9.2" cy="9.3" r="3.2" fill="currentColor" />
          <path d="M3.8 18.9a6.1 6.1 0 0 1 10.8 0" fill="currentColor" />
          <circle cx="17.6" cy="16.2" r="4.2" fill="currentColor" />
          <path d="M17.6 14.1v4.2M15.5 16.2h4.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "workCenter":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2.8" fill="currentColor" />
          <rect x="8.3" y="2.6" width="7.4" height="4.5" rx="1.7" fill="currentColor" opacity="0.72" />
          <path d="M9 10.1h6M9 13.7h6M9 17.3h4" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="12" rx="3" fill="currentColor" opacity="0.16" />
          <path d="M8.5 7V5.7A2.2 2.2 0 0 1 10.7 3.5h2.6a2.2 2.2 0 0 1 2.2 2.2V7M3.5 11.5h17M10 13h4" {...stroke} />
        </svg>
      );
    case "profileBuilding":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="14" rx="2.4" fill="currentColor" opacity="0.16" />
          <path d="M7.5 20V4.5h9V20M7.5 8h9M10 11h.1M14 11h.1M10 14h.1M14 14h.1M10 20v-3h4v3" {...stroke} />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="3" fill="currentColor" />
          <circle cx="16" cy="10" r="2.5" fill="currentColor" opacity="0.62" />
          <path d="M3.8 18.8a5.8 5.8 0 0 1 10.4 0" fill="currentColor" opacity="0.85" />
          <path d="M13.4 18.8a5 5 0 0 1 6.8 0" fill="currentColor" opacity="0.45" />
        </svg>
      );
    case "photos":
      return (
        <svg {...common}>
          <rect x="5.2" y="5.5" width="14.3" height="11.5" rx="2.2" fill="currentColor" opacity="0.16" />
          <rect x="3.2" y="8" width="15" height="11" rx="2.2" {...stroke} />
          <path d="m5.8 17 3.5-3.7 2.5 2.5 2.1-2.1 2.2 3.3" {...stroke} />
          <circle cx="14.4" cy="11.1" r="1.1" fill="currentColor" />
        </svg>
      );
    case "schedule":
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="14" rx="2.4" fill="currentColor" opacity="0.16" />
          <path d="M7.5 3.8v3.5M16.5 3.8v3.5M4.5 9h15" {...stroke} />
          <circle cx="15.7" cy="15.3" r="3.2" fill="currentColor" />
          <path d="M15.7 13.7v1.9l1.4.9" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "revenue":
    case "payment":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.4" fill="currentColor" opacity="0.16" />
          <path d="M12 6.8v10.4M15.2 8.8c-.6-.8-1.8-1.3-3.1-1.3-1.8 0-3 .9-3 2.2 0 3 6.2 1.3 6.2 4.6 0 1.4-1.3 2.3-3.3 2.3-1.5 0-2.8-.5-3.6-1.5" {...stroke} />
        </svg>
      );
    case "historyClock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.4" fill="currentColor" opacity="0.16" />
          <path d="M4.8 9.2A8 8 0 1 1 5.5 16M4.8 9.2H2.6M4.8 9.2V7" {...stroke} />
          <path d="M12 8v4.5l3 1.8" {...stroke} />
        </svg>
      );
    case "noteText":
    case "docText":
    case "quoteDoc":
    case "richDoc":
    case "invoiceDoc":
    case "docPlus":
    case "docSearch":
      return (
        <svg {...common}>
          <path d="M6.5 3.6h7.4L18.5 8v12.4h-12z" fill="currentColor" opacity="0.15" />
          <path d="M6.5 3.6h7.4L18.5 8v12.4h-12zM14 3.9V8h4.1M9 11h6M9 14h6M9 17h3.5" {...stroke} />
          {type === "docPlus" && <path d="M16.5 15v5M14 17.5h5" {...stroke} />}
          {type === "docSearch" && <circle cx="15.5" cy="16.2" r="2.1" {...softStroke} />}
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="m4.3 8 7.7-4 7.7 4v8L12 20 4.3 16z" fill="currentColor" opacity="0.16" />
          <path d="m4.3 8 7.7 4 7.7-4M12 12v8M4.3 8v8l7.7 4 7.7-4V8l-7.7-4z" {...stroke} />
        </svg>
      );
    case "tools":
    case "hammer":
      return (
        <svg {...common}>
          <path d="M14.8 5.2 18.9 9l-2.1 2.1-4-3.9z" fill="currentColor" opacity="0.2" />
          <path d="m4.5 19.5 7.8-7.8M12.7 6.1l5.2 5.2M15.3 3.8l4.9 4.9M5.2 5.7l3.2 3.2M6.8 4.1 10 7.3" {...stroke} />
        </svg>
      );
    case "sealCheck":
    case "checkCircle":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="currentColor" />
          <path d="m7.8 12.4 2.7 2.7 5.7-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "lockDoc":
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2.4" fill="currentColor" opacity="0.18" />
          <path d="M8 10V8a4 4 0 0 1 8 0v2M5 10h14v10H5zM12 14.2v2.2" {...stroke} />
        </svg>
      );
    case "archive":
      return (
        <svg {...common}>
          <path d="M4 7h16v12H4z" fill="currentColor" opacity="0.16" />
          <path d="M4 7h16v12H4zM3 4.5h18V7H3zM9 11h6" {...stroke} />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.14" />
          <circle cx="12" cy="12" r="6.2" {...stroke} />
          <circle cx="12" cy="12" r="2.3" fill="currentColor" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M4.5 5.5h7.8l7.2 7.2-6.8 6.8-7.2-7.2z" fill="currentColor" opacity="0.16" />
          <path d="M4.5 5.5h7.8l7.2 7.2-6.8 6.8-7.2-7.2z" {...stroke} />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" />
        </svg>
      );
    case "stackedDocs":
      return (
        <svg {...common}>
          <rect x="7.5" y="4" width="10" height="13" rx="2" fill="currentColor" opacity="0.16" />
          <rect x="5" y="7" width="10" height="13" rx="2" {...stroke} />
          <path d="M8 11h4M8 14h4M8 17h2.5" {...softStroke} />
        </svg>
      );
    case "pieChart":
      return (
        <svg {...common}>
          <path d="M12 3.8a8.2 8.2 0 1 0 8.2 8.2H12z" fill="currentColor" opacity="0.18" />
          <path d="M12 3.8v8.2h8.2A8.2 8.2 0 0 0 12 3.8Z" fill="currentColor" />
          <path d="M12 3.8a8.2 8.2 0 1 0 8.2 8.2H12z" {...softStroke} />
        </svg>
      );
    case "columns":
      return (
        <svg {...common}>
          <path d="M4 8h16L12 3z" fill="currentColor" opacity="0.18" />
          <path d="M5 19h14M4 8h16L12 3zM6.5 8v8M11 8v8M15.5 8v8" {...stroke} />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3.8 19 6v5.6c0 4.1-2.9 7.1-7 8.6-4.1-1.5-7-4.5-7-8.6V6z" fill="currentColor" opacity="0.18" />
          <path d="M12 3.8 19 6v5.6c0 4.1-2.9 7.1-7 8.6-4.1-1.5-7-4.5-7-8.6V6zM8.7 12.2l2.1 2.1 4.5-4.8" {...stroke} />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path d="M4 18h16M5.5 15.5l4.2-4 3.2 2.4 5.7-7" {...stroke} />
          <path d="M15.2 6.7h3.4v3.4" {...stroke} />
        </svg>
      );
    case "reviewBubble":
      return (
        <svg {...common}>
          <path d="M5 5.8h14v9.4H9.4L5 18z" fill="currentColor" opacity="0.16" />
          <path d="M5 5.8h14v9.4H9.4L5 18z" {...stroke} />
          <path d="m12 8.2.8 1.7 1.9.2-1.4 1.3.4 1.8-1.7-.9-1.7.9.4-1.8-1.4-1.3 1.9-.2z" fill="currentColor" />
        </svg>
      );
    case "gear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" {...stroke} />
          <path d="M12 3.8v2M12 18.2v2M5.6 5.6 7 7M17 17l1.4 1.4M3.8 12h2M18.2 12h2M5.6 18.4 7 17M17 7l1.4-1.4" {...stroke} />
        </svg>
      );
    case "lightbulb":
      return (
        <svg {...common}>
          <path d="M8.2 14.1a6 6 0 1 1 7.6 0c-.8.6-1.1 1.4-1.1 2.3H9.3c0-.9-.3-1.7-1.1-2.3Z" fill="currentColor" opacity="0.2" />
          <path d="M8.2 14.1a6 6 0 1 1 7.6 0c-.8.6-1.1 1.4-1.1 2.3H9.3c0-.9-.3-1.7-1.1-2.3ZM9.7 19h4.6" {...stroke} />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M5 5.5h6.8A3.2 3.2 0 0 1 15 8.7v10.8H8.2A3.2 3.2 0 0 1 5 16.3z" fill="currentColor" opacity="0.16" />
          <path d="M5 5.5h6.8A3.2 3.2 0 0 1 15 8.7v10.8H8.2A3.2 3.2 0 0 1 5 16.3zM15 7h4v12.5h-4" {...stroke} />
        </svg>
      );
    case "assetHome":
      return (
        <svg {...common}>
          <path d="m4.7 11.1 7.3-6 7.3 6v8H4.7z" fill="currentColor" opacity="0.16" />
          <path d="m4.7 11.1 7.3-6 7.3 6M6.5 10.5V19h11v-8.5M10 19v-4h4v4" {...stroke} />
          <path d="M16.8 5v4" {...stroke} />
        </svg>
      );
    case "plusStack":
      return (
        <svg {...common}>
          <rect x="5" y="6" width="11" height="11" rx="2" fill="currentColor" opacity="0.16" />
          <rect x="8" y="3.5" width="11" height="11" rx="2" {...stroke} />
          <path d="M13.5 7.1v3.8M11.6 9h3.8" {...stroke} />
        </svg>
      );
    case "paperPlane":
      return (
        <svg {...common}>
          <path d="M3.5 11.7 20.5 4 16 20l-4.3-6-5.9 4.1z" fill="currentColor" opacity="0.18" />
          <path d="M3.5 11.7 20.5 4 16 20l-4.3-6-5.9 4.1zM11.7 14 20.5 4" {...stroke} />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="M12 3.8 13.7 9l5.1 1.7-5.1 1.7L12 17.6l-1.7-5.2-5.1-1.7L10.3 9z" fill="currentColor" />
          <path d="m18.4 15.2.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7zM5.3 4.8l.5 1.6 1.6.5-1.6.5L5.3 9l-.5-1.6-1.6-.5 1.6-.5z" fill="currentColor" opacity="0.58" />
        </svg>
      );
    case "splitRect":
      return (
        <svg {...common}>
          <rect x="3.5" y="6" width="17" height="12" rx="2.2" fill="currentColor" opacity="0.14" />
          <rect x="3.5" y="6" width="17" height="12" rx="2.2" {...stroke} />
          <path d="M12 6v12M6.5 10h2.8M14.7 14h2.8" {...stroke} />
        </svg>
      );
    case "photoStack":
      return (
        <svg {...common}>
          <rect x="6.2" y="4" width="13" height="10" rx="2" fill="currentColor" opacity="0.16" />
          <rect x="3.8" y="8" width="13" height="10" rx="2" {...stroke} />
          <path d="m6.1 16 2.7-2.7 1.8 1.8 1.6-1.6 2.3 2.5" {...softStroke} />
        </svg>
      );
    case "pencil":
      return (
        <svg {...common}>
          <path d="M5 16.8 16.9 4.9a2.2 2.2 0 0 1 3.1 3.1L8.1 19.9 4 20.7z" fill="currentColor" opacity="0.18" />
          <path d="M5 16.8 16.9 4.9a2.2 2.2 0 0 1 3.1 3.1L8.1 19.9 4 20.7zM15.5 6.3l3.1 3.1" {...stroke} />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M12 4 21 20H3z" fill="currentColor" opacity="0.18" />
          <path d="M12 4 21 20H3zM12 9v4.6M12 17h.1" {...stroke} />
        </svg>
      );
    case "location":
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s6.3-5.3 6.3-11.1A6.3 6.3 0 1 0 5.7 9.9C5.7 15.7 12 21 12 21Z" fill="currentColor" opacity="0.16" />
          <path d="M12 21s6.3-5.3 6.3-11.1A6.3 6.3 0 1 0 5.7 9.9C5.7 15.7 12 21 12 21Z" {...stroke} />
          <circle cx="12" cy="10" r="2" fill="currentColor" />
        </svg>
      );
    case "car":
      return (
        <svg {...common}>
          <path d="M5.3 13.4 7.2 8h9.6l1.9 5.4v4.1H5.3z" fill="currentColor" opacity="0.16" />
          <path d="M5.3 13.4 7.2 8h9.6l1.9 5.4M5.3 13.4h13.4v4.1H5.3zM7.5 17.5v1.2M16.5 17.5v1.2" {...stroke} />
          <circle cx="8.2" cy="15.4" r="1" fill="currentColor" />
          <circle cx="15.8" cy="15.4" r="1" fill="currentColor" />
        </svg>
      );
    case "dot":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" fill="currentColor" />
        </svg>
      );
    case "clockAlert":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.4" fill="currentColor" opacity="0.16" />
          <path d="M12 7.8v4.6l2.7 1.6" {...stroke} />
          <path d="M12 20.4a8.4 8.4 0 1 1 8.4-8.4" {...stroke} />
          <path d="M19 16v2.2M19 21h.1" {...stroke} />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M3.5 12s3.3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3.3 5.5-8.5 5.5S3.5 12 3.5 12Z" fill="currentColor" opacity="0.16" />
          <path d="M3.5 12s3.3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3.3 5.5-8.5 5.5S3.5 12 3.5 12Z" {...stroke} />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      );
    case "dashedRect":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2.4" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" fill="currentColor" opacity="0.08" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <path d="M7.1 4.5 9.5 7 8.2 9.3c1.2 2.4 3 4.3 5.4 5.5l2.3-1.3 2.6 2.5-1.2 3.2c-.3.8-1.2 1.3-2.1 1.1C9.5 19 5 14.5 3.7 8.8c-.2-.9.3-1.8 1.1-2.1z" fill="currentColor" opacity="0.18" />
          <path d="M7.1 4.5 9.5 7 8.2 9.3c1.2 2.4 3 4.3 5.4 5.5l2.3-1.3 2.6 2.5-1.2 3.2c-.3.8-1.2 1.3-2.1 1.1C9.5 19 5 14.5 3.7 8.8c-.2-.9.3-1.8 1.1-2.1z" {...stroke} />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <path d="M13 2.8 5.5 13h5.3L10 21.2 18.5 10h-5.3z" fill="currentColor" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.14" />
          <circle cx="12" cy="12" r="8" {...stroke} />
          <path d="M4.5 12h15M12 4c2.4 2.4 3.6 5.1 3.6 8S14.4 17.6 12 20c-2.4-2.4-3.6-5.1-3.6-8S9.6 6.4 12 4Z" {...softStroke} />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 16H6l1.4-2.1V10a4.6 4.6 0 0 1 9.2 0v3.9L18 16Z" fill="currentColor" opacity="0.18" />
          <path d="M18 16H6l1.4-2.1V10a4.6 4.6 0 0 1 9.2 0v3.9L18 16ZM10 18.4a2.2 2.2 0 0 0 4 0" {...stroke} />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor" opacity="0.16" />
          <path d="M8 10V7.5a4 4 0 0 1 8 0V10M6 10h12v10H6zM12 14v2.6" {...stroke} />
        </svg>
      );
    case "keypad":
      return (
        <svg {...common}>
          {[7, 12, 17].map((x) =>
            [7, 12, 17].map((y) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />
            ))
          )}
        </svg>
      );
    case "phoneDevice":
      return (
        <svg {...common}>
          <rect x="7.2" y="3" width="9.6" height="18" rx="2.4" fill="currentColor" opacity="0.16" />
          <rect x="7.2" y="3" width="9.6" height="18" rx="2.4" {...stroke} />
          <path d="M10.5 17.8h3" {...stroke} />
        </svg>
      );
    case "helpCircle":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.14" />
          <path d="M9.4 9.2a2.8 2.8 0 0 1 5.3 1.2c0 2.4-2.7 2.4-2.7 4M12 18h.1" {...stroke} />
        </svg>
      );
    case "externalArrow":
      return (
        <svg {...common}>
          <rect x="5" y="7" width="12" height="12" rx="2.4" fill="currentColor" opacity="0.14" />
          <path d="M11 6h7v7M18 6l-8 8" {...stroke} />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.14" />
          <path d="M8 8l8 8M16 8l-8 8" {...stroke} />
        </svg>
      );
    case "shareArrow":
      return (
        <svg {...common}>
          <path d="M12 4v11" {...stroke} />
          <path d="m8.2 7.8 3.8-3.8 3.8 3.8" {...stroke} />
          <path d="M6.5 12.5v6h11v-6" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}

function MeetroIcon({
  name,
  semanticKey,
  size = 24,
  className = "",
  ariaLabel = "",
  decorative = true,
  style = {},
}) {
  const key = semanticKey || name;
  const icon = getMeetroIcon(key);
  const visualType = ICON_ALIASES[key] || key;
  const dimension = typeof size === "number" ? `${size}px` : size;
  const titleId = !decorative ? `meetro-icon-${key}` : undefined;

  const svg = <SvgIcon type={visualType} titleId={titleId} />;

  return (
    <span
      className={`meetro-icon ${className}`.trim()}
      data-sf-symbol={icon.sfSymbol}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={!decorative ? ariaLabel || icon.description : undefined}
      role={!decorative ? "img" : undefined}
      title={!decorative ? ariaLabel || icon.description : undefined}
      style={{
        width: dimension,
        height: dimension,
        minWidth: dimension,
        fontSize: `calc(${dimension} * 0.62)`,
        ...style,
      }}
    >
      {svg || icon.fallback}
    </span>
  );
}

export default MeetroIcon;
