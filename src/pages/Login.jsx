import { useState } from "react";
import API_URL from "../api";
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  getLanguageLabel,
  normalizeLanguage,
  setLanguage,
  t,
} from "../utils/language";
import {
  hasBusinessProfileOwnership,
  saveMeetroSession,
  getPostLoginPage,
  isProfessionalUser,
} from "../utils/session";
import { buildPasswordResetRequest } from "../utils/passwordReset";
import {
  TWO_FACTOR_FAILURE,
  buildTwoFactorPayload,
  verifyTwoFactorCode,
} from "../utils/twoFactorVerification";
import { getAccountConnectionStateFromLoginData } from "../utils/accountConnection";
import { getProfessionalSignupCategoriesFromTaxonomy } from "../utils/communityTaxonomy";
import MeetroIcon from "../components/MeetroIcon";

function Login({ setPage }) {
  const [mode, setMode] = useState(
    localStorage.getItem("meetroLoginMode") || "login"
  );
  const [language, updateLanguage] = useState(getLanguage() || "en");
  const [accountType, setAccountType] = useState("homeowner");
  const [professionalCategory, setProfessionalCategory] = useState("contractor");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);

  const text = {
    en: {
      login: "Sign in",
      signup: "Sign Up",
      getStarted: "Join Meetro Community",
      continueAction: "Continue",
      welcomeTagline: "Continue the work that matters, with the people who matter.",
      welcomeBack: "The work continues here.",
      createYourAccount: "Start your journey",
      startHelper: "Continue where you left off.",
      arrivalSupport: "Built around relationships. Designed for communities.",
      supportHeading: "Built around relationships. Designed for communities.",
      supportBody:
        "Meetro Community brings residents, professionals, businesses, and organizations together through trusted relationships.",
      chooseAccountType: "Choose Account Type",
      homeowner: "User Account",
      homeownerDescription:
        "Find trusted local professionals, request quotes, and manage projects.",
      professional: "Professional",
      professionalDescription:
        "Offer services, receive quote requests, manage jobs, and grow your local business.",
      yourName: "Your Name",
      businessName: "Business Name",
      searchServiceCategory: "Search service category",
      email: "Email",
      password: "Password",
      createAccount: "Create User Account",
      pleaseWait: "Please wait...",
      securityVerification: "Security Verification",
      enterVerificationCode:
        "Enter the 6-digit verification code sent to your account.",
      meetroSecurityText: "Your login is protected with Meetro Security.",
      codeSentTo: "Code sent to",
      verifyCode: "Verify Code",
      back: "Back",
      faceIdComingSoon: "Face ID and Touch ID support coming soon.",
      invalidCode: "Invalid code",
      codeExpired: "Code expired. Please request a new code.",
      verificationTimedOut: "Verification timed out. Please request a new code.",
      tooManyAttempts: "Too many attempts. Please wait before trying again.",
      sessionExpired: "Session expired. Please sign in again.",
      networkProblem: "Network problem. Check your connection and try again.",
      verificationUnavailable:
        "Verification service unavailable. Please try again shortly.",
      enterSixDigitCode: "Enter the 6-digit code.",
      loginExpired: "Login expired",
      serverError: "Server error",
      enterEmailPassword: "Enter email and password",
      loginFailed: "Login failed",
      acceptTermsRequired:
        "Please agree to the Terms of Use and Privacy Policy to create your account.",
    },
    es: {
      login: "Inicia sesión",
      signup: "Crear cuenta",
      getStarted: "Únete a Meetro Community",
      continueAction: "Continuar",
      welcomeTagline: "Continúa el trabajo que importa, con las personas que importan.",
      welcomeBack: "El trabajo continúa aquí.",
      createYourAccount: "Comienza tu camino",
      startHelper: "Continúa donde te quedaste.",
      arrivalSupport: "Creado alrededor de relaciones. Diseñado para comunidades.",
      supportHeading: "Creado alrededor de relaciones. Diseñado para comunidades.",
      supportBody:
        "Meetro Community reúne a residentes, profesionales, negocios y organizaciones a través de relaciones de confianza.",
      chooseAccountType: "Elige el tipo de cuenta",
      homeowner: "Cuenta de usuario",
      homeownerDescription:
        "Encuentra profesionales locales, pide cotizaciones y administra proyectos.",
      professional: "Profesional",
      professionalDescription:
        "Ofrece servicios, recibe solicitudes, administra trabajos y haz crecer tu negocio local.",
      yourName: "Tu nombre",
      businessName: "Nombre del negocio",
      searchServiceCategory: "Buscar categoría de servicio",
      email: "Correo electrónico",
      password: "Contraseña",
      createAccount: "Crear cuenta de usuario",
      pleaseWait: "Por favor espera...",
      securityVerification: "Verificación de seguridad",
      enterVerificationCode:
        "Ingresa el código de 6 dígitos enviado a tu cuenta.",
      meetroSecurityText:
        "Tu inicio de sesión está protegido con Meetro Security.",
      codeSentTo: "Código enviado a",
      verifyCode: "Verificar código",
      back: "Volver",
      faceIdComingSoon: "Face ID y Touch ID próximamente.",
      invalidCode: "Código inválido",
      codeExpired: "El código expiró. Solicita un código nuevo.",
      verificationTimedOut:
        "La verificación tardó demasiado. Solicita un código nuevo.",
      tooManyAttempts:
        "Demasiados intentos. Espera antes de intentarlo otra vez.",
      sessionExpired: "La sesión expiró. Inicia sesión otra vez.",
      networkProblem: "Problema de red. Revisa tu conexión e inténtalo otra vez.",
      verificationUnavailable:
        "El servicio de verificación no está disponible. Inténtalo de nuevo pronto.",
      enterSixDigitCode: "Ingresa el código de 6 dígitos.",
      loginExpired: "Sesión expirada",
      serverError: "Error del servidor",
      enterEmailPassword: "Ingresa correo y contraseña",
      loginFailed: "Error al iniciar sesión",
      acceptTermsRequired:
        "Acepta los Términos de Uso y la Política de Privacidad para crear tu cuenta.",
    },
    fr: {
      login: "Se connecter",
      signup: "Créer un compte",
      getStarted: "Rejoindre Meetro Community",
      continueAction: "Continuer",
      welcomeTagline: "Continuez le travail qui compte, avec les personnes qui comptent.",
      welcomeBack: "Le travail continue ici.",
      createYourAccount: "Commencez votre parcours",
      startHelper: "Reprenez là où vous vous étiez arrêté.",
      arrivalSupport:
        "Construit autour des relations. Conçu pour les communautés.",
      supportHeading:
        "Construit autour des relations. Conçu pour les communautés.",
      supportBody:
        "Meetro Community réunit les résidents, les professionnels, les entreprises et les organisations grâce à des relations de confiance.",
      chooseAccountType: "Choisissez le type de compte",
      homeowner: "Compte utilisateur",
      homeownerDescription:
        "Trouvez des professionnels locaux, demandez des devis et gérez vos projets.",
      professional: "Professionnel",
      professionalDescription:
        "Offrez vos services, recevez des demandes, gérez les travaux et développez votre activité locale.",
      yourName: "Votre nom",
      businessName: "Nom de l’entreprise",
      searchServiceCategory: "Rechercher une catégorie de service",
      email: "E-mail",
      password: "Mot de passe",
      createAccount: "Créer le compte",
      pleaseWait: "Veuillez patienter...",
      securityVerification: "Vérification de sécurité",
      enterVerificationCode:
        "Entrez le code à 6 chiffres envoyé à votre compte.",
      meetroSecurityText: "Votre connexion est protégée par Meetro Security.",
      codeSentTo: "Code envoyé à",
      verifyCode: "Vérifier le code",
      back: "Retour",
      faceIdComingSoon: "Face ID et Touch ID seront bientôt disponibles.",
      invalidCode: "Code invalide",
      codeExpired: "Le code a expiré. Demandez un nouveau code.",
      verificationTimedOut:
        "La vérification a expiré. Demandez un nouveau code.",
      tooManyAttempts:
        "Trop de tentatives. Veuillez patienter avant de réessayer.",
      sessionExpired: "La session a expiré. Connectez-vous à nouveau.",
      networkProblem: "Problème de réseau. Vérifiez votre connexion et réessayez.",
      verificationUnavailable:
        "Le service de vérification est indisponible. Réessayez bientôt.",
      enterSixDigitCode: "Entrez le code à 6 chiffres.",
      loginExpired: "Connexion expirée",
      serverError: "Erreur du serveur",
      enterEmailPassword: "Entrez l’e-mail et le mot de passe",
      loginFailed: "Échec de la connexion",
      acceptTermsRequired:
        "Veuillez accepter les Conditions d’utilisation et la Politique de confidentialité pour créer votre compte.",
    },
    "pt-BR": {
      login: "Entrar",
      signup: "Criar conta",
      getStarted: "Junte-se ao Meetro Community",
      continueAction: "Continuar",
      welcomeTagline: "Continue o trabalho que importa, com as pessoas que importam.",
      welcomeBack: "O trabalho continua aqui.",
      createYourAccount: "Comece sua jornada",
      startHelper: "Continue de onde parou.",
      arrivalSupport:
        "Criado em torno de relações. Projetado para comunidades.",
      supportHeading: "Criado em torno de relações. Projetado para comunidades.",
      supportBody:
        "Meetro Community reúne moradores, profissionais, empresas e organizações por meio de relações de confiança.",
      chooseAccountType: "Escolha o tipo de conta",
      homeowner: "Conta de usuário",
      homeownerDescription:
        "Encontre profissionais locais, peça orçamentos e acompanhe projetos.",
      professional: "Profissional",
      professionalDescription:
        "Ofereça serviços, receba solicitações, gerencie trabalhos e desenvolva seu negócio local.",
      yourName: "Seu nome",
      businessName: "Nome do negócio",
      searchServiceCategory: "Buscar categoria de serviço",
      email: "E-mail",
      password: "Senha",
      createAccount: "Criar conta",
      pleaseWait: "Aguarde...",
      securityVerification: "Verificação de segurança",
      enterVerificationCode:
        "Digite o código de 6 dígitos enviado para sua conta.",
      meetroSecurityText: "Seu login é protegido pelo Meetro Security.",
      codeSentTo: "Código enviado para",
      verifyCode: "Verificar código",
      back: "Voltar",
      faceIdComingSoon: "Face ID e Touch ID em breve.",
      invalidCode: "Código inválido",
      codeExpired: "O código expirou. Solicite um novo código.",
      verificationTimedOut:
        "A verificação expirou. Solicite um novo código.",
      tooManyAttempts:
        "Muitas tentativas. Aguarde antes de tentar novamente.",
      sessionExpired: "A sessão expirou. Entre novamente.",
      networkProblem: "Problema de rede. Verifique sua conexão e tente novamente.",
      verificationUnavailable:
        "O serviço de verificação está indisponível. Tente novamente em breve.",
      enterSixDigitCode: "Digite o código de 6 dígitos.",
      loginExpired: "Login expirado",
      serverError: "Erro do servidor",
      enterEmailPassword: "Digite e-mail e senha",
      loginFailed: "Falha ao entrar",
      acceptTermsRequired:
        "Aceite os Termos de Uso e a Política de Privacidade para criar sua conta.",
    },
  };

  const normalizedLanguage = normalizeLanguage(language);
  const T = text[normalizedLanguage] || text.en;

  function getVerificationFailureMessage(failure) {
    const messages = {
      [TWO_FACTOR_FAILURE.INVALID_CODE]: T.invalidCode,
      [TWO_FACTOR_FAILURE.CODE_EXPIRED]: T.codeExpired,
      [TWO_FACTOR_FAILURE.VERIFICATION_TIMED_OUT]: T.verificationTimedOut,
      [TWO_FACTOR_FAILURE.TOO_MANY_ATTEMPTS]: T.tooManyAttempts,
      [TWO_FACTOR_FAILURE.SESSION_EXPIRED]: T.sessionExpired,
      [TWO_FACTOR_FAILURE.NETWORK_PROBLEM]: T.networkProblem,
      [TWO_FACTOR_FAILURE.SERVICE_UNAVAILABLE]: T.verificationUnavailable,
    };

    return messages[failure] || T.verificationUnavailable;
  }

  function createTwoFactorSession(data = {}) {
    const payload = buildTwoFactorPayload({
      email: email.trim(),
      pendingData: data,
      session: data,
    });

    return {
      email: payload.email || email.trim(),
      verificationSessionId: payload.verificationSessionId,
      verification_session_id: payload.verification_session_id,
      challengeId: payload.challengeId,
      challenge_id: payload.challenge_id,
      verificationToken: payload.verificationToken,
      verification_token: payload.verification_token,
      createdAt: new Date().toISOString(),
    };
  }

  function readPendingLoginData() {
    try {
      return JSON.parse(localStorage.getItem("pendingLoginData") || "null");
    } catch {
      return null;
    }
  }

  function readPendingTwoFactorSession() {
    try {
      return JSON.parse(localStorage.getItem("pendingTwoFactorSession") || "{}");
    } catch {
      return {};
    }
  }

  const professionalCategories = getProfessionalSignupCategoriesFromTaxonomy({
    translate: (key, fallback) => {
      const translated = t(key, normalizedLanguage);
      return translated === key ? fallback : translated;
    },
  });

  const normalizedCategorySearch = categorySearch.trim().toLowerCase();
  const filteredProfessionalCategories = professionalCategories.filter((item) =>
    [
      item.label,
      item.value,
      item.labelKey,
      item.taxonomyEcosystemId,
      item.capabilityGroupId,
      ...(Array.isArray(item.aliases) ? item.aliases : []),
    ].some((field) =>
      String(field || "").toLowerCase().includes(normalizedCategorySearch)
    )
  );
  const hasCategorySearch = categorySearch.trim().length > 0;

  function selectProfessionalCategory(value) {
    setProfessionalCategory(value);
    setCategorySearch("");
  }

  function changeLanguage(value) {
    const nextLanguage = normalizeLanguage(value);
    setLanguage(nextLanguage);
    updateLanguage(nextLanguage);
    localStorage.setItem("meetroLanguage", nextLanguage);
  }

  function openLegalDocument(documentId) {
    localStorage.setItem("meetroSelectedLegalDocument", documentId);
    localStorage.setItem("meetroLegalReturnPage", "login");
    localStorage.setItem("meetroLoginMode", mode);
    setPage("legal");
  }

  function openPasswordReset() {
    setResetEmail(email.trim());
    setResetError("");
    setResetConfirmation("");
    localStorage.setItem("meetroLoginMode", "reset");
    setMode("reset");
  }

  function returnToLogin() {
    setResetError("");
    setResetConfirmation("");
    localStorage.setItem("meetroLoginMode", "login");
    setMode("login");
  }

  function handlePasswordReset() {
    const result = buildPasswordResetRequest(resetEmail);

    setResetConfirmation("");

    if (!result.ok) {
      setResetError(
        result.errorCode === "email_required"
          ? t("resetEmailRequired", normalizedLanguage)
          : t("resetEmailInvalid", normalizedLanguage)
      );
      return;
    }

    setResetError("");
    setEmail(result.email);
    setResetConfirmation(t("resetPasswordConfirmation", normalizedLanguage));
  }

  function checkIsProfessional(user = {}) {
    return isProfessionalUser(user) || hasBusinessProfileOwnership(user);
  }

  async function enterQAMobileWorkflowState() {
    if (!import.meta.env.DEV) return;

    const { seedQAMobileWorkflowState } = await import(
      "../utils/qaMobileWorkflowSeed"
    );
    const result = seedQAMobileWorkflowState();

    if (!result.ok) {
      alert("QA seed unavailable.");
      return;
    }

    setPage(result.page);
  }

  function saveUserData(data) {
    const result = saveMeetroSession(data, email.trim());
    const user = data?.user || {};

    if (user.profile_photo_url) {
      localStorage.setItem(
        "meetroPersonalProfilePhoto",
        user.profile_photo_url
      );
    }

    return result;
  }

  function persistHomeownerMobileNumber() {
    if (accountType === "professional") return;

    const nextPhone = mobileNumber.trim();
    const nextName = name.trim();
    const nextEmail = email.trim();
    const scopedKeys = [nextName, nextEmail]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    if (!nextPhone) return;

    localStorage.setItem("meetroHomeownerPrivatePhone", nextPhone);
    localStorage.setItem("homeownerPrivatePhone", nextPhone);
    scopedKeys.forEach((key) => {
      localStorage.setItem(`meetroHomeownerPrivatePhone:${key}`, nextPhone);
    });
    localStorage.setItem("meetroHomeownerPrivatePhoneOwnerName", nextName);
    localStorage.setItem("meetroHomeownerPrivatePhoneOwnerEmail", nextEmail);
  }

  function clearNewHomeownerRelationshipState() {
    if (accountType === "professional") return;

    [
      "activeConversationId",
      "activeConversationName",
      "conversationBusinessName",
      "conversationReturnPage",
      "directRequestConversationId",
      "directRequestId",
      "directRequestMode",
      "directRequestProfessionalCategory",
      "directRequestProfessionalConversationId",
      "directRequestProfessionalName",
      "directRequestSource",
      "homeownerRequests",
      "completedProjects",
      "requestProfessionalContext",
      "selectedConversation",
      "selectedHomeownerRequest",
      "selectedHomeownerRequestId",
      "selectedProfessionalCategory",
      "selectedProfessionalId",
      "selectedProfessionalName",
      "selectedQuoteRequest",
      "selectedQuoteRequestId",
    ].forEach((key) => localStorage.removeItem(key));
  }

  function routeUser(data, sessionResult = {}) {
    const user = data.user || {};
    const page =
      sessionResult.isProfessional || checkIsProfessional(user)
        ? "businessDashboard"
        : getPostLoginPage(user);

    setPage(page);
  }

  async function handleSubmit() {
    try {
      if (!email.trim() || !password.trim()) {
        alert(T.enterEmailPassword);
        return;
      }

      if (mode === "signup" && !legalAccepted) {
        alert(T.acceptTermsRequired);
        return;
      }

      setLoading(true);

      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";

      const body =
        mode === "login"
          ? {
              email: email.trim(),
              password,
            }
          : {
              username: name.trim() || email.trim(),
              name: name.trim(),
              email: email.trim(),
              password,
              mobile_number:
                accountType === "professional" ? "" : mobileNumber.trim(),
              role:
                accountType === "professional"
                  ? professionalCategory
                  : "homeowner",
              account_type: accountType,
              business_name:
                accountType === "professional" ? businessName.trim() : "",
              business_category:
                accountType === "professional" ? professionalCategory : "",
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.message || T.loginFailed);
        return;
      }

      localStorage.setItem("pendingLoginData", JSON.stringify(data));
      localStorage.setItem(
        "pendingTwoFactorSession",
        JSON.stringify(createTwoFactorSession(data))
      );
      setVerificationError("");
      setTwoFactorCode("");

      if (mode === "signup") {
        localStorage.setItem("firstLogin", "true");
      }

      setTwoFactorStep(true);
    } catch (error) {
      console.error(error);
      alert(T.serverError);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(codeOverride) {
    if (verificationLoading) return;

    try {
      const codeToCheck = String(
        typeof codeOverride === "string" ? codeOverride : twoFactorCode
      ).trim();

      if (!/^\d{6}$/.test(codeToCheck)) {
        setVerificationError(T.enterSixDigitCode);
        return;
      }

      const pendingData = readPendingLoginData();

      if (!pendingData) {
        setVerificationError(T.sessionExpired);
        return;
      }

      setVerificationLoading(true);
      setVerificationError("");

      const result = await verifyTwoFactorCode({
        apiUrl: API_URL,
        code: codeToCheck,
        email: email.trim(),
        pendingData,
        session: readPendingTwoFactorSession(),
      });

      if (!result.ok) {
        setVerificationError(getVerificationFailureMessage(result.failure));
        return;
      }

      const verificationData = result.data || {};
      const verifiedLoginData =
        verificationData.user || verificationData.token
          ? {
              ...pendingData,
              ...verificationData,
              user: verificationData.user || pendingData.user,
              token: verificationData.token || pendingData.token,
            }
          : pendingData;
      const accountConnection =
        getAccountConnectionStateFromLoginData(verifiedLoginData, email.trim());

      if (!accountConnection.connected) {
        setVerificationError(accountConnection.message);
        return;
      }

      const isFirstLogin = localStorage.getItem("firstLogin") === "true";
      const sessionResult = saveUserData(verifiedLoginData);

      if (isFirstLogin) {
        clearNewHomeownerRelationshipState();
      }

      persistHomeownerMobileNumber();
      localStorage.removeItem("pendingLoginData");
      localStorage.removeItem("pendingTwoFactorSession");
      setTwoFactorStep(false);
      setTwoFactorCode("");
      setVerificationError("");

      if (isFirstLogin) {
        setPage("welcome");
        return;
      }

      routeUser(verifiedLoginData, sessionResult);
    } catch (error) {
      console.error(error);
      setVerificationError(T.verificationUnavailable);
    } finally {
      setVerificationLoading(false);
    }
  }

  if (twoFactorStep) {
    const codeDigits = twoFactorCode.padEnd(6, " ").split("");
    const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, "$1***$3");

    return (
      <div className="meetro-visual-page" style={pageWrapper}>
        <div style={heroCard}>
          <div style={heroBubble}></div>
          <div style={logoCircle}></div>
          <h1 style={securityTitle}>{T.securityVerification}</h1>
          <p style={heroSubtitle}>{T.enterVerificationCode}</p>
          <p style={securityText}> {T.meetroSecurityText}</p>
        </div>

        <div style={cardStyle}>
          <div style={sentCodeBox}>
            <div>{T.codeSentTo}</div>
            <div style={maskedEmailStyle}>{maskedEmail}</div>
          </div>

          <input
            id="twoFactorHiddenInput"
            value={twoFactorCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setTwoFactorCode(value);

              if (value.length === 6) {
                setTimeout(() => {
                  handleVerifyCode(value);
                }, 250);
              }
            }}
            maxLength={6}
            autoFocus
            inputMode="numeric"
            style={hiddenInput}
          />

          <div
            onClick={() =>
              document.getElementById("twoFactorHiddenInput")?.focus()
            }
            style={codeBoxRow}
          >
            {codeDigits.map((digit, index) => (
              <div
                key={index}
                style={{
                  ...codeBox,
                  borderColor:
                    index === twoFactorCode.length
                      ? "var(--meetro-color-forest, #1f4d34)"
                      : "rgba(78,68,55,0.16)",
                  transform:
                    index === twoFactorCode.length ? "scale(1.04)" : "scale(1)",
                  boxShadow:
                    index === twoFactorCode.length
                      ? "0 0 0 4px rgba(31,77,52,0.12)"
                      : "0 4px 12px rgba(49,35,20,0.06)",
                }}
              >
                {digit.trim()}
              </div>
            ))}
          </div>

          {verificationError && (
            <div style={verificationErrorBox} role="alert">
              {verificationError}
            </div>
          )}

          <button
            style={{
              ...submitButton,
              opacity: verificationLoading ? 0.72 : 1,
            }}
            disabled={verificationLoading}
            onClick={() => handleVerifyCode()}
          >
            {verificationLoading ? T.pleaseWait : T.verifyCode}
          </button>

          <button
            style={guestButton}
            onClick={() => {
              setTwoFactorStep(false);
              setTwoFactorCode("");
              setVerificationError("");
              localStorage.removeItem("pendingLoginData");
              localStorage.removeItem("pendingTwoFactorSession");
            }}
          >
            {T.back}
          </button>

          <div style={faceIdText}> {T.faceIdComingSoon}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="meetro-visual-page meetro-mobile-fit-page meetro-auth-arrival-page" style={pageWrapper}>
      <div style={languageBar}>
        <div style={languageBox} aria-label={t("language")}>
          {SUPPORTED_LANGUAGES.map((item) => {
            const isActive = normalizedLanguage === item.code;

            return (
              <button
                key={item.code}
                type="button"
                style={{
                  ...languageButton,
                  ...(isActive ? languageButtonActive : {}),
                }}
                onClick={() => changeLanguage(item.code)}
                aria-pressed={isActive}
              >
                <MeetroIcon name="language" size={18} decorative />
                {getLanguageLabel(item.code)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={heroCard} className="meetro-visual-hero">
        <div style={heroBubble}></div>
        <div style={heroNeighborhood} aria-hidden="true">
          <span style={porchLightLeft}></span>
          <span style={homeSilhouetteLeft}></span>
          <span style={homeSilhouetteRight}></span>
          <span style={sidewalkPath}></span>
          <span style={communityLightOne}></span>
          <span style={communityLightTwo}></span>
        </div>
        <div style={heroWaveOne}></div>
        <div style={heroWaveTwo}></div>
        <div style={brandLockup}>
          <div>
            <p style={brandWordmark}>
              meetro<span style={heroTrademark}>TM</span>
            </p>
            <p style={brandCommunity}>Community</p>
          </div>
        </div>
        <h1 style={heroTitle}>{T.welcomeBack}</h1>
        <p style={heroSubtitle}>{T.welcomeTagline}</p>
      </div>

      <div style={cardStyle} className="meetro-visual-surface">
        {mode === "login" && (
          <div style={toggleRow}>
            <button
              type="button"
              style={{
                ...toggleButton,
                ...joinSecondaryButton,
              }}
              onClick={() => {
                localStorage.setItem("meetroLoginMode", "signup");
                setMode("signup");
              }}
            >
              <MeetroIcon name="profile" size={18} decorative />
              {T.getStarted}
            </button>
          </div>
        )}

        {mode === "signup" && (
          <div style={toggleRow}>
            <button
              type="button"
              style={{
                ...toggleButton,
                ...backToLoginButton,
              }}
              onClick={() => {
                localStorage.setItem("meetroLoginMode", "login");
                setMode("login");
                setLegalAccepted(false);
              }}
            >
              ← {t("backToLogin", normalizedLanguage)}
            </button>
          </div>
        )}

        <div style={authIntro}>
          <h2 style={authIntroTitle}>
            {mode === "reset"
              ? t("resetPasswordTitle", normalizedLanguage)
              : mode === "login"
              ? T.login
              : T.createYourAccount}
          </h2>
          <p style={authIntroText}>
            {mode === "reset"
              ? t("resetPasswordDescription", normalizedLanguage)
              : T.startHelper}
          </p>
        </div>

        {mode === "reset" ? (
          <div style={resetForm}>
            <input
              style={input}
              type="email"
              placeholder={t("resetEmailPlaceholder", normalizedLanguage)}
              value={resetEmail}
              onChange={(event) => {
                setResetEmail(event.target.value);
                setResetError("");
              }}
            />

            {resetError && <div style={resetErrorBox}>{resetError}</div>}

            {resetConfirmation && (
              <div style={resetConfirmationBox}>
                <strong>{resetConfirmation}</strong>
                <span>{t("resetPasswordSimulatedNote", normalizedLanguage)}</span>
              </div>
            )}

            <button
              type="button"
              style={submitButton}
              onClick={handlePasswordReset}
            >
              {t("sendResetLink", normalizedLanguage)}
            </button>

            <button type="button" style={guestButton} onClick={returnToLogin}>
              {T.back}
            </button>
          </div>
        ) : (
          <>
            {mode === "signup" && (
              <>
                <h2 style={sectionTitle}>{T.chooseAccountType}</h2>
                <div style={accountTypeGrid}>
                  <button
                    style={
                      accountType === "homeowner"
                        ? selectedAccountCard
                        : accountCard
                    }
                    onClick={() => setAccountType("homeowner")}
                  >
                    <span style={accountIcon}>Home</span>
                    <strong>{T.homeowner}</strong>
                    <span>{T.homeownerDescription}</span>
                  </button>

                  <button
                    style={
                      accountType === "professional"
                        ? selectedAccountCard
                        : accountCard
                    }
                    onClick={() => setAccountType("professional")}
                  >
                    <span style={accountIcon}>Pro</span>
                    <strong>{T.professional}</strong>
                    <span>{T.professionalDescription}</span>
                  </button>
                </div>

                <input
                  style={input}
                  placeholder={T.yourName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                {accountType === "professional" && (
                  <>
                    <input
                      style={input}
                      placeholder={T.businessName}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />

                    <input
                      style={input}
                      placeholder={T.searchServiceCategory}
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                    />

                    {hasCategorySearch && (
                      <div style={categorySearchResults}>
                        {filteredProfessionalCategories.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            style={{
                              ...categorySearchResultButton,
                              ...(professionalCategory === item.value
                                ? selectedCategorySearchResultButton
                                : {}),
                            }}
                            onClick={() => selectProfessionalCategory(item.value)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <select
                      style={input}
                      value={professionalCategory}
                      onChange={(e) => selectProfessionalCategory(e.target.value)}
                    >
                      {professionalCategories.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {accountType !== "professional" && (
                  <>
                    <input
                      style={input}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t("homeownerMobileNumber", normalizedLanguage)}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                    />
                    <p style={fieldHelperText}>
                      <MeetroIcon name="privacy" size={14} decorative />
                      {t("homeownerMobilePrivacyNotice", normalizedLanguage)}
                    </p>
                  </>
                )}
              </>
            )}

            <input
              style={input}
              type="email"
              placeholder={T.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              style={input}
              type="password"
              placeholder={T.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {mode === "login" && (
              <button
                type="button"
                style={forgotPasswordButton}
                onClick={openPasswordReset}
              >
                {t("forgotPassword", normalizedLanguage)}
              </button>
            )}

            {mode === "signup" && (
              <div style={legalAcceptanceCard}>
                <label style={legalAcceptanceLabel}>
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(event) => setLegalAccepted(event.target.checked)}
                    style={legalCheckbox}
                  />
                  <span>
                    {t("legalAgreePrefix")}{" "}
                    <button
                      type="button"
                      style={inlineLegalLink}
                      onClick={() => openLegalDocument("terms")}
                    >
                      {t("termsOfUse")}
                    </button>{" "}
                    {t("legalAgreeAnd")}{" "}
                    <button
                      type="button"
                      style={inlineLegalLink}
                      onClick={() => openLegalDocument("privacy")}
                    >
                      {t("privacyPolicy")}
                    </button>
                    .
                  </span>
                </label>
              </div>
            )}

            <button
              style={{
                ...submitButton,
                ...(mode === "signup" && !legalAccepted
                  ? disabledSubmitButton
                  : {}),
              }}
              onClick={handleSubmit}
              disabled={loading || (mode === "signup" && !legalAccepted)}
            >
              {loading
                ? T.pleaseWait
                : mode === "login"
                ? T.continueAction
                : T.createAccount}
            </button>

            {import.meta.env.DEV && (
              <button
                type="button"
                style={qaSeedButton}
                onClick={enterQAMobileWorkflowState}
              >
                QA Mobile: Sarah / William
              </button>
            )}
          </>
        )}
      </div>

      <nav style={legalFooter} aria-label={t("legalDocuments")}>
        <button
          type="button"
          style={footerLegalLink}
          onClick={() => openLegalDocument("terms")}
        >
          {t("termsOfUse")}
        </button>
        <button
          type="button"
          style={footerLegalLink}
          onClick={() => openLegalDocument("privacy")}
        >
          {t("privacyPolicy")}
        </button>
        <button
          type="button"
          style={footerLegalLink}
          onClick={() => openLegalDocument("emergency")}
        >
          {t("emergencyDisclaimer")}
        </button>
        <button
          type="button"
          style={footerLegalLink}
          onClick={() => openLegalDocument("ai")}
        >
          {t("aiAssistanceDisclaimer")}
        </button>
      </nav>

      <section style={supportPanel} aria-label={T.arrivalSupport}>
        <div>
          <h2 style={supportHeading}>{T.supportHeading}</h2>
          <p style={supportBody}>{T.supportBody}</p>
        </div>
      </section>
    </div>
  );
}

const pageWrapper = {
  minHeight: "100dvh",
  background:
    "radial-gradient(circle at 12% 30%, rgba(247,186,93,0.28), transparent 13%), radial-gradient(circle at 88% 32%, rgba(183,121,31,0.18), transparent 17%), radial-gradient(circle at 50% 92%, rgba(31,77,52,0.42), transparent 34%), linear-gradient(180deg, #0f1c1a 0%, #1b2c22 45%, #18271e 100%)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 18px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 18px) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  width: "100%",
  maxWidth: "980px",
  margin: "0 auto",
  color: "var(--meetro-color-paper, #fffdf8)",
  overflowX: "hidden",
};

const languageBar = {
  display: "flex",
  justifyContent: "center",
  margin: "0 auto 22px",
  width: "100%",
  maxWidth: "620px",
};

const languageBox = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  padding: "4px",
  borderRadius: "18px",
  background: "rgba(255,253,248,0.12)",
  border: "1px solid rgba(255,253,248,0.18)",
  boxSizing: "border-box",
};

const languageButton = {
  minHeight: "54px",
  border: "1px solid rgba(255,253,248,0.22)",
  borderRadius: "20px",
  background: "rgba(12,20,18,0.34)",
  color: "rgba(255,253,248,0.9)",
  fontSize: "18px",
  fontWeight: "850",
  cursor: "pointer",
  padding: "12px 16px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
};

const languageButtonActive = {
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.96)), var(--meetro-surface-sage, rgba(238,244,234,0.92)))",
  borderColor: "rgba(255,253,248,0.48)",
  color: "var(--meetro-color-forest-deep, #14351f)",
  boxShadow: "0 10px 24px rgba(49,35,20,0.14)",
};

const heroCard = {
  background:
    "linear-gradient(180deg, rgba(255,253,248,0.09), rgba(255,253,248,0.025))",
  borderRadius: "32px 32px 18px 18px",
  padding: "34px 22px 72px",
  color: "var(--meetro-color-paper, #fffdf8)",
  marginBottom: "-34px",
  position: "relative",
  overflow: "hidden",
  minHeight: "386px",
  display: "grid",
  alignContent: "center",
};

const heroBubble = {
  position: "absolute",
  bottom: "14px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "520px",
  height: "170px",
  borderRadius: "50%",
  background: "rgba(247,186,93,0.14)",
  filter: "blur(3px)",
};

const heroNeighborhood = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  opacity: 0.72,
  pointerEvents: "none",
};

const homeSilhouetteLeft = {
  position: "absolute",
  left: "4%",
  bottom: "74px",
  width: "132px",
  height: "76px",
  borderRadius: "10px 10px 6px 6px",
  background:
    "linear-gradient(180deg, rgba(12,20,18,0.52), rgba(12,20,18,0.34))",
  boxShadow:
    "20px -18px 0 -8px rgba(12,20,18,0.5), 36px -28px 0 -18px rgba(12,20,18,0.44), inset 18px 22px 0 -15px rgba(247,186,93,0.58)",
};

const homeSilhouetteRight = {
  position: "absolute",
  right: "5%",
  bottom: "78px",
  width: "118px",
  height: "68px",
  borderRadius: "10px 10px 6px 6px",
  background:
    "linear-gradient(180deg, rgba(12,20,18,0.42), rgba(12,20,18,0.28))",
  boxShadow:
    "-18px -14px 0 -9px rgba(12,20,18,0.44), inset -18px 20px 0 -15px rgba(247,186,93,0.48)",
};

const porchLightLeft = {
  position: "absolute",
  left: "9%",
  bottom: "160px",
  width: "22px",
  height: "54px",
  borderRadius: "999px",
  background:
    "radial-gradient(circle at 50% 28%, rgba(255,229,164,0.86), rgba(247,186,93,0.34) 28%, transparent 58%)",
  boxShadow: "0 0 34px rgba(247,186,93,0.28)",
};

const sidewalkPath = {
  position: "absolute",
  left: "42%",
  bottom: "26px",
  width: "18%",
  height: "145px",
  borderRadius: "50% 50% 0 0",
  background:
    "linear-gradient(180deg, rgba(255,253,248,0.12), rgba(255,253,248,0.02))",
  transform: "perspective(220px) rotateX(54deg)",
  transformOrigin: "bottom",
};

const communityLightOne = {
  position: "absolute",
  right: "26%",
  bottom: "146px",
  width: "7px",
  height: "7px",
  borderRadius: "999px",
  background: "rgba(255,229,164,0.84)",
  boxShadow: "0 0 22px rgba(247,186,93,0.42)",
};

const communityLightTwo = {
  position: "absolute",
  left: "26%",
  bottom: "136px",
  width: "6px",
  height: "6px",
  borderRadius: "999px",
  background: "rgba(255,229,164,0.74)",
  boxShadow: "0 0 18px rgba(247,186,93,0.34)",
};

const heroWaveOne = {
  position: "absolute",
  left: "-20%",
  right: "-20%",
  bottom: "30px",
  height: "92px",
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, transparent 8%, rgba(223,232,216,0.32) 42%, rgba(183,121,31,0.18) 72%, transparent 100%)",
  transform: "rotate(-8deg)",
};

const heroWaveTwo = {
  position: "absolute",
  left: "-18%",
  right: "-18%",
  bottom: "8px",
  height: "86px",
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, transparent 10%, rgba(74,52,40,0.22) 46%, rgba(31,77,52,0.22) 80%, transparent 100%)",
  transform: "rotate(7deg)",
};

const logoCircle = {
  width: "68px",
  height: "68px",
  borderRadius: "24px",
  background: "rgba(255,253,248,0.14)",
  border: "1px solid rgba(255,253,248,0.24)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 18px",
  position: "relative",
  zIndex: 2,
  boxShadow: "0 14px 34px rgba(49,35,20,0.18)",
};

const brandWordmark = {
  margin: 0,
  textAlign: "center",
  position: "relative",
  zIndex: 2,
  color: "rgba(255,253,248,0.84)",
  fontSize: "50px",
  fontWeight: "950",
  letterSpacing: 0,
  lineHeight: 0.92,
};

const brandLockup = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 0 34px",
  position: "relative",
  zIndex: 2,
};

const brandCommunity = {
  margin: "6px 0 0",
  color: "var(--meetro-color-sage, #93a982)",
  fontSize: "18px",
  lineHeight: 1,
  fontWeight: "950",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};

const heroTitle = {
  fontSize: "clamp(42px, 9vw, 64px)",
  fontWeight: "950",
  margin: "0 0 18px",
  textAlign: "center",
  position: "relative",
  zIndex: 2,
  color: "var(--meetro-color-paper, #fffdf8)",
  letterSpacing: 0,
  lineHeight: 1.02,
};

const heroTrademark = {
  fontSize: "9px",
  verticalAlign: "super",
  marginLeft: "2px",
  letterSpacing: 0,
};

const securityTitle = {
  fontSize: "34px",
  fontWeight: "900",
  margin: "0 0 12px",
  textAlign: "center",
  position: "relative",
  zIndex: 2,
};

const heroSubtitle = {
  textAlign: "center",
  fontSize: "18px",
  lineHeight: "1.68",
  opacity: 0.98,
  margin: "0 auto",
  maxWidth: "340px",
  position: "relative",
  zIndex: 2,
  color: "#f8fafc",
};

const securityText = {
  textAlign: "center",
  fontSize: "14px",
  opacity: 0.82,
  marginTop: "12px",
  position: "relative",
  zIndex: 2,
};

const cardStyle = {
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.96))",
  borderRadius: "28px",
  padding: "28px 32px",
  boxShadow: "var(--meetro-shadow-lifted, 0 24px 70px rgba(49,35,20,0.14))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  position: "relative",
  zIndex: 3,
  maxWidth: "760px",
  margin: "0 auto",
};

const toggleRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "8px",
  marginBottom: "24px",
};

const toggleButton = {
  border: "1px solid rgba(31,77,52,0.18)",
  borderRadius: "16px",
  minHeight: "58px",
  padding: "14px 16px",
  fontWeight: "900",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
};

const joinSecondaryButton = {
  background: "rgba(255,253,248,0.72)",
  color: "var(--meetro-color-charcoal, #1f211f)",
  border: "1px solid rgba(31,77,52,0.24)",
  boxShadow: "0 8px 18px rgba(49,35,20,0.08)",
};

const backToLoginButton = {
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-forest-deep, #14351f)",
  boxShadow: "none",
};

const authIntro = {
  textAlign: "center",
  margin: "8px 0 24px",
};

const authIntroTitle = {
  margin: "0 0 5px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "clamp(28px, 6vw, 42px)",
  fontWeight: "950",
  letterSpacing: 0,
};

const authIntroText = {
  margin: 0,
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "18px",
  lineHeight: 1.4,
  fontWeight: "750",
};

const sectionTitle = {
  textAlign: "center",
  fontSize: "18px",
  fontWeight: "900",
  color: "#111827",
  margin: "0 0 12px",
};

const accountTypeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const accountCard = {
  width: "100%",
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: "18px",
  padding: "14px",
  display: "grid",
  gap: "6px",
  textAlign: "left",
  cursor: "pointer",
  color: "#1e293b",
  minHeight: "132px",
  boxSizing: "border-box",
};

const selectedAccountCard = {
  ...accountCard,
  border: "2px solid var(--meetro-color-forest, #1f4d34)",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  boxShadow: "0 10px 24px rgba(49,35,20,0.12)",
};

const accountIcon = {
  width: "fit-content",
  borderRadius: "999px",
  padding: "5px 9px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: "950",
};

const input = {
  width: "100%",
  border: "1px solid rgba(78,68,55,0.16)",
  borderRadius: "20px",
  padding: "20px 22px",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  marginBottom: "18px",
  background: "rgba(255,253,248,0.72)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
};

const categorySearchResults = {
  display: "grid",
  gap: "8px",
  margin: "-10px 0 18px",
};

const categorySearchResultButton = {
  width: "100%",
  border: "1px solid rgba(78,68,55,0.16)",
  borderRadius: "16px",
  background: "var(--meetro-surface-paper, #fffdf8)",
  color: "var(--meetro-color-ink, #10231a)",
  padding: "12px 14px",
  textAlign: "left",
  fontSize: "14px",
  fontWeight: "850",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft, 0 8px 20px rgba(49,35,20,0.08))",
};

const selectedCategorySearchResultButton = {
  border: "1px solid var(--meetro-color-forest, #1f4d34)",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
};

const fieldHelperText = {
  display: "flex",
  alignItems: "flex-start",
  gap: "6px",
  margin: "-8px 0 14px",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const hiddenInput = {
  position: "absolute",
  opacity: 0,
  pointerEvents: "none",
};

const sentCodeBox = {
  textAlign: "center",
  marginBottom: "18px",
  color: "#666",
  fontWeight: "700",
};

const maskedEmailStyle = {
  marginTop: "6px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
};

const codeBoxRow = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "10px",
  marginBottom: "18px",
};

const codeBox = {
  height: "62px",
  borderRadius: "20px",
  border: "2px solid #ddd",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  fontWeight: "900",
  color: "#111",
  background: "#fff",
  transition: "all 0.2s ease",
};

const verificationErrorBox = {
  margin: "0 0 12px",
  borderRadius: "16px",
  background: "#fff1f2",
  border: "1px solid rgba(225,29,72,0.18)",
  color: "#be123c",
  padding: "12px",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: "800",
  textAlign: "center",
};

const submitButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "10px",
  boxShadow: "0 12px 24px rgba(49,35,20,0.18)",
};

const forgotPasswordButton = {
  display: "block",
  width: "100%",
  border: "none",
  background: "transparent",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "14px",
  fontWeight: "900",
  textAlign: "right",
  padding: "0 2px 14px",
  cursor: "pointer",
};

const resetForm = {
  display: "grid",
  gap: "10px",
};

const resetErrorBox = {
  marginTop: "-8px",
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(239, 68, 68, 0.22)",
  background: "#fef2f2",
  color: "#991b1b",
  fontSize: "13px",
  fontWeight: "850",
  lineHeight: 1.4,
};

const resetConfirmationBox = {
  display: "grid",
  gap: "6px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(16, 185, 129, 0.22)",
  background: "#ecfdf5",
  color: "#065f46",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.45,
};

const disabledSubmitButton = {
  opacity: 0.58,
  cursor: "not-allowed",
  boxShadow: "none",
};

const legalAcceptanceCard = {
  border: "1px solid #e2e8f0",
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  borderRadius: "18px",
  padding: "13px",
  margin: "2px 0 12px",
};

const legalAcceptanceLabel = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const legalCheckbox = {
  width: "18px",
  height: "18px",
  marginTop: "1px",
  accentColor: "var(--meetro-color-forest, #1f4d34)",
  flexShrink: 0,
};

const inlineLegalLink = {
  border: "none",
  background: "transparent",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  padding: 0,
  textDecoration: "underline",
  cursor: "pointer",
  font: "inherit",
};

const legalFooter = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "8px 12px",
  margin: "30px auto 16px",
  paddingTop: "22px",
  borderTop: "1px solid rgba(255,253,248,0.22)",
  maxWidth: "780px",
};

const footerLegalLink = {
  border: "none",
  background: "transparent",
  color: "rgba(255,253,248,0.82)",
  fontSize: "14px",
  fontWeight: "800",
  textDecoration: "underline",
  cursor: "pointer",
  padding: "6px",
};

const supportPanel = {
  maxWidth: "780px",
  margin: "0 auto calc(10px + env(safe-area-inset-bottom, 0px))",
  display: "grid",
  gridTemplateColumns: "1fr",
  alignItems: "center",
  color: "var(--meetro-color-paper, #fffdf8)",
  background: "rgba(255,253,248,0.08)",
  border: "1px solid rgba(255,253,248,0.18)",
  borderRadius: "18px",
  padding: "26px 32px",
  boxShadow: "0 18px 48px rgba(0,0,0,0.18)",
};

const supportHeading = {
  margin: "0 0 10px",
  color: "var(--meetro-color-paper, #fffdf8)",
  fontSize: "clamp(24px, 5vw, 32px)",
  lineHeight: 1.12,
  fontWeight: "950",
  letterSpacing: 0,
};

const supportBody = {
  margin: 0,
  color: "rgba(255,253,248,0.86)",
  fontSize: "17px",
  lineHeight: 1.35,
  fontWeight: "650",
};

const guestButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "var(--meetro-color-forest-deep, #14351f)",
  color: "var(--meetro-color-paper, #fffdf8)",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
  marginTop: "12px",
};

const qaSeedButton = {
  width: "100%",
  padding: "13px",
  borderRadius: "16px",
  border: "1px solid rgba(31,77,52,0.18)",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "12px",
};

const faceIdText = {
  marginTop: "22px",
  textAlign: "center",
  fontSize: "13px",
  color: "#666",
};

export default Login;
