export const CONNECTED_SERVICE_STATUS = Object.freeze({
  COMING_SOON: "COMING_SOON",
  NOT_CONNECTED: "NOT_CONNECTED",
  CONNECTED: "CONNECTED",
  NEEDS_ATTENTION: "NEEDS_ATTENTION",
  UNAVAILABLE: "UNAVAILABLE",
});

export const CONNECTED_SERVICE_CAPABILITY = Object.freeze({
  PAYMENTS: "PAYMENTS",
  ACCOUNTING: "ACCOUNTING",
  CALENDAR: "CALENDAR",
});

export const CONNECTED_SERVICE_PROVIDER = Object.freeze({
  STRIPE_PAYMENTS: "STRIPE_PAYMENTS",
  QUICKBOOKS: "QUICKBOOKS",
  GOOGLE_CALENDAR: "GOOGLE_CALENDAR",
  MICROSOFT_OUTLOOK_CALENDAR: "MICROSOFT_OUTLOOK_CALENDAR",
});

/*
 * Connected Services represents external business integrations.
 *
 * Meetro subscription billing is intentionally outside this registry.
 * A Stripe customer used to pay Meetro for software access is not a
 * merchant/payment connection and must never be treated as one.
 */
const PROVIDERS = Object.freeze([
  Object.freeze({
    provider: CONNECTED_SERVICE_PROVIDER.STRIPE_PAYMENTS,
    capability: CONNECTED_SERVICE_CAPABILITY.PAYMENTS,
    name: "Stripe Payments",
    status: CONNECTED_SERVICE_STATUS.COMING_SOON,
  }),
  Object.freeze({
    provider: CONNECTED_SERVICE_PROVIDER.QUICKBOOKS,
    capability: CONNECTED_SERVICE_CAPABILITY.ACCOUNTING,
    name: "QuickBooks",
    status: CONNECTED_SERVICE_STATUS.COMING_SOON,
  }),
  Object.freeze({
    provider: CONNECTED_SERVICE_PROVIDER.GOOGLE_CALENDAR,
    capability: CONNECTED_SERVICE_CAPABILITY.CALENDAR,
    name: "Google Calendar",
    status: CONNECTED_SERVICE_STATUS.COMING_SOON,
  }),
  Object.freeze({
    provider: CONNECTED_SERVICE_PROVIDER.MICROSOFT_OUTLOOK_CALENDAR,
    capability: CONNECTED_SERVICE_CAPABILITY.CALENDAR,
    name: "Microsoft Outlook Calendar",
    status: CONNECTED_SERVICE_STATUS.COMING_SOON,
  }),
]);

export function getConnectedServiceProviders() {
  return PROVIDERS.map((provider) => ({ ...provider }));
}
