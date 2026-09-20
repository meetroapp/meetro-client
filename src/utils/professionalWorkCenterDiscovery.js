import { fetchAuthorizedProfessionalJobs } from './professionalJobPicker.js';
import {
  fetchCanonicalWorkCenterEntries,
  CANONICAL_WORK_CENTER_AUTHORITY,
  isCanonicalWorkCenterHydrationEnabled,
} from './workCenterCanonicalHydration.js';

export async function fetchProfessionalWorkCenterEntries(options = {}) {
  // Preserve the existing canonical Work Center environment boundary.
  if (!isCanonicalWorkCenterHydrationEnabled(options.apiUrl)) {
    return { status: 'disabled', reason: 'UNSUPPORTED_API_ENVIRONMENT', entries: [] };
  }
  const [ordinary, picker] = await Promise.allSettled([
    fetchCanonicalWorkCenterEntries(options),
    fetchAuthorizedProfessionalJobs(options),
  ]);
  const entries = ordinary.status === 'fulfilled' ? ordinary.value.entries : [];
  const emergencyEntries = picker.status === 'fulfilled'
    ? picker.value.filter(job => job.sourceType === 'emergency_request').map(job => ({
        ...job,
        id: `canonical-emergency-${job.jobId}`,
        source: CANONICAL_WORK_CENTER_AUTHORITY,
        readOnly: true,
        lifecycleContractVersion: 2,
        requestId: null,
        customer: job.customerLabel,
        address: '',
        liveJob: null,
        liveJobStatus: 'loading',
      }))
    : [];
  const failed = picker.status === 'rejected' || ordinary.status === 'rejected' || ordinary.value.status === 'error';
  return {
    status: failed ? 'error' : 'ready',
    reason: failed ? 'PROFESSIONAL_JOBS_FETCH_FAILED' : '',
    entries: [...entries, ...emergencyEntries],
  };
}
