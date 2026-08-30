import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import {
  fetchProfessionalSubscription,
  verifyProfessionalSubscription,
} from "../utils/subscriptionApi";
import {
  isIosStoreKitAvailable,
  loadStoreKitProducts,
  manageStoreKitSubscription,
  purchaseStoreKitSubscription,
  restoreStoreKitSubscriptions,
} from "../utils/storeKitSubscriptions";

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

export default function ProfessionalSubscription({ setPage }) {
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
    const ids = (loaded.catalog || []).map((plan) => plan.providerProductId).filter(Boolean);
    if (nativeIos && ids.length) {
      const store = await loadStoreKitProducts(ids);
      setProducts(Array.isArray(store?.products) ? store.products : []);
    }
    return loaded;
  }, [nativeIos, setPage]);

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
      const result = await purchaseStoreKitSubscription({
        productId: plan.providerProductId,
        appAccountToken: state.appAccountToken,
      });
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

      {state?.qaAccess && (
        <div style={qaStyle}>Staging QA access is active. It cannot activate in production.</div>
      )}

      {subscription && (
        <section style={statusCardStyle} aria-label="Current subscription">
          <div><span style={labelStyle}>Status</span><strong>{statusCopy(subscription)}</strong></div>
          <div><span style={labelStyle}>Current plan</span><strong>{subscription.plan?.includes("5_USER") ? "Up to 5 users" : "Up to 2 users"}</strong></div>
          <div><span style={labelStyle}>Seats included</span><strong>{subscription.seatLimit}</strong></div>
          {subscription.trialEndsAt && <div><span style={labelStyle}>Trial ends</span><strong>{dateLabel(subscription.trialEndsAt)}</strong></div>}
          {!subscription.trialEndsAt && subscription.accessEndsAt && <div><span style={labelStyle}>{subscription.willAutoRenew ? "Renews" : "Access until"}</span><strong>{dateLabel(subscription.accessEndsAt)}</strong></div>}
        </section>
      )}

      <section style={plansGridStyle} aria-label="Professional plans">
        {(state?.catalog || []).map((plan) => {
          const storeProduct = productsById.get(plan.providerProductId);
          const eligibleTrial = storeProduct?.trialEligible === true && Boolean(storeProduct?.introductoryOffer);
          const displayPrice = storeProduct?.displayPrice || `$${(plan.amountMinor / 100).toFixed(2)}`;
          const purchaseReady = nativeIos && plan.providerConfigured && Boolean(storeProduct);
          return (
            <article key={plan.code} style={planCardStyle}>
              <p style={eyebrowStyle}>{plan.seatLimit === 2 ? "PLAN A" : "PLAN B"}</p>
              <h2 style={planTitleStyle}>Up to {plan.seatLimit} users</h2>
              {eligibleTrial ? <p style={trialStyle}>14 days free</p> : <p style={providerCopyStyle}>Trial eligibility checked by Apple</p>}
              <p style={priceStyle}>{eligibleTrial ? "Then " : ""}{displayPrice}<span style={monthStyle}> / month</span></p>
              <p style={copyStyle}>Owner counts as one included professional user.</p>
              <button
                type="button"
                style={{ ...purchaseStyle, opacity: purchaseReady ? 1 : 0.55 }}
                disabled={!purchaseReady || Boolean(busy)}
                onClick={() => purchase(plan)}
              >
                {busy === plan.code ? "Working…" : subscription ? "Choose this plan" : "Start with Apple"}
              </button>
              {!purchaseReady && <p style={providerCopyStyle}>{nativeIos ? "Apple product configuration is required." : "Purchase in the Meetro iPhone app."}</p>}
            </article>
          );
        })}
      </section>

      <section style={actionsStyle}>
        {nativeIos && <button type="button" style={secondaryStyle} disabled={Boolean(busy)} onClick={restore}>Restore Purchases</button>}
        <button type="button" style={secondaryStyle} onClick={() => manageStoreKitSubscription().catch(() => setError("Subscription management is unavailable."))}>Manage Subscription</button>
      </section>
      <p style={footnoteStyle}>Apple determines trial eligibility, renewal timing, cancellations, and billing status. Meetro unlocks professional access only after server verification.</p>
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
const trialStyle = { color: "#17613f", background: "#e8f6ed", borderRadius: 999, display: "inline-block", padding: "7px 12px", fontWeight: 800 };
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
const qaStyle = { background: "#fff8df", color: "#6d5313", borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 14 };
const footnoteStyle = { color: "#687872", fontSize: 13, lineHeight: 1.5, marginTop: 18 };
