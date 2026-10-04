import { Capacitor, registerPlugin } from "@capacitor/core";

const StoreKitSubscriptions = registerPlugin("StoreKitSubscriptions");

export function isIosStoreKitAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function loadStoreKitProducts(productIds) {
  if (!isIosStoreKitAvailable()) return { products: [] };
  return StoreKitSubscriptions.loadProducts({ productIds: productIds.filter(Boolean) });
}

export async function purchaseStoreKitSubscription({ productId, appAccountToken }) {
  if (!isIosStoreKitAvailable()) {
    const error = new Error("Purchases are available in the Meetro iPhone app.");
    error.code = "IOS_PURCHASE_REQUIRED";
    throw error;
  }
  return StoreKitSubscriptions.purchase({ productId, appAccountToken });
}

export async function restoreStoreKitSubscriptions() {
  if (!isIosStoreKitAvailable()) return { transactions: [] };
  return StoreKitSubscriptions.restorePurchases();
}

export async function manageStoreKitSubscription() {
  if (isIosStoreKitAvailable()) return StoreKitSubscriptions.manageSubscription();
  window.open("https://apps.apple.com/account/subscriptions", "_blank", "noopener,noreferrer");
  return { opened: true };
}
