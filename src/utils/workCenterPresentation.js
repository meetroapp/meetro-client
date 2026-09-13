import { t } from './language.js';

// Only system-generated labels at the render boundary, never customer content.
const labels = {
  'Work approved — ready to schedule': 'approvedSchedule',
  'Schedule approved work': 'scheduleJob',
  'Ready for completion review': 'readyComplete',
  'Evaluation': 'evaluation', 'Quote': 'quote', 'Deposit': 'deposit',
  'Schedule': 'schedule', 'Work Plan': 'workPlan', 'Complete Job': 'completeJob', 'Invoice': 'invoice',
};
export function workCenterLabel(value, language) {
  return labels[value] ? t(`wc52${labels[value]}`, language) : value;
}
export function workCenterActor(responsibility, fallback, language) {
  // A display label alone cannot establish that the signed-in business acts next.
  if (responsibility?.code === 'PROFESSIONAL') return t('wc52you', language);
  if (responsibility?.code === 'CUSTOMER') return t('wc52customer', language);
  return fallback || t('wc52unavailable', language);
}
