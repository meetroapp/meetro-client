import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "vite";
const { webkit, chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = process.env.FOLLOW_UP_QA_OUTPUT || "/tmp/task57-responsive";
mkdirSync(output, { recursive: true });
// Use index.html -> src/main.jsx -> App, with the installed Vite/React pipeline and real shell.
const server = await createServer({ mode: "production", logLevel: "warn", server: { host: "127.0.0.1", port: 5187, strictPort: true, hmr: false } });
await server.listen();
const origin = "http://127.0.0.1:5187";
const engines = { webkit: await webkit.launch({ headless: true }), chromium: await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) }) };
const results = [], diagnostics = [], unexpected = [];
const versions = Object.fromEntries(["vite", "@vitejs/plugin-react", "react"].map(name => [name, JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")).version]));
const emergency = status => ({ id: 41, status, title: "Resolved water leak", description: "Immediate repair completed", serviceSpecialty: "emergency_plumbing", serviceDomain: "home_services", category: "plumbing", requestedAt: "2026-09-20T13:00:00Z", assignedAt: "2026-09-20T13:05:00Z", enRouteAt: "2026-09-20T13:10:00Z", arrivedAt: "2026-09-20T13:20:00Z", workStartedAt: "2026-09-20T14:00:00Z", completedAt: status === "completed" ? "2026-09-20T15:00:00Z" : null });
async function fixture({ engine = "webkit", width = 390, height = 844, language = "en", state = "completed", actor = "owner", requestId = "41", startHash = `emergencyRequest?requestId=${requestId}` } = {}) {
  const context = await engines[engine].newContext({ viewport: { width, height }, isMobile: engine === "webkit", hasTouch: engine === "webkit", serviceWorkers: "block" });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage(), calls = [], errors = [], consoleErrors = [], resources = [];
  let createdPost = null;
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => errors.push({ message: error.message, stack: error.stack }));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", async response => {
    if (new URL(response.url()).origin !== origin) return;
    const type = response.headers()["content-type"] || "";
    if (/javascript|html/.test(type) && (/main\.jsx|App\.jsx|follow-up-qa|@id/.test(response.url()))) {
      const body = await response.text().catch(() => "");
      resources.push({ url: response.url(), status: response.status(), contentType: type, prefix: body.slice(0,180) });
    }
  });
  await context.addInitScript(({ language, actor }) => {
    localStorage.setItem("token", "local-synthetic-only");
    localStorage.setItem("user", JSON.stringify({ id: actor === "owner" ? 10 : 20, role: actor === "professional" ? "handyman" : "homeowner", account_type: actor === "professional" ? "professional" : "homeowner" }));
    localStorage.setItem("meetroLanguage", language); localStorage.setItem("activeAccountMode", "personal");
    const identity = actor === "owner" ? "id:10" : "id:20";
    localStorage.setItem(`meetroAccountModePreference:${identity}`, JSON.stringify({ identity, mode: "personal" }));
  }, { language, actor });
  await context.route("**/*", async route => {
    const req = route.request(), u = new URL(req.url()), method = req.method();
    if (u.origin === origin && !/^\/(emergency-requests|posts|team|alerts|media)(?:\/|$)/.test(u.pathname)) return route.continue();
    calls.push({ path: u.pathname, method });
    let data, status = 200;
    if (method === "GET" && u.pathname === "/team/me") data = { success: true, memberships: [] };
    else if (method === "GET" && u.pathname === "/alerts/counts") data = { success: true, code: "ALERT_COUNTS_RETRIEVED", counts: { active: 0, unread: 0, byCategory: {}, communication: { unread: 0, customerUnread: 0, teamUnread: 0, byJob: [], byConversation: [] } } };
    else if (method === "GET" && u.pathname === "/subscriptions/me") data = { success: true, subscription: { status: "active" }, businessAccessActive: true };
    else if (method === "GET" && u.pathname === "/emergency-requests/41") {
      if (state === "loading") return;
      if (actor !== "owner") { status = 403; data = { success: false, code: "EMERGENCY_REQUEST_FORBIDDEN", message: "Synthetic non-owner denial" }; }
      else if (state === "failed") { status = 503; data = { success: false, message: "Synthetic read failure" }; }
      else data = { success: true, emergencyRequest: emergency(state) };
    } else if (method === "GET" && u.pathname === "/emergency-requests/41/responses") data = { success: true, emergencyRequest: { id: 41, status: state }, responses: [] };
    else if (method === "GET" && u.pathname === "/emergency-requests/41/available-professionals") data = { success: true, emergencyRequest: { id: 41, status: state }, professionals: [] };
    else if (method === "GET" && u.pathname === "/posts/91/professional-responses") data = { success: true, request: { id: 91, title: createdPost.title, status: "open" }, responses: [] };
    else if (method === "GET" && u.pathname === "/conversations") data = { success: true, conversations: [] };
    else if (method === "GET" && u.pathname === "/posts") data = { success: true, posts: createdPost ? [createdPost] : [] };
    else if (method === "GET" && u.pathname === "/my-request-relationships") data = { success: true, relationships: [] };
    else if (method === "GET" && u.pathname === "/emergency-requests") data = { success: true, emergencyRequests: [] };
    else if (method === "POST" && u.pathname === "/emergency-requests/41/follow-up-job-request") {
      const body = req.postDataJSON();
      assert.ok(req.headers()["idempotency-key"]);
      for (const field of ["request_origin", "source_meetro_relationship_id", "emergency_request_id", "emergency_job_id", "linkage_id", "target_contractor_profile_id", "target_professional_user_id"]) assert.equal(Object.hasOwn(body, field), false);
      createdPost = { ...body, id: 91, status: "open", created_at: "2026-09-27T12:00:00Z" };
      status = 201; data = { success: true, code: "EMERGENCY_FOLLOW_UP_JOB_REQUEST_CREATED", replayed: false, emergencyRequestId: 41, emergencyJobId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", linkageId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", post: createdPost, reportedConcern: null };
    } else {
      unexpected.push({ path: u.pathname, method }); await route.abort(); return;
    }
    await route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(data) });
  });
  await page.goto(`${origin}/#${startHash}`, { waitUntil: "domcontentloaded" });
  const close = async name => {
    diagnostics.push({ name, calls, errors, consoleErrors, resources });
    const expectedFailure = state === "failed" || actor !== "owner";
    const unexplained = consoleErrors.filter(message => !(expectedFailure && /Failed to load resource/.test(message)));
    if (unexplained.length) unexpected.push({ name, consoleErrors: unexplained });
    await context.tracing.stop({ path: `${output}/${name}.zip` }); await context.close();
  };
  return { page, calls, errors, close };
}
async function layout(page, control) {
  await control.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, "horizontal overflow");
  assert.equal(await control.evaluate(el => { const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2); return el === at || el.contains(at); }), true, "control obscured by shell");
  assert.ok(await page.locator("nav").count() > 0, "real persistent navigation mounted");
}
// Full-edge geometry is required: a clickable button center can pass while the title
// and form are hidden by the tablet sidebar.
async function requestHelpGeometry(page, name, bannerSelector = null, requireManual = false) {
  const geometry = await page.evaluate((bannerSelector) => {
    const root = document.querySelector("#root");
    const selectors = {
      sidebar: ".desktop-sidebar", page: ".app-page.request-help-page",
      contentLane: ".request-help-content-lane", title: ".request-help-page h1",
      banner: bannerSelector, form: ".request-help-page form",
      firstCard: ".job-request-conversation-workspace",
      manualForm: "#request-details-manual-form",
      locationCard: '.guided-workspace-card[aria-labelledby="job-request-location-card-heading"]',
      review: ".request-help-page button",
      bottomNav: ".bottom-nav-dock",
    };
    const measure = (selector) => {
      const el = selector && document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect(), c = getComputedStyle(el);
      return { selector, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        width: r.width, height: r.height, display: c.display, visibility: c.visibility,
        marginLeft: c.marginLeft, marginRight: c.marginRight,
        paddingLeft: c.paddingLeft, paddingRight: c.paddingRight, contain: c.contain };
    };
    return { layout: root?.dataset.appLayout, viewport: { width: innerWidth, height: innerHeight },
      documentScrollWidth: document.documentElement.scrollWidth,
      sidebarWidthVariable: getComputedStyle(root).getPropertyValue("--meetro-sidebar-width").trim(),
      elements: Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, measure(selector)])) };
  }, bannerSelector);
  writeFileSync(`${output}/${name}-geometry.json`, JSON.stringify(geometry, null, 2));
  const { layout, viewport, documentScrollWidth, elements: e } = geometry;
  assert.ok(e.page && e.contentLane && e.title && (e.firstCard || e.manualForm), `${name}: Request Help content mounted`);
  if (requireManual) assert.ok(e.manualForm && e.locationCard, `${name}: manual location card mounted`);
  else assert.ok(e.form && e.firstCard, `${name}: conversation form mounted`);
  if (bannerSelector) assert.ok(e.banner, `${name}: context banner mounted`);
  assert.ok(documentScrollWidth <= viewport.width + 2, `${name}: horizontal document overflow`);
  assert.ok(e.page.right <= viewport.width + 2, `${name}: page exceeds viewport`);
  if (layout === "mobile") {
    assert.ok(!e.sidebar || e.sidebar.display === "none", `${name}: mobile sidebar hidden`);
    assert.ok(e.bottomNav && e.bottomNav.display !== "none", `${name}: mobile bottom navigation visible`);
  } else {
    assert.ok(["tablet", "desktop"].includes(layout), `${name}: adaptive layout present`);
    assert.ok(e.sidebar && e.sidebar.display !== "none" && e.sidebar.width > 100, `${name}: persistent sidebar visible`);
    assert.ok(Math.abs(e.sidebar.left) <= 2, `${name}: sidebar anchored to viewport`);
    for (const key of ["page", "contentLane", "title", "banner", "form", "firstCard", "manualForm", "locationCard"]) {
      if (e[key]) assert.ok(e[key].left >= e.sidebar.right - 1, `${name}: ${key} overlaps sidebar (${e[key].left} < ${e.sidebar.right})`);
    }
    assert.ok(!e.bottomNav || e.bottomNav.display === "none", `${name}: tablet/desktop dock hidden`);
  }
  return geometry;
}
try {
  for (const [name, width, height, engine] of [["iphone",390,844,"webkit"],["ipad-portrait",820,1180,"webkit"],["ipad-landscape",1180,820,"webkit"],["desktop",1440,1000,"chromium"]]) {
    for (const language of ["en","es"]) {
      const nameLang = `${name}-${language}`;
      const { page, calls, errors, close } = await fixture({ width,height,engine,language });
      try {
        const cta = page.getByRole("button", { name: language === "es" ? "Crear solicitud de trabajo de seguimiento" : "Create Follow-Up Job Request", exact: true });
        await cta.waitFor(); assert.ok(calls.some(c=>c.path==="/emergency-requests/41")); assert.deepEqual(errors, []);
        assert.match(await page.locator("[data-emergency-follow-up]").innerText(), language === "es" ? /permanece completada/ : /Emergency remains completed/);
        await layout(page, cta);
        await page.keyboard.press("Tab"); await cta.focus();
        assert.notEqual(await cta.evaluate(el=>getComputedStyle(el).outlineStyle), "none");
        await page.screenshot({ path: `${output}/${nameLang}-emergency.png`, fullPage: true });
        if (engine === "webkit") await cta.tap(); else await page.keyboard.press("Enter");
        const banner = page.locator("[data-emergency-follow-up-context]"); await banner.waitFor();
        assert.match(await banner.innerText(), language === "es" ? /permanecerá sin cambios/ : /stay unchanged/);
        assert.equal(new URL(page.url()).hash, "#upload?requestOrigin=emergency_follow_up&emergencyRequestId=41");
        const review = page.getByRole("button", { name: language === "es" ? "Revisar solicitud" : "Review Request", exact: true });
        await layout(page, review);
        await requestHelpGeometry(page, `${nameLang}-followup`, "[data-emergency-follow-up-context]");
        assert.equal(calls.some(c=>c.method!=="GET"), false, "CTA auto-submitted");
        assert.equal(await page.locator("textarea").evaluateAll(nodes=>nodes.some(n=>n.value.includes("Immediate repair completed"))), false);
        if (language === "es") {
          await page.evaluate(()=>{location.hash="upload?requestOrigin=emergency_follow_up&emergencyRequestId=41&sourceMeetroRelationshipId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";});
          await page.getByRole("alert").filter({hasText:"No se pudo verificar el contexto"}).waitFor();
          assert.equal(await page.locator('button[type="submit"]').count(),0);
          await page.evaluate(()=>{location.hash="upload?requestOrigin=emergency_follow_up&emergencyRequestId=41";});
          await banner.waitFor();
        }
        await banner.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/${nameLang}-composer.png`, fullPage: true });
        if (name === "ipad-portrait" && language === "en") {
          await page.getByRole("button", { name: "Enter Details Manually", exact: true }).click();
          await page.locator('.guided-workspace-card[aria-labelledby="job-request-location-card-heading"]').waitFor();
          await page.getByRole("button", { name: "Location", exact: true }).click();
          await page.locator("#request-location-mode-exact").waitFor();
          await requestHelpGeometry(page, `${nameLang}-followup-manual`, "[data-emergency-follow-up-context]", true);
          await page.screenshot({ path: `${output}/${nameLang}-followup-manual.png`, fullPage: true });
        }
        if (name === "desktop" && language === "en") {
          // Seed only user-authored fixture input via the existing draft helpers, then submit the real form.
          await page.evaluate(async () => {
            const d = await import("/src/utils/jobRequestDraft.js");
            const c = await import("/src/utils/requestHelpContext.js");
            let draft=d.createJobRequestDraft({initialLocation:"123 Test St",initialCity:"Test City",initialRegion:"FL",initialPostalCode:"33901"});
            draft=d.applyHomeownerInput(draft,{"job.title":"Synthetic larger follow-up scope","job.description":"New independent scope"});
            draft=d.setServiceClassification(draft,{category:"painting",requestCategory:"painting",domain:"home_services",specialty:"painting",selectedServiceOptionId:"service:painting",displayLabel:"Painting"});
            draft.requestContext=c.readRequestHelpContext();d.saveJobRequestDraft(sessionStorage,draft);
          });
          await page.reload(); await page.getByRole("button",{name:"Review Request",exact:true}).click();
          await page.getByRole("button",{name:"Submit Job Request",exact:true}).click();
          await page.waitForURL("**/#homeownerRequestDetails");
          await page.getByText("Synthetic larger follow-up scope",{exact:true}).first().waitFor();
          assert.ok(calls.some(c=>c.path==="/posts" && c.method==="GET"));
          assert.equal(calls.filter(c=>c.method==="POST").length,1);
        }
        await page.evaluate(()=>{location.hash="emergencyRequest?requestId=41";}); await cta.waitFor();
        assert.match(await page.locator("[data-emergency-follow-up]").innerText(), language === "es" ? /permanece completada/ : /Emergency remains completed/);
        assert.deepEqual(errors, []);
        results.push({ name,language,engine,version:engines[engine].version(),cta:"PASS",realAppShell:"PASS",focus:"PASS",unobscured:"PASS",overflow:"NONE",realUploadMounted:"PASS",autoSubmit:"NONE",emergencyReopen:"completed unchanged",mockedDetailHandoff:name==="desktop"&&language==="en"?"PASS":"covered separately" });
      } catch(error) { await page.screenshot({path:`${output}/${nameLang}-failure.png`,fullPage:true}); throw error; }
      finally { await close(nameLang); }
    }
  }
  // The same Request Help layout must contain ordinary and existing-customer modes.
  for (const [name, width, height, engine] of [["iphone",390,844,"webkit"],["ipad-portrait",820,1180,"webkit"],["ipad-landscape",1180,820,"webkit"],["desktop",1440,1000,"chromium"]]) {
    const { page, calls, errors, close } = await fixture({ width, height, engine, startHash: "upload" });
    const evidenceName = `${name}-ordinary`;
    try {
      await page.locator(".app-page.request-help-page h1").waitFor();
      await page.getByRole("button", { name: "Review Request", exact: true }).waitFor();
      await requestHelpGeometry(page, evidenceName);
      await page.screenshot({ path: `${output}/${evidenceName}.png`, fullPage: true });
      if (name === "ipad-portrait") {
        await page.getByRole("button", { name: "Enter Details Manually", exact: true }).click();
        await page.locator('.guided-workspace-card[aria-labelledby="job-request-location-card-heading"]').waitFor();
        await page.getByRole("button", { name: "Location", exact: true }).click();
        await page.locator("#request-location-mode-exact").waitFor();
        await requestHelpGeometry(page, `${evidenceName}-manual`, null, true);
        await page.screenshot({ path: `${output}/${evidenceName}-manual.png`, fullPage: true });
      }
      assert.deepEqual(errors, []); assert.equal(calls.some(c => c.method !== "GET"), false);
      results.push({ name, mode: "ordinary", geometry: "PASS", mutations: 0 });
    } finally { await close(evidenceName); }
  }
  {
    const evidenceName = "ipad-portrait-existing-customer";
    const { page, calls, errors, close } = await fixture({ width: 820, height: 1180, startHash: "upload?requestOrigin=existing_customer_request&sourceMeetroRelationshipId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    try {
      await page.locator("[data-existing-customer-request]").waitFor();
      await requestHelpGeometry(page, evidenceName, "[data-existing-customer-request]");
      await page.screenshot({ path: `${output}/${evidenceName}.png`, fullPage: true });
      assert.deepEqual(errors, []); assert.equal(calls.some(c => c.method !== "GET"), false);
      results.push({ name: "ipad-portrait", mode: "existing-customer", geometry: "PASS", mutations: 0 });
    } finally { await close(evidenceName); }
  }
  for (const scenario of ["draft","ready_for_distribution","assigned","professional_en_route","professional_arrived","work_in_progress","cancelled","expired","loading","failed","invalid","non-owner","professional"]) {
    const { page, calls, errors, close } = await fixture({state:["non-owner","professional","invalid"].includes(scenario)?"completed":scenario,actor:scenario==="non-owner"?"other":scenario==="professional"?"professional":"owner",requestId:scenario==="invalid"?"bad":"41"});
    try {
      if (scenario === "invalid") await page.getByText(/could not be verified|invalid|unavailable/i).first().waitFor();
      else { await page.waitForFunction(()=>Boolean(document.querySelector('.app-page'))); await page.waitForFunction(() => document.body.innerText.length > 100); assert.ok(calls.some(c=>c.path==="/emergency-requests/41")); }
      if (scenario !== "loading" && scenario !== "invalid") await page.locator('[role="status"]').filter({hasText:/Loading/i}).waitFor({state:"hidden"});
      assert.equal(await page.locator("[data-emergency-follow-up]").count(),0);
      assert.deepEqual(errors,[]);assert.equal(calls.some(c=>c.method!=="GET"),false);
      results.push({scenario,cta:"ABSENT",syntheticApiDenial:["failed","non-owner","professional"].includes(scenario),mutations:0});
    } finally {await close(scenario);}
  }
  assert.deepEqual(unexpected,[]);
  writeFileSync(`${output}/results.json`,JSON.stringify({versions,results,unexpected,scope:"Local mocked browser certification; no physical device or live business-data writes"},null,2));
  console.log(JSON.stringify({checks:results.length,unexpected,output}));
} finally {
  writeFileSync(`${output}/diagnostics.json`,JSON.stringify({diagnostics,unexpected},null,2));
  for(const browser of Object.values(engines))await browser.close();await server.close();
}
