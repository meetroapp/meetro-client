import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";

function ContractorDetails({ setPage, currentPage }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);

  useEffect(() => {
    async function fetchContractor() {
      try {
        const contractorId = localStorage.getItem("selectedContractorId");

        const response = await fetch(
          `${API_URL}/contractor-profiles/${contractorId}`
        );

        const data = await response.json();

        if (data.profile) {
          setProfile(data.profile);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchContractor();
  }, []);

  return (
    <div style={{ padding: 20, paddingBottom: 120 }}>
      <button
        onClick={() => setPage("contractors")}
        style={backButton}
      >
        ← Back to Contractors
      </button>

      {loading && <p>Loading contractor...</p>}

      {!loading && !profile && (
        <div style={cardStyle}>
          <h2>Contractor not found</h2>
          <p>This contractor profile could not be loaded.</p>
        </div>
      )}

      {!loading && profile && (
        <div style={cardStyle}>
          {profile.image_url && (
            <img
              src={profile.image_url}
              alt={profile.business_name}
              style={{
                width: "100%",
                height: "380px",
                objectFit: "contain",
                objectPosition: "center",
                background: "#f4f4f4",
                borderRadius: "22px",
                marginBottom: "18px",
                padding: "10px",
                boxSizing: "border-box",
              }}
            />
          )}

          <h1
            style={{
              fontSize: "36px",
              lineHeight: "1.05",
              marginBottom: "10px",
              textAlign: "center",
            }}
          >
            {profile.business_name || "Contractor"}
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#5b3df5",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            {profile.category || "Service Provider"}
          </p>

          <p style={{ textAlign: "center", color: "#666" }}>
            📍 {profile.location || "Location not set"}
          </p>

          <p
            style={{
              lineHeight: "1.6",
              color: "#444",
              marginTop: "20px",
              fontSize: "16px",
            }}
          >
            {profile.bio || "No business bio added yet."}
          </p>

          <div style={badgeRow}>
            <span style={badgeStyle}>
              Plan: {profile.plan_type || "free"}
            </span>

            {profile.is_verified && (
              <span style={verifiedBadge}>Verified</span>
            )}

            {profile.is_featured && (
              <span style={featuredBadge}>Featured</span>
            )}

            <span style={badgeStyle}>
              For-hire posts: {profile.for_hire_post_limit || 3}/month
            </span>
          </div>

         <button
  onClick={() => setShowQuoteForm(!showQuoteForm)}
  style={primaryButton}
>
  {showQuoteForm ? "Cancel Quote Request" : "Request Quote"}
</button>

{showQuoteForm && (
  <div
    style={{
      marginTop: "20px",
      background: "#fafafa",
      padding: "18px",
      borderRadius: "18px",
      border: "1px solid #eee",
    }}
  >
    <input
      placeholder="Project title"
      value={projectTitle}
      onChange={(e) => setProjectTitle(e.target.value)}
      style={inputStyle}
    />

    <textarea
      placeholder="Describe your project"
      value={projectDescription}
      onChange={(e) => setProjectDescription(e.target.value)}
      style={{
        ...inputStyle,
        minHeight: "120px",
      }}
    />

    <input
      placeholder="Project location"
      value={projectLocation}
      onChange={(e) => setProjectLocation(e.target.value)}
      style={inputStyle}
    />

    <button
      onClick={async () => {
        try {
          setSubmittingQuote(true);

          const token = localStorage.getItem("token");

          const response = await fetch(
            `${API_URL}/quote-requests`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                contractor_id: profile.id,
                project_title: projectTitle,
                project_description: projectDescription,
                location: projectLocation,
              }),
            }
          );

          const data = await response.json();

          if (response.ok) {
            alert("Quote request submitted!");

            setProjectTitle("");
            setProjectDescription("");
            setProjectLocation("");
            setShowQuoteForm(false);
          } else {
            alert(data.error || "Failed to submit quote request");
          }
        } catch (error) {
          console.error(error);
          alert("Something went wrong");
        } finally {
          setSubmittingQuote(false);
        }
      }}
      style={primaryButton}
    >
      {submittingQuote ? "Submitting..." : "Submit Quote Request"}
    </button>
  </div>
)}

          <button
            onClick={() => alert("Messaging system coming next")}
            style={secondaryButton}
          >
            Message Contractor
          </button>
        </div>
      )}

      <BottomNav setPage={setPage} currentPage={currentPage} />
    </div>
  );
}

const cardStyle = {
  background: "white",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const backButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
  padding: "10px 14px",
  borderRadius: "14px",
  fontWeight: "bold",
  marginBottom: "16px",
  cursor: "pointer",
};

const badgeRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const badgeStyle = {
  background: "#f1ecff",
  color: "#5b3df5",
  padding: "8px 12px",
  borderRadius: "12px",
  fontWeight: "bold",
  fontSize: "14px",
};

const verifiedBadge = {
  background: "#e8fff0",
  color: "#12a150",
  padding: "8px 12px",
  borderRadius: "12px",
  fontWeight: "bold",
  fontSize: "14px",
};

const featuredBadge = {
  background: "#fff7df",
  color: "#c79b00",
  padding: "8px 12px",
  borderRadius: "12px",
  fontWeight: "bold",
  fontSize: "14px",
};

const primaryButton = {
  width: "100%",
  marginTop: "22px",
  padding: "15px",
  border: "none",
  borderRadius: "16px",
  background: "#5b3df5",
  color: "white",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};

const secondaryButton = {
  width: "100%",
  marginTop: "12px",
  padding: "15px",
  border: "none",
  borderRadius: "16px",
  background: "#eee7ff",
  color: "#5b3df5",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #ddd",
  marginBottom: "14px",
  fontSize: "16px",
  boxSizing: "border-box",
};
export default ContractorDetails;
