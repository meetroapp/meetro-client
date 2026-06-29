import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const docsRoot = "docs";

test("Documentation folders and READMEs exist", () => {
  const requiredFolders = [
    `${docsRoot}/Vault`,
    `${docsRoot}/Constitution`,
    `${docsRoot}/Architecture`,
    `${docsRoot}/Stewardship`,
    `${docsRoot}/Execution`,
    `${docsRoot}/Execution/Phase 3`,
    `${docsRoot}/Execution/Phase 4`,
    `${docsRoot}/Execution/Phase 5`,
  ];

  const requiredReadmes = [
    `${docsRoot}/README.md`,
    `${docsRoot}/Vault/README.md`,
    `${docsRoot}/Constitution/README.md`,
    `${docsRoot}/Architecture/README.md`,
    `${docsRoot}/Stewardship/README.md`,
    `${docsRoot}/Execution/README.md`,
    `${docsRoot}/Execution/Phase 3/README.md`,
    `${docsRoot}/Execution/Phase 4/README.md`,
    `${docsRoot}/Execution/Phase 5/README.md`,
  ];

  for (const path of requiredFolders) {
    assert.ok(fs.existsSync(path), `Missing required folder: ${path}`);
    assert.ok(fs.statSync(path).isDirectory());
  }

  for (const path of requiredReadmes) {
    assert.ok(fs.existsSync(path), `Missing required README: ${path}`);
    assert.ok(fs.readFileSync(path, "utf8").trim().length > 0);
  }
});

test("Vault documentation has required confidentiality contract language", () => {
  const vaultFiles = [
    `${docsRoot}/Vault/THE_MEETRO_VAULT.md`,
    `${docsRoot}/Vault/PERSISTENT_CONTEXT.md`,
    `${docsRoot}/Vault/THE_CURRENT_WORK.md`,
    `${docsRoot}/Vault/CONTINUITY_LAWS.md`,
    `${docsRoot}/Vault/VAULT_CHANGELOG.md`,
  ];

  for (const file of vaultFiles) {
    assert.ok(fs.existsSync(file), `${file} should exist`);
    const doc = fs.readFileSync(file, "utf8");
    assert.match(doc, /Confidential — Meetro Internal Vault/);
    assert.match(doc, /amended by discovery, never by preference/);
  }
});
