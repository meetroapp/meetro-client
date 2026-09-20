import { getWorkCenterSource } from "../../src/utils/workCenterSourcePresentation.js";
import { t as translate } from "../../src/utils/language.js";
import { workCenterLabel, workCenterActor } from "../../src/utils/workCenterPresentation.js";
// Render the production JSX blocks, not a second copy of their markup.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { createServer, transformWithOxc } from 'vite';
import { opportunityFilterRoute } from '../../src/utils/opportunityPresentationFilters.js';
import { resolveWorkCenterLifecyclePresentation } from '../../src/utils/workCenterLifecyclePresentation.js';
const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
export async function prepareWorkCenterPolishFixture() {
  const vite = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true, hmr: false } });
  try {
    const { default: WorkCenterLifecycle, WorkCenterLifecycleHeading } = await vite.ssrLoadModule('/src/components/WorkCenterLifecycle.jsx');
    const { default: CompactCurrentJobHeader } = await vite.ssrLoadModule('/src/components/CompactCurrentJobHeader.jsx');
    const { WorkCenterAttentionBadge } = await vite.ssrLoadModule('/src/components/WorkCenterWorkspaceSystem.jsx');
    const { WorkCenterSourceBadge } = await vite.ssrLoadModule('/src/components/WorkCenterSource.jsx');
    const dashboard = read('src/pages/ContractorDashboard.jsx');
    const bannerStart = dashboard.indexOf('<section className="work-center-opportunities-banner');
    const banner = dashboard.slice(bannerStart, dashboard.indexOf('</section>', bannerStart) + 10);
    const cardClass = dashboard.indexOf('className="work-center-job-card meetro-visual-surface"');
    const cardStart = dashboard.lastIndexOf('<button', cardClass);
    const card = dashboard.slice(cardStart, dashboard.indexOf('</button>', cardClass) + 9);
    const completion = read("src/components/ProfessionalCompletionReview.jsx");
    const metricsStart = completion.indexOf('<div className="completion-review-metrics"');
    const metrics = completion.slice(metricsStart, completion.indexOf("\n\n          {!review.canComplete", metricsStart));
    const compile = async (jsx, names) => {
      const { code } = await transformWithOxc(`function Fixture(props) { const {${names}, activeLanguage = "en"} = props; return (${jsx}); }`, 'fixture.jsx', { jsx: { runtime: 'classic' } });
      return vm.runInNewContext(`${code}; Fixture`, { React, translate, workCenterLabel, workCenterActor, WorkCenterLifecycle, WorkCenterAttentionBadge, opportunityFilterRoute, WorkCenterSourceBadge, getWorkCenterSource,
        outstandingCount: (review) => Object.values(review.outstanding).reduce((a,b) => a+b, 0),
        MeetroIcon: () => React.createElement('span', { 'aria-hidden': true }, '◎'),
        getCanonicalCurrentJobIdentityKey: (job) => job.id,
      });
    };
    const toolbarStart = dashboard.indexOf('<div className="work-center-active-jobs__toolbar">');
    const toolbar = dashboard.slice(toolbarStart, dashboard.indexOf('{workCenterFilterOpen &&', toolbarStart)).trim();
    const filterStart = dashboard.indexOf('<label className="work-center-active-jobs__filter">');
    const filter = dashboard.slice(filterStart, dashboard.indexOf('</label>', filterStart) + 8);
    const Toolbar = await compile(toolbar, 'workCenterJobQuery,setWorkCenterJobQuery,workCenterFilterOpen,setWorkCenterFilterOpen');
    const FilterMenu = await compile(filter, 'workCenterJobFilter,setWorkCenterJobFilter,setWorkCenterFilterOpen,openWorkCenterJobsPage,openWorkTab');
    const business = read('src/pages/BusinessDashboard.jsx');
    const glanceSource = business.slice(business.indexOf('function GlanceItem('), business.indexOf('function QuickAction('));
    const { code: glanceCode } = await transformWithOxc(glanceSource, 'glance.jsx', { jsx: { runtime: 'classic' } });
    const glanceStyles = Object.fromEntries(['glanceItem','glanceTitle','glanceValue','glanceNote'].map(name => [name, vm.runInNewContext('(' + business.split('const ' + name + ' = ')[1].split('\n};')[0] + '\n})')]));
    const GlanceItem = vm.runInNewContext(`${glanceCode}; GlanceItem`, { React, ...glanceStyles, MeetroIcon: () => null });
    const revenueStart = business.lastIndexOf('<GlanceItem', business.indexOf('icon="revenue"'));
    const revenue = business.slice(revenueStart,business.indexOf('/>',revenueStart)+2);
    const { code: revenueCode } = await transformWithOxc(`function RevenueEntry({language = 'en',openWorkCenterSection}) { return (${revenue}); }`, 'revenue-entry.jsx', { jsx: { runtime: 'classic' } });
    const RevenueEntry = vm.runInNewContext(`${revenueCode}; RevenueEntry`, { React, GlanceItem, t: translate });
    const Metrics = await compile(metrics, "styles,review,copy");
    const metricsProps = { styles: vm.runInNewContext(`(${completion.split("const styles = ")[1].trim().replace(/;$/, "")})`), review: { work: { completedWorkItemCount: 1, workItemCount: 1 }, outstanding: { items: 0 }, customerUpdates: { status: "UP_TO_DATE", count: 0 } }, copy: { work: "Work", completed: "Completed", none: "None", outstandingItems: "Outstanding items", upToDate: "Up to date", customerUpdates: "Customer updates" } };
    const Banner = await compile(banner, 'opportunityTileCounts,canonicalScheduleCounts,setPage,openWorkTab');
    const Card = await compile(card, 'job,lifecycle,visual,scheduledDate,jobAlertCount,jobListPresentation,setSelectedJobDetailView,setIsJobHistoryMode,setSelectedWorkCenterAlertStage,setIsWorkCenterSectionOpen,setSelectedWorkCenterJob');
    const liveJob = { stage: { code: 'WORKSTREAMS_COMPLETE_PENDING_JOB_COMPLETION', label: 'Ready for completion review' }, nextAction: { code: 'REVIEW_WORKSTREAM_COMPLETION', label: 'Complete Job' }, responsibility: { label: 'Professional' } };
    const lifecycle = resolveWorkCenterLifecyclePresentation({ liveJob });
    const noop = () => {};
    const cardProps = { job: { id: 'job-1', customer: 'Liam Molina', title: 'Bathroom Exhaust Fan Replacement' }, lifecycle, visual: { location: 'Cape Coral, FL' }, scheduledDate: 'Not scheduled', jobAlertCount: 2, jobListPresentation: { statusLabel: liveJob.stage.label, nextStepLabel: 'Complete Job', responsibilityLabel: 'Professional' }, setSelectedJobDetailView: noop, setIsJobHistoryMode: noop, setSelectedWorkCenterAlertStage: noop, setIsWorkCenterSectionOpen: noop, setSelectedWorkCenterJob: noop };
    const headerProps = { customer: 'Antony Guzman', service: 'Cabinet door and trim repair', address: 'Cape Coral, FL', status: liveJob.stage.label, nextStep: 'Complete Job', responsibility: 'Professional', concern: 'Cabinet door is misaligned and trim is damaged.', jobId: 'JG-00482' };
    return { Toolbar, FilterMenu, RevenueEntry, Metrics, metricsProps, Banner, Card, cardProps, headerProps, CompactCurrentJobHeader, WorkCenterLifecycle, WorkCenterLifecycleHeading, lifecycle };
  } finally { await vite.close(); }
}
