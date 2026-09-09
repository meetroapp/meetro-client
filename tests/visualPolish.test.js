import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const askCss = readFileSync(new URL("../src/components/AskMeetroWorkspace.css", import.meta.url), "utf8");
const token = (name) => css.match(new RegExp(`${name}: (#[0-9a-f]{6});`, "i"))?.[1];
function contrast(a, b) {
  const luminance = (hex) => hex.slice(1).match(/../g).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

test("shared light-surface tokens keep readable text regardless of device dark appearance", () => {
  const paper = token("--meetro-color-paper"), background = token("--meetro-color-background");
  assert.equal(paper, "#FFFFFF"); assert.equal(background, "#FAFAFC");
  assert.equal(token("--meetro-color-forest"), "#0B5D3B");
  assert.ok(contrast(token("--meetro-color-ink"), background) >= 4.5);
  assert.ok(contrast(token("--meetro-color-muted"), paper) >= 4.5);
  assert.ok(contrast(paper, token("--meetro-color-forest")) >= 4.5);
  assert.match(css, /--text-h: var\(--meetro-color-ink\)/);
  assert.doesNotMatch(css, /--text-h:\s*#f3f4f6/);
  assert.match(css, /@font-face[^}]*Poppins[^}]*Poppins-Regular\.ttf/);
});

test("Ask heading, voice notice, and recording principle have explicit readable presentation", () => {
  assert.match(askCss, /\.ask-meetro-header h1 \{[^}]*color: var\(--meetro-color-ink, #111827\)/);
  assert.match(askCss, /\.ask-meetro-principle \{[^}]*font-size: 12px;[^}]*color: #4B5563/);
  assert.ok(contrast("#4B5563", "#FAFAFC") >= 4.5);
  assert.ok(contrast("#063D26", "#E8F5EE") >= 4.5);
  assert.match(askCss, /\.ask-meetro-notice \{[^}]*color: #063D26; background: #E8F5EE/);
  assert.match(askCss, /\.ask-meetro-error \{[^}]*color: #991B1B/);
});

test("real Login keeps four language choices and compact controls without changing its content or form", async () => {
  const dom = new JSDOM("", { url: "http://localhost/#login" });
  const previous = new Map();
  let vite;
  try {
    for (const key of ["window", "localStorage", "sessionStorage"]) {
      previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
    }
    vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false } });
    const { default: Login } = await vite.ssrLoadModule("/src/pages/Login.jsx");
    for (const language of ["en", "es", "fr", "pt"]) {
      localStorage.clear(); localStorage.setItem("meetroLanguage", language);
      const view = new JSDOM(renderToStaticMarkup(React.createElement(Login, { setPage() {} })));
      try {
        const document = view.window.document;
        const choices = [...document.querySelectorAll("button[aria-pressed]")];
        assert.deepEqual(choices.map((button) => button.textContent.trim()), ["English", "Español", "Français", "Português"]);
        assert.equal(choices.filter((button) => button.getAttribute("aria-pressed") === "true").length, 1);
        assert.equal(choices[["en", "es", "fr", "pt"].indexOf(language)].getAttribute("aria-pressed"), "true");
        assert.equal(choices[0].parentElement.style.gridTemplateColumns, "repeat(2, minmax(0, 1fr))");
        for (const button of choices) {
          assert.equal(button.style.minHeight, "44px");
          assert.equal(button.style.fontSize, "15px");
        }
        assert.equal(document.querySelector('input[type="email"]').style.minHeight, "54px");
        assert.equal(document.querySelector('input[type="password"]').style.fontSize, "16px");
        assert.equal([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === ({ en: 'Continue', es: 'Continuar', fr: 'Continuer', pt: 'Continuar' })[language]).style.minHeight, "52px");
        if (language === "en") {
          assert.match(document.body.textContent, /The work continues here\./);
          assert.match(document.body.textContent, /Continue the work that matters, with the people who matter\./);
          assert.match(document.body.textContent, /Join Meetro Community.*Sign in.*Forgot password/s);
          assert.match(document.body.textContent, /Built around relationships\. Designed for communities\./);
          assert.equal(document.querySelectorAll('input[type="email"]').length, 1);
        }
      } finally { view.window.close(); }
    }
  } finally {
    await vite?.close(); dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
  // These are rendered state/style contracts. Actual geometry is checked in Chrome.
});
