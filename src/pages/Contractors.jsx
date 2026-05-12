import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";

function Contractors({ setPage, currentPage }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const response = await fetch(`${API_URL}/contractor-profiles`);
        const data = await response.json();

        setProfiles(data.profiles || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    const text = `
      ${profile.business_name}
      ${profile.category}
      ${profile.location}
      ${profile.bio}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <div style={{ padding: 20, paddingBottom: 120 }}>
      <h1 style={{ textAlign: "center", fontSize: "42px" }}>
        Contractors
      </h1>

      <p style={{ textAlign: "center", color: "#666" }}>
        Find local professionals on Meetro
      </p>

      <input
        placeholder="Search contractors..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "16px",
          border: "1px solid #ddd",
          fontSize: "16px",
          marginBottom: "24px",
          boxSizing: "border-box",
        }}
      />

      {loading && <p>Loading contractors...</p>}

      {!loading && filteredProfiles.length === 0 && (
        <p style={{ textAlign: "center" }}>No contractors found.</p>
      )}

      {filteredProfiles.map((profile) => (
        <div
          key={profile.id}
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "18px",
            marginBottom: "20px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
          }}
        >
          {profile.image_url && (
            <img
              src={profile.image_url}
              alt={profile.business_name}
              style={{
                width: "100%",
                height: "360px",
                objectFit: "contain",
                objectPosition: "center",
                background: "#f4f4f4",
                borderRadius: "18px",
                marginBottom: "14px",
                padding: "10px",
                boxSizing: "border-box",
              }}
            />
          )}

          <h2>{profile.business_name || "Contractor"}</h2>

          <p style={{ color: "#5b3df5", fontWeight: "bold" }}>
            {profile.category || "Service Provider"}
          </p>

          <p style={{ color: "#666" }}>
            📍 {profile.location || "Location not set"}
          </p>

          <p style={{ lineHeight: 1.6 }}>
            {profile.bio || "No bio added yet."}
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={badgeStyle}>{profile.plan_type || "free"}</span>

            {profile.is_verified && (
              <span style={verifiedBadge}>Verified</span>
            )}

            {profile.is_featured && (
              <span style={featuredBadge}>Featured</span>
            )}
          </div>

          <button
            onClick={() => {
              localStorage.setItem("selectedContractorId", profile.id);
              setPage("contractorDetails");
            }}
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "14px",
              border: "none",
              borderRadius: "14px",
              background: "#5b3df5",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            View Full Profile
          </button>
        </div>
      ))}

      <BottomNav setPage={setPage} currentPage={currentPage} />
    </div>
  );
}

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

export default Contractors;
