import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import { t } from "../utils/language";

function Contractors({ setPage, currentPage }) {
  const [loading, setLoading] = useState(true);

  const contractors = [
    {
      id: 1,
      business_name: "Elite Home Services",
      category: "Remodeling",
      location: "Cape Coral, FL",
      rating: 4.9,
      image:
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd",
    },
    {
      id: 2,
      business_name: "Rapid Repair Pros",
      category: "Handyman",
      location: "Fort Myers, FL",
      rating: 4.8,
      image:
        "https://images.unsplash.com/photo-1521791136064-7986c2920216",
    },
    {
      id: 3,
      business_name: "Luxury Outdoor Living",
      category: "Pavers & Landscaping",
      location: "Naples, FL",
      rating: 5.0,
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  function openDetails(contractor) {
    localStorage.setItem(
      "selectedContractor",
      JSON.stringify(contractor)
    );

    localStorage.setItem(
      "selectedContractorId",
      contractor.id
    );
    localStorage.setItem("contractorDetailsReturnPage", "contractors");

    setPage("contractorDetails");
  }

  if (loading) {
    return (
      <LoadingScreen
        text={t("contractorsLoading")}
      />
    );
  }

  return (
    <div
      style={{
        background: "#f5f5f7",
        minHeight: "100vh",
        padding: "24px 18px 120px",
        boxSizing: "border-box",
        color: "#111",
      }}
    >
      <div style={heroCard}>
        <h1 style={heroTitle}>
          {t("contractorsHeroTitle")}
        </h1>

        <p style={heroSubtitle}>
          {t("contractorsHeroSubtitle")}
        </p>
      </div>

      <div style={contractorGrid}>
        {contractors.map((contractor) => (
          <div
            key={contractor.id}
            style={contractorCard}
          >
            <img
              src={contractor.image}
              alt={contractor.business_name}
              style={contractorImage}
            />

            <div style={cardContent}>
              <div style={badgeRow}>
                <span style={verifiedBadge}>
                  ✓ {t("verified")}
                </span>

                <span style={ratingBadge}>
                   {contractor.rating}
                </span>
              </div>

              <h2 style={contractorTitle}>
                {contractor.business_name}
              </h2>

              <p style={categoryText}>
                {contractor.category}
              </p>

              <p style={locationText}>
                 {contractor.location}
              </p>

              <div style={buttonRow}>
                <button
                  onClick={() =>
                    openDetails(contractor)
                  }
                  style={primaryButton}
                >
                  {t("viewProfile")}
                </button>

                <button
                  onClick={() =>
                    setPage("upload")
                  }
                  style={secondaryButton}
                >
                  {t("requestQuote")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav
        setPage={setPage}
        currentPage={currentPage}
      />
    </div>
  );
}

const heroCard = {
  background:
    "linear-gradient(135deg, var(--meetro-color-forest, #1f4d34) 0%, #7b61ff 100%)",
  borderRadius: "30px",
  padding: "30px 24px",
  marginBottom: "28px",
  color: "white",
  boxShadow:
    "0 18px 40px rgba(31,77,52,0.28)",
};

const heroTitle = {
  margin: 0,
  fontSize: "40px",
  lineHeight: 1.1,
};

const heroSubtitle = {
  marginTop: "14px",
  lineHeight: 1.6,
  opacity: 0.92,
  fontSize: "16px",
};

const contractorGrid = {
  display: "grid",
  gap: "22px",
};

const contractorCard = {
  background: "white",
  borderRadius: "28px",
  overflow: "hidden",
  boxShadow:
    "0 10px 24px rgba(0,0,0,0.07)",
};

const contractorImage = {
  width: "100%",
  height: "240px",
  objectFit: "cover",
};

const cardContent = {
  padding: "22px",
};

const badgeRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "16px",
};

const verifiedBadge = {
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const ratingBadge = {
  background: "#fff7e6",
  color: "#ff9900",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const contractorTitle = {
  margin: 0,
  marginBottom: "10px",
  color: "#111",
  fontSize: "30px",
};

const categoryText = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "bold",
  marginBottom: "10px",
};

const locationText = {
  color: "#666",
  marginBottom: "20px",
};

const buttonRow = {
  display: "flex",
  gap: "12px",
};

const primaryButton = {
  flex: 1,
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  padding: "15px",
  borderRadius: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "15px",
};

const secondaryButton = {
  flex: 1,
  border: "none",
  background: "#f3f0ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "15px",
  borderRadius: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "15px",
};

export default Contractors;
