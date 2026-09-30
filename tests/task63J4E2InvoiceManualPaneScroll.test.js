import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL(
    "../src/components/UnifiedBusinessDocumentWorkspace.jsx",
    import.meta.url
  ),
  "utf8"
);

const css = readFileSync(
  new URL(
    "../src/components/UnifiedBusinessDocumentWorkspace.css",
    import.meta.url
  ),
  "utf8"
);

test("completed-job Invoice manual editor scrolls into the left pane when opened", () => {
  assert.match(
    source,
    /function CompletedJobInvoiceManualEditor[\s\S]*const editorRef = useRef\(null\)/
  );

  assert.match(
    source,
    /editorRef\.current\?\.scrollIntoView\?\.\(\{[\s\S]*behavior: "smooth"[\s\S]*block: "start"/
  );

  assert.match(
    source,
    /className="business-document-manual business-document-invoice-manual"[\s\S]*aria-labelledby="business-document-invoice-manual-title"/
  );
});

test("completed-job Invoice manual mode gives the left pane bounded scroll ownership", () => {
  assert.match(
    source,
    /data-inline-manual-open=\{[\s\S]*activeDocument === "invoice"[\s\S]*invoicePreparation[\s\S]*manualState\?\.mode === "manual"/
  );

  assert.match(
    css,
    /business-document-conversation\[data-inline-manual-open="true"\][\s\S]*grid-template-rows: minmax\(0, 1fr\)/
  );

  assert.match(
    css,
    /business-document-conversation-context[\s\S]*overflow-y: auto/
  );

  assert.match(
    css,
    /business-document-chat-shell,[\s\S]*business-document-conversation-footer[\s\S]*display: none/
  );
});
