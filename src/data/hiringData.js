export const HIRING_EMPLOYMENT_TYPES = Object.freeze([
  "Full Time",
  "Part Time",
  "Contract",
  "Seasonal",
]);

export const HIRING_POSITION_STATUSES = Object.freeze([
  "Draft",
  "Open",
  "Paused",
  "Closed",
]);

export const HIRING_APPLICANT_STATUSES = Object.freeze([
  "New",
  "Reviewing",
  "Interview Scheduled",
  "Hired",
  "Archived",
]);

export const HIRING_POSITIONS = Object.freeze([
  Object.freeze({
    id: "field-handyman-helper",
    businessId: "local-business",
    title: "Field Handyman Helper",
    titleTranslations: Object.freeze({
      es: "Ayudante de mantenimiento residencial",
      fr: "Assistant homme à tout faire",
      "pt-BR": "Ajudante de manutenção residencial",
    }),
    businessName: "Bgone Home Renovation & Handyman Services",
    description:
      "Support repair, maintenance, cleanup, and small install work on local home-service jobs.",
    descriptionTranslations: Object.freeze({
      es: "Apoya reparaciones, mantenimiento, limpieza y trabajos pequeños de instalación en servicios residenciales locales.",
      fr: "Aidez aux réparations, à l'entretien, au nettoyage et aux petits travaux d'installation pour des services résidentiels locaux.",
      "pt-BR": "Apoie reparos, manutenção, limpeza e pequenos serviços de instalação em trabalhos residenciais locais.",
    }),
    payRange: "$20-$28/hr",
    serviceArea: "Lee County, FL",
    employmentType: "Part Time",
    experienceRequired: "1+ year home repair or maintenance experience",
    experienceRequiredTranslations: Object.freeze({
      es: "Más de 1 año de experiencia en reparación o mantenimiento residencial",
      fr: "Plus d'un an d'expérience en réparation ou entretien résidentiel",
      "pt-BR": "Mais de 1 ano de experiência em reparos ou manutenção residencial",
    }),
    vehicleRequired: true,
    backgroundCheckRequired: true,
    status: "Open",
    category: "Handyman",
    categoryTranslations: Object.freeze({
      es: "Mantenimiento",
      fr: "Bricolage",
      "pt-BR": "Serviços gerais",
    }),
    distance: "10 miles",
    requirements: Object.freeze([
      "Basic hand-tool experience",
      "Reliable transportation",
      "Comfortable working in occupied homes",
      "Able to document completed work with photos",
    ]),
    requirementsTranslations: Object.freeze({
      es: Object.freeze([
        "Experiencia básica con herramientas manuales",
        "Transporte confiable",
        "Cómodo trabajando en hogares ocupados",
        "Capaz de documentar el trabajo completado con fotos",
      ]),
      fr: Object.freeze([
        "Expérience de base avec les outils manuels",
        "Transport fiable",
        "À l'aise pour travailler dans des logements occupés",
        "Capable de documenter les travaux terminés avec des photos",
      ]),
      "pt-BR": Object.freeze([
        "Experiência básica com ferramentas manuais",
        "Transporte confiável",
        "Confortável trabalhando em casas ocupadas",
        "Capaz de documentar o trabalho concluído com fotos",
      ]),
    }),
  }),
  Object.freeze({
    id: "painting-crew-assistant",
    businessId: "local-business",
    title: "Painting Crew Assistant",
    titleTranslations: Object.freeze({
      es: "Ayudante de equipo de pintura",
      fr: "Assistant d'équipe de peinture",
      "pt-BR": "Ajudante de equipe de pintura",
    }),
    businessName: "Bgone Home Renovation & Handyman Services",
    description:
      "Help with prep, masking, touch-up, cleanup, and customer-ready project closeout.",
    descriptionTranslations: Object.freeze({
      es: "Ayuda con preparación, protección, retoques, limpieza y cierre de proyectos listos para el cliente.",
      fr: "Aidez à la préparation, au masquage, aux retouches, au nettoyage et à la finition de projets prêts pour le client.",
      "pt-BR": "Ajude com preparação, proteção, retoques, limpeza e finalização de projetos prontos para o cliente.",
    }),
    payRange: "$18-$24/hr",
    serviceArea: "Cape Coral / Fort Myers",
    employmentType: "Contract",
    experienceRequired: "Painting prep experience preferred",
    experienceRequiredTranslations: Object.freeze({
      es: "Se prefiere experiencia en preparación de pintura",
      fr: "Expérience en préparation de peinture souhaitée",
      "pt-BR": "Experiência em preparação de pintura preferencial",
    }),
    vehicleRequired: true,
    backgroundCheckRequired: false,
    status: "Paused",
    category: "Painting",
    categoryTranslations: Object.freeze({
      es: "Pintura",
      fr: "Peinture",
      "pt-BR": "Pintura",
    }),
    distance: "15 miles",
    requirements: Object.freeze([
      "Painting prep experience preferred",
      "Attention to detail",
      "Reliable transportation",
    ]),
    requirementsTranslations: Object.freeze({
      es: Object.freeze([
        "Se prefiere experiencia en preparación de pintura",
        "Atención al detalle",
        "Transporte confiable",
      ]),
      fr: Object.freeze([
        "Expérience en préparation de peinture souhaitée",
        "Souci du détail",
        "Transport fiable",
      ]),
      "pt-BR": Object.freeze([
        "Experiência em preparação de pintura preferencial",
        "Atenção aos detalhes",
        "Transporte confiável",
      ]),
    }),
  }),
  Object.freeze({
    id: "general-labor-assistant",
    businessId: "local-property-maintenance",
    title: "General Labor Assistant",
    titleTranslations: Object.freeze({
      es: "Ayudante general de obra",
      fr: "Assistant de main-d'oeuvre générale",
      "pt-BR": "Ajudante geral de obra",
    }),
    businessName: "Local Property Maintenance Team",
    description:
      "Help with cleanup, material movement, light maintenance, and jobsite organization.",
    descriptionTranslations: Object.freeze({
      es: "Ayuda con limpieza, movimiento de materiales, mantenimiento ligero y organización del sitio de trabajo.",
      fr: "Aidez au nettoyage, au déplacement de matériaux, à l'entretien léger et à l'organisation du chantier.",
      "pt-BR": "Ajude com limpeza, movimentação de materiais, manutenção leve e organização do local de trabalho.",
    }),
    payRange: "$17-$22/hr",
    serviceArea: "Fort Myers, FL",
    employmentType: "Seasonal",
    experienceRequired: "Jobsite or maintenance experience helpful",
    experienceRequiredTranslations: Object.freeze({
      es: "La experiencia en obra o mantenimiento es útil",
      fr: "Une expérience de chantier ou d'entretien est utile",
      "pt-BR": "Experiência em obra ou manutenção é útil",
    }),
    vehicleRequired: false,
    backgroundCheckRequired: false,
    status: "Open",
    category: "General Labor",
    categoryTranslations: Object.freeze({
      es: "Ayudante general",
      fr: "Main-d'oeuvre générale",
      "pt-BR": "Serviços gerais de apoio",
    }),
    distance: "25 miles",
    requirements: Object.freeze([
      "Dependable schedule",
      "Able to lift common job materials safely",
      "Comfortable with outdoor work",
    ]),
    requirementsTranslations: Object.freeze({
      es: Object.freeze([
        "Horario confiable",
        "Capaz de levantar materiales comunes de forma segura",
        "Cómodo con trabajo al aire libre",
      ]),
      fr: Object.freeze([
        "Horaire fiable",
        "Capable de soulever des matériaux courants en toute sécurité",
        "À l'aise avec le travail extérieur",
      ]),
      "pt-BR": Object.freeze([
        "Horário confiável",
        "Capaz de levantar materiais comuns com segurança",
        "Confortável com trabalho ao ar livre",
      ]),
    }),
  }),
]);

export const HIRING_APPLICANTS = Object.freeze([
  Object.freeze({
    id: "applicant-maya-torres",
    businessId: "local-business",
    name: "Maya Torres",
    positionId: "field-handyman-helper",
    positionAppliedFor: "Field Handyman Helper",
    experienceSummary:
      "Two years assisting with rental maintenance, punch lists, and move-out repairs.",
    applicationDate: "Jun 21, 2026",
    status: "New",
    contactPreference: "Text or email",
    notes: "Available weekdays after 8 AM. Has basic hand tools.",
  }),
  Object.freeze({
    id: "applicant-devin-price",
    businessId: "local-business",
    name: "Devin Price",
    positionId: "painting-crew-assistant",
    positionAppliedFor: "Painting Crew Assistant",
    experienceSummary:
      "Residential paint prep, drywall touch-up, and final cleanup experience.",
    applicationDate: "Jun 19, 2026",
    status: "Reviewing",
    contactPreference: "Phone",
    notes: "Prefers contract work and can support weekend jobs.",
  }),
]);

export const HIRING_INTERVIEWS = Object.freeze([
  Object.freeze({
    id: "interview-maya-torres",
    businessId: "local-business",
    applicantId: "applicant-maya-torres",
    applicantName: "Maya Torres",
    positionId: "field-handyman-helper",
    positionTitle: "Field Handyman Helper",
    scheduledFor: "Preview scheduling",
    status: "Preview",
  }),
]);

export const HIRING_TEAM_MEMBERS = Object.freeze([]);

export const HIRING_JOB_CATEGORIES = Object.freeze([
  "Handyman",
  "Painting",
  "Drywall",
  "Cleaning",
  "Landscaping",
  "Property Maintenance",
  "Construction",
  "General Labor",
]);
