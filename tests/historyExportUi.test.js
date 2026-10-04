import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { professionalModel, authority } from './fixtures/historyExportCases.js';
import { getCustomerRelationshipsCopy } from '../src/utils/customerRelationshipsLanguage.js';
import { getCustomerJobHistoryReportCopy, shareCustomerJobHistoryReport, printCustomerJobHistoryReport } from '../src/utils/customerJobHistoryReport.js';
import { shareHistoryPdfArtifact } from '../src/utils/historyPdfShare.js';

test('Professional UI handles dismissal, retains the exact PDF and clears it on authority changes', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const prior = new Map(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  let dismissed = true; const reads = [], shared = [], saved = [];
  globalThis.__historyExportUi = {
    getCustomerJobHistoryReportCopy, printCustomerJobHistoryReport,
    loadProfessionalCustomerHistoryReport: async input => { reads.push(input.authority); return professionalModel(input.language); },
    shareCustomerJobHistoryReport: (model, options) => shareCustomerJobHistoryReport(model, { ...options,
      shareArtifact: input => shareHistoryPdfArtifact({ ...input, isNative: false, navigatorObject: {
        canShare: () => true, share: async input => { shared.push(input.files[0]); if (dismissed) throw new DOMException('No target / dismissed', 'AbortError'); },
      } }), downloadArtifact: () => { throw Error('Dismissal must not auto-download'); } }),
    downloadBusinessDocumentPdfArtifact: artifact => { saved.push(artifact); return true; },
  };
  const vite = await createServer({ root: process.cwd(), configFile: false, cacheDir: '/private/tmp/meetro-63J4E6-evidence/vite-ui',
    optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, plugins: [react(), {
      name: 'history-export-ui-ports', enforce: 'pre', transform(source, id) {
        if (!id.endsWith('/ProfessionalCustomerHistoryExport.jsx')) return;
        return source.replace(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/utils\/(?:professionalCustomerHistoryReport|customerJobHistoryReport|businessDocumentDeviceShare)\.js['"];?/g,
          (_, names) => names.split(',').map(s => s.trim()).map(name => `const ${name} = (...args) => globalThis.__historyExportUi.${name}(...args);`).join('\n'));
      },
    }] });
  const root = createRoot(document.getElementById('root'));
  const props = { authority, language: 'en', displayName: 'Liam Molina', copy: getCustomerRelationshipsCopy('en') };
  const click = async name => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent === name);
    assert.ok(button, name); await act(async () => button.click());
  };
  try {
    const Current = (await vite.ssrLoadModule('/src/components/ProfessionalCustomerHistoryExport.jsx')).default;
    await act(async () => root.render(React.createElement(Current, props)));
    assert.deepEqual([...document.querySelectorAll('button')].map(b => b.textContent), ['Print', 'Share']);
    await click('Share');
    assert.ok(document.body.textContent.includes(getCustomerJobHistoryReportCopy('en').shareDismissed));
    assert.ok(!document.body.textContent.includes(getCustomerJobHistoryReportCopy('en').pdfUnavailable));
    await click('Save PDF'); assert.equal(saved.length, 1); assert.ok(saved[0].blob.size > 0);
    const readCount = reads.length; dismissed = false;
    await click('Share'); assert.equal(reads.length, readCount);
    assert.deepEqual(await shared.at(-1).arrayBuffer(), await saved[0].blob.arrayBuffer());
    await act(async () => root.render(React.createElement(Current, { ...props, authority: { ...authority, homeownerUserId: 18 } })));
    assert.equal([...document.querySelectorAll('button')].some(b => b.textContent === 'Save PDF'), false);
    await click('Share'); assert.equal(reads.at(-1).homeownerUserId, 18); assert.equal(reads.length, readCount + 1);
  } finally {
    await act(async () => root.unmount()); await vite.close(); dom.window.close(); delete globalThis.__historyExportUi;
    for (const [key, value] of prior) if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key];
  }
});
