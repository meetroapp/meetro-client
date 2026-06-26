export const LABOR_PRICING_TYPES = {
  FLAT_FEE: "flat_fee",
  HOURLY: "hourly",
};

export function moneyValue(value) {
  const amount = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeLaborPricingType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    [
      "hourly",
      "hour",
      "hours",
      "labor_hours",
      "materials_+_labor",
      "materials_and_labor",
      "time_and_materials",
      "time_materials",
    ].includes(normalized)
  ) {
    return LABOR_PRICING_TYPES.HOURLY;
  }

  return LABOR_PRICING_TYPES.FLAT_FEE;
}

export function calculateLaborTotal(model = {}) {
  const laborPricingType = normalizeLaborPricingType(
    model.laborPricingType ||
      model.labor_pricing_type ||
      model.pricingMethod ||
      model.pricing_method
  );

  if (laborPricingType === LABOR_PRICING_TYPES.HOURLY) {
    return moneyValue(
      model.laborHours ?? model.labor_hours ?? model.hours ?? model.quantity
    ) * moneyValue(model.laborRate ?? model.labor_rate ?? model.rate ?? model.unitPrice);
  }

  return moneyValue(
    model.laborFee ??
      model.labor_fee ??
      model.laborTotal ??
      model.labor_total ??
      model.laborAmount ??
      model.labor ??
      model.total
  );
}

export function calculateMaterialLineTotal(item = {}) {
  const explicitAmount = moneyValue(
    item.amount ?? item.total ?? item.lineTotal ?? item.line_total
  );

  const quantity = moneyValue(item.quantity ?? item.qty);
  const unitPrice = moneyValue(
    item.unitPrice ?? item.unit_price ?? item.price ?? item.cost
  );

  if (quantity > 0 && unitPrice > 0) {
    return quantity * unitPrice;
  }

  return explicitAmount;
}

export function normalizeMaterialLineItems(lineItems = []) {
  if (!Array.isArray(lineItems)) return [];

  return lineItems.map((item, index) => ({
    id: item.id || item.lineItemId || `material-${index + 1}`,
    type: item.type || item.category || "materials",
    description: item.description || item.name || item.label || "",
    quantity: item.quantity ?? item.qty ?? "",
    unitPrice: item.unitPrice ?? item.unit_price ?? item.price ?? item.cost ?? "",
    amount: calculateMaterialLineTotal(item),
  }));
}

export function calculateMaterialsTotal(model = {}) {
  const lines = normalizeMaterialLineItems(
    model.materialLineItems || model.material_line_items || model.materialItems || model.materialsItems || []
  );
  const lineTotal = lines.reduce((sum, item) => sum + item.amount, 0);

  if (lineTotal > 0) return lineTotal;

  return moneyValue(
    model.materialsTotal ??
      model.materials_total ??
      model.materialCost ??
      model.material_cost ??
      model.materialsAmount ??
      model.materials ??
      model.material
  );
}

function calculateLineItemsSubtotal(lineItems = []) {
  return normalizeMaterialLineItems(lineItems).reduce(
    (sum, item) => sum + item.amount,
    0
  );
}

function inferLegacyLaborFee(model = {}, materialsTotal = 0) {
  const knownLabor = moneyValue(
    model.laborFee ??
      model.labor_fee ??
      model.laborTotal ??
      model.labor_total ??
      model.laborAmount ??
      model.labor
  );

  if (knownLabor > 0) return null;

  const total = moneyValue(
    model.total ??
      model.totalAmount ??
      model.total_amount ??
      model.quoteTotal ??
      model.invoiceTotal ??
      model.customerTotal ??
      model.amount
  );

  if (total <= 0) return null;

  const fees = moneyValue(model.serviceFee ?? model.service_fee) +
    moneyValue(model.otherCharges ?? model.other_charges) +
    moneyValue(model.fees ?? model.feesAmount);
  const tax = moneyValue(model.tax ?? model.taxAmount);
  const discount = moneyValue(model.discount ?? model.discountAmount);
  const inferred = total - materialsTotal - fees - tax + discount;

  return inferred >= 0 ? inferred : null;
}

export function normalizePricingModel(model = {}) {
  const materialLineItems = normalizeMaterialLineItems(
    model.materialLineItems || model.materialItems || model.quoteMaterials || []
  );
  const materialsTotal = calculateMaterialsTotal({
    ...model,
    materialLineItems,
  });

  const inferredLegacyLaborFee = inferLegacyLaborFee(model, materialsTotal);
  const laborPricingType =
    inferredLegacyLaborFee !== null
      ? LABOR_PRICING_TYPES.FLAT_FEE
      : normalizeLaborPricingType(
          model.laborPricingType ||
            model.labor_pricing_type ||
            model.pricingMethod ||
            model.pricing_method
        );

  const laborModel = {
    ...model,
    laborPricingType,
    laborFee:
      inferredLegacyLaborFee ??
      model.laborFee ??
      model.labor_fee ??
      model.laborTotal ??
      model.labor_total ??
      model.laborAmount ??
      model.labor,
  };
  const laborTotal = calculateLaborTotal(laborModel);
  const lineItemsSubtotal = calculateLineItemsSubtotal(model.lineItems || []);
  const serviceFee = moneyValue(model.serviceFee ?? model.service_fee);
  const otherCharges = moneyValue(model.otherCharges ?? model.other_charges);
  const feesTotal = moneyValue(model.fees ?? model.feesAmount) + serviceFee + otherCharges;
  const discountTotal = moneyValue(model.discount ?? model.discountAmount);
  const taxTotal = moneyValue(model.tax ?? model.taxAmount);
  const subtotal =
    moneyValue(model.subtotal) ||
    lineItemsSubtotal + laborTotal + materialsTotal + feesTotal;
  const customerTotal = calculateCustomerTotal({
    subtotal,
    discount: discountTotal,
    tax: taxTotal,
  });

  return {
    laborPricingType,
    laborTotal,
    materialsTotal,
    materialLineItems,
    lineItemsSubtotal,
    feesTotal,
    discountTotal,
    taxTotal,
    subtotal,
    customerTotal,
    legacyLaborInferred: inferredLegacyLaborFee !== null,
  };
}

export function calculateCustomerTotal(model = {}) {
  const subtotal =
    model.subtotal !== undefined
      ? moneyValue(model.subtotal)
      : calculateLaborTotal(model.laborPricing || model) +
        calculateMaterialsTotal(model) +
        moneyValue(model.fees ?? model.feesAmount) +
        moneyValue(model.serviceFee ?? model.service_fee) +
        moneyValue(model.otherCharges ?? model.other_charges);

  return Math.max(
    subtotal -
      moneyValue(model.discount ?? model.discountTotal ?? model.discountAmount) +
      moneyValue(model.tax ?? model.taxTotal ?? model.taxAmount),
    0
  );
}
