import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const css = read('src/index.css');
const polish = css.split('/* R5 responsive polish:')[1];
const dashboard = read('src/pages/ContractorDashboard.jsx');

test('Work Center query containment belongs to the inner lane, not the shell that owns fixed navigation', () => {
  assert.match(dashboard, /<div ref=\{workCenterPanelRef\} className="work-center-content-lane">/);
  assert.match(polish, /\.work-center-content-lane \{\s*container: work-center \/ inline-size;\s*min-width: 0;\s*width: 100%;/);
  assert.doesNotMatch(css, /\.contractor-dashboard\s*\{[^}]*container\s*:/);
  // Keep the existing BottomNav shell as the only owner of sidebar subtraction.
  assert.doesNotMatch(polish, /(?:width|margin-left|left):[^;]*100vw/);
  const shell = read('src/components/BottomNav.jsx');
  assert.match(shell, /--meetro-page-available-width: calc\(100vw - var\(--meetro-sidebar-width\)\)/);
  assert.match(shell, /margin-left: calc\(var\(--meetro-sidebar-width\) \+ var\(--meetro-page-inline-extra\)\)/);
});

test('constrained Opportunities action gets its own full row with natural word wrapping', () => {
  const narrow = polish.split('@container work-center (max-width: 760px)')[1].split('@container')[0];
  assert.match(narrow, /__view \{ grid-column: 1 \/ -1; grid-row: 3;/);
  const action = polish.split('.work-center-opportunities-banner__view {')[1].split('}')[0];
  assert.match(action, /min-height: 44px/);
  assert.match(action, /overflow-wrap: normal;\s*word-break: normal;\s*hyphens: none/);
  assert.doesNotMatch(narrow, /112px/);
});

test('safe-area top reservation occurs once and dock has exactly 62px beyond existing nav clearance', () => {
  assert.match(polish, /padding-top: max\(16px, calc\(env\(safe-area-inset-top, 0px\) \+ 12px\)\)/);
  assert.match(polish, /\.work-center-overview \{ padding-block: 0 !important; margin-block: 0 !important;/);
  assert.match(polish, /--work-center-launcher-height: 50px; --work-center-dock-gap: 6px;/);
  assert.match(polish, /height: calc\(100dvh - var\(--work-center-dock-bottom\) - var\(--work-center-launcher-height\) - 2 \* var\(--work-center-dock-gap\)\)/);
  assert.match(polish, /\.contractor-dashboard > \.bottom-nav-content-spacer \{ display: none;/);
  assert.doesNotMatch(polish, /overflow-x:\s*hidden/);
});

test('card hover paint changes require a real hover pointer; no touch geometry workaround is added', () => {
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.work-center-job-card:hover \{[^}]*box-shadow:/);
  assert.equal(css.match(/\.work-center-job-card:hover/g).length, 1);
  assert.match(css, /\.work-center-job-card:focus-visible \{ outline:/);
  const cardRules = [...css.matchAll(/[^{}]*\.work-center-job-card[^{}]*\{([^{}]*)\}/g)].map(m=>m[1]).join('\n');
  assert.doesNotMatch(cardRules, /(?:transform|translate|scale|transition|animation|will-change|backdrop-filter|filter)\s*:/);
  assert.doesNotMatch(dashboard, /(?:onScroll|onTouchMove)=/);
});
