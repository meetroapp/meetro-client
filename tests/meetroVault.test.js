import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const vaultFiles = [
  "docs/Vault/THE_MEETRO_VAULT.md",
  "docs/Vault/PERSISTENT_CONTEXT.md",
  "docs/Vault/THE_CURRENT_WORK.md",
  "docs/Vault/CONTINUITY_LAWS.md",
  "docs/Vault/VAULT_CHANGELOG.md",
];

test("Meetro Vault documentation exists and uses confidential language", () => {
  vaultFiles.forEach((vaultFile) => {
    assert.ok(fs.existsSync(vaultFile), `${vaultFile} should exist`);
    const doc = fs.readFileSync(vaultFile, "utf8");

    assert.match(
      doc,
      /Confidential — Meetro Internal Vault/,
      `${vaultFile} should contain the confidentiality header`
    );
    assert.match(
      doc,
      /amended by discovery, never by preference/,
      `${vaultFile} should contain the amendment constraint`
    );
  });
});
