import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildQuickQuoteDocumentModel,
} from "../src/utils/customerDocumentModel.js";

import {
  previewCustomerDocumentPdfWithMedia,
} from "../src/utils/customerDocumentPdf.js";

import {
  previewBusinessDocumentPdfArtifact,
} from "../src/utils/businessDocumentDeviceShare.js";

function savedArtifact() {
  return {
    blob: new Blob(
      ["%PDF-1.7 saved"],
      { type: "application/pdf" }
    ),
    contentType: "application/pdf",
    fileName: "Quote-Q-0000013.pdf",
  };
}

test(
  "saved iPhone PDF preview uses native Quick Look and never browser window",
  async () => {
    const native = [];
    let browserOpened = false;

    const opened =
      await previewBusinessDocumentPdfArtifact(
        savedArtifact(),
        {
          isNative: true,
          platform: "ios",
          nativePreviewArtifactImpl:
            async (artifact) => {
              native.push(artifact.fileName);
            },
          openWindow() {
            browserOpened = true;
            throw new Error(
              "browser preview must not run"
            );
          },
        }
      );

    assert.equal(opened, true);
    assert.deepEqual(
      native,
      ["Quote-Q-0000013.pdf"]
    );
    assert.equal(browserOpened, false);
  }
);

test(
  "desktop saved PDF preview keeps existing blob window behavior",
  async () => {
    const calls = [];

    const opened =
      await previewBusinessDocumentPdfArtifact(
        savedArtifact(),
        {
          isNative: false,
          platform: "web",
          urlObject: {
            createObjectURL() {
              calls.push("create");
              return "blob:saved-pdf";
            },
            revokeObjectURL(url) {
              calls.push(["revoke", url]);
            },
          },
          openWindow(url, target, features) {
            calls.push([
              "open",
              url,
              target,
              features,
            ]);
          },
          scheduleRevoke(callback, delay) {
            calls.push([
              "schedule",
              delay,
            ]);
            callback();
          },
        }
      );

    assert.equal(opened, true);
    assert.deepEqual(calls, [
      "create",
      [
        "open",
        "blob:saved-pdf",
        "_blank",
        "noopener,noreferrer",
      ],
      ["schedule", 60000],
      ["revoke", "blob:saved-pdf"],
    ]);
  }
);

test(
  "generated Quick Quote preview uses native Quick Look on iPhone",
  async () => {
    const model =
      buildQuickQuoteDocumentModel(
        {
          quoteNumber: "Q-0000013",
          customerName: "Test Customer",
          projectTitle: "Test repair",
          lineItems: [],
          subtotal: 0,
          total: 215,
        },
        {
          branding: {
            businessName:
              "BGONE Construction Cleanup LLC & Handyman Services",
          },
          workingDraftStatus: "SAVED",
        }
      );

    const native = [];

    const result =
      await previewCustomerDocumentPdfWithMedia(
        model,
        {
          isNative: true,
          platform: "ios",
          nativePreviewArtifactImpl:
            async (artifact) => {
              native.push({
                fileName:
                  artifact.fileName,
                type:
                  artifact.blob.type,
              });
            },
          openWindow() {
            throw new Error(
              "blob window must not run on iPhone"
            );
          },
        }
      );

    assert.equal(result.ok, true);
    assert.equal(
      result.method,
      "native-quick-look"
    );

    assert.equal(native.length, 1);
    assert.equal(
      native[0].type,
      "application/pdf"
    );
    assert.match(
      native[0].fileName,
      /\.pdf$/
    );
  }
);

test(
  "native Swift plugin uses Apple Quick Look and is registered in Capacitor",
  () => {
    const swift = readFileSync(
      new URL(
        "../ios/App/App/NativePdfPreview.swift",
        import.meta.url
      ),
      "utf8"
    );

    const main = readFileSync(
      new URL(
        "../ios/App/App/MainViewController.swift",
        import.meta.url
      ),
      "utf8"
    );

    const project = readFileSync(
      new URL(
        "../ios/App/App.xcodeproj/project.pbxproj",
        import.meta.url
      ),
      "utf8"
    );

    assert.match(
      swift,
      /import QuickLook/
    );

    assert.match(
      swift,
      /QLPreviewControllerDataSource/
    );

    assert.match(
      swift,
      /QLPreviewControllerDelegate/
    );

    assert.match(
      swift,
      /previewControllerDidDismiss/
    );

    assert.match(
      swift,
      /Data\(base64Encoded: encoded\)/
    );

    assert.doesNotMatch(
      swift,
      /UIActivityViewController/
    );

    assert.match(
      main,
      /registerPluginInstance\(NativePdfPreview\(\)\)/
    );

    assert.match(
      project,
      /NativePdfPreview\.swift in Sources/
    );
  }
);

test(
  "saved Quote and Deposit Request callers await the native preview result",
  () => {
    const workspace = readFileSync(
      new URL(
        "../src/components/UnifiedBusinessDocumentWorkspace.jsx",
        import.meta.url
      ),
      "utf8"
    );

    const deposit = readFileSync(
      new URL(
        "../src/components/DepositRequestWorkspace.jsx",
        import.meta.url
      ),
      "utf8"
    );

    assert.match(
      workspace,
      /await previewBusinessDocumentPdfArtifact\(artifact\)/
    );

    assert.match(
      deposit,
      /await previewBusinessDocumentPdfArtifact\([\s\S]*artifact[\s\S]*\)/
    );
  }
);
