function cleanName(value = "") {
  return String(value || "").trim();
}

export function getWorkCenterContextReturnLabel({
  language = "en",
  customerName = "",
} = {}) {
  const name = cleanName(customerName);
  if (!name) {
    return language === "es" ? "Volver a Work Center" : "Back to Work Center";
  }

  return language === "es"
    ? `Volver al trabajo de ${name}`
    : `Back to ${name} Job`;
}
