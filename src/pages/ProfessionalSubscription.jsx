import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import {
  createStripeSubscriptionCheckout,
  fetchProfessionalSubscription,
  manageProfessionalSubscription,
  verifyProfessionalSubscription,
} from "../utils/subscriptionApi";
import {
  isIosStoreKitAvailable,
  loadStoreKitProducts,
  manageStoreKitSubscription,
  purchaseStoreKitSubscription,
  restoreStoreKitSubscriptions,
} from "../utils/storeKitSubscriptions";
import {
  getSubscriptionPlanAction,
  getSubscriptionPurchaseChannel,
} from "../utils/subscriptionPlanPresentation";

function dateLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function statusCopy(subscription) {
  const labels = {
    TRIAL: "Free trial",
    ACTIVE: "Active",
    GRACE: "Payment issue — access remains available",
    CANCELED_AT_PERIOD_END: "Canceled",
    EXPIRED: "Expired",
    REVOKED: "Revoked",
  };
  return labels[subscription?.status] || "Plan required";
}

const INCLUDED_BUSINESS_FEATURES = [
  "Work Center",
  "Customer Communication",
  "Evaluations & Scheduling",
  "Quotes & Approvals",
  "Deposit & Payment Tracking",
  "Invoicing",
  "Leads & Urgent/Emergency Opportunities",
  "Alerts",
  "Business Profile & Portfolio",
  "Web + iPhone access",
];

function fallbackPlanName(plan) {
  if (plan?.seatLimit === 2) return "Starter";
  if (plan?.seatLimit === 5) return "Growth";
  if (plan?.seatLimit === 10) return "Professional";
  return "Meetro Business";
}

function fallbackPlanPositioning(plan) {
  if (plan?.seatLimit === 2) return "For small businesses";
  if (plan?.seatLimit === 5) return "For growing teams";
  if (plan?.seatLimit === 10) return "For established teams";
  return "For professional businesses";
}

export default function ProfessionalSubscription({ setPage, onSubscriptionState }) {
  const [state, setState] = useState(null);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const nativeIos = isIosStoreKitAvailable();

  const refresh = useCallback(async () => {
    setError("");
    const loaded = await fetchProfessionalSubscription(setPage);
    setState(loaded);
    onSubscriptionState?.(loaded);
    const ids = (loaded.catalog || []).map((plan) => plan.providerProductId).filter(Boolean);
    if (nativeIos && ids.length) {
      const store = await loadStoreKitProducts(ids);
      setProducts(Array.isArray(store?.products) ? store.products : []);
    }
    return loaded;
  }, [nativeIos, onSubscriptionState, setPage]);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(refresh)
      .catch((cause) => {
        if (active) setError(cause.message || "Subscription information is unavailable.");
      });
    return () => { active = false; };
  }, [refresh]);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const purchase = async (plan) => {
    setBusy(plan.code);
    setError("");
    setMessage("");
    try {
      if (!nativeIos) {
        const checkout = await createStripeSubscriptionCheckout(plan.code, setPage);
        if (!checkout?.url) throw new Error("Web checkout is unavailable.");
        window.location.assign(checkout.url);
        return;
      }
      const result = await purchaseStoreKitSubscription({ productId: plan.providerProductId, appAccountToken: state.appAccountToken });
      if (result?.state === "cancelled") setMessage("Purchase canceled. No charge was made.");
      else if (result?.state === "pending") setMessage("Purchase pending. Access will update after Apple confirms it.");
      else if (result?.state === "verified") {
        await verifyProfessionalSubscription(result, setPage);
        await refresh();
        setMessage("Your verified Meetro plan is active.");
      }
    } catch (cause) {
      setError(cause.message || "The subscription could not be completed.");
    } finally {
      setBusy("");
    }
  };

  const manage = async () => {
    setBusy("manage");
    setError("");
    try {
      const result = await manageProfessionalSubscription(setPage);
      if (result.provider === "APPLE_APP_STORE" && nativeIos) {
        await manageStoreKitSubscription();
      } else if (result.url) {
        window.location.assign(result.url);
      } else throw new Error("Subscription management is unavailable.");
    } catch (cause) {
      setError(cause.message || "Subscription management is unavailable.");
    } finally { setBusy(""); }
  };

  const restore = async () => {
    setBusy("restore");
    setError("");
    setMessage("");
    try {
      const restored = await restoreStoreKitSubscriptions();
      const transactions = Array.isArray(restored?.transactions) ? restored.transactions : [];
      for (const transaction of transactions) {
        await verifyProfessionalSubscription(transaction, setPage, { restore: true });
      }
      await refresh();
      setMessage(transactions.length ? "Purchases restored." : "No current Apple subscription was found.");
    } catch (cause) {
      setError(cause.message || "Purchases could not be restored.");
    } finally {
      setBusy("");
    }
  };

  const subscription = state?.subscription;
  const currentPlan = (state?.catalog || []).find((plan) => plan.code === subscription?.plan);
  return (
    <div className="app-page subscription-page" style={pageStyle}>
      <header style={headerStyle}>
        <button type="button" style={backStyle} onClick={() => setPage("businessCommandCenter")}>← Back</button>
        <p style={eyebrowStyle}>MEETRO COMMUNITY</p>
        <h1 style={titleStyle}>Plan & Subscription</h1>
        <p style={copyStyle}>One business plan covers the owner and included professional users.</p>
      </header>

      {error && <div role="alert" style={errorStyle}>{error}</div>}
      {message && <div role="status" style={messageStyle}>{message}</div>}

      {state?.qaAccess && !subscription && (
        <section style={qaStyle} aria-label="Staging QA Access">
          <p style={eyebrowStyle}>STAGING ONLY</p>
          <h2 style={qaTitleStyle}>Staging QA Access</h2>
          <p style={qaCopyStyle}>Full professional access for testing.</p>
          <p style={qaCopyStyle}>No Apple or Stripe subscription is active.</p>
          <p style={qaCopyStyle}>This staging-only access cannot activate in production.</p>
        </section>
      )}

      {subscription && (
        <section style={statusCardStyle} aria-label="Current subscription">
          <div><span style={labelStyle}>Status</span><strong>{statusCopy(subscription)}</strong></div>
          <div><span style={labelStyle}>Current plan</span><strong>{currentPlan?.name || fallbackPlanName({ seatLimit: subscription.seatLimit })} · Up to {subscription.seatLimit} users</strong></div>
          <div><span style={labelStyle}>Seats included</span><strong>{subscription.seatLimit}</strong></div>
          <div><span style={labelStyle}>Billing provider</span><strong>{subscription.provider === "STRIPE" ? "Web / Stripe" : "Apple App Store"}</strong></div>
          {subscription.trialEndsAt && <div><span style={labelStyle}>Trial ends</span><strong>{dateLabel(subscription.trialEndsAt)}</strong></div>}
          {!subscription.trialEndsAt && subscription.accessEndsAt && <div><span style={labelStyle}>{subscription.willAutoRenew ? "Renews" : "Access until"}</span><strong>{dateLabel(subscription.accessEndsAt)}</strong></div>}
        </section>
      )}

      <section style={plansGridStyle} aria-label="Professional plans">
        {(state?.catalog || []).map((plan) => {
          const storeProduct = productsById.get(plan.providerProductId);
          const displayPrice = storeProduct?.displayPrice || `$${(plan.amountMinor / 100).toFixed(2)}`;
          const channel = getSubscriptionPurchaseChannel({ nativeIos, plan, storeProduct });
          const action = getSubscriptionPlanAction({
            qaAccess: state?.qaAccess,
            entitled: state?.entitled,
            subscription,
            planCode: plan.code,
            providerReady: channel.providerReady,
            trialOffered: channel.trialOffered,
            nativeIos,
          });
          const planName = plan.name || fallbackPlanName(plan);
          const positioning = plan.positioning || fallbackPlanPositioning(plan);
          return (
            <article key={plan.code} style={planCardStyle}>
              <p style={eyebrowStyle}>{planName.toUpperCase()}</p>
              <h2 style={planTitleStyle}>{positioning}</h2>
              <p style={seatStyle}>Up to {plan.seatLimit} professional users</p>
              <p style={channel.trialOffered ? trialStyle : providerCopyStyle}>{channel.eligibilityLabel}</p>
              <p style={priceStyle}>{channel.trialOffered ? "Then " : ""}{displayPrice}<span style={monthStyle}> / month</span></p>
              <p style={trialCopyStyle}>{channel.trialOffered ? `Free for 14 days, then ${displayPrice}/month. Cancel anytime.` : `${displayPrice}/month. ${channel.providerName} determines trial eligibility.`}</p>
              <p style={copyStyle}>Owner counts as one included professional user.</p>
              {action.kind === "purchase" ? (
                <button
                  type="button"
                  style={{ ...purchaseStyle, opacity: action.enabled ? 1 : 0.55 }}
                  disabled={!action.enabled || Boolean(busy)}
                  onClick={() => purchase(plan)}
                >
                  {busy === plan.code ? "Working…" : action.label}
                </button>
              ) : (
                <p style={planStateStyle}>{action.label}</p>
              )}
              {!channel.providerReady && <p style={providerCopyStyle}>{channel.unavailableLabel}</p>}
              {channel.providerReady && <p style={providerCopyStyle}>{channel.governanceLabel}</p>}
            </article>
          );
        })}
      </section>

      <section style={includedStyle} aria-labelledby="included-business-features">
        <p style={eyebrowStyle}>COMPLETE BUSINESS PLATFORM</p>
        <h2 id="included-business-features" style={includedTitleStyle}>Included with every Meetro Business plan</h2>
        <p style={copyStyle}>Choose based on team size. Every plan includes the same core business workflows.</p>
        <ul style={featureGridStyle}>
          {INCLUDED_BUSINESS_FEATURES.map((feature) => <li key={feature} style={featureStyle}>✓ {feature}</li>)}
        </ul>
      </section>

      {(subscription || (nativeIos && !state?.qaAccess)) && (
        <section style={actionsStyle}>
          {nativeIos && subscription?.provider !== "STRIPE" && <button type="button" style={secondaryStyle} disabled={Boolean(busy)} onClick={restore}>Restore Purchases</button>}
          {subscription && <button type="button" style={secondaryStyle} disabled={Boolean(busy)} onClick={manage}>Manage Subscription</button>}
        </section>
      )}
      <p style={footnoteStyle}>{nativeIos ? "Apple" : "Stripe"} determines trial eligibility and purchase status for this channel. One verified Meetro business entitlement works on web and iPhone; a second subscription is not required.</p>
      <BottomNav setPage={setPage} currentPage="professionalSubscription" />
    </div>
  );
}

const pageStyle = { maxWidth: 1040, margin: "0 auto", padding: "24px 18px 120px", color: "#17352b" };
const headerStyle = { marginBottom: 22 };
const backStyle = { border: 0, background: "transparent", color: "#245c48", fontWeight: 700, padding: "8px 0", cursor: "pointer" };
const eyebrowStyle = { margin: "10px 0 5px", color: "#517266", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em" };
const titleStyle = { margin: 0, fontSize: "clamp(28px, 5vw, 42px)" };
const copyStyle = { color: "#5c6f68", lineHeight: 1.5 };
const plansGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginTop: 18 };
const planCardStyle = { border: "1px solid #d7e3de", borderRadius: 18, background: "#fff", padding: 22, boxShadow: "0 8px 24px rgba(23,53,43,.07)" };
const planTitleStyle = { margin: "4px 0 14px", fontSize: 24 };
const seatStyle = { color: "#254e40", fontSize: 17, fontWeight: 750, margin: "0 0 12px" };
const trialStyle = { color: "#17613f", background: "#e8f6ed", borderRadius: 999, display: "inline-block", padding: "7px 12px", fontWeight: 800 };
const trialCopyStyle = { color: "#405c52", fontSize: 14, lineHeight: 1.45, minHeight: 40 };
const providerCopyStyle = { color: "#6b7772", fontSize: 13, minHeight: 20 };
const priceStyle = { fontSize: 30, fontWeight: 850, margin: "12px 0" };
const monthStyle = { fontSize: 15, fontWeight: 600, color: "#65756f" };
const purchaseStyle = { width: "100%", minHeight: 48, border: 0, borderRadius: 12, background: "#135c3b", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" };
const actionsStyle = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 };
const secondaryStyle = { minHeight: 44, padding: "0 16px", borderRadius: 11, border: "1px solid #9db6ac", background: "white", color: "#174c39", fontWeight: 750, cursor: "pointer" };
const statusCardStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, background: "#edf7f0", border: "1px solid #cce2d3", borderRadius: 16, padding: 18 };
const labelStyle = { display: "block", color: "#60766e", fontSize: 12, fontWeight: 700, marginBottom: 4 };
const errorStyle = { background: "#fff1ef", color: "#8c2f24", borderRadius: 12, padding: 14, marginBottom: 14 };
const messageStyle = { background: "#edf7f0", color: "#185d3d", borderRadius: 12, padding: 14, marginBottom: 14 };
const qaStyle = { background: "#fff8df", color: "#6d5313", border: "1px solid #eedb9e", borderRadius: 16, padding: "16px 18px", marginBottom: 18 };
const qaTitleStyle = { margin: "4px 0 8px", fontSize: 22 };
const qaCopyStyle = { margin: "5px 0", lineHeight: 1.45, fontSize: 14 };
const planStateStyle = { minHeight: 48, margin: 0, borderRadius: 12, background: "#edf3f0", color: "#405c52", display: "grid", placeItems: "center", textAlign: "center", padding: "0 12px", fontSize: 14, fontWeight: 750 };
const includedStyle = { marginTop: 22, border: "1px solid #d7e3de", borderRadius: 18, background: "#f7fbf8", padding: 22 };
const includedTitleStyle = { margin: "4px 0 6px", fontSize: 24 };
const featureGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "10px 18px", listStyle: "none", margin: "18px 0 0", padding: 0 };
const featureStyle = { color: "#24533f", fontWeight: 700, lineHeight: 1.4 };
const footnoteStyle = { color: "#687872", fontSize: 13, lineHeight: 1.5, marginTop: 18 };
