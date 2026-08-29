import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkCenterEmptyState, WorkCenterStatusPill } from "./WorkCenterWorkspaceSystem.jsx";
import { fetchProfessionalPreWorkDeposit } from "../utils/preWorkDepositApi.js";
import {
  createWorkPreparationIdempotencyKey,
  fetchWorkPreparation,
  formatWorkPreparationMoney,
  materializeWorkPreparation,
  recordWorkPreparationEvent,
  recordWorkPreparationPurchase,
  reviseWorkPreparation,
} from "../utils/workPreparationApi.js";
import { getWorkPreparationCopy } from "../utils/workPreparationLanguage.js";

const EMPTY_STATE = Object.freeze({ status: "loading", plan: null, decision: null, error: "" });

function localDateTime() {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return now.toISOString().slice(0, 16);
}

function majorToMinor(value, { allowZero = false } = {}) {
  const normalized = String(value ?? "").trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [major, fraction = ""] = normalized.split(".");
  const minor = Number(major) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor >= (allowZero ? 0 : 1) ? minor : null;
}

function minorToMajor(value) {
  return Number.isSafeInteger(value) ? (value / 100).toFixed(2) : "";
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stateLabel(value, copy) {
  const labels = {
    PLANNING: copy.planning, PLANNED: copy.ready, RETIRED: titleCase(value),
    NOT_REQUIRED: copy.none, NOT_STARTED: copy.notStarted, IN_PROGRESS: copy.inProgress,
    READY: copy.ready, PURCHASED: copy.purchased, PARTIALLY_PURCHASED: copy.partiallyPurchased,
    CUSTOMER_ITEM_PENDING: copy.customerItemPendingState, BLOCKED: copy.blocked,
  };
  return labels[value] || titleCase(value);
}

function itemKindLabel(value, copy) {
  return ({ MATERIAL: copy.material, TOOL: copy.tool, EQUIPMENT: copy.equipment,
    PREPARATION_TASK: copy.preparationTask })[value] || titleCase(value);
}

function commercialLabel(value, copy) {
  return ({ INCLUDED_IN_ACCEPTED_TOTAL: copy.included, NOT_CUSTOMER_BILLABLE: copy.notBillable,
    CUSTOMER_SUPPLIED: copy.customerSupplied, APPROVAL_REQUIRED: copy.approvalRequired,
    SEPARATELY_ACCEPTED: copy.separatelyAccepted, ALLOWANCE: copy.allowance })[value] || titleCase(value);
}

function toneForState(value) {
  if (["READY", "SATISFIED", "NOT_REQUIRED", "PLANNED"].includes(value)) return "success";
  if (["BLOCKED", "DUE", "PARTIALLY_SATISFIED", "RECONCILIATION_REQUIRED"].includes(value)) return "warning";
  return "neutral";
}

function editorFromPlan(plan) {
  return {
    planningState: plan.planningState,
    workStartPolicy: plan.workStartPolicy,
    internalNotes: plan.internalNotes || "",
    items: plan.items.map((item) => ({
      id: item.id,
      sequence: item.sequence,
      kind: item.kind,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      providerResponsibility: item.providerResponsibility,
      commercialTreatment: item.commercialTreatment,
      visibility: item.visibility,
      requiredForWorkStart: item.requiredForWorkStart,
      internalEstimatedCost: minorToMajor(item.internalEstimatedCostMinor),
      internalCostCurrency: item.internalCostCurrency || plan.purchaseSummary.currency,
      sourceLineage: item.sourceLineage,
      sourceScopeItemId: item.sourceScopeItemId,
    })),
  };
}

function newItem(sequence, currency) {
  return {
    sequence, kind: "MATERIAL", description: "", quantity: "1", unit: "each",
    providerResponsibility: "BUSINESS", commercialTreatment: "NOT_CUSTOMER_BILLABLE",
    visibility: "BUSINESS_ONLY", requiredForWorkStart: false,
    internalEstimatedCost: "", internalCostCurrency: currency,
    sourceLineage: "ACCEPTED_SCOPE_ELABORATION", sourceScopeItemId: null,
  };
}

function normalizeEditorItem(item) {
  const estimated = item.internalEstimatedCost === ""
    ? null : majorToMinor(item.internalEstimatedCost, { allowZero: true });
  if (!item.description.trim() || !Number(item.quantity) || !item.unit.trim() ||
    (item.internalEstimatedCost !== "" && estimated == null)) return null;
  return {
    ...(item.id ? { id: item.id } : {}),
    sequence: item.sequence,
    kind: item.kind,
    description: item.description.trim(),
    quantity: Number(item.quantity),
    unit: item.unit.trim(),
    providerResponsibility: item.providerResponsibility,
    commercialTreatment: item.commercialTreatment,
    visibility: item.visibility,
    requiredForWorkStart: item.requiredForWorkStart,
    internalEstimatedCostMinor: estimated,
    internalCostCurrency: estimated == null ? null : item.internalCostCurrency,
    sourceLineage: item.sourceLineage,
    sourceScopeItemId: item.sourceScopeItemId,
  };
}

function PurchaseForm({ item, plan, copy, busy, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    quantity: String(item.quantity), unit: item.unit, internalCost: "",
    vendor: "", purchasedAt: localDateTime(), externalReference: "",
  });
  const [error, setError] = useState("");
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  return (
    <form
      style={styles.formCard}
      onSubmit={(event) => {
        event.preventDefault();
        const cost = form.internalCost === "" ? null : majorToMinor(form.internalCost);
        if (!Number(form.quantity) || !form.unit.trim() || !form.purchasedAt ||
          (form.internalCost !== "" && cost == null)) {
          setError(copy.invalidForm);
          return;
        }
        setError("");
        onSubmit({
          quantity: Number(form.quantity), unit: form.unit.trim(), internalCostMinor: cost,
          internalCostCurrency: cost == null ? null : plan.purchaseSummary.currency,
          vendor: form.vendor.trim() || null,
          purchasedAt: new Date(form.purchasedAt).toISOString(),
          externalReference: form.externalReference.trim() || null,
          visibility: "BUSINESS_ONLY",
        });
      }}
    >
      <h4 style={styles.formTitle}>{copy.purchaseTitle}</h4>
      <div style={styles.formGrid}>
        <Field label={copy.quantity}><input style={styles.input} type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required /></Field>
        <Field label={copy.unit}><input style={styles.input} value={form.unit} onChange={(e) => update("unit", e.target.value)} maxLength={80} required /></Field>
        <Field label={`${copy.internalCost} (${plan.purchaseSummary.currency})`}><input style={styles.input} inputMode="decimal" value={form.internalCost} onChange={(e) => update("internalCost", e.target.value)} placeholder="0.00" /></Field>
        <Field label={copy.vendor}><input style={styles.input} value={form.vendor} onChange={(e) => update("vendor", e.target.value)} maxLength={300} /></Field>
        <Field label={copy.purchasedAt}><input style={styles.input} type="datetime-local" value={form.purchasedAt} onChange={(e) => update("purchasedAt", e.target.value)} required /></Field>
        <Field label={copy.externalReference}><input style={styles.input} value={form.externalReference} onChange={(e) => update("externalReference", e.target.value)} maxLength={500} /></Field>
      </div>
      {error && <p role="alert" style={styles.errorText}>{error}</p>}
      <div style={styles.actions}>
        <button type="submit" style={styles.primaryButton} disabled={busy}>{busy ? copy.saving : copy.record}</button>
        <button type="button" style={styles.secondaryButton} disabled={busy} onClick={onCancel}>{copy.cancel}</button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span>{children}</label>;
}

function PlanEditor({ plan, copy, busy, onCancel, onSave }) {
  const [editor, setEditor] = useState(() => editorFromPlan(plan));
  const [error, setError] = useState("");
  const updateItem = (index, patch) => setEditor((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  }));
  const configureProvider = (index, provider) => updateItem(index, provider === "CUSTOMER"
    ? { providerResponsibility: "CUSTOMER", commercialTreatment: "CUSTOMER_SUPPLIED", internalEstimatedCost: "" }
    : { providerResponsibility: "BUSINESS", commercialTreatment: "NOT_CUSTOMER_BILLABLE" });
  return (
    <form
      style={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        const items = editor.items.map(normalizeEditorItem);
        if (items.some((item) => !item)) { setError(copy.invalidForm); return; }
        setError("");
        onSave({
          planningState: editor.planningState,
          workStartPolicy: editor.workStartPolicy,
          internalNotes: editor.internalNotes.trim() || null,
          items,
        });
      }}
    >
      <div style={styles.formGrid}>
        <Field label={copy.planningState}>
          <select style={styles.input} value={editor.planningState} onChange={(e) => setEditor((v) => ({ ...v, planningState: e.target.value }))}>
            <option value="PLANNING">{copy.planning}</option><option value="PLANNED">{copy.ready}</option>
          </select>
        </Field>
        <Field label={copy.workStartPolicy}>
          <select style={styles.input} value={editor.workStartPolicy} onChange={(e) => setEditor((v) => ({ ...v, workStartPolicy: e.target.value }))}>
            <option value="NONE">{copy.none}</option><option value="REQUIRED_ITEMS_READY">{copy.requiredItemsReady}</option>
          </select>
        </Field>
      </div>
      <Field label={copy.internalNotes}><textarea style={styles.textarea} value={editor.internalNotes} maxLength={5000} onChange={(e) => setEditor((v) => ({ ...v, internalNotes: e.target.value }))} /></Field>
      <div style={styles.editorItems}>
        {editor.items.map((item, index) => {
          const quoteItem = item.sourceLineage === "QUOTE_SCOPE_ITEM";
          return (
            <fieldset key={item.id || `new-${index}`} style={styles.fieldset}>
              <legend style={styles.legend}>{index + 1}. {item.description || copy.addItem}</legend>
              <div style={styles.formGrid}>
                <Field label={copy.description}><input style={styles.input} value={item.description} maxLength={1000} onChange={(e) => updateItem(index, { description: e.target.value })} required /></Field>
                <Field label={copy.kind}>
                  <select style={styles.input} value={item.kind} disabled={quoteItem} onChange={(e) => {
                    const kind = e.target.value;
                    updateItem(index, { kind, providerResponsibility: "BUSINESS", commercialTreatment: "NOT_CUSTOMER_BILLABLE" });
                  }}>
                    <option value="MATERIAL">{copy.material}</option><option value="TOOL">{copy.tool}</option><option value="EQUIPMENT">{copy.equipment}</option><option value="PREPARATION_TASK">{copy.preparationTask}</option>
                  </select>
                </Field>
                <Field label={copy.quantity}><input style={styles.input} type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} required /></Field>
                <Field label={copy.unit}><input style={styles.input} value={item.unit} maxLength={80} onChange={(e) => updateItem(index, { unit: e.target.value })} required /></Field>
                <Field label={copy.provider}>
                  <select style={styles.input} value={item.providerResponsibility} disabled={quoteItem || item.kind !== "MATERIAL"} onChange={(e) => configureProvider(index, e.target.value)}>
                    <option value="BUSINESS">{copy.business}</option>{item.kind === "MATERIAL" && <option value="CUSTOMER">{copy.customer}</option>}
                  </select>
                </Field>
                <Field label={copy.commercialTreatment}><input style={styles.input} value={commercialLabel(item.commercialTreatment, copy)} disabled /></Field>
                <Field label={copy.visibility}>
                  <select style={styles.input} value={item.visibility} onChange={(e) => updateItem(index, { visibility: e.target.value })}>
                    <option value="BUSINESS_ONLY">{copy.businessOnly}</option><option value="CUSTOMER_VISIBLE">{copy.customerVisible}</option>
                  </select>
                </Field>
                {item.providerResponsibility === "BUSINESS" && <Field label={`${copy.estimatedCost} (${item.internalCostCurrency})`}><input style={styles.input} inputMode="decimal" value={item.internalEstimatedCost} onChange={(e) => updateItem(index, { internalEstimatedCost: e.target.value })} placeholder="0.00" /></Field>}
              </div>
              <label style={styles.checkbox}><input type="checkbox" checked={item.requiredForWorkStart} onChange={(e) => updateItem(index, { requiredForWorkStart: e.target.checked })} /> {copy.requiredForStart}</label>
              <p style={styles.muted}>{quoteItem ? copy.sourceAccepted : copy.sourceElaboration}</p>
              {!quoteItem && <button type="button" style={styles.linkButton} onClick={() => setEditor((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index).map((entry, nextIndex) => ({ ...entry, sequence: nextIndex + 1 })) }))}>{copy.remove}</button>}
            </fieldset>
          );
        })}
      </div>
      <button type="button" style={styles.secondaryButton} onClick={() => setEditor((current) => ({ ...current, items: [...current.items, newItem(current.items.length + 1, plan.purchaseSummary.currency)] }))}>{copy.addItem}</button>
      {error && <p role="alert" style={styles.errorText}>{error}</p>}
      <div style={styles.actions}>
        <button type="submit" style={styles.primaryButton} disabled={busy}>{busy ? copy.saving : copy.savePlan}</button>
        <button type="button" style={styles.secondaryButton} disabled={busy} onClick={onCancel}>{copy.cancel}</button>
      </div>
    </form>
  );
}

export default function ProfessionalWorkPreparationWorkspace({
  jobId, language = "en", setPage, onCanonicalChange,
  embedded = false, showDepositStatus = true,
}) {
  const copy = getWorkPreparationCopy(language);
  const [state, setState] = useState(EMPTY_STATE);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState("");
  const [commandError, setCommandError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [purchaseItemId, setPurchaseItemId] = useState("");
  const [blockedNote, setBlockedNote] = useState("");
  const [blockedOpen, setBlockedOpen] = useState(false);
  const commandKeys = useRef(new Map());

  const load = useCallback(async () => {
    const read = await fetchWorkPreparation({ jobId, setPage });
    let decision = null;
    if (!read.workPreparation.exists) {
      try {
        const depositRead = await fetchProfessionalPreWorkDeposit({ jobId, setPage });
        decision = depositRead.deposit;
      } catch {
        decision = null;
      }
    }
    setState({ status: "ready", plan: read.workPreparation, decision, error: "" });
    return read.workPreparation;
  }, [jobId, setPage]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setState(EMPTY_STATE); });
    void fetchWorkPreparation({ jobId, setPage })
      .then(async (read) => {
        let decision = null;
        if (!read.workPreparation.exists) {
          try {
            const depositRead = await fetchProfessionalPreWorkDeposit({ jobId, setPage });
            decision = depositRead.deposit;
          } catch { decision = null; }
        }
        if (active) setState({ status: "ready", plan: read.workPreparation, decision, error: "" });
      })
      .catch((error) => {
        if (active) setState({ status: "error", plan: null, decision: null, error: String(error?.code || "WORK_PREPARATION_FAILED") });
      });
    return () => { active = false; };
  }, [jobId, refreshKey, setPage]);

  const keyFor = useCallback((scope, payload) => {
    const fingerprint = JSON.stringify(payload);
    const current = commandKeys.current.get(scope);
    if (current?.fingerprint === fingerprint) return current.key;
    const key = createWorkPreparationIdempotencyKey(scope);
    commandKeys.current.set(scope, { key, fingerprint });
    return key;
  }, []);

  const runCommand = useCallback(async (scope, payload, action) => {
    setBusy(scope); setCommandError("");
    const idempotencyKey = keyFor(scope, payload);
    try {
      await action(idempotencyKey);
      await load();
      commandKeys.current.delete(scope);
      onCanonicalChange?.();
      return true;
    } catch (error) {
      setCommandError(String(error?.code || "WORK_PREPARATION_COMMAND_FAILED"));
      return false;
    } finally { setBusy(""); }
  }, [keyFor, load, onCanonicalChange]);

  const plan = state.plan?.exists ? state.plan : null;
  const canRevise = plan?.safeNextActions.includes("REVISE_PLAN");
  const canPurchase = plan?.safeNextActions.includes("RECORD_PURCHASE") && !plan.deposit.commitmentLocked;
  const canPrepare = plan?.safeNextActions.includes("RECORD_PREPARATION") && !plan.deposit.commitmentLocked;
  const purchaseItem = plan?.items.find((item) => item.id === purchaseItemId);
  const metrics = useMemo(() => plan ? [
    { label: copy.planning, value: stateLabel(plan.readiness.planningState, copy), state: plan.readiness.planningState },
    { label: copy.acquisition, value: stateLabel(plan.readiness.acquisitionState, copy), state: plan.readiness.acquisitionState },
    { label: copy.preparation, value: stateLabel(plan.readiness.preparationState, copy), state: plan.readiness.preparationState },
  ] : [], [copy, plan]);

  const event = (eventType, itemId = null, internalNote = null) => {
    const payload = { eventType, itemId, expectedVersion: plan.currentVersion, internalNote };
    return runCommand(`event-${eventType}-${itemId || "plan"}`, payload, (idempotencyKey) =>
      recordWorkPreparationEvent({
        jobId, planId: plan.id, itemId, expectedVersion: plan.currentVersion,
        eventType, visibility: "BUSINESS_ONLY", internalNote, idempotencyKey, setPage,
      })
    );
  };

  return (
    <section style={styles.section} aria-label={embedded ? copy.title : undefined} aria-labelledby={embedded ? undefined : "professional-work-preparation-title"} data-work-preparation-status={state.status} data-work-preparation-error={state.error || commandError}>
      {!embedded && <header style={styles.header}>
        <div><span style={styles.eyebrow}>{copy.eyebrow}</span><h2 id="professional-work-preparation-title" style={styles.title}>{copy.title}</h2><p style={styles.purpose}>{copy.purpose}</p></div>
        {plan && <WorkCenterStatusPill tone={toneForState(plan.readiness.planningState)}>{copy.version} {plan.currentVersion}</WorkCenterStatusPill>}
      </header>}
      {state.status === "loading" && <p role="status">{copy.loading}</p>}
      {state.status === "error" && <div role="alert" style={styles.notice}><p>{copy.unavailable}</p><button type="button" style={styles.secondaryButton} onClick={() => setRefreshKey((value) => value + 1)}>{copy.retry}</button></div>}
      {commandError && <p role="alert" style={styles.errorText}>{copy.commandFailed} <span style={styles.srOnly}>{commandError}</span></p>}

      {state.status === "ready" && !state.plan.exists && (
        <WorkCenterEmptyState
          icon="workCenter" title={copy.emptyTitle} body={copy.emptyBody}
          action={state.decision?.customerDecisionId ? (
            <button type="button" style={styles.primaryButton} disabled={Boolean(busy)} onClick={() => {
              const payload = { approvedCustomerDecisionId: state.decision.customerDecisionId };
              void runCommand("materialize", payload, (idempotencyKey) => materializeWorkPreparation({ jobId, approvedCustomerDecisionId: state.decision.customerDecisionId, idempotencyKey, setPage }));
            }}>{busy === "materialize" ? copy.creating : copy.createPlan}</button>
          ) : <p style={styles.muted}>{copy.noDecision}</p>}
        />
      )}

      {plan && (
        <>
          <div style={styles.metrics} aria-label={copy.title}>
            {metrics.map((metric) => <div key={metric.label} style={styles.metric}><span style={styles.metricLabel}>{metric.label}</span><WorkCenterStatusPill tone={toneForState(metric.state)}>{metric.value}</WorkCenterStatusPill></div>)}
          </div>
          {showDepositStatus && <div style={plan.deposit.commitmentLocked ? styles.lockedNotice : styles.openNotice} role="status">
            <strong>{copy.deposit}: {stateLabel(plan.deposit.state, copy)}</strong><span>{plan.deposit.commitmentLocked ? copy.depositLocked : copy.depositOpen}</span>
          </div>}
          <p style={styles.workStartNotice}>{copy.workStartNotice}</p>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}><strong>{plan.items.length}</strong><span>{copy.itemCount}</span></div>
            <div style={styles.summaryCard}><strong>{plan.readiness.readyRequiredItemCount}/{plan.readiness.requiredItemCount}</strong><span>{copy.requiredReady}</span></div>
            <div style={styles.summaryCard}><strong>{formatWorkPreparationMoney(plan.purchaseSummary.internalCostMinor, plan.purchaseSummary.currency, language)}</strong><span>{copy.purchaseTotal}</span></div>
          </div>
          <p style={styles.privateNotice}>{copy.privateCosts}</p>
          {canRevise && !editorOpen && <button type="button" style={styles.secondaryButton} onClick={() => setEditorOpen(true)}>{copy.editPlan}</button>}
          {editorOpen && <PlanEditor plan={plan} copy={copy} busy={busy === "revise"} onCancel={() => setEditorOpen(false)} onSave={(payload) => {
            void runCommand("revise", payload, (idempotencyKey) => reviseWorkPreparation({ jobId, planId: plan.id, expectedVersion: plan.currentVersion, ...payload, idempotencyKey, setPage })).then((ok) => { if (ok) setEditorOpen(false); });
          }} />}

          <div style={styles.itemList}>
            {plan.items.length === 0 && <p style={styles.muted}>{copy.noItems}</p>}
            {plan.items.map((item) => {
              const businessMaterial = item.kind === "MATERIAL" && item.providerResponsibility === "BUSINESS" && ["INCLUDED_IN_ACCEPTED_TOTAL", "NOT_CUSTOMER_BILLABLE"].includes(item.commercialTreatment);
              return (
                <article key={item.id} style={styles.itemCard} data-item-kind={item.kind} data-acquisition-state={item.acquisitionState} data-preparation-state={item.preparationState}>
                  <header style={styles.itemHeader}><div><span style={styles.sequence}>{item.sequence}</span><h3 style={styles.itemTitle}>{item.description}</h3></div><WorkCenterStatusPill tone={item.readyForWorkStart ? "success" : "neutral"}>{item.readyForWorkStart ? copy.readyForStart : stateLabel(item.acquisitionState, copy)}</WorkCenterStatusPill></header>
                  <div style={styles.itemMeta}>
                    <span>{itemKindLabel(item.kind, copy)}</span><span>{item.quantity} {item.unit}</span><span>{item.providerResponsibility === "BUSINESS" ? copy.business : copy.customer}</span><span>{commercialLabel(item.commercialTreatment, copy)}</span>{item.requiredForWorkStart && <strong>{copy.requiredForStart}</strong>}
                  </div>
                  <div style={styles.dimensionGrid}><div><span>{copy.acquisitionState}</span><strong>{stateLabel(item.acquisitionState, copy)}</strong></div><div><span>{copy.preparationState}</span><strong>{stateLabel(item.preparationState, copy)}</strong></div></div>
                  {item.providerResponsibility === "BUSINESS" && <div style={styles.costLine}><span>{copy.estimatedCost}: {formatWorkPreparationMoney(item.internalEstimatedCostMinor, item.internalCostCurrency, language)}</span><span>{copy.purchaseEvidence}: {item.purchase.recordCount} {copy.records} · {formatWorkPreparationMoney(item.purchase.internalCostMinor, plan.purchaseSummary.currency, language)}</span></div>}
                  {canPrepare && <div style={styles.actions}>
                    {businessMaterial && <button type="button" style={styles.actionButton} disabled={Boolean(busy)} onClick={() => void event("BUSINESS_INVENTORY_ALLOCATED", item.id)}>{copy.allocateInventory}</button>}
                    {businessMaterial && <button type="button" style={styles.actionButton} disabled={Boolean(busy)} onClick={() => void event("MATERIAL_STAGED", item.id)}>{copy.markStaged}</button>}
                    {item.kind === "MATERIAL" && item.providerResponsibility === "CUSTOMER" && <button type="button" style={styles.actionButton} disabled={Boolean(busy)} onClick={() => void event("CUSTOMER_ITEM_RECEIVED", item.id)}>{copy.markReceived}</button>}
                    {item.kind === "TOOL" && <button type="button" style={styles.actionButton} disabled={Boolean(busy)} onClick={() => void event("TOOLS_READY", item.id)}>{copy.markToolReady}</button>}
                    {item.kind === "EQUIPMENT" && <button type="button" style={styles.actionButton} disabled={Boolean(busy)} onClick={() => void event("EQUIPMENT_READY", item.id)}>{copy.markEquipmentReady}</button>}
                    {businessMaterial && canPurchase && <button type="button" style={styles.primaryButton} disabled={Boolean(busy)} onClick={() => setPurchaseItemId(item.id)}>{copy.recordPurchase}</button>}
                  </div>}
                  {purchaseItem?.id === item.id && <PurchaseForm item={item} plan={plan} copy={copy} busy={busy === `purchase-${item.id}`} onCancel={() => setPurchaseItemId("")} onSubmit={(payload) => {
                    void runCommand(`purchase-${item.id}`, payload, (idempotencyKey) => recordWorkPreparationPurchase({ jobId, planId: plan.id, itemId: item.id, expectedVersion: plan.currentVersion, ...payload, idempotencyKey, setPage })).then((ok) => { if (ok) setPurchaseItemId(""); });
                  }} />}
                </article>
              );
            })}
          </div>

          {canPrepare && <div style={styles.planActions}>
            <button type="button" style={styles.actionButton} disabled={Boolean(busy)} onClick={() => void event("PREPARATION_STARTED")}>{copy.prepStarted}</button>
            <button type="button" style={styles.actionButton} disabled={Boolean(busy)} onClick={() => void event("PREPARATION_READY")}>{copy.prepReady}</button>
            <button type="button" style={styles.actionButton} disabled={Boolean(busy)} onClick={() => setBlockedOpen(true)}>{copy.prepBlocked}</button>
          </div>}
          {blockedOpen && <form style={styles.formCard} onSubmit={(e) => { e.preventDefault(); if (!blockedNote.trim()) return; void event("PREPARATION_BLOCKED", null, blockedNote.trim()).then((ok) => { if (ok) { setBlockedOpen(false); setBlockedNote(""); } }); }}>
            <Field label={copy.blockedReason}><textarea style={styles.textarea} value={blockedNote} maxLength={2000} required onChange={(e) => setBlockedNote(e.target.value)} /></Field>
            <div style={styles.actions}><button type="submit" style={styles.primaryButton} disabled={Boolean(busy)}>{copy.confirmBlocked}</button><button type="button" style={styles.secondaryButton} disabled={Boolean(busy)} onClick={() => { setBlockedOpen(false); setBlockedNote(""); }}>{copy.cancel}</button></div>
          </form>}
        </>
      )}
    </section>
  );
}

const styles = {
  section: { display: "grid", gap: 18, minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  eyebrow: { color: "#45634f", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { margin: "4px 0 6px", fontSize: "clamp(1.35rem, 4vw, 1.8rem)", color: "#173d2a" },
  purpose: { margin: 0, color: "#526258", lineHeight: 1.5 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  metric: { border: "1px solid #d9e5dc", borderRadius: 14, padding: 14, display: "grid", gap: 8, background: "#fff" },
  metricLabel: { color: "#5d6a61", fontSize: 13, fontWeight: 700 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  summaryCard: { borderRadius: 14, padding: 14, background: "#f4f8f5", display: "grid", gap: 5, overflowWrap: "anywhere" },
  lockedNotice: { display: "grid", gap: 4, padding: 14, borderRadius: 12, background: "#fff4df", color: "#714b0a" },
  openNotice: { display: "grid", gap: 4, padding: 14, borderRadius: 12, background: "#eaf6ed", color: "#245333" },
  workStartNotice: { margin: 0, borderLeft: "4px solid #809787", padding: "8px 12px", color: "#526258", lineHeight: 1.5 },
  privateNotice: { margin: "-8px 0 0", color: "#68756d", fontSize: 13 },
  notice: { padding: 16, borderRadius: 12, background: "#f6f7f6" },
  itemList: { display: "grid", gap: 14 },
  itemCard: { border: "1px solid #d7e2da", borderRadius: 16, padding: "clamp(14px, 3vw, 20px)", display: "grid", gap: 13, minWidth: 0, background: "#fff" },
  itemHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  itemTitle: { display: "inline", margin: 0, color: "#213d2c", fontSize: 17, overflowWrap: "anywhere" },
  sequence: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, marginRight: 8, borderRadius: 999, background: "#e5efe8", fontWeight: 800, color: "#315842" },
  itemMeta: { display: "flex", flexWrap: "wrap", gap: "6px 14px", color: "#58665d", fontSize: 13 },
  dimensionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 },
  costLine: { display: "flex", flexWrap: "wrap", gap: "6px 18px", padding: 10, borderRadius: 10, background: "#f7f8f7", color: "#47544c", fontSize: 13 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  planActions: { display: "flex", flexWrap: "wrap", gap: 9, paddingTop: 4 },
  primaryButton: { minHeight: 44, padding: "10px 16px", border: 0, borderRadius: 10, background: "#21633d", color: "#fff", fontWeight: 800, cursor: "pointer" },
  secondaryButton: { minHeight: 44, padding: "10px 16px", border: "1px solid #91a599", borderRadius: 10, background: "#fff", color: "#234d35", fontWeight: 800, cursor: "pointer" },
  actionButton: { minHeight: 44, padding: "9px 13px", border: "1px solid #b5c7bb", borderRadius: 10, background: "#f8fbf9", color: "#274f38", fontWeight: 700, cursor: "pointer" },
  linkButton: { border: 0, padding: "8px 0", background: "transparent", color: "#8d342d", textDecoration: "underline", cursor: "pointer" },
  editor: { display: "grid", gap: 14, padding: 16, borderRadius: 14, background: "#f5f8f6", border: "1px solid #d6e1d9" },
  editorItems: { display: "grid", gap: 12 },
  fieldset: { border: "1px solid #ccd9cf", borderRadius: 12, display: "grid", gap: 12, minWidth: 0, padding: 14, background: "#fff" },
  legend: { padding: "0 6px", fontWeight: 800, color: "#2e4f39", maxWidth: "90%", overflowWrap: "anywhere" },
  formCard: { display: "grid", gap: 12, padding: 14, borderRadius: 12, background: "#f6f8f6", border: "1px solid #d4dfd6" },
  formTitle: { margin: 0, color: "#294b35" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  field: { display: "grid", gap: 6, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 750, color: "#435349" },
  input: { width: "100%", minWidth: 0, minHeight: 44, boxSizing: "border-box", padding: "9px 10px", border: "1px solid #aebeb3", borderRadius: 9, background: "#fff", color: "#243b2d" },
  textarea: { width: "100%", minHeight: 90, boxSizing: "border-box", padding: 10, border: "1px solid #aebeb3", borderRadius: 9, resize: "vertical" },
  checkbox: { display: "flex", gap: 8, alignItems: "center", minHeight: 32, color: "#3f5146" },
  muted: { margin: 0, color: "#68756d", fontSize: 13 },
  errorText: { margin: 0, padding: 10, borderRadius: 8, background: "#fff0ee", color: "#8a2d24" },
  srOnly: { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 },
};
