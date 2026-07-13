import { useEffect, useState } from "react";
import MeetroIcon from "./MeetroIcon";
import { t } from "../utils/language";
import {
  PERSONAL_ADDRESS_LABELS,
  createPersonalAddress,
  deletePersonalAddress,
  formatPersonalAddress,
  setDefaultPersonalAddress,
  updatePersonalAddress,
} from "../utils/personalAddresses";

const EMPTY_ADDRESS = {
  label: "home",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

function validationFor(address) {
  return {
    street1: address.street1.trim() ? "" : t("addressRequired"),
    city: address.city.trim() ? "" : t("cityRequired"),
    state: address.state.trim() ? "" : t("stateRequired"),
    postalCode: address.postalCode.trim() ? "" : t("postalCodeRequired"),
    country: address.country.trim() ? "" : t("countryRequired"),
  };
}

export default function PersonalAddressManager({ addresses, onChange, onClose }) {
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [errors, setErrors] = useState({});
  const editing = Boolean(editingId) || form !== EMPTY_ADDRESS;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      if (editing) {
        setEditingId("");
        setForm(EMPTY_ADDRESS);
        setErrors({});
      } else {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editing, onClose]);

  function beginAdd() {
    setEditingId("");
    setForm({ ...EMPTY_ADDRESS });
    setErrors({});
  }

  function beginEdit(address) {
    setEditingId(address.id);
    setForm({
      label: address.label,
      street1: address.street1,
      street2: address.street2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    });
    setErrors({});
  }

  function cancelEdit() {
    setEditingId("");
    setForm(EMPTY_ADDRESS);
    setErrors({});
  }

  function saveAddress(event) {
    event.preventDefault();
    const nextErrors = validationFor(form);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    const next = editingId
      ? updatePersonalAddress(editingId, form)
      : createPersonalAddress(form);
    onChange(next);
    cancelEdit();
  }

  function removeAddress(addressId) {
    onChange(deletePersonalAddress(addressId));
    cancelEdit();
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: "" }));
  }

  return (
    <div className="meetro-address-workspace" role="presentation" onClick={onClose}>
      <section
        className="meetro-address-sheet meetro-visual-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-manager-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div style={handle} />
        <header style={header}>
          <div>
            <p style={eyebrow}>{t("savedAddresses")}</p>
            <h2 id="address-manager-title" style={title}>
              {editing ? (editingId ? t("editAddress") : t("addAddress")) : t("manageAddresses")}
            </h2>
          </div>
          <button type="button" style={closeButton} onClick={onClose} aria-label={t("close")}>×</button>
        </header>

        {editing ? (
          <form style={formGrid} onSubmit={saveAddress} noValidate>
            <label style={fieldLabel}>
              {t("addressLabel")}
              <select style={inputStyle} value={form.label} onChange={(event) => updateField("label", event.target.value)}>
                {PERSONAL_ADDRESS_LABELS.map((label) => <option key={label} value={label}>{t(`addressLabel${label[0].toUpperCase()}${label.slice(1)}`)}</option>)}
              </select>
            </label>
            <AddressField id="personal-address-street1" label={t("streetAddress")} value={form.street1} error={errors.street1} onChange={(value) => updateField("street1", value)} />
            <AddressField id="personal-address-street2" label={t("apartmentUnit")} value={form.street2} onChange={(value) => updateField("street2", value)} />
            <div style={twoColumnGrid}>
              <AddressField id="personal-address-city" label={t("city")} value={form.city} error={errors.city} onChange={(value) => updateField("city", value)} />
              <AddressField id="personal-address-state" label={t("state")} value={form.state} error={errors.state} onChange={(value) => updateField("state", value)} />
            </div>
            <div style={twoColumnGrid}>
              <AddressField id="personal-address-postal" label={t("zipCode")} value={form.postalCode} error={errors.postalCode} inputMode="numeric" onChange={(value) => updateField("postalCode", value)} />
              <AddressField id="personal-address-country" label={t("country")} value={form.country} error={errors.country} onChange={(value) => updateField("country", value)} />
            </div>
            {editingId && (
              <button type="button" style={deleteButton} onClick={() => removeAddress(editingId)}>
                <MeetroIcon name="delete" size={18} decorative /> {t("deleteAddress")}
              </button>
            )}
            <div style={actionRow}>
              <button type="button" style={secondaryButton} onClick={cancelEdit}>{t("cancel")}</button>
              <button type="submit" className="meetro-visual-primary-button" style={primaryButton}>{t("saveAddress")}</button>
            </div>
          </form>
        ) : (
          <div style={listWrap}>
            {addresses.length ? addresses.map((address) => (
              <article key={address.id} style={addressCard}>
                <div style={addressCardHeader}>
                  <div style={addressIdentity}>
                    <span style={addressIcon}><MeetroIcon name="location" size={18} decorative /></span>
                    <div>
                      <strong>{t(`addressLabel${address.label[0].toUpperCase()}${address.label.slice(1)}`)}</strong>
                      {address.isDefault && <span style={defaultBadge}>{t("defaultAddress")}</span>}
                    </div>
                  </div>
                  <button type="button" style={editButton} onClick={() => beginEdit(address)}>{t("editAddress")}</button>
                </div>
                <p style={addressText}>{formatPersonalAddress(address)}</p>
                {!address.isDefault && (
                  <button type="button" style={defaultButton} onClick={() => onChange(setDefaultPersonalAddress(address.id))}>{t("setAsDefault")}</button>
                )}
              </article>
            )) : (
              <div className="meetro-visual-empty-state" style={emptyState}>
                <MeetroIcon name="location" size={28} decorative />
                <strong>{t("noSavedAddresses")}</strong>
              </div>
            )}
            <button type="button" className="meetro-visual-primary-button" style={addButton} onClick={beginAdd}>
              <MeetroIcon name="add" size={18} decorative /> {t("addAddress")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function AddressField({ id, label, value, error, onChange, inputMode }) {
  return (
    <label htmlFor={id} style={fieldLabel}>
      {label}
      <input id={id} style={{ ...inputStyle, ...(error ? errorInput : {}) }} value={value} inputMode={inputMode} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} />
      {error && <span id={`${id}-error`} role="alert" style={errorText}>{error}</span>}
    </label>
  );
}

const handle = { width: 52, height: 5, borderRadius: 999, background: "#c8c4b8", margin: "0 auto 14px" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 };
const eyebrow = { margin: "0 0 4px", color: "var(--meetro-color-forest, #1f4d34)", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const title = { margin: 0, color: "#13261b", fontSize: 24, lineHeight: 1.2 };
const closeButton = { width: 44, height: 44, borderRadius: 999, border: "1px solid #d9d2c2", background: "#fffdf8", color: "#173c28", fontSize: 28, cursor: "pointer" };
const formGrid = { display: "grid", gap: 14, paddingBottom: "max(24px, env(safe-area-inset-bottom))" };
const fieldLabel = { display: "grid", gap: 7, color: "#23372c", fontSize: 14, fontWeight: 800, minWidth: 0 };
const inputStyle = { width: "100%", minWidth: 0, minHeight: 48, boxSizing: "border-box", borderRadius: 8, border: "1px solid #d9d2c2", background: "#fffdf8", color: "#17251d", padding: "11px 12px", fontSize: 16, outlineColor: "#315f42" };
const errorInput = { borderColor: "#a33a32" };
const errorText = { color: "#9a302b", fontSize: 13, fontWeight: 700 };
const twoColumnGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: 12 };
const actionRow = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 4 };
const secondaryButton = { minHeight: 48, borderRadius: 8, border: "1px solid #bdb5a4", background: "#fffdf8", color: "#244532", fontWeight: 800, cursor: "pointer" };
const primaryButton = { minHeight: 48, borderRadius: 8, cursor: "pointer" };
const deleteButton = { minHeight: 44, justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 8, border: 0, background: "transparent", color: "#9a302b", fontWeight: 800, cursor: "pointer" };
const listWrap = { display: "grid", gap: 12, paddingBottom: "max(24px, env(safe-area-inset-bottom))" };
const addressCard = { border: "1px solid #ddd5c5", borderRadius: 8, padding: 16, background: "#fffdf8", boxShadow: "0 8px 20px rgba(34, 53, 41, 0.06)" };
const addressCardHeader = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 };
const addressIdentity = { display: "flex", alignItems: "center", gap: 10, minWidth: 0 };
const addressIcon = { width: 36, height: 36, borderRadius: 999, display: "grid", placeItems: "center", background: "#e8efe7", color: "#28553a", flexShrink: 0 };
const defaultBadge = { display: "block", width: "fit-content", marginTop: 4, color: "#315f42", background: "#e5eee3", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 800 };
const editButton = { minHeight: 44, border: 0, background: "transparent", color: "#28553a", fontWeight: 800, cursor: "pointer" };
const addressText = { margin: "12px 0 4px", color: "#546357", lineHeight: 1.55, overflowWrap: "anywhere" };
const defaultButton = { minHeight: 44, border: 0, background: "transparent", color: "#315f42", fontWeight: 800, padding: "8px 0", cursor: "pointer" };
const emptyState = { display: "grid", justifyItems: "center", gap: 10, padding: 28, color: "#526257" };
const addButton = { minHeight: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, cursor: "pointer" };
