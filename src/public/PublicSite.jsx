import { useState } from "react";
import termsOfUse from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_TERMS_OF_USE.md?raw";
import privacyPolicy from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_PRIVACY_POLICY.md?raw";

const PUBLIC_LINKS = [
  { id: "privacy", label: "Privacy Policy", href: "/privacy" },
  { id: "terms", label: "Terms of Service", href: "/terms" },
  { id: "contact", label: "Contact Us", href: "/contact" },
];

const PUBLIC_NAV_LINKS = [
  { id: "why", href: "#why" },
  { id: "journey", href: "#journey" },
  { id: "resources", href: "#resources" },
  { id: "contact", href: "/contact" },
];

const PUBLIC_ROUTES = new Set(["/", "/privacy", "/terms", "/contact"]);
const PUBLIC_LANGUAGE_STORAGE_KEY = "meetroPublicLanguage";

const PUBLIC_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
];

const PUBLIC_COPY = {
  en: {
    nav: {
      why: "Why Meetro Community",
      journey: "How It Works",
      resources: "Resources",
      contact: "Contact Us",
    },
    links: {
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      contact: "Contact Us",
    },
    hero: {
      badge: "Built around trust. Powered by relationships.",
      headlinePrefix: "Every trusted relationship begins with",
      headlineAccent: "understanding.",
      copy:
        "Welcome to Meetro Community - where understanding becomes trusted relationships through meaningful work.",
      support:
        "People do not join Meetro Community because they need another app. They join because they need someone to understand what they are trying to accomplish.",
      primary: "Join the Journey",
      secondary: "Explore the Journey",
    },
    why: {
      heading: "Why Meetro Community exists",
      statement: "Before there is work, there is understanding.",
      copy:
        "Every meaningful project begins with a person. Families improve homes. Professionals master their craft. Neighbors build stronger communities. Meetro Community exists to help those relationships grow.",
    },
    audience: [
      {
        icon: "People",
        title: "For People",
        text: "Find trusted help and build relationships that make life easier.",
      },
      {
        icon: "Pros",
        title: "For Professionals",
        text: "Grow your business, build your reputation, and do work that matters.",
      },
      {
        icon: "Homes",
        title: "For Communities",
        text: "Neighbors supporting neighbors creates stronger, more vibrant communities.",
      },
    ],
    journeyHeading: "The Journey We Build Together",
    journeySteps: [
      ["1", "Relationships", "Connections create opportunity."],
      ["2", "Communication", "Conversations create clarity."],
      ["3", "Understanding", "Understanding creates confidence."],
      ["4", "Decisions", "Decisions create direction."],
      ["5", "Work", "Work creates value."],
      ["6", "History", "History builds trust."],
      ["7", "Relationships", "Stronger relationships create more good."],
    ],
    guidance: {
      titleTop: "Guidance when you need it.",
      titleBottom: "Quiet when you don't.",
      copy:
        "Ask Meetro is your companion throughout Meetro Community - here to answer questions, offer guidance, and help you move forward with confidence.",
      points: ["Ask questions", "Find guidance", "Get support"],
      footer: "Human-centered. Relationship-first. Purpose-driven.",
      small: "Guided by Ask Meetro. Powered by Meetro Intelligence.",
    },
    outcomesHeading: "Meetro Community helps professionals become:",
    outcomes: [
      ["Build lasting trust.", "Show up prepared and deliver with confidence."],
      ["Stay organized with confidence.", "Manage your work with clarity."],
      [
        "Preserve meaningful projects.",
        "Keep the work, decisions, and history together.",
      ],
      [
        "Spend more time serving people.",
        "Reduce confusion and focus on the work that matters.",
      ],
      [
        "Leave a history worth remembering.",
        "Create a lasting impact through every job.",
      ],
    ],
    closing: {
      promise:
        "People may arrive looking for help. They stay because they found people they trust.",
      inviteIntro: "Know someone who would appreciate this vision?",
      inviteAction: "Invite Someone to the Journey",
      inviteReady: "Invitation ready.",
      inviteCopied: "Invitation link copied.",
      inviteFallback: "Copy this page link to invite someone.",
    },
    footer: {
      product: "A product of WM FLEX LABS, LLC.",
      developed: "Developed and published by WM FLEX LABS, LLC.",
      contact: "Contact:",
      explore: "Explore",
      legal: "Legal",
      copyright: "2026 WM FLEX LABS, LLC. All rights reserved.",
    },
  },
  es: {
    nav: {
      why: "Por qué existe Meetro Community",
      journey: "Cómo funciona",
      resources: "Recursos",
      contact: "Contacto",
    },
    links: {
      privacy: "Política de privacidad",
      terms: "Términos de servicio",
      contact: "Contacto",
    },
    hero: {
      badge: "Construido sobre confianza. Impulsado por relaciones.",
      headlinePrefix: "Cada relación de confianza comienza con",
      headlineAccent: "comprensión.",
      copy:
        "Bienvenido a Meetro Community - donde la comprensión se convierte en relaciones de confianza a través de trabajo significativo.",
      support:
        "Las personas no se unen a Meetro Community porque necesitan otra aplicación. Se unen porque necesitan que alguien comprenda lo que intentan lograr.",
      primary: "Únete al viaje",
      secondary: "Explora el viaje",
    },
    why: {
      heading: "Por qué existe Meetro Community",
      statement: "Antes de que haya trabajo, hay comprensión.",
      copy:
        "Todo proyecto significativo comienza con una persona. Las familias mejoran hogares. Los profesionales perfeccionan su oficio. Los vecinos construyen comunidades más fuertes. Meetro Community existe para ayudar a que esas relaciones crezcan.",
    },
    audience: [
      {
        icon: "Personas",
        title: "Para las personas",
        text: "Encuentra ayuda confiable y construye relaciones que hacen la vida más fácil.",
      },
      {
        icon: "Pros",
        title: "Para profesionales",
        text: "Haz crecer tu negocio, construye tu reputación y realiza trabajo que importa.",
      },
      {
        icon: "Hogares",
        title: "Para comunidades",
        text: "Vecinos apoyando a vecinos crean comunidades más fuertes y vibrantes.",
      },
    ],
    journeyHeading: "El viaje que construimos juntos",
    journeySteps: [
      ["1", "Relaciones", "Las conexiones crean oportunidades."],
      ["2", "Comunicación", "Las conversaciones crean claridad."],
      ["3", "Comprensión", "La comprensión crea confianza."],
      ["4", "Decisiones", "Las decisiones crean dirección."],
      ["5", "Trabajo", "El trabajo crea valor."],
      ["6", "Historia", "La historia construye confianza."],
      ["7", "Relaciones", "Relaciones más fuertes crean más bien."],
    ],
    guidance: {
      titleTop: "Guía cuando la necesitas.",
      titleBottom: "Silencio cuando no.",
      copy:
        "Ask Meetro es tu compañero en Meetro Community: está aquí para responder preguntas, ofrecer guía y ayudarte a avanzar con confianza.",
      points: ["Haz preguntas", "Encuentra guía", "Recibe apoyo"],
      footer: "Humano. Primero las relaciones. Con propósito.",
      small: "Guiado por Ask Meetro. Impulsado por Meetro Intelligence.",
    },
    outcomesHeading: "Meetro Community ayuda a los profesionales a ser:",
    outcomes: [
      ["Más confiables.", "Llegar preparados y entregar con confianza."],
      ["Más organizados.", "Gestionar el trabajo con claridad."],
      [
        "Guardianes de proyectos significativos.",
        "Mantener juntos el trabajo, las decisiones y la historia.",
      ],
      [
        "Más enfocados en servir.",
        "Reducir la confusión y enfocarse en el trabajo que importa.",
      ],
      [
        "Más recordados.",
        "Dejar un impacto duradero en cada trabajo.",
      ],
    ],
    closing: {
      promise:
        "Las personas pueden llegar buscando ayuda. Se quedan porque encontraron personas en quienes confiar.",
      inviteIntro: "¿Conoces a alguien que apreciaría esta visión?",
      inviteAction: "Invita a alguien al viaje",
      inviteReady: "Invitación lista.",
      inviteCopied: "Enlace de invitación copiado.",
      inviteFallback: "Copia el enlace de esta página para invitar a alguien.",
    },
    footer: {
      product: "Un producto de WM FLEX LABS, LLC.",
      developed: "Desarrollado y publicado por WM FLEX LABS, LLC.",
      contact: "Contacto:",
      explore: "Explorar",
      legal: "Legal",
      copyright: "2026 WM FLEX LABS, LLC. Todos los derechos reservados.",
    },
  },
  pt: {
    nav: {
      why: "Por que a Meetro Community existe",
      journey: "Como funciona",
      resources: "Recursos",
      contact: "Contato",
    },
    links: {
      privacy: "Política de privacidade",
      terms: "Termos de serviço",
      contact: "Contato",
    },
    hero: {
      badge: "Construída sobre confiança. Impulsionada por relações.",
      headlinePrefix: "Toda relação de confiança começa com",
      headlineAccent: "compreensão.",
      copy:
        "Bem-vindo à Meetro Community - onde a compreensão se transforma em relações de confiança por meio de trabalho significativo.",
      support:
        "As pessoas não entram na Meetro Community porque precisam de mais um aplicativo. Elas entram porque precisam que alguém compreenda o que estão tentando realizar.",
      primary: "Junte-se à jornada",
      secondary: "Explore a jornada",
    },
    why: {
      heading: "Por que a Meetro Community existe",
      statement: "Antes do trabalho, existe compreensão.",
      copy:
        "Todo projeto significativo começa com uma pessoa. Famílias melhoram lares. Profissionais dominam seu ofício. Vizinhos constroem comunidades mais fortes. A Meetro Community existe para ajudar essas relações a crescer.",
    },
    audience: [
      {
        icon: "Pessoas",
        title: "Para pessoas",
        text: "Encontre ajuda confiável e construa relações que tornam a vida mais fácil.",
      },
      {
        icon: "Pros",
        title: "Para profissionais",
        text: "Faça seu negócio crescer, construa sua reputação e realize trabalho que importa.",
      },
      {
        icon: "Lares",
        title: "Para comunidades",
        text: "Vizinhos apoiando vizinhos criam comunidades mais fortes e vibrantes.",
      },
    ],
    journeyHeading: "A jornada que construímos juntos",
    journeySteps: [
      ["1", "Relações", "Conexões criam oportunidades."],
      ["2", "Comunicação", "Conversas criam clareza."],
      ["3", "Compreensão", "Compreensão cria confiança."],
      ["4", "Decisões", "Decisões criam direção."],
      ["5", "Trabalho", "Trabalho cria valor."],
      ["6", "História", "História constrói confiança."],
      ["7", "Relações", "Relações mais fortes criam mais bem."],
    ],
    guidance: {
      titleTop: "Orientação quando você precisa.",
      titleBottom: "Silêncio quando não precisa.",
      copy:
        "Ask Meetro é seu companheiro em toda a Meetro Community: está aqui para responder perguntas, oferecer orientação e ajudar você a seguir em frente com confiança.",
      points: ["Faça perguntas", "Encontre orientação", "Receba apoio"],
      footer: "Humano. Relações em primeiro lugar. Com propósito.",
      small: "Guiado por Ask Meetro. Impulsionado por Meetro Intelligence.",
    },
    outcomesHeading: "A Meetro Community ajuda profissionais a se tornarem:",
    outcomes: [
      ["Mais confiáveis.", "Chegar preparados e entregar com confiança."],
      ["Mais organizados.", "Gerenciar o trabalho com clareza."],
      [
        "Guardiões de projetos significativos.",
        "Manter juntos o trabalho, as decisões e a história.",
      ],
      [
        "Mais focados em servir.",
        "Reduzir a confusão e focar no trabalho que importa.",
      ],
      [
        "Mais lembrados.",
        "Criar um impacto duradouro em cada trabalho.",
      ],
    ],
    closing: {
      promise:
        "As pessoas podem chegar procurando ajuda. Elas ficam porque encontraram pessoas em quem confiar.",
      inviteIntro: "Conhece alguém que apreciaria esta visão?",
      inviteAction: "Convide alguém para a jornada",
      inviteReady: "Convite pronto.",
      inviteCopied: "Link de convite copiado.",
      inviteFallback: "Copie o link desta página para convidar alguém.",
    },
    footer: {
      product: "Um produto da WM FLEX LABS, LLC.",
      developed: "Desenvolvido e publicado por WM FLEX LABS, LLC.",
      contact: "Contato:",
      explore: "Explorar",
      legal: "Legal",
      copyright: "2026 WM FLEX LABS, LLC. Todos os direitos reservados.",
    },
  },
  fr: {
    nav: {
      why: "Pourquoi Meetro Community existe",
      journey: "Comment ça marche",
      resources: "Ressources",
      contact: "Nous contacter",
    },
    links: {
      privacy: "Politique de confidentialité",
      terms: "Conditions de service",
      contact: "Nous contacter",
    },
    hero: {
      badge: "Bâti sur la confiance. Porté par les relations.",
      headlinePrefix: "Toute relation de confiance commence par",
      headlineAccent: "la compréhension.",
      copy:
        "Bienvenue dans Meetro Community - là où la compréhension devient des relations de confiance grâce à un travail porteur de sens.",
      support:
        "Les personnes ne rejoignent pas Meetro Community parce qu'elles ont besoin d'une autre application. Elles la rejoignent parce qu'elles ont besoin que quelqu'un comprenne ce qu'elles cherchent à accomplir.",
      primary: "Rejoindre le parcours",
      secondary: "Explorer le parcours",
    },
    why: {
      heading: "Pourquoi Meetro Community existe",
      statement: "Avant le travail, il y a la compréhension.",
      copy:
        "Chaque projet porteur de sens commence par une personne. Les familles améliorent leur foyer. Les professionnels maîtrisent leur métier. Les voisins construisent des communautés plus fortes. Meetro Community existe pour aider ces relations à grandir.",
    },
    audience: [
      {
        icon: "Personnes",
        title: "Pour les personnes",
        text: "Trouvez une aide de confiance et construisez des relations qui facilitent la vie.",
      },
      {
        icon: "Pros",
        title: "Pour les professionnels",
        text: "Développez votre activité, bâtissez votre réputation et faites un travail qui compte.",
      },
      {
        icon: "Foyers",
        title: "Pour les communautés",
        text: "Des voisins qui soutiennent leurs voisins créent des communautés plus fortes et plus vivantes.",
      },
    ],
    journeyHeading: "Le parcours que nous construisons ensemble",
    journeySteps: [
      ["1", "Relations", "Les connexions créent des opportunités."],
      ["2", "Communication", "Les conversations créent de la clarté."],
      ["3", "Compréhension", "La compréhension crée la confiance."],
      ["4", "Décisions", "Les décisions créent une direction."],
      ["5", "Travail", "Le travail crée de la valeur."],
      ["6", "Histoire", "L'histoire construit la confiance."],
      ["7", "Relations", "Des relations plus fortes créent plus de bien."],
    ],
    guidance: {
      titleTop: "Des conseils quand vous en avez besoin.",
      titleBottom: "De la discrétion quand vous n'en avez pas besoin.",
      copy:
        "Ask Meetro est votre compagnon dans Meetro Community : là pour répondre aux questions, offrir des conseils et vous aider à avancer avec confiance.",
      points: ["Poser des questions", "Trouver des conseils", "Recevoir du soutien"],
      footer: "Humain. Les relations d'abord. Guidé par le sens.",
      small: "Guidé par Ask Meetro. Propulsé par Meetro Intelligence.",
    },
    outcomesHeading: "Meetro Community aide les professionnels à devenir :",
    outcomes: [
      ["Plus dignes de confiance.", "Arriver préparés et livrer avec confiance."],
      ["Plus organisés.", "Gérer leur travail avec clarté."],
      [
        "Gardiens de projets porteurs de sens.",
        "Garder ensemble le travail, les décisions et l'histoire.",
      ],
      [
        "Plus concentrés sur le service.",
        "Réduire la confusion et se concentrer sur le travail qui compte.",
      ],
      [
        "Plus mémorables.",
        "Créer un impact durable à travers chaque travail.",
      ],
    ],
    closing: {
      promise:
        "Les personnes peuvent arriver en cherchant de l'aide. Elles restent parce qu'elles ont trouvé des personnes de confiance.",
      inviteIntro: "Vous connaissez quelqu'un qui apprécierait cette vision ?",
      inviteAction: "Inviter quelqu'un dans le parcours",
      inviteReady: "Invitation prête.",
      inviteCopied: "Lien d'invitation copié.",
      inviteFallback: "Copiez le lien de cette page pour inviter quelqu'un.",
    },
    footer: {
      product: "Un produit de WM FLEX LABS, LLC.",
      developed: "Développé et publié par WM FLEX LABS, LLC.",
      contact: "Contact :",
      explore: "Explorer",
      legal: "Mentions légales",
      copyright: "2026 WM FLEX LABS, LLC. Tous droits réservés.",
    },
  },
};

const JOURNEY_SHARE_TITLE = "Meetro Community";

const PUBLIC_DOCUMENTS = {
  privacy: {
    title: "Privacy Policy",
    content: privacyPolicy,
  },
  terms: {
    title: "Terms of Service",
    content: termsOfUse,
  },
};

const journeySteps = [
  {
    number: "1",
    title: "Relationships",
    text: "Connections create opportunity.",
  },
  {
    number: "2",
    title: "Communication",
    text: "Conversations create clarity.",
  },
  {
    number: "3",
    title: "Understanding",
    text: "Understanding creates confidence.",
  },
  {
    number: "4",
    title: "Decisions",
    text: "Decisions create direction.",
  },
  {
    number: "5",
    title: "Work",
    text: "Work creates value.",
  },
  {
    number: "6",
    title: "History",
    text: "History builds trust.",
  },
  {
    number: "7",
    title: "Relationships",
    text: "Stronger relationships create more good.",
  },
];

const audienceCards = [
  {
    icon: "People",
    title: "For People",
    text: "Find trusted help and build relationships that make life easier.",
  },
  {
    icon: "Pros",
    title: "For Professionals",
    text: "Grow your business, build your reputation, and do work that matters.",
  },
  {
    icon: "Homes",
    title: "For Communities",
    text: "Neighbors supporting neighbors creates stronger, more vibrant communities.",
  },
];

const professionalOutcomes = [
  {
    title: "Build lasting trust.",
    text: "Show up prepared and deliver with confidence.",
  },
  {
    title: "Stay organized with confidence.",
    text: "Manage your work with clarity.",
  },
  {
    title: "Preserve meaningful projects.",
    text: "Keep the work, decisions, and history together.",
  },
  {
    title: "Spend more time serving people.",
    text: "Reduce confusion and focus on the work that matters.",
  },
  {
    title: "Leave a history worth remembering.",
    text: "Create a lasting impact through every job.",
  },
];

export function isPublicWebsitePath(pathname = "/") {
  const cleanPath = normalizePublicPath(pathname);
  return PUBLIC_ROUTES.has(cleanPath);
}

function normalizePublicPath(pathname = "/") {
  const cleanPath = String(pathname || "/").replace(/\/+$/, "") || "/";
  return cleanPath;
}

function normalizePublicLanguage(language = "en") {
  return PUBLIC_LANGUAGES.some((option) => option.code === language)
    ? language
    : "en";
}

function getInitialPublicLanguage() {
  try {
    return normalizePublicLanguage(
      window.localStorage?.getItem(PUBLIC_LANGUAGE_STORAGE_KEY) || "en"
    );
  } catch (error) {
    return "en";
  }
}

function savePublicLanguage(language) {
  try {
    window.localStorage?.setItem(
      PUBLIC_LANGUAGE_STORAGE_KEY,
      normalizePublicLanguage(language)
    );
  } catch (error) {
    // The public page still works when local storage is unavailable.
  }
}

function PublicSite() {
  const path = normalizePublicPath(window.location.pathname);
  const [publicLanguage, setPublicLanguage] = useState(getInitialPublicLanguage);
  const publicCopy = PUBLIC_COPY[publicLanguage] || PUBLIC_COPY.en;

  function updatePublicLanguage(nextLanguage) {
    const normalizedLanguage = normalizePublicLanguage(nextLanguage);
    setPublicLanguage(normalizedLanguage);
    savePublicLanguage(normalizedLanguage);
  }

  if (path === "/privacy") {
    return (
      <PublicDocumentPage
        title={PUBLIC_DOCUMENTS.privacy.title}
        content={PUBLIC_DOCUMENTS.privacy.content}
        copy={publicCopy}
        language={publicLanguage}
        onLanguageChange={updatePublicLanguage}
      />
    );
  }

  if (path === "/terms") {
    return (
      <PublicDocumentPage
        title={PUBLIC_DOCUMENTS.terms.title}
        content={PUBLIC_DOCUMENTS.terms.content}
        copy={publicCopy}
        language={publicLanguage}
        onLanguageChange={updatePublicLanguage}
      />
    );
  }

  if (path === "/contact") {
    return (
      <PublicDocumentPage
        title="Contact Us"
        text="Thank you for your interest in Meetro Community."
        detailText="For general inquiries, partnerships, or questions about Meetro Community, please contact us at:"
        closingText="We're here to help."
        showEmail
        copy={publicCopy}
        language={publicLanguage}
        onLanguageChange={updatePublicLanguage}
      />
    );
  }

  return (
    <PublicLanding
      copy={publicCopy}
      language={publicLanguage}
      onLanguageChange={updatePublicLanguage}
    />
  );
}

function PublicLanding({ copy, language, onLanguageChange }) {
  const [inviteStatus, setInviteStatus] = useState("");

  async function inviteSomeoneToJourney() {
    const shareUrl = getPublicShareUrl();
    const shareData = {
      title: JOURNEY_SHARE_TITLE,
      text: `${copy.hero.headlinePrefix} ${copy.hero.headlineAccent}`,
      url: shareUrl,
    };

    try {
      if (navigator?.share) {
        await navigator.share(shareData);
        setInviteStatus(copy.closing.inviteReady);
        return;
      }

      await copyPublicShareUrl(shareUrl);
      setInviteStatus(copy.closing.inviteCopied);
    } catch (error) {
      if (error?.name === "AbortError") return;

      setInviteStatus(copy.closing.inviteFallback);
    }
  }

  return (
    <main style={page}>
      <style>{publicResponsiveStyles}</style>
      <section className="public-hero-section" style={heroSection}>
        <div style={heroSky} aria-hidden="true" />
        <div style={heroNeighborhood} aria-hidden="true">
          <span style={heroHouseLeft} />
          <span style={heroHouseMiddle} />
          <span style={heroHouseRight} />
          <span style={heroStreet} />
          <span className="public-hero-lamp-post" style={heroLampPost} />
          <span className="public-hero-lamp-glow" style={heroLampGlow} />
        </div>

        <nav className="public-nav" style={nav} aria-label="Meetro Community public site">
          <a href="/" style={brandLink} aria-label="Meetro Community home">
            <span style={wordmark}>meetro</span>
            <span style={communityMark}>Community</span>
          </a>

          <PublicLanguageSwitcher
            language={language}
            onLanguageChange={onLanguageChange}
          />

          <div className="public-nav-links" style={navLinks}>
            {PUBLIC_NAV_LINKS.map((link) => (
              <a key={link.id} href={link.href} style={navLink}>
                {copy.nav[link.id]}
              </a>
            ))}
            <a href="/contact" style={navAction}>
              {copy.hero.primary}
            </a>
          </div>
        </nav>

        <div className="public-hero-content" style={heroContent}>
          <p style={trustBadge}>
            <span style={badgeDot} aria-hidden="true" />
            {copy.hero.badge}
          </p>
          <h1 style={heroTitle}>
            {copy.hero.headlinePrefix}{" "}
            <span style={heroTitleAccent}>{copy.hero.headlineAccent}</span>
          </h1>
          <p style={heroText}>{copy.hero.copy}</p>
          <p style={heroSupportText}>{copy.hero.support}</p>
          <div className="public-hero-actions" style={heroActions}>
            <a href="/contact" style={primaryAction}>
              {copy.hero.primary}
            </a>
            <a href="#journey" style={secondaryAction}>
              {copy.hero.secondary}
            </a>
          </div>
        </div>
      </section>

      <section id="why" style={whySection}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>{copy.why.heading}</h2>
          <span style={sectionRule} aria-hidden="true" />
        </div>

        <div style={whyGrid}>
          <div style={whyStatement}>
            <h3 style={whyStatementTitle}>{copy.why.statement}</h3>
            <p style={whyStatementText}>{copy.why.copy}</p>
          </div>

          <div style={audienceGrid}>
            {copy.audience.map((card) => (
              <article key={card.title} style={audienceCard}>
                <div style={iconCircle}>{card.icon}</div>
                <h3 style={cardTitle}>{card.title}</h3>
                <p style={cardText}>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="journey" style={journeySection}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>{copy.journeyHeading}</h2>
          <span style={sectionRule} aria-hidden="true" />
        </div>

        <div style={journeyGrid}>
          {copy.journeySteps.map(([number, title, text]) => (
            <article key={`${number}-${title}`} style={journeyStep}>
              <div style={journeyIcon}>{number}</div>
              <h3 style={journeyTitle}>{title}</h3>
              <p style={journeyText}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="resources" style={guidanceSection}>
        <div style={lanternPanel} aria-hidden="true">
          <span style={lanternTop} />
          <span style={lanternBody} />
          <span style={lanternFlame} />
          <span style={lanternBase} />
        </div>

        <div style={guidanceHeadlineBlock}>
          <h2 style={guidanceTitle}>
            {copy.guidance.titleTop}
            <br />
            {copy.guidance.titleBottom}
          </h2>
        </div>

        <div style={guidanceCopyBlock}>
          <p style={guidanceText}>{copy.guidance.copy}</p>
          <div style={supportPoints}>
            {copy.guidance.points.map((point) => (
              <span key={point} style={supportPoint}>{point}</span>
            ))}
          </div>
          <p style={guidanceFooter}>{copy.guidance.footer}</p>
          <p style={guidanceSmall}>{copy.guidance.small}</p>
        </div>
      </section>

      <section style={professionalSection}>
        <div style={professionalIntro}>
          <h2 style={professionalTitle}>{copy.outcomesHeading}</h2>
          <span style={sectionRule} aria-hidden="true" />
        </div>

        <div style={outcomeGrid}>
          {copy.outcomes.map(([title, text]) => (
            <article key={title} style={outcomeCard}>
              <div style={smallIconCircle} aria-hidden="true" />
              <h3 style={outcomeTitle}>{title}</h3>
              <p style={outcomeText}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={promiseSection}>
        <p style={promiseText}>{copy.closing.promise}</p>
        <div style={promiseActions}>
          <a href="/contact" style={primaryAction}>
            {copy.hero.primary}
          </a>
          <div style={inviteBlock}>
            <p style={inviteIntro}>{copy.closing.inviteIntro}</p>
            <button
              type="button"
              style={inviteAction}
              onClick={inviteSomeoneToJourney}
            >
              {copy.closing.inviteAction}
            </button>
            {inviteStatus && (
              <p role="status" aria-live="polite" style={inviteStatusText}>
                {inviteStatus}
              </p>
            )}
          </div>
        </div>
      </section>

      <PublicFooter copy={copy} />
    </main>
  );
}

function getPublicShareUrl() {
  const origin = window.location.origin || "https://getmeetro.com";
  return `${origin}/`;
}

async function copyPublicShareUrl(shareUrl) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = shareUrl;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function PublicDocumentPage({
  title,
  text = "",
  content = "",
  detailText = "",
  closingText = "",
  showEmail = false,
  copy = PUBLIC_COPY.en,
  language = "en",
  onLanguageChange = () => {},
}) {
  return (
    <main style={documentPage}>
      <style>{publicResponsiveStyles}</style>
      <nav className="public-nav" style={documentNav} aria-label="Meetro Community public site">
        <a href="/" style={brandLink}>
          <span style={wordmark}>meetro</span>
          <span style={communityMark}>Community</span>
        </a>
        <PublicLanguageSwitcher
          language={language}
          onLanguageChange={onLanguageChange}
        />
        <div className="public-nav-links" style={navLinks}>
          {PUBLIC_LINKS.map((link) => (
            <a key={link.id} href={link.href} style={navLink}>
              {copy.links[link.id]}
            </a>
          ))}
        </div>
      </nav>

      <section style={documentCard}>
        <p style={trustBadge}>
          <span style={badgeDot} aria-hidden="true" />
          {copy.hero.badge}
        </p>
        <h1 style={documentTitle}>{title}</h1>
        {content ? (
          <PublicMarkdownDocument content={content} title={title} />
        ) : (
          <p style={documentText}>{text}</p>
        )}
        {detailText && <p style={documentText}>{detailText}</p>}
        {showEmail && (
          <p style={documentText}>
            <a href="mailto:william@flexlabs.com" style={inlineLink}>
              william@flexlabs.com
            </a>
          </p>
        )}
        <p style={companyLine}>
          Meetro Community is a product of WM FLEX LABS, LLC.
        </p>
        {closingText && <p style={documentText}>{closingText}</p>}
        <p style={companyLine}>
          Developed and published by WM FLEX LABS, LLC.
        </p>
        <a href="/" style={secondaryAction}>
          Back to Meetro Community
        </a>
      </section>

      <PublicFooter copy={copy} />
    </main>
  );
}

function PublicLanguageSwitcher({ language, onLanguageChange }) {
  return (
    <div
      className="public-language-switcher"
      style={languageSwitcher}
      role="group"
      aria-label="Public site language"
    >
      {PUBLIC_LANGUAGES.map((option) => {
        const isActive = option.code === language;

        return (
          <button
            key={option.code}
            type="button"
            style={{
              ...languageButton,
              ...(isActive ? languageButtonActive : null),
            }}
            aria-pressed={isActive}
            onClick={() => onLanguageChange(option.code)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PublicMarkdownDocument({ content, title }) {
  let skippedFirstTitle = false;

  return (
    <div style={documentContent}>
      {content.split("\n").map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`space-${index}`} style={spacer} />;
        }

        if (trimmed.startsWith("# ")) {
          const headingText = trimmed.replace(/^# /, "");

          if (!skippedFirstTitle) {
            skippedFirstTitle = true;
            return null;
          }

          return (
            <h2 key={index} style={documentHeading}>
              {headingText}
            </h2>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={index} style={documentHeading}>
              {trimmed.replace(/^## /, "")}
            </h2>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <p key={index} style={documentListItem}>
              {"\u2022"} {trimmed.replace(/^- /, "")}
            </p>
          );
        }

        return (
          <p key={index} style={documentParagraph}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function PublicFooter({ copy = PUBLIC_COPY.en }) {
  return (
    <footer style={footer}>
      <div style={footerBrandBlock}>
        <a href="/" style={footerBrandLink}>
          <span style={footerWordmark}>meetro</span>
          <span style={footerCommunityMark}>Community</span>
        </a>
        <p style={footerText}>{copy.footer.product}</p>
        <p style={footerText}>{copy.footer.developed}</p>
        <p style={footerText}>
          {copy.footer.contact}
          <br />
          <a href="mailto:william@flexlabs.com" style={footerLink}>
            william@flexlabs.com
          </a>
        </p>
        <p style={copyright}>{"\u00A9"} {copy.footer.copyright}</p>
      </div>

      <div style={footerColumn}>
        <strong style={footerColumnTitle}>{copy.footer.explore}</strong>
        <a href="/#why" style={footerLink}>{copy.nav.why}</a>
        <a href="/#journey" style={footerLink}>{copy.nav.journey}</a>
        <a href="/#resources" style={footerLink}>{copy.nav.resources}</a>
      </div>

      <div style={footerColumn}>
        <strong style={footerColumnTitle}>{copy.footer.legal}</strong>
        {PUBLIC_LINKS.map((link) => (
          <a key={link.id} href={link.href} style={footerLink}>
            {copy.links[link.id]}
          </a>
        ))}
      </div>
    </footer>
  );
}

const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

const serifStack =
  "Georgia, 'Times New Roman', Times, serif";

const publicResponsiveStyles = `
  @media (max-width: 480px) {
    .public-hero-section {
      align-content: start !important;
      min-height: 100svh !important;
      padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .public-nav {
      align-items: flex-start !important;
      gap: 12px !important;
    }

    .public-nav-links {
      gap: 0 !important;
      margin-left: auto !important;
    }

    .public-language-switcher {
      order: 3 !important;
      width: 100% !important;
      justify-content: flex-start !important;
    }

    .public-nav-links a:not(:last-child) {
      display: none !important;
    }

    .public-hero-content {
      margin-left: 0 !important;
      margin-right: auto !important;
      max-width: min(100%, 337px) !important;
      padding-top: clamp(14px, 3.2vh, 22px) !important;
    }

    .public-hero-actions {
      align-items: flex-start !important;
      justify-content: flex-start !important;
      flex-wrap: nowrap !important;
      gap: 8px !important;
      margin-top: 20px !important;
      max-width: 337px !important;
    }

    .public-hero-actions a {
      box-sizing: border-box !important;
      min-height: 48px !important;
      padding-left: 14px !important;
      padding-right: 14px !important;
    }

    .public-hero-lamp-post {
      right: 10px !important;
      top: 48% !important;
      height: 330px !important;
      opacity: 0.58 !important;
    }

    .public-hero-lamp-glow {
      right: -12px !important;
      top: calc(48% - 42px) !important;
      opacity: 0.72 !important;
    }
  }

  @media (max-width: 380px) {
    .public-hero-content {
      padding-top: 0 !important;
    }

    .public-hero-content > p:first-child {
      margin-bottom: 12px !important;
    }

    .public-hero-content > p:nth-of-type(2) {
      margin-top: 16px !important;
    }

    .public-hero-content > p:nth-of-type(3) {
      margin-top: 8px !important;
    }

    .public-hero-actions {
      margin-top: 12px !important;
    }
  }
`;

const page = {
  minHeight: "100vh",
  background: "var(--meetro-color-cream, #fbf6ed)",
  color: "var(--meetro-color-ink, #172317)",
  fontFamily: fontStack,
  overflowX: "hidden",
};

const heroSection = {
  position: "relative",
  minHeight: "min(760px, 100svh)",
  display: "grid",
  alignContent: "space-between",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 22px) clamp(18px, 5vw, 64px) clamp(46px, 7vw, 86px)",
  boxSizing: "border-box",
  overflow: "hidden",
  background:
    "linear-gradient(90deg, rgba(255,253,248,0.98) 0%, rgba(255,253,248,0.9) 38%, rgba(255,253,248,0.28) 62%, rgba(20,53,31,0.16) 100%), radial-gradient(circle at 70% 36%, rgba(183,121,31,0.22), transparent 34%), linear-gradient(135deg, #fff7e8 0%, #fbf6ed 44%, #dfe8d8 100%)",
};

const heroSky = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 48% 42%, rgba(255,229,164,0.42), transparent 30%), radial-gradient(circle at 80% 22%, rgba(31,77,52,0.18), transparent 28%)",
  pointerEvents: "none",
};

const heroNeighborhood = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
};

const heroHouseLeft = {
  position: "absolute",
  right: "30%",
  bottom: "18%",
  width: "190px",
  height: "120px",
  borderRadius: "14px 14px 8px 8px",
  background:
    "linear-gradient(180deg, rgba(31,77,52,0.24), rgba(20,53,31,0.12))",
  boxShadow:
    "32px -34px 0 -12px rgba(20,53,31,0.18), inset 24px 28px 0 -20px rgba(247,186,93,0.5)",
};

const heroHouseMiddle = {
  position: "absolute",
  right: "16%",
  bottom: "23%",
  width: "240px",
  height: "150px",
  borderRadius: "18px 18px 10px 10px",
  background:
    "linear-gradient(180deg, rgba(31,77,52,0.28), rgba(20,53,31,0.16))",
  boxShadow:
    "44px -40px 0 -16px rgba(20,53,31,0.22), inset -38px 42px 0 -32px rgba(247,186,93,0.54)",
};

const heroHouseRight = {
  position: "absolute",
  right: "-4%",
  bottom: "14%",
  width: "300px",
  height: "210px",
  borderRadius: "22px 22px 12px 12px",
  background:
    "linear-gradient(180deg, rgba(20,53,31,0.32), rgba(20,53,31,0.2))",
  boxShadow:
    "-44px -38px 0 -18px rgba(20,53,31,0.18), inset -46px 48px 0 -34px rgba(247,186,93,0.56)",
};

const heroStreet = {
  position: "absolute",
  right: "8%",
  bottom: "-18%",
  width: "46%",
  height: "38%",
  borderRadius: "60% 0 0 0",
  background:
    "linear-gradient(135deg, rgba(255,253,248,0.34), rgba(183,121,31,0.14) 48%, rgba(31,77,52,0.14))",
  transform: "skewX(-12deg)",
};

const heroLampPost = {
  position: "absolute",
  right: "7%",
  top: "17%",
  width: "12px",
  height: "360px",
  borderRadius: "999px",
  background: "linear-gradient(180deg, #0f1c1a, #14351f)",
  boxShadow: "0 0 0 1px rgba(255,253,248,0.16)",
};

const heroLampGlow = {
  position: "absolute",
  right: "4.8%",
  top: "13%",
  width: "70px",
  height: "98px",
  borderRadius: "26px",
  background:
    "radial-gradient(circle at 50% 52%, rgba(255,229,164,0.95), rgba(247,186,93,0.45) 34%, rgba(31,77,52,0.2) 62%, rgba(15,28,26,0.86) 100%)",
  boxShadow: "0 0 72px rgba(247,186,93,0.52)",
};

const nav = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
  flexWrap: "wrap",
};

const documentNav = {
  ...nav,
  padding:
    "calc(env(safe-area-inset-top, 0px) + 22px) clamp(18px, 5vw, 64px) 0",
  boxSizing: "border-box",
};

const brandLink = {
  display: "inline-grid",
  textDecoration: "none",
  color: "var(--meetro-color-forest-deep, #14351f)",
  lineHeight: 0.96,
};

const wordmark = {
  fontSize: "clamp(38px, 7vw, 64px)",
  fontWeight: 950,
  letterSpacing: 0,
};

const communityMark = {
  marginTop: "8px",
  color: "var(--meetro-color-wood, #b7791f)",
  fontSize: "clamp(15px, 2.8vw, 24px)",
  fontWeight: 950,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
};

const navLinks = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: "10px 20px",
};

const languageSwitcher = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "6px",
  padding: "5px",
  borderRadius: "999px",
  background: "rgba(255,253,248,0.62)",
  border: "1px solid rgba(74,52,40,0.16)",
  backdropFilter: "blur(14px)",
};

const languageButton = {
  minHeight: "32px",
  padding: "0 10px",
  border: "1px solid transparent",
  borderRadius: "999px",
  background: "transparent",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: fontStack,
  fontSize: "12px",
  fontWeight: 900,
  lineHeight: 1,
  cursor: "pointer",
};

const languageButtonActive = {
  background: "var(--meetro-color-forest-deep, #14351f)",
  color: "var(--meetro-color-paper, #fffdf8)",
  borderColor: "rgba(20,53,31,0.18)",
  boxShadow: "0 8px 18px rgba(20,53,31,0.16)",
};

const navLink = {
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "14px",
  fontWeight: 850,
  textDecoration: "none",
};

const navAction = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "0 18px",
  borderRadius: "999px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "var(--meetro-color-paper, #fffdf8)",
  fontSize: "14px",
  fontWeight: 950,
  textDecoration: "none",
  boxShadow: "0 14px 30px rgba(20,53,31,0.2)",
};

const heroContent = {
  position: "relative",
  zIndex: 2,
  width: "min(100%, 650px)",
  maxWidth: "1180px",
  margin: "0 auto",
  paddingTop: "clamp(76px, 13vh, 126px)",
};

const trustBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  margin: "0 0 20px",
  padding: "9px 14px",
  border: "1px solid rgba(74,52,40,0.18)",
  borderRadius: "999px",
  background: "rgba(255,253,248,0.72)",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "14px",
  fontWeight: 850,
  backdropFilter: "blur(14px)",
};

const badgeDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: "var(--meetro-color-forest, #1f4d34)",
};

const heroTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(48px, 8vw, 82px)",
  lineHeight: 0.98,
  fontWeight: 800,
};

const heroTitleAccent = {
  color: "var(--meetro-color-wood, #b7791f)",
};

const heroText = {
  margin: "24px 0 0",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "clamp(17px, 2.2vw, 21px)",
  lineHeight: 1.55,
  fontWeight: 650,
  maxWidth: "560px",
};

const heroSupportText = {
  margin: "14px 0 0",
  color: "rgba(23,35,23,0.78)",
  fontSize: "clamp(15px, 1.8vw, 18px)",
  lineHeight: 1.58,
  fontWeight: 620,
  maxWidth: "590px",
};

const heroActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "14px",
  marginTop: "30px",
};

const primaryAction = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "50px",
  padding: "0 22px",
  borderRadius: "12px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "var(--meetro-color-paper, #fffdf8)",
  fontSize: "15px",
  fontWeight: 950,
  textDecoration: "none",
  boxShadow: "0 16px 34px rgba(20,53,31,0.22)",
};

const secondaryAction = {
  ...primaryAction,
  background: "rgba(255,253,248,0.72)",
  color: "var(--meetro-color-forest-deep, #14351f)",
  border: "1px solid rgba(20,53,31,0.34)",
  boxShadow: "none",
};

const sectionBase = {
  width: "min(100% - 36px, 1120px)",
  margin: "0 auto",
};

const whySection = {
  ...sectionBase,
  padding: "clamp(42px, 7vw, 76px) 0 28px",
};

const sectionHeader = {
  textAlign: "center",
  marginBottom: "30px",
};

const sectionTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(30px, 5vw, 42px)",
  lineHeight: 1.08,
  fontWeight: 800,
};

const sectionRule = {
  display: "inline-block",
  width: "46px",
  height: "2px",
  marginTop: "14px",
  background: "var(--meetro-color-wood, #b7791f)",
};

const whyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: "clamp(24px, 5vw, 52px)",
  alignItems: "center",
};

const whyStatement = {
  borderRight: "1px solid rgba(74,52,40,0.14)",
  paddingRight: "clamp(18px, 4vw, 42px)",
};

const whyStatementTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(25px, 4vw, 35px)",
  lineHeight: 1.12,
  fontWeight: 800,
};

const whyStatementText = {
  margin: "22px 0 0",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "17px",
  lineHeight: 1.65,
  fontWeight: 620,
};

const audienceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "18px",
};

const audienceCard = {
  textAlign: "center",
  padding: "8px 16px 16px",
  borderLeft: "1px solid rgba(74,52,40,0.12)",
};

const iconCircle = {
  width: "74px",
  height: "74px",
  margin: "0 auto 12px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "rgba(238,244,234,0.86)",
  color: "var(--meetro-color-forest-deep, #14351f)",
  border: "1px solid rgba(74,52,40,0.12)",
  fontSize: "13px",
  fontWeight: 950,
};

const cardTitle = {
  margin: "0 0 8px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "21px",
  lineHeight: 1.15,
};

const cardText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "15px",
  lineHeight: 1.5,
  fontWeight: 600,
};

const journeySection = {
  ...sectionBase,
  padding: "28px 0",
  borderTop: "1px solid rgba(74,52,40,0.12)",
};

const journeyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
  gap: "18px",
};

const journeyStep = {
  textAlign: "center",
};

const journeyIcon = {
  width: "68px",
  height: "68px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  margin: "0 auto 8px",
  background: "rgba(238,244,234,0.86)",
  border: "1px solid rgba(74,52,40,0.12)",
  color: "var(--meetro-color-wood, #b7791f)",
  fontFamily: serifStack,
  fontSize: "24px",
  fontWeight: 800,
};

const journeyTitle = {
  margin: "0 0 4px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "15px",
  lineHeight: 1.2,
  fontWeight: 900,
};

const journeyText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 600,
};

const guidanceSection = {
  ...sectionBase,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: "clamp(20px, 4vw, 42px)",
  alignItems: "center",
  marginTop: "28px",
  padding: "28px clamp(20px, 4vw, 40px)",
  borderRadius: "18px",
  background:
    "radial-gradient(circle at 18% 48%, rgba(247,186,93,0.32), transparent 25%), linear-gradient(135deg, #0f1c1a, #14351f 58%, #1f4d34)",
  color: "var(--meetro-color-paper, #fffdf8)",
  boxShadow: "0 22px 62px rgba(20,53,31,0.18)",
};

const lanternPanel = {
  position: "relative",
  minHeight: "190px",
  borderRadius: "16px",
  background:
    "radial-gradient(circle at 50% 58%, rgba(247,186,93,0.46), transparent 32%), rgba(255,253,248,0.06)",
  overflow: "hidden",
};

const lanternTop = {
  position: "absolute",
  left: "50%",
  top: "32px",
  width: "64px",
  height: "20px",
  transform: "translateX(-50%)",
  borderRadius: "999px 999px 4px 4px",
  background: "#0f1c1a",
};

const lanternBody = {
  position: "absolute",
  left: "50%",
  top: "54px",
  width: "86px",
  height: "94px",
  transform: "translateX(-50%)",
  border: "3px solid #0f1c1a",
  borderRadius: "18px",
  background: "rgba(255,229,164,0.13)",
  boxShadow: "0 0 50px rgba(247,186,93,0.42)",
};

const lanternFlame = {
  position: "absolute",
  left: "50%",
  top: "88px",
  width: "26px",
  height: "42px",
  transform: "translateX(-50%)",
  borderRadius: "60% 60% 55% 55%",
  background:
    "radial-gradient(circle at 50% 70%, #fffdf8, #f7ba5d 44%, #b7791f 100%)",
  boxShadow: "0 0 38px rgba(247,186,93,0.78)",
};

const lanternBase = {
  position: "absolute",
  left: "50%",
  top: "148px",
  width: "74px",
  height: "14px",
  transform: "translateX(-50%)",
  borderRadius: "4px 4px 999px 999px",
  background: "#0f1c1a",
};

const guidanceHeadlineBlock = {
  borderRight: "1px solid rgba(255,253,248,0.28)",
  paddingRight: "clamp(14px, 3vw, 32px)",
};

const guidanceCopyBlock = {
  minWidth: 0,
};

const guidanceTitle = {
  margin: 0,
  color: "var(--meetro-color-paper, #fffdf8)",
  fontFamily: serifStack,
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.14,
  fontWeight: 800,
};

const guidanceText = {
  margin: 0,
  color: "rgba(255,253,248,0.94)",
  fontSize: "17px",
  lineHeight: 1.58,
  fontWeight: 650,
};

const supportPoints = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 16px",
  marginTop: "22px",
};

const supportPoint = {
  color: "rgba(255,253,248,0.92)",
  fontSize: "14px",
  fontWeight: 850,
};

const guidanceFooter = {
  margin: "24px 0 0",
  color: "#f7ba5d",
  fontSize: "16px",
  fontWeight: 900,
  letterSpacing: "0.04em",
};

const guidanceSmall = {
  margin: "8px 0 0",
  color: "rgba(255,253,248,0.76)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 700,
};

const professionalSection = {
  ...sectionBase,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "22px",
  alignItems: "stretch",
  marginTop: "22px",
  padding: "24px clamp(18px, 4vw, 32px)",
  borderRadius: "18px",
  background: "rgba(255,253,248,0.82)",
  border: "1px solid rgba(74,52,40,0.08)",
  boxShadow: "0 18px 48px rgba(49,35,20,0.08)",
};

const professionalIntro = {
  alignSelf: "center",
};

const professionalTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(26px, 4vw, 34px)",
  lineHeight: 1.12,
  fontWeight: 800,
};

const outcomeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "14px",
};

const outcomeCard = {
  textAlign: "center",
  padding: "8px 10px",
  borderLeft: "1px solid rgba(74,52,40,0.10)",
};

const smallIconCircle = {
  width: "42px",
  height: "42px",
  margin: "0 auto 10px",
  borderRadius: "999px",
  background: "rgba(238,244,234,0.9)",
  border: "1px solid rgba(31,77,52,0.16)",
};

const outcomeTitle = {
  margin: "0 0 6px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "14px",
  lineHeight: 1.25,
  fontWeight: 950,
};

const outcomeText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "12px",
  lineHeight: 1.4,
  fontWeight: 620,
};

const promiseSection = {
  ...sectionBase,
  padding: "34px 0 42px",
  textAlign: "center",
};

const promiseText = {
  margin: "0 auto",
  maxWidth: "760px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(25px, 4vw, 38px)",
  lineHeight: 1.18,
  fontWeight: 800,
};

const promiseActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "18px",
  marginTop: "26px",
};

const inviteBlock = {
  display: "grid",
  justifyItems: "center",
  gap: "8px",
};

const inviteIntro = {
  margin: 0,
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: 750,
};

const inviteAction = {
  ...secondaryAction,
  fontFamily: fontStack,
  cursor: "pointer",
};

const inviteStatusText = {
  margin: 0,
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "13px",
  lineHeight: 1.3,
  fontWeight: 800,
};

const documentPage = {
  minHeight: "100vh",
  background: "var(--meetro-color-cream, #fbf6ed)",
  color: "var(--meetro-color-ink, #172317)",
  fontFamily: fontStack,
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
};

const documentCard = {
  width: "min(100% - 36px, 760px)",
  margin: "clamp(64px, 14vh, 120px) auto",
  border: "1px solid rgba(74,52,40,0.12)",
  borderRadius: "24px",
  padding: "clamp(24px, 5vw, 42px)",
  boxSizing: "border-box",
  background: "rgba(255,253,248,0.88)",
  boxShadow: "0 20px 56px rgba(49,35,20,0.08)",
};

const documentTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(36px, 8vw, 68px)",
  lineHeight: 1,
  fontWeight: 800,
};

const documentText = {
  margin: "18px 0 0",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "18px",
  lineHeight: 1.58,
  fontWeight: 650,
};

const documentContent = {
  marginTop: "22px",
};

const spacer = {
  height: "10px",
};

const documentHeading = {
  margin: "24px 0 10px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(22px, 4vw, 30px)",
  lineHeight: 1.18,
  fontWeight: 800,
};

const documentParagraph = {
  margin: "0 0 12px",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "16px",
  lineHeight: 1.62,
  fontWeight: 600,
};

const documentListItem = {
  ...documentParagraph,
  paddingLeft: "10px",
};

const companyLine = {
  margin: "18px 0 0",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "15px",
  lineHeight: 1.5,
  fontWeight: 850,
};

const inlineLink = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: 850,
  textDecoration: "none",
};

const footer = {
  borderTop: "1px solid rgba(255,253,248,0.16)",
  background:
    "linear-gradient(135deg, var(--meetro-color-forest-deep, #14351f), var(--meetro-color-forest, #1f4d34))",
  width: "100%",
  padding:
    "30px clamp(18px, 5vw, 64px) calc(34px + env(safe-area-inset-bottom, 0px))",
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
  gap: "24px",
};

const footerBrandBlock = {
  maxWidth: "360px",
};

const footerBrandLink = {
  display: "inline-grid",
  color: "var(--meetro-color-paper, #fffdf8)",
  textDecoration: "none",
  lineHeight: 0.96,
};

const footerWordmark = {
  fontSize: "34px",
  fontWeight: 950,
};

const footerCommunityMark = {
  marginTop: "6px",
  color: "#f7ba5d",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
};

const footerText = {
  margin: "7px 0",
  color: "rgba(255,253,248,0.82)",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const footerColumn = {
  display: "grid",
  alignContent: "start",
  gap: "8px",
};

const footerColumnTitle = {
  color: "#f7ba5d",
  fontSize: "14px",
  fontWeight: 950,
};

const footerLink = {
  color: "rgba(255,253,248,0.88)",
  fontSize: "14px",
  fontWeight: 800,
  textDecoration: "none",
};

const copyright = {
  margin: "14px 0 0",
  color: "rgba(255,253,248,0.66)",
  fontSize: "12px",
  fontWeight: 700,
};

export default PublicSite;
