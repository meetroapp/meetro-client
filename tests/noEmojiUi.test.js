import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const sourceRoot = path.join(repoRoot, "src");
const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
const sourceFileRegex = /\.(js|jsx)$/;
const ignoredPathRegex = /(\.bak|backup|node_modules|dist)/;

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (ignoredPathRegex.test(fullPath)) return [];
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    if (!sourceFileRegex.test(entry.name)) return [];

    return [fullPath];
  });
}

test("active UI source files do not contain emoji glyphs", () => {
  const offenders = collectSourceFiles(sourceRoot).flatMap((filePath) => {
    const relativePath = path.relative(repoRoot, filePath);
    const lines = fs.readFileSync(filePath, "utf8").split("\n");

    return lines
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => emojiRegex.test(line))
      .map(({ line, lineNumber }) => `${relativePath}:${lineNumber}: ${line.trim()}`);
  });

  assert.deepEqual(offenders, []);
});
