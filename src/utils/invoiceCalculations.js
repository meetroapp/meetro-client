import {
  calculateCustomerTotal,
  calculateLaborTotal,
  calculateMaterialLineTotal,
  moneyValue,
  normalizeLaborPricingType,
} from "./pricingCalculations.js";

export { moneyValue };

export function calculateInvoiceLineItemAmount(item = {}) {
  return calculateMaterialLineTotal(item);
}

export function normalizeInvoiceLineItems(lineItems = []) {
  if (!Array.isArray(lineItems)) return [];

  return lineItems.map((item, index) => {
    const quantity = item?.quantity ?? "";
    const unitPrice = item?.unitPrice ?? item?.unit_price ?? "";
    const amount = calculateInvoiceLineItemAmount({ quantity, unitPrice });

    return {
      id: item?.id || `line_item_${index + 1}`,
      type: item?.type || item?.category || "service fee",
      description: item?.description || "",
      quantity,
      unitPrice,
      amount,
    };
  });
}

export function calculateInvoiceTotals({
  lineItems = [],
  laborPricingType = "flat_fee",
  laborFee,
  laborHours = "",
  laborRate = "",
  labor = "",
  materials = "",
  serviceFee = "",
  otherCharges = "",
  discount = "",
  tax = "",
} = {}) {
  const normalizedLineItems = normalizeInvoiceLineItems(lineItems);
  const lineItemsSubtotal = normalizedLineItems.reduce(
    (sum, item) => sum + moneyValue(item.amount),
    0
  );
  const lineItemLaborTotal = normalizedLineItems
    .filter((item) => item.type === "labor")
    .reduce((sum, item) => sum + moneyValue(item.amount), 0);
  const lineItemMaterialsTotal = normalizedLineItems
    .filter((item) => item.type === "materials")
    .reduce((sum, item) => sum + moneyValue(item.amount), 0);
  const lineItemOtherTotal = normalizedLineItems
    .filter((item) => !["labor", "materials"].includes(item.type))
    .reduce((sum, item) => sum + moneyValue(item.amount), 0);
  const normalizedLaborPricingType = normalizeLaborPricingType(laborPricingType);
  const laborTotal =
    lineItemsSubtotal > 0
      ? lineItemLaborTotal
      : lineItemLaborTotal > 0
      ? lineItemLaborTotal
      : calculateLaborTotal({
          laborPricingType: normalizedLaborPricingType,
          laborFee: laborFee ?? labor,
          laborHours,
          laborRate,
          labor,
        });
  const materialsTotal =
    lineItemsSubtotal > 0
      ? lineItemMaterialsTotal
      : lineItemMaterialsTotal > 0
      ? lineItemMaterialsTotal
      : moneyValue(materials);
  const fallbackSubtotal =
    laborTotal +
    materialsTotal +
    lineItemOtherTotal +
    moneyValue(serviceFee) +
    moneyValue(otherCharges);
  const subtotal = fallbackSubtotal;
  const discountTotal = moneyValue(discount);
  const taxTotal = moneyValue(tax);
  const totalDue = calculateCustomerTotal({
    subtotal,
    discount: discountTotal,
    tax: taxTotal,
  });

  return {
    lineItems: normalizedLineItems,
    lineItemsSubtotal,
    laborPricingType: normalizedLaborPricingType,
    laborTotal,
    materialsTotal,
    lineItemOtherTotal,
    fallbackSubtotal,
    subtotal,
    discountTotal,
    taxTotal,
    totalDue,
    usesLineItems: lineItemsSubtotal > 0,
  };
}
