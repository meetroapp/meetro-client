import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";

function ContractorProfile({ setPage, currentPage }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    async function fetchMyProfile() {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_URL}/my-contractor-profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.profile) {
          setProfile(data.profile);
          fillForm(data.profile);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyProfile();
  }, []);

  function fillForm(existingProfile) {
    setBusinessName(existingProfile.business_name || "");
    setCategory(existingProfile.category || "");
    setPhone(existingProfile.phone || "");
    setLocation(existingProfile.location || "");
    setBio(existingProfile.bio || "");
    setImageUrl(existingProfile.image_url || "");
  }

  async function handleCreateProfile() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/contractor-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_name: businessName,
          category,
          phone,
          location,
          bio,
          image_url: imageUrl,
        }),
      });

      const data = await response.json();

      if (data.profile) {
        alert("Contractor profile created!");
        setProfile(data.profile);
        fillForm(data.profile);
        setEditing(false);
      } else {
        alert(data.error || "Failed to create profile");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  }

  async function handleUpdateProfile() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/contractor-profiles/${profile.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            business_name: businessName,
            category,
            phone,
            location,
            bio,
            image_url: imageUrl,
          }),
        }
      );

      const data = await response.json();

      if (data.profile) {
        alert("Contractor profile updated!");
        setProfile(data.profile);
        fillForm(data.profile);
        setEditing(false);
      } else {
        alert(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 30 }}>
        <p>Loading contractor profile...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 30, paddingBottom: 120 }}>
      <h1 style={{ textAlign: "center", fontSize: "42px" }}>
        Contractor Profile
      </h1>

      {profile && !editing ? (
        <div style={cardStyle}>
          {profile.image_url && (
            <img
              src={profile.image_url}
              alt={profile.business_name}
             style={{
               width: "100%",
               height: "420px",
               objectFit: "contain",
               objectPosition: "center",
               background: "#f4f4f4",
               borderRadius: "18px",
               marginBottom: "16px",
               padding: "10px",
               boxSizing: "border-box",
              }}
               
            />
          )}

          <h2 style={{ textAlign: "center" }}>
            {profile.business_name || "Business name not set"}
          </h2>

          <p>
            <strong>Category:</strong> {profile.category || "Not set"}
          </p>

          <p>
            <strong>Phone:</strong> {profile.phone || "Not set"}
          </p>

          <p>
            <strong>Location:</strong> {profile.location || "Not set"}
          </p>

          <p>{profile.bio || "No bio added yet."}</p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={badgeStyle}>Plan: {profile.plan_type || "free"}</span>

            {profile.is_verified && <span style={badgeStyle}>Verified</span>}

            {profile.is_featured && <span style={badgeStyle}>Featured</span>}

            <span style={badgeStyle}>
              For-hire posts: {profile.for_hire_post_limit || 3}/month
            </span>
          </div>

          <button
            onClick={() => setEditing(true)}
            style={primaryButton}
          >
            Edit Profile
          </button>

          <button
            onClick={() => alert("Upgrade to paid profile coming soon")}
            style={secondaryButton}
          >
            Upgrade Profile
          </button>
        </div>
      ) : (
        <div style={cardStyle}>
          <p>
            {profile
              ? "Edit your contractor profile."
              : "Create your free contractor profile."}
          </p>

          <input
            placeholder="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Category, example: Handyman"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder="Business bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{
              ...inputStyle,
              minHeight: "120px",
            }}
          />

          <input
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={inputStyle}
          />

          {imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
             style={{
              width: "100%",
              height: "260px",
              objectFit: "contain",
              background: "#f4f4f4",
              borderRadius: "18px",
              marginTop: "15px",
              padding: "10px",
              boxSizing: "border-box",
             }}      
            />
          )}

          <button
            onClick={profile ? handleUpdateProfile : handleCreateProfile}
            style={primaryButton}
          >
            {profile ? "Save Changes" : "Create Contractor Profile"}
          </button>

          {profile && (
            <button
              onClick={() => {
                fillForm(profile);
                setEditing(false);
              }}
              style={secondaryButton}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <BottomNav setPage={setPage} currentPage={currentPage} />
    </div>
  );
}

const cardStyle = {
  background: "white",
  borderRadius: "22px",
  padding: "20px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "15px",
  boxSizing: "border-box",
  borderRadius: "12px",
  border: "1px solid #ddd",
  fontSize: "16px",
};

const primaryButton = {
  width: "100%",
  marginTop: "20px",
  padding: "14px 20px",
  background: "#5b3df5",
  color: "white",
  border: "none",
  borderRadius: "14px",
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryButton = {
  width: "100%",
  marginTop: "12px",
  padding: "14px 20px",
  background: "#eee7ff",
  color: "#5b3df5",
  border: "none",
  borderRadius: "14px",
  fontWeight: "bold",
  cursor: "pointer",
};

const badgeStyle = {
  background: "#f5f1ff",
  color: "#5b3df5",
  padding: "8px 12px",
  borderRadius: "14px",
  fontSize: "14px",
  fontWeight: "bold",
};

export default ContractorProfile;
