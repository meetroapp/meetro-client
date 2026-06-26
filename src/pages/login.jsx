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
import { saveMeetroSession, getPostLoginPage, isProfessionalUser } from "../utils/session";
import { buildPasswordResetRequest } from "../utils/passwordReset";

function Login({ setPage }) {
  const [mode, setMode] = useState(
    localStorage.getItem("meetroLoginMode") || "login"
  );
  const [language, updateLanguage] = useState(getLanguage() || "en");
  const [accountType, setAccountType] = useState("homeowner");
  const [professionalCategory, setProfessionalCategory] = useState("contractor");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);

  const text = {
    en: {
      login: "Login",
      signup: "Sign Up",
      getStarted: "Get Started",
      welcomeTagline: "The modern platform for home and business services.",
      welcomeBack: "Welcome back",
      createYourAccount: "Create your Meetro account",
      startHelper: "Choose your language, then continue into Meetro.",
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
      loginExpired: "Login expired",
      serverError: "Server error",
      enterEmailPassword: "Enter email and password",
      loginFailed: "Login failed",
      acceptTermsRequired:
        "Please agree to the Terms of Use and Privacy Policy to create your account.",
    },
    es: {
      login: "Iniciar sesión",
      signup: "Crear cuenta",
      getStarted: "Comenzar",
      welcomeTagline: "La plataforma moderna para servicios del hogar y negocios.",
      welcomeBack: "Bienvenido de nuevo",
      createYourAccount: "Crea tu cuenta de Meetro",
      startHelper: "Elige tu idioma y continúa en Meetro.",
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
      loginExpired: "Sesión expirada",
      serverError: "Error del servidor",
      enterEmailPassword: "Ingresa correo y contraseña",
      loginFailed: "Error al iniciar sesión",
      acceptTermsRequired:
        "Acepta los Términos de Uso y la Política de Privacidad para crear tu cuenta.",
    },
    fr: {
      login: "Connexion",
      signup: "Créer un compte",
      getStarted: "Commencer",
      welcomeTagline: "La plateforme moderne pour les services à domicile et professionnels.",
      welcomeBack: "Bon retour",
      createYourAccount: "Créez votre compte Meetro",
      startHelper: "Choisissez votre langue, puis continuez dans Meetro.",
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
      getStarted: "Começar",
      welcomeTagline: "A plataforma moderna para serviços residenciais e profissionais.",
      welcomeBack: "Bem-vindo de volta",
      createYourAccount: "Crie sua conta Meetro",
      startHelper: "Escolha seu idioma e continue no Meetro.",
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

  const professionalCategories = [
    { value: "professional", labelKey: "signupCategoryProfessionalServices" },
    { value: "contractor", labelKey: "signupCategoryGeneralContractor" },
    { value: "handyman", labelKey: "handyman" },
    { value: "applianceRepair", labelKey: "applianceRepair" },
    { value: "automotiveServices", labelKey: "automotiveServices" },
    { value: "carDetailing", labelKey: "carDetailing" },
    { value: "carpentry", labelKey: "carpentry" },
    { value: "cleaning", labelKey: "signupCategoryCleaningServices" },
    { value: "concrete", labelKey: "concrete" },
    { value: "demolition", labelKey: "demolition" },
    { value: "doorsWindows", labelKey: "doorsWindows" },
    { value: "drywall", labelKey: "signupCategoryDrywallRepair" },
    { value: "electrical", labelKey: "electrical" },
    { value: "fencing", labelKey: "fencing" },
    { value: "flooring", labelKey: "flooring" },
    { value: "homeHealthCare", labelKey: "homeHealthCare" },
    { value: "hvac", labelKey: "hvac" },
    { value: "junkRemoval", labelKey: "junkRemoval" },
    { value: "landscaping", labelKey: "landscaping" },
    { value: "lawnCare", labelKey: "lawnCare" },
    { value: "mechanic", labelKey: "mechanic" },
    { value: "mobileServices", labelKey: "mobileServices" },
    { value: "moving", labelKey: "signupCategoryMovingServices" },
    { value: "painting", labelKey: "painting" },
    { value: "paverSealing", labelKey: "paverSealing" },
    { value: "pestControl", labelKey: "pestControl" },
    { value: "plumbing", labelKey: "plumbing" },
    { value: "poolService", labelKey: "poolService" },
    { value: "pressureWashing", labelKey: "pressureWashing" },
    { value: "privateTransportation", labelKey: "privateTransportation" },
    { value: "realEstate", labelKey: "realEstate" },
    { value: "propertyManagement", labelKey: "propertyManagement" },
    { value: "roofing", labelKey: "roofing" },
    { value: "tile", labelKey: "signupCategoryTileInstallation" },
    { value: "treeService", labelKey: "treeService" },
    { value: "other", labelKey: "signupCategoryOtherServices" },
  ].map((item) => ({
    ...item,
    label: t(item.labelKey, normalizedLanguage),
  }));

  const filteredProfessionalCategories = professionalCategories.filter((item) =>
    item.label.toLowerCase().includes(categorySearch.toLowerCase())
  );

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
  return isProfessionalUser(user);
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

  function routeUser(data) {
    const page = getPostLoginPage(data.user || {});
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

     if (mode === "signup") {
      localStorage.setItem("pendingLoginData", JSON.stringify(data));
      localStorage.setItem("firstLogin", "true");
      setTwoFactorStep(true);
      return;
     }

      localStorage.setItem("pendingLoginData", JSON.stringify(data));
      setTwoFactorStep(true);
    } catch (error) {
      console.error(error);
      alert(T.serverError);
    } finally {
      setLoading(false);
    }
  }

     function handleVerifyCode(codeOverride) {
       try {
       const codeToCheck = String(codeOverride || twoFactorCode).trim();

      if (codeToCheck !== "123456") {
        alert(T.invalidCode);
        return;
     }

    const pendingData = JSON.parse(localStorage.getItem("pendingLoginData"));

    if (!pendingData) {
      alert(T.loginExpired);
      return;
    }

    saveUserData(pendingData);
    localStorage.removeItem("pendingLoginData");
    setTwoFactorStep(false);
    setTwoFactorCode("");
    const isFirstLogin = localStorage.getItem("firstLogin") === "true";

if (isFirstLogin) {
  setPage("welcome");
  return;
}

routeUser(pendingData);
  } catch (error) {
    console.error(error);
    alert(T.serverError);
  }
}

  if (twoFactorStep) {
    const codeDigits = twoFactorCode.padEnd(6, " ").split("");
    const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, "$1***$3");

    return (
      <div style={pageWrapper}>
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
                    index === twoFactorCode.length ? "#5b3df5" : "#ddd",
                  transform:
                    index === twoFactorCode.length ? "scale(1.04)" : "scale(1)",
                  boxShadow:
                    index === twoFactorCode.length
                      ? "0 0 0 4px rgba(91,61,245,0.12)"
                      : "0 4px 12px rgba(0,0,0,0.04)",
                }}
              >
                {digit.trim()}
              </div>
            ))}
          </div>

          <button style={submitButton} onClick={handleVerifyCode}>
            {T.verifyCode}
          </button>

          <button
            style={guestButton}
            onClick={() => {
              setTwoFactorStep(false);
              setTwoFactorCode("");
              localStorage.removeItem("pendingLoginData");
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
    <div style={pageWrapper}>
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
                {getLanguageLabel(item.code)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={heroCard}>
        <div style={heroBubble}></div>
        <div style={heroWaveOne}></div>
        <div style={heroWaveTwo}></div>
        <h1 style={heroTitle}>meetro<span style={heroTrademark}>TM</span></h1>
        <p style={heroSubtitle}>{T.welcomeTagline}</p>
      </div>

      <div style={cardStyle}>
        {mode !== "reset" && (
          <div style={toggleRow}>
            <button
              style={{
                ...toggleButton,
                background: mode === "signup" ? "#5b3df5" : "#f3f4f6",
                color: mode === "signup" ? "white" : "#111827",
              }}
              onClick={() => {
                localStorage.setItem("meetroLoginMode", "signup");
                setMode("signup");
              }}
            >
              {T.getStarted}
            </button>

            <button
              style={{
                ...toggleButton,
                background: mode === "login" ? "#5b3df5" : "#f3f4f6",
                color: mode === "login" ? "white" : "#111827",
              }}
              onClick={() => {
                localStorage.setItem("meetroLoginMode", "login");
                setMode("login");
                setLegalAccepted(false);
              }}
            >
              {T.login}
            </button>
          </div>
        )}

        <div style={authIntro}>
          <h2 style={authIntroTitle}>
            {mode === "reset"
              ? t("resetPasswordTitle", normalizedLanguage)
              : mode === "login"
              ? T.welcomeBack
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

            <button type="button" style={submitButton} onClick={handlePasswordReset}>
              {t("sendResetLink", normalizedLanguage)}
            </button>

            <button type="button" style={guestButton} onClick={returnToLogin}>
              {t("backToLogin", normalizedLanguage)}
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
                  accountType === "homeowner" ? selectedAccountCard : accountCard
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

                <select
                  style={input}
                  value={professionalCategory}
                  onChange={(e) => setProfessionalCategory(e.target.value)}
                >
                  {filteredProfessionalCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
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
          <button type="button" style={forgotPasswordButton} onClick={openPasswordReset}>
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
            ...(mode === "signup" && !legalAccepted ? disabledSubmitButton : {}),
          }}
          onClick={handleSubmit}
          disabled={loading || (mode === "signup" && !legalAccepted)}
        >
          {loading
            ? T.pleaseWait
            : mode === "login"
            ? T.login
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
    </div>
  );
}

const pageWrapper = {
  minHeight: "100dvh",
  background:
    "radial-gradient(circle at 50% 88%, rgba(91,61,245,0.26), transparent 28%), linear-gradient(180deg,#050719 0%,#080a22 52%,#030414 100%)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 18px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 18px) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  width: "100%",
  maxWidth: "760px",
  margin: "0 auto",
  color: "#ffffff",
  overflowX: "hidden",
};

const languageBar = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "22px",
  width: "100%",
};

const languageBox = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  padding: "4px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxSizing: "border-box",
};

const languageButton = {
  minHeight: "38px",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.04)",
  color: "#cbd5e1",
  fontSize: "13px",
  fontWeight: "850",
  cursor: "pointer",
  padding: "8px 9px",
};

const languageButtonActive = {
  background: "linear-gradient(135deg,#6d4dff,#5b3df5)",
  borderColor: "rgba(167,139,250,0.65)",
  color: "#ffffff",
  boxShadow: "0 10px 24px rgba(91,61,245,0.24)",
};

const languageSelect = {
  border: "none",
  outline: "none",
  fontSize: "14px",
  fontWeight: "700",
  background: "transparent",
};

const heroCard = {
  background: "transparent",
  borderRadius: "30px",
  padding: "42px 22px 64px",
  color: "white",
  marginBottom: "10px",
  position: "relative",
  overflow: "hidden",
  minHeight: "270px",
  display: "grid",
  alignContent: "center",
};

const heroBubble = {
  position: "absolute",
  bottom: "18px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "260px",
  height: "100px",
  borderRadius: "50%",
  background: "rgba(91,61,245,0.18)",
  filter: "blur(2px)",
};

const heroWaveOne = {
  position: "absolute",
  left: "-20%",
  right: "-20%",
  bottom: "30px",
  height: "92px",
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, transparent 8%, rgba(91,61,245,0.34) 42%, rgba(124,58,237,0.18) 72%, transparent 100%)",
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
    "linear-gradient(135deg, transparent 10%, rgba(76,29,149,0.28) 46%, rgba(91,61,245,0.16) 80%, transparent 100%)",
  transform: "rotate(7deg)",
};

const logoCircle = {
  width: "68px",
  height: "68px",
  borderRadius: "24px",
  background: "rgba(139,92,246,0.18)",
  border: "1px solid rgba(167,139,250,0.22)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 18px",
  position: "relative",
  zIndex: 2,
  boxShadow: "0 14px 34px rgba(91,61,245,0.18)",
};

const heroTitle = {
  fontSize: "40px",
  fontWeight: "950",
  margin: "0 0 14px",
  textAlign: "center",
  position: "relative",
  zIndex: 2,
  color: "#8b5cf6",
  letterSpacing: "-0.04em",
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
  fontSize: "16px",
  lineHeight: "1.5",
  opacity: 0.98,
  margin: "0 auto",
  maxWidth: "250px",
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
  background: "rgba(255,255,255,0.96)",
  borderRadius: "26px",
  padding: "18px",
  boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.16)",
};

const toggleRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "22px",
};

const toggleButton = {
  border: "1px solid rgba(91,61,245,0.18)",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const authIntro = {
  textAlign: "center",
  margin: "2px 0 18px",
};

const authIntroTitle = {
  margin: "0 0 5px",
  color: "#0f172a",
  fontSize: "22px",
  fontWeight: "950",
  letterSpacing: "-0.02em",
};

const authIntroText = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
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
  border: "2px solid #6d4dff",
  background: "#f3f0ff",
  boxShadow: "0 10px 24px rgba(91,61,245,0.14)",
};

const accountIcon = {
  width: "fit-content",
  borderRadius: "999px",
  padding: "5px 9px",
  background: "#ede9fe",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "950",
};

const input = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "15px 16px",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  marginBottom: "14px",
  background: "white",
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
  color: "#5b3df5",
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
  borderRadius: "18px",
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

const submitButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "linear-gradient(135deg, #5b3df5 0%, #6d4dff 100%)",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "6px",
  boxShadow: "0 12px 24px rgba(91,61,245,0.28)",
};

const forgotPasswordButton = {
  display: "block",
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#5b3df5",
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
  background: "#f8fafc",
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
  accentColor: "#5b3df5",
  flexShrink: 0,
};

const inlineLegalLink = {
  border: "none",
  background: "transparent",
  color: "#5b3df5",
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
  marginTop: "18px",
  paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
};

const footerLegalLink = {
  border: "none",
  background: "transparent",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "800",
  textDecoration: "underline",
  cursor: "pointer",
  padding: "6px",
};

const guestButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
  marginTop: "12px",
};

const qaSeedButton = {
  width: "100%",
  padding: "13px",
  borderRadius: "16px",
  border: "1px solid #c4b5fd",
  background: "#f5f3ff",
  color: "#4c1d95",
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
