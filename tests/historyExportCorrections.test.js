import test from 'node:test';
import assert from 'node:assert/strict';
import { professionalModel, homeownerModel, kitchen, bathroom, active } from './fixtures/historyExportCases.js';
import { createCustomerJobHistoryPdfArtifact, shareCustomerJobHistoryReport, getCustomerJobHistoryReportCopy } from '../src/utils/customerJobHistoryReport.js';
import { shareHistoryPdfArtifact, historyReportNotice } from '../src/utils/historyPdfShare.js';

for (const [audience, getModel] of [['Professional', professionalModel], ['Homeowner', homeownerModel]]) {
  test(`${audience} attaches its actual generated nonempty canonical PDF File`, async () => {
    const model = getModel();
    const artifact = await createCustomerJobHistoryPdfArtifact(model);
    const calls = [];
    const result = await shareCustomerJobHistoryReport(model, { createArtifact: async () => artifact,
      shareArtifact: input => shareHistoryPdfArtifact({ ...input, isNative: false, navigatorObject: {
        canShare: ({ files }) => files.length === 1,
        share: async input => calls.push(input),
      } }), downloadArtifact: () => { throw Error('Supported sharing must not download'); } });
    assert.equal(result.method, 'web-pdf');
    assert.equal(artifact.blob.type, 'application/pdf');
    const file = calls[0].files[0];
    assert.ok(file instanceof File); assert.ok(file.size > 1000);
    assert.equal(file.type, 'application/pdf'); assert.equal(file.name, artifact.fileName);
    assert.match(file.name, /^Meetro-(?:Customer|Job)-History-[a-z0-9-]+\.pdf$/i);
    assert.deepEqual(await file.arrayBuffer(), await artifact.blob.arrayBuffer());
    assert.match(await file.text(), /^%PDF-/);
    if (audience === 'Professional') {
      assert.deepEqual(model.jobReports.map(row => row.jobId), [kitchen, bathroom, active]);
      assert.equal(model.jobReports[0].model.invoice.invoiceNumber, 'INV-942ECBCB6944');
      assert.equal(model.jobReports[1].model.invoice.invoiceNumber, 'INV-45F7A357A55D');
      assert.equal(model.jobReports[2].model.invoice, null);
    } else {
      assert.equal(model.job.customerName, "Liam Molina");
      assert.equal(model.job.approvedQuote.totalMinor, 35000);
    }
  });
  for (const platform of ['ios', 'android']) test(`${audience} ${platform} retains the native PDF adapter`, async () => {
    const model = getModel(); const artifact = await createCustomerJobHistoryPdfArtifact(model); let received;
    const result = await shareHistoryPdfArtifact({ artifact, isNative: true, platform,
      nativeShare: async ({ artifact: value }) => { received = value; return { ok: true, method: 'native-pdf' }; } });
    assert.equal(result.method, 'native-pdf'); assert.equal(received, artifact);
    assert.ok(received.blob.size); assert.equal(received.contentType, 'application/pdf');
  });
}

const reasons = [
  ['share-unavailable', {}],
  ['can-share-unavailable', { share() { throw Error('Must not share'); } }],
  ['files-unsupported', { canShare: () => false, share() { throw Error('Must not share'); } }],
  ['capability-check-rejected', { canShare() { throw Error('Capability failed'); }, share() { throw Error('Must not share'); } }],
  ['share-rejected', { canShare: () => true, share() { throw Object.assign(Error('Denied'), { name: 'NotAllowedError' }); } }],
];
for (const [reason, navigatorObject] of reasons) test(`${reason} downloads the same valid PDF without changing canonical identity`, async () => {
  const model = professionalModel(); const artifact = await createCustomerJobHistoryPdfArtifact(model); let saved;
  const result = await shareCustomerJobHistoryReport(model, { createArtifact: async () => artifact,
    shareArtifact: input => shareHistoryPdfArtifact({ ...input, isNative: false, navigatorObject }),
    downloadArtifact: value => { saved = value; return true; } });
  assert.equal(result.method, 'download'); assert.equal(result.reason, reason); assert.equal(saved, artifact);
});
test('File creation failure keeps the valid Blob available to save', async () => {
  const artifact = await createCustomerJobHistoryPdfArtifact(professionalModel());
  const result = await shareHistoryPdfArtifact({ artifact, isNative: false, FileImpl: class { constructor() { throw Error('File failed'); } } });
  assert.equal(result.reason, 'file-creation-failed'); assert.equal(result.method, 'fallback');
});
test('native adapter rejection falls back to the same PDF without a server service', async () => {
  const model = professionalModel(); const artifact = await createCustomerJobHistoryPdfArtifact(model); let saved;
  const result = await shareCustomerJobHistoryReport(model, { createArtifact: () => artifact,
    shareArtifact: input => shareHistoryPdfArtifact({ ...input, isNative: true, platform: 'ios',
      nativeShare: async () => ({ ok: false, method: 'fallback' }) }),
    downloadArtifact: value => { saved = value; return true; } });
  assert.equal(result.method, 'download'); assert.equal(result.reason, 'native-share-rejected'); assert.equal(saved, artifact);
});
test('Blob serialization failure is distinct from PDF rendering failure', async () => {
  const model = professionalModel();
  const result = await shareCustomerJobHistoryReport(model, {
    createArtifact: () => createCustomerJobHistoryPdfArtifact(model, { jsPDFImpl: class {
      setFont() {} setFontSize() {} setTextColor() {} setDrawColor() {} line() {} rect() {}
      addPage() {} setPage() {} setProperties() {} getNumberOfPages() { return 4; }
      splitTextToSize(value) { return [value]; } text() {}
      output() { throw Error('Serialization failed'); }
    } }),
  });
  assert.equal(result.method, 'invalid-pdf'); assert.equal(result.reason, 'blob-invalid');
});
test('generation, Blob validation, cancellation and failed download are distinct', async () => {
  const model = professionalModel(); const artifact = await createCustomerJobHistoryPdfArtifact(model);
  const fail = await shareCustomerJobHistoryReport(model, { createArtifact: () => { throw Error('Renderer failed'); } });
  assert.equal(fail.method, 'generation-failed');
  const blob = await shareCustomerJobHistoryReport(model, { createArtifact: () => ({ ...artifact, blob: new Blob([]) }) });
  assert.equal(blob.reason, 'blob-invalid');
  const cancelled = await shareCustomerJobHistoryReport(model, { createArtifact: () => artifact,
    shareArtifact: input => shareHistoryPdfArtifact({ ...input, isNative: false, navigatorObject: {
      canShare: () => true, share: async () => { throw new DOMException('Dismissed or no targets', 'AbortError'); },
    } }), downloadArtifact: () => { throw Error('Never download automatically on dismissal'); } });
  assert.equal(cancelled.method, 'cancelled'); assert.equal(cancelled.artifact, artifact); assert.equal(cancelled.saveAvailable, true);
  const save = await shareCustomerJobHistoryReport(model, { createArtifact: () => artifact,
    shareArtifact: async () => ({ ok: false, method: 'fallback', reason: 'files-unsupported' }), downloadArtifact: () => false });
  assert.equal(save.method, 'save-required'); assert.equal(save.artifact, artifact); assert.equal(save.saveAvailable, true);
  for (const language of ['en', 'es', 'fr', 'pt-BR']) {
    const copy = getCustomerJobHistoryReportCopy(language);
    assert.equal(copy.email, undefined);
    for (const key of ['generationFailed', 'blobFailed', 'fileFailed', 'shareDismissed', 'sharePrepared', 'saveRequired', 'savePdf']) {
      assert.ok(typeof copy[key] === 'string' && copy[key].trim(), `${language}:${key}`);
    }
    for (const result of [fail, blob, cancelled, save]) assert.notEqual(historyReportNotice(result, 'share', copy), copy.pdfUnavailable);
    assert.equal(new Set([fail, blob, cancelled, save].map(r => historyReportNotice(r, 'share', copy))).size, 4);
  }
});
test('slow paginated preparation keeps the exact PDF for the next click without rereading or regenerating', async () => {
  const model = professionalModel(); const artifact = await createCustomerJobHistoryPdfArtifact(model); let activeClick = false; let calls = 0;
  const shareArtifact = input => shareHistoryPdfArtifact({ ...input, isNative: false, navigatorObject: {
    userActivation: { get isActive() { return activeClick; } }, canShare: () => true,
    share: async ({ files }) => { calls++; assert.deepEqual(await files[0].arrayBuffer(), await artifact.blob.arrayBuffer()); },
  } });
  const first = await shareCustomerJobHistoryReport(model, { createArtifact: () => artifact, shareArtifact });
  assert.equal(first.method, 'prepared'); assert.equal(calls, 0);
  activeClick = true;
  const second = await shareCustomerJobHistoryReport(model, { preparedArtifact: first.artifact,
    createArtifact: () => { throw Error('Do not regenerate'); }, shareArtifact });
  assert.equal(second.method, 'web-pdf'); assert.equal(calls, 1);
});
