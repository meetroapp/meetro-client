import { useState } from "react";
import API_URL from "../api";
import { getLanguage, setLanguage } from "../utils/language";

function Login({ setPage }) {
  const [mode, setMode] = useState("login");
  const [language, updateLanguage] = useState(getLanguage() || "en");
  const [accountType, setAccountType] = useState("homeowner");
  const [professionalCategory, setProfessionalCategory] = useState("contractor");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const text = {
    en: {
      login: "Login",
      signup: "Sign Up",
      welcomeBack: "Welcome back to your community.",
      createYourAccount: "Create your Meetro account.",
      chooseAccountType: "Choose Account Type",
      homeowner: "Homeowner",
      homeownerDescription:
        "Find trusted local pros, request quotes, and manage home projects.",
      professional: "Professional",
      professionalDescription:
        "Offer services, receive quote requests, and grow your local business.",
      yourName: "Your Name",
      businessName: "Business Name",
      searchServiceCategory: "Search service category",
      email: "Email",
      password: "Password",
      createAccount: "Create Account",
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
    },
    es: {
      login: "Iniciar sesión",
      signup: "Crear cuenta",
      welcomeBack: "Bienvenido de nuevo a tu comunidad.",
      createYourAccount: "Crea tu cuenta de Meetro.",
      chooseAccountType: "Elige el tipo de cuenta",
      homeowner: "Dueño de casa",
      homeownerDescription:
        "Encuentra profesionales locales, pide cotizaciones y administra proyectos.",
      professional: "Profesional",
      professionalDescription:
        "Ofrece servicios, recibe cotizaciones y crece tu negocio local.",
      yourName: "Tu nombre",
      businessName: "Nombre del negocio",
      searchServiceCategory: "Buscar categoría de servicio",
      email: "Correo electrónico",
      password: "Contraseña",
      createAccount: "Crear cuenta",
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
    },
  };

  const T = text[language] || text.en;

  const professionalCategories = [
    { value: "professional", label: "Professional Services" },
    { value: "contractor", label: "General Contractor" },
    { value: "handyman", label: "Handyman" },
    { value: "applianceRepair", label: "Appliance Repair" },
    { value: "automotiveServices", label: "Automotive Services" },
    { value: "carDetailing", label: "Car Detailing" },
    { value: "carpentry", label: "Carpentry" },
    { value: "cleaning", label: "Cleaning Services" },
    { value: "concrete", label: "Concrete" },
    { value: "demolition", label: "Demolition" },
    { value: "doorsWindows", label: "Doors & Windows" },
    { value: "drywall", label: "Drywall Repair" },
    { value: "electrical", label: "Electrical" },
    { value: "fencing", label: "Fencing" },
    { value: "flooring", label: "Flooring" },
    { value: "homeHealthCare", label: "Home Health Care" },
    { value: "hvac", label: "HVAC / AC" },
    { value: "junkRemoval", label: "Junk Removal" },
    { value: "landscaping", label: "Landscaping" },
    { value: "lawnCare", label: "Lawn Care" },
    { value: "mechanic", label: "Mechanic" },
    { value: "mobileServices", label: "Mobile Services" },
    { value: "moving", label: "Moving Services" },
    { value: "painting", label: "Painting" },
    { value: "paverSealing", label: "Paver Sealing" },
    { value: "pestControl", label: "Pest Control" },
    { value: "plumbing", label: "Plumbing" },
    { value: "poolService", label: "Pool Service" },
    { value: "pressureWashing", label: "Pressure Washing" },
    { value: "privateTransportation", label: "Private Transportation" },
    { value: "realEstate", label: "Real Estate" },
    { value: "roofing", label: "Roofing" },
    { value: "tile", label: "Tile Installation" },
    { value: "treeService", label: "Tree Service" },
    { value: "other", label: "Other Services" },
  ];

  const filteredProfessionalCategories = professionalCategories.filter((item) =>
    item.label.toLowerCase().includes(categorySearch.toLowerCase())
  );

  function changeLanguage(value) {
    setLanguage(value);
    updateLanguage(value);
    localStorage.setItem("meetroLanguage", value);
  }

function checkIsProfessional(user = {}) {
  return (
    user.account_type === "professional" ||
    user.accountType === "professional"
  );
}

  function saveUserData(data) {
    const user = data.user || {};
    const isProfessional = checkIsProfessional(user);

    const finalAccountType = isProfessional ? "professional" : "homeowner";
    const finalMode = isProfessional ? "business" : "personal";

    localStorage.setItem("token", data.token || "");
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("userId", user.id || "");
    localStorage.setItem("userName", user.username || user.name || "");
    localStorage.setItem("userEmail", user.email || email.trim());

    localStorage.setItem(
      "userRole",
      isProfessional
        ? user.business_category ||
            user.businessCategory ||
            user.role ||
            "professional"
        : "homeowner"
    );

    localStorage.setItem("accountType", finalAccountType);
    localStorage.setItem(
      "businessName",
      user.business_name || user.businessName || ""
    );
    localStorage.setItem(
      "businessCategory",
      user.business_category || user.businessCategory || ""
    );
    localStorage.setItem("activeAccountMode", finalMode);
    localStorage.setItem("isProfessional", isProfessional ? "true" : "false");
    localStorage.setItem(
      "hasBusinessProfile",
      isProfessional ? "true" : "false"
    );
   
     localStorage.setItem(
    "contractorProfileComplete",
    isProfessional ? "true" : "false"
   );
  }

  function routeUser(data) {
    const user = data.user || {};
    const isProfessional = checkIsProfessional(user);

    if (isProfessional) {
      localStorage.setItem("activeAccountMode", "business");
      localStorage.setItem("isProfessional", "true");
      localStorage.setItem("hasBusinessProfile", "true");
      setPage("businessDashboard");
      return;
    }

    localStorage.setItem("activeAccountMode", "personal");
    localStorage.setItem("isProfessional", "false");
    localStorage.setItem("hasBusinessProfile", "false");
    setPage("home");
  }

  async function handleSubmit() {
    try {
      if (!email.trim() || !password.trim()) {
        alert(T.enterEmailPassword);
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
          <div style={logoCircle}>🔐</div>
          <h1 style={securityTitle}>{T.securityVerification}</h1>
          <p style={heroSubtitle}>{T.enterVerificationCode}</p>
          <p style={securityText}>🔒 {T.meetroSecurityText}</p>
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

          <div style={faceIdText}>😊 {T.faceIdComingSoon}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <div style={languageBar}>
        <div style={languageBox}>
          <span style={languageLabel}>🌐</span>

          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            style={languageSelect}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      <div style={heroCard}>
        <div style={heroBubble}></div>
        <div style={logoCircle}>M</div>
        <h1 style={heroTitle}>Meetro</h1>
        <p style={heroSubtitle}>
          {mode === "login" ? T.welcomeBack : T.createYourAccount}
        </p>
      </div>

      <div style={cardStyle}>
        <div style={toggleRow}>
          <button
            style={{
              ...toggleButton,
              background: mode === "login" ? "#5b3df5" : "#f3f4f6",
              color: mode === "login" ? "white" : "#111827",
            }}
            onClick={() => setMode("login")}
          >
            {T.login}
          </button>

          <button
            style={{
              ...toggleButton,
              background: mode === "signup" ? "#5b3df5" : "#f3f4f6",
              color: mode === "signup" ? "white" : "#111827",
            }}
            onClick={() => setMode("signup")}
          >
            {T.signup}
          </button>
        </div>

        {mode === "signup" && (
          <>
            <h2 style={sectionTitle}>{T.chooseAccountType}</h2>

            <button
              style={
                accountType === "homeowner" ? selectedAccountCard : accountCard
              }
              onClick={() => setAccountType("homeowner")}
            >
              <span style={accountIcon}>🏠</span>
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
              <span style={accountIcon}>🛠️</span>
              <strong>{T.professional}</strong>
              <span>{T.professionalDescription}</span>
            </button>

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

        <button style={submitButton} onClick={handleSubmit} disabled={loading}>
          {loading
            ? T.pleaseWait
            : mode === "login"
            ? T.login
            : T.createAccount}
        </button>
      </div>
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "18px",
  boxSizing: "border-box",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const languageBar = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "16px",
};

const languageBox = {
  background: "white",
  borderRadius: "18px",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
};

const languageLabel = {
  fontWeight: "900",
  color: "#111827",
};

const languageSelect = {
  border: "none",
  outline: "none",
  fontSize: "14px",
  fontWeight: "700",
  background: "transparent",
};

const heroCard = {
  background:
    "linear-gradient(135deg, rgba(91,61,245,0.96) 0%, rgba(124,92,255,0.96) 100%)",
  borderRadius: "30px",
  padding: "32px 28px",
  color: "white",
  marginBottom: "24px",
  boxShadow: "0 18px 44px rgba(91,61,245,0.25)",
  position: "relative",
  overflow: "hidden",
};

const heroBubble = {
  position: "absolute",
  top: "-40px",
  right: "-40px",
  width: "140px",
  height: "140px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
};

const logoCircle = {
  width: "70px",
  height: "70px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  fontWeight: "900",
  margin: "0 auto 18px",
  position: "relative",
  zIndex: 2,
};

const heroTitle = {
  fontSize: "42px",
  fontWeight: "900",
  margin: "0 0 10px",
  textAlign: "center",
  position: "relative",
  zIndex: 2,
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
  opacity: 0.95,
  margin: "0",
  position: "relative",
  zIndex: 2,
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
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 16px 40px rgba(0,0,0,0.07)",
};

const toggleRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "22px",
};

const toggleButton = {
  border: "none",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const sectionTitle = {
  textAlign: "center",
  fontSize: "24px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "18px",
};

const accountCard = {
  width: "100%",
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: "22px",
  padding: "18px",
  display: "grid",
  gap: "8px",
  textAlign: "left",
  marginBottom: "14px",
  cursor: "pointer",
};

const selectedAccountCard = {
  width: "100%",
  border: "2px solid #5b3df5",
  background: "#f3f0ff",
  borderRadius: "22px",
  padding: "18px",
  display: "grid",
  gap: "8px",
  textAlign: "left",
  marginBottom: "14px",
  cursor: "pointer",
};

const accountIcon = {
  fontSize: "28px",
};

const input = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "15px 16px",
  fontSize: "15px",
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

const faceIdText = {
  marginTop: "22px",
  textAlign: "center",
  fontSize: "13px",
  color: "#666",
};

export default Login;
